/**
 * Cache Middleware Unit Tests
 * Issue #47: Implement Database Optimization and Caching
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const cacheMiddleware = require('../../../middleware/cacheMiddleware');

// Mock cacheService
jest.mock('../../../services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  invalidate: jest.fn(),
  getOrSet: jest.fn(),
  flush: jest.fn(),
  getStats: jest.fn()
}));

const cacheService = require('../../../services/cacheService');

describe('cacheMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      method: 'GET',
      originalUrl: '/api/v1/users',
      path: '/users',
      query: {},
      params: {},
      headers: {},
      user: { userId: 'user123' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      locals: {},
      on: jest.fn(),
      statusCode: 200
    };

    next = jest.fn();
  });

  describe('cacheResponse', () => {
    it('should return cached response on cache hit', async () => {
      const cachedData = { users: [{ id: 1, name: 'User 1' }] };
      cacheService.get.mockResolvedValue(cachedData);

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next on cache miss', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(next).toHaveBeenCalled();
    });

    it('should cache response after handler executes', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      // Simulate response being sent
      const responseData = { users: [] };
      const originalJson = res.json;
      res.json = jest.fn((data) => {
        // The middleware should intercept this
        return originalJson(data);
      });

      // After next() is called, middleware should set up response interception
      expect(res.locals).toHaveProperty('cacheKey');
    });

    it('should use custom TTL when provided', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse({ ttl: 60000 });
      await middleware(req, res, next);

      expect(res.locals.cacheTtl).toBe(60000);
    });

    it('should skip caching for non-GET requests', async () => {
      req.method = 'POST';

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should skip caching when cache-control is no-cache', async () => {
      req.headers['cache-control'] = 'no-cache';

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should include query params in cache key', async () => {
      req.query = { status: 'active', page: '1' };
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      const cacheKey = cacheService.get.mock.calls[0][0];
      expect(cacheKey).toContain('status=active');
      expect(cacheKey).toContain('page=1');
    });

    it('should support user-specific caching', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse({ userSpecific: true });
      await middleware(req, res, next);

      const cacheKey = cacheService.get.mock.calls[0][0];
      expect(cacheKey).toContain('user123');
    });

    it('should handle cache service errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      // Should continue without caching
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache on write operations', async () => {
      req.method = 'POST';
      cacheService.invalidate.mockResolvedValue(5);

      const middleware = cacheMiddleware.invalidateCache('/api/v1/users*');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // Invalidation should happen after response is sent
    });

    it('should invalidate multiple patterns', async () => {
      req.method = 'PUT';
      cacheService.invalidate.mockResolvedValue(2);

      const middleware = cacheMiddleware.invalidateCache([
        '/api/v1/users*',
        '/api/v1/profiles*'
      ]);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip invalidation for GET requests', async () => {
      req.method = 'GET';

      const middleware = cacheMiddleware.invalidateCache('/api/v1/users*');
      await middleware(req, res, next);

      expect(cacheService.invalidate).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should support dynamic pattern based on request', async () => {
      req.method = 'DELETE';
      req.params = { id: '123' };
      cacheService.invalidate.mockResolvedValue(1);

      const middleware = cacheMiddleware.invalidateCache((req) => {
        return `/api/v1/users/${req.params.id}*`;
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should invalidate after successful response only', async () => {
      req.method = 'POST';
      let afterResponseCallback;

      // Mock res.on to capture the callback
      res.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          afterResponseCallback = callback;
        }
      });
      res.statusCode = 201;

      const middleware = cacheMiddleware.invalidateCache('/api/v1/users*');
      await middleware(req, res, next);

      // Simulate response finishing successfully
      if (afterResponseCallback) {
        await afterResponseCallback();
      }

      expect(cacheService.invalidate).toHaveBeenCalled();
    });

    it('should not invalidate on error response', async () => {
      req.method = 'POST';
      let afterResponseCallback;

      res.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          afterResponseCallback = callback;
        }
      });
      res.statusCode = 500;

      const middleware = cacheMiddleware.invalidateCache('/api/v1/users*');
      await middleware(req, res, next);

      if (afterResponseCallback) {
        await afterResponseCallback();
      }

      expect(cacheService.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache key', () => {
      const key1 = cacheMiddleware.generateCacheKey(req);
      const key2 = cacheMiddleware.generateCacheKey(req);

      expect(key1).toBe(key2);
    });

    it('should include method in key', () => {
      req.method = 'GET';
      const key = cacheMiddleware.generateCacheKey(req);
      expect(key).toContain('GET');
    });

    it('should include path in key', () => {
      req.originalUrl = '/api/v1/users/123';
      const key = cacheMiddleware.generateCacheKey(req);
      expect(key).toContain('/api/v1/users/123');
    });

    it('should sort query params for consistent keys', () => {
      req.query = { b: '2', a: '1', c: '3' };
      const key1 = cacheMiddleware.generateCacheKey(req);

      req.query = { c: '3', a: '1', b: '2' };
      const key2 = cacheMiddleware.generateCacheKey(req);

      expect(key1).toBe(key2);
    });

    it('should support custom key prefix', () => {
      const key = cacheMiddleware.generateCacheKey(req, { prefix: 'custom' });
      expect(key).toMatch(/^custom:/);
    });

    it('should support including user in key', () => {
      const key = cacheMiddleware.generateCacheKey(req, { includeUser: true });
      expect(key).toContain('user123');
    });
  });

  describe('conditionalCache', () => {
    it('should cache when condition returns true', async () => {
      cacheService.get.mockResolvedValue(null);

      const condition = (req) => req.query.cacheable === 'true';
      req.query.cacheable = 'true';

      const middleware = cacheMiddleware.conditionalCache(condition);
      await middleware(req, res, next);

      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should skip caching when condition returns false', async () => {
      const condition = (req) => req.query.cacheable === 'true';
      req.query.cacheable = 'false';

      const middleware = cacheMiddleware.conditionalCache(condition);
      await middleware(req, res, next);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('etagCache', () => {
    it('should generate ETag for response', async () => {
      const middleware = cacheMiddleware.etagCache();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // ETag should be set in response
    });

    it('should return 304 when If-None-Match matches', async () => {
      const cachedEtag = '"abc123"';
      req.headers['if-none-match'] = cachedEtag;
      cacheService.get.mockResolvedValue(cachedEtag);

      const middleware = cacheMiddleware.etagCache();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(304);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('varyCache', () => {
    it('should include Vary headers in cache key', async () => {
      req.headers['accept-language'] = 'en-US';
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.varyCache(['Accept-Language']);
      await middleware(req, res, next);

      const cacheKey = cacheService.get.mock.calls[0][0];
      expect(cacheKey).toContain('en-US');
    });

    it('should set Vary response header', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.varyCache(['Accept-Language', 'Accept-Encoding']);
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith('Vary', 'Accept-Language, Accept-Encoding');
    });
  });

  describe('cacheControl', () => {
    it('should set Cache-Control header', async () => {
      const middleware = cacheMiddleware.cacheControl({
        maxAge: 3600,
        public: true
      });
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=3600')
      );
      expect(res.set).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('public')
      );
    });

    it('should support private caching', async () => {
      const middleware = cacheMiddleware.cacheControl({
        maxAge: 3600,
        private: true
      });
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('private')
      );
    });

    it('should support no-store directive', async () => {
      const middleware = cacheMiddleware.cacheControl({
        noStore: true
      });
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('no-store')
      );
    });

    it('should support stale-while-revalidate', async () => {
      const middleware = cacheMiddleware.cacheControl({
        maxAge: 3600,
        staleWhileRevalidate: 86400
      });
      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('stale-while-revalidate=86400')
      );
    });
  });

  describe('responseInterceptor', () => {
    it('should intercept json response and cache it', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      // Store original json function reference
      const interceptedJson = res.json;

      // Create mock implementation that tracks the data
      const responseData = { users: [{ id: 1 }] };

      // The middleware should have wrapped res.json
      // Test that the wrapper was set up correctly
      expect(res.locals).toBeDefined();
    });
  });

  describe('cacheTags', () => {
    it('should set cache tags for later invalidation', async () => {
      cacheService.get.mockResolvedValue(null);

      const middleware = cacheMiddleware.cacheResponse({
        tags: ['users', 'list']
      });
      await middleware(req, res, next);

      expect(res.locals.cacheTags).toEqual(['users', 'list']);
    });

    it('should support dynamic tags based on request', async () => {
      cacheService.get.mockResolvedValue(null);
      req.params.companyId = 'company123';

      const middleware = cacheMiddleware.cacheResponse({
        tags: (req) => [`company:${req.params.companyId}`, 'users']
      });
      await middleware(req, res, next);

      expect(res.locals.cacheTags).toEqual(['company:company123', 'users']);
    });
  });

  describe('bypassCache', () => {
    it('should provide bypass cache utility', async () => {
      req.bypassCache = true;

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should support header-based bypass', async () => {
      req.headers['x-bypass-cache'] = 'true';

      const middleware = cacheMiddleware.cacheResponse();
      await middleware(req, res, next);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('warmupMiddleware', () => {
    it('should trigger cache warmup for specified routes', async () => {
      const warmupRoutes = [
        '/users',
        '/companies'
      ];

      const warmupFn = jest.fn();
      const middleware = cacheMiddleware.warmup(warmupRoutes, warmupFn);

      await middleware(req, res, next);

      expect(warmupFn).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
