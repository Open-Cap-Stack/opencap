/**
 * Document Download and Preview Controller Test Suite
 *
 * Tests for Issue #122: Add Document Download and Preview Endpoints
 * Follows TDD workflow - Red -> Green -> Refactor
 *
 * Endpoints tested:
 * - GET /api/v1/documents/:id/download - Download document file
 * - GET /api/v1/documents/:id/preview - Get preview/thumbnail metadata
 * - GET /api/v1/documents/:id/access - Get access permissions
 */

const zerodbService = require('../../../services/zerodbService');
const fileStorageService = require('../../../services/fileStorageService');
const eventStreamingService = require('../../../services/eventStreamingService');

// Mock all dependencies
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/fileStorageService');
jest.mock('../../../services/eventStreamingService');

// Import controller after mocks are set up
const documentController = require('../../../controllers/documentController');

describe('Document Download and Preview Endpoints - Issue #122', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;
  let mockSetHeader;
  let mockSend;
  let mockEnd;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockSend = jest.fn();
    mockEnd = jest.fn();
    mockSetHeader = jest.fn();
    mockStatus = jest.fn().mockReturnValue({
      json: mockJson,
      send: mockSend,
      end: mockEnd
    });
    mockRes = {
      status: mockStatus,
      json: mockJson,
      setHeader: mockSetHeader,
      send: mockSend,
      end: mockEnd
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'user-123',
        companyId: 'company-456',
        role: 'user'
      }
    };

    // Default mock implementations
    eventStreamingService.publishEvent = jest.fn().mockResolvedValue({});
    eventStreamingService.logAuditEntry = jest.fn().mockResolvedValue({});
  });

  describe('downloadDocument - GET /api/v1/documents/:id/download', () => {
    const mockDocument = {
      id: 'doc-123',
      title: 'Test Document',
      fileId: 'file-456',
      fileName: 'test-document.pdf',
      contentType: 'application/pdf',
      accessLevel: 'public',
      uploadedBy: 'user-123',
      companyId: 'company-456'
    };

    const mockFileData = {
      data: Buffer.from('PDF content'),
      contentType: 'application/pdf',
      size: 11
    };

    it('should download a document file successfully', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', {
        filter: { id: 'doc-123' },
        limit: 1
      });
      expect(fileStorageService.downloadFile).toHaveBeenCalledWith('file-456', expect.any(Object));
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('test-document.pdf')
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockSend).toHaveBeenCalledWith(mockFileData.data);
    });

    it('should set Content-Disposition header for attachment download', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.query = { attachment: 'true' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="test-document.pdf"'
      );
    });

    it('should set Content-Disposition header for inline viewing', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.query = { attachment: 'false' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="test-document.pdf"'
      );
    });

    it('should return 404 if document not found', async () => {
      mockReq.params = { id: 'non-existent' };

      // First call returns empty (by id), second call returns empty (fallback search)
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ data: [] });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('not found') }));
    });

    it('should return 404 if document has no file attached', async () => {
      mockReq.params = { id: 'doc-123' };

      const docWithoutFile = { ...mockDocument, fileId: null, storagePath: null, filePath: null };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [docWithoutFile] });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('not available') }));
    });

    it('should deny access to unauthorized users', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'other-user', companyId: 'other-company', role: 'user' };

      const privateDoc = {
        ...mockDocument,
        accessLevel: 'private',
        uploadedBy: 'different-user',
        companyId: 'different-company'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    it('should allow admin users to download any document', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'admin-user', role: 'admin' };

      const privateDoc = {
        ...mockDocument,
        accessLevel: 'private',
        uploadedBy: 'different-user'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockSend).toHaveBeenCalledWith(mockFileData.data);
    });

    it('should allow document owner to download their document', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'owner-user', role: 'user' };

      const ownedDoc = {
        ...mockDocument,
        accessLevel: 'private',
        uploadedBy: 'owner-user'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [ownedDoc] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should allow shared users to download shared document', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'shared-user', role: 'user' };

      const sharedDoc = {
        ...mockDocument,
        accessLevel: 'private',
        uploadedBy: 'owner-user',
        sharedWith: ['shared-user', 'another-user']
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [sharedDoc] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should log download in audit trail', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue(mockFileData);

      await documentController.downloadDocument(mockReq, mockRes);

      expect(eventStreamingService.publishEvent).toHaveBeenCalledWith({
        topic: 'document.downloaded',
        payload: expect.objectContaining({
          documentId: 'doc-123',
          userId: 'user-123'
        }),
        metadata: expect.objectContaining({
          actorId: 'user-123',
          action: 'download'
        })
      });
    });

    it('should handle file storage service errors', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.downloadFile = jest.fn().mockRejectedValue(new Error('Storage unavailable'));

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Failed to download') }));
    });

    it('should set Content-Length header when available', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue({
        ...mockFileData,
        size: 1024
      });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith('Content-Length', 1024);
    });
  });

  describe('getDocumentPreview - GET /api/v1/documents/:id/preview', () => {
    const mockDocument = {
      id: 'doc-123',
      title: 'Test Document',
      fileId: 'file-456',
      fileName: 'test-document.pdf',
      contentType: 'application/pdf',
      accessLevel: 'public',
      uploadedBy: 'user-123',
      companyId: 'company-456',
      fileSize: 1024000
    };

    it('should return preview metadata for a PDF document', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({
        id: 'file-456',
        fileName: 'test-document.pdf',
        contentType: 'application/pdf',
        size: 1024000,
        metadata: { pageCount: 10 }
      });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-123',
        fileName: 'test-document.pdf',
        contentType: 'application/pdf',
        fileSize: expect.any(Number),
        previewAvailable: true,
        previewType: 'pdf'
      }));
    });

    it('should return preview metadata for an image document', async () => {
      mockReq.params = { id: 'doc-123' };

      const imageDoc = {
        ...mockDocument,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [imageDoc] });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({
        id: 'file-456',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        size: 512000,
        metadata: { width: 1920, height: 1080 }
      });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        previewAvailable: true,
        previewType: 'image'
      }));
    });

    it('should indicate preview not available for unsupported file types', async () => {
      mockReq.params = { id: 'doc-123' };

      const zipDoc = {
        ...mockDocument,
        fileName: 'archive.zip',
        contentType: 'application/zip'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [zipDoc] });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({
        id: 'file-456',
        fileName: 'archive.zip',
        contentType: 'application/zip',
        size: 2048000
      });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        previewAvailable: false,
        previewType: null,
        message: 'Preview not available for this file type'
      }));
    });

    it('should return 404 if document not found', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ data: [] });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document not found' });
    });

    it('should return 404 if document has no file attached', async () => {
      mockReq.params = { id: 'doc-123' };

      const docWithoutFile = { ...mockDocument, fileId: null, storagePath: null, filePath: null };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [docWithoutFile] });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'No file attached to document' });
    });

    it('should deny access to unauthorized users', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'other-user', companyId: 'other-company', role: 'user' };

      const privateDoc = {
        ...mockDocument,
        accessLevel: 'private',
        uploadedBy: 'different-user',
        companyId: 'different-company'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    it('should return preview info for Word documents', async () => {
      mockReq.params = { id: 'doc-123' };

      const wordDoc = {
        ...mockDocument,
        fileName: 'document.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [wordDoc] });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({
        id: 'file-456',
        fileName: 'document.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 256000
      });

      await documentController.getDocumentPreview(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        previewAvailable: true,
        previewType: 'document'
      }));
    });

    it('should handle file metadata service errors gracefully', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      fileStorageService.getFileMetadata = jest.fn().mockRejectedValue(new Error('Metadata error'));

      await documentController.getDocumentPreview(mockReq, mockRes);

      // Controller catches metadata errors and continues with document metadata
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-123',
        previewAvailable: true
      }));
    });
  });

  describe('getDocumentAccess - GET /api/v1/documents/:id/access', () => {
    const mockDocument = {
      id: 'doc-123',
      title: 'Test Document',
      accessLevel: 'private',
      uploadedBy: 'owner-user',
      companyId: 'company-456',
      sharedWith: ['user-1', 'user-2'],
      permissions: {
        canView: ['owner-user', 'user-1', 'user-2'],
        canEdit: ['owner-user'],
        canDelete: ['owner-user'],
        canShare: ['owner-user']
      }
    };

    it('should return access permissions for a document', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'owner-user', role: 'user' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-123',
        accessLevel: 'private',
        owner: 'owner-user',
        sharedWith: ['user-1', 'user-2'],
        currentUserPermissions: expect.objectContaining({
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: true
        })
      }));
    });

    it('should return limited permissions for shared users', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'user-1', role: 'user' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        currentUserPermissions: expect.objectContaining({
          canView: true,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canDownload: true
        })
      }));
    });

    it('should return full permissions for admin users', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'admin-user', role: 'admin' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        currentUserPermissions: expect.objectContaining({
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: true
        })
      }));
    });

    it('should return 404 if document not found', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ data: [] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document not found' });
    });

    it('should return view-only permissions for public documents to any user', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'random-user', role: 'user' };

      const publicDoc = {
        ...mockDocument,
        accessLevel: 'public'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [publicDoc] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        currentUserPermissions: expect.objectContaining({
          canView: true,
          canDownload: true,
          canEdit: false,
          canDelete: false
        })
      }));
    });

    it('should deny access info to completely unauthorized users for private docs', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'unauthorized-user', companyId: 'other-company', role: 'user' };

      const privateDoc = {
        ...mockDocument,
        accessLevel: 'private',
        companyId: 'different-company'
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    it('should return company-wide access info for company documents', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'company-user', companyId: 'company-456', role: 'user' };

      const companyDoc = {
        ...mockDocument,
        accessLevel: 'company',
        sharedWith: []
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [companyDoc] });

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        accessLevel: 'company',
        currentUserPermissions: expect.objectContaining({
          canView: true,
          canDownload: true
        })
      }));
    });

    it('should handle database errors gracefully', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Database error'));

      await documentController.getDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Failed to get document access') }));
    });
  });

  describe('Access Control Helper - checkDocumentAccess', () => {
    it('should grant access to public documents for any user', async () => {
      const doc = { accessLevel: 'public' };
      const user = { userId: 'anyone', role: 'user' };

      // This tests the internal access check logic used by all endpoints
      mockReq.params = { id: 'doc-123' };
      mockReq.user = user;

      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ ...doc, id: 'doc-123', fileId: 'file-1', fileName: 'test.pdf', contentType: 'application/pdf' }]
      });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue({
        data: Buffer.from('test'),
        contentType: 'application/pdf'
      });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should grant access to document owner', async () => {
      const doc = {
        accessLevel: 'private',
        uploadedBy: 'owner-123'
      };
      const user = { userId: 'owner-123', role: 'user' };

      mockReq.params = { id: 'doc-123' };
      mockReq.user = user;

      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ ...doc, id: 'doc-123', fileId: 'file-1', fileName: 'test.pdf', contentType: 'application/pdf' }]
      });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue({
        data: Buffer.from('test'),
        contentType: 'application/pdf'
      });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should grant access to users in sharedWith array', async () => {
      const doc = {
        accessLevel: 'private',
        uploadedBy: 'owner-123',
        sharedWith: ['shared-user-1', 'shared-user-2']
      };
      const user = { userId: 'shared-user-1', role: 'user' };

      mockReq.params = { id: 'doc-123' };
      mockReq.user = user;

      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ ...doc, id: 'doc-123', fileId: 'file-1', fileName: 'test.pdf', contentType: 'application/pdf' }]
      });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue({
        data: Buffer.from('test'),
        contentType: 'application/pdf'
      });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should grant access to users in same company for company-level docs', async () => {
      const doc = {
        accessLevel: 'company',
        uploadedBy: 'owner-123',
        companyId: 'company-456'
      };
      const user = { userId: 'colleague', companyId: 'company-456', role: 'user' };

      mockReq.params = { id: 'doc-123' };
      mockReq.user = user;

      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ ...doc, id: 'doc-123', fileId: 'file-1', fileName: 'test.pdf', contentType: 'application/pdf' }]
      });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue({
        data: Buffer.from('test'),
        contentType: 'application/pdf'
      });

      await documentController.downloadDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });
});
