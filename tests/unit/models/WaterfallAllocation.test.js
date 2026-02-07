/**
 * WaterfallAllocation Model Unit Tests
 * Issue #271: Create waterfall allocation model for liquidation analysis
 *
 * Tests for ZeroDB-based WaterfallAllocation model covering:
 * - Schema and constants
 * - Waterfall calculation engine
 * - Liquidation preference distribution
 * - Participation rights
 * - Common pro-rata distribution
 * - Conversion vs preference optimization
 * - Sensitivity analysis
 */

// Mock ZeroDB service before requiring the model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  insertRow: jest.fn().mockResolvedValue({ data: [{ row_id: 'test-id', row_data: {} }] }),
  queryTable: jest.fn().mockResolvedValue({ data: [] }),
  updateRows: jest.fn().mockResolvedValue({ modified_count: 1 }),
  deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
  createTable: jest.fn().mockResolvedValue({}),
  projectId: 'test-project'
}));

const WaterfallAllocation = require('../../../models/WaterfallAllocation');

describe('WaterfallAllocation Model', () => {
  describe('Schema and Constants', () => {
    it('should export SCENARIO_TYPES enum', () => {
      expect(WaterfallAllocation.SCENARIO_TYPES).toBeDefined();
      expect(WaterfallAllocation.SCENARIO_TYPES).toContain('ACQUISITION');
      expect(WaterfallAllocation.SCENARIO_TYPES).toContain('IPO');
      expect(WaterfallAllocation.SCENARIO_TYPES).toContain('DISSOLUTION');
      expect(WaterfallAllocation.SCENARIO_TYPES).toContain('CUSTOM');
    });

    it('should export SECURITY_TYPES enum', () => {
      expect(WaterfallAllocation.SECURITY_TYPES).toBeDefined();
      expect(WaterfallAllocation.SECURITY_TYPES).toContain('PREFERRED');
      expect(WaterfallAllocation.SECURITY_TYPES).toContain('COMMON');
      expect(WaterfallAllocation.SECURITY_TYPES).toContain('OPTIONS');
      expect(WaterfallAllocation.SECURITY_TYPES).toContain('WARRANTS');
      expect(WaterfallAllocation.SECURITY_TYPES).toContain('SAFES');
      expect(WaterfallAllocation.SECURITY_TYPES).toContain('NOTES');
    });

    it('should export PAYOUT_METHODS enum', () => {
      expect(WaterfallAllocation.PAYOUT_METHODS).toBeDefined();
      expect(WaterfallAllocation.PAYOUT_METHODS).toContain('PREFERENCE');
      expect(WaterfallAllocation.PAYOUT_METHODS).toContain('PARTICIPATION');
      expect(WaterfallAllocation.PAYOUT_METHODS).toContain('CONVERSION');
    });

    it('should export VALID_STATUSES enum', () => {
      expect(WaterfallAllocation.VALID_STATUSES).toBeDefined();
      expect(WaterfallAllocation.VALID_STATUSES).toContain('draft');
      expect(WaterfallAllocation.VALID_STATUSES).toContain('calculated');
      expect(WaterfallAllocation.VALID_STATUSES).toContain('finalized');
      expect(WaterfallAllocation.VALID_STATUSES).toContain('archived');
    });

    it('should have schema with required fields', () => {
      expect(WaterfallAllocation.schema).toBeDefined();
      expect(WaterfallAllocation.schema.allocationId).toBeDefined();
      expect(WaterfallAllocation.schema.companyId).toBeDefined();
      expect(WaterfallAllocation.schema.scenarioName).toBeDefined();
      expect(WaterfallAllocation.schema.exitValue).toBeDefined();
      expect(WaterfallAllocation.schema.shareClasses).toBeDefined();
      expect(WaterfallAllocation.schema.optionPool).toBeDefined();
      expect(WaterfallAllocation.schema.results).toBeDefined();
    });

    it('should have tableName set to waterfall_allocations', () => {
      expect(WaterfallAllocation.tableName).toBe('waterfall_allocations');
    });
  });

  describe('Create Method Validation', () => {
    it('should throw error when companyId is missing', async () => {
      await expect(WaterfallAllocation.create({
        scenarioName: 'Test Scenario',
        exitValue: 10000000
      })).rejects.toThrow('companyId is required');
    });

    it('should throw error when scenarioName is missing', async () => {
      await expect(WaterfallAllocation.create({
        companyId: 'comp-123',
        exitValue: 10000000
      })).rejects.toThrow('scenarioName is required');
    });

    it('should throw error when exitValue is missing', async () => {
      await expect(WaterfallAllocation.create({
        companyId: 'comp-123',
        scenarioName: 'Test Scenario'
      })).rejects.toThrow('exitValue is required');
    });

    it('should throw error when exitValue is negative', async () => {
      await expect(WaterfallAllocation.create({
        companyId: 'comp-123',
        scenarioName: 'Test Scenario',
        exitValue: -1000000
      })).rejects.toThrow('exitValue cannot be negative');
    });

    it('should throw error for invalid scenarioType', async () => {
      await expect(WaterfallAllocation.create({
        companyId: 'comp-123',
        scenarioName: 'Test Scenario',
        exitValue: 10000000,
        scenarioType: 'INVALID'
      })).rejects.toThrow('scenarioType must be one of');
    });

    it('should generate allocationId if not provided', async () => {
      // Prepare input data
      const inputData = {
        companyId: 'comp-123',
        scenarioName: 'Test Scenario',
        exitValue: 10000000
      };

      // The create method modifies inputData before calling base create
      await WaterfallAllocation.create(inputData);

      // Verify allocationId was generated in the input data
      expect(inputData.allocationId).toBeDefined();
      expect(inputData.allocationId).toMatch(/^WFA-/);
    });

    it('should set default status to draft', async () => {
      const inputData = {
        companyId: 'comp-123',
        scenarioName: 'Test Scenario',
        exitValue: 10000000
      };

      await WaterfallAllocation.create(inputData);

      // Verify status was set
      expect(inputData.status).toBe('draft');
    });

    it('should set default scenarioType to ACQUISITION', async () => {
      const inputData = {
        companyId: 'comp-123',
        scenarioName: 'Test Scenario',
        exitValue: 10000000
      };

      await WaterfallAllocation.create(inputData);

      // Verify scenarioType was set
      expect(inputData.scenarioType).toBe('ACQUISITION');
    });
  });

  describe('calculateWaterfall Method', () => {
    it('should return empty results for null allocation', () => {
      const result = WaterfallAllocation.calculateWaterfall(null);
      expect(result.results).toEqual([]);
      expect(result.totalDistributed).toBe(0);
      expect(result.remainingProceeds).toBe(0);
    });

    it('should return empty results for zero exit value', () => {
      const allocation = { exitValue: 0, shareClasses: [] };
      const result = WaterfallAllocation.calculateWaterfall(allocation);
      expect(result.results).toEqual([]);
      expect(result.totalDistributed).toBe(0);
    });

    it('should return empty results for negative exit value', () => {
      const allocation = { exitValue: -1000000, shareClasses: [] };
      const result = WaterfallAllocation.calculateWaterfall(allocation);
      expect(result.results).toEqual([]);
    });

    it('should allow override of exit value', () => {
      const allocation = {
        exitValue: 10000000,
        shareClasses: [{
          shareClassId: 'common-1',
          name: 'Common Stock',
          securityType: 'COMMON',
          shares: 1000000
        }]
      };
      const result = WaterfallAllocation.calculateWaterfall(allocation, 5000000);
      expect(result.totalDistributed).toBeLessThanOrEqual(5000000);
    });
  });

  describe('applyLiquidationPreferences Method', () => {
    it('should return full exit value as remaining when no share classes', () => {
      const result = WaterfallAllocation.applyLiquidationPreferences([], 10000000);
      expect(result.results).toEqual([]);
      expect(result.remainingAfterPref).toBe(10000000);
    });

    it('should pay out liquidation preference to preferred stock', () => {
      const shareClasses = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        liquidationPreference: 5000000,
        seniorityRank: 1
      }];

      const result = WaterfallAllocation.applyLiquidationPreferences(shareClasses, 10000000);

      expect(result.results.length).toBe(1);
      expect(result.results[0].proceedsPreLiqPref).toBe(5000000);
      expect(result.remainingAfterPref).toBe(5000000);
    });

    it('should respect seniority order when paying preferences', () => {
      const shareClasses = [
        {
          shareClassId: 'seriesA',
          name: 'Series A Preferred',
          securityType: 'PREFERRED',
          shares: 1000000,
          liquidationPreference: 5000000,
          seniorityRank: 2 // junior
        },
        {
          shareClassId: 'seriesB',
          name: 'Series B Preferred',
          securityType: 'PREFERRED',
          shares: 500000,
          liquidationPreference: 3000000,
          seniorityRank: 1 // senior
        }
      ];

      const result = WaterfallAllocation.applyLiquidationPreferences(shareClasses, 10000000);

      // Series B (senior) should be first in results after sorting
      const seriesB = result.results.find(r => r.shareClassId === 'seriesB');
      const seriesA = result.results.find(r => r.shareClassId === 'seriesA');

      expect(seriesB.proceedsPreLiqPref).toBe(3000000);
      expect(seriesA.proceedsPreLiqPref).toBe(5000000);
      expect(result.remainingAfterPref).toBe(2000000);
    });

    it('should cap preference payout when exit value is insufficient', () => {
      const shareClasses = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        liquidationPreference: 15000000, // More than exit value
        seniorityRank: 1
      }];

      const result = WaterfallAllocation.applyLiquidationPreferences(shareClasses, 10000000);

      expect(result.results[0].proceedsPreLiqPref).toBe(10000000);
      expect(result.remainingAfterPref).toBe(0);
    });

    it('should not assign preferences to common stock', () => {
      const shareClasses = [{
        shareClassId: 'common',
        name: 'Common Stock',
        securityType: 'COMMON',
        shares: 5000000
      }];

      const result = WaterfallAllocation.applyLiquidationPreferences(shareClasses, 10000000);

      expect(result.results[0].proceedsPreLiqPref).toBe(0);
      expect(result.remainingAfterPref).toBe(10000000);
    });

    it('should calculate price per share correctly', () => {
      const shareClasses = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        liquidationPreference: 5000000,
        seniorityRank: 1
      }];

      const result = WaterfallAllocation.applyLiquidationPreferences(shareClasses, 10000000);

      expect(result.results[0].pricePerShare).toBe(5); // 5000000 / 1000000
    });

    it('should calculate return multiple correctly', () => {
      const shareClasses = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        liquidationPreference: 5000000,
        originalInvestment: 5000000,
        seniorityRank: 1
      }];

      const result = WaterfallAllocation.applyLiquidationPreferences(shareClasses, 10000000);

      expect(result.results[0].returnMultiple).toBe(1); // 5000000 / 5000000
    });
  });

  describe('distributeParticipation Method', () => {
    it('should return original results when no remaining proceeds', () => {
      const prefResults = [{ shareClassId: 'seriesA', participatingPreferred: true }];
      const result = WaterfallAllocation.distributeParticipation(prefResults, 0, []);
      expect(result.results).toEqual(prefResults);
      expect(result.remainingAfterPart).toBe(0);
    });

    it('should distribute participation to participating preferred', () => {
      const prefResults = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        participatingPreferred: true,
        proceedsPreLiqPref: 5000000,
        totalProceeds: 5000000,
        originalInvestment: 5000000
      }];

      const result = WaterfallAllocation.distributeParticipation(prefResults, 5000000, []);

      expect(result.results[0].proceedsParticipation).toBeGreaterThan(0);
      expect(result.results[0].payoutMethod).toBe('PARTICIPATION');
    });

    it('should apply participation cap when specified', () => {
      const prefResults = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        participatingPreferred: true,
        participationCap: 2, // 2x cap
        proceedsPreLiqPref: 5000000,
        totalProceeds: 5000000,
        originalInvestment: 5000000
      }];

      const result = WaterfallAllocation.distributeParticipation(prefResults, 10000000, []);

      // Total should not exceed 2x original investment ($10M)
      expect(result.results[0].totalProceeds).toBeLessThanOrEqual(10000000);
    });

    it('should not distribute participation to non-participating preferred', () => {
      const prefResults = [{
        shareClassId: 'seriesA',
        name: 'Series A Preferred',
        securityType: 'PREFERRED',
        shares: 1000000,
        participatingPreferred: false,
        proceedsPreLiqPref: 5000000,
        totalProceeds: 5000000
      }];

      const result = WaterfallAllocation.distributeParticipation(prefResults, 5000000, []);

      expect(result.results[0].proceedsParticipation).toBe(0);
    });
  });

  describe('distributeCommonProRata Method', () => {
    it('should distribute proceeds to common stockholders', () => {
      const partResults = [{
        shareClassId: 'common',
        name: 'Common Stock',
        securityType: 'COMMON',
        shares: 5000000
      }];

      const result = WaterfallAllocation.distributeCommonProRata(partResults, 10000000, [], {});

      expect(result.results[0].proceedsCommon).toBe(10000000);
      expect(result.results[0].totalProceeds).toBe(10000000);
      expect(result.results[0].payoutMethod).toBe('CONVERSION');
    });

    it('should calculate price per share for common', () => {
      const partResults = [{
        shareClassId: 'common',
        name: 'Common Stock',
        securityType: 'COMMON',
        shares: 5000000
      }];

      const result = WaterfallAllocation.distributeCommonProRata(partResults, 10000000, [], {});

      expect(result.results[0].pricePerShare).toBe(2); // 10000000 / 5000000
    });

    it('should handle option pool with strike price', () => {
      const partResults = [{
        shareClassId: 'common',
        name: 'Common Stock',
        securityType: 'COMMON',
        shares: 5000000
      }];

      const optionPool = {
        vestedOptions: 1000000,
        strikePrice: 1
      };

      const result = WaterfallAllocation.distributeCommonProRata(partResults, 12000000, [], optionPool);

      const optionResult = result.results.find(r => r.shareClassId === 'OPTIONS');
      expect(optionResult).toBeDefined();
      expect(optionResult.securityType).toBe('OPTIONS');
    });

    it('should choose conversion for non-participating when more valuable', () => {
      const partResults = [
        {
          shareClassId: 'seriesA',
          name: 'Series A Preferred',
          securityType: 'PREFERRED',
          shares: 1000000,
          participatingPreferred: false,
          conversionRatio: 1,
          proceedsPreLiqPref: 1000000, // Low preference
          totalProceeds: 1000000,
          originalInvestment: 1000000
        },
        {
          shareClassId: 'common',
          name: 'Common Stock',
          securityType: 'COMMON',
          shares: 4000000
        }
      ];

      // At $50M exit, conversion should be worth more than $1M preference
      const result = WaterfallAllocation.distributeCommonProRata(partResults, 50000000, [], {});

      const seriesA = result.results.find(r => r.shareClassId === 'seriesA');
      expect(seriesA.payoutMethod).toBe('CONVERSION');
      expect(seriesA.totalProceeds).toBeGreaterThan(1000000);
    });
  });

  describe('getShareClassBreakdown Method', () => {
    it('should return empty array for null allocation', () => {
      const result = WaterfallAllocation.getShareClassBreakdown(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when no results', () => {
      const result = WaterfallAllocation.getShareClassBreakdown({});
      expect(result).toEqual([]);
    });

    it('should format breakdown correctly', () => {
      const allocation = {
        totalDistributed: 10000000,
        results: [{
          shareClassId: 'seriesA',
          name: 'Series A Preferred',
          securityType: 'PREFERRED',
          shares: 1000000,
          liquidationPreference: 5000000,
          proceedsPreLiqPref: 5000000,
          proceedsParticipation: 0,
          proceedsCommon: 0,
          totalProceeds: 5000000,
          pricePerShare: 5,
          returnMultiple: 1,
          payoutMethod: 'PREFERENCE'
        }]
      };

      const breakdown = WaterfallAllocation.getShareClassBreakdown(allocation);

      expect(breakdown.length).toBe(1);
      expect(breakdown[0].shareClassId).toBe('seriesA');
      expect(breakdown[0].proceedsBreakdown.fromPreference).toBe(5000000);
      expect(breakdown[0].ownershipPercentage).toBe(50); // 5M / 10M * 100
    });
  });

  describe('generateSummaryReport Method', () => {
    it('should return default report for null allocation', () => {
      const report = WaterfallAllocation.generateSummaryReport(null);

      expect(report.scenarioName).toBe('');
      expect(report.exitValue).toBe(0);
      expect(report.totalDistributed).toBe(0);
      expect(report.shareClassCount).toBe(0);
    });

    it('should generate complete summary report', () => {
      const allocation = {
        scenarioName: '$50M Acquisition',
        scenarioType: 'ACQUISITION',
        exitValue: 50000000,
        totalDistributed: 48000000,
        remainingProceeds: 2000000,
        calculatedAt: '2024-01-15T00:00:00Z',
        status: 'calculated',
        results: [
          {
            shareClassId: 'seriesB',
            name: 'Series B Preferred',
            securityType: 'PREFERRED',
            shares: 500000,
            totalProceeds: 15000000
          },
          {
            shareClassId: 'seriesA',
            name: 'Series A Preferred',
            securityType: 'PREFERRED',
            shares: 1000000,
            totalProceeds: 12000000
          },
          {
            shareClassId: 'common',
            name: 'Common Stock',
            securityType: 'COMMON',
            shares: 5000000,
            totalProceeds: 21000000
          }
        ]
      };

      const report = WaterfallAllocation.generateSummaryReport(allocation);

      expect(report.scenarioName).toBe('$50M Acquisition');
      expect(report.exitValue).toBe(50000000);
      expect(report.totalDistributed).toBe(48000000);
      expect(report.remainingProceeds).toBe(2000000);
      expect(report.shareClassCount).toBe(3);
      expect(report.preferredCount).toBe(2);
      expect(report.commonCount).toBe(1);
      expect(report.breakdownByType.PREFERRED.totalProceeds).toBe(27000000);
      expect(report.breakdownByType.COMMON.totalProceeds).toBe(21000000);
      expect(report.topRecipients.length).toBeGreaterThan(0);
      expect(report.topRecipients[0].name).toBe('Common Stock');
    });
  });

  describe('findConversionBreakpoints Method', () => {
    it('should return empty array for null allocation', () => {
      const breakpoints = WaterfallAllocation.findConversionBreakpoints(null);
      expect(breakpoints).toEqual([]);
    });

    it('should find conversion breakpoints for non-participating preferred', () => {
      const allocation = {
        shareClasses: [
          {
            shareClassId: 'seriesA',
            name: 'Series A Preferred',
            securityType: 'PREFERRED',
            shares: 1000000,
            liquidationPreference: 5000000,
            participatingPreferred: false,
            conversionRatio: 1
          },
          {
            shareClassId: 'common',
            name: 'Common Stock',
            securityType: 'COMMON',
            shares: 4000000
          }
        ]
      };

      const breakpoints = WaterfallAllocation.findConversionBreakpoints(allocation);

      expect(breakpoints.length).toBeGreaterThan(0);
      expect(breakpoints[0].breakpointType).toBe('CONVERSION_THRESHOLD');
      expect(breakpoints[0].shareClassId).toBe('seriesA');
    });

    it('should find cap thresholds for capped participating', () => {
      const allocation = {
        shareClasses: [
          {
            shareClassId: 'seriesA',
            name: 'Series A Preferred',
            securityType: 'PREFERRED',
            shares: 1000000,
            liquidationPreference: 5000000,
            participatingPreferred: true,
            participationCap: 3, // 3x cap
            originalInvestment: 5000000,
            conversionRatio: 1
          }
        ]
      };

      const breakpoints = WaterfallAllocation.findConversionBreakpoints(allocation);

      const capBreakpoint = breakpoints.find(bp => bp.breakpointType === 'CAP_THRESHOLD');
      expect(capBreakpoint).toBeDefined();
      expect(capBreakpoint.enterpriseValueThreshold).toBe(15000000); // 3 * 5M
    });
  });

  describe('generateSensitivityTable Method', () => {
    it('should return empty array for null allocation', () => {
      const result = WaterfallAllocation.generateSensitivityTable(null, [10000000]);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty exit values', () => {
      const allocation = { shareClasses: [] };
      const result = WaterfallAllocation.generateSensitivityTable(allocation, []);
      expect(result).toEqual([]);
    });

    it('should generate sensitivity analysis for multiple exit values', () => {
      const allocation = {
        shareClasses: [
          {
            shareClassId: 'seriesA',
            name: 'Series A Preferred',
            securityType: 'PREFERRED',
            shares: 1000000,
            liquidationPreference: 5000000,
            participatingPreferred: false,
            conversionRatio: 1
          },
          {
            shareClassId: 'common',
            name: 'Common Stock',
            securityType: 'COMMON',
            shares: 4000000
          }
        ]
      };

      const exitValues = [10000000, 25000000, 50000000, 100000000];
      const result = WaterfallAllocation.generateSensitivityTable(allocation, exitValues);

      expect(result.length).toBe(4);
      expect(result[0].exitValue).toBe(10000000);
      expect(result[1].exitValue).toBe(25000000);
      expect(result[2].exitValue).toBe(50000000);
      expect(result[3].exitValue).toBe(100000000);

      // Higher exit values should result in higher total distributed
      expect(result[3].totalDistributed).toBeGreaterThan(result[0].totalDistributed);
    });
  });

  describe('Real-World Waterfall Scenario', () => {
    it('should correctly calculate $50M exit with Series B, Series A, and Common', () => {
      // Example from the issue:
      // Series B: 1x non-participating, $10M invested
      // Series A: 1x participating capped at 3x, $5M invested
      // Common: remaining

      const allocation = {
        exitValue: 50000000,
        shareClasses: [
          {
            shareClassId: 'seriesB',
            name: 'Series B Preferred',
            securityType: 'PREFERRED',
            shares: 1000000,
            liquidationPreference: 10000000,
            participatingPreferred: false,
            conversionRatio: 1,
            seniorityRank: 1,
            originalInvestment: 10000000
          },
          {
            shareClassId: 'seriesA',
            name: 'Series A Preferred',
            securityType: 'PREFERRED',
            shares: 2500000,
            liquidationPreference: 5000000,
            participatingPreferred: true,
            participationCap: 3,
            conversionRatio: 1,
            seniorityRank: 2,
            originalInvestment: 5000000
          },
          {
            shareClassId: 'common',
            name: 'Common Stock',
            securityType: 'COMMON',
            shares: 6500000,
            seniorityRank: 999
          }
        ]
      };

      const result = WaterfallAllocation.calculateWaterfall(allocation);

      // Verify results structure
      expect(result.results).toBeDefined();
      expect(result.totalDistributed).toBeGreaterThan(0);
      expect(result.totalDistributed).toBeLessThanOrEqual(50000000);

      // Find each class result
      const seriesB = result.results.find(r => r.shareClassId === 'seriesB');
      const seriesA = result.results.find(r => r.shareClassId === 'seriesA');
      const common = result.results.find(r => r.shareClassId === 'common');

      // Series B should get its preference or convert if conversion is better
      expect(seriesB.totalProceeds).toBeGreaterThan(0);

      // Series A should get preference + participation (capped)
      expect(seriesA.totalProceeds).toBeGreaterThanOrEqual(5000000);
      expect(seriesA.totalProceeds).toBeLessThanOrEqual(15000000); // 3x cap

      // Common should get remaining
      expect(common.totalProceeds).toBeGreaterThan(0);
    });
  });

  describe('Base Model Methods', () => {
    it('should have find method', () => {
      expect(typeof WaterfallAllocation.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof WaterfallAllocation.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof WaterfallAllocation.findById).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof WaterfallAllocation.create).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof WaterfallAllocation.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof WaterfallAllocation.deleteOne).toBe('function');
    });

    it('should have findByAllocationId method', () => {
      expect(typeof WaterfallAllocation.findByAllocationId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof WaterfallAllocation.findByCompany).toBe('function');
    });

    it('should have findByValuation method', () => {
      expect(typeof WaterfallAllocation.findByValuation).toBe('function');
    });

    it('should have markCalculated method', () => {
      expect(typeof WaterfallAllocation.markCalculated).toBe('function');
    });

    it('should have finalize method', () => {
      expect(typeof WaterfallAllocation.finalize).toBe('function');
    });

    it('should have archive method', () => {
      expect(typeof WaterfallAllocation.archive).toBe('function');
    });

    it('should have calculateWaterfall method', () => {
      expect(typeof WaterfallAllocation.calculateWaterfall).toBe('function');
    });

    it('should have applyLiquidationPreferences method', () => {
      expect(typeof WaterfallAllocation.applyLiquidationPreferences).toBe('function');
    });

    it('should have distributeParticipation method', () => {
      expect(typeof WaterfallAllocation.distributeParticipation).toBe('function');
    });

    it('should have distributeCommonProRata method', () => {
      expect(typeof WaterfallAllocation.distributeCommonProRata).toBe('function');
    });

    it('should have getShareClassBreakdown method', () => {
      expect(typeof WaterfallAllocation.getShareClassBreakdown).toBe('function');
    });

    it('should have generateSummaryReport method', () => {
      expect(typeof WaterfallAllocation.generateSummaryReport).toBe('function');
    });

    it('should have findConversionBreakpoints method', () => {
      expect(typeof WaterfallAllocation.findConversionBreakpoints).toBe('function');
    });

    it('should have generateSensitivityTable method', () => {
      expect(typeof WaterfallAllocation.generateSensitivityTable).toBe('function');
    });
  });
});
