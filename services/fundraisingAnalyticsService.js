/**
 * Fundraising Analytics Service
 *
 * Issue #196: Implement Fundraising Analytics Service
 * Provides comprehensive fundraising analytics features including:
 * - Aggregated fundraising analytics
 * - Dilution history calculation
 * - Investor distribution analytics
 * - Benchmarking data
 * - Forecasting algorithms
 */

const databaseAdapter = require('./databaseAdapter');

class FundraisingAnalyticsService {
  constructor() {
    // Default benchmark values for different industries
    this.defaultBenchmarks = {
      seedRoundMedian: 1500000,
      seriesAMedian: 10000000,
      seriesBMedian: 30000000,
      averageDilutionSeed: 20,
      averageDilutionSeriesA: 20,
      averageDilutionSeriesB: 15,
      timeToSeriesAMonths: 18,
      timeToSeriesBMonths: 24
    };
  }

  /**
   * Get aggregated fundraising overview for a company
   * @param {string} companyId - Company identifier
   * @returns {Object} Fundraising overview with totals and statistics
   */
  async getOverview(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch all fundraising rounds for the company
    const rounds = await databaseAdapter.find('FundraisingRound', {
      companyId,
      _type: 'fundraising_round'
    });

    const totalRaised = rounds.reduce((sum, round) => sum + (round.amountRaised || 0), 0);
    const totalEquityGiven = rounds.reduce((sum, round) => sum + (round.equityGiven || 0), 0);
    const numberOfRounds = rounds.length;
    const averageRoundSize = numberOfRounds > 0 ? totalRaised / numberOfRounds : 0;

    // Calculate round breakdown by type
    const roundsByType = this._groupRoundsByType(rounds);

    // Get latest round info
    const sortedRounds = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestRound = sortedRounds[0] || null;

    return {
      companyId,
      totalRaised,
      totalEquityGiven,
      numberOfRounds,
      averageRoundSize,
      roundsByType,
      latestRound: latestRound ? {
        roundName: latestRound.roundName,
        amountRaised: latestRound.amountRaised,
        date: latestRound.date,
        roundType: latestRound.RoundType
      } : null,
      generatedAt: new Date()
    };
  }

  /**
   * Get key fundraising metrics
   * @param {string} companyId - Company identifier
   * @param {Object} options - Options for metrics calculation
   * @returns {Object} Key metrics including valuation and dilution
   */
  async getKeyMetrics(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch fundraising rounds
    const rounds = await databaseAdapter.find('FundraisingRound', {
      companyId,
      _type: 'fundraising_round'
    });

    // Sort by date to get latest
    const sortedRounds = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestRound = sortedRounds[0];

    // Calculate valuations
    let preMoneyValuation = 0;
    let postMoneyValuation = 0;

    if (latestRound && latestRound.equityGiven > 0) {
      // Post-money = Amount Raised / Equity Given * 100
      postMoneyValuation = (latestRound.amountRaised / latestRound.equityGiven) * 100;
      preMoneyValuation = postMoneyValuation - latestRound.amountRaised;
    }

    // Calculate average dilution
    const totalEquityGiven = rounds.reduce((sum, r) => sum + (r.equityGiven || 0), 0);
    const averageDilution = rounds.length > 0 ? totalEquityGiven / rounds.length : 0;

    // Get financial data for runway calculation
    const financials = await databaseAdapter.findOne('FinancialReport', { companyId });

    let runwayMonths = 0;
    let burnRate = 0;

    if (financials) {
      burnRate = financials.monthlyBurnRate || 0;
      const currentCash = financials.currentCash || 0;
      runwayMonths = burnRate > 0 ? Math.floor(currentCash / burnRate) : 0;
    }

    return {
      companyId,
      preMoneyValuation,
      postMoneyValuation,
      averageDilution,
      runwayMonths,
      burnRate,
      totalRaised: rounds.reduce((sum, r) => sum + (r.amountRaised || 0), 0),
      roundCount: rounds.length,
      generatedAt: new Date()
    };
  }

