/**
 * EquityPlanReport Controller
 * Issue #110: Implement Equity Plan Reports
 *
 * Handles API requests for equity plan report operations.
 */
const equityPlanReportService = require('../services/equityPlanReportService');

// Valid report types
const VALID_REPORT_TYPES = ['option_pool_summary', 'grant_status', 'vesting_schedule', 'dilution_analysis'];

// Valid export formats
const VALID_FORMATS = ['pdf', 'excel', 'csv', 'json'];

/**
 * Report type descriptions
 */
const REPORT_TYPE_INFO = [
  {
    type: 'option_pool_summary',
    name: 'Option Pool Summary',
    description: 'Summary of total pool, granted shares, and available shares by share class'
  },
  {
    type: 'grant_status',
    name: 'Grant Status Report',
    description: 'All equity grants with status and vesting progress'
  },
  {
    type: 'vesting_schedule',
    name: 'Vesting Schedule Report',
    description: 'Upcoming vesting events and schedule forecast'
  },
  {
    type: 'dilution_analysis',
    name: 'Dilution Analysis',
    description: 'Fully diluted cap table impact analysis'
  }
];

/**
 * Create a new report request
 */
exports.createReport = async (req, res) => {
  try {
    const { reportType, companyId, format, startDate, endDate, parameters, requestedBy } = req.body;

    // Validate required fields
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required' });
    }

    // Validate report type
    if (!VALID_REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        error: `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`
      });
    }

    // Validate format if provided
    if (format && !VALID_FORMATS.includes(format)) {
      return res.status(400).json({
        error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`
      });
    }

    const reportData = {
      reportType,
      companyId,
      format: format || 'json',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      parameters: parameters || {},
      requestedBy: requestedBy || req.user?.userId
    };

    const report = await equityPlanReportService.createReport(reportData);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all reports for a company
 */
exports.getReports = async (req, res) => {
  try {
    const { companyId, reportType, status } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (reportType) options.reportType = reportType;
    if (status) options.status = status;

    const reports = await equityPlanReportService.getReportsByCompany(companyId, options);
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single report by ID
 */
exports.getReportById = async (req, res) => {
  try {
    const report = await equityPlanReportService.getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a report
 */
exports.deleteReport = async (req, res) => {
  try {
    const report = await equityPlanReportService.deleteReport(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate option pool summary report
 */
exports.generateOptionPoolSummary = async (req, res) => {
  try {
    const { companyId, format, requestedBy, ...options } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Create report record
    const reportRecord = await equityPlanReportService.createReport({
      reportType: 'option_pool_summary',
      companyId,
      format: format || 'json',
      requestedBy: requestedBy || req.user?.userId,
      parameters: options
    });

    // Generate report data
    const generatedData = await equityPlanReportService.generateOptionPoolSummary(companyId, options);

    // Update report with generated data
    const updatedReport = await equityPlanReportService.updateReportStatus(
      reportRecord._id,
      'completed'
    );

    res.status(200).json({
      ...updatedReport,
      generatedData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate grant status report
 */
exports.generateGrantStatusReport = async (req, res) => {
  try {
    const { companyId, startDate, endDate, grantTypes, format, requestedBy } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Create report record
    const reportRecord = await equityPlanReportService.createReport({
      reportType: 'grant_status',
      companyId,
      format: format || 'json',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      requestedBy: requestedBy || req.user?.userId,
      parameters: { grantTypes }
    });

    // Generate report data
    const options = { startDate, endDate, grantTypes };
    const generatedData = await equityPlanReportService.generateGrantStatusReport(companyId, options);

    // Update report with generated data
    const updatedReport = await equityPlanReportService.updateReportStatus(
      reportRecord._id,
      'completed'
    );

    res.status(200).json({
      ...updatedReport,
      generatedData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate vesting schedule report
 */
exports.generateVestingScheduleReport = async (req, res) => {
  try {
    const { companyId, forecastMonths, format, requestedBy } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Create report record
    const reportRecord = await equityPlanReportService.createReport({
      reportType: 'vesting_schedule',
      companyId,
      format: format || 'json',
      requestedBy: requestedBy || req.user?.userId,
      parameters: { forecastMonths }
    });

    // Generate report data
    const options = { forecastMonths };
    const generatedData = await equityPlanReportService.generateVestingScheduleReport(companyId, options);

    // Update report with generated data
    const updatedReport = await equityPlanReportService.updateReportStatus(
      reportRecord._id,
      'completed'
    );

    res.status(200).json({
      ...updatedReport,
      generatedData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate dilution analysis report
 */
exports.generateDilutionAnalysis = async (req, res) => {
  try {
    const { companyId, format, requestedBy, ...options } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Create report record
    const reportRecord = await equityPlanReportService.createReport({
      reportType: 'dilution_analysis',
      companyId,
      format: format || 'json',
      requestedBy: requestedBy || req.user?.userId,
      parameters: options
    });

    // Generate report data
    const generatedData = await equityPlanReportService.generateDilutionAnalysis(companyId, options);

    // Update report with generated data
    const updatedReport = await equityPlanReportService.updateReportStatus(
      reportRecord._id,
      'completed'
    );

    res.status(200).json({
      ...updatedReport,
      generatedData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export report to specified format
 */
exports.exportReport = async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const report = await equityPlanReportService.getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({
        error: 'Report is not ready for export. Current status: ' + report.status
      });
    }

    try {
      const exportResult = await equityPlanReportService.exportReport(report, format);

      // Set appropriate content type header based on format
      const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf'
      };

      res.setHeader('Content-Type', contentTypes[format] || 'application/json');

      if (format !== 'json') {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${report.reportId}.${format}"`
        );
      }

      res.status(200).json(exportResult);
    } catch (exportError) {
      if (exportError.message === 'Unsupported export format') {
        return res.status(400).json({ error: exportError.message });
      }
      throw exportError;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get available report types
 */
exports.getAvailableReportTypes = async (req, res) => {
  try {
    res.status(200).json(REPORT_TYPE_INFO);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get available export formats
 */
exports.getAvailableFormats = async (req, res) => {
  try {
    res.status(200).json(VALID_FORMATS);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
