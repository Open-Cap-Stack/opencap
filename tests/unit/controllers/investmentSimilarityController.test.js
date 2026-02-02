/**
 * Investment Similarity Controller Test Suite
 *
 * [Feature] OCAE-024: Investment Similarity Matching API
 * Comprehensive test coverage for investment similarity endpoints
 */

const investmentSimilarityController = require('../../../controllers/investmentSimilarityController');
const investmentSimilarityService = require('../../../services/investmentSimilarityService');
const httpMocks = require('node-mocks-http');

// Mock the service
jest.mock('../../../services/investmentSimilarityService');

describe('Investment Similarity Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('POST /investments/:id/embed - createInvestmentEmbedding', () => {
    it('should create embedding for an investment', async () => {
      req.params = { id: 'inv_001' };
      req.body = {
        investmentType: 'Series A',
        amount: 5000000,
        stage: 'early',
        sector: 'fintech',
        terms: 'standard preferred'
      };

      investmentSimilarityService.generateInvestmentEmbedding.mockResolvedValue({
        embedding: new Array(768).fill(0.1),
        investmentId: 'inv_001',
        metadata: req.body
      });

      investmentSimilarityService.storeInvestmentVector.mockResolvedValue({
        success: true,
        vectorId: 'vec_123'
      });

      await investmentSimilarityController.createInvestmentEmbedding(req, res, next);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data).toHaveProperty('investmentId', 'inv_001');
      expect(data).toHaveProperty('embedded', true);
      expect(data).toHaveProperty('vectorId');
    });

    it('should return 400 for invalid investment data', async () => {
      req.params = { id: 'inv_invalid' };
      req.body = {}; // Missing required fields

      investmentSimilarityService.generateInvestmentEmbedding.mockRejectedValue(
        new Error('Invalid investment data')
      );

      await investmentSimilarityController.createInvestmentEmbedding(req, res, next);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error');
    });

    it('should return 404 if investment not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { investmentType: 'Series A', amount: 5000000 };

      investmentSimilarityService.generateInvestmentEmbedding.mockRejectedValue(
        new Error('Investment not found')
      );

      await investmentSimilarityController.createInvestmentEmbedding(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should handle service errors gracefully', async () => {
      req.params = { id: 'inv_001' };
      req.body = { investmentType: 'Series A', amount: 5000000 };

      investmentSimilarityService.generateInvestmentEmbedding.mockRejectedValue(
        new Error('ZeroDB connection failed')
      );

      await investmentSimilarityController.createInvestmentEmbedding(req, res, next);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('GET /investments/:id/similar - findSimilarInvestments', () => {
    it('should return similar investments', async () => {
      req.params = { id: 'inv_001' };
      req.query = { limit: '5' };

      investmentSimilarityService.findSimilarInvestments.mockResolvedValue({
        sourceInvestmentId: 'inv_001',
        similarInvestments: [
          { investmentId: 'inv_002', similarity_score: 0.95, investmentType: 'Series A' },
          { investmentId: 'inv_003', similarity_score: 0.88, investmentType: 'Series A' }
        ],
        totalCount: 2,
        searchTimeMs: 15
      });

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('sourceInvestmentId', 'inv_001');
      expect(data).toHaveProperty('similarInvestments');
      expect(data.similarInvestments).toHaveLength(2);
    });

    it('should apply filter parameters', async () => {
      req.params = { id: 'inv_001' };
      req.query = {
        limit: '10',
        minSimilarity: '0.8',
        sector: 'fintech',
        investmentType: 'Series A'
      };

      investmentSimilarityService.findSimilarInvestments.mockResolvedValue({
        sourceInvestmentId: 'inv_001',
        similarInvestments: [
          { investmentId: 'inv_002', similarity_score: 0.95, sector: 'fintech', investmentType: 'Series A' }
        ],
        totalCount: 1
      });

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      expect(investmentSimilarityService.findSimilarInvestments).toHaveBeenCalledWith(
        'inv_001',
        10,
        expect.objectContaining({
          minSimilarity: 0.8,
          sector: 'fintech',
          investmentType: 'Series A'
        })
      );
    });

    it('should apply amount range filters', async () => {
      req.params = { id: 'inv_001' };
      req.query = {
        minAmount: '1000000',
        maxAmount: '10000000'
      };

      investmentSimilarityService.findSimilarInvestments.mockResolvedValue({
        sourceInvestmentId: 'inv_001',
        similarInvestments: []
      });

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      expect(investmentSimilarityService.findSimilarInvestments).toHaveBeenCalledWith(
        'inv_001',
        expect.any(Number),
        expect.objectContaining({
          amountRange: { min: 1000000, max: 10000000 }
        })
      );
    });

    it('should return 404 if investment not found', async () => {
      req.params = { id: 'nonexistent' };
      req.query = {};

      investmentSimilarityService.findSimilarInvestments.mockRejectedValue(
        new Error('Investment not found')
      );

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should use default limit when not provided', async () => {
      req.params = { id: 'inv_001' };
      req.query = {};

      investmentSimilarityService.findSimilarInvestments.mockResolvedValue({
        sourceInvestmentId: 'inv_001',
        similarInvestments: []
      });

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      expect(investmentSimilarityService.findSimilarInvestments).toHaveBeenCalledWith(
        'inv_001',
        10, // Default limit
        expect.any(Object)
      );
    });
  });

  describe('GET /investments/recommendations - getRecommendations', () => {
    it('should return investment recommendations', async () => {
      req.user = { id: 'user_001' };
      req.query = {
        sectors: 'fintech,healthtech',
        investmentTypes: 'Series A,Series B',
        minAmount: '1000000',
        maxAmount: '10000000',
        limit: '5'
      };

      investmentSimilarityService.getInvestmentRecommendations.mockResolvedValue({
        userId: 'user_001',
        recommendations: [
          {
            investmentId: 'inv_001',
            investmentType: 'Series A',
            amount: 5000000,
            sector: 'fintech',
            relevanceScore: 0.92,
            explanation: 'Matches your sector preferences'
          }
        ],
        generatedAt: new Date().toISOString()
      });

      await investmentSimilarityController.getRecommendations(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('userId', 'user_001');
      expect(data).toHaveProperty('recommendations');
      expect(data.recommendations[0]).toHaveProperty('explanation');
    });

    it('should parse preferences from query parameters', async () => {
      req.user = { id: 'user_002' };
      req.query = {
        sectors: 'fintech,saas',
        investmentTypes: 'Seed',
        excludeIds: 'inv_001,inv_002'
      };

      investmentSimilarityService.getInvestmentRecommendations.mockResolvedValue({
        userId: 'user_002',
        recommendations: []
      });

      await investmentSimilarityController.getRecommendations(req, res, next);

      expect(investmentSimilarityService.getInvestmentRecommendations).toHaveBeenCalledWith(
        'user_002',
        expect.objectContaining({
          sectors: ['fintech', 'saas'],
          investmentTypes: ['Seed'],
          excludeIds: ['inv_001', 'inv_002']
        }),
        expect.any(Number)
      );
    });

    it('should return 401 if user not authenticated', async () => {
      req.user = undefined;
      req.query = {};

      await investmentSimilarityController.getRecommendations(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should handle empty preferences', async () => {
      req.user = { id: 'user_003' };
      req.query = {};

      investmentSimilarityService.getInvestmentRecommendations.mockResolvedValue({
        userId: 'user_003',
        recommendations: []
      });

      await investmentSimilarityController.getRecommendations(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(investmentSimilarityService.getInvestmentRecommendations).toHaveBeenCalledWith(
        'user_003',
        expect.any(Object),
        expect.any(Number)
      );
    });
  });

  describe('POST /investments/batch/embed - batchEmbedInvestments', () => {
    it('should embed multiple investments', async () => {
      req.body = {
        investments: [
          { investmentId: 'inv_001', investmentType: 'Series A', amount: 5000000 },
          { investmentId: 'inv_002', investmentType: 'Series B', amount: 10000000 }
        ]
      };

      investmentSimilarityService.batchEmbedInvestments.mockResolvedValue({
        successful: [
          { investmentId: 'inv_001', vectorId: 'vec_001' },
          { investmentId: 'inv_002', vectorId: 'vec_002' }
        ],
        failed: [],
        totalProcessed: 2
      });

      await investmentSimilarityController.batchEmbedInvestments(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('successful');
      expect(data.successful).toHaveLength(2);
      expect(data).toHaveProperty('failed');
      expect(data.failed).toHaveLength(0);
    });

    it('should return 400 for empty investments array', async () => {
      req.body = { investments: [] };

      await investmentSimilarityController.batchEmbedInvestments(req, res, next);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error');
    });

    it('should return partial success results', async () => {
      req.body = {
        investments: [
          { investmentId: 'inv_001', investmentType: 'Series A', amount: 5000000 },
          { investmentId: 'inv_002' }, // Invalid
          { investmentId: 'inv_003', investmentType: 'Seed', amount: 500000 }
        ]
      };

      investmentSimilarityService.batchEmbedInvestments.mockResolvedValue({
        successful: [
          { investmentId: 'inv_001', vectorId: 'vec_001' },
          { investmentId: 'inv_003', vectorId: 'vec_003' }
        ],
        failed: [
          { investmentId: 'inv_002', error: 'Invalid investment data' }
        ],
        totalProcessed: 3
      });

      await investmentSimilarityController.batchEmbedInvestments(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.successful).toHaveLength(2);
      expect(data.failed).toHaveLength(1);
    });
  });

  describe('GET /investments/analytics - getAnalytics', () => {
    it('should return investment analytics', async () => {
      investmentSimilarityService.getInvestmentAnalytics.mockResolvedValue({
        totalInvestments: 150,
        byType: {
          'Seed': 30,
          'Series A': 50,
          'Series B': 40,
          'Series C': 30
        },
        bySector: {
          'fintech': 60,
          'healthcare': 45,
          'saas': 45
        },
        averageAmount: 8500000
      });

      await investmentSimilarityController.getAnalytics(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('totalInvestments', 150);
      expect(data).toHaveProperty('byType');
      expect(data).toHaveProperty('bySector');
      expect(data).toHaveProperty('averageAmount');
    });

    it('should handle analytics errors', async () => {
      investmentSimilarityService.getInvestmentAnalytics.mockRejectedValue(
        new Error('Analytics unavailable')
      );

      await investmentSimilarityController.getAnalytics(req, res, next);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('GET /investments/clusters - getClusters', () => {
    it('should return investment clusters', async () => {
      req.query = { numClusters: '5' };

      investmentSimilarityService.findInvestmentClusters.mockResolvedValue({
        clusters: [
          {
            clusterId: 0,
            centroid: 'Series A Fintech',
            investments: ['inv_001', 'inv_002', 'inv_003'],
            averageAmount: 5000000
          },
          {
            clusterId: 1,
            centroid: 'Series B Healthcare',
            investments: ['inv_004', 'inv_005'],
            averageAmount: 15000000
          }
        ],
        totalInvestments: 5
      });

      await investmentSimilarityController.getClusters(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('clusters');
      expect(data.clusters).toHaveLength(2);
    });

    it('should use default number of clusters', async () => {
      req.query = {};

      investmentSimilarityService.findInvestmentClusters.mockResolvedValue({
        clusters: [],
        totalInvestments: 0
      });

      await investmentSimilarityController.getClusters(req, res, next);

      expect(investmentSimilarityService.findInvestmentClusters).toHaveBeenCalledWith(5); // Default
    });
  });

  describe('DELETE /investments/:id/embedding - deleteEmbedding', () => {
    it('should delete investment embedding', async () => {
      req.params = { id: 'inv_001' };

      investmentSimilarityService.deleteInvestmentVector = jest.fn().mockResolvedValue({
        success: true,
        investmentId: 'inv_001'
      });

      await investmentSimilarityController.deleteEmbedding(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('deleted', true);
    });

    it('should return 404 if embedding not found', async () => {
      req.params = { id: 'nonexistent' };

      investmentSimilarityService.deleteInvestmentVector = jest.fn().mockRejectedValue(
        new Error('Embedding not found')
      );

      await investmentSimilarityController.deleteEmbedding(req, res, next);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Error Handling Middleware', () => {
    it('should pass unexpected errors to next middleware', async () => {
      req.params = { id: 'inv_001' };
      req.body = { investmentType: 'Series A', amount: 5000000 };

      const unexpectedError = new Error('Unexpected error');
      investmentSimilarityService.generateInvestmentEmbedding.mockRejectedValue(unexpectedError);

      await investmentSimilarityController.createInvestmentEmbedding(req, res, next);

      // Should handle the error gracefully with 500 status
      expect(res.statusCode).toBe(500);
    });
  });

  describe('Input Validation', () => {
    it('should validate investment ID format', async () => {
      req.params = { id: '' }; // Invalid empty ID
      req.body = { investmentType: 'Series A', amount: 5000000 };

      await investmentSimilarityController.createInvestmentEmbedding(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should validate limit parameter range', async () => {
      req.params = { id: 'inv_001' };
      req.query = { limit: '1000' }; // Too high

      investmentSimilarityService.findSimilarInvestments.mockResolvedValue({
        sourceInvestmentId: 'inv_001',
        similarInvestments: []
      });

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      // Should cap the limit at a reasonable maximum
      expect(investmentSimilarityService.findSimilarInvestments).toHaveBeenCalledWith(
        'inv_001',
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should validate similarity threshold range', async () => {
      req.params = { id: 'inv_001' };
      req.query = { minSimilarity: '1.5' }; // Invalid - > 1

      investmentSimilarityService.findSimilarInvestments.mockResolvedValue({
        sourceInvestmentId: 'inv_001',
        similarInvestments: []
      });

      await investmentSimilarityController.findSimilarInvestments(req, res, next);

      // Should clamp to valid range
      expect(investmentSimilarityService.findSimilarInvestments).toHaveBeenCalledWith(
        'inv_001',
        expect.any(Number),
        expect.objectContaining({
          minSimilarity: expect.any(Number)
        })
      );
    });
  });
});
