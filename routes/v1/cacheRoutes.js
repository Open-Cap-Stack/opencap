/**
 * Cache Routes
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides HTTP endpoints for cache management
 */

const express = require('express');
const router = express.Router();
const cacheController = require('../../controllers/cacheController');
const { authenticateToken } = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Cache
 *   description: Cache management endpoints
 */

/**
 * @swagger
 * /api/v1/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get('/stats', authenticateToken, cacheController.getStats);

/**
 * @swagger
 * /api/v1/cache/flush:
 *   post:
 *     summary: Flush all cache (admin only)
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache flushed successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post('/flush', authenticateToken, cacheController.flush);

/**
 * @swagger
 * /api/v1/cache/invalidate:
 *   post:
 *     summary: Invalidate cache by pattern
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pattern:
 *                 type: string
 *                 description: Pattern to invalidate (supports wildcards)
 *               patterns:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Multiple patterns to invalidate
 *     responses:
 *       200:
 *         description: Cache invalidated successfully
 */
router.post('/invalidate', authenticateToken, cacheController.invalidate);

/**
 * @swagger
 * /api/v1/cache/keys:
 *   get:
 *     summary: List all cache keys
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *         description: Filter pattern
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of cache keys
 */
router.get('/keys', authenticateToken, cacheController.listKeys);

/**
 * @swagger
 * /api/v1/cache/keys:
 *   post:
 *     summary: Set a cache key
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: any
 *               ttl:
 *                 type: integer
 *                 description: Time to live in milliseconds
 *     responses:
 *       201:
 *         description: Cache key set successfully
 */
router.post('/keys', authenticateToken, cacheController.setKey);

/**
 * @swagger
 * /api/v1/cache/keys/{key}:
 *   get:
 *     summary: Get value for a specific cache key
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key (URL encoded)
 *     responses:
 *       200:
 *         description: Cache key value
 */
router.get('/keys/:key', authenticateToken, cacheController.getKey);

/**
 * @swagger
 * /api/v1/cache/keys/{key}:
 *   delete:
 *     summary: Delete a specific cache key
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key (URL encoded)
 *     responses:
 *       200:
 *         description: Cache key deleted
 *       404:
 *         description: Key not found
 */
router.delete('/keys/:key', authenticateToken, cacheController.deleteKey);

/**
 * @swagger
 * /api/v1/cache/query-stats:
 *   get:
 *     summary: Get query cache statistics
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Query cache statistics
 */
router.get('/query-stats', authenticateToken, cacheController.getQueryCacheStats);

/**
 * @swagger
 * /api/v1/cache/warm:
 *   post:
 *     summary: Warm cache for specified queries (admin only)
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queries
 *             properties:
 *               queries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     collection:
 *                       type: string
 *                     filter:
 *                       type: object
 *     responses:
 *       200:
 *         description: Cache warming results
 *       403:
 *         description: Insufficient permissions
 */
router.post('/warm', authenticateToken, cacheController.warmCache);

/**
 * @swagger
 * /api/v1/cache/metrics:
 *   get:
 *     summary: Get database metrics
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database metrics
 */
router.get('/metrics', authenticateToken, cacheController.getDatabaseMetrics);

/**
 * @swagger
 * /api/v1/cache/performance-report:
 *   get:
 *     summary: Generate performance report (admin only)
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, text]
 *           default: json
 *     responses:
 *       200:
 *         description: Performance report
 *       403:
 *         description: Insufficient permissions
 */
router.get('/performance-report', authenticateToken, cacheController.generatePerformanceReport);

/**
 * @swagger
 * /api/v1/cache/health:
 *   get:
 *     summary: Get database health status
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database is healthy
 *       503:
 *         description: Database is unhealthy
 */
router.get('/health', authenticateToken, cacheController.getDatabaseHealth);

module.exports = router;
