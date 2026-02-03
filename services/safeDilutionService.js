/**
 * SAFE Dilution Service
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Service for calculating dilution from SAFE conversions.
 * Handles valuation cap and discount rate scenarios.
 */

const DilutionCalculation = require('../models/DilutionCalculation');
const databaseAdapter = require('./databaseAdapter');

class SAFEDilutionService {
  /**
   * Calculate SAFE conversion dilution
   * @param {Object} params - Calculation parameters
   * @returns {Object} SAFE dilution results
   */
  static async calculateSAFEDilution(params) {
    const {
      companyId,
      scenarioId,
      safeAmount,
      valuationCap,
      discountRate = 0,
      pricePerShare,
      preMoneyValuation,
      existingShares
    } = params;

    // Determine conversion price (lower of cap price or discounted price)
    const capPrice = valuationCap && existingShares > 0
      ? valuationCap / existingShares
      : Infinity;

    const discountedPrice = pricePerShare * (1 - discountRate / 100);
    const conversionPrice = Math.min(capPrice, discountedPrice);

    // Calculate shares from SAFE conversion
    const safeShares = conversionPrice > 0 ? Math.round(safeAmount / conversionPrice) : 0;

    // Calculate post-conversion totals
    const postConversionShares = existingShares + safeShares;
    const dilutionPercentage = postConversionShares > 0
      ? (safeShares / postConversionShares) * 100
      : 0;

    // Calculate SAFE investor ownership
    const safeOwnership = postConversionShares > 0
      ? (safeShares / postConversionShares) * 100
      : 0;

    // Determine which method was used
    let conversionMethod = 'discount';
    if (capPrice < discountedPrice) {
      conversionMethod = 'valuation_cap';
    }

    const results = {
      safeAmount,
      valuationCap,
      discountRate,
      pricePerShare,
      conversionPrice,
      conversionMethod,
      safeShares,
      existingShares,
      postConversionShares,
      dilutionPercentage,
      safeOwnership
    };

    // Save calculation if scenarioId provided
    if (scenarioId) {
      await DilutionCalculation.create({
        scenarioId,
        companyId,
        calculationType: 'safe_conversion',
        inputs: params,
        results
      });
    }

    return results;
  }

  /**
   * Calculate dilution from multiple SAFEs
   * @param {Object} params - Calculation parameters
   * @returns {Object} Multi-SAFE dilution results
   */
  static async calculateMultiSAFEDilution(params) {
    const {
      companyId,
      scenarioId,
      safes,
      pricePerShare,
      existingShares
    } = params;

    let totalSAFEShares = 0;
    const safeResults = [];

    // Calculate each SAFE conversion
    for (const safe of safes) {
      const result = await this.calculateSAFEDilution({
        companyId,
        safeAmount: safe.amount,
        valuationCap: safe.valuationCap,
        discountRate: safe.discountRate,
        pricePerShare,
        existingShares,
        preMoneyValuation: safe.preMoneyValuation
      });

      totalSAFEShares += result.safeShares;
      safeResults.push({
        safeId: safe.safeId,
        investorName: safe.investorName,
        ...result
      });
    }

    // Calculate total dilution
    const postConversionShares = existingShares + totalSAFEShares;
    const totalDilution = postConversionShares > 0
      ? (totalSAFEShares / postConversionShares) * 100
      : 0;

    const results = {
      safes: safeResults,
      totalSAFEAmount: safes.reduce((sum, s) => sum + s.amount, 0),
      totalSAFEShares,
      existingShares,
      postConversionShares,
      totalDilution
    };

    // Save calculation if scenarioId provided
    if (scenarioId) {
      await DilutionCalculation.create({
        scenarioId,
        companyId,
        calculationType: 'safe_conversion',
        inputs: params,
        results
      });
    }

    return results;
  }

  /**
   * Calculate SAFE conversion with post-money calculation
   * @param {Object} params - Calculation parameters
   * @returns {Object} Post-money SAFE conversion results
   */
  static calculatePostMoneySAFE(params) {
    const {
      safeAmount,
      postMoneyValuation
    } = params;

    // In post-money SAFE, ownership is straightforward
    const safeOwnership = (safeAmount / postMoneyValuation) * 100;

    return {
      safeAmount,
      postMoneyValuation,
      safeOwnership,
      conversionMethod: 'post_money'
    };
  }

  /**
   * Calculate SAFE conversion scenarios (cap vs discount)
   * @param {Object} params - Calculation parameters
   * @returns {Object} Comparison of conversion methods
   */
  static compareConversionMethods(params) {
    const {
      safeAmount,
      valuationCap,
      discountRate,
      pricePerShare,
      existingShares
    } = params;

    // Calculate cap method
    const capPrice = valuationCap && existingShares > 0
      ? valuationCap / existingShares
      : Infinity;
    const capShares = capPrice !== Infinity && capPrice > 0
      ? Math.round(safeAmount / capPrice)
      : 0;

    // Calculate discount method
    const discountedPrice = pricePerShare * (1 - discountRate / 100);
    const discountShares = discountedPrice > 0
      ? Math.round(safeAmount / discountedPrice)
      : 0;

    // Determine which is better for investor
    const betterMethod = capShares > discountShares ? 'valuation_cap' : 'discount';

    return {
      valuationCap: {
        price: capPrice,
        shares: capShares,
        ownership: (capShares / (existingShares + capShares)) * 100
      },
      discount: {
        price: discountedPrice,
        shares: discountShares,
        ownership: (discountShares / (existingShares + discountShares)) * 100
      },
      betterMethod,
      shareDifference: Math.abs(capShares - discountShares)
    };
  }

  /**
   * Get all SAFEs for a company and calculate total dilution
   * @param {string} companyId - Company ID
   * @returns {Object} Total SAFE dilution summary
   */
  static async getCompanySAFEDilution(companyId) {
    const safes = await databaseAdapter.find('SAFE', {
      companyId,
      status: { $in: ['funded', 'active'] }
    });

    const totalSAFEAmount = safes.reduce((sum, safe) => sum + (safe.investmentAmount || 0), 0);
    const safesWithCap = safes.filter(s => s.valuationCap).length;
    const safesWithDiscount = safes.filter(s => s.discountRate).length;

    return {
      totalSAFEs: safes.length,
      totalSAFEAmount,
      safesWithCap,
      safesWithDiscount,
      safes: safes.map(s => ({
        safeId: s.safeId,
        investorName: s.investorName,
        amount: s.investmentAmount,
        valuationCap: s.valuationCap,
        discountRate: s.discountRate,
        type: s.safeType
      }))
    };
  }

  /**
   * Calculate MFN (Most Favored Nation) SAFE terms
   * @param {Array} safes - Array of SAFE objects
   * @returns {Object} MFN terms
   */
  static calculateMFNTerms(safes) {
    let bestValuationCap = Infinity;
    let bestDiscountRate = 0;

    for (const safe of safes) {
      if (safe.valuationCap && safe.valuationCap < bestValuationCap) {
        bestValuationCap = safe.valuationCap;
      }
      if (safe.discountRate && safe.discountRate > bestDiscountRate) {
        bestDiscountRate = safe.discountRate;
      }
    }

    return {
      valuationCap: bestValuationCap !== Infinity ? bestValuationCap : null,
      discountRate: bestDiscountRate || null,
      mfnTriggered: bestValuationCap !== Infinity || bestDiscountRate > 0
    };
  }
}

module.exports = SAFEDilutionService;
