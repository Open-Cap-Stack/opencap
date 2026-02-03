/**
 * PerformanceMonitoring Middleware Tests
 *
 * Test suite for performance monitoring middleware
 * Tests response time tracking, throughput metrics, and error rate monitoring
 */

// Disable global setup for this test file
jest.setTimeout(10000);

const PerformanceMonitoring = require('../../../middleware/performanceMonitoring');

describe('PerformanceMonitoring Middleware', () => {
  let performanceMonitoring;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    performanceMonitoring = new PerformanceMonitoring();

    mockReq = {
      method: 'GET',
      url: '/api/v1/users',
      path: '/api/v1/users',
      route: { path: '/users' },
      originalUrl: '/api/v1/users',
      baseUrl: '/api/v1',
      headers: {},
      ip: '127.0.0.1'
    };

    mockRes = {
      statusCode: 200,
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    performanceMonitoring.reset();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(performanceMonitoring.config).toBeDefined();
      expect(performanceMonitoring.config.slowThreshold).toBe(1000); // 1 second
      expect(performanceMonitoring.config.enableHistogram).toBe(true);
    });

    it('should initialize with custom configuration', () => {
      const customMonitor = new PerformanceMonitoring({
        slowThreshold: 500,
        enableHistogram: false,
        buckets: [10, 50, 100, 500]
      });

      expect(customMonitor.config.slowThreshold).toBe(500);
      expect(customMonitor.config.enableHistogram).toBe(false);
      expect(customMonitor.config.buckets).toEqual([10, 50, 100, 500]);
    });
  });

  describe('middleware function', () => {
    it('should return Express middleware function', () => {
      const middleware = performanceMonitoring.middleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should call next()', () => {
      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach start time to request', () => {
      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq._startTime).toBeDefined();
      expect(typeof mockReq._startTime).toBe('number');
    });

    it('should register response finish listener', () => {
      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('response time tracking', () => {
    it('should track response time for endpoint', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);

      // Simulate response after 100ms
      jest.advanceTimersByTime(100);

      // Trigger the finish handler
      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishHandler();

      const metrics = performanceMonitoring.getMetrics();
      expect(metrics.endpoints).toBeDefined();

      jest.useRealTimers();
    });

    it('should calculate average response time', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Simulate multiple requests with different durations
      const durations = [100, 200, 300, 400, 500];
      durations.forEach(duration => {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        jest.advanceTimersByTime(duration);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      });

      const metrics = performanceMonitoring.getEndpointMetrics('/api/v1/users', 'GET');
      expect(metrics.avgResponseTime).toBeCloseTo(300, 0); // Average of [100,200,300,400,500]

      jest.useRealTimers();
    });

    it('should calculate percentile response times', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Generate enough data points for percentile calculation
      for (let i = 1; i <= 100; i++) {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        jest.advanceTimersByTime(i * 10);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      }

      const metrics = performanceMonitoring.getEndpointMetrics('/api/v1/users', 'GET');
      expect(metrics.p50).toBeDefined();
      expect(metrics.p95).toBeDefined();
      expect(metrics.p99).toBeDefined();
      expect(metrics.p95).toBeGreaterThan(metrics.p50);
      expect(metrics.p99).toBeGreaterThan(metrics.p95);

      jest.useRealTimers();
    });

    it('should track min and max response times', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      const durations = [50, 100, 200, 150, 75];
      durations.forEach(duration => {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        jest.advanceTimersByTime(duration);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      });

      const metrics = performanceMonitoring.getEndpointMetrics('/api/v1/users', 'GET');
      expect(metrics.minResponseTime).toBe(50);
      expect(metrics.maxResponseTime).toBe(200);

      jest.useRealTimers();
    });

    it('should identify slow requests', () => {
      jest.useFakeTimers();

      const monitor = new PerformanceMonitoring({ slowThreshold: 100 });
      const middleware = monitor.middleware();

      mockReq._startTime = undefined;
      middleware(mockReq, mockRes, mockNext);
      jest.advanceTimersByTime(150); // Slow request

      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      const slowRequests = monitor.getSlowRequests();
      expect(slowRequests.length).toBe(1);
      expect(slowRequests[0].duration).toBe(150);

      jest.useRealTimers();
    });
  });

  describe('throughput metrics', () => {
    it('should track requests per second', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Make 10 requests in 1 second
      for (let i = 0; i < 10; i++) {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      }

      const throughput = performanceMonitoring.getThroughput();
      expect(throughput.requestsPerSecond).toBeDefined();

      jest.useRealTimers();
    });

    it('should track requests per minute', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Make 60 requests over 1 minute
      for (let i = 0; i < 60; i++) {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
        jest.advanceTimersByTime(1000);
      }

      const throughput = performanceMonitoring.getThroughput();
      expect(throughput.requestsPerMinute).toBeDefined();

      jest.useRealTimers();
    });

    it('should track throughput by endpoint', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Make requests to different endpoints
      const endpoints = [
        { url: '/api/v1/users', path: '/users' },
        { url: '/api/v1/users', path: '/users' },
        { url: '/api/v1/documents', path: '/documents' }
      ];

      endpoints.forEach(endpoint => {
        mockReq.url = endpoint.url;
        mockReq.originalUrl = endpoint.url;
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      });

      const throughput = performanceMonitoring.getThroughputByEndpoint();
      // Check that we have throughput for the endpoints we sent requests to
      const keys = Object.keys(throughput);
      expect(keys.length).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('error rate monitoring', () => {
    it('should track error rate by status code', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Successful requests
      for (let i = 0; i < 8; i++) {
        mockRes.statusCode = 200;
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      }

      // Error requests
      for (let i = 0; i < 2; i++) {
        mockRes.statusCode = 500;
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      }

      const errorRate = performanceMonitoring.getErrorRate();
      expect(errorRate.total).toBe(20); // 2/10 = 20%

      jest.useRealTimers();
    });

    it('should categorize errors by status code', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      const statusCodes = [200, 200, 400, 401, 500, 502, 200];
      statusCodes.forEach(code => {
        mockRes.statusCode = code;
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      });

      const errorStats = performanceMonitoring.getErrorStats();
      expect(errorStats.byStatusCode['4xx']).toBeDefined();
      expect(errorStats.byStatusCode['5xx']).toBeDefined();

      jest.useRealTimers();
    });

    it('should track error rate by endpoint', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Endpoint 1: 50% error rate
      for (let i = 0; i < 4; i++) {
        mockReq.url = '/api/v1/failing';
        mockReq.originalUrl = '/api/v1/failing';
        mockRes.statusCode = i < 2 ? 200 : 500;
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      }

      const errorRateByEndpoint = performanceMonitoring.getErrorRateByEndpoint();
      // Check that we have error rate data
      const keys = Object.keys(errorRateByEndpoint);
      expect(keys.length).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('histogram metrics', () => {
    it('should create response time histogram', () => {
      jest.useFakeTimers();

      const monitor = new PerformanceMonitoring({
        enableHistogram: true,
        buckets: [10, 50, 100, 500, 1000]
      });
      const middleware = monitor.middleware();

      const durations = [5, 25, 75, 250, 750, 1500];
      durations.forEach(duration => {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        jest.advanceTimersByTime(duration);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      });

      const histogram = monitor.getHistogram('/api/v1/users', 'GET');
      expect(histogram).toBeDefined();
      expect(histogram.buckets).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive metrics', () => {
      const metrics = performanceMonitoring.getMetrics();

      expect(metrics).toHaveProperty('endpoints');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('should return metrics for specific time range', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      // Generate metrics over time
      for (let i = 0; i < 10; i++) {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
        jest.advanceTimersByTime(60000); // 1 minute apart
      }

      const recentMetrics = performanceMonitoring.getMetrics({ timeRange: 300000 }); // Last 5 minutes

      expect(recentMetrics.endpoints).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('getEndpointMetrics', () => {
    it('should return metrics for specific endpoint', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      middleware(mockReq, mockRes, mockNext);
      jest.advanceTimersByTime(100);
      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      const metrics = performanceMonitoring.getEndpointMetrics('/api/v1/users', 'GET');

      expect(metrics).toHaveProperty('requestCount');
      expect(metrics).toHaveProperty('avgResponseTime');
      expect(metrics).toHaveProperty('errorRate');

      jest.useRealTimers();
    });

    it('should return null for non-existent endpoint', () => {
      const metrics = performanceMonitoring.getEndpointMetrics('/non-existent', 'GET');
      expect(metrics).toBeNull();
    });
  });

  describe('Prometheus format', () => {
    it('should export metrics in Prometheus format', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);
      jest.advanceTimersByTime(100);
      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      const prometheusMetrics = performanceMonitoring.getPrometheusMetrics();

      expect(typeof prometheusMetrics).toBe('string');
      expect(prometheusMetrics).toContain('# HELP');
      expect(prometheusMetrics).toContain('# TYPE');
      expect(prometheusMetrics).toContain('http_request_duration_seconds');
      expect(prometheusMetrics).toContain('http_requests_total');

      jest.useRealTimers();
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      for (let i = 0; i < 5; i++) {
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      }

      performanceMonitoring.reset();

      const metrics = performanceMonitoring.getMetrics();
      expect(Object.keys(metrics.endpoints)).toHaveLength(0);

      jest.useRealTimers();
    });
  });

  describe('integration with monitoring dashboard', () => {
    it('should provide data compatible with MonitoringDashboard', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);
      jest.advanceTimersByTime(100);
      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      const dashboardData = performanceMonitoring.getDashboardMetrics();

      expect(dashboardData).toHaveProperty('http');
      expect(dashboardData.http).toHaveProperty('requestsTotal');
      expect(dashboardData.http).toHaveProperty('avgResponseTime');
      expect(dashboardData.http).toHaveProperty('errorRate');
      expect(dashboardData.http).toHaveProperty('activeRequests');

      jest.useRealTimers();
    });
  });

  describe('active request tracking', () => {
    it('should track active requests', () => {
      const middleware = performanceMonitoring.middleware();

      // Start multiple requests without finishing
      for (let i = 0; i < 5; i++) {
        const req = { ...mockReq, _startTime: undefined };
        middleware(req, mockRes, mockNext);
      }

      const activeRequests = performanceMonitoring.getActiveRequestCount();
      expect(activeRequests).toBe(5);
    });

    it('should decrement active requests on finish', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(performanceMonitoring.getActiveRequestCount()).toBe(1);

      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      expect(performanceMonitoring.getActiveRequestCount()).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('request grouping', () => {
    it('should group parameterized routes', () => {
      jest.useFakeTimers();

      const middleware = performanceMonitoring.middleware();

      const paths = [
        '/api/v1/users/123',
        '/api/v1/users/456',
        '/api/v1/users/789'
      ];

      paths.forEach(path => {
        mockReq.url = path;
        mockReq.originalUrl = path;
        mockReq.route = { path: '/users/:id' };
        mockReq._startTime = undefined;
        middleware(mockReq, mockRes, mockNext);
        const finishHandler = mockRes.on.mock.calls[mockRes.on.mock.calls.length - 1][1];
        finishHandler();
      });

      const metrics = performanceMonitoring.getMetrics();
      // Should be grouped under parameterized path
      const endpointKey = Object.keys(metrics.endpoints).find(key =>
        key.includes('/users/:id') || key.includes('/users')
      );
      expect(endpointKey).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('event emission', () => {
    it('should emit event on slow request', () => {
      jest.useFakeTimers();

      const monitor = new PerformanceMonitoring({ slowThreshold: 100 });
      const onSlowRequest = jest.fn();
      monitor.on('slowRequest', onSlowRequest);

      const middleware = monitor.middleware();
      middleware(mockReq, mockRes, mockNext);
      jest.advanceTimersByTime(150);
      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      expect(onSlowRequest).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should emit event on error response', () => {
      jest.useFakeTimers();

      const onError = jest.fn();
      performanceMonitoring.on('errorResponse', onError);

      const middleware = performanceMonitoring.middleware();
      mockRes.statusCode = 500;
      middleware(mockReq, mockRes, mockNext);
      const finishHandler = mockRes.on.mock.calls[0][1];
      finishHandler();

      expect(onError).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
