/**
 * Waterfall Analysis Service
 * Issue #56: Create waterfall analysis engine
 *
 * Provides waterfall calculations for exit scenarios including:
 * - Liquidation preference application
 * - Participating and non-participating preferred handling
 * - Multi-tier preference stacks with seniority
 * - Pro-rata distribution of remaining proceeds
 * - Scenario comparison and visualization
 */

class WaterfallAnalysisService {
  /**
   * Calculate complete waterfall distribution for an exit scenario
   * @param {Object} analysis - Analysis configuration with exit valuation and share classes
   * @returns {Object} Complete waterfall calculation results
   */
  static calculateWaterfall(analysis) {
    const {
      exitValuation = 0,
      transactionCosts = 0,
      escrowAmount = 0,
      debtPayoff = 0,
      shareClasses = []
    } = analysis;

    // Handle edge cases
    if (shareClasses.length === 0) {
      return {
        shareClassResults: [],
        summary: {
          totalDistributed: 0,
          totalToPreferred: 0,
          totalToCommon: 0,
          remainingProceeds: 0,
          effectiveExitMultiple: 0,
          fullyDilutedShares: 0,
          pricePerShareAtExit: 0
        }
      };
    }

    // Calculate net proceeds after costs
    const netProceeds = Math.max(0, exitValuation - transactionCosts - escrowAmount - debtPayoff);

    if (netProceeds === 0) {
      return {
        shareClassResults: shareClasses.map(sc => ({
          shareClassId: sc.shareClassId,
          shareClassName: sc.name || sc.shareClassId,
          totalShares: sc.totalShares,
          preferenceAmount: 0,
          participationAmount: 0,
          conversionAmount: 0,
          totalProceeds: 0,
          percentageOfExit: 0,
          effectiveMultiple: 0,
          conversionElected: false
        })),
        summary: {
          totalDistributed: 0,
          totalToPreferred: 0,
          totalToCommon: 0,
          remainingProceeds: 0,
          effectiveExitMultiple: 0,
          fullyDilutedShares: this._calculateFullyDiluted(shareClasses),
          pricePerShareAtExit: 0
        }
      };
    }

    // Separate preferred and common classes
    const preferredClasses = shareClasses
      .filter(sc => sc.preferenceType !== 'common')
      .sort((a, b) => (a.seniorityRank || 1) - (b.seniorityRank || 1));

    const commonClasses = shareClasses.filter(sc => sc.preferenceType === 'common');

    // Calculate fully diluted shares
    const fullyDilutedShares = this._calculateFullyDiluted(shareClasses);

    // Step 1: Apply liquidation preferences in seniority order
    const preferenceResult = this.applyLiquidationPreferences(preferredClasses, netProceeds);
    let remainingAfterPreferences = preferenceResult.remainingProceeds;

    // Track allocations
    const allocations = { ...preferenceResult.allocations };

    // Initialize common allocations
    commonClasses.forEach(sc => {
      allocations[sc.shareClassId] = 0;
    });

    // Step 2: Handle participation and conversion decisions
    const shareClassResults = [];
    let totalToPreferred = 0;
    let totalToCommon = 0;

    // Process each preferred class for conversion/participation decision
    for (const sc of preferredClasses) {
      const preferenceAmount = allocations[sc.shareClassId] || 0;
      const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);

      // Calculate what they'd get with conversion (pro-rata of entire exit)
      const conversionProRata = (sc.totalShares / fullyDilutedShares) * netProceeds;

      let result = {
        shareClassId: sc.shareClassId,
        shareClassName: sc.name || sc.shareClassId,
        totalShares: sc.totalShares,
        preferenceAmount: 0,
        participationAmount: 0,
        conversionAmount: 0,
        totalProceeds: 0,
        percentageOfExit: 0,
        effectiveMultiple: 0,
        conversionElected: false
      };

      if (sc.preferenceType === 'non_participating') {
        // Non-participating: choose max of (preference, conversion)
        if (conversionProRata > preferenceAmount) {
          result.conversionElected = true;
          result.conversionAmount = conversionProRata;
          result.totalProceeds = conversionProRata;
          // Add back the preference to remaining pool for pro-rata
          remainingAfterPreferences += preferenceAmount;
          allocations[sc.shareClassId] = 0;
        } else {
          result.preferenceAmount = preferenceAmount;
          result.totalProceeds = preferenceAmount;
        }
      } else if (sc.preferenceType === 'participating') {
        // Participating: preference + pro-rata of remainder
        result.preferenceAmount = preferenceAmount;

        // Calculate participation in remaining proceeds
        if (remainingAfterPreferences > 0) {
          const participationShare = sc.totalShares / fullyDilutedShares;
          result.participationAmount = participationShare * remainingAfterPreferences;
        }
        result.totalProceeds = result.preferenceAmount + result.participationAmount;
      } else if (sc.preferenceType === 'participating_capped') {
        // Participating with cap: preference + pro-rata up to cap
        result.preferenceAmount = preferenceAmount;

        const maxReturn = (sc.participationCap || 1) * investment;
        const remainingToMax = maxReturn - result.preferenceAmount;

        if (remainingToMax > 0 && remainingAfterPreferences > 0) {
          const participationShare = sc.totalShares / fullyDilutedShares;
          const uncappedParticipation = participationShare * remainingAfterPreferences;
          result.participationAmount = Math.min(uncappedParticipation, remainingToMax);
        }
        result.totalProceeds = result.preferenceAmount + result.participationAmount;
      }

      result.percentageOfExit = netProceeds > 0 ? (result.totalProceeds / netProceeds) * 100 : 0;
      result.effectiveMultiple = investment > 0 ? result.totalProceeds / investment : 0;
      totalToPreferred += result.totalProceeds;
      shareClassResults.push(result);
    }

