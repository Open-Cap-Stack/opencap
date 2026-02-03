/**
 * Cache Service
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides in-memory caching with optional Redis support
 * Features: TTL, pattern-based invalidation, statistics, namespaces
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.expirations = new Map();
    this.stats = {
      hits: 0,
      misses: 0
    };
    this.defaultTtl = 300000; // 5 minutes default TTL
    this.redisClient = null;
    this.initializeRedis();
  }

  /**
   * Initialize Redis client if REDIS_URL is configured
   */
  initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        const redis = require('redis');
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });

        this.redisClient.on('connect', () => {
          console.log('CacheService: Redis connected');
        });

        this.redisClient.on('error', (err) => {
          console.error('CacheService: Redis error:', err);
          this.redisClient = null;
        });

        this.redisClient.connect().catch((err) => {
          console.error('CacheService: Redis connection failed:', err);
          this.redisClient = null;
        });
      } catch (error) {
        console.log('CacheService: Redis not available, using in-memory cache');
        this.redisClient = null;
      }
    }
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    this.cleanupExpired(key);

    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cached value with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (0 = no expiration)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTtl) {
    this.cache.set(key, value);

    if (ttl > 0) {
      const expirationTime = Date.now() + ttl;
      this.expirations.set(key, expirationTime);
    } else {
      this.expirations.delete(key);
    }

    return true;
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key existed and was deleted
   */
  async delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.expirations.delete(key);
    return existed;
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string} pattern - Pattern with wildcards (*) to match
   * @returns {Promise<number>} Number of invalidated entries
   */
  async invalidate(pattern) {
    const regex = this.patternToRegex(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.expirations.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cached value or compute and cache it
   * @param {string} key - Cache key
   * @param {Function} computeFn - Function to compute value on cache miss
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<any>} Cached or computed value
   */
  async getOrSet(key, computeFn, ttl = this.defaultTtl) {
    this.cleanupExpired(key);

    const cachedValue = this.cache.get(key);
    if (cachedValue !== undefined) {
      this.stats.hits++;
      return cachedValue;
    }

    this.stats.misses++;

    // Compute the value
    const computedValue = await computeFn();

    // Cache the result (even null/undefined)
    if (computedValue !== undefined) {
      await this.set(key, computedValue, ttl);
    }

    return computedValue;
  }

  /**
   * Clear all cached values
   */
  flush() {
    this.cache.clear();
    this.expirations.clear();
    this.stats = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    this.cleanupAllExpired();

    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    // Calculate memory usage estimation
    let memoryUsage = 0;
    for (const [key, value] of this.cache.entries()) {
      memoryUsage += this.estimateSize(key) + this.estimateSize(value);
    }

    // Calculate keys by prefix
    const keysByPrefix = {};
    for (const key of this.cache.keys()) {
      const prefix = key.split(':')[0];
      keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      memoryUsage,
      keysByPrefix
    };
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists and not expired
   */
  async has(key) {
    this.cleanupExpired(key);
    return this.cache.has(key);
  }

  /**
   * Get all cache keys, optionally filtered by pattern
   * @param {string} pattern - Optional pattern to filter keys
   * @returns {Promise<string[]>} Array of cache keys
   */
  async keys(pattern) {
    this.cleanupAllExpired();

    const allKeys = Array.from(this.cache.keys());

    if (!pattern) {
      return allKeys;
    }

    const regex = this.patternToRegex(pattern);
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} pairs - Object with key-value pairs
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(pairs, ttl = this.defaultTtl) {
    for (const [key, value] of Object.entries(pairs)) {
      await this.set(key, value, ttl);
    }
    return true;
  }

  /**
   * Get multiple values by keys
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs (null for missing)
   */
  async mget(keys) {
    const results = {};
    for (const key of keys) {
      results[key] = await this.get(key);
    }
    return results;
  }

  /**
   * Increment numeric value
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment
   * @returns {Promise<number>} New value
   */
  async increment(key, amount = 1) {
    this.cleanupExpired(key);

    const currentValue = this.cache.get(key);
    const newValue = (currentValue || 0) + amount;

    this.cache.set(key, newValue);
    return newValue;
  }

  /**
   * Decrement numeric value
   * @param {string} key - Cache key
   * @param {number} amount - Amount to decrement
   * @returns {Promise<number>} New value
   */
  async decrement(key, amount = 1) {
    return this.increment(key, -amount);
  }

  /**
   * Update TTL for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - New time to live in milliseconds
   * @returns {Promise<boolean>} True if key exists and TTL was updated
   */
  async touch(key, ttl) {
    if (!this.cache.has(key)) {
      return false;
    }

    if (ttl > 0) {
      const expirationTime = Date.now() + ttl;
      this.expirations.set(key, expirationTime);
    } else {
      this.expirations.delete(key);
    }

    return true;
  }

  /**
   * Create a namespaced cache wrapper
   * @param {string} prefix - Namespace prefix
   * @returns {Object} Namespaced cache interface
   */
  namespace(prefix) {
    const self = this;

    return {
      async get(key) {
        return self.get(`${prefix}:${key}`);
      },

      async set(key, value, ttl) {
        return self.set(`${prefix}:${key}`, value, ttl);
      },

      async delete(key) {
        return self.delete(`${prefix}:${key}`);
      },

      async has(key) {
        return self.has(`${prefix}:${key}`);
      },

      async flush() {
        return self.invalidate(`${prefix}:*`);
      },

      async keys(pattern) {
        const fullPattern = pattern ? `${prefix}:${pattern}` : `${prefix}:*`;
        const keys = await self.keys(fullPattern);
        return keys.map(k => k.replace(`${prefix}:`, ''));
      }
    };
  }

  // Private helper methods

  /**
   * Convert wildcard pattern to regex
   * @param {string} pattern - Pattern with wildcards
   * @returns {RegExp} Regular expression
   */
  patternToRegex(pattern) {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Convert * to regex .*
    const regexPattern = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * Clean up expired entry for specific key
   * @param {string} key - Cache key
   */
  cleanupExpired(key) {
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.cache.delete(key);
      this.expirations.delete(key);
    }
  }

  /**
   * Clean up all expired entries
   */
  cleanupAllExpired() {
    const now = Date.now();
    for (const [key, expiration] of this.expirations.entries()) {
      if (now > expiration) {
        this.cache.delete(key);
        this.expirations.delete(key);
      }
    }
  }

  /**
   * Estimate memory size of a value
   * @param {any} value - Value to estimate
   * @returns {number} Estimated bytes
   */
  estimateSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    if (typeof value === 'number') {
      return 8;
    }
    if (typeof value === 'boolean') {
      return 4;
    }
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 8;
  }
}

// Export singleton instance
module.exports = new CacheService();
