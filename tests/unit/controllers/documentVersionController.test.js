/**
 * DocumentVersion Controller Unit Tests
 * Issue #98: Implement Document Version Control
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/documentVersionService', () => ({
  createVersion: jest.fn(),
  getVersionHistory: jest.fn(),
  getVersionById: jest.fn(),
  getLatestVersion: jest.fn(),
  compareVersions: jest.fn(),
  restoreVersion: jest.fn(),
  archiveVersion: jest.fn(),
  archiveOldVersions: jest.fn(),
  deleteVersion: jest.fn(),
  publishVersion: jest.fn(),
  updateVersionMetadata: jest.fn(),
  getVersionByNumber: jest.fn(),
  downloadVersionContent: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const documentVersionController = require('../../../controllers/documentVersionController');
const documentVersionService = require('../../../services/documentVersionService');

describe('DocumentVersion Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createVersion', () => {
    const mockVersionData = {
      documentId: 'doc123',
      changeSummary: 'Added new section',
      changeDescription: 'Added legal clauses to section 3',
      author: 'user123'
    };

    it('should create a new version successfully', async () => {
      req.body = mockVersionData;
      req.file = {
        buffer: Buffer.from('test file content'),
        originalname: 'contract.pdf',
        mimetype: 'application/pdf',
        size: 1024
      };
      const mockSavedVersion = {
        _id: 'version123',
        versionId: 'DV-12345678',
        versionNumber: 1,
        ...mockVersionData
      };
      documentVersionService.createVersion.mockResolvedValue(mockSavedVersion);

      await documentVersionController.createVersion(req, res);

      expect(documentVersionService.createVersion).toHaveBeenCalledWith(
        mockVersionData.documentId,
        req.file.buffer,
        expect.objectContaining({
          changeSummary: mockVersionData.changeSummary,
          author: mockVersionData.author
        })
      );
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toHaveProperty('versionId', 'DV-12345678');
    });

    it('should return 400 when file is missing', async () => {
      req.body = mockVersionData;
      req.file = null;

      await documentVersionController.createVersion(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 when documentId is missing', async () => {
      req.body = { changeSummary: 'Test' };
      req.file = { buffer: Buffer.from('test'), originalname: 'test.pdf' };

      await documentVersionController.createVersion(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 on service error', async () => {
      req.body = mockVersionData;
      req.file = { buffer: Buffer.from('test'), originalname: 'test.pdf' };
      documentVersionService.createVersion.mockRejectedValue(new Error('Service error'));

      await documentVersionController.createVersion(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history for a document', async () => {
      req.params = { documentId: 'doc123' };
      const mockHistory = {
        versions: [
          { _id: 'v2', versionNumber: 2 },
          { _id: 'v1', versionNumber: 1 }
        ],
        totalVersions: 2
      };
      documentVersionService.getVersionHistory.mockResolvedValue(mockHistory);

      await documentVersionController.getVersionHistory(req, res);

      expect(documentVersionService.getVersionHistory).toHaveBeenCalledWith(
        'doc123',
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('versions');
      expect(JSON.parse(res._getData()).totalVersions).toBe(2);
    });

    it('should pass pagination parameters', async () => {
      req.params = { documentId: 'doc123' };
      req.query = { skip: '10', limit: '5' };
      documentVersionService.getVersionHistory.mockResolvedValue({ versions: [], totalVersions: 0 });

      await documentVersionController.getVersionHistory(req, res);

      expect(documentVersionService.getVersionHistory).toHaveBeenCalledWith(
        'doc123',
        expect.objectContaining({ skip: 10, limit: 5 })
      );
    });

    it('should pass status filter', async () => {
      req.params = { documentId: 'doc123' };
      req.query = { status: 'published' };
      documentVersionService.getVersionHistory.mockResolvedValue({ versions: [], totalVersions: 0 });

      await documentVersionController.getVersionHistory(req, res);

      expect(documentVersionService.getVersionHistory).toHaveBeenCalledWith(
        'doc123',
        expect.objectContaining({ status: 'published' })
      );
    });

    it('should return 500 on service error', async () => {
      req.params = { documentId: 'doc123' };
      documentVersionService.getVersionHistory.mockRejectedValue(new Error('Service error'));

      await documentVersionController.getVersionHistory(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getVersionById', () => {
    it('should return a version by ID', async () => {
      req.params = { versionId: 'version123' };
      const mockVersion = {
        _id: 'version123',
        documentId: 'doc123',
        versionNumber: 2,
        status: 'published'
      };
      documentVersionService.getVersionById.mockResolvedValue(mockVersion);

      await documentVersionController.getVersionById(req, res);

      expect(documentVersionService.getVersionById).toHaveBeenCalledWith('version123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockVersion);
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId: 'nonexistent' };
      documentVersionService.getVersionById.mockResolvedValue(null);

      await documentVersionController.getVersionById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Version not found');
    });

    it('should return 500 on service error', async () => {
      req.params = { versionId: 'version123' };
      documentVersionService.getVersionById.mockRejectedValue(new Error('Service error'));

      await documentVersionController.getVersionById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version for a document', async () => {
      req.params = { documentId: 'doc123' };
      const mockVersion = {
        _id: 'v3',
        versionNumber: 3,
        status: 'published'
      };
      documentVersionService.getLatestVersion.mockResolvedValue(mockVersion);

      await documentVersionController.getLatestVersion(req, res);

      expect(documentVersionService.getLatestVersion).toHaveBeenCalledWith(
        'doc123',
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).versionNumber).toBe(3);
    });

    it('should filter by status when provided', async () => {
      req.params = { documentId: 'doc123' };
      req.query = { status: 'published' };
      documentVersionService.getLatestVersion.mockResolvedValue(null);

      await documentVersionController.getLatestVersion(req, res);

      expect(documentVersionService.getLatestVersion).toHaveBeenCalledWith(
        'doc123',
        expect.objectContaining({ status: 'published' })
      );
    });

    it('should return 404 when no versions exist', async () => {
      req.params = { documentId: 'doc123' };
      documentVersionService.getLatestVersion.mockResolvedValue(null);

      await documentVersionController.getLatestVersion(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'No versions found');
    });
  });

  describe('getVersionByNumber', () => {
    it('should return specific version by document ID and version number', async () => {
      req.params = { documentId: 'doc123', versionNumber: '2' };
      const mockVersion = { _id: 'v2', versionNumber: 2 };
      documentVersionService.getVersionByNumber.mockResolvedValue(mockVersion);

      await documentVersionController.getVersionByNumber(req, res);

      expect(documentVersionService.getVersionByNumber).toHaveBeenCalledWith('doc123', 2);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).versionNumber).toBe(2);
    });

    it('should return 404 when version number not found', async () => {
      req.params = { documentId: 'doc123', versionNumber: '999' };
      documentVersionService.getVersionByNumber.mockResolvedValue(null);

      await documentVersionController.getVersionByNumber(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Version not found');
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions', async () => {
      req.params = { versionId1: 'v1', versionId2: 'v2' };
      const mockComparison = {
        version1: { _id: 'v1', versionNumber: 1 },
        version2: { _id: 'v2', versionNumber: 2 },
        differences: {
          fileSize: { from: 1024, to: 2048 }
        },
        contentChanged: true
      };
      documentVersionService.compareVersions.mockResolvedValue(mockComparison);

      await documentVersionController.compareVersions(req, res);

      expect(documentVersionService.compareVersions).toHaveBeenCalledWith('v1', 'v2');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('differences');
      expect(JSON.parse(res._getData()).contentChanged).toBe(true);
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId1: 'v1', versionId2: 'nonexistent' };
      documentVersionService.compareVersions.mockRejectedValue(new Error('Version not found'));

      await documentVersionController.compareVersions(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a previous version', async () => {
      req.params = { versionId: 'v1' };
      req.body = { author: 'user456', changeSummary: 'Restored from v1' };
      const mockRestoredVersion = {
        _id: 'v4',
        versionNumber: 4,
        changeSummary: 'Restored from v1'
      };
      documentVersionService.restoreVersion.mockResolvedValue(mockRestoredVersion);

      await documentVersionController.restoreVersion(req, res);

      expect(documentVersionService.restoreVersion).toHaveBeenCalledWith(
        'v1',
        expect.objectContaining({
          author: 'user456',
          changeSummary: 'Restored from v1'
        })
      );
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData()).versionNumber).toBe(4);
    });

    it('should return 400 when author is missing', async () => {
      req.params = { versionId: 'v1' };
      req.body = { changeSummary: 'Restored' };

      await documentVersionController.restoreVersion(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId: 'nonexistent' };
      req.body = { author: 'user456' };
      documentVersionService.restoreVersion.mockRejectedValue(new Error('Version not found'));

      await documentVersionController.restoreVersion(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('archiveVersion', () => {
    it('should archive a version', async () => {
      req.params = { versionId: 'v1' };
      const mockArchivedVersion = { _id: 'v1', status: 'archived' };
      documentVersionService.archiveVersion.mockResolvedValue(mockArchivedVersion);

      await documentVersionController.archiveVersion(req, res);

      expect(documentVersionService.archiveVersion).toHaveBeenCalledWith('v1');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).status).toBe('archived');
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId: 'nonexistent' };
      documentVersionService.archiveVersion.mockRejectedValue(new Error('Version not found'));

      await documentVersionController.archiveVersion(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('archiveOldVersions', () => {
    it('should archive old versions keeping specified count', async () => {
      req.params = { documentId: 'doc123' };
      req.body = { keepLatest: 3 };
      documentVersionService.archiveOldVersions.mockResolvedValue({ archivedCount: 2 });

      await documentVersionController.archiveOldVersions(req, res);

      expect(documentVersionService.archiveOldVersions).toHaveBeenCalledWith(
        'doc123',
        expect.objectContaining({ keepLatest: 3 })
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).archivedCount).toBe(2);
    });

    it('should use default keepLatest value if not provided', async () => {
      req.params = { documentId: 'doc123' };
      req.body = {};
      documentVersionService.archiveOldVersions.mockResolvedValue({ archivedCount: 0 });

      await documentVersionController.archiveOldVersions(req, res);

      expect(documentVersionService.archiveOldVersions).toHaveBeenCalledWith(
        'doc123',
        expect.objectContaining({ keepLatest: expect.any(Number) })
      );
    });
  });

  describe('deleteVersion', () => {
    it('should soft delete a version by default', async () => {
      req.params = { versionId: 'v1' };
      const mockDeletedVersion = { _id: 'v1', status: 'deleted' };
      documentVersionService.deleteVersion.mockResolvedValue(mockDeletedVersion);

      await documentVersionController.deleteVersion(req, res);

      expect(documentVersionService.deleteVersion).toHaveBeenCalledWith(
        'v1',
        expect.objectContaining({ hard: false })
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should hard delete when specified', async () => {
      req.params = { versionId: 'v1' };
      req.query = { hard: 'true' };
      documentVersionService.deleteVersion.mockResolvedValue({ deleted: true });

      await documentVersionController.deleteVersion(req, res);

      expect(documentVersionService.deleteVersion).toHaveBeenCalledWith(
        'v1',
        expect.objectContaining({ hard: true })
      );
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId: 'nonexistent' };
      documentVersionService.deleteVersion.mockRejectedValue(new Error('Version not found'));

      await documentVersionController.deleteVersion(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('publishVersion', () => {
    it('should publish a draft version', async () => {
      req.params = { versionId: 'v1' };
      const mockPublishedVersion = { _id: 'v1', status: 'published' };
      documentVersionService.publishVersion.mockResolvedValue(mockPublishedVersion);

      await documentVersionController.publishVersion(req, res);

      expect(documentVersionService.publishVersion).toHaveBeenCalledWith('v1');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).status).toBe('published');
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId: 'nonexistent' };
      documentVersionService.publishVersion.mockRejectedValue(new Error('Version not found'));

      await documentVersionController.publishVersion(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateVersionMetadata', () => {
    it('should update version metadata', async () => {
      req.params = { versionId: 'v1' };
      req.body = { metadata: { tags: ['legal', 'contract'] } };
      const mockUpdatedVersion = {
        _id: 'v1',
        metadata: { tags: ['legal', 'contract'] }
      };
      documentVersionService.updateVersionMetadata.mockResolvedValue(mockUpdatedVersion);

      await documentVersionController.updateVersionMetadata(req, res);

      expect(documentVersionService.updateVersionMetadata).toHaveBeenCalledWith(
        'v1',
        { tags: ['legal', 'contract'] },
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
    });

    it('should merge metadata when specified', async () => {
      req.params = { versionId: 'v1' };
      req.body = { metadata: { newKey: 'value' }, merge: true };
      documentVersionService.updateVersionMetadata.mockResolvedValue({
        _id: 'v1',
        metadata: { existingKey: 'old', newKey: 'value' }
      });

      await documentVersionController.updateVersionMetadata(req, res);

      expect(documentVersionService.updateVersionMetadata).toHaveBeenCalledWith(
        'v1',
        { newKey: 'value' },
        expect.objectContaining({ merge: true })
      );
    });

    it('should return 400 when metadata is missing', async () => {
      req.params = { versionId: 'v1' };
      req.body = {};

      await documentVersionController.updateVersionMetadata(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('downloadVersion', () => {
    it('should download version content', async () => {
      req.params = { versionId: 'v1' };
      const mockContent = {
        data: Buffer.from('file content'),
        contentType: 'application/pdf',
        fileName: 'contract.pdf'
      };
      documentVersionService.downloadVersionContent.mockResolvedValue(mockContent);

      await documentVersionController.downloadVersion(req, res);

      expect(documentVersionService.downloadVersionContent).toHaveBeenCalledWith('v1');
      expect(res.statusCode).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('application/pdf');
      expect(res.getHeader('Content-Disposition')).toContain('contract.pdf');
    });

    it('should return 404 when version not found', async () => {
      req.params = { versionId: 'nonexistent' };
      documentVersionService.downloadVersionContent.mockRejectedValue(new Error('Version not found'));

      await documentVersionController.downloadVersion(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when file content not available', async () => {
      req.params = { versionId: 'v1' };
      documentVersionService.downloadVersionContent.mockRejectedValue(new Error('No storage reference'));

      await documentVersionController.downloadVersion(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
