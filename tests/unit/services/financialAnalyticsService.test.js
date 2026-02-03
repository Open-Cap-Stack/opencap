/**
 * Financial Analytics Service Test Suite
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Comprehensive test coverage for financial analytics features including:
 * - Financial trend analysis (revenue, expenses, profitability)
 * - Ratio calculations (liquidity, profitability, efficiency)
 * - Performance benchmarking
 */

const financialAnalyticsService = require('../../../services/financialAnalyticsService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock database adapter
jest.mock('../../../services/databaseAdapter');

describe('Financial Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock for initialized state
    databaseAdapter.initialized = true;
    databaseAdapter._checkInitialized = jest.fn();
  });

  describe('analyzeTrends', () => {
    it('should analyze revenue trends over time', async () => {
      const companyId = 'COMP001';
      const options = {
        metric: 'revenue',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 120000, totalExpenses: 85000, netIncome: 35000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 150000, totalExpenses: 90000, netIncome: 60000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 180000, totalExpenses: 100000, netIncome: 80000 }
      ]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(companyId);
      expect(result.metric).toBe('revenue');
      expect(result.trend).toBeDefined();
      expect(result.trend.direction).toBe('up');
      expect(result.trend.growthRate).toBeGreaterThan(0);
      expect(result.dataPoints).toHaveLength(4);
    });

    it('should analyze expense trends', async () => {
      const companyId = 'COMP001';
      const options = {
        metric: 'expenses',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 120000, totalExpenses: 90000, netIncome: 30000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 150000, totalExpenses: 100000, netIncome: 50000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 180000, totalExpenses: 110000, netIncome: 70000 }
      ]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result).toBeDefined();
      expect(result.metric).toBe('expenses');
      expect(result.trend).toBeDefined();
    });

    it('should analyze profitability trends', async () => {
      const companyId = 'COMP001';
      const options = {
        metric: 'profitability',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 120000, totalExpenses: 85000, netIncome: 35000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 150000, totalExpenses: 90000, netIncome: 60000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 180000, totalExpenses: 100000, netIncome: 80000 }
      ]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result).toBeDefined();
      expect(result.metric).toBe('profitability');
      expect(result.trend.direction).toBe('up');
    });

    it('should identify declining trends', async () => {
      const companyId = 'COMP002';
      const options = {
        metric: 'revenue',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 200000, totalExpenses: 100000, netIncome: 100000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 180000, totalExpenses: 100000, netIncome: 80000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 150000, totalExpenses: 100000, netIncome: 50000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 120000, totalExpenses: 100000, netIncome: 20000 }
      ]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result.trend.direction).toBe('down');
      expect(result.trend.growthRate).toBeLessThan(0);
    });

    it('should identify stable trends', async () => {
      const companyId = 'COMP003';
      const options = {
        metric: 'revenue',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 102000, totalExpenses: 81000, netIncome: 21000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 99000, totalExpenses: 79000, netIncome: 20000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 101000, totalExpenses: 80000, netIncome: 21000 }
      ]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result.trend.direction).toBe('stable');
    });

    it('should calculate period-over-period changes', async () => {
      const companyId = 'COMP001';
      const options = {
        metric: 'revenue',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 120000, totalExpenses: 85000, netIncome: 35000 }
      ]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result.periodChanges).toBeDefined();
      expect(result.periodChanges).toHaveLength(1);
      expect(result.periodChanges[0].change).toBeCloseTo(20, 0);
    });

    it('should throw error for missing company ID', async () => {
      await expect(financialAnalyticsService.analyzeTrends(null, {}))
        .rejects.toThrow('Company ID is required');
    });

    it('should handle insufficient data gracefully', async () => {
      const companyId = 'COMP001';
      const options = { metric: 'revenue' };

      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      const result = await financialAnalyticsService.analyzeTrends(companyId, options);

      expect(result.trend.direction).toBe('insufficient_data');
      expect(result.dataPoints).toHaveLength(0);
    });
  });

  describe('calculateRatios', () => {
    it('should calculate liquidity ratios', async () => {
      const companyId = 'COMP001';
      const options = { category: 'liquidity' };

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 500000,
        currentLiabilities: 200000,
        inventory: 100000,
        cash: 150000,
        accountsReceivable: 80000,
        totalAssets: 1000000,
        totalLiabilities: 400000
      });

      const result = await financialAnalyticsService.calculateRatios(companyId, options);

      expect(result).toBeDefined();
      expect(result.liquidity).toBeDefined();
      expect(result.liquidity.currentRatio).toBeCloseTo(2.5, 1);
      expect(result.liquidity.quickRatio).toBeCloseTo(2.0, 1);
      expect(result.liquidity.cashRatio).toBeCloseTo(0.75, 2);
    });

    it('should calculate profitability ratios', async () => {
      const companyId = 'COMP001';
      const options = { category: 'profitability' };

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        totalRevenue: 1000000,
        grossProfit: 400000,
        operatingIncome: 200000,
        netIncome: 150000,
        totalAssets: 2000000,
        shareholdersEquity: 1200000
      });

      const result = await financialAnalyticsService.calculateRatios(companyId, options);

      expect(result).toBeDefined();
      expect(result.profitability).toBeDefined();
      expect(result.profitability.grossMargin).toBeCloseTo(40, 1);
      expect(result.profitability.operatingMargin).toBeCloseTo(20, 1);
      expect(result.profitability.netMargin).toBeCloseTo(15, 1);
      expect(result.profitability.returnOnAssets).toBeCloseTo(7.5, 1);
      expect(result.profitability.returnOnEquity).toBeCloseTo(12.5, 1);
    });

    it('should calculate efficiency ratios', async () => {
      const companyId = 'COMP001';
      const options = { category: 'efficiency' };

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        totalRevenue: 1000000,
        costOfGoodsSold: 600000,
        totalAssets: 500000,
        inventory: 100000,
        accountsReceivable: 80000,
        accountsPayable: 60000
      });

      const result = await financialAnalyticsService.calculateRatios(companyId, options);

      expect(result).toBeDefined();
      expect(result.efficiency).toBeDefined();
      expect(result.efficiency.assetTurnover).toBeCloseTo(2.0, 1);
      expect(result.efficiency.inventoryTurnover).toBeCloseTo(6.0, 1);
      expect(result.efficiency.receivablesTurnover).toBeDefined();
      expect(result.efficiency.payablesTurnover).toBeDefined();
    });

    it('should calculate all ratio categories when no category specified', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 500000,
        currentLiabilities: 200000,
        inventory: 100000,
        cash: 150000,
        accountsReceivable: 80000,
        accountsPayable: 60000,
        totalAssets: 1000000,
        totalLiabilities: 400000,
        totalRevenue: 1000000,
        grossProfit: 400000,
        operatingIncome: 200000,
        netIncome: 150000,
        costOfGoodsSold: 600000,
        shareholdersEquity: 600000
      });

      const result = await financialAnalyticsService.calculateRatios(companyId);

      expect(result.liquidity).toBeDefined();
      expect(result.profitability).toBeDefined();
      expect(result.efficiency).toBeDefined();
    });

    it('should throw error for missing company ID', async () => {
      await expect(financialAnalyticsService.calculateRatios(null))
        .rejects.toThrow('Company ID is required');
    });

    it('should handle missing financial data', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);

      await expect(financialAnalyticsService.calculateRatios(companyId))
        .rejects.toThrow('Financial data not found');
    });

    it('should handle division by zero gracefully', async () => {
      const companyId = 'COMP001';
      const options = { category: 'liquidity' };

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 500000,
        currentLiabilities: 0,
        inventory: 100000,
        cash: 150000
      });

      const result = await financialAnalyticsService.calculateRatios(companyId, options);

      expect(result.liquidity.currentRatio).toBe(null);
      expect(result.liquidity.quickRatio).toBe(null);
    });
  });

  describe('benchmarkPerformance', () => {
    it('should benchmark performance against industry standards', async () => {
      const companyId = 'COMP001';
      const options = {
        industry: 'technology',
        period: 'Q4-2023'
      };

      databaseAdapter.findOne = jest.fn()
        .mockResolvedValueOnce({
          companyId: 'COMP001',
          totalRevenue: 1000000,
          netIncome: 150000,
          totalAssets: 2000000,
          shareholdersEquity: 1200000
        })
        .mockResolvedValueOnce({
          industry: 'technology',
          benchmarks: {
            grossMargin: 60,
            operatingMargin: 25,
            netMargin: 18,
            returnOnAssets: 10,
            returnOnEquity: 15
          }
        });

      databaseAdapter.find = jest.fn().mockResolvedValue([
        {
          companyId: 'COMP001',
          totalRevenue: 1000000,
          grossProfit: 450000,
          operatingIncome: 180000,
          netIncome: 150000
        }
      ]);

      const result = await financialAnalyticsService.benchmarkPerformance(companyId, options);

      expect(result).toBeDefined();
      expect(result.companyMetrics).toBeDefined();
      expect(result.industryBenchmarks).toBeDefined();
      expect(result.comparison).toBeDefined();
    });

    it('should compare performance against company goals', async () => {
      const companyId = 'COMP001';
      const options = {
        compareAgainst: 'goals',
        goals: {
          revenueGrowth: 20,
          netMargin: 15,
          returnOnEquity: 18
        }
      };

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        companyId: 'COMP001',
        totalRevenue: 1200000,
        netIncome: 150000,
        shareholdersEquity: 1000000
      });

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2022-12-31'), totalRevenue: 1000000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 1200000 }
      ]);

      const result = await financialAnalyticsService.benchmarkPerformance(companyId, options);

      expect(result).toBeDefined();
      expect(result.goalComparison).toBeDefined();
      expect(result.goalComparison.revenueGrowth).toBeDefined();
      expect(result.goalComparison.revenueGrowth.actual).toBeCloseTo(20, 0);
    });

    it('should calculate performance score', async () => {
      const companyId = 'COMP001';
      const options = {
        industry: 'technology'
      };

      databaseAdapter.findOne = jest.fn()
        .mockResolvedValueOnce({
          companyId: 'COMP001',
          totalRevenue: 1000000,
          grossProfit: 500000,
          operatingIncome: 200000,
          netIncome: 150000,
          totalAssets: 2000000,
          shareholdersEquity: 1200000
        })
        .mockResolvedValueOnce({
          industry: 'technology',
          benchmarks: {
            grossMargin: 45,
            operatingMargin: 18,
            netMargin: 12,
            returnOnAssets: 6,
            returnOnEquity: 10
          }
        });

      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      const result = await financialAnalyticsService.benchmarkPerformance(companyId, options);

      expect(result.performanceScore).toBeDefined();
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should identify areas for improvement', async () => {
      const companyId = 'COMP001';
      const options = {
        industry: 'technology'
      };

      databaseAdapter.findOne = jest.fn()
        .mockResolvedValueOnce({
          companyId: 'COMP001',
          totalRevenue: 1000000,
          grossProfit: 300000,
          operatingIncome: 100000,
          netIncome: 80000,
          totalAssets: 2000000,
          shareholdersEquity: 1200000
        })
        .mockResolvedValueOnce({
          industry: 'technology',
          benchmarks: {
            grossMargin: 60,
            operatingMargin: 25,
            netMargin: 18,
            returnOnAssets: 10,
            returnOnEquity: 15
          }
        });

      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      const result = await financialAnalyticsService.benchmarkPerformance(companyId, options);

      expect(result.improvementAreas).toBeDefined();
      expect(result.improvementAreas.length).toBeGreaterThan(0);
    });

    it('should throw error for missing company ID', async () => {
      await expect(financialAnalyticsService.benchmarkPerformance(null, {}))
        .rejects.toThrow('Company ID is required');
    });
  });

  describe('getFinancialSummary', () => {
    it('should return comprehensive financial summary', async () => {
      const companyId = 'COMP001';

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 100000, totalExpenses: 80000, netIncome: 20000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 120000, totalExpenses: 85000, netIncome: 35000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 150000, totalExpenses: 90000, netIncome: 60000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 180000, totalExpenses: 100000, netIncome: 80000 }
      ]);

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 500000,
        currentLiabilities: 200000,
        inventory: 100000,
        cash: 150000,
        totalAssets: 1000000,
        totalLiabilities: 400000,
        totalRevenue: 180000,
        grossProfit: 80000,
        operatingIncome: 50000,
        netIncome: 80000,
        shareholdersEquity: 600000,
        accountsReceivable: 80000,
        accountsPayable: 60000,
        costOfGoodsSold: 100000
      });

      const result = await financialAnalyticsService.getFinancialSummary(companyId);

      expect(result).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.ratios).toBeDefined();
      expect(result.highlights).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const companyId = 'COMP001';

      databaseAdapter.find = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(financialAnalyticsService.analyzeTrends(companyId, {}))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate date range parameters', async () => {
      const companyId = 'COMP001';
      const options = {
        metric: 'revenue',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2023-01-01')
      };

      await expect(financialAnalyticsService.analyzeTrends(companyId, options))
        .rejects.toThrow('End date must be after start date');
    });
  });
});