    // Step 3: Distribute remaining to common (and converted preferred)
    let proceedsForCommon = netProceeds - totalToPreferred;

    // Recalculate if any preferred converted
    const convertedShares = shareClassResults
      .filter(r => r.conversionElected)
      .reduce((sum, r) => sum + (shareClasses.find(sc => sc.shareClassId === r.shareClassId)?.totalShares || 0), 0);

    const commonTotalShares = commonClasses.reduce((sum, sc) => sum + sc.totalShares, 0);
    const sharesForDistribution = commonTotalShares + convertedShares;

    // If no conversion happened, distribute remaining to common only
    if (convertedShares === 0 && proceedsForCommon > 0) {
      for (const sc of commonClasses) {
        const shareRatio = commonTotalShares > 0 ? sc.totalShares / commonTotalShares : 0;
        const proceeds = shareRatio * proceedsForCommon;

        shareClassResults.push({
          shareClassId: sc.shareClassId,
          shareClassName: sc.name || sc.shareClassId,
          totalShares: sc.totalShares,
          preferenceAmount: 0,
          participationAmount: 0,
          conversionAmount: 0,
          totalProceeds: proceeds,
          percentageOfExit: netProceeds > 0 ? (proceeds / netProceeds) * 100 : 0,
          effectiveMultiple: 0,
          conversionElected: false
        });
        totalToCommon += proceeds;
      }
    } else if (convertedShares > 0) {
      // Some preferred converted - recalculate pro-rata for all converting + common
      // First, remove the conversion amounts from results (we'll recalculate)
      const nonConvertingPreferred = shareClassResults.filter(r => !r.conversionElected);
      const convertingPreferred = shareClassResults.filter(r => r.conversionElected);

      // Reset conversion amounts
      convertingPreferred.forEach(r => {
        totalToPreferred -= r.totalProceeds;
        r.totalProceeds = 0;
        r.conversionAmount = 0;
      });

      // Recalculate proceeds available after non-converting preferred
      const proceedsAfterNonConverting = netProceeds - nonConvertingPreferred.reduce((sum, r) => sum + r.totalProceeds, 0);

      // Distribute pro-rata to common and converting preferred
      for (const sc of commonClasses) {
        const shareRatio = sharesForDistribution > 0 ? sc.totalShares / sharesForDistribution : 0;
        const proceeds = shareRatio * proceedsAfterNonConverting;

        shareClassResults.push({
          shareClassId: sc.shareClassId,
          shareClassName: sc.name || sc.shareClassId,
          totalShares: sc.totalShares,
          preferenceAmount: 0,
          participationAmount: 0,
          conversionAmount: 0,
          totalProceeds: proceeds,
          percentageOfExit: netProceeds > 0 ? (proceeds / netProceeds) * 100 : 0,
          effectiveMultiple: 0,
          conversionElected: false
        });
        totalToCommon += proceeds;
      }

      // Update converting preferred with their pro-rata share
      for (const result of convertingPreferred) {
        const sc = shareClasses.find(s => s.shareClassId === result.shareClassId);
        if (sc) {
          const shareRatio = sharesForDistribution > 0 ? sc.totalShares / sharesForDistribution : 0;
          result.conversionAmount = shareRatio * proceedsAfterNonConverting;
          result.totalProceeds = result.conversionAmount;
          result.percentageOfExit = netProceeds > 0 ? (result.totalProceeds / netProceeds) * 100 : 0;
          const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
          result.effectiveMultiple = investment > 0 ? result.totalProceeds / investment : 0;
        }
      }
    } else {
      // No proceeds left for common
      for (const sc of commonClasses) {
        shareClassResults.push({
          shareClassId: sc.shareClassId,
          shareClassName: sc.name || sc.shareClassId,
          totalShares: sc.totalShares,
          preferenceAmount: 0,
          participationAmount: 0,
          conversionAmount: 0,
          totalProceeds: 0,
          percentageOfExit: 0,
          effectiveMultiple: 0,
          conversionElected: false
        });
      }
    }

