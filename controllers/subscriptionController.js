/**
 * Subscription Controller
 * Issue #115: Implement Subscription System
 *
 * API controller for subscription management including:
 * - Subscription CRUD operations
 * - Plan management
 * - Feature and usage checking
 */

const SubscriptionService = require('../services/subscriptionService');

/**
 * Create a new subscription
 */
exports.createSubscription = async (req, res) => {
  try {
    const subscription = await SubscriptionService.createSubscription(req.body);
    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get subscription by ID
 */
exports.getSubscription = async (req, res) => {
  try {
    const subscription = await SubscriptionService.getSubscriptionById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get subscriptions with filters
 */
exports.getSubscriptions = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId;
    const { status } = req.query;
    const filters = {};
    if (status) filters.status = status;

    const subscriptions = await SubscriptionService.getSubscriptionsByCompany(companyId, filters);
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update subscription
 */
exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await SubscriptionService.updateSubscription(req.params.id, req.body);
    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Cancel subscription
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { immediate, reason } = req.body;
    const subscription = await SubscriptionService.cancelSubscription(req.params.id, {
      immediate,
      reason
    });
    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Pause subscription
 */
exports.pauseSubscription = async (req, res) => {
  try {
    const { resumeDate } = req.body;
    const subscription = await SubscriptionService.pauseSubscription(req.params.id, {
      resumeDate: resumeDate ? new Date(resumeDate) : undefined
    });
    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Resume subscription
 */
exports.resumeSubscription = async (req, res) => {
  try {
    const subscription = await SubscriptionService.resumeSubscription(req.params.id);
    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Reactivate canceled subscription
 */
exports.reactivateSubscription = async (req, res) => {
  try {
    const subscription = await SubscriptionService.reactivateSubscription(req.params.id);
    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Check feature access
 */
exports.checkFeatureAccess = async (req, res) => {
  try {
    const { companyId, feature } = req.query;
    const hasAccess = await SubscriptionService.checkFeatureAccess(companyId, feature);
    res.status(200).json({ hasAccess, feature });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Check usage limit
 */
exports.checkUsageLimit = async (req, res) => {
  try {
    const { companyId, limitType } = req.query;
    const usageStatus = await SubscriptionService.checkUsageLimit(companyId, limitType);
    res.status(200).json(usageStatus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get subscription status
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const { companyId } = req.query;
    const status = await SubscriptionService.getSubscriptionStatus(companyId);
    if (!status) {
      return res.status(404).json({ message: 'No subscription found' });
    }
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process subscription renewal
 */
exports.processRenewal = async (req, res) => {
  try {
    const subscription = await SubscriptionService.processRenewal(req.params.id);
    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Plan management endpoints

/**
 * Get all plans
 */
exports.getPlans = async (req, res) => {
  try {
    const { active } = req.query;
    const filters = {};
    if (active !== undefined) {
      filters.active = active === 'true';
    }
    const plans = await SubscriptionService.getAllPlans(filters);
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get plan by ID
 */
exports.getPlan = async (req, res) => {
  try {
    const plan = await SubscriptionService.getPlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new plan
 */
exports.createPlan = async (req, res) => {
  try {
    const plan = await SubscriptionService.createPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update a plan
 */
exports.updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionService.updatePlan(req.params.id, req.body);
    res.status(200).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete a plan
 */
exports.deletePlan = async (req, res) => {
  try {
    await SubscriptionService.deletePlan(req.params.id);
    res.status(200).json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
