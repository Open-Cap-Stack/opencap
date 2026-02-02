/**
 * SAFE Conversion Service Tests
 * Feature: Issue #68 - SAFE Conversion Engine
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../../models/SAFE');
jest.mock('../../../models/SAFEConversion');

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
      const companyId = new mongoose.Types.ObjectId();

      const mockSafes = [
        {
          _id: new mongoose.Types.ObjectId(),
          safeId: 'safe_1',
          investorId: { _id: new mongoose.Types.ObjectId() },
          investorName: 'Investor 1',
          investmentAmount: 100000,
          safeType: 'post-money',
          valuationCap: 5000000,
          discountRate: 0.20,
          proRataRights: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          safeId: 'safe_2',
          investorId: { _id: new mongoose.Types.ObjectId() },
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
      const companyId = new mongoose.Types.ObjectId();

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
  });
});
