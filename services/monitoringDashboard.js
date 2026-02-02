/**
 * MonitoringDashboard Service
 *
 * Comprehensive monitoring dashboard for ZeroDB post-migration observability
 * Provides real-time metrics, health checks, and Prometheus-compatible exports
 */

const os = require('os');
const { databaseMonitor } = require('../middleware/databaseMonitor');

class MonitoringDashboard {
  constructor(config = {}) {
    this.config = {
      collectionInterval: config.collectionInterval || 5000, // 5 seconds
      retentionPeriod: config.retentionPeriod || 3600000, // 1 hour
      ...config
    };

    this.metrics = [];
    this.syncMetrics = {
      syncLag: [],
      eventsProcessed: 0,
      eventsFailed: 0,
      deadLetterQueueSize: 0,
      circuitBreakerStatus: 'CLOSED',
      resumeTokenHealth: 'HEALTHY'
    };

    this.isRunning = false;
    this.collectionTimer = null;
    this.startTime = Date.now();
  }

  /**
   * Start metrics collection
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Collect metrics at regular intervals
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);

    console.log('MonitoringDashboard started');
  }

  /**
   * Stop metrics collection
   */
  stop() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
    this.isRunning = false;
    console.log('MonitoringDashboard stopped');
  }

  /**
   * Collect current metrics snapshot
   */
  collectMetrics() {
    const timestamp = Date.now();
    const dbMetrics = databaseMonitor.getMetrics();

    const snapshot = {
      timestamp,
      zerodb: this.calculateZeroDBMetrics(dbMetrics.zerodb),
      mongodb: this.calculateMongoDBMetrics(dbMetrics.mongodb),
      sync: this.calculateSyncMetrics(),
      system: this.calculateSystemMetrics()
    };

    this.metrics.push(snapshot);
    this.cleanup();
  }

  /**
   * Calculate ZeroDB-specific metrics
   */
  calculateZeroDBMetrics(dbMetrics) {
    const recentOps = databaseMonitor.getRecentOperations('zerodb', 1000);
    const durations = recentOps.filter(op => op.duration).map(op => op.duration);

    return {
      queryLatency: {
        p50: this.calculatePercentile(durations, 50),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        avg: dbMetrics.avg || 0,
        max: durations.length > 0 ? Math.max(...durations) : 0
      },
      throughput: {
        operationsPerSecond: this.calculateThroughput(recentOps),
        totalOperations: dbMetrics.totalOperations || 0
      },
      errorRate: dbMetrics.errorRate || 0,
      totalErrors: dbMetrics.totalErrors || 0,
      connectionPool: this.estimateConnectionPoolUsage(),
      apiTokenUsage: this.calculateAPITokenUsage(dbMetrics.rateLimit)
    };
  }

  /**
   * Calculate MongoDB-specific metrics
   */
  calculateMongoDBMetrics(dbMetrics) {
    return {
      queryLatency: {
        avg: dbMetrics.avg || 0,
        p95: dbMetrics.p95 || 0,
        p99: dbMetrics.p99 || 0
      },
      errorRate: dbMetrics.errorRate || 0,
      totalOperations: dbMetrics.totalOperations || 0,
      totalErrors: dbMetrics.totalErrors || 0
    };
  }

  /**
   * Calculate sync-specific metrics
   */
  calculateSyncMetrics() {
    const recentSyncLag = this.syncMetrics.syncLag.slice(-100);

    return {
      syncLag: {
        current: recentSyncLag.length > 0 ? recentSyncLag[recentSyncLag.length - 1].lag : 0,
        average: this.calculateAverage(recentSyncLag.map(s => s.lag)),
        max: recentSyncLag.length > 0 ? Math.max(...recentSyncLag.map(s => s.lag)) : 0
      },
      eventsProcessed: this.syncMetrics.eventsProcessed,
      eventsFailed: this.syncMetrics.eventsFailed,
      failureRate: this.syncMetrics.eventsProcessed > 0
        ? (this.syncMetrics.eventsFailed / this.syncMetrics.eventsProcessed) * 100
        : 0,
      deadLetterQueueSize: this.syncMetrics.deadLetterQueueSize,
      circuitBreakerStatus: this.syncMetrics.circuitBreakerStatus,
      resumeTokenHealth: this.syncMetrics.resumeTokenHealth
    };
  }

  /**
   * Calculate system resource metrics
   */
  calculateSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      memory: {
        used: usedMem,
        total: totalMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      uptime: process.uptime(),
      nodeVersion: process.version
    };
  }

  /**
   * Get current ZeroDB metrics
   */
  getZeroDBMetrics() {
    const dbMetrics = databaseMonitor.getMetrics();
    return this.calculateZeroDBMetrics(dbMetrics.zerodb);
  }

  /**
   * Get current sync metrics
   */
  getSyncMetrics() {
    return this.calculateSyncMetrics();
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    return this.calculateSystemMetrics();
  }

  /**
   * Get health status based on all metrics
   */
  getHealthStatus() {
    const zerodbMetrics = this.getZeroDBMetrics();
    const syncMetrics = this.getSyncMetrics();

    const checks = {
      syncLag: syncMetrics.syncLag.current < 5000 ? 'PASS' : 'WARN',
      errorRate: zerodbMetrics.errorRate < 1 ? 'PASS' : 'FAIL',
      deadLetterQueue: syncMetrics.deadLetterQueueSize < 100 ? 'PASS' : 'FAIL',
      circuitBreaker: syncMetrics.circuitBreakerStatus === 'CLOSED' ? 'PASS' : 'FAIL',
      resumeToken: syncMetrics.resumeTokenHealth === 'HEALTHY' ? 'PASS' : 'WARN'
    };

    const failCount = Object.values(checks).filter(c => c === 'FAIL').length;
    const warnCount = Object.values(checks).filter(c => c === 'WARN').length;

    let status;
    if (failCount > 0) {
      status = 'unhealthy';
    } else if (warnCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get Prometheus-compatible metrics
   */
  getPrometheusMetrics() {
    const zerodbMetrics = this.getZeroDBMetrics();
    const syncMetrics = this.getSyncMetrics();
    const systemMetrics = this.getSystemMetrics();

    let output = '';

    // ZeroDB Query Latency
    output += '# HELP zerodb_query_latency_milliseconds ZeroDB query latency in milliseconds\n';
    output += '# TYPE zerodb_query_latency_milliseconds summary\n';
    output += `zerodb_query_latency_milliseconds{quantile="0.5"} ${zerodbMetrics.queryLatency.p50}\n`;
    output += `zerodb_query_latency_milliseconds{quantile="0.95"} ${zerodbMetrics.queryLatency.p95}\n`;
    output += `zerodb_query_latency_milliseconds{quantile="0.99"} ${zerodbMetrics.queryLatency.p99}\n`;

    // ZeroDB Throughput
    output += '# HELP zerodb_operations_per_second ZeroDB operations per second\n';
    output += '# TYPE zerodb_operations_per_second gauge\n';
    output += `zerodb_operations_per_second ${zerodbMetrics.throughput.operationsPerSecond}\n`;

    // ZeroDB Error Rate
    output += '# HELP zerodb_error_rate_percent ZeroDB error rate percentage\n';
    output += '# TYPE zerodb_error_rate_percent gauge\n';
    output += `zerodb_error_rate_percent ${zerodbMetrics.errorRate}\n`;

    // Sync Lag
    output += '# HELP sync_lag_milliseconds Sync lag between MongoDB and ZeroDB in milliseconds\n';
    output += '# TYPE sync_lag_milliseconds gauge\n';
    output += `sync_lag_milliseconds ${syncMetrics.syncLag.current}\n`;

    // Events Processed
    output += '# HELP sync_events_processed_total Total sync events processed\n';
    output += '# TYPE sync_events_processed_total counter\n';
    output += `sync_events_processed_total ${syncMetrics.eventsProcessed}\n`;

    // Events Failed
    output += '# HELP sync_events_failed_total Total sync events failed\n';
    output += '# TYPE sync_events_failed_total counter\n';
    output += `sync_events_failed_total ${syncMetrics.eventsFailed}\n`;

    // Dead Letter Queue Size
    output += '# HELP dead_letter_queue_size Current dead letter queue size\n';
    output += '# TYPE dead_letter_queue_size gauge\n';
    output += `dead_letter_queue_size ${syncMetrics.deadLetterQueueSize}\n`;

    // Memory Usage
    output += '# HELP system_memory_usage_percent System memory usage percentage\n';
    output += '# TYPE system_memory_usage_percent gauge\n';
    output += `system_memory_usage_percent ${systemMetrics.memory.percentage}\n`;

    return output;
  }

  /**
   * Get time series data for a specific metric
   */
  getTimeSeries(metricPath, timeRange = 3600000) {
    const cutoff = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    return recentMetrics.map(snapshot => {
      const value = this.getNestedValue(snapshot, metricPath);
      return {
        timestamp: snapshot.timestamp,
        value: value !== undefined ? value : null
      };
    });
  }

  /**
   * Record a sync event
   */
  recordSyncEvent(event) {
    if (event.success) {
      this.syncMetrics.eventsProcessed++;
    } else {
      this.syncMetrics.eventsFailed++;
    }

    if (event.lag !== undefined) {
      this.syncMetrics.syncLag.push({
        timestamp: Date.now(),
        lag: event.lag
      });

      // Keep only recent lag measurements
      if (this.syncMetrics.syncLag.length > 1000) {
        this.syncMetrics.syncLag.shift();
      }
    }
  }

  /**
   * Update circuit breaker status
   */
  updateCircuitBreakerStatus(status) {
    const validStatuses = ['CLOSED', 'OPEN', 'HALF_OPEN'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid circuit breaker status: ${status}`);
    }
    this.syncMetrics.circuitBreakerStatus = status;
  }

  /**
   * Update dead letter queue size
   */
  updateDLQSize(size) {
    this.syncMetrics.deadLetterQueueSize = size;
  }

  /**
   * Get comprehensive monitoring summary
   */
  getSummary() {
    return {
      timestamp: Date.now(),
      health: this.getHealthStatus(),
      zerodb: this.getZeroDBMetrics(),
      sync: this.getSyncMetrics(),
      system: this.getSystemMetrics()
    };
  }

  /**
   * Cleanup old metrics
   */
  cleanup() {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  // Helper methods

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

  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateThroughput(operations) {
    if (!operations || operations.length === 0) return 0;

    const timeWindow = 60000; // 1 minute
    const cutoff = Date.now() - timeWindow;
    const recentOps = operations.filter(op =>
      op.timestamp && op.timestamp >= cutoff
    );

    return (recentOps.length / timeWindow) * 1000; // ops per second
  }

  estimateConnectionPoolUsage() {
    // This would be connected to actual connection pool metrics
    // For now, return placeholder
    return {
      active: 0,
      idle: 0,
      total: 0,
      percentage: 0
    };
  }

  calculateAPITokenUsage(rateLimit) {
    if (!rateLimit || !rateLimit.limit) {
      return {
        limit: null,
        remaining: null,
        usagePercentage: 0
      };
    }

    const used = rateLimit.limit - rateLimit.remaining;
    const usagePercentage = (used / rateLimit.limit) * 100;

    return {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      used,
      usagePercentage,
      resetAt: rateLimit.reset
    };
  }

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
}

module.exports = MonitoringDashboard;
