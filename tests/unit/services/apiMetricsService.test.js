/**
 * API Metrics Service Unit Tests
 * Issue #48: Implement API Rate Limiting and Response Optimization
 * TDD Red Phase: Tests written before implementation
 */

const ApiMetricsService = require('../../../services/apiMetricsService');

describe('ApiMetricsService', () => {
  let metricsService;

  beforeEach(() => {
    metricsService = new ApiMetricsService();
    metricsService.reset();
  });

  afterEach(() => {
    metricsService.reset();
  });

  describe('Response Time Tracking', () => {
    it('should record response time for endpoint', () => {
      metricsService.recordResponseTime('/api/v1/users', 150);

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.responseTimes).toContain(150);
    });

    it('should track multiple response times', () => {
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordResponseTime('/api/v1/users', 200);
      metricsService.recordResponseTime('/api/v1/users', 150);

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.responseTimes.length).toBe(3);
    });

    it('should track response times by HTTP method', () => {
      metricsService.recordResponseTime('/api/v1/users', 100, { method: 'GET' });
      metricsService.recordResponseTime('/api/v1/users', 200, { method: 'POST' });

      const getMetrics = metricsService.getEndpointMetrics('/api/v1/users', { method: 'GET' });
      const postMetrics = metricsService.getEndpointMetrics('/api/v1/users', { method: 'POST' });

      expect(getMetrics.count).toBe(1);
      expect(postMetrics.count).toBe(1);
    });

    it('should calculate average response time', () => {
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordResponseTime('/api/v1/users', 200);

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.average).toBe(150);
    });

    it('should calculate min response time', () => {
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordResponseTime('/api/v1/users', 200);
      metricsService.recordResponseTime('/api/v1/users', 50);

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.min).toBe(50);
    });

    it('should calculate max response time', () => {
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordResponseTime('/api/v1/users', 200);
      metricsService.recordResponseTime('/api/v1/users', 50);

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.max).toBe(200);
    });

    it('should limit stored response times to prevent memory issues', () => {
      const maxSamples = metricsService.config.maxSamplesPerEndpoint;

      for (let i = 0; i < maxSamples + 100; i++) {
        metricsService.recordResponseTime('/api/v1/users', i);
      }

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.responseTimes.length).toBeLessThanOrEqual(maxSamples);
    });
  });

  describe('Percentile Calculations', () => {
    beforeEach(() => {
      // Add sample data for percentile tests
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      times.forEach(t => metricsService.recordResponseTime('/api/v1/test', t));
    });

    it('should calculate p50 (median)', () => {
      const p50 = metricsService.getPercentile('/api/v1/test', 50);
      expect(p50).toBe(55); // median of 10 values
    });

    it('should calculate p95', () => {
      const p95 = metricsService.getPercentile('/api/v1/test', 95);
      expect(p95).toBeGreaterThanOrEqual(90);
    });

    it('should calculate p99', () => {
      const p99 = metricsService.getPercentile('/api/v1/test', 99);
      expect(p99).toBeGreaterThanOrEqual(95);
    });

    it('should return all percentiles in metrics', () => {
      const metrics = metricsService.getEndpointMetrics('/api/v1/test');

      expect(metrics.percentiles).toBeDefined();
      expect(metrics.percentiles.p50).toBeDefined();
      expect(metrics.percentiles.p95).toBeDefined();
      expect(metrics.percentiles.p99).toBeDefined();
    });

    it('should handle empty data for percentiles', () => {
      const p50 = metricsService.getPercentile('/api/v1/empty', 50);
      expect(p50).toBe(0);
    });

    it('should calculate custom percentiles', () => {
      const p75 = metricsService.getPercentile('/api/v1/test', 75);
      expect(p75).toBeDefined();
      expect(p75).toBeGreaterThan(0);
    });
  });

  describe('Error Rate Tracking', () => {
    it('should track successful requests', () => {
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 201 });

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.successCount).toBe(2);
    });

    it('should track error requests', () => {
      metricsService.recordRequest('/api/v1/users', { statusCode: 500 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 404 });

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.errorCount).toBe(2);
    });

    it('should calculate error rate', () => {
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 500 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.errorRate).toBe(0.25); // 1 error out of 4 requests
    });

    it('should track errors by status code', () => {
      metricsService.recordRequest('/api/v1/users', { statusCode: 400 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 404 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 500 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 500 });

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.errorsByStatus[400]).toBe(1);
      expect(metrics.errorsByStatus[404]).toBe(1);
      expect(metrics.errorsByStatus[500]).toBe(2);
    });

    it('should categorize client vs server errors', () => {
      metricsService.recordRequest('/api/v1/users', { statusCode: 400 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 500 });

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.clientErrors).toBe(1);
      expect(metrics.serverErrors).toBe(1);
    });
  });

  describe('Request Rate Tracking', () => {
    it('should track requests per minute', () => {
      const now = Date.now();
      metricsService.recordRequest('/api/v1/users', { timestamp: now });
      metricsService.recordRequest('/api/v1/users', { timestamp: now + 1000 });

      const rpm = metricsService.getRequestsPerMinute('/api/v1/users');
      expect(rpm).toBeGreaterThan(0);
    });

    it('should track total request count', () => {
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.totalRequests).toBe(3);
    });
  });

  describe('Performance Report Generation', () => {
    beforeEach(() => {
      // Add sample data
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordResponseTime('/api/v1/users', 150);
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });
      metricsService.recordRequest('/api/v1/users', { statusCode: 500 });

      metricsService.recordResponseTime('/api/v1/companies', 200);
      metricsService.recordRequest('/api/v1/companies', { statusCode: 200 });
    });

    it('should generate comprehensive performance report', () => {
      const report = metricsService.generateReport();

      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('endpoints');
      expect(report).toHaveProperty('summary');
    });

    it('should include endpoint-level metrics in report', () => {
      const report = metricsService.generateReport();

      expect(report.endpoints).toHaveProperty('/api/v1/users');
      expect(report.endpoints['/api/v1/users']).toHaveProperty('average');
      expect(report.endpoints['/api/v1/users']).toHaveProperty('percentiles');
      expect(report.endpoints['/api/v1/users']).toHaveProperty('errorRate');
    });

    it('should include summary statistics', () => {
      const report = metricsService.generateReport();

      expect(report.summary).toHaveProperty('totalEndpoints');
      expect(report.summary).toHaveProperty('totalRequests');
      expect(report.summary).toHaveProperty('overallErrorRate');
      expect(report.summary).toHaveProperty('averageResponseTime');
    });

    it('should identify slowest endpoints', () => {
      const report = metricsService.generateReport();

      expect(report.summary).toHaveProperty('slowestEndpoints');
      expect(Array.isArray(report.summary.slowestEndpoints)).toBe(true);
    });

    it('should identify endpoints with highest error rates', () => {
      const report = metricsService.generateReport();

      expect(report.summary).toHaveProperty('highestErrorRateEndpoints');
      expect(Array.isArray(report.summary.highestErrorRateEndpoints)).toBe(true);
    });

    it('should generate report for specific time range', () => {
      const startTime = Date.now() - 3600000; // 1 hour ago
      const endTime = Date.now();

      const report = metricsService.generateReport({ startTime, endTime });

      expect(report).toHaveProperty('timeRange');
      expect(report.timeRange.start).toBe(startTime);
      expect(report.timeRange.end).toBe(endTime);
    });
  });

  describe('Middleware Integration', () => {
    it('should provide middleware function', () => {
      const middleware = metricsService.middleware();
      expect(typeof middleware).toBe('function');
    });

    it('should automatically track response time via middleware', async () => {
      const middleware = metricsService.middleware();

      const req = {
        method: 'GET',
        path: '/api/v1/users',
        originalUrl: '/api/v1/users'
      };

      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        })
      };

      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Reset and Clear', () => {
    it('should reset all metrics', () => {
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordRequest('/api/v1/users', { statusCode: 200 });

      metricsService.reset();

      const metrics = metricsService.getEndpointMetrics('/api/v1/users');
      expect(metrics.totalRequests).toBe(0);
    });

    it('should clear metrics for specific endpoint', () => {
      metricsService.recordResponseTime('/api/v1/users', 100);
      metricsService.recordResponseTime('/api/v1/companies', 200);

      metricsService.clearEndpoint('/api/v1/users');

      const usersMetrics = metricsService.getEndpointMetrics('/api/v1/users');
      const companiesMetrics = metricsService.getEndpointMetrics('/api/v1/companies');

      expect(usersMetrics.totalRequests).toBe(0);
      expect(companiesMetrics.responseTimes.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const customService = new ApiMetricsService({
        maxSamplesPerEndpoint: 500,
        retentionPeriodMs: 7200000
      });

      expect(customService.config.maxSamplesPerEndpoint).toBe(500);
      expect(customService.config.retentionPeriodMs).toBe(7200000);
    });

    it('should use default configuration when not specified', () => {
      const defaultService = new ApiMetricsService();

      expect(defaultService.config.maxSamplesPerEndpoint).toBeDefined();
      expect(defaultService.config.retentionPeriodMs).toBeDefined();
    });
  });

  describe('Histogram Support', () => {
    it('should generate histogram data for response times', () => {
      for (let i = 0; i < 100; i++) {
        metricsService.recordResponseTime('/api/v1/users', Math.random() * 500);
      }

      const histogram = metricsService.getResponseTimeHistogram('/api/v1/users');

      expect(histogram).toHaveProperty('buckets');
      expect(Array.isArray(histogram.buckets)).toBe(true);
    });

    it('should allow custom bucket boundaries', () => {
      for (let i = 0; i < 100; i++) {
        metricsService.recordResponseTime('/api/v1/users', Math.random() * 500);
      }

      const histogram = metricsService.getResponseTimeHistogram('/api/v1/users', {
        buckets: [50, 100, 200, 500, 1000]
      });

      expect(histogram.buckets.length).toBeGreaterThan(0);
    });
  });

  describe('Throughput Metrics', () => {
    it('should calculate throughput (requests per second)', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        metricsService.recordRequest('/api/v1/users', {
          statusCode: 200,
          timestamp: startTime + i * 100
        });
      }

      const throughput = metricsService.getThroughput('/api/v1/users', { windowMs: 1000 });
      expect(throughput).toBeGreaterThan(0);
    });
  });
});
