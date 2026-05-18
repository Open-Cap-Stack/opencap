/**
 * Advanced Analytics Service
 *
 * [Feature] Issue #31: Implement advanced analytics with ZeroDB
 * Provides comprehensive analytics features including:
 * - Cap table analytics
 * - Investment trends analysis
 * - Stakeholder insights
 * - Document analytics
 * - Vector-based predictions
 * - Time-series analysis
 * - Cohort analysis
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');
const FinancialReport = require('../models/financialReport');
const ShareClass = require('../models/ShareClass');
const Stakeholder = require('../models/Stakeholder');
const Company = require('../models/Company');

class AdvancedAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cap table summary for a company
   * @param {string} companyId - Company identifier
   * @param {Object} options - Query options
   * @returns {Object} Cap table summary
   */
  async getCapTableSummary(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Check cache
    const cacheKey = `capTable:${companyId}`;
    if (options.useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return { ...cached.data, fromCache: true };
      }
    }

    const [shareClasses, stakeholders] = await Promise.all([
      ShareClass.find({ companyId }),
      Stakeholder.find({ companyId })
    ]);

    const totalAuthorizedShares = shareClasses.reduce(
      (sum, sc) => sum + (sc.authorizedShares || 0), 0
    );
    const totalDilutedShares = shareClasses.reduce(
      (sum, sc) => sum + (sc.dilutedShares || 0), 0
    );

    const ownershipDistribution = {};
    shareClasses.forEach(sc => {
      ownershipDistribution[sc.name] = sc.ownershipPercentage || 0;
    });

    const result = {
      companyId,
      totalAuthorizedShares,
      totalDilutedShares,
      shareClasses,
      stakeholders,
      ownershipDistribution,
      generatedAt: new Date()
    };

    // Store in cache
    if (options.useCache) {
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return result;
  }

  /**
   * Analyze dilution scenarios
   * @param {string} companyId - Company identifier
   * @param {Object} newInvestment - Investment details
   * @returns {Object} Dilution analysis
   */
  async getDilutionAnalysis(companyId, newInvestment) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const shareClasses = await ShareClass.find({ companyId });

    const totalPreMoney = newInvestment.preMoneyValuation;
    const postMoneyValuation = totalPreMoney + newInvestment.amount;
    const newInvestorOwnership = (newInvestment.amount / postMoneyValuation) * 100;
    const dilutionPercentage = newInvestorOwnership;

    const preDilution = {
      foundersOwnership: shareClasses.reduce((sum, sc) => sum + (sc.ownershipPercentage || 0), 0),
      totalShares: shareClasses.reduce((sum, sc) => sum + (sc.dilutedShares || 0), 0),
      valuation: totalPreMoney
    };

    const postDilution = {
      foundersOwnership: preDilution.foundersOwnership * (1 - newInvestorOwnership / 100),
      totalShares: Math.ceil(preDilution.totalShares / (1 - newInvestorOwnership / 100)),
      valuation: postMoneyValuation
    };

    return {
      preDilution,
      postDilution,
      dilutionPercentage,
      newInvestorOwnership,
      investmentDetails: newInvestment
    };
  }

  /**
   * Analyze multiple dilution rounds
   * @param {string} companyId - Company identifier
   * @param {Array} rounds - Array of investment rounds
   * @returns {Object} Multi-round dilution analysis
   */
  async getMultiRoundDilution(companyId, rounds) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const shareClasses = await ShareClass.find({ companyId });
    let currentOwnership = 100;
    const roundResults = [];

    for (const round of rounds) {
      const postMoney = round.preMoneyValuation + round.amount;
      const newInvestorOwnership = (round.amount / postMoney) * 100;
      currentOwnership = currentOwnership * (1 - newInvestorOwnership / 100);

      roundResults.push({
        roundName: round.shareClassName,
        amount: round.amount,
        preMoneyValuation: round.preMoneyValuation,
        postMoneyValuation: postMoney,
        newInvestorOwnership,
        founderOwnershipAfter: currentOwnership
      });
    }

    const totalDilution = 100 - currentOwnership;

    return {
      rounds: roundResults,
      totalDilution,
      finalFounderOwnership: currentOwnership
    };
  }

  /**
   * Get investment trends over time
   * @param {string} companyId - Company identifier
   * @param {Object} timeRange - Start and end dates
   * @returns {Object} Investment trends
   */
  async getInvestmentTrends(companyId, timeRange) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    if (!timeRange) {
      throw new Error('Time range is required');
    }

    const reports = await FinancialReport.find(
      { companyId, reportDate: { $gte: timeRange.start, $lte: timeRange.end } },
      { sort: { reportDate: 1 } }
    );

    if (reports.length < 2) {
      return {
        trend: 'insufficient_data',
        revenueGrowthRate: 0,
        quarterOverQuarter: reports,
        movingAverage: {}
      };
    }

    // Calculate growth rate
    const revenues = reports.map(r => r.totalRevenue || 0);
    const firstRevenue = revenues[0];
    const lastRevenue = revenues[revenues.length - 1];
    const revenueGrowthRate = firstRevenue > 0
      ? ((lastRevenue - firstRevenue) / firstRevenue)
      : 0;

    // Determine trend
    let trend = 'stable';
    if (revenueGrowthRate > 0.1) trend = 'growing';
    else if (revenueGrowthRate < -0.1) trend = 'declining';

    // Calculate moving averages
    const movingAverage = {};
    if (revenues.length >= 3) {
      const lastThree = revenues.slice(-3);
      movingAverage.threeQuarter = lastThree.reduce((a, b) => a + b, 0) / 3;
    }

    return {
      trend,
      revenueGrowthRate,
      quarterOverQuarter: reports,
      movingAverage
    };
  }

  /**
   * Forecast future revenue
   * @param {string} companyId - Company identifier
   * @param {number} periods - Number of periods to forecast
   * @returns {Object} Revenue forecasts
   */
  async forecastRevenue(companyId, periods) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const reports = await FinancialReport.find(
      { companyId },
      { sort: { reportDate: 1 } }
    );

    if (reports.length < 2) {
      throw new Error('Insufficient data for forecasting');
    }

    const revenues = reports.map(r => r.totalRevenue || 0);

    // Calculate growth rate using linear regression
    const n = revenues.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = revenues.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const lastRevenue = revenues[revenues.length - 1];

    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      const predictedRevenue = lastRevenue + (slope * i);
      forecasts.push({
        period: i,
        predictedRevenue: Math.max(0, predictedRevenue),
        confidence: Math.max(0.5, 0.95 - (i * 0.05))
      });
    }

    return {
      forecasts,
      confidence: forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length,
      methodology: 'linear_regression'
    };
  }

  /**
   * Get stakeholder insights
   * @param {string} companyId - Company identifier
   * @returns {Object} Stakeholder insights
   */
  async getStakeholderInsights(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const stakeholders = await Stakeholder.find({ companyId });

    // Calculate role distribution
    const roleDistribution = {};
    stakeholders.forEach(sh => {
      const role = sh.role || 'Other';
      roleDistribution[role] = (roleDistribution[role] || 0) + (sh.equityHoldings || 0);
    });

    // Get top stakeholders
    const topStakeholders = [...stakeholders]
      .sort((a, b) => (b.equityHoldings || 0) - (a.equityHoldings || 0))
      .slice(0, 3);

    // Calculate concentration index (Herfindahl-Hirschman Index)
    const totalEquity = stakeholders.reduce((sum, sh) => sum + (sh.equityHoldings || 0), 0);
    let concentrationIndex = 0;
    if (totalEquity > 0) {
      concentrationIndex = stakeholders.reduce((sum, sh) => {
        const share = (sh.equityHoldings || 0) / totalEquity;
        return sum + (share * share);
      }, 0);
    }

    // Determine concentration level
    let concentrationLevel = 'low';
    if (concentrationIndex > 0.5) concentrationLevel = 'high';
    else if (concentrationIndex > 0.25) concentrationLevel = 'moderate';

    // Identify risks
    const risks = [];
    const maxHolder = topStakeholders[0];
    if (maxHolder && maxHolder.equityHoldings > 80) {
      risks.push({
        type: 'key_person_dependency',
        description: 'Single stakeholder holds more than 80% of equity',
        severity: 'high'
      });
    }

    return {
      roleDistribution,
      topStakeholders,
      concentrationIndex,
      concentrationLevel,
      risks,
      totalStakeholders: stakeholders.length
    };
  }

  /**
   * Get document analytics using ZeroDB
   * @param {string} companyId - Company identifier
   * @returns {Object} Document analytics
   */
  async getDocumentAnalytics(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const documents = await zerodbService.queryTable('documents', {
      filter: { company_id: companyId }
    });

    const totalDocuments = documents.length;
    const documentsByType = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let recentDocuments = 0;
    documents.forEach(doc => {
      const type = doc.type || 'unknown';
      documentsByType[type] = (documentsByType[type] || 0) + 1;

      const createdAt = new Date(doc.created_at);
      // Count documents from the last 30 days (exclusive of exactly 30 days ago)
      if (createdAt > thirtyDaysAgo) {
        recentDocuments++;
      }
    });

    return {
      totalDocuments,
      documentsByType,
      activityMetrics: {
        recentDocuments,
        averagePerMonth: totalDocuments > 0 ? totalDocuments / 12 : 0
      }
    };
  }

  /**
   * Get predictive insights using vector embeddings
   * @param {string} companyId - Company identifier
   * @returns {Object} Predictive insights
   */
  async getPredictiveInsights(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const company = await Company.findOne({ companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    // Generate embedding for company profile
    const companyProfile = `${company.CompanyName} ${company.CompanyType} ${company.industry || ''}`;
    const embedding = await vectorService.generateEmbedding(companyProfile);

    // Find similar companies
    const searchResults = await zerodbService.searchVectors(embedding, 10, 'companies');

    const similarCompanies = (searchResults.vectors || [])
      .filter(v => v.vector_metadata?.company_id !== companyId);

    // Calculate predicted growth rate based on similar companies
    let predictedGrowthRate = 0;
    let confidenceScore = 0;

    if (similarCompanies.length > 0) {
      const weightedGrowth = similarCompanies.reduce((sum, comp) => {
        const growth = comp.vector_metadata?.growth_rate || 0;
        const weight = comp.similarity_score || 0;
        return sum + (growth * weight);
      }, 0);
      const totalWeight = similarCompanies.reduce(
        (sum, comp) => sum + (comp.similarity_score || 0), 0
      );
      predictedGrowthRate = totalWeight > 0 ? weightedGrowth / totalWeight : 0;
      confidenceScore = totalWeight / similarCompanies.length;
    }

    return {
      predictedGrowthRate,
      similarCompanies,
      confidenceScore,
      companyId
    };
  }

  /**
   * Predict investment outcome
   * @param {string} companyId - Company identifier
   * @param {Object} investmentScenario - Investment scenario details
   * @returns {Object} Investment prediction
   */
  async predictInvestmentOutcome(companyId, investmentScenario) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const company = await Company.findOne({ companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    // Generate embedding for investment scenario
    const scenarioProfile = `${company.CompanyName} ${investmentScenario.investmentType} ${investmentScenario.amount}`;
    const embedding = await vectorService.generateEmbedding(scenarioProfile);

    // Find similar past investments
    const searchResults = await zerodbService.searchVectors(embedding, 5, 'investments');
    const similarInvestments = searchResults.vectors || [];

    // Calculate predictions
    let predictedGrowth = 0;
    let expectedValuation = 0;

    if (similarInvestments.length > 0) {
      predictedGrowth = similarInvestments.reduce(
        (sum, inv) => sum + (inv.vector_metadata?.post_investment_growth || 0), 0
      ) / similarInvestments.length;
      expectedValuation = similarInvestments.reduce(
        (sum, inv) => sum + (inv.vector_metadata?.exit_valuation || 0), 0
      ) / similarInvestments.length;
    }

    // Risk assessment
    const riskFactors = [];
    if (investmentScenario.amount > 5000000) {
      riskFactors.push('large_investment_size');
    }
    if (predictedGrowth < 0.1) {
      riskFactors.push('low_growth_potential');
    }

    return {
      predictedGrowth,
      expectedValuation,
      riskAssessment: {
        level: riskFactors.length > 1 ? 'high' : riskFactors.length === 1 ? 'medium' : 'low',
        factors: riskFactors
      }
    };
  }

  /**
   * Find companies with similar performance patterns
   * @param {string} companyId - Company identifier
   * @param {number} limit - Maximum results
   * @returns {Object} Similar companies
   */
  async findSimilarPerformingCompanies(companyId, limit = 5) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const company = await Company.findOne({ companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const reports = await FinancialReport.find(
      { companyId },
      { sort: { reportDate: 1 } }
    );

    // Generate performance embedding
    const performanceProfile = reports.length > 0
      ? `revenue:${reports[reports.length - 1]?.totalRevenue} growth:${this.calculateGrowthRate(reports)}`
      : `company:${company.CompanyName}`;

    const embedding = await vectorService.generateEmbedding(performanceProfile);

    const searchResults = await zerodbService.searchVectors(embedding, limit + 1, 'companies');
    const similarCompanies = (searchResults.vectors || [])
      .filter(v => v.vector_metadata?.company_id !== companyId)
      .slice(0, limit);

    return {
      sourceCompanyId: companyId,
      similarCompanies
    };
  }

  /**
   * Calculate growth rate from financial reports
   * @param {Array} reports - Financial reports
   * @returns {number} Growth rate
   */
  calculateGrowthRate(reports) {
    if (reports.length < 2) return 0;
    const first = reports[0]?.totalRevenue || 0;
    const last = reports[reports.length - 1]?.totalRevenue || 0;
    return first > 0 ? (last - first) / first : 0;
  }

  /**
   * Perform time-series analysis
   * @param {string} companyId - Company identifier
   * @param {string} metric - Metric to analyze
   * @returns {Object} Time-series analysis
   */
  async getTimeSeriesAnalysis(companyId, metric = 'revenue') {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const reports = await FinancialReport.find(
      { companyId },
      { sort: { reportDate: 1 } }
    );

    // Calculate year-over-year growth even with limited data
    const yearOverYearGrowth = this.calculateYoYGrowth(reports, metric);

    if (reports.length < 4) {
      return {
        trend: { direction: 'insufficient_data' },
        seasonality: { detected: false },
        volatility: 0,
        yearOverYearGrowth
      };
    }

    // Extract metric values
    const values = reports.map(r => {
      if (metric === 'revenue') return r.totalRevenue || 0;
      if (metric === 'expenses') return r.totalExpenses || 0;
      if (metric === 'netIncome') return r.netIncome || 0;
      return r.totalRevenue || 0;
    });

    // Calculate trend
    const trend = this.calculateTrendDirection(values);

    // Detect seasonality
    const seasonality = this.detectSeasonality(reports, values);

    // Calculate volatility
    const volatility = this.calculateVolatility(values);

    return {
      trend,
      seasonality,
      volatility,
      yearOverYearGrowth
    };
  }

  /**
   * Calculate trend direction
   * @param {Array} values - Data values
   * @returns {Object} Trend info
   */
  calculateTrendDirection(values) {
    if (values.length < 2) return { direction: 'insufficient_data', strength: 0 };

    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction = 'stable';
    if (slope > 0) direction = 'up';
    else if (slope < 0) direction = 'down';

    const avgValue = sumY / n;
    const strength = avgValue > 0 ? Math.abs(slope / avgValue) : 0;

    return { direction, strength };
  }

  /**
   * Detect seasonality patterns
   * @param {Array} reports - Financial reports
   * @param {Array} values - Metric values
   * @returns {Object} Seasonality info
   */
  detectSeasonality(reports, values) {
    if (reports.length < 8) {
      return { detected: false };
    }

    // Group by quarter
    const quarterAverages = { Q1: [], Q2: [], Q3: [], Q4: [] };
    reports.forEach((report, idx) => {
      const date = new Date(report.reportDate);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      quarterAverages[`Q${quarter}`].push(values[idx]);
    });

    // Calculate average per quarter
    const avgByQuarter = {};
    Object.keys(quarterAverages).forEach(q => {
      const qValues = quarterAverages[q];
      avgByQuarter[q] = qValues.length > 0
        ? qValues.reduce((a, b) => a + b, 0) / qValues.length
        : 0;
    });

    // Find peak quarter
    let peakQuarter = 'Q1';
    let maxAvg = 0;
    Object.entries(avgByQuarter).forEach(([quarter, avg]) => {
      if (avg > maxAvg) {
        maxAvg = avg;
        peakQuarter = quarter;
      }
    });

    // Check if there's significant variation
    const overallAvg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = Math.abs(maxAvg - overallAvg) / overallAvg;
    const detected = variance > 0.15;

    return { detected, peakQuarter };
  }

  /**
   * Calculate volatility
   * @param {Array} values - Data values
   * @returns {number} Volatility measure
   */
  calculateVolatility(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Calculate year-over-year growth
   * @param {Array} reports - Financial reports
   * @param {string} metric - Metric name
   * @returns {Object} YoY growth by quarter
   */
  calculateYoYGrowth(reports, metric) {
    const yoyGrowth = {};
    const byQuarterYear = {};

    reports.forEach(report => {
      const date = new Date(report.reportDate);
      const year = date.getFullYear();
      const quarter = `Q${Math.floor(date.getMonth() / 3) + 1}`;
      const key = `${year}-${quarter}`;

      const value = metric === 'revenue' ? report.totalRevenue
        : metric === 'expenses' ? report.totalExpenses
        : report.netIncome;

      byQuarterYear[key] = { year, quarter, value: value || 0 };
    });

    // Calculate YoY for each quarter
    Object.keys(byQuarterYear).forEach(key => {
      const { year, quarter, value } = byQuarterYear[key];
      const prevKey = `${year - 1}-${quarter}`;

      if (byQuarterYear[prevKey]) {
        const prevValue = byQuarterYear[prevKey].value;
        if (prevValue > 0) {
          yoyGrowth[quarter] = ((value - prevValue) / prevValue) * 100;
        }
      }
    });

    return yoyGrowth;
  }

  /**
   * Get stakeholder cohorts
   * @param {string} companyId - Company identifier
   * @returns {Object} Stakeholder cohorts
   */
  async getStakeholderCohorts(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const stakeholders = await Stakeholder.find({ companyId });

    // Group by year
    const cohorts = {};
    const retentionByYear = {};

    stakeholders.forEach(sh => {
      const year = new Date(sh.createdAt).getFullYear().toString();

      if (!cohorts[year]) {
        cohorts[year] = { count: 0, totalEquity: 0, active: 0 };
      }

      cohorts[year].count++;
      cohorts[year].totalEquity += sh.equityHoldings || 0;
      if (sh.status !== 'inactive') {
        cohorts[year].active++;
      }
    });

    // Calculate retention rates
    Object.keys(cohorts).forEach(year => {
      const cohort = cohorts[year];
      retentionByYear[year] = cohort.count > 0
        ? (cohort.active / cohort.count) * 100
        : 0;
    });

    return {
      cohorts,
      retentionByYear
    };
  }

  /**
   * Get investment cohorts
   * @param {string} companyId - Company identifier
   * @returns {Object} Investment cohorts
   */
  async getInvestmentCohorts(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const reports = await FinancialReport.find(
      { companyId },
      { sort: { reportDate: 1 } }
    );

    // Group by year-quarter in application code (replaces MongoDB aggregate)
    const groups = {};
    reports.forEach(report => {
      const date = new Date(report.reportDate);
      const year = date.getFullYear();
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const key = `${year}-Q${quarter}`;

      if (!groups[key]) {
        groups[key] = { _id: { year, quarter }, revenues: [], netIncomes: [], count: 0 };
      }
      groups[key].revenues.push(report.totalRevenue || 0);
      groups[key].netIncomes.push(report.netIncome || 0);
      groups[key].count++;
    });

    const aggregation = Object.values(groups)
      .map(g => ({
        _id: g._id,
        avgRevenue: g.revenues.reduce((a, b) => a + b, 0) / g.count,
        avgNetIncome: g.netIncomes.reduce((a, b) => a + b, 0) / g.count,
        count: g.count
      }))
      .sort((a, b) => a._id.year - b._id.year || a._id.quarter - b._id.quarter);

    return {
      cohorts: aggregation.reduce((acc, item) => {
        acc[`${item._id.year}-Q${item._id.quarter}`] = item;
        return acc;
      }, {}),
      performanceByPeriod: aggregation
    };
  }

  /**
   * Generate custom analytics report
   * @param {string} companyId - Company identifier
   * @param {Object} reportConfig - Report configuration
   * @returns {Object} Custom report
   */
  async generateCustomReport(companyId, reportConfig) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const report = {};
    const { metrics, timeRange, format, exportFormat } = reportConfig;

    for (const metric of metrics) {
      switch (metric) {
        case 'revenue':
          const revenueData = await FinancialReport.find(
            {
              companyId,
              ...(timeRange && {
                reportDate: { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) }
              })
            },
            { sort: { reportDate: 1 } }
          );

          report.revenue = {
            data: revenueData,
            total: revenueData.reduce((sum, r) => sum + (r.totalRevenue || 0), 0),
            growth: this.calculateGrowthRate(revenueData)
          };
          break;

        case 'stakeholders':
          const stakeholderData = await this.getStakeholderInsights(companyId);
          report.stakeholders = stakeholderData;
          break;

        case 'dilution':
          const capTableData = await this.getCapTableSummary(companyId);
          report.dilution = {
            currentOwnership: capTableData.ownershipDistribution,
            totalShares: capTableData.totalDilutedShares
          };
          break;
      }
    }

    return {
      report,
      generatedAt: new Date(),
      exportable: !!exportFormat,
      format: exportFormat || 'json'
    };
  }

  /**
   * Batch get metrics for multiple companies
   * @param {Array} companyIds - Array of company IDs
   * @param {string} metric - Metric to retrieve
   * @returns {Array} Metrics for all companies
   */
  async batchGetMetrics(companyIds, metric) {
    if (!companyIds || companyIds.length === 0) {
      throw new Error('Company IDs are required');
    }

    const results = await zerodbService.queryTable('analytics_metrics', {
      filter: {
        company_id: { $in: companyIds },
        metric
      }
    });

    return results.map(r => ({
      companyId: r.company_id,
      metric: r.metric,
      value: r.value
    }));
  }

  /**
   * Store analytics snapshot in ZeroDB
   * @param {string} companyId - Company identifier
   * @param {Object} analyticsData - Analytics data to store
   * @returns {Object} Storage result
   */
  async storeAnalyticsSnapshot(companyId, analyticsData) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Store in ZeroDB table
    await zerodbService.insertRows('analytics_snapshots', [{
      company_id: companyId,
      snapshot_data: JSON.stringify(analyticsData),
      created_at: new Date().toISOString()
    }]);

    // Create vector embedding for analytics
    const analyticsProfile = JSON.stringify(analyticsData);
    const embedding = await vectorService.generateEmbedding(analyticsProfile);

    await zerodbService.upsertVector(
      embedding,
      'analytics',
      { company_id: companyId, snapshot_date: new Date().toISOString() },
      analyticsProfile,
      `analytics:${companyId}`
    );

    return {
      success: true,
      companyId,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
module.exports = new AdvancedAnalyticsService();
