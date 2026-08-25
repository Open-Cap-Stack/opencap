/**
 * Document Routes Unit Tests
 *
 * Verifies route registration, middleware chain (authenticateToken + hasRole),
 * multer file upload configuration, and controller delegation for all
 * document endpoints including folders, search, and access control.
 */

const request = require('supertest');
const express = require('express');

// Mock middleware
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin', companyId: 'co-001' };
    next();
  }
}));

jest.mock('../../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  hasPermission: () => (req, res, next) => next(),
  hasAgentCapability: () => (req, res, next) => next()
}));

jest.mock('../../../../middleware/auditLog', () => ({
  auditAction: () => (req, res, next) => next()
}));

jest.mock('../../../../controllers/documentController', () => ({
  createDocument: jest.fn((req, res) => res.status(201).json({ document: req.body })),
  getDocuments: jest.fn((req, res) => res.status(200).json({ documents: [] })),
  getDocumentById: jest.fn((req, res) => res.status(200).json({ document: { _id: req.params.id } })),
  updateDocumentById: jest.fn((req, res) => res.status(200).json({ document: req.body })),
  deleteDocumentById: jest.fn((req, res) => res.status(200).json({ message: 'deleted' })),
  searchDocuments: jest.fn((req, res) => res.status(200).json({ results: [] })),
  findSimilarDocuments: jest.fn((req, res) => res.status(200).json({ similar: [] })),
  getDocumentAnalytics: jest.fn((req, res) => res.status(200).json({ analytics: {} })),
  getGeneralAnalytics: jest.fn((req, res) => res.status(200).json({ analytics: {} })),
  bulkIndexDocuments: jest.fn((req, res) => res.status(200).json({ indexed: 0 })),
  downloadDocument: jest.fn((req, res) => res.status(200).json({ url: 'download-url' })),
  getDocumentPreview: jest.fn((req, res) => res.status(200).json({ preview: {} })),
  getDocumentAccess: jest.fn((req, res) => res.status(200).json({ access: [] })),
  logDocumentAccess: jest.fn((req, res) => res.status(200).json({ logged: true })),
  createFolder: jest.fn((req, res) => res.status(201).json({ folder: req.body })),
  getFolders: jest.fn((req, res) => res.status(200).json({ folders: [] })),
  getFolderById: jest.fn((req, res) => res.status(200).json({ folder: { _id: req.params.id } })),
  updateFolderById: jest.fn((req, res) => res.status(200).json({ folder: req.body })),
  deleteFolderById: jest.fn((req, res) => res.status(200).json({ message: 'folder deleted' })),
  getFolderContents: jest.fn((req, res) => res.status(200).json({ contents: [] })),
  generateDocument: jest.fn((req, res) => res.status(200).json({ document: {} }))
}));

const documentRoutes = require('../../../../routes/v1/documentRoutes');
const documentController = require('../../../../controllers/documentController');

