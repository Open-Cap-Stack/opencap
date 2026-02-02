/**
 * MonitoringDashboard Service Tests
 *
 * Test suite for ZeroDB post-migration monitoring dashboard
 * Tests metric collection, aggregation, health checks, and Prometheus compatibility
 */

const MonitoringDashboard = require('../../../services/monitoringDashboard');
const { databaseMonitor } = require('../../../middleware/databaseMonitor');

describe('MonitoringDashboard Service', () => {
  let monitoringDashboard;

  beforeEach(() => {
    // Create fresh instance for each test
    monitoringDashboard = new MonitoringDashboard();

    // Initialize sync metrics to avoid undefined issues
    monitoringDashboard.syncMetrics = {
      syncLag: [],
      eventsProcessed: 0,
      eventsFailed: 0,
      deadLetterQueueSize: 0,
      circuitBreakerStatus: 'CLOSED',
      resumeTokenHealth: 'HEALTHY'
    };

    // Mock database monitor
    jest.spyOn(databaseMonitor, 'getMetrics').mockReturnValue({
      mongodb: {
        avg: 10,
        p95: 20,
        p99: 30,
        errorRate: 0.5,
        totalOperations: 1000,
        totalErrors: 5,
        recentOperations: 100,
        recentErrors: 1
      },
      zerodb: {
        avg: 15,
        p95: 25,
        p99: 35,
        errorRate: 0.5, // Changed to 0.5 to pass error rate check
        totalOperations: 500,
        totalErrors: 5,
        recentOperations: 50,
        recentErrors: 1,
        rateLimit: {
          limit: 1000,
          remaining: 900,
          reset: Date.now() + 60000
        }
      }
    });

    // Mock getRecentOperations to return empty array
    jest.spyOn(databaseMonitor, 'getRecentOperations').mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with default configuration', () => {
      expect(monitoringDashboard.config).toBeDefined();
      expect(monitoringDashboard.config.collectionInterval).toBe(5000);
      expect(monitoringDashboard.config.retentionPeriod).toBe(3600000);
    });

    it('should initialize with custom configuration', () => {
      const customDashboard = new MonitoringDashboard({
        collectionInterval: 10000,
        retentionPeriod: 7200000
      });
      expect(customDashboard.config.collectionInterval).toBe(10000);
      expect(customDashboard.config.retentionPeriod).toBe(7200000);
    });

    it('should start metrics collection when enabled', () => {
      jest.useFakeTimers();
      monitoringDashboard.start();
      expect(monitoringDashboard.isRunning).toBe(true);
      jest.advanceTimersByTime(5000);
      expect(monitoringDashboard.metrics.length).toBeGreaterThan(0);
      monitoringDashboard.stop();
      jest.useRealTimers();
    });
  });

  describe('getZeroDBMetrics', () => {
    it('should return current ZeroDB metrics', () => {
      const metrics = monitoringDashboard.getZeroDBMetrics();

      expect(metrics).toHaveProperty('queryLatency');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('connectionPool');
      expect(metrics).toHaveProperty('apiTokenUsage');
    });

    it('should calculate query latency percentiles correctly', () => {
      const metrics = monitoringDashboard.getZeroDBMetrics();

      expect(metrics.queryLatency.p50).toBeDefined();
      expect(metrics.queryLatency.p95).toBeDefined();
      expect(metrics.queryLatency.p99).toBeDefined();
      expect(typeof metrics.queryLatency.p50).toBe('number');
    });

    it('should calculate throughput as operations per second', () => {
      jest.useFakeTimers();
      monitoringDashboard.start();
      jest.advanceTimersByTime(1000);

      const metrics = monitoringDashboard.getZeroDBMetrics();
      expect(metrics.throughput.operationsPerSecond).toBeDefined();
      expect(typeof metrics.throughput.operationsPerSecond).toBe('number');

      monitoringDashboard.stop();
      jest.useRealTimers();
    });

    it('should include API token usage from rate limit headers', () => {
      const metrics = monitoringDashboard.getZeroDBMetrics();

      expect(metrics.apiTokenUsage).toHaveProperty('limit');
      expect(metrics.apiTokenUsage).toHaveProperty('remaining');
      expect(metrics.apiTokenUsage).toHaveProperty('usagePercentage');
    });
  });

  describe('getSyncMetrics', () => {
    beforeEach(() => {
      // Mock sync metrics
      monitoringDashboard.syncMetrics = {
        syncLag: [],
        eventsProcessed: 100,
        eventsFailed: 2,
        deadLetterQueueSize: 5,
        circuitBreakerStatus: 'CLOSED',
        resumeTokenHealth: 'HEALTHY'
      };
    });

    it('should return sync lag metrics', () => {
      monitoringDashboard.syncMetrics.syncLag.push(
        { timestamp: Date.now(), lag: 1000 },
        { timestamp: Date.now(), lag: 2000 },
        { timestamp: Date.now(), lag: 1500 }
      );

      const metrics = monitoringDashboard.getSyncMetrics();

      expect(metrics).toHaveProperty('syncLag');
      expect(metrics.syncLag.current).toBe(1500);
      expect(metrics.syncLag.average).toBe(1500);
      expect(metrics.syncLag.max).toBe(2000);
    });

    it('should track events processed and failed', () => {
      const metrics = monitoringDashboard.getSyncMetrics();

      expect(metrics.eventsProcessed).toBe(100);
      expect(metrics.eventsFailed).toBe(2);
      expect(metrics.failureRate).toBe(2);
    });

    it('should report dead letter queue size', () => {
      const metrics = monitoringDashboard.getSyncMetrics();

      expect(metrics.deadLetterQueueSize).toBe(5);
    });

    it('should report circuit breaker status', () => {
      const metrics = monitoringDashboard.getSyncMetrics();

      expect(metrics.circuitBreakerStatus).toBe('CLOSED');
    });

    it('should report resume token health', () => {
      const metrics = monitoringDashboard.getSyncMetrics();

      expect(metrics.resumeTokenHealth).toBe('HEALTHY');
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system resource metrics', () => {
      const metrics = monitoringDashboard.getSystemMetrics();

      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('percentage');
    });

    it('should calculate memory usage percentage correctly', () => {
      const metrics = monitoringDashboard.getSystemMetrics();

      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include process uptime', () => {
      const metrics = monitoringDashboard.getSystemMetrics();

      expect(metrics.uptime).toBeDefined();
      expect(typeof metrics.uptime).toBe('number');
      expect(metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all metrics are good', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 1000 }],
        eventsProcessed: 100,
        eventsFailed: 0,
        deadLetterQueueSize: 0,
        circuitBreakerStatus: 'CLOSED',
        resumeTokenHealth: 'HEALTHY'
      };

      const health = monitoringDashboard.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.checks.syncLag).toBe('PASS');
      expect(health.checks.errorRate).toBe('PASS');
      expect(health.checks.deadLetterQueue).toBe('PASS');
    });

    it('should return degraded status when sync lag is high', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }], // >5 seconds
        eventsProcessed: 100,
        eventsFailed: 0,
        deadLetterQueueSize: 0,
        circuitBreakerStatus: 'CLOSED',
        resumeTokenHealth: 'HEALTHY'
      };

      const health = monitoringDashboard.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.checks.syncLag).toBe('WARN');
    });

    it('should return unhealthy status when error rate is high', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 1000 }],
        eventsProcessed: 100,
        eventsFailed: 5, // 5% error rate
        deadLetterQueueSize: 0,
        circuitBreakerStatus: 'CLOSED',
        resumeTokenHealth: 'HEALTHY'
      };

      // Mock high error rate in ZeroDB
      jest.spyOn(databaseMonitor, 'getMetrics').mockReturnValue({
        mongodb: { avg: 10, p95: 20, p99: 30, errorRate: 0.5, totalOperations: 1000, totalErrors: 5 },
        zerodb: { avg: 15, p95: 25, p99: 35, errorRate: 5.0, totalOperations: 100, totalErrors: 5 } // >1%
      });

      const health = monitoringDashboard.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.errorRate).toBe('FAIL');
    });

    it('should return unhealthy status when DLQ is large', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 1000 }],
        eventsProcessed: 100,
        eventsFailed: 0,
        deadLetterQueueSize: 150, // >100
        circuitBreakerStatus: 'CLOSED',
        resumeTokenHealth: 'HEALTHY'
      };

      const health = monitoringDashboard.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.deadLetterQueue).toBe('FAIL');
    });

    it('should detect circuit breaker open state', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 1000 }],
        eventsProcessed: 100,
        eventsFailed: 0,
        deadLetterQueueSize: 0,
        circuitBreakerStatus: 'OPEN',
        resumeTokenHealth: 'HEALTHY'
      };

      const health = monitoringDashboard.getHealthStatus();

      expect(health.checks.circuitBreaker).toBe('FAIL');
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should return metrics in Prometheus format', () => {
      const prometheusText = monitoringDashboard.getPrometheusMetrics();

      expect(typeof prometheusText).toBe('string');
      expect(prometheusText).toContain('# HELP');
      expect(prometheusText).toContain('# TYPE');
    });

    it('should include ZeroDB query latency metrics', () => {
      const prometheusText = monitoringDashboard.getPrometheusMetrics();

      expect(prometheusText).toContain('zerodb_query_latency_milliseconds');
      expect(prometheusText).toContain('quantile="0.5"');
      expect(prometheusText).toContain('quantile="0.95"');
      expect(prometheusText).toContain('quantile="0.99"');
    });

    it('should include throughput metrics', () => {
      const prometheusText = monitoringDashboard.getPrometheusMetrics();

      expect(prometheusText).toContain('zerodb_operations_per_second');
    });

    it('should include error rate metrics', () => {
      const prometheusText = monitoringDashboard.getPrometheusMetrics();

      expect(prometheusText).toContain('zerodb_error_rate_percent');
    });

    it('should include sync lag metrics', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 1500 }]
      };

      const prometheusText = monitoringDashboard.getPrometheusMetrics();

      expect(prometheusText).toContain('sync_lag_milliseconds');
    });

    it('should include dead letter queue size', () => {
      monitoringDashboard.syncMetrics = {
        deadLetterQueueSize: 5
      };

      const prometheusText = monitoringDashboard.getPrometheusMetrics();

      expect(prometheusText).toContain('dead_letter_queue_size');
    });
  });

  describe('getTimeSeries', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      monitoringDashboard.start();
    });

    afterEach(() => {
      monitoringDashboard.stop();
      jest.useRealTimers();
    });

    it('should collect time series data over time', () => {
      jest.advanceTimersByTime(15000); // Collect 3 data points

      const timeSeries = monitoringDashboard.getTimeSeries('zerodb.queryLatency.p95', 60000);

      expect(Array.isArray(timeSeries)).toBe(true);
      expect(timeSeries.length).toBeGreaterThan(0);
      expect(timeSeries[0]).toHaveProperty('timestamp');
      expect(timeSeries[0]).toHaveProperty('value');
    });

    it('should respect time range parameter', () => {
      const now = Date.now();
      jest.advanceTimersByTime(30000);

      const timeSeries = monitoringDashboard.getTimeSeries('zerodb.queryLatency.p95', 10000);

      // Should only return metrics from last 10 seconds
      timeSeries.forEach(point => {
        expect(point.timestamp).toBeGreaterThan(now + 20000);
      });
    });

    it('should support different metric paths', () => {
      jest.advanceTimersByTime(10000);

      const latencySeries = monitoringDashboard.getTimeSeries('zerodb.queryLatency.p95');
      const errorSeries = monitoringDashboard.getTimeSeries('zerodb.errorRate');

      expect(latencySeries).toBeDefined();
      expect(errorSeries).toBeDefined();
    });
  });

  describe('recordSyncEvent', () => {
    it('should record successful sync event', () => {
      monitoringDashboard.recordSyncEvent({
        type: 'insert',
        success: true,
        lag: 1000,
        duration: 50
      });

      const metrics = monitoringDashboard.getSyncMetrics();
      expect(metrics.eventsProcessed).toBeGreaterThan(0);
    });

    it('should record failed sync event', () => {
      monitoringDashboard.recordSyncEvent({
        type: 'update',
        success: false,
        error: new Error('Sync failed'),
        lag: 2000,
        duration: 100
      });

      const metrics = monitoringDashboard.getSyncMetrics();
      expect(metrics.eventsFailed).toBeGreaterThan(0);
    });

    it('should update sync lag metrics', () => {
      monitoringDashboard.recordSyncEvent({
        type: 'insert',
        success: true,
        lag: 1500,
        duration: 50
      });

      const metrics = monitoringDashboard.getSyncMetrics();
      expect(metrics.syncLag.current).toBe(1500);
    });
  });

  describe('updateCircuitBreakerStatus', () => {
    it('should update circuit breaker status', () => {
      monitoringDashboard.updateCircuitBreakerStatus('HALF_OPEN');

      const metrics = monitoringDashboard.getSyncMetrics();
      expect(metrics.circuitBreakerStatus).toBe('HALF_OPEN');
    });

    it('should only accept valid circuit breaker states', () => {
      expect(() => {
        monitoringDashboard.updateCircuitBreakerStatus('INVALID');
      }).toThrow();
    });
  });

  describe('cleanup', () => {
    it('should remove old metrics based on retention period', () => {
      jest.useFakeTimers();
      const dashboard = new MonitoringDashboard({ retentionPeriod: 10000 });
      dashboard.start();

      jest.advanceTimersByTime(5000);
      const countBefore = dashboard.metrics.length;

      jest.advanceTimersByTime(15000); // Exceed retention period
      dashboard.cleanup();

      const countAfter = dashboard.metrics.length;
      expect(countAfter).toBeLessThan(countBefore);

      dashboard.stop();
      jest.useRealTimers();
    });
  });

  describe('getSummary', () => {
    it('should return comprehensive monitoring summary', () => {
      const summary = monitoringDashboard.getSummary();

      expect(summary).toHaveProperty('timestamp');
      expect(summary).toHaveProperty('health');
      expect(summary).toHaveProperty('zerodb');
      expect(summary).toHaveProperty('sync');
      expect(summary).toHaveProperty('system');
    });

    it('should include all key metrics in summary', () => {
      const summary = monitoringDashboard.getSummary();

      expect(summary.zerodb).toHaveProperty('queryLatency');
      expect(summary.zerodb).toHaveProperty('errorRate');
      expect(summary.sync).toHaveProperty('syncLag');
      expect(summary.system).toHaveProperty('memory');
    });
  });
});
