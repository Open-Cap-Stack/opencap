/**
 * OpenCap Security Middleware - Rate Limiting
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * [Feature] OCAE-305: Implement API rate limiting
 * 
 * This module configures rate limiting for the API to prevent abuse
 * and maintain service quality for all users.
 */

const rateLimit = require('express-rate-limit');

// Store for route-specific rate limiters
const routeLimiters = new Map();

// Store for API key specific rate limiters
const apiKeyLimiters = new Map();

// Subscription tier configuration
const tierLimits = {
  basic: { max: 100, windowMs: 15 * 60 * 1000 },
  standard: { max: 500, windowMs: 15 * 60 * 1000 },
  premium: { max: 1000, windowMs: 15 * 60 * 1000 },
  enterprise: { max: 5000, windowMs: 15 * 60 * 1000 }
};

// Create a rate limiter middleware
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: true, // Add X-RateLimit headers for older compatibility
  message: {
    status: 429,
    error: 'Too many requests, please try again later.',
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
  // Add retry-after header for better client handling
  handler: (req, res, next, options) => {
    res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
    res.status(options.statusCode).json(options.message);
  }
});

// Special endpoints that need more strict rate limiting
const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    status: 429,
    error: 'Too many authentication attempts, please try again later.',
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
  // Add retry-after header for better client handling
  handler: (req, res, next, options) => {
    res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
    res.status(options.statusCode).json(options.message);
  }
});

// Test endpoint for rate limit testing
const testRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Limit each IP to 5 requests per 10 seconds
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    status: 429,
    error: 'Rate limit exceeded for test endpoint.',
  },
  // Don't skip in test environment since this is for test purposes
  skip: () => false,
  // Add retry-after header for better client handling
  handler: (req, res, next, options) => {
    res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Creates a rate limiter for a specific route
 * 
 * @param {string} routePrefix - The route prefix to apply limits to
 * @param {number} max - Maximum requests in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware for rate limiting
 */
const createRouteRateLimit = (routePrefix, max, windowMs) => {
  if (!routePrefix || typeof routePrefix !== 'string') {
    throw new Error('Route prefix must be a valid string');
  }
  
  if (!max || typeof max !== 'number' || max <= 0) {
    throw new Error('Max requests must be a positive number');
  }
  
  if (!windowMs || typeof windowMs !== 'number' || windowMs <= 0) {
    throw new Error('Window size must be a positive number');
  }
  
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: true,
    message: {
      status: 429,
      error: `Rate limit exceeded for ${routePrefix} endpoint.`,
    },
    skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
    handler: (req, res, next, options) => {
      res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
      res.status(options.statusCode).json(options.message);
    }
  });
  
  // Store the limiter for reference
  routeLimiters.set(routePrefix, { limiter, max, windowMs });
  
  return limiter;
};

/**
 * Retrieves the current route rate limiters configuration
 * 
 * @returns {Object} Map of route limiters
 */
const getRouteLimits = () => {
  const limits = {};
  
  routeLimiters.forEach((value, key) => {
    limits[key] = {
      max: value.max,
      windowMs: value.windowMs
    };
  });
  
  return limits;
};

/**
 * Creates a rate limiter that identifies by API key
 * 
 * @param {number} max - Maximum requests in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware for API key rate limiting
 */
const createApiKeyRateLimit = (max, windowMs) => {
  if (!max || typeof max !== 'number' || max <= 0) {
    throw new Error('Max requests must be a positive number');
  }
  
  if (!windowMs || typeof windowMs !== 'number' || windowMs <= 0) {
    throw new Error('Window size must be a positive number');
  }
  
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: true,
    // Use API key for tracking instead of IP
    keyGenerator: (req) => {
      // Get API key from header, query, or body (order of precedence)
      const apiKey = 
        req.headers['x-api-key'] || 
        req.query.apiKey || 
        (req.body && req.body.apiKey);
      
      if (!apiKey) {
        // Fall back to IP if no API key
        return req.ip;
      }
      
      return apiKey;
    },
    message: {
      status: 429,
      error: 'API rate limit exceeded. Please try again later.',
    },
    skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
    handler: (req, res, next, options) => {
      res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
      res.status(options.statusCode).json(options.message);
    }
  });
  
  return limiter;
};

/**
 * Creates a rate limiter with different limits based on subscription tier
 * 
 * @param {string} tier - Subscription tier (basic, standard, premium, enterprise)
 * @param {number} customMax - Optional custom max requests
 * @param {number} customWindow - Optional custom window size
 * @returns {Function} Express middleware for tiered rate limiting
 */
const createTieredRateLimit = (tier, customMax, customWindow) => {
  if (!tier || typeof tier !== 'string') {
    throw new Error('Subscription tier must be a valid string');
  }
  
  // Get tier configuration or use basic as fallback
  const tierConfig = tierLimits[tier.toLowerCase()] || tierLimits.basic;
  
  // Override with custom values if provided
  const max = (customMax && customMax > 0) ? customMax : tierConfig.max;
  const windowMs = (customWindow && customWindow > 0) ? customWindow : tierConfig.windowMs;
  
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: true,
    keyGenerator: (req) => {
      // Get API key or user ID from request
      const keyId = 
        req.headers['x-api-key'] || 
        req.query.apiKey || 
        (req.body && req.body.apiKey) ||
        (req.user && req.user.id) ||
        req.ip;
      
      // Store the tier for this key
      apiKeyLimiters.set(keyId, { tier, max, windowMs });
      
      return keyId;
    },
    message: {
      status: 429,
      error: `Rate limit exceeded for ${tier} tier. Please upgrade your plan or try again later.`,
    },
    skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
    handler: (req, res, next, options) => {
      res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
      res.status(options.statusCode).json(options.message);
    }
  });
  
  return limiter;
};

