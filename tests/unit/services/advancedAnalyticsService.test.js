/**
 * Advanced Analytics Service Test Suite
 *
 * [Feature] Issue #31: Implement advanced analytics with ZeroDB
 * Comprehensive test coverage for advanced analytics features including:
 * - Cap table analytics
 * - Investment trends
 * - Stakeholder insights
 * - Document analytics
 * - Vector-based predictions
 * - Time-series analysis
 * - Cohort analysis
 */

const advancedAnalyticsService = require('../../../services/advancedAnalyticsService');
const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');
const FinancialReport = require('../../../models/financialReport');
const ShareClass = require('../../../models/ShareClass');
const Stakeholder = require('../../../models/Stakeholder');
const Company = require('../../../models/Company');

// Mock external services
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');
jest.mock('../../../models/financialReport');
jest.mock('../../../models/ShareClass');
jest.mock('../../../models/Stakeholder');
jest.mock('../../../models/Company');

describe('Advanced Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    vectorService.generateEmbedding = jest.fn().mockResolvedValue(new Array(768).fill(0.1));
    zerodbService.queryTable = jest.fn().mockResolvedValue([]);
    zerodbService.insertRows = jest.fn().mockResolvedValue({ success: true });
    zerodbService.searchVectors = jest.fn().mockResolvedValue({
      vectors: [],
      search_time_ms: 10
    });
    zerodbService.upsertVector = jest.fn().mockResolvedValue({ success: true });
  });

  describe('Cap Table Analytics', () => {
    describe('getCapTableSummary', () => {
      it('should return cap table summary for a company', async () => {
        const companyId = 'COMP001';

        ShareClass.find = jest.fn().mockResolvedValue([
          { shareClassId: 'SC001', name: 'Common', authorizedShares: 10000000, dilutedShares: 5000000, ownershipPercentage: 50 },
          { shareClassId: 'SC002', name: 'Preferred A', authorizedShares: 3000000, dilutedShares: 2000000, ownershipPercentage: 30 }
        ]);

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Founder 1', role: 'Founder', equityHoldings: 25 },
          { stakeholderId: 'SH002', name: 'Employee 1', role: 'Employee', equityHoldings: 15 }
        ]);

        const result = await advancedAnalyticsService.getCapTableSummary(companyId);

        expect(result).toBeDefined();
        expect(result.companyId).toBe(companyId);
        expect(result.totalAuthorizedShares).toBe(13000000);
        expect(result.totalDilutedShares).toBe(7000000);
        expect(result.shareClasses).toHaveLength(2);
        // Only stakeholders with equity positions and non-investor roles are included
        expect(result.stakeholders).toHaveLength(2);
      });

      it('should calculate ownership distribution correctly', async () => {
        const companyId = 'COMP002';

        ShareClass.find = jest.fn().mockResolvedValue([
          { shareClassId: 'SC001', name: 'Common', authorizedShares: 10000000, dilutedShares: 8000000, ownershipPercentage: 80 },
          { shareClassId: 'SC002', name: 'Options', authorizedShares: 2000000, dilutedShares: 2000000, ownershipPercentage: 20 }
        ]);

        Stakeholder.find = jest.fn().mockResolvedValue([]);

        const result = await advancedAnalyticsService.getCapTableSummary(companyId);

        expect(result.ownershipDistribution).toBeDefined();
        expect(result.ownershipDistribution.Common).toBe(80);
        expect(result.ownershipDistribution.Options).toBe(20);
      });

      it('should throw error for invalid company ID', async () => {
        await expect(advancedAnalyticsService.getCapTableSummary(null))
          .rejects.toThrow('Company ID is required');
      });

      it('should return empty summary when no share classes exist', async () => {
        const companyId = 'COMP003';

        ShareClass.find = jest.fn().mockResolvedValue([]);

        Stakeholder.find = jest.fn().mockResolvedValue([]);

        const result = await advancedAnalyticsService.getCapTableSummary(companyId);

        expect(result.totalAuthorizedShares).toBe(0);
        expect(result.totalDilutedShares).toBe(0);
        expect(result.shareClasses).toHaveLength(0);
      });
    });

    describe('getDilutionAnalysis', () => {
      it('should analyze dilution scenarios', async () => {
        const companyId = 'COMP001';
        const newInvestment = {
          amount: 1000000,
          preMoneyValuation: 10000000,
          shareClassName: 'Series A'
        };

        ShareClass.find = jest.fn().mockResolvedValue([
          { shareClassId: 'SC001', name: 'Common', authorizedShares: 10000000, dilutedShares: 10000000, ownershipPercentage: 100 }
        ]);

        const result = await advancedAnalyticsService.getDilutionAnalysis(companyId, newInvestment);

        expect(result).toBeDefined();
        expect(result.preDilution).toBeDefined();
        expect(result.postDilution).toBeDefined();
        expect(result.dilutionPercentage).toBeDefined();
        expect(result.newInvestorOwnership).toBeCloseTo(9.09, 1);
      });

      it('should handle multiple dilution rounds', async () => {
        const companyId = 'COMP002';
        const rounds = [
          { amount: 500000, preMoneyValuation: 5000000, shareClassName: 'Seed' },
          { amount: 2000000, preMoneyValuation: 15000000, shareClassName: 'Series A' }
        ];

        ShareClass.find = jest.fn().mockResolvedValue([
          { shareClassId: 'SC001', name: 'Common', authorizedShares: 5000000, dilutedShares: 5000000, ownershipPercentage: 100 }
        ]);

        const result = await advancedAnalyticsService.getMultiRoundDilution(companyId, rounds);

        expect(result).toBeDefined();
        expect(result.rounds).toHaveLength(2);
        expect(result.totalDilution).toBeDefined();
        expect(result.finalFounderOwnership).toBeDefined();
      });
    });
  });

  describe('Investment Trends', () => {
    describe('getInvestmentTrends', () => {
      it('should analyze investment trends over time', async () => {
        const companyId = 'COMP001';
        const timeRange = { start: new Date('2023-01-01'), end: new Date('2024-01-01') };

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000, reportDate: new Date('2023-03-31') },
          { reportingPeriod: 'Q2-2023', totalRevenue: 120000, totalExpenses: 85000, netIncome: 35000, reportDate: new Date('2023-06-30') },
          { reportingPeriod: 'Q3-2023', totalRevenue: 150000, totalExpenses: 90000, netIncome: 60000, reportDate: new Date('2023-09-30') },
          { reportingPeriod: 'Q4-2023', totalRevenue: 180000, totalExpenses: 100000, netIncome: 80000, reportDate: new Date('2023-12-31') }
        ]);

        const result = await advancedAnalyticsService.getInvestmentTrends(companyId, timeRange);

        expect(result).toBeDefined();
        expect(result.trend).toBe('growing');
        expect(result.revenueGrowthRate).toBeGreaterThan(0);
        expect(result.quarterOverQuarter).toHaveLength(4);
      });

      it('should identify declining trends', async () => {
        const companyId = 'COMP002';
        const timeRange = { start: new Date('2023-01-01'), end: new Date('2024-01-01') };

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 200000, totalExpenses: 100000, netIncome: 100000, reportDate: new Date('2023-03-31') },
          { reportingPeriod: 'Q2-2023', totalRevenue: 180000, totalExpenses: 100000, netIncome: 80000, reportDate: new Date('2023-06-30') },
          { reportingPeriod: 'Q3-2023', totalRevenue: 150000, totalExpenses: 100000, netIncome: 50000, reportDate: new Date('2023-09-30') },
          { reportingPeriod: 'Q4-2023', totalRevenue: 120000, totalExpenses: 100000, netIncome: 20000, reportDate: new Date('2023-12-31') }
        ]);

        const result = await advancedAnalyticsService.getInvestmentTrends(companyId, timeRange);

        expect(result.trend).toBe('declining');
        expect(result.revenueGrowthRate).toBeLessThan(0);
      });

      it('should calculate moving averages', async () => {
        const companyId = 'COMP003';
        const timeRange = { start: new Date('2023-01-01'), end: new Date('2024-01-01') };

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000, reportDate: new Date('2023-03-31') },
          { reportingPeriod: 'Q2-2023', totalRevenue: 120000, reportDate: new Date('2023-06-30') },
          { reportingPeriod: 'Q3-2023', totalRevenue: 110000, reportDate: new Date('2023-09-30') },
          { reportingPeriod: 'Q4-2023', totalRevenue: 130000, reportDate: new Date('2023-12-31') }
        ]);

        const result = await advancedAnalyticsService.getInvestmentTrends(companyId, timeRange);

        expect(result.movingAverage).toBeDefined();
        expect(result.movingAverage.threeQuarter).toBeCloseTo(120000, -2);
      });
    });

    describe('forecastRevenue', () => {
      it('should forecast future revenue based on historical data', async () => {
        const companyId = 'COMP001';
        const periods = 4;

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000, reportDate: new Date('2023-03-31') },
          { reportingPeriod: 'Q2-2023', totalRevenue: 120000, reportDate: new Date('2023-06-30') },
          { reportingPeriod: 'Q3-2023', totalRevenue: 144000, reportDate: new Date('2023-09-30') },
          { reportingPeriod: 'Q4-2023', totalRevenue: 172800, reportDate: new Date('2023-12-31') }
        ]);

        const result = await advancedAnalyticsService.forecastRevenue(companyId, periods);

        expect(result).toBeDefined();
        expect(result.forecasts).toHaveLength(periods);
        expect(result.forecasts[0].predictedRevenue).toBeGreaterThan(172800);
        expect(result.confidence).toBeDefined();
      });
    });
  });

  describe('Stakeholder Insights', () => {
    describe('getStakeholderInsights', () => {
      it('should provide stakeholder distribution analysis', async () => {
        const companyId = 'COMP001';

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Founder 1', role: 'Founder', equityHoldings: 40 },
          { stakeholderId: 'SH002', name: 'Founder 2', role: 'Founder', equityHoldings: 30 },
          { stakeholderId: 'SH003', name: 'Investor 1', role: 'Investor', equityHoldings: 15 },
          { stakeholderId: 'SH004', name: 'Employee 1', role: 'Employee', equityHoldings: 5 },
          { stakeholderId: 'SH005', name: 'Advisor 1', role: 'Advisor', equityHoldings: 2 }
        ]);

        const result = await advancedAnalyticsService.getStakeholderInsights(companyId);

        expect(result).toBeDefined();
        expect(result.roleDistribution).toBeDefined();
        expect(result.roleDistribution.Founder).toBe(70);
        expect(result.roleDistribution.Investor).toBe(15);
        expect(result.topStakeholders).toHaveLength(3);
      });

      it('should calculate concentration metrics', async () => {
        const companyId = 'COMP002';

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Major Holder', role: 'Founder', equityHoldings: 80 },
          { stakeholderId: 'SH002', name: 'Minor Holder', role: 'Investor', equityHoldings: 20 }
        ]);

        const result = await advancedAnalyticsService.getStakeholderInsights(companyId);

        expect(result.concentrationIndex).toBeDefined();
        expect(result.concentrationIndex).toBeGreaterThan(0.5);
        expect(result.concentrationLevel).toBe('high');
      });

      it('should identify stakeholder risks', async () => {
        const companyId = 'COMP003';

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Single Founder', role: 'Founder', equityHoldings: 95 }
        ]);

        const result = await advancedAnalyticsService.getStakeholderInsights(companyId);

        expect(result.risks).toBeDefined();
        expect(result.risks).toContainEqual(
          expect.objectContaining({ type: 'key_person_dependency' })
        );
      });
    });
  });

  describe('Document Analytics', () => {
    describe('getDocumentAnalytics', () => {
      it('should analyze document patterns using ZeroDB', async () => {
        const companyId = 'COMP001';

        zerodbService.queryTable.mockResolvedValue([
          { document_id: 'DOC001', type: 'financial_report', created_at: new Date('2023-01-15') },
          { document_id: 'DOC002', type: 'financial_report', created_at: new Date('2023-02-15') },
          { document_id: 'DOC003', type: 'compliance_doc', created_at: new Date('2023-03-15') },
          { document_id: 'DOC004', type: 'legal_agreement', created_at: new Date('2023-04-15') }
        ]);

        const result = await advancedAnalyticsService.getDocumentAnalytics(companyId);

        expect(result).toBeDefined();
        expect(result.totalDocuments).toBe(4);
        expect(result.documentsByType.financial_report).toBe(2);
        expect(result.documentsByType.compliance_doc).toBe(1);
      });

      it('should calculate document activity metrics', async () => {
        const companyId = 'COMP002';
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        zerodbService.queryTable.mockResolvedValue([
          { document_id: 'DOC001', type: 'financial_report', created_at: now },
          { document_id: 'DOC002', type: 'financial_report', created_at: now },
          { document_id: 'DOC003', type: 'compliance_doc', created_at: oneMonthAgo }
        ]);

        const result = await advancedAnalyticsService.getDocumentAnalytics(companyId);

        expect(result.activityMetrics).toBeDefined();
        expect(result.activityMetrics.recentDocuments).toBe(2);
        expect(result.activityMetrics.averagePerMonth).toBeDefined();
      });
    });
  });

  describe('Vector-Based Predictions', () => {
    describe('getPredictiveInsights', () => {
      it('should generate predictions using vector embeddings', async () => {
        const companyId = 'COMP001';

        Company.findOne = jest.fn().mockResolvedValue({
          companyId: 'COMP001',
          CompanyName: 'TechCorp',
          CompanyType: 'startup',
          industry: 'Technology'
        });

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: {
                company_id: 'COMP002',
                company_name: 'SimilarTech',
                growth_rate: 0.25,
                revenue: 5000000
              },
              similarity_score: 0.92
            },
            {
              vector_metadata: {
                company_id: 'COMP003',
                company_name: 'AnotherTech',
                growth_rate: 0.18,
                revenue: 3000000
              },
              similarity_score: 0.85
            }
          ],
          search_time_ms: 15
        });

        const result = await advancedAnalyticsService.getPredictiveInsights(companyId);

        expect(result).toBeDefined();
        expect(result.predictedGrowthRate).toBeDefined();
        expect(result.similarCompanies).toHaveLength(2);
        expect(result.confidenceScore).toBeGreaterThan(0);
      });

      it('should predict potential investment outcomes', async () => {
        const companyId = 'COMP001';
        const investmentScenario = {
          amount: 2000000,
          investmentType: 'Series A'
        };

        Company.findOne = jest.fn().mockResolvedValue({
          companyId: 'COMP001',
          CompanyName: 'TechCorp',
          CompanyType: 'startup',
          industry: 'Technology'
        });

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: {
                company_id: 'COMP002',
                post_investment_growth: 0.35,
                exit_valuation: 50000000
              },
              similarity_score: 0.88
            }
          ],
          search_time_ms: 10
        });

        const result = await advancedAnalyticsService.predictInvestmentOutcome(companyId, investmentScenario);

        expect(result).toBeDefined();
        expect(result.predictedGrowth).toBeDefined();
        expect(result.expectedValuation).toBeDefined();
        expect(result.riskAssessment).toBeDefined();
      });
    });

    describe('findSimilarPerformingCompanies', () => {
      it('should find companies with similar performance patterns', async () => {
        const companyId = 'COMP001';

        Company.findOne = jest.fn().mockResolvedValue({
          companyId: 'COMP001',
          CompanyName: 'TechCorp',
          CompanyType: 'startup'
        });

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000 },
          { reportingPeriod: 'Q2-2023', totalRevenue: 120000 }
        ]);

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP002', company_name: 'SimilarCorp' },
              similarity_score: 0.90
            }
          ],
          search_time_ms: 12
        });

        const result = await advancedAnalyticsService.findSimilarPerformingCompanies(companyId, 5);

        expect(result).toBeDefined();
        expect(result.sourceCompanyId).toBe(companyId);
        expect(result.similarCompanies).toHaveLength(1);
      });
    });
  });

  describe('Time-Series Analysis', () => {
    describe('getTimeSeriesAnalysis', () => {
      it('should perform time-series decomposition', async () => {
        const companyId = 'COMP001';
        const metric = 'revenue';

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2022', totalRevenue: 90000, reportDate: new Date('2022-03-31') },
          { reportingPeriod: 'Q2-2022', totalRevenue: 100000, reportDate: new Date('2022-06-30') },
          { reportingPeriod: 'Q3-2022', totalRevenue: 85000, reportDate: new Date('2022-09-30') },
          { reportingPeriod: 'Q4-2022', totalRevenue: 120000, reportDate: new Date('2022-12-31') },
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000, reportDate: new Date('2023-03-31') },
          { reportingPeriod: 'Q2-2023', totalRevenue: 115000, reportDate: new Date('2023-06-30') },
          { reportingPeriod: 'Q3-2023', totalRevenue: 95000, reportDate: new Date('2023-09-30') },
          { reportingPeriod: 'Q4-2023', totalRevenue: 140000, reportDate: new Date('2023-12-31') }
        ]);

        const result = await advancedAnalyticsService.getTimeSeriesAnalysis(companyId, metric);

        expect(result).toBeDefined();
        expect(result.trend).toBeDefined();
        expect(result.seasonality).toBeDefined();
        expect(result.volatility).toBeDefined();
      });

      it('should detect seasonality patterns', async () => {
        const companyId = 'COMP002';
        const metric = 'revenue';

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2022', totalRevenue: 100000, reportDate: new Date('2022-03-31') },
          { reportingPeriod: 'Q2-2022', totalRevenue: 110000, reportDate: new Date('2022-06-30') },
          { reportingPeriod: 'Q3-2022', totalRevenue: 105000, reportDate: new Date('2022-09-30') },
          { reportingPeriod: 'Q4-2022', totalRevenue: 150000, reportDate: new Date('2022-12-31') },
          { reportingPeriod: 'Q1-2023', totalRevenue: 115000, reportDate: new Date('2023-03-31') },
          { reportingPeriod: 'Q2-2023', totalRevenue: 125000, reportDate: new Date('2023-06-30') },
          { reportingPeriod: 'Q3-2023', totalRevenue: 120000, reportDate: new Date('2023-09-30') },
          { reportingPeriod: 'Q4-2023', totalRevenue: 170000, reportDate: new Date('2023-12-31') }
        ]);

        const result = await advancedAnalyticsService.getTimeSeriesAnalysis(companyId, metric);

        expect(result.seasonality.detected).toBe(true);
        expect(result.seasonality.peakQuarter).toBe('Q4');
      });

      it('should calculate year-over-year growth', async () => {
        const companyId = 'COMP003';
        const metric = 'revenue';

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2022', totalRevenue: 100000, reportDate: new Date('2022-03-31') },
          { reportingPeriod: 'Q1-2023', totalRevenue: 130000, reportDate: new Date('2023-03-31') }
        ]);

        const result = await advancedAnalyticsService.getTimeSeriesAnalysis(companyId, metric);

        expect(result.yearOverYearGrowth).toBeDefined();
        expect(result.yearOverYearGrowth['Q1']).toBeCloseTo(30, 0);
      });
    });
  });

  describe('Cohort Analysis', () => {
    describe('getStakeholderCohorts', () => {
      it('should group stakeholders into cohorts by join date', async () => {
        const companyId = 'COMP001';

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Early Bird 1', role: 'Founder', createdAt: new Date('2020-01-15'), equityHoldings: 30 },
          { stakeholderId: 'SH002', name: 'Early Bird 2', role: 'Founder', createdAt: new Date('2020-02-15'), equityHoldings: 25 },
          { stakeholderId: 'SH003', name: 'Series A Investor', role: 'Investor', createdAt: new Date('2021-06-15'), equityHoldings: 15 },
          { stakeholderId: 'SH004', name: 'Late Employee', role: 'Employee', createdAt: new Date('2023-01-15'), equityHoldings: 2 }
        ]);

        const result = await advancedAnalyticsService.getStakeholderCohorts(companyId);

        expect(result).toBeDefined();
        expect(result.cohorts).toBeDefined();
        expect(result.cohorts['2020']).toBeDefined();
        expect(result.cohorts['2020'].count).toBe(2);
        expect(result.cohorts['2020'].totalEquity).toBe(55);
      });

      it('should analyze cohort retention', async () => {
        const companyId = 'COMP002';

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Active Founder', role: 'Founder', createdAt: new Date('2020-01-15'), status: 'active', equityHoldings: 30 },
          { stakeholderId: 'SH002', name: 'Former Employee', role: 'Employee', createdAt: new Date('2020-06-15'), status: 'inactive', equityHoldings: 0 },
          { stakeholderId: 'SH003', name: 'Active Investor', role: 'Investor', createdAt: new Date('2021-01-15'), status: 'active', equityHoldings: 15 }
        ]);

        const result = await advancedAnalyticsService.getStakeholderCohorts(companyId);

        expect(result.retentionByYear).toBeDefined();
        expect(result.retentionByYear['2020']).toBeCloseTo(50, 0);
        expect(result.retentionByYear['2021']).toBe(100);
      });
    });

    describe('getInvestmentCohorts', () => {
      it('should analyze investment cohorts', async () => {
        const companyId = 'COMP001';

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportDate: new Date('2022-03-31'), totalRevenue: 100000, netIncome: 20000 },
          { reportDate: new Date('2022-06-30'), totalRevenue: 120000, netIncome: 30000 },
          { reportDate: new Date('2023-03-31'), totalRevenue: 150000, netIncome: 45000 }
        ]);

        const result = await advancedAnalyticsService.getInvestmentCohorts(companyId);

        expect(result).toBeDefined();
        expect(result.cohorts).toBeDefined();
        expect(result.performanceByPeriod).toHaveLength(3);
      });
    });
  });

  describe('Custom Reports', () => {
    describe('generateCustomReport', () => {
      it('should generate a custom analytics report', async () => {
        const companyId = 'COMP001';
        const reportConfig = {
          metrics: ['revenue', 'stakeholders', 'dilution'],
          timeRange: { start: new Date('2023-01-01'), end: new Date('2023-12-31') },
          format: 'detailed'
        };

        ShareClass.find = jest.fn().mockResolvedValue([
          { shareClassId: 'SC001', name: 'Common', authorizedShares: 10000000, dilutedShares: 8000000, ownershipPercentage: 80 }
        ]);

        Stakeholder.find = jest.fn().mockResolvedValue([
          { stakeholderId: 'SH001', name: 'Founder', role: 'Founder', equityHoldings: 50 }
        ]);

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000 }
        ]);

        const result = await advancedAnalyticsService.generateCustomReport(companyId, reportConfig);

        expect(result).toBeDefined();
        expect(result.report).toBeDefined();
        expect(result.report.revenue).toBeDefined();
        expect(result.report.stakeholders).toBeDefined();
        expect(result.report.dilution).toBeDefined();
        expect(result.generatedAt).toBeDefined();
      });

      it('should support export formats', async () => {
        const companyId = 'COMP001';
        const reportConfig = {
          metrics: ['revenue'],
          timeRange: { start: new Date('2023-01-01'), end: new Date('2023-12-31') },
          format: 'summary',
          exportFormat: 'json'
        };

        FinancialReport.find = jest.fn().mockResolvedValue([
          { reportingPeriod: 'Q1-2023', totalRevenue: 100000 }
        ]);

        const result = await advancedAnalyticsService.generateCustomReport(companyId, reportConfig);

        expect(result.exportable).toBe(true);
        expect(result.format).toBe('json');
      });
    });
  });

  describe('Analytics Query Optimization', () => {
    describe('optimizeQuery', () => {
      it('should cache frequently accessed analytics', async () => {
        const companyId = 'COMP001';

        ShareClass.find = jest.fn().mockResolvedValue([
          { shareClassId: 'SC001', name: 'Common', authorizedShares: 10000000, dilutedShares: 8000000, ownershipPercentage: 80 }
        ]);

        Stakeholder.find = jest.fn().mockResolvedValue([]);

        await advancedAnalyticsService.getCapTableSummary(companyId, { useCache: true });
        const result = await advancedAnalyticsService.getCapTableSummary(companyId, { useCache: true });

        expect(result).toBeDefined();
        expect(result.fromCache).toBe(true);
      });

      it('should batch ZeroDB queries for performance', async () => {
        const companyIds = ['COMP001', 'COMP002', 'COMP003'];

        zerodbService.queryTable.mockResolvedValue([
          { company_id: 'COMP001', metric: 'revenue', value: 100000 },
          { company_id: 'COMP002', metric: 'revenue', value: 150000 },
          { company_id: 'COMP003', metric: 'revenue', value: 200000 }
        ]);

        const result = await advancedAnalyticsService.batchGetMetrics(companyIds, 'revenue');

        expect(result).toBeDefined();
        expect(result).toHaveLength(3);
        expect(zerodbService.queryTable).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Store Analytics to ZeroDB', () => {
    describe('storeAnalyticsSnapshot', () => {
      it('should store analytics snapshot in ZeroDB', async () => {
        const companyId = 'COMP001';
        const analyticsData = {
          capTable: { totalShares: 10000000 },
          trends: { growth: 0.15 },
          timestamp: new Date()
        };

        const result = await advancedAnalyticsService.storeAnalyticsSnapshot(companyId, analyticsData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(zerodbService.insertRows).toHaveBeenCalledWith(
          'analytics_snapshots',
          expect.arrayContaining([
            expect.objectContaining({
              company_id: companyId
            })
          ])
        );
      });

      it('should create vector embedding for analytics data', async () => {
        const companyId = 'COMP001';
        const analyticsData = {
          capTable: { totalShares: 10000000 },
          trends: { growth: 0.15 }
        };

        await advancedAnalyticsService.storeAnalyticsSnapshot(companyId, analyticsData);

        expect(vectorService.generateEmbedding).toHaveBeenCalled();
        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          expect.any(Array),
          'analytics',
          expect.objectContaining({ company_id: companyId }),
          expect.any(String),
          expect.stringContaining('analytics:COMP001')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle ZeroDB connection errors gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB connection failed'));

      const companyId = 'COMP001';

      await expect(advancedAnalyticsService.getDocumentAnalytics(companyId))
        .rejects.toThrow('ZeroDB connection failed');
    });

    it('should handle missing data gracefully', async () => {
      const companyId = 'COMP001';

      ShareClass.find = jest.fn().mockResolvedValue([]);

      Stakeholder.find = jest.fn().mockResolvedValue([]);

      const result = await advancedAnalyticsService.getCapTableSummary(companyId);

      expect(result).toBeDefined();
      expect(result.totalAuthorizedShares).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should validate input parameters', async () => {
      await expect(advancedAnalyticsService.getCapTableSummary(null))
        .rejects.toThrow('Company ID is required');

      await expect(advancedAnalyticsService.getInvestmentTrends('COMP001', null))
        .rejects.toThrow('Time range is required');
    });
  });
});
