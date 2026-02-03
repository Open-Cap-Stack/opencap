/**
 * Financial Analytics Controller
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API endpoints for financial analytics features
 */

const financialAnalyticsService = require('../services/financialAnalyticsService');

/**
 * Analyze financial trends
 * POST /api/v1/financial-analytics/trends
 */
const analyzeTrends = async (req, res) => {
  try {
    const { companyId, metric, startDate, endDate } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {
      metric: metric || 'revenue',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    const result = await financialAnalyticsService.analyzeTrends(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Trend analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze trends',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get financial trends for a company
 * GET /api/v1/financial-analytics/trends/:companyId
 */
const getTrends = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { metric, startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {
      metric: metric || 'revenue',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    const result = await financialAnalyticsService.analyzeTrends(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      error: 'Failed to get trends',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Calculate financial ratios
 * GET /api/v1/financial-analytics/ratios/:companyId
 */
const calculateRatios = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { category } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = { category };

    const result = await financialAnalyticsService.calculateRatios(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Calculate ratios error:', error);

    if (error.message === 'Financial data not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to calculate ratios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Benchmark performance
 * POST /api/v1/financial-analytics/benchmark
 */
const benchmarkPerformance = async (req, res) => {
  try {
    const { companyId, industry, compareAgainst, goals, period } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {
      industry,
      compareAgainst: compareAgainst || 'industry',
      goals,
      period
    };

    const result = await financialAnalyticsService.benchmarkPerformance(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Benchmark performance error:', error);

    if (error.message === 'Company financial data not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to benchmark performance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get performance benchmark for a company
 * GET /api/v1/financial-analytics/benchmark/:companyId
 */
const getBenchmark = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { industry } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = { industry };

    const result = await financialAnalyticsService.benchmarkPerformance(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get benchmark error:', error);

    if (error.message === 'Company financial data not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get benchmark',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get comprehensive financial summary
 * GET /api/v1/financial-analytics/summary/:companyId
 */
const getFinancialSummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await financialAnalyticsService.getFinancialSummary(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Financial summary error:', error);
    res.status(500).json({
      error: 'Failed to get financial summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  analyzeTrends,
  getTrends,
  calculateRatios,
  benchmarkPerformance,
  getBenchmark,
  getFinancialSummary
};
