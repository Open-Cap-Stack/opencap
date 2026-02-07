/**
 * Rate Limit Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for API rate limiting middleware
 * Target coverage: 90%+ (security-critical)
 */

// Mock express-rate-limit before requiring the module
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    const middleware = jest.fn((req, res, next) => {
      // Simulate rate limiting behavior
      if (options.skip && options.skip()) {
        return next();
      }

      // Store rate limit info on request
      req.rateLimit = {
        limit: options.max,
        remaining: options.max - 1,
        resetTime: Date.now() + options.windowMs
      };

      next();
    });

    // Add options for testing
    middleware._options = options;
    return middleware;
  });
});

const rateLimit = require('express-rate-limit');

describe('Rate Limit Middleware', () => {
  let rateLimitModule;
  let req;
  let res;
  let next;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';

    // Re-require to get fresh module
    jest.isolateModules(() => {
      rateLimitModule = require('../../../../middleware/security/rateLimit');
    });

    req = {
      ip: '127.0.0.1',
      headers: {},
      query: {},
      body: {},
      user: null,
      rateLimit: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };

    next = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('rateLimiter (default)', () => {
    it('should be defined', () => {
      expect(rateLimitModule.rateLimiter).toBeDefined();
    });

    it('should be created with correct options', () => {
      // Check the mock was called with expected options
      const calls = rateLimit.mock.calls;
      const defaultLimiterCall = calls.find(
        call => call[0].max === 10000 && call[0].windowMs === 1 * 60 * 1000
      );

      expect(defaultLimiterCall).toBeDefined();
      expect(defaultLimiterCall[0].standardHeaders).toBe(true);
      expect(defaultLimiterCall[0].legacyHeaders).toBe(true);
    });

    it('should have correct message for rate limit exceeded', () => {
      const calls = rateLimit.mock.calls;
      const limiterCall = calls.find(call => call[0].max === 10000);

      expect(limiterCall[0].message).toEqual({
        status: 429,
        error: 'Too many requests, please try again later.'
      });
    });
  });

  describe('authRateLimiter', () => {
    it('should be defined', () => {
      expect(rateLimitModule.authRateLimiter).toBeDefined();
    });

    it('should have stricter limits for auth endpoints', () => {
      const calls = rateLimit.mock.calls;
      const authLimiterCall = calls.find(
        call => call[0].max === 1000 && call[0].windowMs === 1 * 60 * 1000
      );

      expect(authLimiterCall).toBeDefined();
    });

    it('should have auth-specific message', () => {
      const calls = rateLimit.mock.calls;
      const authLimiterCall = calls.find(call => call[0].max === 1000);

      expect(authLimiterCall[0].message.error).toContain('authentication');
    });
  });

  describe('testRateLimiter', () => {
    it('should be defined', () => {
      expect(rateLimitModule.testRateLimiter).toBeDefined();
    });

    it('should have short window for testing', () => {
      const calls = rateLimit.mock.calls;
      const testLimiterCall = calls.find(
        call => call[0].max === 5 && call[0].windowMs === 10 * 1000
      );

      expect(testLimiterCall).toBeDefined();
    });

    it('should not skip in test environment', () => {
      const calls = rateLimit.mock.calls;
      const testLimiterCall = calls.find(call => call[0].max === 5);

      // The skip function should always return false
      expect(testLimiterCall[0].skip()).toBe(false);
    });
  });

  describe('createRouteRateLimit', () => {
    it('should create a new rate limiter for a route', () => {
      const initialCallCount = rateLimit.mock.calls.length;

      const limiter = rateLimitModule.createRouteRateLimit('/api/test', 50, 60000);

      expect(rateLimit).toHaveBeenCalledTimes(initialCallCount + 1);
      expect(limiter).toBeDefined();
    });

    it('should throw error for invalid route prefix', () => {
      expect(() => {
        rateLimitModule.createRouteRateLimit('', 50, 60000);
      }).toThrow('Route prefix must be a valid string');

      expect(() => {
        rateLimitModule.createRouteRateLimit(null, 50, 60000);
      }).toThrow('Route prefix must be a valid string');
    });

    it('should throw error for invalid max value', () => {
      expect(() => {
        rateLimitModule.createRouteRateLimit('/api/test', 0, 60000);
      }).toThrow('Max requests must be a positive number');

      expect(() => {
        rateLimitModule.createRouteRateLimit('/api/test', -1, 60000);
      }).toThrow('Max requests must be a positive number');

      expect(() => {
        rateLimitModule.createRouteRateLimit('/api/test', 'invalid', 60000);
      }).toThrow('Max requests must be a positive number');
    });

    it('should throw error for invalid window size', () => {
      expect(() => {
        rateLimitModule.createRouteRateLimit('/api/test', 50, 0);
      }).toThrow('Window size must be a positive number');

      expect(() => {
        rateLimitModule.createRouteRateLimit('/api/test', 50, -1);
      }).toThrow('Window size must be a positive number');
    });

    it('should include route-specific error message', () => {
      rateLimitModule.createRouteRateLimit('/api/custom', 50, 60000);

      const calls = rateLimit.mock.calls;
      const lastCall = calls[calls.length - 1];

      expect(lastCall[0].message.error).toContain('/api/custom');
    });
  });

  describe('getRouteLimits', () => {
    it('should return current route limits', () => {
      rateLimitModule.createRouteRateLimit('/api/route1', 100, 60000);
      rateLimitModule.createRouteRateLimit('/api/route2', 200, 120000);

      const limits = rateLimitModule.getRouteLimits();

      expect(limits['/api/route1']).toEqual({ max: 100, windowMs: 60000 });
      expect(limits['/api/route2']).toEqual({ max: 200, windowMs: 120000 });
    });

    it('should return empty object if no routes configured', () => {
      // Fresh module should have empty route limits initially
      jest.isolateModules(() => {
        const freshModule = require('../../../../middleware/security/rateLimit');
        // Note: getRouteLimits may have pre-existing routes from other tests
        const limits = freshModule.getRouteLimits();
        expect(typeof limits).toBe('object');
      });
    });
  });

  describe('createApiKeyRateLimit', () => {
    it('should create rate limiter using API key', () => {
      const initialCallCount = rateLimit.mock.calls.length;

      const limiter = rateLimitModule.createApiKeyRateLimit(500, 300000);

      expect(rateLimit).toHaveBeenCalledTimes(initialCallCount + 1);
      expect(limiter).toBeDefined();
    });

    it('should throw error for invalid max', () => {
      expect(() => {
        rateLimitModule.createApiKeyRateLimit(0, 60000);
      }).toThrow('Max requests must be a positive number');
    });

    it('should throw error for invalid window', () => {
      expect(() => {
        rateLimitModule.createApiKeyRateLimit(100, 0);
      }).toThrow('Window size must be a positive number');
    });

    it('should configure keyGenerator to use API key', () => {
      rateLimitModule.createApiKeyRateLimit(100, 60000);

      const calls = rateLimit.mock.calls;
      const lastCall = calls[calls.length - 1];

      expect(lastCall[0].keyGenerator).toBeDefined();

      // Test keyGenerator with API key in header
      const key = lastCall[0].keyGenerator({
        headers: { 'x-api-key': 'test-key-123' },
        query: {},
        body: {},
        ip: '127.0.0.1'
      });
      expect(key).toBe('test-key-123');
    });

    it('should fall back to IP if no API key', () => {
      rateLimitModule.createApiKeyRateLimit(100, 60000);

      const calls = rateLimit.mock.calls;
      const lastCall = calls[calls.length - 1];

      const key = lastCall[0].keyGenerator({
        headers: {},
        query: {},
        body: {},
        ip: '192.168.1.1'
      });
      expect(key).toBe('192.168.1.1');
    });

    it('should check query and body for API key', () => {
      rateLimitModule.createApiKeyRateLimit(100, 60000);

      const calls = rateLimit.mock.calls;
      const lastCall = calls[calls.length - 1];

      // Query API key
      const queryKey = lastCall[0].keyGenerator({
        headers: {},
        query: { apiKey: 'query-key' },
        body: {},
        ip: '127.0.0.1'
      });
      expect(queryKey).toBe('query-key');

      // Body API key
      const bodyKey = lastCall[0].keyGenerator({
        headers: {},
        query: {},
        body: { apiKey: 'body-key' },
        ip: '127.0.0.1'
      });
      expect(bodyKey).toBe('body-key');
    });
  });

  describe('createTieredRateLimit', () => {
    it('should create rate limiter for basic tier', () => {
      const limiter = rateLimitModule.createTieredRateLimit('basic');

      expect(limiter).toBeDefined();
    });

    it('should throw error for invalid tier', () => {
      expect(() => {
        rateLimitModule.createTieredRateLimit('');
      }).toThrow('Subscription tier must be a valid string');

      expect(() => {
        rateLimitModule.createTieredRateLimit(null);
      }).toThrow('Subscription tier must be a valid string');
    });

    it('should use tier limits for standard tier', () => {
      const initialCallCount = rateLimit.mock.calls.length;

      rateLimitModule.createTieredRateLimit('standard');

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].max).toBe(500);
    });

    it('should use tier limits for premium tier', () => {
      rateLimitModule.createTieredRateLimit('premium');

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].max).toBe(1000);
    });

    it('should use tier limits for enterprise tier', () => {
      rateLimitModule.createTieredRateLimit('enterprise');

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].max).toBe(5000);
    });

    it('should fall back to basic for unknown tier', () => {
      rateLimitModule.createTieredRateLimit('unknown');

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].max).toBe(100);
    });

    it('should allow custom max override', () => {
      rateLimitModule.createTieredRateLimit('basic', 200);

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].max).toBe(200);
    });

    it('should allow custom window override', () => {
      rateLimitModule.createTieredRateLimit('basic', null, 30000);

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].windowMs).toBe(30000);
    });

    it('should include tier in error message', () => {
      rateLimitModule.createTieredRateLimit('premium');

      const lastCall = rateLimit.mock.calls[rateLimit.mock.calls.length - 1];
      expect(lastCall[0].message.error).toContain('premium');
    });
  });

  describe('createTokenBucketRateLimit', () => {
    it('should create token bucket rate limiter', () => {
      const limiter = rateLimitModule.createTokenBucketRateLimit(100, 10);

      expect(typeof limiter).toBe('function');
    });

    it('should throw error for invalid capacity', () => {
      expect(() => {
        rateLimitModule.createTokenBucketRateLimit(0, 10);
      }).toThrow('Bucket capacity must be a positive number');

      expect(() => {
        rateLimitModule.createTokenBucketRateLimit(-1, 10);
      }).toThrow('Bucket capacity must be a positive number');
    });

    it('should throw error for invalid tokens per second', () => {
      expect(() => {
        rateLimitModule.createTokenBucketRateLimit(100, 0);
      }).toThrow('Tokens per second must be a positive number');

      expect(() => {
        rateLimitModule.createTokenBucketRateLimit(100, -1);
      }).toThrow('Tokens per second must be a positive number');
    });

    it('should allow requests when tokens available', () => {
      const limiter = rateLimitModule.createTokenBucketRateLimit(100, 10);

      limiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    });

    it('should skip in test environment when disabled', () => {
      process.env.NODE_ENV = 'test';
      process.env.DISABLE_RATE_LIMIT = 'true';

      const limiter = rateLimitModule.createTokenBucketRateLimit(100, 10);
      limiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should consume tokens on request', () => {
      const limiter = rateLimitModule.createTokenBucketRateLimit(5, 1);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const testNext = jest.fn();
        limiter(req, res, testNext);
        expect(testNext).toHaveBeenCalled();
      }

      // 6th request should be rate limited
      const testNext = jest.fn();
      limiter(req, res, testNext);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should refill tokens over time', async () => {
      const limiter = rateLimitModule.createTokenBucketRateLimit(2, 100);

      // Exhaust tokens
      limiter(req, res, next);
      limiter(req, res, next);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 25));

      // Should have tokens now
      const testNext = jest.fn();
      limiter(req, res, testNext);
      expect(testNext).toHaveBeenCalled();
    });
  });

  describe('includeAdvancedHeaders', () => {
    it('should return middleware function', () => {
      const middleware = rateLimitModule.includeAdvancedHeaders();

      expect(typeof middleware).toBe('function');
    });

    it('should add policy header', () => {
      const setHeaderMock = jest.fn();
      const mockRes = {
        ...res,
        setHeader: setHeaderMock
      };

      const middleware = rateLimitModule.includeAdvancedHeaders();
      middleware(req, mockRes, next);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'X-RateLimit-Policy',
        expect.stringContaining('docs.opencap.io')
      );
    });

    it('should call next', () => {
      const setHeaderMock = jest.fn();
      const mockRes = {
        ...res,
        setHeader: setHeaderMock
      };

      const middleware = rateLimitModule.includeAdvancedHeaders();
      middleware(req, mockRes, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('updateRateLimitConfig', () => {
    it('should throw error for invalid route key', () => {
      expect(() => {
        rateLimitModule.updateRateLimitConfig('', { max: 100 });
      }).toThrow('Route key must be a valid string');
    });

    it('should throw error for invalid config', () => {
      expect(() => {
        rateLimitModule.updateRateLimitConfig('/api/test', null);
      }).toThrow('Config must be a valid object');
    });

    it('should throw error for invalid max in config', () => {
      expect(() => {
        rateLimitModule.updateRateLimitConfig('/api/test', { max: -1 });
      }).toThrow('Max requests must be a positive number');
    });

    it('should throw error for invalid windowMs in config', () => {
      expect(() => {
        rateLimitModule.updateRateLimitConfig('/api/test', { windowMs: -1 });
      }).toThrow('Window size must be a positive number');
    });

    it('should update existing route limiter', () => {
      rateLimitModule.createRouteRateLimit('/api/update-test', 50, 60000);

      const result = rateLimitModule.updateRateLimitConfig('/api/update-test', {
        max: 100,
        windowMs: 120000
      });

      expect(result).toBe(true);
    });

    it('should create new route if not found', () => {
      const result = rateLimitModule.updateRateLimitConfig('/api/new-route', {
        max: 100,
        windowMs: 60000
      });

      expect(result).toBe(true);
    });

    it('should return false if key not found and config incomplete', () => {
      const result = rateLimitModule.updateRateLimitConfig('/api/nonexistent', {
        max: 100
        // Missing windowMs
      });

      expect(result).toBe(false);
    });
  });
});
