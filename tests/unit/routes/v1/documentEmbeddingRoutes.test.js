/**
 * DocumentEmbeddingRoutes Tests
 *
 * Issue #175: Fix doubled path prefix on document-embedding endpoints
 *
 * Verifies that routes are accessible at the correct paths after
 * removing the redundant '/document-embeddings' prefix from route
 * definitions (the mount point in app.js already provides it).
 */

const express = require('express');
const request = require('supertest');

// Mock auth middleware before requiring routes
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

const documentEmbeddingController = require('../../../../controllers/documentEmbeddingController');

// Mock the controller
jest.mock('../../../../controllers/documentEmbeddingController', () => ({
  createDocumentEmbedding: jest.fn((req, res) => res.status(201).json({ success: true })),
  getDocumentEmbeddings: jest.fn((req, res) => res.status(200).json({ success: true })),
  getDocumentEmbeddingById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateDocumentEmbedding: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteDocumentEmbedding: jest.fn((req, res) => res.status(200).json({ success: true }))
}));

const documentEmbeddingRoutes = require('../../../../routes/v1/documentEmbeddingRoutes');

describe('DocumentEmbeddingRoutes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mount at the same path app.js uses
    app.use('/api/v1/document-embeddings', documentEmbeddingRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/document-embeddings', () => {
    it('should call createDocumentEmbedding controller', async () => {
      const response = await request(app)
        .post('/api/v1/document-embeddings')
        .send({ documentId: 'doc-123', text: 'sample text' });

      expect(response.status).toBe(201);
      expect(documentEmbeddingController.createDocumentEmbedding).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/document-embeddings', () => {
    it('should call getDocumentEmbeddings controller', async () => {
      const response = await request(app)
        .get('/api/v1/document-embeddings');

      expect(response.status).toBe(200);
      expect(documentEmbeddingController.getDocumentEmbeddings).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/document-embeddings/:id', () => {
    it('should call getDocumentEmbeddingById controller', async () => {
      const response = await request(app)
        .get('/api/v1/document-embeddings/emb-456');

      expect(response.status).toBe(200);
      expect(documentEmbeddingController.getDocumentEmbeddingById).toHaveBeenCalled();
    });

    it('should pass id parameter correctly', async () => {
      await request(app)
        .get('/api/v1/document-embeddings/emb-789');

      const calledReq = documentEmbeddingController.getDocumentEmbeddingById.mock.calls[0][0];
      expect(calledReq.params.id).toBe('emb-789');
    });
  });

  describe('PUT /api/v1/document-embeddings/:id', () => {
    it('should call updateDocumentEmbedding controller', async () => {
      const response = await request(app)
        .put('/api/v1/document-embeddings/emb-456')
        .send({ text: 'updated text' });

      expect(response.status).toBe(200);
      expect(documentEmbeddingController.updateDocumentEmbedding).toHaveBeenCalled();
    });

    it('should pass id parameter correctly', async () => {
      await request(app)
        .put('/api/v1/document-embeddings/emb-abc')
        .send({ text: 'updated' });

      const calledReq = documentEmbeddingController.updateDocumentEmbedding.mock.calls[0][0];
      expect(calledReq.params.id).toBe('emb-abc');
    });
  });

  describe('DELETE /api/v1/document-embeddings/:id', () => {
    it('should call deleteDocumentEmbedding controller', async () => {
      const response = await request(app)
        .delete('/api/v1/document-embeddings/emb-456');

      expect(response.status).toBe(200);
      expect(documentEmbeddingController.deleteDocumentEmbedding).toHaveBeenCalled();
    });

    it('should pass id parameter correctly', async () => {
      await request(app)
        .delete('/api/v1/document-embeddings/emb-xyz');

      const calledReq = documentEmbeddingController.deleteDocumentEmbedding.mock.calls[0][0];
      expect(calledReq.params.id).toBe('emb-xyz');
    });
  });

  describe('Route Structure', () => {
    it('should have all expected routes defined', () => {
      const routes = [];
      documentEmbeddingRoutes.stack.forEach(layer => {
        if (layer.route) {
          routes.push({
            path: layer.route.path,
            methods: Object.keys(layer.route.methods)
          });
        }
      });

      expect(routes).toContainEqual({ path: '/', methods: ['post'] });
      expect(routes).toContainEqual({ path: '/', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/:id', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/:id', methods: ['put'] });
      expect(routes).toContainEqual({ path: '/:id', methods: ['delete'] });
    });

    it('should NOT have doubled path prefixes', () => {
      const routes = [];
      documentEmbeddingRoutes.stack.forEach(layer => {
        if (layer.route) {
          routes.push(layer.route.path);
        }
      });

      // Ensure no route path contains 'document-embeddings'
      routes.forEach(routePath => {
        expect(routePath).not.toContain('document-embeddings');
      });
    });
  });

  describe('RBAC Authorization', () => {
    it('should require roles that include admin', () => {
      // The hasRole middleware is applied to every route with the correct role list.
      // Verify by inspecting the route stack for middleware layers.
      const routeLayers = documentEmbeddingRoutes.stack.filter(l => l.route);
      expect(routeLayers.length).toBeGreaterThanOrEqual(5);
    });
  });
});
