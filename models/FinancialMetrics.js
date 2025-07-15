/**
 * Financial Metrics Model
 * 
 * [Feature] OCDI-202: Create financial reporting database models
 * 
 * Comprehensive model for storing calculated financial metrics, ratios, and KPIs
 * derived from financial statements for analytical and reporting purposes.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Liquidity Ratios Schema
 */
const liquidityRatiosSchema = new Schema({
  currentRatio: {
    type: Number,
    description: 'Current Assets / Current Liabilities'
  },
  quickRatio: {
    type: Number,
    description: 'Quick Assets / Current Liabilities'
  },
  cashRatio: {
    type: Number,
    description: 'Cash and Cash Equivalents / Current Liabilities'
  },
  workingCapital: {
    type: Number,
    description: 'Current Assets - Current Liabilities'
  },
  operatingCashFlowRatio: {
    type: Number,
    description: 'Operating Cash Flow / Current Liabilities'
  }
}, { _id: false });

/**
 * Activity/Efficiency Ratios Schema
 */
const activityRatiosSchema = new Schema({
  assetTurnover: {
    type: Number,
    description: 'Revenue / Average Total Assets'
  },
  inventoryTurnover: {
    type: Number,
    description: 'Cost of Goods Sold / Average Inventory'
  },
  receivablesTurnover: {
    type: Number,
    description: 'Revenue / Average Accounts Receivable'
  },
  payablesTurnover: {
    type: Number,
    description: 'Cost of Goods Sold / Average Accounts Payable'
  },
  daysInInventory: {
    type: Number,
    description: '365 / Inventory Turnover'
  },
  daysInReceivables: {
    type: Number,
    description: '365 / Receivables Turnover'
  },
  daysInPayables: {
    type: Number,
    description: '365 / Payables Turnover'
  },
  cashConversionCycle: {
    type: Number,
    description: 'Days in Inventory + Days in Receivables - Days in Payables'
  }
}, { _id: false });

/**
 * Leverage/Debt Ratios Schema
 */
const leverageRatiosSchema = new Schema({
  debtToAssets: {
    type: Number,
    description: 'Total Debt / Total Assets'
  },
  debtToEquity: {
    type: Number,
    description: 'Total Debt / Total Equity'
  },
  equityMultiplier: {
    type: Number,
    description: 'Total Assets / Total Equity'
  },
  timesInterestEarned: {
    type: Number,
    description: 'EBIT / Interest Expense'
  },
  cashCoverageRatio: {
    type: Number,
    description: '(EBIT + Depreciation) / Interest Expense'
  },
  debtServiceCoverageRatio: {
    type: Number,
    description: 'Operating Cash Flow / Total Debt Service'
  },
  longTermDebtToEquity: {
    type: Number,
    description: 'Long-term Debt / Total Equity'
  }
}, { _id: false });

/**
 * Profitability Ratios Schema
 */
const profitabilityRatiosSchema = new Schema({
  grossProfitMargin: {
    type: Number,
    description: 'Gross Profit / Revenue'
  },
  operatingProfitMargin: {
    type: Number,
    description: 'Operating Income / Revenue'
  },
  netProfitMargin: {
    type: Number,
    description: 'Net Income / Revenue'
  },
  returnOnAssets: {
    type: Number,
    description: 'Net Income / Average Total Assets'
  },
  returnOnEquity: {
    type: Number,
    description: 'Net Income / Average Total Equity'
  },
  returnOnInvestedCapital: {
    type: Number,
    description: 'NOPAT / Invested Capital'
  },
  earningsBeforeInterestTaxes: {
    type: Number,
    description: 'EBIT'
  },
  earningsBeforeInterestTaxesDepreciationAmortization: {
    type: Number,
    description: 'EBITDA'
  }
}, { _id: false });

/**
 * Market/Valuation Ratios Schema
 */
const marketRatiosSchema = new Schema({
  priceToEarnings: {
    type: Number,
    description: 'Market Price per Share / Earnings per Share'
  },
  priceToBook: {
    type: Number,
    description: 'Market Price per Share / Book Value per Share'
  },
  priceToSales: {
    type: Number,
    description: 'Market Capitalization / Revenue'
  },
  earningsPerShare: {
    type: Number,
    description: 'Net Income / Weighted Average Shares Outstanding'
  },
  bookValuePerShare: {
    type: Number,
    description: 'Total Equity / Shares Outstanding'
  },
  dividendYield: {
    type: Number,
    description: 'Annual Dividends per Share / Market Price per Share'
  },
  dividendPayoutRatio: {
    type: Number,
    description: 'Dividends per Share / Earnings per Share'
  }
}, { _id: false });

