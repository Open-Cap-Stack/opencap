/**
 * Financial Analytics Controller Test Suite
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Tests for financial analytics controller endpoints
 */

const financialAnalyticsController = require('../../../controllers/financialAnalyticsController');
const financialAnalyticsService = require('../../../services/financialAnalyticsService');

// Mock the service
jest.mock('../../../services/financialAnalyticsService');

describe('Financial Analytics Controller', () => {
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
      json: jest.fn().mockReturnThis()
    };
  });

  describe('analyzeTrends', () => {
    it('should analyze trends successfully', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        metric: 'revenue',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      const expectedResult = {
        companyId: 'COMP001',
        metric: 'revenue',
        trend: { direction: 'up', growthRate: 0.25 },
        dataPoints: []
      };

      financialAnalyticsService.analyzeTrends.mockResolvedValue(expectedResult);

      await financialAnalyticsController.analyzeTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.body = { metric: 'revenue' };

      await financialAnalyticsController.analyzeTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Company ID is required' });
    });

    it('should handle service errors', async () => {
      mockReq.body = { companyId: 'COMP001' };

      financialAnalyticsService.analyzeTrends.mockRejectedValue(new Error('Service error'));

      await financialAnalyticsController.analyzeTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to analyze trends' })
      );
    });
  });

  describe('getTrends', () => {
    it('should get trends successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { metric: 'revenue' };

      const expectedResult = {
        companyId: 'COMP001',
        metric: 'revenue',
        trend: { direction: 'up' }
      };

      financialAnalyticsService.analyzeTrends.mockResolvedValue(expectedResult);

      await financialAnalyticsController.getTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await financialAnalyticsController.getTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('calculateRatios', () => {
    it('should calculate ratios successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { category: 'liquidity' };

      const expectedResult = {
        companyId: 'COMP001',
        liquidity: { currentRatio: 2.5 }
      };

      financialAnalyticsService.calculateRatios.mockResolvedValue(expectedResult);

      await financialAnalyticsController.calculateRatios(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 404 for missing financial data', async () => {
      mockReq.params = { companyId: 'COMP001' };

      financialAnalyticsService.calculateRatios.mockRejectedValue(
        new Error('Financial data not found')
      );

      await financialAnalyticsController.calculateRatios(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await financialAnalyticsController.calculateRatios(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('benchmarkPerformance', () => {
    it('should benchmark performance successfully', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        industry: 'technology'
      };

      const expectedResult = {
        companyId: 'COMP001',
        companyMetrics: {},
        industryBenchmarks: {},
        performanceScore: 75
      };

      financialAnalyticsService.benchmarkPerformance.mockResolvedValue(expectedResult);

      await financialAnalyticsController.benchmarkPerformance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.body = { industry: 'technology' };

      await financialAnalyticsController.benchmarkPerformance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for missing company data', async () => {
      mockReq.body = { companyId: 'COMP001' };

      financialAnalyticsService.benchmarkPerformance.mockRejectedValue(
        new Error('Company financial data not found')
      );

      await financialAnalyticsController.benchmarkPerformance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getBenchmark', () => {
    it('should get benchmark successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { industry: 'technology' };

      const expectedResult = {
        companyId: 'COMP001',
        performanceScore: 80
      };

      financialAnalyticsService.benchmarkPerformance.mockResolvedValue(expectedResult);

      await financialAnalyticsController.getBenchmark(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('getFinancialSummary', () => {
    it('should get financial summary successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };

      const expectedResult = {
        companyId: 'COMP001',
        trends: {},
        ratios: {},
        highlights: []
      };

      financialAnalyticsService.getFinancialSummary.mockResolvedValue(expectedResult);

      await financialAnalyticsController.getFinancialSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await financialAnalyticsController.getFinancialSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
