/**
 * SubscriptionTier Model
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Defines subscription tier schema including pricing, features, and limits
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid tier names
const TIER_NAMES = ['free', 'starter', 'professional', 'enterprise', 'custom'];

// Valid currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

// Schema definition for documentation and validation
const subscriptionTierSchema = {
  tierId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true, enum: TIER_NAMES },
  displayName: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  monthlyPrice: { type: 'number', default: 0 },
  annualPrice: { type: 'number', default: 0 },
  currency: { type: 'string', enum: CURRENCIES, default: 'USD' },
  features: {
    type: 'object',
    default: {
      basicCapTable: true,
      documentStorage: true,
      stakeholderManagement: true,
      advancedReporting: false,
      apiAccess: false,
      ssoIntegration: false,
      customBranding: false,
      prioritySupport: false,
      dedicatedAccountManager: false,
      auditLogs: false,
      vestingSchedules: false,
      equityPlans: false,
      taxCalculations: false,
      valuations409A: false,
      safeConversions: false,
      waterfallAnalysis: false,
      investorCommunications: false,
      bulkMessaging: false,
      webhookIntegrations: false,
      multiCompanySupport: false
    }
  },
  limits: {
    type: 'object',
    default: {
      maxStakeholders: 10,
      maxDocuments: 50,
      storageGB: 1,
      apiCallsPerMonth: 0,
      maxUsers: 2,
      maxCompanies: 1,
      maxShareClasses: 5,
      maxEquityPlans: 1,
      maxVestingSchedules: 10,
      maxInvestors: 10,
      maxTransactionsPerMonth: 50
    }
  },
  isPublic: { type: 'boolean', default: true },
  sortOrder: { type: 'number', default: 0 },
  isDefault: { type: 'boolean', default: false },
  trialDays: { type: 'number', default: 0 },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('subscription_tiers', subscriptionTierSchema);

// Extended SubscriptionTier model with business logic
const SubscriptionTier = {
  ...baseModel,
  tableName: 'subscription_tiers',
  schema: subscriptionTierSchema,

  // Export constants
  TIER_NAMES,
  CURRENCIES,

  /**
   * Create a new subscription tier with defaults
   * @param {Object} data - Tier data
   * @returns {Object} Created tier
   */
  async create(data) {
    if (!data.tierId) {
      data.tierId = `tier_${uuidv4()}`;
    }

    // Validate tier name
    if (!TIER_NAMES.includes(data.name)) {
      throw new Error(`name must be one of: ${TIER_NAMES.join(', ')}`);
    }

    // Ensure annual price is not more than monthly * 12
    if (data.annualPrice > data.monthlyPrice * 12) {
      data.annualPrice = data.monthlyPrice * 12;
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find tier by tierId
   * @param {string} tierId - Tier ID
   * @returns {Object|null} Tier or null
   */
  async findByTierId(tierId) {
    return baseModel.findOne.call(baseModel, { tierId });
  },

  /**
   * Find tier by name
   * @param {string} name - Tier name
   * @returns {Object|null} Tier or null
   */
  async findByName(name) {
    return baseModel.findOne.call(baseModel, { name });
  },

  /**
   * Find public tiers
   * @returns {Array} Public tiers sorted by sortOrder
   */
  async findPublic() {
    const tiers = await baseModel.find.call(baseModel, { isPublic: true });
    return tiers.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  /**
   * Get annual savings percentage
   * @param {Object} tier - Tier object
   * @returns {number} Annual savings percentage
   */
  getAnnualSavingsPercentage(tier) {
    if (tier.monthlyPrice === 0) return 0;
    const annualFromMonthly = tier.monthlyPrice * 12;
    const savings = annualFromMonthly - tier.annualPrice;
    return Math.round((savings / annualFromMonthly) * 100);
  },

  /**
   * Get monthly equivalent of annual price
   * @param {Object} tier - Tier object
   * @returns {number} Monthly equivalent
   */
  getMonthlyEquivalent(tier) {
    if (tier.annualPrice === 0) return 0;
    return Math.round((tier.annualPrice / 12) * 100) / 100;
  },

  /**
   * Check if a feature is enabled
   * @param {Object} tier - Tier object
   * @param {string} featureName - Feature name
   * @returns {boolean} True if feature is enabled
   */
  hasFeature(tier, featureName) {
    return tier.features && tier.features[featureName] === true;
  },

  /**
   * Check if usage is within limit
   * @param {Object} tier - Tier object
   * @param {string} limitName - Limit name
   * @param {number} currentUsage - Current usage
   * @returns {boolean} True if within limit
   */
  isWithinLimit(tier, limitName, currentUsage) {
    const limit = tier.limits && tier.limits[limitName];
    if (limit === undefined) return false;
    if (limit === -1) return true; // Unlimited
    return currentUsage <= limit;
  },

  /**
   * Get default tiers configuration
   * @returns {Array} Default tiers
   */
  getDefaultTiers() {
    return [
      {
        tierId: 'tier-free',
        name: 'free',
        displayName: 'Free',
        description: 'Get started with basic cap table management',
        monthlyPrice: 0,
        annualPrice: 0,
        currency: 'USD',
        features: {
          basicCapTable: true,
          documentStorage: true,
          stakeholderManagement: true,
          advancedReporting: false,
          apiAccess: false,
          ssoIntegration: false,
          customBranding: false,
          prioritySupport: false,
          dedicatedAccountManager: false,
          auditLogs: false,
          vestingSchedules: false,
          equityPlans: false,
          taxCalculations: false,
          valuations409A: false,
          safeConversions: false,
          waterfallAnalysis: false,
          investorCommunications: false,
          bulkMessaging: false,
          webhookIntegrations: false,
          multiCompanySupport: false
        },
        limits: {
          maxStakeholders: 10,
          maxDocuments: 50,
          storageGB: 1,
          apiCallsPerMonth: 0,
          maxUsers: 2,
          maxCompanies: 1,
          maxShareClasses: 3,
          maxEquityPlans: 0,
          maxVestingSchedules: 0,
          maxInvestors: 5,
          maxTransactionsPerMonth: 20
        },
        isPublic: true,
        sortOrder: 1,
        isDefault: true,
        trialDays: 0
      },
      {
        tierId: 'tier-starter',
        name: 'starter',
        displayName: 'Starter',
        description: 'For growing startups managing their equity',
        monthlyPrice: 49,
        annualPrice: 470,
        currency: 'USD',
        features: {
          basicCapTable: true,
          documentStorage: true,
          stakeholderManagement: true,
          advancedReporting: true,
          apiAccess: false,
          ssoIntegration: false,
          customBranding: false,
          prioritySupport: false,
          dedicatedAccountManager: false,
          auditLogs: true,
          vestingSchedules: true,
          equityPlans: true,
          taxCalculations: false,
          valuations409A: false,
          safeConversions: true,
          waterfallAnalysis: false,
          investorCommunications: true,
          bulkMessaging: false,
          webhookIntegrations: false,
          multiCompanySupport: false
        },
        limits: {
          maxStakeholders: 50,
          maxDocuments: 500,
          storageGB: 10,
          apiCallsPerMonth: 1000,
          maxUsers: 5,
          maxCompanies: 1,
          maxShareClasses: 10,
          maxEquityPlans: 2,
          maxVestingSchedules: 50,
          maxInvestors: 25,
          maxTransactionsPerMonth: 100
        },
        isPublic: true,
        sortOrder: 2,
        isDefault: true,
        trialDays: 14
      },
      {
        tierId: 'tier-professional',
        name: 'professional',
        displayName: 'Professional',
        description: 'Advanced features for scaling companies',
        monthlyPrice: 149,
        annualPrice: 1430,
        currency: 'USD',
        features: {
          basicCapTable: true,
          documentStorage: true,
          stakeholderManagement: true,
          advancedReporting: true,
          apiAccess: true,
          ssoIntegration: true,
          customBranding: false,
          prioritySupport: true,
          dedicatedAccountManager: false,
          auditLogs: true,
          vestingSchedules: true,
          equityPlans: true,
          taxCalculations: true,
          valuations409A: true,
          safeConversions: true,
          waterfallAnalysis: true,
          investorCommunications: true,
          bulkMessaging: true,
          webhookIntegrations: true,
          multiCompanySupport: true
        },
        limits: {
          maxStakeholders: 200,
          maxDocuments: 2000,
          storageGB: 50,
          apiCallsPerMonth: 10000,
          maxUsers: 20,
          maxCompanies: 3,
          maxShareClasses: 25,
          maxEquityPlans: 10,
          maxVestingSchedules: 200,
          maxInvestors: 100,
          maxTransactionsPerMonth: 500
        },
        isPublic: true,
        sortOrder: 3,
        isDefault: true,
        trialDays: 14
      },
      {
        tierId: 'tier-enterprise',
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'Custom solutions for large organizations',
        monthlyPrice: 499,
        annualPrice: 4790,
        currency: 'USD',
        features: {
          basicCapTable: true,
          documentStorage: true,
          stakeholderManagement: true,
          advancedReporting: true,
          apiAccess: true,
          ssoIntegration: true,
          customBranding: true,
          prioritySupport: true,
          dedicatedAccountManager: true,
          auditLogs: true,
          vestingSchedules: true,
          equityPlans: true,
          taxCalculations: true,
          valuations409A: true,
          safeConversions: true,
          waterfallAnalysis: true,
          investorCommunications: true,
          bulkMessaging: true,
          webhookIntegrations: true,
          multiCompanySupport: true
        },
        limits: {
          maxStakeholders: -1,
          maxDocuments: -1,
          storageGB: -1,
          apiCallsPerMonth: -1,
          maxUsers: -1,
          maxCompanies: -1,
          maxShareClasses: -1,
          maxEquityPlans: -1,
          maxVestingSchedules: -1,
          maxInvestors: -1,
          maxTransactionsPerMonth: -1
        },
        isPublic: true,
        sortOrder: 4,
        isDefault: true,
        trialDays: 30
      }
    ];
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

module.exports = SubscriptionTier;
