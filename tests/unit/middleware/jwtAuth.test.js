/**
 * JWT Auth Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for JWT authentication middleware
 * Target coverage: 80%+
 */

const jwt = require('jsonwebtoken');

describe('JWT Auth Middleware', () => {
  let jwtAuth;
  let req;
  let res;
  let next;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-jwtauth-testing';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules();
    jwtAuth = require('../../../middleware/jwtAuth');

    req = {
      headers: {},
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header', () => {
      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No authentication token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is not Bearer format', () => {
      req.headers.authorization = 'Basic sometoken';

      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token format'
      });
    });

    it('should return 401 if Bearer but no token', () => {
      req.headers.authorization = 'Bearer';

      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token format'
      });
    });

    it('should return 401 for invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token';

      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token'
      });
    });

    it('should return 401 for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token expired'
      });
    });

    it('should call next and set user for valid token', () => {
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com', roles: ['user'] },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      jwtAuth.authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user123');
      expect(req.user.email).toBe('test@example.com');
    });

    it('should handle malformed authorization header', () => {
      req.headers.authorization = 'Bearer token extra parts';

      jwtAuth.authenticate(req, res, next);

      // Should still try to verify and fail
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authenticateRole', () => {
    it('should return 401 if user not authenticated', () => {
      const middleware = jwtAuth.authenticateRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not authenticated'
      });
    });

    it('should call next if user has required role', () => {
      req.user = { roles: ['admin', 'user'] };

      const middleware = jwtAuth.authenticateRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user lacks required role', () => {
      req.user = { roles: ['user'] };

      const middleware = jwtAuth.authenticateRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied: Insufficient permissions'
      });
    });

    it('should accept array of roles', () => {
      req.user = { roles: ['manager'] };

      const middleware = jwtAuth.authenticateRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should convert single role string to array', () => {
      req.user = { roles: ['admin'] };

      const middleware = jwtAuth.authenticateRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user has none of the required roles', () => {
      req.user = { roles: ['user'] };

      const middleware = jwtAuth.authenticateRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle user with empty roles array', () => {
      req.user = { roles: [] };

      const middleware = jwtAuth.authenticateRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle user without roles property', () => {
      req.user = { id: 'user123' };

      const middleware = jwtAuth.authenticateRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle token signed with wrong secret', () => {
      const token = jwt.sign(
        { userId: 'user123' },
        'wrong-secret',
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token'
      });
    });

    it('should handle malformed JWT', () => {
      req.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed';

      jwtAuth.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle token with empty payload', () => {
      const token = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      jwtAuth.authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(expect.objectContaining({}));
    });
  });

  describe('Token Verification', () => {
    it('should verify token signature', () => {
      const token = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      jwtAuth.authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should extract all payload fields', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['admin'],
        customField: 'value'
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      jwtAuth.authenticate(req, res, next);

      expect(req.user.userId).toBe('user123');
      expect(req.user.email).toBe('test@example.com');
      expect(req.user.roles).toEqual(['admin']);
      expect(req.user.customField).toBe('value');
    });
  });
});
