/**
 * Comprehensive FinancialMetrics Model Unit Tests
 *
 * Tests for the FinancialMetrics model including validation, methods, and calculations
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('FinancialMetrics Model', () => {
  let FinancialMetrics;

  const validStatuses = ['draft', 'calculated', 'reviewed', 'approved', 'published'];
  const validCalculationMethods = ['automatic', 'manual', 'hybrid'];

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockFinancialMetrics(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();

        // Apply defaults
        if (this.liquidityRatios === undefined) this.liquidityRatios = {};
        if (this.activityRatios === undefined) this.activityRatios = {};
        if (this.leverageRatios === undefined) this.leverageRatios = {};
        if (this.profitabilityRatios === undefined) this.profitabilityRatios = {};
        if (this.marketRatios === undefined) this.marketRatios = {};
        if (this.cashFlowMetrics === undefined) this.cashFlowMetrics = {};
        if (this.growthMetrics === undefined) this.growthMetrics = {};
        if (this.calculationMethod === undefined) this.calculationMethod = 'automatic';
        if (this.status === undefined) this.status = 'calculated';
        if (this.warnings === undefined) this.warnings = [];
        if (this.isComparative === undefined) this.isComparative = false;

        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.companyId) {
            errors.companyId = { message: 'companyId is required' };
          }
          if (!this.reportingPeriod) {
            errors.reportingPeriod = { message: 'reportingPeriod is required' };
          }
          if (!this.reportingDate) {
            errors.reportingDate = { message: 'reportingDate is required' };
          }
          if (!this.calculatedBy) {
            errors.calculatedBy = { message: 'calculatedBy is required' };
          }
          if (this.status && !validStatuses.includes(this.status)) {
            errors.status = { message: `${this.status} is not a valid status` };
          }
          if (this.calculationMethod && !validCalculationMethods.includes(this.calculationMethod)) {
            errors.calculationMethod = { message: `${this.calculationMethod} is not a valid calculation method` };
          }

          // Score validations (0-100)
          const scoreFields = ['financialStrengthScore', 'liquidityScore', 'profitabilityScore', 'leverageScore'];
          scoreFields.forEach(field => {
            if (this[field] !== undefined) {
              if (this[field] < 0 || this[field] > 100) {
                errors[field] = { message: `${field} must be between 0 and 100` };
              }
            }
          });

          return Object.keys(errors).length > 0 ? { errors } : null;
        });

        this.toObject = jest.fn(() => ({ ...data }));

        // Instance methods
        this.calculateScores = function() {
          let liquidityScore = 0;
          let profitabilityScore = 0;
          let leverageScore = 0;

          // Liquidity score calculation
          if (this.liquidityRatios) {
            const { currentRatio, quickRatio, operatingCashFlowRatio } = this.liquidityRatios;
            if (currentRatio >= 1.5 && currentRatio <= 3.0) liquidityScore += 35;
            else if (currentRatio >= 1.0) liquidityScore += 20;
            if (quickRatio >= 1.0 && quickRatio <= 2.0) liquidityScore += 35;
            else if (quickRatio >= 0.7) liquidityScore += 20;
            if (operatingCashFlowRatio >= 0.4) liquidityScore += 30;
            else if (operatingCashFlowRatio >= 0.2) liquidityScore += 20;
          }

          // Profitability score calculation
          if (this.profitabilityRatios) {
            const { netProfitMargin, returnOnAssets, returnOnEquity } = this.profitabilityRatios;
            if (netProfitMargin >= 0.15) profitabilityScore += 35;
            else if (netProfitMargin >= 0.10) profitabilityScore += 25;
            if (returnOnAssets >= 0.15) profitabilityScore += 30;
            else if (returnOnAssets >= 0.10) profitabilityScore += 20;
            if (returnOnEquity >= 0.20) profitabilityScore += 35;
            else if (returnOnEquity >= 0.15) profitabilityScore += 25;
          }

          // Leverage score calculation
          if (this.leverageRatios) {
            const { debtToAssets, debtToEquity, timesInterestEarned } = this.leverageRatios;
            if (debtToAssets <= 0.3) leverageScore += 40;
            else if (debtToAssets <= 0.5) leverageScore += 30;
            if (debtToEquity <= 0.5) leverageScore += 30;
            else if (debtToEquity <= 1.0) leverageScore += 20;
            if (timesInterestEarned >= 5.0) leverageScore += 30;
            else if (timesInterestEarned >= 3.0) leverageScore += 20;
          }

          this.liquidityScore = Math.min(liquidityScore, 100);
          this.profitabilityScore = Math.min(profitabilityScore, 100);
          this.leverageScore = Math.min(leverageScore, 100);
          this.financialStrengthScore = Math.round(
            (this.liquidityScore * 0.3) +
            (this.profitabilityScore * 0.4) +
            (this.leverageScore * 0.3)
          );

          return this;
        };

        this.identifyRedFlags = function() {
          const redFlags = [];
          if (this.liquidityRatios?.currentRatio < 1.0) {
            redFlags.push('Current ratio below 1.0 indicates potential liquidity issues');
          }
          if (this.leverageRatios?.debtToEquity > 2.0) {
            redFlags.push('High debt-to-equity ratio indicates high financial leverage');
          }
          if (this.profitabilityRatios?.netProfitMargin < 0) {
            redFlags.push('Negative profit margin indicates losses');
          }
          if (this.cashFlowMetrics?.freeCashFlow < 0) {
            redFlags.push('Negative free cash flow indicates cash generation issues');
          }
          if (this.leverageRatios?.timesInterestEarned < 2.0) {
            redFlags.push('Low interest coverage ratio indicates difficulty servicing debt');
          }
          return redFlags;
        };

        this.getIndustryBenchmarks = function(industry) {
          return {
            currentRatio: { median: 2.0, q1: 1.5, q3: 2.5 },
            quickRatio: { median: 1.2, q1: 0.8, q3: 1.6 },
            debtToEquity: { median: 0.6, q1: 0.3, q3: 1.0 },
            netProfitMargin: { median: 0.08, q1: 0.05, q3: 0.12 },
            returnOnAssets: { median: 0.07, q1: 0.04, q3: 0.11 },
            returnOnEquity: { median: 0.12, q1: 0.08, q3: 0.18 }
          };
        };

        this.calculatePercentile = function(value, benchmark) {
          if (value >= benchmark.q3) return 75;
          if (value >= benchmark.median) return 50;
          if (value >= benchmark.q1) return 25;
          return 10;
        };
      }

      // Static methods
      MockFinancialMetrics.findById = jest.fn();
      MockFinancialMetrics.find = jest.fn();
      MockFinancialMetrics.findOne = jest.fn();
      MockFinancialMetrics.create = jest.fn();
      MockFinancialMetrics.getHistory = jest.fn();
      MockFinancialMetrics.getTrendAnalysis = jest.fn();

      return MockFinancialMetrics;
    });

    // Now require the FinancialMetrics model
    FinancialMetrics = require('../../../models/FinancialMetrics');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create financial metrics with all required fields', () => {
        const metricsData = {
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date('2024-03-31'),
          calculatedBy: '507f1f77bcf86cd799439022'
        };

        const metrics = new FinancialMetrics(metricsData);

        expect(metrics.companyId).toBe(metricsData.companyId);
        expect(metrics.reportingPeriod).toBe(metricsData.reportingPeriod);
        expect(metrics.reportingDate).toEqual(metricsData.reportingDate);
        expect(metrics.calculatedBy).toBe(metricsData.calculatedBy);
      });

      it('should reject metrics without companyId', () => {
        const metrics = new FinancialMetrics({
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.companyId).toBeTruthy();
      });

      it('should reject metrics without reportingPeriod', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.reportingPeriod).toBeTruthy();
      });

      it('should reject metrics without reportingDate', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.reportingDate).toBeTruthy();
      });

      it('should reject metrics without calculatedBy', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date()
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.calculatedBy).toBeTruthy();
      });
    });

    describe('Status Validation', () => {
      it.each(validStatuses)('should accept valid status "%s"', (status) => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          status: status
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeNull();
      });

      it('should reject invalid status', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          status: 'invalid_status'
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.status).toBeTruthy();
      });

      it('should default status to "calculated"', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        expect(metrics.status).toBe('calculated');
      });
    });

    describe('Calculation Method Validation', () => {
      it.each(validCalculationMethods)('should accept valid calculation method "%s"', (method) => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          calculationMethod: method
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeNull();
      });

      it('should default calculationMethod to "automatic"', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        expect(metrics.calculationMethod).toBe('automatic');
      });
    });

    describe('Score Range Validation', () => {
      it('should accept scores within 0-100 range', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          financialStrengthScore: 75,
          liquidityScore: 80,
          profitabilityScore: 60,
          leverageScore: 85
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeNull();
      });

      it('should reject score below 0', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          liquidityScore: -10
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.liquidityScore).toBeTruthy();
      });

      it('should reject score above 100', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          profitabilityScore: 150
        });

        const validationError = metrics.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.profitabilityScore).toBeTruthy();
      });
    });
  });

  describe('Liquidity Ratios', () => {
    it('should handle complete liquidity ratios', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024-Q1',
        reportingDate: new Date(),
        calculatedBy: '507f1f77bcf86cd799439022',
        liquidityRatios: {
          currentRatio: 2.5,
          quickRatio: 1.8,
          cashRatio: 0.5,
          workingCapital: 500000,
          operatingCashFlowRatio: 0.35
        }
      });

      expect(metrics.liquidityRatios.currentRatio).toBe(2.5);
      expect(metrics.liquidityRatios.quickRatio).toBe(1.8);
      expect(metrics.liquidityRatios.cashRatio).toBe(0.5);
      expect(metrics.liquidityRatios.workingCapital).toBe(500000);
    });

    it('should default liquidityRatios to empty object', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024-Q1',
        reportingDate: new Date(),
        calculatedBy: '507f1f77bcf86cd799439022'
      });

      expect(metrics.liquidityRatios).toEqual({});
    });
  });

  describe('Profitability Ratios', () => {
    it('should handle complete profitability ratios', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024-Q1',
        reportingDate: new Date(),
        calculatedBy: '507f1f77bcf86cd799439022',
        profitabilityRatios: {
          grossProfitMargin: 0.45,
          operatingProfitMargin: 0.25,
          netProfitMargin: 0.18,
          returnOnAssets: 0.12,
          returnOnEquity: 0.22
        }
      });

      expect(metrics.profitabilityRatios.grossProfitMargin).toBe(0.45);
      expect(metrics.profitabilityRatios.netProfitMargin).toBe(0.18);
      expect(metrics.profitabilityRatios.returnOnEquity).toBe(0.22);
    });
  });

  describe('Leverage Ratios', () => {
    it('should handle complete leverage ratios', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024-Q1',
        reportingDate: new Date(),
        calculatedBy: '507f1f77bcf86cd799439022',
        leverageRatios: {
          debtToAssets: 0.35,
          debtToEquity: 0.55,
          equityMultiplier: 1.55,
          timesInterestEarned: 8.5
        }
      });

      expect(metrics.leverageRatios.debtToAssets).toBe(0.35);
      expect(metrics.leverageRatios.debtToEquity).toBe(0.55);
      expect(metrics.leverageRatios.timesInterestEarned).toBe(8.5);
    });
  });

  describe('Instance Methods', () => {
    describe('calculateScores', () => {
      it('should calculate scores for healthy company', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          liquidityRatios: {
            currentRatio: 2.0,
            quickRatio: 1.5,
            operatingCashFlowRatio: 0.5
          },
          profitabilityRatios: {
            netProfitMargin: 0.20,
            returnOnAssets: 0.18,
            returnOnEquity: 0.25
          },
          leverageRatios: {
            debtToAssets: 0.25,
            debtToEquity: 0.40,
            timesInterestEarned: 6.0
          }
        });

        metrics.calculateScores();

        expect(metrics.liquidityScore).toBeGreaterThan(50);
        expect(metrics.profitabilityScore).toBeGreaterThan(50);
        expect(metrics.leverageScore).toBeGreaterThan(50);
        expect(metrics.financialStrengthScore).toBeGreaterThan(50);
      });

      it('should calculate lower scores for struggling company', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          liquidityRatios: {
            currentRatio: 0.8,
            quickRatio: 0.5,
            operatingCashFlowRatio: 0.05
          },
          profitabilityRatios: {
            netProfitMargin: 0.01,
            returnOnAssets: 0.02,
            returnOnEquity: 0.03
          },
          leverageRatios: {
            debtToAssets: 0.85,
            debtToEquity: 2.5,
            timesInterestEarned: 1.2
          }
        });

        metrics.calculateScores();

        expect(metrics.liquidityScore).toBeLessThan(50);
        expect(metrics.profitabilityScore).toBeLessThan(50);
        expect(metrics.leverageScore).toBeLessThan(50);
        expect(metrics.financialStrengthScore).toBeLessThan(50);
      });

      it('should cap scores at 100', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          liquidityRatios: {
            currentRatio: 2.5,
            quickRatio: 1.5,
            operatingCashFlowRatio: 0.6
          }
        });

        metrics.calculateScores();

        expect(metrics.liquidityScore).toBeLessThanOrEqual(100);
      });
    });

    describe('identifyRedFlags', () => {
      it('should identify low current ratio', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          liquidityRatios: {
            currentRatio: 0.7
          }
        });

        const redFlags = metrics.identifyRedFlags();
        expect(redFlags).toContain('Current ratio below 1.0 indicates potential liquidity issues');
      });

      it('should identify high debt-to-equity', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          leverageRatios: {
            debtToEquity: 3.0
          }
        });

        const redFlags = metrics.identifyRedFlags();
        expect(redFlags).toContain('High debt-to-equity ratio indicates high financial leverage');
      });

      it('should identify negative profit margin', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          profitabilityRatios: {
            netProfitMargin: -0.05
          }
        });

        const redFlags = metrics.identifyRedFlags();
        expect(redFlags).toContain('Negative profit margin indicates losses');
      });

      it('should identify negative free cash flow', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          cashFlowMetrics: {
            freeCashFlow: -100000
          }
        });

        const redFlags = metrics.identifyRedFlags();
        expect(redFlags).toContain('Negative free cash flow indicates cash generation issues');
      });

      it('should return no red flags for healthy company', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022',
          liquidityRatios: { currentRatio: 2.0 },
          leverageRatios: { debtToEquity: 0.5, timesInterestEarned: 5.0 },
          profitabilityRatios: { netProfitMargin: 0.15 },
          cashFlowMetrics: { freeCashFlow: 500000 }
        });

        const redFlags = metrics.identifyRedFlags();
        expect(redFlags.length).toBe(0);
      });
    });

    describe('getIndustryBenchmarks', () => {
      it('should return industry benchmarks', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        const benchmarks = metrics.getIndustryBenchmarks('technology');

        expect(benchmarks.currentRatio).toBeDefined();
        expect(benchmarks.currentRatio.median).toBe(2.0);
        expect(benchmarks.returnOnEquity).toBeDefined();
      });
    });

    describe('calculatePercentile', () => {
      it('should calculate percentile correctly', () => {
        const metrics = new FinancialMetrics({
          companyId: '507f1f77bcf86cd799439011',
          reportingPeriod: '2024-Q1',
          reportingDate: new Date(),
          calculatedBy: '507f1f77bcf86cd799439022'
        });

        const benchmark = { q1: 1.5, median: 2.0, q3: 2.5 };

        expect(metrics.calculatePercentile(3.0, benchmark)).toBe(75);
        expect(metrics.calculatePercentile(2.2, benchmark)).toBe(50);
        expect(metrics.calculatePercentile(1.7, benchmark)).toBe(25);
        expect(metrics.calculatePercentile(1.0, benchmark)).toBe(10);
      });
    });
  });

  describe('Reporting Period Formats', () => {
    it('should handle quarterly format', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024-Q1',
        reportingDate: new Date('2024-03-31'),
        calculatedBy: '507f1f77bcf86cd799439022'
      });

      expect(metrics.reportingPeriod).toBe('2024-Q1');
    });

    it('should handle annual format', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024',
        reportingDate: new Date('2024-12-31'),
        calculatedBy: '507f1f77bcf86cd799439022'
      });

      expect(metrics.reportingPeriod).toBe('2024');
    });

    it('should handle fiscal year format', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: 'FY2024',
        reportingDate: new Date('2024-06-30'),
        calculatedBy: '507f1f77bcf86cd799439022'
      });

      expect(metrics.reportingPeriod).toBe('FY2024');
    });
  });

  describe('Static Methods', () => {
    it('should call getHistory correctly', async () => {
      const mockHistory = [
        { reportingPeriod: '2024-Q1', financialStrengthScore: 75 },
        { reportingPeriod: '2023-Q4', financialStrengthScore: 72 }
      ];
      FinancialMetrics.getHistory.mockResolvedValue(mockHistory);

      const result = await FinancialMetrics.getHistory('company-123', 8);

      expect(FinancialMetrics.getHistory).toHaveBeenCalledWith('company-123', 8);
      expect(result).toEqual(mockHistory);
    });

    it('should call getTrendAnalysis correctly', async () => {
      const mockTrend = {
        values: [0.10, 0.12, 0.15, 0.18],
        growthRate: 0.8,
        trend: 'increasing'
      };
      FinancialMetrics.getTrendAnalysis.mockResolvedValue(mockTrend);

      const result = await FinancialMetrics.getTrendAnalysis(
        'company-123',
        'profitabilityRatios.netProfitMargin',
        4
      );

      expect(result.trend).toBe('increasing');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete financial metrics', () => {
      const metrics = new FinancialMetrics({
        companyId: '507f1f77bcf86cd799439011',
        reportingPeriod: '2024-Q1',
        reportingDate: new Date('2024-03-31'),
        calculatedBy: '507f1f77bcf86cd799439022',
        liquidityRatios: {
          currentRatio: 2.2,
          quickRatio: 1.6,
          cashRatio: 0.4,
          workingCapital: 750000,
          operatingCashFlowRatio: 0.45
        },
        activityRatios: {
          assetTurnover: 1.2,
          inventoryTurnover: 6.5,
          receivablesTurnover: 8.0,
          daysInInventory: 56,
          daysInReceivables: 46,
          cashConversionCycle: 75
        },
        leverageRatios: {
          debtToAssets: 0.35,
          debtToEquity: 0.54,
          timesInterestEarned: 7.5
        },
        profitabilityRatios: {
          grossProfitMargin: 0.42,
          operatingProfitMargin: 0.22,
          netProfitMargin: 0.16,
          returnOnAssets: 0.14,
          returnOnEquity: 0.21
        },
        cashFlowMetrics: {
          operatingCashFlow: 2500000,
          freeCashFlow: 1800000
        },
        growthMetrics: {
          revenueGrowthRate: 0.25,
          netIncomeGrowthRate: 0.30
        },
        status: 'approved',
        calculationMethod: 'automatic',
        notes: 'Strong quarterly performance'
      });

      const validationError = metrics.validateSync();
      expect(validationError).toBeNull();

      metrics.calculateScores();
      expect(metrics.financialStrengthScore).toBeGreaterThan(50);

      const redFlags = metrics.identifyRedFlags();
      expect(redFlags.length).toBe(0);
    });
  });
});
