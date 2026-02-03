/**
 * Security Audit Logger Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for security audit logging middleware
 * Target coverage: 90%+ (security-critical)
 */

// Mock fs before requiring the module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
}));

const fs = require('fs');

describe('Security Audit Logger Middleware', () => {
  let SecurityAuditLogger;
  let securityLogger;
  let SECURITY_EVENTS;
  let SECURITY_LEVELS;
  let req;
  let res;
  let next;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Set up environment
    process.env.NODE_ENV = 'test';

    // Re-require the module
    const module = require('../../../middleware/securityAuditLogger');
    SecurityAuditLogger = module.SecurityAuditLogger;
    securityLogger = module.securityLogger;
    SECURITY_EVENTS = module.SECURITY_EVENTS;
    SECURITY_LEVELS = module.SECURITY_LEVELS;

    req = {
      ip: '127.0.0.1',
      method: 'GET',
      url: '/api/test',
      originalUrl: '/api/test',
      path: '/api/test',
      headers: {
        'user-agent': 'Mozilla/5.0',
        authorization: 'Bearer token123'
      },
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0'
        };
        return headers[header];
      }),
      user: null,
      sessionID: 'session123',
      body: {},
      file: null,
      params: { id: '123' },
      connection: {
        remoteAddress: '127.0.0.1'
      }
    };

    res = {
      locals: {}
    };

    next = jest.fn();

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('SECURITY_EVENTS', () => {
    it('should define authentication events', () => {
      expect(SECURITY_EVENTS.AUTH_LOGIN_SUCCESS).toBe('auth.login.success');
      expect(SECURITY_EVENTS.AUTH_LOGIN_FAILURE).toBe('auth.login.failure');
      expect(SECURITY_EVENTS.AUTH_LOGOUT).toBe('auth.logout');
      expect(SECURITY_EVENTS.AUTH_TOKEN_REFRESH).toBe('auth.token.refresh');
      expect(SECURITY_EVENTS.AUTH_TOKEN_INVALID).toBe('auth.token.invalid');
    });

    it('should define data events', () => {
      expect(SECURITY_EVENTS.DATA_ACCESS).toBe('data.access');
      expect(SECURITY_EVENTS.DATA_MODIFICATION).toBe('data.modification');
      expect(SECURITY_EVENTS.DATA_DELETION).toBe('data.deletion');
    });

    it('should define security events', () => {
      expect(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED).toBe('security.rate_limit_exceeded');
      expect(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY).toBe('security.suspicious_activity');
    });

    it('should define admin events', () => {
      expect(SECURITY_EVENTS.ADMIN_ACTION).toBe('admin.action');
      expect(SECURITY_EVENTS.CONFIGURATION_CHANGE).toBe('admin.config_change');
    });
  });

  describe('SECURITY_LEVELS', () => {
    it('should define all security levels', () => {
      expect(SECURITY_LEVELS.LOW).toBe('low');
      expect(SECURITY_LEVELS.MEDIUM).toBe('medium');
      expect(SECURITY_LEVELS.HIGH).toBe('high');
      expect(SECURITY_LEVELS.CRITICAL).toBe('critical');
    });
  });

  describe('SecurityAuditLogger', () => {
    let logger;

    beforeEach(() => {
      logger = new SecurityAuditLogger();
    });

    describe('generateEventId', () => {
      it('should generate unique event ID', () => {
        const eventId = logger.generateEventId();
        expect(typeof eventId).toBe('string');
        expect(eventId.length).toBe(32); // 16 bytes = 32 hex chars
      });
    });

    describe('createLogEntry', () => {
      it('should create structured log entry', () => {
        req.user = {
          id: 'user123',
          email: 'test@example.com',
          role: 'admin'
        };

        const entry = logger.createLogEntry(
          SECURITY_EVENTS.AUTH_LOGIN_SUCCESS,
          SECURITY_LEVELS.LOW,
          { action: 'test' },
          req
        );

        expect(entry.eventId).toBeDefined();
        expect(entry.timestamp).toBeDefined();
        expect(entry.eventType).toBe('auth.login.success');
        expect(entry.level).toBe('low');
        expect(entry.details).toEqual({ action: 'test' });
        expect(entry.userContext.userId).toBe('user123');
        expect(entry.userContext.userEmail).toBe('test@example.com');
        expect(entry.requestContext.ip).toBe('127.0.0.1');
      });

      it('should handle anonymous user', () => {
        const entry = logger.createLogEntry(
          SECURITY_EVENTS.AUTH_LOGIN_FAILURE,
          SECURITY_LEVELS.MEDIUM,
          {},
          req
        );

        expect(entry.userContext.userId).toBe('anonymous');
        expect(entry.userContext.userEmail).toBe('unknown');
        expect(entry.userContext.userRole).toBe('guest');
      });

      it('should redact authorization header', () => {
        const entry = logger.createLogEntry(
          SECURITY_EVENTS.DATA_ACCESS,
          SECURITY_LEVELS.LOW,
          {},
          req
        );

        expect(entry.requestContext.headers.authorization).toBe('[REDACTED]');
      });

      it('should include session ID if available', () => {
        req.sessionID = 'session-abc123';

        const entry = logger.createLogEntry(
          SECURITY_EVENTS.DATA_ACCESS,
          SECURITY_LEVELS.LOW,
          {},
          req
        );

        expect(entry.userContext.sessionId).toBe('session-abc123');
      });
    });

    describe('sanitizeRequestBody', () => {
      it('should redact sensitive fields', () => {
        const body = {
          email: 'test@example.com',
          password: 'secret123',
          token: 'jwt-token',
          name: 'Test User'
        };

        const sanitized = logger.sanitizeRequestBody(body);

        expect(sanitized.email).toBe('test@example.com');
        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.token).toBe('[REDACTED]');
        expect(sanitized.name).toBe('Test User');
      });

      it('should handle null body', () => {
        const result = logger.sanitizeRequestBody(null);
        expect(result).toBeNull();
      });

      it('should handle non-object body', () => {
        const result = logger.sanitizeRequestBody('string');
        expect(result).toBe('string');
      });

      it('should redact ssn and creditCard', () => {
        const body = {
          ssn: '123-45-6789',
          creditCard: '4111111111111111',
          key: 'api-key',
          secret: 'secret-value'
        };

        const sanitized = logger.sanitizeRequestBody(body);

        expect(sanitized.ssn).toBe('[REDACTED]');
        expect(sanitized.creditCard).toBe('[REDACTED]');
        expect(sanitized.key).toBe('[REDACTED]');
        expect(sanitized.secret).toBe('[REDACTED]');
      });
    });

    describe('logSecurityEvent', () => {
      it('should log security event', () => {
        // The logger writes to file and/or console depending on environment
        const writeLogSpy = jest.spyOn(logger, 'writeLogEntry');

        logger.logSecurityEvent(
          SECURITY_EVENTS.AUTH_LOGIN_SUCCESS,
          SECURITY_LEVELS.LOW,
          { action: 'login' },
          req
        );

        expect(writeLogSpy).toHaveBeenCalled();
      });

      it('should log critical events to audit log too', () => {
        const writeLogSpy = jest.spyOn(logger, 'writeLogEntry');

        logger.logSecurityEvent(
          SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          SECURITY_LEVELS.CRITICAL,
          { threat: 'detected' },
          req
        );

        // Should be called twice - once for security log, once for audit log
        expect(writeLogSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('logAuditEvent', () => {
      it('should log audit event with medium level', () => {
        const writeLogSpy = jest.spyOn(logger, 'writeLogEntry');

        logger.logAuditEvent(
          SECURITY_EVENTS.DATA_ACCESS,
          { resource: 'users' },
          req
        );

        expect(writeLogSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            level: SECURITY_LEVELS.MEDIUM
          }),
          true
        );
      });
    });
  });

  describe('Middleware Factory', () => {
    let logger;
    let middleware;

    beforeEach(() => {
      logger = new SecurityAuditLogger();
      middleware = logger.createMiddleware();
    });

    describe('authSuccess', () => {
      it('should log successful authentication', () => {
        const logSpy = jest.spyOn(logger, 'logSecurityEvent');
        req.user = { id: 'user123' };

        middleware.authSuccess(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.AUTH_LOGIN_SUCCESS,
          SECURITY_LEVELS.LOW,
          expect.objectContaining({ action: 'successful_login' }),
          req
        );
        expect(next).toHaveBeenCalled();
      });
    });

    describe('authFailure', () => {
      it('should log failed authentication', () => {
        const logSpy = jest.spyOn(logger, 'logSecurityEvent');
        req.body = { email: 'test@example.com' };
        res.locals.authError = 'Invalid password';

        middleware.authFailure(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.AUTH_LOGIN_FAILURE,
          SECURITY_LEVELS.MEDIUM,
          expect.objectContaining({
            action: 'failed_login_attempt',
            attemptedEmail: 'test@example.com'
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });
    });

    describe('unauthorizedAccess', () => {
      it('should log unauthorized access attempt', () => {
        const logSpy = jest.spyOn(logger, 'logSecurityEvent');
        res.locals.requiredPermission = 'admin:write';

        middleware.unauthorizedAccess(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.AUTH_UNAUTHORIZED_ACCESS,
          SECURITY_LEVELS.HIGH,
          expect.objectContaining({
            action: 'unauthorized_access_attempt',
            resource: '/api/test'
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });
    });

    describe('dataAccess', () => {
      it('should log data access', () => {
        const logSpy = jest.spyOn(logger, 'logAuditEvent');

        const dataAccessMiddleware = middleware.dataAccess('users');
        dataAccessMiddleware(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.DATA_ACCESS,
          expect.objectContaining({
            resourceType: 'users',
            resourceId: '123',
            operation: 'read'
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });

      it('should use "collection" for missing id', () => {
        const logSpy = jest.spyOn(logger, 'logAuditEvent');
        req.params = {};

        const dataAccessMiddleware = middleware.dataAccess('users');
        dataAccessMiddleware(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.DATA_ACCESS,
          expect.objectContaining({
            resourceId: 'collection'
          }),
          req
        );
      });
    });

    describe('dataModification', () => {
      it('should log data modification', () => {
        const logSpy = jest.spyOn(logger, 'logAuditEvent');
        req.method = 'POST';
        req.body = { name: 'New User', password: 'secret' };

        const dataModMiddleware = middleware.dataModification('users');
        dataModMiddleware(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.DATA_MODIFICATION,
          expect.objectContaining({
            resourceType: 'users',
            operation: 'post',
            changes: expect.objectContaining({
              name: 'New User',
              password: '[REDACTED]'
            })
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });
    });

    describe('adminAction', () => {
      it('should log admin action', () => {
        const logSpy = jest.spyOn(logger, 'logSecurityEvent');
        req.user = { id: 'admin123' };
        req.method = 'DELETE';
        req.originalUrl = '/api/users/456';

        middleware.adminAction(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.ADMIN_ACTION,
          SECURITY_LEVELS.HIGH,
          expect.objectContaining({
            action: 'admin_operation',
            operation: 'DELETE /api/users/456'
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });
    });

    describe('rateLimitExceeded', () => {
      it('should log rate limit exceeded', () => {
        const logSpy = jest.spyOn(logger, 'logSecurityEvent');
        res.locals.rateLimit = {
          limit: 100,
          remaining: 0,
          resetTime: Date.now() + 60000
        };

        middleware.rateLimitExceeded(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          SECURITY_LEVELS.MEDIUM,
          expect.objectContaining({
            action: 'rate_limit_exceeded'
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });
    });

    describe('fileUpload', () => {
      it('should log file upload', () => {
        const logSpy = jest.spyOn(logger, 'logAuditEvent');
        req.file = {
          originalname: 'document.pdf',
          size: 1024000,
          mimetype: 'application/pdf'
        };

        middleware.fileUpload(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.FILE_UPLOAD,
          expect.objectContaining({
            action: 'file_upload',
            fileName: 'document.pdf',
            fileSize: 1024000,
            mimeType: 'application/pdf'
          }),
          req
        );
        expect(next).toHaveBeenCalled();
      });

      it('should handle missing file info', () => {
        const logSpy = jest.spyOn(logger, 'logAuditEvent');

        middleware.fileUpload(req, res, next);

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_EVENTS.FILE_UPLOAD,
          expect.objectContaining({
            fileName: 'unknown',
            fileSize: 0,
            mimeType: 'unknown'
          }),
          req
        );
      });
    });
  });

  describe('Error Handler', () => {
    let logger;

    beforeEach(() => {
      logger = new SecurityAuditLogger();
    });

    it('should log 401 errors', () => {
      const logSpy = jest.spyOn(logger, 'logSecurityEvent');
      const errorHandler = logger.errorHandler();

      const err = { status: 401, message: 'Unauthorized' };

      errorHandler(err, req, res, next);

      expect(logSpy).toHaveBeenCalledWith(
        SECURITY_EVENTS.AUTH_UNAUTHORIZED_ACCESS,
        SECURITY_LEVELS.MEDIUM,
        expect.objectContaining({
          action: 'access_denied',
          statusCode: 401
        }),
        req
      );
      expect(next).toHaveBeenCalledWith(err);
    });

    it('should log 403 errors', () => {
      const logSpy = jest.spyOn(logger, 'logSecurityEvent');
      const errorHandler = logger.errorHandler();

      const err = { status: 403, message: 'Forbidden' };

      errorHandler(err, req, res, next);

      expect(logSpy).toHaveBeenCalledWith(
        SECURITY_EVENTS.AUTH_UNAUTHORIZED_ACCESS,
        SECURITY_LEVELS.MEDIUM,
        expect.any(Object),
        req
      );
    });

    it('should log 4xx errors as suspicious activity', () => {
      const logSpy = jest.spyOn(logger, 'logSecurityEvent');
      const errorHandler = logger.errorHandler();

      const err = { status: 400, message: 'Bad Request' };

      errorHandler(err, req, res, next);

      expect(logSpy).toHaveBeenCalledWith(
        SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        SECURITY_LEVELS.LOW,
        expect.objectContaining({
          action: 'client_error'
        }),
        req
      );
    });

    it('should pass error to next middleware', () => {
      const errorHandler = logger.errorHandler();
      const err = { status: 500, message: 'Server Error' };

      errorHandler(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
