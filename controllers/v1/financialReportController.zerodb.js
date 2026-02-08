/**
 * Financial Report Controller (ZeroDB)
 *
 * Feature: OCAE-18: Migrate Financial Report controller to ZeroDB
 * Versioned controller for financial report management using ZeroDB as the data store
 */

const zerodbService = require('../../services/zerodbService');

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - The ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Calculate financial totals from revenue and expenses
 * @param {Object} data - Financial report data
 * @returns {Object} - Data with calculated totals
 */
const calculateTotals = (data) => {
  const revenue = data.revenue || {};
  const expenses = data.expenses || {};

  const totalRevenue = (revenue.sales || 0) +
                       (revenue.services || 0) +
                       (revenue.other || 0);

  const totalExpenses = (expenses.salaries || 0) +
                        (expenses.marketing || 0) +
                        (expenses.operations || 0) +
                        (expenses.other || 0);

  return {
    ...data,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses
  };
};

/**
 * Create a new financial report
 */
const createFinancialReport = async (req, res) => {
  try {
    // Validate authentication
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { companyId, reportingPeriod, reportType } = req.body;

    // Validate required fields
    if (!companyId || !reportingPeriod || !reportType) {
      return res.status(400).json({
        error: 'Required fields missing: companyId, reportingPeriod, and reportType are required'
      });
    }

    // Calculate totals and prepare report data
    const reportData = calculateTotals({
      ...req.body,
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportDate: new Date().toISOString()
    });

    const result = await zerodbService.insertRow('financial_reports', reportData);

    const createdReport = result.rows && result.rows[0] ? result.rows[0] : reportData;
    return res.status(201).json(createdReport);
  } catch (error) {
    console.error('Error creating financial report:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'A financial report with the same reporting period and company already exists'
      });
    }

    return res.status(500).json({ error: 'Failed to create financial report' });
  }
};

/**
 * Get all financial reports with optional filtering
 */
const getAllFinancialReports = async (req, res) => {
  try {
    const {
      companyId,
      reportType,
      startDate,
      endDate,
      limit = 50,
      page = 1
    } = req.query;

    // Build filter
    const filter = {};

    if (companyId) {
      filter.companyId = companyId;
    }

    if (reportType) {
      filter.reportType = reportType;
    }

    if (startDate || endDate) {
      filter.reportDate = {};
      if (startDate) {
        filter.reportDate.$gte = new Date(startDate).toISOString();
      }
      if (endDate) {
        filter.reportDate.$lte = new Date(endDate).toISOString();
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let financialReports = [];
    try {
      financialReports = await zerodbService.queryTable('financial_reports', {
        filter,
        skip,
        limit: parseInt(limit),
        sort: { reportDate: -1 }
      });
    } catch (dbError) {
      // Table may not exist yet - return empty data
      if (dbError.message?.includes('not found') || dbError.response?.data?.detail?.includes('not found')) {
        console.warn('financial_reports table not found, returning empty data');
        return res.status(200).json([]);
      }
      throw dbError;
    }

    return res.status(200).json(financialReports);
  } catch (error) {
    console.error('Error fetching financial reports:', error);
    return res.status(500).json({ error: 'Failed to retrieve financial reports' });
  }
};

/**
 * Get a single financial report by ID
 */
const getFinancialReportById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid financial report ID format' });
    }

    const reports = await zerodbService.queryTable('financial_reports', {
      filter: { _id: id }
    });

    if (!reports || reports.length === 0) {
      return res.status(404).json({ error: 'Financial report not found' });
    }

    return res.status(200).json(reports[0]);
  } catch (error) {
    console.error('Error fetching financial report:', error);
    return res.status(500).json({ error: 'Failed to retrieve financial report' });
  }
};

/**
 * Update an existing financial report
 */
const updateFinancialReport = async (req, res) => {
  try {
    // Validate authentication
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Validate ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid financial report ID format' });
    }

    // Check if report exists
    const existingReports = await zerodbService.queryTable('financial_reports', {
      filter: { _id: id }
    });

    if (!existingReports || existingReports.length === 0) {
      return res.status(404).json({ error: 'Financial report not found' });
    }

    // Calculate totals and prepare update data
    const updateData = calculateTotals({
      ...req.body,
      lastModifiedBy: req.user.id,
      updatedAt: new Date().toISOString()
    });

    await zerodbService.updateRows('financial_reports', { _id: id }, {
      $set: updateData
    });

    // Fetch updated report
    const updatedReports = await zerodbService.queryTable('financial_reports', {
      filter: { _id: id }
    });

    return res.status(200).json(updatedReports[0]);
  } catch (error) {
    console.error('Error updating financial report:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update financial report' });
  }
};

/**
 * Delete a financial report
 */
const deleteFinancialReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid financial report ID format' });
    }

    // Check if report exists
    const existingReports = await zerodbService.queryTable('financial_reports', {
      filter: { _id: id }
    });

    if (!existingReports || existingReports.length === 0) {
      return res.status(404).json({ error: 'Financial report not found' });
    }

    await zerodbService.deleteRows('financial_reports', { _id: id });

    return res.status(200).json({
      message: 'Financial report deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting financial report:', error);
    return res.status(500).json({ error: 'Failed to delete financial report' });
  }
};

