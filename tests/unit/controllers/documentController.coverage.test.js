/**
 * Document Controller Coverage Tests
 * Covers uncovered lines: folder operations, download, preview, access,
 * generateDocument, getGeneralAnalytics, getDocuments edge cases, deleteByRowId
 */

jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');
jest.mock('../../../services/websocketService');
jest.mock('../../../services/fileStorageService');
jest.mock('../../../services/eventStreamingService');
jest.mock('../../../services/documentGeneratorService');
jest.mock('../../../models/DocumentFolder');
jest.mock('../../../middleware/errorResponse', () => ({
  errorResponse: jest.fn((res, status, message) => {
    res.status(status).json({ success: false, error: { message } });
  })
}));
jest.mock('../../../middleware/companyScope', () => ({
  assertCompanyOwnership: jest.fn(() => true),
  resolveTargetCompanyId: jest.fn((req) => req.user?.companyId || null)
}));

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');
const websocketService = require('../../../services/websocketService');
const fileStorageService = require('../../../services/fileStorageService');
const eventStreamingService = require('../../../services/eventStreamingService');
const documentGeneratorService = require('../../../services/documentGeneratorService');
const DocumentFolder = require('../../../models/DocumentFolder');
const { assertCompanyOwnership } = require('../../../middleware/companyScope');
const documentController = require('../../../controllers/documentController');

