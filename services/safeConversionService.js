/**
 * SAFE Conversion Service
 * Feature: Issue #68 - SAFE Conversion Engine
 * [Issue #175] ZeroDB Migration - Conditional MongoDB Loading
 *
 * This service uses MongoDB transactions when available (mongodb-only or parallel mode).
 * In zerodb-only mode, transactions are not available but operations still work.
 */
const SAFE = require('../models/SAFE');
const SAFEConversion = require('../models/SAFEConversion');
const databaseAdapter = require('./databaseAdapter');

// Determine if MongoDB is required based on migration mode
const migrationMode = process.env.MIGRATION_MODE || 'mongodb-only';
const isMongoDBRequired = migrationMode !== 'zerodb-only';

// Lazy load mongoose only when needed (for transactions)
let mongoose = null;
function getMongoose() {
  if (!mongoose) {
    if (!isMongoDBRequired) {
      return null; // Transactions not available in zerodb-only mode
    }
    mongoose = require('mongoose');
  }
  return mongoose;
}

class SAFEConversionService {
  /**
   * Calculate conversion for a single SAFE
   */
  static calculateConversion(safeTerms, roundTerms) {
    return SAFEConversion.calculateConversion(safeTerms, roundTerms);
  }

  /**
   * Preview conversions for all eligible SAFEs in a funding round
   */
  static async previewRoundConversions(companyId, roundTerms) {
    // Find all funded SAFEs eligible for conversion
    const eligibleSAFEs = await SAFE.find({
      companyId,
      status: 'funded'
    }).populate('investorId', 'name email');

    const previews = [];
    let totalShares = 0;
    let totalInvestment = 0;

    for (const safe of eligibleSAFEs) {
      const safeTerms = {
        safeType: safe.safeType,
        investmentAmount: safe.investmentAmount,
        valuationCap: safe.valuationCap,
        discountRate: safe.discountRate
      };

      const calculation = this.calculateConversion(safeTerms, roundTerms);

      previews.push({
        safeId: safe._id,
        safeIdentifier: safe.safeId,
        investorId: safe.investorId._id,
        investorName: safe.investorName,
        investmentAmount: safe.investmentAmount,
        safeType: safe.safeType,
        valuationCap: safe.valuationCap,
        discountRate: safe.discountRate,
        calculation,
        sharesIssued: calculation.sharesIssued,
        effectivePrice: calculation.effectivePrice,
        methodUsed: calculation.methodUsed,
        proRataEligible: safe.proRataRights
      });

      totalShares += calculation.sharesIssued;
      totalInvestment += safe.investmentAmount;
    }

    // Calculate dilution impact
    const postConversionShares = roundTerms.fullyDilutedShares + totalShares;
    const dilutionFromSAFEs = (totalShares / postConversionShares) * 100;

    return {
      eligibleSAFEsCount: eligibleSAFEs.length,
      totalInvestment,
      totalSharesFromConversion: totalShares,
      dilutionFromSAFEs,
      roundTerms,
      previews
    };
  }

