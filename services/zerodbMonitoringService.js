/**
 * ZeroDBMonitoringService
 *
 * Comprehensive monitoring service for ZeroDB operations
 * Provides operation tracking, metrics collection, alerting, and query optimization
 * Designed for post-migration monitoring and optimization of ZeroDB performance
 */

class ZeroDBMonitoringService {
  constructor(config = {}) {
    this.config = {
      slowQueryThreshold: config.slowQueryThreshold || 1000,
      metricsRetentionMs: config.metricsRetentionMs || 3600000, // 1 hour
      alertCooldownMs: config.alertCooldownMs || 300000, // 5 minutes
      maxTrackedOperations: config.maxTrackedOperations || 10000,
      metricsCollectionIntervalMs: config.metricsCollectionIntervalMs || 5000,
      alertHandler: config.alertHandler || this.defaultAlertHandler.bind(this),
      alertThresholds: {
        errorRate: config.alertThresholds?.errorRate ?? 5, // 5%
        slowQueryThreshold: config.alertThresholds?.slowQueryThreshold ?? 1000,
        p99Latency: config.alertThresholds?.p99Latency ?? 2000
      }
    };

    // Operation tracking
    this.operations = [];
    this.slowQueries = [];

    // Metrics snapshots for time series
    this.metricsSnapshots = [];

    // Alert management
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.lastAlertTime = new Map();

    // State
    this.isRunning = false;
    this.collectionTimer = null;
    this.cleanupTimer = null;
    this.startTime = Date.now();
  }

