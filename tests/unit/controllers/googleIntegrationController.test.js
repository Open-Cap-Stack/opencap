/**
 * Google Integration Controller Unit Tests
 * Issue #234: Google Drive and Gmail integration for data room reconstruction
 * TDD: Tests for status, search, and import endpoints
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the service before requiring the controller
jest.mock('../../../services/googleIntegrationService');

const httpMocks = require('node-mocks-http');
const googleIntegrationService = require('../../../services/googleIntegrationService');
const controller = require('../../../controllers/googleIntegrationController');

describe('GoogleIntegrationController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_123', companyId: 'company_456', role: 'admin' };
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /status
  // -----------------------------------------------------------------------
  describe('getStatus', () => {
    it('should return connection status for the authenticated user', async () => {
      googleIntegrationService.checkGoogleConnection.mockResolvedValue({
        connected: false,
        email: null,
      });

      await controller.getStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.google).toBeDefined();
      expect(data.google.connected).toBe(false);
      expect(data.google.email).toBeNull();
      expect(googleIntegrationService.checkGoogleConnection).toHaveBeenCalledWith('user_123');
    });

    it('should return connected=true when user has Google linked', async () => {
      googleIntegrationService.checkGoogleConnection.mockResolvedValue({
        connected: true,
        email: 'user@example.com',
        scopes: ['drive.readonly', 'gmail.readonly'],
      });

      await controller.getStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.google.connected).toBe(true);
      expect(data.google.email).toBe('user@example.com');
    });

    it('should return 500 on service error', async () => {
      googleIntegrationService.checkGoogleConnection.mockRejectedValue(new Error('DB down'));

      await controller.getStatus(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // GET /google-drive/files
  // -----------------------------------------------------------------------
  describe('searchDriveFiles', () => {
    it('should return not-connected status when Google is not linked', async () => {
      googleIntegrationService.searchDriveFiles.mockResolvedValue({
        connected: false,
        message: 'Connect your Google account to import documents from Google Drive',
        files: [],
      });

      req.query = { query: 'financial', types: 'pdf,xlsx' };
      await controller.searchDriveFiles(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.connected).toBe(false);
      expect(data.files).toEqual([]);
      expect(googleIntegrationService.searchDriveFiles).toHaveBeenCalledWith('user_123', {
        query: 'financial',
        types: 'pdf,xlsx',
        limit: 20,
      });
    });

    it('should pass limit param when provided', async () => {
      googleIntegrationService.searchDriveFiles.mockResolvedValue({
        connected: true,
        files: [],
      });

      req.query = { query: 'report', limit: '5' };
      await controller.searchDriveFiles(req, res);

      expect(googleIntegrationService.searchDriveFiles).toHaveBeenCalledWith('user_123', {
        query: 'report',
        types: '',
        limit: 5,
      });
    });

    it('should return 500 on service error', async () => {
      googleIntegrationService.searchDriveFiles.mockRejectedValue(new Error('API error'));

      req.query = {};
      await controller.searchDriveFiles(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // POST /google-drive/import
  // -----------------------------------------------------------------------
  describe('importDriveFile', () => {
    it('should return 400 when fileName is missing', async () => {
      req.body = { base64Content: 'dGVzdA==' };
      await controller.importDriveFile(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error.message).toContain('fileName');
    });

    it('should return 400 when base64Content is missing', async () => {
      req.body = { fileName: 'test.pdf' };
      await controller.importDriveFile(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error.message).toContain('base64Content');
    });

    it('should return 413 when file is too large', async () => {
      // Create a base64 string that decodes to > 50 MB
      const largeContent = 'A'.repeat(70 * 1024 * 1024);
      req.body = { fileName: 'huge.pdf', base64Content: largeContent };

      await controller.importDriveFile(req, res);

      expect(res.statusCode).toBe(413);
    });

    it('should import a file successfully', async () => {
      const mockDoc = {
        id: 'doc-uuid',
        fileName: 'report.pdf',
        source: 'google-drive',
      };
      googleIntegrationService.importToDataRoom.mockResolvedValue(mockDoc);

      req.body = {
        fileId: 'drive-file-123',
        fileName: 'report.pdf',
        base64Content: 'dGVzdA==',
        mimeType: 'application/pdf',
        dataRoomId: 'dr-456',
        category: 'financial',
      };

      await controller.importDriveFile(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.data.fileName).toBe('report.pdf');
      expect(googleIntegrationService.importToDataRoom).toHaveBeenCalledWith({
        fileName: 'report.pdf',
        base64Content: 'dGVzdA==',
        mimeType: 'application/pdf',
        dataRoomId: 'dr-456',
        category: 'financial',
        source: 'google-drive',
        sourceMetadata: { fileId: 'drive-file-123' },
        companyId: 'company_456',
        userId: 'user_123',
      });
    });

    it('should return 500 on service error', async () => {
      googleIntegrationService.importToDataRoom.mockRejectedValue(new Error('ZeroDB insert failed'));

      req.body = { fileName: 'test.pdf', base64Content: 'dGVzdA==' };
      await controller.importDriveFile(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // GET /gmail/attachments
  // -----------------------------------------------------------------------
  describe('searchGmailAttachments', () => {
    it('should return not-connected status when Google is not linked', async () => {
      googleIntegrationService.searchGmailAttachments.mockResolvedValue({
        connected: false,
        message: 'Connect your Google account to search Gmail attachments',
        attachments: [],
      });

      req.query = { query: 'invoice tax', newer_than: '1y' };
      await controller.searchGmailAttachments(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.connected).toBe(false);
      expect(data.attachments).toEqual([]);
      expect(googleIntegrationService.searchGmailAttachments).toHaveBeenCalledWith('user_123', {
        query: 'invoice tax',
        newerThan: '1y',
        limit: 20,
      });
    });

    it('should return 500 on service error', async () => {
      googleIntegrationService.searchGmailAttachments.mockRejectedValue(new Error('API error'));

      req.query = {};
      await controller.searchGmailAttachments(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // POST /gmail/import
  // -----------------------------------------------------------------------
  describe('importGmailAttachment', () => {
    it('should return 400 when fileName is missing', async () => {
      req.body = { attachmentData: 'dGVzdA==' };
      await controller.importGmailAttachment(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error.message).toContain('fileName');
    });

    it('should return 400 when attachmentData is missing', async () => {
      req.body = { fileName: 'invoice.pdf' };
      await controller.importGmailAttachment(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error.message).toContain('attachmentData');
    });

    it('should return 413 when attachment is too large', async () => {
      const largeContent = 'A'.repeat(70 * 1024 * 1024);
      req.body = { fileName: 'huge.pdf', attachmentData: largeContent };

      await controller.importGmailAttachment(req, res);

      expect(res.statusCode).toBe(413);
    });

    it('should import a Gmail attachment successfully', async () => {
      const mockDoc = {
        id: 'doc-uuid-2',
        fileName: 'invoice.pdf',
        source: 'gmail',
      };
      googleIntegrationService.importToDataRoom.mockResolvedValue(mockDoc);

      req.body = {
        attachmentData: 'dGVzdA==',
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf',
        dataRoomId: 'dr-789',
        category: 'legal',
        threadId: 'thread-abc',
        messageId: 'msg-xyz',
      };

      await controller.importGmailAttachment(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.data.fileName).toBe('invoice.pdf');
      expect(googleIntegrationService.importToDataRoom).toHaveBeenCalledWith({
        fileName: 'invoice.pdf',
        base64Content: 'dGVzdA==',
        mimeType: 'application/pdf',
        dataRoomId: 'dr-789',
        category: 'legal',
        source: 'gmail',
        sourceMetadata: { threadId: 'thread-abc', messageId: 'msg-xyz' },
        companyId: 'company_456',
        userId: 'user_123',
      });
    });

    it('should return 500 on service error', async () => {
      googleIntegrationService.importToDataRoom.mockRejectedValue(new Error('DB error'));

      req.body = { fileName: 'test.pdf', attachmentData: 'dGVzdA==' };
      await controller.importGmailAttachment(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
