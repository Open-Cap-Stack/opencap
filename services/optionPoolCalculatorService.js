/**
 * Option Pool Calculator Service
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Service for calculating dilution from option pool expansions.
 * Handles pre-money and post-money option pool calculations.
 */

const DilutionCalculation = require('../models/DilutionCalculation');
const databaseAdapter = require('./databaseAdapter');

class OptionPoolCalculatorService {
  /**
   * Calculate option pool dilution
   * @param {Object} params - Calculation parameters
   * @returns {Object} Option pool dilution results
   */
  static async calculateOptionPoolDilution(params) {
    const {
      companyId,
      scenarioId,
      targetPoolPercentage,
      currentPoolShares = 0,
      currentTotalShares,
      calculationMethod = 'pre_money' // 'pre_money' or 'post_money'
    } = params;

    let newPoolShares;
    let totalSharesAfterExpansion;
    let dilutionToExisting;

    if (calculationMethod === 'pre_money') {
      // Pre-money: Pool comes from existing shareholders
      totalSharesAfterExpansion = currentTotalShares / (1 - targetPoolPercentage / 100);
      newPoolShares = Math.round(totalSharesAfterExpansion * (targetPoolPercentage / 100) - currentPoolShares);
      dilutionToExisting = (newPoolShares / totalSharesAfterExpansion) * 100;
    } else {
      // Post-money: Pool dilutes both existing and new investors
      newPoolShares = Math.round((currentTotalShares * targetPoolPercentage) / (100 - targetPoolPercentage) - currentPoolShares);
      totalSharesAfterExpansion = currentTotalShares + newPoolShares;
      dilutionToExisting = (newPoolShares / totalSharesAfterExpansion) * 100;
    }

    const results = {
      currentPoolShares,
      newPoolShares,
      totalPoolShares: currentPoolShares + newPoolShares,
      currentTotalShares,
      totalSharesAfterExpansion,
      targetPoolPercentage,
      actualPoolPercentage: (currentPoolShares + newPoolShares) / totalSharesAfterExpansion * 100,
      dilutionToExisting,
      calculationMethod
    };

    // Save calculation if scenarioId provided
    if (scenarioId) {
      await DilutionCalculation.create({
        scenarioId,
        companyId,
        calculationType: 'option_pool',
        inputs: params,
        results
      });
    }

    return results;
  }

  /**
   * Calculate option pool with funding round
   * @param {Object} params - Calculation parameters
   * @returns {Object} Combined option pool and funding results
   */
  static async calculateOptionPoolWithFunding(params) {
    const {
      companyId,
      scenarioId,
      preMoney,
      newInvestment,
      targetPoolPercentage,
      currentPoolShares,
      currentTotalShares,
      expandPreMoney = true
    } = params;

    let results;

    if (expandPreMoney) {
      // Step 1: Expand pool pre-money (dilutes existing shareholders only)
      const poolExpansion = await this.calculateOptionPoolDilution({
        companyId,
        targetPoolPercentage,
        currentPoolShares,
        currentTotalShares,
        calculationMethod: 'pre_money'
      });

      // Step 2: Calculate funding round on expanded base
      const sharesAfterPool = poolExpansion.totalSharesAfterExpansion;
      const postMoney = preMoney + newInvestment;
      const pricePerShare = preMoney / sharesAfterPool;
      const newShares = Math.round(newInvestment / pricePerShare);
      const finalTotalShares = sharesAfterPool + newShares;

      results = {
        optionPool: poolExpansion,
        funding: {
          preMoney,
          postMoney,
          newInvestment,
          pricePerShare,
          newShares,
          sharesBeforeFunding: sharesAfterPool,
          finalTotalShares
        },
        dilution: {
          fromOptionPool: poolExpansion.dilutionToExisting,
          fromFunding: (newShares / finalTotalShares) * 100,
          total: ((poolExpansion.newPoolShares + newShares) / finalTotalShares) * 100
        },
        calculationMethod: 'pre_money_pool_expansion'
      };
    } else {
      // Post-money pool expansion (pool dilutes both existing and new investors)
      const postMoney = preMoney + newInvestment;
      const pricePerShare = preMoney / currentTotalShares;
      const newShares = Math.round(newInvestment / pricePerShare);
      const sharesAfterFunding = currentTotalShares + newShares;

      const poolExpansion = await this.calculateOptionPoolDilution({
        companyId,
        targetPoolPercentage,
        currentPoolShares,
        currentTotalShares: sharesAfterFunding,
        calculationMethod: 'post_money'
      });

      const finalTotalShares = poolExpansion.totalSharesAfterExpansion;

      results = {
        funding: {
          preMoney,
          postMoney,
          newInvestment,
          pricePerShare,
          newShares,
          sharesBeforeFunding: currentTotalShares,
          sharesAfterFunding
        },
        optionPool: poolExpansion,
        dilution: {
          fromFunding: (newShares / finalTotalShares) * 100,
          fromOptionPool: poolExpansion.dilutionToExisting,
          total: ((newShares + poolExpansion.newPoolShares) / finalTotalShares) * 100
        },
        calculationMethod: 'post_money_pool_expansion'
      };
    }

    // Save calculation if scenarioId provided
    if (scenarioId) {
      await DilutionCalculation.create({
        scenarioId,
        companyId,
        calculationType: 'option_pool',
        inputs: params,
        results
      });
    }

    return results;
  }

