/**
 * Advanced Analytics Controller
 *
 * [Feature] Issue #31: Implement advanced analytics with ZeroDB
 * REST API endpoints for advanced analytics features
 */

const advancedAnalyticsService = require('../services/advancedAnalyticsService');

/**
 * Get cap table summary
 * GET /api/v1/analytics/cap-table/:companyId
 */
const getCapTableSummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const useCache = req.query.useCache === 'true';
    const result = await advancedAnalyticsService.getCapTableSummary(companyId, { useCache });

    res.status(200).json(result);
  } catch (error) {
    console.error('Cap table summary error:', error);
    res.status(500).json({
      error: 'Failed to get cap table summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get dilution analysis
 * POST /api/v1/analytics/dilution
 */
const getDilutionAnalysis = async (req, res) => {
  try {
    const { companyId, newInvestment } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!newInvestment) {
      return res.status(400).json({ error: 'Investment data is required' });
    }

    const result = await advancedAnalyticsService.getDilutionAnalysis(companyId, newInvestment);

    res.status(200).json(result);
  } catch (error) {
    console.error('Dilution analysis error:', error);
    res.status(500).json({
      error: 'Failed to calculate dilution analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get investment trends
 * GET /api/v1/analytics/investment-trends/:companyId
 */
const getInvestmentTrends = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Default to last 12 months if not specified
    const timeRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date()
    };

    const result = await advancedAnalyticsService.getInvestmentTrends(companyId, timeRange);

    res.status(200).json(result);
  } catch (error) {
    console.error('Investment trends error:', error);
    res.status(500).json({
      error: 'Failed to get investment trends',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get stakeholder insights
 * GET /api/v1/analytics/stakeholder-insights/:companyId
 */
const getStakeholderInsights = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.getStakeholderInsights(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Stakeholder insights error:', error);
    res.status(500).json({
      error: 'Failed to get stakeholder insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get document analytics
 * GET /api/v1/analytics/documents/:companyId
 */
const getDocumentAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.getDocumentAnalytics(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Document analytics error:', error);
    res.status(500).json({
      error: 'Failed to get document analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get predictive insights
 * POST /api/v1/analytics/predictive-insights
 */
const getPredictiveInsights = async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.getPredictiveInsights(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Predictive insights error:', error);
    res.status(500).json({
      error: 'Failed to get predictive insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Predict investment outcome
 * POST /api/v1/analytics/predict-investment
 */
const predictInvestmentOutcome = async (req, res) => {
  try {
    const { companyId, investmentScenario } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!investmentScenario) {
      return res.status(400).json({ error: 'Investment scenario is required' });
    }

    const result = await advancedAnalyticsService.predictInvestmentOutcome(companyId, investmentScenario);

    res.status(200).json(result);
  } catch (error) {
    console.error('Investment prediction error:', error);
    res.status(500).json({
      error: 'Failed to predict investment outcome',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get time-series analysis
 * GET /api/v1/analytics/time-series/:companyId
 */
const getTimeSeriesAnalysis = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { metric } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.getTimeSeriesAnalysis(
      companyId,
      metric || 'revenue'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Time-series analysis error:', error);
    res.status(500).json({
      error: 'Failed to get time-series analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get stakeholder cohorts
 * GET /api/v1/analytics/stakeholder-cohorts/:companyId
 */
const getStakeholderCohorts = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.getStakeholderCohorts(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Stakeholder cohorts error:', error);
    res.status(500).json({
      error: 'Failed to get stakeholder cohorts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate custom report
 * POST /api/v1/analytics/custom-report
 */
const generateCustomReport = async (req, res) => {
  try {
    const { companyId, reportConfig } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!reportConfig) {
      return res.status(400).json({ error: 'Report configuration is required' });
    }

    const result = await advancedAnalyticsService.generateCustomReport(companyId, reportConfig);

    res.status(200).json(result);
  } catch (error) {
    console.error('Custom report generation error:', error);
    res.status(500).json({
      error: 'Failed to generate custom report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Forecast revenue
 * GET /api/v1/analytics/forecast/:companyId
 */
const forecastRevenue = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periods } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.forecastRevenue(
      companyId,
      parseInt(periods) || 4
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Revenue forecast error:', error);
    res.status(500).json({
      error: 'Failed to forecast revenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Find similar companies
 * GET /api/v1/analytics/similar-companies/:companyId
 */
const findSimilarCompanies = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { limit } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await advancedAnalyticsService.findSimilarPerformingCompanies(
      companyId,
      parseInt(limit) || 5
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Similar companies error:', error);
    res.status(500).json({
      error: 'Failed to find similar companies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Store analytics snapshot
 * POST /api/v1/analytics/store-snapshot
 */
const storeAnalyticsSnapshot = async (req, res) => {
  try {
    const { companyId, analyticsData } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!analyticsData) {
      return res.status(400).json({ error: 'Analytics data is required' });
    }

    const result = await advancedAnalyticsService.storeAnalyticsSnapshot(companyId, analyticsData);

    res.status(201).json(result);
  } catch (error) {
    console.error('Store snapshot error:', error);
    res.status(500).json({
      error: 'Failed to store analytics snapshot',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Batch get metrics
 * POST /api/v1/analytics/batch-metrics
 */
const batchGetMetrics = async (req, res) => {
  try {
    const { companyIds, metric } = req.body;

    if (!companyIds || companyIds.length === 0) {
      return res.status(400).json({ error: 'Company IDs are required' });
    }

    if (!metric) {
      return res.status(400).json({ error: 'Metric is required' });
    }

    const result = await advancedAnalyticsService.batchGetMetrics(companyIds, metric);

    res.status(200).json(result);
  } catch (error) {
    console.error('Batch metrics error:', error);
    res.status(500).json({
      error: 'Failed to get batch metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCapTableSummary,
  getDilutionAnalysis,
  getInvestmentTrends,
  getStakeholderInsights,
  getDocumentAnalytics,
  getPredictiveInsights,
  predictInvestmentOutcome,
  getTimeSeriesAnalysis,
  getStakeholderCohorts,
  generateCustomReport,
  forecastRevenue,
  findSimilarCompanies,
  storeAnalyticsSnapshot,
  batchGetMetrics
};
