/**
 * Billing Controller - Checkout Session & Plan Resolution Tests
 * Issue #723: Fix billing checkout plan name resolution, /billing/current alias,
 * and public /billing/plans access
 */

const BillingService = require('../../../services/billingService');
const stripeService = require('../../../services/stripeService');
const { getPlanById, getAllPlans } = require('../../../config/stripe');

// Mock dependencies
jest.mock('../../../services/billingService');
jest.mock('../../../services/stripeService');
jest.mock('../../../config/stripe');

// Import controller after mocks
const billingController = require('../../../controllers/billingController');

function createMockReqRes(overrides = {}) {
  const req = {
    user: { companyId: 'comp_123', userId: 'user_1', email: 'test@test.com', name: 'Test' },
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn()
  };
  return { req, res };
}

describe('Billing Controller - Checkout & Plan Resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stripeService.isConfigured.mockReturnValue(true);
  });

  // ================================================================
  // Plan name → Stripe price ID resolution
  // ================================================================
  describe('createCheckoutSession - plan name resolution', () => {
    it('should resolve "starter" plan name to its Stripe price ID', async () => {
      getPlanById.mockReturnValue({
        id: 'starter',
        name: 'Starter',
        stripePriceId: 'price_starter_123'
      });
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'starter',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(getPlanById).toHaveBeenCalledWith('starter');
      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_123',
        'price_starter_123',
        'https://app.test/success',
        'https://app.test/cancel',
        expect.objectContaining({ email: 'test@test.com' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should resolve "professional" plan name to its Stripe price ID', async () => {
      getPlanById.mockReturnValue({
        id: 'professional',
        name: 'Professional',
        stripePriceId: 'price_pro_456'
      });
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_456',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'professional',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(getPlanById).toHaveBeenCalledWith('professional');
      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_123',
        'price_pro_456',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should resolve "enterprise" plan name to its Stripe price ID', async () => {
      getPlanById.mockReturnValue({
        id: 'enterprise',
        name: 'Enterprise',
        stripePriceId: 'price_ent_789'
      });
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_789',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'enterprise',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(getPlanById).toHaveBeenCalledWith('enterprise');
      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_123',
        'price_ent_789',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should pass through a real Stripe price ID ("price_xxx") unchanged', async () => {
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_direct',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_real_abc123',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      // Should NOT call getPlanById for real price IDs
      expect(getPlanById).not.toHaveBeenCalled();
      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_123',
        'price_real_abc123',
        'https://app.test/success',
        'https://app.test/cancel',
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for an unknown plan name ("nonexistent")', async () => {
      getPlanById.mockReturnValue(null);

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'nonexistent',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(getPlanById).toHaveBeenCalledWith('nonexistent');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Unknown plan: 'nonexistent'")
        })
      );
      expect(BillingService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should return 503 when plan exists but stripePriceId is null', async () => {
      getPlanById.mockReturnValue({
        id: 'starter',
        name: 'Starter',
        stripePriceId: null
      });

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'starter',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(getPlanById).toHaveBeenCalledWith('starter');
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Stripe prices not configured for plan 'starter'")
        })
      );
      expect(BillingService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should accept price_id (snake_case) as an alternative to priceId', async () => {
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_snake',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          price_id: 'price_snake_case_id',
          success_url: 'https://app.test/success',
          cancel_url: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_123',
        'price_snake_case_id',
        'https://app.test/success',
        'https://app.test/cancel',
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should resolve plan from snake_case price_id field too', async () => {
      getPlanById.mockReturnValue({
        id: 'professional',
        name: 'Professional',
        stripePriceId: 'price_pro_snake'
      });
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_resolved',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          price_id: 'professional',
          success_url: 'https://app.test/success',
          cancel_url: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(getPlanById).toHaveBeenCalledWith('professional');
      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_123',
        'price_pro_snake',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ================================================================
  // Missing fields validation
  // ================================================================
  describe('createCheckoutSession - missing fields', () => {
    it('should return 400 when no priceId is provided', async () => {
      const { req, res } = createMockReqRes({
        body: {
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'priceId is required' });
    });

    it('should return 400 when successUrl is missing', async () => {
      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_test',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'successUrl and cancelUrl are required' });
    });

    it('should return 400 when cancelUrl is missing', async () => {
      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_test',
          successUrl: 'https://app.test/success'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'successUrl and cancelUrl are required' });
    });

    it('should return 400 when both successUrl and cancelUrl are missing', async () => {
      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_test'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'successUrl and cancelUrl are required' });
    });

    it('should return 400 when companyId is missing from user', async () => {
      BillingService.createCheckoutSession.mockResolvedValue({ sessionId: 'cs_test' });

      const { req, res } = createMockReqRes({
        user: { userId: 'user_1', email: 'test@test.com' },
        body: {
          priceId: 'price_test',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'companyId is required' });
    });
  });

  // ================================================================
  // Stripe not configured
  // ================================================================
  describe('createCheckoutSession - Stripe not configured', () => {
    it('should return 503 when Stripe is not configured', async () => {
      stripeService.isConfigured.mockReturnValue(false);

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_test',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Stripe is not configured')
        })
      );
      expect(BillingService.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // Stripe error handling
  // ================================================================
  describe('createCheckoutSession - error handling', () => {
    it('should return 400 for StripeInvalidRequestError', async () => {
      const stripeError = new Error('No such price: price_invalid');
      stripeError.type = 'StripeInvalidRequestError';
      BillingService.createCheckoutSession.mockRejectedValue(stripeError);

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_invalid',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for unexpected errors', async () => {
      BillingService.createCheckoutSession.mockRejectedValue(new Error('Unexpected failure'));

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_test',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ================================================================
  // getCurrentPlan (/billing/current alias target)
  // ================================================================
  describe('getCurrentPlan', () => {
    it('should return current plan for authenticated user', async () => {
      const planData = {
        planId: 'starter',
        planName: 'Starter',
        status: 'active'
      };
      BillingService.getCurrentPlan.mockResolvedValue(planData);

      const { req, res } = createMockReqRes();

      await billingController.getCurrentPlan(req, res);

      expect(BillingService.getCurrentPlan).toHaveBeenCalledWith('comp_123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ plan: planData });
    });

    it('should return default free plan when no companyId', async () => {
      const { req, res } = createMockReqRes({
        user: {},
        query: {}
      });

      await billingController.getCurrentPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: expect.objectContaining({ planId: 'free' })
        })
      );
    });

    it('should return default free plan when no subscription found', async () => {
      BillingService.getCurrentPlan.mockResolvedValue(null);

      const { req, res } = createMockReqRes();

      await billingController.getCurrentPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: expect.objectContaining({ planId: 'free' })
        })
      );
    });

    it('should handle errors in getCurrentPlan', async () => {
      BillingService.getCurrentPlan.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMockReqRes();

      await billingController.getCurrentPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  // ================================================================
  // getPlans (public endpoint)
  // ================================================================
  describe('getPlans', () => {
    it('should return all plans', async () => {
      const mockPlans = [
        { id: 'free', name: 'Free', price: 0 },
        { id: 'starter', name: 'Starter', price: 25 },
        { id: 'professional', name: 'Professional', price: 75 },
        { id: 'enterprise', name: 'Enterprise', price: 250 }
      ];
      getAllPlans.mockReturnValue(mockPlans);

      const { req, res } = createMockReqRes({ user: null });

      await billingController.getPlans(req, res);

      expect(getAllPlans).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ plans: mockPlans });
    });

    it('should return 500 if getAllPlans throws', async () => {
      getAllPlans.mockImplementation(() => { throw new Error('Config error'); });

      const { req, res } = createMockReqRes({ user: null });

      await billingController.getPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Config error' });
    });
  });

  // ================================================================
  // Successful checkout session creation with user metadata
  // ================================================================
  describe('createCheckoutSession - user metadata forwarding', () => {
    it('should forward user email, name, and userId to BillingService', async () => {
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_meta_test',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        user: {
          companyId: 'comp_meta',
          userId: 'user_meta',
          email: 'meta@test.com',
          name: 'Meta User'
        },
        body: {
          priceId: 'price_meta_test',
          successUrl: 'https://app.test/success',
          cancelUrl: 'https://app.test/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(BillingService.createCheckoutSession).toHaveBeenCalledWith(
        'comp_meta',
        'price_meta_test',
        'https://app.test/success',
        'https://app.test/cancel',
        {
          email: 'meta@test.com',
          name: 'Meta User',
          userId: 'user_meta'
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        sessionId: 'cs_meta_test',
        url: 'https://checkout.stripe.com/test'
      });
    });
  });
});