  /**
   * Create conversion records for a funding round
   * Uses MongoDB transactions when available, falls back to non-transactional in zerodb-only mode
   */
  static async createRoundConversions(companyId, fundingRoundId, roundTerms, shareClassId, userId) {
    const mongooseInstance = getMongoose();
    const useTransactions = mongooseInstance && isMongoDBRequired;

    let session = null;
    if (useTransactions) {
      session = await mongooseInstance.startSession();
      session.startTransaction();
    }

    try {
      // Get preview data
      const preview = await this.previewRoundConversions(companyId, roundTerms);

      const conversions = [];

      for (const previewItem of preview.previews) {
        const conversion = new SAFEConversion({
          safeId: previewItem.safeId,
          companyId,
          fundingRoundId,
          investorId: previewItem.investorId,
          investorName: previewItem.investorName,
          safeTerms: {
            safeType: previewItem.safeType,
            investmentAmount: previewItem.investmentAmount,
            valuationCap: previewItem.valuationCap,
            discountRate: previewItem.discountRate,
            proRataRights: previewItem.proRataEligible
          },
          roundTerms: {
            roundName: roundTerms.roundName,
            roundType: roundTerms.roundType,
            preMoneyValuation: roundTerms.preMoneyValuation,
            pricePerShare: roundTerms.pricePerShare,
            fullyDilutedShares: roundTerms.fullyDilutedShares,
            totalRoundSize: roundTerms.totalRoundSize
          },
          calculation: previewItem.calculation,
          shareClassId,
          shareClassName: roundTerms.shareClassName,
          sharesIssued: previewItem.sharesIssued,
          pricePerShare: previewItem.effectivePrice,
          proRata: {
            eligible: previewItem.proRataEligible,
            allocationAmount: previewItem.proRataEligible
              ? this.calculateProRataAllocation(previewItem, roundTerms)
              : null
          },
          createdBy: userId
        });

        if (session) {
          await conversion.save({ session });
        } else {
          await conversion.save();
        }
        conversions.push(conversion);
      }

      if (session) {
        await session.commitTransaction();
      }

      return {
        conversionsCreated: conversions.length,
        totalShares: preview.totalSharesFromConversion,
        totalInvestment: preview.totalInvestment,
        conversions
      };
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Calculate pro-rata allocation for an investor
   */
  static calculateProRataAllocation(conversionPreview, roundTerms) {
    if (!roundTerms.totalRoundSize) return null;

    // Pro-rata based on ownership percentage
    const ownershipPercent = conversionPreview.calculation.ownershipPercentage / 100;
    return Math.round(roundTerms.totalRoundSize * ownershipPercent);
  }

  /**
   * Approve all pending conversions for a round
   */
  static async approveRoundConversions(fundingRoundId, userId) {
    const pendingConversions = await SAFEConversion.find({
      fundingRoundId,
      status: 'pending'
    });

    const results = [];
    for (const conversion of pendingConversions) {
      await conversion.approve(userId);
      results.push({
        conversionId: conversion.conversionId,
        investorName: conversion.investorName,
        status: 'approved'
      });
    }

    return {
      approvedCount: results.length,
      results
    };
  }

  /**
   * Execute a single conversion
   */
  static async executeConversion(conversionId, userId, equityGrantId = null) {
    const conversion = await SAFEConversion.findOne({ conversionId });
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    // Execute the conversion
    await conversion.execute(userId, equityGrantId);

    // Update the SAFE status
    const safe = await SAFE.findById(conversion.safeId);
    if (safe) {
      await safe.recordConversion({
        fundingRoundId: conversion.fundingRoundId,
        shareClassId: conversion.shareClassId,
        shares: conversion.sharesIssued,
        pricePerShare: conversion.pricePerShare,
        methodUsed: conversion.calculation.methodUsed,
        effectivePrice: conversion.calculation.effectivePrice,
        calculationDetails: conversion.calculation
      }, userId);
    }

    return conversion;
  }

  /**
   * Execute all approved conversions for a round
   */
  static async executeRoundConversions(fundingRoundId, userId, createEquityGrants = false) {
    const approvedConversions = await SAFEConversion.find({
      fundingRoundId,
      status: 'approved'
    });

    const results = [];
    for (const conversion of approvedConversions) {
      try {
        // In a real implementation, this would create equity grants
        let equityGrantId = null;
        if (createEquityGrants) {
          // equityGrantId = await this.createEquityGrant(conversion);
        }

        await this.executeConversion(conversion.conversionId, userId, equityGrantId);

        results.push({
          conversionId: conversion.conversionId,
          investorName: conversion.investorName,
          sharesIssued: conversion.sharesIssued,
          status: 'executed'
        });
      } catch (error) {
        results.push({
          conversionId: conversion.conversionId,
          investorName: conversion.investorName,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      executedCount: results.filter(r => r.status === 'executed').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results
    };
  }

  /**
   * Get conversion summary for a company
   */
  static async getCompanyConversionSummary(companyId) {
    const conversions = await SAFEConversion.find({ companyId });

    const summary = {
      total: conversions.length,
      byStatus: {},
      totalSharesIssued: 0,
      totalInvestmentConverted: 0,
      byMethod: {}
    };

    for (const conversion of conversions) {
      // Count by status
      summary.byStatus[conversion.status] = (summary.byStatus[conversion.status] || 0) + 1;

      // Sum executed conversions
      if (conversion.status === 'executed') {
        summary.totalSharesIssued += conversion.sharesIssued;
        summary.totalInvestmentConverted += conversion.safeTerms.investmentAmount;

        // Count by method
        const method = conversion.calculation.methodUsed;
        summary.byMethod[method] = (summary.byMethod[method] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Model MFN conversion - find best terms among all SAFEs
   */
  static async calculateMFNTerms(companyId) {
    const safes = await SAFE.find({
      companyId,
      status: 'funded',
      safeType: { $ne: 'mfn' }
    });

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
      valuationCap: bestValuationCap === Infinity ? null : bestValuationCap,
      discountRate: bestDiscountRate || null,
      safesAnalyzed: safes.length
    };
  }
}

module.exports = SAFEConversionService;
