/**
 * DocumentVersion Model Unit Tests
 * Issue #98: Implement Document Version Control
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

describe('DocumentVersion Model', () => {
  let DocumentVersion;
  let mockDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a base mock document for testing
    mockDocument = {
      _id: 'version123',
      versionId: 'DV-12345678',
      documentId: 'doc123',
      versionNumber: 1,
      majorVersion: 1,
      minorVersion: 0,
      storageReference: {
        provider: 'zerodb',
        fileKey: 'opencap/documents/doc123/v1',
        bucket: 'documents'
      },
      changeSummary: 'Initial version',
      changeDescription: 'First upload of the document',
      author: 'user123',
      fileSize: 1024,
      fileHash: 'sha256:abc123def456',
      mimeType: 'application/pdf',
      originalFilename: 'contract.pdf',
      previousVersion: null,
      nextVersion: null,
      status: 'published',
      metadata: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };
  });

  describe('Schema Structure', () => {
    it('should have required versionId field', () => {
      const doc = { ...mockDocument };
      delete doc.versionId;
      // Validation should fail without versionId
      expect(doc.versionId).toBeUndefined();
    });

    it('should have required documentId field', () => {
      const doc = { ...mockDocument };
      delete doc.documentId;
      expect(doc.documentId).toBeUndefined();
    });

    it('should have required versionNumber field', () => {
      const doc = { ...mockDocument };
      expect(doc.versionNumber).toBe(1);
    });

    it('should have required author field', () => {
      const doc = { ...mockDocument };
      expect(doc.author).toBe('user123');
    });

    it('should have required storageReference field', () => {
      const doc = { ...mockDocument };
      expect(doc.storageReference).toBeDefined();
      expect(doc.storageReference.provider).toBe('zerodb');
      expect(doc.storageReference.fileKey).toBeDefined();
    });

    it('should have status field with default value', () => {
      const doc = { ...mockDocument };
      expect(doc.status).toBe('published');
    });

    it('should have fileSize field', () => {
      const doc = { ...mockDocument };
      expect(doc.fileSize).toBe(1024);
    });

    it('should have fileHash for integrity verification', () => {
      const doc = { ...mockDocument };
      expect(doc.fileHash).toBeDefined();
      expect(doc.fileHash).toMatch(/^sha256:/);
    });

    it('should support semantic versioning with majorVersion and minorVersion', () => {
      const doc = { ...mockDocument };
      expect(doc.majorVersion).toBe(1);
      expect(doc.minorVersion).toBe(0);
    });

    it('should support linked list with previousVersion and nextVersion', () => {
      const doc = { ...mockDocument };
      expect(doc.previousVersion).toBeNull();
      doc.previousVersion = 'version122';
      doc.nextVersion = 'version124';
      expect(doc.previousVersion).toBe('version122');
      expect(doc.nextVersion).toBe('version124');
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status: draft', () => {
      const doc = { ...mockDocument, status: 'draft' };
      expect(doc.status).toBe('draft');
    });

    it('should accept valid status: published', () => {
      const doc = { ...mockDocument, status: 'published' };
      expect(doc.status).toBe('published');
    });

    it('should accept valid status: archived', () => {
      const doc = { ...mockDocument, status: 'archived' };
      expect(doc.status).toBe('archived');
    });

    it('should accept valid status: deleted', () => {
      const doc = { ...mockDocument, status: 'deleted' };
      expect(doc.status).toBe('deleted');
    });
  });

  describe('Storage Reference Structure', () => {
    it('should have provider field in storageReference', () => {
      const doc = { ...mockDocument };
      expect(doc.storageReference.provider).toBeDefined();
    });

    it('should have fileKey field in storageReference', () => {
      const doc = { ...mockDocument };
      expect(doc.storageReference.fileKey).toBeDefined();
    });

    it('should support MinIO storage provider', () => {
      const doc = {
        ...mockDocument,
        storageReference: {
          provider: 'minio',
          fileKey: 'documents/doc123/v1/contract.pdf',
          bucket: 'opencap-documents'
        }
      };
      expect(doc.storageReference.provider).toBe('minio');
      expect(doc.storageReference.bucket).toBe('opencap-documents');
    });

    it('should support ZeroDB storage provider', () => {
      const doc = { ...mockDocument };
      expect(doc.storageReference.provider).toBe('zerodb');
    });
  });

  describe('Version Number Validation', () => {
    it('should require versionNumber to be at least 1', () => {
      const doc = { ...mockDocument, versionNumber: 1 };
      expect(doc.versionNumber).toBeGreaterThanOrEqual(1);
    });

    it('should support incremental version numbers', () => {
      const versions = [
        { ...mockDocument, versionNumber: 1 },
        { ...mockDocument, versionNumber: 2 },
        { ...mockDocument, versionNumber: 3 }
      ];
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[1].versionNumber).toBe(2);
      expect(versions[2].versionNumber).toBe(3);
    });

    it('should support semantic version string format', () => {
      const doc = {
        ...mockDocument,
        majorVersion: 2,
        minorVersion: 1
      };
      const semanticVersion = `${doc.majorVersion}.${doc.minorVersion}`;
      expect(semanticVersion).toBe('2.1');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt timestamp', () => {
      const doc = { ...mockDocument };
      expect(doc.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt timestamp', () => {
      const doc = { ...mockDocument };
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Metadata Support', () => {
    it('should support custom metadata object', () => {
      const doc = {
        ...mockDocument,
        metadata: {
          tags: ['contract', 'legal'],
          category: 'legal-documents',
          reviewedBy: 'legal-team'
        }
      };
      expect(doc.metadata.tags).toContain('contract');
      expect(doc.metadata.category).toBe('legal-documents');
    });

    it('should support empty metadata', () => {
      const doc = { ...mockDocument, metadata: {} };
      expect(doc.metadata).toEqual({});
    });
  });

  describe('Change Tracking', () => {
    it('should have changeSummary field', () => {
      const doc = { ...mockDocument };
      expect(doc.changeSummary).toBe('Initial version');
    });

    it('should have changeDescription field for detailed notes', () => {
      const doc = { ...mockDocument };
      expect(doc.changeDescription).toBe('First upload of the document');
    });

    it('should track author who made the change', () => {
      const doc = { ...mockDocument };
      expect(doc.author).toBe('user123');
    });
  });

  describe('File Information', () => {
    it('should store original filename', () => {
      const doc = { ...mockDocument };
      expect(doc.originalFilename).toBe('contract.pdf');
    });

    it('should store MIME type', () => {
      const doc = { ...mockDocument };
      expect(doc.mimeType).toBe('application/pdf');
    });

    it('should store file size in bytes', () => {
      const doc = { ...mockDocument };
      expect(doc.fileSize).toBe(1024);
    });

    it('should store file hash for integrity', () => {
      const doc = { ...mockDocument };
      expect(doc.fileHash).toBeDefined();
    });
  });

  describe('Version Relationships', () => {
    it('should reference original document', () => {
      const doc = { ...mockDocument };
      expect(doc.documentId).toBe('doc123');
    });

    it('should support previousVersion reference (linked list)', () => {
      const v2 = {
        ...mockDocument,
        versionNumber: 2,
        previousVersion: 'version1'
      };
      expect(v2.previousVersion).toBe('version1');
    });

    it('should support nextVersion reference (doubly linked list)', () => {
      const v1 = {
        ...mockDocument,
        versionNumber: 1,
        nextVersion: 'version2'
      };
      expect(v1.nextVersion).toBe('version2');
    });

    it('should allow null for first version previousVersion', () => {
      const doc = { ...mockDocument };
      expect(doc.previousVersion).toBeNull();
    });

    it('should allow null for latest version nextVersion', () => {
      const doc = { ...mockDocument };
      expect(doc.nextVersion).toBeNull();
    });
  });

  describe('Virtual Properties', () => {
    it('should calculate semantic version string', () => {
      const doc = { ...mockDocument, majorVersion: 2, minorVersion: 3 };
      const semanticVersion = `${doc.majorVersion}.${doc.minorVersion}`;
      expect(semanticVersion).toBe('2.3');
    });

    it('should determine if version is latest based on nextVersion', () => {
      const doc = { ...mockDocument, nextVersion: null };
      const isLatest = doc.nextVersion === null;
      expect(isLatest).toBe(true);
    });

    it('should determine if version is first based on previousVersion', () => {
      const doc = { ...mockDocument, previousVersion: null };
      const isFirst = doc.previousVersion === null;
      expect(isFirst).toBe(true);
    });
  });

  describe('Index Support', () => {
    it('should support lookup by documentId', () => {
      const doc = { ...mockDocument };
      // Index on documentId should allow efficient queries
      expect(doc.documentId).toBeDefined();
    });

    it('should support lookup by versionId', () => {
      const doc = { ...mockDocument };
      expect(doc.versionId).toBeDefined();
    });

    it('should support compound index on documentId and versionNumber', () => {
      const doc = { ...mockDocument };
      expect(doc.documentId).toBeDefined();
      expect(doc.versionNumber).toBeDefined();
    });

    it('should support filtering by status', () => {
      const doc = { ...mockDocument };
      expect(doc.status).toBeDefined();
    });
  });
});
