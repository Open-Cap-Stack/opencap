/**
 * Migration Model Tests
 *
 * Tests for the Migration ZeroDB model including creation, validation,
 * status tracking, error recording, and query methods.
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const Migration = require('../../../models/Migration');
const zerodbService = require('../../../services/zerodbService');

describe('Migration Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    zerodbService.queryTable.mockImplementation((tableName, { filter = {}, limit } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: results.length
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      store = store.filter((_, i) => i + 1 !== rowId);
      return Promise.resolve({ deleted_count: 1 });
    });
  });

  // --- Validation ---

  describe('Validation', () => {
    it('should throw validation error when name is missing', async () => {
      await expect(Migration.create({})).rejects.toThrow(/name is required/);
    });

    it('should throw validation error when name is empty string', async () => {
      await expect(Migration.create({ name: '' })).rejects.toThrow(/name is required/);
    });

    it('should throw validation error when name is whitespace only', async () => {
      await expect(Migration.create({ name: '   ' })).rejects.toThrow(/name is required/);
    });
  });

  // --- Create ---

  describe('create()', () => {
    it('should create a migration with valid data', async () => {
      const result = await Migration.create({ name: 'add-users-table' });

      expect(result).toBeDefined();
      expect(result.name).toBe('add-users-table');
      expect(result._type).toBe('migration');
      expect(result.applied).toBe(false);
      expect(result.appliedAt).toBeNull();
      expect(result.registered).toBeDefined();
    });

    it('should trim whitespace from name', async () => {
      const result = await Migration.create({ name: '  add-index  ' });
      expect(result.name).toBe('add-index');
    });

    it('should default applied to false', async () => {
      const result = await Migration.create({ name: 'migration-1' });
      expect(result.applied).toBe(false);
    });

    it('should set appliedAt when applied is true', async () => {
      const result = await Migration.create({ name: 'migration-2', applied: true });
      expect(result.applied).toBe(true);
      expect(result.appliedAt).toBeDefined();
      expect(result.appliedAt).not.toBeNull();
    });

    it('should preserve custom appliedAt when applied is true', async () => {
      const customDate = '2026-01-01T00:00:00.000Z';
      const result = await Migration.create({
        name: 'migration-3',
        applied: true,
        appliedAt: customDate
      });
      expect(result.appliedAt).toBe(customDate);
    });

    it('should set registered date if not provided', async () => {
      const result = await Migration.create({ name: 'migration-4' });
      expect(result.registered).toBeDefined();
    });

    it('should preserve custom registered date', async () => {
      const customDate = '2026-06-01T12:00:00.000Z';
      const result = await Migration.create({ name: 'migration-5', registered: customDate });
      expect(result.registered).toBe(customDate);
    });

    it('should reject duplicate migration names', async () => {
      await Migration.create({ name: 'unique-migration' });
      await expect(Migration.create({ name: 'unique-migration' })).rejects.toThrow(/Duplicate key error/);
    });

    it('should set error code 11000 on duplicate', async () => {
      await Migration.create({ name: 'dup-test' });
      try {
        await Migration.create({ name: 'dup-test' });
        fail('Should have thrown');
      } catch (err) {
        expect(err.code).toBe(11000);
      }
    });

    it('should store description if provided', async () => {
      const result = await Migration.create({
        name: 'migration-desc',
        description: 'Adds users table'
      });
      expect(result.description).toBe('Adds users table');
    });

    it('should store version if provided', async () => {
      const result = await Migration.create({ name: 'migration-ver', version: 3 });
      expect(result.version).toBe(3);
    });
  });

  // --- findByName ---

  describe('findByName()', () => {
    it('should find migration by name', async () => {
      await Migration.create({ name: 'find-me' });
      const found = await Migration.findByName('find-me');
      expect(found).toBeDefined();
      expect(found.name).toBe('find-me');
    });

    it('should return null for non-existent name', async () => {
      const found = await Migration.findByName('does-not-exist');
      expect(found).toBeNull();
    });
  });

  // --- getPending ---

  describe('getPending()', () => {
    it('should return only unapplied migrations', async () => {
      await Migration.create({ name: 'pending-1' });
      await Migration.create({ name: 'pending-2' });
      await Migration.create({ name: 'applied-1', applied: true });

      const pending = await Migration.getPending();
      expect(pending.length).toBe(2);
      pending.forEach(m => expect(m.applied).toBe(false));
    });

    it('should return empty array when no pending migrations', async () => {
      await Migration.create({ name: 'all-applied', applied: true });
      const pending = await Migration.getPending();
      expect(pending.length).toBe(0);
    });
  });

  // --- getApplied ---

  describe('getApplied()', () => {
    it('should return only applied migrations', async () => {
      await Migration.create({ name: 'applied-a', applied: true });
      await Migration.create({ name: 'pending-a' });

      const applied = await Migration.getApplied();
      expect(applied.length).toBe(1);
      expect(applied[0].applied).toBe(true);
    });

    it('should return empty array when no applied migrations', async () => {
      await Migration.create({ name: 'still-pending' });
      const applied = await Migration.getApplied();
      expect(applied.length).toBe(0);
    });
  });

  // --- markApplied ---

  describe('markApplied()', () => {
    it('should mark a migration as applied', async () => {
      await Migration.create({ name: 'to-apply' });
      const result = await Migration.markApplied('to-apply');

      expect(result).toBeDefined();
      expect(result.applied).toBe(true);
      expect(result.appliedAt).toBeDefined();
    });

    it('should call updateOne with correct filter', async () => {
      await Migration.create({ name: 'apply-check' });
      await Migration.markApplied('apply-check');

      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // --- markRolledBack ---

  describe('markRolledBack()', () => {
    it('should mark a migration as rolled back', async () => {
      await Migration.create({ name: 'to-rollback', applied: true });
      const result = await Migration.markRolledBack('to-rollback');

      expect(result).toBeDefined();
      expect(result.applied).toBe(false);
      expect(result.appliedAt).toBeNull();
    });
  });

  // --- recordError ---

  describe('recordError()', () => {
    it('should record error on a migration', async () => {
      await Migration.create({ name: 'error-migration' });
      const error = new Error('Table already exists');
      error.stack = 'Error: Table already exists\n    at test.js:1';

      const result = await Migration.recordError('error-migration', error);

      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Table already exists');
      expect(result.error.stack).toContain('Table already exists');
      expect(result.error.occurredAt).toBeDefined();
    });
  });

  // --- clearError ---

  describe('clearError()', () => {
    it('should clear error from a migration', async () => {
      await Migration.create({ name: 'clear-error-migration' });
      const error = new Error('Some error');
      await Migration.recordError('clear-error-migration', error);

      const result = await Migration.clearError('clear-error-migration');
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  // --- getWithErrors ---

  describe('getWithErrors()', () => {
    it('should return migrations that have errors', async () => {
      await Migration.create({ name: 'good-migration' });
      await Migration.create({ name: 'bad-migration' });
      await Migration.recordError('bad-migration', new Error('Failed'));

      const withErrors = await Migration.getWithErrors();
      expect(withErrors.length).toBe(1);
      expect(withErrors[0].name).toBe('bad-migration');
    });

    it('should return empty array when no errors', async () => {
      await Migration.create({ name: 'clean-migration' });
      const withErrors = await Migration.getWithErrors();
      expect(withErrors.length).toBe(0);
    });
  });

  // --- deleteByName ---

  describe('deleteByName()', () => {
    it('should delete a migration by name', async () => {
      await Migration.create({ name: 'to-delete' });
      await Migration.deleteByName('to-delete');

      const found = await Migration.findByName('to-delete');
      expect(found).toBeNull();
    });
  });

  // --- find ---

  describe('find()', () => {
    it('should filter by _type migration', async () => {
      await Migration.create({ name: 'find-test-1' });
      await Migration.create({ name: 'find-test-2' });

      const results = await Migration.find({});
      expect(results.length).toBe(2);
      results.forEach(m => expect(m._type).toBe('migration'));
    });

    it('should apply additional query filters', async () => {
      await Migration.create({ name: 'filter-1', applied: true });
      await Migration.create({ name: 'filter-2', applied: false });

      // The mock filters by all keys in the filter object
      const results = await Migration.find({ applied: true });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('filter-1');
    });
  });

  // --- findOne ---

  describe('findOne()', () => {
    it('should find a single migration', async () => {
      await Migration.create({ name: 'single-find' });
      const result = await Migration.findOne({ name: 'single-find' });
      expect(result).toBeDefined();
      expect(result.name).toBe('single-find');
    });

    it('should return null when nothing matches', async () => {
      const result = await Migration.findOne({ name: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  // --- countDocuments ---

  describe('countDocuments()', () => {
    it('should count migrations', async () => {
      zerodbService.queryTable.mockImplementationOnce(() =>
        Promise.resolve({ total: 3 })
      );

      const count = await Migration.countDocuments({});
      expect(count).toBe(3);
    });

    it('should count with filters', async () => {
      zerodbService.queryTable.mockImplementationOnce(() =>
        Promise.resolve({ total: 1 })
      );

      const count = await Migration.countDocuments({ applied: true });
      expect(count).toBe(1);
    });
  });
});
