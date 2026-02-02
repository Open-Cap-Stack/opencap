/**
 * Sync Administration Routes
 *
 * [Feature] GitHub Issue #14: Continuous data sync implementation
 *
 * Admin API endpoints for managing bidirectional sync between MongoDB and ZeroDB:
 * - Overall sync health and status
 * - Start/stop/pause/resume sync services
 * - Trigger full resync for collections
 * - View detailed sync metrics
 * - Monitor sync queues and circuit breakers
 *
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const syncOrchestrator = require('../../services/syncOrchestrator');
const mongoChangeStreamListener = require('../../services/mongoChangeStreamListener');
const zerodbSyncService = require('../../services/zerodbSyncService');

/**
 * @swagger
 * tags:
 *   name: Sync Admin
 *   description: Bidirectional sync management between MongoDB and ZeroDB
 */

/**
 * @swagger
 * /api/v1/sync/status:
 *   get:
 *     summary: Get overall sync health and status
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orchestrator:
 *                       type: object
 *                     mongoToZerodb:
 *                       type: object
 *                     zerodbToMongo:
 *                       type: object
 *                     connections:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get('/status', async (req, res) => {
  try {
    const status = syncOrchestrator.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/health:
 *   get:
 *     summary: Get comprehensive health status for both sync directions
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/health', async (req, res) => {
  try {
    const health = syncOrchestrator.getHealthStatus();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Error getting sync health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/metrics:
 *   get:
 *     summary: Get detailed sync metrics
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = syncOrchestrator.getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting sync metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/start:
 *   post:
 *     summary: Start sync services
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync services started successfully
 *       400:
 *         description: Sync already running or disabled
 *       500:
 *         description: Server error
 */
