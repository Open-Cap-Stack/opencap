/**
 * Financial Analytics Service
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Provides comprehensive financial analytics features including:
 * - Financial trend analysis (revenue, expenses, profitability)
 * - Ratio calculations (liquidity, profitability, efficiency)
 * - Performance benchmarking against industry standards and goals
 */

const databaseAdapter = require('./databaseAdapter');

class FinancialAnalyticsService {
  constructor() {
    // Threshold for determining trend direction
    this.trendThreshold = 0.05; // 5% change is considered significant
  }

  /**
   * Analyze financial trends over time
   * @param {string} companyId - Company identifier
   * @param {Object} options - Analysis options
   * @param {string} options.metric - Metric to analyze (revenue, expenses, profitability)
   * @param {Date} options.startDate - Start date for analysis
   * @param {Date} options.endDate - End date for analysis
   * @returns {Object} Trend analysis results
   */
  async analyzeTrends(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { metric = 'revenue', startDate, endDate } = options;

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      throw new Error('End date must be after start date');
    }

    // Build query for financial reports
    const query = { companyId };
    if (startDate || endDate) {
      query.reportDate = {};
      if (startDate) query.reportDate.$gte = startDate;
      if (endDate) query.reportDate.$lte = endDate;
    }

    // Fetch financial data
    const financialData = await databaseAdapter.find('FinancialReport', query, {
      sort: { reportDate: 1 }
    });

    // Handle insufficient data
    if (!financialData || financialData.length === 0) {
      return {
        companyId,
        metric,
        trend: { direction: 'insufficient_data', growthRate: 0 },
        dataPoints: [],
        periodChanges: [],
        generatedAt: new Date()
      };
    }

    // Extract metric values
    const dataPoints = financialData.map(report => {
      let value;
      switch (metric) {
        case 'revenue':
          value = report.totalRevenue || 0;
          break;
        case 'expenses':
          value = report.totalExpenses || 0;
          break;
        case 'profitability':
          value = report.netIncome || 0;
          break;
        default:
          value = report.totalRevenue || 0;
      }
      return {
        date: report.reportDate,
        value
      };
    });

    // Calculate trend
    const trend = this._calculateTrend(dataPoints.map(dp => dp.value));

    // Calculate period-over-period changes
    const periodChanges = this._calculatePeriodChanges(dataPoints);

