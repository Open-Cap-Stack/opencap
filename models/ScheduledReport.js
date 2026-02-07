/**
 * ScheduledReport Model
 * Issue #112: Create Report Scheduling System
 *
 * Data model for automated recurring reports with support for:
 * - Cron-based scheduling
 * - Multiple report formats (PDF, Excel, CSV)
 * - Timezone-aware scheduling
 * - Recipient management
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid report types
const REPORT_TYPES = [
  'cap_table',
  'financial_summary',
  'investor_report',
  'vesting_summary',
  'equity_plan',
  'transaction_history',
  'compliance',
  'custom'
];

// Valid report formats
const REPORT_FORMATS = ['pdf', 'excel', 'csv'];

// Valid statuses
const VALID_STATUSES = ['active', 'paused', 'failed', 'completed'];

// Schema definition for documentation and validation
const scheduledReportSchema = {
  scheduleId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  reportType: { type: 'string', required: true, enum: REPORT_TYPES },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  schedule: { type: 'string', required: true },
  nextRunAt: { type: 'date', default: null },
  lastRunAt: { type: 'date', default: null },
  recipients: { type: 'array', default: [] },
  format: { type: 'string', enum: REPORT_FORMATS, default: 'pdf' },
  parameters: { type: 'object', default: {} },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  timezone: { type: 'string', default: 'UTC' },
  pausedAt: { type: 'date', default: null },
  failureCount: { type: 'number', default: 0 },
  lastError: { type: 'string', default: null },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('scheduled_reports', scheduledReportSchema);

// Extended ScheduledReport model with business logic
const ScheduledReport = {
  ...baseModel,
  tableName: 'scheduled_reports',
  schema: scheduledReportSchema,

  // Export constants
  REPORT_TYPES,
  REPORT_FORMATS,
  VALID_STATUSES,

  /**
   * Create a new scheduled report with defaults
   * @param {Object} data - Report data
   * @returns {Object} Created report
   */
  async create(data) {
    if (!data.scheduleId) {
      data.scheduleId = `sched_${uuidv4()}`;
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
      data.status = 'active';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find report by scheduleId
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Report or null
   */
  async findByScheduleId(scheduleId) {
    return baseModel.findOne.call(baseModel, { scheduleId });
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
   * Find reports due for execution
   * @returns {Array} Reports due for execution
   */
  async findDue() {
    const reports = await baseModel.find.call(baseModel, { status: 'active' });
    const now = new Date();
    return reports.filter(r => r.nextRunAt && new Date(r.nextRunAt) <= now);
  },

  /**
   * Check if report is due
   * @param {Object} report - Report object
   * @returns {boolean} True if due
   */
  isDue(report) {
    if (report.status !== 'active' || !report.nextRunAt) {
      return false;
    }
    return new Date() >= new Date(report.nextRunAt);
  },

  /**
   * Update last run
   * @param {string} scheduleId - Schedule ID
   * @param {Date} nextRunAt - Next run time
   * @returns {Object} Updated report
   */
  async updateLastRun(scheduleId, nextRunAt) {
    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          lastRunAt: new Date().toISOString(),
          nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
          failureCount: 0,
          lastError: null
        }
      }
    );
  },

  /**
   * Record failure
   * @param {string} scheduleId - Schedule ID
   * @param {string} error - Error message
   * @returns {Object} Updated report
   */
  async recordFailure(scheduleId, error) {
    const report = await this.findByScheduleId(scheduleId);
    if (!report) {
      throw new Error('Report not found');
    }

    const failureCount = (report.failureCount || 0) + 1;
    const updateData = {
      failureCount,
      lastError: error
    };

    // Mark as failed after 3 consecutive failures
    if (failureCount >= 3) {
      updateData.status = 'failed';
    }

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      { $set: updateData }
    );
  },

  /**
   * Pause report
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Updated report
   */
  async pause(scheduleId) {
    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'paused',
          pausedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Resume report
   * @param {string} scheduleId - Schedule ID
   * @param {Date} nextRunAt - Next run time
   * @returns {Object} Updated report
   */
  async resume(scheduleId, nextRunAt) {
    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'active',
          pausedAt: null,
          nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
          failureCount: 0,
          lastError: null
        }
      }
    );
  },

  /**
   * Add recipient
   * @param {string} scheduleId - Schedule ID
   * @param {string} email - Recipient email
   * @returns {Object} Updated report
   */
  async addRecipient(scheduleId, email) {
    const report = await this.findByScheduleId(scheduleId);
    if (!report) {
      throw new Error('Report not found');
    }

    const recipients = report.recipients || [];
    if (!recipients.includes(email)) {
      recipients.push(email);
    }

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      { $set: { recipients } }
    );
  },

  /**
   * Remove recipient
   * @param {string} scheduleId - Schedule ID
   * @param {string} email - Recipient email
   * @returns {Object} Updated report
   */
  async removeRecipient(scheduleId, email) {
    const report = await this.findByScheduleId(scheduleId);
    if (!report) {
      throw new Error('Report not found');
    }

    const recipients = (report.recipients || []).filter(r => r !== email);

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      { $set: { recipients } }
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

module.exports = ScheduledReport;
