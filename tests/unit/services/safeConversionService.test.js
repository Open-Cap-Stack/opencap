/**
 * SAFE Conversion Service Tests
 * Feature: Issue #68 - SAFE Conversion Engine
 */

// Set zerodb-only mode BEFORE importing the service so the module-level
// isMongoDBRequired evaluates to false and getMongoose() returns null.
process.env.MIGRATION_MODE = 'zerodb-only';

jest.mock('../../../models/SAFE');

const mockConversionSave = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../models/SAFEConversion', () => {
  // Import the actual calculateConversion logic
  const actual = jest.requireActual('../../../models/SAFEConversion');

  // Return a constructor function so `new SAFEConversion({...})` works
  function MockSAFEConversion(data) {
    Object.assign(this, data);
    this.save = mockConversionSave;
  }
  // Attach static methods from the actual model
  MockSAFEConversion.calculateConversion = actual.calculateConversion;
  MockSAFEConversion.find = jest.fn();
  MockSAFEConversion.findOne = jest.fn();
  MockSAFEConversion.findById = jest.fn();
  MockSAFEConversion.create = jest.fn();
  MockSAFEConversion.updateOne = jest.fn();
  MockSAFEConversion.deleteOne = jest.fn();

  return MockSAFEConversion;
});

const SAFEConversionService = require('../../../services/safeConversionService');
const SAFEConversion = require('../../../models/SAFEConversion');
const SAFE = require('../../../models/SAFE');

