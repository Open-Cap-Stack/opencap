/**
 * EquityPlanReport Model
 * Issue #110: Implement Equity Plan Reports
 *
 * Data model for equity plan reports including option pool summaries,
 * grant status reports, vesting schedules, and dilution analysis.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid report types
const REPORT_TYPES = ['option_pool_summary', 'grant_status', 'vesting_schedule', 'dilution_analysis'];

// Valid formats
const REPORT_FORMATS = ['pdf', 'excel', 'csv', 'json'];

// Valid statuses
const VALID_STATUSES = ['pending', 'generating', 'completed', 'failed'];

// Schema definition for documentation and validation
const equityPlanReportSchema = {
  reportId: { type: 'string', required: true, unique: true },
  reportType: { type: 'string', required: true, enum: REPORT_TYPES },
  companyId: { type: 'string', required: true },
  startDate: { type: 'date', default: null },
  endDate: { type: 'date', default: null },
  parameters: { type: 'object', default: {} },
  generatedData: { type: 'object', default: null },
  format: { type: 'string', enum: REPORT_FORMATS, default: 'json' },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  requestedBy: { type: 'string', default: null },
  generatedAt: { type: 'date', default: null },
  errorMessage: { type: 'string', default: null },
  fileUrl: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('equity_plan_reports', equityPlanReportSchema);

// Extended EquityPlanReport model with business logic
const EquityPlanReport = {
  ...baseModel,
  tableName: 'equity_plan_reports',
  schema: equityPlanReportSchema,

  // Export constants
  REPORT_TYPES,
  REPORT_FORMATS,
  VALID_STATUSES,

  /**
   * Create a new equity plan report with defaults
   * @param {Object} data - Report data
   * @returns {Object} Created report
   */
  async create(data) {
    if (!data.reportId) {
      data.reportId = `epr_${uuidv4()}`;
    }

    // Validate report type
    if (!REPORT_TYPES.includes(data.reportType)) {
      throw new Error(`reportType must be one of: ${REPORT_TYPES.join(', ')}`);
    }

    // Validate format
    if (data.format && !REPORT_FORMATS.includes(data.format)) {
      throw new Error(`format must be one of: ${REPORT_FORMATS.join(', ')}`);
    }

    if (!data.status) {
      data.status = 'pending';
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
    if (options.reportType) {
      query.reportType = options.reportType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Check if report is ready
   * @param {Object} report - Report object
   * @returns {boolean} True if ready
   */
  isReady(report) {
    return report.status === 'completed';
  },

  /**
   * Check if report has failed
   * @param {Object} report - Report object
   * @returns {boolean} True if failed
   */
  hasFailed(report) {
    return report.status === 'failed';
  },

  /**
   * Start generating report
   * @param {string} reportId - Report ID
   * @returns {Object} Updated report
   */
  async startGenerating(reportId) {
    return baseModel.updateOne.call(baseModel,
      { reportId },
      { $set: { status: 'generating' } }
    );
  },

  /**
   * Complete report generation
   * @param {string} reportId - Report ID
   * @param {Object} generatedData - Generated data
   * @param {string} fileUrl - File URL
   * @returns {Object} Updated report
   */
  async complete(reportId, generatedData, fileUrl = null) {
    return baseModel.updateOne.call(baseModel,
      { reportId },
      {
        $set: {
          status: 'completed',
          generatedAt: new Date().toISOString(),
          generatedData,
          fileUrl
        }
      }
    );
  },

  /**
   * Mark report as failed
   * @param {string} reportId - Report ID
   * @param {string} errorMessage - Error message
   * @returns {Object} Updated report
   */
  async fail(reportId, errorMessage) {
    return baseModel.updateOne.call(baseModel,
      { reportId },
      {
        $set: {
          status: 'failed',
          errorMessage
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

module.exports = EquityPlanReport;
