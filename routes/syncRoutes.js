/**
 * ZeroDB Sync API Routes
 *
 * Provides REST endpoints for managing and monitoring bidirectional sync
 * between ZeroDB and MongoDB
 */

const express = require('express');
const router = express.Router();
const zerodbSyncService = require('../services/zerodbSyncService');

/**
 * @route   GET /api/sync/health
 * @desc    Get comprehensive health status of all active syncs
 * @access  Public (should be protected in production)
 */
router.get('/health', async (req, res) => {
  try {
    const health = await zerodbSyncService.getHealthStatus();

    // Determine overall health
    const overallHealthy = health.tables.every(table => table.isHealthy);
    const statusCode = overallHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      healthy: overallHealthy,
      data: health
    });
  } catch (error) {
    console.error('Error getting sync health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync health status',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/sync/metrics
 * @desc    Get current sync metrics
 * @access  Public
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = zerodbSyncService.getMetrics();

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting sync metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync metrics',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/sync/audit/:tableName
 * @desc    Get audit logs for a specific table
 * @access  Public
 */
router.get('/audit/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const {
      status,
      startDate,
      endDate,
      limit = 100,
      skip = 0
    } = req.query;

    const options = {
      status,
      startDate,
      endDate,
      limit: parseInt(limit),
      skip: parseInt(skip)
    };

    const result = await zerodbSyncService.getAuditLogs(tableName, options);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/sync/start
 * @desc    Start syncing a ZeroDB table to MongoDB
 * @access  Admin only (should be protected)
 */
router.post('/start', async (req, res) => {
  try {
    const { tableName, modelName, options } = req.body;

    if (!tableName || !modelName) {
      return res.status(400).json({
        success: false,
        error: 'tableName and modelName are required'
      });
    }

    await zerodbSyncService.startSync(tableName, modelName, options || {});

    res.status(200).json({
      success: true,
      message: `Started sync for table: ${tableName} -> model: ${modelName}`,
      tableName,
      modelName
    });
  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start sync',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/sync/stop
 * @desc    Stop syncing a specific table
 * @access  Admin only
 */
router.post('/stop', async (req, res) => {
  try {
    const { tableName } = req.body;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: 'tableName is required'
      });
    }

    await zerodbSyncService.stopSync(tableName);

    res.status(200).json({
      success: true,
      message: `Stopped sync for table: ${tableName}`
    });
  } catch (error) {
    console.error('Error stopping sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop sync',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/sync/stop-all
 * @desc    Stop all active syncs
 * @access  Admin only
 */
router.post('/stop-all', async (req, res) => {
  try {
    await zerodbSyncService.stopAllSyncs();

    res.status(200).json({
      success: true,
      message: 'Stopped all active syncs'
    });
  } catch (error) {
    console.error('Error stopping all syncs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop all syncs',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/sync/metrics/reset
 * @desc    Reset sync metrics to zero
 * @access  Admin only
 */
router.post('/metrics/reset', async (req, res) => {
  try {
    zerodbSyncService.resetMetrics();

    res.status(200).json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/sync/custom-strategy
 * @desc    Register a custom merge strategy for a model
 * @access  Admin only
 * @note    This is typically done in code, not via API
 */
router.post('/custom-strategy', async (req, res) => {
  try {
    const { modelName, strategyName } = req.body;

    if (!modelName || !strategyName) {
      return res.status(400).json({
        success: false,
        error: 'modelName and strategyName are required'
      });
    }

    // Note: Custom strategies are typically registered in code
    // This endpoint is for documentation purposes
    res.status(200).json({
      success: true,
      message: 'Custom strategy registration should be done in application code',
      example: `
        zerodbSyncService.registerCustomMergeStrategy('${modelName}', async (mongoData, zerodbData) => {
          return { ...mongoData, ...zerodbData };
        });
      `
    });
  } catch (error) {
    console.error('Error with custom strategy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process custom strategy request',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/sync/status
 * @desc    Get simple sync status (lightweight health check)
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        enabled: zerodbSyncService.enabled,
        initialized: zerodbSyncService.initialized,
        activeSyncs: zerodbSyncService.syncIntervals.size,
        pollInterval: zerodbSyncService.pollInterval,
        conflictStrategy: zerodbSyncService.conflictStrategy
      }
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync status',
      message: error.message
    });
  }
});

module.exports = router;
