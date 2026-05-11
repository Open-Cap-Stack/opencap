/**
 * Billing Controller Stripe Integration Tests
 *
 * Tests for webhook handling, checkout sessions, setup intents,
 * cancel, and reactivate endpoints.
 */

const BillingService = require('../../../services/billingService');
const stripeService = require('../../../services/stripeService');

// Mock dependencies
jest.mock('../../../services/billingService');
jest.mock('../../../services/stripeService');

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

describe('Billing Controller - Stripe Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stripeService.isConfigured.mockReturnValue(true);
  });

  describe('handleStripeWebhook', () => {
    it('should return 400 when stripe-signature is missing', async () => {
      const { req, res } = createMockReqRes({
        headers: {},
        body: Buffer.from('{}')
      });

      await billingController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing stripe-signature header' });
    });

    it('should return 503 when Stripe is not configured', async () => {
      stripeService.isConfigured.mockReturnValue(false);
      const { req, res } = createMockReqRes({
        headers: { 'stripe-signature': 'sig_test' }
      });

      await billingController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 500 when webhook secret is not configured', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const { req, res } = createMockReqRes({
        headers: { 'stripe-signature': 'sig_test' },
        body: Buffer.from('{}')
      });

      await billingController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    it('should return 400 for invalid signature', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      stripeService.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const { req, res } = createMockReqRes({
        headers: { 'stripe-signature': 'invalid_sig' },
        body: Buffer.from('{}')
      });

      await billingController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should process valid webhook event', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: { object: {} }
      };

      stripeService.constructEvent.mockReturnValue(mockEvent);
      BillingService.handleWebhookEvent.mockResolvedValue({ status: 'processed' });

      const { req, res } = createMockReqRes({
        headers: { 'stripe-signature': 'valid_sig' },
        body: Buffer.from('{}')
      });

      await billingController.handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(BillingService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent);

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });
  });

  describe('createCheckoutSession', () => {
    it('should return 503 when Stripe is not configured', async () => {
      stripeService.isConfigured.mockReturnValue(false);
      const { req, res } = createMockReqRes();

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 when priceId is missing', async () => {
      const { req, res } = createMockReqRes({
        body: { successUrl: 'http://test.com/success', cancelUrl: 'http://test.com/cancel' }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'priceId is required' });
    });

    it('should return 400 when URLs are missing', async () => {
      const { req, res } = createMockReqRes({
        body: { priceId: 'price_123' }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create checkout session successfully', async () => {
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          priceId: 'price_123',
          successUrl: 'http://test.com/success',
          cancelUrl: 'http://test.com/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/test'
      });
    });

    it('should accept legacy price_id parameter', async () => {
      BillingService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/test'
      });

      const { req, res } = createMockReqRes({
        body: {
          price_id: 'price_123',
          success_url: 'http://test.com/success',
          cancel_url: 'http://test.com/cancel'
        }
      });

      await billingController.createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('verifyCheckoutSession', () => {
    it('should return 400 when sessionId is missing', async () => {
      const { req, res } = createMockReqRes({ body: {} });

      await billingController.verifyCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should verify session successfully', async () => {
      BillingService.verifyCheckoutSession.mockResolvedValue({ success: true, companyId: 'comp_123' });

      const { req, res } = createMockReqRes({
        body: { sessionId: 'cs_123' }
      });

      await billingController.verifyCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, companyId: 'comp_123' });
    });
  });

  describe('cancelSubscription', () => {
    it('should return 400 when companyId is missing', async () => {
      const { req, res } = createMockReqRes({
        user: {}
      });

      await billingController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should cancel subscription at period end by default', async () => {
      BillingService.cancelSubscription.mockResolvedValue({
        success: true,
        cancelAtPeriodEnd: true
      });

      const { req, res } = createMockReqRes({ body: {} });

      await billingController.cancelSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(BillingService.cancelSubscription).toHaveBeenCalledWith('comp_123', true);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription', async () => {
      BillingService.reactivateSubscription.mockResolvedValue({ success: true });

      const { req, res } = createMockReqRes();

      await billingController.reactivateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(BillingService.reactivateSubscription).toHaveBeenCalledWith('comp_123');
    });
  });

  describe('createSetupIntent', () => {
    it('should return 503 when Stripe is not configured', async () => {
      stripeService.isConfigured.mockReturnValue(false);
      const { req, res } = createMockReqRes();

      await billingController.createSetupIntent(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should create setup intent successfully', async () => {
      BillingService.createSetupIntent.mockResolvedValue({
        clientSecret: 'seti_123_secret'
      });

      const { req, res } = createMockReqRes();

      await billingController.createSetupIntent(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ clientSecret: 'seti_123_secret' });
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should return 503 when Stripe is not configured', async () => {
      stripeService.isConfigured.mockReturnValue(false);
      const { req, res } = createMockReqRes({ body: { returnUrl: 'http://test.com/billing' } });

      await billingController.createCustomerPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Stripe is not configured'
      });
    });

    it('should return 400 when companyId is missing', async () => {
      const { req, res } = createMockReqRes({
        user: {},
        body: { returnUrl: 'http://test.com/billing' }
      });

      await billingController.createCustomerPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should lazily create Stripe customer and return portal URL', async () => {
      const customerMapping = { companyId: 'comp_123', stripeCustomerId: 'cus_lazy' };
      BillingService.getOrCreateStripeCustomer.mockResolvedValue(customerMapping);

      const mockPortalSession = { url: 'https://billing.stripe.com/session/test' };
      const mockStripe = {
        billingPortal: {
          sessions: {
            create: jest.fn().mockResolvedValue(mockPortalSession)
          }
        }
      };
      stripeService.getStripe.mockReturnValue(mockStripe);

      const { req, res } = createMockReqRes({
        body: { returnUrl: 'http://test.com/billing' },
        headers: { origin: 'http://test.com' }
      });

      await billingController.createCustomerPortalSession(req, res);

      expect(BillingService.getOrCreateStripeCustomer).toHaveBeenCalledWith(
        'comp_123', 'test@test.com', 'Test'
      );
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_lazy',
        return_url: 'http://test.com/billing'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ url: 'https://billing.stripe.com/session/test' });
    });

    it('should handle Stripe not configured error from service as 503', async () => {
      BillingService.getOrCreateStripeCustomer.mockRejectedValue(
        new Error('Stripe is not configured')
      );

      const { req, res } = createMockReqRes({
        body: { returnUrl: 'http://test.com/billing' }
      });

      await billingController.createCustomerPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method', async () => {
      BillingService.setDefaultPaymentMethod.mockResolvedValue({ success: true });

      const { req, res } = createMockReqRes({
        params: { id: 'pm_123' }
      });

      await billingController.setDefaultPaymentMethod(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(BillingService.setDefaultPaymentMethod).toHaveBeenCalledWith('comp_123', 'pm_123');
    });

    it('should return 400 when method ID is missing', async () => {
      const { req, res } = createMockReqRes({
        params: {}
      });

      await billingController.setDefaultPaymentMethod(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
