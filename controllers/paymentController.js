/**
 * Payment Controller
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Handles HTTP requests for payment operations
 */

const paymentService = require('../services/paymentService');

/**
 * Determine HTTP status code based on error message
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
const getErrorStatusCode = (error) => {
  const message = error.message.toLowerCase();

  if (message.includes('not found')) {
    return 404;
  }

  if (message.includes('required') ||
      message.includes('invalid') ||
      message.includes('must be') ||
      message.includes('exceeds') ||
      message.includes('expired') ||
      message.includes('only succeeded') ||
      message.includes('already') ||
      message.includes('not in pending') ||
      message.includes('not in processing')) {
    return 400;
  }

  return 500;
};

/**
 * Create a payment intent
 * POST /api/v1/payments/intents
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    const { customerId, amount, currency, paymentMethod, description, metadata, invoiceId } = req.body;
    const companyId = req.user?.companyId || req.body.companyId;

    const payment = await paymentService.createPaymentIntent({
      companyId,
      customerId,
      amount,
      currency,
      paymentMethod,
      description,
      metadata,
      invoiceId
    });

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Confirm a payment
 * POST /api/v1/payments/:id/confirm
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await paymentService.confirmPayment(id);
    return res.status(200).json(payment);
  } catch (error) {
    console.error('Error confirming payment:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Process a payment (capture)
 * POST /api/v1/payments/:id/process
 */
const processPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await paymentService.processPayment(id);
    return res.status(200).json(payment);
  } catch (error) {
    console.error('Error processing payment:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Refund a payment
 * POST /api/v1/payments/:id/refund
 */
const refundPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const options = {};
    if (amount !== undefined) options.amount = amount;
    if (reason) options.reason = reason;

    const refund = await paymentService.refundPayment(id, options);
    return res.status(200).json(refund);
  } catch (error) {
    console.error('Error refunding payment:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Get a payment by ID
 * GET /api/v1/payments/:id
 */
const getPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await paymentService.getPaymentById(id);
    return res.status(200).json(payment);
  } catch (error) {
    console.error('Error getting payment:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Get payment history
 * GET /api/v1/payments
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { customerId, companyId, status, startDate, endDate, page, limit } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const result = await paymentService.getPaymentHistory({
      customerId,
      companyId: companyId || req.user?.companyId,
      status,
      startDate,
      endDate,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting payment history:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Add a payment method
 * POST /api/v1/customers/:customerId/payment-methods
 */
const addPaymentMethod = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { type, last4, brand, expiryMonth, expiryYear, billingDetails, metadata } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const method = await paymentService.addPaymentMethod({
      customerId,
      type,
      last4,
      brand,
      expiryMonth,
      expiryYear,
      billingDetails,
      metadata
    });

    return res.status(201).json(method);
  } catch (error) {
    console.error('Error adding payment method:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Remove a payment method
 * DELETE /api/v1/customers/:customerId/payment-methods/:methodId
 */
const removePaymentMethod = async (req, res, next) => {
  try {
    const { customerId, methodId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    if (!methodId) {
      return res.status(400).json({ error: 'Method ID is required' });
    }

    const result = await paymentService.removePaymentMethod(methodId, customerId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error removing payment method:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Get all payment methods for a customer
 * GET /api/v1/customers/:customerId/payment-methods
 */
const getPaymentMethods = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { type } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const options = {};
    if (type) options.type = type;

    const methods = await paymentService.getPaymentMethods(customerId, options);
    return res.status(200).json(methods);
  } catch (error) {
    console.error('Error getting payment methods:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Set default payment method
 * PUT /api/v1/customers/:customerId/payment-methods/:methodId/default
 */
const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { customerId, methodId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    if (!methodId) {
      return res.status(400).json({ error: 'Method ID is required' });
    }

    const result = await paymentService.setDefaultPaymentMethod(methodId, customerId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error setting default payment method:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Handle Stripe webhooks
 * POST /api/v1/webhooks/stripe
 *
 * DEPRECATED: Use /api/v1/billing/webhook instead.
 * This endpoint verifies Stripe signatures. Requires express.raw() middleware.
 */
const handleWebhook = async (req, res, next) => {
  try {
    const stripeService = require('../services/stripeService');

    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripeService.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const result = await paymentService.handleWebhook(event);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  processPayment,
  refundPayment,
  getPayment,
  getPaymentHistory,
  addPaymentMethod,
  removePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  handleWebhook
};
