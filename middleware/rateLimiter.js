/**
 * Enhanced Rate Limiter Middleware
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides tiered rate limiting by user role, per-endpoint rate limits,
 * token bucket algorithm implementation, and comprehensive rate limit headers.
 */

/**
 * Rate limit configuration for different user roles and endpoints
 */
const RateLimitConfig = {
  roles: {
    admin: {
      maxRequests: 2000,
      windowMs: 15 * 60 * 1000 // 15 minutes
    },
    user: {
      maxRequests: 1000,
      windowMs: 15 * 60 * 1000
    },
    guest: {
      maxRequests: 500,
      windowMs: 15 * 60 * 1000
    }
  },

  endpoints: {
    '/api/v1/auth/login': {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000 // 1 hour
    },
    '/api/v1/auth/register': {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000
    },
    '/api/v1/auth/forgot-password': {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000
    }
  },

  /**
   * Update rate limit for a specific role
   * @param {string} role - Role name
   * @param {Object} config - Configuration { maxRequests, windowMs }
   */
  updateRoleLimit(role, config) {
    if (this.roles[role]) {
      Object.assign(this.roles[role], config);
    }
  },

  /**
   * Update rate limit for a specific endpoint
   * @param {string} endpoint - Endpoint path
   * @param {Object} config - Configuration { maxRequests, windowMs }
   */
  updateEndpointLimit(endpoint, config) {
    this.endpoints[endpoint] = { ...this.endpoints[endpoint], ...config };
  }
};

/**
 * In-memory store for rate limit tracking
 */
