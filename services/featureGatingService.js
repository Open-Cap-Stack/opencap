/**
 * Feature Gating Service
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Handles subscription tier-based feature access and limit checking
 */

const zerodbService = require('./zerodbService');

const TABLE_NAME = 'subscription_tiers';
const COMPANIES_TABLE = 'companies';

class FeatureGatingService {
  /**
   * Get all features for a specific tier
   * @param {string} tierName - Name of the subscription tier
   * @returns {Object|null} Features object or null if tier not found
   */
  async getTierFeatures(tierName) {
    try {
      const tiers = await zerodbService.queryTable(TABLE_NAME, {
        filter: { name: tierName }
      });

      if (!tiers || tiers.length === 0) {
        return null;
      }

      return tiers[0].features;
    } catch (error) {
      console.error('Error getting tier features:', error);
      throw new Error('Failed to get tier features');
    }
  }

  /**
   * Check if a company has access to a specific feature
   * @param {string} companyId - Company ID
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean} Whether the company has access to the feature
   */
  async hasFeature(companyId, featureName) {
    try {
      const company = await this._getCompany(companyId);
      if (!company) {
        return false;
      }

      const tierName = company.subscriptionTier || 'free';
      const tier = await this.getTierByName(tierName);

      if (!tier || !tier.features) {
        return false;
      }

      return tier.features[featureName] === true;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Get usage limits for a company's subscription tier
   * @param {string} companyId - Company ID
   * @returns {Object|null} Limits object or null if not found
   */
  async getUsageLimits(companyId) {
    try {
      const company = await this._getCompany(companyId);
      if (!company) {
        return null;
      }

      const tierName = company.subscriptionTier || 'free';
      const tier = await this.getTierByName(tierName);

      if (!tier) {
        return null;
      }

      return tier.limits;
    } catch (error) {
      console.error('Error getting usage limits:', error);
      throw new Error('Failed to get usage limits');
    }
  }

  /**
   * Check if a company is within a specific usage limit
   * @param {string} companyId - Company ID
   * @param {string} limitName - Name of the limit to check
   * @param {number} currentUsage - Current usage count
   * @returns {Object} Result with allowed status and details
   */
  async checkLimit(companyId, limitName, currentUsage) {
    try {
      const company = await this._getCompany(companyId);
      if (!company) {
        return {
          allowed: false,
          error: 'Company not found',
          currentUsage,
          limit: 0,
          remaining: 0
        };
      }

      const tierName = company.subscriptionTier || 'free';
      const tier = await this.getTierByName(tierName);

      if (!tier || !tier.limits) {
        return {
          allowed: false,
          error: 'Tier not found',
          currentUsage,
          limit: 0,
          remaining: 0
        };
      }

      const limit = tier.limits[limitName];

      if (limit === undefined) {
        return {
          allowed: false,
          error: 'Invalid limit name',
          currentUsage,
          limit: 0,
          remaining: 0
        };
      }

      // -1 indicates unlimited
      if (limit === -1) {
        return {
          allowed: true,
          unlimited: true,
          currentUsage,
          limit: -1,
          remaining: Infinity
        };
      }

      const allowed = currentUsage <= limit;
      const remaining = Math.max(0, limit - currentUsage);

      return {
        allowed,
        currentUsage,
        limit,
        remaining,
        tierName
      };
    } catch (error) {
      console.error('Error checking limit:', error);
      return {
        allowed: false,
        error: 'Failed to check limit',
        currentUsage,
        limit: 0,
        remaining: 0
      };
    }
  }

  /**
   * Get available upgrade options for a company
   * @param {string} companyId - Company ID
   * @returns {Array} Array of available upgrade tiers
   */
  async getUpgradeOptions(companyId) {
    try {
      const company = await this._getCompany(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const currentTierName = company.subscriptionTier || 'free';
      const allTiers = await this.getAllTiers();

      // Find the current tier's sort order
      const currentTier = allTiers.find(t => t.name === currentTierName);
      const currentSortOrder = currentTier ? currentTier.sortOrder : 0;

      // Filter to tiers with higher sort order (upgrades)
      const upgrades = allTiers
        .filter(t => t.isPublic && t.sortOrder > currentSortOrder)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return upgrades;
    } catch (error) {
      console.error('Error getting upgrade options:', error);
      throw error;
    }
  }

  /**
   * Compare features and limits between two tiers
   * @param {string} tier1Name - First tier name
   * @param {string} tier2Name - Second tier name
   * @returns {Object} Comparison result
   */
  async compareTiers(tier1Name, tier2Name) {
    try {
      const [tier1, tier2] = await Promise.all([
        this.getTierByName(tier1Name),
        this.getTierByName(tier2Name)
      ]);

      if (!tier1) {
        throw new Error(`Tier '${tier1Name}' not found`);
      }
      if (!tier2) {
        throw new Error(`Tier '${tier2Name}' not found`);
      }

      // Calculate feature differences
      const featureDifferences = {};
      const featuresGained = [];
      const featuresLost = [];

      const allFeatures = new Set([
        ...Object.keys(tier1.features || {}),
        ...Object.keys(tier2.features || {})
      ]);

      for (const feature of allFeatures) {
        const val1 = tier1.features?.[feature] || false;
        const val2 = tier2.features?.[feature] || false;

        if (val1 !== val2) {
          featureDifferences[feature] = {
            [tier1Name]: val1,
            [tier2Name]: val2
          };

          if (!val1 && val2) {
            featuresGained.push(feature);
          } else if (val1 && !val2) {
            featuresLost.push(feature);
          }
        }
      }

      // Calculate limit differences
      const limitDifferences = {};
      const limitImprovements = {};

      const allLimits = new Set([
        ...Object.keys(tier1.limits || {}),
        ...Object.keys(tier2.limits || {})
      ]);

      for (const limit of allLimits) {
        const val1 = tier1.limits?.[limit] ?? 0;
        const val2 = tier2.limits?.[limit] ?? 0;

        if (val1 !== val2) {
          limitDifferences[limit] = {
            [tier1Name]: val1,
            [tier2Name]: val2
          };

          // Calculate improvement (higher is better, -1 means unlimited)
          if (val2 === -1 || (val2 > val1 && val1 !== -1)) {
            limitImprovements[limit] = val2 === -1 ? Infinity : val2 - val1;
          }
        }
      }

      // Calculate price difference
      const priceDifference = {
        monthly: (tier2.monthlyPrice || 0) - (tier1.monthlyPrice || 0),
        annual: (tier2.annualPrice || 0) - (tier1.annualPrice || 0)
      };

      return {
        tier1: {
          name: tier1.name,
          displayName: tier1.displayName,
          monthlyPrice: tier1.monthlyPrice,
          annualPrice: tier1.annualPrice
        },
        tier2: {
          name: tier2.name,
          displayName: tier2.displayName,
          monthlyPrice: tier2.monthlyPrice,
          annualPrice: tier2.annualPrice
        },
        featureDifferences,
        featuresGained,
        featuresLost,
        limitDifferences,
        limitImprovements,
        priceDifference
      };
    } catch (error) {
      console.error('Error comparing tiers:', error);
      throw error;
    }
  }

  /**
   * Get all subscription tiers
   * @param {Object} options - Query options
   * @param {boolean} options.includePrivate - Include private tiers
   * @returns {Array} Array of subscription tiers
   */
  async getAllTiers(options = {}) {
    try {
      const { includePrivate = false } = options;

      const tiers = await zerodbService.queryTable(TABLE_NAME, {});

      if (!tiers) {
        return [];
      }

      let filteredTiers = tiers;
      if (!includePrivate) {
        filteredTiers = tiers.filter(t => t.isPublic !== false);
      }

      // Sort by sortOrder
      return filteredTiers.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (error) {
      console.error('Error getting all tiers:', error);
      throw new Error('Failed to get subscription tiers');
    }
  }

  /**
   * Get a tier by its name
   * @param {string} tierName - Name of the tier
   * @returns {Object|null} Tier object or null if not found
   */
  async getTierByName(tierName) {
    try {
      const tiers = await zerodbService.queryTable(TABLE_NAME, {
        filter: { name: tierName }
      });

      if (!tiers || tiers.length === 0) {
        return null;
      }

      return tiers[0];
    } catch (error) {
      console.error('Error getting tier by name:', error);
      throw new Error('Failed to get tier');
    }
  }

  /**
   * Check if a company can access a feature with detailed information
   * @param {string} companyId - Company ID
   * @param {string} featureName - Name of the feature
   * @returns {Object} Access information with upgrade suggestion
   */
  async canAccessFeature(companyId, featureName) {
    try {
      const company = await this._getCompany(companyId);
      if (!company) {
        return {
          hasAccess: false,
          error: 'Company not found',
          featureName
        };
      }

      const currentTierName = company.subscriptionTier || 'free';
      const currentTier = await this.getTierByName(currentTierName);

      if (!currentTier) {
        return {
          hasAccess: false,
          error: 'Tier not found',
          currentTier: currentTierName,
          featureName
        };
      }

      const hasAccess = currentTier.features?.[featureName] === true;

      const result = {
        hasAccess,
        currentTier: currentTierName,
        featureName
      };

      // If no access, suggest the lowest tier that has this feature
      if (!hasAccess) {
        const allTiers = await this.getAllTiers();
        const currentSortOrder = currentTier.sortOrder || 0;

        const suggestedTier = allTiers
          .filter(t => t.isPublic && t.sortOrder > currentSortOrder)
          .find(t => t.features?.[featureName] === true);

        if (suggestedTier) {
          result.suggestedUpgrade = suggestedTier.name;
          result.suggestedUpgradePrice = suggestedTier.monthlyPrice;
        }
      }

      return result;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return {
        hasAccess: false,
        error: 'Failed to check feature access',
        featureName
      };
    }
  }

  /**
   * Get company by ID (private helper)
   * @private
   */
  async _getCompany(companyId) {
    try {
      const companies = await zerodbService.queryTable(COMPANIES_TABLE, {
        filter: { companyId }
      });

      if (!companies || companies.length === 0) {
        return null;
      }

      return companies[0];
    } catch (error) {
      console.error('Error getting company:', error);
      return null;
    }
  }

  /**
   * Seed default subscription tiers
   * @returns {Object} Result of seeding operation
   */
  async seedDefaultTiers() {
    const SubscriptionTier = require('../models/SubscriptionTier');
    const defaultTiers = SubscriptionTier.schema.statics.getDefaultTiers();

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (const tierData of defaultTiers) {
      try {
        // Check if tier already exists
        const existing = await this.getTierByName(tierData.name);
        if (existing) {
          results.skipped.push(tierData.name);
          continue;
        }

        // Create the tier
        await zerodbService.insertRow(TABLE_NAME, tierData);
        results.created.push(tierData.name);
      } catch (error) {
        console.error(`Error seeding tier ${tierData.name}:`, error);
        results.errors.push({ tier: tierData.name, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new FeatureGatingService();
