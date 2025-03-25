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
  // Sum up all revenue values, handling the case where revenue might be missing
  this.totalRevenue = this.revenue ? Object.values(this.revenue)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0) : 0;
    
  // Sum up all expense values, handling the case where expenses might be missing
  this.totalExpenses = this.expenses ? Object.values(this.expenses)
    .filter(val => typeof val === 'number')
    .reduce((sum, val) => sum + val, 0) : 0;
    
  // Calculate net income
  this.netIncome = this.totalRevenue - this.totalExpenses;
  
  return this;
};

/**
 * Validate positive values in revenue and expenses
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
  
  next();
});

/**
 * Validate that calculated totals match provided totals
 */
FinancialReportSchema.pre('save', function(next) {
  // Always calculate totals before saving
  this.calculateTotals();
  
  // If revenue and expenses exist, validate that provided totals match calculated ones
  if (this.revenue && this.expenses && 
      (this.totalRevenue !== undefined || this.totalExpenses !== undefined || this.netIncome !== undefined)) {
    
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
  }
  
  next();
});

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);