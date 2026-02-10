/**
 * Waterfall Analysis Routes Unit Tests
 * Issue #56: Create waterfall analysis engine
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock auth middleware before requiring routes
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  },
  authenticate: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  }
}));

// Mock the controller before requiring routes
jest.mock('../../../../controllers/waterfallAnalysisController', () => ({
  createAnalysis: jest.fn((req, res) => res.status(201).json({ id: 'new-analysis' })),
  getAnalyses: jest.fn((req, res) => res.status(200).json([])),
  getAnalysis: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  updateAnalysis: jest.fn((req, res) => res.status(200).json({ id: req.params.id, ...req.body })),
  deleteAnalysis: jest.fn((req, res) => res.status(200).json({ message: 'Deleted' })),
  runAnalysis: jest.fn((req, res) => res.status(200).json({ id: req.params.id, status: 'calculated' })),
  compareScenarios: jest.fn((req, res) => res.status(200).json({ comparison: [] })),
  getVisualizationData: jest.fn((req, res) => res.status(200).json({ labels: [], datasets: [] })),
  exportResults: jest.fn((req, res) => res.status(200).json({ exportedAt: new Date() })),
  cloneAnalysis: jest.fn((req, res) => res.status(201).json({ id: 'cloned-analysis' })),
  finalizeAnalysis: jest.fn((req, res) => res.status(200).json({ id: req.params.id, status: 'finalized' })),
  archiveAnalysis: jest.fn((req, res) => res.status(200).json({ id: req.params.id, status: 'archived' }))
}));

const waterfallAnalysisRoutes = require('../../../../routes/v1/waterfallAnalysisRoutes');
const waterfallAnalysisController = require('../../../../controllers/waterfallAnalysisController');

describe('Waterfall Analysis Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', waterfallAnalysisRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/waterfall-analyses', () => {
    it('should create a new waterfall analysis', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses')
        .send({
          companyId: 'comp-123',
          exitValuation: 10000000,
          exitType: 'acquisition'
        });

      expect(response.status).toBe(201);
      expect(waterfallAnalysisController.createAnalysis).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/waterfall-analyses', () => {
    it('should get all waterfall analyses', async () => {
      const response = await request(app)
        .get('/api/v1/waterfall-analyses')
        .query({ companyId: 'comp-123' });

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.getAnalyses).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/waterfall-analyses/:id', () => {
    it('should get a waterfall analysis by ID', async () => {
      const response = await request(app)
        .get('/api/v1/waterfall-analyses/analysis-123');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.getAnalysis).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/waterfall-analyses/:id', () => {
    it('should update a waterfall analysis', async () => {
      const response = await request(app)
        .put('/api/v1/waterfall-analyses/analysis-123')
        .send({ exitValuation: 15000000 });

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.updateAnalysis).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/waterfall-analyses/:id', () => {
    it('should delete a waterfall analysis', async () => {
      const response = await request(app)
        .delete('/api/v1/waterfall-analyses/analysis-123');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.deleteAnalysis).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/waterfall-analyses/:id/run', () => {
    it('should run waterfall calculation', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses/analysis-123/run');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.runAnalysis).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/waterfall-analyses/compare', () => {
    it('should compare multiple scenarios', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses/compare')
        .send({ scenarioIds: ['analysis-1', 'analysis-2'] });

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.compareScenarios).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/waterfall-analyses/:id/visualization', () => {
    it('should get visualization data', async () => {
      const response = await request(app)
        .get('/api/v1/waterfall-analyses/analysis-123/visualization');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.getVisualizationData).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/waterfall-analyses/:id/export', () => {
    it('should export analysis results', async () => {
      const response = await request(app)
        .get('/api/v1/waterfall-analyses/analysis-123/export');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.exportResults).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/waterfall-analyses/:id/clone', () => {
    it('should clone an analysis', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses/analysis-123/clone')
        .send({ scenarioName: 'Cloned Scenario' });

      expect(response.status).toBe(201);
      expect(waterfallAnalysisController.cloneAnalysis).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/waterfall-analyses/:id/finalize', () => {
    it('should finalize an analysis', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses/analysis-123/finalize');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.finalizeAnalysis).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/waterfall-analyses/:id/archive', () => {
    it('should archive an analysis', async () => {
      const response = await request(app)
        .post('/api/v1/waterfall-analyses/analysis-123/archive');

      expect(response.status).toBe(200);
      expect(waterfallAnalysisController.archiveAnalysis).toHaveBeenCalled();
    });
  });
});
