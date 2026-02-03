/**
 * Subscription Service Unit Tests
 * Issue #115: Implement Subscription System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const SubscriptionService = require('../../../services/subscriptionService');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    const mockPlan = {
      planId: 'PLAN-001',
      name: 'Professional',
      price: 99,
      currency: 'USD',
      interval: 'month',
      trialPeriodDays: 14,
      features: ['feature1', 'feature2'],
      limits: {
        stakeholders: 100,
        documents: 1000,
        storageGB: 10,
        users: 5,
        apiCallsPerMonth: 10000
      },
      isActive: true
    };

    it('should create a subscription with valid data', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'PLAN-001'
      };

      databaseAdapter.findOne.mockResolvedValue(mockPlan);
      databaseAdapter.create.mockResolvedValue({
        subscriptionId: 'SUB-12345678',
        ...subscriptionData,
        status: 'trialing',
        quantity: 1
      });

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result).toHaveProperty('subscriptionId');
      expect(result.companyId).toBe('COMPANY-001');
      expect(result.planId).toBe('PLAN-001');
      expect(result.status).toBe('trialing');
    });

    it('should set trial period based on plan configuration', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'PLAN-001'
      };

      databaseAdapter.findOne.mockResolvedValue(mockPlan);
      databaseAdapter.create.mockImplementation((model, data) => Promise.resolve(data));

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result.trialStart).toBeDefined();
      expect(result.trialEnd).toBeDefined();
    });

    it('should throw error if plan does not exist', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'INVALID-PLAN'
      };

      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(SubscriptionService.createSubscription(subscriptionData))
        .rejects.toThrow('Plan not found');
    });

    it('should throw error if plan is not active', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'PLAN-001'
      };

      databaseAdapter.findOne.mockResolvedValue({ ...mockPlan, isActive: false });

      await expect(SubscriptionService.createSubscription(subscriptionData))
        .rejects.toThrow('Plan is not active');
    });

    it('should allow custom quantity', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'PLAN-001',
        quantity: 5
      };

      databaseAdapter.findOne.mockResolvedValue(mockPlan);
      databaseAdapter.create.mockImplementation((model, data) => Promise.resolve(data));

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result.quantity).toBe(5);
    });

    it('should skip trial if skipTrial option is true', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'PLAN-001',
        skipTrial: true
      };

      databaseAdapter.findOne.mockResolvedValue(mockPlan);
      databaseAdapter.create.mockImplementation((model, data) => Promise.resolve(data));

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result.status).toBe('active');
      expect(result.trialStart).toBeNull();
      expect(result.trialEnd).toBeNull();
    });
  });

  describe('updateSubscription', () => {
    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'active',
      quantity: 1
    };

    it('should update subscription plan', async () => {
      const newPlan = {
        planId: 'PLAN-002',
        name: 'Enterprise',
        isActive: true,
        trialPeriodDays: 0
      };

      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findOne.mockResolvedValue(newPlan);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        planId: 'PLAN-002'
      });

      const result = await SubscriptionService.updateSubscription('sub-id-123', {
        planId: 'PLAN-002'
      });

      expect(result.planId).toBe('PLAN-002');
    });

    it('should update subscription quantity', async () => {
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        quantity: 10
      });

      const result = await SubscriptionService.updateSubscription('sub-id-123', {
        quantity: 10
      });

      expect(result.quantity).toBe(10);
    });

    it('should throw error if subscription not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(SubscriptionService.updateSubscription('invalid-id', { quantity: 5 }))
        .rejects.toThrow('Subscription not found');
    });

    it('should not allow updating canceled subscription', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled'
      });

      await expect(SubscriptionService.updateSubscription('sub-id-123', { quantity: 5 }))
        .rejects.toThrow('Cannot update canceled subscription');
    });
  });

  describe('cancelSubscription', () => {
    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'active',
      currentPeriodEnd: new Date('2024-02-28')
    };

    it('should cancel subscription immediately', async () => {
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
        canceledAt: new Date()
      });

      const result = await SubscriptionService.cancelSubscription('sub-id-123', {
        immediate: true
      });

      expect(result.status).toBe('canceled');
      expect(result.canceledAt).toBeDefined();
    });

    it('should schedule cancellation at period end', async () => {
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true
      });

      const result = await SubscriptionService.cancelSubscription('sub-id-123', {
        immediate: false
      });

      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('should throw error if subscription not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(SubscriptionService.cancelSubscription('invalid-id', {}))
        .rejects.toThrow('Subscription not found');
    });

    it('should throw error if subscription already canceled', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled'
      });

      await expect(SubscriptionService.cancelSubscription('sub-id-123', {}))
        .rejects.toThrow('Subscription is already canceled');
    });

    it('should record cancellation reason', async () => {
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findByIdAndUpdate.mockImplementation((model, id, data) =>
        Promise.resolve({ ...mockSubscription, ...data })
      );

      const result = await SubscriptionService.cancelSubscription('sub-id-123', {
        reason: 'Too expensive'
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Subscription',
        'sub-id-123',
        expect.objectContaining({
          cancellationReason: 'Too expensive'
        }),
        expect.any(Object)
      );
    });
  });

  describe('pauseSubscription', () => {
    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      status: 'active'
    };

    it('should pause an active subscription', async () => {
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        status: 'paused',
        pausedAt: new Date()
      });

      const result = await SubscriptionService.pauseSubscription('sub-id-123');

      expect(result.status).toBe('paused');
      expect(result.pausedAt).toBeDefined();
    });

    it('should set resume date if provided', async () => {
      const resumeDate = new Date('2024-03-01');
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        status: 'paused',
        pausedAt: new Date(),
        resumesAt: resumeDate
      });

      const result = await SubscriptionService.pauseSubscription('sub-id-123', {
        resumeDate
      });

      expect(result.resumesAt).toEqual(resumeDate);
    });

    it('should throw error if subscription not active', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled'
      });

      await expect(SubscriptionService.pauseSubscription('sub-id-123'))
        .rejects.toThrow('Only active subscriptions can be paused');
    });
  });

  describe('resumeSubscription', () => {
    const mockPausedSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      status: 'paused',
      pausedAt: new Date('2024-01-15')
    };

    it('should resume a paused subscription', async () => {
      databaseAdapter.findById.mockResolvedValue(mockPausedSubscription);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockPausedSubscription,
        status: 'active',
        pausedAt: null,
        resumesAt: null
      });

      const result = await SubscriptionService.resumeSubscription('sub-id-123');

      expect(result.status).toBe('active');
    });

    it('should throw error if subscription not paused', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockPausedSubscription,
        status: 'active'
      });

      await expect(SubscriptionService.resumeSubscription('sub-id-123'))
        .rejects.toThrow('Only paused subscriptions can be resumed');
    });
  });

  describe('checkFeatureAccess', () => {
    const mockPlan = {
      planId: 'PLAN-001',
      features: ['cap_table', 'document_management', 'investor_portal']
    };

    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'active'
    };

    it('should return true if feature is available', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      const result = await SubscriptionService.checkFeatureAccess('COMPANY-001', 'cap_table');

      expect(result).toBe(true);
    });

    it('should return false if feature is not available', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      const result = await SubscriptionService.checkFeatureAccess('COMPANY-001', 'advanced_analytics');

      expect(result).toBe(false);
    });

    it('should return false if subscription is not active', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled'
      });

      const result = await SubscriptionService.checkFeatureAccess('COMPANY-001', 'cap_table');

      expect(result).toBe(false);
    });

    it('should return false if no active subscription', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await SubscriptionService.checkFeatureAccess('COMPANY-001', 'cap_table');

      expect(result).toBe(false);
    });

    it('should treat trialing as having access', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ ...mockSubscription, status: 'trialing' })
        .mockResolvedValueOnce(mockPlan);

      const result = await SubscriptionService.checkFeatureAccess('COMPANY-001', 'cap_table');

      expect(result).toBe(true);
    });
  });

  describe('checkUsageLimit', () => {
    const mockPlan = {
      planId: 'PLAN-001',
      limits: {
        stakeholders: 100,
        documents: 1000,
        storageGB: 10,
        users: 5,
        apiCallsPerMonth: 10000
      }
    };

    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'active',
      quantity: 1
    };

    it('should return within limit when usage is below limit', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);
      databaseAdapter.count.mockResolvedValue(50);

      const result = await SubscriptionService.checkUsageLimit('COMPANY-001', 'stakeholders');

      expect(result.withinLimit).toBe(true);
      expect(result.currentUsage).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(50);
    });

    it('should return not within limit when at capacity', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);
      databaseAdapter.count.mockResolvedValue(100);

      const result = await SubscriptionService.checkUsageLimit('COMPANY-001', 'stakeholders');

      expect(result.withinLimit).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should multiply limit by quantity for seat-based limits', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ ...mockSubscription, quantity: 2 })
        .mockResolvedValueOnce(mockPlan);
      databaseAdapter.count.mockResolvedValue(150);

      const result = await SubscriptionService.checkUsageLimit('COMPANY-001', 'stakeholders');

      expect(result.limit).toBe(200); // 100 * 2
      expect(result.withinLimit).toBe(true);
    });

    it('should return error if limit type not found', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      await expect(SubscriptionService.checkUsageLimit('COMPANY-001', 'invalidLimit'))
        .rejects.toThrow('Unknown limit type');
    });
  });

  describe('processRenewal', () => {
    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01')
    };

    const mockPlan = {
      planId: 'PLAN-001',
      price: 99,
      interval: 'month'
    };

    it('should renew subscription and update period dates', async () => {
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findOne.mockResolvedValue(mockPlan);
      databaseAdapter.findByIdAndUpdate.mockImplementation((model, id, data) =>
        Promise.resolve({ ...mockSubscription, ...data })
      );

      const result = await SubscriptionService.processRenewal('sub-id-123');

      expect(result.currentPeriodStart).toBeDefined();
      expect(new Date(result.currentPeriodEnd) > new Date(mockSubscription.currentPeriodEnd)).toBe(true);
    });

    it('should cancel subscription scheduled for cancellation', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
        canceledAt: new Date()
      });

      const result = await SubscriptionService.processRenewal('sub-id-123');

      expect(result.status).toBe('canceled');
    });

    it('should throw error if subscription not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(SubscriptionService.processRenewal('invalid-id'))
        .rejects.toThrow('Subscription not found');
    });

    it('should not renew already canceled subscription', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled'
      });

      await expect(SubscriptionService.processRenewal('sub-id-123'))
        .rejects.toThrow('Cannot renew canceled subscription');
    });

    it('should handle yearly renewal interval', async () => {
      const yearlyPlan = { ...mockPlan, interval: 'year' };
      databaseAdapter.findById.mockResolvedValue(mockSubscription);
      databaseAdapter.findOne.mockResolvedValue(yearlyPlan);
      databaseAdapter.findByIdAndUpdate.mockImplementation((model, id, data) =>
        Promise.resolve({ ...mockSubscription, ...data })
      );

      const result = await SubscriptionService.processRenewal('sub-id-123');

      // Check that period end is approximately 1 year after current period end
      const expectedEnd = new Date(mockSubscription.currentPeriodEnd);
      expectedEnd.setFullYear(expectedEnd.getFullYear() + 1);

      const resultEnd = new Date(result.currentPeriodEnd);
      expect(resultEnd.getFullYear()).toBe(expectedEnd.getFullYear());
    });
  });

  describe('getSubscriptionStatus', () => {
    const mockSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      trialStart: null,
      trialEnd: null,
      quantity: 1
    };

    const mockPlan = {
      planId: 'PLAN-001',
      name: 'Professional',
      price: 99,
      features: ['feature1', 'feature2'],
      limits: {
        stakeholders: 100,
        documents: 1000
      }
    };

    it('should return complete subscription status', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(mockPlan);

      const result = await SubscriptionService.getSubscriptionStatus('COMPANY-001');

      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('isActive', true);
    });

    it('should calculate days remaining in period', async () => {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 15);

      databaseAdapter.findOne
        .mockResolvedValueOnce({ ...mockSubscription, currentPeriodEnd: futureEnd })
        .mockResolvedValueOnce(mockPlan);

      const result = await SubscriptionService.getSubscriptionStatus('COMPANY-001');

      expect(result.daysRemaining).toBeGreaterThan(0);
      expect(result.daysRemaining).toBeLessThanOrEqual(15);
    });

    it('should return null if no subscription found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await SubscriptionService.getSubscriptionStatus('COMPANY-001');

      expect(result).toBeNull();
    });

    it('should indicate trial status', async () => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      databaseAdapter.findOne
        .mockResolvedValueOnce({
          ...mockSubscription,
          status: 'trialing',
          trialStart: new Date(),
          trialEnd
        })
        .mockResolvedValueOnce(mockPlan);

      const result = await SubscriptionService.getSubscriptionStatus('COMPANY-001');

      expect(result.isTrialing).toBe(true);
      expect(result.trialDaysRemaining).toBeGreaterThan(0);
    });
  });

  describe('getSubscriptionsByCompany', () => {
    it('should return all subscriptions for a company', async () => {
      const mockSubscriptions = [
        { subscriptionId: 'SUB-001', status: 'active' },
        { subscriptionId: 'SUB-002', status: 'canceled' }
      ];

      databaseAdapter.find.mockResolvedValue(mockSubscriptions);

      const result = await SubscriptionService.getSubscriptionsByCompany('COMPANY-001');

      expect(result).toHaveLength(2);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Subscription',
        { companyId: 'COMPANY-001' },
        expect.any(Object)
      );
    });

    it('should support filtering by status', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await SubscriptionService.getSubscriptionsByCompany('COMPANY-001', { status: 'active' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Subscription',
        { companyId: 'COMPANY-001', status: 'active' },
        expect.any(Object)
      );
    });
  });

  describe('reactivateSubscription', () => {
    const mockCanceledSubscription = {
      _id: 'sub-id-123',
      subscriptionId: 'SUB-001',
      companyId: 'COMPANY-001',
      planId: 'PLAN-001',
      status: 'canceled',
      canceledAt: new Date('2024-01-15')
    };

    const mockPlan = {
      planId: 'PLAN-001',
      name: 'Professional',
      isActive: true,
      trialPeriodDays: 0
    };

    it('should reactivate a canceled subscription', async () => {
      databaseAdapter.findById.mockResolvedValue(mockCanceledSubscription);
      databaseAdapter.findOne.mockResolvedValue(mockPlan);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockCanceledSubscription,
        status: 'active',
        canceledAt: null,
        cancelAtPeriodEnd: false
      });

      const result = await SubscriptionService.reactivateSubscription('sub-id-123');

      expect(result.status).toBe('active');
    });

    it('should throw error if subscription is not canceled', async () => {
      databaseAdapter.findById.mockResolvedValue({
        ...mockCanceledSubscription,
        status: 'active'
      });

      await expect(SubscriptionService.reactivateSubscription('sub-id-123'))
        .rejects.toThrow('Only canceled subscriptions can be reactivated');
    });

    it('should throw error if plan is no longer active', async () => {
      databaseAdapter.findById.mockResolvedValue(mockCanceledSubscription);
      databaseAdapter.findOne.mockResolvedValue({ ...mockPlan, isActive: false });

      await expect(SubscriptionService.reactivateSubscription('sub-id-123'))
        .rejects.toThrow('Plan is no longer active');
    });
  });
});
