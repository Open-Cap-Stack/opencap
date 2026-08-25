/**
 * Billing Service - Extended Coverage Tests
 *
 * Covers branches and methods not tested by the base billing test files:
 * - getPaymentMethods
 * - addPaymentMethod (first vs subsequent, default handling)
 * - removePaymentMethod (default reassignment)
 * - removePaymentMethodViaStripe
 * - createSetupIntent
 * - getPaymentHistory with date filters
 * - getInvoices with only startDate or endDate
 * - createInvoice with amount === 0
 * - updateInvoice when invoice not found / companyId mismatch
 * - getCurrentPlan with trialing subscription (no periodEnd)
 * - getUsageMetrics with missing subscription/plan
 * - downgradePlan: plan not found, plan inactive, same plan
 * - upgradePlan: plan not found, plan inactive
 * - _calculateDueDate
 */

const databaseAdapter = require('../../../services/databaseAdapter');
const stripeService = require('../../../services/stripeService');

jest.mock('../../../services/databaseAdapter');
jest.mock('../../../services/stripeService');

const BillingService = require('../../../services/billingService');

describe('BillingService - Extended Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stripeService.isConfigured.mockReturnValue(false);
  });

  // ─── getPaymentMethods ──────────────────────────────────────────────────────

  describe('getPaymentMethods', () => {
    it('should return active payment methods sorted by default first', async () => {
      const mockMethods = [
        { methodId: 'PM-001', last4: '4242', isDefault: true },
        { methodId: 'PM-002', last4: '1234', isDefault: false },
      ];
      databaseAdapter.find.mockResolvedValue(mockMethods);

      const result = await BillingService.getPaymentMethods('company-1');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'PaymentMethod',
        { customerId: 'company-1', status: 'active' },
        { sort: { isDefault: -1, createdAt: -1 } }
      );
      expect(result).toEqual(mockMethods);
    });

    it('should return empty array when no payment methods exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await BillingService.getPaymentMethods('company-empty');

      expect(result).toEqual([]);
    });
  });

  // ─── addPaymentMethod ──────────────────────────────────────────────────────

  describe('addPaymentMethod', () => {
    it('should make first payment method the default', async () => {
      databaseAdapter.find.mockResolvedValue([]); // no existing methods
      databaseAdapter.create.mockResolvedValue({
        methodId: 'PM-NEW',
        customerId: 'company-1',
        last4: '5555',
        isDefault: true,
      });

      const result = await BillingService.addPaymentMethod('company-1', {
        last4: '5555',
        brand: 'mastercard',
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'PaymentMethod',
        expect.objectContaining({
          customerId: 'company-1',
          last4: '5555',
          brand: 'mastercard',
          isDefault: true,
          status: 'active',
        })
      );
      expect(result.isDefault).toBe(true);
    });

    it('should unset existing defaults when isDefault is true', async () => {
      const existingMethods = [
        { _id: 'pm_old', methodId: 'PM-OLD', isDefault: true },
      ];
      databaseAdapter.find.mockResolvedValue(existingMethods);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({
        methodId: 'PM-NEW',
        isDefault: true,
      });

      await BillingService.addPaymentMethod('company-1', {
        last4: '9999',
        isDefault: true,
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm_old',
        { isDefault: false }
      );
    });

    it('should not set as default when existing methods and isDefault not set', async () => {
      databaseAdapter.find.mockResolvedValue([
        { _id: 'pm_1', methodId: 'PM-1', isDefault: true },
      ]);
      databaseAdapter.create.mockResolvedValue({
        methodId: 'PM-NEW',
        isDefault: undefined,
      });

      await BillingService.addPaymentMethod('company-1', {
        last4: '8888',
      });

      // When isDefault is not set and there are existing methods,
      // isDefault evaluates to undefined (falsy)
      const createCall = databaseAdapter.create.mock.calls[0][1];
      expect(createCall.isDefault).toBeFalsy();
    });

    it('should throw when last4 is missing', async () => {
      await expect(
        BillingService.addPaymentMethod('company-1', { brand: 'visa' })
      ).rejects.toThrow('last4 is required');
    });
  });

  // ─── removePaymentMethod ──────────────────────────────────────────────────

  describe('removePaymentMethod', () => {
    it('should deactivate a payment method', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'pm_db_1',
        methodId: 'PM-001',
        customerId: 'company-1',
        isDefault: false,
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await BillingService.removePaymentMethod('company-1', 'PM-001');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm_db_1',
        { status: 'inactive' }
      );
      expect(result).toEqual({ success: true });
    });

    it('should reassign default when removing the default method', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'pm_db_1',
        methodId: 'PM-001',
        customerId: 'company-1',
        isDefault: true,
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.find.mockResolvedValue([
        { _id: 'pm_db_2', methodId: 'PM-002', isDefault: false },
      ]);

      await BillingService.removePaymentMethod('company-1', 'PM-001');

      // Should set status inactive on removed method
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm_db_1',
        { status: 'inactive' }
      );
      // Should set remaining method as default
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm_db_2',
        { isDefault: true }
      );
    });

    it('should handle removing default when no remaining methods', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'pm_only',
        methodId: 'PM-ONLY',
        customerId: 'company-1',
        isDefault: true,
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.find.mockResolvedValue([]); // no remaining

      const result = await BillingService.removePaymentMethod('company-1', 'PM-ONLY');

      expect(result).toEqual({ success: true });
    });

    it('should throw when payment method not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        BillingService.removePaymentMethod('company-1', 'PM-MISSING')
      ).rejects.toThrow('Payment method not found');
    });
  });

  // ─── removePaymentMethodViaStripe ─────────────────────────────────────────

  describe('removePaymentMethodViaStripe', () => {
    it('should detach from Stripe before local removal', async () => {
      stripeService.isConfigured.mockReturnValue(true);
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          _id: 'pm_db',
          methodId: 'PM-1',
          customerId: 'comp_1',
          stripePaymentMethodId: 'pm_stripe_1',
          isDefault: false,
        })
        // second call from removePaymentMethod
        .mockResolvedValueOnce({
          _id: 'pm_db',
          methodId: 'PM-1',
          customerId: 'comp_1',
          isDefault: false,
        });
      stripeService.detachPaymentMethod.mockResolvedValue({});
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await BillingService.removePaymentMethodViaStripe('comp_1', 'PM-1');

      expect(stripeService.detachPaymentMethod).toHaveBeenCalledWith('pm_stripe_1');
    });

    it('should throw when payment method not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        BillingService.removePaymentMethodViaStripe('comp_1', 'PM-MISSING')
      ).rejects.toThrow('Payment method not found');
    });

    it('should skip Stripe detach when no stripePaymentMethodId', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          _id: 'pm_db',
          methodId: 'PM-1',
          customerId: 'comp_1',
          stripePaymentMethodId: null,
          isDefault: false,
        })
        .mockResolvedValueOnce({
          _id: 'pm_db',
          methodId: 'PM-1',
          customerId: 'comp_1',
          isDefault: false,
        });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await BillingService.removePaymentMethodViaStripe('comp_1', 'PM-1');

      expect(stripeService.detachPaymentMethod).not.toHaveBeenCalled();
    });
  });

  // ─── createSetupIntent ────────────────────────────────────────────────────

  describe('createSetupIntent', () => {
    it('should return clientSecret from Stripe SetupIntent', async () => {
      stripeService.isConfigured.mockReturnValue(true);
      databaseAdapter.findOne.mockResolvedValue({
        companyId: 'comp_1',
        stripeCustomerId: 'cus_1',
      });
      stripeService.createSetupIntent.mockResolvedValue({
        client_secret: 'seti_secret_123',
      });

      const result = await BillingService.createSetupIntent('comp_1', 'test@test.com', 'Test');

      expect(stripeService.createSetupIntent).toHaveBeenCalledWith('cus_1');
      expect(result).toEqual({ clientSecret: 'seti_secret_123' });
    });
  });

  // ─── getPaymentHistory with date filters ──────────────────────────────────

  describe('getPaymentHistory - date filters', () => {
    it('should apply startDate filter', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await BillingService.getPaymentHistory('comp_1', {
        startDate: '2026-01-01',
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Payment',
        expect.objectContaining({
          companyId: 'comp_1',
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should apply endDate filter only', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await BillingService.getPaymentHistory('comp_1', {
        endDate: '2026-12-31',
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Payment',
        expect.objectContaining({
          createdAt: expect.objectContaining({
            $lte: expect.any(Date),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle payments with no refunds', async () => {
      databaseAdapter.find.mockResolvedValue([
        { paymentId: 'PAY-1', amount: 100, status: 'succeeded' },
      ]);
      databaseAdapter.count.mockResolvedValue(1);

      const result = await BillingService.getPaymentHistory('comp_1', {});

      expect(result.summary.totalRefunded).toBe(0);
      expect(result.summary.netAmount).toBe(100);
    });

    it('should skip non-succeeded payments in summary', async () => {
      databaseAdapter.find.mockResolvedValue([
        { paymentId: 'PAY-1', amount: 200, status: 'failed' },
      ]);
      databaseAdapter.count.mockResolvedValue(1);

      const result = await BillingService.getPaymentHistory('comp_1', {});

      expect(result.summary.totalPaid).toBe(0);
    });
  });

  // ─── getInvoices edge cases ───────────────────────────────────────────────

  describe('getInvoices - edge cases', () => {
    it('should handle only startDate filter', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await BillingService.getInvoices('comp_1', { startDate: '2026-01-01' });

      const query = databaseAdapter.find.mock.calls[0][1];
      expect(query.createdAt.$gte).toBeDefined();
      expect(query.createdAt.$lte).toBeUndefined();
    });

    it('should handle only endDate filter', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await BillingService.getInvoices('comp_1', { endDate: '2026-12-31' });

      const query = databaseAdapter.find.mock.calls[0][1];
      expect(query.createdAt.$lte).toBeDefined();
      expect(query.createdAt.$gte).toBeUndefined();
    });

    it('should use default pagination', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      const result = await BillingService.getInvoices('comp_1');

      expect(result.currentPage).toBe(1);
      const options = databaseAdapter.find.mock.calls[0][2];
      expect(options.skip).toBe(0);
      expect(options.limit).toBe(10);
    });
  });

  // ─── createInvoice with amount === 0 ──────────────────────────────────────

  describe('createInvoice - zero amount', () => {
    it('should allow creating invoice with amount 0', async () => {
      databaseAdapter.count.mockResolvedValue(0);
      databaseAdapter.create.mockResolvedValue({
        invoiceId: 'INV-TEST',
        amount: 0,
        status: 'draft',
      });

      const result = await BillingService.createInvoice({
        companyId: 'comp_1',
        amount: 0,
      });

      expect(result.amount).toBe(0);
    });
  });

  // ─── getCurrentPlan edge cases ────────────────────────────────────────────

  describe('getCurrentPlan - edge cases', () => {
    it('should handle trialing status', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          subscriptionId: 'SUB-1',
          planId: 'PLAN-TRIAL',
          status: 'trialing',
          currentPeriodEnd: null,
        })
        .mockResolvedValueOnce({
          planId: 'PLAN-TRIAL',
          name: 'Trial',
        });

      const result = await BillingService.getCurrentPlan('comp_1');

      expect(result.isActive).toBe(true);
      expect(result.daysRemaining).toBeNull();
    });
  });

  // ─── getUsageMetrics edge cases ───────────────────────────────────────────

  describe('getUsageMetrics - error handling', () => {
    it('should throw when companyId is missing', async () => {
      await expect(BillingService.getUsageMetrics()).rejects.toThrow(
        'companyId is required'
      );
    });

    it('should throw when no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(BillingService.getUsageMetrics('comp_1')).rejects.toThrow(
        'No active subscription'
      );
    });

    it('should throw when plan has no limits', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'PLAN-X', status: 'active' })
        .mockResolvedValueOnce({ planId: 'PLAN-X', limits: null });

      await expect(BillingService.getUsageMetrics('comp_1')).rejects.toThrow(
        'Plan configuration error'
      );
    });

    it('should throw when plan is null', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'PLAN-X', status: 'active' })
        .mockResolvedValueOnce(null);

      await expect(BillingService.getUsageMetrics('comp_1')).rejects.toThrow(
        'Plan configuration error'
      );
    });

    it('should handle users with limited plan', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'basic', status: 'active' })
        .mockResolvedValueOnce({
          planId: 'basic',
          limits: { stakeholders: 10, documents: 50, users: 5 },
        });
      databaseAdapter.count
        .mockResolvedValueOnce(3) // stakeholders
        .mockResolvedValueOnce(10) // documents
        .mockResolvedValueOnce(2); // users

      const result = await BillingService.getUsageMetrics('comp_1');

      expect(result.users.current).toBe(2);
      expect(result.users.limit).toBe(5);
      expect(result.users.percentUsed).toBe(40);
    });

    it('should handle unlimited users', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'ent', status: 'active' })
        .mockResolvedValueOnce({
          planId: 'ent',
          limits: { stakeholders: -1, documents: -1, users: -1 },
        });
      databaseAdapter.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(50);

      const result = await BillingService.getUsageMetrics('comp_1');

      expect(result.users.unlimited).toBe(true);
    });

    it('should handle unlimited storageGB', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'ent', status: 'active' })
        .mockResolvedValueOnce({
          planId: 'ent',
          limits: {
            stakeholders: -1,
            documents: -1,
            users: -1,
            storageGB: -1,
          },
        });
      databaseAdapter.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await BillingService.getUsageMetrics('comp_1');

      expect(result.storage.unlimited).toBe(true);
      expect(result.storage.unit).toBe('GB');
    });

    it('should handle limited storageGB', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ planId: 'pro', status: 'active' })
        .mockResolvedValueOnce({
          planId: 'pro',
          limits: {
            stakeholders: 100,
            documents: 500,
            users: 10,
            storageGB: 50,
          },
        });
      databaseAdapter.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(3);

      const result = await BillingService.getUsageMetrics('comp_1');

      expect(result.storage.limit).toBe(50);
      expect(result.storage.percentUsed).toBe(0);
    });
  });

  // ─── upgradePlan - additional branches ────────────────────────────────────

  describe('upgradePlan - additional branches', () => {
    it('should throw when new plan not found', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          _id: 's1',
          planId: 'basic',
          status: 'active',
        })
        .mockResolvedValueOnce({ planId: 'basic', price: 25 })
        .mockResolvedValueOnce(null); // new plan not found

      await expect(
        BillingService.upgradePlan('comp_1', 'nonexistent')
      ).rejects.toThrow('Plan not found');
    });

    it('should throw when new plan is inactive', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          _id: 's1',
          planId: 'basic',
          status: 'active',
        })
        .mockResolvedValueOnce({ planId: 'basic', price: 25 })
        .mockResolvedValueOnce({ planId: 'pro', price: 99, isActive: false });

      await expect(
        BillingService.upgradePlan('comp_1', 'pro')
      ).rejects.toThrow('Plan is not active');
    });

    it('should handle upgrade with no currentPeriodEnd (prorationAmount = 0)', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          _id: 's1',
          planId: 'basic',
          status: 'active',
          currentPeriodEnd: null,
        })
        .mockResolvedValueOnce({ planId: 'basic', price: 25 })
        .mockResolvedValueOnce({ planId: 'pro', price: 99, isActive: true });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        planId: 'pro',
      });

      const result = await BillingService.upgradePlan('comp_1', 'pro');

      expect(result.success).toBe(true);
      expect(result.prorationAmount).toBe(0);
    });
  });

  // ─── downgradePlan - additional branches ──────────────────────────────────

  describe('downgradePlan - additional branches', () => {
    it('should throw when no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        BillingService.downgradePlan('comp_1', 'basic')
      ).rejects.toThrow('No active subscription');
    });

    it('should throw when already on the plan', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce({
        planId: 'basic',
        status: 'active',
      });

      await expect(
        BillingService.downgradePlan('comp_1', 'basic')
      ).rejects.toThrow('Already on this plan');
    });

    it('should throw when new plan not found', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          planId: 'pro',
          status: 'active',
        })
        .mockResolvedValueOnce({ planId: 'pro', price: 99 })
        .mockResolvedValueOnce(null);

      await expect(
        BillingService.downgradePlan('comp_1', 'missing')
      ).rejects.toThrow('Plan not found');
    });

    it('should throw when new plan is not active', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({
          planId: 'pro',
          status: 'active',
        })
        .mockResolvedValueOnce({ planId: 'pro', price: 99 })
        .mockResolvedValueOnce({
          planId: 'basic',
          price: 25,
          isActive: false,
        });

      await expect(
        BillingService.downgradePlan('comp_1', 'basic')
      ).rejects.toThrow('Plan is not active');
    });
  });

  // ─── updateInvoice - additional branches ──────────────────────────────────

  describe('updateInvoice - additional branches', () => {
    it('should throw when invoice not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        BillingService.updateInvoice('INV-MISSING', 'comp_1', {})
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw when companyId does not match', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-1',
        companyId: 'other-company',
        status: 'draft',
      });

      await expect(
        BillingService.updateInvoice('INV-1', 'comp_1', {})
      ).rejects.toThrow('Invoice not found');
    });

    it('should allow status change on paid invoice (refund transition)', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-1',
        companyId: 'comp_1',
        status: 'paid',
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        status: 'refunded',
      });

      const result = await BillingService.updateInvoice('INV-1', 'comp_1', {
        status: 'refunded',
      });

      expect(result.status).toBe('refunded');
    });

    it('should reject invalid transition from void', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-1',
        companyId: 'comp_1',
        status: 'void',
      });

      await expect(
        BillingService.updateInvoice('INV-1', 'comp_1', { status: 'paid' })
      ).rejects.toThrow('Invalid status transition');
    });

    it('should reject invalid transition from refunded', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        invoiceId: 'INV-1',
        companyId: 'comp_1',
        status: 'refunded',
      });

      await expect(
        BillingService.updateInvoice('INV-1', 'comp_1', { status: 'paid' })
      ).rejects.toThrow('Invalid status transition');
    });
  });

  // ─── _calculateDueDate ────────────────────────────────────────────────────

  describe('_calculateDueDate', () => {
    it('should return a date 30 days in the future', () => {
      const before = new Date();
      const dueDate = BillingService._calculateDueDate();
      const after = new Date();

      // Due date should be roughly 30 days from now
      const minExpected = before.getTime() + 29 * 24 * 60 * 60 * 1000;
      const maxExpected = after.getTime() + 31 * 24 * 60 * 60 * 1000;

      expect(dueDate.getTime()).toBeGreaterThanOrEqual(minExpected);
      expect(dueDate.getTime()).toBeLessThanOrEqual(maxExpected);
    });
  });

  // ─── setDefaultPaymentMethod - edge cases ─────────────────────────────────

  describe('setDefaultPaymentMethod - edge cases', () => {
    it('should throw when payment method not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        BillingService.setDefaultPaymentMethod('comp_1', 'PM-MISSING')
      ).rejects.toThrow('Payment method not found');
    });

    it('should skip Stripe when no stripePaymentMethodId', async () => {
      stripeService.isConfigured.mockReturnValue(true);
      databaseAdapter.findOne.mockResolvedValueOnce({
        _id: 'pm_db',
        methodId: 'PM-1',
        customerId: 'comp_1',
        stripePaymentMethodId: null,
      });
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await BillingService.setDefaultPaymentMethod('comp_1', 'PM-1');

      expect(stripeService.setDefaultPaymentMethod).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should only unset default on other methods with isDefault=true', async () => {
      stripeService.isConfigured.mockReturnValue(false);
      databaseAdapter.findOne.mockResolvedValueOnce({
        _id: 'pm_db',
        methodId: 'PM-1',
        customerId: 'comp_1',
        stripePaymentMethodId: null,
      });
      databaseAdapter.find.mockResolvedValue([
        { _id: 'pm_x', methodId: 'PM-X', isDefault: true },
        { _id: 'pm_1', methodId: 'PM-1', isDefault: false },
      ]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await BillingService.setDefaultPaymentMethod('comp_1', 'PM-1');

      // Should unset default on PM-X
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'PaymentMethod',
        'pm_x',
        { isDefault: false }
      );
    });
  });
});