  /**
   * Start the monitoring service
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Start periodic metrics collection
    this.collectionTimer = setInterval(() => {
      this.collectMetricsSnapshot();
    }, this.config.metricsCollectionIntervalMs);

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute

    console.log('ZeroDBMonitoringService started');
  }

  /**
   * Stop the monitoring service
   */
  stop() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.isRunning = false;
    console.log('ZeroDBMonitoringService stopped');
  }

  /**
   * Track a ZeroDB operation
   * @param {Object} operationData - Operation details
   */
  trackOperation(operationData) {
    const operation = {
      ...operationData,
      timestamp: operationData.timestamp || Date.now()
    };

    this.operations.push(operation);

    // Track slow queries
    const threshold = this.config.alertThresholds.slowQueryThreshold || this.config.slowQueryThreshold;
    if (operation.duration > threshold) {
      this.slowQueries.push(operation);

      // Trigger slow query alert
      if (this.config.alertHandler) {
        this.config.alertHandler({
          type: 'SLOW_QUERY',
          severity: 'WARNING',
          metric: 'queryLatency',
          value: operation.duration,
          threshold: threshold,
          tableName: operation.tableName,
          operation: operation.operation,
          message: `Slow query detected: ${operation.duration}ms on ${operation.tableName}`,
          timestamp: Date.now()
        });
      }
    }

    // Enforce max tracked operations limit
    if (this.operations.length > this.config.maxTrackedOperations) {
      this.operations.shift();
    }

    if (this.slowQueries.length > 1000) {
      this.slowQueries.shift();
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics snapshot
   */
  getMetrics() {
    const durations = this.operations.map(op => op.duration);
    const successfulOps = this.operations.filter(op => op.success);
    const failedOps = this.operations.filter(op => !op.success);

    // Calculate operations by type
    const operationsByType = {};
    this.operations.forEach(op => {
      operationsByType[op.operation] = (operationsByType[op.operation] || 0) + 1;
    });

    // Calculate operations by table
    const operationsByTable = {};
    this.operations.forEach(op => {
      operationsByTable[op.tableName] = (operationsByTable[op.tableName] || 0) + 1;
    });

    // Calculate throughput (operations per second)
    const timeWindow = 60000; // 1 minute
    const cutoff = Date.now() - timeWindow;
    const recentOps = this.operations.filter(op => op.timestamp >= cutoff);
    const throughput = (recentOps.length / timeWindow) * 1000;

    return {
      totalOperations: this.operations.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      errorRate: this.operations.length > 0
        ? (failedOps.length / this.operations.length) * 100
        : 0,
      latency: {
        average: this.calculateAverage(durations),
        p50: this.calculatePercentile(durations, 50),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        min: durations.length > 0 ? Math.min(...durations) : 0,
        max: durations.length > 0 ? Math.max(...durations) : 0
      },
      operationsByType,
      operationsByTable,
      throughput,
      timestamp: Date.now()
    };
  }

  /**
   * Get slow queries
   * @param {number} threshold - Optional custom threshold
   * @returns {Array} Slow queries
   */
  getSlowQueries(threshold = null) {
    const effectiveThreshold = threshold || this.config.slowQueryThreshold;
    return this.slowQueries.filter(q => q.duration > effectiveThreshold);
  }

  /**
   * Get recent operations
   * @param {number} limit - Maximum number of operations to return
   * @returns {Array} Recent operations
   */
  getRecentOperations(limit = 100) {
    return this.operations.slice(-limit);
  }

  /**
   * Check alerts based on current metrics
   */
  checkAlerts() {
    const metrics = this.getMetrics();
    const now = Date.now();

    // Check error rate
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      this.triggerAlert({
        type: 'ERROR_RATE_HIGH',
        severity: metrics.errorRate > 10 ? 'CRITICAL' : 'WARNING',
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        message: `Error rate is ${metrics.errorRate.toFixed(2)}% (threshold: ${this.config.alertThresholds.errorRate}%)`,
        action: 'Review ZeroDB logs and recent failed operations'
      });
    }

    // Check p99 latency
    if (metrics.latency.p99 > this.config.alertThresholds.p99Latency) {
      this.triggerAlert({
        type: 'P99_LATENCY_HIGH',
        severity: 'WARNING',
        metric: 'latency.p99',
        value: metrics.latency.p99,
        threshold: this.config.alertThresholds.p99Latency,
        message: `P99 latency is ${metrics.latency.p99.toFixed(0)}ms (threshold: ${this.config.alertThresholds.p99Latency}ms)`,
        action: 'Review slow queries and consider performance optimization'
      });
    }
  }

  /**
   * Trigger an alert with deduplication
   * @param {Object} alertData - Alert details
   */
  triggerAlert(alertData) {
    const alertType = alertData.type;
    const now = Date.now();

    // Check cooldown period
    const lastAlertTime = this.lastAlertTime.get(alertType);
    if (lastAlertTime && (now - lastAlertTime) < this.config.alertCooldownMs) {
      return; // Still in cooldown
    }

    // Check if alert already exists
    const existingAlert = this.activeAlerts.get(alertType);
    if (existingAlert && !existingAlert.resolved) {
      existingAlert.value = alertData.value;
      existingAlert.lastUpdated = now;
      existingAlert.occurrences = (existingAlert.occurrences || 1) + 1;
      return;
    }

    // Create new alert
    const alert = {
      id: this.generateAlertId(),
      ...alertData,
      timestamp: now,
      lastUpdated: now,
      resolved: false,
      occurrences: 1
    };

    this.activeAlerts.set(alertType, alert);
    this.alertHistory.push({ ...alert });
    this.lastAlertTime.set(alertType, now);

    // Call alert handler
    if (this.config.alertHandler) {
      this.config.alertHandler(alert);
    }
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get index recommendations based on query patterns
   * @returns {Array} Index recommendations
   */
  getIndexRecommendations() {
    const recommendations = [];
    const fieldFrequency = {};

    // Analyze query filters
    this.operations.forEach(op => {
      if (!op.filter || !op.tableName) return;

      const filterKeys = Object.keys(op.filter);
      filterKeys.forEach(field => {
        const key = `${op.tableName}.${field}`;
        if (!fieldFrequency[key]) {
          fieldFrequency[key] = {
            tableName: op.tableName,
            field,
            count: 0,
            totalDuration: 0
          };
        }
        fieldFrequency[key].count++;
        fieldFrequency[key].totalDuration += op.duration;
      });
    });

    // Generate recommendations
    Object.values(fieldFrequency).forEach(stat => {
      const avgDuration = stat.totalDuration / stat.count;
      const priority = (stat.count * avgDuration) / 1000;

      if (stat.count >= 3 && avgDuration > 50) {
        recommendations.push({
          tableName: stat.tableName,
          field: stat.field,
          frequency: stat.count,
          averageDuration: avgDuration,
          priority,
          reason: `Field queried ${stat.count} times with average duration ${avgDuration.toFixed(0)}ms`
        });
      }
    });

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
  }

  /**
   * Analyze slow queries
   * @returns {Object} Slow query analysis
   */
  analyzeSlowQueries() {
    const byTable = {};

    this.slowQueries.forEach(query => {
      const tableName = query.tableName;
      if (!byTable[tableName]) {
        byTable[tableName] = {
          count: 0,
          totalDuration: 0,
          queries: []
        };
      }
      byTable[tableName].count++;
      byTable[tableName].totalDuration += query.duration;
      byTable[tableName].queries.push(query);
    });

    // Calculate averages
    Object.keys(byTable).forEach(tableName => {
      byTable[tableName].averageDuration =
        byTable[tableName].totalDuration / byTable[tableName].count;
    });

    // Identify common patterns
    const commonPatterns = this.identifyCommonPatterns(this.slowQueries);

    return {
      slowQueries: this.slowQueries,
      byTable,
      commonPatterns,
      summary: {
        totalSlowQueries: this.slowQueries.length,
        affectedTables: Object.keys(byTable).length,
        averageDuration: this.slowQueries.length > 0
          ? this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length
          : 0
      }
    };
  }

  /**
   * Identify common query patterns
   * @param {Array} queries - Queries to analyze
   * @returns {Array} Common patterns
   */
  identifyCommonPatterns(queries) {
    const patterns = {};

    queries.forEach(query => {
      if (!query.filter) return;

      const filterKeys = Object.keys(query.filter).sort().join(',');
      const pattern = `${query.tableName}:${filterKeys}`;

      if (!patterns[pattern]) {
        patterns[pattern] = {
          pattern,
          tableName: query.tableName,
          filterFields: filterKeys.split(','),
          count: 0,
          totalDuration: 0
        };
      }

      patterns[pattern].count++;
      patterns[pattern].totalDuration += query.duration;
    });

    const patternArray = Object.values(patterns).map(p => ({
      ...p,
      averageDuration: p.totalDuration / p.count
    }));

    patternArray.sort((a, b) => b.count - a.count);

    return patternArray;
  }

  /**
   * Get caching recommendations
   * @returns {Object} Caching recommendations
   */
  getCachingRecommendations() {
    const cacheableQueries = [];
    const querySignatures = {};

    this.operations.forEach(op => {
      const signature = JSON.stringify({
        tableName: op.tableName,
        filter: op.filter
      });

      if (!querySignatures[signature]) {
        querySignatures[signature] = {
          query: op,
          count: 0,
          totalDuration: 0,
          timestamps: []
        };
      }

      querySignatures[signature].count++;
      querySignatures[signature].totalDuration += op.duration;
      querySignatures[signature].timestamps.push(op.timestamp);
    });

    Object.values(querySignatures).forEach(sig => {
      if (sig.count >= 3) {
        const timestamps = sig.timestamps.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        const avgInterval = intervals.length > 0
          ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length
          : 60000;

        const recommendedTTL = Math.max(1, Math.min(Math.round(avgInterval * 0.5 / 1000), 300));

        cacheableQueries.push({
          tableName: sig.query.tableName,
          filter: sig.query.filter,
          frequency: sig.count,
          averageDuration: sig.totalDuration / sig.count,
          recommendedTTL,
          estimatedHitRatio: Math.min(90, (sig.count / this.operations.length) * 100),
          estimatedLatencyReduction: (sig.totalDuration / sig.count) * 0.95
        });
      }
    });

    cacheableQueries.sort((a, b) =>
      (b.frequency * b.estimatedLatencyReduction) - (a.frequency * a.estimatedLatencyReduction)
    );

    return {
      cacheableQueries,
      summary: {
        totalCacheableQueries: cacheableQueries.length,
        estimatedCacheHitRatio: cacheableQueries.length > 0
          ? cacheableQueries.reduce((sum, q) => sum + q.estimatedHitRatio, 0) / cacheableQueries.length
          : 0
      }
    };
  }

  /**
   * Get comprehensive dashboard data
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    const metrics = this.getMetrics();

    // Calculate health status
    let healthStatus = 'healthy';
    if (metrics.errorRate > 5 || metrics.latency.p99 > 2000) {
      healthStatus = 'unhealthy';
    } else if (metrics.errorRate > 1 || metrics.latency.p99 > 1000) {
      healthStatus = 'degraded';
    }

    // Get top tables
    const topTables = Object.keys(metrics.operationsByTable)
      .map(tableName => ({
        tableName,
        operationCount: metrics.operationsByTable[tableName]
      }))
      .sort((a, b) => b.operationCount - a.operationCount)
      .slice(0, 10);

    return {
      metrics,
      health: {
        status: healthStatus,
        checks: {
          errorRate: metrics.errorRate < 5 ? 'PASS' : 'FAIL',
          latency: metrics.latency.p99 < 2000 ? 'PASS' : 'FAIL',
          throughput: metrics.throughput > 0 ? 'PASS' : 'WARN'
        },
        uptime: Date.now() - this.startTime
      },
      alerts: this.getActiveAlerts(),
      topTables,
      recentOperations: this.getRecentOperations(20),
      timestamp: Date.now()
    };
  }

  /**
   * Get time series data
   * @param {string} metricPath - Path to metric (e.g., 'latency.average')
   * @param {number} timeRange - Time range in milliseconds
   * @returns {Array} Time series data points
   */
  getTimeSeries(metricPath, timeRange = 3600000) {
    const cutoff = Date.now() - timeRange;
    return this.metricsSnapshots
      .filter(snapshot => snapshot.timestamp >= cutoff)
      .map(snapshot => ({
        timestamp: snapshot.timestamp,
        value: this.getNestedValue(snapshot.metrics, metricPath)
      }));
  }

  /**
   * Collect a metrics snapshot
   */
  collectMetricsSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      metrics: this.getMetrics()
    };

    this.metricsSnapshots.push(snapshot);

    // Limit snapshots
    if (this.metricsSnapshots.length > 1000) {
      this.metricsSnapshots.shift();
    }
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    const cutoff = Date.now() - this.config.metricsRetentionMs;

    // Cleanup operations
    this.operations = this.operations.filter(op => op.timestamp >= cutoff);

    // Cleanup slow queries
    this.slowQueries = this.slowQueries.filter(q => q.timestamp >= cutoff);

    // Cleanup metrics snapshots
    this.metricsSnapshots = this.metricsSnapshots.filter(s => s.timestamp >= cutoff);

    // Cleanup alert history
    this.alertHistory = this.alertHistory.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Reset all tracked data
   */
  reset() {
    this.operations = [];
    this.slowQueries = [];
    this.metricsSnapshots = [];
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.lastAlertTime.clear();
  }

  /**
   * Export data for external analysis
   * @param {string} format - Export format ('json' or 'object')
   * @returns {string|Object} Exported data
   */
  exportData(format = 'json') {
    const data = {
      operations: this.operations,
      slowQueries: this.slowQueries,
      metricsSnapshots: this.metricsSnapshots,
      alertHistory: this.alertHistory,
      exportedAt: Date.now()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    return data;
  }

  /**
   * Get Prometheus-compatible metrics
   * @returns {string} Prometheus format metrics
   */
  getPrometheusMetrics() {
    const metrics = this.getMetrics();
    let output = '';

    // Total operations
    output += '# HELP zerodb_operations_total Total ZeroDB operations\n';
    output += '# TYPE zerodb_operations_total counter\n';
    output += `zerodb_operations_total ${metrics.totalOperations}\n`;

    // Successful operations
    output += '# HELP zerodb_operations_success_total Successful ZeroDB operations\n';
    output += '# TYPE zerodb_operations_success_total counter\n';
    output += `zerodb_operations_success_total ${metrics.successfulOperations}\n`;

    // Failed operations
    output += '# HELP zerodb_operations_failed_total Failed ZeroDB operations\n';
    output += '# TYPE zerodb_operations_failed_total counter\n';
    output += `zerodb_operations_failed_total ${metrics.failedOperations}\n`;

    // Query latency
    output += '# HELP zerodb_query_latency_milliseconds ZeroDB query latency in milliseconds\n';
    output += '# TYPE zerodb_query_latency_milliseconds summary\n';
    output += `zerodb_query_latency_milliseconds{quantile="0.5"} ${metrics.latency.p50}\n`;
    output += `zerodb_query_latency_milliseconds{quantile="0.95"} ${metrics.latency.p95}\n`;
    output += `zerodb_query_latency_milliseconds{quantile="0.99"} ${metrics.latency.p99}\n`;
    output += `zerodb_query_latency_milliseconds_avg ${metrics.latency.average}\n`;

    // Error rate
    output += '# HELP zerodb_error_rate_percent ZeroDB error rate percentage\n';
    output += '# TYPE zerodb_error_rate_percent gauge\n';
    output += `zerodb_error_rate_percent ${metrics.errorRate}\n`;

    // Throughput
    output += '# HELP zerodb_throughput_ops_per_second ZeroDB operations per second\n';
    output += '# TYPE zerodb_throughput_ops_per_second gauge\n';
    output += `zerodb_throughput_ops_per_second ${metrics.throughput}\n`;

    // Operations by type
    output += '# HELP zerodb_operations_by_type ZeroDB operations by type\n';
    output += '# TYPE zerodb_operations_by_type counter\n';
    Object.keys(metrics.operationsByType).forEach(type => {
      output += `zerodb_operations_by_type{type="${type}"} ${metrics.operationsByType[type]}\n`;
    });

    return output;
  }

  /**
   * Create Express middleware for automatic tracking
   * @returns {Function} Express middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to track response
      res.json = (body) => {
        const duration = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 400;

        this.trackOperation({
          operation: req.method.toLowerCase(),
          tableName: req.params.tableName || 'unknown',
          duration,
          success,
          path: req.path,
          statusCode: res.statusCode
        });

        return originalJson(body);
      };

      next();
    };
  }

  /**
   * Wrap a ZeroDB operation for automatic tracking
   * @param {Function} operation - Operation function to wrap
   * @param {Object} metadata - Operation metadata
   * @returns {Function} Wrapped operation
   */
  wrapOperation(operation, metadata) {
    return async (...args) => {
      const startTime = Date.now();
      let success = true;
      let error = null;

      try {
        const result = await operation(...args);
        return result;
      } catch (err) {
        success = false;
        error = err.message;
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        this.trackOperation({
          ...metadata,
          duration,
          success,
          error,
          filter: args[0]?.filter || args[0]
        });
      }
    };
  }

  // Helper methods

  /**
   * Calculate average of values
   * @param {Array} values - Array of numbers
   * @returns {number} Average
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile of values
   * @param {Array} values - Array of numbers
   * @param {number} percentile - Percentile to calculate
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sorted[lower];

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get nested value from object
   * @param {Object} obj - Object to search
   * @param {string} path - Path to value (e.g., 'latency.average')
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Generate unique alert ID
   * @returns {string} Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Default alert handler
   * @param {Object} alert - Alert object
   */
  defaultAlertHandler(alert) {
    const severity = {
      CRITICAL: 'ERROR',
      WARNING: 'WARN',
      INFO: 'INFO'
    }[alert.severity] || 'INFO';

    console.log(`[ALERT][${severity}] ${alert.type}: ${alert.message}`);
    if (alert.action) {
      console.log(`   Recommended action: ${alert.action}`);
    }
  }
}

module.exports = ZeroDBMonitoringService;
