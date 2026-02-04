/**
 * Fundraising Analytics Controller Tests
 *
 * Issue #196: Implement Fundraising Analytics Service
 * TDD Red Phase - Controller tests
 */

const fundraisingAnalyticsController = require('../../../controllers/fundraisingAnalyticsController');
const fundraisingAnalyticsService = require('../../../services/fundraisingAnalyticsService');

// Mock the service
jest.mock('../../../services/fundraisingAnalyticsService', () => ({
  getOverview: jest.fn(),
  getKeyMetrics: jest.fn(),
  getTimeline: jest.fn(),
  getInvestorBreakdown: jest.fn(),
  getDilutionHistory: jest.fn(),
  getBenchmarks: jest.fn(),
  getProjections: jest.fn()
}));

describe('FundraisingAnalyticsController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getOverview', () => {
    it('should return 200 with overview data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      const mockData = {
        companyId,
        totalRaised: 5500000,
        totalEquityGiven: 30,
        numberOfRounds: 2
      };
      fundraisingAnalyticsService.getOverview.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getOverview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getOverview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Company ID is required'
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getOverview.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getOverview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to get fundraising overview'
        })
      );
    });
  });

  describe('getMetrics', () => {
    it('should return 200 with metrics data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      const mockData = {
        companyId,
        preMoneyValuation: 25000000,
        postMoneyValuation: 30000000,
        averageDilution: 15
      };
      fundraisingAnalyticsService.getKeyMetrics.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Company ID is required'
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getKeyMetrics.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTimeline', () => {
    it('should return 200 with timeline data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      const mockData = {
        companyId,
        timeline: [
          { roundName: 'Seed', amountRaised: 500000, date: '2023-01-01' }
        ]
      };
      fundraisingAnalyticsService.getTimeline.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getTimeline(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getTimeline(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getTimeline.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getTimeline(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getInvestorBreakdown', () => {
    it('should return 200 with investor breakdown data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      const mockData = {
        companyId,
        totalInvestors: 5,
        byType: { 'Venture Capital': { count: 3 } }
      };
      fundraisingAnalyticsService.getInvestorBreakdown.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getInvestorBreakdown(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getInvestorBreakdown(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getInvestorBreakdown.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getInvestorBreakdown(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDilutionHistory', () => {
    it('should return 200 with dilution history data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      const mockData = {
        companyId,
        cumulativeDilution: 30,
        founderEquityRemaining: 70
      };
      fundraisingAnalyticsService.getDilutionHistory.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getDilutionHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getDilutionHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getDilutionHistory.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getDilutionHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getBenchmarks', () => {
    it('should return 200 with benchmarks data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      mockReq.query.industry = 'Technology';
      const mockData = {
        companyId,
        industry: 'Technology',
        industryBenchmarks: { seedRoundMedian: 1500000 }
      };
      fundraisingAnalyticsService.getBenchmarks.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getBenchmarks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
      expect(fundraisingAnalyticsService.getBenchmarks).toHaveBeenCalledWith(
        companyId,
        { industry: 'Technology' }
      );
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getBenchmarks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getBenchmarks.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getBenchmarks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProjections', () => {
    it('should return 200 with projections data', async () => {
      const companyId = 'company-123';
      mockReq.params.companyId = companyId;
      const mockData = {
        companyId,
        runwayMonths: 12,
        nextRoundEstimate: { mid: 10000000 },
        recommendations: []
      };
      fundraisingAnalyticsService.getProjections.mockResolvedValue(mockData);

      await fundraisingAnalyticsController.getProjections(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if companyId is missing', async () => {
      await fundraisingAnalyticsController.getProjections(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params.companyId = 'company-123';
      fundraisingAnalyticsService.getProjections.mockRejectedValue(new Error('Service error'));

      await fundraisingAnalyticsController.getProjections(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
