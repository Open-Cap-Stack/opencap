/**
 * StakeholderReport Model
 * Issue #198: Enhance Stakeholder Report Generation
 *
 * ZeroDB-based model for stakeholder reports including:
 * - Holdings reports
 * - Transaction history reports
 * - Valuation reports
 * - Tax documents
 */

const { createModel } = require('./base/ZeroDBModel');

const schema = {
  reportId: {
    type: 'string',
    required: true,
    unique: true,
    description: 'Unique identifier for the report'
  },
  stakeholderId: {
    type: 'string',
    required: true,
    index: true,
    description: 'ID of the stakeholder this report belongs to'
  },
  companyId: {
    type: 'string',
    required: true,
    index: true,
    description: 'ID of the company context'
  },
  reportType: {
    type: 'string',
    required: true,
    enum: ['holdings', 'transactions', 'valuations', 'tax', 'summary'],
    description: 'Type of report'
  },
  name: {
    type: 'string',
    required: false,
    description: 'Report display name'
  },
  description: {
    type: 'string',
    required: false,
    description: 'Report description'
  },
  format: {
    type: 'string',
    enum: ['pdf', 'excel', 'csv', 'json'],
    default: 'pdf',
    description: 'Output format of the report'
  },
  status: {
    type: 'string',
    enum: ['pending', 'generating', 'completed', 'failed', 'delivered'],
    default: 'pending',
    description: 'Current status of the report'
  },
  data: {
    type: 'object',
    required: false,
    description: 'Report data content'
  },
  parameters: {
    type: 'object',
    required: false,
    description: 'Parameters used to generate the report'
  },
  fileUrl: {
    type: 'string',
    required: false,
    description: 'URL to the generated report file'
  },
  fileSize: {
    type: 'number',
    required: false,
    description: 'Size of the generated file in bytes'
  },
  generatedAt: {
    type: 'string',
    required: false,
    description: 'Timestamp when report was generated'
  },
  deliveredAt: {
    type: 'string',
    required: false,
    description: 'Timestamp when report was delivered'
  },
  deliveryMethod: {
    type: 'string',
    enum: ['email', 'portal', 'api'],
    required: false,
    description: 'How the report was delivered'
  },
  recipients: {
    type: 'array',
    required: false,
    description: 'List of email recipients'
  },
  schedule: {
    type: 'string',
    required: false,
    description: 'Cron expression for scheduled delivery'
  },
  nextDeliveryAt: {
    type: 'string',
    required: false,
    description: 'Next scheduled delivery timestamp'
  },
  error: {
    type: 'string',
    required: false,
    description: 'Error message if report generation failed'
  },
  createdAt: {
    type: 'string',
    required: false,
    description: 'Creation timestamp'
  },
  updatedAt: {
    type: 'string',
    required: false,
    description: 'Last update timestamp'
  }
};

const StakeholderReport = createModel('stakeholder_reports', schema);

// Store schema and tableName for testing
StakeholderReport.schema = schema;
StakeholderReport.tableName = 'stakeholder_reports';

/**
 * Generate a unique report ID
 * @returns {string} Report ID in format SR-XXXXXXXX
 */
const generateReportId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SR-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

/**
 * Find report by reportId
 * @param {string} reportId - Report ID to find
 * @returns {Promise<Object|null>} Report or null if not found
 */
StakeholderReport.findByReportId = async function(reportId) {
  return this.findOne({ reportId });
};

/**
 * Find all reports for a stakeholder
 * @param {string} stakeholderId - Stakeholder ID
 * @returns {Promise<Array>} Array of reports
 */
StakeholderReport.findByStakeholder = async function(stakeholderId) {
  return this.find({ stakeholderId });
};

/**
 * Find all reports for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of reports
 */
StakeholderReport.findByCompany = async function(companyId) {
  return this.find({ companyId });
};

/**
 * Find all reports by type
 * @param {string} reportType - Type of report
 * @returns {Promise<Array>} Array of reports
 */
StakeholderReport.findByType = async function(reportType) {
  return this.find({ reportType });
};

/**
 * Find all reports by status
 * @param {string} status - Report status
 * @returns {Promise<Array>} Array of reports
 */
StakeholderReport.findByStatus = async function(status) {
  return this.find({ status });
};

/**
 * Update report status
 * @param {string} reportId - Report ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional fields to update
 * @returns {Promise<Object>} Updated report
 */
StakeholderReport.updateStatus = async function(reportId, status, additionalData = {}) {
  const updateData = {
    status,
    updatedAt: new Date().toISOString(),
    ...additionalData
  };

  if (status === 'completed') {
    updateData.generatedAt = new Date().toISOString();
  }

  if (status === 'delivered') {
    updateData.deliveredAt = new Date().toISOString();
  }

  return this.findOneAndUpdate({ reportId }, updateData);
};

/**
 * Get stakeholder reports with filters
 * @param {string} stakeholderId - Stakeholder ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Filtered reports
 */
StakeholderReport.getStakeholderReports = async function(stakeholderId, filters = {}) {
  const query = { stakeholderId };

  if (filters.reportType) {
    query.reportType = filters.reportType;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.companyId) {
    query.companyId = filters.companyId;
  }

  return this.find(query);
};

// Override create to auto-generate reportId
const originalCreate = StakeholderReport.create.bind(StakeholderReport);
StakeholderReport.create = async function(data) {
  const reportData = {
    ...data,
    reportId: data.reportId || generateReportId(),
    status: data.status || 'pending',
    format: data.format || 'pdf',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return originalCreate(reportData);
};

module.exports = StakeholderReport;
