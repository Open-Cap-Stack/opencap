/**
 * SubscriptionPlan Model
 * Issue #115: Implement Subscription System
 *
 * Data model for subscription plans including:
 * - Pricing configuration
 * - Feature flags
 * - Usage limits
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid billing intervals
const BILLING_INTERVALS = ['month', 'year'];

// Schema definition for documentation and validation
const subscriptionPlanSchema = {
  planId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  price: { type: 'number', required: true },
  currency: { type: 'string', default: 'USD' },
  interval: { type: 'string', enum: BILLING_INTERVALS, default: 'month' },
  trialPeriodDays: { type: 'number', default: 14 },
  features: { type: 'array', default: [] },
  limits: {
    type: 'object',
    default: {
      stakeholders: -1,
      documents: -1,
      storageGB: -1,
      users: -1,
      apiCallsPerMonth: -1
    }
  },
  isActive: { type: 'boolean', default: true },
  sortOrder: { type: 'number', default: 0 },
  externalPlanId: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('subscription_plans', subscriptionPlanSchema);

// Extended SubscriptionPlan model with business logic
const SubscriptionPlan = {
  ...baseModel,
  tableName: 'subscription_plans',
  schema: subscriptionPlanSchema,

  // Export constants
  BILLING_INTERVALS,

  /**
   * Create a new subscription plan with defaults
   * @param {Object} data - Plan data
   * @returns {Object} Created plan
   */
  async create(data) {
    if (!data.planId) {
      data.planId = `plan_${uuidv4()}`;
    }

    // Validate price
    if (data.price < 0) {
      throw new Error('price cannot be negative');
    }

    // Validate billing interval
    if (data.interval && !BILLING_INTERVALS.includes(data.interval)) {
      throw new Error(`interval must be one of: ${BILLING_INTERVALS.join(', ')}`);
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find plan by planId
   * @param {string} planId - Plan ID
   * @returns {Object|null} Plan or null
   */
  async findByPlanId(planId) {
    return baseModel.findOne.call(baseModel, { planId });
  },

  /**
   * Find active plans
   * @returns {Array} Active plans sorted by sortOrder
   */
  async findActive() {
    const plans = await baseModel.find.call(baseModel, { isActive: true });
    return plans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  /**
   * Check if plan has trial
   * @param {Object} plan - Plan object
   * @returns {boolean} True if has trial
   */
  hasTrial(plan) {
    return plan.trialPeriodDays > 0;
  },

  /**
   * Get formatted price
   * @param {Object} plan - Plan object
   * @returns {string} Formatted price with currency
   */
  getFormattedPrice(plan) {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: plan.currency || 'USD'
    });
    return formatter.format(plan.price);
  },

  /**
   * Check if a feature is included
   * @param {Object} plan - Plan object
   * @param {string} featureName - Feature name
   * @returns {boolean} True if feature is included
   */
  hasFeature(plan, featureName) {
    return plan.features && plan.features.includes(featureName);
  },

  /**
   * Get limit value
   * @param {Object} plan - Plan object
   * @param {string} limitType - Limit type
   * @returns {number} Limit value (-1 for unlimited)
   */
  getLimit(plan, limitType) {
    if (!plan.limits || plan.limits[limitType] === undefined) {
      return -1; // Unlimited by default
    }
    return plan.limits[limitType];
  },

  /**
   * Check if limit is unlimited
   * @param {Object} plan - Plan object
   * @param {string} limitType - Limit type
   * @returns {boolean} True if unlimited
   */
  isLimitUnlimited(plan, limitType) {
    return this.getLimit(plan, limitType) === -1;
  },

  /**
   * Check if usage is within limit
   * @param {Object} plan - Plan object
   * @param {string} limitType - Limit type
   * @param {number} currentUsage - Current usage
   * @returns {boolean} True if within limit
   */
  isWithinLimit(plan, limitType, currentUsage) {
    const limit = this.getLimit(plan, limitType);
    if (limit === -1) return true; // Unlimited
    return currentUsage <= limit;
  },

  /**
   * Activate plan
   * @param {string} planId - Plan ID
   * @returns {Object} Updated plan
   */
  async activate(planId) {
    return baseModel.updateOne.call(baseModel,
      { planId },
      { $set: { isActive: true } }
    );
  },

  /**
   * Deactivate plan
   * @param {string} planId - Plan ID
   * @returns {Object} Updated plan
   */
  async deactivate(planId) {
    return baseModel.updateOne.call(baseModel,
      { planId },
      { $set: { isActive: false } }
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

module.exports = SubscriptionPlan;
