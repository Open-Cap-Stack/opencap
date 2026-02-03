/**
 * Financial Analytics Routes
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API routes for financial analytics features
 */

const express = require('express');
const router = express.Router();
const financialAnalyticsController = require('../../controllers/financialAnalyticsController');

/**
 * @route POST /api/v1/financial-analytics/trends
 * @desc Analyze financial trends with options
 * @access Private
 */
router.post('/trends', financialAnalyticsController.analyzeTrends);

/**
 * @route GET /api/v1/financial-analytics/trends/:companyId
 * @desc Get financial trends for a company
 * @access Private
 */
router.get('/trends/:companyId', financialAnalyticsController.getTrends);

/**
 * @route GET /api/v1/financial-analytics/ratios/:companyId
 * @desc Calculate financial ratios for a company
 * @access Private
 */
router.get('/ratios/:companyId', financialAnalyticsController.calculateRatios);

/**
 * @route POST /api/v1/financial-analytics/benchmark
 * @desc Benchmark performance with custom options
 * @access Private
 */
router.post('/benchmark', financialAnalyticsController.benchmarkPerformance);

/**
 * @route GET /api/v1/financial-analytics/benchmark/:companyId
 * @desc Get performance benchmark for a company
 * @access Private
 */
router.get('/benchmark/:companyId', financialAnalyticsController.getBenchmark);

/**
 * @route GET /api/v1/financial-analytics/summary/:companyId
 * @desc Get comprehensive financial summary for a company
 * @access Private
 */
router.get('/summary/:companyId', financialAnalyticsController.getFinancialSummary);

module.exports = router;