/**
 * Cash Flow Metrics Schema
 */
const cashFlowMetricsSchema = new Schema({
  operatingCashFlow: {
    type: Number,
    description: 'Net cash from operating activities'
  },
  freeCashFlow: {
    type: Number,
    description: 'Operating Cash Flow - Capital Expenditures'
  },
  freeCashFlowYield: {
    type: Number,
    description: 'Free Cash Flow / Market Capitalization'
  },
  cashFlowToDebt: {
    type: Number,
    description: 'Operating Cash Flow / Total Debt'
  },
  cashFlowPerShare: {
    type: Number,
    description: 'Operating Cash Flow / Shares Outstanding'
  },
  capexToSales: {
    type: Number,
    description: 'Capital Expenditures / Revenue'
  },
  cashConversionRatio: {
    type: Number,
    description: 'Operating Cash Flow / Net Income'
  }
}, { _id: false });

/**
 * Growth Metrics Schema
 */
const growthMetricsSchema = new Schema({
  revenueGrowthRate: {
    type: Number,
    description: 'YoY Revenue Growth Rate'
  },
  netIncomeGrowthRate: {
    type: Number,
    description: 'YoY Net Income Growth Rate'
  },
  assetGrowthRate: {
    type: Number,
    description: 'YoY Total Assets Growth Rate'
  },
  equityGrowthRate: {
    type: Number,
    description: 'YoY Total Equity Growth Rate'
  },
  earningsGrowthRate: {
    type: Number,
    description: 'YoY Earnings per Share Growth Rate'
  },
  dividendGrowthRate: {
    type: Number,
    description: 'YoY Dividend per Share Growth Rate'
  },
  sustainableGrowthRate: {
    type: Number,
    description: 'ROE × (1 - Dividend Payout Ratio)'
  }
}, { _id: false });

/**
 * Main Financial Metrics Schema
 */
const financialMetricsSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  reportingPeriod: {
    type: String,
    required: true,
    trim: true,
    description: 'e.g., 2024-Q1, 2024'
  },
  
  reportingDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Source data references
  sourceBalanceSheetId: {
    type: Schema.Types.ObjectId,
    ref: 'BalanceSheet'
  },
  
  sourceIncomeStatementId: {
    type: Schema.Types.ObjectId,
    ref: 'FinancialReport'
  },
  
  sourceCashFlowId: {
    type: Schema.Types.ObjectId,
    ref: 'CashFlowStatement'
  },
  
  // Metric categories
  liquidityRatios: {
    type: liquidityRatiosSchema,
    default: {}
  },
  
  activityRatios: {
    type: activityRatiosSchema,
    default: {}
  },
  
  leverageRatios: {
    type: leverageRatiosSchema,
    default: {}
  },
  
  profitabilityRatios: {
    type: profitabilityRatiosSchema,
    default: {}
  },
  
  marketRatios: {
    type: marketRatiosSchema,
    default: {}
  },
  
  cashFlowMetrics: {
    type: cashFlowMetricsSchema,
    default: {}
  },
  
  growthMetrics: {
    type: growthMetricsSchema,
    default: {}
  },
  
  // Summary scores
  financialStrengthScore: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Overall financial strength score (0-100)'
  },
  
  liquidityScore: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Liquidity strength score (0-100)'
  },
  
  profitabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Profitability strength score (0-100)'
  },
  
  leverageScore: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Leverage/stability score (0-100)'
  },
  
  // Metadata
  calculationMethod: {
    type: String,
    enum: ['automatic', 'manual', 'hybrid'],
    default: 'automatic',
    description: 'How the metrics were calculated'
  },
  
  calculatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  status: {
    type: String,
    enum: ['draft', 'calculated', 'reviewed', 'approved', 'published'],
    default: 'calculated'
  },
  
  notes: {
    type: String,
    trim: true,
    description: 'Additional notes about the calculations'
  },
  
  warnings: [{
    type: String,
    description: 'Calculation warnings or data quality issues'
  }],
  
  isComparative: {
    type: Boolean,
    default: false,
    description: 'Whether this includes comparative period data'
  },
  
  basePeriod: {
    type: String,
    description: 'Base period for growth calculations'
  }
  
}, {
  timestamps: true,
  collection: 'financialmetrics'
});

