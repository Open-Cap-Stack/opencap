/**
 * Cache Service Unit Tests
 * Issue #47: Implement Database Optimization and Caching
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const CacheService = require('../../../services/cacheService');

describe('CacheService', () => {
  let cacheService;

  beforeEach(() => {
    // Get a fresh instance for each test
    cacheService = CacheService;
    cacheService.flush();
  });

  afterEach(() => {
    cacheService.flush();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', async () => {
      await cacheService.set('test-key', 'test-value');
      const result = await cacheService.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should store and retrieve an object', async () => {
      const testObject = { name: 'Test', count: 42, nested: { value: true } };
      await cacheService.set('object-key', testObject);
      const result = await cacheService.get('object-key');
      expect(result).toEqual(testObject);
    });

    it('should store and retrieve an array', async () => {
      const testArray = [1, 2, 3, { nested: 'value' }];
      await cacheService.set('array-key', testArray);
      const result = await cacheService.get('array-key');
      expect(result).toEqual(testArray);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle null value', async () => {
      await cacheService.set('null-key', null);
      const result = await cacheService.get('null-key');
      expect(result).toBeNull();
    });

    it('should handle empty string value', async () => {
      await cacheService.set('empty-key', '');
      const result = await cacheService.get('empty-key');
      expect(result).toBe('');
    });

    it('should handle numeric value', async () => {
      await cacheService.set('number-key', 12345);
      const result = await cacheService.get('number-key');
      expect(result).toBe(12345);
    });

    it('should handle boolean value', async () => {
      await cacheService.set('bool-key', false);
      const result = await cacheService.get('bool-key');
      expect(result).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire value after TTL', async () => {
      // Set with 100ms TTL
      await cacheService.set('ttl-key', 'ttl-value', 100);

      // Value should exist immediately
      let result = await cacheService.get('ttl-key');
      expect(result).toBe('ttl-value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Value should be expired
      result = await cacheService.get('ttl-key');
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('default-ttl-key', 'value');
      const result = await cacheService.get('default-ttl-key');
      expect(result).toBe('value');
      // Default TTL should be much longer, value should still exist
    });

    it('should handle TTL of 0 (no expiration)', async () => {
      await cacheService.set('no-expire-key', 'value', 0);
      const result = await cacheService.get('no-expire-key');
      expect(result).toBe('value');
    });

    it('should update TTL when overwriting key', async () => {
      await cacheService.set('update-ttl-key', 'value1', 100);
      await cacheService.set('update-ttl-key', 'value2', 1000);

      // Wait past original TTL
      await new Promise(resolve => setTimeout(resolve, 150));

      // Value should still exist with new TTL
      const result = await cacheService.get('update-ttl-key');
      expect(result).toBe('value2');
    });
  });

  describe('delete', () => {
    it('should delete an existing key', async () => {
      await cacheService.set('delete-key', 'value');
      const deleted = await cacheService.delete('delete-key');
      expect(deleted).toBe(true);

      const result = await cacheService.get('delete-key');
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await cacheService.delete('non-existent-delete-key');
      expect(deleted).toBe(false);
    });

    it('should only delete the specified key', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      await cacheService.delete('key1');

      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBe('value2');
    });
  });

  describe('invalidate', () => {
    it('should invalidate keys matching pattern', async () => {
      await cacheService.set('user:1:profile', { name: 'User 1' });
      await cacheService.set('user:1:settings', { theme: 'dark' });
      await cacheService.set('user:2:profile', { name: 'User 2' });
      await cacheService.set('company:1:data', { name: 'Company' });

      const count = await cacheService.invalidate('user:1:*');

      expect(count).toBe(2);
      expect(await cacheService.get('user:1:profile')).toBeNull();
      expect(await cacheService.get('user:1:settings')).toBeNull();
      expect(await cacheService.get('user:2:profile')).not.toBeNull();
      expect(await cacheService.get('company:1:data')).not.toBeNull();
    });

    it('should invalidate keys with prefix pattern', async () => {
      await cacheService.set('query:users:all', []);
      await cacheService.set('query:users:active', []);
      await cacheService.set('query:companies:all', []);

      const count = await cacheService.invalidate('query:users:*');

      expect(count).toBe(2);
      expect(await cacheService.get('query:users:all')).toBeNull();
      expect(await cacheService.get('query:users:active')).toBeNull();
      expect(await cacheService.get('query:companies:all')).not.toBeNull();
    });

    it('should return 0 when no keys match pattern', async () => {
      await cacheService.set('key1', 'value1');
      const count = await cacheService.invalidate('non-existent:*');
      expect(count).toBe(0);
    });

    it('should support exact key match when no wildcard', async () => {
      await cacheService.set('exact-key', 'value');
      await cacheService.set('exact-key-other', 'other');

      const count = await cacheService.invalidate('exact-key');

      expect(count).toBe(1);
      expect(await cacheService.get('exact-key')).toBeNull();
      expect(await cacheService.get('exact-key-other')).not.toBeNull();
    });

    it('should support multiple wildcards', async () => {
      await cacheService.set('a:b:c', '1');
      await cacheService.set('a:x:c', '2');
      await cacheService.set('a:b:d', '3');

      const count = await cacheService.invalidate('a:*:c');

      expect(count).toBe(2);
      expect(await cacheService.get('a:b:c')).toBeNull();
      expect(await cacheService.get('a:x:c')).toBeNull();
      expect(await cacheService.get('a:b:d')).not.toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await cacheService.set('existing-key', 'cached-value');

      const computeFn = jest.fn(() => 'computed-value');
      const result = await cacheService.getOrSet('existing-key', computeFn);

      expect(result).toBe('cached-value');
      expect(computeFn).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', async () => {
      const computeFn = jest.fn(() => 'computed-value');
      const result = await cacheService.getOrSet('new-key', computeFn);

      expect(result).toBe('computed-value');
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Verify it was cached
      const cachedResult = await cacheService.get('new-key');
      expect(cachedResult).toBe('computed-value');
    });

    it('should handle async compute function', async () => {
      const computeFn = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-computed-value';
      });

      const result = await cacheService.getOrSet('async-key', computeFn);

      expect(result).toBe('async-computed-value');
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should use provided TTL', async () => {
      const computeFn = () => 'ttl-value';
      await cacheService.getOrSet('ttl-getorset-key', computeFn, 100);

      // Value should exist immediately
      expect(await cacheService.get('ttl-getorset-key')).toBe('ttl-value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Value should be expired
      expect(await cacheService.get('ttl-getorset-key')).toBeNull();
    });

    it('should handle compute function returning null', async () => {
      const computeFn = () => null;
      const result = await cacheService.getOrSet('null-compute-key', computeFn);

      expect(result).toBeNull();
    });

    it('should handle compute function returning undefined', async () => {
      const computeFn = () => undefined;
      const result = await cacheService.getOrSet('undefined-compute-key', computeFn);

      expect(result).toBeUndefined();
    });

    it('should propagate errors from compute function', async () => {
      const computeFn = () => {
        throw new Error('Compute error');
      };

      await expect(cacheService.getOrSet('error-key', computeFn))
        .rejects.toThrow('Compute error');
    });
  });

  describe('flush', () => {
    it('should clear all cached values', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      cacheService.flush();

      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
      expect(await cacheService.get('key3')).toBeNull();
    });

    it('should reset statistics', async () => {
      await cacheService.set('key', 'value');
      await cacheService.get('key'); // hit
      await cacheService.get('nonexistent'); // miss

      cacheService.flush();

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track cache hits', async () => {
      await cacheService.set('hit-key', 'value');
      await cacheService.get('hit-key');
      await cacheService.get('hit-key');
      await cacheService.get('hit-key');

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should track cache misses', async () => {
      await cacheService.get('miss-key-1');
      await cacheService.get('miss-key-2');

      const stats = cacheService.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should calculate hit rate', async () => {
      await cacheService.set('key', 'value');
      await cacheService.get('key'); // hit
      await cacheService.get('key'); // hit
      await cacheService.get('key'); // hit
      await cacheService.get('nonexistent'); // miss

      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(75); // 3 hits out of 4 total = 75%
    });

    it('should return 0 hit rate when no requests', async () => {
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should return cache size', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      const stats = cacheService.getStats();
      expect(stats.size).toBe(3);
    });

    it('should include memory usage estimation', async () => {
      await cacheService.set('key', 'value');

      const stats = cacheService.getStats();
      expect(stats).toHaveProperty('memoryUsage');
      expect(typeof stats.memoryUsage).toBe('number');
    });

    it('should track keys by prefix', async () => {
      await cacheService.set('user:1:data', {});
      await cacheService.set('user:2:data', {});
      await cacheService.set('company:1:data', {});

      const stats = cacheService.getStats();
      expect(stats.keysByPrefix).toBeDefined();
      expect(stats.keysByPrefix['user']).toBe(2);
      expect(stats.keysByPrefix['company']).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cacheService.set('exists-key', 'value');
      const result = await cacheService.has('exists-key');
      expect(result).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      const result = await cacheService.has('not-exists-key');
      expect(result).toBe(false);
    });

    it('should return false for expired key', async () => {
      await cacheService.set('expired-key', 'value', 50);
      await new Promise(resolve => setTimeout(resolve, 100));
      const result = await cacheService.has('expired-key');
      expect(result).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all cache keys', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      const keys = await cacheService.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return keys matching pattern', async () => {
      await cacheService.set('user:1', 'value1');
      await cacheService.set('user:2', 'value2');
      await cacheService.set('company:1', 'value3');

      const keys = await cacheService.keys('user:*');
      expect(keys).toHaveLength(2);
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
    });

    it('should return empty array when no keys', async () => {
      const keys = await cacheService.keys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('mget and mset', () => {
    it('should set multiple values at once', async () => {
      await cacheService.mset({
        'mkey1': 'value1',
        'mkey2': 'value2',
        'mkey3': 'value3'
      });

      expect(await cacheService.get('mkey1')).toBe('value1');
      expect(await cacheService.get('mkey2')).toBe('value2');
      expect(await cacheService.get('mkey3')).toBe('value3');
    });

    it('should get multiple values at once', async () => {
      await cacheService.set('mget1', 'value1');
      await cacheService.set('mget2', 'value2');

      const results = await cacheService.mget(['mget1', 'mget2', 'mget3']);

      expect(results).toEqual({
        'mget1': 'value1',
        'mget2': 'value2',
        'mget3': null
      });
    });
  });

  describe('increment and decrement', () => {
    it('should increment numeric value', async () => {
      await cacheService.set('counter', 10);
      const result = await cacheService.increment('counter');
      expect(result).toBe(11);
    });

    it('should increment by specified amount', async () => {
      await cacheService.set('counter', 10);
      const result = await cacheService.increment('counter', 5);
      expect(result).toBe(15);
    });

    it('should initialize to 1 if key does not exist', async () => {
      const result = await cacheService.increment('new-counter');
      expect(result).toBe(1);
    });

    it('should decrement numeric value', async () => {
      await cacheService.set('counter', 10);
      const result = await cacheService.decrement('counter');
      expect(result).toBe(9);
    });

    it('should decrement by specified amount', async () => {
      await cacheService.set('counter', 10);
      const result = await cacheService.decrement('counter', 3);
      expect(result).toBe(7);
    });

    it('should allow negative values', async () => {
      await cacheService.set('counter', 0);
      const result = await cacheService.decrement('counter');
      expect(result).toBe(-1);
    });
  });

  describe('touch', () => {
    it('should update TTL without changing value', async () => {
      await cacheService.set('touch-key', 'value', 100);

      // Touch with longer TTL
      await cacheService.touch('touch-key', 1000);

      // Wait past original TTL
      await new Promise(resolve => setTimeout(resolve, 150));

      // Value should still exist
      const result = await cacheService.get('touch-key');
      expect(result).toBe('value');
    });

    it('should return false for non-existent key', async () => {
      const result = await cacheService.touch('non-existent', 1000);
      expect(result).toBe(false);
    });
  });

  describe('namespace support', () => {
    it('should support namespaced keys', async () => {
      const userCache = cacheService.namespace('users');
      await userCache.set('1', { name: 'User 1' });

      const result = await userCache.get('1');
      expect(result).toEqual({ name: 'User 1' });

      // Check it uses namespace prefix internally
      const globalResult = await cacheService.get('users:1');
      expect(globalResult).toEqual({ name: 'User 1' });
    });

    it('should flush only namespace', async () => {
      const userCache = cacheService.namespace('users');
      const companyCache = cacheService.namespace('companies');

      await userCache.set('1', 'user1');
      await companyCache.set('1', 'company1');

      await userCache.flush();

      expect(await userCache.get('1')).toBeNull();
      expect(await companyCache.get('1')).toBe('company1');
    });
  });
});
