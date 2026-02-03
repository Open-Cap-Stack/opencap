/**
 * Cache Middleware
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides HTTP response caching middleware for Express
 * Features: auto-cache, invalidation, ETags, conditional caching
 */

const cacheService = require('../services/cacheService');

/**
 * Generate cache key from request
 * @param {Object} req - Express request
 * @param {Object} options - Key generation options
 * @returns {string} Cache key
 */
function generateCacheKey(req, options = {}) {
  const { prefix = 'http', includeUser = false } = options;

  // Sort query params for consistent keys
  const sortedQuery = Object.keys(req.query || {})
    .sort()
    .map(k => `${k}=${req.query[k]}`)
    .join('&');

  let key = `${prefix}:${req.method}:${req.originalUrl}`;

  if (sortedQuery) {
    key = `${prefix}:${req.method}:${req.path}?${sortedQuery}`;
  }

  if (includeUser && req.user) {
    key = `${key}:user:${req.user.userId}`;
  }

  return key;
}

/**
 * Cache response middleware factory
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function cacheResponse(options = {}) {
  const {
    ttl = 300000, // 5 minutes default
    userSpecific = false,
    tags = []
  } = options;

  return async (req, res, next) => {
    // Skip non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check for bypass conditions
    if (req.bypassCache || req.headers['x-bypass-cache'] === 'true') {
      return next();
    }

    // Check cache-control header
    const cacheControl = req.headers['cache-control'];
    if (cacheControl && cacheControl.includes('no-cache')) {
      return next();
    }

    const cacheKey = generateCacheKey(req, {
      includeUser: userSpecific
    });

    try {
      // Try to get from cache
      const cachedValue = await cacheService.get(cacheKey);

      if (cachedValue !== null) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedValue);
      }

      // Cache miss - set up response interception
      res.set('X-Cache', 'MISS');
      res.locals.cacheKey = cacheKey;
      res.locals.cacheTtl = ttl;
      res.locals.cacheTags = typeof tags === 'function' ? tags(req) : tags;

      // Store original json function
      const originalJson = res.json.bind(res);

      // Override json to cache the response
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // On error, continue without caching
      next();
    }
  };
}

/**
 * Cache invalidation middleware factory
 * @param {string|string[]|Function} patterns - Pattern(s) to invalidate
 * @returns {Function} Express middleware
 */
function invalidateCache(patterns) {
  return async (req, res, next) => {
    // Skip GET requests
    if (req.method === 'GET') {
      return next();
    }

    // Set up response finish handler for invalidation
    res.on('finish', async () => {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const patternsToInvalidate = typeof patterns === 'function'
            ? [patterns(req)]
            : Array.isArray(patterns)
              ? patterns
              : [patterns];

          for (const pattern of patternsToInvalidate) {
            await cacheService.invalidate(pattern);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
    });

    next();
  };
}

/**
 * Conditional caching middleware factory
 * @param {Function} condition - Condition function
 * @param {Object} options - Cache options
 * @returns {Function} Express middleware
 */
function conditionalCache(condition, options = {}) {
  const cacheMiddleware = cacheResponse(options);

  return async (req, res, next) => {
    // Check condition
    if (condition(req)) {
      return cacheMiddleware(req, res, next);
    }

    next();
  };
}

/**
 * ETag-based caching middleware
 * @param {Object} options - ETag options
 * @returns {Function} Express middleware
 */
function etagCache(options = {}) {
  return async (req, res, next) => {
    const ifNoneMatch = req.headers['if-none-match'];

    if (ifNoneMatch) {
      // Check if ETag matches
      const cacheKey = `etag:${req.originalUrl}`;
      const cachedEtag = await cacheService.get(cacheKey);

      if (cachedEtag && cachedEtag === ifNoneMatch) {
        return res.status(304).send();
      }
    }

    // Store original json for ETag generation
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Generate ETag from response data
      const crypto = require('crypto');
      const etag = `"${crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')}"`;

      res.set('ETag', etag);

      // Cache the ETag
      const cacheKey = `etag:${req.originalUrl}`;
      cacheService.set(cacheKey, etag, 3600000).catch(() => {});

      return originalJson(data);
    };

    next();
  };
}

/**
 * Vary header caching middleware
 * @param {string[]} headers - Headers to include in Vary
 * @returns {Function} Express middleware
 */
function varyCache(headers) {
  return async (req, res, next) => {
    // Set Vary header
    res.set('Vary', headers.join(', '));

    // Generate cache key including vary headers
    const varyValues = headers
      .map(h => req.headers[h.toLowerCase()] || '')
      .join(':');

    const cacheKey = generateCacheKey(req) + `:vary:${varyValues}`;

    try {
      const cachedValue = await cacheService.get(cacheKey);

      if (cachedValue !== null) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedValue);
      }

      res.set('X-Cache', 'MISS');

      // Store original json
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, 300000).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      next();
    }
  };
}

/**
 * Cache-Control header middleware
 * @param {Object} options - Cache-Control options
 * @returns {Function} Express middleware
 */
function cacheControl(options = {}) {
  const {
    maxAge = 0,
    sMaxAge,
    noCache = false,
    noStore = false,
    mustRevalidate = false,
    proxyRevalidate = false,
    noTransform = false,
    public: isPublic = false,
    private: isPrivate = false,
    immutable = false,
    staleWhileRevalidate,
    staleIfError
  } = options;

  return (req, res, next) => {
    const directives = [];

    if (noStore) {
      directives.push('no-store');
    } else {
      if (noCache) directives.push('no-cache');
      if (isPublic) directives.push('public');
      if (isPrivate) directives.push('private');
      if (maxAge >= 0) directives.push(`max-age=${maxAge}`);
      if (sMaxAge !== undefined) directives.push(`s-maxage=${sMaxAge}`);
      if (mustRevalidate) directives.push('must-revalidate');
      if (proxyRevalidate) directives.push('proxy-revalidate');
      if (noTransform) directives.push('no-transform');
      if (immutable) directives.push('immutable');
      if (staleWhileRevalidate !== undefined) {
        directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      }
      if (staleIfError !== undefined) {
        directives.push(`stale-if-error=${staleIfError}`);
      }
    }

    if (directives.length > 0) {
      res.set('Cache-Control', directives.join(', '));
    }

    next();
  };
}

/**
 * Cache warmup middleware
 * @param {string[]} routes - Routes to warm
 * @param {Function} warmupFn - Warmup function
 * @returns {Function} Express middleware
 */
function warmup(routes, warmupFn) {
  // Track if warmup has been triggered
  let warmedUp = false;

  return async (req, res, next) => {
    if (!warmedUp && routes.includes(req.path)) {
      warmedUp = true;
      try {
        await warmupFn(req);
      } catch (error) {
        console.error('Cache warmup error:', error);
      }
    }

    next();
  };
}

module.exports = {
  generateCacheKey,
  cacheResponse,
  invalidateCache,
  conditionalCache,
  etagCache,
  varyCache,
  cacheControl,
  warmup
};
