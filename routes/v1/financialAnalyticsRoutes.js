/**
 * Financial Analytics Routes
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API routes for financial analytics features
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const financialAnalyticsController = require('../../controllers/financialAnalyticsController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/financial-analytics/trends
 * @desc Analyze financial trends with options
 * @access Private
 */
router.post('/trends', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialAnalyticsController.analyzeTrends);

/**
 * @route GET /api/v1/financial-analytics/trends/:companyId
 * @desc Get financial trends for a company
 * @access Private
 */
router.get('/trends/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialAnalyticsController.getTrends);

/**
 * @route GET /api/v1/financial-analytics/ratios/:companyId
 * @desc Calculate financial ratios for a company
 * @access Private
 */
router.get('/ratios/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialAnalyticsController.calculateRatios);

/**
 * @route POST /api/v1/financial-analytics/benchmark
 * @desc Benchmark performance with custom options
 * @access Private
 */
router.post('/benchmark', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialAnalyticsController.benchmarkPerformance);

/**
 * @route GET /api/v1/financial-analytics/benchmark/:companyId
 * @desc Get performance benchmark for a company
 * @access Private
 */
router.get('/benchmark/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialAnalyticsController.getBenchmark);

/**
 * @route GET /api/v1/financial-analytics/summary/:companyId
 * @desc Get comprehensive financial summary for a company
 * @access Private
 */
router.get('/summary/:companyId', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialAnalyticsController.getFinancialSummary);

module.exports = router;
