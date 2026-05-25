/**
 * API Metrics Controller Unit Tests
 * Issue #48: Implement API Rate Limiting and Response Optimization
 * TDD Red Phase: Tests written before implementation
 */

const ApiMetricsController = require('../../../controllers/apiMetricsController');

describe('ApiMetricsController', () => {
  let controller;
  let req, res;
  let mockMetricsService;

  beforeEach(() => {
    mockMetricsService = {
      generateReport: jest.fn().mockReturnValue({
        generatedAt: new Date().toISOString(),
        endpoints: {},
        summary: {}
      }),
      getEndpointMetrics: jest.fn().mockReturnValue({
        average: 100,
        percentiles: { p50: 80, p95: 150, p99: 200 },
        errorRate: 0.01
      }),
      getPercentile: jest.fn().mockReturnValue(100),
      reset: jest.fn(),
      clearEndpoint: jest.fn(),
      getResponseTimeHistogram: jest.fn().mockReturnValue({ buckets: [] }),
      getThroughput: jest.fn().mockReturnValue(100)
    };

    controller = new ApiMetricsController(mockMetricsService);

    req = {
      params: {},
      query: {},
      body: {},
      user: { role: 'admin' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getDashboard', () => {
    it('should return metrics dashboard data', async () => {
      await controller.getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Object)
      }));
    });

    it('should call generateReport on metrics service', async () => {
      await controller.getDashboard(req, res);

      expect(mockMetricsService.generateReport).toHaveBeenCalled();
    });

    it('should handle time range query parameters', async () => {
      req.query = {
        startTime: '1640000000000',
        endTime: '1640100000000'
      };

      await controller.getDashboard(req, res);

      expect(mockMetricsService.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: 1640000000000,
          endTime: 1640100000000
        })
      );
    });
  });

  describe('getEndpointMetrics', () => {
    it('should return metrics for specific endpoint', async () => {
      req.params.endpoint = encodeURIComponent('/api/v1/users');

      await controller.getEndpointMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockMetricsService.getEndpointMetrics).toHaveBeenCalled();
    });

    it('should return 400 for missing endpoint parameter', async () => {
      req.params = {};

      await controller.getEndpointMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.any(String)
      }));
    });

    it('should filter by HTTP method when provided', async () => {
      req.params.endpoint = encodeURIComponent('/api/v1/users');
      req.query.method = 'GET';

      await controller.getEndpointMetrics(req, res);

      expect(mockMetricsService.getEndpointMetrics).toHaveBeenCalledWith(
        '/api/v1/users',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('getPerformanceReport', () => {
    it('should return comprehensive performance report', async () => {
      await controller.getPerformanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          generatedAt: expect.any(String)
        })
      }));
    });

    it('should support JSON format', async () => {
      req.query.format = 'json';

      await controller.getPerformanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPercentiles', () => {
    it('should return percentile data for endpoint', async () => {
      req.params.endpoint = encodeURIComponent('/api/v1/users');

      await controller.getPercentiles(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          p50: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number)
        })
      }));
    });

    it('should support custom percentiles', async () => {
      req.params.endpoint = encodeURIComponent('/api/v1/users');
      req.query.percentiles = '50,75,90,95,99';

      await controller.getPercentiles(req, res);

      expect(mockMetricsService.getPercentile).toHaveBeenCalled();
    });
  });

  describe('getErrorRates', () => {
    it('should return error rates for all endpoints', async () => {
      mockMetricsService.generateReport.mockReturnValue({
        endpoints: {
          '/api/v1/users': { errorRate: 0.01 },
          '/api/v1/companies': { errorRate: 0.05 }
        }
      });

      await controller.getErrorRates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should filter by minimum error rate threshold', async () => {
      req.query.minErrorRate = '0.02';

      mockMetricsService.generateReport.mockReturnValue({
        endpoints: {
          '/api/v1/users': { errorRate: 0.01 },
          '/api/v1/companies': { errorRate: 0.05 }
        }
      });

      await controller.getErrorRates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getHistogram', () => {
    it('should return histogram data for endpoint', async () => {
      req.params.endpoint = encodeURIComponent('/api/v1/users');

      await controller.getHistogram(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockMetricsService.getResponseTimeHistogram).toHaveBeenCalled();
    });

    it('should accept custom bucket boundaries', async () => {
      req.params.endpoint = encodeURIComponent('/api/v1/users');
      req.query.buckets = '50,100,200,500,1000';

      await controller.getHistogram(req, res);

      expect(mockMetricsService.getResponseTimeHistogram).toHaveBeenCalledWith(
        '/api/v1/users',
        expect.objectContaining({
          buckets: [50, 100, 200, 500, 1000]
        })
      );
    });
  });

  describe('getThroughput', () => {
    it('should return throughput data', async () => {
      mockMetricsService.generateReport.mockReturnValue({
        endpoints: {
          '/api/v1/users': { average: 100 }
        },
        summary: {}
      });

      await controller.getThroughput(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept window parameter', async () => {
      req.query.windowMs = '60000';
      mockMetricsService.generateReport.mockReturnValue({
        endpoints: {
          '/api/v1/users': { average: 100 }
        },
        summary: {}
      });

      await controller.getThroughput(req, res);

      // getThroughput is called for each endpoint in the report
      expect(mockMetricsService.getThroughput).toHaveBeenCalled();
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      await controller.resetMetrics(req, res);

      expect(mockMetricsService.reset).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should require admin role', async () => {
      req.user = { role: 'employee' };

      await controller.resetMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reset specific endpoint when provided', async () => {
      req.body.endpoint = '/api/v1/users';

      await controller.resetMetrics(req, res);

      expect(mockMetricsService.clearEndpoint).toHaveBeenCalledWith('/api/v1/users');
    });
  });

  describe('getSlowestEndpoints', () => {
    it('should return list of slowest endpoints', async () => {
      mockMetricsService.generateReport.mockReturnValue({
        endpoints: {},
        summary: {
          totalEndpoints: 2,
          totalRequests: 100,
          overallErrorRate: 0.01,
          averageResponseTime: 100,
          slowestEndpoints: [
            { endpoint: '/api/v1/slow', average: 500 },
            { endpoint: '/api/v1/medium', average: 200 }
          ],
          highestErrorRateEndpoints: []
        }
      });

      await controller.getSlowestEndpoints(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Array)
      }));
    });

    it('should respect limit parameter', async () => {
      req.query.limit = '5';
      mockMetricsService.generateReport.mockReturnValue({
        endpoints: {},
        summary: {
          slowestEndpoints: []
        }
      });

      await controller.getSlowestEndpoints(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status based on metrics', async () => {
      mockMetricsService.generateReport.mockReturnValue({
        summary: {
          overallErrorRate: 0.01,
          averageResponseTime: 100
        }
      });

      await controller.getHealthStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          status: expect.stringMatching(/healthy|degraded|unhealthy/)
        })
      }));
    });

    it('should return degraded status on high error rate', async () => {
      mockMetricsService.generateReport.mockReturnValue({
        summary: {
          overallErrorRate: 0.1,
          averageResponseTime: 100
        }
      });

      await controller.getHealthStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'degraded'
        })
      }));
    });

    it('should return unhealthy status on very high error rate', async () => {
      mockMetricsService.generateReport.mockReturnValue({
        summary: {
          overallErrorRate: 0.25,
          averageResponseTime: 100
        }
      });

      await controller.getHealthStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'unhealthy'
        })
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockMetricsService.generateReport.mockImplementation(() => {
        throw new Error('Service error');
      });

      await controller.getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.any(String)
      }));
    });
  });
});
