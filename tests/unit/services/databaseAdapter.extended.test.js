/**
 * Database Adapter - Extended Coverage Tests
 *
 * Covers branches and paths not tested in the base databaseAdapter.test.js:
 * - create: auto-create table on 404/500, row_data unwrapping
 * - findById: fallback to row_id query
 * - findByIdAndUpdate: fallback to row_id when _id returns 0 modified
 * - findByIdAndDelete: fallback to row_id when _id returns 0 deleted
 * - _findInZeroDB: row_data unwrapping, response.data detail not found
 * - _countInZeroDB: response.data detail not found
 * - _recordMetric: cap at 1000 entries
 * - _ensureInitialized: auto-init with AINATIVE_API_TOKEN env var
 * - _checkInitialized (unused but exists)
 * - aggregate: $group with $count operator
 * - _modelToTableName: fallback algorithm for unmapped names
 */

const zerodbService = require('../../../services/zerodbService');

jest.mock('../../../services/zerodbService');

let databaseAdapter;

describe('Database Adapter - Extended Coverage', () => {
  let originalToken;

  beforeEach(() => {
    jest.clearAllMocks();
    originalToken = process.env.AINATIVE_API_TOKEN;
    delete process.env.AINATIVE_API_TOKEN;
    jest.isolateModules(() => {
      databaseAdapter = require('../../../services/databaseAdapter');
    });
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.AINATIVE_API_TOKEN = originalToken;
    }
  });

  // ─── create: auto-create table on 404 ─────────────────────────────────────

  describe('create - auto-create table', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should auto-create table when insert returns 404 error', async () => {
      zerodbService.insertRow
        .mockRejectedValueOnce(new Error('Table not found - 404'))
        .mockResolvedValueOnce({ data: [{ row_id: 'new-123', row_data: { name: 'Test' } }] });
      zerodbService.createTable.mockResolvedValue({});

      const result = await databaseAdapter.create('User', { name: 'Test' });

      expect(zerodbService.createTable).toHaveBeenCalledWith('users', {});
      expect(result).toEqual({ name: 'Test', row_id: 'new-123' });
    });

    it('should auto-create table when insert returns 500 error', async () => {
      zerodbService.insertRow
        .mockRejectedValueOnce(new Error('Internal server error 500'))
        .mockResolvedValueOnce({ _id: 'plain-result' });
      zerodbService.createTable.mockResolvedValue({});

      const result = await databaseAdapter.create('User', { name: 'Test' });

      expect(zerodbService.createTable).toHaveBeenCalled();
    });

    it('should handle createTable failure gracefully during auto-create', async () => {
      zerodbService.insertRow
        .mockRejectedValueOnce(new Error('404 not found'))
        .mockResolvedValueOnce({ _id: 'retry-success' });
      zerodbService.createTable.mockRejectedValue(new Error('Already exists'));

      const result = await databaseAdapter.create('User', { name: 'Test' });

      // Should still succeed - createTable failure is swallowed
      expect(result).toBeDefined();
    });

    it('should re-throw non-404/500 errors', async () => {
      zerodbService.insertRow.mockRejectedValue(new Error('Network timeout'));

      await expect(databaseAdapter.create('User', { name: 'Test' })).rejects.toThrow(
        'Network timeout'
      );
    });
  });

  // ─── create: row_data unwrapping ──────────────────────────────────────────

  describe('create - response unwrapping', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should unwrap row_data from ZeroDB response format', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'r_001', row_data: { userId: 'U1', email: 'test@test.com' } }],
      });

      const result = await databaseAdapter.create('User', {
        userId: 'U1',
        email: 'test@test.com',
      });

      expect(result).toEqual({
        userId: 'U1',
        email: 'test@test.com',
        row_id: 'r_001',
      });
    });

    it('should handle rows property instead of data', async () => {
      zerodbService.insertRow.mockResolvedValue({
        rows: [{ row_id: 'r_002', row_data: { name: 'Company' } }],
      });

      const result = await databaseAdapter.create('Company', { name: 'Company' });

      expect(result).toEqual({ name: 'Company', row_id: 'r_002' });
    });

    it('should handle response items without row_data', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ _id: 'plain_123', name: 'Direct' }],
      });

      const result = await databaseAdapter.create('User', { name: 'Direct' });

      expect(result).toEqual({ _id: 'plain_123', name: 'Direct' });
    });

    it('should return raw result when no data or rows array', async () => {
      const rawResult = { _id: 'raw_123', status: 'created' };
      zerodbService.insertRow.mockResolvedValue(rawResult);

      const result = await databaseAdapter.create('User', { name: 'Raw' });

      expect(result).toEqual(rawResult);
    });

    it('should handle empty data array', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [] });

      const result = await databaseAdapter.create('User', { name: 'Empty' });

      expect(result).toEqual({ data: [] });
    });
  });

  // ─── findById: fallback to row_id ─────────────────────────────────────────

  describe('findById - row_id fallback', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should fallback to row_id when _id query returns empty', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([]) // _id query returns nothing
        .mockResolvedValueOnce([{ row_id: 'r_123', name: 'Found' }]); // row_id fallback

      const result = await databaseAdapter.findById('User', 'r_123');

      expect(zerodbService.queryTable).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ row_id: 'r_123', name: 'Found' });
    });

    it('should return null when both _id and row_id queries fail', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await databaseAdapter.findById('User', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─── findByIdAndUpdate: fallback to row_id ────────────────────────────────

  describe('findByIdAndUpdate - row_id fallback', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should fallback to row_id when _id update returns 0 modified', async () => {
      zerodbService.updateRows
        .mockResolvedValueOnce({ modified_count: 0 })
        .mockResolvedValueOnce({ modified_count: 1 });

      const result = await databaseAdapter.findByIdAndUpdate('User', 'r_123', {
        name: 'Updated',
      });

      expect(zerodbService.updateRows).toHaveBeenCalledTimes(2);
      expect(zerodbService.updateRows).toHaveBeenLastCalledWith('users', {
        filter: { row_id: 'r_123' },
        update: { name: 'Updated' },
      });
    });

    it('should not fallback when _id update succeeds', async () => {
      zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });

      await databaseAdapter.findByIdAndUpdate('User', 'id_123', { name: 'OK' });

      expect(zerodbService.updateRows).toHaveBeenCalledTimes(1);
    });

    it('should fallback when result is null', async () => {
      zerodbService.updateRows
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ modified_count: 1 });

      await databaseAdapter.findByIdAndUpdate('User', 'r_123', { name: 'Test' });

      expect(zerodbService.updateRows).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findByIdAndDelete: fallback to row_id ────────────────────────────────

  describe('findByIdAndDelete - row_id fallback', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should fallback to row_id when _id delete returns 0', async () => {
      zerodbService.deleteRows
        .mockResolvedValueOnce({ deleted_count: 0 })
        .mockResolvedValueOnce({ deleted_count: 1 });

      const result = await databaseAdapter.findByIdAndDelete('User', 'r_123');

      expect(zerodbService.deleteRows).toHaveBeenCalledTimes(2);
      expect(zerodbService.deleteRows).toHaveBeenLastCalledWith('users', {
        filter: { row_id: 'r_123' },
      });
      expect(result.deleted_count).toBe(1);
    });

    it('should fallback when result is null/falsy', async () => {
      zerodbService.deleteRows
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ deleted_count: 1 });

      await databaseAdapter.findByIdAndDelete('User', 'r_123');

      expect(zerodbService.deleteRows).toHaveBeenCalledTimes(2);
    });

    it('should propagate delete errors', async () => {
      zerodbService.deleteRows.mockRejectedValue(new Error('Delete failed'));

      await expect(databaseAdapter.findByIdAndDelete('User', 'r_123')).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  // ─── _findInZeroDB: row_data unwrapping ───────────────────────────────────

  describe('find - row_data unwrapping', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should unwrap row_data items from ZeroDB response', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r_1', row_data: { name: 'Alice' } },
          { row_id: 'r_2', row_data: { name: 'Bob' } },
        ],
      });

      const result = await databaseAdapter.find('User', {});

      expect(result).toEqual([
        { name: 'Alice', row_id: 'r_1' },
        { name: 'Bob', row_id: 'r_2' },
      ]);
    });

    it('should handle response with rows property', async () => {
      zerodbService.queryTable.mockResolvedValue({
        rows: [{ row_id: 'r_3', row_data: { type: 'admin' } }],
      });

      const result = await databaseAdapter.find('User', {});

      expect(result).toEqual([{ type: 'admin', row_id: 'r_3' }]);
    });

    it('should return items directly when no row_data', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { _id: '1', name: 'Direct1' },
        { _id: '2', name: 'Direct2' },
      ]);

      const result = await databaseAdapter.find('User', {});

      expect(result).toEqual([
        { _id: '1', name: 'Direct1' },
        { _id: '2', name: 'Direct2' },
      ]);
    });

    it('should handle response.data.detail not found via response object', async () => {
      const error = new Error('Something');
      error.response = { data: { detail: 'not found' } };
      zerodbService.queryTable.mockRejectedValue(error);

      const result = await databaseAdapter.find('User', {});

      expect(result).toEqual([]);
    });
  });

  // ─── _countInZeroDB: table not found ──────────────────────────────────────

  describe('count - table not found via response', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should return 0 when response.data.detail includes not found', async () => {
      const error = new Error('Something');
      error.response = { data: { detail: 'Table not found' } };
      zerodbService.queryTable.mockRejectedValue(error);

      const result = await databaseAdapter.count('MissingModel', {});

      expect(result).toBe(0);
    });

    it('should throw for non-not-found errors', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Connection refused'));

      await expect(databaseAdapter.count('User', {})).rejects.toThrow('Connection refused');
    });

    it('should return 0 when result has no count or length', async () => {
      zerodbService.queryTable.mockResolvedValue({});

      const result = await databaseAdapter.count('User', {});

      expect(result).toBe(0);
    });
  });

  // ─── _recordMetric: cap at 1000 ──────────────────────────────────────────

  describe('_recordMetric - response time cap', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should cap response time array at 1000 entries', async () => {
      // Fill up to 1001 entries
      for (let i = 0; i < 1001; i++) {
        databaseAdapter._recordMetric(10, true);
      }

      expect(databaseAdapter.metrics.zerodb.responseTime.length).toBe(1000);
    });

    it('should not record responseTime for 0ms', () => {
      databaseAdapter._recordMetric(0, false);

      expect(databaseAdapter.metrics.zerodb.responseTime.length).toBe(0);
      expect(databaseAdapter.metrics.zerodb.errorCount).toBe(1);
    });
  });

  // ─── _ensureInitialized: auto-init ────────────────────────────────────────

  describe('_ensureInitialized - auto-init with env token', () => {
    it('should auto-initialize when AINATIVE_API_TOKEN is set', async () => {
      process.env.AINATIVE_API_TOKEN = 'auto-init-token';
      zerodbService.initialize.mockResolvedValue(true);

      // Calling find should auto-initialize
      zerodbService.queryTable.mockResolvedValue([]);
      const result = await databaseAdapter.find('User', {});

      expect(zerodbService.initialize).toHaveBeenCalledWith('auto-init-token');
      expect(result).toEqual([]);
    });
  });

  // ─── _checkInitialized ────────────────────────────────────────────────────

  describe('_checkInitialized', () => {
    it('should throw when not initialized', () => {
      expect(() => databaseAdapter._checkInitialized()).toThrow(
        'DatabaseAdapter not initialized'
      );
    });

    it('should not throw when initialized', async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');

      expect(() => databaseAdapter._checkInitialized()).not.toThrow();
    });
  });

  // ─── aggregate: $group with $count ────────────────────────────────────────

  describe('aggregate - $count operator', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should handle $count operator in $group', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { _id: '1', status: 'active', amount: 100 },
        { _id: '2', status: 'active', amount: 200 },
        { _id: '3', status: 'inactive', amount: 50 },
      ]);

      const pipeline = [
        { $match: {} },
        {
          $group: {
            _id: '$status',
            count: { $count: true },
          },
        },
      ];

      const result = await databaseAdapter.aggregate('User', pipeline);

      const active = result.find((r) => r._id === 'active');
      expect(active.count).toBe(2);

      const inactive = result.find((r) => r._id === 'inactive');
      expect(inactive.count).toBe(1);
    });
  });

  // ─── _modelToTableName: fallback algorithm ────────────────────────────────

  describe('_modelToTableName - unmapped names', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should convert CamelCase to snake_case for unmapped models', async () => {
      zerodbService.insertRow.mockResolvedValue({ _id: '123' });

      await databaseAdapter.create('MyCustomModel', {});

      expect(zerodbService.insertRow).toHaveBeenCalledWith('my_custom_model', {});
    });

    it('should handle consecutive uppercase letters', async () => {
      zerodbService.insertRow.mockResolvedValue({ _id: '123' });

      await databaseAdapter.create('HTTPClient', {});

      // HTTPClient -> HTTP_Client -> http_client
      expect(zerodbService.insertRow).toHaveBeenCalledWith('http_client', {});
    });

    it('should use mapped name for EquityGrant', async () => {
      zerodbService.insertRow.mockResolvedValue({ _id: '123' });

      await databaseAdapter.create('EquityGrant', {});

      expect(zerodbService.insertRow).toHaveBeenCalledWith('equity_grants', {});
    });

    it('should use mapped name for SubscriptionPlan', async () => {
      zerodbService.insertRow.mockResolvedValue({ _id: '123' });

      await databaseAdapter.create('SubscriptionPlan', {});

      expect(zerodbService.insertRow).toHaveBeenCalledWith('subscription_plans', {});
    });

    it('should use mapped name for EmailTracking', async () => {
      zerodbService.insertRow.mockResolvedValue({ _id: '123' });

      await databaseAdapter.create('EmailTracking', {});

      expect(zerodbService.insertRow).toHaveBeenCalledWith('email_tracking', {});
    });
  });

  // ─── getMetrics: error rate with zero operations ──────────────────────────

  describe('getMetrics - edge cases', () => {
    it('should return 0 error rate when no operations performed', () => {
      const metrics = databaseAdapter.getMetrics();

      expect(metrics.zerodb.errorRate).toBe(0);
      expect(metrics.zerodb.averageResponseTime).toBe(0);
    });
  });
});
