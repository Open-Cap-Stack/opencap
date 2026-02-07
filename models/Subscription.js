/**
 * Subscription Model
 * Issue #115: Implement Subscription System
 *
 * Data model for managing company subscriptions including:
 * - Subscription lifecycle (trial, active, paused, canceled)
 * - Billing period tracking
 * - Usage tracking for limits
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid subscription statuses
const VALID_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'paused'];

// Valid history actions
const VALID_HISTORY_ACTIONS = ['created', 'activated', 'paused', 'resumed', 'canceled', 'renewed', 'plan_changed', 'quantity_changed'];

// Schema definition for documentation and validation
const subscriptionSchema = {
  subscriptionId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  planId: { type: 'string', required: true },
  status: { type: 'string', enum: VALID_STATUSES, default: 'trialing' },
  currentPeriodStart: { type: 'date', default: null },
  currentPeriodEnd: { type: 'date', default: null },
  trialStart: { type: 'date', default: null },
  trialEnd: { type: 'date', default: null },
  canceledAt: { type: 'date', default: null },
  cancelAtPeriodEnd: { type: 'boolean', default: false },
  cancellationReason: { type: 'string', default: null },
  quantity: { type: 'number', default: 1 },
  pausedAt: { type: 'date', default: null },
  resumesAt: { type: 'date', default: null },
  metadata: { type: 'object', default: {} },
  history: { type: 'array', default: [] },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('subscriptions', subscriptionSchema);

// Extended Subscription model with business logic
const Subscription = {
  ...baseModel,
  tableName: 'subscriptions',
  schema: subscriptionSchema,

  // Export constants
  VALID_STATUSES,
  VALID_HISTORY_ACTIONS,

  /**
   * Create a new subscription with defaults
   * @param {Object} data - Subscription data
   * @returns {Object} Created subscription
   */
  async create(data) {
    if (!data.subscriptionId) {
      data.subscriptionId = `sub_${uuidv4()}`;
    }

    if (!data.status) {
      data.status = 'trialing';
    }

    if (!data.quantity || data.quantity < 1) {
      data.quantity = 1;
    }

    // Add initial history entry
    data.history = data.history || [];
    data.history.push({
      action: 'created',
      toStatus: data.status,
      toPlanId: data.planId,
      toQuantity: data.quantity,
      performedAt: new Date().toISOString()
    });

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find subscription by subscriptionId
   * @param {string} subscriptionId - Subscription ID
   * @returns {Object|null} Subscription or null
   */
  async findBySubscriptionId(subscriptionId) {
    return baseModel.findOne.call(baseModel, { subscriptionId });
  },

  /**
   * Find subscriptions by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Subscriptions for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find subscriptions by plan
   * @param {string} planId - Plan ID
   * @returns {Array} Subscriptions for plan
   */
  async findByPlan(planId) {
    return baseModel.find.call(baseModel, { planId });
  },

  /**
   * Check if subscription is in trial
   * @param {Object} subscription - Subscription object
   * @returns {boolean} True if in trial
   */
  isTrialing(subscription) {
    return subscription.status === 'trialing' &&
           subscription.trialEnd &&
           new Date() < new Date(subscription.trialEnd);
  },

  /**
   * Check if subscription is active (including trial)
   * @param {Object} subscription - Subscription object
   * @returns {boolean} True if active
   */
  isActive(subscription) {
    return subscription.status === 'active' || subscription.status === 'trialing';
  },

  /**
   * Get days remaining in current period
   * @param {Object} subscription - Subscription object
   * @returns {number|null} Days remaining
   */
  getDaysRemaining(subscription) {
    if (!subscription.currentPeriodEnd) return null;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  /**
   * Get trial days remaining
   * @param {Object} subscription - Subscription object
   * @returns {number|null} Trial days remaining
   */
  getTrialDaysRemaining(subscription) {
    if (!subscription.trialEnd || subscription.status !== 'trialing') return null;
    const now = new Date();
    const end = new Date(subscription.trialEnd);
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  /**
   * Add history entry
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} entry - History entry
   * @returns {Object} Update result
   */
  async addHistoryEntry(subscriptionId, entry) {
    const subscription = await this.findBySubscriptionId(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const history = subscription.history || [];
    history.push({
      ...entry,
      performedAt: new Date().toISOString()
    });

    return baseModel.updateOne.call(baseModel,
      { subscriptionId },
      { $set: { history } }
    );
  },

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {string} reason - Cancellation reason
   * @param {boolean} atPeriodEnd - Cancel at period end
   * @returns {Object} Update result
   */
  async cancel(subscriptionId, reason, atPeriodEnd = false) {
    const subscription = await this.findBySubscriptionId(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updateData = {
      canceledAt: new Date().toISOString(),
      cancellationReason: reason,
      cancelAtPeriodEnd: atPeriodEnd
    };

    if (!atPeriodEnd) {
      updateData.status = 'canceled';
    }

    // Add history entry
    const history = subscription.history || [];
    history.push({
      action: 'canceled',
      fromStatus: subscription.status,
      toStatus: atPeriodEnd ? subscription.status : 'canceled',
      reason,
      performedAt: new Date().toISOString()
    });
    updateData.history = history;

    return baseModel.updateOne.call(baseModel,
      { subscriptionId },
      { $set: updateData }
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

module.exports = Subscription;