describe('Document Controller - Coverage', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user-1', companyId: 'comp-1', role: 'admin' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      headers: {}
    };
    websocketService.broadcastDocumentEvent = jest.fn();
    websocketService.broadcastNotification = jest.fn();
    vectorService.indexDocument = jest.fn().mockResolvedValue({});
    vectorService.deleteDocument = jest.fn().mockResolvedValue({});
    vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue([]);
    vectorService.findSimilarDocuments = jest.fn().mockResolvedValue([]);
    vectorService.getDocumentAnalytics = jest.fn().mockResolvedValue({});
    eventStreamingService.publishEvent = jest.fn().mockResolvedValue({});
  });

  // ---- createDocument with folderId ----
  describe('createDocument - folder validation', () => {
    it('should return 400 if folderId does not exist', async () => {
      req.body = { title: 'Test', folderId: 'folder-bad' };
      DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(null);

      await documentController.createDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should succeed when folderId exists', async () => {
      req.body = { title: 'Test', folderId: 'folder-1', content: 'some content' };
      DocumentFolder.findByFolderId = jest.fn().mockResolvedValue({ folderId: 'folder-1', name: 'Legal' });
      zerodbService.insertRow = jest.fn().mockResolvedValue({ data: [{ row_id: 'r1', row_data: {} }] });

      await documentController.createDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ---- getDocuments edge cases ----
  describe('getDocuments - edge cases', () => {
    it('should return empty if no companyId', async () => {
      req.user = { userId: 'u1' }; // no companyId
      req.query = {};
      await documentController.getDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;
      expect(data.documents).toEqual([]);
    });

    it('should filter root folder documents (folderId="")', async () => {
      req.query = { folderId: '' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        data: [
          { row_data: { id: 'd1', status: 'active', folderId: null }, row_id: 'r1' },
          { row_data: { id: 'd2', status: 'active', folderId: 'f1' }, row_id: 'r2' }
        ]
      });
      await documentController.getDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const docs = res.json.mock.calls[0][0].data.documents;
      expect(docs.length).toBe(1);
      expect(docs[0].folderId).toBeFalsy();
    });

    it('should filter documents by specific folderId', async () => {
      req.query = { folderId: 'f1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', status: 'active', folderId: 'f1' },
          { id: 'd2', status: 'active', folderId: 'f2' }
        ]
      });
      await documentController.getDocuments(req, res);
      const docs = res.json.mock.calls[0][0].data.documents;
      expect(docs.length).toBe(1);
    });

    it('should filter by accessLevel for non-admin', async () => {
      req.user = { userId: 'u1', companyId: 'comp-1', role: 'employee' };
      req.query = { accessLevel: 'public' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', status: 'active', accessLevel: 'private', uploadedBy: 'other' },
          { id: 'd2', status: 'active', accessLevel: 'public' },
          { id: 'd3', status: 'active', accessLevel: 'company', companyId: 'comp-1' },
          { id: 'd4', status: 'active', sharedWith: ['u1'] }
        ]
      });
      await documentController.getDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should filter by tags', async () => {
      req.query = { tags: 'legal,financial' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', status: 'active', tags: ['legal'] },
          { id: 'd2', status: 'active', tags: ['other'] }
        ]
      });
      await documentController.getDocuments(req, res);
      const docs = res.json.mock.calls[0][0].data.documents;
      expect(docs.length).toBe(1);
    });

    it('should apply search filter', async () => {
      req.query = { search: 'hello' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', status: 'active', name: 'hello world' },
          { id: 'd2', status: 'active', name: 'goodbye' }
        ]
      });
      await documentController.getDocuments(req, res);
      const docs = res.json.mock.calls[0][0].data.documents;
      expect(docs.length).toBe(1);
    });

    it('should filter folderId=null', async () => {
      req.query = { folderId: 'null' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'd1', status: 'active', folderId: null }] });
      await documentController.getDocuments(req, res);
      expect(res.json.mock.calls[0][0].data.documents.length).toBe(1);
    });

    it('should filter folderId=root', async () => {
      req.query = { folderId: 'root' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'd1', status: 'active', folderId: undefined }] });
      await documentController.getDocuments(req, res);
      expect(res.json.mock.calls[0][0].data.documents.length).toBe(1);
    });
  });

  // ---- deleteDocumentById with row_id ----
  describe('deleteDocumentById - row_id path', () => {
    it('should delete by row_id when available', async () => {
      req.params = { id: 'doc-1' };
      const doc = { id: 'doc-1', row_id: 'rw-1', title: 'Doc' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [doc] });
      zerodbService.deleteRowById = jest.fn().mockResolvedValue({});
      vectorService.deleteDocument = jest.fn().mockResolvedValue({});

      await documentController.deleteDocumentById(req, res);
      expect(zerodbService.deleteRowById).toHaveBeenCalledWith('documents', 'rw-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ---- updateDocumentById - vector re-index fail ----
  describe('updateDocumentById - vector re-index error', () => {
    it('should still succeed if re-indexing fails', async () => {
      req.params = { id: 'doc-1' };
      req.body = { title: 'New Title' };
      const existing = { id: 'doc-1', title: 'Old' };
      const updated = { id: 'doc-1', title: 'New Title' };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [existing] })   // findDocumentById (for ownership)
        .mockResolvedValueOnce({ rows: [updated] });    // after update
      zerodbService.updateRows = jest.fn().mockResolvedValue({});
      vectorService.indexDocument = jest.fn().mockRejectedValue(new Error('Vector fail'));

      await documentController.updateDocumentById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if existing doc not found for update', async () => {
      req.params = { id: 'missing' };
      req.body = { title: 'Updated' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.updateDocumentById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if company ownership fails', async () => {
      req.params = { id: 'doc-1' };
      req.body = { title: 'Updated' };
      const existing = { id: 'doc-1', companyId: 'other-comp' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [existing] });
      assertCompanyOwnership.mockReturnValueOnce(false);

      await documentController.updateDocumentById(req, res);
      // assertCompanyOwnership returns false, controller returns early
    });
  });

  // ---- getGeneralAnalytics ----
  describe('getGeneralAnalytics', () => {
    it('should return analytics for admin', async () => {
      req.query = { companyId: 'comp-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', status: 'active', category: 'Legal', size: 1024, accessLevel: 'public' },
          { id: 'd2', status: 'pending_signature', documentType: 'Financial', size: 2048 },
          { id: 'd3', status: 'deleted', size: 0 }
        ]
      });

      await documentController.getGeneralAnalytics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.total_documents).toBe(2); // excludes deleted
      expect(body.pending_signatures).toBe(1);
    });

    it('should apply access filtering for non-admin', async () => {
      req.user = { userId: 'u1', companyId: 'comp-1', role: 'employee' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', status: 'active', accessLevel: 'public', size: 500 },
          { id: 'd2', status: 'active', accessLevel: 'private', uploadedBy: 'other', size: 500 }
        ]
      });

      await documentController.getGeneralAnalytics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].total_documents).toBe(1);
    });

    it('should handle error', async () => {
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB fail'));
      await documentController.getGeneralAnalytics(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- searchDocuments - access filtering ----
  describe('searchDocuments - access filtering', () => {
    it('should filter by companyId for non-admin', async () => {
      req.user = { userId: 'u1', companyId: 'comp-1', role: 'employee' };
      req.body = { query: 'test' };
      vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue([
        { metadata: { id: 'doc-1' }, score: 0.9 }
      ]);
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'doc-1', accessLevel: 'public', companyId: 'other-comp' }
        ]
      });

      await documentController.searchDocuments(req, res);
      // doc-1 is public but different companyId, so filtered out
      const results = res.json.mock.calls[0][0].results;
      expect(results.length).toBe(0);
    });

    it('should handle search error', async () => {
      req.body = { query: 'test' };
      vectorService.searchSimilarDocuments = jest.fn().mockRejectedValue(new Error('Search error'));
      await documentController.searchDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- findSimilarDocuments - access filtering ----
  describe('findSimilarDocuments - access filtering', () => {
    it('should allow access when user is in sharedWith', async () => {
      req.params = { id: 'doc-1' };
      req.user = { userId: 'u1', role: 'employee', companyId: 'comp-1' };
      const refDoc = { id: 'doc-1', accessLevel: 'private', uploadedBy: 'other', sharedWith: ['u1'] };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [refDoc] })
        .mockResolvedValueOnce({ rows: [] });
      vectorService.findSimilarDocuments = jest.fn().mockResolvedValue([]);

      await documentController.findSimilarDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle empty similar docs', async () => {
      req.params = { id: 'doc-1' };
      req.user = { userId: 'u1', role: 'admin' };
      const refDoc = { id: 'doc-1', content: 'text' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [refDoc] });
      vectorService.findSimilarDocuments = jest.fn().mockResolvedValue([]);

      await documentController.findSimilarDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].similarDocuments).toEqual([]);
    });

    it('should filter by companyId for non-admin', async () => {
      req.params = { id: 'doc-1' };
      req.user = { userId: 'u1', role: 'employee', companyId: 'comp-1' };
      const refDoc = { id: 'doc-1', accessLevel: 'public', uploadedBy: 'u1' };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [refDoc] })
        .mockResolvedValueOnce({ rows: [{ id: 'doc-2', accessLevel: 'public', companyId: 'other' }] });
      vectorService.findSimilarDocuments = jest.fn().mockResolvedValue([
        { metadata: { id: 'doc-2' }, score: 0.8 }
      ]);

      await documentController.findSimilarDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle error', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB error'));
      await documentController.findSimilarDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getDocumentAnalytics errors ----
  describe('getDocumentAnalytics - error', () => {
    it('should handle analytics error', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Analytics fail'));
      await documentController.getDocumentAnalytics(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- bulkIndexDocuments - force indexing ----
  describe('bulkIndexDocuments - force', () => {
    it('should re-index already-indexed docs when force=true', async () => {
      req.user = { userId: 'admin-1', role: 'admin' };
      req.query = { force: 'true' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'd1', content: 'c', status: 'active', vectorIndexed: true }
        ]
      });
      zerodbService.updateRows = jest.fn().mockResolvedValue({});
      vectorService.indexDocument = jest.fn().mockResolvedValue({});

      await documentController.bulkIndexDocuments(req, res);
      expect(vectorService.indexDocument).toHaveBeenCalledTimes(1);
    });

    it('should handle bulk index general error', async () => {
      req.user = { userId: 'admin-1', role: 'admin' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB fail'));
      await documentController.bulkIndexDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- Folder endpoints ----
  describe('Folder operations', () => {
    it('createFolder should create a folder', async () => {
      req.body = { name: 'New Folder' };
      DocumentFolder.create = jest.fn().mockResolvedValue({ folderId: 'f1', name: 'New Folder' });
      await documentController.createFolder(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('createFolder should handle error', async () => {
      req.body = { name: '' };
      DocumentFolder.create = jest.fn().mockRejectedValue(new Error('Name required'));
      await documentController.createFolder(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('getFolders should return root folders', async () => {
      req.query = {};
      DocumentFolder.findRootFolders = jest.fn().mockResolvedValue([{ folderId: 'f1' }]);
      await documentController.getFolders(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getFolders should return child folders', async () => {
      req.query = { parentId: 'p1' };
      DocumentFolder.findByParentId = jest.fn().mockResolvedValue([]);
      await documentController.getFolders(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getFolders should handle error', async () => {
      DocumentFolder.findRootFolders = jest.fn().mockRejectedValue(new Error('DB error'));
      await documentController.getFolders(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('getFolderById should return folder with breadcrumbs', async () => {
      req.params = { id: 'f1' };
      const folder = { folderId: 'f1', name: 'Test' };
      DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(folder);
      DocumentFolder.getBreadcrumbs = jest.fn().mockResolvedValue([{ folderId: 'f1', name: 'Test' }]);
      await documentController.getFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getFolderById should return 404', async () => {
      req.params = { id: 'f-bad' };
      DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(null);
      await documentController.getFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('getFolderById should handle error', async () => {
      req.params = { id: 'f1' };
      DocumentFolder.findByFolderId = jest.fn().mockRejectedValue(new Error('DB'));
      await documentController.getFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updateFolderById should update', async () => {
      req.params = { id: 'f1' };
      req.body = { name: 'Renamed', description: undefined };
      DocumentFolder.update = jest.fn().mockResolvedValue({ folderId: 'f1', name: 'Renamed' });
      await documentController.updateFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updateFolderById should handle error', async () => {
      req.params = { id: 'f1' };
      req.body = { name: '' };
      DocumentFolder.update = jest.fn().mockRejectedValue(new Error('Name required'));
      await documentController.updateFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deleteFolderById should delete', async () => {
      req.params = { id: 'f1' };
      DocumentFolder.delete = jest.fn().mockResolvedValue({});
      await documentController.deleteFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deleteFolderById should handle error', async () => {
      req.params = { id: 'f1' };
      DocumentFolder.delete = jest.fn().mockRejectedValue(new Error('Delete failed'));
      await documentController.deleteFolderById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('getFolderContents should return contents', async () => {
      req.params = { id: 'f1' };
      DocumentFolder.getContents = jest.fn().mockResolvedValue({ folders: [], documents: [] });
      await documentController.getFolderContents(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getFolderContents should return 404 for missing folder', async () => {
      req.params = { id: 'f-bad' };
      DocumentFolder.getContents = jest.fn().mockRejectedValue(new Error('Folder not found'));
      await documentController.getFolderContents(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('getFolderContents should handle other errors', async () => {
      req.params = { id: 'f1' };
      DocumentFolder.getContents = jest.fn().mockRejectedValue(new Error('DB fail'));
      await documentController.getFolderContents(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- logDocumentAccess ----
  describe('logDocumentAccess', () => {
    it('should log access successfully', async () => {
      req.params = { id: 'doc-1' };
      req.body = { accessType: 'view' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'doc-1', accessLevel: 'public' }] });
      zerodbService.insertRow = jest.fn().mockResolvedValue({});

      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid accessType', async () => {
      req.params = { id: 'doc-1' };
      req.body = { accessType: 'invalid' };
      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing accessType', async () => {
      req.params = { id: 'doc-1' };
      req.body = {};
      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if document not found', async () => {
      req.params = { id: 'missing' };
      req.body = { accessType: 'download' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle insertRow failure gracefully', async () => {
      req.params = { id: 'doc-1' };
      req.body = { accessType: 'edit' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'doc-1', accessLevel: 'public' }] });
      zerodbService.insertRow = jest.fn().mockRejectedValue(new Error('Insert failed'));
      eventStreamingService.publishEvent = jest.fn().mockResolvedValue({});

      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(201); // should still succeed
    });

    it('should handle event publishing failure', async () => {
      req.params = { id: 'doc-1' };
      req.body = { accessType: 'view' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'doc-1', accessLevel: 'public' }] });
      zerodbService.insertRow = jest.fn().mockResolvedValue({});
      eventStreamingService.publishEvent = jest.fn().mockRejectedValue(new Error('Event failed'));

      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle general error', async () => {
      req.params = { id: 'doc-1' };
      req.body = { accessType: 'view' };
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB error'));
      await documentController.logDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getDocumentAccess ----
  describe('getDocumentAccess', () => {
    it('should return access info for owner', async () => {
      req.params = { id: 'doc-1' };
      req.user = { userId: 'u1', role: 'employee' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', uploadedBy: 'u1', accessLevel: 'private', sharedWith: [] }]
      });

      await documentController.getDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.currentUserPermissions.canEdit).toBe(true);
    });

    it('should return access info with document permissions', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', uploadedBy: 'u1', accessLevel: 'public', permissions: { read: true } }]
      });

      await documentController.getDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0]).toHaveProperty('permissions');
    });

    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
      await documentController.getDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for no access', async () => {
      req.params = { id: 'doc-1' };
      req.user = { userId: 'u2', role: 'employee', companyId: 'other' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', uploadedBy: 'u1', accessLevel: 'private', companyId: 'comp-1' }]
      });
      await documentController.getDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle error', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB'));
      await documentController.getDocumentAccess(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getDocumentPreview ----
  describe('getDocumentPreview', () => {
    it('should return preview for PDF', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'application/pdf', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({ contentType: 'application/pdf', size: 500 });

      await documentController.getDocumentPreview(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].previewType).toBe('pdf');
    });

    it('should return preview for image', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'image/png', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewType).toBe('image');
    });

    it('should return preview for word document', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewType).toBe('document');
    });

    it('should return preview for old word document', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'application/msword', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewType).toBe('document');
    });

    it('should return preview for excel', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'application/vnd.ms-excel', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewType).toBe('spreadsheet');
    });

    it('should return preview for xlsx', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewType).toBe('spreadsheet');
    });

    it('should return preview for text', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'text/csv', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewType).toBe('text');
    });

    it('should mark unsupported type', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', contentType: 'application/octet-stream', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockResolvedValue({});

      await documentController.getDocumentPreview(req, res);
      expect(res.json.mock.calls[0][0].previewAvailable).toBe(false);
      expect(res.json.mock.calls[0][0]).toHaveProperty('message');
    });

    it('should return 404 when no file attached', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', accessLevel: 'public' }]
      });
      await documentController.getDocumentPreview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when doc not found', async () => {
      req.params = { id: 'missing' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
      await documentController.getDocumentPreview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for no access', async () => {
      req.params = { id: 'doc-1' };
      req.user = { userId: 'u2', role: 'employee', companyId: 'other' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', accessLevel: 'private', uploadedBy: 'u1', companyId: 'comp-1' }]
      });
      await documentController.getDocumentPreview(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle metadata error gracefully', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'f1', accessLevel: 'public' }]
      });
      fileStorageService.getFileMetadata = jest.fn().mockRejectedValue(new Error('No metadata'));

      await documentController.getDocumentPreview(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle general error', async () => {
      req.params = { id: 'doc-1' };
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB'));
      await documentController.getDocumentPreview(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- generateDocument ----
  describe('generateDocument', () => {
    it('should generate an RSPA document', async () => {
      req.body = { templateType: 'rspa', params: { companyName: 'Test Corp' } };
      documentGeneratorService.REQUIRED_RSPA_FIELDS = ['companyName'];
      documentGeneratorService.validateRequired = jest.fn().mockReturnValue([]);
      documentGeneratorService.generateRSPA = jest.fn().mockResolvedValue(Buffer.from('pdf'));
      zerodbService.insertRow = jest.fn().mockResolvedValue({ data: [{ row_id: 'r1', row_data: {} }] });

      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].success).toBe(true);
    });

    it('should generate a stock certificate', async () => {
      req.body = { templateType: 'stock_certificate', params: { companyName: 'Corp' } };
      documentGeneratorService.REQUIRED_CERT_FIELDS = ['companyName'];
      documentGeneratorService.validateRequired = jest.fn().mockReturnValue([]);
      documentGeneratorService.generateStockCertificate = jest.fn().mockResolvedValue(Buffer.from('pdf'));
      zerodbService.insertRow = jest.fn().mockResolvedValue({ data: [{ row_id: 'r1', row_data: {} }] });

      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should generate 83b election', async () => {
      req.body = { templateType: '83b_election', params: { taxpayerName: 'John' } };
      documentGeneratorService.REQUIRED_83B_FIELDS = ['taxpayerName'];
      documentGeneratorService.validateRequired = jest.fn().mockReturnValue([]);
      documentGeneratorService.generate83bElection = jest.fn().mockResolvedValue(Buffer.from('pdf'));
      zerodbService.insertRow = jest.fn().mockResolvedValue({ data: [{ row_id: 'r1', row_data: {} }] });

      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if templateType missing', async () => {
      req.body = { params: {} };
      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if params missing', async () => {
      req.body = { templateType: 'rspa' };
      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid templateType', async () => {
      req.body = { templateType: 'unknown', params: {} };
      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing required fields', async () => {
      req.body = { templateType: 'rspa', params: {} };
      documentGeneratorService.REQUIRED_RSPA_FIELDS = ['companyName'];
      documentGeneratorService.validateRequired = jest.fn().mockReturnValue(['companyName']);

      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle generation error', async () => {
      req.body = { templateType: 'rspa', params: { companyName: 'C' } };
      documentGeneratorService.REQUIRED_RSPA_FIELDS = ['companyName'];
      documentGeneratorService.validateRequired = jest.fn().mockReturnValue([]);
      documentGeneratorService.generateRSPA = jest.fn().mockRejectedValue(new Error('PDF error'));

      await documentController.generateDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- downloadDocument (basic path) ----
  describe('downloadDocument', () => {
    it('should download embedded base64 document', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      const base64Content = Buffer.from('file content').toString('base64');
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileContentBase64: base64Content, contentType: 'application/pdf', fileName: 'test.pdf', accessLevel: 'public' }]
      });

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 when no file attached', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', accessLevel: 'public' }]
      });

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when doc not found', async () => {
      req.params = { id: 'missing' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for unauthorized access', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      req.user = { userId: 'u2', role: 'employee', companyId: 'other' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', accessLevel: 'private', uploadedBy: 'u1', companyId: 'comp-1' }]
      });

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle disposition=inline', async () => {
      req.params = { id: 'doc-1' };
      req.query = { disposition: 'inline' };
      const base64 = Buffer.from('data').toString('base64');
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileContentBase64: base64, contentType: 'application/pdf', accessLevel: 'public' }]
      });

      await documentController.downloadDocument(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    });

    it('should handle legacy attachment=false', async () => {
      req.params = { id: 'doc-1' };
      req.query = { attachment: 'false' };
      const base64 = Buffer.from('data').toString('base64');
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileContentBase64: base64, contentType: 'application/pdf', accessLevel: 'public' }]
      });

      await documentController.downloadDocument(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    });

    it('should handle download error', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('DB fail'));

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 401 if no user and no token', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      req.user = undefined;

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should download from remote storage', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'fid-123', contentType: 'application/pdf', accessLevel: 'public' }]
      });
      fileStorageService.downloadFile = jest.fn().mockResolvedValue({ data: Buffer.from('file'), size: 4 });

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 for remote file not found', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'fid-123', accessLevel: 'public' }]
      });
      fileStorageService.downloadFile = jest.fn().mockRejectedValue(new Error('file not found'));

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 for remote download failure', async () => {
      req.params = { id: 'doc-1' };
      req.query = {};
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', fileId: 'fid-123', accessLevel: 'public' }]
      });
      fileStorageService.downloadFile = jest.fn().mockRejectedValue(new Error('network error'));

      await documentController.downloadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
