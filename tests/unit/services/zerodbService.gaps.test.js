/**
 * ZeroDB Service - Gap Coverage Tests
 *
 * Targets specific uncovered lines and branches:
 * - _withRetry: transient 429 (rate-limit delay path), exhausting max attempts
 * - initializeProject: ZERODB_PROJECT_ID env branch
 * - updateRows: post-filter warning when rows are filtered out
 * - deleteRows: post-filter warning when rows are filtered out
 * - _localQuery: sort with equal values (return 0 path)
 * - _localQuery: limit <= 0 returns empty
 */

jest.unmock('../../../services/zerodbService');

let requestInterceptor;
let responseInterceptor;

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn((s, e) => { requestInterceptor = { successHandler: s, errorHandler: e }; })
    },
    response: {
      use: jest.fn((s, e) => { responseInterceptor = { successHandler: s, errorHandler: e }; })
    }
  }
};

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  create: jest.fn(() => mockAxiosInstance)
}));

const zerodbService = require('../../../services/zerodbService');

function resetService() {
  mockAxiosInstance.get.mockReset();
  mockAxiosInstance.post.mockReset();
  mockAxiosInstance.put.mockReset();
  mockAxiosInstance.delete.mockReset();
  zerodbService.useLocalFallback = false;
  zerodbService._localStore = {};
  zerodbService.projectId = 'test-project';
  zerodbService.client = mockAxiosInstance;
}

