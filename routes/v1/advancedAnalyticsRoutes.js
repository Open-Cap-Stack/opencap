/**
 * Advanced Analytics Routes
 *
 * [Feature] Issue #31: Implement advanced analytics with ZeroDB
 * REST API routes for advanced analytics features
 */

const express = require('express');
const router = express.Router();
const advancedAnalyticsController = require('../../controllers/advancedAnalyticsController');

/**
 * @route GET /api/v1/analytics/cap-table/:companyId
 * @desc Get cap table summary for a company
 * @access Private
 */
router.get('/cap-table/:companyId', advancedAnalyticsController.getCapTableSummary);

/**
 * @route POST /api/v1/analytics/dilution
 * @desc Calculate dilution analysis for new investment
 * @access Private
 */
router.post('/dilution', advancedAnalyticsController.getDilutionAnalysis);

/**
 * @route GET /api/v1/analytics/investment-trends/:companyId
 * @desc Get investment trends over time
 * @access Private
 */
router.get('/investment-trends/:companyId', advancedAnalyticsController.getInvestmentTrends);

/**
 * @route GET /api/v1/analytics/stakeholder-insights/:companyId
 * @desc Get stakeholder distribution and insights
 * @access Private
 */
router.get('/stakeholder-insights/:companyId', advancedAnalyticsController.getStakeholderInsights);

/**
 * @route GET /api/v1/analytics/documents/:companyId
 * @desc Get document analytics
 * @access Private
 */
router.get('/documents/:companyId', advancedAnalyticsController.getDocumentAnalytics);

/**
 * @route POST /api/v1/analytics/predictive-insights
 * @desc Get predictive insights using vector embeddings
 * @access Private
 */
router.post('/predictive-insights', advancedAnalyticsController.getPredictiveInsights);

/**
 * @route POST /api/v1/analytics/predict-investment
 * @desc Predict investment outcome
 * @access Private
 */
router.post('/predict-investment', advancedAnalyticsController.predictInvestmentOutcome);

/**
 * @route GET /api/v1/analytics/time-series/:companyId
 * @desc Perform time-series analysis on financial metrics
 * @access Private
 */
router.get('/time-series/:companyId', advancedAnalyticsController.getTimeSeriesAnalysis);

/**
 * @route GET /api/v1/analytics/stakeholder-cohorts/:companyId
 * @desc Get stakeholder cohort analysis
 * @access Private
 */
router.get('/stakeholder-cohorts/:companyId', advancedAnalyticsController.getStakeholderCohorts);

/**
 * @route POST /api/v1/analytics/custom-report
 * @desc Generate custom analytics report
 * @access Private
 */
router.post('/custom-report', advancedAnalyticsController.generateCustomReport);

/**
 * @route GET /api/v1/analytics/forecast/:companyId
 * @desc Forecast future revenue
 * @access Private
 */
router.get('/forecast/:companyId', advancedAnalyticsController.forecastRevenue);

/**
 * @route GET /api/v1/analytics/similar-companies/:companyId
 * @desc Find companies with similar performance patterns
 * @access Private
 */
router.get('/similar-companies/:companyId', advancedAnalyticsController.findSimilarCompanies);

/**
 * @route POST /api/v1/analytics/store-snapshot
 * @desc Store analytics snapshot in ZeroDB
 * @access Private
 */
router.post('/store-snapshot', advancedAnalyticsController.storeAnalyticsSnapshot);

/**
 * @route POST /api/v1/analytics/batch-metrics
 * @desc Get metrics for multiple companies
 * @access Private
 */
router.post('/batch-metrics', advancedAnalyticsController.batchGetMetrics);

module.exports = router;
