/**
 * SAFE Dilution Service Tests
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Tests for SAFE dilution calculations including single SAFE,
 * multi-SAFE, post-money, MFN, and company dilution summary.
 */
process.env.SKIP_DB_SETUP = 'true';

const SAFEDilutionService = require('../../../services/safeDilutionService');
const DilutionCalculation = require('../../../models/DilutionCalculation');
const databaseAdapter = require('../../../services/databaseAdapter');

jest.mock('../../../models/DilutionCalculation');
jest.mock('../../../services/databaseAdapter');

describe('SAFEDilutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // calculateSAFEDilution
  // ---------------------------------------------------------------------------
  describe('calculateSAFEDilution', () => {
    it('should calculate dilution using valuation cap when cap price is lower', async () => {
      DilutionCalculation.create = jest.fn().mockResolvedValue({});

      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        scenarioId: 'sc-1',
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 5000000
      });

      // capPrice = 5000000 / 5000000 = $1.00
      // discountedPrice = $2.00 * (1 - 20/100) = $1.60
      // conversionPrice = min($1.00, $1.60) = $1.00
      expect(result.conversionPrice).toBe(1.00);
      expect(result.conversionMethod).toBe('valuation_cap');
      expect(result.safeShares).toBe(500000); // 500000 / 1.00
      expect(result.postConversionShares).toBe(5500000);
      expect(result.dilutionPercentage).toBeCloseTo((500000 / 5500000) * 100, 2);
      expect(result.safeOwnership).toBeCloseTo((500000 / 5500000) * 100, 2);
    });

    it('should calculate dilution using discount when discounted price is lower', async () => {
      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 500000,
        valuationCap: 20000000,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 5000000
      });

      // capPrice = 20000000 / 5000000 = $4.00
      // discountedPrice = $2.00 * (1 - 0.20) = $1.60
      // conversionPrice = min($4.00, $1.60) = $1.60
      expect(result.conversionPrice).toBe(1.60);
      expect(result.conversionMethod).toBe('discount');
      expect(result.safeShares).toBe(Math.round(500000 / 1.60));
    });

    it('should handle no discount rate (default 0)', async () => {
      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 500000,
        valuationCap: 5000000,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 5000000
      });

      // capPrice = 1.00, discountedPrice = $2.00 * (1 - 0/100) = $2.00
      // conversionPrice = min(1.00, 2.00) = 1.00
      expect(result.conversionPrice).toBe(1.00);
      expect(result.conversionMethod).toBe('valuation_cap');
    });

    it('should handle no valuation cap (Infinity cap price)', async () => {
      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 500000,
        valuationCap: null,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 5000000
      });

      // capPrice = Infinity (no cap)
      // discountedPrice = $2.00 * 0.80 = $1.60
      // conversionPrice = min(Infinity, $1.60) = $1.60
      expect(result.conversionPrice).toBe(1.60);
      expect(result.conversionMethod).toBe('discount');
    });

    it('should handle zero existing shares with a cap (Infinity cap price)', async () => {
      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 0
      });

      // capPrice = Infinity (0 shares), discountedPrice = $1.60
      // conversionPrice = $1.60
      expect(result.conversionPrice).toBe(1.60);
      expect(result.safeShares).toBe(Math.round(500000 / 1.60));
    });

    it('should save calculation when scenarioId is provided', async () => {
      DilutionCalculation.create = jest.fn().mockResolvedValue({ _id: 'calc-1' });

      await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        scenarioId: 'scenario-123',
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 5000000
      });

      expect(DilutionCalculation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: 'scenario-123',
          companyId: 'comp-1',
          calculationType: 'safe_conversion'
        })
      );
    });

    it('should NOT save calculation when scenarioId is not provided', async () => {
      DilutionCalculation.create = jest.fn();

      await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 5000000
      });

      expect(DilutionCalculation.create).not.toHaveBeenCalled();
    });

    it('should return zero shares when conversionPrice is zero', async () => {
      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 500000,
        valuationCap: 0,
        discountRate: 100,
        pricePerShare: 0,
        preMoneyValuation: 0,
        existingShares: 5000000
      });

      expect(result.safeShares).toBe(0);
      expect(result.dilutionPercentage).toBe(0);
    });

    it('should return correct result shape with all expected fields', async () => {
      const result = await SAFEDilutionService.calculateSAFEDilution({
        companyId: 'comp-1',
        safeAmount: 100000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        preMoneyValuation: 10000000,
        existingShares: 1000000
      });

      expect(result).toHaveProperty('safeAmount', 100000);
      expect(result).toHaveProperty('valuationCap', 5000000);
      expect(result).toHaveProperty('discountRate', 20);
      expect(result).toHaveProperty('pricePerShare', 2.00);
      expect(result).toHaveProperty('conversionPrice');
      expect(result).toHaveProperty('conversionMethod');
      expect(result).toHaveProperty('safeShares');
      expect(result).toHaveProperty('existingShares', 1000000);
      expect(result).toHaveProperty('postConversionShares');
      expect(result).toHaveProperty('dilutionPercentage');
      expect(result).toHaveProperty('safeOwnership');
    });
  });

  // ---------------------------------------------------------------------------
  // calculateMultiSAFEDilution
  // ---------------------------------------------------------------------------
  describe('calculateMultiSAFEDilution', () => {
    it('should calculate dilution from multiple SAFEs', async () => {
      DilutionCalculation.create = jest.fn().mockResolvedValue({});

      const result = await SAFEDilutionService.calculateMultiSAFEDilution({
        companyId: 'comp-1',
        scenarioId: 'sc-1',
        safes: [
          { safeId: 'safe-1', investorName: 'Investor A', amount: 500000, valuationCap: 5000000, discountRate: 20 },
          { safeId: 'safe-2', investorName: 'Investor B', amount: 250000, valuationCap: 8000000, discountRate: 15 }
        ],
        pricePerShare: 2.00,
        existingShares: 5000000
      });

      expect(result.safes).toHaveLength(2);
      expect(result.totalSAFEAmount).toBe(750000);
      expect(result.totalSAFEShares).toBeGreaterThan(0);
      expect(result.existingShares).toBe(5000000);
      expect(result.postConversionShares).toBe(5000000 + result.totalSAFEShares);
      expect(result.totalDilution).toBeGreaterThan(0);
    });

    it('should include per-SAFE details with investorName', async () => {
      const result = await SAFEDilutionService.calculateMultiSAFEDilution({
        companyId: 'comp-1',
        safes: [
          { safeId: 'safe-1', investorName: 'Alice', amount: 100000, valuationCap: 5000000, discountRate: 20 }
        ],
        pricePerShare: 2.00,
        existingShares: 1000000
      });

      expect(result.safes[0]).toHaveProperty('safeId', 'safe-1');
      expect(result.safes[0]).toHaveProperty('investorName', 'Alice');
      expect(result.safes[0]).toHaveProperty('safeShares');
      expect(result.safes[0]).toHaveProperty('conversionPrice');
    });

    it('should save calculation when scenarioId is provided', async () => {
      DilutionCalculation.create = jest.fn().mockResolvedValue({});

      await SAFEDilutionService.calculateMultiSAFEDilution({
        companyId: 'comp-1',
        scenarioId: 'multi-sc-1',
        safes: [
          { safeId: 'safe-1', investorName: 'Investor A', amount: 100000, valuationCap: 5000000, discountRate: 20 }
        ],
        pricePerShare: 2.00,
        existingShares: 1000000
      });

      expect(DilutionCalculation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: 'multi-sc-1',
          calculationType: 'safe_conversion'
        })
      );
    });

    it('should NOT save when scenarioId is not provided', async () => {
      DilutionCalculation.create = jest.fn();

      await SAFEDilutionService.calculateMultiSAFEDilution({
        companyId: 'comp-1',
        safes: [
          { safeId: 'safe-1', investorName: 'Investor A', amount: 100000, valuationCap: 5000000, discountRate: 20 }
        ],
        pricePerShare: 2.00,
        existingShares: 1000000
      });

      expect(DilutionCalculation.create).not.toHaveBeenCalled();
    });

    it('should handle empty safes array', async () => {
      const result = await SAFEDilutionService.calculateMultiSAFEDilution({
        companyId: 'comp-1',
        safes: [],
        pricePerShare: 2.00,
        existingShares: 1000000
      });

      expect(result.safes).toHaveLength(0);
      expect(result.totalSAFEAmount).toBe(0);
      expect(result.totalSAFEShares).toBe(0);
      expect(result.totalDilution).toBe(0);
    });

    it('should return zero dilution when existing shares are zero', async () => {
      const result = await SAFEDilutionService.calculateMultiSAFEDilution({
        companyId: 'comp-1',
        safes: [
          { safeId: 'safe-1', investorName: 'Investor A', amount: 100000, valuationCap: null, discountRate: 20 }
        ],
        pricePerShare: 2.00,
        existingShares: 0
      });

      // With zero existing shares, cap price is Infinity, uses discount
      expect(result.totalSAFEShares).toBeGreaterThan(0);
      expect(result.totalDilution).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // calculatePostMoneySAFE (synchronous)
  // ---------------------------------------------------------------------------
  describe('calculatePostMoneySAFE', () => {
    it('should calculate ownership for a post-money SAFE', () => {
      const result = SAFEDilutionService.calculatePostMoneySAFE({
        safeAmount: 1000000,
        postMoneyValuation: 10000000
      });

      expect(result.safeOwnership).toBe(10); // 1M / 10M = 10%
      expect(result.conversionMethod).toBe('post_money');
      expect(result.safeAmount).toBe(1000000);
      expect(result.postMoneyValuation).toBe(10000000);
    });

    it('should handle small investment amounts', () => {
      const result = SAFEDilutionService.calculatePostMoneySAFE({
        safeAmount: 50000,
        postMoneyValuation: 10000000
      });

      expect(result.safeOwnership).toBe(0.5);
    });

    it('should handle large investment amounts relative to valuation', () => {
      const result = SAFEDilutionService.calculatePostMoneySAFE({
        safeAmount: 5000000,
        postMoneyValuation: 10000000
      });

      expect(result.safeOwnership).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // compareConversionMethods (synchronous)
  // ---------------------------------------------------------------------------
  describe('compareConversionMethods', () => {
    it('should compare cap vs discount and identify better method', () => {
      const result = SAFEDilutionService.compareConversionMethods({
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        existingShares: 5000000
      });

      // capPrice = 5M / 5M = $1.00, capShares = 500000
      // discountPrice = $2 * 0.80 = $1.60, discountShares = 312500
      expect(result.valuationCap.price).toBe(1.00);
      expect(result.valuationCap.shares).toBe(500000);
      expect(result.discount.price).toBe(1.60);
      expect(result.discount.shares).toBe(312500);
      expect(result.betterMethod).toBe('valuation_cap');
      expect(result.shareDifference).toBe(187500);
    });

    it('should identify discount as better when it yields more shares', () => {
      const result = SAFEDilutionService.compareConversionMethods({
        safeAmount: 500000,
        valuationCap: 50000000,  // high cap
        discountRate: 50,         // steep discount
        pricePerShare: 2.00,
        existingShares: 5000000
      });

      // capPrice = 50M / 5M = $10.00, capShares = 50000
      // discountPrice = $2 * 0.50 = $1.00, discountShares = 500000
      expect(result.betterMethod).toBe('discount');
    });

    it('should handle null/zero valuation cap gracefully', () => {
      const result = SAFEDilutionService.compareConversionMethods({
        safeAmount: 500000,
        valuationCap: null,
        discountRate: 20,
        pricePerShare: 2.00,
        existingShares: 5000000
      });

      expect(result.valuationCap.price).toBe(Infinity);
      expect(result.valuationCap.shares).toBe(0);
      expect(result.betterMethod).toBe('discount');
    });

    it('should handle zero discount rate', () => {
      const result = SAFEDilutionService.compareConversionMethods({
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 0,
        pricePerShare: 2.00,
        existingShares: 5000000
      });

      // discountPrice = $2 * 1.0 = $2.00, discountShares = 250000
      expect(result.discount.price).toBe(2.00);
      expect(result.betterMethod).toBe('valuation_cap');
    });

    it('should calculate ownership percentages for both methods', () => {
      const result = SAFEDilutionService.compareConversionMethods({
        safeAmount: 500000,
        valuationCap: 5000000,
        discountRate: 20,
        pricePerShare: 2.00,
        existingShares: 5000000
      });

      // capShares = 500000; ownership = 500000 / 5500000 = 9.09%
      expect(result.valuationCap.ownership).toBeCloseTo((500000 / 5500000) * 100, 1);
      // discountShares = 312500; ownership = 312500 / 5312500 = 5.88%
      expect(result.discount.ownership).toBeCloseTo((312500 / 5312500) * 100, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getCompanySAFEDilution
  // ---------------------------------------------------------------------------
  describe('getCompanySAFEDilution', () => {
    it('should return summary of company SAFEs', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { safeId: 'SAFE-001', investorName: 'Investor A', investmentAmount: 500000, valuationCap: 5000000, discountRate: 0.2, safeType: 'post-money' },
        { safeId: 'SAFE-002', investorName: 'Investor B', investmentAmount: 250000, valuationCap: null, discountRate: 0.15, safeType: 'pre-money' },
        { safeId: 'SAFE-003', investorName: 'Investor C', investmentAmount: 100000, valuationCap: 8000000, discountRate: null, safeType: 'post-money' }
      ]);

      const result = await SAFEDilutionService.getCompanySAFEDilution('comp-1');

      expect(result.totalSAFEs).toBe(3);
      expect(result.totalSAFEAmount).toBe(850000);
      expect(result.safesWithCap).toBe(2);
      expect(result.safesWithDiscount).toBe(2);
      expect(result.safes).toHaveLength(3);
      expect(result.safes[0]).toHaveProperty('safeId', 'SAFE-001');
      expect(result.safes[0]).toHaveProperty('investorName', 'Investor A');
      expect(result.safes[0]).toHaveProperty('amount', 500000);
      expect(result.safes[0]).toHaveProperty('valuationCap', 5000000);
      expect(result.safes[0]).toHaveProperty('type', 'post-money');
    });

    it('should handle company with no SAFEs', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      const result = await SAFEDilutionService.getCompanySAFEDilution('comp-empty');

      expect(result.totalSAFEs).toBe(0);
      expect(result.totalSAFEAmount).toBe(0);
      expect(result.safesWithCap).toBe(0);
      expect(result.safesWithDiscount).toBe(0);
      expect(result.safes).toHaveLength(0);
    });

    it('should handle SAFEs with missing investment amounts', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { safeId: 'SAFE-001', investorName: 'Investor A', investmentAmount: null, valuationCap: 5000000, discountRate: 0.2, safeType: 'post-money' }
      ]);

      const result = await SAFEDilutionService.getCompanySAFEDilution('comp-1');

      expect(result.totalSAFEAmount).toBe(0);
    });

    it('should query with correct filter for funded/active SAFEs', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      await SAFEDilutionService.getCompanySAFEDilution('comp-1');

      expect(databaseAdapter.find).toHaveBeenCalledWith('SAFE', {
        companyId: 'comp-1',
        status: { $in: ['funded', 'active'] }
      });
    });
  });

  // ---------------------------------------------------------------------------
  // calculateMFNTerms (synchronous)
  // ---------------------------------------------------------------------------
  describe('calculateMFNTerms', () => {
    it('should find the best terms (lowest cap, highest discount)', () => {
      const safes = [
        { valuationCap: 10000000, discountRate: 0.15 },
        { valuationCap: 5000000, discountRate: 0.20 },
        { valuationCap: 8000000, discountRate: 0.10 }
      ];

      const result = SAFEDilutionService.calculateMFNTerms(safes);

      expect(result.valuationCap).toBe(5000000);
      expect(result.discountRate).toBe(0.20);
      expect(result.mfnTriggered).toBe(true);
    });

    it('should return nulls when no SAFEs have cap or discount', () => {
      const safes = [
        { valuationCap: null, discountRate: null },
        { valuationCap: null, discountRate: 0 }
      ];

      const result = SAFEDilutionService.calculateMFNTerms(safes);

      expect(result.valuationCap).toBeNull();
      expect(result.discountRate).toBeNull();
      expect(result.mfnTriggered).toBe(false);
    });

    it('should handle empty array of SAFEs', () => {
      const result = SAFEDilutionService.calculateMFNTerms([]);

      expect(result.valuationCap).toBeNull();
      expect(result.discountRate).toBeNull();
      expect(result.mfnTriggered).toBe(false);
    });

    it('should trigger MFN when only valuation cap is present', () => {
      const safes = [
        { valuationCap: 8000000, discountRate: null }
      ];

      const result = SAFEDilutionService.calculateMFNTerms(safes);

      expect(result.valuationCap).toBe(8000000);
      expect(result.discountRate).toBeNull();
      expect(result.mfnTriggered).toBe(true);
    });

    it('should trigger MFN when only discount rate is present', () => {
      const safes = [
        { valuationCap: null, discountRate: 0.25 }
      ];

      const result = SAFEDilutionService.calculateMFNTerms(safes);

      expect(result.valuationCap).toBeNull();
      expect(result.discountRate).toBe(0.25);
      expect(result.mfnTriggered).toBe(true);
    });
  });
});
