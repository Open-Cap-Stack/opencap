/**
 * CustomReport Model
 * Issue #197: Build Custom Report Builder Engine
 *
 * Represents user-defined custom reports with dynamic query building.
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['active', 'archived', 'draft'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const VALID_SORT_ORDERS = ['ASC', 'DESC'];
const VALID_AGGREGATIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT'];

// Schema definition for documentation and validation
const customReportSchema = {
  reportId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  companyId: { type: 'string', required: true },
  createdBy: { type: 'string', required: true },
  dataSources: { type: 'array', required: true },
  fields: { type: 'array', required: true },
  filters: { type: 'object', default: {} },
  groupBy: { type: 'array', default: [] },
  aggregations: { type: 'array', default: [] },
  sortBy: {
    type: 'object',
    default: { field: null, order: 'ASC' }
  },
  limit: { type: 'number', default: 100 },
  isPublic: { type: 'boolean', default: false },
  sharedWith: { type: 'array', default: [] },
  schedule: {
    type: 'object',
    default: { enabled: false, frequency: null, recipients: [] }
  },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  lastExecutedAt: { type: 'date', default: null },
  executionCount: { type: 'number', default: 0 },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('custom_reports', customReportSchema);

// Extended CustomReport model with business logic
const CustomReport = {
  ...baseModel,
  tableName: 'custom_reports',
  schema: customReportSchema,

  // Export constants
  VALID_STATUSES,
  VALID_FREQUENCIES,
  VALID_SORT_ORDERS,
  VALID_AGGREGATIONS,

  /**
   * Create a new custom report with defaults
   * @param {Object} data - Report data
   * @returns {Object} Created report
   */
  async create(data) {
    if (!data.reportId) {
      data.reportId = `report_${uuidv4()}`;
    }

    if (!data.status) {
      data.status = 'draft';
    }

    // Validate required arrays
    if (!data.dataSources || !Array.isArray(data.dataSources) || data.dataSources.length === 0) {
      throw new Error('At least one data source is required');
    }

    if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
      throw new Error('At least one field is required');
    }

    // Validate scheduled reports
    if (data.schedule && data.schedule.enabled) {
      if (!data.schedule.frequency) {
        throw new Error('Frequency is required for scheduled reports');
      }
      if (!data.schedule.recipients || data.schedule.recipients.length === 0) {
        throw new Error('At least one recipient is required for scheduled reports');
      }
    }

    // Set aggregation aliases if not provided
    if (data.aggregations && data.aggregations.length > 0) {
      data.aggregations = data.aggregations.map(agg => ({
        ...agg,
        alias: agg.alias || `${agg.function}_${agg.field}`.toLowerCase()
      }));
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find report by reportId
   * @param {string} reportId - Report ID
   * @returns {Object|null} Report or null
   */
  async findByReportId(reportId) {
    return baseModel.findOne.call(baseModel, { reportId });
  },

  /**
   * Find reports by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Reports for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find reports created by a user
   * @param {string} createdBy - User ID
   * @returns {Array} Reports by user
   */
  async findByCreator(createdBy) {
    return baseModel.find.call(baseModel, { createdBy });
  },

  /**
   * Check if report has been executed
   * @param {Object} report - Report object
   * @returns {boolean} True if executed
   */
  hasBeenExecuted(report) {
    return report && report.executionCount > 0;
  },

  /**
   * Check if report is scheduled
   * @param {Object} report - Report object
   * @returns {boolean} True if scheduled
   */
  isScheduled(report) {
    return report && report.schedule && report.schedule.enabled;
  },

  /**
   * Increment execution count
   * @param {string} reportId - Report ID
   * @returns {Object} Update result
   */
  async recordExecution(reportId) {
    const report = await this.findByReportId(reportId);
    if (report) {
      return baseModel.updateOne.call(baseModel,
        { reportId },
        {
          $set: {
            executionCount: (report.executionCount || 0) + 1,
            lastExecutedAt: new Date().toISOString()
          }
        }
      );
    }
    return null;
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

module.exports = CustomReport;
