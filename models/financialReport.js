/**
 * Financial Report Model
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * [Feature] OCAE-206: Enhanced validation for financial reports
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
  if (!obj || typeof obj !== 'object') return true;
  return Object.values(obj).every(val => 
    typeof val === 'number' ? val >= 0 : true
  );
};

/**
 * Validates that provided totals match calculated totals
 * @param {Object} doc - The document being validated
 * @returns {boolean} - Whether totals match
 */
const validateTotalsMatch = (doc) => {
  if (!doc.revenue || !doc.expenses) return true;
  
  // If no totals are provided, they will be calculated during save
  if (doc.totalRevenue === undefined && 
      doc.totalExpenses === undefined && 
      doc.netIncome === undefined) {
    return true;
  }
    
  // Calculate expected totals
  const expectedRevenue = Object.values(doc.revenue)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0);
    
  const expectedExpenses = Object.values(doc.expenses)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0);
    
  const expectedNetIncome = expectedRevenue - expectedExpenses;
  
  // Check if provided totals match calculated totals (allow small floating point differences)
  const isRevenueMatch = !doc.totalRevenue || Math.abs(doc.totalRevenue - expectedRevenue) < 0.01;
  const isExpensesMatch = !doc.totalExpenses || Math.abs(doc.totalExpenses - expectedExpenses) < 0.01;
  const isNetIncomeMatch = !doc.netIncome || Math.abs(doc.netIncome - expectedNetIncome) < 0.01;
  
  return isRevenueMatch && isExpensesMatch && isNetIncomeMatch;
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
    },
    _id: false
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
    },
    _id: false
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

// Indexes for improved query performance
FinancialReportSchema.index({ companyId: 1, reportingPeriod: 1 }, { unique: true });
FinancialReportSchema.index({ reportDate: -1 });
FinancialReportSchema.index({ userId: 1, reportDate: -1 });

/**
 * Calculate totals for revenue, expenses, and net income
 * This method should be called before saving to ensure totals are accurate
 */
FinancialReportSchema.methods.calculateTotals = function() {
  // Ensure revenue and expenses are properly initialized
  this.revenue = this.revenue || {};
  this.expenses = this.expenses || {};
  
  // Calculate total revenue by summing all values, handling null/undefined
  this.totalRevenue = Object.values(this.revenue).reduce((sum, val) => {
    // Handle undefined, null, NaN or other invalid values
    const numVal = (val === undefined || val === null || isNaN(val)) ? 0 : val;
    return sum + numVal;
  }, 0);
  
  // Calculate total expenses by summing all values, handling null/undefined
  this.totalExpenses = Object.values(this.expenses).reduce((sum, val) => {
    // Handle undefined, null, NaN or other invalid values
    const numVal = (val === undefined || val === null || isNaN(val)) ? 0 : val;
    return sum + numVal;
  }, 0);
  
  // Calculate net income
  this.netIncome = this.totalRevenue - this.totalExpenses;
  
  return this;
};

/**
 * Validate positive values and totals matching
 */
FinancialReportSchema.pre('validate', function(next) {
  // Validate positive values in revenue
  if (this.revenue && !validatePositiveValues(this.revenue)) {
    return next(new Error('All revenue values must be positive numbers'));
  }
  
  // Validate positive values in expenses
  if (this.expenses && !validatePositiveValues(this.expenses)) {
    return next(new Error('All expense values must be positive numbers'));
  }
  
  // Validate that provided totals match calculated totals
  if (!validateTotalsMatch(this)) {
    return next(new Error('Provided totals do not match calculated totals'));
  }
  
  next();
});

/**
 * Pre-save hook to ensure totals are calculated
 */
FinancialReportSchema.pre('save', function(next) {
  // Always calculate totals before saving if they're not set
  if (!this.totalRevenue || !this.totalExpenses || !this.netIncome) {
    this.calculateTotals();
  }
  
  next();
});

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);