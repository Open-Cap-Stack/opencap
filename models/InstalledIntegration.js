/**
 * InstalledIntegration Model
 * Issue #202: Build Integration Marketplace Backend
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['active', 'inactive', 'error', 'pending', 'configuring'];

// Valid sync frequencies
const SYNC_FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'manual'];

// Schema definition for documentation and validation
const installedIntegrationSchema = {
  installationId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  integrationId: { type: 'string', required: true },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  configuration: { type: 'object', default: {} },
  encryptedSecrets: { type: 'object', default: {} },
  permissions: { type: 'array', default: [] },
  lastConnectionTest: {
    type: 'object',
    default: {
      timestamp: null,
      success: null,
      responseTime: null,
      error: null
    }
  },
  connectionLogs: { type: 'array', default: [] },
  webhookUrl: { type: 'string', default: null },
  webhookSecret: { type: 'string', default: null },
  syncSettings: {
    type: 'object',
    default: {
      enabled: true,
      frequency: 'realtime',
      lastSyncAt: null,
      nextSyncAt: null
    }
  },
  usageMetrics: {
    type: 'object',
    default: {
      apiCallsTotal: 0,
      apiCallsThisMonth: 0,
      lastApiCallAt: null,
      errorCount: 0,
      successRate: 100
    }
  },
  installedBy: { type: 'string', required: true },
  installedAt: { type: 'date', default: null },
  configuredBy: { type: 'string', default: null },
  configuredAt: { type: 'date', default: null },
  updatedBy: { type: 'string', default: null },
  activatedAt: { type: 'date', default: null },
  deactivatedAt: { type: 'date', default: null },
  deactivatedBy: { type: 'string', default: null },
  deactivationReason: { type: 'string', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('installed_integrations', installedIntegrationSchema);

// Extended InstalledIntegration model with business logic
const InstalledIntegration = {
  ...baseModel,
  tableName: 'installed_integrations',
  schema: installedIntegrationSchema,

  // Export constants
  VALID_STATUSES,
  SYNC_FREQUENCIES,

  /**
   * Create a new installed integration with defaults
   * @param {Object} data - Installation data
   * @returns {Object} Created installation
   */
  async create(data) {
    if (!data.installationId) {
      data.installationId = `inst_${uuidv4()}`;
    }

    if (!data.status) {
      data.status = 'pending';
    }

    if (!data.installedAt) {
      data.installedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find installation by installationId
   * @param {string} installationId - Installation ID
   * @returns {Object|null} Installation or null
   */
  async findByInstallationId(installationId) {
    return baseModel.findOne.call(baseModel, { installationId });
  },

  /**
   * Find installations by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Installations for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find installations by integration
   * @param {string} integrationId - Integration ID
   * @param {Object} options - Query options
   * @returns {Array} Installations for integration
   */
  async findByIntegration(integrationId, options = {}) {
    const query = { integrationId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find installation by company and integration
   * @param {string} companyId - Company ID
   * @param {string} integrationId - Integration ID
   * @returns {Object|null} Installation or null
   */
  async findByCompanyAndIntegration(companyId, integrationId) {
    return baseModel.findOne.call(baseModel, { companyId, integrationId });
  },

  /**
   * Check if integration is operational
   * @param {Object} installation - Installation object
   * @returns {boolean} True if operational
   */
  isOperational(installation) {
    return installation.status === 'active' &&
      (!installation.lastConnectionTest || installation.lastConnectionTest.success !== false);
  },

  /**
   * Get days since installation
   * @param {Object} installation - Installation object
   * @returns {number} Days since installation
   */
  getDaysSinceInstallation(installation) {
    if (!installation.installedAt) return 0;
    return Math.floor((Date.now() - new Date(installation.installedAt)) / (1000 * 60 * 60 * 24));
  },

  /**
   * Log connection test
   * @param {string} installationId - Installation ID
   * @param {Object} testResult - Test result
   * @returns {Object} Updated installation
   */
  async logConnectionTest(installationId, testResult) {
    const installation = await this.findByInstallationId(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      success: testResult.success,
      responseTime: testResult.responseTime,
      error: testResult.error || null,
      details: testResult.details || null
    };

    const connectionLogs = installation.connectionLogs || [];
    connectionLogs.push(logEntry);

    // Keep only last 100 logs
    if (connectionLogs.length > 100) {
      connectionLogs.shift();
    }

    return baseModel.updateOne.call(baseModel,
      { installationId },
      {
        $set: {
          lastConnectionTest: logEntry,
          connectionLogs
        }
      }
    );
  },

  /**
   * Activate installation
   * @param {string} installationId - Installation ID
   * @returns {Object} Updated installation
   */
  async activate(installationId) {
    return baseModel.updateOne.call(baseModel,
      { installationId },
      {
        $set: {
          status: 'active',
          activatedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Deactivate installation
   * @param {string} installationId - Installation ID
   * @param {string} reason - Deactivation reason
   * @param {string} deactivatedBy - User ID
   * @returns {Object} Updated installation
   */
  async deactivate(installationId, reason, deactivatedBy) {
    return baseModel.updateOne.call(baseModel,
      { installationId },
      {
        $set: {
          status: 'inactive',
          deactivatedAt: new Date().toISOString(),
          deactivatedBy,
          deactivationReason: reason
        }
      }
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

module.exports = InstalledIntegration;
