/**
 * WaterfallAllocation Model
 * Issue #271: Create waterfall allocation model for liquidation analysis
 *
 * Data model for calculating and storing liquidation waterfall allocations.
 * Determines how enterprise value flows to each security class based on
 * liquidation preferences, participation rights, and conversion options.
 *
 * Supports:
 * - Non-participating preferred (preference or convert to common)
 * - Participating preferred (preference + pro-rata common)
 * - Capped participating (preference + capped pro-rata)
 * - Seniority stacks with multiple preferred share classes
 * - Option pool handling with strike price calculations
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid scenario types
const SCENARIO_TYPES = ['ACQUISITION', 'IPO', 'DISSOLUTION', 'CUSTOM'];

// Valid security types
const SECURITY_TYPES = ['PREFERRED', 'COMMON', 'OPTIONS', 'WARRANTS', 'SAFES', 'NOTES'];

// Valid payout methods
const PAYOUT_METHODS = ['PREFERENCE', 'PARTICIPATION', 'CONVERSION'];

// Valid statuses
const VALID_STATUSES = ['draft', 'calculated', 'finalized', 'archived'];

// Schema definition for documentation and validation
const waterfallAllocationSchema = {
  allocationId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  scenarioName: { type: 'string', required: true },
  scenarioType: { type: 'string', enum: SCENARIO_TYPES, default: 'ACQUISITION' },
  exitValue: { type: 'number', required: true },
  exitDate: { type: 'date', default: null },
  valuationId: { type: 'string', default: null }, // link to 409A valuation

  // Share class configuration - array of objects
  shareClasses: {
    type: 'array',
    default: [],
    // Each object: { shareClassId, name, shares, liquidationPreference, participatingPreferred,
    //                participationCap, seniorityRank, conversionRatio, securityType,
    //                originalInvestment, pricePerShare }
  },

  // Option pool configuration
  optionPool: {
    type: 'object',
    default: {
      totalOptions: 0,
      vestedOptions: 0,
      unvestedOptions: 0,
      strikePrice: 0
    }
  },

  // Calculation results by share class
  results: {
    type: 'array',
    default: [],
    // Each object: { shareClassId, name, securityType, seniorityRank, proceedsPreLiqPref,
    //                proceedsParticipation, proceedsCommon, totalProceeds, pricePerShare,
    //                returnMultiple, payoutMethod, ownershipPercentage }
  },

  // Summary totals
  totalDistributed: { type: 'number', default: 0 },
  remainingProceeds: { type: 'number', default: 0 },
  totalShares: { type: 'number', default: 0 },
  fullyDilutedShares: { type: 'number', default: 0 },

  // Breakpoints for conversion analysis
  breakpoints: {
    type: 'array',
    default: []
    // Each: { shareClassId, name, breakpointType, enterpriseValueThreshold, description }
  },

  // Metadata
  analysisNotes: { type: 'string', default: '' },
  calculatedAt: { type: 'date', default: null },
  calculationVersion: { type: 'string', default: '1.0' },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('waterfall_allocations', waterfallAllocationSchema);

// Extended WaterfallAllocation model with business logic
const WaterfallAllocation = {
  ...baseModel,
  tableName: 'waterfall_allocations',
  schema: waterfallAllocationSchema,

  // Export constants
  SCENARIO_TYPES,
  SECURITY_TYPES,
  PAYOUT_METHODS,
  VALID_STATUSES,

  /**
   * Create a new waterfall allocation with defaults
   * @param {Object} data - Allocation data
   * @returns {Object} Created allocation
   */
  async create(data) {
    // Generate allocationId if not provided
    if (!data.allocationId) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      data.allocationId = `WFA-${timestamp}-${random}`;
    }

    // Validate required fields
    if (!data.companyId) {
      throw new Error('companyId is required');
    }
    if (!data.scenarioName) {
      throw new Error('scenarioName is required');
    }
    if (data.exitValue === undefined || data.exitValue === null) {
      throw new Error('exitValue is required');
    }
    if (data.exitValue < 0) {
      throw new Error('exitValue cannot be negative');
    }

    // Validate scenario type if provided
    if (data.scenarioType && !SCENARIO_TYPES.includes(data.scenarioType)) {
      throw new Error(`scenarioType must be one of: ${SCENARIO_TYPES.join(', ')}`);
    }

    // Set defaults
    if (!data.status) {
      data.status = 'draft';
    }
    if (!data.scenarioType) {
      data.scenarioType = 'ACQUISITION';
    }
    if (!data.optionPool) {
      data.optionPool = { totalOptions: 0, vestedOptions: 0, unvestedOptions: 0, strikePrice: 0 };
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find allocation by allocationId
   * @param {string} allocationId - Allocation ID
   * @returns {Object|null} Allocation or null
   */
  async findByAllocationId(allocationId) {
    return baseModel.findOne.call(baseModel, { allocationId });
  },

  /**
   * Find allocations by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Allocations for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.scenarioType) {
      query.scenarioType = options.scenarioType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find allocations linked to a valuation
   * @param {string} valuationId - Valuation ID
   * @returns {Array} Linked allocations
   */
  async findByValuation(valuationId) {
    return baseModel.find.call(baseModel, { valuationId });
  },

  // ============================================================
  // WATERFALL CALCULATION METHODS
  // ============================================================

  /**
   * Calculate the full waterfall allocation for a given exit value
   * Main entry point for waterfall calculations
   * @param {Object} allocation - Allocation object with shareClasses and optionPool
   * @param {number} exitValue - Optional override of exitValue
   * @returns {Object} Calculated results with results array and summary
   */
  calculateWaterfall(allocation, exitValue = null) {
    if (!allocation) {
      return { results: [], totalDistributed: 0, remainingProceeds: 0 };
    }

    const ev = exitValue !== null ? exitValue : allocation.exitValue;
    if (ev <= 0) {
      return { results: [], totalDistributed: 0, remainingProceeds: 0 };
    }

    // Step 1: Apply liquidation preferences
    const { results: prefResults, remainingAfterPref } = this.applyLiquidationPreferences(
      allocation.shareClasses || [],
      ev
    );

    // Step 2: Distribute participation rights
    const { results: partResults, remainingAfterPart } = this.distributeParticipation(
      prefResults,
      remainingAfterPref,
      allocation.shareClasses || []
    );

    // Step 3: Distribute remaining to common pro-rata
    const { results: finalResults, remainingProceeds } = this.distributeCommonProRata(
      partResults,
      remainingAfterPart,
      allocation.shareClasses || [],
      allocation.optionPool || {}
    );

    // Step 4: Calculate totals
    const totalDistributed = finalResults.reduce((sum, r) => sum + (r.totalProceeds || 0), 0);

    return {
      results: finalResults,
      totalDistributed,
      remainingProceeds
    };
  },

  /**
   * Apply liquidation preferences based on seniority
   * @param {Array} shareClasses - Array of share class configurations
   * @param {number} exitValue - Total exit value to distribute
   * @returns {Object} { results: array of partial results, remainingAfterPref: remaining proceeds }
   */
  applyLiquidationPreferences(shareClasses, exitValue) {
    if (!shareClasses || shareClasses.length === 0) {
      return { results: [], remainingAfterPref: exitValue };
    }

    // Sort by seniority (lower rank = more senior)
    const sorted = [...shareClasses].sort((a, b) =>
      (a.seniorityRank || 999) - (b.seniorityRank || 999)
    );

    let remaining = exitValue;
    const results = [];

    for (const sc of sorted) {
      const securityType = sc.securityType || 'COMMON';

      // Only preferred classes get liquidation preferences
      if (securityType !== 'PREFERRED') {
        results.push({
          shareClassId: sc.shareClassId,
          name: sc.name,
          securityType,
          seniorityRank: sc.seniorityRank || 999,
          shares: sc.shares || 0,
          liquidationPreference: 0,
          proceedsPreLiqPref: 0,
          proceedsParticipation: 0,
          proceedsCommon: 0,
          totalProceeds: 0,
          pricePerShare: 0,
          returnMultiple: 0,
          payoutMethod: null,
          originalInvestment: sc.originalInvestment || 0
        });
        continue;
      }

      // Calculate liquidation preference amount
      const liqPref = sc.liquidationPreference || 0;
      const prefAmount = Math.min(liqPref, remaining);
      remaining = Math.max(0, remaining - prefAmount);

      results.push({
        shareClassId: sc.shareClassId,
        name: sc.name,
        securityType,
        seniorityRank: sc.seniorityRank || 999,
        shares: sc.shares || 0,
        liquidationPreference: liqPref,
        proceedsPreLiqPref: prefAmount,
        proceedsParticipation: 0,
        proceedsCommon: 0,
        totalProceeds: prefAmount,
        pricePerShare: sc.shares > 0 ? prefAmount / sc.shares : 0,
        returnMultiple: sc.originalInvestment > 0 ? prefAmount / sc.originalInvestment : 0,
        payoutMethod: 'PREFERENCE',
        originalInvestment: sc.originalInvestment || 0,
        participatingPreferred: sc.participatingPreferred || false,
        participationCap: sc.participationCap || null,
        conversionRatio: sc.conversionRatio || 1
      });
    }

    return { results, remainingAfterPref: remaining };
  },

  /**
   * Distribute participation rights for participating preferred
   * @param {Array} prefResults - Results after liquidation preference distribution
   * @param {number} remainingProceeds - Remaining proceeds after preferences
   * @param {Array} shareClasses - Original share class configurations
   * @returns {Object} { results: updated results, remainingAfterPart: remaining }
   */
  distributeParticipation(prefResults, remainingProceeds, shareClasses) {
    if (!prefResults || prefResults.length === 0 || remainingProceeds <= 0) {
      return { results: prefResults || [], remainingAfterPart: remainingProceeds };
    }

    // Calculate total participating shares for pro-rata
    let totalParticipatingShares = 0;
    for (const result of prefResults) {
      if (result.participatingPreferred && result.securityType === 'PREFERRED') {
        totalParticipatingShares += result.shares || 0;
      }
    }

    // Include common shares in participation pool
    for (const result of prefResults) {
      if (result.securityType === 'COMMON') {
        totalParticipatingShares += result.shares || 0;
      }
    }

    if (totalParticipatingShares === 0) {
      // Still need to initialize proceedsParticipation for all results
      const initializedResults = prefResults.map(r => ({
        ...r,
        proceedsParticipation: r.proceedsParticipation !== undefined ? r.proceedsParticipation : 0
      }));
      return { results: initializedResults, remainingAfterPart: remainingProceeds };
    }

    let remaining = remainingProceeds;
    const updatedResults = [];

    for (const result of prefResults) {
      const updated = { ...result };

      // Ensure proceedsParticipation is initialized
      if (updated.proceedsParticipation === undefined) {
        updated.proceedsParticipation = 0;
      }

      // Only participating preferred gets participation
      if (result.participatingPreferred && result.securityType === 'PREFERRED') {
        const shares = result.shares || 0;
        const proRataShare = (shares / totalParticipatingShares) * remainingProceeds;

        // Apply participation cap if exists
        let participationAmount = proRataShare;
        if (result.participationCap) {
          const maxParticipation = (result.participationCap * (result.originalInvestment || 0)) - result.proceedsPreLiqPref;
          participationAmount = Math.min(proRataShare, Math.max(0, maxParticipation));
        }

        updated.proceedsParticipation = participationAmount;
        updated.totalProceeds = (updated.proceedsPreLiqPref || 0) + participationAmount;
        updated.pricePerShare = shares > 0 ? updated.totalProceeds / shares : 0;
        updated.returnMultiple = updated.originalInvestment > 0 ?
          updated.totalProceeds / updated.originalInvestment : 0;
        updated.payoutMethod = 'PARTICIPATION';

        remaining -= participationAmount;
      }

      updatedResults.push(updated);
    }

    return { results: updatedResults, remainingAfterPart: Math.max(0, remaining) };
  },

  /**
   * Distribute remaining proceeds to common stockholders pro-rata
   * @param {Array} partResults - Results after participation distribution
   * @param {number} remainingProceeds - Remaining proceeds
   * @param {Array} shareClasses - Original share class configurations
   * @param {Object} optionPool - Option pool configuration
   * @returns {Object} { results: final results, remainingProceeds }
   */
  distributeCommonProRata(partResults, remainingProceeds, shareClasses, optionPool) {
    if (!partResults || partResults.length === 0 || remainingProceeds <= 0) {
      return { results: partResults || [], remainingProceeds };
    }

    // Calculate total common-equivalent shares
    let totalCommonEquivShares = 0;

    // Common shares
    for (const result of partResults) {
      if (result.securityType === 'COMMON') {
        totalCommonEquivShares += result.shares || 0;
      }
    }

    // Options (net of strike price)
    const vestedOptions = optionPool?.vestedOptions || 0;
    const strikePrice = optionPool?.strikePrice || 0;
    totalCommonEquivShares += vestedOptions;

    // Non-participating preferred that may convert
    for (const result of partResults) {
      if (result.securityType === 'PREFERRED' && !result.participatingPreferred) {
        // Check if conversion is more valuable
        const shares = result.shares || 0;
        const conversionRatio = result.conversionRatio || 1;
        const commonEquivShares = shares * conversionRatio;
        totalCommonEquivShares += commonEquivShares;
      }
    }

    if (totalCommonEquivShares === 0) {
      return { results: partResults, remainingProceeds };
    }

    const updatedResults = [];
    let remaining = remainingProceeds;

    for (const result of partResults) {
      const updated = { ...result };

      if (result.securityType === 'COMMON') {
        const shares = result.shares || 0;
        const proRataShare = (shares / totalCommonEquivShares) * remainingProceeds;

        updated.proceedsCommon = proRataShare;
        updated.totalProceeds = proRataShare;
        updated.pricePerShare = shares > 0 ? proRataShare / shares : 0;
        updated.payoutMethod = 'CONVERSION';

        remaining -= proRataShare;
      } else if (result.securityType === 'PREFERRED' && !result.participatingPreferred) {
        // Non-participating preferred: compare preference vs conversion
        const shares = result.shares || 0;
        const conversionRatio = result.conversionRatio || 1;
        const commonEquivShares = shares * conversionRatio;
        const conversionValue = (commonEquivShares / totalCommonEquivShares) * remainingProceeds;

        if (conversionValue > result.proceedsPreLiqPref) {
          // Conversion is better
          updated.proceedsCommon = conversionValue;
          updated.totalProceeds = conversionValue;
          updated.pricePerShare = shares > 0 ? conversionValue / shares : 0;
          updated.returnMultiple = updated.originalInvestment > 0 ?
            conversionValue / updated.originalInvestment : 0;
          updated.payoutMethod = 'CONVERSION';
          remaining -= conversionValue;
        } else {
          // Keep preference payout (already accounted for in remaining)
          // Don't subtract from remaining again
        }
      }

      updatedResults.push(updated);
    }

    // Handle option pool proceeds
    if (vestedOptions > 0 && totalCommonEquivShares > 0) {
      const optionProRataShare = (vestedOptions / totalCommonEquivShares) * remainingProceeds;
      const netOptionProceeds = optionProRataShare - (vestedOptions * strikePrice);

      updatedResults.push({
        shareClassId: 'OPTIONS',
        name: 'Option Pool (Vested)',
        securityType: 'OPTIONS',
        seniorityRank: 999,
        shares: vestedOptions,
        liquidationPreference: 0,
        proceedsPreLiqPref: 0,
        proceedsParticipation: 0,
        proceedsCommon: Math.max(0, netOptionProceeds),
        totalProceeds: Math.max(0, netOptionProceeds),
        pricePerShare: vestedOptions > 0 ? Math.max(0, netOptionProceeds) / vestedOptions : 0,
        returnMultiple: 0,
        payoutMethod: 'CONVERSION',
        strikePrice,
        originalInvestment: 0
      });

      remaining -= optionProRataShare;
    }

    return { results: updatedResults, remainingProceeds: Math.max(0, remaining) };
  },

  /**
   * Get breakdown by share class
   * @param {Object} allocation - Allocation with calculated results
   * @returns {Array} Formatted breakdown by share class
   */
  getShareClassBreakdown(allocation) {
    if (!allocation || !allocation.results) {
      return [];
    }

    return allocation.results.map(r => ({
      shareClassId: r.shareClassId,
      name: r.name,
      securityType: r.securityType,
      shares: r.shares,
      liquidationPreference: r.liquidationPreference || 0,
      proceedsBreakdown: {
        fromPreference: r.proceedsPreLiqPref || 0,
        fromParticipation: r.proceedsParticipation || 0,
        fromCommon: r.proceedsCommon || 0
      },
      totalProceeds: r.totalProceeds || 0,
      pricePerShare: r.pricePerShare || 0,
      returnMultiple: r.returnMultiple || 0,
      payoutMethod: r.payoutMethod,
      ownershipPercentage: allocation.totalDistributed > 0 ?
        ((r.totalProceeds || 0) / allocation.totalDistributed) * 100 : 0
    }));
  },

  /**
   * Generate summary report for the allocation
   * @param {Object} allocation - Allocation with calculated results
   * @returns {Object} Summary report
   */
  generateSummaryReport(allocation) {
    if (!allocation) {
      return {
        scenarioName: '',
        exitValue: 0,
        totalDistributed: 0,
        remainingProceeds: 0,
        shareClassCount: 0,
        preferredCount: 0,
        commonCount: 0,
        breakdownByType: {},
        topRecipients: [],
        effectivePricePerShare: 0
      };
    }

    const results = allocation.results || [];

    // Count by type
    const preferredResults = results.filter(r => r.securityType === 'PREFERRED');
    const commonResults = results.filter(r => r.securityType === 'COMMON');
    const optionResults = results.filter(r => r.securityType === 'OPTIONS');

    // Sum by type
    const breakdownByType = {
      PREFERRED: {
        count: preferredResults.length,
        totalProceeds: preferredResults.reduce((sum, r) => sum + (r.totalProceeds || 0), 0),
        shares: preferredResults.reduce((sum, r) => sum + (r.shares || 0), 0)
      },
      COMMON: {
        count: commonResults.length,
        totalProceeds: commonResults.reduce((sum, r) => sum + (r.totalProceeds || 0), 0),
        shares: commonResults.reduce((sum, r) => sum + (r.shares || 0), 0)
      },
      OPTIONS: {
        count: optionResults.length,
        totalProceeds: optionResults.reduce((sum, r) => sum + (r.totalProceeds || 0), 0),
        shares: optionResults.reduce((sum, r) => sum + (r.shares || 0), 0)
      }
    };

    // Top recipients by proceeds
    const sortedResults = [...results].sort((a, b) =>
      (b.totalProceeds || 0) - (a.totalProceeds || 0)
    );
    const topRecipients = sortedResults.slice(0, 5).map(r => ({
      name: r.name,
      totalProceeds: r.totalProceeds || 0,
      percentage: allocation.totalDistributed > 0 ?
        ((r.totalProceeds || 0) / allocation.totalDistributed) * 100 : 0
    }));

    // Calculate effective price per share
    const totalShares = results.reduce((sum, r) => sum + (r.shares || 0), 0);
    const effectivePricePerShare = totalShares > 0 ?
      (allocation.totalDistributed || 0) / totalShares : 0;

    return {
      scenarioName: allocation.scenarioName || '',
      scenarioType: allocation.scenarioType || 'ACQUISITION',
      exitValue: allocation.exitValue || 0,
      exitDate: allocation.exitDate || null,
      totalDistributed: allocation.totalDistributed || 0,
      remainingProceeds: allocation.remainingProceeds || 0,
      shareClassCount: results.length,
      preferredCount: preferredResults.length,
      commonCount: commonResults.length,
      optionCount: optionResults.length,
      breakdownByType,
      topRecipients,
      totalShares,
      effectivePricePerShare,
      calculatedAt: allocation.calculatedAt || null,
      status: allocation.status || 'draft'
    };
  },

  /**
   * Find conversion breakpoints for a company
   * @param {Object} allocation - Allocation with share classes
   * @returns {Array} Breakpoints where conversion becomes optimal
   */
  findConversionBreakpoints(allocation) {
    if (!allocation || !allocation.shareClasses) {
      return [];
    }

    const breakpoints = [];
    const shareClasses = allocation.shareClasses;

    for (const sc of shareClasses) {
      if (sc.securityType !== 'PREFERRED') continue;

      // Add cap threshold for capped participating preferred
      if (sc.participatingPreferred && sc.participationCap) {
        const capAmount = sc.participationCap * (sc.originalInvestment || 0);
        breakpoints.push({
          shareClassId: sc.shareClassId,
          name: sc.name,
          breakpointType: 'CAP_THRESHOLD',
          enterpriseValueThreshold: capAmount,
          description: `${sc.name} participation capped at ${sc.participationCap}x ($${capAmount.toLocaleString()})`
        });
      }

      // Skip conversion breakpoint for participating preferred (they always get both)
      if (sc.participatingPreferred) continue;

      // Calculate breakpoint: where conversion value = preference value
      // At breakpoint: preference = (shares * conversionRatio / totalCommonEquiv) * EV
      // Solving for EV: EV = preference * totalCommonEquiv / (shares * conversionRatio)

      const liqPref = sc.liquidationPreference || 0;
      const shares = sc.shares || 0;
      const conversionRatio = sc.conversionRatio || 1;
      const commonEquivShares = shares * conversionRatio;

      if (commonEquivShares > 0 && liqPref > 0) {
        // Estimate total common-equivalent (simplified)
        const totalCommonEst = shareClasses.reduce((sum, s) => {
          if (s.securityType === 'COMMON') return sum + (s.shares || 0);
          if (s.securityType === 'PREFERRED') return sum + ((s.shares || 0) * (s.conversionRatio || 1));
          return sum;
        }, 0);

        const breakpointEV = (liqPref * totalCommonEst) / commonEquivShares;

        breakpoints.push({
          shareClassId: sc.shareClassId,
          name: sc.name,
          breakpointType: 'CONVERSION_THRESHOLD',
          enterpriseValueThreshold: breakpointEV,
          description: `At EV > $${breakpointEV.toLocaleString()}, ${sc.name} should convert to common`
        });
      }
    }

    return breakpoints.sort((a, b) => a.enterpriseValueThreshold - b.enterpriseValueThreshold);
  },

  /**
   * Generate sensitivity analysis for multiple exit values
   * @param {Object} allocation - Base allocation
   * @param {Array} exitValues - Array of exit values to analyze
   * @returns {Array} Results for each exit value
   */
  generateSensitivityTable(allocation, exitValues) {
    if (!allocation || !exitValues || exitValues.length === 0) {
      return [];
    }

    return exitValues.map(ev => {
      const { results, totalDistributed, remainingProceeds } = this.calculateWaterfall(allocation, ev);

      return {
        exitValue: ev,
        results: results.map(r => ({
          shareClassId: r.shareClassId,
          name: r.name,
          totalProceeds: r.totalProceeds,
          pricePerShare: r.pricePerShare,
          returnMultiple: r.returnMultiple,
          payoutMethod: r.payoutMethod
        })),
        totalDistributed,
        remainingProceeds
      };
    });
  },

  /**
   * Mark allocation as calculated
   * @param {string} allocationId - Allocation ID
   * @param {Object} results - Calculation results
   * @returns {Object} Update result
   */
  async markCalculated(allocationId, results = {}) {
    return baseModel.updateOne.call(baseModel,
      { allocationId },
      {
        $set: {
          status: 'calculated',
          calculatedAt: new Date().toISOString(),
          results: results.results || [],
          totalDistributed: results.totalDistributed || 0,
          remainingProceeds: results.remainingProceeds || 0
        }
      }
    );
  },

  /**
   * Finalize allocation
   * @param {string} allocationId - Allocation ID
   * @returns {Object} Update result
   */
  async finalize(allocationId) {
    return baseModel.updateOne.call(baseModel,
      { allocationId },
      { $set: { status: 'finalized' } }
    );
  },

  /**
   * Archive allocation
   * @param {string} allocationId - Allocation ID
   * @returns {Object} Update result
   */
  async archive(allocationId) {
    return baseModel.updateOne.call(baseModel,
      { allocationId },
      { $set: { status: 'archived' } }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = WaterfallAllocation;
