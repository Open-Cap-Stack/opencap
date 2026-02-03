/**
 * Query Cache Service
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides database query caching with automatic invalidation
 * Features: cache key generation, query execution with cache, cache warming
 */

const crypto = require('crypto');
const cacheService = require('./cacheService');

class QueryCacheService {
  constructor() {
    this.defaultTtl = 60000; // 1 minute default TTL
    this.cacheKeyPrefix = 'query';
    this.invalidationRules = [];
    this.tagIndex = new Map(); // Maps tags to cache keys
    this.stats = {
      hits: 0,
      misses: 0,
      byCollection: {}
    };
  }

  /**
   * Generate consistent cache key for a query
   * @param {Object} query - Query parameters
   * @returns {string} Cache key
   */
  getCacheKeyForQuery(query) {
    const { collection, filter = {}, sort, skip, limit, projection } = query;

    // Normalize query by sorting keys for consistent hashing
    const normalizedQuery = {
      collection,
      filter: this.sortObjectKeys(filter),
      sort: sort ? this.sortObjectKeys(sort) : undefined,
      skip,
      limit,
      projection: projection ? this.sortObjectKeys(projection) : undefined
    };

    // Remove undefined values
    const cleanedQuery = Object.fromEntries(
      Object.entries(normalizedQuery).filter(([_, v]) => v !== undefined)
    );

    // Generate hash of query
    const queryString = JSON.stringify(cleanedQuery);
    const hash = crypto.createHash('md5').update(queryString).digest('hex').slice(0, 12);

    return `${this.cacheKeyPrefix}:${collection}:${hash}`;
  }

  /**
   * Cache query results
   * @param {Object} query - Query parameters
   * @param {any} results - Query results
   * @param {Object} options - Cache options
   * @returns {Promise<boolean>} Success status
   */
  async cacheQuery(query, results, options = {}) {
    const {
      ttl = this.defaultTtl,
      includeMetadata = false,
      tags = []
    } = options;

    const cacheKey = this.getCacheKeyForQuery(query);

    let valueToCache = results;
    if (includeMetadata) {
      valueToCache = {
        results,
        cachedAt: Date.now(),
        query
      };
    }

    await cacheService.set(cacheKey, valueToCache, ttl);

    // Index tags for invalidation
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(cacheKey);
    }

