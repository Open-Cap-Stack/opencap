/**
 * Subscription Tier Controller
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Handles HTTP requests for subscription tier management
 */

const zerodbService = require('../services/zerodbService');
const featureGatingService = require('../services/featureGatingService');

const TABLE_NAME = 'subscription_tiers';
const DEFAULT_TIER_NAMES = ['free', 'starter', 'professional', 'enterprise'];

/**
 * Get all subscription tiers
 * GET /api/v1/subscription-tiers
 */
exports.getAllTiers = async (req, res) => {
  try {
    const includePrivate = req.query.includePrivate === 'true' &&
                          req.user && req.user.role === 'admin';

    const tiers = await featureGatingService.getAllTiers({ includePrivate });

    res.status(200).json({
      success: true,
      data: tiers
    });
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription tiers'
    });
  }
};

/**
 * Get a tier by name
 * GET /api/v1/subscription-tiers/:name
 */
exports.getTierByName = async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tier name is required'
      });
    }

    const tier = await featureGatingService.getTierByName(name);

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Subscription tier not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tier
    });
  } catch (error) {
    console.error('Error fetching tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription tier'
    });
  }
};

/**
 * Get features for a tier
 * GET /api/v1/subscription-tiers/:name/features
 */
exports.getTierFeatures = async (req, res) => {
  try {
    const { name } = req.params;

    const features = await featureGatingService.getTierFeatures(name);

    if (!features) {
      return res.status(404).json({
        success: false,
        error: 'Subscription tier not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tierName: name,
        features
      }
    });
  } catch (error) {
    console.error('Error fetching tier features:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tier features'
    });
  }
};

/**
 * Compare two tiers
 * GET /api/v1/subscription-tiers/compare/:tier1/:tier2
 */
exports.compareTiers = async (req, res) => {
  try {
    const { tier1, tier2 } = req.params;

    if (!tier1 || !tier2) {
      return res.status(400).json({
        success: false,
        error: 'Both tier names are required for comparison'
      });
    }

    const comparison = await featureGatingService.compareTiers(tier1, tier2);

    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing tiers:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to compare tiers'
    });
  }
};

/**
 * Check feature access for a company
 * GET /api/v1/subscription-tiers/company/:companyId/feature/:featureName
 */
exports.checkFeatureAccess = async (req, res) => {
  try {
    const { companyId, featureName } = req.params;

    if (!companyId || !featureName) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and feature name are required'
      });
    }

    const access = await featureGatingService.canAccessFeature(companyId, featureName);

    res.status(200).json({
      success: true,
      data: access
    });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check feature access'
    });
  }
};

/**
 * Check usage limit for a company
 * GET /api/v1/subscription-tiers/company/:companyId/limit/:limitName
 */
exports.checkUsageLimit = async (req, res) => {
  try {
    const { companyId, limitName } = req.params;
    const currentUsage = parseInt(req.query.currentUsage, 10) || 0;

    if (!companyId || !limitName) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and limit name are required'
      });
    }

    const result = await featureGatingService.checkLimit(companyId, limitName, currentUsage);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking usage limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check usage limit'
    });
  }
};

/**
 * Get upgrade options for a company
 * GET /api/v1/subscription-tiers/company/:companyId/upgrades
 */
exports.getUpgradeOptions = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const upgrades = await featureGatingService.getUpgradeOptions(companyId);

    // Get current tier info
    let currentTier = 'free';
    try {
      const limits = await featureGatingService.getUsageLimits(companyId);
      if (limits) {
        // Company exists, get their current tier from the response context
        currentTier = 'known';
      }
    } catch {
      // Ignore errors getting current tier
    }

    res.status(200).json({
      success: true,
      data: {
        currentTier,
        upgradeOptions: upgrades
      }
    });
  } catch (error) {
    console.error('Error getting upgrade options:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to get upgrade options'
    });
  }
};

/**
 * Get all limits for a company
 * GET /api/v1/subscription-tiers/company/:companyId/limits
 */
exports.getCompanyLimits = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const limits = await featureGatingService.getUsageLimits(companyId);

    if (!limits) {
      return res.status(404).json({
        success: false,
        error: 'Company not found or no subscription tier assigned'
      });
    }

    res.status(200).json({
      success: true,
      data: limits
    });
  } catch (error) {
    console.error('Error getting company limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get company limits'
    });
  }
};

/**
 * Create a new subscription tier (Admin only)
 * POST /api/v1/subscription-tiers
 */
exports.createTier = async (req, res) => {
  try {
    const { tierId, name, displayName } = req.body;

    // Validate required fields
    if (!tierId || !name || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'tierId, name, and displayName are required'
      });
    }

    // Check for duplicate
    const existing = await zerodbService.queryTable(TABLE_NAME, {
      filter: { name }
    });

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A tier with this name already exists'
      });
    }

    // Set defaults
    const tierData = {
      ...req.body,
      currency: req.body.currency || 'USD',
      isPublic: req.body.isPublic !== false,
      sortOrder: req.body.sortOrder || 99,
      features: req.body.features || {},
      limits: req.body.limits || {}
    };

    const result = await zerodbService.insertRow(TABLE_NAME, tierData);
    const createdTier = result.rows && result.rows[0] ? result.rows[0] : tierData;

    res.status(201).json({
      success: true,
      data: createdTier
    });
  } catch (error) {
    console.error('Error creating subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription tier'
    });
  }
};

/**
 * Update a subscription tier (Admin only)
 * PUT /api/v1/subscription-tiers/:tierId
 */
exports.updateTier = async (req, res) => {
  try {
    const { tierId } = req.params;
    const updates = req.body;

    // Prevent updating protected fields
    const protectedFields = ['name', 'tierId'];
    const attemptedProtectedUpdates = protectedFields.filter(f => updates[f] !== undefined);

    if (attemptedProtectedUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot modify protected fields: ${protectedFields.join(', ')}`
      });
    }

    const result = await zerodbService.updateRows(
      TABLE_NAME,
      { tierId },
      { $set: updates }
    );

    if (!result || result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription tier not found'
      });
    }

    const updatedTier = result.rows && result.rows[0] ? result.rows[0] : null;

    res.status(200).json({
      success: true,
      data: updatedTier
    });
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription tier'
    });
  }
};

/**
 * Delete a subscription tier (Admin only)
 * DELETE /api/v1/subscription-tiers/:tierId
 */
exports.deleteTier = async (req, res) => {
  try {
    const { tierId } = req.params;

    // Prevent deletion of default tiers
    const defaultTierIds = DEFAULT_TIER_NAMES.map(name => `tier-${name}`);
    if (defaultTierIds.includes(tierId)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete default subscription tiers'
      });
    }

    const result = await zerodbService.deleteRows(TABLE_NAME, { tierId });

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription tier not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription tier deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscription tier'
    });
  }
};

/**
 * Seed default subscription tiers (Admin only)
 * POST /api/v1/subscription-tiers/seed
 */
exports.seedTiers = async (req, res) => {
  try {
    const result = await featureGatingService.seedDefaultTiers();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error seeding subscription tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed subscription tiers'
    });
  }
};
