/**
 * Waterfall Analysis Controller Unit Tests
 * Issue #56: Create waterfall analysis engine
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the database adapter before requiring controller
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOne: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const waterfallAnalysisController = require('../../../controllers/waterfallAnalysisController');

describe('WaterfallAnalysisController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('createAnalysis', () => {
    it('should create a new waterfall analysis', async () => {
      const analysisData = {
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        scenarioName: 'Base Case',
        shareClasses: [
          { shareClassId: 'common', name: 'Common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', name: 'Series A', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
        ]
      };

      mockReq.body = analysisData;
      databaseAdapter.create.mockResolvedValue({ _id: 'analysis-123', ...analysisData });

      await waterfallAnalysisController.createAnalysis(mockReq, mockRes);

      expect(databaseAdapter.create).toHaveBeenCalledWith('WaterfallAnalysis', expect.objectContaining({
        companyId: 'comp-123',
        exitValuation: 10000000
      }));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = { exitValuation: 10000000 }; // Missing companyId and exitType

      await waterfallAnalysisController.createAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should auto-generate analysisId if not provided', async () => {
      mockReq.body = {
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition'
      };

      databaseAdapter.create.mockResolvedValue({ _id: 'id-123', analysisId: 'WF-ABC123', ...mockReq.body });

      await waterfallAnalysisController.createAnalysis(mockReq, mockRes);

      expect(databaseAdapter.create).toHaveBeenCalledWith('WaterfallAnalysis', expect.objectContaining({
        analysisId: expect.stringMatching(/^WF-/)
      }));
    });
  });

  describe('getAnalysis', () => {
    it('should get analysis by ID', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition'
      };

      mockReq.params.id = 'analysis-123';
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);

      await waterfallAnalysisController.getAnalysis(mockReq, mockRes);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('WaterfallAnalysis', 'analysis-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockAnalysis);
    });

    it('should return 404 if analysis not found', async () => {
      mockReq.params.id = 'nonexistent-id';
      databaseAdapter.findById.mockResolvedValue(null);

      await waterfallAnalysisController.getAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getAnalyses', () => {
    it('should get all analyses for a company', async () => {
      const mockAnalyses = [
        { _id: 'analysis-1', companyId: 'comp-123', scenarioName: 'Base Case' },
        { _id: 'analysis-2', companyId: 'comp-123', scenarioName: 'Upside Case' }
      ];

      mockReq.query = { companyId: 'comp-123' };
      databaseAdapter.find.mockResolvedValue(mockAnalyses);

      await waterfallAnalysisController.getAnalyses(mockReq, mockRes);

      expect(databaseAdapter.find).toHaveBeenCalledWith('WaterfallAnalysis', { companyId: 'comp-123' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockAnalyses);
    });

    it('should filter by exitType', async () => {
      mockReq.query = { companyId: 'comp-123', exitType: 'acquisition' };
      databaseAdapter.find.mockResolvedValue([]);

      await waterfallAnalysisController.getAnalyses(mockReq, mockRes);

      expect(databaseAdapter.find).toHaveBeenCalledWith('WaterfallAnalysis', {
        companyId: 'comp-123',
        exitType: 'acquisition'
      });
    });

    it('should filter by status', async () => {
      mockReq.query = { companyId: 'comp-123', status: 'calculated' };
      databaseAdapter.find.mockResolvedValue([]);

      await waterfallAnalysisController.getAnalyses(mockReq, mockRes);

      expect(databaseAdapter.find).toHaveBeenCalledWith('WaterfallAnalysis', {
        companyId: 'comp-123',
        status: 'calculated'
      });
    });
  });

  describe('runAnalysis', () => {
    it('should run waterfall calculation and save results', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClasses: [
          { shareClassId: 'common', name: 'Common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', name: 'Series A', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
        ]
      };

      mockReq.params.id = 'analysis-123';
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockAnalysis,
        status: 'calculated',
        results: [],
        summary: { totalDistributed: 10000000 }
      });

      await waterfallAnalysisController.runAnalysis(mockReq, mockRes);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('WaterfallAnalysis', 'analysis-123');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WaterfallAnalysis',
        'analysis-123',
        expect.objectContaining({
          status: 'calculated',
          calculatedAt: expect.any(Date)
        }),
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if analysis not found', async () => {
      mockReq.params.id = 'nonexistent-id';
      databaseAdapter.findById.mockResolvedValue(null);

      await waterfallAnalysisController.runAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateAnalysis', () => {
    it('should update analysis configuration', async () => {
      const updateData = {
        exitValuation: 15000000,
        scenarioName: 'Updated Scenario'
      };

      mockReq.params.id = 'analysis-123';
      mockReq.body = updateData;

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'analysis-123',
        ...updateData,
        status: 'draft' // Should reset to draft after update
      });

      await waterfallAnalysisController.updateAnalysis(mockReq, mockRes);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WaterfallAnalysis',
        'analysis-123',
        expect.objectContaining({
          exitValuation: 15000000,
          status: 'draft'
        }),
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if analysis not found', async () => {
      mockReq.params.id = 'nonexistent-id';
      mockReq.body = { exitValuation: 15000000 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await waterfallAnalysisController.updateAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete an analysis', async () => {
      mockReq.params.id = 'analysis-123';
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'analysis-123' });

      await waterfallAnalysisController.deleteAnalysis(mockReq, mockRes);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('WaterfallAnalysis', 'analysis-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if analysis not found', async () => {
      mockReq.params.id = 'nonexistent-id';
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await waterfallAnalysisController.deleteAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple scenarios', async () => {
      const mockAnalyses = [
        {
          _id: 'analysis-1',
          scenarioName: 'Base Case',
          exitValuation: 10000000,
          shareClasses: [
            { shareClassId: 'common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 }
          ]
        },
        {
          _id: 'analysis-2',
          scenarioName: 'Upside Case',
          exitValuation: 50000000,
          shareClasses: [
            { shareClassId: 'common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 }
          ]
        }
      ];

      mockReq.body = { scenarioIds: ['analysis-1', 'analysis-2'] };
      databaseAdapter.find.mockResolvedValue(mockAnalyses);

      await waterfallAnalysisController.compareScenarios(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        comparison: expect.any(Array)
      }));
    });

    it('should return 400 if less than 2 scenarios provided', async () => {
      mockReq.body = { scenarioIds: ['analysis-1'] };

      await waterfallAnalysisController.compareScenarios(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getVisualizationData', () => {
    it('should return chart-ready visualization data', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        exitValuation: 10000000,
        shareClasses: [
          { shareClassId: 'common', name: 'Common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', name: 'Series A', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
        ]
      };

      mockReq.params.id = 'analysis-123';
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);

      await waterfallAnalysisController.getVisualizationData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        labels: expect.any(Array),
        datasets: expect.any(Array)
      }));
    });

    it('should include sensitivity analysis if requested', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        exitValuation: 10000000,
        shareClasses: [
          { shareClassId: 'common', name: 'Common', preferenceType: 'common', totalShares: 10000000, pricePerShare: 0.001 }
        ]
      };

      mockReq.params.id = 'analysis-123';
      mockReq.query.includeSensitivity = 'true';
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);

      await waterfallAnalysisController.getVisualizationData(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        sensitivityData: expect.any(Array)
      }));
    });
  });

  describe('exportResults', () => {
    it('should export analysis results in JSON format', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        results: [],
        summary: { totalDistributed: 10000000 }
      };

      mockReq.params.id = 'analysis-123';
      mockReq.query.format = 'json';
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);

      await waterfallAnalysisController.exportResults(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should export analysis results in CSV format', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClassResults: [
          { shareClassId: 'common', shareClassName: 'Common', totalProceeds: 8000000 }
        ],
        summary: { totalDistributed: 10000000 }
      };

      mockReq.params.id = 'analysis-123';
      mockReq.query.format = 'csv';
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);

      await waterfallAnalysisController.exportResults(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should return 404 if analysis not found', async () => {
      mockReq.params.id = 'nonexistent-id';
      mockReq.query.format = 'json';
      databaseAdapter.findById.mockResolvedValue(null);

      await waterfallAnalysisController.exportResults(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cloneAnalysis', () => {
    it('should clone an existing analysis', async () => {
      const mockAnalysis = {
        _id: 'analysis-123',
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        scenarioName: 'Base Case',
        shareClasses: []
      };

      mockReq.params.id = 'analysis-123';
      mockReq.body = { scenarioName: 'Cloned Scenario' };
      databaseAdapter.findById.mockResolvedValue(mockAnalysis);
      databaseAdapter.create.mockResolvedValue({
        _id: 'analysis-456',
        ...mockAnalysis,
        scenarioName: 'Cloned Scenario',
        status: 'draft'
      });

      await waterfallAnalysisController.cloneAnalysis(mockReq, mockRes);

      expect(databaseAdapter.create).toHaveBeenCalledWith('WaterfallAnalysis', expect.objectContaining({
        scenarioName: 'Cloned Scenario',
        status: 'draft'
      }));
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockReq.params.id = 'analysis-123';
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await waterfallAnalysisController.getAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
});
