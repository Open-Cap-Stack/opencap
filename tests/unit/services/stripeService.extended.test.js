/**
 * StripeService - Extended Coverage Tests
 *
 * Covers methods and branches not tested in the base stripeService.test.js:
 * - createPaymentIntent (with and without connectedAccountId)
 * - retrievePaymentIntent
 * - listInvoices with custom limit
 * - cancelSubscription with default atPeriodEnd
 * - getStripe singleton (reuses cached instance)
 */

const mockStripeInstance = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  subscriptions: {
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
  setupIntents: {
    create: jest.fn(),
  },
  paymentMethods: {
    list: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  invoices: {
    list: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  products: {
    create: jest.fn(),
  },
  prices: {
    create: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn(() => mockStripeInstance);
});

describe('StripeService - Extended Coverage', () => {
  let stripeService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_extended';
    delete require.cache[require.resolve('../../../services/stripeService')];
    stripeService = require('../../../services/stripeService');
    stripeService.stripe = null;
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  // ─── PaymentIntent Operations ─────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('should create a payment intent with basic params', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        amount: 14900,
        currency: 'usd',
        client_secret: 'pi_123_secret',
      });

      const result = await stripeService.createPaymentIntent({
        amount: 14900,
        currency: 'usd',
        description: '409A Valuation Report',
        metadata: { valuationId: 'val_1' },
      });

      expect(result.id).toBe('pi_123');
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 14900,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        description: '409A Valuation Report',
        metadata: { valuationId: 'val_1' },
      });
    });

    it('should include transfer_data when connectedAccountId is provided', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_connected',
        amount: 5000,
      });

      await stripeService.createPaymentIntent({
        amount: 5000,
        description: 'Connected payment',
        connectedAccountId: 'acct_connected_123',
      });

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transfer_data: { destination: 'acct_connected_123' },
        })
      );
    });

    it('should not include transfer_data when connectedAccountId is absent', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_plain',
        amount: 3000,
      });

      await stripeService.createPaymentIntent({
        amount: 3000,
        description: 'Regular payment',
      });

      const callArgs = mockStripeInstance.paymentIntents.create.mock.calls[0][0];
      expect(callArgs.transfer_data).toBeUndefined();
    });

    it('should use default currency when not specified', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_default_currency',
      });

      await stripeService.createPaymentIntent({
        amount: 1000,
        description: 'Default currency',
      });

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'usd' })
      );
    });
  });

  describe('retrievePaymentIntent', () => {
    it('should retrieve a payment intent by ID', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
        amount: 14900,
      });

      const result = await stripeService.retrievePaymentIntent('pi_123');

      expect(result.id).toBe('pi_123');
      expect(result.status).toBe('succeeded');
      expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
    });
  });

  // ─── listInvoices with custom limit ───────────────────────────────────────

  describe('listInvoices - custom limit', () => {
    it('should pass custom limit to Stripe API', async () => {
      mockStripeInstance.invoices.list.mockResolvedValue({
        data: [],
      });

      await stripeService.listInvoices('cus_123', 50);

      expect(mockStripeInstance.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 50,
      });
    });

    it('should use default limit of 20', async () => {
      mockStripeInstance.invoices.list.mockResolvedValue({
        data: [{ id: 'in_1' }],
      });

      await stripeService.listInvoices('cus_123');

      expect(mockStripeInstance.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 20,
      });
    });
  });

  // ─── cancelSubscription default ───────────────────────────────────────────

  describe('cancelSubscription - default behavior', () => {
    it('should default to atPeriodEnd=true when not specified', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
      });

      await stripeService.cancelSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('should default to atPeriodEnd=true when empty options', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
      });

      await stripeService.cancelSubscription('sub_123', {});

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });
  });

  // ─── getStripe - singleton caching ────────────────────────────────────────

  describe('getStripe - singleton', () => {
    it('should return the same instance on subsequent calls', () => {
      const instance1 = stripeService.getStripe();
      const instance2 = stripeService.getStripe();

      expect(instance1).toBe(instance2);
    });
  });

  // ─── createPrice with custom params ───────────────────────────────────────

  describe('createPrice - custom params', () => {
    it('should create a price with custom currency and interval', async () => {
      mockStripeInstance.prices.create.mockResolvedValue({
        id: 'price_yearly',
        unit_amount: 999900,
        recurring: { interval: 'year' },
      });

      const result = await stripeService.createPrice({
        productId: 'prod_123',
        amount: 999900,
        currency: 'eur',
        interval: 'year',
      });

      expect(mockStripeInstance.prices.create).toHaveBeenCalledWith({
        product: 'prod_123',
        unit_amount: 999900,
        currency: 'eur',
        recurring: { interval: 'year' },
      });
      expect(result.id).toBe('price_yearly');
    });
  });

  // ─── createCheckoutSession with metadata ──────────────────────────────────

  describe('createCheckoutSession - metadata', () => {
    it('should pass metadata to Stripe', async () => {
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        id: 'cs_meta',
        url: 'https://checkout.stripe.com/meta',
      });

      await stripeService.createCheckoutSession({
        customerId: 'cus_1',
        priceId: 'price_1',
        successUrl: 'http://success',
        cancelUrl: 'http://cancel',
        metadata: { companyId: 'comp_1', userId: 'user_1' },
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { companyId: 'comp_1', userId: 'user_1' },
        })
      );
    });
  });
});
