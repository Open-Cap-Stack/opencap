/**
 * Subscription Controller Unit Tests
 * Issue #115: Implement Subscription System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const subscriptionController = require('../../../controllers/subscriptionController');
const SubscriptionService = require('../../../services/subscriptionService');

// Mock the subscription service
jest.mock('../../../services/subscriptionService', () => ({
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  checkFeatureAccess: jest.fn(),
  checkUsageLimit: jest.fn(),
  processRenewal: jest.fn(),
  getSubscriptionStatus: jest.fn(),
  getSubscriptionsByCompany: jest.fn(),
  reactivateSubscription: jest.fn(),
  getSubscriptionById: jest.fn(),
  getAllPlans: jest.fn(),
  getPlanById: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn()
}));

// Mock request and response objects
const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('SubscriptionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a subscription and return 201', async () => {
      const subscriptionData = {
        companyId: 'COMPANY-001',
        planId: 'PLAN-001'
      };

      const mockSubscription = {
        subscriptionId: 'SUB-12345678',
        ...subscriptionData,
        status: 'trialing'
      };

      SubscriptionService.createSubscription.mockResolvedValue(mockSubscription);

      const req = mockRequest(subscriptionData);
      const res = mockResponse();

      await subscriptionController.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSubscription);
    });

    it('should return 400 on validation error', async () => {
      SubscriptionService.createSubscription.mockRejectedValue(new Error('Plan not found'));

      const req = mockRequest({ companyId: 'COMPANY-001', planId: 'INVALID' });
      const res = mockResponse();

      await subscriptionController.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Plan not found' });
    });
  });

  describe('getSubscription', () => {
    it('should return subscription by ID', async () => {
      const mockSubscription = {
        subscriptionId: 'SUB-001',
        companyId: 'COMPANY-001',
        status: 'active'
      };

      SubscriptionService.getSubscriptionById.mockResolvedValue(mockSubscription);

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubscription);
    });

    it('should return 404 if subscription not found', async () => {
      SubscriptionService.getSubscriptionById.mockResolvedValue(null);

      const req = mockRequest({}, { id: 'invalid-id' });
      const res = mockResponse();

      await subscriptionController.getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Subscription not found' });
    });
  });

  describe('getSubscriptions', () => {
    it('should return subscriptions with filters', async () => {
      const mockSubscriptions = [
        { subscriptionId: 'SUB-001', status: 'active' },
        { subscriptionId: 'SUB-002', status: 'active' }
      ];

      SubscriptionService.getSubscriptionsByCompany.mockResolvedValue(mockSubscriptions);

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001', status: 'active' });
      const res = mockResponse();

      await subscriptionController.getSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubscriptions);
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription and return 200', async () => {
      const updateData = { quantity: 5 };
      const mockUpdated = {
        subscriptionId: 'SUB-001',
        quantity: 5
      };

      SubscriptionService.updateSubscription.mockResolvedValue(mockUpdated);

      const req = mockRequest(updateData, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.updateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
    });

    it('should return 404 if subscription not found', async () => {
      SubscriptionService.updateSubscription.mockRejectedValue(new Error('Subscription not found'));

      const req = mockRequest({ quantity: 5 }, { id: 'invalid-id' });
      const res = mockResponse();

      await subscriptionController.updateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and return 200', async () => {
      const mockCanceled = {
        subscriptionId: 'SUB-001',
        status: 'canceled'
      };

      SubscriptionService.cancelSubscription.mockResolvedValue(mockCanceled);

      const req = mockRequest({ immediate: true, reason: 'Test' }, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCanceled);
    });

    it('should return 400 if already canceled', async () => {
      SubscriptionService.cancelSubscription.mockRejectedValue(
        new Error('Subscription is already canceled')
      );

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('pauseSubscription', () => {
    it('should pause subscription and return 200', async () => {
      const mockPaused = {
        subscriptionId: 'SUB-001',
        status: 'paused'
      };

      SubscriptionService.pauseSubscription.mockResolvedValue(mockPaused);

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.pauseSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPaused);
    });

    it('should return 400 if not active', async () => {
      SubscriptionService.pauseSubscription.mockRejectedValue(
        new Error('Only active subscriptions can be paused')
      );

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.pauseSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume subscription and return 200', async () => {
      const mockResumed = {
        subscriptionId: 'SUB-001',
        status: 'active'
      };

      SubscriptionService.resumeSubscription.mockResolvedValue(mockResumed);

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.resumeSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResumed);
    });

    it('should return 400 if not paused', async () => {
      SubscriptionService.resumeSubscription.mockRejectedValue(
        new Error('Only paused subscriptions can be resumed')
      );

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.resumeSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate canceled subscription and return 200', async () => {
      const mockReactivated = {
        subscriptionId: 'SUB-001',
        status: 'active'
      };

      SubscriptionService.reactivateSubscription.mockResolvedValue(mockReactivated);

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.reactivateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReactivated);
    });
  });

  describe('checkFeatureAccess', () => {
    it('should return feature access status', async () => {
      SubscriptionService.checkFeatureAccess.mockResolvedValue(true);

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001', feature: 'cap_table' });
      const res = mockResponse();

      await subscriptionController.checkFeatureAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ hasAccess: true, feature: 'cap_table' });
    });

    it('should return false if no access', async () => {
      SubscriptionService.checkFeatureAccess.mockResolvedValue(false);

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001', feature: 'premium_feature' });
      const res = mockResponse();

      await subscriptionController.checkFeatureAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ hasAccess: false, feature: 'premium_feature' });
    });
  });

  describe('checkUsageLimit', () => {
    it('should return usage limit status', async () => {
      const mockUsage = {
        withinLimit: true,
        currentUsage: 50,
        limit: 100,
        remaining: 50
      };

      SubscriptionService.checkUsageLimit.mockResolvedValue(mockUsage);

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001', limitType: 'stakeholders' });
      const res = mockResponse();

      await subscriptionController.checkUsageLimit(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsage);
    });

    it('should return 400 for unknown limit type', async () => {
      SubscriptionService.checkUsageLimit.mockRejectedValue(new Error('Unknown limit type'));

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001', limitType: 'invalid' });
      const res = mockResponse();

      await subscriptionController.checkUsageLimit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return full subscription status', async () => {
      const mockStatus = {
        subscription: { subscriptionId: 'SUB-001' },
        plan: { name: 'Professional' },
        isActive: true,
        daysRemaining: 15
      };

      SubscriptionService.getSubscriptionStatus.mockResolvedValue(mockStatus);

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001' });
      const res = mockResponse();

      await subscriptionController.getSubscriptionStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStatus);
    });

    it('should return 404 if no subscription', async () => {
      SubscriptionService.getSubscriptionStatus.mockResolvedValue(null);

      const req = mockRequest({}, {}, { companyId: 'COMPANY-001' });
      const res = mockResponse();

      await subscriptionController.getSubscriptionStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No subscription found' });
    });
  });

  describe('processRenewal', () => {
    it('should process renewal and return 200', async () => {
      const mockRenewed = {
        subscriptionId: 'SUB-001',
        status: 'active',
        currentPeriodEnd: new Date('2024-03-01')
      };

      SubscriptionService.processRenewal.mockResolvedValue(mockRenewed);

      const req = mockRequest({}, { id: 'sub-id-123' });
      const res = mockResponse();

      await subscriptionController.processRenewal(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRenewed);
    });
  });

  // Plan management endpoints
  describe('getPlans', () => {
    it('should return all active plans', async () => {
      const mockPlans = [
        { planId: 'PLAN-001', name: 'Basic' },
        { planId: 'PLAN-002', name: 'Professional' }
      ];

      SubscriptionService.getAllPlans.mockResolvedValue(mockPlans);

      const req = mockRequest({}, {}, { active: true });
      const res = mockResponse();

      await subscriptionController.getPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPlans);
    });
  });

  describe('getPlan', () => {
    it('should return plan by ID', async () => {
      const mockPlan = { planId: 'PLAN-001', name: 'Basic' };

      SubscriptionService.getPlanById.mockResolvedValue(mockPlan);

      const req = mockRequest({}, { id: 'plan-id-123' });
      const res = mockResponse();

      await subscriptionController.getPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPlan);
    });

    it('should return 404 if plan not found', async () => {
      SubscriptionService.getPlanById.mockResolvedValue(null);

      const req = mockRequest({}, { id: 'invalid-id' });
      const res = mockResponse();

      await subscriptionController.getPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Plan not found' });
    });
  });

  describe('createPlan', () => {
    it('should create plan and return 201', async () => {
      const planData = {
        name: 'Enterprise',
        price: 299,
        currency: 'USD',
        interval: 'month'
      };

      const mockPlan = { planId: 'PLAN-003', ...planData };

      SubscriptionService.createPlan.mockResolvedValue(mockPlan);

      const req = mockRequest(planData);
      const res = mockResponse();

      await subscriptionController.createPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPlan);
    });
  });

  describe('updatePlan', () => {
    it('should update plan and return 200', async () => {
      const updateData = { price: 149 };
      const mockUpdated = { planId: 'PLAN-001', price: 149 };

      SubscriptionService.updatePlan.mockResolvedValue(mockUpdated);

      const req = mockRequest(updateData, { id: 'plan-id-123' });
      const res = mockResponse();

      await subscriptionController.updatePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
    });
  });

  describe('deletePlan', () => {
    it('should delete plan and return 200', async () => {
      SubscriptionService.deletePlan.mockResolvedValue({ deleted: true });

      const req = mockRequest({}, { id: 'plan-id-123' });
      const res = mockResponse();

      await subscriptionController.deletePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Plan deleted' });
    });

    it('should return 404 if plan not found', async () => {
      SubscriptionService.deletePlan.mockRejectedValue(new Error('Plan not found'));

      const req = mockRequest({}, { id: 'invalid-id' });
      const res = mockResponse();

      await subscriptionController.deletePlan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
