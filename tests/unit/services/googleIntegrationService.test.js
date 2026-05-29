/**
 * Google Integration Service Unit Tests
 * Issue #234: Google Drive and Gmail integration for data room reconstruction
 * TDD: Tests for connection check, search, import, and query builder
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock ZeroDB service
jest.mock('../../../services/zerodbService', () => ({
  queryTable: jest.fn(),
  insertRow: jest.fn(),
}));

// Mock DataRoom model
jest.mock('../../../models/DataRoom', () => ({
  addDocument: jest.fn(),
}));

const zerodbService = require('../../../services/zerodbService');
const DataRoom = require('../../../models/DataRoom');
const {
  checkGoogleConnection,
  searchDriveFiles,
  searchGmailAttachments,
  importToDataRoom,
  buildDriveQuery,
  MIME_TYPE_MAP,
} = require('../../../services/googleIntegrationService');

describe('GoogleIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // checkGoogleConnection
  // -----------------------------------------------------------------------
  describe('checkGoogleConnection', () => {
    it('should return not connected when userId is falsy', async () => {
      const result = await checkGoogleConnection(null);
      expect(result.connected).toBe(false);
      expect(result.email).toBeNull();
    });

    it('should return not connected when no integration record exists', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await checkGoogleConnection('user_123');

      expect(result.connected).toBe(false);
      expect(zerodbService.queryTable).toHaveBeenCalledWith('user_integrations', {
        filter: { userId: 'user_123', provider: 'google' },
        limit: 1,
      });
    });

    it('should return connected when integration record has an accessToken', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          {
            row_data: {
              userId: 'user_123',
              provider: 'google',
              accessToken: 'ya29.test-token',
              email: 'user@gmail.com',
              scopes: ['drive.readonly'],
            },
          },
        ],
      });

      const result = await checkGoogleConnection('user_123');

      expect(result.connected).toBe(true);
      expect(result.email).toBe('user@gmail.com');
      expect(result.scopes).toEqual(['drive.readonly']);
    });

    it('should return not connected when table does not exist', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Table not found'));
      const result = await checkGoogleConnection('user_123');

      expect(result.connected).toBe(false);
    });

    it('should return not connected on unexpected errors but log warning', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      zerodbService.queryTable.mockRejectedValue(new Error('Network timeout'));

      const result = await checkGoogleConnection('user_123');

      expect(result.connected).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // buildDriveQuery
  // -----------------------------------------------------------------------
  describe('buildDriveQuery', () => {
    it('should include full-text search and trash filter', () => {
      const q = buildDriveQuery('financial report', []);
      expect(q).toContain("fullText contains 'financial report'");
      expect(q).toContain('trashed = false');
    });

    it('should include MIME type filters', () => {
      const q = buildDriveQuery('', ['pdf', 'xlsx']);
      expect(q).toContain("mimeType = 'application/pdf'");
      expect(q).toContain("mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'");
    });

    it('should handle image type with prefix match', () => {
      const q = buildDriveQuery('', ['image']);
      expect(q).toContain("mimeType contains 'image/'");
    });

    it('should ignore unknown types', () => {
      const q = buildDriveQuery('', ['unknowntype']);
      // Only trashed filter should be present
      expect(q).toBe('trashed = false');
    });

    it('should escape single quotes in query', () => {
      const q = buildDriveQuery("O'Reilly", []);
      expect(q).toContain("O\\'Reilly");
    });

    it('should return only trash filter when no query or types', () => {
      const q = buildDriveQuery('', []);
      expect(q).toBe('trashed = false');
    });
  });

  // -----------------------------------------------------------------------
  // searchDriveFiles
  // -----------------------------------------------------------------------
  describe('searchDriveFiles', () => {
    it('should return not connected when user has no Google link', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await searchDriveFiles('user_123', { query: 'test' });

      expect(result.connected).toBe(false);
      expect(result.files).toEqual([]);
      expect(result.message).toContain('Connect your Google account');
    });

    it('should return connected status when user has Google link', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { accessToken: 'token', email: 'a@b.com' } }],
      });

      const result = await searchDriveFiles('user_123', { query: 'report' });

      expect(result.connected).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // searchGmailAttachments
  // -----------------------------------------------------------------------
  describe('searchGmailAttachments', () => {
    it('should return not connected when user has no Google link', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await searchGmailAttachments('user_123', { query: 'invoice' });

      expect(result.connected).toBe(false);
      expect(result.attachments).toEqual([]);
    });

    it('should return connected status when user has Google link', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { accessToken: 'token', email: 'a@b.com' } }],
      });

      const result = await searchGmailAttachments('user_123', { query: 'tax' });

      expect(result.connected).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // importToDataRoom
  // -----------------------------------------------------------------------
  describe('importToDataRoom', () => {
    it('should throw when fileName is missing', async () => {
      await expect(
        importToDataRoom({ base64Content: 'dGVzdA==' })
      ).rejects.toThrow('fileName is required');
    });

    it('should throw when base64Content is missing', async () => {
      await expect(
        importToDataRoom({ fileName: 'test.pdf' })
      ).rejects.toThrow('base64Content is required');
    });

    it('should create a document in ZeroDB', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'row-1', row_data: {} }],
      });

      const result = await importToDataRoom({
        fileName: 'report.pdf',
        base64Content: 'dGVzdA==',
        mimeType: 'application/pdf',
        companyId: 'company_456',
        userId: 'user_123',
      });

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          fileName: 'report.pdf',
          contentType: 'application/pdf',
          companyId: 'company_456',
          uploadedBy: 'user_123',
          status: 'active',
        })
      );

      expect(result.fileName).toBe('report.pdf');
      expect(result.id).toBeDefined();
      // base64Content should be stripped from the returned object
      expect(result.fileContentBase64).toBeUndefined();
    });

    it('should associate document with a data room when dataRoomId is provided', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'row-2', row_data: {} }],
      });
      DataRoom.addDocument.mockResolvedValue(true);

      const result = await importToDataRoom({
        fileName: 'contract.pdf',
        base64Content: 'dGVzdA==',
        dataRoomId: 'dr-789',
        userId: 'user_123',
      });

      expect(DataRoom.addDocument).toHaveBeenCalledWith('dr-789', expect.any(String), 'user_123');
      expect(result._dataRoomAssociationError).toBeUndefined();
    });

    it('should not fail if data room association fails', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'row-3', row_data: {} }],
      });
      DataRoom.addDocument.mockRejectedValue(new Error('Data room not found'));

      const result = await importToDataRoom({
        fileName: 'doc.pdf',
        base64Content: 'dGVzdA==',
        dataRoomId: 'nonexistent',
        userId: 'user_123',
      });

      // Document should still be created
      expect(result.fileName).toBe('doc.pdf');
      expect(result._dataRoomAssociationError).toBe('Data room not found');
      consoleSpy.mockRestore();
    });

    it('should set source and sourceMetadata correctly', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'row-4', row_data: {} }],
      });

      await importToDataRoom({
        fileName: 'invoice.pdf',
        base64Content: 'dGVzdA==',
        source: 'gmail',
        sourceMetadata: { threadId: 'thread-1', messageId: 'msg-1' },
      });

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          source: 'gmail',
          sourceMetadata: { threadId: 'thread-1', messageId: 'msg-1' },
        })
      );
    });

    it('should default mimeType to application/octet-stream', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'row-5', row_data: {} }],
      });

      await importToDataRoom({
        fileName: 'unknown.bin',
        base64Content: 'dGVzdA==',
      });

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          contentType: 'application/octet-stream',
          mimeType: 'application/octet-stream',
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // MIME_TYPE_MAP
  // -----------------------------------------------------------------------
  describe('MIME_TYPE_MAP', () => {
    it('should have entries for common document types', () => {
      expect(MIME_TYPE_MAP.pdf).toBe('application/pdf');
      expect(MIME_TYPE_MAP.csv).toBe('text/csv');
      expect(MIME_TYPE_MAP.xlsx).toBeDefined();
    });
  });
});
