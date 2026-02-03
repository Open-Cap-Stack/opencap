/**
 * Financial Metrics Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * [Feature] OCDI-202: Create financial reporting database models
 *
 * Comprehensive model for storing calculated financial metrics, ratios, and KPIs
 * derived from financial statements for analytical and reporting purposes.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Schema definition for Financial Metrics
 */
const financialMetricsSchema = {
    // Primary identifiers
    _id: { type: 'string', required: true },
    companyId: { type: 'string', required: true, index: true },

    // Reporting period
    reportingPeriod: { type: 'string', required: true, trim: true },
    reportingDate: { type: 'date', required: true, index: true },

    // Source data references
    sourceBalanceSheetId: { type: 'string' },
    sourceIncomeStatementId: { type: 'string' },
    sourceCashFlowId: { type: 'string' },

    // Liquidity Ratios
    liquidityRatios: {
        currentRatio: { type: 'number' },
        quickRatio: { type: 'number' },
        cashRatio: { type: 'number' },
        workingCapital: { type: 'number' },
        operatingCashFlowRatio: { type: 'number' }
    },

    // Activity/Efficiency Ratios
    activityRatios: {
        assetTurnover: { type: 'number' },
        inventoryTurnover: { type: 'number' },
        receivablesTurnover: { type: 'number' },
        payablesTurnover: { type: 'number' },
        daysInInventory: { type: 'number' },
        daysInReceivables: { type: 'number' },
        daysInPayables: { type: 'number' },
        cashConversionCycle: { type: 'number' }
    },

    // Leverage/Debt Ratios
    leverageRatios: {
        debtToAssets: { type: 'number' },
        debtToEquity: { type: 'number' },
        equityMultiplier: { type: 'number' },
        timesInterestEarned: { type: 'number' },
        cashCoverageRatio: { type: 'number' },
        debtServiceCoverageRatio: { type: 'number' },
        longTermDebtToEquity: { type: 'number' }
    },

    // Profitability Ratios
    profitabilityRatios: {
        grossProfitMargin: { type: 'number' },
        operatingProfitMargin: { type: 'number' },
        netProfitMargin: { type: 'number' },
        returnOnAssets: { type: 'number' },
        returnOnEquity: { type: 'number' },
        returnOnInvestedCapital: { type: 'number' },
        earningsBeforeInterestTaxes: { type: 'number' },
        earningsBeforeInterestTaxesDepreciationAmortization: { type: 'number' }
    },

    // Market/Valuation Ratios
    marketRatios: {
        priceToEarnings: { type: 'number' },
        priceToBook: { type: 'number' },
        priceToSales: { type: 'number' },
        earningsPerShare: { type: 'number' },
        bookValuePerShare: { type: 'number' },
        dividendYield: { type: 'number' },
        dividendPayoutRatio: { type: 'number' }
    },

    // Cash Flow Metrics
    cashFlowMetrics: {
        operatingCashFlow: { type: 'number' },
        freeCashFlow: { type: 'number' },
        freeCashFlowYield: { type: 'number' },
        cashFlowToDebt: { type: 'number' },
        cashFlowPerShare: { type: 'number' },
        capexToSales: { type: 'number' },
        cashConversionRatio: { type: 'number' }
    },

    // Growth Metrics
    growthMetrics: {
        revenueGrowthRate: { type: 'number' },
        netIncomeGrowthRate: { type: 'number' },
        assetGrowthRate: { type: 'number' },
        equityGrowthRate: { type: 'number' },
        earningsGrowthRate: { type: 'number' },
        dividendGrowthRate: { type: 'number' },
        sustainableGrowthRate: { type: 'number' }
    },

    // Summary scores
    financialStrengthScore: { type: 'number', min: 0, max: 100 },
    liquidityScore: { type: 'number', min: 0, max: 100 },
    profitabilityScore: { type: 'number', min: 0, max: 100 },
    leverageScore: { type: 'number', min: 0, max: 100 },

    // Metadata
    calculationMethod: { type: 'string', enum: ['automatic', 'manual', 'hybrid'], default: 'automatic' },
    calculatedBy: { type: 'string', required: true },
    calculatedAt: { type: 'date', default: () => new Date().toISOString() },
    reviewedBy: { type: 'string' },
    approvedBy: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'calculated', 'reviewed', 'approved', 'published'], default: 'calculated' },
    notes: { type: 'string', trim: true },
    warnings: { type: 'array', default: [] },
    isComparative: { type: 'boolean', default: false },
    basePeriod: { type: 'string' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('financial_reports', financialMetricsSchema);

/**
 * Calculate financial strength scores
 * @param {Object} doc - Financial metrics document
 * @returns {Object} Document with calculated scores
 */
function calculateScores(doc) {
    let liquidityScore = 0;
    let profitabilityScore = 0;
    let leverageScore = 0;

    // Liquidity score (0-100)
    if (doc.liquidityRatios) {
        const { currentRatio, quickRatio, operatingCashFlowRatio } = doc.liquidityRatios;

        // Current ratio scoring (ideal: 1.5-3.0)
        if (currentRatio >= 1.5 && currentRatio <= 3.0) liquidityScore += 35;
        else if (currentRatio >= 1.0) liquidityScore += 20;
        else if (currentRatio >= 0.8) liquidityScore += 10;

        // Quick ratio scoring (ideal: 1.0-2.0)
        if (quickRatio >= 1.0 && quickRatio <= 2.0) liquidityScore += 35;
        else if (quickRatio >= 0.7) liquidityScore += 20;
        else if (quickRatio >= 0.5) liquidityScore += 10;

        // Operating cash flow ratio scoring
        if (operatingCashFlowRatio >= 0.4) liquidityScore += 30;
        else if (operatingCashFlowRatio >= 0.2) liquidityScore += 20;
        else if (operatingCashFlowRatio >= 0.1) liquidityScore += 10;
    }

    // Profitability score (0-100)
    if (doc.profitabilityRatios) {
        const { netProfitMargin, returnOnAssets, returnOnEquity } = doc.profitabilityRatios;

        // Net profit margin scoring
        if (netProfitMargin >= 0.15) profitabilityScore += 35;
        else if (netProfitMargin >= 0.10) profitabilityScore += 25;
        else if (netProfitMargin >= 0.05) profitabilityScore += 15;
        else if (netProfitMargin >= 0.02) profitabilityScore += 5;

        // ROA scoring
        if (returnOnAssets >= 0.15) profitabilityScore += 30;
        else if (returnOnAssets >= 0.10) profitabilityScore += 20;
        else if (returnOnAssets >= 0.05) profitabilityScore += 10;
        else if (returnOnAssets >= 0.02) profitabilityScore += 5;

        // ROE scoring
        if (returnOnEquity >= 0.20) profitabilityScore += 35;
        else if (returnOnEquity >= 0.15) profitabilityScore += 25;
        else if (returnOnEquity >= 0.10) profitabilityScore += 15;
        else if (returnOnEquity >= 0.05) profitabilityScore += 5;
    }

    // Leverage score (0-100, higher debt = lower score)
    if (doc.leverageRatios) {
        const { debtToAssets, debtToEquity, timesInterestEarned } = doc.leverageRatios;

        // Debt to assets scoring (lower is better)
        if (debtToAssets <= 0.3) leverageScore += 40;
        else if (debtToAssets <= 0.5) leverageScore += 30;
        else if (debtToAssets <= 0.7) leverageScore += 15;
        else if (debtToAssets <= 0.9) leverageScore += 5;

        // Debt to equity scoring
        if (debtToEquity <= 0.5) leverageScore += 30;
        else if (debtToEquity <= 1.0) leverageScore += 20;
        else if (debtToEquity <= 2.0) leverageScore += 10;
        else if (debtToEquity <= 3.0) leverageScore += 5;

        // Interest coverage scoring
        if (timesInterestEarned >= 5.0) leverageScore += 30;
        else if (timesInterestEarned >= 3.0) leverageScore += 20;
        else if (timesInterestEarned >= 2.0) leverageScore += 10;
        else if (timesInterestEarned >= 1.5) leverageScore += 5;
    }

    // Update scores
    doc.liquidityScore = Math.min(liquidityScore, 100);
    doc.profitabilityScore = Math.min(profitabilityScore, 100);
    doc.leverageScore = Math.min(leverageScore, 100);

    // Overall financial strength score (weighted average)
    doc.financialStrengthScore = Math.round(
        (doc.liquidityScore * 0.3) +
        (doc.profitabilityScore * 0.4) +
        (doc.leverageScore * 0.3)
    );

    return doc;
}

/**
 * Get industry benchmarks (placeholder - would need industry data)
 * @param {string} industry - Industry identifier
 * @returns {Object} Industry benchmarks
 */
function getIndustryBenchmarks(industry) {
    // This would typically fetch from an industry benchmarks database
    // For now, return generic benchmarks
    return {
        currentRatio: { median: 2.0, q1: 1.5, q3: 2.5 },
        quickRatio: { median: 1.2, q1: 0.8, q3: 1.6 },
        debtToEquity: { median: 0.6, q1: 0.3, q3: 1.0 },
        netProfitMargin: { median: 0.08, q1: 0.05, q3: 0.12 },
        returnOnAssets: { median: 0.07, q1: 0.04, q3: 0.11 },
        returnOnEquity: { median: 0.12, q1: 0.08, q3: 0.18 }
    };
}

/**
 * Calculate percentile rank
 * @param {number} value - Value to rank
 * @param {Object} benchmark - Benchmark with q1, median, q3
 * @returns {number} Percentile rank
 */
function calculatePercentile(value, benchmark) {
    if (value >= benchmark.q3) return 75;
    if (value >= benchmark.median) return 50;
    if (value >= benchmark.q1) return 25;
    return 10;
}

/**
 * Compare metrics to benchmarks
 * @param {Object} doc - Financial metrics document
 * @param {Object} benchmarks - Industry benchmarks
 * @returns {Object} Comparison results
 */
function compareToBenchmarks(doc, benchmarks) {
    const comparison = {};

    if (doc.liquidityRatios && benchmarks.currentRatio) {
        comparison.currentRatio = {
            value: doc.liquidityRatios.currentRatio,
            percentile: calculatePercentile(doc.liquidityRatios.currentRatio, benchmarks.currentRatio),
            status: doc.liquidityRatios.currentRatio >= benchmarks.currentRatio.median ? 'above' : 'below'
        };
    }

    // Add similar comparisons for other metrics...

    return comparison;
}

/**
 * Identify potential red flags
 * @param {Object} doc - Financial metrics document
 * @returns {Array} Array of red flag messages
 */
function identifyRedFlags(doc) {
    const redFlags = [];

    if (doc.liquidityRatios?.currentRatio < 1.0) {
        redFlags.push('Current ratio below 1.0 indicates potential liquidity issues');
    }

    if (doc.leverageRatios?.debtToEquity > 2.0) {
        redFlags.push('High debt-to-equity ratio indicates high financial leverage');
    }

    if (doc.profitabilityRatios?.netProfitMargin < 0) {
        redFlags.push('Negative profit margin indicates losses');
    }

    if (doc.cashFlowMetrics?.freeCashFlow < 0) {
        redFlags.push('Negative free cash flow indicates cash generation issues');
    }

    if (doc.leverageRatios?.timesInterestEarned < 2.0) {
        redFlags.push('Low interest coverage ratio indicates difficulty servicing debt');
    }

    return redFlags;
}

// Extended model with custom methods
const FinancialMetrics = {
    ...baseModel,

    /**
     * Create new financial metrics with score calculation
     * @param {Object} data - Financial metrics data
     * @returns {Object} Created financial metrics
     */
    async create(data) {
        // Set document type for identification in shared table
        data.documentType = 'financial_metrics';

        // Calculate scores before saving
        calculateScores(data);

        // Set calculation timestamp if not provided
        if (!data.calculatedAt) {
            data.calculatedAt = new Date().toISOString();
        }

        return baseModel.create(data);
    },

    /**
     * Update financial metrics with score recalculation
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Updated financial metrics
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;

        // If updating ratio data, recalculate scores
        if (updateData.liquidityRatios || updateData.profitabilityRatios ||
            updateData.leverageRatios) {

            // Fetch current document to merge with updates
            const existing = await baseModel.findOne(query);
            if (existing) {
                const merged = { ...existing, ...updateData };
                calculateScores(merged);

                // Copy calculated fields to update
                updateData.liquidityScore = merged.liquidityScore;
                updateData.profitabilityScore = merged.profitabilityScore;
                updateData.leverageScore = merged.leverageScore;
                updateData.financialStrengthScore = merged.financialStrengthScore;
            }
        }

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Get financial metrics with red flags and benchmarks
     * @param {string} id - Financial metrics ID
     * @param {string} industry - Industry for benchmarks (optional)
     * @returns {Object} Financial metrics with analysis
     */
    async findByIdWithAnalysis(id, industry = null) {
        const doc = await baseModel.findById(id);
        if (!doc) return null;

        const benchmarks = getIndustryBenchmarks(industry);

        return {
            ...doc,
            redFlags: identifyRedFlags(doc),
            benchmarkComparison: compareToBenchmarks(doc, benchmarks),
            benchmarks
        };
    },

    /**
     * Get metrics history for a company
     * @param {string} companyId - Company ID
     * @param {number} periods - Number of periods to retrieve
     * @returns {Array} Financial metrics history
     */
    async getHistory(companyId, periods = 8) {
        return baseModel.find(
            { companyId, documentType: 'financial_metrics' },
            { sort: { reportingDate: -1 }, limit: periods }
        );
    },

    /**
     * Calculate trend analysis for a specific metric
     * @param {string} companyId - Company ID
     * @param {string} metric - Metric path (e.g., 'liquidityRatios.currentRatio')
     * @param {number} periods - Number of periods to analyze
     * @returns {Object} Trend analysis results
     */
    async getTrendAnalysis(companyId, metric, periods = 4) {
        const metrics = await baseModel.find(
            { companyId, documentType: 'financial_metrics' },
            { sort: { reportingDate: -1 }, limit: periods }
        );

        if (metrics.length < 2) return null;

        const values = metrics.reverse().map(m => {
            const keys = metric.split('.');
            let value = m;
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) return null;
            }
            return value;
        }).filter(v => v !== null);

        if (values.length < 2) return null;

        // Calculate trend
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const growthRate = (lastValue - firstValue) / firstValue;

        return {
            values,
            growthRate,
            trend: growthRate > 0.05 ? 'increasing' : growthRate < -0.05 ? 'decreasing' : 'stable'
        };
    },

    /**
     * Find financial metrics by company
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Financial metrics
     */
    async find(query = {}, options = {}) {
        query.documentType = 'financial_metrics';
        return baseModel.find(query, options);
    },

    /**
     * Find one financial metrics document
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object} Financial metrics
     */
    async findOne(query = {}, options = {}) {
        query.documentType = 'financial_metrics';
        return baseModel.findOne(query, options);
    },

    // Expose utility functions
    calculateScores,
    getIndustryBenchmarks,
    compareToBenchmarks,
    calculatePercentile,
    identifyRedFlags
};

module.exports = FinancialMetrics;
