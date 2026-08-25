/**
 * Billing Service - Final Coverage Tests
 *
 * Targets remaining uncovered lines/branches:
 * - generateInvoicePDF: full PDF rendering with billingDetails, lineItems, tax, discount, paid status
 * - _syncSubscriptionFromStripe: no priceId (no items), existing planId fallback
 * - _handleCheckoutCompleted: 409A path edge cases
 * - _handleInvoicePaymentFailed: no subscription found after customer mapping
 */

const databaseAdapter = require('../../../services/databaseAdapter');
const stripeService = require('../../../services/stripeService');

jest.mock('../../../services/databaseAdapter');
jest.mock('../../../services/stripeService');

// Mock WebhookEvent model
jest.mock('../../../models/WebhookEvent', () => ({
  isProcessed: jest.fn(),
  recordEvent: jest.fn(),
  markProcessed: jest.fn(),
  markFailed: jest.fn(),
}));

// Mock Valuation409A model
jest.mock('../../../models/Valuation409A', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

// Mock User model
jest.mock('../../../models/User', () => ({
  findOne: jest.fn(),
}));

// Mock valuation email service
jest.mock('../../../services/valuation409AEmailService', () => ({
  sendPaymentConfirmed: jest.fn(),
}));

// Mock valuation agent service
jest.mock('../../../services/valuation409AAgentService', () => ({
  runValuationAgent: jest.fn().mockResolvedValue({}),
}));

const BillingService = require('../../../services/billingService');

describe('BillingService - Final Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stripeService.isConfigured.mockReturnValue(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // generateInvoicePDF - full rendering path
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateInvoicePDF - full rendering', () => {
    it('should generate PDF with billing details, line items, tax, discount, and paid status', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-FULL',
        invoiceNumber: '202601-0001',
        companyId: 'comp-1',
        status: 'paid',
        issueDate: new Date('2026-01-15').toISOString(),
        dueDate: new Date('2026-02-14').toISOString(),
        subtotal: 100.00,
        taxAmount: 8.50,
        discountAmount: 10.00,
        total: 98.50,
        billingDetails: {
          name: 'John Smith',
          company: 'Acme Corp',
          email: 'john@acme.com',
          address: {
            line1: '123 Main St',
            line2: 'Suite 200',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94102',
            country: 'US',
          },
        },
        lineItems: [
          { description: 'Pro Plan', quantity: 1, unitPrice: 100.00, amount: 100.00 },
        ],
      });

      const result = await BillingService.generateInvoicePDF('INV-FULL', 'comp-1');

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('invoice-INV-FULL.pdf');
      // PDF starts with %PDF
      expect(result.buffer.toString('ascii', 0, 4)).toBe('%PDF');
    }, 10000);

    it('should generate PDF without billing details or line items', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-SIMPLE',
        invoiceNumber: '202601-0002',
        companyId: 'comp-1',
        status: 'draft',
        issueDate: new Date('2026-01-15').toISOString(),
        dueDate: new Date('2026-02-14').toISOString(),
        subtotal: 50.00,
        taxAmount: 0,
        discountAmount: 0,
        total: 50.00,
        lineItems: [],
      });

      const result = await BillingService.generateInvoicePDF('INV-SIMPLE', 'comp-1');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('invoice-INV-SIMPLE.pdf');
    }, 10000);

    it('should generate PDF with partial billing details (no address)', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-PARTIAL',
        invoiceNumber: '202601-0003',
        companyId: 'comp-1',
        status: 'sent',
        issueDate: new Date('2026-01-15').toISOString(),
        dueDate: new Date('2026-02-14').toISOString(),
        subtotal: 75.00,
        taxAmount: 0,
        discountAmount: 5.00,
        total: 70.00,
        billingDetails: {
          name: 'Jane Doe',
        },
        lineItems: [],
      });

      const result = await BillingService.generateInvoicePDF('INV-PARTIAL', 'comp-1');

      expect(result.buffer).toBeInstanceOf(Buffer);
    }, 10000);

    it('should generate PDF with address but no line2', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-ADDR',
        invoiceNumber: '202601-0004',
        companyId: 'comp-1',
        status: 'overdue',
        issueDate: new Date('2026-01-15').toISOString(),
        dueDate: new Date('2026-02-14').toISOString(),
        subtotal: 200.00,
        taxAmount: 15.00,
        discountAmount: 0,
        total: 215.00,
        billingDetails: {
          name: 'Test User',
          email: 'test@example.com',
          company: 'TestCo',
          address: {
            line1: '456 Oak Ave',
            city: 'Austin',
            state: 'TX',
            postalCode: '78701',
          },
        },
        lineItems: [
          { description: 'Enterprise Plan', quantity: 1, unitPrice: 200.00, amount: 200.00 },
        ],
      });

      const result = await BillingService.generateInvoicePDF('INV-ADDR', 'comp-1');

      expect(result.buffer).toBeInstanceOf(Buffer);
    }, 10000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // _syncSubscriptionFromStripe - edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('_syncSubscriptionFromStripe - edge cases', () => {
    it('should create subscription with unknown planId when no items (no priceId)', async () => {
      // When stripeSub has no items, priceId is undefined
      // findOne for Subscription returns null (no existing)
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({ subscriptionId: 'sub_new' });

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_no_items',
        status: 'active',
        customer: 'cus_1',
        // no items property at all
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.findOne).toHaveBeenCalledTimes(1); // only Subscription lookup
      expect(databaseAdapter.findOne).toHaveBeenCalledWith('Subscription', {
        stripeSubscriptionId: 'sub_no_items',
      });
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Subscription',
        expect.objectContaining({
          stripePriceId: null,
          planId: 'unknown',
          status: 'active',
          stripeSubscriptionId: 'sub_no_items',
          stripeCustomerId: 'cus_1',
          cancelAtPeriodEnd: false,
        })
      );
    });

    it('should use existing planId when plan not found by priceId', async () => {
      // findOne calls: 1) SubscriptionPlan by priceId -> null, 2) Subscription by stripeSubId -> existing
      databaseAdapter.findOne
        .mockResolvedValueOnce(null) // no plan found
        .mockResolvedValueOnce({
          _id: 'existing-sub-id',
          planId: 'legacy_plan',
          stripeSubscriptionId: 'sub_1',
        });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        items: { data: [{ price: { id: 'price_unknown' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Subscription',
        'existing-sub-id',
        expect.objectContaining({
          planId: 'legacy_plan',
          stripePriceId: 'price_unknown',
        })
      );
    });

    it('should map paused status correctly', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_paused',
        status: 'paused',
        customer: 'cus_1',
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Subscription',
        expect.objectContaining({ status: 'paused' })
      );
    });

    it('should map incomplete_expired status to canceled', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_expired',
        status: 'incomplete_expired',
        customer: 'cus_1',
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Subscription',
        expect.objectContaining({ status: 'canceled' })
      );
    });

    it('should default to active for unknown Stripe status', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_unknown',
        status: 'some_future_status',
        customer: 'cus_1',
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Subscription',
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should handle cancel_at_period_end true', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_canceling',
        status: 'active',
        customer: 'cus_1',
        cancel_at_period_end: true,
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Subscription',
        expect.objectContaining({ cancelAtPeriodEnd: true })
      );
    });

    it('should use plan.planId when found by priceId', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'pro_plan', stripePriceId: 'price_pro' }) // plan found
        .mockResolvedValueOnce(null); // no existing subscription
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._syncSubscriptionFromStripe('comp-1', {
        id: 'sub_new_with_plan',
        status: 'active',
        customer: 'cus_1',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Subscription',
        expect.objectContaining({
          planId: 'pro_plan',
          stripePriceId: 'price_pro',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // _handleCheckoutCompleted - 409A path: valuation not found via valuationId or row_id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('_handleCheckoutCompleted - additional edge cases', () => {
    it('should skip when no companyId in metadata', async () => {
      // No companyId => should return immediately
      await BillingService._handleCheckoutCompleted({
        metadata: {},
      });

      // No DB calls should have been made
      expect(databaseAdapter.findOne).not.toHaveBeenCalled();
    });

    it('should handle 409A payment mode but valuation not found anywhere', async () => {
      const Valuation409A = require('../../../models/Valuation409A');
      Valuation409A.findOne.mockResolvedValue(null); // not found by valuationId or row_id

      // Should fall through to subscription path
      stripeService.getSubscription.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._handleCheckoutCompleted({
        id: 'cs_123',
        mode: 'payment',
        metadata: { companyId: 'comp-1', valuationId: 'val_missing' },
        subscription: 'sub_1',
      });

      // Should have called Valuation409A.findOne twice (by valuationId, by row_id)
      expect(Valuation409A.findOne).toHaveBeenCalledTimes(2);
      // Should have fallen through to subscription sync
      expect(stripeService.getSubscription).toHaveBeenCalled();
    });

    it('should handle 409A path error gracefully and fall through', async () => {
      const Valuation409A = require('../../../models/Valuation409A');
      Valuation409A.findOne.mockRejectedValue(new Error('DB error'));

      stripeService.getSubscription.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      });
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});

      await BillingService._handleCheckoutCompleted({
        id: 'cs_err',
        mode: 'payment',
        metadata: { companyId: 'comp-1', valuationId: 'val_err' },
        subscription: 'sub_1',
      });

      // Should have caught the error and continued to subscription path
      expect(stripeService.getSubscription).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // _handleInvoicePaymentFailed - no subscription found
  // ═══════════════════════════════════════════════════════════════════════════

  describe('_handleInvoicePaymentFailed - edge cases', () => {
    it('should handle no subscription found for company', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ companyId: 'comp-1', stripeCustomerId: 'cus_1' }) // customer mapping
        .mockResolvedValueOnce(null); // no subscription found

      await BillingService._handleInvoicePaymentFailed({
        customer: 'cus_1',
      });

      // Should not try to update anything
      expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // _handleSubscriptionUpdated - no customer mapping
  // ═══════════════════════════════════════════════════════════════════════════

  describe('_handleSubscriptionUpdated - no mapping', () => {
    it('should warn and return when no customer mapping found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await BillingService._handleSubscriptionUpdated({
        id: 'sub_orphan',
        customer: 'cus_unknown',
        status: 'active',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No company mapping found')
      );
      warnSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // _calculateDueDate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('_calculateDueDate', () => {
    it('should return a date 30 days from now', () => {
      const before = new Date();
      before.setDate(before.getDate() + 30);

      const dueDate = BillingService._calculateDueDate();

      const after = new Date();
      after.setDate(after.getDate() + 30);

      expect(dueDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(dueDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createInvoice - edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createInvoice - validation', () => {
    it('should throw when companyId is missing', async () => {
      await expect(BillingService.createInvoice({ amount: 100 }))
        .rejects.toThrow('companyId is required');
    });

    it('should throw when amount is missing', async () => {
      await expect(BillingService.createInvoice({ companyId: 'comp-1' }))
        .rejects.toThrow('amount is required');
    });

    it('should throw when amount is negative', async () => {
      await expect(BillingService.createInvoice({ companyId: 'comp-1', amount: -10 }))
        .rejects.toThrow('amount must be positive');
    });

    it('should accept amount of 0', async () => {
      databaseAdapter.count.mockResolvedValue(0);
      databaseAdapter.create.mockResolvedValue({ invoiceId: 'INV-1', amount: 0 });

      const result = await BillingService.createInvoice({
        companyId: 'comp-1',
        amount: 0,
      });

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getInvoices - pagination and filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getInvoices - date filtering', () => {
    it('should include date range in query', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await BillingService.getInvoices('comp-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        status: 'paid',
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Invoice',
        expect.objectContaining({
          companyId: 'comp-1',
          status: 'paid',
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateInvoice - status transitions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateInvoice - status transitions', () => {
    it('should reject invalid status transition', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-1',
        companyId: 'comp-1',
        status: 'draft',
      });

      await expect(
        BillingService.updateInvoice('INV-1', 'comp-1', { status: 'paid' })
      ).rejects.toThrow('Invalid status transition');
    });

    it('should allow valid status transition from draft to sent', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'id_1',
        invoiceId: 'INV-1',
        companyId: 'comp-1',
        status: 'draft',
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        invoiceId: 'INV-1',
        status: 'sent',
      });

      const result = await BillingService.updateInvoice('INV-1', 'comp-1', { status: 'sent' });
      expect(result.status).toBe('sent');
    });

    it('should reject updating a paid invoice without status change', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-1',
        companyId: 'comp-1',
        status: 'paid',
      });

      await expect(
        BillingService.updateInvoice('INV-1', 'comp-1', { notes: 'updated' })
      ).rejects.toThrow('Cannot update paid invoice');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPaymentHistory - summary calculation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPaymentHistory - summary', () => {
    it('should calculate summary with refunds', async () => {
      databaseAdapter.find.mockResolvedValue([
        { status: 'succeeded', amount: 100, refundedAmount: 20 },
        { status: 'succeeded', amount: 200, refundedAmount: 0 },
        { status: 'failed', amount: 50 },
      ]);
      databaseAdapter.count.mockResolvedValue(3);

      const result = await BillingService.getPaymentHistory('comp-1');

      expect(result.summary.totalPaid).toBe(300);
      expect(result.summary.totalRefunded).toBe(20);
      expect(result.summary.netAmount).toBe(280);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getUsageMetrics - unlimited limits
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getUsageMetrics - unlimited limits', () => {
    it('should handle unlimited limits (-1)', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          companyId: 'comp-1',
          planId: 'enterprise',
          status: 'active',
        })
        .mockResolvedValueOnce({
          planId: 'enterprise',
          limits: {
            stakeholders: -1,
            documents: -1,
            users: -1,
            apiCallsPerMonth: -1,
            storageGB: -1,
          },
        });
      databaseAdapter.count
        .mockResolvedValueOnce(50)  // stakeholders
        .mockResolvedValueOnce(100) // documents
        .mockResolvedValueOnce(10); // users

      const metrics = await BillingService.getUsageMetrics('comp-1');

      expect(metrics.stakeholders.unlimited).toBe(true);
      expect(metrics.documents.unlimited).toBe(true);
      expect(metrics.users.unlimited).toBe(true);
      expect(metrics.apiCalls.unlimited).toBe(true);
      expect(metrics.storage.unlimited).toBe(true);
    });

    it('should calculate percentUsed for finite limits', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          companyId: 'comp-1',
          planId: 'starter',
          status: 'active',
        })
        .mockResolvedValueOnce({
          planId: 'starter',
          limits: {
            stakeholders: 100,
            documents: 50,
            users: 5,
            apiCallsPerMonth: 10000,
            storageGB: 10,
          },
        });
      databaseAdapter.count
        .mockResolvedValueOnce(25)  // stakeholders
        .mockResolvedValueOnce(10)  // documents
        .mockResolvedValueOnce(2);  // users

      const metrics = await BillingService.getUsageMetrics('comp-1');

      expect(metrics.stakeholders.percentUsed).toBe(25);
      expect(metrics.documents.percentUsed).toBe(20);
      expect(metrics.users.percentUsed).toBe(40);
    });

    it('should throw when no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(BillingService.getUsageMetrics('comp-1'))
        .rejects.toThrow('No active subscription');
    });

    it('should throw when plan has no limits', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ companyId: 'comp-1', planId: 'basic', status: 'active' })
        .mockResolvedValueOnce({ planId: 'basic' }); // no limits

      await expect(BillingService.getUsageMetrics('comp-1'))
        .rejects.toThrow('Plan configuration error');
    });

    it('should throw when companyId is missing', async () => {
      await expect(BillingService.getUsageMetrics(null))
        .rejects.toThrow('companyId is required');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getCurrentPlan
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getCurrentPlan', () => {
    it('should throw when companyId is missing', async () => {
      await expect(BillingService.getCurrentPlan(null))
        .rejects.toThrow('companyId is required');
    });

    it('should return null when no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      const result = await BillingService.getCurrentPlan('comp-1');
      expect(result).toBeNull();
    });

    it('should calculate daysRemaining', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      databaseAdapter.findOne
        .mockResolvedValueOnce({
          companyId: 'comp-1',
          planId: 'pro',
          status: 'active',
          currentPeriodEnd: futureDate.toISOString(),
        })
        .mockResolvedValueOnce({ planId: 'pro', name: 'Pro' });

      const result = await BillingService.getCurrentPlan('comp-1');

      expect(result.isActive).toBe(true);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(14);
      expect(result.daysRemaining).toBeLessThanOrEqual(16);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // addPaymentMethod / removePaymentMethod
  // ═══════════════════════════════════════════════════════════════════════════

  describe('addPaymentMethod', () => {
    it('should throw when last4 is missing', async () => {
      await expect(BillingService.addPaymentMethod('comp-1', {}))
        .rejects.toThrow('last4 is required');
    });

    it('should set as default when first payment method', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.create.mockResolvedValue({ methodId: 'PM-1', isDefault: true });

      const result = await BillingService.addPaymentMethod('comp-1', {
        last4: '4242',
        brand: 'visa',
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'PaymentMethod',
        expect.objectContaining({ isDefault: true })
      );
    });

    it('should unset other defaults when setting new default', async () => {
      databaseAdapter.find.mockResolvedValue([
        { _id: 'pm-old', methodId: 'PM-OLD', isDefault: true },
      ]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({ methodId: 'PM-NEW', isDefault: true });

      await BillingService.addPaymentMethod('comp-1', {
        last4: '1234',
        isDefault: true,
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm-old',
        { isDefault: false }
      );
    });
  });

  describe('removePaymentMethod', () => {
    it('should throw when method not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(BillingService.removePaymentMethod('comp-1', 'PM-MISSING'))
        .rejects.toThrow('Payment method not found');
    });

    it('should set another as default when removing default method', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'pm-1',
        methodId: 'PM-1',
        customerId: 'comp-1',
        isDefault: true,
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.find.mockResolvedValue([
        { _id: 'pm-2', methodId: 'PM-2', isDefault: false },
      ]);

      const result = await BillingService.removePaymentMethod('comp-1', 'PM-1');

      expect(result).toEqual({ success: true });
      // Should have set pm-2 as new default
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm-2',
        { isDefault: true }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // upgradePlan - edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('upgradePlan - edge cases', () => {
    it('should throw when no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(BillingService.upgradePlan('comp-1', 'new_plan'))
        .rejects.toThrow('No active subscription');
    });

    it('should throw when already on the same plan', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        companyId: 'comp-1',
        planId: 'same_plan',
        status: 'active',
      });

      await expect(BillingService.upgradePlan('comp-1', 'same_plan'))
        .rejects.toThrow('Already on this plan');
    });

    it('should throw when new plan not found', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ companyId: 'comp-1', planId: 'old', status: 'active' })
        .mockResolvedValueOnce({ planId: 'old', price: 10 })
        .mockResolvedValueOnce(null); // new plan not found

      await expect(BillingService.upgradePlan('comp-1', 'missing'))
        .rejects.toThrow('Plan not found');
    });

    it('should throw when new plan is not active', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ companyId: 'comp-1', planId: 'old', status: 'active' })
        .mockResolvedValueOnce({ planId: 'old', price: 10 })
        .mockResolvedValueOnce({ planId: 'new', price: 20, isActive: false });

      await expect(BillingService.upgradePlan('comp-1', 'new'))
        .rejects.toThrow('Plan is not active');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // downgradePlan - edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('downgradePlan - edge cases', () => {
    it('should throw when no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(BillingService.downgradePlan('comp-1', 'basic'))
        .rejects.toThrow('No active subscription');
    });

    it('should throw when trying to downgrade to more expensive plan', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ companyId: 'comp-1', planId: 'pro', status: 'active' })
        .mockResolvedValueOnce({ planId: 'pro', price: 50 })
        .mockResolvedValueOnce({ planId: 'enterprise', price: 100, isActive: true });

      await expect(BillingService.downgradePlan('comp-1', 'enterprise'))
        .rejects.toThrow('Cannot downgrade to a more expensive plan');
    });
  });
});
