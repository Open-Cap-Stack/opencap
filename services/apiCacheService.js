/**
 * API Cache Service
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides caching for API responses with ETag support, TTL management,
 * cache invalidation, and LRU eviction.
 */

const crypto = require('crypto');

/**
 * API Cache Service
 * Manages caching of API responses with support for ETags, TTL, and cache invalidation
 */
class ApiCacheService {
  /**
   * Create a new API Cache Service
   * @param {Object} options - Configuration options
   * @param {number} options.defaultTtl - Default TTL in milliseconds (default: 5 minutes)
   * @param {number} options.maxSize - Maximum number of cache entries (default: 1000)
   */
  constructor(options = {}) {
    this.config = {
      defaultTtl: options.defaultTtl || 5 * 60 * 1000, // 5 minutes
      maxSize: options.maxSize || 1000
    };

    this.cache = new Map();
    this.tags = new Map(); // Tag to keys mapping
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60000);
  }

  /**
   * Generate a cache key from request
   * @param {Object} req - Express request object
   * @param {Object} options - Key generation options
   * @returns {string} Cache key
   */
  generateCacheKey(req, options = {}) {
    const parts = [
      req.method || 'GET',
      req.originalUrl || req.url || '/'
    ];

    // Sort and include query parameters for consistency
    if (req.query && Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&');
      parts.push(sortedQuery);
    }

    // Include user ID if varying by user
    if (options.varyByUser && req.user?.userId) {
      parts.push(`user:${req.user.userId}`);
    }

    const keyString = parts.join(':');
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Generate ETag for data
   * @param {*} data - Data to generate ETag for
   * @returns {string} Weak ETag string
   */
  generateETag(data) {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 27);
    return `W/"${hash}"`;
  }

  /**
   * Cache a response
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {Object} options - Cache options
   * @returns {Object} Cache metadata { etag, cachedAt, expiresAt }
   */
  cacheResponse(key, data, options = {}) {
    // Check cache size and evict if necessary
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const ttl = options.ttl || this.config.defaultTtl;
    const now = Date.now();
    const etag = this.generateETag(data);

    const entry = {
      data,
      etag,
      cachedAt: now,
      expiresAt: now + ttl,
      lastAccess: now,
      tags: options.tags || []
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    // Update tag mappings
    if (options.tags && options.tags.length > 0) {
      options.tags.forEach(tag => {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag).add(key);
      });
    }

    return {
      etag,
      cachedAt: now,
      expiresAt: now + ttl
    };
  }

  /**
   * Get cached response
   * @param {string} key - Cache key
   * @param {Object} options - Get options
   * @returns {*} Cached data or null
   */
  getCachedResponse(key, options = {}) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update last access time (LRU)
    entry.lastAccess = Date.now();
    this.stats.hits++;

    if (options.includeMetadata) {
      return {
        data: entry.data,
        etag: entry.etag,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt
      };
    }

    return entry.data;
  }

  /**
   * Invalidate cache entries
   * @param {string|Object} keyOrOptions - Cache key or invalidation options
   * @param {Object} options - Additional options
   * @returns {number} Number of entries invalidated
   */
  invalidateCache(keyOrOptions, options = {}) {
    let count = 0;

    // Handle string key
    if (typeof keyOrOptions === 'string') {
      if (options.pattern) {
        // Pattern-based invalidation
        const pattern = keyOrOptions.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);

        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.cache.delete(key);
            count++;
          }
        }
      } else {
        // Single key invalidation
        if (this.cache.has(keyOrOptions)) {
          this.cache.delete(keyOrOptions);
          count = 1;
        }
      }
    }

    // Handle tag-based invalidation
    if (typeof keyOrOptions === 'object' && keyOrOptions.tag) {
      const tag = keyOrOptions.tag;
      const taggedKeys = this.tags.get(tag);

      if (taggedKeys) {
        for (const key of taggedKeys) {
          if (this.cache.has(key)) {
            this.cache.delete(key);
            count++;
          }
        }
        this.tags.delete(tag);
      }
    }

    this.stats.deletes += count;
    return count;
  }

  /**
   * Validate ETag for a cache key
   * @param {string} key - Cache key
   * @param {string} etag - ETag to validate
   * @returns {boolean} Whether ETag matches
   */
  validateETag(key, etag) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return entry.etag === etag;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Clear all cache entries
   * @returns {number} Number of entries cleared
   */
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.tags.clear();
    return count;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict oldest entries (LRU)
   * @param {number} count - Number of entries to evict (default: 10% of maxSize)
   */
  evictOldest(count = Math.ceil(this.config.maxSize * 0.1)) {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Destroy the service (cleanup)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

module.exports = ApiCacheService;
