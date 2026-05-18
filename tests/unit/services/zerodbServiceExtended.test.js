/**
 * Extended Unit Tests for ZeroDB Service
 *
 * Covers local fallback mode, row CRUD operations, filter normalization,
 * helper methods, and branches not exercised by the primary test file.
 */

// Unmock zerodbService since setup.js globally mocks it
jest.unmock('../../../services/zerodbService');

// Capture interceptors registered during service constructor
let requestInterceptor;
let responseInterceptor;

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn((successHandler, errorHandler) => {
        requestInterceptor = { successHandler, errorHandler };
      })
    },
    response: {
      use: jest.fn((successHandler, errorHandler) => {
        responseInterceptor = { successHandler, errorHandler };
      })
    }
  }
};

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    create: jest.fn(() => mockAxiosInstance)
  };
});

const zerodbService = require('../../../services/zerodbService');

// Helper — put service into local-fallback mode and reset its store
function enableLocalFallback() {
  zerodbService.useLocalFallback = true;
  zerodbService._localStore = {};
  zerodbService.projectId = 'local-dev';
}

function disableLocalFallback() {
  zerodbService.useLocalFallback = false;
  zerodbService._localStore = {};
  zerodbService.projectId = 'test-project-123';
}

describe('ZeroDB Service — Extended Coverage', () => {
  beforeEach(() => {
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    disableLocalFallback();
  });

  // ---------------------------------------------------------------------------
  // _normalizeFilterForZeroDB
  // ---------------------------------------------------------------------------
  describe('_normalizeFilterForZeroDB', () => {
    it('returns filter unchanged when null', () => {
      expect(zerodbService._normalizeFilterForZeroDB(null)).toBeNull();
    });

    it('returns filter unchanged when not an object', () => {
      expect(zerodbService._normalizeFilterForZeroDB('string')).toBe('string');
    });

    it('converts boolean true to string "true"', () => {
      const result = zerodbService._normalizeFilterForZeroDB({ isActive: true });
      expect(result.isActive).toBe('true');
    });

    it('converts boolean false to string "false"', () => {
      const result = zerodbService._normalizeFilterForZeroDB({ isDeleted: false });
      expect(result.isDeleted).toBe('false');
    });

    it('passes through string values unchanged', () => {
      const result = zerodbService._normalizeFilterForZeroDB({ status: 'active' });
      expect(result.status).toBe('active');
    });

    it('passes through number values unchanged', () => {
      const result = zerodbService._normalizeFilterForZeroDB({ amount: 100 });
      expect(result.amount).toBe(100);
    });

    it('recursively normalizes nested objects like $in operators', () => {
      const filter = { role: { $in: ['admin', 'manager'] } };
      const result = zerodbService._normalizeFilterForZeroDB(filter);
      // Arrays are not recursed further since !Array.isArray check
      expect(result.role.$in).toEqual(['admin', 'manager']);
    });

    it('does not recurse into arrays', () => {
      const filter = { tags: ['a', 'b'] };
      const result = zerodbService._normalizeFilterForZeroDB(filter);
      expect(result.tags).toEqual(['a', 'b']);
    });
  });

  // ---------------------------------------------------------------------------
  // _localMatchesFilter
  // ---------------------------------------------------------------------------
  describe('_localMatchesFilter', () => {
    it('returns true when filter is empty', () => {
      expect(zerodbService._localMatchesFilter({ name: 'Alice' }, {})).toBe(true);
    });

    it('returns true when filter is null', () => {
      expect(zerodbService._localMatchesFilter({ name: 'Alice' }, null)).toBe(true);
    });

    it('returns true for exact match', () => {
      expect(zerodbService._localMatchesFilter({ status: 'active' }, { status: 'active' })).toBe(true);
    });

    it('returns false for mismatched value', () => {
      expect(zerodbService._localMatchesFilter({ status: 'inactive' }, { status: 'active' })).toBe(false);
    });

    it('handles $in operator correctly', () => {
      const item = { role: 'admin' };
      expect(zerodbService._localMatchesFilter(item, { role: { $in: ['admin', 'manager'] } })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { role: { $in: ['user'] } })).toBe(false);
    });

    it('handles $ne operator correctly', () => {
      expect(zerodbService._localMatchesFilter({ status: 'active' }, { status: { $ne: 'inactive' } })).toBe(true);
      expect(zerodbService._localMatchesFilter({ status: 'inactive' }, { status: { $ne: 'inactive' } })).toBe(false);
    });

    it('handles $gt operator correctly', () => {
      expect(zerodbService._localMatchesFilter({ amount: 100 }, { amount: { $gt: 50 } })).toBe(true);
      expect(zerodbService._localMatchesFilter({ amount: 30 }, { amount: { $gt: 50 } })).toBe(false);
    });

    it('handles $gte operator correctly', () => {
      expect(zerodbService._localMatchesFilter({ amount: 50 }, { amount: { $gte: 50 } })).toBe(true);
      expect(zerodbService._localMatchesFilter({ amount: 49 }, { amount: { $gte: 50 } })).toBe(false);
    });

    it('handles $lt operator correctly', () => {
      expect(zerodbService._localMatchesFilter({ amount: 30 }, { amount: { $lt: 50 } })).toBe(true);
      expect(zerodbService._localMatchesFilter({ amount: 60 }, { amount: { $lt: 50 } })).toBe(false);
    });

    it('handles $lte operator correctly', () => {
      expect(zerodbService._localMatchesFilter({ amount: 50 }, { amount: { $lte: 50 } })).toBe(true);
      expect(zerodbService._localMatchesFilter({ amount: 51 }, { amount: { $lte: 50 } })).toBe(false);
    });

    it('handles $regex operator correctly', () => {
      expect(zerodbService._localMatchesFilter({ name: 'Alice Smith' }, { name: { $regex: 'Alice' } })).toBe(true);
      expect(zerodbService._localMatchesFilter({ name: 'Bob Jones' }, { name: { $regex: 'Alice' } })).toBe(false);
    });

    it('handles multiple filter conditions with AND logic', () => {
      const item = { status: 'active', role: 'admin' };
      expect(zerodbService._localMatchesFilter(item, { status: 'active', role: 'admin' })).toBe(true);
      expect(zerodbService._localMatchesFilter(item, { status: 'active', role: 'user' })).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // _localQuery
  // ---------------------------------------------------------------------------
  describe('_localQuery', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['test_table'] = [
        { row_id: 'r1', row_data: { name: 'Alice', amount: 100, status: 'active' } },
        { row_id: 'r2', row_data: { name: 'Bob', amount: 200, status: 'inactive' } },
        { row_id: 'r3', row_data: { name: 'Carol', amount: 150, status: 'active' } }
      ];
    });

    it('returns all rows when filter is empty', () => {
      const result = zerodbService._localQuery('test_table', {});
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('filters rows by exact value match', () => {
      const result = zerodbService._localQuery('test_table', { filter: { status: 'active' } });
      expect(result.data).toHaveLength(2);
    });

    it('applies skip and limit correctly', () => {
      const result = zerodbService._localQuery('test_table', { skip: 1, limit: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('returns empty data when limit is 0', () => {
      const result = zerodbService._localQuery('test_table', { limit: 0 });
      expect(result.data).toHaveLength(0);
    });

    it('sorts ascending by field', () => {
      const result = zerodbService._localQuery('test_table', { sort: { amount: 1 } });
      const amounts = result.data.map(r => r.row_data.amount);
      expect(amounts).toEqual([100, 150, 200]);
    });

    it('sorts descending by field', () => {
      const result = zerodbService._localQuery('test_table', { sort: { amount: -1 } });
      const amounts = result.data.map(r => r.row_data.amount);
      expect(amounts).toEqual([200, 150, 100]);
    });

    it('returns empty data for non-existent table', () => {
      const result = zerodbService._localQuery('nonexistent_table', {});
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // _localUpdate
  // ---------------------------------------------------------------------------
  describe('_localUpdate', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['users'] = [
        { row_id: 'r1', row_data: { name: 'Alice', status: 'active' } },
        { row_id: 'r2', row_data: { name: 'Bob', status: 'inactive' } }
      ];
    });

    it('updates matching rows and returns modified_count', () => {
      const result = zerodbService._localUpdate('users', {
        filter: { status: 'active' },
        update: { $set: { status: 'pending' } }
      });
      expect(result.modified_count).toBe(1);
      expect(zerodbService._localStore['users'][0].row_data.status).toBe('pending');
    });

    it('returns 0 modified_count when no rows match', () => {
      const result = zerodbService._localUpdate('users', {
        filter: { status: 'suspended' },
        update: { $set: { status: 'active' } }
      });
      expect(result.modified_count).toBe(0);
    });

    it('applies update without $set wrapper', () => {
      const result = zerodbService._localUpdate('users', {
        filter: { name: 'Bob' },
        update: { email: 'bob@example.com' }
      });
      expect(result.modified_count).toBe(1);
      expect(zerodbService._localStore['users'][1].row_data.email).toBe('bob@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // _localDelete
  // ---------------------------------------------------------------------------
  describe('_localDelete', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['users'] = [
        { row_id: 'r1', row_data: { name: 'Alice', status: 'active' } },
        { row_id: 'r2', row_data: { name: 'Bob', status: 'inactive' } }
      ];
    });

    it('deletes matching rows and returns deleted_count', () => {
      const result = zerodbService._localDelete('users', { filter: { status: 'inactive' } });
      expect(result.deleted_count).toBe(1);
      expect(zerodbService._localStore['users']).toHaveLength(1);
    });

    it('returns 0 deleted_count when no rows match', () => {
      const result = zerodbService._localDelete('users', { filter: { status: 'suspended' } });
      expect(result.deleted_count).toBe(0);
    });

    it('returns 0 deleted_count for non-existent table', () => {
      const result = zerodbService._localDelete('nonexistent', { filter: {} });
      expect(result.deleted_count).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // insertRows — local fallback mode
  // ---------------------------------------------------------------------------
  describe('insertRows (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
    });

    it('inserts rows into local store and returns data with row_ids', async () => {
      const rows = [
        { name: 'Alice', amount: 100 },
        { name: 'Bob', amount: 200 }
      ];
      const result = await zerodbService.insertRows('orders', rows);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].row_id).toBeDefined();
      expect(zerodbService._localStore['orders']).toHaveLength(2);
    });

    it('initializes table if it does not exist', async () => {
      await zerodbService.insertRows('new_table', [{ value: 1 }]);
      expect(zerodbService._localStore['new_table']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // insertRows — remote mode
  // ---------------------------------------------------------------------------
  describe('insertRows (remote mode)', () => {
    it('posts each row individually to the API', async () => {
      const rows = [{ name: 'Alice' }, { name: 'Bob' }];
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { row_id: 'r1', row_data: rows[0] } })
        .mockResolvedValueOnce({ data: { row_id: 'r2', row_data: rows[1] } });

      const result = await zerodbService.insertRows('orders', rows);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
    });

    it('throws when the API call fails', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Insert failed'));

      await expect(
        zerodbService.insertRows('orders', [{ name: 'Alice' }])
      ).rejects.toThrow('Insert failed');
    });
  });

  // ---------------------------------------------------------------------------
  // insertRow — local fallback mode
  // ---------------------------------------------------------------------------
  describe('insertRow (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
    });

    it('inserts a single row object', async () => {
      const result = await zerodbService.insertRow('items', { sku: 'ABC-123' });
      expect(result.data).toHaveLength(1);
    });

    it('inserts an array of rows', async () => {
      const result = await zerodbService.insertRow('items', [
        { sku: 'AAA' }, { sku: 'BBB' }
      ]);
      expect(result.data).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // insertRow — remote mode
  // ---------------------------------------------------------------------------
  describe('insertRow (remote mode)', () => {
    it('posts single row to API', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { row_id: 'r1', row_data: { name: 'Test' } } });

      const result = await zerodbService.insertRow('users', { name: 'Test' });
      expect(result.data).toHaveLength(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/users/rows`,
        { row_data: { name: 'Test' } }
      );
    });

    it('posts each item in array individually', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { row_id: 'r1' } })
        .mockResolvedValueOnce({ data: { row_id: 'r2' } });

      const result = await zerodbService.insertRow('users', [{ name: 'A' }, { name: 'B' }]);
      expect(result.data).toHaveLength(2);
    });

    it('throws on API error for single row', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Insert error'));
      await expect(zerodbService.insertRow('users', { name: 'Test' })).rejects.toThrow('Insert error');
    });
  });

  // ---------------------------------------------------------------------------
  // queryTable — local fallback
  // ---------------------------------------------------------------------------
  describe('queryTable (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['products'] = [
        { row_id: 'p1', row_data: { category: 'A', price: 10 } },
        { row_id: 'p2', row_data: { category: 'B', price: 20 } }
      ];
    });

    it('returns filtered results from local store', async () => {
      const result = await zerodbService.queryTable('products', { filter: { category: 'A' } });
      expect(result.data).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // queryTable — remote mode
  // ---------------------------------------------------------------------------
  describe('queryTable (remote mode)', () => {
    it('posts query to API with correct body', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [{ row_id: 'r1', row_data: {} }] });

      await zerodbService.queryTable('orders', { filter: { status: 'active' }, limit: 50 });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/orders/query`,
        expect.objectContaining({ filter: { status: 'active' }, limit: 50 })
      );
    });

    it('omits skip from body when skip is 0', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await zerodbService.queryTable('orders', { skip: 0 });

      const body = mockAxiosInstance.post.mock.calls[0][1];
      expect(body.skip).toBeUndefined();
    });

    it('includes skip in body when skip > 0', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await zerodbService.queryTable('orders', { skip: 5, limit: 10 });

      const body = mockAxiosInstance.post.mock.calls[0][1];
      expect(body.skip).toBe(5);
    });

    it('returns empty array when table is not found (404)', async () => {
      const notFoundError = {
        response: { status: 404, data: { detail: 'Table not found' } }
      };
      mockAxiosInstance.post.mockRejectedValue(notFoundError);

      const result = await zerodbService.queryTable('missing_table');
      expect(result).toEqual([]);
    });

    it('throws on other API errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Server error'));
      await expect(zerodbService.queryTable('orders')).rejects.toThrow('Server error');
    });

    it('enforces a minimum limit of 1 (0 becomes the default 100)', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await zerodbService.queryTable('orders', { limit: 0 });

      const body = mockAxiosInstance.post.mock.calls[0][1];
      // parseInt(0) || 100 evaluates to 100; Math.max(1, 100) = 100
      expect(body.limit).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // updateRows — local fallback
  // ---------------------------------------------------------------------------
  describe('updateRows (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['accounts'] = [
        { row_id: 'a1', row_data: { balance: 1000, status: 'active' } },
        { row_id: 'a2', row_data: { balance: 500, status: 'inactive' } }
      ];
    });

    it('updates matching rows and returns modified_count', async () => {
      const result = await zerodbService.updateRows('accounts', {
        filter: { status: 'active' },
        update: { $set: { balance: 2000 } }
      });
      expect(result.modified_count).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // updateRows — remote mode
  // ---------------------------------------------------------------------------
  describe('updateRows (remote mode)', () => {
    it('finds rows then updates each by row_id', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { name: 'Alice', status: 'pending' } }]
      });
      mockAxiosInstance.put.mockResolvedValue({ data: { row_id: 'r1' } });

      const result = await zerodbService.updateRows('users', {
        filter: { status: 'pending' },
        update: { $set: { status: 'active' } }
      });

      expect(result.modified_count).toBe(1);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/users/rows/r1`,
        expect.objectContaining({ row_data: expect.any(Object) })
      );
    });

    it('returns 0 modified_count when no rows match', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      const result = await zerodbService.updateRows('users', {
        filter: { status: 'nonexistent' },
        update: { $set: { status: 'active' } }
      });

      expect(result.modified_count).toBe(0);
      expect(result.matched_count).toBe(0);
    });

    it('throws on API error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Update failed'));
      await expect(
        zerodbService.updateRows('users', { filter: {}, update: {} })
      ).rejects.toThrow('Update failed');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteRows — local fallback
  // ---------------------------------------------------------------------------
  describe('deleteRows (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['tasks'] = [
        { row_id: 't1', row_data: { status: 'done' } },
        { row_id: 't2', row_data: { status: 'pending' } }
      ];
    });

    it('deletes matching rows', async () => {
      const result = await zerodbService.deleteRows('tasks', { filter: { status: 'done' } });
      expect(result.deleted_count).toBe(1);
      expect(zerodbService._localStore['tasks']).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteRows — remote mode
  // ---------------------------------------------------------------------------
  describe('deleteRows (remote mode)', () => {
    it('finds rows then deletes each by row_id', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { status: 'old' } }]
      });
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });

      const result = await zerodbService.deleteRows('records', { filter: { status: 'old' } });

      expect(result.deleted_count).toBe(1);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/records/rows/r1`
      );
    });

    it('returns 0 deleted_count when no rows match', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      const result = await zerodbService.deleteRows('records', { filter: { status: 'nonexistent' } });
      expect(result.deleted_count).toBe(0);
    });

    it('throws on API error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Delete failed'));
      await expect(
        zerodbService.deleteRows('records', { filter: {} })
      ).rejects.toThrow('Delete failed');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteRowById
  // ---------------------------------------------------------------------------
  describe('deleteRowById', () => {
    it('deletes from local store by row_id', async () => {
      enableLocalFallback();
      zerodbService._localStore['items'] = [
        { row_id: 'item-1', row_data: { name: 'Widget' } },
        { row_id: 'item-2', row_data: { name: 'Gadget' } }
      ];

      const result = await zerodbService.deleteRowById('items', 'item-1');
      expect(result.deleted_count).toBe(1);
      expect(zerodbService._localStore['items']).toHaveLength(1);
    });

    it('returns 0 when row_id not found in local store', async () => {
      enableLocalFallback();
      zerodbService._localStore['items'] = [];

      const result = await zerodbService.deleteRowById('items', 'nonexistent');
      expect(result.deleted_count).toBe(0);
    });

    it('calls the API DELETE endpoint in remote mode', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });

      const result = await zerodbService.deleteRowById('users', 'row-abc');
      expect(result.deleted_count).toBe(1);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/users/rows/row-abc`
      );
    });

    it('returns 0 on 404 response in remote mode', async () => {
      mockAxiosInstance.delete.mockRejectedValue({ response: { status: 404 } });

      const result = await zerodbService.deleteRowById('users', 'missing-row');
      expect(result.deleted_count).toBe(0);
    });

    it('throws on non-404 errors in remote mode', async () => {
      mockAxiosInstance.delete.mockRejectedValue(new Error('Server error'));
      await expect(zerodbService.deleteRowById('users', 'r1')).rejects.toThrow('Server error');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteTable
  // ---------------------------------------------------------------------------
  describe('deleteTable', () => {
    it('calls the API DELETE endpoint for the table', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });

      const result = await zerodbService.deleteTable('my_table');
      expect(result).toEqual({ deleted: true });
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/my_table`
      );
    });

    it('throws on API error', async () => {
      mockAxiosInstance.delete.mockRejectedValue(new Error('Delete table failed'));
      await expect(zerodbService.deleteTable('my_table')).rejects.toThrow('Delete table failed');
    });
  });

  // ---------------------------------------------------------------------------
  // countRows
  // ---------------------------------------------------------------------------
  describe('countRows', () => {
    it('returns count from local query in fallback mode', async () => {
      enableLocalFallback();
      zerodbService._localStore['transactions'] = [
        { row_id: 'r1', row_data: { type: 'income' } },
        { row_id: 'r2', row_data: { type: 'expense' } },
        { row_id: 'r3', row_data: { type: 'income' } }
      ];

      const count = await zerodbService.countRows('transactions', { type: 'income' });
      expect(count).toBe(2);
    });

    it('returns count from API in remote mode', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { count: 42 } });

      const count = await zerodbService.countRows('orders', {});
      expect(count).toBe(42);
    });

    it('throws on API error in remote mode', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Count error'));
      await expect(zerodbService.countRows('orders')).rejects.toThrow('Count error');
    });
  });

  // ---------------------------------------------------------------------------
  // queryRows
  // ---------------------------------------------------------------------------
  describe('queryRows', () => {
    it('calls GET endpoint with filter as stringified JSON when query is non-empty', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await zerodbService.queryRows('users', { status: 'active' }, { limit: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/test-project-123/database/tables/users/rows`,
        expect.objectContaining({
          params: expect.objectContaining({ filter: JSON.stringify({ status: 'active' }) })
        })
      );
    });

    it('calls GET without filter param when query is empty', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await zerodbService.queryRows('users');

      const params = mockAxiosInstance.get.mock.calls[0][1].params;
      expect(params.filter).toBeUndefined();
    });

    it('throws on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Query failed'));
      await expect(zerodbService.queryRows('users')).rejects.toThrow('Query failed');
    });
  });

  // ---------------------------------------------------------------------------
  // updateRowsByQuery / deleteRowsByQuery (delegate methods)
  // ---------------------------------------------------------------------------
  describe('updateRowsByQuery', () => {
    it('delegates to updateRows with correct arguments', async () => {
      const spy = jest.spyOn(zerodbService, 'updateRows').mockResolvedValue({ modified_count: 1 });

      await zerodbService.updateRowsByQuery('users', { status: 'active' }, { $set: { status: 'inactive' } });

      expect(spy).toHaveBeenCalledWith('users', {
        filter: { status: 'active' },
        update: { $set: { status: 'inactive' } }
      });
      spy.mockRestore();
    });
  });

  describe('deleteRowsByQuery', () => {
    it('delegates to deleteRows with correct arguments', async () => {
      const spy = jest.spyOn(zerodbService, 'deleteRows').mockResolvedValue({ deleted_count: 2 });

      await zerodbService.deleteRowsByQuery('users', { status: 'inactive' });

      expect(spy).toHaveBeenCalledWith('users', { filter: { status: 'inactive' } });
      spy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // createTable — local fallback mode
  // ---------------------------------------------------------------------------
  describe('createTable (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
    });

    it('initializes local store for the table and returns schema', async () => {
      const schema = { columns: [{ name: 'id', type: 'string' }] };
      const result = await zerodbService.createTable('my_table', schema);

      expect(result.table_name).toBe('my_table');
      expect(result.schema).toEqual(schema);
      expect(zerodbService._localStore['my_table']).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // listTables — local fallback mode
  // ---------------------------------------------------------------------------
  describe('listTables (local fallback)', () => {
    beforeEach(() => {
      enableLocalFallback();
      zerodbService._localStore['table_a'] = [];
      zerodbService._localStore['table_b'] = [{ row_id: 'r1', row_data: {} }];
    });

    it('returns table names from local store', async () => {
      const tables = await zerodbService.listTables();
      const names = tables.map(t => t.table_name);
      expect(names).toContain('table_a');
      expect(names).toContain('table_b');
    });
  });

  // ---------------------------------------------------------------------------
  // initialize — production environment falls through to throw
  // ---------------------------------------------------------------------------
  describe('initialize (production mode fallback)', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      disableLocalFallback();
    });

    it('throws in production environment when API is unreachable', async () => {
      process.env.NODE_ENV = 'production';
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      await expect(zerodbService.initialize('token')).rejects.toThrow();
    });
  });
});