describe('ZeroDB Service - Gap Coverage', () => {
  beforeEach(() => {
    resetService();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── _withRetry: 429 rate-limit with longer delay ───────────────────────────

  describe('_withRetry - 429 rate-limit delay', () => {
    it('should use 2000ms * attempt delay for 429 errors', async () => {
      jest.useRealTimers();

      const error429 = new Error('Rate limited');
      error429.response = { status: 429, data: {} };
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw error429;
        return Promise.resolve('success');
      });

      const result = await zerodbService._withRetry(fn, 2);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should throw after exhausting all attempts on 429', async () => {
      jest.useRealTimers();

      const error429 = new Error('Rate limited');
      error429.response = { status: 429, data: {} };
      const fn = jest.fn().mockRejectedValue(error429);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Rate limited');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ─── _withRetry: 500 with transient detail ─────────────────────────────────

  describe('_withRetry - 500 transient errors', () => {
    it('should retry on 500 with "connection" in detail', async () => {
      jest.useRealTimers();

      const error500 = new Error('Server error');
      error500.response = { status: 500, data: { detail: 'connection reset by peer' } };
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw error500;
        return Promise.resolve('ok');
      });

      const result = await zerodbService._withRetry(fn, 3);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 with "OperationalError" in detail', async () => {
      jest.useRealTimers();

      const error500 = new Error('Server error');
      error500.response = { status: 500, data: { detail: 'OperationalError: connection pool' } };
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw error500;
        return Promise.resolve('recovered');
      });

      const result = await zerodbService._withRetry(fn, 2);
      expect(result).toBe('recovered');
    });

    it('should retry on 500 with "INTERNAL_ERROR" in error field', async () => {
      jest.useRealTimers();

      const error500 = new Error('Server error');
      error500.response = { status: 500, data: { error: 'INTERNAL_ERROR occurred' } };
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw error500;
        return Promise.resolve('recovered');
      });

      const result = await zerodbService._withRetry(fn, 2);
      expect(result).toBe('recovered');
    });

    it('should NOT retry on 500 without transient detail', async () => {
      jest.useRealTimers();

      const error500 = new Error('Bad request data');
      error500.response = { status: 500, data: { detail: 'validation failed' } };
      const fn = jest.fn().mockRejectedValue(error500);

      await expect(zerodbService._withRetry(fn, 3)).rejects.toThrow('Bad request data');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // ─── _withRetry: ECONNRESET/ECONNABORTED ────────────────────────────────────

  describe('_withRetry - connection errors', () => {
    it('should retry on ECONNRESET', async () => {
      jest.useRealTimers();

      const err = new Error('socket hang up');
      err.code = 'ECONNRESET';
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw err;
        return Promise.resolve('reconnected');
      });

      const result = await zerodbService._withRetry(fn, 2);
      expect(result).toBe('reconnected');
    });

    it('should retry on ECONNABORTED', async () => {
      jest.useRealTimers();

      const err = new Error('connection aborted');
      err.code = 'ECONNABORTED';
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw err;
        return Promise.resolve('reconnected');
      });

      const result = await zerodbService._withRetry(fn, 2);
      expect(result).toBe('reconnected');
    });

    it('should retry on timeout message', async () => {
      jest.useRealTimers();

      const err = new Error('timeout of 30000ms exceeded');
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) throw err;
        return Promise.resolve('ok');
      });

      const result = await zerodbService._withRetry(fn, 2);
      expect(result).toBe('ok');
    });
  });

  // ─── initializeProject: ZERODB_PROJECT_ID env var ───────────────────────────

  describe('initializeProject - env var shortcut', () => {
    const origEnv = process.env.ZERODB_PROJECT_ID;

    afterEach(() => {
      if (origEnv !== undefined) {
        process.env.ZERODB_PROJECT_ID = origEnv;
      } else {
        delete process.env.ZERODB_PROJECT_ID;
      }
    });

    it('should return project from ZERODB_PROJECT_ID env var without API call', async () => {
      process.env.ZERODB_PROJECT_ID = 'env-project-42';

      const result = await zerodbService.initializeProject();

      expect(result).toEqual({ id: 'env-project-42', name: 'OpenCap' });
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  // ─── updateRows: post-filter reduces row count ──────────────────────────────

  describe('updateRows - post-filter warning path', () => {
    it('should warn when post-filter removes rows', async () => {
      jest.useRealTimers();

      // queryTable returns rows that include one that does NOT match exactly
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { name: 'Alice', status: 'active' } },
            { row_id: 'r2', row_data: { name: 'Alicia', status: 'active' } }
          ]
        }
      });
      mockAxiosInstance.put.mockResolvedValue({ data: { success: true } });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await zerodbService.updateRows('users', {
        filter: { name: 'Alice' },
        update: { $set: { status: 'inactive' } }
      });

      expect(result.modified_count).toBe(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('updateRows post-filter: 2 -> 1')
      );

      warnSpy.mockRestore();
    });

    it('should return zero counts when all rows are filtered out by post-filter', async () => {
      jest.useRealTimers();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { name: 'Bob', status: 'active' } }
          ]
        }
      });

      const result = await zerodbService.updateRows('users', {
        filter: { name: 'Alice' },
        update: { $set: { status: 'inactive' } }
      });

      expect(result).toEqual({ modified_count: 0, matched_count: 0 });
    });

    it('should handle filter with null values in post-filter (skip them)', async () => {
      jest.useRealTimers();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { name: 'Alice', category: 'A' } }
          ]
        }
      });
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      const result = await zerodbService.updateRows('users', {
        filter: { name: 'Alice', optionalField: null },
        update: { category: 'B' }
      });

      expect(result.modified_count).toBe(1);
    });

    it('should handle filter with $operators in post-filter (skip them)', async () => {
      jest.useRealTimers();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { name: 'Alice', age: 30 } }
          ]
        }
      });
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      const result = await zerodbService.updateRows('users', {
        filter: { name: 'Alice', age: { $gt: 20 } },
        update: { $set: { verified: true } }
      });

      expect(result.modified_count).toBe(1);
    });
  });

  // ─── deleteRows: post-filter warning path ───────────────────────────────────

  describe('deleteRows - post-filter warning path', () => {
    it('should warn when post-filter removes rows during delete', async () => {
      jest.useRealTimers();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { email: 'a@test.com' } },
            { row_id: 'r2', row_data: { email: 'ab@test.com' } }
          ]
        }
      });
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await zerodbService.deleteRows('contacts', {
        filter: { email: 'a@test.com' }
      });

      expect(result.deleted_count).toBe(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('deleteRows post-filter: 2 -> 1')
      );

      warnSpy.mockRestore();
    });

    it('should handle filter with null and object values in delete post-filter', async () => {
      jest.useRealTimers();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { name: 'test', score: 5 } }
          ]
        }
      });
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      const result = await zerodbService.deleteRows('items', {
        filter: { name: 'test', extra: undefined, score: { $gte: 3 } }
      });

      expect(result.deleted_count).toBe(1);
    });

    it('should check top-level row fields when row_data field is missing', async () => {
      jest.useRealTimers();

      // row_data doesn't have the field but top-level row does
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: [
            { row_id: 'r1', row_data: { name: 'test' }, status: 'active' }
          ]
        }
      });
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      const result = await zerodbService.deleteRows('items', {
        filter: { status: 'active' }
      });

      expect(result.deleted_count).toBe(1);
    });
  });

  // ─── _localQuery: sort with equal values ────────────────────────────────────

  describe('_localQuery - sort equality path', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
      zerodbService._localStore = {};
    });

    it('should return 0 when sorted values are equal', () => {
      zerodbService._localStore['scores'] = [
        { row_id: 'a', row_data: { name: 'Alice', score: 100 } },
        { row_id: 'b', row_data: { name: 'Bob', score: 100 } },
        { row_id: 'c', row_data: { name: 'Charlie', score: 90 } }
      ];

      const result = zerodbService._localQuery('scores', {
        sort: { score: -1 }
      });

      expect(result.data).toHaveLength(3);
      // Charlie with 90 should be last in descending sort
      expect(result.data[2].row_data.name).toBe('Charlie');
      // Alice and Bob both have 100 -- their relative order is stable
      const firstTwoNames = result.data.slice(0, 2).map(d => d.row_data.name);
      expect(firstTwoNames).toContain('Alice');
      expect(firstTwoNames).toContain('Bob');
    });

    it('should handle ascending sort with equal values', () => {
      zerodbService._localStore['items'] = [
        { row_id: 'a', row_data: { category: 'B', priority: 1 } },
        { row_id: 'b', row_data: { category: 'A', priority: 1 } },
        { row_id: 'c', row_data: { category: 'A', priority: 2 } }
      ];

      const result = zerodbService._localQuery('items', {
        sort: { category: 1, priority: 1 }
      });

      expect(result.data).toHaveLength(3);
      expect(result.data[0].row_data.category).toBe('A');
    });
  });

  // ─── _localQuery: limit <= 0 returns empty ──────────────────────────────────

  describe('_localQuery - zero limit', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should return empty data when limit is 0', () => {
      zerodbService._localStore['test'] = [
        { row_id: 'a', row_data: { val: 1 } }
      ];

      const result = zerodbService._localQuery('test', { limit: 0 });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(1);
    });
  });

  // ─── deleteRowById: local fallback row not found ────────────────────────────

  describe('deleteRowById - local fallback edge cases', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should return 0 deleted when row_id not found in local store', async () => {
      zerodbService._localStore['test'] = [
        { row_id: 'exists', row_data: { val: 1 } }
      ];

      const result = await zerodbService.deleteRowById('test', 'nonexistent');
      expect(result).toEqual({ deleted_count: 0 });
    });

    it('should return 0 deleted when table does not exist in local store', async () => {
      const result = await zerodbService.deleteRowById('no_table', 'any');
      expect(result).toEqual({ deleted_count: 0 });
    });
  });

  // ─── response interceptor: suppress UniqueViolation noise ──────────────────

  describe('response interceptor - error suppression', () => {
    it('should suppress UniqueViolation errors from logging', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = {
        response: { data: { detail: 'UniqueViolation: table already exists' } },
        message: 'Request failed'
      };

      zerodbService.useLocalFallback = false;
      await expect(responseInterceptor.errorHandler(error)).rejects.toBe(error);

      // Should NOT log because detail contains 'UniqueViolation'
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should suppress "already exists" errors from logging', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = {
        response: { data: { detail: 'Table foo already exists' } },
        message: 'Request failed'
      };

      zerodbService.useLocalFallback = false;
      await expect(responseInterceptor.errorHandler(error)).rejects.toBe(error);

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should log non-suppressed errors', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = {
        response: { data: { detail: 'Something unexpected' } },
        message: 'Request failed'
      };

      zerodbService.useLocalFallback = false;
      await expect(responseInterceptor.errorHandler(error)).rejects.toBe(error);

      expect(errorSpy).toHaveBeenCalledWith(
        'ZeroDB API Error:',
        expect.objectContaining({ detail: 'Something unexpected' })
      );
      errorSpy.mockRestore();
    });

    it('should skip logging when useLocalFallback is true', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = {
        response: { data: { detail: 'Something unexpected' } },
        message: 'Request failed'
      };

      zerodbService.useLocalFallback = true;
      await expect(responseInterceptor.errorHandler(error)).rejects.toBe(error);

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ─── _localMatchesFilter: operator coverage ─────────────────────────────────

  describe('_localMatchesFilter - operator branches', () => {
    it('should match $ne operator', () => {
      expect(zerodbService._localMatchesFilter(
        { status: 'active' },
        { status: { $ne: 'inactive' } }
      )).toBe(true);
    });

    it('should fail $ne operator when equal', () => {
      expect(zerodbService._localMatchesFilter(
        { status: 'active' },
        { status: { $ne: 'active' } }
      )).toBe(false);
    });

    it('should match $gt operator', () => {
      expect(zerodbService._localMatchesFilter(
        { age: 25 },
        { age: { $gt: 20 } }
      )).toBe(true);
    });

    it('should match $gte operator', () => {
      expect(zerodbService._localMatchesFilter(
        { age: 20 },
        { age: { $gte: 20 } }
      )).toBe(true);
    });

    it('should match $lt operator', () => {
      expect(zerodbService._localMatchesFilter(
        { age: 15 },
        { age: { $lt: 20 } }
      )).toBe(true);
    });

    it('should match $lte operator', () => {
      expect(zerodbService._localMatchesFilter(
        { age: 20 },
        { age: { $lte: 20 } }
      )).toBe(true);
    });

    it('should match $regex operator', () => {
      expect(zerodbService._localMatchesFilter(
        { name: 'Alice Smith' },
        { name: { $regex: 'alice', $options: 'i' } }
      )).toBe(true);
    });

    it('should fail $regex when no match', () => {
      expect(zerodbService._localMatchesFilter(
        { name: 'Bob' },
        { name: { $regex: 'alice', $options: 'i' } }
      )).toBe(false);
    });

    it('should match $in operator', () => {
      expect(zerodbService._localMatchesFilter(
        { status: 'active' },
        { status: { $in: ['active', 'trialing'] } }
      )).toBe(true);
    });

    it('should fail $in operator when not included', () => {
      expect(zerodbService._localMatchesFilter(
        { status: 'canceled' },
        { status: { $in: ['active', 'trialing'] } }
      )).toBe(false);
    });
  });
});