  /**
   * Calculate remaining option pool capacity
   * @param {Object} params - Calculation parameters
   * @returns {Object} Option pool capacity analysis
   */
  static async calculatePoolCapacity(params) {
    const {
      companyId,
      currentPoolShares,
      grantedOptions,
      vestedOptions
    } = params;

    const availableForGrant = currentPoolShares - grantedOptions;
    const unvestedOptions = grantedOptions - vestedOptions;
    const utilizationRate = currentPoolShares > 0 ? (grantedOptions / currentPoolShares) * 100 : 0;

    return {
      currentPoolShares,
      grantedOptions,
      vestedOptions,
      unvestedOptions,
      availableForGrant,
      utilizationRate,
      capacityRemaining: availableForGrant > 0
    };
  }

  /**
   * Calculate option pool impact on stakeholder ownership
   * @param {Object} params - Calculation parameters
   * @returns {Array} Per-stakeholder impact
   */
  static calculateStakeholderImpact(params) {
    const {
      stakeholders,
      newPoolShares,
      currentTotalShares
    } = params;

    const totalSharesAfter = currentTotalShares + newPoolShares;

    return stakeholders.map(stakeholder => {
      const currentOwnership = currentTotalShares > 0
        ? (stakeholder.shares / currentTotalShares) * 100
        : 0;
      const newOwnership = totalSharesAfter > 0
        ? (stakeholder.shares / totalSharesAfter) * 100
        : 0;
      const dilution = currentOwnership - newOwnership;

      return {
        stakeholderId: stakeholder.stakeholderId,
        name: stakeholder.name,
        currentShares: stakeholder.shares,
        currentOwnership,
        newOwnership,
        dilutionPercentage: dilution,
        ownershipLoss: dilution
      };
    });
  }

  /**
   * Get company option pool summary
   * @param {string} companyId - Company ID
   * @returns {Object} Option pool summary
   */
  static async getCompanyOptionPoolSummary(companyId) {
    const equityPlans = await databaseAdapter.find('EquityPlan', { companyId });
    const equityGrants = await databaseAdapter.find('EquityGrant', { companyId });

    let totalReserved = 0;
    let totalGranted = 0;
    let totalVested = 0;
    let totalExercised = 0;

    for (const plan of equityPlans) {
      totalReserved += plan.sharesReserved || 0;
    }

    for (const grant of equityGrants) {
      totalGranted += grant.quantity || 0;
      if (grant.vestedQuantity) {
        totalVested += grant.vestedQuantity;
      }
      if (grant.exercisedQuantity) {
        totalExercised += grant.exercisedQuantity;
      }
    }

    const available = totalReserved - totalGranted;
    const unvested = totalGranted - totalVested;
    const utilizationRate = totalReserved > 0 ? (totalGranted / totalReserved) * 100 : 0;

    return {
      totalReserved,
      totalGranted,
      totalVested,
      totalExercised,
      available,
      unvested,
      utilizationRate,
      planCount: equityPlans.length,
      grantCount: equityGrants.length
    };
  }

  /**
   * Compare pre-money vs post-money pool expansion
   * @param {Object} params - Calculation parameters
   * @returns {Object} Comparison results
   */
  static async compareExpansionMethods(params) {
    const preMoney = await this.calculateOptionPoolWithFunding({
      ...params,
      expandPreMoney: true
    });

    const postMoney = await this.calculateOptionPoolWithFunding({
      ...params,
      expandPreMoney: false
    });

    return {
      preMoney: {
        newPoolShares: preMoney.optionPool.newPoolShares,
        dilutionToExisting: preMoney.dilution.fromOptionPool,
        dilutionToInvestor: 0,
        finalTotalShares: preMoney.funding.finalTotalShares
      },
      postMoney: {
        newPoolShares: postMoney.optionPool.newPoolShares,
        dilutionToExisting: postMoney.dilution.fromOptionPool *
          (postMoney.funding.sharesBeforeFunding / postMoney.funding.finalTotalShares),
        dilutionToInvestor: postMoney.dilution.fromOptionPool *
          (postMoney.funding.newShares / postMoney.funding.finalTotalShares),
        finalTotalShares: postMoney.funding.finalTotalShares
      },
      recommendation: preMoney.dilution.fromOptionPool < postMoney.dilution.fromOptionPool
        ? 'Pre-money expansion is better for existing shareholders'
        : 'Post-money expansion is better for existing shareholders'
    };
  }
}

module.exports = OptionPoolCalculatorService;
