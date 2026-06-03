/**
 * Stripe Service
 * Pure Stripe API wrapper - does NOT touch ZeroDB
 *
 * All methods map directly to Stripe API calls.
 * Business logic and ZeroDB sync happens in BillingService.
 */

class StripeService {
  constructor() {
    this.stripe = null;
  }

  /**
   * Initialize or get the Stripe instance
   * @returns {Object} Stripe instance
   */
  getStripe() {
    if (!this.stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }
      this.stripe = require('stripe')(key);
    }
    return this.stripe;
  }

  /**
   * Check if Stripe is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  // --- Customer Operations ---

  async createCustomer({ email, name, metadata = {} }) {
    const stripe = this.getStripe();
    return stripe.customers.create({ email, name, metadata });
  }

  async getCustomer(customerId) {
    const stripe = this.getStripe();
    return stripe.customers.retrieve(customerId);
  }

  // --- Checkout Session Operations ---

  async createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, metadata = {} }) {
    const stripe = this.getStripe();
    const params = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    };
    return stripe.checkout.sessions.create(params);
  }

  // --- PaymentIntent Operations (for Stripe Payment Element / Link) ---

  async createPaymentIntent({ amount, currency = 'usd', description, metadata = {}, connectedAccountId }) {
    const stripe = this.getStripe();
    const params = {
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      description,
      metadata
    };
    if (connectedAccountId) {
      params.transfer_data = { destination: connectedAccountId };
    }
    return stripe.paymentIntents.create(params);
  }

  async retrievePaymentIntent(paymentIntentId) {
    const stripe = this.getStripe();
    return stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async retrieveCheckoutSession(sessionId) {
    const stripe = this.getStripe();
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });
  }

  // --- Subscription Operations ---

  async getSubscription(subscriptionId) {
    const stripe = this.getStripe();
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  async updateSubscription(subscriptionId, { priceId }) {
    const stripe = this.getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId
      }],
      proration_behavior: 'create_prorations'
    });
  }

  async cancelSubscription(subscriptionId, { atPeriodEnd = true } = {}) {
    const stripe = this.getStripe();
    if (atPeriodEnd) {
      return stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
    return stripe.subscriptions.cancel(subscriptionId);
  }

  async reactivateSubscription(subscriptionId) {
    const stripe = this.getStripe();
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
  }

  // --- Setup Intent / Payment Method Operations ---

  async createSetupIntent(customerId) {
    const stripe = this.getStripe();
    return stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    });
  }

  async listPaymentMethods(customerId) {
    const stripe = this.getStripe();
    return stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
  }

  async attachPaymentMethod(paymentMethodId, customerId) {
    const stripe = this.getStripe();
    return stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
  }

  async detachPaymentMethod(paymentMethodId) {
    const stripe = this.getStripe();
    return stripe.paymentMethods.detach(paymentMethodId);
  }

  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    const stripe = this.getStripe();
    return stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
  }

  // --- Invoice Operations ---

  async listInvoices(customerId, limit = 20) {
    const stripe = this.getStripe();
    return stripe.invoices.list({
      customer: customerId,
      limit
    });
  }

  // --- Webhook Operations ---

  constructEvent(payload, signature, secret) {
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  // --- Product/Price Operations ---

  async createProduct({ name, description }) {
    const stripe = this.getStripe();
    return stripe.products.create({ name, description });
  }

  async createPrice({ productId, amount, currency = 'usd', interval = 'month' }) {
    const stripe = this.getStripe();
    return stripe.prices.create({
      product: productId,
      unit_amount: amount, // in cents
      currency,
      recurring: { interval }
    });
  }
}

module.exports = new StripeService();