  /**
   * Get fundraising timeline with all rounds
   * @param {string} companyId - Company identifier
   * @returns {Object} Timeline of fundraising events
   */
  async getTimeline(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch all fundraising rounds
    const rounds = await databaseAdapter.find('FundraisingRound', {
      companyId,
      _type: 'fundraising_round'
    });

    // Sort by date ascending
    const sortedRounds = [...rounds].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build timeline with cumulative data
    let cumulativeRaised = 0;
    let cumulativeEquity = 0;

    const timeline = sortedRounds.map((round, index) => {
      cumulativeRaised += round.amountRaised || 0;
      cumulativeEquity += round.equityGiven || 0;

      return {
        roundId: round.roundId,
        roundName: round.roundName,
        roundType: round.RoundType,
        amountRaised: round.amountRaised,
        equityGiven: round.equityGiven,
        date: round.date,
        cumulativeRaised,
        cumulativeEquity,
        roundNumber: index + 1,
        investorCount: Array.isArray(round.investors) ? round.investors.length : 0
      };
    });

    return {
      companyId,
      timeline,
      totalRounds: timeline.length,
      dateRange: timeline.length > 0 ? {
        start: timeline[0].date,
        end: timeline[timeline.length - 1].date
      } : null,
      generatedAt: new Date()
    };
  }

