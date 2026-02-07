/**
 * TriggerHistory Model
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Audit log for trigger executions. Records when triggers fire,
 * what messages were sent, and the outcome of each execution.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'success', 'partial', 'failed', 'skipped'];

// Valid delivery statuses
const DELIVERY_STATUSES = ['sent', 'delivered', 'failed', 'bounced', 'pending'];

// Schema definition for documentation and validation
const triggerHistorySchema = {
  historyId: { type: 'string', required: true, unique: true },
  triggerId: { type: 'string', required: true },
  triggerName: { type: 'string', default: null },
  eventType: { type: 'string', required: true },
  executedAt: { type: 'date', required: true },
  status: { type: 'string', enum: VALID_STATUSES, required: true, default: 'pending' },
  eventPayload: { type: 'object', default: {} },
  messageGenerated: {
    type: 'object',
    default: {
      subject: null,
      body: null,
      channels: []
    }
  },
  recipientCount: { type: 'number', default: 0 },
  recipientIds: { type: 'array', default: [] },
  deliveryResults: { type: 'array', default: [] },
  ruleEvaluationResult: { type: 'boolean', default: null },
  rulesEvaluated: { type: 'object', default: null },
  errorMessage: { type: 'string', default: null },
  errorStack: { type: 'string', default: null },
  companyId: { type: 'string', default: null },
  executionDurationMs: { type: 'number', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('trigger_history', triggerHistorySchema);

// Extended TriggerHistory model with business logic
const TriggerHistory = {
  ...baseModel,
  tableName: 'trigger_history',
  schema: triggerHistorySchema,

  // Export constants
  VALID_STATUSES,
  DELIVERY_STATUSES,

  /**
   * Create a new trigger history record with defaults
   * @param {Object} data - History data
   * @returns {Object} Created history record
   */
  async create(data) {
    if (!data.historyId) {
      data.historyId = `hist_${uuidv4()}`;
    }

    if (!data.executedAt) {
      data.executedAt = new Date().toISOString();
    }

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find history by historyId
   * @param {string} historyId - History ID
   * @returns {Object|null} History record or null
   */
  async findByHistoryId(historyId) {
    return baseModel.findOne.call(baseModel, { historyId });
  },

  /**
   * Find history by triggerId
   * @param {string} triggerId - Trigger ID
   * @param {Object} options - Query options
   * @returns {Array} History records for trigger
   */
  async findByTriggerId(triggerId, options = {}) {
    let records = await baseModel.find.call(baseModel, { triggerId });

    // Sort by executedAt descending
    records.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  },

  /**
   * Find history by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} History records for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by executedAt descending
    records.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  },

  /**
   * Get recent history for a company
   * @param {string} companyId - Company ID
   * @param {number} limit - Max records to return
   * @returns {Array} Recent history entries
   */
  async getRecentByCompany(companyId, limit = 50) {
    return this.findByCompany(companyId, { limit });
  },

  /**
   * Get execution stats for a trigger
   * @param {string} triggerId - Trigger ID to get stats for
   * @param {Date} since - Optional start date
   * @returns {Object} Execution statistics
   */
  async getStats(triggerId, since = null) {
    let records = await baseModel.find.call(baseModel, { triggerId });

    if (since) {
      const sinceDate = new Date(since);
      records = records.filter(r => new Date(r.executedAt) >= sinceDate);
    }

    const stats = {
      total: 0,
      byStatus: {},
      averageDuration: 0,
      totalRecipients: 0
    };

    let totalDuration = 0;
    let durationCount = 0;

    records.forEach(r => {
      stats.total++;

      if (!stats.byStatus[r.status]) {
        stats.byStatus[r.status] = 0;
      }
      stats.byStatus[r.status]++;

      stats.totalRecipients += r.recipientCount || 0;

      if (r.executionDurationMs) {
        totalDuration += r.executionDurationMs;
        durationCount++;
      }
    });

    if (durationCount > 0) {
      stats.averageDuration = totalDuration / durationCount;
    }

    return stats;
  },

  /**
   * Find history by status
   * @param {string} status - Status to filter by
   * @param {Object} options - Query options
   * @returns {Array} History records with status
   */
  async findByStatus(status, options = {}) {
    const query = { status };
    if (options.companyId) {
      query.companyId = options.companyId;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by executedAt descending
    records.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  },

  /**
   * Find history by event type
   * @param {string} eventType - Event type
   * @param {Object} options - Query options
   * @returns {Array} History records for event type
   */
  async findByEventType(eventType, options = {}) {
    const query = { eventType };
    if (options.companyId) {
      query.companyId = options.companyId;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by executedAt descending
    records.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
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

module.exports = TriggerHistory;
