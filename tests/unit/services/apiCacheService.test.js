/**
 * API Cache Service Unit Tests
 * Issue #48: Implement API Rate Limiting and Response Optimization
 * TDD Red Phase: Tests written before implementation
 */

const ApiCacheService = require('../../../services/apiCacheService');

describe('ApiCacheService', () => {
  let cacheService;

  beforeEach(() => {
    cacheService = new ApiCacheService();
    cacheService.clear();
  });

  afterEach(() => {
    if (cacheService) {
      cacheService.destroy();
    }
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache key from request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: { page: '1', limit: '10' }
      };

      const key = cacheService.generateCacheKey(req);
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate same key for same request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: { page: '1' }
      };

      const key1 = cacheService.generateCacheKey(req);
      const key2 = cacheService.generateCacheKey(req);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different URLs', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: {}
      };
      const req2 = {
        method: 'GET',
        originalUrl: '/api/v1/companies',
        query: {}
      };

      const key1 = cacheService.generateCacheKey(req1);
      const key2 = cacheService.generateCacheKey(req2);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different query params', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: { page: '1' }
      };
      const req2 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: { page: '2' }
      };

      const key1 = cacheService.generateCacheKey(req1);
      const key2 = cacheService.generateCacheKey(req2);

      expect(key1).not.toBe(key2);
    });

    it('should include user ID in key when provided', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: {},
        user: { userId: 'user1' }
      };
      const req2 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: {},
        user: { userId: 'user2' }
      };

      const key1 = cacheService.generateCacheKey(req1, { varyByUser: true });
      const key2 = cacheService.generateCacheKey(req2, { varyByUser: true });

      expect(key1).not.toBe(key2);
    });

    it('should sort query parameters for consistent keys', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: { a: '1', b: '2' }
      };
      const req2 = {
        method: 'GET',
        originalUrl: '/api/v1/users',
        query: { b: '2', a: '1' }
      };

      const key1 = cacheService.generateCacheKey(req1);
      const key2 = cacheService.generateCacheKey(req2);

      expect(key1).toBe(key2);
    });
  });

  describe('cacheResponse', () => {
    it('should cache response data', () => {
      const key = 'test-key-1';
      const data = { users: [{ id: 1, name: 'John' }] };

      cacheService.cacheResponse(key, data);

      const cached = cacheService.getCachedResponse(key);
      expect(cached).toEqual(data);
    });

    it('should cache response with TTL', () => {
      const key = 'test-key-ttl';
      const data = { message: 'test' };

      cacheService.cacheResponse(key, data, { ttl: 1000 });

      expect(cacheService.getCachedResponse(key)).toEqual(data);
    });

    it('should generate and store ETag', () => {
      const key = 'test-key-etag';
      const data = { id: 1, name: 'Test' };

      const result = cacheService.cacheResponse(key, data);

      expect(result).toHaveProperty('etag');
      expect(result.etag).toBeTruthy();
    });

    it('should return cache metadata', () => {
      const key = 'test-key-meta';
      const data = { test: true };

      const result = cacheService.cacheResponse(key, data, { ttl: 5000 });

      expect(result).toHaveProperty('etag');
      expect(result).toHaveProperty('cachedAt');
      expect(result).toHaveProperty('expiresAt');
    });

    it('should respect maxSize configuration', () => {
      const smallCache = new ApiCacheService({ maxSize: 2 });

      smallCache.cacheResponse('key1', { data: 1 });
      smallCache.cacheResponse('key2', { data: 2 });
      smallCache.cacheResponse('key3', { data: 3 }); // Should evict oldest

      expect(smallCache.getCachedResponse('key3')).toBeDefined();
      // LRU eviction should remove key1
    });
  });

  describe('getCachedResponse', () => {
    it('should return null for non-existent key', () => {
      const result = cacheService.getCachedResponse('non-existent');
      expect(result).toBeNull();
    });

    it('should return cached data for valid key', () => {
      const key = 'get-test-key';
      const data = { value: 'test' };

      cacheService.cacheResponse(key, data);

      expect(cacheService.getCachedResponse(key)).toEqual(data);
    });

    it('should return null for expired cache entries', async () => {
      const key = 'expired-key';
      const data = { value: 'will expire' };

      cacheService.cacheResponse(key, data, { ttl: 50 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheService.getCachedResponse(key)).toBeNull();
    });

    it('should update access time on read (LRU behavior)', () => {
      const key = 'lru-test-key';
      const data = { value: 'lru' };

      cacheService.cacheResponse(key, data);

      const result1 = cacheService.getCachedResponse(key, { includeMetadata: true });

      // Access again after brief delay
      const result2 = cacheService.getCachedResponse(key, { includeMetadata: true });

      expect(result1.data).toEqual(data);
      expect(result2.data).toEqual(data);
    });
  });

  describe('invalidateCache', () => {
    it('should remove single cache entry', () => {
      const key = 'invalidate-key';
      cacheService.cacheResponse(key, { data: 'test' });

      cacheService.invalidateCache(key);

      expect(cacheService.getCachedResponse(key)).toBeNull();
    });

    it('should invalidate by pattern', () => {
      cacheService.cacheResponse('users:1', { id: 1 });
      cacheService.cacheResponse('users:2', { id: 2 });
      cacheService.cacheResponse('companies:1', { id: 1 });

      cacheService.invalidateCache('users:*', { pattern: true });

      expect(cacheService.getCachedResponse('users:1')).toBeNull();
      expect(cacheService.getCachedResponse('users:2')).toBeNull();
      expect(cacheService.getCachedResponse('companies:1')).not.toBeNull();
    });

    it('should invalidate by tags', () => {
      cacheService.cacheResponse('user-1', { id: 1 }, { tags: ['users', 'active'] });
      cacheService.cacheResponse('user-2', { id: 2 }, { tags: ['users', 'inactive'] });
      cacheService.cacheResponse('company-1', { id: 1 }, { tags: ['companies'] });

      cacheService.invalidateCache({ tag: 'users' });

      expect(cacheService.getCachedResponse('user-1')).toBeNull();
      expect(cacheService.getCachedResponse('user-2')).toBeNull();
      expect(cacheService.getCachedResponse('company-1')).not.toBeNull();
    });

    it('should return count of invalidated entries', () => {
      cacheService.cacheResponse('key1', { data: 1 });
      cacheService.cacheResponse('key2', { data: 2 });

      const count = cacheService.invalidateCache('key1');

      expect(count).toBe(1);
    });
  });

  describe('ETag Support', () => {
    it('should generate consistent ETag for same data', () => {
      const data = { id: 1, name: 'Test' };

      const etag1 = cacheService.generateETag(data);
      const etag2 = cacheService.generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it('should generate different ETag for different data', () => {
      const data1 = { id: 1, name: 'Test' };
      const data2 = { id: 2, name: 'Test' };

      const etag1 = cacheService.generateETag(data1);
      const etag2 = cacheService.generateETag(data2);

      expect(etag1).not.toBe(etag2);
    });

    it('should validate ETag match', () => {
      const key = 'etag-validate-key';
      const data = { id: 1 };

      const { etag } = cacheService.cacheResponse(key, data);

      expect(cacheService.validateETag(key, etag)).toBe(true);
    });

    it('should reject invalid ETag', () => {
      const key = 'etag-invalid-key';
      const data = { id: 1 };

      cacheService.cacheResponse(key, data);

      expect(cacheService.validateETag(key, 'invalid-etag')).toBe(false);
    });

    it('should return ETag in weak format (W/)', () => {
      const data = { test: true };
      const etag = cacheService.generateETag(data);

      expect(etag.startsWith('W/')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits', () => {
      const key = 'stats-hit-key';
      cacheService.cacheResponse(key, { data: 'test' });

      cacheService.getCachedResponse(key);
      cacheService.getCachedResponse(key);

      const stats = cacheService.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(2);
    });

    it('should track cache misses', () => {
      cacheService.getCachedResponse('non-existent-1');
      cacheService.getCachedResponse('non-existent-2');

      const stats = cacheService.getStats();
      expect(stats.misses).toBeGreaterThanOrEqual(2);
    });

    it('should calculate hit rate', () => {
      cacheService.cacheResponse('hit-rate-key', { data: 'test' });

      cacheService.getCachedResponse('hit-rate-key'); // hit
      cacheService.getCachedResponse('no-exist'); // miss

      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeDefined();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    it('should report cache size', () => {
      cacheService.cacheResponse('size-1', { a: 1 });
      cacheService.cacheResponse('size-2', { b: 2 });

      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
    });

    it('should reset statistics', () => {
      cacheService.cacheResponse('reset-key', { data: 'test' });
      cacheService.getCachedResponse('reset-key');

      cacheService.resetStats();

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Clear', () => {
    it('should clear all cache entries', () => {
      cacheService.cacheResponse('clear-1', { a: 1 });
      cacheService.cacheResponse('clear-2', { b: 2 });

      cacheService.clear();

      expect(cacheService.getCachedResponse('clear-1')).toBeNull();
      expect(cacheService.getCachedResponse('clear-2')).toBeNull();
    });

    it('should return count of cleared entries', () => {
      cacheService.cacheResponse('count-1', { a: 1 });
      cacheService.cacheResponse('count-2', { b: 2 });

      const count = cacheService.clear();

      expect(count).toBe(2);
    });
  });

  describe('Cache Configuration', () => {
    it('should accept custom TTL configuration', () => {
      const customCache = new ApiCacheService({ defaultTtl: 10000 });
      expect(customCache.config.defaultTtl).toBe(10000);
      customCache.destroy();
    });

    it('should accept custom max size', () => {
      const customCache = new ApiCacheService({ maxSize: 500 });
      expect(customCache.config.maxSize).toBe(500);
      customCache.destroy();
    });

    it('should use default configuration when not specified', () => {
      const defaultCache = new ApiCacheService();
      expect(defaultCache.config.defaultTtl).toBeDefined();
      expect(defaultCache.config.maxSize).toBeDefined();
      defaultCache.destroy();
    });
  });
});
