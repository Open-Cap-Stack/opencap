/**
 * Advanced Analytics Controller Test Suite
 *
 * [Feature] Issue #31: Implement advanced analytics with ZeroDB
 * Comprehensive test coverage for advanced analytics controller endpoints
 */

const advancedAnalyticsController = require('../../../controllers/advancedAnalyticsController');
const advancedAnalyticsService = require('../../../services/advancedAnalyticsService');

// Mock the service
jest.mock('../../../services/advancedAnalyticsService');

describe('Advanced Analytics Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'USER001' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('GET /api/v1/analytics/cap-table/:companyId', () => {
    it('should return cap table summary', async () => {
      mockReq.params = { companyId: 'COMP001' };

      advancedAnalyticsService.getCapTableSummary.mockResolvedValue({
        companyId: 'COMP001',
        totalAuthorizedShares: 10000000,
        totalDilutedShares: 8000000,
        shareClasses: [{ name: 'Common', ownershipPercentage: 80 }],
        stakeholders: [{ name: 'Founder 1', equityHoldings: 40 }]
      });

      await advancedAnalyticsController.getCapTableSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'COMP001',
          totalAuthorizedShares: 10000000
        })
      );
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.getCapTableSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Company ID is required' })
      );
    });

    it('should return 500 on service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.getCapTableSummary.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getCapTableSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get cap table summary' })
      );
    });
  });

  describe('POST /api/v1/analytics/dilution', () => {
    it('should calculate dilution analysis', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        newInvestment: {
          amount: 1000000,
          preMoneyValuation: 10000000,
          shareClassName: 'Series A'
        }
      };

      advancedAnalyticsService.getDilutionAnalysis.mockResolvedValue({
        preDilution: { foundersOwnership: 100 },
        postDilution: { foundersOwnership: 90.91 },
        dilutionPercentage: 9.09,
        newInvestorOwnership: 9.09
      });

      await advancedAnalyticsController.getDilutionAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          dilutionPercentage: 9.09
        })
      );
    });

    it('should return 400 for invalid investment data', async () => {
      mockReq.body = {
        companyId: 'COMP001'
      };

      await advancedAnalyticsController.getDilutionAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Investment data is required' })
      );
    });
  });

  describe('GET /api/v1/analytics/investment-trends/:companyId', () => {
    it('should return investment trends', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      advancedAnalyticsService.getInvestmentTrends.mockResolvedValue({
        trend: 'growing',
        revenueGrowthRate: 0.25,
        quarterOverQuarter: [
          { period: 'Q1-2023', revenue: 100000 },
          { period: 'Q2-2023', revenue: 125000 }
        ]
      });

      await advancedAnalyticsController.getInvestmentTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          trend: 'growing'
        })
      );
    });

    it('should use default time range if not provided', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = {};

      advancedAnalyticsService.getInvestmentTrends.mockResolvedValue({
        trend: 'stable',
        revenueGrowthRate: 0.05
      });

      await advancedAnalyticsController.getInvestmentTrends(mockReq, mockRes);

      expect(advancedAnalyticsService.getInvestmentTrends).toHaveBeenCalledWith(
        'COMP001',
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        })
      );
    });
  });

  describe('GET /api/v1/analytics/stakeholder-insights/:companyId', () => {
    it('should return stakeholder insights', async () => {
      mockReq.params = { companyId: 'COMP001' };

      advancedAnalyticsService.getStakeholderInsights.mockResolvedValue({
        roleDistribution: { Founder: 60, Investor: 30, Employee: 10 },
        topStakeholders: [
          { name: 'Founder 1', equityHoldings: 40 }
        ],
        concentrationIndex: 0.45,
        concentrationLevel: 'moderate'
      });

      await advancedAnalyticsController.getStakeholderInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          concentrationLevel: 'moderate'
        })
      );
    });
  });

  describe('GET /api/v1/analytics/documents/:companyId', () => {
    it('should return document analytics', async () => {
      mockReq.params = { companyId: 'COMP001' };

      advancedAnalyticsService.getDocumentAnalytics.mockResolvedValue({
        totalDocuments: 50,
        documentsByType: {
          financial_report: 20,
          compliance_doc: 15,
          legal_agreement: 15
        },
        activityMetrics: {
          recentDocuments: 5,
          averagePerMonth: 4.2
        }
      });

      await advancedAnalyticsController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalDocuments: 50
        })
      );
    });
  });

  describe('POST /api/v1/analytics/predictive-insights', () => {
    it('should return predictive insights', async () => {
      mockReq.body = { companyId: 'COMP001' };

      advancedAnalyticsService.getPredictiveInsights.mockResolvedValue({
        predictedGrowthRate: 0.22,
        similarCompanies: [
          { companyId: 'COMP002', similarity: 0.92 }
        ],
        confidenceScore: 0.85
      });

      await advancedAnalyticsController.getPredictiveInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          predictedGrowthRate: 0.22
        })
      );
    });
  });

  describe('POST /api/v1/analytics/predict-investment', () => {
    it('should predict investment outcome', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        investmentScenario: {
          amount: 2000000,
          investmentType: 'Series A'
        }
      };

      advancedAnalyticsService.predictInvestmentOutcome.mockResolvedValue({
        predictedGrowth: 0.35,
        expectedValuation: 15000000,
        riskAssessment: { level: 'medium', factors: ['market_volatility'] }
      });

      await advancedAnalyticsController.predictInvestmentOutcome(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          predictedGrowth: 0.35
        })
      );
    });
  });

  describe('GET /api/v1/analytics/time-series/:companyId', () => {
    it('should return time-series analysis', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { metric: 'revenue' };

      advancedAnalyticsService.getTimeSeriesAnalysis.mockResolvedValue({
        trend: { direction: 'up', strength: 0.8 },
        seasonality: { detected: true, peakQuarter: 'Q4' },
        volatility: 0.15
      });

      await advancedAnalyticsController.getTimeSeriesAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          seasonality: expect.objectContaining({ detected: true })
        })
      );
    });

    it('should default to revenue metric', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = {};

      advancedAnalyticsService.getTimeSeriesAnalysis.mockResolvedValue({
        trend: { direction: 'stable' }
      });

      await advancedAnalyticsController.getTimeSeriesAnalysis(mockReq, mockRes);

      expect(advancedAnalyticsService.getTimeSeriesAnalysis).toHaveBeenCalledWith(
        'COMP001',
        'revenue'
      );
    });
  });

  describe('GET /api/v1/analytics/stakeholder-cohorts/:companyId', () => {
    it('should return stakeholder cohorts', async () => {
      mockReq.params = { companyId: 'COMP001' };

      advancedAnalyticsService.getStakeholderCohorts.mockResolvedValue({
        cohorts: {
          '2020': { count: 2, totalEquity: 55 },
          '2021': { count: 1, totalEquity: 15 }
        },
        retentionByYear: {
          '2020': 100,
          '2021': 100
        }
      });

      await advancedAnalyticsController.getStakeholderCohorts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          cohorts: expect.any(Object)
        })
      );
    });
  });

  describe('POST /api/v1/analytics/custom-report', () => {
    it('should generate custom report', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        reportConfig: {
          metrics: ['revenue', 'stakeholders'],
          timeRange: { start: '2023-01-01', end: '2023-12-31' },
          format: 'detailed'
        }
      };

      advancedAnalyticsService.generateCustomReport.mockResolvedValue({
        report: {
          revenue: { total: 500000, growth: 0.2 },
          stakeholders: { count: 10, distribution: {} }
        },
        generatedAt: new Date(),
        exportable: true
      });

      await advancedAnalyticsController.generateCustomReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          report: expect.any(Object)
        })
      );
    });

    it('should return 400 for missing report config', async () => {
      mockReq.body = { companyId: 'COMP001' };

      await advancedAnalyticsController.generateCustomReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Report configuration is required' })
      );
    });
  });

  describe('GET /api/v1/analytics/forecast/:companyId', () => {
    it('should return revenue forecast', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { periods: '4' };

      advancedAnalyticsService.forecastRevenue.mockResolvedValue({
        forecasts: [
          { period: 1, predictedRevenue: 200000, confidence: 0.9 },
          { period: 2, predictedRevenue: 220000, confidence: 0.85 }
        ],
        confidence: 0.87
      });

      await advancedAnalyticsController.forecastRevenue(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          forecasts: expect.any(Array)
        })
      );
    });
  });

  describe('GET /api/v1/analytics/similar-companies/:companyId', () => {
    it('should return similar performing companies', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { limit: '5' };

      advancedAnalyticsService.findSimilarPerformingCompanies.mockResolvedValue({
        sourceCompanyId: 'COMP001',
        similarCompanies: [
          { companyId: 'COMP002', similarity: 0.92 },
          { companyId: 'COMP003', similarity: 0.88 }
        ]
      });

      await advancedAnalyticsController.findSimilarCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          similarCompanies: expect.any(Array)
        })
      );
    });
  });

  describe('POST /api/v1/analytics/store-snapshot', () => {
    it('should store analytics snapshot', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        analyticsData: {
          capTable: { totalShares: 10000000 },
          trends: { growth: 0.15 }
        }
      };

      advancedAnalyticsService.storeAnalyticsSnapshot.mockResolvedValue({
        success: true,
        snapshotId: 'SNAP001'
      });

      await advancedAnalyticsController.storeAnalyticsSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe('POST /api/v1/analytics/batch-metrics', () => {
    it('should return batch metrics for multiple companies', async () => {
      mockReq.body = {
        companyIds: ['COMP001', 'COMP002', 'COMP003'],
        metric: 'revenue'
      };

      advancedAnalyticsService.batchGetMetrics.mockResolvedValue([
        { companyId: 'COMP001', metric: 'revenue', value: 100000 },
        { companyId: 'COMP002', metric: 'revenue', value: 150000 },
        { companyId: 'COMP003', metric: 'revenue', value: 200000 }
      ]);

      await advancedAnalyticsController.batchGetMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ companyId: 'COMP001' })
        ])
      );
    });

    it('should return 400 for missing company IDs', async () => {
      mockReq.body = { metric: 'revenue' };

      await advancedAnalyticsController.batchGetMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Company IDs are required' })
      );
    });

    it('should return 400 for missing metric', async () => {
      mockReq.body = { companyIds: ['COMP001'] };

      await advancedAnalyticsController.batchGetMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Metric is required' })
      );
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { companyIds: ['COMP001'], metric: 'revenue' };
      advancedAnalyticsService.batchGetMetrics.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.batchGetMetrics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Error handling for all endpoints', () => {
    it('should handle dilution analysis service error', async () => {
      mockReq.body = { companyId: 'COMP001', newInvestment: { amount: 1000000 } };
      advancedAnalyticsService.getDilutionAnalysis.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getDilutionAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate dilution analysis' })
      );
    });

    it('should handle investment trends service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.getInvestmentTrends.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getInvestmentTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get investment trends' })
      );
    });

    it('should handle stakeholder insights service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.getStakeholderInsights.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getStakeholderInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get stakeholder insights' })
      );
    });

    it('should handle document analytics service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.getDocumentAnalytics.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get document analytics' })
      );
    });

    it('should handle predictive insights service error', async () => {
      mockReq.body = { companyId: 'COMP001' };
      advancedAnalyticsService.getPredictiveInsights.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getPredictiveInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get predictive insights' })
      );
    });

    it('should handle investment prediction service error', async () => {
      mockReq.body = { companyId: 'COMP001', investmentScenario: { amount: 1000000 } };
      advancedAnalyticsService.predictInvestmentOutcome.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.predictInvestmentOutcome(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to predict investment outcome' })
      );
    });

    it('should handle time-series analysis service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.getTimeSeriesAnalysis.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getTimeSeriesAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get time-series analysis' })
      );
    });

    it('should handle stakeholder cohorts service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.getStakeholderCohorts.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.getStakeholderCohorts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get stakeholder cohorts' })
      );
    });

    it('should handle custom report generation service error', async () => {
      mockReq.body = { companyId: 'COMP001', reportConfig: { metrics: ['revenue'] } };
      advancedAnalyticsService.generateCustomReport.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.generateCustomReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to generate custom report' })
      );
    });

    it('should handle revenue forecast service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.forecastRevenue.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.forecastRevenue(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to forecast revenue' })
      );
    });

    it('should handle find similar companies service error', async () => {
      mockReq.params = { companyId: 'COMP001' };
      advancedAnalyticsService.findSimilarPerformingCompanies.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.findSimilarCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to find similar companies' })
      );
    });

    it('should handle store snapshot service error', async () => {
      mockReq.body = { companyId: 'COMP001', analyticsData: { test: 'data' } };
      advancedAnalyticsService.storeAnalyticsSnapshot.mockRejectedValue(new Error('Service error'));

      await advancedAnalyticsController.storeAnalyticsSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to store analytics snapshot' })
      );
    });
  });

  describe('Missing companyId validation', () => {
    it('should return 400 for missing companyId in dilution analysis', async () => {
      mockReq.body = { newInvestment: { amount: 1000000 } };

      await advancedAnalyticsController.getDilutionAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Company ID is required' })
      );
    });

    it('should return 400 for missing companyId in investment trends', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.getInvestmentTrends(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in stakeholder insights', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.getStakeholderInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in document analytics', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in predictive insights', async () => {
      mockReq.body = {};

      await advancedAnalyticsController.getPredictiveInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in investment prediction', async () => {
      mockReq.body = { investmentScenario: { amount: 1000000 } };

      await advancedAnalyticsController.predictInvestmentOutcome(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing investment scenario', async () => {
      mockReq.body = { companyId: 'COMP001' };

      await advancedAnalyticsController.predictInvestmentOutcome(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Investment scenario is required' })
      );
    });

    it('should return 400 for missing companyId in time-series analysis', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.getTimeSeriesAnalysis(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in stakeholder cohorts', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.getStakeholderCohorts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in custom report', async () => {
      mockReq.body = { reportConfig: { metrics: ['revenue'] } };

      await advancedAnalyticsController.generateCustomReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in revenue forecast', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.forecastRevenue(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in similar companies', async () => {
      mockReq.params = {};

      await advancedAnalyticsController.findSimilarCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing companyId in store snapshot', async () => {
      mockReq.body = { analyticsData: { test: 'data' } };

      await advancedAnalyticsController.storeAnalyticsSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing analytics data in store snapshot', async () => {
      mockReq.body = { companyId: 'COMP001' };

      await advancedAnalyticsController.storeAnalyticsSnapshot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Analytics data is required' })
      );
    });
  });
});