// Indexes
financialMetricsSchema.index({ companyId: 1, reportingDate: -1 });
financialMetricsSchema.index({ reportingPeriod: 1 });
financialMetricsSchema.index({ status: 1 });
financialMetricsSchema.index({ companyId: 1, reportingPeriod: 1 }, { unique: true });

/**
 * Calculate financial strength scores
 */
financialMetricsSchema.methods.calculateScores = function() {
  let liquidityScore = 0;
  let profitabilityScore = 0;
  let leverageScore = 0;
  
  // Liquidity score (0-100)
  if (this.liquidityRatios) {
    const { currentRatio, quickRatio, operatingCashFlowRatio } = this.liquidityRatios;
    
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
  if (this.profitabilityRatios) {
    const { netProfitMargin, returnOnAssets, returnOnEquity } = this.profitabilityRatios;
    
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
  if (this.leverageRatios) {
    const { debtToAssets, debtToEquity, timesInterestEarned } = this.leverageRatios;
    
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
  this.liquidityScore = Math.min(liquidityScore, 100);
  this.profitabilityScore = Math.min(profitabilityScore, 100);
  this.leverageScore = Math.min(leverageScore, 100);
  
  // Overall financial strength score (weighted average)
  this.financialStrengthScore = Math.round(
    (this.liquidityScore * 0.3) +
    (this.profitabilityScore * 0.4) +
    (this.leverageScore * 0.3)
  );
  
  return this;
};

/**
 * Get industry benchmarks (placeholder - would need industry data)
 */
financialMetricsSchema.methods.getIndustryBenchmarks = function(industry) {
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
};

/**
 * Compare metrics to benchmarks
 */
financialMetricsSchema.methods.compareToBenchmarks = function(benchmarks) {
  const comparison = {};
  
  if (this.liquidityRatios && benchmarks.currentRatio) {
    comparison.currentRatio = {
      value: this.liquidityRatios.currentRatio,
      percentile: this.calculatePercentile(this.liquidityRatios.currentRatio, benchmarks.currentRatio),
      status: this.liquidityRatios.currentRatio >= benchmarks.currentRatio.median ? 'above' : 'below'
    };
  }
  
  // Add similar comparisons for other metrics...
  
  return comparison;
};

/**
 * Calculate percentile rank
 */
financialMetricsSchema.methods.calculatePercentile = function(value, benchmark) {
  if (value >= benchmark.q3) return 75;
  if (value >= benchmark.median) return 50;
  if (value >= benchmark.q1) return 25;
  return 10;
};

/**
 * Identify potential red flags
 */
financialMetricsSchema.methods.identifyRedFlags = function() {
  const redFlags = [];
  
  if (this.liquidityRatios?.currentRatio < 1.0) {
    redFlags.push('Current ratio below 1.0 indicates potential liquidity issues');
  }
  
  if (this.leverageRatios?.debtToEquity > 2.0) {
    redFlags.push('High debt-to-equity ratio indicates high financial leverage');
  }
  
  if (this.profitabilityRatios?.netProfitMargin < 0) {
    redFlags.push('Negative profit margin indicates losses');
  }
  
  if (this.cashFlowMetrics?.freeCashFlow < 0) {
    redFlags.push('Negative free cash flow indicates cash generation issues');
  }
  
  if (this.leverageRatios?.timesInterestEarned < 2.0) {
    redFlags.push('Low interest coverage ratio indicates difficulty servicing debt');
  }
  
  return redFlags;
};

/**
 * Pre-save hook to calculate scores
 */
financialMetricsSchema.pre('save', function(next) {
  this.calculateScores();
  next();
});

/**
 * Static method to get metrics history
 */
financialMetricsSchema.statics.getHistory = async function(companyId, periods = 8) {
  return this.find({ companyId })
    .sort({ reportingDate: -1 })
    .limit(periods);
};

/**
 * Static method to calculate trend analysis
 */
financialMetricsSchema.statics.getTrendAnalysis = async function(companyId, metric, periods = 4) {
  const metrics = await this.find({ companyId })
    .sort({ reportingDate: -1 })
    .limit(periods)
    .select(`reportingDate reportingPeriod ${metric}`);
  
  if (metrics.length < 2) return null;
  
  const values = metrics.reverse().map(m => {
    const keys = metric.split('.');
    let value = m;
    for (const key of keys) {
      value = value[key];
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
};

module.exports = mongoose.model('FinancialMetrics', financialMetricsSchema);