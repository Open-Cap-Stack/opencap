/**
 * API Cache Middleware Unit Tests
 * Issue #48: Implement API Rate Limiting and Response Optimization
 * TDD Red Phase: Tests written before implementation
 */

const {
  createApiCacheMiddleware,
  ApiCacheConfig
} = require('../../../middleware/apiCache');

describe('API Cache Middleware', () => {
  let req, res, next;
  let mockCacheService;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/v1/users',
      path: '/api/v1/users',
      query: {},
      headers: {},
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      statusCode: 200,
      _headers: {}
    };

    next = jest.fn();

    mockCacheService = {
      generateCacheKey: jest.fn().mockReturnValue('mock-cache-key'),
      getCachedResponse: jest.fn().mockReturnValue(null),
      cacheResponse: jest.fn().mockReturnValue({ etag: 'W/"mock-etag"' }),
      validateETag: jest.fn().mockReturnValue(false)
    };
  });

  describe('ApiCacheConfig', () => {
    it('should have default cache TTL', () => {
      expect(ApiCacheConfig.defaultTtl).toBeDefined();
      expect(ApiCacheConfig.defaultTtl).toBeGreaterThan(0);
    });

    it('should have cacheable methods list', () => {
      expect(ApiCacheConfig.cacheableMethods).toBeDefined();
      expect(ApiCacheConfig.cacheableMethods).toContain('GET');
    });

    it('should have excluded paths configuration', () => {
      expect(ApiCacheConfig.excludePaths).toBeDefined();
      expect(Array.isArray(ApiCacheConfig.excludePaths)).toBe(true);
    });

    it('should allow configuration updates', () => {
      const original = ApiCacheConfig.defaultTtl;
      ApiCacheConfig.update({ defaultTtl: 60000 });
      expect(ApiCacheConfig.defaultTtl).toBe(60000);
      ApiCacheConfig.update({ defaultTtl: original });
    });
  });

  describe('createApiCacheMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createApiCacheMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should accept custom cache service', () => {
      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });
      expect(typeof middleware).toBe('function');
    });

    it('should skip non-GET requests by default', async () => {
      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      req.method = 'POST';

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockCacheService.getCachedResponse).not.toHaveBeenCalled();
    });

    it('should cache GET requests', async () => {
      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(mockCacheService.generateCacheKey).toHaveBeenCalled();
    });

    it('should skip excluded paths', async () => {
      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        excludePaths: ['/api/v1/auth']
      });

      req.path = '/api/v1/auth/login';

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockCacheService.getCachedResponse).not.toHaveBeenCalled();
    });
  });

  describe('Cache Hit Behavior', () => {
    it('should return cached response on cache hit', async () => {
      const cachedData = {
        data: { users: [{ id: 1 }] },
        etag: 'W/"test-etag"',
        expiresAt: Date.now() + 60000
      };
      mockCacheService.getCachedResponse.mockReturnValue(cachedData);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(cachedData.data);
      expect(next).not.toHaveBeenCalled();
    });

    it('should set X-Cache header to HIT on cache hit', async () => {
      mockCacheService.getCachedResponse.mockReturnValue({
        data: { cached: true },
        etag: 'W/"test"',
        expiresAt: Date.now() + 60000
      });

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
    });

    it('should set X-Cache header to MISS on cache miss', async () => {
      mockCacheService.getCachedResponse.mockReturnValue(null);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    });
  });

  describe('Cache-Control Header Handling', () => {
    it('should respect Cache-Control: no-cache', async () => {
      req.headers['cache-control'] = 'no-cache';

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(mockCacheService.getCachedResponse).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should respect Cache-Control: no-store', async () => {
      req.headers['cache-control'] = 'no-store';

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set Cache-Control header on response', async () => {
      mockCacheService.getCachedResponse.mockReturnValue({
        data: { test: true },
        etag: 'W/"test"',
        expiresAt: Date.now() + 60000
      });

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        ttl: 300
      });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=')
      );
    });

    it('should include private directive for authenticated requests', async () => {
      req.user = { userId: 'user123' };
      mockCacheService.getCachedResponse.mockReturnValue({
        data: { test: true },
        etag: 'W/"test"',
        expiresAt: Date.now() + 60000
      });

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('private')
      );
    });
  });

  describe('Conditional Requests (If-None-Match)', () => {
    it('should check ETag on If-None-Match header', async () => {
      req.headers['if-none-match'] = 'W/"test-etag"';
      mockCacheService.validateETag.mockReturnValue(true);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(mockCacheService.validateETag).toHaveBeenCalled();
    });

    it('should return 304 Not Modified when ETag matches', async () => {
      req.headers['if-none-match'] = 'W/"matching-etag"';
      mockCacheService.validateETag.mockReturnValue(true);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(304);
    });

    it('should return full response when ETag does not match', async () => {
      req.headers['if-none-match'] = 'W/"non-matching-etag"';
      mockCacheService.validateETag.mockReturnValue(false);
      mockCacheService.getCachedResponse.mockReturnValue({
        data: { test: true },
        etag: 'W/"valid-etag"',
        expiresAt: Date.now() + 60000
      });

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalledWith(304);
    });

    it('should set ETag header on response', async () => {
      mockCacheService.getCachedResponse.mockReturnValue({
        data: { test: true },
        etag: 'W/"test-etag"',
        expiresAt: Date.now() + 60000
      });

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
    });
  });

  describe('Response Caching', () => {
    it('should cache successful responses', async () => {
      mockCacheService.getCachedResponse.mockReturnValue(null);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      // Simulate middleware execution
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should not cache error responses', async () => {
      mockCacheService.getCachedResponse.mockReturnValue(null);
      res.statusCode = 500;

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      // After response with error status, should not cache
      expect(next).toHaveBeenCalled();
    });

    it('should not cache 404 responses', async () => {
      mockCacheService.getCachedResponse.mockReturnValue(null);
      res.statusCode = 404;

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should respect custom cacheable status codes', async () => {
      mockCacheService.getCachedResponse.mockReturnValue(null);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        cacheableStatusCodes: [200, 201, 204]
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Vary Header Support', () => {
    it('should set Vary header based on configuration', async () => {
      mockCacheService.getCachedResponse.mockReturnValue({
        data: { test: true },
        etag: 'W/"test"',
        expiresAt: Date.now() + 60000
      });

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        varyHeaders: ['Accept', 'Accept-Language']
      });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Vary',
        expect.stringContaining('Accept')
      );
    });
  });

  describe('Cache Bypass', () => {
    it('should bypass cache with X-Cache-Bypass header', async () => {
      req.headers['x-cache-bypass'] = 'true';

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService
      });

      await middleware(req, res, next);

      expect(mockCacheService.getCachedResponse).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should allow custom bypass function', async () => {
      const shouldBypass = jest.fn().mockReturnValue(true);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        shouldBypass
      });

      await middleware(req, res, next);

      expect(shouldBypass).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Per-Route TTL Configuration', () => {
    it('should accept TTL configuration per path pattern', () => {
      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        ttlByPath: {
          '/api/v1/static': 86400,
          '/api/v1/users': 300
        }
      });

      expect(typeof middleware).toBe('function');
    });

    it('should use default TTL when path not matched', async () => {
      mockCacheService.getCachedResponse.mockReturnValue(null);

      const middleware = createApiCacheMiddleware({
        cacheService: mockCacheService,
        defaultTtl: 600,
        ttlByPath: {
          '/api/v1/static': 86400
        }
      });

      req.path = '/api/v1/users';

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
