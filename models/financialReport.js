/**
 * Financial Report Model
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * Schema for financial reports with revenue/expense tracking and calculations
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

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
      default: 0
    },
    services: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },
  expenses: {
    salaries: {
      type: Number,
      default: 0
    },
    marketing: {
      type: Number,
      default: 0
    },
    operations: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
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
    type: Schema.Types.Mixed, 
    index: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastModifiedBy: { type: Schema.Types.Mixed } 
}, {
  timestamps: true
});

// Indexes
FinancialReportSchema.index({ reportingPeriod: 1, companyId: 1 }, { unique: true });
FinancialReportSchema.index({ reportDate: -1 });

/**
 * Calculate totals from revenue and expense items
 */
FinancialReportSchema.methods.calculateTotals = function() {
  // Calculate total revenue
  this.totalRevenue = Object.values(this.revenue || {}).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate total expenses
  this.totalExpenses = Object.values(this.expenses || {}).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate net income
  this.netIncome = this.totalRevenue - this.totalExpenses;
};

/**
 * Pre-save middleware to ensure totals are calculated
 */
FinancialReportSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);