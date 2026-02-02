/**
 * MetricsCollector - Database Performance Monitoring Utility
 *
 * [Feature] OCAE-XXX: Setup parallel database monitoring
 *
 * Tracks query performance metrics for MongoDB and ZeroDB during migration phase.
 * Provides health status monitoring, percentile calculations, and summary statistics.
 */

class MetricsCollector {
  /**
   * Initialize MetricsCollector
   * @param {Object} options - Configuration options
   * @param {number} options.maxMetricsPerDatabase - Maximum metrics to retain per database (default: 10000)
   */
  constructor(options = {}) {
    this.maxMetricsPerDatabase = options.maxMetricsPerDatabase || 10000;
    this.metrics = {
      mongodb: [],
      zerodb: []
    };
  }

  /**
   * Track a database query execution
   * @param {string} database - Database type ('mongodb' or 'zerodb')
   * @param {string} operation - Operation type (e.g., 'find', 'insert', 'searchVectors')
   * @param {number} duration - Query duration in milliseconds
   * @param {boolean} success - Whether query succeeded
   * @param {Error} error - Error object if query failed
   * @returns {Object} Tracked metric record
   */
  trackQuery(database, operation, duration, success, error = null) {
    // Validate database type
    if (database !== 'mongodb' && database !== 'zerodb') {
      throw new Error('Invalid database type');
    }

    // Validate duration
    if (typeof duration !== 'number' || duration < 0) {
      throw new Error('Duration must be a non-negative number');
    }

    // Create metric record
    const metric = {
      database,
      operation,
      duration,
      success,
      timestamp: Date.now()
    };

    // Add error details if present
    if (error) {
      metric.error = {
        message: error.message,
        stack: error.stack
      };
    }

    // Store metric
    this.metrics[database].push(metric);

    // Enforce retention limit
    if (this.metrics[database].length > this.maxMetricsPerDatabase) {
      const excess = this.metrics[database].length - this.maxMetricsPerDatabase;
      this.metrics[database].splice(0, excess);
    }

    return metric;
  }

  /**
   * Get metrics with optional filtering
   * @param {string} database - Database type to filter by (optional)
   * @param {number} fromTimestamp - Only return metrics after this timestamp (optional)
   * @returns {Array} Filtered metrics
   */
  getMetrics(database = null, fromTimestamp = null) {
    let results = [];

    if (database) {
      // Return metrics for specific database
      results = [...this.metrics[database]];
    } else {
      // Return all metrics
      results = [...this.metrics.mongodb, ...this.metrics.zerodb];
    }

    // Apply time filter if specified
    if (fromTimestamp !== null) {
      results = results.filter(m => m.timestamp >= fromTimestamp);
    }

    return results;
  }

  /**
   * Calculate percentile value from duration array
   * @param {Array} durations - Array of duration values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number|null} Percentile value or null if empty array
   */
  calculatePercentile(durations, percentile) {
    // Validate percentile
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    // Handle empty array
    if (durations.length === 0) {
      return null;
    }

    // Handle single element
    if (durations.length === 1) {
      return durations[0];
    }

    // Sort durations
    const sorted = [...durations].sort((a, b) => a - b);

    // Calculate percentile index
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    // Linear interpolation if needed
    if (lower === upper) {
      return sorted[lower];
    }

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get health status for a database
   * @param {string} database - Database type ('mongodb' or 'zerodb')
   * @param {number} fromTimestamp - Only consider metrics after this timestamp (optional)
   * @returns {Object} Health status report
   */
  getHealthStatus(database, fromTimestamp = null) {
    // Get metrics within time window
    const metrics = this.getMetrics(database, fromTimestamp);

    // Calculate statistics
    const totalQueries = metrics.length;
    const errorCount = metrics.filter(m => !m.success).length;
    const errorRate = totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0;

    // Determine health status
    let status;
    if (errorRate < 5) {
      status = 'healthy';
    } else if (errorRate < 10) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    // Calculate response times
    const durations = metrics.map(m => m.duration);
    const averageResponseTime = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const p95ResponseTime = this.calculatePercentile(durations, 95);
    const p99ResponseTime = this.calculatePercentile(durations, 99);

    return {
      status,
      errorRate,
      totalQueries,
      errorCount,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime
    };
  }

  /**
   * Clear metrics
   * @param {string} database - Database type to clear, or clear all if not specified
   */
  clearMetrics(database = null) {
    if (database) {
      this.metrics[database] = [];
    } else {
      this.metrics.mongodb = [];
      this.metrics.zerodb = [];
    }
  }

  /**
   * Get summary statistics for a database
   * @param {string} database - Database type ('mongodb' or 'zerodb')
   * @returns {Object|null} Summary statistics or null if no metrics
   */
  getSummaryStats(database) {
    const metrics = this.getMetrics(database);

    if (metrics.length === 0) {
      return null;
    }

    // Calculate overall statistics
    const totalQueries = metrics.length;
    const successCount = metrics.filter(m => m.success).length;
    const errorCount = metrics.filter(m => !m.success).length;
    const errorRate = (errorCount / totalQueries) * 100;

    const durations = metrics.map(m => m.duration);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minResponseTime = Math.min(...durations);
    const maxResponseTime = Math.max(...durations);

    // Group by operation
    const byOperation = {};
    metrics.forEach(metric => {
      if (!byOperation[metric.operation]) {
        byOperation[metric.operation] = {
          durations: [],
          errors: 0
        };
      }
      byOperation[metric.operation].durations.push(metric.duration);
      if (!metric.success) {
        byOperation[metric.operation].errors++;
      }
    });

    // Calculate per-operation statistics
    const operationStats = {};
    Object.keys(byOperation).forEach(operation => {
      const opData = byOperation[operation];
      const opDurations = opData.durations;
      operationStats[operation] = {
        count: opDurations.length,
        averageResponseTime: opDurations.reduce((sum, d) => sum + d, 0) / opDurations.length,
        errorCount: opData.errors
      };
    });

    return {
      totalQueries,
      successCount,
      errorCount,
      errorRate,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      byOperation: operationStats
    };
  }
}

module.exports = MetricsCollector;
