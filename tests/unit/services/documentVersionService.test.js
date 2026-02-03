/**
 * DocumentVersion Service Unit Tests
 * Issue #98: Implement Document Version Control
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock dependencies before requiring the service
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

jest.mock('../../../services/fileStorageService', () => ({
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  getFileMetadata: jest.fn(),
  deleteFile: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const fileStorageService = require('../../../services/fileStorageService');

describe('DocumentVersionService', () => {
  let documentVersionService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import the service fresh for each test
    jest.isolateModules(() => {
      documentVersionService = require('../../../services/documentVersionService');
    });
  });

  describe('createVersion', () => {
    const mockDocumentId = 'doc123';
    const mockFileBuffer = Buffer.from('test file content');
    const mockVersionData = {
      documentId: mockDocumentId,
      changeSummary: 'Added new section',
      changeDescription: 'Added legal clauses to section 3',
      author: 'user123',
      originalFilename: 'contract.pdf',
      mimeType: 'application/pdf'
    };

    it('should create first version of a document', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.create.mockResolvedValue({
        _id: 'version1',
        versionId: 'DV-12345678',
        documentId: mockDocumentId,
        versionNumber: 1,
        majorVersion: 1,
        minorVersion: 0,
        status: 'draft',
        ...mockVersionData
      });
      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file123',
        fileKey: 'opencap/documents/doc123/v1'
      });

      const result = await documentVersionService.createVersion(
        mockDocumentId,
        mockFileBuffer,
        mockVersionData
      );

      expect(result).toHaveProperty('versionId');
      expect(result.versionNumber).toBe(1);
      expect(result.documentId).toBe(mockDocumentId);
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentVersion',
        expect.objectContaining({
          documentId: mockDocumentId,
          versionNumber: 1
        })
      );
    });

    it('should create subsequent versions with incremented version number', async () => {
      const existingVersions = [
        { _id: 'version1', versionNumber: 1 },
        { _id: 'version2', versionNumber: 2 }
      ];
      databaseAdapter.find.mockResolvedValue(existingVersions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'version2',
        nextVersion: 'version3'
      });
      databaseAdapter.create.mockResolvedValue({
        _id: 'version3',
        versionId: 'DV-87654321',
        documentId: mockDocumentId,
        versionNumber: 3,
        previousVersion: 'version2',
        status: 'draft',
        ...mockVersionData
      });
      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file123',
        fileKey: 'opencap/documents/doc123/v3'
      });

      const result = await documentVersionService.createVersion(
        mockDocumentId,
        mockFileBuffer,
        mockVersionData
      );

      expect(result.versionNumber).toBe(3);
      expect(result.previousVersion).toBe('version2');
    });

    it('should calculate file hash for integrity', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.create.mockResolvedValue({
        _id: 'version1',
        documentId: mockDocumentId,
        versionNumber: 1,
        fileHash: 'sha256:abc123',
        ...mockVersionData
      });
      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file123',
        fileKey: 'opencap/documents/doc123/v1'
      });

      const result = await documentVersionService.createVersion(
        mockDocumentId,
        mockFileBuffer,
        mockVersionData
      );

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentVersion',
        expect.objectContaining({
          fileHash: expect.stringMatching(/^sha256:/)
        })
      );
    });

    it('should store file in storage service', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.create.mockResolvedValue({
        _id: 'version1',
        documentId: mockDocumentId,
        versionNumber: 1,
        ...mockVersionData
      });
      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file123',
        fileKey: 'opencap/documents/doc123/v1'
      });

      await documentVersionService.createVersion(
        mockDocumentId,
        mockFileBuffer,
        mockVersionData
      );

      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            documentId: mockDocumentId
          })
        })
      );
    });

    it('should support major version increment', async () => {
      databaseAdapter.find.mockResolvedValue([
        { _id: 'version1', versionNumber: 1, majorVersion: 1, minorVersion: 5 }
      ]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({
        _id: 'version2',
        documentId: mockDocumentId,
        versionNumber: 2,
        majorVersion: 2,
        minorVersion: 0,
        ...mockVersionData
      });
      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file123',
        fileKey: 'opencap/documents/doc123/v2'
      });

      const result = await documentVersionService.createVersion(
        mockDocumentId,
        mockFileBuffer,
        { ...mockVersionData, majorVersionBump: true }
      );

      expect(result.majorVersion).toBe(2);
      expect(result.minorVersion).toBe(0);
    });

    it('should return error for invalid document', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await expect(
        documentVersionService.createVersion(mockDocumentId, mockFileBuffer, mockVersionData)
      ).rejects.toThrow();
    });
  });

  describe('getVersionHistory', () => {
    const mockDocumentId = 'doc123';

    it('should return all versions for a document', async () => {
      const mockVersions = [
        { _id: 'v1', versionNumber: 1, createdAt: new Date('2024-01-01') },
        { _id: 'v2', versionNumber: 2, createdAt: new Date('2024-01-15') },
        { _id: 'v3', versionNumber: 3, createdAt: new Date('2024-02-01') }
      ];
      databaseAdapter.find.mockResolvedValue(mockVersions);

      const result = await documentVersionService.getVersionHistory(mockDocumentId);

      expect(result.versions).toHaveLength(3);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentVersion',
        { documentId: mockDocumentId },
        expect.any(Object)
      );
    });

    it('should return versions sorted by version number descending', async () => {
      const mockVersions = [
        { _id: 'v3', versionNumber: 3 },
        { _id: 'v2', versionNumber: 2 },
        { _id: 'v1', versionNumber: 1 }
      ];
      databaseAdapter.find.mockResolvedValue(mockVersions);

      const result = await documentVersionService.getVersionHistory(mockDocumentId);

      expect(result.versions[0].versionNumber).toBe(3);
      expect(result.versions[2].versionNumber).toBe(1);
    });

    it('should return empty array for document with no versions', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await documentVersionService.getVersionHistory(mockDocumentId);

      expect(result.versions).toHaveLength(0);
      expect(result.totalVersions).toBe(0);
    });

    it('should include version count in response', async () => {
      const mockVersions = [
        { _id: 'v1', versionNumber: 1 },
        { _id: 'v2', versionNumber: 2 }
      ];
      databaseAdapter.find.mockResolvedValue(mockVersions);

      const result = await documentVersionService.getVersionHistory(mockDocumentId);

      expect(result.totalVersions).toBe(2);
    });

    it('should support pagination', async () => {
      const mockVersions = [
        { _id: 'v5', versionNumber: 5 },
        { _id: 'v4', versionNumber: 4 }
      ];
      databaseAdapter.find.mockResolvedValue(mockVersions);

      const result = await documentVersionService.getVersionHistory(mockDocumentId, {
        skip: 0,
        limit: 2
      });

      expect(result.versions).toHaveLength(2);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentVersion',
        { documentId: mockDocumentId },
        expect.objectContaining({ skip: 0, limit: 2 })
      );
    });

    it('should filter by status', async () => {
      const mockVersions = [
        { _id: 'v1', versionNumber: 1, status: 'published' }
      ];
      databaseAdapter.find.mockResolvedValue(mockVersions);

      const result = await documentVersionService.getVersionHistory(mockDocumentId, {
        status: 'published'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentVersion',
        { documentId: mockDocumentId, status: 'published' },
        expect.any(Object)
      );
    });
  });

  describe('getVersionById', () => {
    it('should return a specific version by ID', async () => {
      const mockVersion = {
        _id: 'version123',
        documentId: 'doc123',
        versionNumber: 2,
        status: 'published'
      };
      databaseAdapter.findById.mockResolvedValue(mockVersion);

      const result = await documentVersionService.getVersionById('version123');

      expect(result).toEqual(mockVersion);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('DocumentVersion', 'version123');
    });

    it('should return null for non-existent version', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      const result = await documentVersionService.getVersionById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    const mockDocumentId = 'doc123';

    it('should return the latest version for a document', async () => {
      const mockVersions = [
        { _id: 'v3', versionNumber: 3, status: 'published' }
      ];
      databaseAdapter.find.mockResolvedValue(mockVersions);

      const result = await documentVersionService.getLatestVersion(mockDocumentId);

      expect(result.versionNumber).toBe(3);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentVersion',
        { documentId: mockDocumentId },
        expect.objectContaining({ sort: { versionNumber: -1 }, limit: 1 })
      );
    });

    it('should return latest published version when specified', async () => {
      const mockVersion = { _id: 'v2', versionNumber: 2, status: 'published' };
      databaseAdapter.find.mockResolvedValue([mockVersion]);

      const result = await documentVersionService.getLatestVersion(mockDocumentId, {
        status: 'published'
      });

      expect(result.status).toBe('published');
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentVersion',
        { documentId: mockDocumentId, status: 'published' },
        expect.any(Object)
      );
    });

    it('should return null for document with no versions', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await documentVersionService.getLatestVersion(mockDocumentId);

      expect(result).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and return differences', async () => {
      const version1 = {
        _id: 'v1',
        versionNumber: 1,
        fileSize: 1024,
        fileHash: 'sha256:abc123',
        changeSummary: 'Initial version'
      };
      const version2 = {
        _id: 'v2',
        versionNumber: 2,
        fileSize: 2048,
        fileHash: 'sha256:def456',
        changeSummary: 'Updated content'
      };
      databaseAdapter.findById
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await documentVersionService.compareVersions('v1', 'v2');

      expect(result).toHaveProperty('version1');
      expect(result).toHaveProperty('version2');
      expect(result).toHaveProperty('differences');
      expect(result.differences).toHaveProperty('fileSize');
      expect(result.differences.fileSize).toEqual({
        from: 1024,
        to: 2048
      });
    });

    it('should detect file hash changes', async () => {
      const version1 = { _id: 'v1', fileHash: 'sha256:abc123' };
      const version2 = { _id: 'v2', fileHash: 'sha256:def456' };
      databaseAdapter.findById
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await documentVersionService.compareVersions('v1', 'v2');

      expect(result.differences.fileHash).toEqual({
        from: 'sha256:abc123',
        to: 'sha256:def456'
      });
      expect(result.contentChanged).toBe(true);
    });

    it('should return no differences for identical versions', async () => {
      const version = {
        _id: 'v1',
        fileSize: 1024,
        fileHash: 'sha256:abc123'
      };
      databaseAdapter.findById
        .mockResolvedValueOnce(version)
        .mockResolvedValueOnce(version);

      const result = await documentVersionService.compareVersions('v1', 'v1');

      expect(result.contentChanged).toBe(false);
      expect(Object.keys(result.differences)).toHaveLength(0);
    });

    it('should throw error for non-existent version', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        documentVersionService.compareVersions('v1', 'nonexistent')
      ).rejects.toThrow();
    });

    it('should include metadata changes in comparison', async () => {
      const version1 = { _id: 'v1', metadata: { tags: ['legal'] } };
      const version2 = { _id: 'v2', metadata: { tags: ['legal', 'contract'] } };
      databaseAdapter.findById
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await documentVersionService.compareVersions('v1', 'v2');

      expect(result.differences).toHaveProperty('metadata');
    });
  });

  describe('restoreVersion', () => {
    const mockDocumentId = 'doc123';

    it('should create new version from old version content', async () => {
      const oldVersion = {
        _id: 'v1',
        documentId: mockDocumentId,
        versionNumber: 1,
        fileHash: 'sha256:abc123',
        storageReference: {
          provider: 'zerodb',
          fileKey: 'opencap/documents/doc123/v1'
        },
        author: 'user123'
      };
      const latestVersions = [{ _id: 'v3', versionNumber: 3 }];

      databaseAdapter.findById.mockResolvedValue(oldVersion);
      databaseAdapter.find.mockResolvedValue(latestVersions);
      fileStorageService.downloadFile.mockResolvedValue({
        data: Buffer.from('original content')
      });
      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file456',
        fileKey: 'opencap/documents/doc123/v4'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({
        _id: 'v4',
        documentId: mockDocumentId,
        versionNumber: 4,
        changeSummary: 'Restored from version 1',
        previousVersion: 'v3'
      });

      const result = await documentVersionService.restoreVersion('v1', {
        author: 'user456',
        changeSummary: 'Restored from version 1'
      });

      expect(result.versionNumber).toBe(4);
      expect(result.changeSummary).toContain('Restored');
      expect(databaseAdapter.create).toHaveBeenCalled();
    });

    it('should link new version to previous latest', async () => {
      const oldVersion = {
        _id: 'v1',
        documentId: mockDocumentId,
        versionNumber: 1,
        storageReference: { fileKey: 'key1' }
      };
      databaseAdapter.findById.mockResolvedValue(oldVersion);
      databaseAdapter.find.mockResolvedValue([{ _id: 'v3', versionNumber: 3 }]);
      fileStorageService.downloadFile.mockResolvedValue({ data: Buffer.from('content') });
      fileStorageService.uploadFile.mockResolvedValue({ id: 'file1', fileKey: 'key1' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({
        _id: 'v4',
        previousVersion: 'v3'
      });

      const result = await documentVersionService.restoreVersion('v1', { author: 'user1' });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentVersion',
        'v3',
        expect.objectContaining({ nextVersion: expect.any(String) }),
        expect.any(Object)
      );
    });

    it('should throw error for non-existent version', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        documentVersionService.restoreVersion('nonexistent', { author: 'user1' })
      ).rejects.toThrow();
    });
  });

  describe('archiveVersion', () => {
    it('should mark version as archived', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'v1',
        status: 'archived'
      });

      const result = await documentVersionService.archiveVersion('v1');

      expect(result.status).toBe('archived');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentVersion',
        'v1',
        { status: 'archived' },
        { new: true }
      );
    });

    it('should throw error for non-existent version', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        documentVersionService.archiveVersion('nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('archiveOldVersions', () => {
    const mockDocumentId = 'doc123';

    it('should archive versions older than specified count', async () => {
      const allVersions = [
        { _id: 'v5', versionNumber: 5 },
        { _id: 'v4', versionNumber: 4 },
        { _id: 'v3', versionNumber: 3 },
        { _id: 'v2', versionNumber: 2 },
        { _id: 'v1', versionNumber: 1 }
      ];
      databaseAdapter.find.mockResolvedValue(allVersions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'archived' });

      const result = await documentVersionService.archiveOldVersions(mockDocumentId, {
        keepLatest: 3
      });

      expect(result.archivedCount).toBe(2);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('should not archive if fewer versions than keepLatest', async () => {
      const allVersions = [
        { _id: 'v2', versionNumber: 2 },
        { _id: 'v1', versionNumber: 1 }
      ];
      databaseAdapter.find.mockResolvedValue(allVersions);

      const result = await documentVersionService.archiveOldVersions(mockDocumentId, {
        keepLatest: 5
      });

      expect(result.archivedCount).toBe(0);
      expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should skip already archived versions', async () => {
      const allVersions = [
        { _id: 'v3', versionNumber: 3, status: 'published' },
        { _id: 'v2', versionNumber: 2, status: 'archived' },
        { _id: 'v1', versionNumber: 1, status: 'published' }
      ];
      databaseAdapter.find.mockResolvedValue(allVersions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'archived' });

      const result = await documentVersionService.archiveOldVersions(mockDocumentId, {
        keepLatest: 1
      });

      // v2 is already archived, only v1 should be archived
      expect(result.archivedCount).toBe(1);
    });
  });

  describe('deleteVersion', () => {
    it('should soft delete version by default', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'v1',
        status: 'deleted'
      });

      const result = await documentVersionService.deleteVersion('v1');

      expect(result.status).toBe('deleted');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentVersion',
        'v1',
        { status: 'deleted' },
        { new: true }
      );
    });

    it('should hard delete when specified', async () => {
      const version = {
        _id: 'v1',
        storageReference: { fileKey: 'key1' },
        previousVersion: null,
        nextVersion: 'v2'
      };
      databaseAdapter.findById.mockResolvedValue(version);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.findByIdAndDelete.mockResolvedValue(version);
      fileStorageService.deleteFile.mockResolvedValue({ deleted: true });

      const result = await documentVersionService.deleteVersion('v1', { hard: true });

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('DocumentVersion', 'v1');
      expect(fileStorageService.deleteFile).toHaveBeenCalled();
    });

    it('should update linked list references on hard delete', async () => {
      const version = {
        _id: 'v2',
        previousVersion: 'v1',
        nextVersion: 'v3'
      };
      databaseAdapter.findById.mockResolvedValue(version);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.findByIdAndDelete.mockResolvedValue(version);

      await documentVersionService.deleteVersion('v2', { hard: true });

      // v1.nextVersion should be updated to v3
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentVersion',
        'v1',
        expect.objectContaining({ nextVersion: 'v3' }),
        expect.any(Object)
      );
      // v3.previousVersion should be updated to v1
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentVersion',
        'v3',
        expect.objectContaining({ previousVersion: 'v1' }),
        expect.any(Object)
      );
    });

    it('should throw error for non-existent version', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        documentVersionService.deleteVersion('nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('publishVersion', () => {
    it('should change version status to published', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'v1',
        status: 'published'
      });

      const result = await documentVersionService.publishVersion('v1');

      expect(result.status).toBe('published');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentVersion',
        'v1',
        { status: 'published' },
        { new: true }
      );
    });
  });

  describe('updateVersionMetadata', () => {
    it('should update version metadata', async () => {
      const updatedVersion = {
        _id: 'v1',
        metadata: { tags: ['contract', 'legal'], reviewed: true }
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedVersion);

      const result = await documentVersionService.updateVersionMetadata('v1', {
        tags: ['contract', 'legal'],
        reviewed: true
      });

      expect(result.metadata.tags).toContain('contract');
      expect(result.metadata.reviewed).toBe(true);
    });

    it('should merge metadata when merge option is true', async () => {
      const existingVersion = {
        _id: 'v1',
        metadata: { existingKey: 'value' }
      };
      databaseAdapter.findById.mockResolvedValue(existingVersion);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'v1',
        metadata: { existingKey: 'value', newKey: 'newValue' }
      });

      const result = await documentVersionService.updateVersionMetadata(
        'v1',
        { newKey: 'newValue' },
        { merge: true }
      );

      expect(result.metadata.existingKey).toBe('value');
      expect(result.metadata.newKey).toBe('newValue');
    });
  });

  describe('getVersionByNumber', () => {
    it('should get specific version by document ID and version number', async () => {
      const mockVersion = {
        _id: 'v2',
        documentId: 'doc123',
        versionNumber: 2
      };
      databaseAdapter.findOne.mockResolvedValue(mockVersion);

      const result = await documentVersionService.getVersionByNumber('doc123', 2);

      expect(result.versionNumber).toBe(2);
      expect(databaseAdapter.findOne).toHaveBeenCalledWith(
        'DocumentVersion',
        { documentId: 'doc123', versionNumber: 2 }
      );
    });

    it('should return null for non-existent version number', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await documentVersionService.getVersionByNumber('doc123', 999);

      expect(result).toBeNull();
    });
  });

  describe('downloadVersionContent', () => {
    it('should download version file content', async () => {
      const mockVersion = {
        _id: 'v1',
        mimeType: 'application/pdf',
        originalFilename: 'contract.pdf',
        fileSize: 1024,
        versionNumber: 1,
        storageReference: {
          provider: 'zerodb',
          fileKey: 'opencap/documents/doc123/v1'
        }
      };
      const mockContent = Buffer.from('file content');
      databaseAdapter.findById.mockResolvedValue(mockVersion);
      fileStorageService.downloadFile.mockResolvedValue({
        data: mockContent,
        contentType: 'application/pdf'
      });

      const result = await documentVersionService.downloadVersionContent('v1');

      expect(result.data).toEqual(mockContent);
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toBe('contract.pdf');
    });

    it('should throw error for version without storage reference', async () => {
      databaseAdapter.findById.mockResolvedValue({
        _id: 'v1',
        storageReference: null
      });

      await expect(
        documentVersionService.downloadVersionContent('v1')
      ).rejects.toThrow();
    });
  });
});