    return {
      companyId,
      metric,
      trend,
      dataPoints,
      periodChanges,
      summary: {
        first: dataPoints[0]?.value || 0,
        last: dataPoints[dataPoints.length - 1]?.value || 0,
        min: Math.min(...dataPoints.map(dp => dp.value)),
        max: Math.max(...dataPoints.map(dp => dp.value)),
        average: dataPoints.reduce((sum, dp) => sum + dp.value, 0) / dataPoints.length
      },
      generatedAt: new Date()
    };
  }

  /**
   * Calculate financial ratios
   * @param {string} companyId - Company identifier
   * @param {Object} options - Ratio calculation options
   * @param {string} options.category - Category of ratios (liquidity, profitability, efficiency)
   * @returns {Object} Calculated ratios
   */
  async calculateRatios(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { category } = options;

    // Fetch latest financial data
    const financialData = await databaseAdapter.findOne('FinancialReport',
      { companyId },
      { sort: { reportDate: -1 } }
    );

    if (!financialData) {
      throw new Error('Financial data not found');
    }

    const result = { companyId, calculatedAt: new Date() };

    // Calculate requested category or all categories
    if (!category || category === 'liquidity') {
      result.liquidity = this._calculateLiquidityRatios(financialData);
    }

    if (!category || category === 'profitability') {
      result.profitability = this._calculateProfitabilityRatios(financialData);
    }

    if (!category || category === 'efficiency') {
      result.efficiency = this._calculateEfficiencyRatios(financialData);
    }

    return result;
  }

  /**
   * Benchmark performance against industry standards or goals
   * @param {string} companyId - Company identifier
   * @param {Object} options - Benchmarking options
   * @param {string} options.industry - Industry for comparison
   * @param {string} options.period - Period to benchmark
   * @param {string} options.compareAgainst - Compare against 'industry' or 'goals'
   * @param {Object} options.goals - Company goals if comparing against goals
   * @returns {Object} Benchmark comparison results
   */
  async benchmarkPerformance(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { industry, compareAgainst = 'industry', goals } = options;

    // Fetch company financial data
    const companyData = await databaseAdapter.findOne('FinancialReport',
      { companyId },
      { sort: { reportDate: -1 } }
    );

    if (!companyData) {
      throw new Error('Company financial data not found');
    }

    // Calculate company metrics
    const companyMetrics = this._calculateCompanyMetrics(companyData);

    const result = {
      companyId,
      companyMetrics,
      benchmarkedAt: new Date()
    };

    if (compareAgainst === 'goals' && goals) {
      // Compare against company goals
      const historicalData = await databaseAdapter.find('FinancialReport',
        { companyId },
        { sort: { reportDate: 1 } }
      );

      result.goalComparison = this._compareWithGoals(companyData, historicalData, goals);
    } else {
      // Compare against industry benchmarks
      const benchmarkData = await databaseAdapter.findOne('IndustryBenchmark',
        { industry: industry || 'default' }
      );

      if (benchmarkData) {
        result.industryBenchmarks = benchmarkData.benchmarks;
        result.comparison = this._compareWithBenchmarks(companyMetrics, benchmarkData.benchmarks);
        result.performanceScore = this._calculatePerformanceScore(companyMetrics, benchmarkData.benchmarks);
        result.improvementAreas = this._identifyImprovementAreas(companyMetrics, benchmarkData.benchmarks);
      } else {
        result.industryBenchmarks = null;
        result.comparison = null;
        result.performanceScore = null;
        result.improvementAreas = [];
      }
    }

    return result;
  }

  /**
   * Get comprehensive financial summary
   * @param {string} companyId - Company identifier
   * @returns {Object} Financial summary
   */
  async getFinancialSummary(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const [trends, ratios] = await Promise.all([
      this.analyzeTrends(companyId, { metric: 'revenue' }),
      this.calculateRatios(companyId)
    ]);

    // Generate highlights
    const highlights = this._generateHighlights(trends, ratios);

    return {
      companyId,
      trends,
      ratios,
      highlights,
      generatedAt: new Date()
    };
  }

  // Private helper methods

  /**
   * Calculate trend direction and growth rate
   * @param {Array} values - Array of numeric values
   * @returns {Object} Trend information
   */
  _calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'insufficient_data', growthRate: 0, strength: 0 };
    }

    const first = values[0];
    const last = values[values.length - 1];

    // Calculate growth rate
    const growthRate = first > 0 ? ((last - first) / first) : 0;

    // Calculate linear regression slope for trend strength
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;
    const strength = avgValue > 0 ? Math.abs(slope / avgValue) : 0;

    // Determine direction
    let direction;
    if (Math.abs(growthRate) < this.trendThreshold) {
      direction = 'stable';
    } else if (growthRate > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    return { direction, growthRate, strength };
  }

  /**
   * Calculate period-over-period changes
   * @param {Array} dataPoints - Array of data points with date and value
   * @returns {Array} Period changes
   */
  _calculatePeriodChanges(dataPoints) {
    const changes = [];
    for (let i = 1; i < dataPoints.length; i++) {
      const prev = dataPoints[i - 1];
      const curr = dataPoints[i];
      const change = prev.value > 0
        ? ((curr.value - prev.value) / prev.value) * 100
        : 0;

      changes.push({
        fromDate: prev.date,
        toDate: curr.date,
        fromValue: prev.value,
        toValue: curr.value,
        change,
        changeAmount: curr.value - prev.value
      });
    }
    return changes;
  }

  /**
   * Calculate liquidity ratios
   * @param {Object} data - Financial data
   * @returns {Object} Liquidity ratios
   */
  _calculateLiquidityRatios(data) {
    const {
      currentAssets = 0,
      currentLiabilities = 0,
      inventory = 0,
      cash = 0
    } = data;

    return {
      currentRatio: currentLiabilities > 0
        ? currentAssets / currentLiabilities
        : null,
      quickRatio: currentLiabilities > 0
        ? (currentAssets - inventory) / currentLiabilities
        : null,
      cashRatio: currentLiabilities > 0
        ? cash / currentLiabilities
        : null
    };
  }

  /**
   * Calculate profitability ratios
   * @param {Object} data - Financial data
   * @returns {Object} Profitability ratios
   */
  _calculateProfitabilityRatios(data) {
    const {
      totalRevenue = 0,
      grossProfit = 0,
      operatingIncome = 0,
      netIncome = 0,
      totalAssets = 0,
      shareholdersEquity = 0
    } = data;

    return {
      grossMargin: totalRevenue > 0
        ? (grossProfit / totalRevenue) * 100
        : null,
      operatingMargin: totalRevenue > 0
        ? (operatingIncome / totalRevenue) * 100
        : null,
      netMargin: totalRevenue > 0
        ? (netIncome / totalRevenue) * 100
        : null,
      returnOnAssets: totalAssets > 0
        ? (netIncome / totalAssets) * 100
        : null,
      returnOnEquity: shareholdersEquity > 0
        ? (netIncome / shareholdersEquity) * 100
        : null
    };
  }

  /**
   * Calculate efficiency ratios
   * @param {Object} data - Financial data
   * @returns {Object} Efficiency ratios
   */
  _calculateEfficiencyRatios(data) {
    const {
      totalRevenue = 0,
      costOfGoodsSold = 0,
      totalAssets = 0,
      inventory = 0,
      accountsReceivable = 0,
      accountsPayable = 0
    } = data;

    return {
      assetTurnover: totalAssets > 0
        ? totalRevenue / totalAssets
        : null,
      inventoryTurnover: inventory > 0
        ? costOfGoodsSold / inventory
        : null,
      receivablesTurnover: accountsReceivable > 0
        ? totalRevenue / accountsReceivable
        : null,
      payablesTurnover: accountsPayable > 0
        ? costOfGoodsSold / accountsPayable
        : null
    };
  }

  /**
   * Calculate company metrics from financial data
   * @param {Object} data - Financial data
   * @returns {Object} Company metrics
   */
  _calculateCompanyMetrics(data) {
    const profitability = this._calculateProfitabilityRatios(data);
    const liquidity = this._calculateLiquidityRatios(data);
    const efficiency = this._calculateEfficiencyRatios(data);

    return {
      ...profitability,
      ...liquidity,
      ...efficiency,
      totalRevenue: data.totalRevenue,
      netIncome: data.netIncome
    };
  }

  /**
   * Compare company metrics with industry benchmarks
   * @param {Object} metrics - Company metrics
   * @param {Object} benchmarks - Industry benchmarks
   * @returns {Object} Comparison results
   */
  _compareWithBenchmarks(metrics, benchmarks) {
    const comparison = {};

    for (const [key, benchmark] of Object.entries(benchmarks)) {
      if (metrics[key] !== undefined && metrics[key] !== null) {
        const difference = metrics[key] - benchmark;
        comparison[key] = {
          company: metrics[key],
          benchmark,
          difference,
          performance: difference > 0 ? 'above' : difference < 0 ? 'below' : 'at'
        };
      }
    }

    return comparison;
  }

  /**
   * Compare with company goals
   * @param {Object} currentData - Current financial data
   * @param {Array} historicalData - Historical financial data
   * @param {Object} goals - Company goals
   * @returns {Object} Goal comparison
   */
  _compareWithGoals(currentData, historicalData, goals) {
    const comparison = {};

    // Revenue growth comparison
    if (goals.revenueGrowth !== undefined && historicalData.length >= 2) {
      const previousRevenue = historicalData[historicalData.length - 2]?.totalRevenue || 0;
      const currentRevenue = currentData.totalRevenue || 0;
      const actualGrowth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      comparison.revenueGrowth = {
        goal: goals.revenueGrowth,
        actual: actualGrowth,
        achieved: actualGrowth >= goals.revenueGrowth
      };
    }

    // Net margin comparison
    if (goals.netMargin !== undefined) {
      const actualMargin = currentData.totalRevenue > 0
        ? (currentData.netIncome / currentData.totalRevenue) * 100
        : 0;

      comparison.netMargin = {
        goal: goals.netMargin,
        actual: actualMargin,
        achieved: actualMargin >= goals.netMargin
      };
    }

    // ROE comparison
    if (goals.returnOnEquity !== undefined) {
      const actualROE = currentData.shareholdersEquity > 0
        ? (currentData.netIncome / currentData.shareholdersEquity) * 100
        : 0;

      comparison.returnOnEquity = {
        goal: goals.returnOnEquity,
        actual: actualROE,
        achieved: actualROE >= goals.returnOnEquity
      };
    }

    return comparison;
  }

  /**
   * Calculate overall performance score
   * @param {Object} metrics - Company metrics
   * @param {Object} benchmarks - Industry benchmarks
   * @returns {number} Performance score (0-100)
   */
  _calculatePerformanceScore(metrics, benchmarks) {
    const comparisons = [];

    for (const [key, benchmark] of Object.entries(benchmarks)) {
      if (metrics[key] !== undefined && metrics[key] !== null && benchmark > 0) {
        const ratio = metrics[key] / benchmark;
        comparisons.push(Math.min(ratio, 1.5)); // Cap at 150% to avoid outliers
      }
    }

    if (comparisons.length === 0) return null;

    const avgRatio = comparisons.reduce((sum, r) => sum + r, 0) / comparisons.length;
    return Math.min(Math.round(avgRatio * 66.67), 100); // Scale to 0-100
  }

  /**
   * Identify areas for improvement
   * @param {Object} metrics - Company metrics
   * @param {Object} benchmarks - Industry benchmarks
   * @returns {Array} Areas needing improvement
   */
  _identifyImprovementAreas(metrics, benchmarks) {
    const areas = [];

    const metricLabels = {
      grossMargin: 'Gross Margin',
      operatingMargin: 'Operating Margin',
      netMargin: 'Net Profit Margin',
      returnOnAssets: 'Return on Assets',
      returnOnEquity: 'Return on Equity',
      currentRatio: 'Current Ratio',
      quickRatio: 'Quick Ratio',
      assetTurnover: 'Asset Turnover'
    };

    for (const [key, benchmark] of Object.entries(benchmarks)) {
      if (metrics[key] !== undefined && metrics[key] !== null) {
        const difference = metrics[key] - benchmark;
        if (difference < 0) {
          areas.push({
            metric: key,
            label: metricLabels[key] || key,
            current: metrics[key],
            target: benchmark,
            gap: Math.abs(difference),
            priority: Math.abs(difference / benchmark) > 0.2 ? 'high' : 'medium'
          });
        }
      }
    }

    // Sort by priority and gap
    return areas.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      return b.gap - a.gap;
    });
  }

  /**
   * Generate financial highlights
   * @param {Object} trends - Trend analysis results
   * @param {Object} ratios - Ratio calculations
   * @returns {Array} Financial highlights
   */
  _generateHighlights(trends, ratios) {
    const highlights = [];

    // Revenue trend highlight
    if (trends.trend.direction === 'up') {
      highlights.push({
        type: 'positive',
        category: 'revenue',
        message: `Revenue showing upward trend with ${(trends.trend.growthRate * 100).toFixed(1)}% growth`
      });
    } else if (trends.trend.direction === 'down') {
      highlights.push({
        type: 'warning',
        category: 'revenue',
        message: `Revenue declining with ${(Math.abs(trends.trend.growthRate) * 100).toFixed(1)}% decrease`
      });
    }

    // Liquidity highlight
    if (ratios.liquidity) {
      if (ratios.liquidity.currentRatio >= 2) {
        highlights.push({
          type: 'positive',
          category: 'liquidity',
          message: `Strong liquidity position with current ratio of ${ratios.liquidity.currentRatio.toFixed(2)}`
        });
      } else if (ratios.liquidity.currentRatio < 1) {
        highlights.push({
          type: 'warning',
          category: 'liquidity',
          message: `Liquidity concern: current ratio below 1 at ${ratios.liquidity.currentRatio.toFixed(2)}`
        });
      }
    }

    // Profitability highlight
    if (ratios.profitability) {
      if (ratios.profitability.netMargin > 15) {
        highlights.push({
          type: 'positive',
          category: 'profitability',
          message: `Healthy profit margin at ${ratios.profitability.netMargin.toFixed(1)}%`
        });
      } else if (ratios.profitability.netMargin < 5) {
        highlights.push({
          type: 'warning',
          category: 'profitability',
          message: `Low profit margin at ${ratios.profitability.netMargin.toFixed(1)}%`
        });
      }
    }

    return highlights;
  }
}

// Export singleton instance
module.exports = new FinancialAnalyticsService();