    return true;
  }

  /**
   * Get cached query results
   * @param {Object} query - Query parameters
   * @param {Object} options - Options
   * @returns {Promise<any>} Cached results or null
   */
  async getCachedQuery(query, options = {}) {
    const { unwrapMetadata = false } = options;

    const cacheKey = this.getCacheKeyForQuery(query);
    const cachedValue = await cacheService.get(cacheKey);

    if (cachedValue === null) {
      this.stats.misses++;
      this.updateCollectionStats(query.collection, false);
      return null;
    }

    this.stats.hits++;
    this.updateCollectionStats(query.collection, true);

    if (unwrapMetadata && cachedValue.results !== undefined) {
      return cachedValue.results;
    }

    return cachedValue;
  }

  /**
   * Invalidate query cache
   * @param {string|Object} target - Collection name or invalidation options
   * @param {Object} options - Additional options
   * @returns {Promise<number>} Number of invalidated entries
   */
  async invalidateQueryCache(target, options = {}) {
    const { cascade = false, relatedCollections = [] } = options;

    let totalInvalidated = 0;

    // Handle string (collection name or wildcard)
    if (typeof target === 'string') {
      if (target === '*') {
        totalInvalidated = await cacheService.invalidate(`${this.cacheKeyPrefix}:*`);
      } else {
        totalInvalidated = await cacheService.invalidate(`${this.cacheKeyPrefix}:${target}:*`);
      }

      // Handle cascade invalidation
      if (cascade && relatedCollections.length > 0) {
        for (const collection of relatedCollections) {
          totalInvalidated += await cacheService.invalidate(`${this.cacheKeyPrefix}:${collection}:*`);
        }
      }
    }
    // Handle tags-based invalidation
    else if (target.tags) {
      const keysToInvalidate = new Set();
      for (const tag of target.tags) {
        const taggedKeys = this.tagIndex.get(tag);
        if (taggedKeys) {
          for (const key of taggedKeys) {
            keysToInvalidate.add(key);
          }
          this.tagIndex.delete(tag);
        }
      }

      for (const key of keysToInvalidate) {
        await cacheService.delete(key);
        totalInvalidated++;
      }
    }
    // Handle query-based invalidation
    else if (target.collection) {
      const pattern = `${this.cacheKeyPrefix}:${target.collection}:*`;
      totalInvalidated = await cacheService.invalidate(pattern);
    }

    return totalInvalidated;
  }

  /**
   * Pre-populate cache for common queries
   * @param {Object[]} queries - Array of queries to warm
   * @param {Function} queryExecutor - Function to execute queries
   * @param {Object} options - Warming options
   * @returns {Promise<Object>} Warming results
   */
  async warmCache(queries, queryExecutor, options = {}) {
    const {
      ttl = this.defaultTtl,
      concurrency = 5,
      skipCached = false
    } = options;

    const results = {
      warmed: 0,
      failed: 0,
      errors: []
    };

    // Process in batches for concurrency control
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);

      const batchPromises = batch.map(async (query) => {
        try {
          // Skip if already cached
          if (skipCached) {
            const cacheKey = this.getCacheKeyForQuery(query);
            const isCached = await cacheService.has(cacheKey);
            if (isCached) {
              return;
            }
          }

          // Execute query and cache result
          const result = await queryExecutor(query);
          await this.cacheQuery(query, result, { ttl });
          results.warmed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            query,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Execute query with cache support
   * @param {Object} query - Query parameters
   * @param {Function} queryExecutor - Function to execute query
   * @param {Object} options - Options
   * @returns {Promise<any>} Query results
   */
  async executeWithCache(query, queryExecutor, options = {}) {
    const {
      cacheEnabled = true,
      ttl = this.defaultTtl,
      staleOnError = false
    } = options;

    // Bypass cache if disabled
    if (!cacheEnabled) {
      return queryExecutor(query);
    }

    const cacheKey = this.getCacheKeyForQuery(query);

    // Try to get from cache
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult !== null) {
      this.stats.hits++;
      this.updateCollectionStats(query.collection, true);
      return cachedResult;
    }

    this.stats.misses++;
    this.updateCollectionStats(query.collection, false);

    try {
      // Execute query
      const result = await queryExecutor(query);

      // Cache the result
      await cacheService.set(cacheKey, result, ttl);

      return result;
    } catch (error) {
      // Return stale cache on error if enabled
      if (staleOnError) {
        const staleResult = await cacheService.get(cacheKey);
        if (staleResult !== null) {
          return staleResult;
        }
      }
      throw error;
    }
  }

  /**
   * Get query cache statistics
   * @returns {Object} Statistics
   */
  getQueryCacheStats() {
    const cacheStats = cacheService.getStats();

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0,
      byCollection: this.stats.byCollection,
      ...cacheStats
    };
  }

  /**
   * Register cache invalidation rule
   * @param {Object} rule - Invalidation rule
   */
  registerInvalidationRule(rule) {
    this.invalidationRules.push(rule);
  }

  /**
   * Handle write operation for cache invalidation
   * @param {string} collection - Collection name
   * @param {string} operation - Operation type
   * @param {Object} data - Operation data
   */
  async onWrite(collection, operation, data) {
    for (const rule of this.invalidationRules) {
      if (rule.collection !== collection) continue;
      if (!rule.operations.includes(operation)) continue;

      // Check condition if defined
      if (rule.condition && !rule.condition(data)) {
        continue;
      }

      // Invalidate matching patterns
      for (const pattern of rule.invalidatePatterns) {
        await cacheService.invalidate(pattern);
      }
    }
  }

  /**
   * Reset service state
   */
  reset() {
    this.stats = {
      hits: 0,
      misses: 0,
      byCollection: {}
    };
    this.invalidationRules = [];
    this.tagIndex.clear();
  }

  // Private helper methods

  /**
   * Sort object keys recursively for consistent serialization
   * @param {Object} obj - Object to sort
   * @returns {Object} Sorted object
   */
  sortObjectKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    return sorted;
  }

  /**
   * Update collection-level statistics
   * @param {string} collection - Collection name
   * @param {boolean} isHit - Whether it was a cache hit
   */
  updateCollectionStats(collection, isHit) {
    if (!this.stats.byCollection[collection]) {
      this.stats.byCollection[collection] = { hits: 0, misses: 0 };
    }

    if (isHit) {
      this.stats.byCollection[collection].hits++;
    } else {
      this.stats.byCollection[collection].misses++;
    }
  }
}

// Export singleton instance
module.exports = new QueryCacheService();
