/**
 * Database Monitor Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for database monitoring middleware
 * Target coverage: 80%+
 */

// Mock dependencies before requiring module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn()
  }))
}));


const fs = require('fs');

describe('Database Monitor Middleware', () => {
  let databaseMonitor;
  let metricsMiddleware;
  let req;
  let res;
  let next;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DB_MONITORING = 'false';

    const module = require('../../../middleware/databaseMonitor');
    databaseMonitor = module.databaseMonitor;
    metricsMiddleware = module.metricsMiddleware;

    req = {
      path: '/api/test',
      method: 'GET'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Clean up interval
    if (databaseMonitor.metricsInterval) {
      clearInterval(databaseMonitor.metricsInterval);
      databaseMonitor.metricsInterval = null;
    }
  });

  describe('DatabaseMonitor Class', () => {
    describe('initialization', () => {
      it('should have disabled monitoring by default', () => {
        expect(databaseMonitor.enabled).toBe(false);
      });

      it('should have empty metrics initially', () => {
        expect(databaseMonitor.metrics.zerodb.totalOps).toBe(0);
      });

      it('should have maxOperationsInMemory set', () => {
        expect(databaseMonitor.maxOperationsInMemory).toBe(1000);
      });
    });

    describe('initialize', () => {
      beforeEach(() => {
        process.env.ENABLE_DB_MONITORING = 'true';
      });

      afterEach(() => {
        process.env.ENABLE_DB_MONITORING = 'false';
        databaseMonitor.enabled = false;
        if (databaseMonitor.metricsInterval) {
          clearInterval(databaseMonitor.metricsInterval);
          databaseMonitor.metricsInterval = null;
        }
      });

      it('should enable monitoring when env var is set', () => {
        databaseMonitor.initialize();

        expect(databaseMonitor.enabled).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith('Initializing database monitoring...');
      });

      it('should log when disabled', () => {
        process.env.ENABLE_DB_MONITORING = 'false';

        databaseMonitor.initialize();

        expect(consoleSpy).toHaveBeenCalledWith('Database monitoring disabled');
      });

      it('should setup monitoring when enabled', () => {
        databaseMonitor.initialize();

        // The initialize function sets up monitoring
        expect(databaseMonitor.enabled).toBe(true);
      });

      it('should setup metrics interval', () => {
        databaseMonitor.initialize();

        expect(databaseMonitor.metricsInterval).toBeDefined();
      });

      it('should log initialization message', () => {
        databaseMonitor.initialize();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('database monitoring')
        );
      });
    });

    describe('logOperation', () => {
      beforeEach(() => {
        databaseMonitor.enabled = true;
      });

      afterEach(() => {
        databaseMonitor.enabled = false;
      });

      it('should log ZeroDB operation', () => {
        databaseMonitor.logOperation('zerodb', {
          operation: 'find',
          model: 'User',
          duration: 15,
          success: true,
          timestamp: new Date().toISOString()
        });

        expect(databaseMonitor.metrics.zerodb.totalOps).toBe(1);
        expect(databaseMonitor.metrics.zerodb.operations.length).toBe(1);
      });

      it('should log ZeroDB operation', () => {
        databaseMonitor.logOperation('zerodb', {
          operation: 'GET /documents',
          duration: 50,
          success: true,
          timestamp: new Date().toISOString()
        });

        expect(databaseMonitor.metrics.zerodb.totalOps).toBe(1);
      });

      it('should not log when disabled', () => {
        databaseMonitor.enabled = false;

        databaseMonitor.logOperation('zerodb', {
          operation: 'find',
          duration: 15,
          success: true
        });

        expect(databaseMonitor.metrics.zerodb.totalOps).toBe(0);
      });

      it('should trim old operations when exceeding max', () => {
        // Reset operations
        databaseMonitor.metrics.zerodb.operations = [];

        // Fill to max + some
        for (let i = 0; i < 1005; i++) {
          databaseMonitor.logOperation('zerodb', {
            operation: 'find',
            duration: i,
            success: true
          });
        }

        expect(databaseMonitor.metrics.zerodb.operations.length).toBeLessThanOrEqual(
          databaseMonitor.maxOperationsInMemory
        );
      });
    });

    describe('logError', () => {
      beforeEach(() => {
        databaseMonitor.enabled = true;
        databaseMonitor.metrics.zerodb.errors = [];
        databaseMonitor.metrics.zerodb.totalErrors = 0;
      });

      afterEach(() => {
        databaseMonitor.enabled = false;
      });

      it('should log ZeroDB error', () => {
        const error = new Error('Connection failed');
        error.code = 'ECONNREFUSED';

        databaseMonitor.logError('zerodb', error, {
          operation: 'find',
          model: 'User'
        });

        expect(databaseMonitor.metrics.zerodb.totalErrors).toBe(1);
        expect(databaseMonitor.metrics.zerodb.errors.length).toBe(1);
      });

      it('should not log when disabled', () => {
        databaseMonitor.enabled = false;

        databaseMonitor.logError('zerodb', new Error('Test'), {});

        expect(databaseMonitor.metrics.zerodb.totalErrors).toBe(0);
      });

      it('should trim old errors when exceeding 100', () => {
        for (let i = 0; i < 105; i++) {
          databaseMonitor.logError('zerodb', new Error(`Error ${i}`), {});
        }

        expect(databaseMonitor.metrics.zerodb.errors.length).toBeLessThanOrEqual(100);
      });
    });

    describe('calculateMetrics', () => {
      beforeEach(() => {
        databaseMonitor.enabled = true;
        databaseMonitor.metrics.zerodb.operations = [];
      });

      afterEach(() => {
        databaseMonitor.enabled = false;
      });

      it('should calculate average duration', () => {
        const ops = [
          { duration: 10, success: true },
          { duration: 20, success: true },
          { duration: 30, success: true }
        ];

        ops.forEach(op => {
          databaseMonitor.metrics.zerodb.operations.push(op);
        });

        databaseMonitor.calculateMetrics();

        expect(databaseMonitor.currentMetrics.zerodb.avg).toBe(20);
      });

      it('should calculate percentiles', () => {
        // Create 100 operations with increasing durations
        for (let i = 1; i <= 100; i++) {
          databaseMonitor.metrics.zerodb.operations.push({
            duration: i,
            success: true
          });
        }

        databaseMonitor.calculateMetrics();

        expect(databaseMonitor.currentMetrics.zerodb.p95).toBeGreaterThan(90);
        expect(databaseMonitor.currentMetrics.zerodb.p99).toBeGreaterThan(95);
      });

      it('should calculate error rate', () => {
        const ops = [
          { duration: 10, success: true },
          { duration: 20, success: false },
          { duration: 30, success: true },
          { duration: 40, success: false }
        ];

        ops.forEach(op => {
          databaseMonitor.metrics.zerodb.operations.push(op);
        });

        databaseMonitor.calculateMetrics();

        expect(databaseMonitor.currentMetrics.zerodb.errorRate).toBe(50);
      });

      it('should handle empty operations', () => {
        databaseMonitor.metrics.zerodb.operations = [];

        databaseMonitor.calculateMetrics();

        expect(databaseMonitor.currentMetrics.zerodb.avg).toBe(0);
        expect(databaseMonitor.currentMetrics.zerodb.errorRate).toBe(0);
      });
    });

    describe('getMetrics', () => {
      it('should return metrics for zerodb', () => {
        const metrics = databaseMonitor.getMetrics();

        expect(metrics.zerodb).toBeDefined();
        expect(metrics.zerodb.totalOperations).toBeDefined();
        expect(metrics.zerodb.rateLimit).toBeDefined();
      });
    });

    describe('getRecentOperations', () => {
      beforeEach(() => {
        databaseMonitor.enabled = true;
        databaseMonitor.metrics.zerodb.operations = [];
      });

      afterEach(() => {
        databaseMonitor.enabled = false;
      });

      it('should return recent operations', () => {
        for (let i = 0; i < 100; i++) {
          databaseMonitor.metrics.zerodb.operations.push({
            operation: `op${i}`,
            duration: i
          });
        }

        const recent = databaseMonitor.getRecentOperations('zerodb', 10);

        expect(recent.length).toBe(10);
        expect(recent[0].operation).toBe('op90');
      });

      it('should default to 50 operations', () => {
        for (let i = 0; i < 100; i++) {
          databaseMonitor.metrics.zerodb.operations.push({
            operation: `op${i}`
          });
        }

        const recent = databaseMonitor.getRecentOperations('zerodb');

        expect(recent.length).toBe(50);
      });
    });

    describe('getRecentErrors', () => {
      beforeEach(() => {
        databaseMonitor.enabled = true;
        databaseMonitor.metrics.zerodb.errors = [];
      });

      afterEach(() => {
        databaseMonitor.enabled = false;
      });

      it('should return recent errors', () => {
        for (let i = 0; i < 20; i++) {
          databaseMonitor.metrics.zerodb.errors.push({
            error: { message: `Error ${i}` }
          });
        }

        const recent = databaseMonitor.getRecentErrors('zerodb', 5);

        expect(recent.length).toBe(5);
      });
    });

    describe('sanitizeQuery', () => {
      it('should redact sensitive fields', () => {
        const query = {
          email: 'test@example.com',
          password: 'secret123',
          token: 'jwt-token',
          apiKey: 'api-key-123'
        };

        const sanitized = databaseMonitor.sanitizeQuery(query);

        expect(sanitized.email).toBe('test@example.com');
        expect(sanitized.password).toBe('***REDACTED***');
        expect(sanitized.token).toBe('***REDACTED***');
        expect(sanitized.apiKey).toBe('***REDACTED***');
      });

      it('should handle null query', () => {
        expect(databaseMonitor.sanitizeQuery(null)).toBeNull();
      });

      it('should handle non-object query', () => {
        expect(databaseMonitor.sanitizeQuery('string')).toBe('string');
      });
    });

    describe('shutdown', () => {
      it('should clear metrics interval', () => {
        databaseMonitor.metricsInterval = setInterval(() => {}, 1000);
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        databaseMonitor.shutdown();

        expect(clearIntervalSpy).toHaveBeenCalled();
      });

      it('should log shutdown message', () => {
        databaseMonitor.shutdown();

        expect(consoleSpy).toHaveBeenCalledWith('Database monitoring shut down');
      });
    });
  });

  describe('metricsMiddleware', () => {
    it('should respond with 503 when monitoring disabled', () => {
      req.path = '/api/v1/admin/db-metrics';
      req.method = 'GET';
      databaseMonitor.enabled = false;

      metricsMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database monitoring is not enabled'
      });
    });

    it('should return metrics when enabled', () => {
      req.path = '/api/v1/admin/db-metrics';
      req.method = 'GET';
      databaseMonitor.enabled = true;

      metricsMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object)
      });

      databaseMonitor.enabled = false;
    });

    it('should call next for other paths', () => {
      req.path = '/api/users';
      req.method = 'GET';

      metricsMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next for non-GET methods', () => {
      req.path = '/api/v1/admin/db-metrics';
      req.method = 'POST';

      metricsMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('setupZeroDBMonitoring', () => {
    it('should skip when disabled', () => {
      databaseMonitor.enabled = false;

      databaseMonitor.setupZeroDBMonitoring(null);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should skip when no zerodbService provided', () => {
      databaseMonitor.enabled = true;

      databaseMonitor.setupZeroDBMonitoring(null);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('ZeroDB monitoring')
      );

      databaseMonitor.enabled = false;
    });

    it('should setup interceptors when valid service provided', () => {
      databaseMonitor.enabled = true;

      const mockClient = {
        interceptors: {
          request: { handlers: [], use: jest.fn() },
          response: { handlers: [], use: jest.fn() }
        }
      };

      const mockService = {
        client: mockClient,
        token: 'test-token'
      };

      databaseMonitor.setupZeroDBMonitoring(mockService);

      expect(mockClient.interceptors.request.use).toHaveBeenCalled();
      expect(mockClient.interceptors.response.use).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ZeroDB monitoring configured')
      );

      databaseMonitor.enabled = false;
    });
  });
});
