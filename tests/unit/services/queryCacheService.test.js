/**
 * Query Cache Service Unit Tests
 * Issue #47: Implement Database Optimization and Caching
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const QueryCacheService = require('../../../services/queryCacheService');

// Mock cacheService
jest.mock('../../../services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  invalidate: jest.fn(),
  getOrSet: jest.fn(),
  flush: jest.fn(),
  getStats: jest.fn(),
  has: jest.fn(),
  keys: jest.fn()
}));

const cacheService = require('../../../services/cacheService');

describe('QueryCacheService', () => {
  let queryCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    queryCacheService = QueryCacheService;
    // Reset internal state if any
    if (queryCacheService.reset) {
      queryCacheService.reset();
    }
  });

  describe('getCacheKeyForQuery', () => {
    it('should generate consistent cache key for same query', () => {
      const query1 = { collection: 'users', filter: { status: 'active' } };
      const query2 = { collection: 'users', filter: { status: 'active' } };

      const key1 = queryCacheService.getCacheKeyForQuery(query1);
      const key2 = queryCacheService.getCacheKeyForQuery(query2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const query1 = { collection: 'users', filter: { status: 'active' } };
      const query2 = { collection: 'users', filter: { status: 'inactive' } };

      const key1 = queryCacheService.getCacheKeyForQuery(query1);
      const key2 = queryCacheService.getCacheKeyForQuery(query2);

      expect(key1).not.toBe(key2);
    });

    it('should include collection name in key', () => {
      const query = { collection: 'users', filter: {} };
      const key = queryCacheService.getCacheKeyForQuery(query);

      expect(key).toContain('users');
    });

    it('should include sort options in key', () => {
      const query1 = { collection: 'users', filter: {}, sort: { name: 1 } };
      const query2 = { collection: 'users', filter: {}, sort: { name: -1 } };

      const key1 = queryCacheService.getCacheKeyForQuery(query1);
      const key2 = queryCacheService.getCacheKeyForQuery(query2);

      expect(key1).not.toBe(key2);
    });

    it('should include pagination in key', () => {
      const query1 = { collection: 'users', filter: {}, skip: 0, limit: 10 };
      const query2 = { collection: 'users', filter: {}, skip: 10, limit: 10 };

      const key1 = queryCacheService.getCacheKeyForQuery(query1);
      const key2 = queryCacheService.getCacheKeyForQuery(query2);

      expect(key1).not.toBe(key2);
    });

    it('should handle nested filter objects', () => {
      const query = {
        collection: 'users',
        filter: {
          'profile.age': { $gte: 18 },
          'settings.notifications': true
        }
      };

      const key = queryCacheService.getCacheKeyForQuery(query);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });

    it('should produce same key regardless of filter property order', () => {
      const query1 = { collection: 'users', filter: { a: 1, b: 2 } };
      const query2 = { collection: 'users', filter: { b: 2, a: 1 } };

      const key1 = queryCacheService.getCacheKeyForQuery(query1);
      const key2 = queryCacheService.getCacheKeyForQuery(query2);

      expect(key1).toBe(key2);
    });

    it('should include projection in key', () => {
      const query1 = { collection: 'users', filter: {}, projection: { name: 1 } };
      const query2 = { collection: 'users', filter: {}, projection: { name: 1, email: 1 } };

      const key1 = queryCacheService.getCacheKeyForQuery(query1);
      const key2 = queryCacheService.getCacheKeyForQuery(query2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('cacheQuery', () => {
    it('should cache query results', async () => {
      const query = { collection: 'users', filter: { status: 'active' } };
      const results = [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }];

      await queryCacheService.cacheQuery(query, results);

      expect(cacheService.set).toHaveBeenCalled();
      const callArgs = cacheService.set.mock.calls[0];
      expect(callArgs[1]).toEqual(results);
    });

    it('should use custom TTL when provided', async () => {
      const query = { collection: 'users', filter: {} };
      const results = [];
      const ttl = 60000;

      await queryCacheService.cacheQuery(query, results, { ttl });

      const callArgs = cacheService.set.mock.calls[0];
      expect(callArgs[2]).toBe(ttl);
    });

    it('should use default TTL when not provided', async () => {
      const query = { collection: 'users', filter: {} };
      const results = [];

      await queryCacheService.cacheQuery(query, results);

      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should cache metadata along with results', async () => {
      const query = { collection: 'users', filter: {} };
      const results = [{ id: 1 }];

      await queryCacheService.cacheQuery(query, results, { includeMetadata: true });

      const callArgs = cacheService.set.mock.calls[0];
      const cachedValue = callArgs[1];

      // When metadata is included, results should be wrapped
      expect(cachedValue).toHaveProperty('results');
      expect(cachedValue).toHaveProperty('cachedAt');
      expect(cachedValue).toHaveProperty('query');
    });

    it('should tag cache entries for invalidation', async () => {
      const query = { collection: 'users', filter: {} };
      const results = [];
      const tags = ['users', 'active-users'];

      await queryCacheService.cacheQuery(query, results, { tags });

      // Service should track tags for later invalidation
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getCachedQuery', () => {
    it('should retrieve cached query results', async () => {
      const query = { collection: 'users', filter: {} };
      const cachedResults = [{ id: 1 }];

      cacheService.get.mockResolvedValue(cachedResults);

      const results = await queryCacheService.getCachedQuery(query);

      expect(results).toEqual(cachedResults);
    });

    it('should return null when cache miss', async () => {
      cacheService.get.mockResolvedValue(null);

      const query = { collection: 'users', filter: {} };
      const results = await queryCacheService.getCachedQuery(query);

      expect(results).toBeNull();
    });

    it('should unwrap metadata when retrieving', async () => {
      const cachedData = {
        results: [{ id: 1 }],
        cachedAt: Date.now(),
        query: { collection: 'users', filter: {} }
      };

      cacheService.get.mockResolvedValue(cachedData);

      const query = { collection: 'users', filter: {} };
      const results = await queryCacheService.getCachedQuery(query, { unwrapMetadata: true });

      expect(results).toEqual([{ id: 1 }]);
    });
  });

  describe('invalidateQueryCache', () => {
    it('should invalidate cache for a collection', async () => {
      cacheService.invalidate.mockResolvedValue(5);

      const count = await queryCacheService.invalidateQueryCache('users');

      expect(cacheService.invalidate).toHaveBeenCalledWith(expect.stringContaining('users'));
      expect(count).toBe(5);
    });

    it('should invalidate cache by tags', async () => {
      cacheService.keys.mockResolvedValue([
        'query:users:abc123',
        'query:users:def456'
      ]);
      cacheService.delete.mockResolvedValue(true);

      const count = await queryCacheService.invalidateQueryCache({ tags: ['active-users'] });

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate cache by query pattern', async () => {
      cacheService.invalidate.mockResolvedValue(3);

      const count = await queryCacheService.invalidateQueryCache({
        collection: 'users',
        filter: { status: 'active' }
      });

      expect(count).toBe(3);
    });

    it('should invalidate all query cache', async () => {
      cacheService.invalidate.mockResolvedValue(10);

      const count = await queryCacheService.invalidateQueryCache('*');

      expect(cacheService.invalidate).toHaveBeenCalledWith(expect.stringContaining('query:'));
    });

    it('should support cascading invalidation', async () => {
      // When invalidating parent, should also invalidate related queries
      cacheService.invalidate.mockResolvedValue(2);

      const count = await queryCacheService.invalidateQueryCache('users', {
        cascade: true,
        relatedCollections: ['user_profiles', 'user_settings']
      });

      expect(cacheService.invalidate).toHaveBeenCalledTimes(3); // users + 2 related
    });
  });

  describe('warmCache', () => {
    it('should pre-populate cache for common queries', async () => {
      const queries = [
        { collection: 'users', filter: { status: 'active' } },
        { collection: 'companies', filter: {} }
      ];

      const queryExecutor = jest.fn()
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([{ id: 2 }]);

      const results = await queryCacheService.warmCache(queries, queryExecutor);

      expect(queryExecutor).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledTimes(2);
      expect(results.warmed).toBe(2);
      expect(results.failed).toBe(0);
    });

    it('should continue warming on individual query failure', async () => {
      const queries = [
        { collection: 'users', filter: {} },
        { collection: 'invalid', filter: {} },
        { collection: 'companies', filter: {} }
      ];

      const queryExecutor = jest.fn()
        .mockResolvedValueOnce([{ id: 1 }])
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValueOnce([{ id: 3 }]);

      const results = await queryCacheService.warmCache(queries, queryExecutor);

      expect(results.warmed).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
    });

    it('should support custom TTL for warmed queries', async () => {
      const queries = [{ collection: 'users', filter: {} }];
      const queryExecutor = jest.fn().mockResolvedValue([]);

      await queryCacheService.warmCache(queries, queryExecutor, { ttl: 120000 });

      const setCallArgs = cacheService.set.mock.calls[0];
      expect(setCallArgs[2]).toBe(120000);
    });

    it('should run warming queries in parallel with concurrency limit', async () => {
      const queries = Array(10).fill({ collection: 'test', filter: {} });
      const queryExecutor = jest.fn().mockResolvedValue([]);

      await queryCacheService.warmCache(queries, queryExecutor, { concurrency: 3 });

      expect(queryExecutor).toHaveBeenCalledTimes(10);
    });

    it('should skip already cached queries when skipCached option is true', async () => {
      cacheService.has.mockResolvedValue(true);

      const queries = [{ collection: 'users', filter: {} }];
      const queryExecutor = jest.fn().mockResolvedValue([]);

      await queryCacheService.warmCache(queries, queryExecutor, { skipCached: true });

      expect(queryExecutor).not.toHaveBeenCalled();
    });
  });

  describe('executeWithCache', () => {
    it('should return cached result if available', async () => {
      const cachedResult = [{ id: 1 }];
      cacheService.get.mockResolvedValue(cachedResult);

      const query = { collection: 'users', filter: {} };
      const queryExecutor = jest.fn();

      const result = await queryCacheService.executeWithCache(query, queryExecutor);

      expect(result).toEqual(cachedResult);
      expect(queryExecutor).not.toHaveBeenCalled();
    });

    it('should execute query and cache result on cache miss', async () => {
      cacheService.get.mockResolvedValue(null);
      const queryResult = [{ id: 1 }];
      const queryExecutor = jest.fn().mockResolvedValue(queryResult);

      const query = { collection: 'users', filter: {} };
      const result = await queryCacheService.executeWithCache(query, queryExecutor);

      expect(result).toEqual(queryResult);
      expect(queryExecutor).toHaveBeenCalledTimes(1);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should bypass cache when cacheEnabled is false', async () => {
      cacheService.get.mockResolvedValue([{ id: 1 }]);
      const queryResult = [{ id: 2 }];
      const queryExecutor = jest.fn().mockResolvedValue(queryResult);

      const query = { collection: 'users', filter: {} };
      const result = await queryCacheService.executeWithCache(query, queryExecutor, {
        cacheEnabled: false
      });

      expect(result).toEqual(queryResult);
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should handle query execution errors gracefully', async () => {
      cacheService.get.mockResolvedValue(null);
      const queryExecutor = jest.fn().mockRejectedValue(new Error('DB Error'));

      const query = { collection: 'users', filter: {} };

      await expect(queryCacheService.executeWithCache(query, queryExecutor))
        .rejects.toThrow('DB Error');

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return stale cache on query error when staleOnError is enabled', async () => {
      const staleResult = [{ id: 1, stale: true }];

      cacheService.get
        .mockResolvedValueOnce(null) // Fresh check
        .mockResolvedValueOnce(staleResult); // Stale check

      const queryExecutor = jest.fn().mockRejectedValue(new Error('DB Error'));

      const query = { collection: 'users', filter: {} };
      const result = await queryCacheService.executeWithCache(query, queryExecutor, {
        staleOnError: true
      });

      expect(result).toEqual(staleResult);
    });
  });

  describe('getQueryCacheStats', () => {
    it('should return query cache statistics', () => {
      cacheService.getStats.mockReturnValue({
        hits: 100,
        misses: 50,
        hitRate: 66.67,
        size: 150
      });

      const stats = queryCacheService.getQueryCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should include cache breakdown by collection', () => {
      cacheService.keys.mockResolvedValue([
        'query:users:key1',
        'query:users:key2',
        'query:companies:key1'
      ]);

      const stats = queryCacheService.getQueryCacheStats();

      expect(stats).toHaveProperty('byCollection');
    });
  });

  describe('registerInvalidationRule', () => {
    it('should register write-through invalidation rule', async () => {
      const rule = {
        collection: 'users',
        operations: ['insert', 'update', 'delete'],
        invalidatePatterns: ['query:users:*', 'query:user_profiles:*']
      };

      queryCacheService.registerInvalidationRule(rule);

      // Simulate a write operation
      cacheService.invalidate.mockResolvedValue(5);
      await queryCacheService.onWrite('users', 'insert', { id: 1 });

      expect(cacheService.invalidate).toHaveBeenCalled();
    });

    it('should support conditional invalidation', async () => {
      const rule = {
        collection: 'users',
        operations: ['update'],
        condition: (data) => data.status === 'deleted',
        invalidatePatterns: ['query:users:*']
      };

      queryCacheService.registerInvalidationRule(rule);

      cacheService.invalidate.mockResolvedValue(0);

      // This should NOT trigger invalidation
      await queryCacheService.onWrite('users', 'update', { id: 1, status: 'active' });
      expect(cacheService.invalidate).not.toHaveBeenCalled();

      // This SHOULD trigger invalidation
      await queryCacheService.onWrite('users', 'update', { id: 1, status: 'deleted' });
      expect(cacheService.invalidate).toHaveBeenCalled();
    });
  });
});
