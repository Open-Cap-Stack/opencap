/**
 * MetricsCollector Unit Tests
 *
 * [Feature] OCAE-XXX: Setup parallel database monitoring
 *
 * Tests for the MetricsCollector utility that tracks performance metrics
 * for both MongoDB and ZeroDB operations during migration phase.
 */

const MetricsCollector = require('../../utils/metricsCollector');

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('trackQuery', () => {
    it('should track successful MongoDB query execution time', () => {
      const result = collector.trackQuery('mongodb', 'find', 45.5, true);

      expect(result).toBeDefined();
      expect(result.database).toBe('mongodb');
      expect(result.operation).toBe('find');
      expect(result.duration).toBe(45.5);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should track failed ZeroDB query with error details', () => {
      const error = new Error('Connection timeout');
      const result = collector.trackQuery('zerodb', 'searchVectors', 30005, false, error);

      expect(result).toBeDefined();
      expect(result.database).toBe('zerodb');
      expect(result.operation).toBe('searchVectors');
      expect(result.duration).toBe(30005);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Connection timeout');
    });

    it('should throw error for invalid database type', () => {
      expect(() => {
        collector.trackQuery('invalid-db', 'find', 10, true);
      }).toThrow('Invalid database type');
    });

    it('should throw error for negative duration', () => {
      expect(() => {
        collector.trackQuery('mongodb', 'find', -10, true);
      }).toThrow('Duration must be a non-negative number');
    });

    it('should store query metrics internally', () => {
      collector.trackQuery('mongodb', 'find', 45.5, true);
      collector.trackQuery('mongodb', 'insert', 32.1, true);

      const metrics = collector.getMetrics('mongodb');
      expect(metrics.length).toBe(2);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Add some test data
      collector.trackQuery('mongodb', 'find', 45.5, true);
      collector.trackQuery('mongodb', 'insert', 32.1, true);
      collector.trackQuery('zerodb', 'searchVectors', 120.3, true);
    });

    it('should return metrics for MongoDB only', () => {
      const metrics = collector.getMetrics('mongodb');

      expect(metrics.length).toBe(2);
      expect(metrics.every(m => m.database === 'mongodb')).toBe(true);
    });

    it('should return metrics for ZeroDB only', () => {
      const metrics = collector.getMetrics('zerodb');

      expect(metrics.length).toBe(1);
      expect(metrics[0].database).toBe('zerodb');
    });

    it('should return all metrics when database not specified', () => {
      const metrics = collector.getMetrics();

      expect(metrics.length).toBe(3);
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);

      const metrics = collector.getMetrics('mongodb', oneHourAgo);

      expect(metrics.length).toBe(2);
      expect(metrics.every(m => m.timestamp >= oneHourAgo)).toBe(true);
    });

    it('should return empty array when no metrics exist for database', () => {
      const emptyCollector = new MetricsCollector();
      const metrics = emptyCollector.getMetrics('mongodb');

      expect(metrics).toEqual([]);
    });

    it('should return empty array when time range excludes all metrics', () => {
      const futureTime = Date.now() + 1000000;
      const metrics = collector.getMetrics('mongodb', futureTime);

      expect(metrics).toEqual([]);
    });
  });

  describe('calculatePercentiles', () => {
    it('should calculate p95 percentile correctly for sorted data', () => {
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const p95 = collector.calculatePercentile(durations, 95);

      // Linear interpolation: index=8.55, 90*0.45 + 100*0.55 = 95.5
      expect(p95).toBe(95.5);
    });

    it('should calculate p99 percentile correctly for sorted data', () => {
      const durations = Array.from({ length: 100 }, (_, i) => i + 1);
      const p99 = collector.calculatePercentile(durations, 99);

      // Linear interpolation: index=98.01, 99*0.99 + 100*0.01 = 99.01
      expect(p99).toBeCloseTo(99.01, 1);
    });

    it('should handle unsorted data', () => {
      const durations = [100, 30, 70, 20, 90, 10, 60, 40, 80, 50];
      const p95 = collector.calculatePercentile(durations, 95);

      // Same as sorted: 95.5
      expect(p95).toBe(95.5);
    });

    it('should return null for empty array', () => {
      const p95 = collector.calculatePercentile([], 95);

      expect(p95).toBeNull();
    });

    it('should return single value for single-element array', () => {
      const p95 = collector.calculatePercentile([42], 95);

      expect(p95).toBe(42);
    });

    it('should throw error for invalid percentile value', () => {
      expect(() => {
        collector.calculatePercentile([10, 20, 30], 101);
      }).toThrow('Percentile must be between 0 and 100');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when error rate is low (< 5%)', () => {
      // Add 95 successful queries and 4 failed
      for (let i = 0; i < 95; i++) {
        collector.trackQuery('mongodb', 'find', 10, true);
      }
      for (let i = 0; i < 4; i++) {
        collector.trackQuery('mongodb', 'find', 10, false, new Error('Test error'));
      }

      const health = collector.getHealthStatus('mongodb');

      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBeLessThan(5);
      expect(health.totalQueries).toBe(99);
      expect(health.errorCount).toBe(4);
    });

    it('should return degraded status when error rate is elevated (5-10%)', () => {
      // Add 90 successful queries and 8 failed (8.8% error rate)
      for (let i = 0; i < 90; i++) {
        collector.trackQuery('mongodb', 'find', 10, true);
      }
      for (let i = 0; i < 8; i++) {
        collector.trackQuery('mongodb', 'find', 10, false, new Error('Test error'));
      }

      const health = collector.getHealthStatus('mongodb');

      expect(health.status).toBe('degraded');
      expect(health.errorRate).toBeGreaterThanOrEqual(5);
      expect(health.errorRate).toBeLessThan(10);
    });

    it('should return unhealthy status when error rate is high (>= 10%)', () => {
      // Add 80 successful queries and 20 failed (20% error rate)
      for (let i = 0; i < 80; i++) {
        collector.trackQuery('mongodb', 'find', 10, true);
      }
      for (let i = 0; i < 20; i++) {
        collector.trackQuery('mongodb', 'find', 10, false, new Error('Test error'));
      }

      const health = collector.getHealthStatus('mongodb');

      expect(health.status).toBe('unhealthy');
      expect(health.errorRate).toBeGreaterThanOrEqual(10);
    });

    it('should return healthy status with 0% error rate when no queries', () => {
      const health = collector.getHealthStatus('mongodb');

      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBe(0);
      expect(health.totalQueries).toBe(0);
      expect(health.errorCount).toBe(0);
    });

    it('should calculate health status within time window', () => {
      // All queries get current timestamp, so time-window filtering
      // will include all of them when fromTimestamp is in the past
      for (let i = 0; i < 50; i++) {
        collector.trackQuery('mongodb', 'find', 10, false, new Error('Old error'));
      }

      for (let i = 0; i < 95; i++) {
        collector.trackQuery('mongodb', 'find', 10, true);
      }

      const fourMinutesAgo = Date.now() - (4 * 60 * 1000);
      const health = collector.getHealthStatus('mongodb', fourMinutesAgo);

      // All 145 queries are within the time window
      expect(health.totalQueries).toBe(145);
      // 50/145 = ~34.5% error rate -> unhealthy
      expect(health.status).toBe('unhealthy');
    });

    it('should include average response time in health status', () => {
      collector.trackQuery('mongodb', 'find', 10, true);
      collector.trackQuery('mongodb', 'find', 20, true);
      collector.trackQuery('mongodb', 'find', 30, true);

      const health = collector.getHealthStatus('mongodb');

      expect(health.averageResponseTime).toBe(20);
    });

    it('should include p95 and p99 response times in health status', () => {
      for (let i = 1; i <= 100; i++) {
        collector.trackQuery('mongodb', 'find', i, true);
      }

      const health = collector.getHealthStatus('mongodb');

      // Linear interpolation: p95 = 95.05, p99 = 99.01
      expect(health.p95ResponseTime).toBeCloseTo(95.05, 0);
      expect(health.p99ResponseTime).toBeCloseTo(99.01, 0);
    });
  });

  describe('clearMetrics', () => {
    it('should clear metrics for specific database', () => {
      collector.trackQuery('mongodb', 'find', 10, true);
      collector.trackQuery('zerodb', 'searchVectors', 20, true);

      collector.clearMetrics('mongodb');

      const mongoMetrics = collector.getMetrics('mongodb');
      const zeroMetrics = collector.getMetrics('zerodb');

      expect(mongoMetrics.length).toBe(0);
      expect(zeroMetrics.length).toBe(1);
    });

    it('should clear all metrics when database not specified', () => {
      collector.trackQuery('mongodb', 'find', 10, true);
      collector.trackQuery('zerodb', 'searchVectors', 20, true);

      collector.clearMetrics();

      const allMetrics = collector.getMetrics();
      expect(allMetrics.length).toBe(0);
    });
  });

  describe('getSummaryStats', () => {
    beforeEach(() => {
      // Add test data with various durations
      collector.trackQuery('mongodb', 'find', 10, true);
      collector.trackQuery('mongodb', 'find', 20, true);
      collector.trackQuery('mongodb', 'insert', 30, true);
      collector.trackQuery('mongodb', 'insert', 40, false, new Error('Test'));
      collector.trackQuery('mongodb', 'update', 50, true);
    });

    it('should return summary statistics for database', () => {
      const stats = collector.getSummaryStats('mongodb');

      expect(stats.totalQueries).toBe(5);
      expect(stats.successCount).toBe(4);
      expect(stats.errorCount).toBe(1);
      expect(stats.errorRate).toBe(20);
      expect(stats.averageResponseTime).toBe(30);
      expect(stats.minResponseTime).toBe(10);
      expect(stats.maxResponseTime).toBe(50);
    });

    it('should group statistics by operation type', () => {
      const stats = collector.getSummaryStats('mongodb');

      expect(stats.byOperation).toBeDefined();
      expect(stats.byOperation.find).toEqual({
        count: 2,
        averageResponseTime: 15,
        errorCount: 0
      });
      expect(stats.byOperation.insert).toEqual({
        count: 2,
        averageResponseTime: 35,
        errorCount: 1
      });
      expect(stats.byOperation.update).toEqual({
        count: 1,
        averageResponseTime: 50,
        errorCount: 0
      });
    });

    it('should return null for database with no metrics', () => {
      const stats = collector.getSummaryStats('zerodb');

      expect(stats).toBeNull();
    });
  });

  describe('metrics retention', () => {
    it('should respect max metrics limit per database', () => {
      const maxMetrics = 1000;
      const collectorWithLimit = new MetricsCollector({ maxMetricsPerDatabase: maxMetrics });

      // Add more than max
      for (let i = 0; i < maxMetrics + 100; i++) {
        collectorWithLimit.trackQuery('mongodb', 'find', 10, true);
      }

      const metrics = collectorWithLimit.getMetrics('mongodb');
      expect(metrics.length).toBe(maxMetrics);
    });

    it('should keep most recent metrics when limit exceeded', () => {
      const collectorWithLimit = new MetricsCollector({ maxMetricsPerDatabase: 10 });

      // Add 15 queries
      for (let i = 0; i < 15; i++) {
        collectorWithLimit.trackQuery('mongodb', 'find', i, true);
      }

      const metrics = collectorWithLimit.getMetrics('mongodb');
      expect(metrics.length).toBe(10);
      // Should keep most recent (5-14)
      expect(metrics[0].duration).toBe(5);
      expect(metrics[9].duration).toBe(14);
    });
  });
});
