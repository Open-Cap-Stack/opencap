/**
 * Advanced Analytics Routes
 *
 * [Feature] Issue #31: Implement advanced analytics with ZeroDB
 * REST API routes for advanced analytics features
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const advancedAnalyticsController = require('../../controllers/advancedAnalyticsController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/analytics/cap-table/:companyId
 * @desc Get cap table summary for a company
 * @access Private
 */
router.get('/cap-table/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.getCapTableSummary);

/**
 * @route POST /api/v1/analytics/dilution
 * @desc Calculate dilution analysis for new investment
 * @access Private
 */
router.post('/dilution', hasRole(['super_admin', 'admin', 'founder', 'manager']), advancedAnalyticsController.getDilutionAnalysis);

/**
 * @route GET /api/v1/analytics/investment-trends/:companyId
 * @desc Get investment trends over time
 * @access Private
 */
router.get('/investment-trends/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.getInvestmentTrends);

/**
 * @route GET /api/v1/analytics/stakeholder-insights/:companyId
 * @desc Get stakeholder distribution and insights
 * @access Private
 */
router.get('/stakeholder-insights/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.getStakeholderInsights);

/**
 * @route GET /api/v1/analytics/documents/:companyId
 * @desc Get document analytics
 * @access Private
 */
router.get('/documents/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.getDocumentAnalytics);

/**
 * @route POST /api/v1/analytics/predictive-insights
 * @desc Get predictive insights using vector embeddings
 * @access Private
 */
router.post('/predictive-insights', hasRole(['super_admin', 'admin', 'founder', 'manager']), advancedAnalyticsController.getPredictiveInsights);

/**
 * @route POST /api/v1/analytics/predict-investment
 * @desc Predict investment outcome
 * @access Private
 */
router.post('/predict-investment', hasRole(['super_admin', 'admin', 'founder', 'manager']), advancedAnalyticsController.predictInvestmentOutcome);

/**
 * @route GET /api/v1/analytics/time-series/:companyId
 * @desc Perform time-series analysis on financial metrics
 * @access Private
 */
router.get('/time-series/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.getTimeSeriesAnalysis);

/**
 * @route GET /api/v1/analytics/stakeholder-cohorts/:companyId
 * @desc Get stakeholder cohort analysis
 * @access Private
 */
router.get('/stakeholder-cohorts/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.getStakeholderCohorts);

/**
 * @route POST /api/v1/analytics/custom-report
 * @desc Generate custom analytics report
 * @access Private
 */
router.post('/custom-report', hasRole(['super_admin', 'admin', 'founder', 'manager']), advancedAnalyticsController.generateCustomReport);

/**
 * @route GET /api/v1/analytics/forecast/:companyId
 * @desc Forecast future revenue
 * @access Private
 */
router.get('/forecast/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.forecastRevenue);

/**
 * @route GET /api/v1/analytics/similar-companies/:companyId
 * @desc Find companies with similar performance patterns
 * @access Private
 */
router.get('/similar-companies/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), advancedAnalyticsController.findSimilarCompanies);

/**
 * @route POST /api/v1/analytics/store-snapshot
 * @desc Store analytics snapshot in ZeroDB
 * @access Private
 */
router.post('/store-snapshot', hasRole(['super_admin', 'admin', 'founder', 'manager']), advancedAnalyticsController.storeAnalyticsSnapshot);

/**
 * @route POST /api/v1/analytics/batch-metrics
 * @desc Get metrics for multiple companies
 * @access Private
 */
router.post('/batch-metrics', hasRole(['super_admin', 'admin', 'founder', 'manager']), advancedAnalyticsController.batchGetMetrics);

module.exports = router;
