/**
 * Route Authentication Tests
 *
 * Issue #353: Verify that API routes require authentication
 *
 * Tests that key route files return 401 when no auth token is provided.
 * Controllers are mocked so no real DB connections are needed.
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.JWT_SECRET = 'test-secret-for-route-auth-tests';

const express = require('express');
const request = require('supertest');

// Do NOT mock authMiddleware - we want the real auth check to run

// Mock all controllers used by the routes under test
jest.mock('../../../controllers/equityGrantController', () => ({
  createEquityGrant: jest.fn((req, res) => res.status(201).json({ success: true })),
  getEquityGrants: jest.fn((req, res) => res.status(200).json([])),
  getEquityGrantById: jest.fn((req, res) => res.status(200).json({})),
  updateEquityGrant: jest.fn((req, res) => res.status(200).json({})),
  deleteEquityGrant: jest.fn((req, res) => res.status(200).json({})),
  updateGrantStatus: jest.fn((req, res) => res.status(200).json({})),
  exerciseGrant: jest.fn((req, res) => res.status(200).json({})),
  getGrantsByEmployee: jest.fn((req, res) => res.status(200).json([])),
  getGrantTemplates: jest.fn((req, res) => res.status(200).json([])),
  createGrantFromTemplate: jest.fn((req, res) => res.status(201).json({})),
  getVestingSchedule: jest.fn((req, res) => res.status(200).json({})),
  getEmployeeGrantSummary: jest.fn((req, res) => res.status(200).json({})),
  calculateEquityValue: jest.fn((req, res) => res.status(200).json({}))
}));

jest.mock('../../../controllers/waterfallAnalysisController', () => ({
  createAnalysis: jest.fn((req, res) => res.status(201).json({})),
  getAnalyses: jest.fn((req, res) => res.status(200).json([])),
  getAnalysis: jest.fn((req, res) => res.status(200).json({})),
  updateAnalysis: jest.fn((req, res) => res.status(200).json({})),
  deleteAnalysis: jest.fn((req, res) => res.status(200).json({})),
  runAnalysis: jest.fn((req, res) => res.status(200).json({})),
  compareScenarios: jest.fn((req, res) => res.status(200).json({})),
  getVisualizationData: jest.fn((req, res) => res.status(200).json({})),
  exportResults: jest.fn((req, res) => res.status(200).json({})),
  cloneAnalysis: jest.fn((req, res) => res.status(201).json({})),
  finalizeAnalysis: jest.fn((req, res) => res.status(200).json({})),
  archiveAnalysis: jest.fn((req, res) => res.status(200).json({}))
}));

jest.mock('../../../controllers/activityController', () => ({
  createActivity: jest.fn((req, res) => res.status(201).json({})),
  getActivities: jest.fn((req, res) => res.status(200).json([])),
  getActivityById: jest.fn((req, res) => res.status(200).json({})),
  updateActivity: jest.fn((req, res) => res.status(200).json({})),
  deleteActivity: jest.fn((req, res) => res.status(200).json({}))
}));

jest.mock('../../../controllers/documentEmbeddingController', () => ({
  createDocumentEmbedding: jest.fn((req, res) => res.status(201).json({})),
  getDocumentEmbeddings: jest.fn((req, res) => res.status(200).json([])),
  getDocumentEmbeddingById: jest.fn((req, res) => res.status(200).json({})),
  updateDocumentEmbedding: jest.fn((req, res) => res.status(200).json({})),
  deleteDocumentEmbedding: jest.fn((req, res) => res.status(200).json({}))
}));

jest.mock('../../../models/ShareClass', () => ({
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({}),
  findById: jest.fn().mockResolvedValue(null),
  findByIdAndUpdate: jest.fn().mockResolvedValue(null),
  findByIdAndDelete: jest.fn().mockResolvedValue(null)
}));

// Mock User model used by authMiddleware
jest.mock('../../../models/User', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(null),
  getPermissionsForRole: jest.fn().mockReturnValue([]),
  updateLastLogin: jest.fn().mockResolvedValue(null)
}));

describe('Route Authentication - Unauthenticated requests return 401', () => {
  describe('Share Class Routes', () => {
    let app;

    beforeAll(() => {
      const shareClassRoutes = require('../../../routes/v1/shareClassRoutes');
      app = express();
      app.use(express.json());
      app.use('/api/v1/share-classes', shareClassRoutes);
    });

    it('GET /api/v1/share-classes should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/share-classes');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/share-classes should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/share-classes')
        .send({ name: 'Test' });
      expect(response.status).toBe(401);
    });
  });

  describe('Equity Grant Routes', () => {
    let app;

    beforeAll(() => {
      const equityGrantRoutes = require('../../../routes/v1/equityGrantRoutes');
      app = express();
      app.use(express.json());
      app.use('/api/v1/equity-grants', equityGrantRoutes);
    });

    it('GET /api/v1/equity-grants should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/equity-grants');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/equity-grants should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/equity-grants')
        .send({ employeeId: 'EMP-001' });
      expect(response.status).toBe(401);
    });
  });

  describe('Waterfall Analysis Routes', () => {
    let app;

    beforeAll(() => {
      const waterfallAnalysisRoutes = require('../../../routes/v1/waterfallAnalysisRoutes');
      app = express();
      app.use(express.json());
      app.use('/api/v1', waterfallAnalysisRoutes);
    });

    it('GET /api/v1/waterfall-analyses should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/waterfall-analyses');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/waterfall-analyses should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses')
        .send({ companyId: 'comp-123' });
      expect(response.status).toBe(401);
    });
  });

  describe('Activity Routes', () => {
    let app;

    beforeAll(() => {
      const activityRoutes = require('../../../routes/v1/activityRoutes');
      app = express();
      app.use(express.json());
      app.use('/api/v1/activities', activityRoutes);
    });

    it('GET /api/v1/activities should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/activities');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/activities should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/activities')
        .send({ type: 'test' });
      expect(response.status).toBe(401);
    });
  });

  describe('Document Embedding Routes', () => {
    let app;

    beforeAll(() => {
      const documentEmbeddingRoutes = require('../../../routes/v1/documentEmbeddingRoutes');
      app = express();
      app.use(express.json());
      app.use('/api/v1', documentEmbeddingRoutes);
    });

    it('GET /api/v1/document-embeddings should return 401 without auth token', async () => {
      const response = await request(app).get('/api/v1/document-embeddings');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/document-embeddings should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/document-embeddings')
        .send({ documentId: 'doc-123' });
      expect(response.status).toBe(401);
    });
  });
});