router.post('/start', async (req, res) => {
  try {
    const result = await syncOrchestrator.start();

    res.json({
      success: true,
      data: result,
      message: 'Sync services started successfully',
    });
  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/stop:
 *   post:
 *     summary: Stop sync services
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync services stopped successfully
 *       500:
 *         description: Server error
 */
router.post('/stop', async (req, res) => {
  try {
    const result = await syncOrchestrator.stop();

    res.json({
      success: true,
      data: result,
      message: 'Sync services stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/pause:
 *   post:
 *     summary: Temporarily pause sync services
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync services paused successfully
 *       400:
 *         description: Sync not running
 *       500:
 *         description: Server error
 */
router.post('/pause', async (req, res) => {
  try {
    const result = await syncOrchestrator.pause();

    res.json({
      success: true,
      data: result,
      message: 'Sync services paused successfully',
    });
  } catch (error) {
    console.error('Error pausing sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/resume:
 *   post:
 *     summary: Resume paused sync services
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync services resumed successfully
 *       400:
 *         description: Sync not paused
 *       500:
 *         description: Server error
 */
router.post('/resume', async (req, res) => {
  try {
    const result = await syncOrchestrator.resume();

    res.json({
      success: true,
      data: result,
      message: 'Sync services resumed successfully',
    });
  } catch (error) {
    console.error('Error resuming sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/resync/{collection}:
 *   post:
 *     summary: Trigger full resync for a collection
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name to resync
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               direction:
 *                 type: string
 *                 enum: [mongo-to-zerodb, zerodb-to-mongo]
 *                 default: mongo-to-zerodb
 *     responses:
 *       200:
 *         description: Resync completed successfully
 *       400:
 *         description: Invalid collection or direction
 *       500:
 *         description: Server error
 */
router.post('/resync/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const { direction = 'mongo-to-zerodb' } = req.body;

    if (!collection) {
      return res.status(400).json({
        success: false,
        error: 'Collection name is required',
      });
    }

    if (!['mongo-to-zerodb', 'zerodb-to-mongo'].includes(direction)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync direction. Must be "mongo-to-zerodb" or "zerodb-to-mongo"',
      });
    }

    const result = await syncOrchestrator.resyncCollection(collection, direction);

    res.json({
      success: true,
      data: result,
      message: `Resync completed for collection: ${collection}`,
    });
  } catch (error) {
    console.error('Error resyncing collection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/queues:
 *   get:
 *     summary: Get sync queue depths and pending items
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue information retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/queues', async (req, res) => {
  try {
    const status = syncOrchestrator.getStatus();

    const queueInfo = {
      mongoToZerodb: {
        queueDepth: status.mongoToZerodb.queueDepth,
        syncLag: status.mongoToZerodb.syncLag,
        lastSync: status.mongoToZerodb.lastSync,
      },
      zerodbToMongo: {
        queueDepth: status.zerodbToMongo.queueDepth,
        syncLag: status.zerodbToMongo.syncLag,
        lastSync: status.zerodbToMongo.lastSync,
      },
    };

    res.json({
      success: true,
      data: queueInfo,
    });
  } catch (error) {
    console.error('Error getting queue information:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/circuit-breakers:
 *   get:
 *     summary: Get circuit breaker status for both sync directions
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Circuit breaker status retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/circuit-breakers', async (req, res) => {
  try {
    const status = syncOrchestrator.getStatus();

    const circuitBreakers = {
      mongoToZerodb: status.mongoToZerodb.circuitBreaker,
      zerodbToMongo: status.zerodbToMongo.circuitBreaker,
    };

    res.json({
      success: true,
      data: circuitBreakers,
    });
  } catch (error) {
    console.error('Error getting circuit breaker status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/change-stream/stats:
 *   get:
 *     summary: Get MongoDB change stream statistics
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Change stream statistics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/change-stream/stats', async (req, res) => {
  try {
    const stats = mongoChangeStreamListener.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting change stream stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/change-stream/dead-letter-queue:
 *   get:
 *     summary: Get dead letter queue entries from change stream
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of entries to return
 *     responses:
 *       200:
 *         description: Dead letter queue entries retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/change-stream/dead-letter-queue', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const dlq = mongoChangeStreamListener.getDeadLetterQueue(limit);

    res.json({
      success: true,
      data: {
        entries: dlq,
        total: dlq.length,
        limit,
      },
    });
  } catch (error) {
    console.error('Error getting dead letter queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/change-stream/dead-letter-queue/reprocess:
 *   post:
 *     summary: Reprocess dead letter queue entries
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limit:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Dead letter queue entries reprocessed
 *       500:
 *         description: Server error
 */
router.post('/change-stream/dead-letter-queue/reprocess', async (req, res) => {
  try {
    const limit = parseInt(req.body.limit) || 10;
    const result = await mongoChangeStreamListener.reprocessDeadLetterQueue(limit);

    res.json({
      success: true,
      data: result,
      message: `Reprocessed ${result.success} entries successfully, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('Error reprocessing dead letter queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/change-stream/restart/{collection}:
 *   post:
 *     summary: Restart change stream for a specific collection
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name
 *     responses:
 *       200:
 *         description: Change stream restarted successfully
 *       500:
 *         description: Server error
 */
router.post('/change-stream/restart/:collection', async (req, res) => {
  try {
    const { collection } = req.params;

    if (!collection) {
      return res.status(400).json({
        success: false,
        error: 'Collection name is required',
      });
    }

    await mongoChangeStreamListener.restartChangeStream(collection);

    res.json({
      success: true,
      message: `Change stream restarted for collection: ${collection}`,
    });
  } catch (error) {
    console.error('Error restarting change stream:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/sync/config:
 *   get:
 *     summary: Get current sync configuration
 *     tags: [Sync Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      enabled: process.env.ENABLE_SYNC === 'true',
      direction: process.env.SYNC_DIRECTION || 'bidirectional',
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE) || 100,
      syncInterval: parseInt(process.env.SYNC_INTERVAL_MS) || 5000,
      maxRetries: parseInt(process.env.SYNC_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.SYNC_RETRY_DELAY_MS) || 1000,
      circuitBreakerThreshold: parseInt(process.env.SYNC_CIRCUIT_BREAKER_THRESHOLD) || 5,
      circuitBreakerResetTime: parseInt(process.env.SYNC_CIRCUIT_BREAKER_RESET_MS) || 60000,
      healthCheckInterval: parseInt(process.env.SYNC_HEALTH_CHECK_INTERVAL_MS) || 30000,
      changeStream: {
        enabled: process.env.ENABLE_MONGO_CHANGESTREAM === 'true',
        collections: (process.env.SYNC_COLLECTIONS || '').split(',').filter(Boolean),
        batchSize: parseInt(process.env.CHANGESTREAM_BATCH_SIZE) || 100,
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error getting sync config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
