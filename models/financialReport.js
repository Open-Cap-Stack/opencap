/**
 * Financial Report Model
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * Schema for financial reports with revenue/expense tracking and calculations
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Validates that all values in a map or object are positive numbers
 * @param {Object} obj - Object containing financial data
 * @returns {boolean} - Whether all values are positive numbers
 */
const validatePositiveValues = (obj) => {
  return Object.values(obj).every(val => 
    typeof val === 'number' ? val >= 0 : true
  );
};

/**
 * Financial Report Schema for quarterly and annual financial data
 * Includes enhanced validation for proper values and calculation of totals
 */
const FinancialReportSchema = new Schema({
  companyId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  reportingPeriod: {
    type: String,
    required: true,
    trim: true
  },
  reportDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  reportType: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly'],
    required: true
  },
  revenue: {
    sales: {
      type: Number,
      default: 0,
      min: 0
    },
    services: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  expenses: {
    salaries: {
      type: Number,
      default: 0,
      min: 0
    },
    marketing: {
      type: Number,
      default: 0,
      min: 0
    },
    operations: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  totalRevenue: {
    type: Number,
    min: 0
  },
  totalExpenses: {
    type: Number,
    min: 0
  },
  netIncome: {
    type: Number
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [String],
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Validation for positive values
FinancialReportSchema.path('revenue').validate(function(value) {
  return validatePositiveValues(value);
}, 'All revenue values must be positive numbers');

FinancialReportSchema.path('expenses').validate(function(value) {
  return validatePositiveValues(value);
}, 'All expense values must be positive numbers');

// Indexes for improved query performance
FinancialReportSchema.index({ companyId: 1, reportingPeriod: 1 }, { unique: true });
FinancialReportSchema.index({ reportDate: -1 });
FinancialReportSchema.index({ userId: 1, reportDate: -1 });

/**
 * Calculate totals for revenue, expenses, and net income
 * This method should be called before saving to ensure totals are accurate
 */
FinancialReportSchema.methods.calculateTotals = function() {
  // Sum up all revenue values
  this.totalRevenue = Object.values(this.revenue)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0);
    
  // Sum up all expense values
  this.totalExpenses = Object.values(this.expenses)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0);
    
  // Calculate net income
  this.netIncome = this.totalRevenue - this.totalExpenses;
  
  return this;
};

/**
 * Pre-validate hook to ensure calculated totals match provided totals
 * This prevents inconsistencies between detailed data and summary totals
 */
FinancialReportSchema.pre('validate', function(next) {
  // Skip validation if we're missing data
  if (!this.revenue || !this.expenses) {
    return next();
  }
  
  // Calculate expected totals
  const expectedRevenue = Object.values(this.revenue)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0);
    
  const expectedExpenses = Object.values(this.expenses)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0);
    
  const expectedNetIncome = expectedRevenue - expectedExpenses;
  
  // Check if provided totals match calculated totals (allow small floating point differences)
  const isRevenueMatch = !this.totalRevenue || Math.abs(this.totalRevenue - expectedRevenue) < 0.01;
  const isExpensesMatch = !this.totalExpenses || Math.abs(this.totalExpenses - expectedExpenses) < 0.01;
  const isNetIncomeMatch = !this.netIncome || Math.abs(this.netIncome - expectedNetIncome) < 0.01;
  
  if (!isRevenueMatch || !isExpensesMatch || !isNetIncomeMatch) {
    return next(new Error('Provided totals do not match calculated totals'));
  }
  
  next();
});

/**
 * Pre-save middleware to ensure totals are calculated
 */
FinancialReportSchema.pre('save', function(next) {
  // Calculate totals if they're not set
  if (!this.totalRevenue || !this.totalExpenses || !this.netIncome) {
    this.calculateTotals();
  }
  next();
});

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);