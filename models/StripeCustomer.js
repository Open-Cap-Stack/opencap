/**
 * StripeCustomer Model
 * Maps companies to Stripe customers
 *
 * Stores the relationship between internal companyId/userId
 * and Stripe customer IDs for billing operations.
 *
 * Uses ZeroDB as data store.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const stripeCustomerSchema = {
  mappingId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true, unique: true },
  userId: { type: 'string', default: null },
  stripeCustomerId: { type: 'string', required: true, unique: true },
  email: { type: 'string', default: null },
  name: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

const baseModel = createModel('stripe_customers', stripeCustomerSchema);

const StripeCustomer = {
  ...baseModel,
  tableName: 'stripe_customers',
  schema: stripeCustomerSchema,

  /**
   * Create a new Stripe customer mapping
   * @param {Object} data - Customer mapping data
   * @returns {Object} Created mapping
   */
  async create(data) {
    if (!data.mappingId) {
      data.mappingId = `scm_${uuidv4()}`;
    }
    if (!data.companyId) {
      throw new Error('companyId is required');
    }
    if (!data.stripeCustomerId) {
      throw new Error('stripeCustomerId is required');
    }
    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find by company ID
   * @param {string} companyId
   * @returns {Object|null}
   */
  async findByCompanyId(companyId) {
    return baseModel.findOne.call(baseModel, { companyId });
  },

  /**
   * Find by Stripe customer ID
   * @param {string} stripeCustomerId
   * @returns {Object|null}
   */
  async findByStripeId(stripeCustomerId) {
    return baseModel.findOne.call(baseModel, { stripeCustomerId });
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel)
};

module.exports = StripeCustomer;
