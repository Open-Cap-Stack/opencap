/**
 * StripeService Unit Tests
 *
 * Tests the pure Stripe API wrapper.
 * All Stripe SDK calls are mocked.
 */

// Mock stripe module
const mockStripeInstance = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn()
  },
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn()
    }
  },
  subscriptions: {
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn()
  },
  setupIntents: {
    create: jest.fn()
  },
  paymentMethods: {
    list: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn()
  },
  invoices: {
    list: jest.fn()
  },
  webhooks: {
    constructEvent: jest.fn()
  },
  products: {
    create: jest.fn()
  },
  prices: {
    create: jest.fn()
  }
};

jest.mock('stripe', () => {
  return jest.fn(() => mockStripeInstance);
});

describe('StripeService', () => {
  let stripeService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
    // Clear module cache to get fresh instance
    delete require.cache[require.resolve('../../../services/stripeService')];
    stripeService = require('../../../services/stripeService');
    // Reset the internal stripe instance
    stripeService.stripe = null;
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('isConfigured', () => {
    it('should return true when STRIPE_SECRET_KEY is set', () => {
      expect(stripeService.isConfigured()).toBe(true);
    });

    it('should return false when STRIPE_SECRET_KEY is not set', () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(stripeService.isConfigured()).toBe(false);
    });
  });

  describe('getStripe', () => {
    it('should throw when STRIPE_SECRET_KEY is not set', () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(() => stripeService.getStripe()).toThrow('STRIPE_SECRET_KEY is not configured');
    });

    it('should return stripe instance when configured', () => {
      const instance = stripeService.getStripe();
      expect(instance).toBeDefined();
    });
  });

  describe('Customer Operations', () => {
    it('should create a customer', async () => {
      mockStripeInstance.customers.create.mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com'
      });

      const result = await stripeService.createCustomer({
        email: 'test@example.com',
        name: 'Test Company',
        metadata: { companyId: 'comp_123' }
      });

      expect(result.id).toBe('cus_test123');
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Company',
        metadata: { companyId: 'comp_123' }
      });
    });

    it('should retrieve a customer', async () => {
      mockStripeInstance.customers.retrieve.mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com'
      });

      const result = await stripeService.getCustomer('cus_test123');
      expect(result.id).toBe('cus_test123');
    });
  });

  describe('Checkout Session Operations', () => {
    it('should create a checkout session', async () => {
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test'
      });

      const result = await stripeService.createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      expect(result.id).toBe('cs_test123');
      expect(result.url).toBe('https://checkout.stripe.com/test');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
          line_items: [{ price: 'price_123', quantity: 1 }]
        })
      );
    });

    it('should retrieve a checkout session with expansions', async () => {
      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test123',
        subscription: { id: 'sub_123' }
      });

      const result = await stripeService.retrieveCheckoutSession('cs_test123');
      expect(result.subscription.id).toBe('sub_123');
      expect(mockStripeInstance.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test123',
        { expand: ['subscription', 'customer'] }
      );
    });
  });

  describe('Subscription Operations', () => {
    it('should get a subscription', async () => {
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        status: 'active'
      });

      const result = await stripeService.getSubscription('sub_123');
      expect(result.status).toBe('active');
    });

    it('should update subscription price', async () => {
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] }
      });
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        status: 'active'
      });

      const result = await stripeService.updateSubscription('sub_123', {
        priceId: 'price_new'
      });

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        items: [{ id: 'si_123', price: 'price_new' }],
        proration_behavior: 'create_prorations'
      });
    });

    it('should cancel subscription at period end', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true
      });

      await stripeService.cancelSubscription('sub_123', { atPeriodEnd: true });

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true
      });
    });

    it('should cancel subscription immediately', async () => {
      mockStripeInstance.subscriptions.cancel.mockResolvedValue({
        id: 'sub_123',
        status: 'canceled'
      });

      await stripeService.cancelSubscription('sub_123', { atPeriodEnd: false });

      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should reactivate subscription', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: false
      });

      await stripeService.reactivateSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: false
      });
    });
  });

  describe('Setup Intent / Payment Method Operations', () => {
    it('should create a setup intent', async () => {
      mockStripeInstance.setupIntents.create.mockResolvedValue({
        id: 'seti_123',
        client_secret: 'seti_123_secret'
      });

      const result = await stripeService.createSetupIntent('cus_123');
      expect(result.client_secret).toBe('seti_123_secret');
    });

    it('should list payment methods', async () => {
      mockStripeInstance.paymentMethods.list.mockResolvedValue({
        data: [{ id: 'pm_123', type: 'card' }]
      });

      const result = await stripeService.listPaymentMethods('cus_123');
      expect(result.data).toHaveLength(1);
    });

    it('should attach a payment method', async () => {
      mockStripeInstance.paymentMethods.attach.mockResolvedValue({
        id: 'pm_123'
      });

      await stripeService.attachPaymentMethod('pm_123', 'cus_123');
      expect(mockStripeInstance.paymentMethods.attach).toHaveBeenCalledWith('pm_123', {
        customer: 'cus_123'
      });
    });

    it('should detach a payment method', async () => {
      mockStripeInstance.paymentMethods.detach.mockResolvedValue({
        id: 'pm_123'
      });

      await stripeService.detachPaymentMethod('pm_123');
      expect(mockStripeInstance.paymentMethods.detach).toHaveBeenCalledWith('pm_123');
    });

    it('should set default payment method', async () => {
      mockStripeInstance.customers.update.mockResolvedValue({
        id: 'cus_123'
      });

      await stripeService.setDefaultPaymentMethod('cus_123', 'pm_123');
      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith('cus_123', {
        invoice_settings: { default_payment_method: 'pm_123' }
      });
    });
  });

  describe('Invoice Operations', () => {
    it('should list invoices', async () => {
      mockStripeInstance.invoices.list.mockResolvedValue({
        data: [{ id: 'in_123', amount_paid: 9900 }]
      });

      const result = await stripeService.listInvoices('cus_123');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Webhook Operations', () => {
    it('should construct event from payload', () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({
        id: 'evt_123',
        type: 'checkout.session.completed'
      });

      const result = stripeService.constructEvent('payload', 'sig', 'secret');
      expect(result.type).toBe('checkout.session.completed');
    });
  });

  describe('Product/Price Operations', () => {
    it('should create a product', async () => {
      mockStripeInstance.products.create.mockResolvedValue({
        id: 'prod_123',
        name: 'Enterprise Plan'
      });

      const result = await stripeService.createProduct({
        name: 'Enterprise Plan',
        description: 'For large orgs'
      });
      expect(result.id).toBe('prod_123');
    });

    it('should create a price', async () => {
      mockStripeInstance.prices.create.mockResolvedValue({
        id: 'price_123',
        unit_amount: 99900
      });

      const result = await stripeService.createPrice({
        productId: 'prod_123',
        amount: 99900,
        currency: 'usd',
        interval: 'month'
      });
      expect(result.id).toBe('price_123');
    });
  });
});
