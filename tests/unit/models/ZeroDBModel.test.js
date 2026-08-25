/**
 * ZeroDBModel Unit Tests
 * Tests for robustness fixes: deleteMany, updateMany, optimistic locking,
 * shared mutable state, uniqueness checks
 */
process.env.SKIP_DB_SETUP = 'true';

const { ZeroDBModel } = require('../../../models/base/ZeroDBModel');

// Mock the zerodbService
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: {
    put: jest.fn()
  },
  projectId: 'test-project',
  initialize: jest.fn()
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const zerodbService = require('../../../services/zerodbService');

describe('ZeroDBModel', () => {
  let model;

  beforeEach(() => {
    model = new ZeroDBModel('test_table', {});
    model._initialized = true;
    jest.clearAllMocks();
  });

  describe('T0-1: deleteMany', () => {
    it('should delete ALL matching documents, not just the first', async () => {
      const mockDocs = [
        { _id: '1', row_id: 'r1', status: 'old' },
        { _id: '2', row_id: 'r2', status: 'old' },
        { _id: '3', row_id: 'r3', status: 'old' }
      ];

      // Mock find to return all matching docs
      zerodbService.queryTable.mockResolvedValue({ data: mockDocs.map(d => ({ row_id: d.row_id, row_data: d })) });
      zerodbService.deleteRowById.mockResolvedValue({});

      const result = await model.deleteMany({ status: 'old' });

      expect(result.deletedCount).toBe(3);
      expect(zerodbService.deleteRowById).toHaveBeenCalledTimes(3);
    });

    it('should return deletedCount: 0 when no documents match', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.deleteMany({ status: 'nonexistent' });

      expect(result.deletedCount).toBe(0);
      expect(zerodbService.deleteRowById).not.toHaveBeenCalled();
    });
  });

  describe('T0-2: updateMany', () => {
    it('should update ALL matching documents, not just the first', async () => {
      const mockDocs = [
        { _id: '1', row_id: 'r1', status: 'pending' },
        { _id: '2', row_id: 'r2', status: 'pending' }
      ];

      // First call returns matching docs, subsequent calls return individual docs for updateOne
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockDocs.map(d => ({ row_id: d.row_id, row_data: d })) });
        }
        // Individual findOne calls during updateOne
        const idx = (callCount - 2) % mockDocs.length;
        return Promise.resolve({ data: [{ row_id: mockDocs[idx].row_id, row_data: mockDocs[idx] }] });
      });
      zerodbService.client.put.mockResolvedValue({});

      const result = await model.updateMany(
        { status: 'pending' },
        { $set: { status: 'active' } }
      );

      expect(result.matchedCount).toBe(2);
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe('T0-3: Shared mutable state', () => {
    it('should not share query state between concurrent calls', () => {
      // Both calls should return independent query builders
      const builder1 = model.sort({ createdAt: -1 });
      const builder2 = model.sort({ name: 1 });

      expect(builder1._sort).toEqual({ createdAt: -1 });
      expect(builder2._sort).toEqual({ name: 1 });

      // They should be different objects
      expect(builder1).not.toBe(builder2);
    });

    it('should allow chaining without mutating the model', () => {
      const builder = model.sort({ createdAt: -1 }).limit(10).skip(5);

      expect(builder._sort).toEqual({ createdAt: -1 });
      expect(builder._limit).toBe(10);
      expect(builder._skip).toBe(5);

      // Model should NOT have these values
      expect(model._sort).toBeUndefined();
      expect(model._limit).toBeUndefined();
    });
  });

  describe('T0-6: Optimistic locking', () => {
    it('should include __v field in created documents', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'r1',
          row_data: { _id: 'test-id', __v: 0, name: 'Test' }
        }]
      });

      const result = await model.create({ name: 'Test' });
      expect(result.__v).toBe(0);
    });

    it('should reject update when expectedVersion does not match', async () => {
      // Simulate document with version 2
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: '1', __v: 2, name: 'Test' } }]
      });

      await expect(
        model.updateOne({ _id: '1' }, { $set: { name: 'Updated' } }, { expectedVersion: 1 })
      ).rejects.toThrow('Version conflict');
    });

    it('should increment __v on successful update', async () => {
      // First call: findOne for the update
      // Second call: read-after-write verification (returns the updated version)
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Test' } }] });
        }
        // Read-after-write returns updated version
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 1, name: 'Updated' } }] });
      });
      zerodbService.client.put.mockResolvedValue({});

      await model.updateOne({ _id: '1' }, { $set: { name: 'Updated' } });

      // Verify the PUT call included incremented version
      const putCallData = zerodbService.client.put.mock.calls[0][1];
      expect(putCallData.row_data.__v).toBe(1);
    });

    it('should detect concurrent modification via read-after-write', async () => {
      // First call: findOne returns version 0
      // Second call: read-after-write finds version 5 (someone else wrote)
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Test' } }] });
        }
        // Another writer bumped version to 5
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 5, name: 'Other' } }] });
      });
      zerodbService.client.put.mockResolvedValue({});

      await expect(
        model.updateOne({ _id: '1' }, { $set: { name: 'Updated' } })
      ).rejects.toThrow('Version conflict');
    });
  });

  describe('T0-7: Uniqueness checks', () => {
    it('should reject creation of duplicate documents', async () => {
      // Mock findOne to return an existing document
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: '1', email: 'test@test.com' } }]
      });

      await expect(
        model.createWithUniquenessCheck(
          { email: 'test@test.com', name: 'Test' },
          { email: 'test@test.com' }
        )
      ).rejects.toThrow('Duplicate entry');
    });

    it('should allow creation when no duplicate exists', async () => {
      // Mock findOne to return no results
      zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
      // Mock create
      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'r1',
          row_data: { _id: 'new-id', __v: 0, email: 'unique@test.com' }
        }]
      });

      const result = await model.createWithUniquenessCheck(
        { email: 'unique@test.com', name: 'New' },
        { email: 'unique@test.com' }
      );

      expect(result._id).toBe('new-id');
    });
  });

  describe('T0-9: Logging', () => {
    it('should not log full document data in create()', async () => {
      const logger = require('../../../utils/logger');

      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'r1',
          row_data: { _id: 'test-id', __v: 0, sensitiveData: 'secret123' }
        }]
      });

      await model.create({ sensitiveData: 'secret123' });

      // Should use debug level, not console.log
      expect(logger.debug).toHaveBeenCalled();
      // Should NOT contain the sensitive data in the log message
      const logMessage = logger.debug.mock.calls[0][0];
      expect(logMessage).not.toContain('secret123');
    });
  });

  describe('_ensureInitialized', () => {
    it('should call zerodbService.initialize when token exists and projectId is falsy', async () => {
      const uninitModel = new ZeroDBModel('init_table', {});
      uninitModel._initialized = false;
      const origProjectId = zerodbService.projectId;
      zerodbService.projectId = null;
      process.env.AINATIVE_API_TOKEN = 'test-token';
      zerodbService.initialize.mockResolvedValue(undefined);

      // Trigger _ensureInitialized via a public method
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await uninitModel.find({});

      expect(zerodbService.initialize).toHaveBeenCalledWith('test-token');
      expect(uninitModel._initialized).toBe(true);

      // Restore
      zerodbService.projectId = origProjectId;
      delete process.env.AINATIVE_API_TOKEN;
    });

    it('should skip initialize when no token is set', async () => {
      const uninitModel = new ZeroDBModel('init_table', {});
      uninitModel._initialized = false;
      delete process.env.AINATIVE_API_TOKEN;
      const origProjectId = zerodbService.projectId;
      zerodbService.projectId = null;

      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await uninitModel.find({});

      expect(zerodbService.initialize).not.toHaveBeenCalled();
      expect(uninitModel._initialized).toBe(true);

      zerodbService.projectId = origProjectId;
    });
  });

  describe('create - table auto-creation on error', () => {
    it('should auto-create table and retry on 404 error with row_data response', async () => {
      const error404 = new Error('not found');
      error404.response = { status: 404 };
      zerodbService.insertRow
        .mockRejectedValueOnce(error404)
        .mockResolvedValueOnce({
          data: [{ row_id: 'r1', row_data: { _id: 'new-id', __v: 0, name: 'Test' } }]
        });
      zerodbService.createTable.mockResolvedValue({});

      const result = await model.create({ name: 'Test' });

      expect(zerodbService.createTable).toHaveBeenCalledWith('test_table', { fields: {} });
      expect(result._id).toBe('new-id');
      expect(result.row_id).toBe('r1');
    });

    it('should auto-create table and retry on 500 error with fallback return', async () => {
      const error500 = new Error('server error');
      error500.response = { status: 500 };
      zerodbService.insertRow
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({
          data: [{ row_id: 'r2' }]
        });
      zerodbService.createTable.mockResolvedValue({});

      const result = await model.create({ name: 'Fallback' });

      expect(zerodbService.createTable).toHaveBeenCalled();
      expect(result.row_id).toBe('r2');
    });

    it('should auto-create table on error message containing "not found"', async () => {
      const errorNotFound = new Error('Table not found in database');
      zerodbService.insertRow
        .mockRejectedValueOnce(errorNotFound)
        .mockResolvedValueOnce({
          data: [{ row_id: 'r3', row_data: { _id: 'id3', name: 'MsgMatch' } }]
        });
      zerodbService.createTable.mockResolvedValue({});

      const result = await model.create({ name: 'MsgMatch' });

      expect(zerodbService.createTable).toHaveBeenCalled();
      expect(result._id).toBe('id3');
    });

    it('should auto-create table on error message containing "500"', async () => {
      const error500Msg = new Error('Request failed with status 500');
      zerodbService.insertRow
        .mockRejectedValueOnce(error500Msg)
        .mockResolvedValueOnce({
          data: [{ row_id: 'r4' }]
        });
      zerodbService.createTable.mockResolvedValue({});

      const result = await model.create({ name: 'Msg500' });

      expect(zerodbService.createTable).toHaveBeenCalled();
    });

    it('should throw original error when table creation also fails', async () => {
      const originalError = new Error('not found');
      originalError.response = { status: 404 };
      zerodbService.insertRow.mockRejectedValue(originalError);
      zerodbService.createTable.mockRejectedValue(new Error('Permission denied'));

      await expect(model.create({ name: 'Fail' })).rejects.toThrow('not found');
    });

    it('should rethrow error when error is not a 404/500 type', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      zerodbService.insertRow.mockRejectedValue(authError);

      await expect(model.create({ name: 'Auth' })).rejects.toThrow('Unauthorized');
      expect(zerodbService.createTable).not.toHaveBeenCalled();
    });
  });

  describe('create - return path without row_data', () => {
    it('should return merged doc when insertRow returns data without row_data', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'r5' }]
      });

      const result = await model.create({ name: 'NoRowData' });

      expect(result.row_id).toBe('r5');
      expect(result.name).toBe('NoRowData');
      expect(result._id).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return null when query is empty and no results found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.findOne({});

      expect(result).toBeNull();
    });

    it('should use client-side fallback when server-side filter returns empty with non-empty query', async () => {
      // First call (server-side filter) returns nothing
      // Second call (client-side fallback with empty query) returns data
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({
          data: [
            { row_data: { _id: '1', name: 'Alice' }, row_id: 'r1' },
            { row_data: { _id: '2', name: 'Bob' }, row_id: 'r2' }
          ]
        });
      });

      const result = await model.findOne({ name: 'Bob' });

      expect(result).not.toBeNull();
      expect(result.name).toBe('Bob');
    });

    it('should return null from client-side fallback when no match found', async () => {
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({
          data: [
            { row_data: { _id: '1', name: 'Alice' }, row_id: 'r1' }
          ]
        });
      });

      const result = await model.findOne({ name: 'Charlie' });

      expect(result).toBeNull();
    });
  });

  describe('updateOne - no match', () => {
    it('should return modifiedCount 0 when document not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.updateOne(
        { _id: 'nonexistent' },
        { $set: { name: 'Nope' } }
      );

      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBe(0);
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('updateOne - useLocalFallback branch', () => {
    it('should update in-memory store when useLocalFallback is true', async () => {
      zerodbService.useLocalFallback = true;
      zerodbService._localStore = {
        test_table: [
          { row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Old' } }
        ]
      };

      // findOne returns doc with row_id
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Old' } }] });
        }
        // Read-after-write verification
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 1, name: 'New' } }] });
      });

      const result = await model.updateOne(
        { _id: '1' },
        { $set: { name: 'New' } }
      );

      expect(result.modifiedCount).toBe(1);
      expect(zerodbService._localStore.test_table[0].row_data.name).toBe('New');

      // Cleanup
      delete zerodbService.useLocalFallback;
      delete zerodbService._localStore;
    });

    it('should handle useLocalFallback when table does not exist in store', async () => {
      zerodbService.useLocalFallback = true;
      zerodbService._localStore = {};

      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Test' } }] });
        }
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 1, name: 'Updated' } }] });
      });

      const result = await model.updateOne(
        { _id: '1' },
        { $set: { name: 'Updated' } }
      );

      expect(result.modifiedCount).toBe(1);

      delete zerodbService.useLocalFallback;
      delete zerodbService._localStore;
    });
  });

  describe('updateOne - fallback path (no row_id) with version verify', () => {
    it('should use updateRows fallback and verify version on non-row_id path', async () => {
      // Doc without row_id
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_data: { _id: '1', __v: 0, name: 'Test' } }] });
        }
        // Read-after-write verification returns correct version
        return Promise.resolve({ data: [{ row_data: { _id: '1', __v: 1, name: 'Updated' } }] });
      });
      zerodbService.updateRows.mockResolvedValue({ modified_count: 1, matched_count: 1 });

      const result = await model.updateOne(
        { _id: '1' },
        { $set: { name: 'Updated' } }
      );

      expect(zerodbService.updateRows).toHaveBeenCalled();
      expect(result.modifiedCount).toBe(1);
    });

    it('should throw VERSION_CONFLICT on fallback path when version mismatch', async () => {
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_data: { _id: '1', __v: 0, name: 'Test' } }] });
        }
        // Read-after-write verification returns wrong version
        return Promise.resolve({ data: [{ row_data: { _id: '1', __v: 5, name: 'Other' } }] });
      });
      zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });

      await expect(
        model.updateOne({ _id: '1' }, { $set: { name: 'Updated' } })
      ).rejects.toThrow('Version conflict');
    });
  });

  describe('updateMany - edge cases', () => {
    it('should return 0 counts when no documents match', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.updateMany({ status: 'nonexistent' }, { $set: { status: 'x' } });

      expect(result.modifiedCount).toBe(0);
      expect(result.matchedCount).toBe(0);
    });

    it('should handle errors in individual updates gracefully', async () => {
      const mockDocs = [
        { _id: '1', row_id: 'r1', status: 'pending' },
        { _id: '2', row_id: 'r2', status: 'pending' }
      ];

      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockDocs.map(d => ({ row_id: d.row_id, row_data: d })) });
        }
        // All findOne calls during updateOne will fail
        return Promise.reject(new Error('DB error'));
      });

      const result = await model.updateMany(
        { status: 'pending' },
        { $set: { status: 'done' } }
      );

      // Both should fail, so modifiedCount = 0
      expect(result.matchedCount).toBe(2);
      expect(result.modifiedCount).toBe(0);
    });
  });

  describe('findOneAndUpdate', () => {
    it('should create a new document when upsert is true and doc not found', async () => {
      // findOne returns nothing
      zerodbService.queryTable.mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      // create call
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: 'new-id', __v: 0, name: 'Upserted', email: 'a@b.com' } }]
      });

      const result = await model.findOneAndUpdate(
        { email: 'a@b.com' },
        { $set: { name: 'Upserted' } },
        { upsert: true }
      );

      expect(result._id).toBe('new-id');
    });

    it('should return null when doc not found and upsert is false', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.findOneAndUpdate(
        { _id: 'nonexistent' },
        { $set: { name: 'Nope' } }
      );

      expect(result).toBeNull();
    });

    it('should return updated document when returnNew is true', async () => {
      const originalDoc = { _id: '1', __v: 0, name: 'Old', row_id: 'r1' };
      const updatedDoc = { _id: '1', __v: 1, name: 'New', row_id: 'r1' };

      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findOne for findOneAndUpdate (finds original)
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: originalDoc }] });
        }
        if (callCount === 2) {
          // findOne inside updateOne (finds original for the update)
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: originalDoc }] });
        }
        // All subsequent calls: read-after-write verify + returnNew findOne
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: updatedDoc }] });
      });
      zerodbService.client.put.mockResolvedValue({});

      const result = await model.findOneAndUpdate(
        { _id: '1' },
        { $set: { name: 'New' } },
        { new: true }
      );

      expect(result.name).toBe('New');
    });
  });

  describe('deleteMany - edge cases', () => {
    it('should delete docs without row_id using filter-based deletion', async () => {
      const mockDocs = [
        { _id: '1', status: 'old' },
        { _id: '2', status: 'old' }
      ];

      zerodbService.queryTable.mockResolvedValue({
        data: mockDocs.map(d => ({ row_data: d }))
      });
      zerodbService.deleteRows.mockResolvedValue({});

      const result = await model.deleteMany({ status: 'old' });

      expect(result.deletedCount).toBe(2);
      expect(zerodbService.deleteRows).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in individual deletes gracefully', async () => {
      const mockDocs = [
        { _id: '1', row_id: 'r1', status: 'old' },
        { _id: '2', row_id: 'r2', status: 'old' }
      ];

      zerodbService.queryTable.mockResolvedValue({
        data: mockDocs.map(d => ({ row_id: d.row_id, row_data: d }))
      });
      zerodbService.deleteRowById
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Delete failed'));

      const result = await model.deleteMany({ status: 'old' });

      expect(result.deletedCount).toBe(1);
    });
  });

  describe('aggregate', () => {
    it('should apply $match, $sort (ascending), $limit, and $skip stages', async () => {
      const data = [
        { _id: '1', name: 'Charlie', score: 3 },
        { _id: '2', name: 'Alice', score: 1 },
        { _id: '3', name: 'Bob', score: 2 },
        { _id: '4', name: 'Dave', score: 4 }
      ];

      zerodbService.queryTable.mockResolvedValue({
        data: data.map(d => ({ row_data: d }))
      });

      const result = await model.aggregate([
        { $match: { score: { $gte: 1 } } },
        { $sort: { score: 1 } },
        { $skip: 1 },
        { $limit: 2 }
      ]);

      // After sort ascending by score: [Alice(1), Bob(2), Charlie(3), Dave(4)]
      // After skip 1: [Bob(2), Charlie(3), Dave(4)]
      // After limit 2: [Bob(2), Charlie(3)]
      expect(result).toHaveLength(2);
    });

    it('should apply $sort descending', async () => {
      const data = [
        { _id: '1', name: 'Alice', score: 1 },
        { _id: '2', name: 'Bob', score: 2 }
      ];

      zerodbService.queryTable.mockResolvedValue({
        data: data.map(d => ({ row_data: d }))
      });

      const result = await model.aggregate([
        { $sort: { score: -1 } }
      ]);

      expect(result[0].name).toBe('Bob');
      expect(result[1].name).toBe('Alice');
    });
  });

  describe('save', () => {
    it('should update existing document when _id is present', async () => {
      const doc = { _id: '1', name: 'Updated', __v: 0 };

      // findOne for updateOne
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Old' } }] });
        }
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: '1', __v: 1, name: 'Updated' } }] });
      });
      zerodbService.client.put.mockResolvedValue({});

      const result = await model.save(doc);

      expect(result).toEqual(doc);
    });

    it('should create new document when _id is not present', async () => {
      const doc = { name: 'New' };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: 'gen-id', __v: 0, name: 'New' } }]
      });

      const result = await model.save(doc);

      expect(result._id).toBe('gen-id');
    });
  });

  describe('query builder methods', () => {
    it('lean() should return a chainable query builder', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const builder = model.lean();
      expect(builder._query).toEqual({});

      const results = await builder.exec();
      expect(Array.isArray(results)).toBe(true);
    });

    it('select() with string should parse fields including exclusions', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const builder = model.select('name -password email');
      expect(builder._projection).toEqual({ name: 1, password: 0, email: 1 });
    });

    it('select() with object should pass through', async () => {
      const builder = model.select({ name: 1, email: 1 });
      expect(builder._projection).toEqual({ name: 1, email: 1 });
    });

    it('populate() should return a chainable query builder', () => {
      const builder = model.populate('company');
      expect(builder._populate).toBe('company');
    });

    it('query builder lean() returns self', () => {
      const builder = model._createQueryBuilder({ test: 1 });
      const same = builder.lean();
      expect(same).toBe(builder);
    });

    it('query builder populate() sets _populate', () => {
      const builder = model._createQueryBuilder({});
      builder.populate('ref');
      expect(builder._populate).toBe('ref');
    });

    it('query builder select() with string containing exclusions', () => {
      const builder = model._createQueryBuilder({});
      builder.select('name -secret');
      expect(builder._projection).toEqual({ name: 1, secret: 0 });
    });

    it('query builder exec() should call find with options', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const builder = model._createQueryBuilder({ status: 'active' });
      builder.sort({ createdAt: -1 });
      builder.skip(10);
      builder.limit(5);

      const results = await builder.exec();

      expect(zerodbService.queryTable).toHaveBeenCalledWith('test_table', {
        filter: { status: 'active' },
        skip: 10,
        limit: 5,
        sort: { createdAt: -1 },
        projection: {}
      });
    });

    it('query builder then() should allow direct await', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { _id: '1', name: 'Test' } }]
      });

      const results = await model._createQueryBuilder({});

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test');
    });
  });

  describe('model-level skip(), limit(), exec()', () => {
    it('skip() should return a query builder with skip set', () => {
      const builder = model.skip(20);
      expect(builder._skip).toBe(20);
    });

    it('limit() should return a query builder with limit set', () => {
      const builder = model.limit(50);
      expect(builder._limit).toBe(50);
    });

    it('exec() should call find with empty query', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const results = await model.exec();

      expect(zerodbService.queryTable).toHaveBeenCalledWith('test_table', expect.objectContaining({
        filter: {}
      }));
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('find - data unwrapping edge cases', () => {
    it('should return items without row_data as-is', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { _id: '1', name: 'Plain' }
        ]
      });

      const results = await model.find({});

      expect(results[0]).toEqual({ _id: '1', name: 'Plain' });
    });

    it('should return rawData directly when not an array', async () => {
      zerodbService.queryTable.mockResolvedValue('unexpected');

      const results = await model.find({});

      expect(results).toBe('unexpected');
    });

    it('should fall back to result when result.data is undefined', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { row_data: { _id: '1', name: 'Direct' }, row_id: 'r1' }
      ]);

      const results = await model.find({});

      expect(results[0].name).toBe('Direct');
      expect(results[0].row_id).toBe('r1');
    });
  });

  describe('findById', () => {
    it('should return document when found via findOne', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: 'target-id', name: 'Found' } }]
      });

      const result = await model.findById('target-id');

      expect(result.name).toBe('Found');
    });

    it('should fall back to client-side filter when findOne returns null', async () => {
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // findOne server-side and client-side both return empty
          return Promise.resolve({ data: [] });
        }
        // Fallback fetch all
        return Promise.resolve({
          data: [
            { row_data: { _id: 'other', name: 'Other' }, row_id: 'r1' },
            { row_data: { _id: 'target', name: 'Target' }, row_id: 'r2' }
          ]
        });
      });

      const result = await model.findById('target');

      expect(result.name).toBe('Target');
    });
  });

  describe('insertMany', () => {
    it('should create multiple documents with timestamps', async () => {
      zerodbService.insertRows = jest.fn().mockResolvedValue({
        data: [
          { _id: 'id1', name: 'A' },
          { _id: 'id2', name: 'B' }
        ]
      });

      const result = await model.insertMany([{ name: 'A' }, { name: 'B' }]);

      expect(result).toHaveLength(2);
    });

    it('should return docs when result.data is falsy', async () => {
      zerodbService.insertRows = jest.fn().mockResolvedValue({});

      const result = await model.insertMany([{ name: 'A' }]);

      // Should return the prepared docs with timestamps
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('A');
      expect(result[0]._id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should delegate to findOneAndUpdate with _id query', async () => {
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findOne for findOneAndUpdate
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: 'abc', __v: 0, name: 'Old' } }] });
        }
        if (callCount === 2) {
          // findOne inside updateOne
          return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: 'abc', __v: 0, name: 'Old' } }] });
        }
        // Read-after-write verification
        return Promise.resolve({ data: [{ row_id: 'r1', row_data: { _id: 'abc', __v: 1, name: 'New' } }] });
      });
      zerodbService.client.put.mockResolvedValue({});

      const result = await model.findByIdAndUpdate('abc', { $set: { name: 'New' } });

      expect(result._id).toBe('abc');
    });
  });

  describe('deleteOne', () => {
    it('should return deletedCount 0 when document not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.deleteOne({ _id: 'nonexistent' });

      expect(result.deletedCount).toBe(0);
    });

    it('should use deleteRowById when doc has row_id', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: '1', name: 'Delete me' } }]
      });
      zerodbService.deleteRowById.mockResolvedValue({});

      const result = await model.deleteOne({ _id: '1' });

      expect(zerodbService.deleteRowById).toHaveBeenCalledWith('test_table', 'r1');
      expect(result.deletedCount).toBe(1);
    });

    it('should use filter-based deleteRows when doc has no row_id', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { _id: '1', name: 'No row_id' } }]
      });
      zerodbService.deleteRows.mockResolvedValue({ deleted_count: 1 });

      const result = await model.deleteOne({ _id: '1' });

      expect(zerodbService.deleteRows).toHaveBeenCalled();
      expect(result.deletedCount).toBe(1);
    });
  });

  describe('findOneAndDelete', () => {
    it('should find and delete document, returning it', async () => {
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            data: [{ row_id: 'r1', row_data: { _id: '1', name: 'ToDelete' } }]
          });
        }
        return Promise.resolve({ data: [] });
      });
      zerodbService.deleteRowById.mockResolvedValue({});

      const result = await model.findOneAndDelete({ _id: '1' });

      expect(result.name).toBe('ToDelete');
    });

    it('should return null when document not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await model.findOneAndDelete({ _id: 'nope' });

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndDelete', () => {
    it('should delete by row_id when found', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: '1', row_id: 'r1', name: 'ByRowId' } }]
      });
      zerodbService.deleteRows.mockResolvedValue({});

      const result = await model.findByIdAndDelete('r1');

      expect(result.name).toBe('ByRowId');
    });

    it('should fall back to findOneAndDelete by _id', async () => {
      let callCount = 0;
      zerodbService.queryTable.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // First two calls: looking for row_id match - not found
          return Promise.resolve({ data: [] });
        }
        // Then findOneAndDelete finds by _id
        return Promise.resolve({
          data: [{ row_id: 'r1', row_data: { _id: 'my-id', name: 'ById' } }]
        });
      });
      zerodbService.deleteRowById.mockResolvedValue({});

      const result = await model.findByIdAndDelete('my-id');

      expect(result.name).toBe('ById');
    });
  });

  describe('countDocuments', () => {
    it('should return total from result', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 42 });

      const count = await model.countDocuments({ status: 'active' });

      expect(count).toBe(42);
    });

    it('should return count from result when total is missing', async () => {
      zerodbService.queryTable.mockResolvedValue({ count: 7 });

      const count = await model.countDocuments({});

      expect(count).toBe(7);
    });

    it('should return 0 when neither total nor count exists', async () => {
      zerodbService.queryTable.mockResolvedValue({});

      const count = await model.countDocuments({});

      expect(count).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true when count > 0', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 1 });

      const result = await model.exists({ status: 'active' });

      expect(result).toBe(true);
    });

    it('should return false when count is 0', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 0 });

      const result = await model.exists({ status: 'gone' });

      expect(result).toBe(false);
    });
  });

  describe('distinct', () => {
    it('should return unique values for a field', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { status: 'active' } },
          { row_data: { status: 'inactive' } },
          { row_data: { status: 'active' } }
        ]
      });

      const result = await model.distinct('status');

      expect(result).toEqual(['active', 'inactive']);
    });

    it('should filter out undefined values', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { status: 'active' } },
          { row_data: {} }
        ]
      });

      const result = await model.distinct('status');

      expect(result).toEqual(['active']);
    });
  });

  describe('createModel factory', () => {
    it('should create a model with bound methods', () => {
      const { createModel } = require('../../../models/base/ZeroDBModel');
      const instance = createModel('factory_table', { field: 'string' });

      expect(instance.tableName).toBe('factory_table');
      expect(typeof instance.create).toBe('function');
      expect(typeof instance.find).toBe('function');
      expect(typeof instance.findOne).toBe('function');
      expect(typeof instance.updateOne).toBe('function');
      expect(typeof instance.deleteOne).toBe('function');
    });
  });

  describe('_addTimestamps', () => {
    it('should add createdAt for new docs', () => {
      const doc = { name: 'Test' };
      model._addTimestamps(doc, true);
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
    });

    it('should only add updatedAt for existing docs', () => {
      const doc = { name: 'Test' };
      model._addTimestamps(doc, false);
      expect(doc.createdAt).toBeUndefined();
      expect(doc.updatedAt).toBeDefined();
    });
  });
});
