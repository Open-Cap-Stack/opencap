/**
 * LoggingService Tests
 *
 * Test suite for structured logging service
 * Tests JSON structured logs, request ID tracking, and log aggregation
 */

// Set timeout for tests
jest.setTimeout(10000);

const LoggingService = require('../../../services/loggingService');

describe('LoggingService', () => {
  let loggingService;
  let mockConsole;

  beforeEach(() => {
    // Create new instance for each test
    loggingService = new LoggingService();

    // Mock console methods
    mockConsole = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(loggingService.config).toBeDefined();
      expect(loggingService.config.level).toBe('info');
      expect(loggingService.config.format).toBe('json');
    });

    it('should initialize with custom configuration', () => {
      const customService = new LoggingService({
        level: 'debug',
        format: 'text',
        serviceName: 'test-service'
      });

      expect(customService.config.level).toBe('debug');
      expect(customService.config.format).toBe('text');
      expect(customService.config.serviceName).toBe('test-service');
    });

    it('should set log level priority correctly', () => {
      expect(loggingService.shouldLog('error')).toBe(true);
      expect(loggingService.shouldLog('warn')).toBe(true);
      expect(loggingService.shouldLog('info')).toBe(true);
      expect(loggingService.shouldLog('debug')).toBe(false); // Default level is info
    });
  });

  describe('log levels', () => {
    describe('error', () => {
      it('should log error messages with correct structure', () => {
        loggingService.error('Test error message');

        expect(mockConsole.error).toHaveBeenCalled();
        const logArg = JSON.parse(mockConsole.error.mock.calls[0][0]);
        expect(logArg.level).toBe('error');
        expect(logArg.message).toBe('Test error message');
        expect(logArg.timestamp).toBeDefined();
      });

      it('should include error stack trace when Error object is provided', () => {
        const error = new Error('Test error');
        loggingService.error('Error occurred', { error });

        const logArg = JSON.parse(mockConsole.error.mock.calls[0][0]);
        expect(logArg.error).toBeDefined();
        expect(logArg.error.stack).toBeDefined();
      });

      it('should include error metadata', () => {
        loggingService.error('Database error', {
          errorCode: 'DB_CONN_FAILED',
          database: 'zerodb'
        });

        const logArg = JSON.parse(mockConsole.error.mock.calls[0][0]);
        expect(logArg.errorCode).toBe('DB_CONN_FAILED');
        expect(logArg.database).toBe('zerodb');
      });
    });

    describe('warn', () => {
      it('should log warning messages', () => {
        loggingService.warn('Test warning message');

        expect(mockConsole.warn).toHaveBeenCalled();
        const logArg = JSON.parse(mockConsole.warn.mock.calls[0][0]);
        expect(logArg.level).toBe('warn');
        expect(logArg.message).toBe('Test warning message');
      });

      it('should include warning context', () => {
        loggingService.warn('High memory usage', {
          memoryUsage: 90,
          threshold: 80
        });

        const logArg = JSON.parse(mockConsole.warn.mock.calls[0][0]);
        expect(logArg.memoryUsage).toBe(90);
        expect(logArg.threshold).toBe(80);
      });
    });

    describe('info', () => {
      it('should log info messages', () => {
        loggingService.info('Application started');

        expect(mockConsole.log).toHaveBeenCalled();
        const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
        expect(logArg.level).toBe('info');
        expect(logArg.message).toBe('Application started');
      });

      it('should include info context', () => {
        loggingService.info('Request completed', {
          requestId: 'req-123',
          duration: 150
        });

        const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
        expect(logArg.requestId).toBe('req-123');
        expect(logArg.duration).toBe(150);
      });
    });

    describe('debug', () => {
      it('should not log debug messages when level is info', () => {
        loggingService.debug('Debug message');

        expect(mockConsole.debug).not.toHaveBeenCalled();
      });

      it('should log debug messages when level is debug', () => {
        const debugService = new LoggingService({ level: 'debug' });
        debugService.debug('Debug message');

        expect(mockConsole.debug).toHaveBeenCalled();
        const logArg = JSON.parse(mockConsole.debug.mock.calls[0][0]);
        expect(logArg.level).toBe('debug');
        expect(logArg.message).toBe('Debug message');
      });
    });
  });

  describe('request ID tracking', () => {
    it('should generate unique request IDs', () => {
      const id1 = loggingService.generateRequestId();
      const id2 = loggingService.generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should include request ID in logs when context has requestId', () => {
      loggingService.info('Request received', { requestId: 'req-abc-123' });

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.requestId).toBe('req-abc-123');
    });

    it('should maintain request context across multiple logs', () => {
      const context = loggingService.createContext({ requestId: 'req-xyz-789' });

      loggingService.info('Step 1', context);
      loggingService.info('Step 2', context);
      loggingService.info('Step 3', context);

      const calls = mockConsole.log.mock.calls;
      expect(JSON.parse(calls[0][0]).requestId).toBe('req-xyz-789');
      expect(JSON.parse(calls[1][0]).requestId).toBe('req-xyz-789');
      expect(JSON.parse(calls[2][0]).requestId).toBe('req-xyz-789');
    });
  });

  describe('log context', () => {
    it('should create context with default values', () => {
      const context = loggingService.createContext();

      expect(context).toBeDefined();
      expect(context.requestId).toBeDefined();
      expect(context.timestamp).toBeDefined();
    });

    it('should create context with custom values', () => {
      const context = loggingService.createContext({
        requestId: 'custom-req-id',
        userId: 'user-123',
        action: 'create_document'
      });

      expect(context.requestId).toBe('custom-req-id');
      expect(context.userId).toBe('user-123');
      expect(context.action).toBe('create_document');
    });

    it('should extend existing context', () => {
      const baseContext = loggingService.createContext({ requestId: 'req-123' });
      const extendedContext = loggingService.extendContext(baseContext, {
        stepNumber: 1,
        operation: 'fetch'
      });

      expect(extendedContext.requestId).toBe('req-123');
      expect(extendedContext.stepNumber).toBe(1);
      expect(extendedContext.operation).toBe('fetch');
    });
  });

  describe('JSON structured output', () => {
    it('should output valid JSON format', () => {
      loggingService.info('Test message');

      const logOutput = mockConsole.log.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should include standard fields in all logs', () => {
      loggingService.info('Test message');

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg).toHaveProperty('timestamp');
      expect(logArg).toHaveProperty('level');
      expect(logArg).toHaveProperty('message');
    });

    it('should include service name when configured', () => {
      const service = new LoggingService({ serviceName: 'opencap-api' });
      service.info('Test message');

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.service).toBe('opencap-api');
    });

    it('should include environment when configured', () => {
      const service = new LoggingService({ environment: 'production' });
      service.info('Test message');

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.environment).toBe('production');
    });

    it('should handle circular references gracefully', () => {
      const obj = { name: 'test' };
      obj.self = obj; // Create circular reference

      expect(() => {
        loggingService.info('Circular object', { data: obj });
      }).not.toThrow();
    });
  });

  describe('log aggregation', () => {
    it('should aggregate logs by level', () => {
      const aggregatingService = new LoggingService({ enableAggregation: true });

      aggregatingService.error('Error 1');
      aggregatingService.error('Error 2');
      aggregatingService.warn('Warning 1');
      aggregatingService.info('Info 1');

      const stats = aggregatingService.getLogStats();
      expect(stats.byLevel.error).toBe(2);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byLevel.info).toBe(1);
    });

    it('should track log frequency over time', () => {
      const aggregatingService = new LoggingService({ enableAggregation: true });

      aggregatingService.info('Request 1');
      aggregatingService.info('Request 2');
      aggregatingService.info('Request 3');

      const stats = aggregatingService.getLogStats();
      expect(stats.totalLogs).toBe(3);
    });

    it('should clear aggregated stats', () => {
      const aggregatingService = new LoggingService({ enableAggregation: true });

      aggregatingService.info('Test');
      aggregatingService.clearStats();

      const stats = aggregatingService.getLogStats();
      expect(stats.totalLogs).toBe(0);
    });

    it('should track unique error types', () => {
      const aggregatingService = new LoggingService({ enableAggregation: true });

      aggregatingService.error('Database error', { errorType: 'DB_ERROR' });
      aggregatingService.error('Database error', { errorType: 'DB_ERROR' });
      aggregatingService.error('Auth error', { errorType: 'AUTH_ERROR' });

      const stats = aggregatingService.getLogStats();
      expect(stats.byErrorType['DB_ERROR']).toBe(2);
      expect(stats.byErrorType['AUTH_ERROR']).toBe(1);
    });
  });

  describe('HTTP request logging', () => {
    it('should log HTTP request details', () => {
      const req = {
        method: 'GET',
        url: '/api/v1/users',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1'
      };

      loggingService.logRequest(req);

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.http).toBeDefined();
      expect(logArg.http.method).toBe('GET');
      expect(logArg.http.url).toBe('/api/v1/users');
      expect(logArg.http.ip).toBe('127.0.0.1');
    });

    it('should log HTTP response details', () => {
      const req = { method: 'GET', url: '/api/v1/users' };
      const res = { statusCode: 200 };
      const responseTime = 150;

      loggingService.logResponse(req, res, responseTime);

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.http.statusCode).toBe(200);
      expect(logArg.http.responseTime).toBe(150);
    });

    it('should mask sensitive headers', () => {
      const req = {
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'authorization': 'Bearer secret-token',
          'content-type': 'application/json'
        }
      };

      loggingService.logRequest(req);

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.http.headers.authorization).toBe('[REDACTED]');
      expect(logArg.http.headers['content-type']).toBe('application/json');
    });
  });

  describe('middleware', () => {
    it('should return Express middleware function', () => {
      const middleware = loggingService.middleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should call next() in middleware', () => {
      const middleware = loggingService.middleware();
      const req = { method: 'GET', url: '/test', headers: {} };
      const res = { on: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should assign requestId to request object', () => {
      const middleware = loggingService.middleware();
      const req = { method: 'GET', url: '/test', headers: {} };
      const res = { on: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.requestId).toBeDefined();
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', () => {
      const childLogger = loggingService.child({ module: 'auth' });

      childLogger.info('Auth operation');

      const logArg = JSON.parse(mockConsole.log.mock.calls[0][0]);
      expect(logArg.module).toBe('auth');
    });

    it('should inherit parent configuration', () => {
      const parentService = new LoggingService({
        serviceName: 'opencap-api',
        level: 'debug'
      });
      const childLogger = parentService.child({ module: 'database' });

      childLogger.debug('Database query');

      expect(mockConsole.debug).toHaveBeenCalled();
      const logArg = JSON.parse(mockConsole.debug.mock.calls[0][0]);
      expect(logArg.service).toBe('opencap-api');
      expect(logArg.module).toBe('database');
    });
  });

  describe('log rotation support', () => {
    it('should support file transport configuration', () => {
      const service = new LoggingService({
        transports: [
          { type: 'console' },
          { type: 'file', path: '/var/log/app.log' }
        ]
      });

      expect(service.config.transports).toHaveLength(2);
    });
  });

  describe('performance', () => {
    it('should handle high volume logging', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        loggingService.info(`Log entry ${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