describe('SAFEConversionService', () => {
  describe('calculateConversion', () => {
    it('should use valuation cap when cap price is lower', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        discountRate: 0.20,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      // Cap price = 5000000 / 5000000 = $1.00
      // Discount price = $2.00 * (1 - 0.20) = $1.60
      // Effective = MIN($1.00, $1.60) = $1.00
      expect(result.methodUsed).toBe('cap');
      expect(result.effectivePrice).toBe(1.00);
      expect(result.sharesIssued).toBe(100000); // 100000 / 1.00
    });

    it('should use discount when discount price is lower', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 20000000,
        discountRate: 0.20,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      // Cap price = 20000000 / 5000000 = $4.00
      // Discount price = $2.00 * (1 - 0.20) = $1.60
      // Effective = MIN($4.00, $1.60) = $1.60
      expect(result.methodUsed).toBe('discount');
      expect(result.effectivePrice).toBe(1.60);
      expect(result.sharesIssued).toBe(62500); // floor(100000 / 1.60)
    });

    it('should use cap only when no discount rate', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        discountRate: null,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      expect(result.methodUsed).toBe('cap');
      expect(result.effectivePrice).toBe(1.00);
    });

    it('should use discount only when no valuation cap', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: null,
        discountRate: 0.20,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      expect(result.methodUsed).toBe('discount');
      expect(result.effectivePrice).toBe(1.60);
    });

    it('should use series price when no cap or discount', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: null,
        discountRate: null,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      expect(result.methodUsed).toBe('series_price');
      expect(result.effectivePrice).toBe(2.00);
    });

    it('should handle MFN SAFE type', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        discountRate: 0.20,
        safeType: 'mfn'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      expect(result.methodUsed).toBe('mfn');
    });

    it('should calculate ownership percentage', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      // 100000 shares out of 5100000 post-conversion
      const expectedOwnership = (100000 / 5100000) * 100;
      expect(result.ownershipPercentage).toBeCloseTo(expectedOwnership, 2);
    });

    it('should calculate savings compared to series price', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        safeType: 'post-money'
      };

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const result = SAFEConversionService.calculateConversion(safeTerms, roundTerms);

      // Savings = ($2.00 - $1.00) * 100000 shares = $100,000
      expect(result.priceComparison.savings).toBe(100000);
    });
  });

  describe('previewRoundConversions', () => {
    it('should preview conversions for all funded SAFEs', async () => {
      const companyId = 'id-' + Math.random().toString(36).slice(2, 10);

      const mockSafes = [
        {
          _id: 'id-' + Math.random().toString(36).slice(2, 10),
          safeId: 'safe_1',
          investorId: { _id: 'id-' + Math.random().toString(36).slice(2, 10) },
          investorName: 'Investor 1',
          investmentAmount: 100000,
          safeType: 'post-money',
          valuationCap: 5000000,
          discountRate: 0.20,
          proRataRights: true
        },
        {
          _id: 'id-' + Math.random().toString(36).slice(2, 10),
          safeId: 'safe_2',
          investorId: { _id: 'id-' + Math.random().toString(36).slice(2, 10) },
          investorName: 'Investor 2',
          investmentAmount: 50000,
          safeType: 'post-money',
          valuationCap: 8000000,
          discountRate: null,
          proRataRights: false
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockSafes)
      };

      SAFE.find = jest.fn().mockReturnValue(mockQuery);

      const roundTerms = {
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        preMoneyValuation: 10000000
      };

      const preview = await SAFEConversionService.previewRoundConversions(companyId, roundTerms);

      expect(preview.eligibleSAFEsCount).toBe(2);
      expect(preview.totalInvestment).toBe(150000);
      expect(preview.previews).toHaveLength(2);
      expect(preview.dilutionFromSAFEs).toBeGreaterThan(0);
    });
  });

  describe('calculateProRataAllocation', () => {
    it('should calculate pro-rata based on ownership', () => {
      const conversionPreview = {
        calculation: {
          ownershipPercentage: 2.0 // 2%
        }
      };

      const roundTerms = {
        totalRoundSize: 5000000
      };

      const allocation = SAFEConversionService.calculateProRataAllocation(conversionPreview, roundTerms);

      expect(allocation).toBe(100000); // 2% of $5M
    });

    it('should return null when no round size', () => {
      const conversionPreview = {
        calculation: { ownershipPercentage: 2.0 }
      };

      const roundTerms = {};

      const allocation = SAFEConversionService.calculateProRataAllocation(conversionPreview, roundTerms);

      expect(allocation).toBeNull();
    });
  });

  describe('calculateMFNTerms', () => {
    it('should find best terms among all SAFEs', async () => {
      const companyId = 'id-' + Math.random().toString(36).slice(2, 10);

      const mockSafes = [
        { valuationCap: 8000000, discountRate: 0.15 },
        { valuationCap: 5000000, discountRate: 0.20 },
        { valuationCap: 10000000, discountRate: 0.10 }
      ];

      SAFE.find = jest.fn().mockResolvedValue(mockSafes);

      const mfnTerms = await SAFEConversionService.calculateMFNTerms(companyId);

      expect(mfnTerms.valuationCap).toBe(5000000); // Lowest cap
      expect(mfnTerms.discountRate).toBe(0.20); // Highest discount
      expect(mfnTerms.safesAnalyzed).toBe(3);
    });

    it('should return null when no eligible SAFEs exist', async () => {
      SAFE.find = jest.fn().mockResolvedValue([]);

      const mfnTerms = await SAFEConversionService.calculateMFNTerms('comp-empty');

      expect(mfnTerms.valuationCap).toBeNull();
      expect(mfnTerms.discountRate).toBeNull();
      expect(mfnTerms.safesAnalyzed).toBe(0);
    });

    it('should handle SAFEs with only cap or only discount', async () => {
      SAFE.find = jest.fn().mockResolvedValue([
        { valuationCap: 10000000, discountRate: null },
        { valuationCap: null, discountRate: 0.15 }
      ]);

      const mfnTerms = await SAFEConversionService.calculateMFNTerms('comp-mixed');

      expect(mfnTerms.valuationCap).toBe(10000000);
      expect(mfnTerms.discountRate).toBe(0.15);
    });
  });

  describe('approveRoundConversions', () => {
    it('should approve all pending conversions for a round', async () => {
      const mockConversions = [
        { conversionId: 'conv-1', investorName: 'Investor A', approve: jest.fn().mockResolvedValue(undefined) },
        { conversionId: 'conv-2', investorName: 'Investor B', approve: jest.fn().mockResolvedValue(undefined) }
      ];

      SAFEConversion.find = jest.fn().mockResolvedValue(mockConversions);

      const result = await SAFEConversionService.approveRoundConversions('round-1', 'user-1');

      expect(result.approvedCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('approved');
      expect(result.results[1].status).toBe('approved');
      expect(mockConversions[0].approve).toHaveBeenCalledWith('user-1');
    });

    it('should return zero when no pending conversions exist', async () => {
      SAFEConversion.find = jest.fn().mockResolvedValue([]);

      const result = await SAFEConversionService.approveRoundConversions('round-empty', 'user-1');

      expect(result.approvedCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('executeConversion', () => {
    it('should execute a conversion and update the SAFE status', async () => {
      const mockConversion = {
        conversionId: 'conv-1',
        safeId: 'safe-1',
        fundingRoundId: 'round-1',
        shareClassId: 'sc-1',
        sharesIssued: 50000,
        pricePerShare: 8,
        calculation: { methodUsed: 'cap', effectivePrice: 8 },
        execute: jest.fn().mockResolvedValue(undefined)
      };

      const mockSafe = {
        recordConversion: jest.fn().mockResolvedValue(undefined)
      };

      SAFEConversion.findOne = jest.fn().mockResolvedValue(mockConversion);
      SAFE.findById = jest.fn().mockResolvedValue(mockSafe);

      const result = await SAFEConversionService.executeConversion('conv-1', 'user-1', 'grant-1');

      expect(mockConversion.execute).toHaveBeenCalledWith('user-1', 'grant-1');
      expect(mockSafe.recordConversion).toHaveBeenCalled();
      expect(result).toEqual(mockConversion);
    });

    it('should throw when conversion not found', async () => {
      SAFEConversion.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        SAFEConversionService.executeConversion('nonexistent', 'user-1')
      ).rejects.toThrow('Conversion not found');
    });

    it('should handle missing SAFE gracefully', async () => {
      const mockConversion = {
        conversionId: 'conv-1',
        safeId: 'safe-gone',
        fundingRoundId: 'round-1',
        shareClassId: 'sc-1',
        sharesIssued: 50000,
        pricePerShare: 8,
        calculation: { methodUsed: 'cap', effectivePrice: 8 },
        execute: jest.fn().mockResolvedValue(undefined)
      };

      SAFEConversion.findOne = jest.fn().mockResolvedValue(mockConversion);
      SAFE.findById = jest.fn().mockResolvedValue(null);

      const result = await SAFEConversionService.executeConversion('conv-1', 'user-1');

      expect(mockConversion.execute).toHaveBeenCalledWith('user-1', null);
      expect(result).toEqual(mockConversion);
    });
  });

  describe('executeRoundConversions', () => {
    it('should execute all approved conversions for a round', async () => {
      const mockApprovedConversions = [
        { conversionId: 'conv-1', investorName: 'Investor A', sharesIssued: 50000 }
      ];

      SAFEConversion.find = jest.fn().mockResolvedValue(mockApprovedConversions);
      SAFEConversion.findOne = jest.fn().mockResolvedValue({
        ...mockApprovedConversions[0],
        safeId: 'safe-1',
        fundingRoundId: 'round-1',
        shareClassId: 'sc-1',
        pricePerShare: 8,
        calculation: { methodUsed: 'cap', effectivePrice: 8 },
        execute: jest.fn().mockResolvedValue(undefined)
      });
      SAFE.findById = jest.fn().mockResolvedValue({
        recordConversion: jest.fn().mockResolvedValue(undefined)
      });

      const result = await SAFEConversionService.executeRoundConversions('round-1', 'user-1');

      expect(result.executedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.results[0].status).toBe('executed');
    });

    it('should handle individual conversion failures gracefully', async () => {
      const mockApprovedConversions = [
        { conversionId: 'conv-1', investorName: 'Investor A', sharesIssued: 50000 },
        { conversionId: 'conv-2', investorName: 'Investor B', sharesIssued: 25000 }
      ];

      SAFEConversion.find = jest.fn().mockResolvedValue(mockApprovedConversions);
      SAFEConversion.findOne = jest.fn()
        .mockResolvedValueOnce({
          ...mockApprovedConversions[0],
          safeId: 'safe-1', fundingRoundId: 'round-1', shareClassId: 'sc-1',
          pricePerShare: 8, calculation: { methodUsed: 'cap', effectivePrice: 8 },
          execute: jest.fn().mockResolvedValue(undefined)
        })
        .mockResolvedValueOnce(null); // second fails

      SAFE.findById = jest.fn().mockResolvedValue({
        recordConversion: jest.fn().mockResolvedValue(undefined)
      });

      const result = await SAFEConversionService.executeRoundConversions('round-1', 'user-1');

      expect(result.executedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.results[1].status).toBe('failed');
      expect(result.results[1].error).toBe('Conversion not found');
    });

    it('should pass createEquityGrants flag without errors', async () => {
      SAFEConversion.find = jest.fn().mockResolvedValue([
        { conversionId: 'conv-1', investorName: 'Investor A', sharesIssued: 50000 }
      ]);
      SAFEConversion.findOne = jest.fn().mockResolvedValue({
        conversionId: 'conv-1', investorName: 'Investor A', sharesIssued: 50000,
        safeId: 'safe-1', fundingRoundId: 'round-1', shareClassId: 'sc-1',
        pricePerShare: 8, calculation: { methodUsed: 'cap', effectivePrice: 8 },
        execute: jest.fn().mockResolvedValue(undefined)
      });
      SAFE.findById = jest.fn().mockResolvedValue({
        recordConversion: jest.fn().mockResolvedValue(undefined)
      });

      const result = await SAFEConversionService.executeRoundConversions('round-1', 'user-1', true);

      expect(result.executedCount).toBe(1);
    });
  });

  describe('getCompanyConversionSummary', () => {
    it('should return a grouped summary of conversions', async () => {
      const mockConversions = [
        { status: 'executed', sharesIssued: 50000, safeTerms: { investmentAmount: 500000 }, calculation: { methodUsed: 'cap' } },
        { status: 'executed', sharesIssued: 25000, safeTerms: { investmentAmount: 250000 }, calculation: { methodUsed: 'discount' } },
        { status: 'pending', sharesIssued: 10000, safeTerms: { investmentAmount: 100000 }, calculation: { methodUsed: 'cap' } }
      ];

      SAFEConversion.find = jest.fn().mockResolvedValue(mockConversions);

      const summary = await SAFEConversionService.getCompanyConversionSummary('comp-123');

      expect(summary.total).toBe(3);
      expect(summary.byStatus.executed).toBe(2);
      expect(summary.byStatus.pending).toBe(1);
      expect(summary.totalSharesIssued).toBe(75000);
      expect(summary.totalInvestmentConverted).toBe(750000);
      expect(summary.byMethod.cap).toBe(1);
      expect(summary.byMethod.discount).toBe(1);
    });

    it('should return empty summary when no conversions exist', async () => {
      SAFEConversion.find = jest.fn().mockResolvedValue([]);

      const summary = await SAFEConversionService.getCompanyConversionSummary('comp-empty');

      expect(summary.total).toBe(0);
      expect(summary.totalSharesIssued).toBe(0);
      expect(summary.totalInvestmentConverted).toBe(0);
    });
  });

  describe('createRoundConversions', () => {
    beforeEach(() => {
      mockConversionSave.mockClear();
    });

    it('should create conversion records and call save for each SAFE', async () => {
      const companyId = 'comp-123';
      const roundTerms = {
        roundName: 'Series A',
        roundType: 'series_a',
        preMoneyValuation: 10000000,
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        totalRoundSize: 5000000,
        shareClassName: 'Series A Preferred'
      };

      const mockSafes = [
        {
          _id: 'safe-1',
          safeId: 'SAFE-001',
          investorId: { _id: 'inv-1' },
          investorName: 'Investor 1',
          investmentAmount: 100000,
          safeType: 'post-money',
          valuationCap: 5000000,
          discountRate: 0.20,
          proRataRights: true
        },
        {
          _id: 'safe-2',
          safeId: 'SAFE-002',
          investorId: { _id: 'inv-2' },
          investorName: 'Investor 2',
          investmentAmount: 50000,
          safeType: 'post-money',
          valuationCap: 8000000,
          discountRate: null,
          proRataRights: false
        }
      ];

      SAFE.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSafes)
      });

      const result = await SAFEConversionService.createRoundConversions(
        companyId, 'round-1', roundTerms, 'sc-1', 'user-1'
      );

      expect(result.conversionsCreated).toBe(2);
      expect(result.totalShares).toBeGreaterThan(0);
      expect(result.totalInvestment).toBe(150000);
      expect(result.conversions).toHaveLength(2);
      // Each conversion should have had save() called
      expect(mockConversionSave).toHaveBeenCalledTimes(2);
      // Verify the conversion object has correct fields
      expect(result.conversions[0].companyId).toBe('comp-123');
      expect(result.conversions[0].fundingRoundId).toBe('round-1');
      expect(result.conversions[0].shareClassId).toBe('sc-1');
      expect(result.conversions[0].shareClassName).toBe('Series A Preferred');
      expect(result.conversions[0].createdBy).toBe('user-1');
    });

    it('should handle proRata correctly for eligible and ineligible SAFEs', async () => {
      const roundTerms = {
        roundName: 'Series A',
        roundType: 'series_a',
        preMoneyValuation: 10000000,
        pricePerShare: 2.00,
        fullyDilutedShares: 5000000,
        totalRoundSize: 2000000,
        shareClassName: 'Series A Preferred'
      };

      const mockSafes = [
        {
          _id: 'safe-1',
          safeId: 'SAFE-001',
          investorId: { _id: 'inv-1' },
          investorName: 'Investor 1',
          investmentAmount: 100000,
          safeType: 'post-money',
          valuationCap: 5000000,
          discountRate: 0.20,
          proRataRights: true
        },
        {
          _id: 'safe-2',
          safeId: 'SAFE-002',
          investorId: { _id: 'inv-2' },
          investorName: 'Investor 2',
          investmentAmount: 50000,
          safeType: 'post-money',
          valuationCap: 8000000,
          discountRate: null,
          proRataRights: false
        }
      ];

      SAFE.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSafes)
      });

      const result = await SAFEConversionService.createRoundConversions(
        'comp-1', 'round-1', roundTerms, 'sc-1', 'user-1'
      );

      // First SAFE is pro-rata eligible, second is not
      expect(result.conversions[0].proRata.eligible).toBe(true);
      expect(result.conversions[0].proRata.allocationAmount).toBeGreaterThan(0);
      expect(result.conversions[1].proRata.eligible).toBe(false);
      expect(result.conversions[1].proRata.allocationAmount).toBeNull();
    });

    it('should handle zero eligible SAFEs gracefully', async () => {
      SAFE.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const result = await SAFEConversionService.createRoundConversions(
        'comp-1', 'round-1', {
          roundName: 'A', pricePerShare: 2, fullyDilutedShares: 1000000
        }, 'sc-1', 'user-1'
      );

      expect(result.conversionsCreated).toBe(0);
      expect(result.conversions).toHaveLength(0);
      expect(mockConversionSave).not.toHaveBeenCalled();
    });

    it('should propagate errors during creation', async () => {
      SAFE.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('DB connection failed'))
      });

      await expect(
        SAFEConversionService.createRoundConversions('comp-1', 'round-1', {
          roundName: 'A', pricePerShare: 2, fullyDilutedShares: 1000000
        }, 'sc-1', 'user-1')
      ).rejects.toThrow('DB connection failed');
    });

    it('should propagate save errors', async () => {
      const mockSafes = [
        {
          _id: 'safe-1',
          safeId: 'SAFE-001',
          investorId: { _id: 'inv-1' },
          investorName: 'Investor 1',
          investmentAmount: 100000,
          safeType: 'post-money',
          valuationCap: 5000000,
          discountRate: null,
          proRataRights: false
        }
      ];

      SAFE.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSafes)
      });

      mockConversionSave.mockRejectedValueOnce(new Error('Save failed'));

      await expect(
        SAFEConversionService.createRoundConversions(
          'comp-1', 'round-1',
          { roundName: 'A', pricePerShare: 2, fullyDilutedShares: 1000000 },
          'sc-1', 'user-1'
        )
      ).rejects.toThrow('Save failed');
    });
  });
});