    // Calculate final totals
    const totalDistributed = shareClassResults.reduce((sum, r) => sum + r.totalProceeds, 0);
    totalToPreferred = shareClassResults
      .filter(r => {
        const sc = shareClasses.find(s => s.shareClassId === r.shareClassId);
        return sc && sc.preferenceType !== 'common';
      })
      .reduce((sum, r) => sum + r.totalProceeds, 0);

    totalToCommon = shareClassResults
      .filter(r => {
        const sc = shareClasses.find(s => s.shareClassId === r.shareClassId);
        return sc && sc.preferenceType === 'common';
      })
      .reduce((sum, r) => sum + r.totalProceeds, 0);

    return {
      shareClassResults,
      summary: {
        totalDistributed,
        totalToPreferred,
        totalToCommon,
        remainingProceeds: netProceeds - totalDistributed,
        effectiveExitMultiple: this._calculateEffectiveMultiple(shareClasses, shareClassResults),
        fullyDilutedShares,
        pricePerShareAtExit: fullyDilutedShares > 0 ? netProceeds / fullyDilutedShares : 0
      }
    };
  }

  /**
   * Apply liquidation preferences in seniority order
   * @param {Array} shareClasses - Preferred share classes sorted by seniority
   * @param {number} netProceeds - Total proceeds available
   * @returns {Object} Allocation results and remaining proceeds
   */
  static applyLiquidationPreferences(shareClasses, netProceeds) {
    const allocations = {};
    let remainingProceeds = netProceeds;

    // Group by seniority for pari passu handling
    const seniorityGroups = {};
    shareClasses.forEach(sc => {
      const rank = sc.seniorityRank || 1;
      if (!seniorityGroups[rank]) {
        seniorityGroups[rank] = [];
      }
      seniorityGroups[rank].push(sc);
    });

    // Process each seniority level
    const sortedRanks = Object.keys(seniorityGroups).map(Number).sort((a, b) => a - b);

    for (const rank of sortedRanks) {
      const group = seniorityGroups[rank];

      // Calculate total preference needed for this seniority level
      const totalPreferenceNeeded = group.reduce((sum, sc) => {
        const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
        return sum + (investment * (sc.liquidationMultiple || 1));
      }, 0);

      if (remainingProceeds >= totalPreferenceNeeded) {
        // Enough for full preferences at this level
        group.forEach(sc => {
          const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
          allocations[sc.shareClassId] = investment * (sc.liquidationMultiple || 1);
        });
        remainingProceeds -= totalPreferenceNeeded;
      } else {
        // Not enough - split pro-rata within this seniority level
        group.forEach(sc => {
          const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
          const preferenceAmount = investment * (sc.liquidationMultiple || 1);
          const proRataShare = totalPreferenceNeeded > 0 ? preferenceAmount / totalPreferenceNeeded : 0;
          allocations[sc.shareClassId] = proRataShare * remainingProceeds;
        });
        remainingProceeds = 0;
        break; // No more proceeds for junior classes
      }
    }

    return { allocations, remainingProceeds };
  }

  /**
   * Calculate participation amounts for participating preferred
   * @param {Array} shareClasses - Share classes
   * @param {number} remainingProceeds - Proceeds after preferences
   * @returns {Object} Participation amounts by share class
   */
  static calculateParticipation(shareClasses, remainingProceeds) {
    const participation = {};
    const totalShares = shareClasses.reduce((sum, sc) => sum + sc.totalShares, 0);

    for (const sc of shareClasses) {
      const shareRatio = totalShares > 0 ? sc.totalShares / totalShares : 0;
      let amount = shareRatio * remainingProceeds;

      // Apply cap if applicable
      if (sc.preferenceType === 'participating_capped' && sc.participationCap && sc.originalInvestment) {
        const maxTotal = sc.participationCap * sc.originalInvestment;
        const alreadyPaid = sc.preferenceAlreadyPaid || 0;
        const maxParticipation = maxTotal - alreadyPaid;
        amount = Math.min(amount, maxParticipation);
      }

      participation[sc.shareClassId] = amount;
    }

    return participation;
  }

  /**
   * Distribute proceeds pro-rata based on ownership
   * @param {Array} shareClasses - Share classes for distribution
   * @param {number} proceeds - Total proceeds to distribute
   * @returns {Object} Distribution amounts by share class
   */
  static distributeProceeds(shareClasses, proceeds) {
    const distribution = {};
    const totalShares = shareClasses.reduce((sum, sc) => sum + sc.totalShares, 0);

    shareClasses.forEach(sc => {
      const shareRatio = totalShares > 0 ? sc.totalShares / totalShares : 0;
      distribution[sc.shareClassId] = shareRatio * proceeds;
    });

    return distribution;
  }

  /**
   * Compare multiple exit scenarios
   * @param {Array} scenarios - Array of scenario configurations
   * @returns {Array} Calculated results for each scenario
   */
  static compareScenarios(scenarios) {
    return scenarios.map(scenario => {
      const result = this.calculateWaterfall(scenario);
      return {
        scenarioName: scenario.scenarioName || 'Unnamed Scenario',
        exitValuation: scenario.exitValuation,
        ...result
      };
    });
  }

  /**
   * Generate visualization data for waterfall charts
   * @param {Object} analysis - Analysis configuration
   * @param {Object} options - Visualization options
   * @returns {Object} Chart-ready data
   */
  static generateWaterfallChart(analysis, options = {}) {
    const result = this.calculateWaterfall(analysis);

    const labels = result.shareClassResults.map(r => r.shareClassName);

    const datasets = [
      {
        label: 'Preference',
        data: result.shareClassResults.map(r => r.preferenceAmount || 0),
        backgroundColor: '#4CAF50'
      },
      {
        label: 'Participation/Pro-rata',
        data: result.shareClassResults.map(r => r.participationAmount || r.conversionAmount || r.totalProceeds - (r.preferenceAmount || 0)),
        backgroundColor: '#2196F3'
      }
    ];

    const chartData = { labels, datasets };

    // Add sensitivity data if requested
    if (options.includeSensitivity) {
      chartData.sensitivityData = this._generateSensitivityData(analysis);
    }

    return chartData;
  }

  /**
   * Generate sensitivity analysis data
   * @private
   */
  static _generateSensitivityData(analysis) {
    const baseValuation = analysis.exitValuation;
    const multipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

    return multipliers.map(mult => {
      const modifiedAnalysis = {
        ...analysis,
        exitValuation: baseValuation * mult
      };
      const result = this.calculateWaterfall(modifiedAnalysis);

      return {
        exitValuation: modifiedAnalysis.exitValuation,
        multiplier: mult,
        shareClassResults: result.shareClassResults,
        summary: result.summary
      };
    });
  }

  /**
   * Calculate fully diluted share count
   * @private
   */
  static _calculateFullyDiluted(shareClasses) {
    return shareClasses.reduce((sum, sc) => sum + sc.totalShares, 0);
  }

  /**
   * Calculate effective exit multiple
   * @private
   */
  static _calculateEffectiveMultiple(shareClasses, results) {
    let totalInvestment = 0;
    let totalReturns = 0;

    for (const sc of shareClasses) {
      if (sc.preferenceType !== 'common') {
        const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
        totalInvestment += investment;

        const result = results.find(r => r.shareClassId === sc.shareClassId);
        if (result) {
          totalReturns += result.totalProceeds;
        }
      }
    }

    return totalInvestment > 0 ? totalReturns / totalInvestment : 0;
  }
}

module.exports = WaterfallAnalysisService;
