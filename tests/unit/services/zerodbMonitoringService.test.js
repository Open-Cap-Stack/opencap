/**
 * ZeroDBMonitoringService Tests
 *
 * Test suite for comprehensive ZeroDB monitoring and optimization service
 * Tests operation tracking, metrics collection, alerting, and query optimization
 */

const ZeroDBMonitoringService = require('../../../services/zerodbMonitoringService');

describe('ZeroDBMonitoringService', () => {
  let monitoringService;

  beforeEach(() => {
    // Create fresh instance for each test with default config
    monitoringService = new ZeroDBMonitoringService();
  });

  afterEach(() => {
    monitoringService.stop();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(monitoringService.config).toBeDefined();
      expect(monitoringService.config.slowQueryThreshold).toBe(1000);
      expect(monitoringService.config.metricsRetentionMs).toBe(3600000);
      expect(monitoringService.config.alertCooldownMs).toBe(300000);
    });

    it('should initialize with custom configuration', () => {
      const customService = new ZeroDBMonitoringService({
        slowQueryThreshold: 500,
        metricsRetentionMs: 7200000,
        alertCooldownMs: 600000
      });

      expect(customService.config.slowQueryThreshold).toBe(500);
      expect(customService.config.metricsRetentionMs).toBe(7200000);
      expect(customService.config.alertCooldownMs).toBe(600000);
    });

    it('should start monitoring when start() is called', () => {
      monitoringService.start();
      expect(monitoringService.isRunning).toBe(true);
    });

    it('should stop monitoring when stop() is called', () => {
      monitoringService.start();
      monitoringService.stop();
      expect(monitoringService.isRunning).toBe(false);
    });

    it('should not start multiple times', () => {
      monitoringService.start();
      monitoringService.start();
      expect(monitoringService.isRunning).toBe(true);
    });
  });

  describe('operation tracking', () => {
    it('should track ZeroDB operations', () => {
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'users',
        duration: 150,
        success: true
      });

      const metrics = monitoringService.getMetrics();
      expect(metrics.totalOperations).toBe(1);
    });

    it('should track multiple operations', () => {
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'users',
        duration: 100,
        success: true
      });
      monitoringService.trackOperation({
        operation: 'insert',
        tableName: 'documents',
        duration: 200,
        success: true
      });
      monitoringService.trackOperation({
        operation: 'update',
        tableName: 'users',
        duration: 150,
        success: false,
        error: 'Connection timeout'
      });

      const metrics = monitoringService.getMetrics();
      expect(metrics.totalOperations).toBe(3);
      expect(metrics.successfulOperations).toBe(2);
      expect(metrics.failedOperations).toBe(1);
    });

    it('should track operations by type', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 150, success: true });
      monitoringService.trackOperation({ operation: 'insert', tableName: 'users', duration: 200, success: true });

      const metrics = monitoringService.getMetrics();
      expect(metrics.operationsByType.query).toBe(2);
      expect(metrics.operationsByType.insert).toBe(1);
    });

    it('should track operations by table', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'documents', duration: 150, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: true });

      const metrics = monitoringService.getMetrics();
      expect(metrics.operationsByTable.users).toBe(2);
      expect(metrics.operationsByTable.documents).toBe(1);
    });

    it('should track slow queries', () => {
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'users',
        duration: 1500, // Exceeds 1000ms threshold
        success: true,
        filter: { status: 'active' }
      });

      const slowQueries = monitoringService.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].duration).toBe(1500);
    });

    it('should add timestamp to tracked operations', () => {
      const before = Date.now();
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'users',
        duration: 100,
        success: true
      });
      const after = Date.now();

      const operations = monitoringService.getRecentOperations();
      expect(operations[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(operations[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('metrics calculation', () => {
    beforeEach(() => {
      // Add sample operations for metrics calculation
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 300, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 400, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 500, success: false, error: 'Timeout' });
    });

    it('should calculate average latency', () => {
      const metrics = monitoringService.getMetrics();
      expect(metrics.latency.average).toBe(300); // (100+200+300+400+500)/5
    });

    it('should calculate percentile latencies', () => {
      const metrics = monitoringService.getMetrics();
      expect(metrics.latency.p50).toBeDefined();
      expect(metrics.latency.p95).toBeDefined();
      expect(metrics.latency.p99).toBeDefined();
      expect(typeof metrics.latency.p50).toBe('number');
    });

    it('should calculate min and max latency', () => {
      const metrics = monitoringService.getMetrics();
      expect(metrics.latency.min).toBe(100);
      expect(metrics.latency.max).toBe(500);
    });

    it('should calculate error rate', () => {
      const metrics = monitoringService.getMetrics();
      expect(metrics.errorRate).toBe(20); // 1 failed out of 5 = 20%
    });

    it('should calculate operations per second (throughput)', () => {
      const metrics = monitoringService.getMetrics();
      expect(metrics.throughput).toBeDefined();
      expect(typeof metrics.throughput).toBe('number');
    });
  });

  describe('alert thresholds', () => {
    let alertHandler;

    beforeEach(() => {
      alertHandler = jest.fn();
      monitoringService = new ZeroDBMonitoringService({
        alertHandler,
        slowQueryThreshold: 500, // Set at root level too
        alertThresholds: {
          errorRate: 10, // 10%
          slowQueryThreshold: 500, // 500ms
          p99Latency: 1000 // 1 second
        }
      });
    });

    it('should configure custom alert thresholds', () => {
      expect(monitoringService.config.alertThresholds.errorRate).toBe(10);
      expect(monitoringService.config.alertThresholds.slowQueryThreshold).toBe(500);
      expect(monitoringService.config.alertThresholds.p99Latency).toBe(1000);
    });

    it('should trigger alert when error rate exceeds threshold', () => {
      // Add operations with high error rate (>10%)
      for (let i = 0; i < 7; i++) {
        monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      }
      for (let i = 0; i < 4; i++) {
        monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: false, error: 'Error' });
      }

      monitoringService.checkAlerts();

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR_RATE_HIGH',
          severity: expect.any(String)
        })
      );
    });

    it('should trigger alert for slow queries', () => {
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'users',
        duration: 600, // Exceeds 500ms custom threshold
        success: true
      });

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SLOW_QUERY'
        })
      );
    });

    it('should respect alert cooldown period', () => {
      // Use a very short cooldown for this test
      const testService = new ZeroDBMonitoringService({
        alertHandler,
        alertCooldownMs: 100, // 100ms cooldown
        alertThresholds: {
          errorRate: 10,
          slowQueryThreshold: 500,
          p99Latency: 1000
        }
      });

      // Trigger first alert
      for (let i = 0; i < 5; i++) {
        testService.trackOperation({ operation: 'query', tableName: 'users', duration: 50, success: false, error: 'Error' });
      }
      testService.checkAlerts();

      // Count ERROR_RATE_HIGH alerts (not slow query alerts)
      const errorRateAlertsBefore = alertHandler.mock.calls.filter(
        call => call[0].type === 'ERROR_RATE_HIGH'
      ).length;
      expect(errorRateAlertsBefore).toBe(1);

      // Try to trigger same alert again immediately
      for (let i = 0; i < 5; i++) {
        testService.trackOperation({ operation: 'query', tableName: 'users', duration: 50, success: false, error: 'Error' });
      }
      testService.checkAlerts();

      const errorRateAlertsAfterImmediate = alertHandler.mock.calls.filter(
        call => call[0].type === 'ERROR_RATE_HIGH'
      ).length;
      expect(errorRateAlertsAfterImmediate).toBe(1); // No new alert (in cooldown)

      testService.stop();
    });

    it('should get active alerts', () => {
      for (let i = 0; i < 5; i++) {
        monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: false, error: 'Error' });
      }
      monitoringService.checkAlerts();

      const activeAlerts = monitoringService.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });
  });

  describe('query optimization', () => {
    it('should recommend indexes for frequently queried fields', () => {
      // Add multiple queries with same filter pattern
      for (let i = 0; i < 10; i++) {
        monitoringService.trackOperation({
          operation: 'query',
          tableName: 'users',
          duration: 500,
          success: true,
          filter: { status: 'active', createdAt: { $gt: '2024-01-01' } }
        });
      }

      const recommendations = monitoringService.getIndexRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should analyze slow queries', () => {
      // Add slow queries
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'documents',
        duration: 2000,
        success: true,
        filter: { type: 'report' }
      });
      monitoringService.trackOperation({
        operation: 'query',
        tableName: 'documents',
        duration: 1500,
        success: true,
        filter: { type: 'report' }
      });

      const analysis = monitoringService.analyzeSlowQueries();
      expect(analysis).toHaveProperty('slowQueries');
      expect(analysis).toHaveProperty('byTable');
      expect(analysis).toHaveProperty('commonPatterns');
    });

    it('should suggest caching strategy', () => {
      // Add repeated queries
      for (let i = 0; i < 5; i++) {
        monitoringService.trackOperation({
          operation: 'query',
          tableName: 'users',
          duration: 200,
          success: true,
          filter: { id: '123' }
        });
      }

      const strategy = monitoringService.getCachingRecommendations();
      expect(strategy).toHaveProperty('cacheableQueries');
      expect(strategy).toHaveProperty('summary');
    });
  });

  describe('dashboard data', () => {
    it('should return comprehensive dashboard data', () => {
      // Add sample operations
      for (let i = 0; i < 10; i++) {
        monitoringService.trackOperation({
          operation: i % 2 === 0 ? 'query' : 'insert',
          tableName: i % 3 === 0 ? 'users' : 'documents',
          duration: 100 + (i * 50),
          success: i !== 5 // One failure
        });
      }

      const dashboard = monitoringService.getDashboardData();

      expect(dashboard).toHaveProperty('metrics');
      expect(dashboard).toHaveProperty('health');
      expect(dashboard).toHaveProperty('alerts');
      expect(dashboard).toHaveProperty('topTables');
      expect(dashboard).toHaveProperty('recentOperations');
    });

    it('should return health status', () => {
      const dashboard = monitoringService.getDashboardData();
      expect(dashboard.health).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(dashboard.health.status);
    });

    it('should return top tables by operation count', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'documents', duration: 100, success: true });

      const dashboard = monitoringService.getDashboardData();
      expect(dashboard.topTables.length).toBeGreaterThan(0);
      expect(dashboard.topTables[0].tableName).toBe('users');
      expect(dashboard.topTables[0].operationCount).toBe(2);
    });
  });

  describe('time series data', () => {
    it('should collect metrics over time', () => {
      // Add operations and collect snapshots manually
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.collectMetricsSnapshot();
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: true });
      monitoringService.collectMetricsSnapshot();
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 150, success: true });
      monitoringService.collectMetricsSnapshot();

      const timeSeries = monitoringService.getTimeSeries('latency.average', 60000);
      expect(Array.isArray(timeSeries)).toBe(true);
      expect(timeSeries.length).toBe(3);
    });

    it('should respect time range for time series', () => {
      const oldTime = Date.now() - 10000; // 10 seconds ago

      // Add an old snapshot
      monitoringService.metricsSnapshots.push({
        timestamp: oldTime,
        metrics: { latency: { average: 100 } }
      });

      // Add a recent operation and snapshot
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: true });
      monitoringService.collectMetricsSnapshot();

      const currentTime = Date.now();
      const timeSeries = monitoringService.getTimeSeries('latency.average', 5000);

      // Should only include recent data points within time range (last 5 seconds)
      timeSeries.forEach(point => {
        expect(point.timestamp).toBeGreaterThanOrEqual(currentTime - 5000);
      });
    });
  });

  describe('cleanup and data retention', () => {
    it('should cleanup old metrics based on retention period', () => {
      const shortRetentionService = new ZeroDBMonitoringService({
        metricsRetentionMs: 10000 // 10 seconds
      });

      // Add operations with old timestamps
      const oldTime = Date.now() - 15000; // 15 seconds ago (past retention period)
      shortRetentionService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true, timestamp: oldTime });
      shortRetentionService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: true, timestamp: oldTime });

      const countBefore = shortRetentionService.getRecentOperations().length;
      expect(countBefore).toBe(2);

      // Cleanup should remove old operations
      shortRetentionService.cleanup();

      const countAfter = shortRetentionService.getRecentOperations().length;
      expect(countAfter).toBe(0);

      shortRetentionService.stop();
    });

    it('should limit tracked operations to prevent memory issues', () => {
      const limitedService = new ZeroDBMonitoringService({
        maxTrackedOperations: 100
      });

      // Add more than limit
      for (let i = 0; i < 150; i++) {
        limitedService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      }

      const operations = limitedService.getRecentOperations();
      expect(operations.length).toBeLessThanOrEqual(100);

      limitedService.stop();
    });
  });

  describe('reset and export', () => {
    afterEach(() => {
      monitoringService.stop();
    });

    it('should reset all tracked data', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: true });

      monitoringService.reset();

      const metrics = monitoringService.getMetrics();
      expect(metrics.totalOperations).toBe(0);
    });

    it('should export data as JSON', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });

      const exported = monitoringService.exportData('json');
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('operations');
      expect(parsed).toHaveProperty('exportedAt');
    });

    it('should export data as object', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });

      const exported = monitoringService.exportData('object');
      expect(typeof exported).toBe('object');
      expect(exported).toHaveProperty('operations');
    });
  });

  describe('Prometheus metrics format', () => {
    afterEach(() => {
      monitoringService.stop();
    });

    it('should export metrics in Prometheus format', () => {
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 100, success: true });
      monitoringService.trackOperation({ operation: 'query', tableName: 'users', duration: 200, success: false, error: 'Error' });

      const prometheusText = monitoringService.getPrometheusMetrics();

      expect(typeof prometheusText).toBe('string');
      expect(prometheusText).toContain('# HELP');
      expect(prometheusText).toContain('# TYPE');
      expect(prometheusText).toContain('zerodb_operations_total');
      expect(prometheusText).toContain('zerodb_query_latency_milliseconds');
      expect(prometheusText).toContain('zerodb_error_rate_percent');
    });
  });

  describe('integration with ZeroDB operations', () => {
    afterEach(() => {
      monitoringService.stop();
    });

    it('should create middleware function for Express', () => {
      const middleware = monitoringService.createMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should wrap ZeroDB operations for automatic tracking', () => {
      const mockOperation = jest.fn().mockResolvedValue({ data: 'result' });

      const wrapped = monitoringService.wrapOperation(mockOperation, {
        operation: 'query',
        tableName: 'users'
      });

      expect(typeof wrapped).toBe('function');
    });

    it('should track wrapped operation success', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ data: 'result' });
      const wrapped = monitoringService.wrapOperation(mockOperation, {
        operation: 'query',
        tableName: 'users'
      });

      await wrapped({ filter: { id: '123' } });

      const metrics = monitoringService.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });

    it('should track wrapped operation failure', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('DB Error'));
      const wrapped = monitoringService.wrapOperation(mockOperation, {
        operation: 'query',
        tableName: 'users'
      });

      try {
        await wrapped({ filter: { id: '123' } });
      } catch (e) {
        // Expected error
      }

      const metrics = monitoringService.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.failedOperations).toBe(1);
    });
  });
});
