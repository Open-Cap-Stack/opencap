/**
 * BillingController Coverage Tests
 * Covers uncovered branches: getErrorStatusCode variants, downloadInvoice,
 * createInvoice, updateInvoice, removePaymentMethod, setDefaultPaymentMethod,
 * addPaymentMethod paths, handleStripeWebhook edge cases, createCustomerPortalSession,
 * getCheckoutSession, verifyCheckoutSession, getPlans error, cancelSubscription,
 * reactivateSubscription, createSetupIntent, createCheckoutSession plan resolution
 */

jest.mock('../../../services/billingService');
jest.mock('../../../services/stripeService');
jest.mock('../../../config/stripe');
jest.mock('../../../services/analyticsService');

const BillingService = require('../../../services/billingService');
const stripeService = require('../../../services/stripeService');
const { getAllPlans, getPlanById } = require('../../../config/stripe');
const analyticsService = require('../../../services/analyticsService');
const billingController = require('../../../controllers/billingController');

describe('BillingController - Coverage', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'u1', companyId: 'comp-1', email: 'test@test.com', name: 'Test' },
      headers: { origin: 'http://localhost:5173' }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn(), send: jest.fn() };
    jest.clearAllMocks();
    stripeService.isConfigured = jest.fn().mockReturnValue(true);
    analyticsService.trackBeginCheckout = jest.fn().mockResolvedValue({});
    analyticsService.trackPurchase = jest.fn().mockResolvedValue({});
  });

  // ---- getErrorStatusCode variations ----
  describe('getCurrentPlan - error status codes', () => {
    it('should return 404 for not found errors', async () => {
      BillingService.getCurrentPlan = jest.fn().mockRejectedValue(new Error('Plan not found'));
      await billingController.getCurrentPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 503 for not configured errors', async () => {
      BillingService.getCurrentPlan = jest.fn().mockRejectedValue(new Error('Service not configured'));
      await billingController.getCurrentPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 403 for unauthorized errors', async () => {
      BillingService.getCurrentPlan = jest.fn().mockRejectedValue(new Error('Unauthorized access'));
      await billingController.getCurrentPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 for forbidden errors', async () => {
      BillingService.getCurrentPlan = jest.fn().mockRejectedValue(new Error('Forbidden operation'));
      await billingController.getCurrentPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return default free plan when planData is null', async () => {
      BillingService.getCurrentPlan = jest.fn().mockResolvedValue(null);
      await billingController.getCurrentPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].plan.planId).toBe('free');
    });

    it('should return 400 for required errors', async () => {
      BillingService.getCurrentPlan = jest.fn().mockRejectedValue(new Error('Field required'));
      await billingController.getCurrentPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- downloadInvoice ----
  describe('downloadInvoice', () => {
    it('should download PDF', async () => {
      req.params = { id: 'inv-1' };
      BillingService.generateInvoicePDF = jest.fn().mockResolvedValue({
        buffer: Buffer.from('pdf'),
        filename: 'invoice.pdf'
      });

      await billingController.downloadInvoice(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 400 if no invoiceId', async () => {
      req.params = {};
      await billingController.downloadInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.params = { id: 'inv-1' };
      req.user = { userId: 'u1' };
      await billingController.downloadInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params = { id: 'inv-1' };
      BillingService.generateInvoicePDF = jest.fn().mockRejectedValue(new Error('PDF generation failed'));
      await billingController.downloadInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- createInvoice ----
  describe('createInvoice', () => {
    it('should create invoice', async () => {
      req.body = { amount: 100 };
      BillingService.createInvoice = jest.fn().mockResolvedValue({ id: 'inv-1' });

      await billingController.createInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.createInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      BillingService.createInvoice = jest.fn().mockRejectedValue(new Error('Create failed'));
      await billingController.createInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- updateInvoice ----
  describe('updateInvoice', () => {
    it('should update invoice', async () => {
      req.params = { id: 'inv-1' };
      req.body = { amount: 200 };
      BillingService.updateInvoice = jest.fn().mockResolvedValue({ id: 'inv-1' });

      await billingController.updateInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no invoiceId', async () => {
      req.params = {};
      await billingController.updateInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.params = { id: 'inv-1' };
      req.user = { userId: 'u1' };
      await billingController.updateInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params = { id: 'inv-1' };
      BillingService.updateInvoice = jest.fn().mockRejectedValue(new Error('Update failed'));
      await billingController.updateInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- addPaymentMethod - Stripe vs legacy ----
  describe('addPaymentMethod', () => {
    it('should add via Stripe when stripePaymentMethodId provided', async () => {
      req.body = { stripePaymentMethodId: 'pm_test', setAsDefault: true };
      BillingService.syncPaymentMethodFromStripe = jest.fn().mockResolvedValue({ id: 'pm-1' });

      await billingController.addPaymentMethod(req, res);
      expect(BillingService.syncPaymentMethodFromStripe).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should add via legacy when no stripePaymentMethodId', async () => {
      req.body = { type: 'card', last4: '1234' };
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      BillingService.addPaymentMethod = jest.fn().mockResolvedValue({ id: 'pm-1' });

      await billingController.addPaymentMethod(req, res);
      expect(BillingService.addPaymentMethod).toHaveBeenCalled();
    });

    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.addPaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- removePaymentMethod ----
  describe('removePaymentMethod', () => {
    it('should remove via Stripe', async () => {
      req.params = { id: 'pm-1' };
      BillingService.removePaymentMethodViaStripe = jest.fn().mockResolvedValue({ success: true });

      await billingController.removePaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should remove via legacy when Stripe not configured', async () => {
      req.params = { id: 'pm-1' };
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      BillingService.removePaymentMethod = jest.fn().mockResolvedValue({ success: true });

      await billingController.removePaymentMethod(req, res);
      expect(BillingService.removePaymentMethod).toHaveBeenCalled();
    });

    it('should return 400 if no methodId', async () => {
      req.params = {};
      await billingController.removePaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.params = { id: 'pm-1' };
      req.user = { userId: 'u1' };
      await billingController.removePaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- setDefaultPaymentMethod ----
  describe('setDefaultPaymentMethod', () => {
    it('should set default', async () => {
      req.params = { id: 'pm-1' };
      BillingService.setDefaultPaymentMethod = jest.fn().mockResolvedValue({ success: true });

      await billingController.setDefaultPaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no methodId', async () => {
      req.params = {};
      await billingController.setDefaultPaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.params = { id: 'pm-1' };
      req.user = { userId: 'u1' };
      await billingController.setDefaultPaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params = { id: 'pm-1' };
      BillingService.setDefaultPaymentMethod = jest.fn().mockRejectedValue(new Error('Failed'));
      await billingController.setDefaultPaymentMethod(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- createCheckoutSession - plan resolution ----
  describe('createCheckoutSession', () => {
    it('should resolve plan name to Stripe price ID', async () => {
      req.body = { priceId: 'starter', successUrl: 'http://ok', cancelUrl: 'http://cancel' };
      getPlanById.mockReturnValue({ stripePriceId: 'price_starter_123' });
      BillingService.createCheckoutSession = jest.fn().mockResolvedValue({ sessionId: 's1', amount: 99 });

      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for unknown plan', async () => {
      req.body = { priceId: 'platinum', successUrl: 'http://ok', cancelUrl: 'http://cancel' };
      getPlanById.mockReturnValue(null);

      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 503 for plan without stripePriceId', async () => {
      req.body = { priceId: 'free', successUrl: 'http://ok', cancelUrl: 'http://cancel' };
      getPlanById.mockReturnValue({ name: 'free' }); // no stripePriceId

      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 503 if Stripe not configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 if no priceId', async () => {
      req.body = { successUrl: 'http://ok', cancelUrl: 'http://cancel' };
      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if missing URLs', async () => {
      req.body = { priceId: 'price_123' };
      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.body = { priceId: 'price_123', successUrl: 'http://ok', cancelUrl: 'http://cancel' };
      req.user = { userId: 'u1', email: 'e' };
      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle StripeInvalidRequestError', async () => {
      req.body = { priceId: 'price_123', successUrl: 'http://ok', cancelUrl: 'http://cancel' };
      const stripeError = new Error('Invalid request');
      stripeError.type = 'StripeInvalidRequestError';
      BillingService.createCheckoutSession = jest.fn().mockRejectedValue(stripeError);

      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should use snake_case field aliases', async () => {
      req.body = { price_id: 'price_123', success_url: 'http://ok', cancel_url: 'http://cancel' };
      BillingService.createCheckoutSession = jest.fn().mockResolvedValue({ sessionId: 's1' });

      await billingController.createCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ---- verifyCheckoutSession ----
  describe('verifyCheckoutSession', () => {
    it('should verify session', async () => {
      req.body = { sessionId: 'cs_test' };
      BillingService.verifyCheckoutSession = jest.fn().mockResolvedValue({ status: 'complete' });

      await billingController.verifyCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no sessionId', async () => {
      req.body = {};
      await billingController.verifyCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.body = { sessionId: 'cs_test' };
      BillingService.verifyCheckoutSession = jest.fn().mockRejectedValue(new Error('Invalid session'));
      await billingController.verifyCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- cancelSubscription ----
  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      BillingService.cancelSubscription = jest.fn().mockResolvedValue({ cancelled: true });
      await billingController.cancelSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.cancelSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      BillingService.cancelSubscription = jest.fn().mockRejectedValue(new Error('Cannot cancel'));
      await billingController.cancelSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- reactivateSubscription ----
  describe('reactivateSubscription', () => {
    it('should reactivate', async () => {
      BillingService.reactivateSubscription = jest.fn().mockResolvedValue({ active: true });
      await billingController.reactivateSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.reactivateSubscription(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- createSetupIntent ----
  describe('createSetupIntent', () => {
    it('should create setup intent', async () => {
      BillingService.createSetupIntent = jest.fn().mockResolvedValue({ clientSecret: 'si_test' });
      await billingController.createSetupIntent(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 503 if Stripe not configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      await billingController.createSetupIntent(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.createSetupIntent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      BillingService.createSetupIntent = jest.fn().mockRejectedValue(new Error('Setup failed'));
      await billingController.createSetupIntent(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- handleStripeWebhook ----
  describe('handleStripeWebhook', () => {
    it('should handle webhook event with purchase tracking', async () => {
      req.headers = { 'stripe-signature': 'sig_test' };
      req.body = 'raw_body';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            metadata: { userId: 'u1', planId: 'starter' },
            amount_total: 9900,
            subscription: 'sub_1'
          }
        }
      };
      stripeService.constructEvent = jest.fn().mockReturnValue(event);
      BillingService.handleWebhookEvent = jest.fn().mockResolvedValue({ processed: true });

      await billingController.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(analyticsService.trackPurchase).toHaveBeenCalled();
    });

    it('should return 503 if Stripe not configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      await billingController.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 if no signature', async () => {
      req.headers = {};
      await billingController.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 if no webhook secret', async () => {
      req.headers = { 'stripe-signature': 'sig_test' };
      delete process.env.STRIPE_WEBHOOK_SECRET;
      await billingController.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 400 for invalid signature', async () => {
      req.headers = { 'stripe-signature': 'invalid' };
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      stripeService.constructEvent = jest.fn().mockImplementation(() => { throw new Error('Invalid sig'); });

      await billingController.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 on processing error (prevent retries)', async () => {
      req.headers = { 'stripe-signature': 'sig_test' };
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      stripeService.constructEvent = jest.fn().mockReturnValue({ type: 'invoice.paid', data: { object: {} } });
      BillingService.handleWebhookEvent = jest.fn().mockRejectedValue(new Error('Process error'));

      await billingController.handleStripeWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200); // always 200 for non-transient
    });
  });

  // ---- getPlans ----
  describe('getPlans', () => {
    it('should return plans', async () => {
      getAllPlans.mockReturnValue([{ id: 'free' }]);
      await billingController.getPlans(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle error', async () => {
      getAllPlans.mockImplementation(() => { throw new Error('Config error'); });
      await billingController.getPlans(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- createCustomerPortalSession ----
  describe('createCustomerPortalSession', () => {
    it('should create portal session', async () => {
      BillingService.getOrCreateStripeCustomer = jest.fn().mockResolvedValue({ stripeCustomerId: 'cus_test' });
      const mockStripe = {
        billingPortal: {
          sessions: {
            create: jest.fn().mockResolvedValue({ url: 'http://portal.stripe.com' })
          }
        }
      };
      stripeService.getStripe = jest.fn().mockReturnValue(mockStripe);
      req.body = { returnUrl: 'http://localhost/billing' };

      await billingController.createCustomerPortalSession(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].url).toBe('http://portal.stripe.com');
    });

    it('should return 503 if Stripe not configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      await billingController.createCustomerPortalSession(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.createCustomerPortalSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      BillingService.getOrCreateStripeCustomer = jest.fn().mockRejectedValue(new Error('Customer not found'));
      await billingController.createCustomerPortalSession(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---- getCheckoutSession ----
  describe('getCheckoutSession', () => {
    it('should return session details', async () => {
      req.params = { sessionId: 'cs_test' };
      stripeService.retrieveCheckoutSession = jest.fn().mockResolvedValue({
        id: 'cs_test', status: 'complete', payment_status: 'paid',
        customer_details: { email: 'test@test.com' },
        amount_total: 9900, currency: 'usd', subscription: 'sub_1',
        created: Math.floor(Date.now() / 1000)
      });

      await billingController.getCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 503 if Stripe not configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      await billingController.getCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 if no sessionId', async () => {
      req.params = {};
      await billingController.getCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params = { sessionId: 'cs_test' };
      stripeService.retrieveCheckoutSession = jest.fn().mockRejectedValue(new Error('Session not found'));
      await billingController.getCheckoutSession(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---- downgradePlan ----
  describe('downgradePlan', () => {
    it('should downgrade plan', async () => {
      req.body = { planId: 'free' };
      BillingService.downgradePlan = jest.fn().mockResolvedValue({ success: true });
      await billingController.downgradePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no planId', async () => {
      req.body = {};
      await billingController.downgradePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.body = { planId: 'free' };
      req.user = { userId: 'u1' };
      await billingController.downgradePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.body = { planId: 'free' };
      BillingService.downgradePlan = jest.fn().mockRejectedValue(new Error('Cannot downgrade'));
      await billingController.downgradePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- upgradePlan ----
  describe('upgradePlan', () => {
    it('should return 400 if no planId', async () => {
      req.body = {};
      await billingController.upgradePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.body = { planId: 'pro' };
      req.user = { userId: 'u1' };
      await billingController.upgradePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- getPaymentHistory ----
  describe('getPaymentHistory', () => {
    it('should return 400 if no companyId', async () => {
      req.user = { userId: 'u1' };
      await billingController.getPaymentHistory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      BillingService.getPaymentHistory = jest.fn().mockRejectedValue(new Error('History error'));
      await billingController.getPaymentHistory(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getInvoiceById ----
  describe('getInvoiceById', () => {
    it('should return 400 if no invoiceId', async () => {
      req.params = {};
      await billingController.getInvoiceById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.params = { id: 'inv-1' };
      req.user = { userId: 'u1' };
      await billingController.getInvoiceById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params = { id: 'inv-1' };
      BillingService.getInvoiceById = jest.fn().mockRejectedValue(new Error('Invoice not found'));
      await billingController.getInvoiceById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

afterAll(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});
