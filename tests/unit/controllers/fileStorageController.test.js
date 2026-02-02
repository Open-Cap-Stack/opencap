/**
 * File Storage Controller Tests
 *
 * Tests for the file storage API endpoints
 *
 * Issue #30: Implement file storage integration
 */

const fileStorageController = require('../../../controllers/fileStorageController');
const fileStorageService = require('../../../services/fileStorageService');
const httpMocks = require('node-mocks-http');

// Mock the file storage service
jest.mock('../../../services/fileStorageService');

describe('FileStorageController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = {
      userId: 'user-123',
      companyId: 'company-123',
      role: 'admin'
    };
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      req.file = {
        buffer: Buffer.from('Test content'),
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 12
      };
      req.body = {
        category: 'financial_report',
        metadata: JSON.stringify({ year: 2024 })
      };

      fileStorageService.uploadFile.mockResolvedValue({
        id: 'file-123',
        fileName: 'document.pdf',
        size: 12,
        contentType: 'application/pdf',
        createdAt: new Date().toISOString()
      });

      await fileStorageController.uploadFile(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.id).toBe('file-123');
      expect(data.fileName).toBe('document.pdf');
    });

    it('should return 400 when no file is provided', async () => {
      req.file = null;

      await fileStorageController.uploadFile(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('No file');
    });

    it('should handle upload errors', async () => {
      req.file = {
        buffer: Buffer.from('Test'),
        originalname: 'test.pdf',
        size: 4
      };

      fileStorageService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await fileStorageController.uploadFile(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('failed');
    });

    it('should reject files that exceed size limit', async () => {
      req.file = {
        buffer: Buffer.from('Test'),
        originalname: 'huge.pdf',
        size: 500 * 1024 * 1024
      };

      fileStorageService.uploadFile.mockRejectedValue(
        new Error('File size exceeds maximum allowed')
      );

      await fileStorageController.uploadFile(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject disallowed file types', async () => {
      req.file = {
        buffer: Buffer.from('Test'),
        originalname: 'virus.exe',
        size: 100
      };

      fileStorageService.uploadFile.mockRejectedValue(
        new Error('File type not allowed')
      );

      await fileStorageController.uploadFile(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      req.params = { id: 'file-123' };
      const fileContent = Buffer.from('File content');

      fileStorageService.downloadFile.mockResolvedValue({
        data: fileContent,
        contentType: 'application/pdf',
        size: fileContent.length
      });
      fileStorageService.getFileMetadata.mockResolvedValue({
        fileName: 'document.pdf',
        contentType: 'application/pdf'
      });

      await fileStorageController.downloadFile(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getData()).toEqual(fileContent);
    });

    it('should return 404 when file not found', async () => {
      req.params = { id: 'non-existent' };

      fileStorageService.downloadFile.mockRejectedValue(new Error('File not found'));

      await fileStorageController.downloadFile(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL successfully', async () => {
      req.params = { id: 'file-123' };
      req.query = { expiresIn: '7200' };

      fileStorageService.getPresignedUrl.mockResolvedValue({
        url: 'https://storage.zerodb.io/presigned/abc123',
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
        expiresIn: 7200
      });

      await fileStorageController.getPresignedUrl(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.url).toContain('presigned');
    });

    it('should use default expiration when not specified', async () => {
      req.params = { id: 'file-456' };
      req.query = {};

      fileStorageService.getPresignedUrl.mockResolvedValue({
        url: 'https://storage.zerodb.io/presigned/xyz',
        expiresIn: 3600
      });

      await fileStorageController.getPresignedUrl(req, res);

      expect(res.statusCode).toBe(200);
      expect(fileStorageService.getPresignedUrl).toHaveBeenCalledWith(
        'file-456',
        expect.objectContaining({ expiresIn: 3600 })
      );
    });
  });

  describe('getFileMetadata', () => {
    it('should retrieve file metadata successfully', async () => {
      req.params = { id: 'file-123' };

      fileStorageService.getFileMetadata.mockResolvedValue({
        id: 'file-123',
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        size: 1024,
        metadata: { year: 2024 },
        createdAt: new Date().toISOString()
      });

      await fileStorageController.getFileMetadata(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.fileName).toBe('report.pdf');
      expect(data.metadata.year).toBe(2024);
    });

    it('should return 404 for non-existent file', async () => {
      req.params = { id: 'non-existent' };

      fileStorageService.getFileMetadata.mockRejectedValue(new Error('File not found'));

      await fileStorageController.getFileMetadata(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateFileMetadata', () => {
    it('should update file metadata successfully', async () => {
      req.params = { id: 'file-123' };
      req.body = {
        metadata: { category: 'compliance', confidential: true }
      };

      fileStorageService.updateFileMetadata.mockResolvedValue({
        id: 'file-123',
        metadata: { category: 'compliance', confidential: true },
        updatedAt: new Date().toISOString()
      });

      await fileStorageController.updateFileMetadata(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.metadata.category).toBe('compliance');
    });

    it('should merge metadata when specified', async () => {
      req.params = { id: 'file-456' };
      req.body = {
        metadata: { status: 'approved' },
        merge: true
      };

      fileStorageService.updateFileMetadata.mockResolvedValue({
        id: 'file-456',
        metadata: { existing: 'value', status: 'approved' }
      });

      await fileStorageController.updateFileMetadata(req, res);

      expect(fileStorageService.updateFileMetadata).toHaveBeenCalledWith(
        'file-456',
        { status: 'approved' },
        { merge: true }
      );
    });
  });

  describe('listFiles', () => {
    it('should list files with pagination', async () => {
      req.query = { page: '1', limit: '20' };

      fileStorageService.listFiles.mockResolvedValue({
        files: [
          { id: 'file-1', fileName: 'doc1.pdf' },
          { id: 'file-2', fileName: 'doc2.pdf' }
        ],
        total: 2
      });

      await fileStorageController.listFiles(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.files).toHaveLength(2);
      expect(data.pagination).toBeDefined();
    });

    it('should filter files by content type', async () => {
      req.query = { contentType: 'application/pdf' };

      fileStorageService.listFiles.mockResolvedValue({
        files: [{ id: 'file-1', contentType: 'application/pdf' }],
        total: 1
      });

      await fileStorageController.listFiles(req, res);

      expect(fileStorageService.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'application/pdf' })
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      req.params = { id: 'file-123' };

      fileStorageService.deleteFile.mockResolvedValue({
        deleted: true,
        id: 'file-123'
      });

      await fileStorageController.deleteFile(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.deleted).toBe(true);
    });

    it('should support soft delete', async () => {
      req.params = { id: 'file-456' };
      req.query = { soft: 'true' };

      fileStorageService.deleteFile.mockResolvedValue({
        id: 'file-456',
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });

      await fileStorageController.deleteFile(req, res);

      expect(fileStorageService.deleteFile).toHaveBeenCalledWith(
        'file-456',
        { soft: true }
      );
    });

    it('should return 404 for non-existent file', async () => {
      req.params = { id: 'non-existent' };

      fileStorageService.deleteFile.mockRejectedValue(new Error('File not found'));

      await fileStorageController.deleteFile(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      req.params = { id: 'file-123' };
      req.file = {
        buffer: Buffer.from('Updated content'),
        originalname: 'document-v2.pdf'
      };

      fileStorageService.createVersion.mockResolvedValue({
        id: 'file-v2',
        version: 2,
        parentVersion: 'file-123'
      });

      await fileStorageController.createVersion(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.version).toBe(2);
    });
  });

  describe('getVersionHistory', () => {
    it('should retrieve version history', async () => {
      req.params = { id: 'file-123' };

      fileStorageService.getVersionHistory.mockResolvedValue({
        versions: [
          { id: 'file-v1', version: 1 },
          { id: 'file-v2', version: 2 }
        ],
        currentVersion: 2
      });

      await fileStorageController.getVersionHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.versions).toHaveLength(2);
    });
  });

  describe('getStorageUsage', () => {
    it('should retrieve storage usage for company', async () => {
      fileStorageService.getStorageUsage.mockResolvedValue({
        totalBytes: 1073741824,
        fileCount: 150,
        quotaUsedPercent: 40
      });

      await fileStorageController.getStorageUsage(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.totalBytes).toBe(1073741824);
    });
  });

  describe('searchFiles', () => {
    it('should search files by metadata', async () => {
      req.body = {
        criteria: { documentType: 'Financial Report' }
      };

      fileStorageService.searchFilesByMetadata.mockResolvedValue({
        files: [
          { id: 'file-1', metadata: { documentType: 'Financial Report' } }
        ],
        total: 1
      });

      await fileStorageController.searchFiles(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.files).toHaveLength(1);
    });
  });

  describe('uploadMultipleFiles', () => {
    it('should upload multiple files successfully', async () => {
      req.files = [
        { buffer: Buffer.from('Content 1'), originalname: 'file1.pdf' },
        { buffer: Buffer.from('Content 2'), originalname: 'file2.pdf' }
      ];

      fileStorageService.uploadMultipleFiles.mockResolvedValue({
        successful: 2,
        failed: 0,
        files: [
          { id: 'file-1', fileName: 'file1.pdf' },
          { id: 'file-2', fileName: 'file2.pdf' }
        ]
      });

      await fileStorageController.uploadMultipleFiles(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.successful).toBe(2);
    });

    it('should handle partial failures', async () => {
      req.files = [
        { buffer: Buffer.from('Content 1'), originalname: 'file1.pdf' },
        { buffer: Buffer.from('Content 2'), originalname: 'file2.pdf' }
      ];

      fileStorageService.uploadMultipleFiles.mockResolvedValue({
        successful: 1,
        failed: 1,
        files: [{ id: 'file-1' }],
        errors: [{ fileName: 'file2.pdf', error: 'Upload failed' }]
      });

      await fileStorageController.uploadMultipleFiles(req, res);

      expect(res.statusCode).toBe(207); // Multi-Status
      const data = JSON.parse(res._getData());
      expect(data.successful).toBe(1);
      expect(data.failed).toBe(1);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a previous version', async () => {
      req.params = { id: 'file-123' };
      req.body = { version: 1 };

      fileStorageService.restoreVersion.mockResolvedValue({
        id: 'file-restored',
        version: 3,
        restoredFrom: 1
      });

      await fileStorageController.restoreVersion(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.restoredFrom).toBe(1);
    });
  });
});
