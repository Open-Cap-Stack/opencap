/**
 * Payment Service
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Business logic for payment processing operations
 * Stripe-style API with mocked implementation for testing
 */

const zerodbService = require('./zerodbService');
const { v4: uuidv4 } = require('uuid');

// Valid currencies
const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Valid payment method types
const validPaymentMethodTypes = ['card', 'bank_account'];

// Valid payment statuses
const validPaymentStatuses = ['pending', 'processing', 'succeeded', 'failed', 'refunded'];

// Webhook event types we handle
const handledWebhookEvents = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.refund.updated'
];

/**
 * Generate a unique payment ID
 * @returns {string} Payment ID
 */
const generatePaymentId = () => `pay_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

/**
 * Generate a unique payment method ID
 * @returns {string} Payment method ID
 */
const generateMethodId = () => `pm_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

/**
 * Generate a mock Stripe payment intent ID
 * @returns {string} Payment intent ID
 */
const generateStripePaymentIntentId = () => `pi_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

/**
 * Generate a unique refund ID
 * @returns {string} Refund ID
 */
const generateRefundId = () => `re_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

/**
 * Validate required fields
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Required field names
 * @throws {Error} If required field is missing
 */
const validateRequired = (data, requiredFields) => {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`${field} is required`);
    }
  }
};

/**
 * Validate currency code
 * @param {string} currency - Currency code
 * @throws {Error} If currency is invalid
 */
const validateCurrency = (currency) => {
  if (!validCurrencies.includes(currency.toUpperCase())) {
    throw new Error(`Invalid currency code: ${currency}`);
  }
};

/**
 * Check if card is expired
 * @param {number} month - Expiry month
 * @param {number} year - Expiry year
 * @returns {boolean} Whether card is expired
 */
const isCardExpired = (month, year) => {
  const now = new Date();
  const expiry = new Date(year, month, 0); // Last day of expiry month
  return now > expiry;
};