/**
 * Creates rate limiter using token bucket algorithm for better burst handling
 * 
 * @param {number} capacity - Bucket capacity (max tokens)
 * @param {number} tokensPerSecond - Refill rate in tokens per second
 * @returns {Function} Express middleware for token bucket rate limiting
 */
const createTokenBucketRateLimit = (capacity, tokensPerSecond) => {
  if (!capacity || typeof capacity !== 'number' || capacity <= 0) {
    throw new Error('Bucket capacity must be a positive number');
  }
  
  if (!tokensPerSecond || typeof tokensPerSecond !== 'number' || tokensPerSecond <= 0) {
    throw new Error('Tokens per second must be a positive number');
  }
  
  // Token bucket store
  const buckets = new Map();
  
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }
    
    const key = req.ip;
    const now = Date.now();
    
    // Create new bucket if doesn't exist
    if (!buckets.has(key)) {
      buckets.set(key, {
        tokens: capacity,
        lastRefill: now
      });
    }
    
    const bucket = buckets.get(key);
    
    // Calculate tokens to add based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * tokensPerSecond;
    
    // Refill bucket but don't exceed capacity
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    // Check if request can proceed
    if (bucket.tokens >= 1) {
      // Consume one token
      bucket.tokens -= 1;
      
      // Add headers to response
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
      res.setHeader('X-RateLimit-Reset', Math.ceil(((capacity - bucket.tokens) / tokensPerSecond) * 1000));
      
      return next();
    } else {
      // Add retry-after header
      const retryAfter = Math.ceil((1 - bucket.tokens) / tokensPerSecond);
      res.setHeader('Retry-After', retryAfter);
      
      // Return 429 too many requests
      return res.status(429).json({
        status: 429,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfter
      });
    }
  };
};

/**
 * Middleware to include advanced rate limit headers
 * 
 * @returns {Function} Express middleware
 */
const includeAdvancedHeaders = () => {
  return (req, res, next) => {
    // Store original setHeader method
    const originalSetHeader = res.setHeader;
    
    // Override setHeader to add more context to rate limit headers
    res.setHeader = function(name, value) {
      // Call original method
      originalSetHeader.call(this, name, value);
      
      // Add additional headers for better client experience
      if (name.toLowerCase() === 'x-ratelimit-remaining' || name === 'ratelimit-remaining') {
        // Calculate reset time in seconds
        const resetTime = new Date();
        
        // Get the windowMs from the rate limiter (default to 15 min)
        let windowMs = 15 * 60 * 1000;
        
        if (req.rateLimit && req.rateLimit.limit && req.rateLimit.resetTime) {
          // Use actual reset time if available from express-rate-limit
          resetTime.setTime(req.rateLimit.resetTime);
        } else {
          // Add default window
          resetTime.setTime(Date.now() + windowMs);
        }
        
        // Add detailed rate limit headers
        originalSetHeader.call(this, 'X-RateLimit-Reset-Human', resetTime.toISOString());
      }
    };
    
    // Always add the policy header unconditionally
    originalSetHeader.call(res, 'X-RateLimit-Policy', 'For more information on rate limits, see https://docs.opencap.io/rate-limits');
    
    next();
  };
};

/**
 * Updates rate limit configuration dynamically
 * 
 * @param {string} routeKey - Route or API key to update
 * @param {Object} config - New configuration { max, windowMs }
 * @returns {boolean} Success indicator
 */
const updateRateLimitConfig = (routeKey, config) => {
  if (!routeKey || typeof routeKey !== 'string') {
    throw new Error('Route key must be a valid string');
  }
  
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be a valid object');
  }
  
  const { max, windowMs } = config;
  
  // Validate config values
  if (max !== undefined && (typeof max !== 'number' || max <= 0)) {
    throw new Error('Max requests must be a positive number');
  }
  
  if (windowMs !== undefined && (typeof windowMs !== 'number' || windowMs <= 0)) {
    throw new Error('Window size must be a positive number');
  }
  
  // Try to update route limiter first
  if (routeLimiters.has(routeKey)) {
    const routeConfig = routeLimiters.get(routeKey);
    
    // Create a new limiter with updated config
    const updatedMax = max !== undefined ? max : routeConfig.max;
    const updatedWindow = windowMs !== undefined ? windowMs : routeConfig.windowMs;
    
    const newLimiter = createRouteRateLimit(routeKey, updatedMax, updatedWindow);
    return true;
  }
  
  // Try to update API key limiter
  if (apiKeyLimiters.has(routeKey)) {
    const apiKeyConfig = apiKeyLimiters.get(routeKey);
    
    // Update tier limits if it's a known tier
    if (apiKeyConfig.tier && tierLimits[apiKeyConfig.tier]) {
      if (max !== undefined) {
        tierLimits[apiKeyConfig.tier].max = max;
      }
      
      if (windowMs !== undefined) {
        tierLimits[apiKeyConfig.tier].windowMs = windowMs;
      }
      
      return true;
    }
  }
  
  // If key not found in either store, create a new route limiter
  if (max !== undefined && windowMs !== undefined) {
    createRouteRateLimit(routeKey, max, windowMs);
    return true;
  }
  
  return false;
};

module.exports = {
  rateLimiter,
  authRateLimiter,
  testRateLimiter,
  createRouteRateLimit,
  getRouteLimits,
  createApiKeyRateLimit,
  createTieredRateLimit,
  createTokenBucketRateLimit,
  includeAdvancedHeaders,
  updateRateLimitConfig
};
