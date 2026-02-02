/**
 * PerformanceOptimizer Tests
 *
 * Test suite for ZeroDB performance optimization tools
 * Tests query analysis, index recommendations, and batch size optimization
 */

const PerformanceOptimizer = require('../../../services/performanceOptimizer');
const MonitoringDashboard = require('../../../services/monitoringDashboard');

describe('PerformanceOptimizer', () => {
  let performanceOptimizer;
  let monitoringDashboard;

  beforeEach(() => {
    monitoringDashboard = new MonitoringDashboard();
    performanceOptimizer = new PerformanceOptimizer(monitoringDashboard);
  });

  describe('analyzeSlowQueries', () => {
    it('should identify queries exceeding latency threshold', () => {
      const slowQueries = [
        { operation: 'queryTable', tableName: 'users', duration: 1500, filter: { status: 'active' } },
        { operation: 'queryTable', tableName: 'companies', duration: 2000, filter: { industry: 'tech' } }
      ];

      performanceOptimizer.trackQuery(slowQueries[0]);
      performanceOptimizer.trackQuery(slowQueries[1]);

      const analysis = performanceOptimizer.analyzeSlowQueries(1000);

      expect(analysis.slowQueries.length).toBe(2);
      expect(analysis.slowQueries[0].duration).toBeGreaterThan(1000);
    });

    it('should group slow queries by table', () => {
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 1500 });
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 1800 });
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'companies', duration: 2000 });

      const analysis = performanceOptimizer.analyzeSlowQueries(1000);

      expect(analysis.byTable).toHaveProperty('users');
      expect(analysis.byTable).toHaveProperty('companies');
      expect(analysis.byTable.users.count).toBe(2);
      expect(analysis.byTable.companies.count).toBe(1);
    });

    it('should calculate average duration per table', () => {
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 1000 });
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 2000 });

      const analysis = performanceOptimizer.analyzeSlowQueries(500);

      expect(analysis.byTable.users.averageDuration).toBe(1500);
    });

    it('should identify most common slow query patterns', () => {
      performanceOptimizer.trackQuery({
        operation: 'queryTable',
        tableName: 'users',
        duration: 1500,
        filter: { status: 'active' }
      });
      performanceOptimizer.trackQuery({
        operation: 'queryTable',
        tableName: 'users',
        duration: 1600,
        filter: { status: 'active' }
      });
      performanceOptimizer.trackQuery({
        operation: 'queryTable',
        tableName: 'users',
        duration: 1200,
        filter: { role: 'admin' }
      });

      const analysis = performanceOptimizer.analyzeSlowQueries(1000);

      expect(analysis.commonPatterns).toBeDefined();
      expect(analysis.commonPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('recommendIndexes', () => {
    it('should recommend indexes for frequently queried fields', () => {
      // Track multiple queries with same filter field
      for (let i = 0; i < 10; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'users',
          duration: 1500,
          filter: { email: `user${i}@example.com` }
        });
      }

      const recommendations = performanceOptimizer.recommendIndexes();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('tableName');
      expect(recommendations[0]).toHaveProperty('field');
      expect(recommendations[0]).toHaveProperty('reason');
    });

    it('should recommend compound indexes for multi-field queries', () => {
      for (let i = 0; i < 5; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'companies',
          duration: 2000,
          filter: { status: 'active', industry: 'tech' }
        });
      }

      const recommendations = performanceOptimizer.recommendIndexes();

      const compoundIndex = recommendations.find(r =>
        r.indexType === 'compound' && r.fields.length > 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should prioritize recommendations by query frequency and duration', () => {
      // High frequency, high duration
      for (let i = 0; i < 20; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'users',
          duration: 2000,
          filter: { status: 'active' }
        });
      }

      // Low frequency, low duration
      for (let i = 0; i < 2; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'logs',
          duration: 100,
          filter: { level: 'error' }
        });
      }

      const recommendations = performanceOptimizer.recommendIndexes();

      expect(recommendations[0].priority).toBeGreaterThan(recommendations[recommendations.length - 1].priority);
    });

    it('should estimate performance improvement for each recommendation', () => {
      for (let i = 0; i < 10; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'users',
          duration: 1500,
          filter: { email: `user${i}@example.com` }
        });
      }

      const recommendations = performanceOptimizer.recommendIndexes();

      expect(recommendations[0]).toHaveProperty('estimatedImprovement');
      expect(recommendations[0].estimatedImprovement).toHaveProperty('latencyReduction');
      expect(recommendations[0].estimatedImprovement).toHaveProperty('throughputIncrease');
    });
  });

  describe('optimizeBatchSize', () => {
    it('should analyze current batch performance', () => {
      // Track batch operations with different sizes
      performanceOptimizer.trackBatchOperation({ batchSize: 10, duration: 100, success: true });
      performanceOptimizer.trackBatchOperation({ batchSize: 50, duration: 300, success: true });
      performanceOptimizer.trackBatchOperation({ batchSize: 100, duration: 800, success: true });

      const analysis = performanceOptimizer.optimizeBatchSize();

      expect(analysis).toHaveProperty('currentPerformance');
      expect(analysis.currentPerformance).toHaveProperty('averageDurationPerItem');
    });

    it('should recommend optimal batch size based on latency', () => {
      // Simulate batch operations showing optimal performance at size 50
      for (let size = 10; size <= 100; size += 10) {
        const duration = size <= 50 ? size * 5 : size * 8; // Better performance up to 50
        performanceOptimizer.trackBatchOperation({ batchSize: size, duration, success: true });
      }

      const analysis = performanceOptimizer.optimizeBatchSize();

      expect(analysis).toHaveProperty('recommendedBatchSize');
      expect(analysis.recommendedBatchSize).toBeGreaterThan(0);
      expect(analysis.recommendedBatchSize).toBeLessThanOrEqual(100);
    });

    it('should consider error rates when recommending batch size', () => {
      // Large batches have higher error rates
      performanceOptimizer.trackBatchOperation({ batchSize: 10, duration: 100, success: true });
      performanceOptimizer.trackBatchOperation({ batchSize: 50, duration: 300, success: true });
      performanceOptimizer.trackBatchOperation({ batchSize: 100, duration: 500, success: false });
      performanceOptimizer.trackBatchOperation({ batchSize: 100, duration: 500, success: false });

      const analysis = performanceOptimizer.optimizeBatchSize();

      expect(analysis.recommendedBatchSize).toBeLessThan(100);
    });

    it('should provide expected performance metrics for recommendation', () => {
      performanceOptimizer.trackBatchOperation({ batchSize: 50, duration: 300, success: true });

      const analysis = performanceOptimizer.optimizeBatchSize();

      expect(analysis).toHaveProperty('expectedPerformance');
      expect(analysis.expectedPerformance).toHaveProperty('estimatedLatency');
      expect(analysis.expectedPerformance).toHaveProperty('estimatedThroughput');
    });
  });

  describe('analyzeConnectionPool', () => {
    it('should track connection pool usage over time', () => {
      performanceOptimizer.recordConnectionPoolMetrics({
        active: 5,
        idle: 10,
        total: 15,
        waiting: 2
      });

      const analysis = performanceOptimizer.analyzeConnectionPool();

      expect(analysis).toHaveProperty('currentUsage');
      expect(analysis.currentUsage.active).toBe(5);
    });

    it('should identify connection pool saturation', () => {
      // Record high usage
      performanceOptimizer.recordConnectionPoolMetrics({
        active: 18,
        idle: 2,
        total: 20,
        waiting: 5
      });

      const analysis = performanceOptimizer.analyzeConnectionPool();

      expect(analysis.status).toBe('SATURATED');
      expect(analysis.recommendations).toContain('Increase connection pool size');
    });

    it('should calculate average wait time for connections', () => {
      performanceOptimizer.recordConnectionPoolMetrics({
        active: 15,
        idle: 5,
        total: 20,
        waiting: 3,
        averageWaitTime: 150
      });

      const analysis = performanceOptimizer.analyzeConnectionPool();

      expect(analysis).toHaveProperty('averageWaitTime');
      expect(analysis.averageWaitTime).toBeGreaterThan(0);
    });
  });

  describe('suggestCachingStrategy', () => {
    it('should identify cacheable query patterns', () => {
      // Track repeated identical queries
      const query = { tableName: 'config', filter: { key: 'system_settings' } };
      for (let i = 0; i < 10; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          ...query,
          duration: 500
        });
      }

      const suggestions = performanceOptimizer.suggestCachingStrategy();

      expect(suggestions.cacheableQueries).toBeDefined();
      expect(suggestions.cacheableQueries.length).toBeGreaterThan(0);
    });

    it('should recommend cache TTL based on data volatility', () => {
      // Track queries for static data
      for (let i = 0; i < 5; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'config',
          filter: { key: 'api_settings' },
          duration: 300
        });
      }

      const suggestions = performanceOptimizer.suggestCachingStrategy();

      expect(suggestions.cacheableQueries[0]).toHaveProperty('recommendedTTL');
      expect(suggestions.cacheableQueries[0].recommendedTTL).toBeGreaterThan(0);
    });

    it('should estimate cache hit ratio and performance gain', () => {
      const query = { tableName: 'users', filter: { role: 'admin' } };
      for (let i = 0; i < 20; i++) {
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          ...query,
          duration: 800
        });
      }

      const suggestions = performanceOptimizer.suggestCachingStrategy();

      expect(suggestions.cacheableQueries[0]).toHaveProperty('estimatedHitRatio');
      expect(suggestions.cacheableQueries[0]).toHaveProperty('estimatedLatencyReduction');
    });
  });

  describe('generateOptimizationReport', () => {
    beforeEach(() => {
      // Add sample data
      performanceOptimizer.trackQuery({
        operation: 'queryTable',
        tableName: 'users',
        duration: 1500,
        filter: { status: 'active' }
      });
      performanceOptimizer.trackBatchOperation({ batchSize: 50, duration: 300, success: true });
      performanceOptimizer.recordConnectionPoolMetrics({ active: 10, idle: 10, total: 20 });
    });

    it('should generate comprehensive optimization report', () => {
      const report = performanceOptimizer.generateOptimizationReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('slowQueries');
      expect(report).toHaveProperty('indexRecommendations');
      expect(report).toHaveProperty('batchSizeOptimization');
      expect(report).toHaveProperty('connectionPoolAnalysis');
      expect(report).toHaveProperty('cachingStrategy');
    });

    it('should prioritize recommendations by impact', () => {
      const report = performanceOptimizer.generateOptimizationReport();

      expect(report).toHaveProperty('prioritizedRecommendations');
      expect(Array.isArray(report.prioritizedRecommendations)).toBe(true);

      // Check that recommendations are sorted by priority
      for (let i = 0; i < report.prioritizedRecommendations.length - 1; i++) {
        expect(report.prioritizedRecommendations[i].priority)
          .toBeGreaterThanOrEqual(report.prioritizedRecommendations[i + 1].priority);
      }
    });

    it('should include estimated total performance improvement', () => {
      const report = performanceOptimizer.generateOptimizationReport();

      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('estimatedTotalImpact');
      expect(report.summary.estimatedTotalImpact).toHaveProperty('latencyReduction');
      expect(report.summary.estimatedTotalImpact).toHaveProperty('throughputIncrease');
    });

    it('should provide implementation complexity estimates', () => {
      const report = performanceOptimizer.generateOptimizationReport();

      report.prioritizedRecommendations.forEach(rec => {
        expect(rec).toHaveProperty('complexity');
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(rec.complexity);
      });
    });
  });

  describe('analyzeQueryDistribution', () => {
    it('should identify hot tables (frequently accessed)', () => {
      for (let i = 0; i < 20; i++) {
        performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 100 });
      }
      for (let i = 0; i < 5; i++) {
        performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'logs', duration: 100 });
      }

      const distribution = performanceOptimizer.analyzeQueryDistribution();

      expect(distribution.hotTables[0].tableName).toBe('users');
      expect(distribution.hotTables[0].queryCount).toBe(20);
    });

    it('should identify temporal query patterns', () => {
      jest.useFakeTimers();
      const now = Date.now();

      // Simulate queries at different times
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = now + (hour * 3600000);
        performanceOptimizer.trackQuery({
          operation: 'queryTable',
          tableName: 'users',
          duration: 100,
          timestamp
        });
      }

      const distribution = performanceOptimizer.analyzeQueryDistribution();

      expect(distribution).toHaveProperty('temporalPatterns');
      expect(distribution.temporalPatterns).toHaveProperty('peakHours');

      jest.useRealTimers();
    });
  });

  describe('reset', () => {
    it('should clear all tracked metrics', () => {
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 1000 });
      performanceOptimizer.trackBatchOperation({ batchSize: 50, duration: 300, success: true });

      performanceOptimizer.reset();

      const slowQueries = performanceOptimizer.analyzeSlowQueries(500);
      expect(slowQueries.slowQueries.length).toBe(0);
    });
  });

  describe('exportData', () => {
    it('should export performance data for external analysis', () => {
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 1000 });

      const exportedData = performanceOptimizer.exportData();

      expect(exportedData).toHaveProperty('queries');
      expect(exportedData).toHaveProperty('batchOperations');
      expect(exportedData).toHaveProperty('connectionPoolMetrics');
    });

    it('should support JSON export format', () => {
      performanceOptimizer.trackQuery({ operation: 'queryTable', tableName: 'users', duration: 1000 });

      const json = performanceOptimizer.exportData('json');

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});
