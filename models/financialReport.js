const mongoose = require('mongoose');
const { Schema } = mongoose;

const FinancialReportSchema = new Schema({
  ReportID: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  Type: { 
    type: String, 
    enum: ['Annual', 'Quarterly'], 
    required: true 
  },
  Data: {
    revenue: {
      type: Map,
      of: Number,
      validate: [
        {
          validator: function(v) {
            if (!v) return false;
            if (this.Type === 'Annual') {
              return ['q1', 'q2', 'q3', 'q4'].every(q => v.has(q));
            }
            return v.size === 1;
          },
          message: props => `Invalid quarters for ${props.value} report type`
        },
        {
          // Validate quarter names
          validator: function(v) {
            const validQuarters = ['q1', 'q2', 'q3', 'q4'];
            return Array.from(v.keys()).every(k => validQuarters.includes(k));
          },
          message: props => `Invalid quarter names. Must be one of: q1, q2, q3, q4`
        },
        {
          // Validate positive values
          validator: function(v) {
            return Array.from(v.values()).every(val => val >= 0);
          },
          message: props => `All revenue values must be positive numbers`
        }
      ],
      required: true,
      _id: false
    },
    expenses: {
      type: Map,
      of: Number,
      validate: [
        {
          validator: function(v) {
            if (!v) return false;
            if (this.Type === 'Annual') {
              return ['q1', 'q2', 'q3', 'q4'].every(q => v.has(q));
            }
            return v.size === 1;
          },
          message: props => `Invalid quarters for ${props.value} report type`
        },
        {
          // Validate quarter names
          validator: function(v) {
            const validQuarters = ['q1', 'q2', 'q3', 'q4'];
            return Array.from(v.keys()).every(k => validQuarters.includes(k));
          },
          message: props => `Invalid quarter names. Must be one of: q1, q2, q3, q4`
        },
        {
          // Validate positive values
          validator: function(v) {
            return Array.from(v.values()).every(val => val >= 0);
          },
          message: props => `All expense values must be positive numbers`
        }
      ],
      required: true,
      _id: false
    }
  },
  TotalRevenue: { 
    type: Number,
    required: true,
    min: 0,
    get: v => v.toFixed(2),
    set: v => parseFloat(v)
  },
  TotalExpenses: { 
    type: Number,
    required: true,
    min: 0,
    get: v => v.toFixed(2),
    set: v => parseFloat(v)
  },
  NetIncome: { 
    type: Number,
    required: true,
    get: v => v.toFixed(2),
    set: v => parseFloat(v)
  },
  EquitySummary: [String],
  Timestamp: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  strict: false
});

// Indexes
FinancialReportSchema.index({ ReportID: 1 }, { unique: true });
FinancialReportSchema.index({ Timestamp: -1 });

// Methods
FinancialReportSchema.methods.calculateTotals = function() {
  const revenue = Array.from(this.Data.revenue.values()).reduce((a, b) => a + b, 0);
  const expenses = Array.from(this.Data.expenses.values()).reduce((a, b) => a + b, 0);
  this.TotalRevenue = revenue;
  this.TotalExpenses = expenses;
  this.NetIncome = revenue - expenses;
};

// Pre-validate hook to ensure calculated totals match provided totals
FinancialReportSchema.pre('validate', function(next) {
  // Calculate expected totals
  const expectedRevenue = Array.from(this.Data.revenue.values()).reduce((a, b) => a + b, 0);
  const expectedExpenses = Array.from(this.Data.expenses.values()).reduce((a, b) => a + b, 0);
  const expectedNetIncome = expectedRevenue - expectedExpenses;
  
  // Check if provided totals match calculated totals (allow small floating point differences)
  const isRevenueMatch = Math.abs(this.TotalRevenue - expectedRevenue) < 0.01;
  const isExpensesMatch = Math.abs(this.TotalExpenses - expectedExpenses) < 0.01;
  const isNetIncomeMatch = Math.abs(this.NetIncome - expectedNetIncome) < 0.01;
  
  if (!isRevenueMatch || !isExpensesMatch || !isNetIncomeMatch) {
    return next(new Error('Provided totals do not match calculated totals'));
  }
  
  next();
});

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);