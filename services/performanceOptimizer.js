/**
 * PerformanceOptimizer Service
 *
 * Analyzes ZeroDB performance and provides optimization recommendations
 * Includes query analysis, index recommendations, and batch size optimization
 */

class PerformanceOptimizer {
  constructor(monitoringDashboard) {
    this.monitoringDashboard = monitoringDashboard;

    this.queries = [];
    this.batchOperations = [];
    this.connectionPoolMetrics = [];

    this.maxTrackedQueries = 10000;
    this.maxTrackedBatchOps = 1000;
  }

  /**
   * Track a query for analysis
   */
  trackQuery(queryData) {
    this.queries.push({
      ...queryData,
      timestamp: queryData.timestamp || Date.now()
    });

    // Enforce limit
    if (this.queries.length > this.maxTrackedQueries) {
      this.queries.shift();
    }
  }

  /**
   * Track a batch operation for analysis
   */
  trackBatchOperation(batchData) {
    this.batchOperations.push({
      ...batchData,
      timestamp: batchData.timestamp || Date.now()
    });

    // Enforce limit
    if (this.batchOperations.length > this.maxTrackedBatchOps) {
      this.batchOperations.shift();
    }
  }

  /**
   * Record connection pool metrics
   */
  recordConnectionPoolMetrics(metrics) {
    this.connectionPoolMetrics.push({
      ...metrics,
      timestamp: Date.now()
    });

    // Keep only recent metrics (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.connectionPoolMetrics = this.connectionPoolMetrics.filter(
      m => m.timestamp >= oneHourAgo
    );
  }

  /**
   * Analyze slow queries
   */
  analyzeSlowQueries(latencyThreshold = 1000) {
    const slowQueries = this.queries.filter(q => q.duration > latencyThreshold);

    // Group by table
    const byTable = {};
    slowQueries.forEach(query => {
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
    const commonPatterns = this.identifyCommonPatterns(slowQueries);

    return {
      slowQueries,
      byTable,
      commonPatterns,
      summary: {
        totalSlowQueries: slowQueries.length,
        affectedTables: Object.keys(byTable).length,
        averageDuration: slowQueries.length > 0
          ? slowQueries.reduce((sum, q) => sum + q.duration, 0) / slowQueries.length
          : 0
      }
    };
  }

  /**
   * Identify common query patterns
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

    // Convert to array and calculate averages
    const patternArray = Object.values(patterns).map(p => ({
      ...p,
      averageDuration: p.totalDuration / p.count
    }));

    // Sort by frequency
    patternArray.sort((a, b) => b.count - a.count);

    return patternArray;
  }

  /**
   * Recommend indexes based on query patterns
   */
  recommendIndexes() {
    const recommendations = [];
    const fieldFrequency = {};

    // Analyze query filters
    this.queries.forEach(query => {
      if (!query.filter || !query.tableName) return;

      const tableName = query.tableName;
      const filterKeys = Object.keys(query.filter);

      // Track single field frequency
      filterKeys.forEach(field => {
        const key = `${tableName}.${field}`;
        if (!fieldFrequency[key]) {
          fieldFrequency[key] = {
            tableName,
            field,
            count: 0,
            totalDuration: 0,
            durations: []
          };
        }
        fieldFrequency[key].count++;
        fieldFrequency[key].totalDuration += query.duration;
        fieldFrequency[key].durations.push(query.duration);
      });

      // Track compound indexes for multi-field queries
      if (filterKeys.length > 1) {
        const compoundKey = `${tableName}.${filterKeys.sort().join('+')}`;
        if (!fieldFrequency[compoundKey]) {
          fieldFrequency[compoundKey] = {
            tableName,
            fields: filterKeys,
            indexType: 'compound',
            count: 0,
            totalDuration: 0,
            durations: []
          };
        }
        fieldFrequency[compoundKey].count++;
        fieldFrequency[compoundKey].totalDuration += query.duration;
        fieldFrequency[compoundKey].durations.push(query.duration);
      }
    });

    // Generate recommendations
    Object.values(fieldFrequency).forEach(stat => {
      const avgDuration = stat.totalDuration / stat.count;
      const frequency = stat.count;

      // Calculate priority (based on frequency and duration)
      const priority = (frequency * avgDuration) / 1000;

      if (frequency >= 5 && avgDuration > 500) {
        recommendations.push({
          tableName: stat.tableName,
          field: stat.field,
          fields: stat.fields,
          indexType: stat.indexType || 'single',
          frequency,
          averageDuration: avgDuration,
          priority,
          reason: `Field queried ${frequency} times with average duration ${avgDuration.toFixed(0)}ms`,
          estimatedImprovement: {
            latencyReduction: Math.min(80, avgDuration * 0.7), // Estimate 70% reduction
            throughputIncrease: 30 // Estimate 30% increase
          }
        });
      }
    });

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
  }

  /**
   * Optimize batch size
   */
  optimizeBatchSize() {
    if (this.batchOperations.length === 0) {
      return {
        currentPerformance: null,
        recommendedBatchSize: 50,
        reason: 'Insufficient data for optimization'
      };
    }

    // Calculate performance metrics per batch size
    const performanceBySize = {};

    this.batchOperations.forEach(batch => {
      const size = batch.batchSize;
      if (!performanceBySize[size]) {
        performanceBySize[size] = {
          totalDuration: 0,
          count: 0,
          successCount: 0,
          failureCount: 0
        };
      }

      performanceBySize[size].totalDuration += batch.duration;
      performanceBySize[size].count++;

      if (batch.success) {
        performanceBySize[size].successCount++;
      } else {
        performanceBySize[size].failureCount++;
      }
    });

    // Calculate metrics
    const sizeMetrics = Object.keys(performanceBySize).map(size => {
      const stats = performanceBySize[size];
      return {
        batchSize: parseInt(size),
        averageDuration: stats.totalDuration / stats.count,
        durationPerItem: (stats.totalDuration / stats.count) / parseInt(size),
        successRate: (stats.successCount / stats.count) * 100,
        count: stats.count
      };
    });

    // Find optimal size (lowest duration per item with high success rate)
    const viableSizes = sizeMetrics.filter(m => m.successRate >= 95);

    let recommendedBatchSize = 50;
    if (viableSizes.length > 0) {
      viableSizes.sort((a, b) => a.durationPerItem - b.durationPerItem);
      recommendedBatchSize = viableSizes[0].batchSize;
    }

    // Calculate current performance
    const totalBatches = this.batchOperations.length;
    const successfulBatches = this.batchOperations.filter(b => b.success).length;
    const totalDuration = this.batchOperations.reduce((sum, b) => sum + b.duration, 0);
    const totalItems = this.batchOperations.reduce((sum, b) => sum + b.batchSize, 0);

    return {
      currentPerformance: {
        totalBatches,
        successRate: (successfulBatches / totalBatches) * 100,
        averageDuration: totalDuration / totalBatches,
        averageDurationPerItem: totalDuration / totalItems
      },
      recommendedBatchSize,
      sizeAnalysis: sizeMetrics,
      reason: `Optimal batch size based on ${totalBatches} operations analyzed`,
      expectedPerformance: {
        estimatedLatency: viableSizes.length > 0 ? viableSizes[0].averageDuration : null,
        estimatedThroughput: viableSizes.length > 0
          ? (1000 / viableSizes[0].averageDuration) * viableSizes[0].batchSize
          : null
      }
    };
  }

  /**
   * Analyze connection pool usage
   */
  analyzeConnectionPool() {
    if (this.connectionPoolMetrics.length === 0) {
      return {
        status: 'NO_DATA',
        currentUsage: null,
        recommendations: ['No connection pool data available']
      };
    }

    const latest = this.connectionPoolMetrics[this.connectionPoolMetrics.length - 1];
    const averageActive = this.connectionPoolMetrics.reduce((sum, m) => sum + m.active, 0) / this.connectionPoolMetrics.length;
    const averageWaiting = this.connectionPoolMetrics.reduce((sum, m) => sum + (m.waiting || 0), 0) / this.connectionPoolMetrics.length;

    const usagePercentage = (latest.active / latest.total) * 100;

    let status;
    const recommendations = [];

    if (usagePercentage > 90 || averageWaiting > 2) {
      status = 'SATURATED';
      recommendations.push('Increase connection pool size');
      recommendations.push('Review long-running queries');
      recommendations.push('Implement connection pooling optimization');
    } else if (usagePercentage > 70) {
      status = 'HIGH';
      recommendations.push('Monitor closely for saturation');
      recommendations.push('Consider scaling connection pool');
    } else {
      status = 'HEALTHY';
      recommendations.push('Connection pool usage is within acceptable limits');
    }

    return {
      status,
      currentUsage: latest,
      averageMetrics: {
        averageActive,
        averageWaiting,
        averageUsagePercentage: (averageActive / latest.total) * 100
      },
      averageWaitTime: this.connectionPoolMetrics.reduce((sum, m) => sum + (m.averageWaitTime || 0), 0) / this.connectionPoolMetrics.length,
      recommendations
    };
  }

  /**
   * Suggest caching strategy
   */
  suggestCachingStrategy() {
    const cacheableQueries = [];
    const querySignatures = {};

    // Identify repeated queries
    this.queries.forEach(query => {
      const signature = JSON.stringify({
        tableName: query.tableName,
        filter: query.filter
      });

      if (!querySignatures[signature]) {
        querySignatures[signature] = {
          query,
          count: 0,
          totalDuration: 0,
          timestamps: []
        };
      }

      querySignatures[signature].count++;
      querySignatures[signature].totalDuration += query.duration;
      querySignatures[signature].timestamps.push(query.timestamp);
    });

    // Analyze cacheable queries
    Object.values(querySignatures).forEach(sig => {
      if (sig.count >= 3) {
        // Calculate query interval
        const timestamps = sig.timestamps.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

        // Recommend TTL based on query frequency
        const recommendedTTL = Math.min(avgInterval * 0.5, 300000); // Max 5 minutes

        cacheableQueries.push({
          tableName: sig.query.tableName,
          filter: sig.query.filter,
          frequency: sig.count,
          averageDuration: sig.totalDuration / sig.count,
          recommendedTTL: Math.round(recommendedTTL / 1000), // Convert to seconds
          estimatedHitRatio: Math.min(90, (sig.count / this.queries.length) * 100),
          estimatedLatencyReduction: (sig.totalDuration / sig.count) * 0.95 // Assume 95% reduction
        });
      }
    });

    // Sort by potential impact
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
   * Analyze query distribution
   */
  analyzeQueryDistribution() {
    const tableFrequency = {};
    const hourlyDistribution = new Array(24).fill(0);

    this.queries.forEach(query => {
      // Count by table
      const tableName = query.tableName;
      if (!tableFrequency[tableName]) {
        tableFrequency[tableName] = 0;
      }
      tableFrequency[tableName]++;

      // Temporal distribution
      const hour = new Date(query.timestamp).getHours();
      hourlyDistribution[hour]++;
    });

    const hotTables = Object.keys(tableFrequency).map(tableName => ({
      tableName,
      queryCount: tableFrequency[tableName],
      percentage: (tableFrequency[tableName] / this.queries.length) * 100
    }));

    hotTables.sort((a, b) => b.queryCount - a.queryCount);

    // Find peak hours
    const maxQueriesPerHour = Math.max(...hourlyDistribution);
    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count >= maxQueriesPerHour * 0.8)
      .map(h => h.hour);

    return {
      hotTables,
      temporalPatterns: {
        hourlyDistribution,
        peakHours,
        averageQueriesPerHour: hourlyDistribution.reduce((sum, c) => sum + c, 0) / 24
      }
    };
  }

  /**
   * Generate comprehensive optimization report
   */
  generateOptimizationReport() {
    const slowQueries = this.analyzeSlowQueries();
    const indexRecommendations = this.recommendIndexes();
    const batchSizeOptimization = this.optimizeBatchSize();
    const connectionPoolAnalysis = this.analyzeConnectionPool();
    const cachingStrategy = this.suggestCachingStrategy();
    const queryDistribution = this.analyzeQueryDistribution();

    // Prioritize all recommendations
    const prioritizedRecommendations = [];

    // Add index recommendations
    indexRecommendations.forEach(rec => {
      prioritizedRecommendations.push({
        type: 'INDEX',
        priority: rec.priority,
        complexity: 'LOW',
        ...rec
      });
    });

    // Add batch size recommendation
    if (batchSizeOptimization.currentPerformance) {
      prioritizedRecommendations.push({
        type: 'BATCH_SIZE',
        priority: 50,
        complexity: 'LOW',
        recommendation: `Use batch size of ${batchSizeOptimization.recommendedBatchSize}`,
        ...batchSizeOptimization
      });
    }

    // Add caching recommendations
    cachingStrategy.cacheableQueries.slice(0, 5).forEach(cq => {
      prioritizedRecommendations.push({
        type: 'CACHING',
        priority: cq.frequency * cq.estimatedLatencyReduction / 100,
        complexity: 'MEDIUM',
        ...cq
      });
    });

    // Add connection pool recommendations
    if (connectionPoolAnalysis.status === 'SATURATED') {
      prioritizedRecommendations.push({
        type: 'CONNECTION_POOL',
        priority: 100,
        complexity: 'MEDIUM',
        ...connectionPoolAnalysis
      });
    }

    // Sort by priority
    prioritizedRecommendations.sort((a, b) => b.priority - a.priority);

    // Calculate total impact
    const totalLatencyReduction = indexRecommendations.reduce(
      (sum, rec) => sum + (rec.estimatedImprovement?.latencyReduction || 0), 0
    );
    const totalThroughputIncrease = indexRecommendations.reduce(
      (sum, rec) => sum + (rec.estimatedImprovement?.throughputIncrease || 0), 0
    );

    return {
      timestamp: Date.now(),
      slowQueries,
      indexRecommendations,
      batchSizeOptimization,
      connectionPoolAnalysis,
      cachingStrategy,
      queryDistribution,
      prioritizedRecommendations,
      summary: {
        totalRecommendations: prioritizedRecommendations.length,
        estimatedTotalImpact: {
          latencyReduction: totalLatencyReduction,
          throughputIncrease: totalThroughputIncrease
        }
      }
    };
  }

  /**
   * Reset all tracked data
   */
  reset() {
    this.queries = [];
    this.batchOperations = [];
    this.connectionPoolMetrics = [];
  }

  /**
   * Export data for external analysis
   */
  exportData(format = 'json') {
    const data = {
      queries: this.queries,
      batchOperations: this.batchOperations,
      connectionPoolMetrics: this.connectionPoolMetrics,
      exportedAt: Date.now()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    return data;
  }
}

module.exports = PerformanceOptimizer;
