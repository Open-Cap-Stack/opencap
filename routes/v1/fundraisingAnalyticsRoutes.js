/**
 * Fundraising Analytics Routes
 *
 * Issue #196: Implement Fundraising Analytics Service
 * Issue #252: Fix Fundraising Model Page 401 Unauthorized Error
 * API endpoints for fundraising analytics features
 */

const express = require('express');
const router = express.Router();
const fundraisingAnalyticsController = require('../../controllers/fundraisingAnalyticsController');
const { authenticate } = require('../../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/fundraising/analytics/:companyId
 * @desc    Get aggregated fundraising overview
 * @access  Private
 */
router.get('/analytics/:companyId', fundraisingAnalyticsController.getOverview);

/**
 * @route   GET /api/v1/fundraising/metrics/:companyId
 * @desc    Get key fundraising metrics
 * @access  Private
 */
router.get('/metrics/:companyId', fundraisingAnalyticsController.getMetrics);

/**
 * @route   GET /api/v1/fundraising/timeline/:companyId
 * @desc    Get fundraising timeline
 * @access  Private
 */
router.get('/timeline/:companyId', fundraisingAnalyticsController.getTimeline);

/**
 * @route   GET /api/v1/fundraising/investor-breakdown/:companyId
 * @desc    Get investor distribution analytics
 * @access  Private
 */
router.get('/investor-breakdown/:companyId', fundraisingAnalyticsController.getInvestorBreakdown);

/**
 * @route   GET /api/v1/fundraising/dilution-history/:companyId
 * @desc    Get dilution history over time
 * @access  Private
 */
router.get('/dilution-history/:companyId', fundraisingAnalyticsController.getDilutionHistory);

/**
 * @route   GET /api/v1/fundraising/benchmarks/:companyId
 * @desc    Get industry benchmarks and comparison
 * @access  Private
 */
router.get('/benchmarks/:companyId', fundraisingAnalyticsController.getBenchmarks);

/**
 * @route   GET /api/v1/fundraising/projections/:companyId
 * @desc    Get fundraising projections and recommendations
 * @access  Private
 */
router.get('/projections/:companyId', fundraisingAnalyticsController.getProjections);

module.exports = router;
