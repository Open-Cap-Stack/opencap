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
      of: Number,  // Simplified - just Number instead of object
      validate: {
        validator: function(v) {
          if (!v) return false;
          if (this.Type === 'Annual') {
            return ['q1', 'q2', 'q3', 'q4'].every(q => v.has(q));
          }
          return v.size === 1;  // Use size instead of Object.keys().length
        },
        message: props => `Invalid quarters for ${props.value} report type`
      },
      required: true,
      _id: false  // Disable _id for subdocuments
    },
    expenses: {
      type: Map,
      of: Number,  // Simplified - just Number instead of object
      validate: {
        validator: function(v) {
          if (!v) return false;
          if (this.Type === 'Annual') {
            return ['q1', 'q2', 'q3', 'q4'].every(q => v.has(q));
          }
          return v.size === 1;  // Use size instead of Object.keys().length
        },
        message: props => `Invalid quarters for ${props.value} report type`
      },
      required: true,
      _id: false  // Disable _id for subdocuments
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
  strict: false  // Allow flexible Map contents
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

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);