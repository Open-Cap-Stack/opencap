/**
 * ApiKey Model
 * Issue #119: Create API Access for Partners
 *
 * Data model for partner API keys with support for:
 * - Key/secret authentication
 * - Permissions and rate limiting
 * - IP whitelisting
 * - Status management (active, suspended, revoked)
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses for API keys
const VALID_STATUSES = ['active', 'suspended', 'revoked'];

// Schema definition for documentation and validation
const apiKeySchema = {
  apiKeyId: { type: 'string', required: true, unique: true },
  partnerId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  keyHash: { type: 'string', required: true },
  secretHash: { type: 'string', required: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  permissions: { type: 'array', default: [] },
  rateLimit: {
    type: 'object',
    default: {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    }
  },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  expiresAt: { type: 'date', default: null },
  lastUsedAt: { type: 'date', default: null },
  ipWhitelist: { type: 'array', default: [] },
  usageCount: { type: 'number', default: 0 },
  usageHistory: { type: 'array', default: [] },
  suspendedAt: { type: 'date', default: null },
  suspensionReason: { type: 'string', default: null },
  reactivatedAt: { type: 'date', default: null },
  revokedAt: { type: 'date', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('api_keys', apiKeySchema);

// Extended ApiKey model with business logic
const ApiKey = {
  ...baseModel,
  tableName: 'api_keys',
  schema: apiKeySchema,

  /**
   * Create a new API key with defaults
   * @param {Object} data - API key data
   * @returns {Object} Created API key
   */
  async create(data) {
    if (!data.apiKeyId) {
      data.apiKeyId = `apikey_${uuidv4()}`;
    }

    if (!data.rateLimit) {
      data.rateLimit = {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      };
    }

    if (!data.status) {
      data.status = 'active';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find API key by apiKeyId
   * @param {string} apiKeyId - API key ID
   * @returns {Object|null} API key or null
   */
  async findByApiKeyId(apiKeyId) {
    return baseModel.findOne.call(baseModel, { apiKeyId });
  },

  /**
   * Find API keys by partner
   * @param {string} partnerId - Partner ID
   * @returns {Array} API keys for partner
   */
  async findByPartner(partnerId) {
    return baseModel.find.call(baseModel, { partnerId });
  },

  /**
   * Find API keys by company
   * @param {string} companyId - Company ID
   * @returns {Array} API keys for company
   */
  async findByCompany(companyId) {
    return baseModel.find.call(baseModel, { companyId });
  },

  /**
   * Update last used timestamp
   * @param {string} apiKeyId - API key ID
   * @returns {Object} Update result
   */
  async updateLastUsed(apiKeyId) {
    return baseModel.updateOne.call(baseModel,
      { apiKeyId },
      { $set: { lastUsedAt: new Date().toISOString() } }
    );
  },

  /**
   * Transform API key object for JSON output (hide sensitive fields)
   * @param {Object} apiKey - API key object
   * @returns {Object} Sanitized API key object
   */
  toJSON(apiKey) {
    if (!apiKey) return null;
    const sanitized = { ...apiKey };
    delete sanitized.keyHash;
    delete sanitized.secretHash;
    return sanitized;
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

module.exports = ApiKey;
