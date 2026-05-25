/**
 * API Metrics Routes
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides routes for accessing API metrics, performance reports,
 * and health status based on metrics data.
 */

const express = require('express');
const router = express.Router();
const ApiMetricsController = require('../../controllers/apiMetricsController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Create controller instance
const metricsController = new ApiMetricsController();

/**
 * @swagger
 * tags:
 *   name: API Metrics
 *   description: API performance metrics and monitoring
 */

/**
 * @swagger
 * /api/v1/metrics/dashboard:
 *   get:
 *     summary: Get metrics dashboard data
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: integer
 *         description: Start time filter (Unix timestamp)
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: integer
 *         description: End time filter (Unix timestamp)
 *     responses:
 *       200:
 *         description: Dashboard metrics data
 */
router.get('/dashboard', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getDashboard);

/**
 * @swagger
 * /api/v1/metrics/report:
 *   get:
 *     summary: Get comprehensive performance report
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: integer
 *         description: Start time filter (Unix timestamp)
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: integer
 *         description: End time filter (Unix timestamp)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format
 *     responses:
 *       200:
 *         description: Performance report
 */
router.get('/report', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getPerformanceReport);

/**
 * @swagger
 * /api/v1/metrics/endpoints/{endpoint}:
 *   get:
 *     summary: Get metrics for a specific endpoint
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-encoded endpoint path
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, PATCH, DELETE]
 *         description: HTTP method filter
 *     responses:
 *       200:
 *         description: Endpoint metrics
 *       400:
 *         description: Missing endpoint parameter
 */
router.get('/endpoints/:endpoint', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getEndpointMetrics);

/**
 * @swagger
 * /api/v1/metrics/endpoints/{endpoint}/percentiles:
 *   get:
 *     summary: Get percentile data for an endpoint
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-encoded endpoint path
 *       - in: query
 *         name: percentiles
 *         schema:
 *           type: string
 *         description: Comma-separated list of percentiles (e.g., "50,75,90,95,99")
 *     responses:
 *       200:
 *         description: Percentile data
 */
router.get('/endpoints/:endpoint/percentiles', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getPercentiles);

/**
 * @swagger
 * /api/v1/metrics/endpoints/{endpoint}/histogram:
 *   get:
 *     summary: Get response time histogram for an endpoint
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-encoded endpoint path
 *       - in: query
 *         name: buckets
 *         schema:
 *           type: string
 *         description: Comma-separated bucket boundaries (e.g., "50,100,200,500,1000")
 *     responses:
 *       200:
 *         description: Histogram data
 */
router.get('/endpoints/:endpoint/histogram', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getHistogram);

/**
 * @swagger
 * /api/v1/metrics/errors:
 *   get:
 *     summary: Get error rates for all endpoints
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minErrorRate
 *         schema:
 *           type: number
 *         description: Minimum error rate filter (0-1)
 *     responses:
 *       200:
 *         description: Error rates by endpoint
 */
router.get('/errors', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getErrorRates);

/**
 * @swagger
 * /api/v1/metrics/throughput:
 *   get:
 *     summary: Get throughput data
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: windowMs
 *         schema:
 *           type: integer
 *         description: Window size in milliseconds
 *     responses:
 *       200:
 *         description: Throughput data by endpoint
 */
router.get('/throughput', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getThroughput);

/**
 * @swagger
 * /api/v1/metrics/slowest:
 *   get:
 *     summary: Get slowest endpoints
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of endpoints to return (default 10)
 *     responses:
 *       200:
 *         description: List of slowest endpoints
 */
router.get('/slowest', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getSlowestEndpoints);

/**
 * @swagger
 * /api/v1/metrics/health:
 *   get:
 *     summary: Get health status based on metrics
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.getHealthStatus);

/**
 * @swagger
 * /api/v1/metrics/reset:
 *   post:
 *     summary: Reset metrics (admin only)
 *     tags: [API Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpoint:
 *                 type: string
 *                 description: Specific endpoint to reset (optional, resets all if not provided)
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 *       403:
 *         description: Admin access required
 */
router.post('/reset', authenticateToken, hasRole(['super_admin', 'admin']), metricsController.resetMetrics);

module.exports = router;