/**
 * Search financial reports by keyword
 */
const searchFinancialReports = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Build search filter using regex-like pattern
    const filter = {
      $or: [
        { reportingPeriod: { $regex: q, $options: 'i' } },
        { reportType: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } }
      ]
    };

    const financialReports = await zerodbService.queryTable('financial_reports', {
      filter,
      sort: { reportDate: -1 }
    });

    return res.status(200).json(financialReports);
  } catch (error) {
    console.error('Error searching financial reports:', error);
    return res.status(500).json({ error: 'Failed to search financial reports' });
  }
};

/**
 * Get financial report analytics with calculations
 */
const getFinancialReportAnalytics = async (req, res) => {
  try {
    const { companyId, reportType, year } = req.query;

    // Build filter
    const filter = {};

    if (companyId) {
      filter.companyId = companyId;
    }

    if (reportType) {
      filter.reportType = reportType;
    }

    if (year) {
      const startDate = new Date(`${year}-01-01`).toISOString();
      const endDate = new Date(`${year}-12-31`).toISOString();
      filter.reportDate = { $gte: startDate, $lte: endDate };
    }

    let reports = [];
    try {
      reports = await zerodbService.queryTable('financial_reports', {
        filter,
        sort: { reportDate: -1 }
      });
    } catch (dbError) {
      // Table may not exist yet - return empty analytics
      if (dbError.message?.includes('not found') || dbError.response?.data?.detail?.includes('not found')) {
        console.warn('financial_reports table not found, returning empty analytics');
        reports = [];
      } else {
        throw dbError;
      }
    }

    if (!reports || reports.length === 0) {
      return res.status(200).json({
        totalReports: 0,
        averageRevenue: 0,
        averageExpenses: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalNetIncome: 0,
        maxRevenue: 0,
        minRevenue: 0,
        revenueVariance: 0,
        averageProfitMargin: 0,
        revenueGrowthRate: 0
      });
    }

    // Calculate analytics
    const totalReports = reports.length;
    const revenues = reports.map(r => r.totalRevenue || 0);
    const expenses = reports.map(r => r.totalExpenses || 0);
    const netIncomes = reports.map(r => r.netIncome || 0);

    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalExpenses = expenses.reduce((a, b) => a + b, 0);
    const totalNetIncome = netIncomes.reduce((a, b) => a + b, 0);

    const averageRevenue = totalRevenue / totalReports;
    const averageExpenses = totalExpenses / totalReports;

    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);

    // Calculate variance
    const meanRevenue = totalRevenue / totalReports;
    const variance = revenues.reduce((acc, val) => acc + Math.pow(val - meanRevenue, 2), 0) / totalReports;
    const revenueVariance = Math.sqrt(variance);

    // Calculate profit margins
    const profitMargins = reports.map(r => {
      if (!r.totalRevenue || r.totalRevenue === 0) return 0;
      return r.netIncome / r.totalRevenue;
    });
    const averageProfitMargin = profitMargins.reduce((a, b) => a + b, 0) / profitMargins.length;

    // Calculate growth rate
    const revenueGrowthRate = minRevenue > 0 ? (maxRevenue - minRevenue) / minRevenue : 0;

    return res.status(200).json({
      totalReports,
      averageRevenue: parseFloat(averageRevenue.toFixed(2)),
      averageExpenses: parseFloat(averageExpenses.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      totalNetIncome: parseFloat(totalNetIncome.toFixed(2)),
      maxRevenue: parseFloat(maxRevenue.toFixed(2)),
      minRevenue: parseFloat(minRevenue.toFixed(2)),
      revenueVariance: parseFloat(revenueVariance.toFixed(2)),
      averageProfitMargin: parseFloat(averageProfitMargin.toFixed(4)),
      revenueGrowthRate: parseFloat(revenueGrowthRate.toFixed(4))
    });
  } catch (error) {
    console.error('Error getting financial report analytics:', error);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Create multiple financial reports in bulk
 */
const bulkCreateFinancialReports = async (req, res) => {
  try {
    // Validate authentication
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        error: 'Bulk operation requires an array of financial reports'
      });
    }

    // Add user ID and calculate totals for each report
    const reportsWithUser = req.body.map(report => calculateTotals({
      ...report,
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportDate: new Date().toISOString()
    }));

    const result = await zerodbService.insertRow('financial_reports', reportsWithUser);

    const createdReports = result.rows || reportsWithUser;
    return res.status(201).json(createdReports);
  } catch (error) {
    console.error('Error creating financial reports in bulk:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'One or more financial reports already exist with the same reporting period and company'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create financial reports in bulk' });
  }
};

module.exports = {
  createFinancialReport,
  getAllFinancialReports,
  getFinancialReportById,
  updateFinancialReport,
  deleteFinancialReport,
  searchFinancialReports,
  getFinancialReportAnalytics,
  bulkCreateFinancialReports
};
