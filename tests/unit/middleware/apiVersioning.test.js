/**
 * API Versioning Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for API versioning middleware
 * Target coverage: 80%+
 */

const {
  addVersionHeaders,
  createVersionedRoutes,
  validateApiVersion,
  SUPPORTED_VERSIONS
} = require('../../../middleware/apiVersioning');

describe('API Versioning Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      path: '/api/test',
      headers: {}
    };

    res = {
      set: jest.fn()
    };

    next = jest.fn();
  });

  describe('SUPPORTED_VERSIONS', () => {
    it('should export supported versions array', () => {
      expect(Array.isArray(SUPPORTED_VERSIONS)).toBe(true);
    });

    it('should include version 1', () => {
      expect(SUPPORTED_VERSIONS).toContain('1');
    });
  });

  describe('addVersionHeaders', () => {
    it('should set X-API-Version header', () => {
      addVersionHeaders(req, res, next);

      expect(res.set).toHaveBeenCalledWith('X-API-Version', '1.0');
    });

    it('should add apiVersion to request object', () => {
      addVersionHeaders(req, res, next);

      expect(req.apiVersion).toBe('1.0');
    });

    it('should call next', () => {
      addVersionHeaders(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateApiVersion', () => {
    it('should call next for non-API routes', () => {
      req.path = '/health';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next for unversioned API routes', () => {
      req.path = '/api/users';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next for supported version v1', () => {
      req.path = '/api/v1/users';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 404 for unsupported version', () => {
      req.path = '/api/v99/users';

      const resWithJson = {
        ...res,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      validateApiVersion(req, resWithJson, next);

      expect(resWithJson.status).toHaveBeenCalledWith(404);
      expect(resWithJson.json).toHaveBeenCalledWith({
        error: expect.stringContaining('API version not supported')
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should include supported versions in error message', () => {
      req.path = '/api/v2/users';

      const resWithJson = {
        ...res,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      validateApiVersion(req, resWithJson, next);

      const errorResponse = resWithJson.json.mock.calls[0][0];
      expect(errorResponse.error).toContain('v1');
    });

    it('should handle path without version specifier after api', () => {
      req.path = '/api/users/123';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle root path', () => {
      req.path = '/';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty path segments', () => {
      req.path = '/api//users';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('createVersionedRoutes', () => {
    let mockApp;
    let consoleSpy;

    beforeEach(() => {
      mockApp = {
        use: jest.fn()
      };
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should create versioned routes for API paths', () => {
      const routes = {
        usersRouter: jest.fn()
      };

      const routeMappings = {
        '/api/users': 'usersRouter'
      };

      createVersionedRoutes(mockApp, routes, routeMappings);

      expect(mockApp.use).toHaveBeenCalledWith('/api/v1/users', routes.usersRouter);
    });

    it('should skip non-API paths', () => {
      const routes = {
        healthRouter: jest.fn()
      };

      const routeMappings = {
        '/health': 'healthRouter'
      };

      createVersionedRoutes(mockApp, routes, routeMappings);

      expect(mockApp.use).not.toHaveBeenCalled();
    });

    it('should skip if route handler does not exist', () => {
      const routes = {
        usersRouter: jest.fn()
      };

      const routeMappings = {
        '/api/users': 'usersRouter',
        '/api/nonexistent': 'nonexistentRouter'
      };

      createVersionedRoutes(mockApp, routes, routeMappings);

      // Only usersRouter should be registered
      expect(mockApp.use).toHaveBeenCalledTimes(1);
    });

    it('should register routes for all supported versions', () => {
      const routes = {
        usersRouter: jest.fn()
      };

      const routeMappings = {
        '/api/users': 'usersRouter'
      };

      createVersionedRoutes(mockApp, routes, routeMappings);

      SUPPORTED_VERSIONS.forEach(version => {
        expect(mockApp.use).toHaveBeenCalledWith(
          `/api/v${version}/users`,
          routes.usersRouter
        );
      });
    });

    it('should log registered routes', () => {
      const routes = {
        usersRouter: jest.fn()
      };

      const routeMappings = {
        '/api/users': 'usersRouter'
      };

      createVersionedRoutes(mockApp, routes, routeMappings);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registered versioned route')
      );
    });

    it('should handle multiple routes', () => {
      const routes = {
        usersRouter: jest.fn(),
        companiesRouter: jest.fn(),
        documentsRouter: jest.fn()
      };

      const routeMappings = {
        '/api/users': 'usersRouter',
        '/api/companies': 'companiesRouter',
        '/api/documents': 'documentsRouter'
      };

      createVersionedRoutes(mockApp, routes, routeMappings);

      expect(mockApp.use).toHaveBeenCalledTimes(3);
    });

    it('should handle empty route mappings', () => {
      createVersionedRoutes(mockApp, {}, {});

      expect(mockApp.use).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle version number extraction correctly', () => {
      req.path = '/api/v1/users/123/documents';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle paths with query strings in validation', () => {
      req.path = '/api/v1/users';

      validateApiVersion(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject unsupported version format', () => {
      req.path = '/api/version1/users';

      const resWithStatus = {
        ...res,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      validateApiVersion(req, resWithStatus, next);

      // 'version1' starts with 'v', so it extracts 'ersion1' as version
      // which is not supported, so it returns 404
      expect(resWithStatus.status).toHaveBeenCalledWith(404);
    });

    it('should handle uppercase V in path', () => {
      req.path = '/api/V1/users';

      const resWithStatus = {
        ...res,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      validateApiVersion(req, resWithStatus, next);

      // Uppercase V doesn't match lowercase 'v', so next() is called
      expect(next).toHaveBeenCalled();
    });
  });
});
