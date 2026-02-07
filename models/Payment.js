/**
 * Payment Model
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Stores payment records for financial transactions
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid payment statuses
const VALID_PAYMENT_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'refunded'];

// Valid payment methods
const VALID_PAYMENT_METHODS = ['card', 'bank_transfer', 'invoice'];

// Valid ISO currency codes
const VALID_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Currency symbols
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '\u20AC',
  'GBP': '\u00A3',
  'CAD': 'CA$',
  'AUD': 'A$',
  'JPY': '\u00A5',
  'CNY': '\u00A5',
  'INR': '\u20B9',
  'CHF': 'CHF',
  'BRL': 'R$'
};

// Schema definition for documentation and validation
const paymentSchema = {
  paymentId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  customerId: { type: 'string', required: true },
  amount: { type: 'number', required: true },
  currency: { type: 'string', required: true },
  status: { type: 'string', enum: VALID_PAYMENT_STATUSES, default: 'pending' },
  paymentMethod: { type: 'string', required: true, enum: VALID_PAYMENT_METHODS },
  stripePaymentIntentId: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  description: { type: 'string', default: '' },
  receiptUrl: { type: 'string', default: null },
  invoiceId: { type: 'string', default: null },
  refundedAmount: { type: 'number', default: 0 },
  failureReason: { type: 'string', default: null },
  processedAt: { type: 'date', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('payments', paymentSchema);

// Extended Payment model with business logic
const Payment = {
  ...baseModel,
  tableName: 'payments',
  schema: paymentSchema,

  // Export constants
  VALID_PAYMENT_STATUSES,
  VALID_PAYMENT_METHODS,
  VALID_CURRENCY_CODES,
  CURRENCY_SYMBOLS,

  /**
   * Create a new payment with defaults
   * @param {Object} data - Payment data
   * @returns {Object} Created payment
   */
  async create(data) {
    if (!data.paymentId) {
      data.paymentId = `pay_${uuidv4()}`;
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Validate currency
    data.currency = data.currency.toUpperCase();
    if (!VALID_CURRENCY_CODES.includes(data.currency)) {
      throw new Error(`${data.currency} is not a valid ISO currency code`);
    }

    // Validate payment method
    if (!VALID_PAYMENT_METHODS.includes(data.paymentMethod)) {
      throw new Error(`Invalid payment method: ${data.paymentMethod}`);
    }

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find payment by paymentId
   * @param {string} paymentId - Payment ID
   * @returns {Object|null} Payment or null
   */
  async findByPaymentId(paymentId) {
    return baseModel.findOne.call(baseModel, { paymentId });
  },

  /**
   * Find payments by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Payments for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find payments by customer
   * @param {string} customerId - Customer ID
   * @returns {Array} Payments for customer
   */
  async findByCustomer(customerId) {
    return baseModel.find.call(baseModel, { customerId });
  },

  /**
   * Find payment by Stripe ID
   * @param {string} stripePaymentIntentId - Stripe payment intent ID
   * @returns {Object|null} Payment or null
   */
  async findByStripeId(stripePaymentIntentId) {
    return baseModel.findOne.call(baseModel, { stripePaymentIntentId });
  },

  /**
   * Get the net amount after any refunds
   * @param {Object} payment - Payment object
   * @returns {number} Net amount
   */
  getNetAmount(payment) {
    return payment.amount - (payment.refundedAmount || 0);
  },

  /**
   * Check if payment can be refunded
   * @param {Object} payment - Payment object
   * @returns {boolean} Whether payment can be refunded
   */
  canRefund(payment) {
    return payment.status === 'succeeded' && this.getNetAmount(payment) > 0;
  },

  /**
   * Get formatted amount with currency symbol
   * @param {Object} payment - Payment object
   * @returns {string} Formatted amount with currency symbol
   */
  getFormattedAmount(payment) {
    const symbol = CURRENCY_SYMBOLS[payment.currency] || '';
    return `${symbol}${payment.amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  },

  /**
   * Mark payment as succeeded
   * @param {string} paymentId - Payment ID
   * @returns {Object} Update result
   */
  async markSucceeded(paymentId) {
    return baseModel.updateOne.call(baseModel,
      { paymentId },
      {
        $set: {
          status: 'succeeded',
          processedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Mark payment as failed
   * @param {string} paymentId - Payment ID
   * @param {string} reason - Failure reason
   * @returns {Object} Update result
   */
  async markFailed(paymentId, reason) {
    return baseModel.updateOne.call(baseModel,
      { paymentId },
      {
        $set: {
          status: 'failed',
          failureReason: reason
        }
      }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = Payment;