class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  /**
   * Get or create rate limit entry for a key
   * @param {string} key - Unique identifier
   * @param {number} windowMs - Window size in milliseconds
   * @returns {Object} Rate limit entry
   */
  get(key, windowMs) {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        createdAt: now
      };
      this.store.set(key, entry);
    }

    return entry;
  }

  /**
   * Increment request count for a key
   * @param {string} key - Unique identifier
   * @param {number} windowMs - Window size in milliseconds
   * @returns {Object} Updated entry
   */
  increment(key, windowMs) {
    const entry = this.get(key, windowMs);
    entry.count++;
    return entry;
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global store instance - lazy initialization to avoid issues in tests
let _globalStore = null;
const getGlobalStore = () => {
  if (!_globalStore) {
    _globalStore = new RateLimitStore();
  }
  return _globalStore;
};

// For backward compatibility
const globalStore = {
  get(key, windowMs) {
    return getGlobalStore().get(key, windowMs);
  },
  increment(key, windowMs) {
    return getGlobalStore().increment(key, windowMs);
  },
  cleanup() {
    return getGlobalStore().cleanup();
  },
  clear() {
    return getGlobalStore().clear();
  },
  destroy() {
    if (_globalStore) {
      _globalStore.destroy();
      _globalStore = null;
    }
  }
};

/**
 * Generate standard rate limit headers
 * @param {Object} options - Header options
 * @returns {Object} Headers object
 */
function getRateLimitHeaders(options) {
  const { limit, remaining, reset, retryAfter } = options;

  const headers = {
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': Math.ceil(reset / 1000), // Unix timestamp in seconds
    'X-RateLimit-Policy': 'For more information on rate limits, see https://docs.opencap.io/rate-limits'
  };

  if (retryAfter !== undefined && remaining === 0) {
    headers['Retry-After'] = retryAfter;
  }

  return headers;
}

/**
 * Create role-tiered rate limiter middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createRoleTieredRateLimiter(options = {}) {
  const {
    store = globalStore,
    skipInTest = false,
    keyGenerator = null
  } = options;

  return async (req, res, next) => {
    // Skip rate limiting in test environment if configured
    if (skipInTest && process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    // Determine user role
    const role = req.user?.role || 'guest';
    const config = RateLimitConfig.roles[role] || RateLimitConfig.roles.guest;

    // Generate unique key for this client
    const key = keyGenerator
      ? keyGenerator(req)
      : `${role}:${req.user?.userId || req.ip}`;

    // Get or create rate limit entry
    const entry = store.increment(key, config.windowMs);
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetTime = entry.resetTime;

    // Set rate limit headers
    const headers = getRateLimitHeaders({
      limit: config.maxRequests,
      remaining,
      reset: resetTime,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    });

    Object.entries(headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });

    // Check if rate limit exceeded
    if (entry.count > config.maxRequests) {
      return res.status(429).json({
        status: 429,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
}

/**
 * Create endpoint-specific rate limiter middleware
 * @param {string} endpoint - Endpoint path
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createEndpointRateLimiter(endpoint, options = {}) {
  // Use endpoint-specific config or provided options
  const config = options.maxRequests
    ? options
    : RateLimitConfig.endpoints[endpoint] || {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000
      };

  const { maxRequests, windowMs } = config;
  const store = options.store || globalStore;

  return async (req, res, next) => {
    // Skip rate limiting in test environment if configured
    if (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    // Generate unique key for this endpoint + client
    const key = `endpoint:${endpoint}:${req.user?.userId || req.ip}`;

    // Get or create rate limit entry
    const entry = store.increment(key, windowMs);
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = entry.resetTime;

    // Set rate limit headers
    const headers = getRateLimitHeaders({
      limit: maxRequests,
      remaining,
      reset: resetTime,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    });

    Object.entries(headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });

    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      return res.status(429).json({
        status: 429,
        error: `Rate limit exceeded for ${endpoint}. Please try again later.`,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
}

/**
 * Token Bucket Rate Limiter
 * Implements token bucket algorithm for smoother rate limiting with burst support
 */
class TokenBucketLimiter {
  /**
   * Create a new token bucket limiter
   * @param {Object} options - Configuration options
   * @param {number} options.capacity - Maximum tokens in bucket
   * @param {number} options.refillRate - Tokens to add per refill
   * @param {number} options.refillInterval - Interval between refills in ms
   */
  constructor(options) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.refillInterval = options.refillInterval;
    this.buckets = new Map();
  }

  /**
   * Get or create bucket for a key
   * @param {string} key - Unique identifier
   * @returns {Object} Bucket state
   */
  getBucket(key) {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: this.capacity,
        lastRefill: Date.now()
      });
    }

    const bucket = this.buckets.get(key);

    // Calculate tokens to refill based on time passed
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillInterval) * this.refillRate;

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    return bucket;
  }

  /**
   * Attempt to consume tokens from bucket
   * @param {string} key - Unique identifier
   * @param {number} tokens - Number of tokens to consume (default: 1)
   * @returns {Object} Result { allowed, remaining, retryAfter }
   */
  consume(key, tokens = 1) {
    const bucket = this.getBucket(key);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfter: 0
      };
    }

    // Calculate time until enough tokens are available
    const tokensNeeded = tokens - bucket.tokens;
    const timeNeeded = Math.ceil(tokensNeeded / this.refillRate) * this.refillInterval;

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(timeNeeded / 1000) // Convert to seconds
    };
  }

  /**
   * Create Express middleware from this limiter
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  middleware(options = {}) {
    const { keyGenerator = (req) => req.ip } = options;

    return async (req, res, next) => {
      // Skip in test environment if configured
      if (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true') {
        return next();
      }

      const key = keyGenerator(req);
      const result = this.consume(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.capacity);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + this.refillInterval) / 1000));

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter);
        return res.status(429).json({
          status: 429,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter
        });
      }

      next();
    };
  }

  /**
   * Clear all buckets
   */
  clear() {
    this.buckets.clear();
  }
}

module.exports = {
  RateLimitConfig,
  RateLimitStore,
  createRoleTieredRateLimiter,
  createEndpointRateLimiter,
  TokenBucketLimiter,
  getRateLimitHeaders,
  globalStore
};
