/**
 * DocumentVersion Model Unit Tests
 * Tests for document version control model including creation,
 * validation, business logic methods, and edge cases.
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

const DocumentVersion = require('../../../models/DocumentVersion');
const zerodbService = require('../../../services/zerodbService');

describe('DocumentVersion Model', () => {
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

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose STORAGE_PROVIDERS', () => {
      expect(DocumentVersion.STORAGE_PROVIDERS).toEqual(['zerodb', 'minio', 's3', 'local']);
    });

    it('should expose VALID_STATUSES', () => {
      expect(DocumentVersion.VALID_STATUSES).toEqual(['draft', 'published', 'archived', 'deleted']);
    });

    it('should have tableName set to document_versions', () => {
      expect(DocumentVersion.tableName).toBe('document_versions');
    });
  });

  // ─── Schema ──────────────────────────────────────────────────

  describe('Schema', () => {
    it('should define required fields', () => {
      expect(DocumentVersion.schema.versionId.required).toBe(true);
      expect(DocumentVersion.schema.documentId.required).toBe(true);
      expect(DocumentVersion.schema.versionNumber.required).toBe(true);
      expect(DocumentVersion.schema.storageReference.required).toBe(true);
      expect(DocumentVersion.schema.changeSummary.required).toBe(true);
      expect(DocumentVersion.schema.author.required).toBe(true);
      expect(DocumentVersion.schema.originalFilename.required).toBe(true);
      expect(DocumentVersion.schema.mimeType.required).toBe(true);
      expect(DocumentVersion.schema.fileSize.required).toBe(true);
      expect(DocumentVersion.schema.fileHash.required).toBe(true);
    });

    it('should define status enum', () => {
      expect(DocumentVersion.schema.status.enum).toEqual(['draft', 'published', 'archived', 'deleted']);
    });

    it('should have defaults for optional fields', () => {
      expect(DocumentVersion.schema.majorVersion.default).toBe(1);
      expect(DocumentVersion.schema.minorVersion.default).toBe(0);
      expect(DocumentVersion.schema.status.default).toBe('draft');
      expect(DocumentVersion.schema.previousVersion.default).toBeNull();
      expect(DocumentVersion.schema.nextVersion.default).toBeNull();
    });
  });

  // ─── create() ────────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      documentId: 'doc-001',
      changeSummary: 'Initial version',
      author: 'user-001',
      originalFilename: 'contract.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      fileHash: 'sha256:abcdef123456',
      storageReference: {
        provider: 'zerodb',
        fileKey: 'docs/contract.pdf',
        bucket: 'documents'
      }
    };

    it('should create a version with valid data', async () => {
      const result = await DocumentVersion.create(validData);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc-001');
      expect(result.author).toBe('user-001');
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'document_versions',
        expect.objectContaining({ documentId: 'doc-001' })
      );
    });

    it('should auto-generate versionId if not provided', async () => {
      const result = await DocumentVersion.create(validData);

      expect(result.versionId).toBeDefined();
      expect(result.versionId).toMatch(/^DV-[A-Z0-9]{8}$/);
    });

    it('should preserve provided versionId', async () => {
      const result = await DocumentVersion.create({
        ...validData,
        versionId: 'DV-CUSTOM01'
      });

      expect(result.versionId).toBe('DV-CUSTOM01');
    });

    it('should default versionNumber to 1 if not provided', async () => {
      const result = await DocumentVersion.create(validData);
      expect(result.versionNumber).toBe(1);
    });

    it('should preserve provided versionNumber', async () => {
      const result = await DocumentVersion.create({
        ...validData,
        versionNumber: 5
      });
      expect(result.versionNumber).toBe(5);
    });

    it('should default status to draft if not provided', async () => {
      const result = await DocumentVersion.create(validData);
      expect(result.status).toBe('draft');
    });

    it('should set publishedAt when status is published', async () => {
      const result = await DocumentVersion.create({
        ...validData,
        status: 'published'
      });

      expect(result.publishedAt).toBeDefined();
      expect(typeof result.publishedAt).toBe('string');
    });

    it('should not overwrite existing publishedAt', async () => {
      const customDate = '2025-01-15T00:00:00.000Z';
      const result = await DocumentVersion.create({
        ...validData,
        status: 'published',
        publishedAt: customDate
      });

      expect(result.publishedAt).toBe(customDate);
    });

    it('should set archivedAt when status is archived', async () => {
      const result = await DocumentVersion.create({
        ...validData,
        status: 'archived'
      });

      expect(result.archivedAt).toBeDefined();
      expect(typeof result.archivedAt).toBe('string');
    });

    it('should not overwrite existing archivedAt', async () => {
      const customDate = '2025-06-01T00:00:00.000Z';
      const result = await DocumentVersion.create({
        ...validData,
        status: 'archived',
        archivedAt: customDate
      });

      expect(result.archivedAt).toBe(customDate);
    });

    it('should add timestamps (createdAt, updatedAt)', async () => {
      const result = await DocumentVersion.create(validData);

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ─── findByVersionId() ──────────────────────────────────────

  describe('findByVersionId()', () => {
    it('should find a version by its versionId', async () => {
      await DocumentVersion.create({
        versionId: 'DV-FIND0001',
        documentId: 'doc-001',
        changeSummary: 'Test',
        author: 'user-001',
        originalFilename: 'test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'sha256:abc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' }
      });

      const found = await DocumentVersion.findByVersionId('DV-FIND0001');
      expect(found).toBeDefined();
      expect(found.versionId).toBe('DV-FIND0001');
    });

    it('should return null for non-existent versionId', async () => {
      const found = await DocumentVersion.findByVersionId('DV-NONEXIST');
      expect(found).toBeNull();
    });
  });

  // ─── findByDocument() ───────────────────────────────────────

  describe('findByDocument()', () => {
    const baseData = {
      changeSummary: 'Update',
      author: 'user-001',
      originalFilename: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      fileHash: 'sha256:abc',
      storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' }
    };

    it('should find all versions for a document', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-A', versionNumber: 1 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-A', versionNumber: 2 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-B', versionNumber: 1 });

      const results = await DocumentVersion.findByDocument('doc-A');
      expect(results.length).toBe(2);
    });

    it('should sort versions by versionNumber descending', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-sort', versionNumber: 1 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-sort', versionNumber: 3 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-sort', versionNumber: 2 });

      const results = await DocumentVersion.findByDocument('doc-sort');
      expect(results[0].versionNumber).toBe(3);
      expect(results[1].versionNumber).toBe(2);
      expect(results[2].versionNumber).toBe(1);
    });

    it('should filter by status when provided', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-status', versionNumber: 1, status: 'draft' });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-status', versionNumber: 2, status: 'published' });

      const results = await DocumentVersion.findByDocument('doc-status', { status: 'published' });
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('published');
    });

    it('should apply skip option', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-skip', versionNumber: 1 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-skip', versionNumber: 2 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-skip', versionNumber: 3 });

      const results = await DocumentVersion.findByDocument('doc-skip', { skip: 1 });
      expect(results.length).toBe(2);
    });

    it('should apply limit option', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-lim', versionNumber: 1 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-lim', versionNumber: 2 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-lim', versionNumber: 3 });

      const results = await DocumentVersion.findByDocument('doc-lim', { limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should return empty array for document with no versions', async () => {
      const results = await DocumentVersion.findByDocument('doc-none');
      expect(results).toEqual([]);
    });
  });

  // ─── findLatestVersion() ────────────────────────────────────

  describe('findLatestVersion()', () => {
    const baseData = {
      changeSummary: 'Update',
      author: 'user-001',
      originalFilename: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      fileHash: 'sha256:abc',
      storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' }
    };

    it('should return the version with highest versionNumber', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-lat', versionNumber: 1 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-lat', versionNumber: 3 });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-lat', versionNumber: 2 });

      const latest = await DocumentVersion.findLatestVersion('doc-lat');
      expect(latest).toBeDefined();
      expect(latest.versionNumber).toBe(3);
    });

    it('should return null when no versions exist', async () => {
      const latest = await DocumentVersion.findLatestVersion('doc-empty');
      expect(latest).toBeNull();
    });

    it('should filter by status when provided', async () => {
      await DocumentVersion.create({ ...baseData, documentId: 'doc-latst', versionNumber: 1, status: 'published' });
      await DocumentVersion.create({ ...baseData, documentId: 'doc-latst', versionNumber: 2, status: 'draft' });

      const latest = await DocumentVersion.findLatestVersion('doc-latst', { status: 'published' });
      expect(latest).toBeDefined();
      expect(latest.versionNumber).toBe(1);
      expect(latest.status).toBe('published');
    });
  });

  // ─── findByVersionNumber() ──────────────────────────────────

  describe('findByVersionNumber()', () => {
    it('should find version by document and version number', async () => {
      await DocumentVersion.create({
        documentId: 'doc-vn',
        versionNumber: 3,
        changeSummary: 'v3',
        author: 'user-001',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'sha256:abc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' }
      });

      const found = await DocumentVersion.findByVersionNumber('doc-vn', 3);
      expect(found).toBeDefined();
      expect(found.changeSummary).toBe('v3');
    });

    it('should return null for non-existent version number', async () => {
      const found = await DocumentVersion.findByVersionNumber('doc-vn', 99);
      expect(found).toBeNull();
    });
  });

  // ─── Synchronous helpers ────────────────────────────────────

  describe('getSemanticVersion()', () => {
    it('should return major.minor version string', () => {
      const version = { majorVersion: 2, minorVersion: 3 };
      expect(DocumentVersion.getSemanticVersion(version)).toBe('2.3');
    });

    it('should handle version 1.0', () => {
      const version = { majorVersion: 1, minorVersion: 0 };
      expect(DocumentVersion.getSemanticVersion(version)).toBe('1.0');
    });
  });

  describe('isFirstVersion()', () => {
    it('should return true when previousVersion is null', () => {
      expect(DocumentVersion.isFirstVersion({ previousVersion: null })).toBe(true);
    });

    it('should return false when previousVersion is set', () => {
      expect(DocumentVersion.isFirstVersion({ previousVersion: 'DV-001' })).toBe(false);
    });
  });

  describe('isLatestVersion()', () => {
    it('should return true when nextVersion is null', () => {
      expect(DocumentVersion.isLatestVersion({ nextVersion: null })).toBe(true);
    });

    it('should return false when nextVersion is set', () => {
      expect(DocumentVersion.isLatestVersion({ nextVersion: 'DV-002' })).toBe(false);
    });
  });

  describe('getDisplayVersion()', () => {
    it('should return formatted display string', () => {
      const version = { versionNumber: 3, majorVersion: 2, minorVersion: 1 };
      expect(DocumentVersion.getDisplayVersion(version)).toBe('v3 (2.1)');
    });

    it('should handle first version', () => {
      const version = { versionNumber: 1, majorVersion: 1, minorVersion: 0 };
      expect(DocumentVersion.getDisplayVersion(version)).toBe('v1 (1.0)');
    });
  });

  // ─── publish() ──────────────────────────────────────────────

  describe('publish()', () => {
    it('should update status to published and set publishedAt', async () => {
      await DocumentVersion.create({
        versionId: 'DV-PUB00001',
        documentId: 'doc-pub',
        versionNumber: 1,
        changeSummary: 'Test',
        author: 'user-001',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'sha256:abc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' },
        status: 'draft'
      });

      const result = await DocumentVersion.publish('DV-PUB00001');

      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBe(1);
    });

    it('should return modifiedCount 0 for non-existent version', async () => {
      const result = await DocumentVersion.publish('DV-NOEXIST1');
      expect(result.modifiedCount).toBe(0);
    });
  });

  // ─── archive() ──────────────────────────────────────────────

  describe('archive()', () => {
    it('should update status to archived and set archivedAt', async () => {
      await DocumentVersion.create({
        versionId: 'DV-ARC00001',
        documentId: 'doc-arc',
        versionNumber: 1,
        changeSummary: 'Test',
        author: 'user-001',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'sha256:abc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' },
        status: 'published'
      });

      const result = await DocumentVersion.archive('DV-ARC00001');

      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBe(1);
    });

    it('should return modifiedCount 0 for non-existent version', async () => {
      const result = await DocumentVersion.archive('DV-NOEXIST2');
      expect(result.modifiedCount).toBe(0);
    });
  });

  // ─── linkVersions() ─────────────────────────────────────────

  describe('linkVersions()', () => {
    it('should link previous and next versions', async () => {
      await DocumentVersion.create({
        versionId: 'DV-LINK0001',
        documentId: 'doc-link',
        versionNumber: 1,
        changeSummary: 'v1',
        author: 'user-001',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'sha256:abc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' }
      });
      await DocumentVersion.create({
        versionId: 'DV-LINK0002',
        documentId: 'doc-link',
        versionNumber: 2,
        changeSummary: 'v2',
        author: 'user-001',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
        fileHash: 'sha256:def',
        storageReference: { provider: 'zerodb', fileKey: 'k2', bucket: 'b' }
      });

      const result = await DocumentVersion.linkVersions('DV-LINK0001', 'DV-LINK0002');

      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
      // Verify updateOne was called twice (once for each direction)
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // ─── Exposed base model methods ─────────────────────────────

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof DocumentVersion.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof DocumentVersion.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof DocumentVersion.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof DocumentVersion.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof DocumentVersion.deleteOne).toBe('function');
    });

    it('should expose deleteMany method', () => {
      expect(typeof DocumentVersion.deleteMany).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof DocumentVersion.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof DocumentVersion.exists).toBe('function');
    });

    it('should expose distinct method', () => {
      expect(typeof DocumentVersion.distinct).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof DocumentVersion.aggregate).toBe('function');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle version with zero file size', async () => {
      const result = await DocumentVersion.create({
        documentId: 'doc-edge',
        changeSummary: 'Empty file',
        author: 'user-001',
        originalFilename: 'empty.txt',
        mimeType: 'text/plain',
        fileSize: 0,
        fileHash: 'sha256:e3b0c44298fc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' }
      });

      expect(result.fileSize).toBe(0);
    });

    it('should handle version with large metadata', async () => {
      const result = await DocumentVersion.create({
        documentId: 'doc-meta',
        changeSummary: 'Metadata test',
        author: 'user-001',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileHash: 'sha256:abc',
        storageReference: { provider: 'zerodb', fileKey: 'k', bucket: 'b' },
        metadata: {
          tags: ['legal', 'contract', 'reviewed'],
          category: 'legal-documents',
          reviewedBy: 'legal-team',
          customField1: 'value1',
          customField2: 'value2'
        }
      });

      expect(result.metadata.tags.length).toBe(3);
      expect(result.metadata.category).toBe('legal-documents');
    });

    it('should handle different storage providers', async () => {
      const providers = ['zerodb', 'minio', 's3', 'local'];
      for (const provider of providers) {
        const result = await DocumentVersion.create({
          documentId: `doc-${provider}`,
          changeSummary: `${provider} test`,
          author: 'user-001',
          originalFilename: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          fileHash: 'sha256:abc',
          storageReference: { provider, fileKey: 'k', bucket: 'b' }
        });
        expect(result.storageReference.provider).toBe(provider);
      }
    });
  });
});
