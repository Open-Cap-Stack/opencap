/**
 * PaymentMethod Model
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Stores customer payment methods (cards, bank accounts, etc.)
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid payment method types
const METHOD_TYPES = ['card', 'bank_account'];

// Valid statuses
const VALID_STATUSES = ['active', 'inactive', 'expired'];

// Valid card brands
const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'unknown'];

// Schema definition for documentation and validation
const paymentMethodSchema = {
  methodId: { type: 'string', required: true, unique: true },
  customerId: { type: 'string', required: true },
  type: { type: 'string', required: true, enum: METHOD_TYPES },
  last4: { type: 'string', required: true },
  brand: { type: 'string', enum: CARD_BRANDS, default: 'unknown' },
  expiryMonth: { type: 'number', default: null },
  expiryYear: { type: 'number', default: null },
  isDefault: { type: 'boolean', default: false },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  billingDetails: {
    type: 'object',
    default: {
      name: null,
      email: null,
      phone: null,
      address: {
        line1: null,
        line2: null,
        city: null,
        state: null,
        postalCode: null,
        country: null
      }
    }
  },
  stripePaymentMethodId: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('payment_methods', paymentMethodSchema);

// Extended PaymentMethod model with business logic
const PaymentMethod = {
  ...baseModel,
  tableName: 'payment_methods',
  schema: paymentMethodSchema,

  // Export constants
  METHOD_TYPES,
  VALID_STATUSES,
  CARD_BRANDS,

  /**
   * Create a new payment method with defaults
   * @param {Object} data - Payment method data
   * @returns {Object} Created payment method
   */
  async create(data) {
    if (!data.methodId) {
      data.methodId = `pm_${uuidv4()}`;
    }

    // Validate type
    if (!METHOD_TYPES.includes(data.type)) {
      throw new Error(`type must be one of: ${METHOD_TYPES.join(', ')}`);
    }

    // Validate last4
    if (!data.last4 || data.last4.length !== 4) {
      throw new Error('last4 must be exactly 4 characters');
    }

    if (!data.status) {
      data.status = 'active';
    }

    // Check if expired and update status
    if (data.type === 'card' && this.isExpiredCheck(data)) {
      data.status = 'expired';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find payment method by methodId
   * @param {string} methodId - Method ID
   * @returns {Object|null} Payment method or null
   */
  async findByMethodId(methodId) {
    return baseModel.findOne.call(baseModel, { methodId });
  },

  /**
   * Find payment methods by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Array} Payment methods for customer
   */
  async findByCustomer(customerId, options = {}) {
    const query = { customerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find payment method by Stripe ID
   * @param {string} stripePaymentMethodId - Stripe payment method ID
   * @returns {Object|null} Payment method or null
   */
  async findByStripeId(stripePaymentMethodId) {
    return baseModel.findOne.call(baseModel, { stripePaymentMethodId });
  },

  /**
   * Get default payment method for customer
   * @param {string} customerId - Customer ID
   * @returns {Object|null} Default payment method or null
   */
  async getDefault(customerId) {
    return baseModel.findOne.call(baseModel, { customerId, isDefault: true, status: 'active' });
  },

  /**
   * Check if payment method is expired
   * @param {Object} paymentMethod - Payment method object
   * @returns {boolean} True if expired
   */
  isExpired(paymentMethod) {
    return this.isExpiredCheck(paymentMethod);
  },

  /**
   * Internal expired check
   * @param {Object} data - Payment method data
   * @returns {boolean} True if expired
   */
  isExpiredCheck(data) {
    if (data.type !== 'card' || !data.expiryMonth || !data.expiryYear) {
      return false;
    }

    const now = new Date();
    const expiry = new Date(data.expiryYear, data.expiryMonth, 0);
    return now > expiry;
  },

  /**
   * Get masked display
   * @param {Object} paymentMethod - Payment method object
   * @returns {string} Masked display
   */
  getMaskedDisplay(paymentMethod) {
    if (paymentMethod.type === 'card') {
      return `**** **** **** ${paymentMethod.last4}`;
    }
    return `****${paymentMethod.last4}`;
  },

  /**
   * Get display label
   * @param {Object} paymentMethod - Payment method object
   * @returns {string} Display label
   */
  getDisplayLabel(paymentMethod) {
    if (paymentMethod.type === 'card') {
      const brandName = paymentMethod.brand ?
        paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1) : 'Card';
      return `${brandName} ending in ${paymentMethod.last4}`;
    }
    return `Bank account ending in ${paymentMethod.last4}`;
  },

  /**
   * Set as default
   * @param {string} customerId - Customer ID
   * @param {string} methodId - Method ID to set as default
   * @returns {Object} Updated payment method
   */
  async setDefault(customerId, methodId) {
    // First, unset any existing default
    await baseModel.updateMany.call(baseModel,
      { customerId, isDefault: true },
      { $set: { isDefault: false } }
    );

    // Set the new default
    return baseModel.updateOne.call(baseModel,
      { methodId },
      { $set: { isDefault: true } }
    );
  },

  /**
   * Deactivate payment method
   * @param {string} methodId - Method ID
   * @returns {Object} Updated payment method
   */
  async deactivate(methodId) {
    return baseModel.updateOne.call(baseModel,
      { methodId },
      { $set: { status: 'inactive', isDefault: false } }
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

module.exports = PaymentMethod;
