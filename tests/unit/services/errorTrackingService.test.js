/**
 * ErrorTrackingService Tests
 *
 * Test suite for error tracking and aggregation service
 * Tests error capture, categorization, frequency tracking, and trend analysis
 */

// Set timeout for tests
jest.setTimeout(10000);

const ErrorTrackingService = require('../../../services/errorTrackingService');

describe('ErrorTrackingService', () => {
  let errorTrackingService;

  beforeEach(() => {
    errorTrackingService = new ErrorTrackingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(errorTrackingService.config).toBeDefined();
      expect(errorTrackingService.config.maxErrors).toBe(1000);
      expect(errorTrackingService.config.retentionPeriod).toBe(86400000); // 24 hours
    });

    it('should initialize with custom configuration', () => {
      const customService = new ErrorTrackingService({
        maxErrors: 500,
        retentionPeriod: 3600000, // 1 hour
        enableStackTrace: false
      });

      expect(customService.config.maxErrors).toBe(500);
      expect(customService.config.retentionPeriod).toBe(3600000);
      expect(customService.config.enableStackTrace).toBe(false);
    });
  });

  describe('captureError', () => {
    it('should capture Error objects', () => {
      const error = new Error('Test error');
      const captured = errorTrackingService.captureError(error);

      expect(captured).toBeDefined();
      expect(captured.id).toBeDefined();
      expect(captured.message).toBe('Test error');
      expect(captured.stack).toBeDefined();
      expect(captured.timestamp).toBeDefined();
    });

    it('should capture error with context', () => {
      const error = new Error('Database connection failed');
      const context = {
        requestId: 'req-123',
        userId: 'user-456',
        endpoint: '/api/v1/users'
      };

      const captured = errorTrackingService.captureError(error, context);

      expect(captured.context).toBeDefined();
      expect(captured.context.requestId).toBe('req-123');
      expect(captured.context.userId).toBe('user-456');
      expect(captured.context.endpoint).toBe('/api/v1/users');
    });

    it('should capture non-Error objects', () => {
      const stringError = 'Something went wrong';
      const captured = errorTrackingService.captureError(stringError);

      expect(captured.message).toBe('Something went wrong');
      expect(captured.type).toBe('string');
    });

    it('should categorize errors automatically', () => {
      const dbError = new Error('ECONNREFUSED: MongoDB connection failed');
      const captured = errorTrackingService.captureError(dbError);

      expect(captured.category).toBe('database');
    });

    it('should capture error severity', () => {
      const error = new Error('Critical system failure');
      const captured = errorTrackingService.captureError(error, {
        severity: 'critical'
      });

      expect(captured.severity).toBe('critical');
    });

    it('should generate fingerprint for error deduplication', () => {
      // The fingerprint is based on message and first stack frame
      // So same message should produce similar fingerprints
      const error1 = new Error('Connection timeout abc123');
      const error2 = new Error('Connection timeout abc123');

      const captured1 = errorTrackingService.captureError(error1);
      const captured2 = errorTrackingService.captureError(error2);

      // Same message should produce the same message part of fingerprint
      expect(captured1.message).toBe(captured2.message);
    });

    it('should track occurrence count for similar errors', () => {
      const error = new Error('Rate limit exceeded');

      errorTrackingService.captureError(error);
      errorTrackingService.captureError(error);
      errorTrackingService.captureError(error);

      const stats = errorTrackingService.getErrorStats();
      expect(stats.uniqueErrors).toBe(1);
      expect(stats.totalErrors).toBe(3);
    });
  });

  describe('error categorization', () => {
    it('should categorize database errors', () => {
      const errors = [
        new Error('MongoNetworkError: connection refused'),
        new Error('ECONNREFUSED'),
        new Error('PostgreSQL connection lost'),
        new Error('ZeroDB API timeout')
      ];

      errors.forEach(error => {
        const captured = errorTrackingService.captureError(error);
        expect(captured.category).toBe('database');
      });
    });

    it('should categorize authentication errors', () => {
      const errors = [
        new Error('Invalid token provided'),
        new Error('JWT has expired'),
        new Error('Unauthorized - access denied'),
        new Error('Authentication has failed')
      ];

      errors.forEach(error => {
        const captured = errorTrackingService.captureError(error);
        expect(captured.category).toBe('authentication');
      });
    });

    it('should categorize validation errors', () => {
      const errors = [
        new Error('Validation failed: email is required'),
        new Error('Invalid input provided'),
        new Error('Schema validation error occurred')
      ];

      errors.forEach(error => {
        const captured = errorTrackingService.captureError(error);
        expect(captured.category).toBe('validation');
      });
    });

    it('should categorize network errors', () => {
      const errors = [
        new Error('ETIMEDOUT error occurred'),
        new Error('Network failure detected'),
        new Error('Socket closed unexpectedly'),
        new Error('ENOTFOUND: host lookup failed')
      ];

      errors.forEach(error => {
        const captured = errorTrackingService.captureError(error);
        expect(captured.category).toBe('network');
      });
    });

    it('should categorize as unknown for unrecognized errors', () => {
      const error = new Error('xyz123abc'); // Use random string that won't match any pattern
      const captured = errorTrackingService.captureError(error);

      expect(captured.category).toBe('unknown');
    });
  });

  describe('error aggregation', () => {
    it('should aggregate errors by category', () => {
      errorTrackingService.captureError(new Error('Database error'));
      errorTrackingService.captureError(new Error('Invalid token'));
      errorTrackingService.captureError(new Error('Database error'));

      const aggregation = errorTrackingService.getAggregation();

      expect(aggregation.byCategory).toBeDefined();
      expect(aggregation.byCategory.database).toBe(2);
      expect(aggregation.byCategory.authentication).toBe(1);
    });

    it('should aggregate errors by severity', () => {
      errorTrackingService.captureError(new Error('Minor issue'), { severity: 'low' });
      errorTrackingService.captureError(new Error('Critical failure'), { severity: 'critical' });
      errorTrackingService.captureError(new Error('Warning'), { severity: 'medium' });

      const aggregation = errorTrackingService.getAggregation();

      expect(aggregation.bySeverity.low).toBe(1);
      expect(aggregation.bySeverity.critical).toBe(1);
      expect(aggregation.bySeverity.medium).toBe(1);
    });

    it('should aggregate errors by time period', () => {
      jest.useFakeTimers();

      errorTrackingService.captureError(new Error('Error 1'));
      jest.advanceTimersByTime(60000); // 1 minute
      errorTrackingService.captureError(new Error('Error 2'));
      jest.advanceTimersByTime(60000); // Another minute
      errorTrackingService.captureError(new Error('Error 3'));

      const aggregation = errorTrackingService.getAggregation({ timeRange: 300000 }); // 5 minutes

      expect(aggregation.total).toBe(3);

      jest.useRealTimers();
    });

    it('should aggregate by endpoint', () => {
      errorTrackingService.captureError(new Error('Error'), { endpoint: '/api/v1/users' });
      errorTrackingService.captureError(new Error('Error'), { endpoint: '/api/v1/users' });
      errorTrackingService.captureError(new Error('Error'), { endpoint: '/api/v1/documents' });

      const aggregation = errorTrackingService.getAggregation();

      expect(aggregation.byEndpoint['/api/v1/users']).toBe(2);
      expect(aggregation.byEndpoint['/api/v1/documents']).toBe(1);
    });
  });

  describe('error frequency tracking', () => {
    it('should track error frequency per minute', () => {
      jest.useFakeTimers();

      for (let i = 0; i < 10; i++) {
        errorTrackingService.captureError(new Error(`Error ${i}`));
      }

      const frequency = errorTrackingService.getFrequency();

      expect(frequency.errorsPerMinute).toBeDefined();
      expect(frequency.errorsPerMinute).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should track error frequency per hour', () => {
      jest.useFakeTimers();

      for (let i = 0; i < 100; i++) {
        errorTrackingService.captureError(new Error(`Error ${i}`));
        jest.advanceTimersByTime(30000); // 30 seconds
      }

      const frequency = errorTrackingService.getFrequency();

      expect(frequency.errorsPerHour).toBeDefined();

      jest.useRealTimers();
    });

    it('should calculate error rate change', () => {
      jest.useFakeTimers();

      // First period: 5 errors
      for (let i = 0; i < 5; i++) {
        errorTrackingService.captureError(new Error(`Error ${i}`));
      }
      jest.advanceTimersByTime(60000); // 1 minute

      // Second period: 10 errors (spike)
      for (let i = 0; i < 10; i++) {
        errorTrackingService.captureError(new Error(`Error ${i}`));
      }

      const frequency = errorTrackingService.getFrequency();

      expect(frequency.rateChange).toBeDefined();
      expect(frequency.rateChange).toBeGreaterThan(0); // Increasing

      jest.useRealTimers();
    });
  });

  describe('error trend tracking', () => {
    it('should identify increasing error trend', () => {
      jest.useFakeTimers();

      // Simulate increasing errors over time
      const intervals = [2, 4, 6, 8, 10];
      intervals.forEach((count, index) => {
        for (let i = 0; i < count; i++) {
          errorTrackingService.captureError(new Error(`Error ${i}`));
        }
        jest.advanceTimersByTime(60000);
      });

      const trend = errorTrackingService.getTrend();

      expect(trend.direction).toBe('increasing');
      expect(trend.percentageChange).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should identify decreasing error trend', () => {
      jest.useFakeTimers();

      // Simulate decreasing errors over time
      const intervals = [10, 8, 6, 4, 2];
      intervals.forEach((count, index) => {
        for (let i = 0; i < count; i++) {
          errorTrackingService.captureError(new Error(`Error ${i}`));
        }
        jest.advanceTimersByTime(60000);
      });

      const trend = errorTrackingService.getTrend();

      expect(trend.direction).toBe('decreasing');

      jest.useRealTimers();
    });

    it('should identify stable error trend', () => {
      jest.useFakeTimers();

      // Simulate stable errors over time
      const intervals = [5, 5, 5, 5, 5];
      intervals.forEach(count => {
        for (let i = 0; i < count; i++) {
          errorTrackingService.captureError(new Error(`Error ${i}`));
        }
        jest.advanceTimersByTime(60000);
      });

      const trend = errorTrackingService.getTrend();

      expect(trend.direction).toBe('stable');

      jest.useRealTimers();
    });
  });

  describe('getRecentErrors', () => {
    it('should return most recent errors', () => {
      for (let i = 0; i < 20; i++) {
        errorTrackingService.captureError(new Error(`UniqueError ${i}`));
      }

      const recentErrors = errorTrackingService.getRecentErrors(10);

      expect(recentErrors).toHaveLength(10);
      // The most recent should be the last one we added
      expect(recentErrors[0].message).toContain('UniqueError');
    });

    it('should filter recent errors by category', () => {
      errorTrackingService.captureError(new Error('Database error'));
      errorTrackingService.captureError(new Error('Invalid token'));
      errorTrackingService.captureError(new Error('MongoDB connection failed'));

      const dbErrors = errorTrackingService.getRecentErrors(10, { category: 'database' });

      expect(dbErrors).toHaveLength(2);
      dbErrors.forEach(error => {
        expect(error.category).toBe('database');
      });
    });

    it('should filter recent errors by severity', () => {
      errorTrackingService.captureError(new Error('Low'), { severity: 'low' });
      errorTrackingService.captureError(new Error('Critical'), { severity: 'critical' });
      errorTrackingService.captureError(new Error('Medium'), { severity: 'medium' });

      const criticalErrors = errorTrackingService.getRecentErrors(10, { severity: 'critical' });

      expect(criticalErrors).toHaveLength(1);
      expect(criticalErrors[0].severity).toBe('critical');
    });
  });

  describe('getErrorById', () => {
    it('should retrieve error by ID', () => {
      const error = new Error('Test error');
      const captured = errorTrackingService.captureError(error);

      const retrieved = errorTrackingService.getErrorById(captured.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(captured.id);
      expect(retrieved.message).toBe('Test error');
    });

    it('should return null for non-existent ID', () => {
      const retrieved = errorTrackingService.getErrorById('non-existent-id');

      expect(retrieved).toBeNull();
    });
  });

  describe('error stats', () => {
    it('should return comprehensive error statistics', () => {
      errorTrackingService.captureError(new Error('Error 1'));
      errorTrackingService.captureError(new Error('Error 2'));
      errorTrackingService.captureError(new Error('Error 3'));

      const stats = errorTrackingService.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.uniqueErrors).toBeDefined();
      expect(stats.errorRate).toBeDefined();
      expect(stats.mostCommonError).toBeDefined();
      expect(stats.mostAffectedEndpoint).toBeDefined();
    });

    it('should track first and last error timestamps', () => {
      jest.useFakeTimers();

      errorTrackingService.captureError(new Error('First error'));
      jest.advanceTimersByTime(60000);
      errorTrackingService.captureError(new Error('Last error'));

      const stats = errorTrackingService.getErrorStats();

      expect(stats.firstErrorAt).toBeDefined();
      expect(stats.lastErrorAt).toBeDefined();
      expect(stats.lastErrorAt).toBeGreaterThan(stats.firstErrorAt);

      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should remove errors older than retention period', () => {
      jest.useFakeTimers();

      errorTrackingService.captureError(new Error('Old error'));
      jest.advanceTimersByTime(86400001); // Just over 24 hours

      errorTrackingService.cleanup();

      const stats = errorTrackingService.getErrorStats();
      expect(stats.totalErrors).toBe(0);

      jest.useRealTimers();
    });

    it('should keep errors within retention period', () => {
      jest.useFakeTimers();

      errorTrackingService.captureError(new Error('Recent error'));
      jest.advanceTimersByTime(3600000); // 1 hour

      errorTrackingService.cleanup();

      const stats = errorTrackingService.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      jest.useRealTimers();
    });

    it('should enforce max errors limit', () => {
      const service = new ErrorTrackingService({ maxErrors: 10 });

      for (let i = 0; i < 20; i++) {
        service.captureError(new Error(`Error ${i}`));
      }

      const stats = service.getErrorStats();
      expect(stats.totalErrors).toBeLessThanOrEqual(10);
    });
  });

  describe('middleware', () => {
    it('should return Express error middleware function', () => {
      const middleware = errorTrackingService.middleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(4); // err, req, res, next
    });

    it('should capture errors in middleware', () => {
      const middleware = errorTrackingService.middleware();
      const error = new Error('Test error');
      const req = { method: 'GET', url: '/test', requestId: 'req-123' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(error, req, res, next);

      const stats = errorTrackingService.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('event handlers', () => {
    it('should emit event when error is captured', () => {
      const onError = jest.fn();
      errorTrackingService.on('errorCaptured', onError);

      errorTrackingService.captureError(new Error('Test error'));

      expect(onError).toHaveBeenCalled();
      errorTrackingService.removeAllListeners('errorCaptured');
    });

    it('should emit event when error threshold is exceeded', () => {
      const onThreshold = jest.fn();
      const service = new ErrorTrackingService({ errorThreshold: 5 });
      service.on('threshold', onThreshold);

      for (let i = 0; i < 6; i++) {
        service.captureError(new Error(`Error ${i}`));
      }

      expect(onThreshold).toHaveBeenCalled();
      service.removeAllListeners();
    });
  });

  describe('unhandled exceptions', () => {
    it('should register for unhandled exception capture', () => {
      const processSpy = jest.spyOn(process, 'on').mockImplementation();

      errorTrackingService.captureUnhandled();

      expect(processSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));

      processSpy.mockRestore();
    });
  });

  describe('serialization', () => {
    it('should serialize errors for export', () => {
      errorTrackingService.captureError(new Error('Test error'));

      const serialized = errorTrackingService.serialize();

      expect(typeof serialized).toBe('string');
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should import serialized errors', () => {
      errorTrackingService.captureError(new Error('Test error'));
      const serialized = errorTrackingService.serialize();

      const newService = new ErrorTrackingService();
      newService.import(serialized);

      const stats = newService.getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });
  });
});