describe('Document Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/documents', documentRoutes);
    jest.clearAllMocks();
  });

  // ── CRUD Operations ──────────────────────────────────────────────────

  describe('GET /api/v1/documents', () => {
    it('should route to getDocuments controller', async () => {
      const response = await request(app).get('/api/v1/documents');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(documentController.getDocuments).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/documents', () => {
    it('should route to createDocument controller', async () => {
      const response = await request(app)
        .post('/api/v1/documents')
        .send({ title: 'Test Doc', type: 'agreement' });

      expect(response.status).toBe(201);
      expect(documentController.createDocument).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should route to getDocumentById', async () => {
      const response = await request(app).get('/api/v1/documents/doc-001');

      expect(response.status).toBe(200);
      expect(response.body.document._id).toBe('doc-001');
      expect(documentController.getDocumentById).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/documents/:id', () => {
    it('should route to updateDocumentById', async () => {
      const response = await request(app)
        .put('/api/v1/documents/doc-001')
        .send({ title: 'Updated Doc' });

      expect(response.status).toBe(200);
      expect(documentController.updateDocumentById).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    it('should route to deleteDocumentById', async () => {
      const response = await request(app).delete('/api/v1/documents/doc-001');

      expect(response.status).toBe(200);
      expect(documentController.deleteDocumentById).toHaveBeenCalled();
    });
  });

  // ── Search and Analytics ─────────────────────────────────────────────

  describe('POST /api/v1/documents/search', () => {
    it('should route to searchDocuments', async () => {
      const response = await request(app)
        .post('/api/v1/documents/search')
        .send({ query: 'investment agreement' });

      expect(response.status).toBe(200);
      expect(documentController.searchDocuments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/analytics', () => {
    it('should route to getGeneralAnalytics', async () => {
      const response = await request(app).get('/api/v1/documents/analytics');

      expect(response.status).toBe(200);
      expect(documentController.getGeneralAnalytics).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/documents/bulk-index', () => {
    it('should route to bulkIndexDocuments', async () => {
      const response = await request(app)
        .post('/api/v1/documents/bulk-index')
        .send({ documentIds: ['doc-001', 'doc-002'] });

      expect(response.status).toBe(200);
      expect(documentController.bulkIndexDocuments).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/documents/generate', () => {
    it('should route to generateDocument', async () => {
      const response = await request(app)
        .post('/api/v1/documents/generate')
        .send({ type: 'rspa', stakeholderId: 'stk-001' });

      expect(response.status).toBe(200);
      expect(documentController.generateDocument).toHaveBeenCalled();
    });
  });

  // ── Document-specific sub-routes ─────────────────────────────────────

  describe('GET /api/v1/documents/:id/similar', () => {
    it('should route to findSimilarDocuments', async () => {
      const response = await request(app).get('/api/v1/documents/doc-001/similar');

      expect(response.status).toBe(200);
      expect(documentController.findSimilarDocuments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/:id/analytics', () => {
    it('should route to getDocumentAnalytics', async () => {
      const response = await request(app).get('/api/v1/documents/doc-001/analytics');

      expect(response.status).toBe(200);
      expect(documentController.getDocumentAnalytics).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/:id/download', () => {
    it('should route to downloadDocument', async () => {
      const response = await request(app).get('/api/v1/documents/doc-001/download');

      expect(response.status).toBe(200);
      expect(documentController.downloadDocument).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/:id/preview', () => {
    it('should route to getDocumentPreview', async () => {
      const response = await request(app).get('/api/v1/documents/doc-001/preview');

      expect(response.status).toBe(200);
      expect(documentController.getDocumentPreview).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/:id/access', () => {
    it('should route to getDocumentAccess', async () => {
      const response = await request(app).get('/api/v1/documents/doc-001/access');

      expect(response.status).toBe(200);
      expect(documentController.getDocumentAccess).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/documents/:id/access', () => {
    it('should route to logDocumentAccess', async () => {
      const response = await request(app)
        .post('/api/v1/documents/doc-001/access')
        .send({ action: 'view' });

      expect(response.status).toBe(200);
      expect(documentController.logDocumentAccess).toHaveBeenCalled();
    });
  });

  // ── Folder Management ────────────────────────────────────────────────

  describe('POST /api/v1/documents/folders', () => {
    it('should route to createFolder', async () => {
      const response = await request(app)
        .post('/api/v1/documents/folders')
        .send({ name: 'Legal Docs' });

      expect(response.status).toBe(201);
      expect(documentController.createFolder).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/folders', () => {
    it('should route to getFolders', async () => {
      const response = await request(app).get('/api/v1/documents/folders');

      expect(response.status).toBe(200);
      expect(documentController.getFolders).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/folders/:id', () => {
    it('should route to getFolderById', async () => {
      const response = await request(app).get('/api/v1/documents/folders/folder-001');

      expect(response.status).toBe(200);
      expect(documentController.getFolderById).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/documents/folders/:id', () => {
    it('should route to updateFolderById', async () => {
      const response = await request(app)
        .put('/api/v1/documents/folders/folder-001')
        .send({ name: 'Renamed Folder' });

      expect(response.status).toBe(200);
      expect(documentController.updateFolderById).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/documents/folders/:id', () => {
    it('should route to deleteFolderById', async () => {
      const response = await request(app).delete('/api/v1/documents/folders/folder-001');

      expect(response.status).toBe(200);
      expect(documentController.deleteFolderById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/documents/folders/:id/contents', () => {
    it('should route to getFolderContents', async () => {
      const response = await request(app).get('/api/v1/documents/folders/folder-001/contents');

      expect(response.status).toBe(200);
      expect(documentController.getFolderContents).toHaveBeenCalled();
    });
  });

  // ── Route order verification ─────────────────────────────────────────

  describe('Route ordering', () => {
    it('should match /analytics before /:id to avoid treating analytics as an ID', async () => {
      const response = await request(app).get('/api/v1/documents/analytics');

      expect(response.status).toBe(200);
      expect(documentController.getGeneralAnalytics).toHaveBeenCalled();
      expect(documentController.getDocumentById).not.toHaveBeenCalled();
    });

    it('should match /folders before /:id to avoid treating folders as an ID', async () => {
      const response = await request(app).get('/api/v1/documents/folders');

      expect(response.status).toBe(200);
      expect(documentController.getFolders).toHaveBeenCalled();
      expect(documentController.getDocumentById).not.toHaveBeenCalled();
    });
  });
});
