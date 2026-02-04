/**
 * Fundraising Analytics Service Tests
 *
 * Issue #196: Implement Fundraising Analytics Service
 * TDD Red Phase - Tests written before implementation
 */

const fundraisingAnalyticsService = require('../../../services/fundraisingAnalyticsService');

// Mock the databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');

describe('FundraisingAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return aggregated fundraising overview for a company', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', roundName: 'Seed', amountRaised: 500000, equityGiven: 10, date: new Date('2023-01-01'), RoundType: 'Seed' },
        { roundId: 'round-2', roundName: 'Series A', amountRaised: 5000000, equityGiven: 20, date: new Date('2024-01-01'), RoundType: 'Series A' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      const result = await fundraisingAnalyticsService.getOverview(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('totalRaised');
      expect(result).toHaveProperty('totalEquityGiven');
      expect(result).toHaveProperty('numberOfRounds');
      expect(result).toHaveProperty('averageRoundSize');
      expect(result.totalRaised).toBe(5500000);
      expect(result.totalEquityGiven).toBe(30);
      expect(result.numberOfRounds).toBe(2);
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getOverview()).rejects.toThrow('Company ID is required');
    });

    it('should return empty overview when no rounds exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await fundraisingAnalyticsService.getOverview('company-123');

      expect(result.totalRaised).toBe(0);
      expect(result.numberOfRounds).toBe(0);
    });
  });

  describe('getKeyMetrics', () => {
    it('should return key fundraising metrics', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', amountRaised: 1000000, equityGiven: 15, date: new Date('2023-01-01'), RoundType: 'Seed' },
        { roundId: 'round-2', amountRaised: 8000000, equityGiven: 20, date: new Date('2024-06-01'), RoundType: 'Series A' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      const result = await fundraisingAnalyticsService.getKeyMetrics(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('preMoneyValuation');
      expect(result).toHaveProperty('postMoneyValuation');
      expect(result).toHaveProperty('averageDilution');
      expect(result).toHaveProperty('runwayMonths');
      expect(result).toHaveProperty('burnRate');
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getKeyMetrics()).rejects.toThrow('Company ID is required');
    });
  });

  describe('getTimeline', () => {
    it('should return fundraising timeline with all rounds', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', roundName: 'Seed', amountRaised: 500000, date: new Date('2023-01-01'), RoundType: 'Seed', equityGiven: 10 },
        { roundId: 'round-2', roundName: 'Series A', amountRaised: 5000000, date: new Date('2024-01-01'), RoundType: 'Series A', equityGiven: 20 }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      const result = await fundraisingAnalyticsService.getTimeline(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('timeline');
      expect(Array.isArray(result.timeline)).toBe(true);
      expect(result.timeline.length).toBe(2);
      expect(result.timeline[0]).toHaveProperty('roundName');
      expect(result.timeline[0]).toHaveProperty('amountRaised');
      expect(result.timeline[0]).toHaveProperty('date');
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getTimeline()).rejects.toThrow('Company ID is required');
    });

    it('should return sorted timeline by date', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-2', roundName: 'Series A', amountRaised: 5000000, date: new Date('2024-01-01'), RoundType: 'Series A', equityGiven: 20 },
        { roundId: 'round-1', roundName: 'Seed', amountRaised: 500000, date: new Date('2023-01-01'), RoundType: 'Seed', equityGiven: 10 }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      const result = await fundraisingAnalyticsService.getTimeline(companyId);

      expect(result.timeline[0].roundName).toBe('Seed');
      expect(result.timeline[1].roundName).toBe('Series A');
    });
  });

  describe('getInvestorBreakdown', () => {
    it('should return investor distribution analytics', async () => {
      const companyId = 'company-123';
      const mockInvestors = [
        { investorId: 'inv-1', investorType: 'Venture Capital', investmentAmount: 3000000, equityPercentage: 15 },
        { investorId: 'inv-2', investorType: 'Angel', investmentAmount: 500000, equityPercentage: 5 },
        { investorId: 'inv-3', investorType: 'Venture Capital', investmentAmount: 2000000, equityPercentage: 10 }
      ];

      databaseAdapter.find.mockResolvedValue(mockInvestors);

      const result = await fundraisingAnalyticsService.getInvestorBreakdown(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('totalInvestors');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('byEquity');
      expect(result.totalInvestors).toBe(3);
      expect(result.byType).toHaveProperty('Venture Capital');
      expect(result.byType).toHaveProperty('Angel');
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getInvestorBreakdown()).rejects.toThrow('Company ID is required');
    });

    it('should handle empty investor list', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await fundraisingAnalyticsService.getInvestorBreakdown('company-123');

      expect(result.totalInvestors).toBe(0);
      expect(result.byType).toEqual({});
    });
  });

  describe('getDilutionHistory', () => {
    it('should calculate dilution history over time', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', roundName: 'Seed', amountRaised: 500000, equityGiven: 10, date: new Date('2023-01-01'), RoundType: 'Seed' },
        { roundId: 'round-2', roundName: 'Series A', amountRaised: 5000000, equityGiven: 20, date: new Date('2024-01-01'), RoundType: 'Series A' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      const result = await fundraisingAnalyticsService.getDilutionHistory(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('dilutionEvents');
      expect(result).toHaveProperty('cumulativeDilution');
      expect(result).toHaveProperty('founderEquityRemaining');
      expect(Array.isArray(result.dilutionEvents)).toBe(true);
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getDilutionHistory()).rejects.toThrow('Company ID is required');
    });

    it('should calculate correct cumulative dilution', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', equityGiven: 10, date: new Date('2023-01-01'), RoundType: 'Seed', amountRaised: 500000, roundName: 'Seed' },
        { roundId: 'round-2', equityGiven: 20, date: new Date('2024-01-01'), RoundType: 'Series A', amountRaised: 5000000, roundName: 'Series A' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      const result = await fundraisingAnalyticsService.getDilutionHistory(companyId);

      expect(result.cumulativeDilution).toBe(30);
      expect(result.founderEquityRemaining).toBe(70);
    });
  });

  describe('getBenchmarks', () => {
    it('should return industry benchmarks and comparison', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', amountRaised: 1000000, equityGiven: 15, RoundType: 'Seed', date: new Date('2023-01-01') }
      ];
      const mockBenchmarks = {
        industry: 'Technology',
        benchmarks: {
          seedRoundMedian: 1500000,
          seriesAMedian: 10000000,
          averageDilutionSeed: 20,
          averageDilutionSeriesA: 25
        }
      };

      databaseAdapter.find.mockResolvedValue(mockRounds);
      databaseAdapter.findOne.mockResolvedValue(mockBenchmarks);

      const result = await fundraisingAnalyticsService.getBenchmarks(companyId, { industry: 'Technology' });

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('industryBenchmarks');
      expect(result).toHaveProperty('comparison');
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getBenchmarks()).rejects.toThrow('Company ID is required');
    });

    it('should return default benchmarks if industry not found', async () => {
      const companyId = 'company-123';
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await fundraisingAnalyticsService.getBenchmarks(companyId);

      expect(result).toHaveProperty('industryBenchmarks');
      expect(result.industryBenchmarks).not.toBeNull();
    });
  });

  describe('getProjections', () => {
    it('should forecast future fundraising needs', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', amountRaised: 500000, date: new Date('2023-01-01'), RoundType: 'Seed', equityGiven: 10 },
        { roundId: 'round-2', amountRaised: 5000000, date: new Date('2024-01-01'), RoundType: 'Series A', equityGiven: 20 }
      ];
      const mockFinancials = {
        monthlyBurnRate: 200000,
        currentCash: 3000000
      };

      databaseAdapter.find.mockResolvedValue(mockRounds);
      databaseAdapter.findOne.mockResolvedValue(mockFinancials);

      const result = await fundraisingAnalyticsService.getProjections(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('runwayMonths');
      expect(result).toHaveProperty('nextRoundEstimate');
      expect(result).toHaveProperty('projectedValuation');
      expect(result).toHaveProperty('recommendations');
    });

    it('should throw error if companyId is not provided', async () => {
      await expect(fundraisingAnalyticsService.getProjections()).rejects.toThrow('Company ID is required');
    });

    it('should handle missing financial data gracefully', async () => {
      const companyId = 'company-123';
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await fundraisingAnalyticsService.getProjections(companyId);

      expect(result).toHaveProperty('companyId', companyId);
      expect(result).toHaveProperty('recommendations');
    });

    it('should calculate runway correctly based on burn rate', async () => {
      const companyId = 'company-123';
      const mockRounds = [
        { roundId: 'round-1', amountRaised: 1000000, date: new Date('2024-01-01'), RoundType: 'Seed', equityGiven: 10 }
      ];
      const mockFinancials = {
        monthlyBurnRate: 100000,
        currentCash: 500000
      };

      databaseAdapter.find.mockResolvedValue(mockRounds);
      databaseAdapter.findOne.mockResolvedValue(mockFinancials);

      const result = await fundraisingAnalyticsService.getProjections(companyId);

      expect(result.runwayMonths).toBe(5);
    });
  });
});
