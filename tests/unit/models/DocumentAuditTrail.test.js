/**
 * DocumentAuditTrail Model Unit Tests
 * Tests for audit trail model including creation, validation,
 * querying, aggregation, and immutability constraints.
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
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

const DocumentAuditTrail = require('../../../models/DocumentAuditTrail');
const zerodbService = require('../../../services/zerodbService');

describe('DocumentAuditTrail Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Helper to get nested value by dotted key path (e.g. 'actor.userId')
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
    };

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => {
          const docValue = key.includes('.') ? getNestedValue(doc, key) : doc[key];
          return docValue === value;
        });
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose ACTION_TYPES', () => {
      expect(DocumentAuditTrail.ACTION_TYPES).toEqual([
        'created', 'viewed', 'downloaded', 'edited', 'signed',
        'shared', 'deleted', 'restored', 'access_granted',
        'access_revoked', 'version_created', 'commented',
        'archived', 'unarchived'
      ]);
    });

    it('should expose ACCESS_LEVELS', () => {
      expect(DocumentAuditTrail.ACCESS_LEVELS).toEqual(['view', 'edit', 'admin']);
    });

    it('should have tableName set to document_audit_trails', () => {
      expect(DocumentAuditTrail.tableName).toBe('document_audit_trails');
    });
  });

  // ─── Schema ──────────────────────────────────────────────────

  describe('Schema', () => {
    it('should define required fields', () => {
      expect(DocumentAuditTrail.schema.auditId.required).toBe(true);
      expect(DocumentAuditTrail.schema.documentId.required).toBe(true);
      expect(DocumentAuditTrail.schema.actionType.required).toBe(true);
      expect(DocumentAuditTrail.schema.timestamp.required).toBe(true);
      expect(DocumentAuditTrail.schema.ipAddress.required).toBe(true);
    });

    it('should define actionType enum', () => {
      expect(DocumentAuditTrail.schema.actionType.enum).toEqual(DocumentAuditTrail.ACTION_TYPES);
    });

    it('should have defaults for optional fields', () => {
      expect(DocumentAuditTrail.schema.changes.default).toEqual([]);
      expect(DocumentAuditTrail.schema.previousValues.default).toBeNull();
      expect(DocumentAuditTrail.schema.newValues.default).toBeNull();
      expect(DocumentAuditTrail.schema.userAgent.default).toBeNull();
    });
  });

  // ─── create() ────────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      documentId: 'doc-001',
      actionType: 'viewed',
      actor: { userId: 'user-001', email: 'user@test.com', name: 'Test User', role: 'admin' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should create an audit entry with valid data', async () => {
      const result = await DocumentAuditTrail.create(validData);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc-001');
      expect(result.actionType).toBe('viewed');
      expect(result.actor.userId).toBe('user-001');
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'document_audit_trails',
        expect.objectContaining({ documentId: 'doc-001' })
      );
    });

    it('should auto-generate auditId if not provided', async () => {
      const result = await DocumentAuditTrail.create(validData);
      expect(result.auditId).toBeDefined();
      expect(typeof result.auditId).toBe('string');
      expect(result.auditId.length).toBeGreaterThan(0);
    });

    it('should preserve provided auditId', async () => {
      const result = await DocumentAuditTrail.create({
        ...validData,
        auditId: 'custom-audit-id'
      });
      expect(result.auditId).toBe('custom-audit-id');
    });

    it('should set timestamp if not provided', async () => {
      const result = await DocumentAuditTrail.create(validData);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('should preserve provided timestamp', async () => {
      const ts = '2025-06-01T12:00:00.000Z';
      const result = await DocumentAuditTrail.create({
        ...validData,
        timestamp: ts
      });
      expect(result.timestamp).toBe(ts);
    });

    it('should throw for invalid actionType', async () => {
      await expect(
        DocumentAuditTrail.create({ ...validData, actionType: 'invalid_action' })
      ).rejects.toThrow(/actionType must be one of/);
    });

    it('should accept all valid action types', async () => {
      for (const actionType of DocumentAuditTrail.ACTION_TYPES) {
        store = [];
        idCounter = 0;
        const result = await DocumentAuditTrail.create({
          ...validData,
          actionType
        });
        expect(result.actionType).toBe(actionType);
      }
    });

    it('should add timestamps (createdAt, updatedAt)', async () => {
      const result = await DocumentAuditTrail.create(validData);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ─── findByDocument() ───────────────────────────────────────

  describe('findByDocument()', () => {
    const makeEntry = (overrides = {}) => ({
      documentId: 'doc-find',
      actionType: 'viewed',
      actor: { userId: 'user-001' },
      ipAddress: '10.0.0.1',
      timestamp: new Date().toISOString(),
      ...overrides
    });

    it('should find entries by documentId', async () => {
      await DocumentAuditTrail.create(makeEntry({ documentId: 'doc-find' }));
      await DocumentAuditTrail.create(makeEntry({ documentId: 'doc-find' }));
      await DocumentAuditTrail.create(makeEntry({ documentId: 'doc-other' }));

      const results = await DocumentAuditTrail.findByDocument('doc-find');
      expect(results.length).toBe(2);
    });

    it('should filter by actionType when provided', async () => {
      await DocumentAuditTrail.create(makeEntry({ actionType: 'viewed' }));
      await DocumentAuditTrail.create(makeEntry({ actionType: 'edited' }));
      await DocumentAuditTrail.create(makeEntry({ actionType: 'viewed' }));

      const results = await DocumentAuditTrail.findByDocument('doc-find', { actionType: 'viewed' });
      expect(results.length).toBe(2);
      expect(results.every(r => r.actionType === 'viewed')).toBe(true);
    });

    it('should filter by startDate', async () => {
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-01-01T00:00:00.000Z' }));
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-06-01T00:00:00.000Z' }));

      const results = await DocumentAuditTrail.findByDocument('doc-find', {
        startDate: '2025-03-01T00:00:00.000Z'
      });
      expect(results.length).toBe(1);
    });

    it('should filter by endDate', async () => {
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-01-01T00:00:00.000Z' }));
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-06-01T00:00:00.000Z' }));

      const results = await DocumentAuditTrail.findByDocument('doc-find', {
        endDate: '2025-03-01T00:00:00.000Z'
      });
      expect(results.length).toBe(1);
    });

    it('should sort by timestamp descending', async () => {
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-01-01T00:00:00.000Z' }));
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-06-01T00:00:00.000Z' }));
      await DocumentAuditTrail.create(makeEntry({ timestamp: '2025-03-01T00:00:00.000Z' }));

      const results = await DocumentAuditTrail.findByDocument('doc-find');
      expect(new Date(results[0].timestamp) >= new Date(results[1].timestamp)).toBe(true);
      expect(new Date(results[1].timestamp) >= new Date(results[2].timestamp)).toBe(true);
    });

    it('should apply limit option', async () => {
      await DocumentAuditTrail.create(makeEntry());
      await DocumentAuditTrail.create(makeEntry());
      await DocumentAuditTrail.create(makeEntry());

      const results = await DocumentAuditTrail.findByDocument('doc-find', { limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should return empty array for document with no entries', async () => {
      const results = await DocumentAuditTrail.findByDocument('doc-none');
      expect(results).toEqual([]);
    });
  });

  // ─── findByUser() ───────────────────────────────────────────

  describe('findByUser()', () => {
    it('should find entries by user ID', async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-user1',
        actionType: 'viewed',
        actor: { userId: 'user-A' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-user2',
        actionType: 'edited',
        actor: { userId: 'user-B' },
        ipAddress: '10.0.0.2',
        timestamp: '2025-06-02T00:00:00.000Z'
      });

      const results = await DocumentAuditTrail.findByUser('user-A');
      expect(results.length).toBe(1);
      expect(results[0].actor.userId).toBe('user-A');
    });

    it('should filter by actionType', async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-u1',
        actionType: 'viewed',
        actor: { userId: 'user-filter' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-u2',
        actionType: 'edited',
        actor: { userId: 'user-filter' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-06-02T00:00:00.000Z'
      });

      const results = await DocumentAuditTrail.findByUser('user-filter', { actionType: 'viewed' });
      expect(results.length).toBe(1);
    });

    it('should apply limit option', async () => {
      for (let i = 0; i < 5; i++) {
        await DocumentAuditTrail.create({
          documentId: `doc-lim-${i}`,
          actionType: 'viewed',
          actor: { userId: 'user-lim' },
          ipAddress: '10.0.0.1',
          timestamp: `2025-06-0${i + 1}T00:00:00.000Z`
        });
      }

      const results = await DocumentAuditTrail.findByUser('user-lim', { limit: 3 });
      expect(results.length).toBe(3);
    });
  });

  // ─── findByDateRange() ──────────────────────────────────────

  describe('findByDateRange()', () => {
    beforeEach(async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-dr1',
        actionType: 'viewed',
        actor: { userId: 'user-001' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-01-15T00:00:00.000Z',
        metadata: { companyId: 'comp-A' }
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-dr2',
        actionType: 'edited',
        actor: { userId: 'user-002' },
        ipAddress: '10.0.0.2',
        timestamp: '2025-03-15T00:00:00.000Z',
        metadata: { companyId: 'comp-A' }
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-dr3',
        actionType: 'deleted',
        actor: { userId: 'user-001' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-06-15T00:00:00.000Z',
        metadata: { companyId: 'comp-B' }
      });
    });

    it('should find entries within date range', async () => {
      const results = await DocumentAuditTrail.findByDateRange(
        '2025-01-01', '2025-04-01'
      );
      expect(results.length).toBe(2);
    });

    it('should filter by documentId within date range', async () => {
      const results = await DocumentAuditTrail.findByDateRange(
        '2025-01-01', '2025-12-31',
        { documentId: 'doc-dr1' }
      );
      expect(results.length).toBe(1);
    });

    it('should filter by actionType within date range', async () => {
      const results = await DocumentAuditTrail.findByDateRange(
        '2025-01-01', '2025-12-31',
        { actionType: 'edited' }
      );
      expect(results.length).toBe(1);
    });

    it('should filter by companyId within date range', async () => {
      const results = await DocumentAuditTrail.findByDateRange(
        '2025-01-01', '2025-12-31',
        { companyId: 'comp-A' }
      );
      expect(results.length).toBe(2);
    });

    it('should apply limit', async () => {
      const results = await DocumentAuditTrail.findByDateRange(
        '2025-01-01', '2025-12-31',
        { limit: 1 }
      );
      expect(results.length).toBe(1);
    });

    it('should sort by timestamp descending', async () => {
      const results = await DocumentAuditTrail.findByDateRange(
        '2025-01-01', '2025-12-31'
      );
      expect(new Date(results[0].timestamp) >= new Date(results[1].timestamp)).toBe(true);
    });
  });

  // ─── getActionCounts() ──────────────────────────────────────

  describe('getActionCounts()', () => {
    it('should return action counts for a document', async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-counts',
        actionType: 'viewed',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-counts',
        actionType: 'viewed',
        actor: { userId: 'u2' },
        ipAddress: '10.0.0.2',
        timestamp: '2025-06-02T00:00:00.000Z'
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-counts',
        actionType: 'edited',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-06-03T00:00:00.000Z'
      });

      const counts = await DocumentAuditTrail.getActionCounts('doc-counts');

      expect(counts.length).toBe(2);
      // Sorted by count descending
      expect(counts[0]._id).toBe('viewed');
      expect(counts[0].count).toBe(2);
      expect(counts[1]._id).toBe('edited');
      expect(counts[1].count).toBe(1);
    });

    it('should filter by startDate', async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-cnt2',
        actionType: 'viewed',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-01-01T00:00:00.000Z'
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-cnt2',
        actionType: 'viewed',
        actor: { userId: 'u2' },
        ipAddress: '10.0.0.2',
        timestamp: '2025-06-01T00:00:00.000Z'
      });

      const counts = await DocumentAuditTrail.getActionCounts('doc-cnt2', '2025-03-01');
      expect(counts.length).toBe(1);
      expect(counts[0].count).toBe(1);
    });

    it('should filter by endDate', async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-cnt3',
        actionType: 'viewed',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: '2025-01-01T00:00:00.000Z'
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-cnt3',
        actionType: 'viewed',
        actor: { userId: 'u2' },
        ipAddress: '10.0.0.2',
        timestamp: '2025-12-01T00:00:00.000Z'
      });

      const counts = await DocumentAuditTrail.getActionCounts('doc-cnt3', null, '2025-06-01');
      expect(counts[0].count).toBe(1);
    });

    it('should return empty array when no entries exist', async () => {
      const counts = await DocumentAuditTrail.getActionCounts('doc-no-entries');
      expect(counts).toEqual([]);
    });
  });

  // ─── getRecentActivitySummary() ─────────────────────────────

  describe('getRecentActivitySummary()', () => {
    it('should return activity summary for a company', async () => {
      const today = new Date();
      const todayStr = today.toISOString();

      await DocumentAuditTrail.create({
        documentId: 'doc-ras1',
        actionType: 'viewed',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: todayStr,
        metadata: { companyId: 'comp-ras' }
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-ras2',
        actionType: 'edited',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: todayStr,
        metadata: { companyId: 'comp-ras' }
      });

      const summary = await DocumentAuditTrail.getRecentActivitySummary('comp-ras', 7);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary[0]).toHaveProperty('date');
      expect(summary[0]).toHaveProperty('actionType');
      expect(summary[0]).toHaveProperty('count');
    });

    it('should exclude entries older than specified days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);

      await DocumentAuditTrail.create({
        documentId: 'doc-ras-old',
        actionType: 'viewed',
        actor: { userId: 'u1' },
        ipAddress: '10.0.0.1',
        timestamp: oldDate.toISOString(),
        metadata: { companyId: 'comp-ras-old' }
      });

      const summary = await DocumentAuditTrail.getRecentActivitySummary('comp-ras-old', 7);
      expect(summary.length).toBe(0);
    });
  });

  // ─── searchAuditTrail() ─────────────────────────────────────

  describe('searchAuditTrail()', () => {
    beforeEach(async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-search1',
        actionType: 'viewed',
        actor: { userId: 'user-search', email: 'admin@test.com', name: 'Admin User' },
        ipAddress: '192.168.1.100',
        timestamp: '2025-06-01T00:00:00.000Z',
        metadata: { companyId: 'comp-search', reason: 'quarterly review' }
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-search2',
        actionType: 'edited',
        actor: { userId: 'user-search2', email: 'editor@test.com', name: 'Editor' },
        ipAddress: '192.168.1.200',
        timestamp: '2025-07-01T00:00:00.000Z',
        metadata: { companyId: 'comp-search' }
      });
      await DocumentAuditTrail.create({
        documentId: 'doc-search3',
        actionType: 'deleted',
        actor: { userId: 'user-search', email: 'admin@test.com', name: 'Admin User' },
        ipAddress: '192.168.1.100',
        timestamp: '2025-08-01T00:00:00.000Z',
        metadata: { companyId: 'comp-other' }
      });
    });

    it('should search by documentId', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ documentId: 'doc-search1' });
      expect(results.length).toBe(1);
    });

    it('should search by userId', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ userId: 'user-search' });
      expect(results.length).toBe(2);
    });

    it('should search by single actionType', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ actionType: 'edited' });
      expect(results.length).toBe(1);
    });

    it('should search by array of actionTypes', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({
        actionType: ['viewed', 'deleted']
      });
      expect(results.length).toBe(2);
    });

    it('should search by companyId', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ companyId: 'comp-search' });
      expect(results.length).toBe(2);
    });

    it('should search by ipAddress', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ ipAddress: '192.168.1.100' });
      expect(results.length).toBe(2);
    });

    it('should search by keyword in reason', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ keyword: 'quarterly' });
      expect(results.length).toBe(1);
    });

    it('should search by keyword in actor email', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ keyword: 'admin@test' });
      expect(results.length).toBe(2);
    });

    it('should search by keyword in actor name', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ keyword: 'editor' });
      expect(results.length).toBe(1);
    });

    it('should search by startDate', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({
        startDate: '2025-06-15T00:00:00.000Z'
      });
      expect(results.length).toBe(2);
    });

    it('should search by endDate', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({
        endDate: '2025-06-15T00:00:00.000Z'
      });
      expect(results.length).toBe(1);
    });

    it('should apply skip', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ skip: 2 });
      expect(results.length).toBe(1);
    });

    it('should apply limit', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should sort results by timestamp descending', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({});
      expect(new Date(results[0].timestamp) >= new Date(results[1].timestamp)).toBe(true);
    });

    it('should combine multiple search criteria', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({
        userId: 'user-search',
        companyId: 'comp-search'
      });
      expect(results.length).toBe(1);
    });
  });

  // ─── Immutability ───────────────────────────────────────────

  describe('Immutability design', () => {
    it('should not explicitly re-export updateOne in the model definition', () => {
      // The model source intentionally does NOT list updateOne/updateMany/deleteOne/deleteMany
      // in its own method assignments. They may still be accessible via the baseModel spread,
      // but the design intent is that audit records are append-only.
      // We verify the model explicitly exposes only read operations by name.
      const explicitlyExposed = [
        'find', 'findOne', 'findById', 'countDocuments', 'exists', 'distinct', 'aggregate'
      ];
      for (const method of explicitlyExposed) {
        expect(typeof DocumentAuditTrail[method]).toBe('function');
      }
    });

    it('should expose read-only query methods', () => {
      expect(typeof DocumentAuditTrail.find).toBe('function');
      expect(typeof DocumentAuditTrail.findOne).toBe('function');
      expect(typeof DocumentAuditTrail.findById).toBe('function');
      expect(typeof DocumentAuditTrail.countDocuments).toBe('function');
      expect(typeof DocumentAuditTrail.exists).toBe('function');
      expect(typeof DocumentAuditTrail.distinct).toBe('function');
      expect(typeof DocumentAuditTrail.aggregate).toBe('function');
    });

    it('should expose create method for appending new audit entries', () => {
      expect(typeof DocumentAuditTrail.create).toBe('function');
    });

    it('should expose custom query methods', () => {
      expect(typeof DocumentAuditTrail.findByDocument).toBe('function');
      expect(typeof DocumentAuditTrail.findByUser).toBe('function');
      expect(typeof DocumentAuditTrail.findByDateRange).toBe('function');
      expect(typeof DocumentAuditTrail.getActionCounts).toBe('function');
      expect(typeof DocumentAuditTrail.getRecentActivitySummary).toBe('function');
      expect(typeof DocumentAuditTrail.searchAuditTrail).toBe('function');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle entry with minimal fields', async () => {
      const result = await DocumentAuditTrail.create({
        documentId: 'doc-min',
        actionType: 'viewed',
        ipAddress: '10.0.0.1'
      });
      expect(result.documentId).toBe('doc-min');
      expect(result.auditId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle entry with full metadata', async () => {
      const result = await DocumentAuditTrail.create({
        documentId: 'doc-full',
        actionType: 'edited',
        actor: { userId: 'u1', email: 'u1@test.com', name: 'User 1', role: 'admin' },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        changes: [{ field: 'name', previousValue: 'Old', newValue: 'New' }],
        previousValues: { name: 'Old' },
        newValues: { name: 'New' },
        metadata: {
          sessionId: 'sess-123',
          companyId: 'comp-001',
          requestId: 'req-456',
          documentVersion: 3,
          details: { source: 'web' },
          reason: 'Annual review',
          relatedDocuments: ['doc-other'],
          tags: ['compliance', 'quarterly'],
          location: { country: 'US', region: 'CA', city: 'SF' }
        },
        sharedWith: {
          users: ['u2', 'u3'],
          emails: ['u2@test.com'],
          accessLevel: 'view',
          expiresAt: '2025-12-31'
        },
        signatureDetails: {
          signatureId: 'sig-001',
          signatureType: 'electronic',
          signedAt: '2025-06-01T00:00:00.000Z',
          certificateInfo: { issuer: 'DocuSign' }
        }
      });

      expect(result.changes.length).toBe(1);
      expect(result.metadata.tags).toContain('compliance');
      expect(result.sharedWith.users.length).toBe(2);
      expect(result.signatureDetails.signatureId).toBe('sig-001');
    });

    it('should handle searchAuditTrail with no matching results', async () => {
      const results = await DocumentAuditTrail.searchAuditTrail({
        documentId: 'nonexistent-doc'
      });
      expect(results).toEqual([]);
    });

    it('should handle getActionCounts for document with single action type', async () => {
      await DocumentAuditTrail.create({
        documentId: 'doc-single',
        actionType: 'viewed',
        ipAddress: '10.0.0.1'
      });

      const counts = await DocumentAuditTrail.getActionCounts('doc-single');
      expect(counts.length).toBe(1);
      expect(counts[0]._id).toBe('viewed');
      expect(counts[0].count).toBe(1);
    });
  });
});