  /**
   * Get investor breakdown and distribution analytics
   * @param {string} companyId - Company identifier
   * @returns {Object} Investor distribution by type and equity
   */
  async getInvestorBreakdown(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch all investors for the company
    const investors = await databaseAdapter.find('Investor', {
      companyId,
      _type: 'investor'
    });

    const totalInvestors = investors.length;

    if (totalInvestors === 0) {
      return {
        companyId,
        totalInvestors: 0,
        totalInvested: 0,
        byType: {},
        byEquity: [],
        topInvestors: [],
        generatedAt: new Date()
      };
    }

    // Group by investor type
    const byType = {};
    investors.forEach(inv => {
      const type = inv.investorType || 'Other';
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          totalInvested: 0,
          totalEquity: 0
        };
      }
      byType[type].count += 1;
      byType[type].totalInvested += inv.investmentAmount || 0;
      byType[type].totalEquity += inv.equityPercentage || 0;
    });

    // Calculate percentages for type breakdown
    Object.keys(byType).forEach(type => {
      byType[type].percentageOfInvestors = (byType[type].count / totalInvestors) * 100;
    });

    // Group by equity brackets
    const byEquity = this._groupByEquityBracket(investors);

    // Top investors by investment amount
    const sortedInvestors = [...investors].sort((a, b) =>
      (b.investmentAmount || 0) - (a.investmentAmount || 0)
    );
    const topInvestors = sortedInvestors.slice(0, 5).map(inv => ({
      investorId: inv.investorId,
      investorType: inv.investorType,
      investmentAmount: inv.investmentAmount,
      equityPercentage: inv.equityPercentage
    }));

    const totalInvested = investors.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0);

    return {
      companyId,
      totalInvestors,
      totalInvested,
      byType,
      byEquity,
      topInvestors,
      generatedAt: new Date()
    };
  }

  /**
   * Calculate dilution history over time
   * @param {string} companyId - Company identifier
   * @returns {Object} Dilution events and cumulative dilution
   */
  async getDilutionHistory(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch all fundraising rounds
    const rounds = await databaseAdapter.find('FundraisingRound', {
      companyId,
      _type: 'fundraising_round'
    });

    // Sort by date ascending
    const sortedRounds = [...rounds].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate dilution for each round
    let cumulativeDilution = 0;
    const dilutionEvents = sortedRounds.map(round => {
      const dilution = round.equityGiven || 0;
      cumulativeDilution += dilution;
      const founderEquityAfter = 100 - cumulativeDilution;

      return {
        roundId: round.roundId,
        roundName: round.roundName,
        roundType: round.RoundType,
        date: round.date,
        dilution,
        cumulativeDilution,
        founderEquityAfter,
        amountRaised: round.amountRaised,
        impliedValuation: dilution > 0 ? (round.amountRaised / dilution) * 100 : 0
      };
    });

    const founderEquityRemaining = 100 - cumulativeDilution;

    return {
      companyId,
      dilutionEvents,
      cumulativeDilution,
      founderEquityRemaining,
      roundCount: dilutionEvents.length,
      averageDilutionPerRound: dilutionEvents.length > 0
        ? cumulativeDilution / dilutionEvents.length
        : 0,
      generatedAt: new Date()
    };
  }

  /**
   * Get industry benchmarks and comparison
   * @param {string} companyId - Company identifier
   * @param {Object} options - Options including industry
   * @returns {Object} Benchmark comparison results
   */
  async getBenchmarks(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { industry } = options;

    // Fetch company's fundraising data
    const rounds = await databaseAdapter.find('FundraisingRound', {
      companyId,
      _type: 'fundraising_round'
    });

    // Try to fetch industry benchmarks
    let industryBenchmarks = null;
    if (industry) {
      industryBenchmarks = await databaseAdapter.findOne('IndustryBenchmark', { industry });
    }

    // Use default benchmarks if none found
    const benchmarks = industryBenchmarks?.benchmarks || this.defaultBenchmarks;

    // Calculate company metrics for comparison
    const seedRounds = rounds.filter(r => r.RoundType === 'Seed');
    const seriesARounds = rounds.filter(r => r.RoundType === 'Series A');
    const seriesBRounds = rounds.filter(r => r.RoundType === 'Series B');

    const companyMetrics = {
      seedRoundSize: seedRounds.length > 0
        ? seedRounds.reduce((sum, r) => sum + (r.amountRaised || 0), 0) / seedRounds.length
        : null,
      seriesARoundSize: seriesARounds.length > 0
        ? seriesARounds.reduce((sum, r) => sum + (r.amountRaised || 0), 0) / seriesARounds.length
        : null,
      seriesBRoundSize: seriesBRounds.length > 0
        ? seriesBRounds.reduce((sum, r) => sum + (r.amountRaised || 0), 0) / seriesBRounds.length
        : null,
      averageDilution: rounds.length > 0
        ? rounds.reduce((sum, r) => sum + (r.equityGiven || 0), 0) / rounds.length
        : null
    };

    // Compare with benchmarks
    const comparison = this._compareWithBenchmarks(companyMetrics, benchmarks);

    return {
      companyId,
      industry: industry || 'default',
      industryBenchmarks: benchmarks,
      companyMetrics,
      comparison,
      generatedAt: new Date()
    };
  }

  /**
   * Get fundraising projections and recommendations
   * @param {string} companyId - Company identifier
   * @param {Object} options - Projection options
   * @returns {Object} Projections and recommendations
   */
  async getProjections(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch fundraising rounds
    const rounds = await databaseAdapter.find('FundraisingRound', {
      companyId,
      _type: 'fundraising_round'
    });

    // Fetch financial data
    const financials = await databaseAdapter.findOne('FinancialReport', { companyId });

    // Calculate current runway
    let runwayMonths = 0;
    let burnRate = 0;
    let currentCash = 0;

    if (financials) {
      burnRate = financials.monthlyBurnRate || 0;
      currentCash = financials.currentCash || 0;
      runwayMonths = burnRate > 0 ? Math.floor(currentCash / burnRate) : 0;
    }

    // Determine next round type based on history
    const sortedRounds = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestRound = sortedRounds[0];
    const nextRoundType = this._predictNextRoundType(latestRound?.RoundType);

    // Estimate next round size based on growth patterns
    const nextRoundEstimate = this._estimateNextRoundSize(rounds, nextRoundType);

    // Calculate projected valuation
    const projectedValuation = this._projectValuation(rounds, nextRoundType);

    // Generate recommendations
    const recommendations = this._generateRecommendations({
      runwayMonths,
      burnRate,
      rounds,
      currentCash,
      nextRoundType
    });

    return {
      companyId,
      runwayMonths,
      burnRate,
      currentCash,
      nextRoundType,
      nextRoundEstimate,
      projectedValuation,
      optimalRaiseTimeframe: runwayMonths > 6 ? 'within 3 months' : 'immediately',
      recommendations,
      generatedAt: new Date()
    };
  }

  // Private helper methods

  /**
   * Group rounds by type
   * @param {Array} rounds - Fundraising rounds
   * @returns {Object} Rounds grouped by type
   */
  _groupRoundsByType(rounds) {
    const grouped = {};
    rounds.forEach(round => {
      const type = round.RoundType || 'Other';
      if (!grouped[type]) {
        grouped[type] = {
          count: 0,
          totalRaised: 0,
          totalEquity: 0
        };
      }
      grouped[type].count += 1;
      grouped[type].totalRaised += round.amountRaised || 0;
      grouped[type].totalEquity += round.equityGiven || 0;
    });
    return grouped;
  }

  /**
   * Group investors by equity bracket
   * @param {Array} investors - Investors
   * @returns {Array} Equity bracket distribution
   */
  _groupByEquityBracket(investors) {
    const brackets = [
      { min: 0, max: 1, label: '0-1%' },
      { min: 1, max: 5, label: '1-5%' },
      { min: 5, max: 10, label: '5-10%' },
      { min: 10, max: 100, label: '10%+' }
    ];

    return brackets.map(bracket => {
      const inBracket = investors.filter(inv => {
        const equity = inv.equityPercentage || 0;
        return equity >= bracket.min && equity < bracket.max;
      });
      return {
        bracket: bracket.label,
        count: inBracket.length,
        totalEquity: inBracket.reduce((sum, inv) => sum + (inv.equityPercentage || 0), 0)
      };
    });
  }

  /**
   * Compare company metrics with benchmarks
   * @param {Object} metrics - Company metrics
   * @param {Object} benchmarks - Industry benchmarks
   * @returns {Object} Comparison results
   */
  _compareWithBenchmarks(metrics, benchmarks) {
    const comparison = {};

    if (metrics.seedRoundSize !== null && benchmarks.seedRoundMedian) {
      const diff = metrics.seedRoundSize - benchmarks.seedRoundMedian;
      comparison.seedRound = {
        company: metrics.seedRoundSize,
        benchmark: benchmarks.seedRoundMedian,
        difference: diff,
        performance: diff >= 0 ? 'above' : 'below'
      };
    }

    if (metrics.seriesARoundSize !== null && benchmarks.seriesAMedian) {
      const diff = metrics.seriesARoundSize - benchmarks.seriesAMedian;
      comparison.seriesA = {
        company: metrics.seriesARoundSize,
        benchmark: benchmarks.seriesAMedian,
        difference: diff,
        performance: diff >= 0 ? 'above' : 'below'
      };
    }

    if (metrics.averageDilution !== null && benchmarks.averageDilutionSeed) {
      // For dilution, lower is better
      const diff = benchmarks.averageDilutionSeed - metrics.averageDilution;
      comparison.dilution = {
        company: metrics.averageDilution,
        benchmark: benchmarks.averageDilutionSeed,
        difference: diff,
        performance: diff >= 0 ? 'better' : 'worse'
      };
    }

    return comparison;
  }

  /**
   * Predict next round type based on history
   * @param {string} currentRoundType - Current/latest round type
   * @returns {string} Predicted next round type
   */
  _predictNextRoundType(currentRoundType) {
    const progression = {
      'Pre-Seed': 'Seed',
      'Seed': 'Series A',
      'Series A': 'Series B',
      'Series B': 'Series C',
      'Series C': 'Series D',
      'Series D': 'Growth'
    };
    return progression[currentRoundType] || 'Seed';
  }

  /**
   * Estimate next round size
   * @param {Array} rounds - Historical rounds
   * @param {string} nextRoundType - Predicted next round type
   * @returns {Object} Round size estimate
   */
  _estimateNextRoundSize(rounds, nextRoundType) {
    // Typical round size multipliers
    const typicalSizes = {
      'Seed': 1500000,
      'Series A': 10000000,
      'Series B': 30000000,
      'Series C': 75000000,
      'Series D': 150000000,
      'Growth': 250000000
    };

    const baseEstimate = typicalSizes[nextRoundType] || 5000000;

    // Adjust based on historical growth if available
    if (rounds.length >= 2) {
      const sortedRounds = [...rounds].sort((a, b) => new Date(a.date) - new Date(b.date));
      const latestRound = sortedRounds[sortedRounds.length - 1];
      const previousRound = sortedRounds[sortedRounds.length - 2];

      if (previousRound.amountRaised > 0) {
        const growthRate = latestRound.amountRaised / previousRound.amountRaised;
        return {
          low: Math.round(baseEstimate * 0.7),
          mid: Math.round(baseEstimate),
          high: Math.round(baseEstimate * 1.3),
          basedOnGrowth: Math.round(latestRound.amountRaised * growthRate)
        };
      }
    }

    return {
      low: Math.round(baseEstimate * 0.7),
      mid: Math.round(baseEstimate),
      high: Math.round(baseEstimate * 1.3),
      basedOnGrowth: null
    };
  }

  /**
   * Project company valuation
   * @param {Array} rounds - Historical rounds
   * @param {string} nextRoundType - Next round type
   * @returns {Object} Valuation projection
   */
  _projectValuation(rounds, nextRoundType) {
    if (rounds.length === 0) {
      return {
        current: 0,
        projected: 0,
        methodology: 'No historical data available'
      };
    }

    const sortedRounds = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestRound = sortedRounds[0];

    // Calculate current post-money valuation
    let currentValuation = 0;
    if (latestRound.equityGiven > 0) {
      currentValuation = (latestRound.amountRaised / latestRound.equityGiven) * 100;
    }

    // Typical valuation step-ups between rounds
    const stepUps = {
      'Seed': 2.5,
      'Series A': 3,
      'Series B': 2.5,
      'Series C': 2,
      'Series D': 1.5,
      'Growth': 1.3
    };

    const stepUp = stepUps[nextRoundType] || 2;
    const projectedValuation = currentValuation * stepUp;

    return {
      current: currentValuation,
      projected: projectedValuation,
      stepUpMultiple: stepUp,
      methodology: 'Based on typical round-to-round valuation step-ups'
    };
  }

  /**
   * Generate fundraising recommendations
   * @param {Object} data - Company data for recommendations
   * @returns {Array} List of recommendations
   */
  _generateRecommendations(data) {
    const recommendations = [];
    const { runwayMonths, burnRate, rounds, currentCash, nextRoundType } = data;

    // Runway-based recommendations
    if (runwayMonths < 6) {
      recommendations.push({
        priority: 'high',
        category: 'runway',
        message: 'Runway is below 6 months. Begin fundraising immediately.',
        action: 'Start investor outreach now'
      });
    } else if (runwayMonths < 12) {
      recommendations.push({
        priority: 'medium',
        category: 'runway',
        message: 'Runway between 6-12 months. Start preparing for next round.',
        action: 'Begin building investor relationships and materials'
      });
    } else {
      recommendations.push({
        priority: 'low',
        category: 'runway',
        message: 'Healthy runway of 12+ months.',
        action: 'Focus on growth metrics before next raise'
      });
    }

    // Round-specific recommendations
    if (nextRoundType === 'Series A' && rounds.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'metrics',
        message: 'Preparing for Series A: Focus on ARR and growth rate.',
        action: 'Aim for $1M+ ARR or clear path to product-market fit'
      });
    }

    // Burn rate recommendations
    if (burnRate > 0 && currentCash > 0) {
      const burnEfficiency = currentCash / burnRate;
      if (burnEfficiency < 12) {
        recommendations.push({
          priority: 'medium',
          category: 'burn',
          message: 'Consider optimizing burn rate to extend runway.',
          action: 'Review operational expenses for efficiency opportunities'
        });
      }
    }

    // General recommendations
    recommendations.push({
      priority: 'low',
      category: 'general',
      message: `Typical ${nextRoundType} round preparation takes 3-6 months.`,
      action: 'Build data room and update pitch materials'
    });

    return recommendations;
  }
}

// Export singleton instance
module.exports = new FundraisingAnalyticsService();
