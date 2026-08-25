/**
 * Stripe Service - Gap Coverage Tests
 *
 * Targets uncovered branches:
 * - createCustomer with default empty metadata
 * - createPrice with default currency and interval
 * - getStripe singleton reuse (second call returns cached)
 * - createCheckoutSession with metadata
 * - cancelSubscription with default atPeriodEnd (no arg)
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

jest.mock('stripe', () => jest.fn(() => mockStripeInstance));

describe('StripeService - Gap Coverage', () => {
  let stripeService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_gap_coverage';
    delete require.cache[require.resolve('../../../services/stripeService')];
    stripeService = require('../../../services/stripeService');
    stripeService.stripe = null;
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  // ─── getStripe singleton reuse ──────────────────────────────────────────────

  describe('getStripe - singleton behavior', () => {
    it('should reuse cached Stripe instance on second call', () => {
      const first = stripeService.getStripe();
      const second = stripeService.getStripe();
      expect(first).toBe(second);
      // stripe() constructor should only be called once
      const stripeMock = require('stripe');
      expect(stripeMock).toHaveBeenCalledTimes(1);
    });
  });

  // ─── createCustomer with empty metadata default ────────────────────────────

  describe('createCustomer - default metadata', () => {
    it('should pass empty metadata object by default', async () => {
      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new' });

      // Call WITHOUT metadata to exercise the default = {} branch
      await stripeService.createCustomer({ email: 'x@test.com', name: 'X' });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'x@test.com',
        name: 'X',
        metadata: {},
      });
    });
  });

  // ─── createCheckoutSession with metadata default ───────────────────────────

  describe('createCheckoutSession - default metadata', () => {
    it('should pass empty metadata when none provided', async () => {
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/test',
      });

      await stripeService.createCheckoutSession({
        customerId: 'cus_1',
        priceId: 'price_1',
        successUrl: 'https://ok.com',
        cancelUrl: 'https://cancel.com',
        // no metadata provided
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} })
      );
    });
  });

  // ─── createPrice with defaults ─────────────────────────────────────────────

  describe('createPrice - default currency and interval', () => {
    it('should default to usd and month when not specified', async () => {
      mockStripeInstance.prices.create.mockResolvedValue({ id: 'price_def' });

      await stripeService.createPrice({
        productId: 'prod_1',
        amount: 5000,
        // no currency, no interval — use defaults
      });

      expect(mockStripeInstance.prices.create).toHaveBeenCalledWith({
        product: 'prod_1',
        unit_amount: 5000,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
    });

    it('should use provided currency and interval', async () => {
      mockStripeInstance.prices.create.mockResolvedValue({ id: 'price_eur' });

      await stripeService.createPrice({
        productId: 'prod_1',
        amount: 10000,
        currency: 'eur',
        interval: 'year',
      });

      expect(mockStripeInstance.prices.create).toHaveBeenCalledWith({
        product: 'prod_1',
        unit_amount: 10000,
        currency: 'eur',
        recurring: { interval: 'year' },
      });
    });
  });

  // ─── cancelSubscription with default atPeriodEnd ───────────────────────────

  describe('cancelSubscription - default atPeriodEnd', () => {
    it('should default to atPeriodEnd=true when called with no options', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_1',
        cancel_at_period_end: true,
      });

      await stripeService.cancelSubscription('sub_1');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_1', {
        cancel_at_period_end: true,
      });
      expect(mockStripeInstance.subscriptions.cancel).not.toHaveBeenCalled();
    });
  });

  // ─── createPaymentIntent with connectedAccountId ───────────────────────────

  describe('createPaymentIntent - transfer_data branch', () => {
    it('should include transfer_data when connectedAccountId is provided', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_1' });

      await stripeService.createPaymentIntent({
        amount: 1000,
        description: 'Test',
        connectedAccountId: 'acct_connected',
      });

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transfer_data: { destination: 'acct_connected' },
        })
      );
    });

    it('should not include transfer_data when no connectedAccountId', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_2' });

      await stripeService.createPaymentIntent({
        amount: 2000,
        description: 'Test 2',
      });

      const call = mockStripeInstance.paymentIntents.create.mock.calls[0][0];
      expect(call).not.toHaveProperty('transfer_data');
    });
  });

  // ─── listInvoices with custom limit ────────────────────────────────────────

  describe('listInvoices - custom limit', () => {
    it('should pass custom limit', async () => {
      mockStripeInstance.invoices.list.mockResolvedValue({ data: [] });

      await stripeService.listInvoices('cus_1', 5);

      expect(mockStripeInstance.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_1',
        limit: 5,
      });
    });

    it('should default to limit 20', async () => {
      mockStripeInstance.invoices.list.mockResolvedValue({ data: [] });

      await stripeService.listInvoices('cus_1');

      expect(mockStripeInstance.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_1',
        limit: 20,
      });
    });
  });

  // ─── retrievePaymentIntent ─────────────────────────────────────────────────

  describe('retrievePaymentIntent', () => {
    it('should retrieve a payment intent by ID', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      });

      const result = await stripeService.retrievePaymentIntent('pi_123');

      expect(result.id).toBe('pi_123');
      expect(result.status).toBe('succeeded');
      expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
    });
  });
});
