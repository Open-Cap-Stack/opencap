/**
 * Enhanced Rate Limiter Middleware Unit Tests
 * Issue #48: Implement API Rate Limiting and Response Optimization
 * TDD Red Phase: Tests written before implementation
 */

const {
  createRoleTieredRateLimiter,
  createEndpointRateLimiter,
  TokenBucketLimiter,
  RateLimitConfig,
  getRateLimitHeaders,
  globalStore
} = require('../../../middleware/rateLimiter');

describe('Enhanced Rate Limiter Middleware', () => {
  let req, res, next;

  afterAll(() => {
    // Clean up global store
    if (globalStore && globalStore.destroy) {
      globalStore.destroy();
    }
  });

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      path: '/api/v1/users',
      method: 'GET',
      user: null,
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      set: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('RateLimitConfig', () => {
    it('should have default configuration for roles', () => {
      expect(RateLimitConfig.roles).toBeDefined();
      expect(RateLimitConfig.roles.admin).toBeDefined();
      expect(RateLimitConfig.roles.user).toBeDefined();
      expect(RateLimitConfig.roles.guest).toBeDefined();
    });

    it('should have higher limits for admin role', () => {
      expect(RateLimitConfig.roles.admin.maxRequests).toBeGreaterThan(
        RateLimitConfig.roles.user.maxRequests
      );
      expect(RateLimitConfig.roles.user.maxRequests).toBeGreaterThan(
        RateLimitConfig.roles.guest.maxRequests
      );
    });

    it('should have default endpoint configurations', () => {
      expect(RateLimitConfig.endpoints).toBeDefined();
      expect(RateLimitConfig.endpoints['/api/v1/auth/login']).toBeDefined();
    });

    it('should allow configuration update', () => {
      const originalAdminLimit = RateLimitConfig.roles.admin.maxRequests;
      RateLimitConfig.updateRoleLimit('admin', { maxRequests: 2000 });
      expect(RateLimitConfig.roles.admin.maxRequests).toBe(2000);
      // Reset for other tests
      RateLimitConfig.updateRoleLimit('admin', { maxRequests: originalAdminLimit });
    });
  });

  describe('createRoleTieredRateLimiter', () => {
    it('should create middleware function', () => {
      const limiter = createRoleTieredRateLimiter();
      expect(typeof limiter).toBe('function');
    });

    it('should apply guest limits for unauthenticated requests', async () => {
      const limiter = createRoleTieredRateLimiter();

      // Make requests up to the guest limit
      const guestLimit = RateLimitConfig.roles.guest.maxRequests;
      for (let i = 0; i < guestLimit; i++) {
        await limiter(req, res, next);
      }

      // Next request should be rate limited
      await limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should apply user limits for authenticated user', async () => {
      const limiter = createRoleTieredRateLimiter();
      req.user = { role: 'employee', userId: 'user123' };

      await limiter(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
    });

    it('should apply admin limits for admin user', async () => {
      const limiter = createRoleTieredRateLimiter();
      req.user = { role: 'admin', userId: 'admin123' };

      await limiter(req, res, next);
      expect(next).toHaveBeenCalled();

      // Check that the limit header reflects admin limits
      const limitHeader = res.setHeader.mock.calls.find(
        call => call[0] === 'X-RateLimit-Limit'
      );
      expect(limitHeader[1]).toBe(RateLimitConfig.roles.admin.maxRequests);
    });

    it('should track remaining requests correctly', async () => {
      const limiter = createRoleTieredRateLimiter();
      req.user = { role: 'employee', userId: 'user-remaining-test' };

      await limiter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(Number)
      );
    });

    it('should include reset time header', async () => {
      const limiter = createRoleTieredRateLimiter();

      await limiter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(Number)
      );
    });

    it('should skip rate limiting in test environment when configured', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalDisable = process.env.DISABLE_RATE_LIMIT;

      process.env.NODE_ENV = 'test';
      process.env.DISABLE_RATE_LIMIT = 'true';

      const limiter = createRoleTieredRateLimiter({ skipInTest: true });

      // Make many requests - should not be limited
      for (let i = 0; i < 1000; i++) {
        await limiter(req, res, next);
      }

      expect(res.status).not.toHaveBeenCalledWith(429);

      process.env.NODE_ENV = originalEnv;
      process.env.DISABLE_RATE_LIMIT = originalDisable;
    });
  });

  describe('createEndpointRateLimiter', () => {
    it('should create middleware for specific endpoint', () => {
      const limiter = createEndpointRateLimiter('/api/v1/users', {
        maxRequests: 50,
        windowMs: 60000
      });
      expect(typeof limiter).toBe('function');
    });

    it('should apply endpoint-specific limits', async () => {
      const limiter = createEndpointRateLimiter('/api/v1/special', {
        maxRequests: 5,
        windowMs: 60000
      });

      req.path = '/api/v1/special';

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        next.mockClear();
        await limiter(req, res, next);
        expect(next).toHaveBeenCalled();
      }

      // Next request should be rate limited
      next.mockClear();
      await limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should use default auth endpoint limits for login', async () => {
      const limiter = createEndpointRateLimiter('/api/v1/auth/login');
      req.path = '/api/v1/auth/login';

      await limiter(req, res, next);

      // Login should have stricter limits
      const limitHeader = res.setHeader.mock.calls.find(
        call => call[0] === 'X-RateLimit-Limit'
      );
      expect(limitHeader[1]).toBeLessThanOrEqual(10);
    });

    it('should include Retry-After header when rate limited', async () => {
      const limiter = createEndpointRateLimiter('/api/v1/test', {
        maxRequests: 1,
        windowMs: 60000
      });

      await limiter(req, res, next);
      await limiter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });
  });

  describe('TokenBucketLimiter', () => {
    it('should create a token bucket with specified capacity', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 100,
        refillRate: 10,
        refillInterval: 1000
      });

      expect(bucket.capacity).toBe(100);
      expect(bucket.refillRate).toBe(10);
    });

    it('should consume tokens on request', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000
      });

      const key = '127.0.0.1';
      const result = bucket.consume(key);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should deny requests when bucket is empty', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 2,
        refillRate: 1,
        refillInterval: 1000
      });

      const key = '127.0.0.1';
      bucket.consume(key);
      bucket.consume(key);
      const result = bucket.consume(key);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should refill tokens over time', async () => {
      const bucket = new TokenBucketLimiter({
        capacity: 5,
        refillRate: 5,
        refillInterval: 100 // 100ms refill
      });

      const key = '127.0.0.1';

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        bucket.consume(key);
      }

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = bucket.consume(key);
      expect(result.allowed).toBe(true);
    });

    it('should track tokens per unique key', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 2,
        refillRate: 1,
        refillInterval: 1000
      });

      bucket.consume('user1');
      bucket.consume('user1');

      // user2 should have full bucket
      const result = bucket.consume('user2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should return wait time when rate limited', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 1,
        refillRate: 1,
        refillInterval: 1000
      });

      const key = '127.0.0.1';
      bucket.consume(key);
      const result = bucket.consume(key);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should support custom token cost per request', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000
      });

      const key = '127.0.0.1';
      const result = bucket.consume(key, 5); // Consume 5 tokens

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should create middleware function', () => {
      const bucket = new TokenBucketLimiter({
        capacity: 100,
        refillRate: 10,
        refillInterval: 1000
      });

      const middleware = bucket.middleware();
      expect(typeof middleware).toBe('function');
    });

    it('should work as middleware', async () => {
      const bucket = new TokenBucketLimiter({
        capacity: 100,
        refillRate: 10,
        refillInterval: 1000
      });

      const middleware = bucket.middleware();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return standard rate limit headers', () => {
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000
      });

      expect(headers).toHaveProperty('X-RateLimit-Limit', 100);
      expect(headers).toHaveProperty('X-RateLimit-Remaining', 99);
      expect(headers).toHaveProperty('X-RateLimit-Reset');
    });

    it('should include policy header', () => {
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000
      });

      expect(headers).toHaveProperty('X-RateLimit-Policy');
    });

    it('should include Retry-After when rate limited', () => {
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
        retryAfter: 60
      });

      expect(headers).toHaveProperty('Retry-After', 60);
    });
  });

  describe('Rate Limit Response Format', () => {
    it('should return proper error response when rate limited', async () => {
      const limiter = createEndpointRateLimiter('/api/v1/test', {
        maxRequests: 1,
        windowMs: 60000
      });

      await limiter(req, res, next);
      await limiter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 429,
        error: expect.any(String)
      }));
    });

    it('should include retryAfter in error response', async () => {
      const limiter = createEndpointRateLimiter('/api/v1/test', {
        maxRequests: 1,
        windowMs: 60000
      });

      await limiter(req, res, next);
      await limiter(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        retryAfter: expect.any(Number)
      }));
    });
  });
});
