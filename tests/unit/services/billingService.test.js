/**
 * Billing Service Tests
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Test suite for billing service including:
 * - Current plan retrieval
 * - Usage metrics aggregation
 * - Invoice management
 * - Payment history
 * - Plan upgrade/downgrade
 */

const BillingService = require('../../../services/billingService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentPlan', () => {
    it('should return current plan with subscription details', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        companyId: 'company-123',
        planId: 'PLAN-PRO',
        status: 'active',
        currentPeriodEnd: new Date('2026-02-15'),
        quantity: 1
      };

      const mockPlan = {
        planId: 'PLAN-PRO',
        name: 'Professional',
        price: 99,
        features: ['feature1', 'feature2'],
        limits: {
          stakeholders: 100,
          documents: -1,
          apiCallsPerMonth: 25000
        }
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      const result = await BillingService.getCurrentPlan('company-123');

      expect(result).toBeDefined();
      expect(result.subscription.subscriptionId).toBe('SUB-12345678');
      expect(result.plan.name).toBe('Professional');
      expect(result.isActive).toBe(true);
      expect(databaseAdapter.findOne).toHaveBeenCalledWith('Subscription', expect.any(Object));
    });

    it('should return null when no active subscription exists', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce(null);

      const result = await BillingService.getCurrentPlan('company-123');

      expect(result).toBeNull();
    });

    it('should throw error when companyId is missing', async () => {
      await expect(BillingService.getCurrentPlan()).rejects.toThrow('companyId is required');
    });
  });

  describe('getUsageMetrics', () => {
    it('should aggregate usage metrics for a company', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        planId: 'PLAN-PRO',
        status: 'active'
      };

      const mockPlan = {
        planId: 'PLAN-PRO',
        limits: {
          stakeholders: 100,
          documents: -1,
          apiCallsPerMonth: 50000,
          storageGB: 10
        }
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      databaseAdapter.count
        .mockResolvedValueOnce(45) // stakeholders
        .mockResolvedValueOnce(120); // documents

      const result = await BillingService.getUsageMetrics('company-123');

      expect(result).toBeDefined();
      expect(result.stakeholders.current).toBe(45);
      expect(result.stakeholders.limit).toBe(100);
      expect(result.stakeholders.percentUsed).toBe(45);
      expect(result.documents.unlimited).toBe(true);
      expect(result.apiCalls.limit).toBe(50000);
    });

    it('should handle unlimited limits (-1)', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        planId: 'PLAN-ENT',
        status: 'active'
      };

      const mockPlan = {
        planId: 'PLAN-ENT',
        limits: {
          stakeholders: -1,
          documents: -1,
          apiCallsPerMonth: -1
        }
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      databaseAdapter.count
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(1000);

      const result = await BillingService.getUsageMetrics('company-123');

      expect(result.stakeholders.unlimited).toBe(true);
      expect(result.documents.unlimited).toBe(true);
      expect(result.apiCalls.unlimited).toBe(true);
    });

    it('should calculate percentage used correctly', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        planId: 'PLAN-BASIC',
        status: 'active'
      };

      const mockPlan = {
        planId: 'PLAN-BASIC',
        limits: {
          stakeholders: 50,
          documents: 100,
          apiCallsPerMonth: 10000
        }
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      databaseAdapter.count
        .mockResolvedValueOnce(25) // 50%
        .mockResolvedValueOnce(75); // 75%

      const result = await BillingService.getUsageMetrics('company-123');

      expect(result.stakeholders.percentUsed).toBe(50);
      expect(result.documents.percentUsed).toBe(75);
    });
  });

  describe('createInvoice', () => {
    it('should create a new invoice', async () => {
      const invoiceData = {
        companyId: 'company-123',
        amount: 99,
        currency: 'USD',
        lineItems: [
          { description: 'Professional Plan', quantity: 1, unitPrice: 99, amount: 99 }
        ]
      };

      const mockCreatedInvoice = {
        invoiceId: 'INV-12345678',
        ...invoiceData,
        status: 'draft',
        invoiceNumber: '202601-0001'
      };

      databaseAdapter.count.mockResolvedValueOnce(0);
      databaseAdapter.create.mockResolvedValueOnce(mockCreatedInvoice);

      const result = await BillingService.createInvoice(invoiceData);

      expect(result).toBeDefined();
      expect(result.invoiceId).toBe('INV-12345678');
      expect(result.status).toBe('draft');
      expect(databaseAdapter.create).toHaveBeenCalledWith('Invoice', expect.any(Object));
    });

    it('should validate required fields', async () => {
      await expect(BillingService.createInvoice({})).rejects.toThrow('companyId is required');
      await expect(BillingService.createInvoice({ companyId: 'c1' })).rejects.toThrow('amount is required');
    });

    it('should validate amount is positive', async () => {
      await expect(BillingService.createInvoice({
        companyId: 'company-123',
        amount: -50
      })).rejects.toThrow('amount must be positive');
    });
  });

  describe('getInvoices', () => {
    it('should list invoices with pagination', async () => {
      const mockInvoices = [
        { invoiceId: 'INV-001', amount: 99, status: 'paid' },
        { invoiceId: 'INV-002', amount: 99, status: 'paid' }
      ];

      databaseAdapter.find.mockResolvedValueOnce(mockInvoices);
      databaseAdapter.count.mockResolvedValueOnce(25);

      const result = await BillingService.getInvoices('company-123', { page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.invoices).toHaveLength(2);
      expect(result.totalCount).toBe(25);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    it('should filter invoices by status', async () => {
      databaseAdapter.find.mockResolvedValueOnce([]);
      databaseAdapter.count.mockResolvedValueOnce(0);

      await BillingService.getInvoices('company-123', { status: 'paid' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Invoice',
        expect.objectContaining({ status: 'paid' }),
        expect.any(Object)
      );
    });

    it('should filter invoices by date range', async () => {
      databaseAdapter.find.mockResolvedValueOnce([]);
      databaseAdapter.count.mockResolvedValueOnce(0);

      await BillingService.getInvoices('company-123', {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Invoice',
        expect.objectContaining({
          createdAt: expect.any(Object)
        }),
        expect.any(Object)
      );
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice with detailed breakdown', async () => {
      const mockInvoice = {
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        amount: 99,
        status: 'paid',
        lineItems: [
          { description: 'Professional Plan', quantity: 1, unitPrice: 99, amount: 99 }
        ]
      };

      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);

      const result = await BillingService.getInvoiceById('INV-12345678', 'company-123');

      expect(result).toBeDefined();
      expect(result.invoiceId).toBe('INV-12345678');
      expect(result.lineItems).toHaveLength(1);
    });

    it('should throw error if invoice not found', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce(null);

      await expect(BillingService.getInvoiceById('INV-NOTFOUND', 'company-123'))
        .rejects.toThrow('Invoice not found');
    });

    it('should validate companyId matches invoice', async () => {
      const mockInvoice = {
        invoiceId: 'INV-12345678',
        companyId: 'company-456', // Different company
        amount: 99
      };

      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(BillingService.getInvoiceById('INV-12345678', 'company-123'))
        .rejects.toThrow('Invoice not found');
    });
  });

  describe('generateInvoicePDF', () => {
    it('should throw error if pdfkit is not available or invoice not found', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce(null);

      await expect(BillingService.generateInvoicePDF('INV-12345678', 'company-123'))
        .rejects.toThrow();
    });

    it('should throw error if invoice not found', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce(null);

      await expect(BillingService.generateInvoicePDF('INV-NOTFOUND', 'company-123'))
        .rejects.toThrow('Invoice not found');
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice status', async () => {
      const mockInvoice = {
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        status: 'draft'
      };

      const mockUpdatedInvoice = {
        ...mockInvoice,
        status: 'sent'
      };

      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce(mockUpdatedInvoice);

      const result = await BillingService.updateInvoice('INV-12345678', 'company-123', { status: 'sent' });

      expect(result.status).toBe('sent');
    });

    it('should not allow updating paid invoices', async () => {
      const mockInvoice = {
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        status: 'paid'
      };

      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(BillingService.updateInvoice('INV-12345678', 'company-123', { amount: 150 }))
        .rejects.toThrow('Cannot update paid invoice');
    });

    it('should validate status transitions', async () => {
      const mockInvoice = {
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        status: 'draft'
      };

      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(BillingService.updateInvoice('INV-12345678', 'company-123', { status: 'paid' }))
        .rejects.toThrow('Invalid status transition');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history with breakdowns', async () => {
      const mockPayments = [
        { paymentId: 'PAY-001', amount: 99, status: 'succeeded', createdAt: new Date() },
        { paymentId: 'PAY-002', amount: 99, status: 'succeeded', createdAt: new Date() }
      ];

      databaseAdapter.find.mockResolvedValueOnce(mockPayments);
      databaseAdapter.count.mockResolvedValueOnce(2);

      const result = await BillingService.getPaymentHistory('company-123', { page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.payments).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should calculate summary statistics', async () => {
      const mockPayments = [
        { paymentId: 'PAY-001', amount: 99, status: 'succeeded', refundedAmount: 0 },
        { paymentId: 'PAY-002', amount: 99, status: 'succeeded', refundedAmount: 50 }
      ];

      databaseAdapter.find.mockResolvedValueOnce(mockPayments);
      databaseAdapter.count.mockResolvedValueOnce(2);

      const result = await BillingService.getPaymentHistory('company-123', { page: 1, limit: 10 });

      expect(result.summary).toBeDefined();
      expect(result.summary.totalPaid).toBe(198);
      expect(result.summary.totalRefunded).toBe(50);
      expect(result.summary.netAmount).toBe(148);
    });
  });

  describe('upgradePlan', () => {
    it('should upgrade to a higher plan', async () => {
      const mockSubscription = {
        _id: 'sub-id-123',
        subscriptionId: 'SUB-12345678',
        companyId: 'company-123',
        planId: 'PLAN-BASIC',
        status: 'active',
        currentPeriodEnd: new Date('2026-02-15')
      };

      const mockCurrentPlan = {
        planId: 'PLAN-BASIC',
        price: 25
      };

      const mockNewPlan = {
        planId: 'PLAN-PRO',
        price: 99,
        isActive: true
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockCurrentPlan)
        .mockResolvedValueOnce(mockNewPlan);

      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({
        ...mockSubscription,
        planId: 'PLAN-PRO'
      });

      const result = await BillingService.upgradePlan('company-123', 'PLAN-PRO');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.subscription.planId).toBe('PLAN-PRO');
    });

    it('should throw error if no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce(null);

      await expect(BillingService.upgradePlan('company-123', 'PLAN-PRO'))
        .rejects.toThrow('No active subscription');
    });

    it('should throw error if trying to upgrade to same plan', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        planId: 'PLAN-PRO',
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValueOnce(mockSubscription);

      await expect(BillingService.upgradePlan('company-123', 'PLAN-PRO'))
        .rejects.toThrow('Already on this plan');
    });
  });

  describe('downgradePlan', () => {
    it('should downgrade to a lower plan at period end', async () => {
      const mockSubscription = {
        _id: 'sub-id-123',
        subscriptionId: 'SUB-12345678',
        companyId: 'company-123',
        planId: 'PLAN-PRO',
        status: 'active',
        currentPeriodEnd: new Date('2026-02-15')
      };

      const mockCurrentPlan = {
        planId: 'PLAN-PRO',
        price: 99
      };

      const mockNewPlan = {
        planId: 'PLAN-BASIC',
        price: 25,
        isActive: true
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockCurrentPlan)
        .mockResolvedValueOnce(mockNewPlan);

      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({
        ...mockSubscription,
        metadata: { scheduledDowngrade: 'PLAN-BASIC' }
      });

      const result = await BillingService.downgradePlan('company-123', 'PLAN-BASIC');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.scheduledDowngrade).toBe(true);
    });

    it('should validate downgrade is to a cheaper plan', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        planId: 'PLAN-BASIC',
        status: 'active'
      };

      const mockCurrentPlan = {
        planId: 'PLAN-BASIC',
        price: 25
      };

      const mockNewPlan = {
        planId: 'PLAN-PRO',
        price: 99,
        isActive: true
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockCurrentPlan)
        .mockResolvedValueOnce(mockNewPlan);

      await expect(BillingService.downgradePlan('company-123', 'PLAN-PRO'))
        .rejects.toThrow('Cannot downgrade to a more expensive plan');
    });
  });

  describe('Invoice status transitions', () => {
    it('should allow transition from draft to sent', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'draft' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'sent' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'sent' });
      expect(result.status).toBe('sent');
    });

    it('should allow transition from draft to void', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'draft' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'void' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'void' });
      expect(result.status).toBe('void');
    });

    it('should allow transition from sent to paid', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'sent' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'paid' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'paid' });
      expect(result.status).toBe('paid');
    });

    it('should allow transition from sent to overdue', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'sent' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'overdue' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'overdue' });
      expect(result.status).toBe('overdue');
    });

    it('should allow transition from sent to void', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'sent' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'void' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'void' });
      expect(result.status).toBe('void');
    });

    it('should allow transition from overdue to paid', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'overdue' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'paid' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'paid' });
      expect(result.status).toBe('paid');
    });

    it('should allow transition from overdue to void', async () => {
      const mockInvoice = { invoiceId: 'INV-1', companyId: 'c1', status: 'overdue' };
      databaseAdapter.findOne.mockResolvedValueOnce(mockInvoice);
      databaseAdapter.findByIdAndUpdate.mockResolvedValueOnce({ ...mockInvoice, status: 'void' });

      const result = await BillingService.updateInvoice('INV-1', 'c1', { status: 'void' });
      expect(result.status).toBe('void');
    });
  });
});
