/**
 * IntegrationMarketplaceItem Model
 * Issue #202: Build Integration Marketplace Backend
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid categories
const CATEGORIES = ['payments', 'accounting', 'communication', 'crm', 'hr', 'legal', 'analytics', 'storage', 'productivity', 'security', 'other'];

// Valid statuses
const VALID_STATUSES = ['active', 'inactive', 'deprecated', 'beta'];

// Valid config field types
const CONFIG_FIELD_TYPES = ['string', 'number', 'boolean', 'select', 'password', 'url', 'email'];

// Valid pricing types
const PRICING_TYPES = ['free', 'freemium', 'paid', 'enterprise'];

// Valid billing cycles
const BILLING_CYCLES = ['monthly', 'yearly', 'one-time'];

// Schema definition for documentation and validation
const integrationMarketplaceItemSchema = {
  integrationId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'string', required: true },
  shortDescription: { type: 'string', default: '' },
  category: { type: 'string', required: true, enum: CATEGORIES },
  provider: { type: 'string', required: true },
  icon: { type: 'string', default: null },
  logo: { type: 'string', default: null },
  version: { type: 'string', default: '1.0.0' },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  configurationSchema: { type: 'object', default: {} },
  features: { type: 'array', default: [] },
  documentation: { type: 'string', default: null },
  supportUrl: { type: 'string', default: null },
  privacyPolicyUrl: { type: 'string', default: null },
  termsOfServiceUrl: { type: 'string', default: null },
  pricing: {
    type: 'object',
    default: {
      type: 'free',
      startingPrice: null,
      currency: 'USD',
      billingCycle: null
    }
  },
  permissions: { type: 'array', default: [] },
  webhookEvents: { type: 'array', default: [] },
  testEndpoint: { type: 'string', default: null },
  healthCheckEndpoint: { type: 'string', default: null },
  rating: {
    type: 'object',
    default: {
      average: 0,
      count: 0
    }
  },
  installCount: { type: 'number', default: 0 },
  tags: { type: 'array', default: [] },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  publishedAt: { type: 'date', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('integration_marketplace_items', integrationMarketplaceItemSchema);

// Extended IntegrationMarketplaceItem model with business logic
const IntegrationMarketplaceItem = {
  ...baseModel,
  tableName: 'integration_marketplace_items',
  schema: integrationMarketplaceItemSchema,

  // Export constants
  CATEGORIES,
  VALID_STATUSES,
  CONFIG_FIELD_TYPES,
  PRICING_TYPES,
  BILLING_CYCLES,

  /**
   * Create a new integration with defaults
   * @param {Object} data - Integration data
   * @returns {Object} Created integration
   */
  async create(data) {
    if (!data.integrationId) {
      data.integrationId = 'INT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Validate category
    if (!CATEGORIES.includes(data.category)) {
      throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
    }

    if (!data.version) {
      data.version = '1.0.0';
    }

    if (!data.status) {
      data.status = 'active';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find integration by integrationId
   * @param {string} integrationId - Integration ID
   * @returns {Object|null} Integration or null
   */
  async findByIntegrationId(integrationId) {
    return baseModel.findOne.call(baseModel, { integrationId });
  },

  /**
   * Find integrations by category
   * @param {string} category - Category
   * @param {Object} options - Query options
   * @returns {Array} Integrations for category
   */
  async findByCategory(category, options = {}) {
    const query = { category };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find active integrations
   * @returns {Array} Active integrations
   */
  async findActive() {
    const all = await baseModel.find.call(baseModel, {});
    return all.filter(item => item.status === 'active' || item.status === 'beta');
  },

  /**
   * Check if integration is available
   * @param {Object} integration - Integration object
   * @returns {boolean} True if available
   */
  isAvailable(integration) {
    return integration.status === 'active' || integration.status === 'beta';
  },

  /**
   * Increment install count
   * @param {string} integrationId - Integration ID
   * @returns {Object} Updated integration
   */
  async incrementInstallCount(integrationId) {
    const integration = await this.findByIntegrationId(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return baseModel.updateOne.call(baseModel,
      { integrationId },
      { $set: { installCount: (integration.installCount || 0) + 1 } }
    );
  },

  /**
   * Update rating
   * @param {string} integrationId - Integration ID
   * @param {number} newRating - New rating value (1-5)
   * @returns {Object} Updated integration
   */
  async updateRating(integrationId, newRating) {
    const integration = await this.findByIntegrationId(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const currentRating = integration.rating || { average: 0, count: 0 };
    const newCount = currentRating.count + 1;
    const newAverage = ((currentRating.average * currentRating.count) + newRating) / newCount;

    return baseModel.updateOne.call(baseModel,
      { integrationId },
      { $set: { rating: { average: newAverage, count: newCount } } }
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

module.exports = IntegrationMarketplaceItem;
