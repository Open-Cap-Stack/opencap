/**
 * Stakeholder Report Controller
 * Issue #198: Enhance Stakeholder Report Generation
 *
 * Controller for stakeholder report generation endpoints including:
 * - Holdings reports
 * - Transaction history reports
 * - Valuation reports
 * - Tax documents
 * - Automated delivery scheduling
 */

const stakeholderReportService = require('../services/stakeholderReportService');

/**
 * Sanitize input string to prevent XSS
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '').trim();
};

/**
 * GET /api/v1/stakeholders/:id/reports
 * Get all reports for a stakeholder
 */
exports.getStakeholderReports = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    const filters = {};
    if (req.query.reportType) {
      filters.reportType = sanitizeInput(req.query.reportType);
    }
    if (req.query.status) {
      filters.status = sanitizeInput(req.query.status);
    }

    const reports = await stakeholderReportService.getStakeholderReports(
      stakeholderId,
      filters
    );

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/stakeholders/:id/reports/holdings
 * Generate holdings report for a stakeholder
 */
exports.generateHoldingsReport = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const { companyId, format } = req.body;

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const report = await stakeholderReportService.generateHoldingsReport(
      stakeholderId,
      sanitizeInput(companyId),
      { format: format ? sanitizeInput(format) : 'pdf' }
    );

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    if (error.message === 'Stakeholder not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/stakeholders/:id/reports/transactions
 * Generate transaction history report for a stakeholder
 */
exports.generateTransactionsReport = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const { companyId, startDate, endDate, format } = req.body;

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const options = {
      format: format ? sanitizeInput(format) : 'pdf'
    };

    if (startDate) options.startDate = sanitizeInput(startDate);
    if (endDate) options.endDate = sanitizeInput(endDate);

    const report = await stakeholderReportService.generateTransactionsReport(
      stakeholderId,
      sanitizeInput(companyId),
      options
    );

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    if (error.message === 'Stakeholder not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/stakeholders/:id/reports/valuations
 * Generate valuation report for a stakeholder
 */
exports.generateValuationsReport = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const { companyId, format } = req.body;

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const report = await stakeholderReportService.generateValuationsReport(
      stakeholderId,
      sanitizeInput(companyId),
      { format: format ? sanitizeInput(format) : 'pdf' }
    );

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    if (error.message === 'Stakeholder not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/stakeholders/:id/reports/tax
 * Generate tax document report for a stakeholder
 */
exports.generateTaxReport = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const { companyId, taxYear, format } = req.body;

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!taxYear) {
      return res.status(400).json({
        success: false,
        error: 'Tax year is required'
      });
    }

    const report = await stakeholderReportService.generateTaxReport(
      stakeholderId,
      sanitizeInput(companyId),
      {
        taxYear,
        format: format ? sanitizeInput(format) : 'pdf'
      }
    );

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    if (error.message === 'Stakeholder not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Invalid tax year') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/stakeholders/:id/reports/:reportId
 * Get a specific report by ID
 */
exports.getReportById = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const reportId = sanitizeInput(req.params.reportId);

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'Report ID is required'
      });
    }

    const report = await stakeholderReportService.getReportById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/stakeholders/:id/reports/:reportId/download
 * Download a report
 */
exports.downloadReport = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const reportId = sanitizeInput(req.params.reportId);

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'Report ID is required'
      });
    }

    const downloadInfo = await stakeholderReportService.downloadReport(reportId);

    res.status(200).json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    if (error.message === 'Report not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Report is not ready for download') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/v1/stakeholders/:id/reports/schedule
 * Schedule automated report delivery
 */
exports.scheduleAutomatedDelivery = async (req, res) => {
  try {
    const stakeholderId = sanitizeInput(req.params.id);
    const { companyId, reportType, schedule, recipients, format } = req.body;

    if (!stakeholderId) {
      return res.status(400).json({
        success: false,
        error: 'Stakeholder ID is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!reportType) {
      return res.status(400).json({
        success: false,
        error: 'Report type is required'
      });
    }

    if (!schedule) {
      return res.status(400).json({
        success: false,
        error: 'Schedule is required'
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one recipient is required'
      });
    }

    const scheduleData = {
      stakeholderId,
      companyId: sanitizeInput(companyId),
      reportType: sanitizeInput(reportType),
      schedule: sanitizeInput(schedule),
      recipients: recipients.map(r => sanitizeInput(r)),
      format: format ? sanitizeInput(format) : 'pdf'
    };

    const result = await stakeholderReportService.scheduleAutomatedDelivery(scheduleData);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message.includes('Invalid schedule format') ||
        error.message.includes('Invalid email format')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
