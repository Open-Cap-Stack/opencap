/**
 * Cache Controller
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides HTTP endpoints for cache management
 */

const cacheService = require('../services/cacheService');
const queryCacheService = require('../services/queryCacheService');
const databaseMetricsService = require('../services/databaseMetricsService');

/**
 * Get cache statistics
 * GET /api/v1/cache/stats
 */
async function getStats(req, res) {
  try {
    const stats = cacheService.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: error.message
    });
  }
}

/**
 * Flush all cache
 * POST /api/v1/cache/flush
 */
async function flush(req, res) {
  try {
    // Require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to flush cache'
      });
    }

    cacheService.flush();
    res.status(200).json({
      success: true,
      message: 'Cache flushed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to flush cache',
      error: error.message
    });
  }
}

/**
 * Delete a specific cache key
 * DELETE /api/v1/cache/:key
 */
async function deleteKey(req, res) {
  try {
    const key = decodeURIComponent(req.params.key);
    const deleted = await cacheService.delete(key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Cache key not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cache key deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete cache key',
      error: error.message
    });
  }
}

/**
 * Invalidate cache by pattern
 * POST /api/v1/cache/invalidate
 */
async function invalidate(req, res) {
  try {
    const { pattern, patterns } = req.body;

    if (!pattern && !patterns) {
      return res.status(400).json({
        success: false,
        message: 'Pattern is required'
      });
    }

    let totalInvalidated = 0;

    if (patterns && Array.isArray(patterns)) {
      for (const p of patterns) {
        totalInvalidated += await cacheService.invalidate(p);
      }
    } else {
      totalInvalidated = await cacheService.invalidate(pattern);
    }

    res.status(200).json({
      success: true,
      message: 'Cache invalidated successfully',
      invalidatedCount: totalInvalidated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error.message
    });
  }
}

/**
 * Get value for specific cache key
 * GET /api/v1/cache/keys/:key
 */
async function getKey(req, res) {
  try {
    const key = decodeURIComponent(req.params.key);
    const value = await cacheService.get(key);

    res.status(200).json({
      success: true,
      data: {
        key,
        value,
        exists: value !== null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get cache key',
      error: error.message
    });
  }
}

/**
 * Set a cache key
 * POST /api/v1/cache/keys
 */
async function setKey(req, res) {
  try {
    const { key, value, ttl } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required'
      });
    }

    await cacheService.set(key, value, ttl);

    res.status(201).json({
      success: true,
      message: 'Cache key set successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to set cache key',
      error: error.message
    });
  }
}

/**
 * List all cache keys
 * GET /api/v1/cache/keys
 */
async function listKeys(req, res) {
  try {
    const { pattern, limit = '100', offset = '0' } = req.query;

    let keys = await cacheService.keys(pattern);
    const totalCount = keys.length;

    // Apply pagination
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    keys = keys.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json({
      success: true,
      data: {
        keys,
        count: totalCount,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to list cache keys',
      error: error.message
    });
  }
}

/**
 * Get query cache statistics
 * GET /api/v1/cache/query-stats
 */
async function getQueryCacheStats(req, res) {
  try {
    const stats = queryCacheService.getQueryCacheStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve query cache statistics',
      error: error.message
    });
  }
}

/**
 * Warm cache for specified queries
 * POST /api/v1/cache/warm
 */
async function warmCache(req, res) {
  try {
    // Require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to warm cache'
      });
    }

    const { queries } = req.body;

    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({
        success: false,
        message: 'Queries array is required'
      });
    }

    // Define a simple query executor (in real implementation, this would use the database adapter)
    const queryExecutor = async (query) => {
      // Placeholder - would execute actual database query
      return [];
    };

    const results = await queryCacheService.warmCache(queries, queryExecutor);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to warm cache',
      error: error.message
    });
  }
}

/**
 * Get database metrics
 * GET /api/v1/cache/metrics
 */
async function getDatabaseMetrics(req, res) {
  try {
    const metrics = databaseMetricsService.getMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve database metrics',
      error: error.message
    });
  }
}

/**
 * Generate performance report
 * GET /api/v1/cache/performance-report
 */
async function generatePerformanceReport(req, res) {
  try {
    // Require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to generate performance report'
      });
    }

    const { startTime, endTime, format } = req.query;

    const options = {};
    if (startTime) options.startTime = new Date(startTime);
    if (endTime) options.endTime = new Date(endTime);
    if (format) options.format = format;

    const report = await databaseMetricsService.generatePerformanceReport(options);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
}

/**
 * Get database health status
 * GET /api/v1/cache/health
 */
async function getDatabaseHealth(req, res) {
  try {
    const health = await databaseMetricsService.getDatabaseHealth();

    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get database health',
      error: error.message
    });
  }
}

module.exports = {
  getStats,
  flush,
  deleteKey,
  invalidate,
  getKey,
  setKey,
  listKeys,
  getQueryCacheStats,
  warmCache,
  getDatabaseMetrics,
  generatePerformanceReport,
  getDatabaseHealth
};
