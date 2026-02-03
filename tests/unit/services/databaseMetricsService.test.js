/**
 * Database Metrics Service Unit Tests
 * Issue #47: Implement Database Optimization and Caching
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const DatabaseMetricsService = require('../../../services/databaseMetricsService');

describe('DatabaseMetricsService', () => {
  let databaseMetricsService;

  beforeEach(() => {
    databaseMetricsService = DatabaseMetricsService;
    // Reset internal state if available
    if (databaseMetricsService.reset) {
      databaseMetricsService.reset();
    }
  });

  describe('trackQueryTime', () => {
    it('should track query execution time', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.total).toBe(1);
    });

    it('should track query by operation type', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'insert',
        executionTimeMs: 30
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'update',
        executionTimeMs: 40
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.byOperation.find).toBe(1);
      expect(metrics.queries.byOperation.insert).toBe(1);
      expect(metrics.queries.byOperation.update).toBe(1);
    });

    it('should track query by collection', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'companies',
        operation: 'find',
        executionTimeMs: 60
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.byCollection.users).toBe(1);
      expect(metrics.queries.byCollection.companies).toBe(1);
    });

    it('should calculate average execution time', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 100
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.averageExecutionTime).toBe(75);
    });

    it('should track max execution time', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 200
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 75
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.maxExecutionTime).toBe(200);
    });

    it('should track min execution time', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 200
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.minExecutionTime).toBe(50);
    });

    it('should track slow queries count', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 1500 // Slow
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.slowCount).toBe(1);
    });

    it('should track query errors', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50,
        error: new Error('Query failed')
      });

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.errorCount).toBe(1);
    });

    it('should include metadata in tracking', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50,
        docsExamined: 1000,
        docsReturned: 50,
        indexUsed: 'email_1'
      });

      const recentQueries = databaseMetricsService.getRecentQueries(1);
      expect(recentQueries[0]).toHaveProperty('docsExamined', 1000);
      expect(recentQueries[0]).toHaveProperty('docsReturned', 50);
      expect(recentQueries[0]).toHaveProperty('indexUsed', 'email_1');
    });
  });

  describe('getConnectionPoolStats', () => {
    it('should return connection pool statistics', () => {
      const stats = databaseMetricsService.getConnectionPoolStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('availableConnections');
      expect(stats).toHaveProperty('inUseConnections');
      expect(stats).toHaveProperty('waitingRequests');
    });

    it('should return pool utilization percentage', () => {
      const stats = databaseMetricsService.getConnectionPoolStats();

      expect(stats).toHaveProperty('utilizationPercent');
      expect(stats.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
    });

    it('should track connection pool history', () => {
      // Simulate pool stats collection over time
      databaseMetricsService.collectPoolStats();
      databaseMetricsService.collectPoolStats();
      databaseMetricsService.collectPoolStats();

      const history = databaseMetricsService.getPoolStatsHistory(3);
      expect(history).toHaveLength(3);
    });

    it('should return average pool utilization', () => {
      const stats = databaseMetricsService.getConnectionPoolStats();

      expect(stats).toHaveProperty('averageUtilization');
    });

    it('should track peak connections', () => {
      const stats = databaseMetricsService.getConnectionPoolStats();

      expect(stats).toHaveProperty('peakConnections');
      expect(typeof stats.peakConnections).toBe('number');
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return overall health status', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should check database connectivity', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('connected');
      expect(typeof health.connected).toBe('boolean');
    });

    it('should include latency check', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('latencyMs');
      expect(typeof health.latencyMs).toBe('number');
    });

    it('should include disk usage if available', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('storage');
      if (health.storage) {
        expect(health.storage).toHaveProperty('usedBytes');
        expect(health.storage).toHaveProperty('totalBytes');
      }
    });

    it('should include replication status if applicable', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('replication');
    });

    it('should return health score', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('score');
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });

    it('should include individual component health', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('components');
      expect(health.components).toHaveProperty('connection');
      expect(health.components).toHaveProperty('queryPerformance');
      expect(health.components).toHaveProperty('resourceUsage');
    });

    it('should include health check timestamp', async () => {
      const health = await databaseMetricsService.getDatabaseHealth();

      expect(health).toHaveProperty('checkedAt');
      expect(health.checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      // Add some query data first
      for (let i = 0; i < 10; i++) {
        databaseMetricsService.trackQueryTime({
          collection: 'users',
          operation: 'find',
          executionTimeMs: 50 + i * 10
        });
      }

      const report = await databaseMetricsService.generatePerformanceReport();

      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('queries');
      expect(report).toHaveProperty('connections');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include query performance summary', async () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 100
      });

      const report = await databaseMetricsService.generatePerformanceReport();

      expect(report.queries).toHaveProperty('total');
      expect(report.queries).toHaveProperty('averageTime');
      expect(report.queries).toHaveProperty('slowQueries');
      expect(report.queries).toHaveProperty('errorRate');
    });

    it('should include top slow queries', async () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 2000
      });

      const report = await databaseMetricsService.generatePerformanceReport();

      expect(report).toHaveProperty('topSlowQueries');
      expect(Array.isArray(report.topSlowQueries)).toBe(true);
    });

    it('should include collection statistics', async () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'companies',
        operation: 'find',
        executionTimeMs: 75
      });

      const report = await databaseMetricsService.generatePerformanceReport();

      expect(report).toHaveProperty('collectionStats');
      expect(report.collectionStats).toHaveProperty('users');
      expect(report.collectionStats).toHaveProperty('companies');
    });

    it('should generate report for specific time period', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      const report = await databaseMetricsService.generatePerformanceReport({
        startTime: oneHourAgo,
        endTime: now
      });

      expect(report.period).toEqual({
        start: oneHourAgo,
        end: now
      });
    });

    it('should include trend analysis', async () => {
      const report = await databaseMetricsService.generatePerformanceReport();

      expect(report).toHaveProperty('trends');
      expect(report.trends).toHaveProperty('queryVolume');
      expect(report.trends).toHaveProperty('responseTime');
    });

    it('should provide actionable recommendations', async () => {
      // Create conditions for recommendations
      for (let i = 0; i < 50; i++) {
        databaseMetricsService.trackQueryTime({
          collection: 'users',
          operation: 'find',
          executionTimeMs: 1500 // Slow queries
        });
      }

      const report = await databaseMetricsService.generatePerformanceReport();

      expect(report.recommendations).toBeInstanceOf(Array);
      if (report.recommendations.length > 0) {
        expect(report.recommendations[0]).toHaveProperty('type');
        expect(report.recommendations[0]).toHaveProperty('description');
        expect(report.recommendations[0]).toHaveProperty('action');
      }
    });

    it('should support different report formats', async () => {
      const jsonReport = await databaseMetricsService.generatePerformanceReport({
        format: 'json'
      });
      expect(typeof jsonReport).toBe('object');

      const textReport = await databaseMetricsService.generatePerformanceReport({
        format: 'text'
      });
      expect(typeof textReport).toBe('string');
    });
  });

  describe('getMetrics', () => {
    it('should return all collected metrics', () => {
      const metrics = databaseMetricsService.getMetrics();

      expect(metrics).toHaveProperty('queries');
      expect(metrics).toHaveProperty('connections');
      expect(metrics).toHaveProperty('uptime');
    });

    it('should include metrics timestamp', () => {
      const metrics = databaseMetricsService.getMetrics();

      expect(metrics).toHaveProperty('collectedAt');
      expect(metrics.collectedAt).toBeInstanceOf(Date);
    });
  });

  describe('getRecentQueries', () => {
    it('should return recent queries', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });

      const recent = databaseMetricsService.getRecentQueries(10);
      expect(recent).toHaveLength(1);
    });

    it('should limit returned queries', () => {
      for (let i = 0; i < 20; i++) {
        databaseMetricsService.trackQueryTime({
          collection: 'users',
          operation: 'find',
          executionTimeMs: 50
        });
      }

      const recent = databaseMetricsService.getRecentQueries(5);
      expect(recent).toHaveLength(5);
    });

    it('should return queries in reverse chronological order', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'first',
        operation: 'find',
        executionTimeMs: 50
      });
      databaseMetricsService.trackQueryTime({
        collection: 'second',
        operation: 'find',
        executionTimeMs: 50
      });

      const recent = databaseMetricsService.getRecentQueries(2);
      expect(recent[0].collection).toBe('second');
      expect(recent[1].collection).toBe('first');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });

      databaseMetricsService.reset();

      const metrics = databaseMetricsService.getMetrics();
      expect(metrics.queries.total).toBe(0);
    });
  });

  describe('startCollection and stopCollection', () => {
    it('should start automatic metrics collection', () => {
      databaseMetricsService.startCollection({ intervalMs: 1000 });

      expect(databaseMetricsService.isCollecting()).toBe(true);

      databaseMetricsService.stopCollection();
    });

    it('should stop automatic metrics collection', () => {
      databaseMetricsService.startCollection({ intervalMs: 1000 });
      databaseMetricsService.stopCollection();

      expect(databaseMetricsService.isCollecting()).toBe(false);
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics in Prometheus format', async () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });

      const exported = await databaseMetricsService.exportMetrics('prometheus');

      expect(typeof exported).toBe('string');
      expect(exported).toContain('# HELP');
      expect(exported).toContain('# TYPE');
    });

    it('should export metrics in JSON format', async () => {
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 50
      });

      const exported = await databaseMetricsService.exportMetrics('json');

      expect(typeof exported).toBe('object');
      expect(exported).toHaveProperty('queries');
    });
  });

  describe('setThresholds', () => {
    it('should set custom alert thresholds', () => {
      databaseMetricsService.setThresholds({
        slowQueryMs: 500,
        maxPoolUtilization: 80,
        maxErrorRate: 5
      });

      const thresholds = databaseMetricsService.getThresholds();
      expect(thresholds.slowQueryMs).toBe(500);
      expect(thresholds.maxPoolUtilization).toBe(80);
      expect(thresholds.maxErrorRate).toBe(5);
    });
  });

  describe('alerts', () => {
    it('should trigger alert when threshold exceeded', () => {
      const alertCallback = jest.fn();
      databaseMetricsService.onAlert(alertCallback);

      databaseMetricsService.setThresholds({ slowQueryMs: 100 });
      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 200
      });

      expect(alertCallback).toHaveBeenCalled();
      expect(alertCallback.mock.calls[0][0]).toHaveProperty('type', 'slow_query');
    });

    it('should allow removing alert handlers', () => {
      const alertCallback = jest.fn();
      const removeHandler = databaseMetricsService.onAlert(alertCallback);

      removeHandler();

      databaseMetricsService.trackQueryTime({
        collection: 'users',
        operation: 'find',
        executionTimeMs: 10000
      });

      expect(alertCallback).not.toHaveBeenCalled();
    });
  });
});
