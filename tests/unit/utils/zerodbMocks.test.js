/**
 * ZeroDB Mocks Unit Tests
 *
 * Tests for the ZeroDB mock utilities used in testing.
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
      expect(mocks.isInitialized).toBeDefined();
      expect(mocks.createTable).toBeDefined();
      expect(mocks.listTables).toBeDefined();
      expect(mocks.insertRow).toBeDefined();
      expect(mocks.insertRows).toBeDefined();
      expect(mocks.queryRows).toBeDefined();
      expect(mocks.updateRow).toBeDefined();
      expect(mocks.updateRows).toBeDefined();
      expect(mocks.deleteRow).toBeDefined();
      expect(mocks.deleteRows).toBeDefined();
      expect(mocks.upsertVector).toBeDefined();
      expect(mocks.searchVectors).toBeDefined();
      expect(mocks.deleteVector).toBeDefined();
      expect(mocks.listVectors).toBeDefined();
      expect(mocks.storeMemory).toBeDefined();
      expect(mocks.searchMemory).toBeDefined();
      expect(mocks.getMemoryContext).toBeDefined();
      expect(mocks.createEvent).toBeDefined();
      expect(mocks.listEvents).toBeDefined();
      expect(mocks.uploadFile).toBeDefined();
      expect(mocks.downloadFile).toBeDefined();
      expect(mocks.deleteFile).toBeDefined();
      expect(mocks.listFiles).toBeDefined();
      expect(mocks.getFileUrl).toBeDefined();
      expect(mocks.submitFeedback).toBeDefined();
      expect(mocks.logAgentAction).toBeDefined();
      expect(mocks.getProjectStats).toBeDefined();
      expect(mocks.getVectorStats).toBeDefined();
    });

    it('should initialize successfully', async () => {
      const result = await mocks.initialize('test-project');
      expect(result).toEqual({ success: true });
      expect(mocks.isInitialized()).toBe(true);
    });
  });

  describe('Table Operations', () => {
    it('should create a table', async () => {
      const result = await mocks.createTable('users', { name: 'string' });
      expect(result.success).toBe(true);
      expect(result.tableName).toBe('users');
    });

    it('should list tables', async () => {
      await mocks.createTable('users', {});
      await mocks.createTable('companies', {});
      const result = await mocks.listTables();
      expect(result.success).toBe(true);
      expect(result.tables).toContain('users');
      expect(result.tables).toContain('companies');
    });

    it('should insert a row', async () => {
      const result = await mocks.insertRow('users', { name: 'Test User' });
      expect(result.success).toBe(true);
      expect(result.row.name).toBe('Test User');
      expect(result.row.id).toBeDefined();
      expect(result.row.createdAt).toBeDefined();
    });

    it('should insert multiple rows', async () => {
      const result = await mocks.insertRows('users', [
        { name: 'User 1' },
        { name: 'User 2' }
      ]);
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(2);
    });

    it('should query rows', async () => {
      await mocks.insertRow('users', { name: 'User 1', role: 'admin' });
      await mocks.insertRow('users', { name: 'User 2', role: 'user' });

      const result = await mocks.queryRows('users', { filter: { role: 'admin' } });
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('User 1');
    });

    it('should query with pagination', async () => {
      await mocks.insertRows('users', [
        { name: 'User 1' },
        { name: 'User 2' },
        { name: 'User 3' }
      ]);

      const result = await mocks.queryRows('users', { limit: 2, offset: 1 });
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(2);
    });

    it('should update a row', async () => {
      const insertResult = await mocks.insertRow('users', { name: 'Old Name' });
      const result = await mocks.updateRow('users', insertResult.row.id, { name: 'New Name' });
      expect(result.success).toBe(true);
      expect(result.row.name).toBe('New Name');
      expect(result.row.updatedAt).toBeDefined();
    });

    it('should update multiple rows', async () => {
      await mocks.insertRows('users', [
        { name: 'User 1', status: 'inactive' },
        { name: 'User 2', status: 'inactive' },
        { name: 'User 3', status: 'active' }
      ]);

      const result = await mocks.updateRows('users', { status: 'inactive' }, { status: 'active' });
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });

    it('should delete a row', async () => {
      const insertResult = await mocks.insertRow('users', { name: 'Test' });
      const result = await mocks.deleteRow('users', insertResult.row.id);
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);

      const queryResult = await mocks.queryRows('users');
      expect(queryResult.rows).toHaveLength(0);
    });

    it('should delete multiple rows', async () => {
      await mocks.insertRows('users', [
        { name: 'User 1', status: 'deleted' },
        { name: 'User 2', status: 'deleted' },
        { name: 'User 3', status: 'active' }
      ]);

      const result = await mocks.deleteRows('users', { status: 'deleted' });
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);

      const queryResult = await mocks.queryRows('users');
      expect(queryResult.rows).toHaveLength(1);
    });
  });

  describe('Vector Operations', () => {
    it('should upsert a vector', async () => {
      const result = await mocks.upsertVector('vec-1', [0.1, 0.2, 0.3], { type: 'test' });
      expect(result.success).toBe(true);
      expect(result.vectorId).toBe('vec-1');
    });

    it('should search vectors', async () => {
      await mocks.upsertVector('vec-1', [0.1, 0.2], { type: 'a' });
      await mocks.upsertVector('vec-2', [0.3, 0.4], { type: 'b' });

      const result = await mocks.searchVectors([0.1, 0.2], { topK: 2 });
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].score).toBeDefined();
    });

    it('should delete a vector', async () => {
      await mocks.upsertVector('vec-1', [0.1, 0.2]);
      const result = await mocks.deleteVector('vec-1');
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
    });

    it('should list vectors', async () => {
      await mocks.upsertVector('vec-1', [0.1, 0.2]);
      await mocks.upsertVector('vec-2', [0.3, 0.4]);

      const result = await mocks.listVectors({ limit: 10 });
      expect(result.success).toBe(true);
      expect(result.vectors).toHaveLength(2);
    });
  });

  describe('Memory Operations', () => {
    it('should store memory', async () => {
      const result = await mocks.storeMemory('key-1', 'test content', { sessionId: 'session-1' });
      expect(result.success).toBe(true);
      expect(result.key).toBe('key-1');
    });

    it('should search memory', async () => {
      await mocks.storeMemory('key-1', 'hello world', {});
      await mocks.storeMemory('key-2', 'goodbye world', {});

      const result = await mocks.searchMemory('hello');
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
    });

    it('should get memory context', async () => {
      await mocks.storeMemory('key-1', 'content 1', { sessionId: 'session-1' });
      await mocks.storeMemory('key-2', 'content 2', { sessionId: 'session-1' });
      await mocks.storeMemory('key-3', 'content 3', { sessionId: 'session-2' });

      const result = await mocks.getMemoryContext('session-1');
      expect(result.success).toBe(true);
      expect(result.context).toHaveLength(2);
    });
  });

  describe('Event Operations', () => {
    it('should create an event', async () => {
      const result = await mocks.createEvent('user.created', { userId: '123' }, { source: 'test' });
      expect(result.success).toBe(true);
      expect(result.event.eventType).toBe('user.created');
      expect(result.event.id).toBeDefined();
    });

    it('should list events', async () => {
      await mocks.createEvent('user.created', {});
      await mocks.createEvent('user.updated', {});

      const result = await mocks.listEvents({});
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2);
    });

    it('should filter events by type', async () => {
      await mocks.createEvent('user.created', {});
      await mocks.createEvent('user.updated', {});

      const result = await mocks.listEvents({ eventType: 'user.created' });
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
    });
  });

  describe('File Operations', () => {
    it('should upload a file', async () => {
      const result = await mocks.uploadFile('/test/file.txt', 'file content', { type: 'text' });
      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
      expect(result.path).toBe('/test/file.txt');
    });

    it('should download a file', async () => {
      const uploadResult = await mocks.uploadFile('/test/file.txt', 'file content', { type: 'text' });
      const result = await mocks.downloadFile(uploadResult.fileId);
      expect(result.success).toBe(true);
      expect(result.content).toBe('file content');
      expect(result.metadata.type).toBe('text');
    });

    it('should return error for non-existent file', async () => {
      const result = await mocks.downloadFile('non-existent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('should delete a file', async () => {
      const uploadResult = await mocks.uploadFile('/test/file.txt', 'content');
      const result = await mocks.deleteFile(uploadResult.fileId);
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
    });

    it('should list files', async () => {
      await mocks.uploadFile('/test/file1.txt', 'content1');
      await mocks.uploadFile('/test/file2.txt', 'content2');

      const result = await mocks.listFiles({});
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
    });

    it('should list files with prefix filter', async () => {
      await mocks.uploadFile('/test/file1.txt', 'content1');
      await mocks.uploadFile('/other/file2.txt', 'content2');

      const result = await mocks.listFiles({ prefix: '/test' });
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
    });

    it('should get file URL', async () => {
      const uploadResult = await mocks.uploadFile('/test/file.txt', 'content');
      const result = await mocks.getFileUrl(uploadResult.fileId, 7200);
      expect(result.success).toBe(true);
      expect(result.url).toContain('mock-storage.test');
      expect(result.url).toContain('expires=7200');
    });
  });

  describe('RLHF Operations', () => {
    it('should submit feedback', async () => {
      const result = await mocks.submitFeedback('response-1', { rating: 5, comment: 'Great' });
      expect(result.success).toBe(true);
      expect(result.feedbackId).toBeDefined();
    });
  });

  describe('Agent Logging', () => {
    it('should log agent action', async () => {
      const result = await mocks.logAgentAction('agent-1', 'search', { query: 'test' });
      expect(result.success).toBe(true);
      expect(result.logId).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should get project stats', async () => {
      await mocks.insertRow('users', { name: 'Test' });
      await mocks.upsertVector('vec-1', [0.1]);
      await mocks.uploadFile('/test.txt', 'content');
      await mocks.createEvent('test', {});

      const result = await mocks.getProjectStats();
      expect(result.success).toBe(true);
      expect(result.stats.tables).toBeGreaterThan(0);
      expect(result.stats.totalRows).toBe(1);
      expect(result.stats.vectors).toBe(1);
      expect(result.stats.files).toBe(1);
      expect(result.stats.events).toBe(1);
    });

    it('should get vector stats', async () => {
      await mocks.upsertVector('vec-1', [0.1]);
      await mocks.upsertVector('vec-2', [0.2]);

      const result = await mocks.getVectorStats();
      expect(result.success).toBe(true);
      expect(result.stats.totalVectors).toBe(2);
    });
  });

  describe('matchesFilter', () => {
    it('should match exact values', () => {
      expect(matchesFilter({ name: 'test' }, { name: 'test' })).toBe(true);
      expect(matchesFilter({ name: 'test' }, { name: 'other' })).toBe(false);
    });

    it('should match $eq operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $eq: 25 } })).toBe(true);
      expect(matchesFilter({ age: 25 }, { age: { $eq: 30 } })).toBe(false);
    });

    it('should match $ne operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $ne: 30 } })).toBe(true);
      expect(matchesFilter({ age: 25 }, { age: { $ne: 25 } })).toBe(false);
    });

    it('should match $gt operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $gt: 20 } })).toBe(true);
      expect(matchesFilter({ age: 25 }, { age: { $gt: 30 } })).toBe(false);
    });

    it('should match $gte operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $gte: 25 } })).toBe(true);
      expect(matchesFilter({ age: 25 }, { age: { $gte: 30 } })).toBe(false);
    });

    it('should match $lt operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $lt: 30 } })).toBe(true);
      expect(matchesFilter({ age: 25 }, { age: { $lt: 20 } })).toBe(false);
    });

    it('should match $lte operator', () => {
      expect(matchesFilter({ age: 25 }, { age: { $lte: 25 } })).toBe(true);
      expect(matchesFilter({ age: 25 }, { age: { $lte: 20 } })).toBe(false);
    });

    it('should match $in operator', () => {
      expect(matchesFilter({ role: 'admin' }, { role: { $in: ['admin', 'user'] } })).toBe(true);
      expect(matchesFilter({ role: 'guest' }, { role: { $in: ['admin', 'user'] } })).toBe(false);
    });

    it('should match $nin operator', () => {
      expect(matchesFilter({ role: 'guest' }, { role: { $nin: ['admin', 'user'] } })).toBe(true);
      expect(matchesFilter({ role: 'admin' }, { role: { $nin: ['admin', 'user'] } })).toBe(false);
    });

    it('should match $regex operator', () => {
      expect(matchesFilter({ name: 'Test User' }, { name: { $regex: 'Test' } })).toBe(true);
      expect(matchesFilter({ name: 'Test User' }, { name: { $regex: 'other' } })).toBe(false);
    });

    it('should match $exists operator', () => {
      expect(matchesFilter({ name: 'test' }, { name: { $exists: true } })).toBe(true);
      expect(matchesFilter({}, { name: { $exists: true } })).toBe(false);
      expect(matchesFilter({}, { name: { $exists: false } })).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^mock-id-\d+-\d+$/);
    });

    it('should reset mock storage', () => {
      seedMockData('users', [{ name: 'Test' }]);
      resetZeroDBMocks();
      const storage = getMockStorage();
      expect(storage.tables).toEqual({});
    });

    it('should seed mock data', () => {
      seedMockData('users', [{ name: 'User 1' }, { name: 'User 2' }]);
      const storage = getMockStorage();
      expect(storage.tables.users.rows).toHaveLength(2);
    });

    it('should clear a specific table', () => {
      seedMockData('users', [{ name: 'User 1' }]);
      seedMockData('companies', [{ name: 'Company 1' }]);
      clearMockTable('users');
      const storage = getMockStorage();
      expect(storage.tables.users.rows).toHaveLength(0);
      expect(storage.tables.companies.rows).toHaveLength(1);
    });

    it('should clear all tables', () => {
      seedMockData('users', [{ name: 'User 1' }]);
      seedMockData('companies', [{ name: 'Company 1' }]);
      clearAllMockTables();
      const storage = getMockStorage();
      expect(storage.tables.users.rows).toHaveLength(0);
      expect(storage.tables.companies.rows).toHaveLength(0);
    });

    it('should seed mock vectors', () => {
      seedMockVectors([
        { id: 'vec-1', embedding: [0.1, 0.2], metadata: { type: 'test' } }
      ]);
      const storage = getMockStorage();
      expect(storage.vectors['vec-1']).toBeDefined();
      expect(storage.vectors['vec-1'].metadata.type).toBe('test');
    });

    it('should seed mock memory', () => {
      seedMockMemory([
        { key: 'mem-1', content: 'test content', metadata: { session: 's1' } }
      ]);
      const storage = getMockStorage();
      expect(storage.memory['mem-1']).toBeDefined();
      expect(storage.memory['mem-1'].content).toBe('test content');
    });

    it('should seed mock files', () => {
      seedMockFiles([
        { path: '/test/file.txt', content: 'hello', metadata: { type: 'text' } }
      ]);
      const storage = getMockStorage();
      const fileIds = Object.keys(storage.files);
      expect(fileIds.length).toBe(1);
      expect(storage.files[fileIds[0]].content).toBe('hello');
    });
  });
});
