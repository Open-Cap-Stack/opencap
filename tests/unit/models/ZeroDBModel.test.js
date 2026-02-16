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
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { _id: '1', __v: 0, name: 'Test' } }]
      });
      zerodbService.client.put.mockResolvedValue({});

      await model.updateOne({ _id: '1' }, { $set: { name: 'Updated' } });

      // Verify the PUT call included incremented version
      const putCallData = zerodbService.client.put.mock.calls[0][1];
      expect(putCallData.row_data.__v).toBe(1);
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
});
