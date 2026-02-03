/**
 * Database Metrics Service
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides database performance monitoring and reporting
 * Features: query time tracking, connection pool stats, health checks, performance reports
 */

class DatabaseMetricsService {
  constructor() {
    this.queryMetrics = [];
    this.maxQueryHistorySize = 1000;
    this.collectionIntervalId = null;
    this.poolStatsHistory = [];
    this.maxPoolHistorySize = 100;
    this.alertHandlers = [];
    this.thresholds = {
      slowQueryMs: 100,
      maxPoolUtilization: 90,
      maxErrorRate: 10
    };
    this.startTime = Date.now();

    // Aggregate metrics
    this.aggregateMetrics = {
      totalQueries: 0,
      totalTime: 0,
      slowCount: 0,
      errorCount: 0,
      minTime: Infinity,
      maxTime: 0,
      byOperation: {},
      byCollection: {}
    };
  }

  /**
   * Track query execution time
   * @param {Object} queryInfo - Query information
   */
  trackQueryTime(queryInfo) {
    const {
      collection,
      operation,
      executionTimeMs,
      error,
      docsExamined,
      docsReturned,
      indexUsed
    } = queryInfo;

    const entry = {
      collection,
      operation,
      executionTimeMs,
      error: error ? error.message : null,
      docsExamined,
      docsReturned,
      indexUsed,
      timestamp: new Date()
    };

    this.queryMetrics.push(entry);

    // Trim history
    if (this.queryMetrics.length > this.maxQueryHistorySize) {
      this.queryMetrics.shift();
    }

    // Update aggregates
    this.aggregateMetrics.totalQueries++;
    this.aggregateMetrics.totalTime += executionTimeMs || 0;

    if (executionTimeMs > 0) {
      if (executionTimeMs < this.aggregateMetrics.minTime) {
        this.aggregateMetrics.minTime = executionTimeMs;
      }
      if (executionTimeMs > this.aggregateMetrics.maxTime) {
        this.aggregateMetrics.maxTime = executionTimeMs;
      }
    }

    if (executionTimeMs >= this.thresholds.slowQueryMs) {
      this.aggregateMetrics.slowCount++;
      this.triggerAlert({
        type: 'slow_query',
        collection,
        operation,
        executionTimeMs,
        threshold: this.thresholds.slowQueryMs
      });
    }

    if (error) {
      this.aggregateMetrics.errorCount++;
    }

    // Update by operation
    if (operation) {
      this.aggregateMetrics.byOperation[operation] =
        (this.aggregateMetrics.byOperation[operation] || 0) + 1;
    }

    // Update by collection
    if (collection) {
      this.aggregateMetrics.byCollection[collection] =
        (this.aggregateMetrics.byCollection[collection] || 0) + 1;
    }
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Pool statistics
   */
  getConnectionPoolStats() {
    // In a real implementation, this would query the database driver
    // For now, return simulated stats
    const currentStats = {
      totalConnections: 10,
      availableConnections: 7,
      inUseConnections: 3,
      waitingRequests: 0,
      utilizationPercent: 30,
      peakConnections: 8,
      averageUtilization: 35,
      timestamp: new Date()
    };

    return currentStats;
  }

  /**
   * Collect pool stats for history tracking
   */
  collectPoolStats() {
    const stats = this.getConnectionPoolStats();
    this.poolStatsHistory.push(stats);

    if (this.poolStatsHistory.length > this.maxPoolHistorySize) {
      this.poolStatsHistory.shift();
    }

    // Check for pool utilization alert
    if (stats.utilizationPercent >= this.thresholds.maxPoolUtilization) {
      this.triggerAlert({
        type: 'high_pool_utilization',
        utilizationPercent: stats.utilizationPercent,
        threshold: this.thresholds.maxPoolUtilization
      });
    }
  }

  /**
   * Get pool stats history
   * @param {number} limit - Number of entries to return
   * @returns {Object[]} Pool stats history
   */
  getPoolStatsHistory(limit) {
    return this.poolStatsHistory.slice(-limit);
  }

  /**
   * Get database health status
   * @returns {Promise<Object>} Health status
   */
  async getDatabaseHealth() {
    const startTime = Date.now();

    // In a real implementation, this would ping the database
    // For now, return simulated health
    const latencyMs = Date.now() - startTime + 1; // Simulate 1ms latency

    const poolStats = this.getConnectionPoolStats();
    const queryStats = this.getMetrics();

    // Calculate component health
    const connectionHealth = {
      status: poolStats.availableConnections > 0 ? 'healthy' : 'unhealthy',
      available: poolStats.availableConnections,
      total: poolStats.totalConnections
    };

    const errorRate = queryStats.queries.total > 0
      ? (queryStats.queries.errorCount / queryStats.queries.total) * 100
      : 0;

    const queryHealth = {
      status: errorRate < this.thresholds.maxErrorRate ? 'healthy' : 'degraded',
      errorRate,
      slowQueryRate: queryStats.queries.total > 0
        ? (queryStats.queries.slowCount / queryStats.queries.total) * 100
        : 0
    };

    const resourceHealth = {
      status: poolStats.utilizationPercent < this.thresholds.maxPoolUtilization ? 'healthy' : 'degraded',
      poolUtilization: poolStats.utilizationPercent
    };

    // Calculate overall score (0-100)
    let score = 100;
    if (connectionHealth.status !== 'healthy') score -= 50;
    if (queryHealth.status !== 'healthy') score -= 25;
    if (resourceHealth.status !== 'healthy') score -= 25;

    // Determine overall status
    let status = 'healthy';
    if (score < 50) status = 'unhealthy';
    else if (score < 75) status = 'degraded';

    return {
      status,
      connected: connectionHealth.available > 0,
      latencyMs,
      score,
      storage: {
        usedBytes: 0, // Would be populated from actual DB
        totalBytes: 0
      },
      replication: null, // Would be populated if replication is configured
      components: {
        connection: connectionHealth,
        queryPerformance: queryHealth,
        resourceUsage: resourceHealth
      },
      checkedAt: new Date()
    };
  }

  /**
   * Generate performance report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Performance report
   */
  async generatePerformanceReport(options = {}) {
    const {
      startTime = new Date(Date.now() - 3600000), // Default: last hour
      endTime = new Date(),
      format = 'json'
    } = options;

    const metrics = this.getMetrics();
    const health = await this.getDatabaseHealth();
    const poolStats = this.getConnectionPoolStats();

    // Filter queries in time range
    const queriesInRange = this.queryMetrics.filter(q => {
      const qTime = new Date(q.timestamp).getTime();
      return qTime >= startTime.getTime() && qTime <= endTime.getTime();
    });

    // Calculate time-range specific stats
    const rangeStats = this.calculateStats(queriesInRange);

    // Get top slow queries
    const topSlowQueries = [...queriesInRange]
      .filter(q => q.executionTimeMs >= this.thresholds.slowQueryMs)
      .sort((a, b) => (b.executionTimeMs || 0) - (a.executionTimeMs || 0))
      .slice(0, 10);

    // Calculate collection stats
    const collectionStats = {};
    for (const query of queriesInRange) {
      if (!collectionStats[query.collection]) {
        collectionStats[query.collection] = {
          count: 0,
          totalTime: 0,
          errors: 0
        };
      }
      collectionStats[query.collection].count++;
      collectionStats[query.collection].totalTime += query.executionTimeMs || 0;
      if (query.error) collectionStats[query.collection].errors++;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(rangeStats, health);

    // Calculate trends
    const trends = this.calculateTrends();

    const report = {
      generatedAt: new Date(),
      period: {
        start: startTime,
        end: endTime
      },
      summary: {
        totalQueries: rangeStats.total,
        averageResponseTime: rangeStats.avgTime,
        slowQueryRate: rangeStats.total > 0
          ? (rangeStats.slowCount / rangeStats.total) * 100
          : 0,
        errorRate: rangeStats.total > 0
          ? (rangeStats.errorCount / rangeStats.total) * 100
          : 0,
        healthScore: health.score
      },
      queries: {
        total: rangeStats.total,
        averageTime: rangeStats.avgTime,
        slowQueries: rangeStats.slowCount,
        errorRate: rangeStats.total > 0
          ? (rangeStats.errorCount / rangeStats.total) * 100
          : 0
      },
      connections: poolStats,
      topSlowQueries,
      collectionStats,
      trends,
      recommendations
    };

    if (format === 'text') {
      return this.formatReportAsText(report);
    }

    return report;
  }

  /**
   * Get all collected metrics
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    const avgTime = this.aggregateMetrics.totalQueries > 0
      ? this.aggregateMetrics.totalTime / this.aggregateMetrics.totalQueries
      : 0;

    return {
      queries: {
        total: this.aggregateMetrics.totalQueries,
        averageExecutionTime: Math.round(avgTime * 100) / 100,
        slowCount: this.aggregateMetrics.slowCount,
        errorCount: this.aggregateMetrics.errorCount,
        minExecutionTime: this.aggregateMetrics.minTime === Infinity ? 0 : this.aggregateMetrics.minTime,
        maxExecutionTime: this.aggregateMetrics.maxTime,
        byOperation: this.aggregateMetrics.byOperation,
        byCollection: this.aggregateMetrics.byCollection
      },
      connections: this.getConnectionPoolStats(),
      uptime: Date.now() - this.startTime,
      collectedAt: new Date()
    };
  }

  /**
   * Get recent queries
   * @param {number} limit - Number of queries to return
   * @returns {Object[]} Recent queries
   */
  getRecentQueries(limit) {
    return this.queryMetrics.slice(-limit).reverse();
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.queryMetrics = [];
    this.poolStatsHistory = [];
    this.aggregateMetrics = {
      totalQueries: 0,
      totalTime: 0,
      slowCount: 0,
      errorCount: 0,
      minTime: Infinity,
      maxTime: 0,
      byOperation: {},
      byCollection: {}
    };
    this.startTime = Date.now();
  }

  /**
   * Start automatic metrics collection
   * @param {Object} options - Collection options
   */
  startCollection(options = {}) {
    const { intervalMs = 60000 } = options;

    if (this.collectionIntervalId) {
      return; // Already collecting
    }

    this.collectionIntervalId = setInterval(() => {
      this.collectPoolStats();
    }, intervalMs);
  }

  /**
   * Stop automatic metrics collection
   */
  stopCollection() {
    if (this.collectionIntervalId) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
    }
  }

  /**
   * Check if collection is active
   * @returns {boolean} Collection status
   */
  isCollecting() {
    return this.collectionIntervalId !== null;
  }

  /**
   * Export metrics in specified format
   * @param {string} format - Export format (prometheus, json)
   * @returns {Promise<string|Object>} Exported metrics
   */
  async exportMetrics(format) {
    const metrics = this.getMetrics();

    if (format === 'prometheus') {
      return this.formatAsPrometheus(metrics);
    }

    return metrics;
  }

  /**
   * Set alert thresholds
   * @param {Object} thresholds - Threshold values
   */
  setThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   * @returns {Object} Thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Register alert handler
   * @param {Function} handler - Alert handler function
   * @returns {Function} Function to remove handler
   */
  onAlert(handler) {
    this.alertHandlers.push(handler);
    return () => {
      const index = this.alertHandlers.indexOf(handler);
      if (index > -1) {
        this.alertHandlers.splice(index, 1);
      }
    };
  }

  // Private helper methods

  /**
   * Trigger alert to all handlers
   * @param {Object} alert - Alert data
   */
  triggerAlert(alert) {
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }

  /**
   * Calculate statistics for query array
   * @param {Object[]} queries - Query array
   * @returns {Object} Statistics
   */
  calculateStats(queries) {
    if (queries.length === 0) {
      return {
        total: 0,
        avgTime: 0,
        slowCount: 0,
        errorCount: 0
      };
    }

    let totalTime = 0;
    let slowCount = 0;
    let errorCount = 0;

    for (const q of queries) {
      totalTime += q.executionTimeMs || 0;
      if ((q.executionTimeMs || 0) >= this.thresholds.slowQueryMs) slowCount++;
      if (q.error) errorCount++;
    }

    return {
      total: queries.length,
      avgTime: Math.round((totalTime / queries.length) * 100) / 100,
      slowCount,
      errorCount
    };
  }

  /**
   * Generate recommendations based on metrics
   * @param {Object} stats - Query statistics
   * @param {Object} health - Health status
   * @returns {Object[]} Recommendations
   */
  generateRecommendations(stats, health) {
    const recommendations = [];

    // High slow query rate
    if (stats.total > 0 && (stats.slowCount / stats.total) > 0.1) {
      recommendations.push({
        type: 'performance',
        description: 'High slow query rate detected',
        action: 'Review slow queries and add appropriate indexes'
      });
    }

    // High error rate
    if (stats.total > 0 && (stats.errorCount / stats.total) > 0.05) {
      recommendations.push({
        type: 'reliability',
        description: 'High query error rate',
        action: 'Investigate and fix error causes'
      });
    }

    // Low health score
    if (health.score < 75) {
      recommendations.push({
        type: 'health',
        description: 'Database health score is below optimal',
        action: 'Review health components and address issues'
      });
    }

    return recommendations;
  }

  /**
   * Calculate performance trends
   * @returns {Object} Trends
   */
  calculateTrends() {
    // Would calculate trends from historical data
    return {
      queryVolume: 'stable',
      responseTime: 'stable'
    };
  }

  /**
   * Format metrics as Prometheus format
   * @param {Object} metrics - Metrics object
   * @returns {string} Prometheus format
   */
  formatAsPrometheus(metrics) {
    let output = '';

    output += '# HELP db_queries_total Total number of database queries\n';
    output += '# TYPE db_queries_total counter\n';
    output += `db_queries_total ${metrics.queries.total}\n\n`;

    output += '# HELP db_query_duration_seconds Query duration in seconds\n';
    output += '# TYPE db_query_duration_seconds gauge\n';
    output += `db_query_duration_seconds{stat="avg"} ${metrics.queries.averageExecutionTime / 1000}\n`;
    output += `db_query_duration_seconds{stat="min"} ${metrics.queries.minExecutionTime / 1000}\n`;
    output += `db_query_duration_seconds{stat="max"} ${metrics.queries.maxExecutionTime / 1000}\n\n`;

    output += '# HELP db_slow_queries_total Total number of slow queries\n';
    output += '# TYPE db_slow_queries_total counter\n';
    output += `db_slow_queries_total ${metrics.queries.slowCount}\n\n`;

    output += '# HELP db_query_errors_total Total number of query errors\n';
    output += '# TYPE db_query_errors_total counter\n';
    output += `db_query_errors_total ${metrics.queries.errorCount}\n`;

    return output;
  }

  /**
   * Format report as text
   * @param {Object} report - Report object
   * @returns {string} Text report
   */
  formatReportAsText(report) {
    let text = '=== Database Performance Report ===\n\n';
    text += `Generated: ${report.generatedAt}\n`;
    text += `Period: ${report.period.start} to ${report.period.end}\n\n`;
    text += '--- Summary ---\n';
    text += `Total Queries: ${report.summary.totalQueries}\n`;
    text += `Average Response Time: ${report.summary.averageResponseTime}ms\n`;
    text += `Slow Query Rate: ${report.summary.slowQueryRate.toFixed(2)}%\n`;
    text += `Error Rate: ${report.summary.errorRate.toFixed(2)}%\n`;
    text += `Health Score: ${report.summary.healthScore}/100\n`;
    return text;
  }
}

// Export singleton instance
module.exports = new DatabaseMetricsService();
