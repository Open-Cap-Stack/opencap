/**
 * API Cache Middleware
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides automatic caching for GET requests with Cache-Control header
 * handling and conditional request support (If-None-Match/ETag).
 */

const ApiCacheService = require('../services/apiCacheService');

/**
 * API Cache Configuration
 */
const ApiCacheConfig = {
  // Default TTL in seconds (5 minutes)
  defaultTtl: 300,

  // HTTP methods that can be cached
  cacheableMethods: ['GET'],

  // Paths to exclude from caching
  excludePaths: [
    '/api/v1/auth',
    '/api/v1/admin',
    '/health'
  ],

  // Status codes that can be cached
  cacheableStatusCodes: [200],

  /**
   * Update configuration
   * @param {Object} config - Configuration to merge
   */
  update(config) {
    Object.assign(this, config);
  }
};

/**
 * Create API cache middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createApiCacheMiddleware(options = {}) {
  const cacheService = options.cacheService || new ApiCacheService({
    defaultTtl: (options.ttl || ApiCacheConfig.defaultTtl) * 1000,
    maxSize: options.maxSize || 1000
  });

  const excludePaths = options.excludePaths || ApiCacheConfig.excludePaths;
  const cacheableMethods = options.cacheableMethods || ApiCacheConfig.cacheableMethods;
  const cacheableStatusCodes = options.cacheableStatusCodes || ApiCacheConfig.cacheableStatusCodes;
  const ttl = options.ttl || ApiCacheConfig.defaultTtl;
  const ttlByPath = options.ttlByPath || {};
  const varyHeaders = options.varyHeaders || ['Accept'];
  const shouldBypass = options.shouldBypass || null;

  return async (req, res, next) => {
    // Skip non-cacheable methods
    if (!cacheableMethods.includes(req.method)) {
      return next();
    }

    // Check for cache bypass header
    if (req.headers['x-cache-bypass'] === 'true') {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Check custom bypass function
    if (shouldBypass && shouldBypass(req)) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Check for Cache-Control: no-cache or no-store
    const cacheControl = req.headers['cache-control'] || '';
    if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Check if path is excluded
    const isExcluded = excludePaths.some(excluded => req.path.startsWith(excluded));
    if (isExcluded) {
      return next();
    }

    // Generate cache key
    const cacheKey = cacheService.generateCacheKey(req, {
      varyByUser: !!req.user
    });

    // Check for If-None-Match header (conditional request)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch) {
      const isValid = cacheService.validateETag(cacheKey, ifNoneMatch);
      if (isValid) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('ETag', ifNoneMatch);
        return res.status(304).end();
      }
    }

    // Try to get cached response
    const cachedResponse = cacheService.getCachedResponse(cacheKey, {
      includeMetadata: true
    });

    if (cachedResponse) {
      // Set cache headers
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('ETag', cachedResponse.etag);

      // Set Cache-Control header
      const remainingTtl = Math.max(0, Math.floor((cachedResponse.expiresAt - Date.now()) / 1000));
      const cacheControlValue = req.user
        ? `private, max-age=${remainingTtl}`
        : `public, max-age=${remainingTtl}`;
      res.setHeader('Cache-Control', cacheControlValue);

      // Set Vary header
      res.setHeader('Vary', varyHeaders.join(', '));

      return res.json(cachedResponse.data);
    }

    // Cache miss - continue to handler and cache the response
    res.setHeader('X-Cache', 'MISS');

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (cacheableStatusCodes.includes(res.statusCode)) {
        // Determine TTL for this path
        let pathTtl = ttl;
        for (const [pattern, patternTtl] of Object.entries(ttlByPath)) {
          if (req.path.startsWith(pattern)) {
            pathTtl = patternTtl;
            break;
          }
        }

        // Cache the response
        const { etag } = cacheService.cacheResponse(cacheKey, data, {
          ttl: pathTtl * 1000
        });

        // Set cache headers
        res.setHeader('ETag', etag);

        const cacheControlValue = req.user
          ? `private, max-age=${pathTtl}`
          : `public, max-age=${pathTtl}`;
        res.setHeader('Cache-Control', cacheControlValue);

        // Set Vary header
        res.setHeader('Vary', varyHeaders.join(', '));
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  ApiCacheConfig,
  createApiCacheMiddleware
};
