/**
 * ZeroDB Service - Final Coverage Tests
 *
 * Targets the last uncovered lines/branches:
 * - Line 80: throw lastError at end of _withRetry (unreachable in normal flow,
 *   but hit when maxAttempts exhausted with non-transient on last attempt)
 * - Lines 421-424: deleteRows fast path when filtering by row_id only
 * - deleteRowById local fallback: not found case
 * - _localMatchesFilter: various operator branches ($ne, $gt, $gte, $lt, $lte, $regex)
 * - insertRow: array path with local fallback
 * - queryTable: 404 table-not-found with error.message path
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
      use: jest.fn((s, e) => { requestInterceptor = { successHandler: s, errorHandler: e }; }),
    },
    response: {
      use: jest.fn((s, e) => { responseInterceptor = { successHandler: s, errorHandler: e }; }),
    },
  },
};

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  create: jest.fn(() => mockAxiosInstance),
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

describe('ZeroDB Service - Final Coverage', () => {
  beforeEach(() => {
    resetService();
  });

  // ── deleteRows: fast path when filtering by row_id only (lines 421-424) ────

  describe('deleteRows - fast path by row_id', () => {
    it('should delete directly by row_id without querying first', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await zerodbService.deleteRows('users', {
        filter: { row_id: 'row-abc-123' },
      });

      expect(result).toEqual({ deleted_count: 1 });
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        '/api/v1/projects/test-project/database/tables/users/rows/row-abc-123'
      );
      // Should NOT have called post (queryTable) since it used the fast path
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should NOT use fast path when row_id is combined with other filters', async () => {
      // When filter has row_id + other keys, it should use the normal path
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { data: [{ row_id: 'row-abc-123', row_data: { name: 'test', row_id: 'row-abc-123' } }] },
      });
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      const result = await zerodbService.deleteRows('users', {
        filter: { row_id: 'row-abc-123', status: 'active' },
      });

      // It should have called queryTable (post) first, then delete
      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });
  });

  // ── _withRetry: line 80 - throw lastError at end of loop ──────────────────

  describe('_withRetry - exhausting all retries with transient errors', () => {
    it('should throw after exhausting all retry attempts on 502 errors', async () => {
      jest.useRealTimers();

      const error502 = new Error('Bad Gateway');
      error502.response = { status: 502, data: {} };

      const fn = jest.fn().mockRejectedValue(error502);

      await expect(zerodbService._withRetry(fn, 3)).rejects.toThrow('Bad Gateway');
      expect(fn).toHaveBeenCalledTimes(3);
    }, 15000);

    it('should throw after exhausting all retries on 503 errors', async () => {
      jest.useRealTimers();

      const error503 = new Error('Service Unavailable');
      error503.response = { status: 503, data: {} };

      const fn = jest.fn().mockRejectedValue(error503);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Service Unavailable');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw after exhausting retries on 504 errors', async () => {
      jest.useRealTimers();

      const error504 = new Error('Gateway Timeout');
      error504.response = { status: 504, data: {} };

      const fn = jest.fn().mockRejectedValue(error504);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Gateway Timeout');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw after exhausting retries on ECONNRESET', async () => {
      jest.useRealTimers();

      const errReset = new Error('Connection reset');
      errReset.code = 'ECONNRESET';

      const fn = jest.fn().mockRejectedValue(errReset);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Connection reset');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw after exhausting retries on ECONNABORTED', async () => {
      jest.useRealTimers();

      const errAbort = new Error('Connection aborted');
      errAbort.code = 'ECONNABORTED';

      const fn = jest.fn().mockRejectedValue(errAbort);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Connection aborted');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw after exhausting retries on timeout message', async () => {
      jest.useRealTimers();

      const errTimeout = new Error('Request timeout exceeded');

      const fn = jest.fn().mockRejectedValue(errTimeout);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('timeout');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw immediately for non-transient errors (e.g. 400)', async () => {
      const error400 = new Error('Bad Request');
      error400.response = { status: 400, data: { detail: 'Invalid input' } };

      const fn = jest.fn().mockRejectedValue(error400);

      await expect(zerodbService._withRetry(fn, 3)).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 500 with connection detail then throw', async () => {
      jest.useRealTimers();

      const error500 = new Error('Internal Server Error');
      error500.response = { status: 500, data: { detail: 'connection refused' } };

      const fn = jest.fn().mockRejectedValue(error500);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Internal Server Error');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on 500 with OperationalError detail', async () => {
      jest.useRealTimers();

      const error500 = new Error('DB error');
      error500.response = { status: 500, data: { error: 'OperationalError encountered' } };

      const fn = jest.fn().mockRejectedValue(error500);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('DB error');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on 500 with INTERNAL_ERROR detail', async () => {
      jest.useRealTimers();

      const error500 = new Error('Internal');
      error500.response = { status: 500, data: { detail: 'INTERNAL_ERROR: something went wrong' } };

      const fn = jest.fn().mockRejectedValue(error500);

      await expect(zerodbService._withRetry(fn, 2)).rejects.toThrow('Internal');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  // ── deleteRowById local fallback ──────────────────────────────────────────

  describe('deleteRowById - local fallback', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should delete row from local store by row_id', async () => {
      zerodbService._localStore.users = [
        { row_id: 'r1', row_data: { name: 'Alice' } },
        { row_id: 'r2', row_data: { name: 'Bob' } },
      ];

      const result = await zerodbService.deleteRowById('users', 'r1');
      expect(result).toEqual({ deleted_count: 1 });
      expect(zerodbService._localStore.users).toHaveLength(1);
      expect(zerodbService._localStore.users[0].row_id).toBe('r2');
    });

    it('should return deleted_count 0 when row not found in local store', async () => {
      zerodbService._localStore.users = [
        { row_id: 'r1', row_data: { name: 'Alice' } },
      ];

      const result = await zerodbService.deleteRowById('users', 'nonexistent');
      expect(result).toEqual({ deleted_count: 0 });
      expect(zerodbService._localStore.users).toHaveLength(1);
    });

    it('should return deleted_count 0 when table does not exist in local store', async () => {
      const result = await zerodbService.deleteRowById('nonexistent_table', 'r1');
      expect(result).toEqual({ deleted_count: 0 });
    });
  });

  // ── deleteRowById remote: 404 returns deleted_count 0 ─────────────────────

  describe('deleteRowById - remote 404', () => {
    it('should return deleted_count 0 when row not found (404)', async () => {
      const err404 = new Error('Not found');
      err404.response = { status: 404 };
      mockAxiosInstance.delete.mockRejectedValueOnce(err404);

      const result = await zerodbService.deleteRowById('users', 'nonexistent');
      expect(result).toEqual({ deleted_count: 0 });
    });

    it('should throw for non-404 errors', async () => {
      const err500 = new Error('Server error');
      err500.response = { status: 500 };
      mockAxiosInstance.delete.mockRejectedValueOnce(err500);

      await expect(zerodbService.deleteRowById('users', 'r1')).rejects.toThrow('Server error');
    });
  });

  // ── _localMatchesFilter: all operator branches ────────────────────────────

  describe('_localMatchesFilter - operator branches', () => {
    it('should match $ne operator', () => {
      const item = { status: 'active' };
      expect(zerodbService._localMatchesFilter(item, { status: { $ne: 'inactive' } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { status: { $ne: 'active' } })).toBe(false);
    });

    it('should match $gt operator', () => {
      const item = { age: 25 };
      expect(zerodbService._localMatchesFilter(item, { age: { $gt: 20 } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { age: { $gt: 25 } })).toBe(false);
    });

    it('should match $gte operator', () => {
      const item = { age: 25 };
      expect(zerodbService._localMatchesFilter(item, { age: { $gte: 25 } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { age: { $gte: 26 } })).toBe(false);
    });

    it('should match $lt operator', () => {
      const item = { age: 25 };
      expect(zerodbService._localMatchesFilter(item, { age: { $lt: 30 } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { age: { $lt: 25 } })).toBe(false);
    });

    it('should match $lte operator', () => {
      const item = { age: 25 };
      expect(zerodbService._localMatchesFilter(item, { age: { $lte: 25 } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { age: { $lte: 24 } })).toBe(false);
    });

    it('should match $regex operator', () => {
      const item = { name: 'Alice Smith' };
      expect(zerodbService._localMatchesFilter(item, { name: { $regex: 'alice', $options: 'i' } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { name: { $regex: '^bob' } })).toBe(false);
    });

    it('should match $in operator', () => {
      const item = { status: 'active' };
      expect(zerodbService._localMatchesFilter(item, { status: { $in: ['active', 'trialing'] } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { status: { $in: ['inactive'] } })).toBe(false);
    });

    it('should match exact value', () => {
      const item = { status: 'active' };
      expect(zerodbService._localMatchesFilter(item, { status: 'active' })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { status: 'inactive' })).toBe(false);
    });

    it('should return true for empty filter', () => {
      expect(zerodbService._localMatchesFilter({ name: 'test' }, {})).toBe(true);
      expect(zerodbService._localMatchesFilter({ name: 'test' }, null)).toBe(true);
      expect(zerodbService._localMatchesFilter({ name: 'test' }, undefined)).toBe(true);
    });
  });

  // ── queryTable: table not found via error.message ─────────────────────────

  describe('queryTable - table not found via error.message', () => {
    it('should return empty array when error message contains "not found"', async () => {
      const err = new Error('Table "missing_table" not found');
      mockAxiosInstance.post.mockRejectedValueOnce(err);

      const result = await zerodbService.queryTable('missing_table');
      expect(result).toEqual([]);
    });

    it('should return empty array when error response detail contains "not found"', async () => {
      const err = new Error('HTTP Error');
      err.response = { status: 500, data: { detail: 'Resource not found' } };
      mockAxiosInstance.post.mockRejectedValueOnce(err);

      const result = await zerodbService.queryTable('missing_table');
      expect(result).toEqual([]);
    });
  });

  // ── insertRow: local fallback with array ──────────────────────────────────

  describe('insertRow - local fallback with array', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should insert array of rows via local fallback', async () => {
      const rows = [{ name: 'Alice' }, { name: 'Bob' }];
      const result = await zerodbService.insertRow('users', rows);

      expect(result.data).toHaveLength(2);
      expect(zerodbService._localStore.users).toHaveLength(2);
    });

    it('should insert single row via local fallback', async () => {
      const row = { name: 'Charlie' };
      const result = await zerodbService.insertRow('users', row);

      expect(result.data).toHaveLength(1);
      expect(zerodbService._localStore.users).toHaveLength(1);
    });
  });

  // ── insertRow: remote array path ──────────────────────────────────────────

  describe('insertRow - remote array path', () => {
    it('should insert array of rows individually via API', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { row_id: 'r1' } })
        .mockResolvedValueOnce({ data: { row_id: 'r2' } });

      const result = await zerodbService.insertRow('users', [{ name: 'A' }, { name: 'B' }]);
      expect(result.data).toHaveLength(2);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should insert single row via API with retry', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { row_id: 'r1' } });

      const result = await zerodbService.insertRow('users', { name: 'A' });
      expect(result.data).toHaveLength(1);
    });

    it('should propagate errors from insertRow', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(zerodbService.insertRow('users', { name: 'A' })).rejects.toThrow('Insert failed');
    });
  });

  // ── _normalizeFilterForZeroDB: edge cases ─────────────────────────────────

  describe('_normalizeFilterForZeroDB - edge cases', () => {
    it('should return non-object values as-is', () => {
      expect(zerodbService._normalizeFilterForZeroDB(null)).toBe(null);
      expect(zerodbService._normalizeFilterForZeroDB(undefined)).toBe(undefined);
      expect(zerodbService._normalizeFilterForZeroDB('string')).toBe('string');
      expect(zerodbService._normalizeFilterForZeroDB(42)).toBe(42);
    });

    it('should convert boolean values to strings', () => {
      const filter = { active: true, deleted: false };
      const result = zerodbService._normalizeFilterForZeroDB(filter);
      expect(result).toEqual({ active: 'true', deleted: 'false' });
    });

    it('should recursively normalize nested objects', () => {
      const filter = { status: { $in: ['active'] }, isAdmin: true };
      const result = zerodbService._normalizeFilterForZeroDB(filter);
      expect(result.isAdmin).toBe('true');
    });

    it('should not normalize arrays', () => {
      const filter = { tags: ['a', 'b'] };
      const result = zerodbService._normalizeFilterForZeroDB(filter);
      expect(result.tags).toEqual(['a', 'b']);
    });
  });

  // ── createTable: local fallback ───────────────────────────────────────────

  describe('createTable - local fallback', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should initialize local store for new table', async () => {
      const result = await zerodbService.createTable('new_table', { col1: 'text' });
      expect(result).toEqual({ table_name: 'new_table', schema: { col1: 'text' } });
      expect(zerodbService._localStore.new_table).toEqual([]);
    });

    it('should not overwrite existing local table', async () => {
      zerodbService._localStore.existing = [{ row_id: 'r1', row_data: {} }];
      const result = await zerodbService.createTable('existing', {});
      expect(zerodbService._localStore.existing).toHaveLength(1);
    });
  });

  // ── listTables: local fallback ────────────────────────────────────────────

  describe('listTables - local fallback', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should list tables from local store', async () => {
      zerodbService._localStore = { users: [], orders: [] };
      const result = await zerodbService.listTables();
      expect(result).toEqual([
        { table_name: 'users' },
        { table_name: 'orders' },
      ]);
    });
  });

  // ── countRows: local fallback ─────────────────────────────────────────────

  describe('countRows - local fallback', () => {
    beforeEach(() => {
      zerodbService.useLocalFallback = true;
    });

    it('should count rows matching filter in local store', async () => {
      zerodbService._localStore.users = [
        { row_id: 'r1', row_data: { status: 'active' } },
        { row_id: 'r2', row_data: { status: 'inactive' } },
        { row_id: 'r3', row_data: { status: 'active' } },
      ];
      const count = await zerodbService.countRows('users', { status: 'active' });
      expect(count).toBe(2);
    });

    it('should return 0 for non-existent table', async () => {
      const count = await zerodbService.countRows('nonexistent');
      expect(count).toBe(0);
    });
  });

  // ── _localDelete: non-existent table ──────────────────────────────────────

  describe('_localDelete - edge cases', () => {
    it('should return deleted_count 0 for non-existent table', () => {
      zerodbService.useLocalFallback = true;
      const result = zerodbService._localDelete('nonexistent', { filter: { id: '1' } });
      expect(result).toEqual({ deleted_count: 0 });
    });
  });

  // ── updateRowsByQuery and deleteRowsByQuery delegates ─────────────────────

  describe('delegate methods', () => {
    it('updateRowsByQuery should delegate to updateRows', async () => {
      zerodbService.useLocalFallback = true;
      zerodbService._localStore.users = [
        { row_id: 'r1', row_data: { name: 'Alice', status: 'inactive' } },
      ];

      const result = await zerodbService.updateRowsByQuery('users', { name: 'Alice' }, { $set: { status: 'active' } });
      expect(result.modified_count).toBe(1);
      expect(zerodbService._localStore.users[0].row_data.status).toBe('active');
    });

    it('deleteRowsByQuery should delegate to deleteRows', async () => {
      zerodbService.useLocalFallback = true;
      zerodbService._localStore.users = [
        { row_id: 'r1', row_data: { name: 'Alice' } },
        { row_id: 'r2', row_data: { name: 'Bob' } },
      ];

      const result = await zerodbService.deleteRowsByQuery('users', { name: 'Alice' });
      expect(result.deleted_count).toBe(1);
      expect(zerodbService._localStore.users).toHaveLength(1);
    });
  });

  // ── queryRows: remote path ────────────────────────────────────────────────

  describe('queryRows - remote', () => {
    it('should query rows with filter as JSON string param', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [{ row_id: 'r1' }] });

      const result = await zerodbService.queryRows('users', { status: 'active' }, { limit: 10 });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/projects/test-project/database/tables/users/rows',
        {
          params: {
            limit: 10,
            filter: JSON.stringify({ status: 'active' }),
          },
        }
      );
    });

    it('should query rows without filter when query is empty', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

      await zerodbService.queryRows('users', {});
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/projects/test-project/database/tables/users/rows',
        { params: {} }
      );
    });

    it('should propagate queryRows errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Query failed'));
      await expect(zerodbService.queryRows('users')).rejects.toThrow('Query failed');
    });
  });

  // ── initialize: fallback and production behavior ────────────────────────

  describe('initialize - error handling', () => {
    it('should use local fallback in non-production when initializeProject throws', async () => {
      const origEnv = process.env.NODE_ENV;
      const origProjectId = process.env.ZERODB_PROJECT_ID;
      process.env.NODE_ENV = 'development';
      delete process.env.ZERODB_PROJECT_ID;

      // Make the /projects GET fail to force initializeProject to throw
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      const result = await zerodbService.initialize('test-token');
      expect(result.databaseStatus.status).toBe('local-fallback');
      expect(zerodbService.useLocalFallback).toBe(true);

      process.env.NODE_ENV = origEnv;
      if (origProjectId) process.env.ZERODB_PROJECT_ID = origProjectId;
      zerodbService.useLocalFallback = false;
    });

    it('should throw in production when API is unreachable', async () => {
      const origEnv = process.env.NODE_ENV;
      const origProjectId = process.env.ZERODB_PROJECT_ID;
      process.env.NODE_ENV = 'production';
      delete process.env.ZERODB_PROJECT_ID;

      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      await expect(zerodbService.initialize('test-token')).rejects.toThrow('Network error');

      process.env.NODE_ENV = origEnv;
      if (origProjectId) process.env.ZERODB_PROJECT_ID = origProjectId;
    });
  });
});
