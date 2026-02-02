/**
 * ZeroDB Mocks Unit Tests
 */

const {
  createZeroDBMocks,
  resetZeroDBMocks,
  getMockStorage,
  seedMockData,
  clearMockTable,
  clearAllMockTables,
  seedMockVectors,
  seedMockMemory,
  seedMockFiles,
  generateId,
  matchesFilter
} = require('../../utils/zerodbMocks');

describe('ZeroDB Mocks', () => {
  let mocks;

  beforeEach(() => {
    resetZeroDBMocks();
    mocks = createZeroDBMocks();
  });

  afterEach(() => {
    resetZeroDBMocks();
  });

  describe('createZeroDBMocks', () => {
    it('should create a mock service with all required methods', () => {
      expect(mocks).toBeDefined();
      expect(mocks.initialize).toBeDefined();
      expect(mocks.insertRow).toBeDefined();
      expect(mocks.queryRows).toBeDefined();
      expect(mocks.updateRow).toBeDefined();
      expect(mocks.deleteRow).toBeDefined();
      expect(mocks.upsertVector).toBeDefined();
      expect(mocks.searchVectors).toBeDefined();
    });

    it('should initialize successfully', async () => {
      const result = await mocks.initialize('test-project');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Table Operations', () => {
    it('should insert and query rows', async () => {
      await mocks.insertRow('users', { name: 'Test User' });
      const result = await mocks.queryRows('users');
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test User');
    });

    it('should update a row', async () => {
      const insertResult = await mocks.insertRow('users', { name: 'Old Name' });
      const result = await mocks.updateRow('users', insertResult.row.id, { name: 'New Name' });
      expect(result.success).toBe(true);
      expect(result.row.name).toBe('New Name');
    });

    it('should delete a row', async () => {
      const insertResult = await mocks.insertRow('users', { name: 'Test' });
      const result = await mocks.deleteRow('users', insertResult.row.id);
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
    });
  });

  describe('matchesFilter', () => {
    it('should match exact values', () => {
      expect(matchesFilter({ name: 'test' }, { name: 'test' })).toBe(true);
      expect(matchesFilter({ name: 'test' }, { name: 'other' })).toBe(false);
    });

    it('should match $eq operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $eq: 25 } })).toBe(true);
    });

    it('should match $in operator', () => {
      expect(matchesFilter({ role: 'admin' }, { role: { $in: ['admin', 'user'] } })).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should seed mock data', () => {
      seedMockData('users', [{ name: 'User 1' }, { name: 'User 2' }]);
      const storage = getMockStorage();
      expect(storage.tables.users.rows).toHaveLength(2);
    });

    it('should clear tables', () => {
      seedMockData('users', [{ name: 'User 1' }]);
      clearMockTable('users');
      const storage = getMockStorage();
      expect(storage.tables.users.rows).toHaveLength(0);
    });
  });
});
