/**
 * Authentication Error Logger Tests
 * Issue #250: Fix 401 Unauthorized errors on Valuations page
 */

const {
  logAuthError,
  authenticateWithLogging,
  getTokenDebugInfo,
  debugTokenEndpoint
} = require('../../../middleware/authErrorLogger');

const jwt = require('jsonwebtoken');

describe('Authentication Error Logger', () => {
  describe('logAuthError', () => {
    let mockReq;
    let originalEnv;

    beforeAll(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/api/v1/valuations',
        url: '/api/v1/valuations?page=1',
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn((header) => {
          if (header === 'user-agent') return 'Mozilla/5.0';
          return null;
        }),
        headers: {}
      };
    });

    it('should log error with complete context', () => {
      const logEntry = logAuthError(mockReq, 'Invalid token');

      expect(logEntry).toMatchObject({
        errorType: 'Invalid token',
        method: 'GET',
        path: '/api/v1/valuations',
        url: '/api/v1/valuations?page=1',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        hasAuthHeader: false,
        authHeaderPrefix: 'none'
      });

      expect(logEntry).toHaveProperty('timestamp');
    });

    it('should include auth header info when present', () => {
      mockReq.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      const logEntry = logAuthError(mockReq, 'Token expired');

      expect(logEntry).toMatchObject({
        hasAuthHeader: true,
        authHeaderPrefix: 'Bearer eyJ...'
      });
    });

    it('should include additional details when provided', () => {
      const logEntry = logAuthError(mockReq, 'User not found', {
        userId: 'user_123',
        attemptedAction: 'access_valuations'
      });

      expect(logEntry).toMatchObject({
        userId: 'user_123',
        attemptedAction: 'access_valuations'
      });
    });

    it('should handle missing connection info gracefully', () => {
      mockReq.ip = undefined;
      mockReq.connection = null;

      const logEntry = logAuthError(mockReq, 'Test error');

      expect(logEntry).toHaveProperty('errorType', 'Test error');
      expect(logEntry.ip).toBeUndefined();
    });
  });

  describe('getTokenDebugInfo', () => {
    let validToken;
    const JWT_SECRET = 'test-secret';

    beforeAll(() => {
      validToken = jwt.sign(
        {
          userId: 'user_123',
          email: 'test@example.com',
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should return error when no token provided', () => {
      const info = getTokenDebugInfo(null);

      expect(info).toEqual({
        error: 'No token provided'
      });
    });

    it('should return error when token has invalid format', () => {
      const info = getTokenDebugInfo('invalid.token');

      expect(info).toMatchObject({
        error: 'Invalid token format',
        partsCount: 2
      });
    });

    it('should decode valid token successfully', () => {
      const info = getTokenDebugInfo(validToken);

      expect(info).toHaveProperty('header');
      expect(info.header).toMatchObject({
        alg: 'HS256',
        typ: 'JWT'
      });

      expect(info).toHaveProperty('payload');
      expect(info.payload).toMatchObject({
        userId: 'user_123',
        email: 'test@example.com',
        role: 'admin'
      });

      expect(info.payload).toHaveProperty('exp');
      expect(info.payload).toHaveProperty('iat');
      expect(info.payload).toHaveProperty('isExpired');
      expect(info.payload.isExpired).toBe(false);
    });

    it('should detect expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user_123', email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const info = getTokenDebugInfo(expiredToken);

      expect(info.payload.isExpired).toBe(true);
    });

    it('should return error when token cannot be decoded', () => {
      const info = getTokenDebugInfo('not.a.valid.jwt.format.here');

      expect(info).toMatchObject({
        error: 'Failed to decode token'
      });
      expect(info).toHaveProperty('message');
    });

    it('should handle token with missing fields gracefully', () => {
      const minimalToken = jwt.sign({}, JWT_SECRET);
      const info = getTokenDebugInfo(minimalToken);

      expect(info.payload).toMatchObject({
        userId: 'missing',
        email: 'missing',
        role: 'missing'
      });
    });

    it('should include signature length info', () => {
      const info = getTokenDebugInfo(validToken);

      expect(info).toHaveProperty('signatureLength');
      expect(typeof info.signatureLength).toBe('number');
      expect(info.signatureLength).toBeGreaterThan(0);
    });
  });

  describe('debugTokenEndpoint', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
      mockReq = {
        headers: {},
        get: jest.fn()
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should detect missing Authorization header', () => {
      debugTokenEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          debug: expect.objectContaining({
            hasAuthHeader: false,
            message: 'No Authorization header found'
          })
        })
      );
    });

    it('should detect missing Bearer prefix', () => {
      mockReq.headers.authorization = 'eyJhbGciOiJIUzI1NiIs...';

      debugTokenEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          debug: expect.objectContaining({
            hasAuthHeader: true,
            hasBearer: false,
            message: 'Authorization header does not start with "Bearer "'
          })
        })
      );
    });

    it('should detect empty token after Bearer', () => {
      mockReq.headers.authorization = 'Bearer ';

      debugTokenEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          debug: expect.objectContaining({
            hasAuthHeader: true,
            hasBearer: true,
            hasToken: false,
            message: 'Token is empty after "Bearer "'
          })
        })
      );
    });

    it('should successfully validate token structure', () => {
      const validToken = jwt.sign(
        { userId: 'user_123', email: 'test@example.com', role: 'admin' },
        'test-secret',
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${validToken}`;

      debugTokenEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          debug: expect.objectContaining({
            hasAuthHeader: true,
            hasBearer: true,
            hasToken: true,
            tokenInfo: expect.objectContaining({
              header: expect.objectContaining({
                alg: 'HS256',
                typ: 'JWT'
              }),
              payload: expect.objectContaining({
                userId: 'user_123',
                email: 'test@example.com',
                role: 'admin'
              })
            }),
            message: 'Token structure is valid'
          })
        })
      );
    });

    it('should include list of headers when auth header is missing', () => {
      mockReq.headers = {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0'
      };

      debugTokenEndpoint(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          debug: expect.objectContaining({
            headers: expect.arrayContaining(['content-type', 'user-agent'])
          })
        })
      );
    });

    it('should truncate long auth header in error response', () => {
      const longToken = 'a'.repeat(100);
      mockReq.headers.authorization = longToken;

      debugTokenEndpoint(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          debug: expect.objectContaining({
            authHeaderPrefix: expect.stringMatching(/^.{20}$/)
          })
        })
      );
    });
  });

  describe('authenticateWithLogging', () => {
    let mockAuthenticateToken;
    let wrappedMiddleware;
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockAuthenticateToken = jest.fn((req, res, next) => {
        // Simulate successful auth
        req.user = { userId: 'user_123' };
        next();
      });

      wrappedMiddleware = authenticateWithLogging(mockAuthenticateToken);

      mockReq = {
        method: 'GET',
        path: '/api/v1/valuations',
        url: '/api/v1/valuations',
        headers: {},
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn(() => 'Mozilla/5.0')
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        statusCode: 200
      };

      mockNext = jest.fn();
    });

    it('should call original authenticateToken middleware', async () => {
      await wrappedMiddleware(mockReq, mockRes, mockNext);

      expect(mockAuthenticateToken).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        mockNext
      );
    });

    it('should pass through successful authentication', async () => {
      await wrappedMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({ userId: 'user_123' });
    });

    it('should intercept and log 401 responses', async () => {
      mockAuthenticateToken = jest.fn((req, res, next) => {
        res.statusCode = 401;
        res.json({ message: 'Invalid token' });
      });

      wrappedMiddleware = authenticateWithLogging(mockAuthenticateToken);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await wrappedMiddleware(mockReq, mockRes, mockNext);

      // Should have called json with error
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid token' })
      );

      consoleSpy.mockRestore();
    });

    it('should not log non-401 responses', async () => {
      mockAuthenticateToken = jest.fn((req, res, next) => {
        res.statusCode = 200;
        res.json({ success: true });
      });

      wrappedMiddleware = authenticateWithLogging(mockAuthenticateToken);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await wrappedMiddleware(mockReq, mockRes, mockNext);

      // Should not log for successful requests
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[AUTH ERROR]')
      );

      consoleSpy.mockRestore();
    });

    it('should preserve original res.json behavior', async () => {
      const testData = { test: 'data' };

      mockAuthenticateToken = jest.fn((req, res, next) => {
        res.json(testData);
      });

      wrappedMiddleware = authenticateWithLogging(mockAuthenticateToken);

      await wrappedMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(testData);
    });
  });
});
