/**
 * Subscription Service
 * Issue #115: Implement Subscription System
 *
 * Business logic for subscription management including:
 * - Subscription lifecycle management
 * - Plan management
 * - Feature and usage limit checking
 * - Renewal processing
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

class SubscriptionService {
  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription data
   * @returns {Object} Created subscription
   */
  static async createSubscription(subscriptionData) {
    const { companyId, planId, quantity = 1, skipTrial = false, metadata } = subscriptionData;

    // Validate plan exists and is active
    const plan = await databaseAdapter.findOne('SubscriptionPlan', { planId });
    if (!plan) {
      throw new Error('Plan not found');
    }
    if (!plan.isActive) {
      throw new Error('Plan is not active');
    }

    const now = new Date();
    const subscriptionId = `SUB-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Calculate trial and billing period dates
    let trialStart = null;
    let trialEnd = null;
    let currentPeriodStart = now;
    let currentPeriodEnd;
    let status = 'active';

    if (!skipTrial && plan.trialPeriodDays > 0) {
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trialPeriodDays);
      currentPeriodEnd = trialEnd;
      status = 'trialing';
    } else {
      currentPeriodEnd = this._calculatePeriodEnd(now, plan.interval);
    }

    const subscription = await databaseAdapter.create('Subscription', {
      subscriptionId,
      companyId,
      planId,
      status,
      quantity,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      metadata
    });

    return subscription;
  }

  /**
   * Update an existing subscription
   * @param {string} id - Subscription ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated subscription
   */
  static async updateSubscription(id, updateData) {
    const subscription = await databaseAdapter.findById('Subscription', id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.status === 'canceled') {
      throw new Error('Cannot update canceled subscription');
    }

    const updates = {};
    const historyEntry = {
      action: 'quantity_changed',
      fromStatus: subscription.status,
      toStatus: subscription.status
    };

    // Handle plan change
    if (updateData.planId && updateData.planId !== subscription.planId) {
      const newPlan = await databaseAdapter.findOne('SubscriptionPlan', { planId: updateData.planId });
      if (!newPlan) {
        throw new Error('New plan not found');
      }
      if (!newPlan.isActive) {
        throw new Error('New plan is not active');
      }
      updates.planId = updateData.planId;
      historyEntry.action = 'plan_changed';
      historyEntry.fromPlanId = subscription.planId;
      historyEntry.toPlanId = updateData.planId;
    }

    // Handle quantity change
    if (updateData.quantity !== undefined) {
      if (updateData.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }
      historyEntry.fromQuantity = subscription.quantity;
      historyEntry.toQuantity = updateData.quantity;
      updates.quantity = updateData.quantity;
    }

    // Handle metadata update
    if (updateData.metadata !== undefined) {
      updates.metadata = { ...(subscription.metadata || {}), ...updateData.metadata };
    }

    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      id,
      {
        ...updates,
        $push: { history: historyEntry }
      },
      { new: true }
    );

    return updatedSubscription;
  }

  /**
   * Cancel a subscription
   * @param {string} id - Subscription ID
   * @param {Object} options - Cancellation options
   * @returns {Object} Canceled subscription
   */
  static async cancelSubscription(id, options = {}) {
    const { immediate = false, reason } = options;

    const subscription = await databaseAdapter.findById('Subscription', id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.status === 'canceled') {
      throw new Error('Subscription is already canceled');
    }

    const updates = {
      cancellationReason: reason
    };

    const historyEntry = {
      action: 'canceled',
      fromStatus: subscription.status,
      reason
    };

    if (immediate) {
      updates.status = 'canceled';
      updates.canceledAt = new Date();
      historyEntry.toStatus = 'canceled';
    } else {
      updates.cancelAtPeriodEnd = true;
      historyEntry.toStatus = subscription.status;
    }

    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      id,
      {
        ...updates,
        $push: { history: historyEntry }
      },
      { new: true }
    );

    return updatedSubscription;
  }

  /**
   * Pause a subscription
   * @param {string} id - Subscription ID
   * @param {Object} options - Pause options
   * @returns {Object} Paused subscription
   */
  static async pauseSubscription(id, options = {}) {
    const { resumeDate } = options;

    const subscription = await databaseAdapter.findById('Subscription', id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.status !== 'active') {
      throw new Error('Only active subscriptions can be paused');
    }

    const updates = {
      status: 'paused',
      pausedAt: new Date(),
      resumesAt: resumeDate || null
    };

    const historyEntry = {
      action: 'paused',
      fromStatus: subscription.status,
      toStatus: 'paused'
    };

    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      id,
      {
        ...updates,
        $push: { history: historyEntry }
      },
      { new: true }
    );

    return updatedSubscription;
  }

  /**
   * Resume a paused subscription
   * @param {string} id - Subscription ID
   * @returns {Object} Resumed subscription
   */
  static async resumeSubscription(id) {
    const subscription = await databaseAdapter.findById('Subscription', id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.status !== 'paused') {
      throw new Error('Only paused subscriptions can be resumed');
    }

    const updates = {
      status: 'active',
      pausedAt: null,
      resumesAt: null
    };

    const historyEntry = {
      action: 'resumed',
      fromStatus: 'paused',
      toStatus: 'active'
    };

    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      id,
      {
        ...updates,
        $push: { history: historyEntry }
      },
      { new: true }
    );

    return updatedSubscription;
  }

  /**
   * Reactivate a canceled subscription
   * @param {string} id - Subscription ID
   * @returns {Object} Reactivated subscription
   */
  static async reactivateSubscription(id) {
    const subscription = await databaseAdapter.findById('Subscription', id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.status !== 'canceled') {
      throw new Error('Only canceled subscriptions can be reactivated');
    }

    // Verify plan is still active
    const plan = await databaseAdapter.findOne('SubscriptionPlan', { planId: subscription.planId });
    if (!plan || !plan.isActive) {
      throw new Error('Plan is no longer active');
    }

    const now = new Date();
    const updates = {
      status: 'active',
      canceledAt: null,
      cancelAtPeriodEnd: false,
      cancellationReason: null,
      currentPeriodStart: now,
      currentPeriodEnd: this._calculatePeriodEnd(now, plan.interval)
    };

    const historyEntry = {
      action: 'activated',
      fromStatus: 'canceled',
      toStatus: 'active'
    };

    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      id,
      {
        ...updates,
        $push: { history: historyEntry }
      },
      { new: true }
    );

    return updatedSubscription;
  }

  /**
   * Check if a company has access to a feature
   * @param {string} companyId - Company ID
   * @param {string} featureName - Feature name
   * @returns {boolean} Whether the company has access
   */
  static async checkFeatureAccess(companyId, featureName) {
    // Find active subscription for the company
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return false;
    }

    // Get the plan
    const plan = await databaseAdapter.findOne('SubscriptionPlan', { planId: subscription.planId });
    if (!plan) {
      return false;
    }

    // Check if feature is in plan's features
    return plan.features && plan.features.includes(featureName);
  }

  /**
   * Check usage against limits
   * @param {string} companyId - Company ID
   * @param {string} limitType - Type of limit (stakeholders, documents, etc.)
   * @returns {Object} Usage status
   */
  static async checkUsageLimit(companyId, limitType) {
    // Find active subscription
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return {
        withinLimit: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        error: 'No active subscription'
      };
    }

    // Get the plan
    const plan = await databaseAdapter.findOne('SubscriptionPlan', { planId: subscription.planId });
    if (!plan || !plan.limits) {
      throw new Error('Plan configuration error');
    }

    // Validate limit type
    const validLimitTypes = ['stakeholders', 'documents', 'storageGB', 'users', 'apiCallsPerMonth'];
    if (!validLimitTypes.includes(limitType)) {
      throw new Error('Unknown limit type');
    }

    const planLimit = plan.limits[limitType] || -1;

    // If unlimited (-1), return true
    if (planLimit === -1) {
      return {
        withinLimit: true,
        currentUsage: 0,
        limit: -1,
        remaining: -1,
        unlimited: true
      };
    }

    // Calculate actual limit (multiply by quantity for seat-based limits)
    const actualLimit = planLimit * subscription.quantity;

    // Get current usage
    let currentUsage = 0;
    const modelMap = {
      stakeholders: 'Stakeholder',
      documents: 'Document',
      users: 'User'
    };

    if (modelMap[limitType]) {
      currentUsage = await databaseAdapter.count(modelMap[limitType], { companyId });
    }
    // For storage and API calls, would need different logic (not implemented in this example)

    const remaining = Math.max(0, actualLimit - currentUsage);

    return {
      withinLimit: currentUsage < actualLimit,
      currentUsage,
      limit: actualLimit,
      remaining
    };
  }

  /**
   * Process subscription renewal
   * @param {string} id - Subscription ID
   * @returns {Object} Renewed subscription
   */
  static async processRenewal(id) {
    const subscription = await databaseAdapter.findById('Subscription', id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.status === 'canceled') {
      throw new Error('Cannot renew canceled subscription');
    }

    // If scheduled for cancellation, cancel now
    if (subscription.cancelAtPeriodEnd) {
      const historyEntry = {
        action: 'canceled',
        fromStatus: subscription.status,
        toStatus: 'canceled',
        reason: 'Scheduled cancellation at period end'
      };

      const canceledSubscription = await databaseAdapter.findByIdAndUpdate(
        'Subscription',
        id,
        {
          status: 'canceled',
          canceledAt: new Date(),
          $push: { history: historyEntry }
        },
        { new: true }
      );

      return canceledSubscription;
    }

    // Get the plan for interval
    const plan = await databaseAdapter.findOne('SubscriptionPlan', { planId: subscription.planId });
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate new period dates
    const newPeriodStart = subscription.currentPeriodEnd;
    const newPeriodEnd = this._calculatePeriodEnd(newPeriodStart, plan.interval);

    // Update status from trialing to active if applicable
    const newStatus = subscription.status === 'trialing' ? 'active' : subscription.status;

    const historyEntry = {
      action: 'renewed',
      fromStatus: subscription.status,
      toStatus: newStatus
    };

    const renewedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      id,
      {
        status: newStatus,
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        trialStart: null,
        trialEnd: null,
        $push: { history: historyEntry }
      },
      { new: true }
    );

    return renewedSubscription;
  }

  /**
   * Get subscription status with plan details
   * @param {string} companyId - Company ID
   * @returns {Object} Subscription status
   */
  static async getSubscriptionStatus(companyId) {
    // Find active or trialing subscription
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing', 'past_due', 'paused'] }
    });

    if (!subscription) {
      return null;
    }

    // Get plan details
    const plan = await databaseAdapter.findOne('SubscriptionPlan', { planId: subscription.planId });

    // Calculate days remaining
    let daysRemaining = null;
    if (subscription.currentPeriodEnd) {
      const now = new Date();
      const end = new Date(subscription.currentPeriodEnd);
      daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }

    // Calculate trial days remaining
    let trialDaysRemaining = null;
    let isTrialing = false;
    if (subscription.status === 'trialing' && subscription.trialEnd) {
      const now = new Date();
      const end = new Date(subscription.trialEnd);
      trialDaysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
      isTrialing = true;
    }

    return {
      subscription,
      plan,
      isActive: subscription.status === 'active' || subscription.status === 'trialing',
      isTrialing,
      daysRemaining,
      trialDaysRemaining
    };
  }

  /**
   * Get subscription by ID
   * @param {string} id - Subscription ID
   * @returns {Object} Subscription
   */
  static async getSubscriptionById(id) {
    return await databaseAdapter.findById('Subscription', id);
  }

  /**
   * Get subscriptions by company
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters
   * @returns {Array} Subscriptions
   */
  static async getSubscriptionsByCompany(companyId, filters = {}) {
    const query = { companyId };
    if (filters.status) {
      query.status = filters.status;
    }
    return await databaseAdapter.find('Subscription', query, { sort: { createdAt: -1 } });
  }

  // Plan management methods

  /**
   * Get all plans
   * @param {Object} filters - Optional filters
   * @returns {Array} Plans
   */
  static async getAllPlans(filters = {}) {
    const query = {};
    if (filters.active !== undefined) {
      query.isActive = filters.active;
    }
    return await databaseAdapter.find('SubscriptionPlan', query, { sort: { sortOrder: 1 } });
  }

  /**
   * Get plan by ID
   * @param {string} id - Plan ID
   * @returns {Object} Plan
   */
  static async getPlanById(id) {
    return await databaseAdapter.findById('SubscriptionPlan', id);
  }

  /**
   * Create a new plan
   * @param {Object} planData - Plan data
   * @returns {Object} Created plan
   */
  static async createPlan(planData) {
    const planId = planData.planId || `PLAN-${uuidv4().slice(0, 8).toUpperCase()}`;
    return await databaseAdapter.create('SubscriptionPlan', {
      ...planData,
      planId
    });
  }

  /**
   * Update a plan
   * @param {string} id - Plan ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated plan
   */
  static async updatePlan(id, updateData) {
    const plan = await databaseAdapter.findById('SubscriptionPlan', id);
    if (!plan) {
      throw new Error('Plan not found');
    }
    return await databaseAdapter.findByIdAndUpdate('SubscriptionPlan', id, updateData, { new: true });
  }

  /**
   * Delete a plan
   * @param {string} id - Plan ID
   * @returns {Object} Deleted plan
   */
  static async deletePlan(id) {
    const plan = await databaseAdapter.findById('SubscriptionPlan', id);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Check if any active subscriptions use this plan
    const activeSubscriptions = await databaseAdapter.find('Subscription', {
      planId: plan.planId,
      status: { $in: ['active', 'trialing'] }
    });

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      throw new Error('Cannot delete plan with active subscriptions');
    }

    return await databaseAdapter.findByIdAndDelete('SubscriptionPlan', id);
  }

  // Helper methods

  /**
   * Calculate period end date based on interval
   * @private
   */
  static _calculatePeriodEnd(startDate, interval) {
    const date = new Date(startDate);
    if (interval === 'year') {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  }
}

module.exports = SubscriptionService;
