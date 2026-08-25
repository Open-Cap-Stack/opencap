/**
 * Monitoring Controller Tests
 *
 * Tests for the ZeroDB monitoring API endpoints in monitoringController.js
 */

const httpMocks = require('node-mocks-http');

// Mock the monitoring service before requiring the controller
jest.mock('../../../services/zerodbMonitoringService', () => {
  const mockInstance = {
    getHealth: jest.fn(),
    getMetrics: jest.fn(),
    reset: jest.fn(),
    setAlertThresholds: jest.fn(),
    alertThresholds: {
      queryLatencyP95Ms: 500,
      errorRatePercent: 5,
      rateLimitUtilizationPercent: 80,
      consecutiveErrors: 3
    },
    metrics: {
      errors: {
        recent: []
      }
    }
  };
  return mockInstance;
});

const monitoringService = require('../../../services/zerodbMonitoringService');
const {
  getHealth,
  getMetrics,
  getPrometheusMetrics,
  getErrors,
  resetMetrics,
  updateThresholds
} = require('../../../controllers/monitoringController');

describe('monitoringController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  // ─── getHealth ─────────────────────────────────────────────────────

  describe('getHealth', () => {
    it('should return 200 for HEALTHY status', async () => {
      monitoringService.getHealth.mockReturnValue({
        status: 'HEALTHY',
        uptime: 3600
      });

      await getHealth(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.status).toBe('HEALTHY');
    });

    it('should return 200 for DEGRADED status', async () => {
      monitoringService.getHealth.mockReturnValue({
        status: 'DEGRADED',
        uptime: 3600
      });

      await getHealth(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.status).toBe('DEGRADED');
    });

    it('should return 503 for UNHEALTHY status', async () => {
      monitoringService.getHealth.mockReturnValue({
        status: 'UNHEALTHY',
        uptime: 3600
      });

      await getHealth(req, res);

      expect(res.statusCode).toBe(503);
    });

    it('should return 500 on error', async () => {
      monitoringService.getHealth.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await getHealth(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.status).toBe('ERROR');
      expect(data.error).toBe('Service unavailable');
    });
  });

  // ─── getMetrics ────────────────────────────────────────────────────

  describe('getMetrics', () => {
    it('should return metrics successfully', async () => {
      const mockMetrics = {
        queries: { successful: 100, failed: 2 },
        latency: { p50: '10.00', p95: '50.00', p99: '100.00' },
        operations: { find: { count: 50 }, insert: { count: 30 } },
        errors: { total: 2, byType: { timeout: 1, connection: 1 } },
        rateLimit: { utilizationPercent: 45 }
      };
      monitoringService.getMetrics.mockReturnValue(mockMetrics);

      await getMetrics(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.queries.successful).toBe(100);
    });

    it('should return 500 on error', async () => {
      monitoringService.getMetrics.mockImplementation(() => {
        throw new Error('Metrics unavailable');
      });

      await getMetrics(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.error).toBe('Failed to retrieve metrics');
    });
  });

  // ─── getPrometheusMetrics ──────────────────────────────────────────

  describe('getPrometheusMetrics', () => {
    it('should return Prometheus-format text metrics', async () => {
      const mockMetrics = {
        queries: { successful: 100, failed: 5 },
        latency: { p50: '15.00', p95: '80.00', p99: '200.00' },
        operations: { find: { count: 60 }, insert: { count: 40 } },
        errors: { total: 5, byType: {} },
        rateLimit: { utilizationPercent: 30 }
      };
      monitoringService.getMetrics.mockReturnValue(mockMetrics);

      await getPrometheusMetrics(req, res);

      expect(res.statusCode).toBe(200);
      const body = res._getData();
      expect(body).toContain('zerodb_queries_total{status="success"} 100');
      expect(body).toContain('zerodb_queries_total{status="failed"} 5');
      expect(body).toContain('zerodb_query_latency_milliseconds{quantile="0.5"} 15');
      expect(body).toContain('zerodb_query_latency_milliseconds{quantile="0.95"} 80');
      expect(body).toContain('zerodb_query_latency_milliseconds{quantile="0.99"} 200');
      expect(body).toContain('zerodb_operations_total{operation="find"} 60');
      expect(body).toContain('zerodb_operations_total{operation="insert"} 40');
      expect(body).toContain('zerodb_errors_total 5');
      expect(body).toContain('zerodb_rate_limit_utilization 30');
    });

    it('should set Content-Type to text/plain', async () => {
      monitoringService.getMetrics.mockReturnValue({
        queries: { successful: 0, failed: 0 },
        latency: { p50: '0', p95: '0', p99: '0' },
        operations: {},
        errors: { total: 0 },
        rateLimit: { utilizationPercent: 0 }
      });

      await getPrometheusMetrics(req, res);

      expect(res.getHeader('Content-Type')).toBe('text/plain');
    });

    it('should return 500 on error', async () => {
      monitoringService.getMetrics.mockImplementation(() => {
        throw new Error('Prometheus error');
      });

      await getPrometheusMetrics(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.error).toBe('Failed to generate Prometheus metrics');
    });
  });

  // ─── getErrors ─────────────────────────────────────────────────────

  describe('getErrors', () => {
    it('should return errors and recent error list', async () => {
      const mockMetrics = {
        errors: {
          total: 3,
          byType: { timeout: 2, validation: 1 }
        }
      };
      monitoringService.getMetrics.mockReturnValue(mockMetrics);
      monitoringService.metrics.errors.recent = [
        { type: 'timeout', message: 'Request timed out', timestamp: Date.now() }
      ];

      await getErrors(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.total).toBe(3);
      expect(data.byType.timeout).toBe(2);
      expect(data.recent).toHaveLength(1);
    });

    it('should return 500 on error', async () => {
      monitoringService.getMetrics.mockImplementation(() => {
        throw new Error('Error retrieval failed');
      });

      await getErrors(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.error).toBe('Failed to retrieve errors');
    });
  });

  // ─── resetMetrics ──────────────────────────────────────────────────

  describe('resetMetrics', () => {
    it('should reset metrics and return success', async () => {
      await resetMetrics(req, res);

      expect(monitoringService.reset).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Metrics reset successfully');
    });

    it('should return 500 on error', async () => {
      monitoringService.reset.mockImplementation(() => {
        throw new Error('Reset failed');
      });

      await resetMetrics(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.error).toBe('Failed to reset metrics');
    });
  });

  // ─── updateThresholds ─────────────────────────────────────────────

  describe('updateThresholds', () => {
    it('should update thresholds with provided values', async () => {
      req.body = {
        queryLatencyP95Ms: 1000,
        errorRatePercent: 10,
        rateLimitUtilizationPercent: 90,
        consecutiveErrors: 5
      };

      await updateThresholds(req, res);

      expect(monitoringService.setAlertThresholds).toHaveBeenCalledWith({
        queryLatencyP95Ms: 1000,
        errorRatePercent: 10,
        rateLimitUtilizationPercent: 90,
        consecutiveErrors: 5
      });
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
    });

    it('should handle partial threshold updates', async () => {
      req.body = { errorRatePercent: 15 };

      await updateThresholds(req, res);

      expect(monitoringService.setAlertThresholds).toHaveBeenCalledWith({
        errorRatePercent: 15
      });
    });

    it('should handle empty body', async () => {
      req.body = {};

      await updateThresholds(req, res);

      expect(monitoringService.setAlertThresholds).toHaveBeenCalledWith({});
      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      req.body = { errorRatePercent: 10 };
      monitoringService.setAlertThresholds.mockImplementation(() => {
        throw new Error('Threshold update failed');
      });

      await updateThresholds(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.error).toBe('Failed to update thresholds');
    });
  });
});
