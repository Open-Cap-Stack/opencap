/**
 * ClerkyConnection Model Tests
 *
 * Tests for the ClerkyConnection ZeroDB model including creation,
 * default values, query methods, update, and delete operations.
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

const ClerkyConnection = require('../../../models/ClerkyConnection');
const zerodbService = require('../../../services/zerodbService');

describe('ClerkyConnection Model', () => {
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

    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
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

  const validData = {
    companyId: 'company-001',
    userId: 'user-001',
    clerkyOrgId: 'clerky-org-001',
    accessToken: 'encrypted-access-token',
    accessTokenIv: 'iv-abc123',
    accessTokenTag: 'tag-abc123',
    refreshToken: 'encrypted-refresh-token',
    refreshTokenIv: 'iv-def456',
    refreshTokenTag: 'tag-def456'
  };

  // --- Constants ---

  describe('Constants', () => {
    it('should expose connectionStatuses', () => {
      expect(ClerkyConnection.connectionStatuses).toBeDefined();
      expect(ClerkyConnection.connectionStatuses).toEqual(['active', 'disconnected', 'error']);
    });

    it('should expose tableName', () => {
      expect(ClerkyConnection.tableName).toBe('clerky_connections');
    });

    it('should expose schema', () => {
      expect(ClerkyConnection.schema).toBeDefined();
      expect(ClerkyConnection.schema.connectionId).toBeDefined();
      expect(ClerkyConnection.schema.companyId).toBeDefined();
      expect(ClerkyConnection.schema.userId).toBeDefined();
      expect(ClerkyConnection.schema.clerkyOrgId).toBeDefined();
      expect(ClerkyConnection.schema.accessToken).toBeDefined();
      expect(ClerkyConnection.schema.status).toBeDefined();
    });
  });

  // --- Schema ---

  describe('Schema', () => {
    it('should require connectionId', () => {
      expect(ClerkyConnection.schema.connectionId.required).toBe(true);
      expect(ClerkyConnection.schema.connectionId.unique).toBe(true);
    });

    it('should require companyId', () => {
      expect(ClerkyConnection.schema.companyId.required).toBe(true);
    });

    it('should require userId', () => {
      expect(ClerkyConnection.schema.userId.required).toBe(true);
    });

    it('should require clerkyOrgId', () => {
      expect(ClerkyConnection.schema.clerkyOrgId.required).toBe(true);
    });

    it('should require accessToken', () => {
      expect(ClerkyConnection.schema.accessToken.required).toBe(true);
    });

    it('should require accessTokenIv', () => {
      expect(ClerkyConnection.schema.accessTokenIv.required).toBe(true);
    });

    it('should require accessTokenTag', () => {
      expect(ClerkyConnection.schema.accessTokenTag.required).toBe(true);
    });

    it('should have status enum', () => {
      expect(ClerkyConnection.schema.status.enum).toEqual(['active', 'disconnected', 'error']);
    });

    it('should default status to active', () => {
      expect(ClerkyConnection.schema.status.default).toBe('active');
    });

    it('should default refreshToken to null', () => {
      expect(ClerkyConnection.schema.refreshToken.default).toBeNull();
    });

    it('should require connectedAt', () => {
      expect(ClerkyConnection.schema.connectedAt.required).toBe(true);
    });

    it('should default lastSyncedAt to null', () => {
      expect(ClerkyConnection.schema.lastSyncedAt.default).toBeNull();
    });
  });

  // --- Create ---

  describe('create()', () => {
    it('should create a connection with valid data', async () => {
      const result = await ClerkyConnection.create(validData);

      expect(result).toBeDefined();
      expect(result.companyId).toBe('company-001');
      expect(result.userId).toBe('user-001');
      expect(result.clerkyOrgId).toBe('clerky-org-001');
      expect(result.accessToken).toBe('encrypted-access-token');
    });

    it('should auto-generate connectionId if not provided', async () => {
      const result = await ClerkyConnection.create(validData);
      expect(result.connectionId).toBeDefined();
      expect(result.connectionId).toMatch(/^clerky_/);
    });

    it('should preserve provided connectionId', async () => {
      const result = await ClerkyConnection.create({
        ...validData,
        connectionId: 'custom-conn-id'
      });
      expect(result.connectionId).toBe('custom-conn-id');
    });

    it('should default status to active', async () => {
      const result = await ClerkyConnection.create(validData);
      expect(result.status).toBe('active');
    });

    it('should preserve provided status', async () => {
      const result = await ClerkyConnection.create({
        ...validData,
        status: 'disconnected'
      });
      expect(result.status).toBe('disconnected');
    });

    it('should auto-set connectedAt if not provided', async () => {
      const result = await ClerkyConnection.create(validData);
      expect(result.connectedAt).toBeDefined();
    });

    it('should preserve provided connectedAt', async () => {
      const customDate = '2026-01-15T10:00:00.000Z';
      const result = await ClerkyConnection.create({
        ...validData,
        connectedAt: customDate
      });
      expect(result.connectedAt).toBe(customDate);
    });

    it('should store encryption IV and tag for access token', async () => {
      const result = await ClerkyConnection.create(validData);
      expect(result.accessTokenIv).toBe('iv-abc123');
      expect(result.accessTokenTag).toBe('tag-abc123');
    });

    it('should store refresh token fields', async () => {
      const result = await ClerkyConnection.create(validData);
      expect(result.refreshToken).toBe('encrypted-refresh-token');
      expect(result.refreshTokenIv).toBe('iv-def456');
      expect(result.refreshTokenTag).toBe('tag-def456');
    });
  });

  // --- findByCompanyId ---

  describe('findByCompanyId()', () => {
    it('should find active connection by companyId', async () => {
      await ClerkyConnection.create(validData);
      const found = await ClerkyConnection.findByCompanyId('company-001');
      expect(found).toBeDefined();
      expect(found.companyId).toBe('company-001');
      expect(found.status).toBe('active');
    });

    it('should not return disconnected connections', async () => {
      await ClerkyConnection.create({
        ...validData,
        status: 'disconnected'
      });
      const found = await ClerkyConnection.findByCompanyId('company-001');
      expect(found).toBeNull();
    });

    it('should return null for non-existent companyId', async () => {
      const found = await ClerkyConnection.findByCompanyId('non-existent');
      expect(found).toBeNull();
    });
  });

  // --- findById ---

  describe('findById()', () => {
    it('should find connection by connectionId', async () => {
      await ClerkyConnection.create({
        ...validData,
        connectionId: 'conn-find-001'
      });
      const found = await ClerkyConnection.findById('conn-find-001');
      expect(found).toBeDefined();
      expect(found.connectionId).toBe('conn-find-001');
    });

    it('should return null for non-existent connectionId', async () => {
      const found = await ClerkyConnection.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  // --- update ---

  describe('update()', () => {
    it('should update connection fields', async () => {
      await ClerkyConnection.create({
        ...validData,
        connectionId: 'conn-update-001'
      });

      await ClerkyConnection.update('conn-update-001', {
        lastSyncedAt: '2026-08-01T00:00:00.000Z',
        status: 'disconnected'
      });

      const found = await ClerkyConnection.findById('conn-update-001');
      expect(found).toBeDefined();
      expect(found.lastSyncedAt).toBe('2026-08-01T00:00:00.000Z');
      expect(found.status).toBe('disconnected');
    });
  });

  // --- delete ---

  describe('delete()', () => {
    it('should delete connection by connectionId', async () => {
      await ClerkyConnection.create({
        ...validData,
        connectionId: 'conn-delete-001'
      });

      await ClerkyConnection.delete('conn-delete-001');

      const found = await ClerkyConnection.findById('conn-delete-001');
      expect(found).toBeNull();
    });
  });

  // --- Exposed base methods ---

  describe('Base model methods', () => {
    it('should have find method', () => {
      expect(typeof ClerkyConnection.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof ClerkyConnection.findOne).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof ClerkyConnection.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof ClerkyConnection.deleteOne).toBe('function');
    });
  });

  // --- find (base) ---

  describe('find()', () => {
    it('should find all connections', async () => {
      await ClerkyConnection.create({ ...validData, connectionId: 'conn-a' });
      await ClerkyConnection.create({
        ...validData,
        connectionId: 'conn-b',
        companyId: 'company-002'
      });

      const results = await ClerkyConnection.find({});
      expect(results.length).toBe(2);
    });

    it('should filter connections', async () => {
      await ClerkyConnection.create({ ...validData, connectionId: 'conn-c' });
      await ClerkyConnection.create({
        ...validData,
        connectionId: 'conn-d',
        companyId: 'company-002'
      });

      const results = await ClerkyConnection.find({ companyId: 'company-002' });
      expect(results.length).toBe(1);
      expect(results[0].companyId).toBe('company-002');
    });
  });
});