class PaymentService {
  /**
   * Create a payment intent
   * @param {Object} data - Payment data
   * @param {string} data.companyId - Company ID
   * @param {string} data.customerId - Customer ID
   * @param {number} data.amount - Amount in smallest currency unit (cents)
   * @param {string} data.currency - Currency code
   * @param {string} data.paymentMethod - Payment method type
   * @param {string} [data.description] - Payment description
   * @param {Object} [data.metadata] - Additional metadata
   * @returns {Object} Created payment intent
   */
  async createPaymentIntent(data) {
    try {
      // Validate required fields
      validateRequired(data, ['companyId', 'customerId', 'amount', 'currency', 'paymentMethod']);

      // Validate amount
      if (typeof data.amount !== 'number' || data.amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      // Validate currency
      validateCurrency(data.currency);

      const paymentId = generatePaymentId();
      const stripePaymentIntentId = generateStripePaymentIntentId();

      const paymentData = {
        paymentId,
        companyId: data.companyId,
        customerId: data.customerId,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        status: 'pending',
        paymentMethod: data.paymentMethod,
        stripePaymentIntentId,
        description: data.description || '',
        metadata: data.metadata || {},
        refundedAmount: 0,
        receiptUrl: null,
        invoiceId: data.invoiceId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await zerodbService.insertRow('payments', paymentData);
      const createdPayment = result.rows && result.rows[0] ? result.rows[0] : paymentData;

      return createdPayment;
    } catch (error) {
      if (error.message.includes('is required') ||
          error.message.includes('Amount must') ||
          error.message.includes('Invalid currency')) {
        throw error;
      }
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Confirm a pending payment
   * @param {string} paymentId - Payment ID
   * @returns {Object} Confirmed payment
   */
  async confirmPayment(paymentId) {
    // Get existing payment
    const payments = await zerodbService.queryTable('payments', {
      filter: { paymentId }
    });

    if (!payments || payments.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = payments[0];

    if (payment.status !== 'pending') {
      throw new Error('Payment is not in pending status');
    }

    // Update status to processing (simulating Stripe confirmation)
    await zerodbService.updateRows('payments', { paymentId }, {
      $set: {
        status: 'processing',
        updatedAt: new Date().toISOString()
      }
    });

    // Return updated payment
    const updatedPayments = await zerodbService.queryTable('payments', {
      filter: { paymentId }
    });

    return updatedPayments[0];
  }

  /**
   * Process a payment (simulate Stripe capture)
   * @param {string} paymentId - Payment ID
   * @returns {Object} Processed payment
   */
  async processPayment(paymentId) {
    try {
      // Get existing payment
      const payments = await zerodbService.queryTable('payments', {
        filter: { paymentId }
      });

      if (!payments || payments.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = payments[0];

      if (payment.status !== 'processing') {
        throw new Error('Payment is not in processing status');
      }

      // Simulate payment processing (would call Stripe in production)
      // For testing, we'll simulate success
      const receiptUrl = `https://receipts.opencap.io/${paymentId}`;

      await zerodbService.updateRows('payments', { paymentId }, {
        $set: {
          status: 'succeeded',
          receiptUrl,
          processedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      // Return updated payment
      const updatedPayments = await zerodbService.queryTable('payments', {
        filter: { paymentId }
      });

      return updatedPayments[0];
    } catch (error) {
      if (error.message.includes('Payment not found') ||
          error.message.includes('not in processing')) {
        throw error;
      }
      throw new Error('Payment processing failed');
    }
  }

  /**
   * Refund a payment
   * @param {string} paymentId - Payment ID
   * @param {Object} [options] - Refund options
   * @param {number} [options.amount] - Partial refund amount
   * @param {string} [options.reason] - Refund reason
   * @returns {Object} Refund result
   */
  async refundPayment(paymentId, options = {}) {
    // Get existing payment
    const payments = await zerodbService.queryTable('payments', {
      filter: { paymentId }
    });

    if (!payments || payments.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = payments[0];

    // Check if payment can be refunded
    if (payment.status === 'refunded' && payment.refundedAmount >= payment.amount) {
      throw new Error('Payment has already been fully refunded');
    }

    if (payment.status !== 'succeeded' && payment.status !== 'refunded') {
      throw new Error('Only succeeded payments can be refunded');
    }

    // Calculate refund amount
    const availableForRefund = payment.amount - (payment.refundedAmount || 0);
    const refundAmount = options.amount || availableForRefund;

    if (refundAmount > availableForRefund) {
      throw new Error('Refund amount exceeds available amount');
    }

    const newRefundedAmount = (payment.refundedAmount || 0) + refundAmount;
    const newStatus = newRefundedAmount >= payment.amount ? 'refunded' : payment.status;

    // Update payment
    await zerodbService.updateRows('payments', { paymentId }, {
      $set: {
        status: newStatus,
        refundedAmount: newRefundedAmount,
        updatedAt: new Date().toISOString()
      }
    });

    // Create refund record
    const refundId = generateRefundId();
    await zerodbService.insertRow('refunds', {
      refundId,
      paymentId,
      amount: refundAmount,
      reason: options.reason || 'requested_by_customer',
      status: 'succeeded',
      createdAt: new Date().toISOString()
    });

    return {
      refundId,
      paymentId,
      refundAmount,
      newTotalRefunded: newRefundedAmount,
      status: newStatus
    };
  }

  /**
   * Add a payment method for a customer
   * @param {Object} data - Payment method data
   * @param {string} data.customerId - Customer ID
   * @param {string} data.type - Payment method type (card, bank_account)
   * @param {string} data.last4 - Last 4 digits
   * @param {string} [data.brand] - Card brand
   * @param {number} [data.expiryMonth] - Expiry month
   * @param {number} [data.expiryYear] - Expiry year
   * @param {Object} [data.billingDetails] - Billing details
   * @returns {Object} Created payment method
   */
  async addPaymentMethod(data) {
    // Validate required fields
    validateRequired(data, ['customerId', 'type', 'last4']);

    // Validate type
    if (!validPaymentMethodTypes.includes(data.type)) {
      throw new Error('Invalid payment method type');
    }

    // Validate last4
    if (!/^\d{4}$/.test(data.last4)) {
      throw new Error('last4 must be exactly 4 digits');
    }

    // Check if card is expired
    if (data.type === 'card' && data.expiryMonth && data.expiryYear) {
      if (isCardExpired(data.expiryMonth, data.expiryYear)) {
        throw new Error('Card is expired');
      }
    }

    // Check if customer has existing payment methods
    const existingMethods = await zerodbService.queryTable('payment_methods', {
      filter: { customerId: data.customerId, status: 'active' }
    });

    const isDefault = !existingMethods || existingMethods.length === 0;

    const methodId = generateMethodId();
    const stripePaymentMethodId = `pm_stripe_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

    const methodData = {
      methodId,
      customerId: data.customerId,
      type: data.type,
      last4: data.last4,
      brand: data.brand || 'unknown',
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      isDefault,
      status: 'active',
      billingDetails: data.billingDetails || {},
      stripePaymentMethodId,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await zerodbService.insertRow('payment_methods', methodData);
    const createdMethod = result.rows && result.rows[0] ? result.rows[0] : methodData;

    return createdMethod;
  }

  /**
   * Remove a payment method
   * @param {string} methodId - Payment method ID
   * @param {string} customerId - Customer ID
   * @returns {Object} Result
   */
  async removePaymentMethod(methodId, customerId) {
    // Get existing method
    const methods = await zerodbService.queryTable('payment_methods', {
      filter: { methodId, customerId }
    });

    if (!methods || methods.length === 0) {
      throw new Error('Payment method not found');
    }

    const method = methods[0];
    const wasDefault = method.isDefault;

    // Delete the method
    await zerodbService.deleteRows('payment_methods', { methodId, customerId });

    // If it was the default, set another method as default
    if (wasDefault) {
      const remainingMethods = await zerodbService.queryTable('payment_methods', {
        filter: { customerId, status: 'active' },
        limit: 1
      });

      if (remainingMethods && remainingMethods.length > 0) {
        await zerodbService.updateRows('payment_methods',
          { methodId: remainingMethods[0].methodId },
          { $set: { isDefault: true, updatedAt: new Date().toISOString() } }
        );
      }
    }

    return { success: true, methodId };
  }

  /**
   * Get payment history for a customer
   * @param {Object} options - Query options
   * @param {string} options.customerId - Customer ID
   * @param {string} [options.companyId] - Company ID
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.startDate] - Filter from date
   * @param {string} [options.endDate] - Filter to date
   * @param {number} [options.page] - Page number
   * @param {number} [options.limit] - Items per page
   * @returns {Object} Payment history with pagination
   */
  async getPaymentHistory(options) {
    const {
      customerId,
      companyId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = options;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (companyId) filter.companyId = companyId;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate).toISOString();
      if (endDate) filter.createdAt.$lte = new Date(endDate).toISOString();
    }

    const payments = await zerodbService.queryTable('payments', {
      filter,
      skip,
      limit: limitNum,
      sort: { createdAt: -1 }
    });

    const totalCount = await zerodbService.countRows('payments', filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      payments,
      totalCount,
      currentPage: pageNum,
      totalPages,
      limit: limitNum
    };
  }

  /**
   * Handle Stripe webhook events
   * @param {Object} event - Webhook event
   * @returns {Object} Handling result
   */
  async handleWebhook(event) {
    const { type, data } = event;

    if (!handledWebhookEvents.includes(type)) {
      return { handled: false, message: 'Event type not handled' };
    }

    const paymentIntentId = data.object.id || data.object.payment_intent;

    // Find the payment by Stripe payment intent ID
    const payments = await zerodbService.queryTable('payments', {
      filter: { stripePaymentIntentId: paymentIntentId }
    });

    if (!payments || payments.length === 0) {
      return { handled: false, message: 'Payment not found' };
    }

    const payment = payments[0];

    switch (type) {
      case 'payment_intent.succeeded': {
        await zerodbService.updateRows('payments',
          { stripePaymentIntentId: paymentIntentId },
          {
            $set: {
              status: 'succeeded',
              processedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        );
        return { handled: true, paymentId: payment.paymentId, status: 'succeeded' };
      }

      case 'payment_intent.payment_failed': {
        const failureReason = data.object.last_payment_error?.message || 'Payment failed';
        await zerodbService.updateRows('payments',
          { stripePaymentIntentId: paymentIntentId },
          {
            $set: {
              status: 'failed',
              failureReason,
              updatedAt: new Date().toISOString()
            }
          }
        );
        return { handled: true, paymentId: payment.paymentId, status: 'failed' };
      }

      case 'charge.refunded':
      case 'charge.refund.updated': {
        const amountRefunded = data.object.amount_refunded;
        const newStatus = amountRefunded >= payment.amount ? 'refunded' : payment.status;

        await zerodbService.updateRows('payments',
          { stripePaymentIntentId: paymentIntentId },
          {
            $set: {
              refundedAmount: amountRefunded,
              status: newStatus,
              updatedAt: new Date().toISOString()
            }
          }
        );
        return { handled: true, paymentId: payment.paymentId, refundedAmount: amountRefunded };
      }

      default:
        return { handled: false, message: 'Event type not handled' };
    }
  }

  /**
   * Get a payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Object} Payment
   */
  async getPaymentById(paymentId) {
    const payments = await zerodbService.queryTable('payments', {
      filter: { paymentId }
    });

    if (!payments || payments.length === 0) {
      throw new Error('Payment not found');
    }

    return payments[0];
  }

  /**
   * Get payment methods for a customer
   * @param {string} customerId - Customer ID
   * @param {Object} [options] - Query options
   * @param {string} [options.type] - Filter by type
   * @returns {Array} Payment methods
   */
  async getPaymentMethods(customerId, options = {}) {
    const filter = { customerId, status: 'active' };
    if (options.type) filter.type = options.type;

    const methods = await zerodbService.queryTable('payment_methods', {
      filter,
      sort: { isDefault: -1, createdAt: -1 }
    });

    return methods || [];
  }

  /**
   * Set a payment method as default
   * @param {string} methodId - Payment method ID
   * @param {string} customerId - Customer ID
   * @returns {Object} Updated payment method
   */
  async setDefaultPaymentMethod(methodId, customerId) {
    // Verify method exists
    const methods = await zerodbService.queryTable('payment_methods', {
      filter: { methodId, customerId }
    });

    if (!methods || methods.length === 0) {
      throw new Error('Payment method not found');
    }

    // Unset all current defaults
    await zerodbService.updateRows('payment_methods',
      { customerId, isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date().toISOString() } }
    );

    // Set new default
    await zerodbService.updateRows('payment_methods',
      { methodId },
      { $set: { isDefault: true, updatedAt: new Date().toISOString() } }
    );

    return { methodId, isDefault: true };
  }
}

module.exports = new PaymentService();
