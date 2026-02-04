/**
 * Fundraising Analytics Controller
 *
 * Issue #196: Implement Fundraising Analytics Service
 * REST API endpoints for fundraising analytics features
 */

const fundraisingAnalyticsService = require('../services/fundraisingAnalyticsService');

/**
 * Get aggregated fundraising overview
 * GET /api/v1/fundraising/analytics/:companyId
 */
const getOverview = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await fundraisingAnalyticsService.getOverview(companyId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Fundraising overview error:', error);
    res.status(500).json({
      error: 'Failed to get fundraising overview',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get key fundraising metrics
 * GET /api/v1/fundraising/metrics/:companyId
 */
const getMetrics = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (req.query.period) {
      options.period = req.query.period;
    }

    const result = await fundraisingAnalyticsService.getKeyMetrics(companyId, options);
    res.status(200).json(result);
  } catch (error) {
    console.error('Fundraising metrics error:', error);
    res.status(500).json({
      error: 'Failed to get fundraising metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get fundraising timeline
 * GET /api/v1/fundraising/timeline/:companyId
 */
const getTimeline = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await fundraisingAnalyticsService.getTimeline(companyId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Fundraising timeline error:', error);
    res.status(500).json({
      error: 'Failed to get fundraising timeline',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get investor breakdown and distribution
 * GET /api/v1/fundraising/investor-breakdown/:companyId
 */
const getInvestorBreakdown = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await fundraisingAnalyticsService.getInvestorBreakdown(companyId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Investor breakdown error:', error);
    res.status(500).json({
      error: 'Failed to get investor breakdown',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get dilution history over time
 * GET /api/v1/fundraising/dilution-history/:companyId
 */
const getDilutionHistory = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await fundraisingAnalyticsService.getDilutionHistory(companyId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Dilution history error:', error);
    res.status(500).json({
      error: 'Failed to get dilution history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get industry benchmarks and comparison
 * GET /api/v1/fundraising/benchmarks/:companyId
 */
const getBenchmarks = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (req.query.industry) {
      options.industry = req.query.industry;
    }

    const result = await fundraisingAnalyticsService.getBenchmarks(companyId, options);
    res.status(200).json(result);
  } catch (error) {
    console.error('Benchmarks error:', error);
    res.status(500).json({
      error: 'Failed to get benchmarks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get fundraising projections and recommendations
 * GET /api/v1/fundraising/projections/:companyId
 */
const getProjections = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {};
    if (req.query.scenario) {
      options.scenario = req.query.scenario;
    }

    const result = await fundraisingAnalyticsService.getProjections(companyId, options);
    res.status(200).json(result);
  } catch (error) {
    console.error('Projections error:', error);
    res.status(500).json({
      error: 'Failed to get projections',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getOverview,
  getMetrics,
  getTimeline,
  getInvestorBreakdown,
  getDilutionHistory,
  getBenchmarks,
  getProjections
};
