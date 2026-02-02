/**
 * ASC 718 Expense Model
 * Feature: Issue #73 - ASC 718 Reporting
 * ASC 718: Stock-based compensation expense recognition
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const periodExpenseSchema = new mongoose.Schema({
  period: { type: String, required: true }, // e.g., "2024-Q1", "2024-01"
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  expense: { type: Number, required: true },
  cumulativeExpense: { type: Number },
  remainingExpense: { type: Number },
  recognitionPercentage: { type: Number }
}, { _id: false });

const ASC718ExpenseSchema = new mongoose.Schema({
  // Unique identifier
  expenseId: {
    type: String,
    unique: true,
    default: () => `asc718_${uuidv4()}`,
    index: true
  },

  // Company reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Grant reference
  grantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityGrant',
    required: true,
    index: true
  },
  grantType: {
    type: String,
    enum: ['iso', 'nso', 'rsu', 'rsa', 'sar', 'phantom'],
    required: true
  },

  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stakeholder',
    required: true
  },
  employeeName: { type: String },

  // Grant details (snapshot)
  grantDetails: {
    grantDate: { type: Date, required: true },
    vestingStartDate: { type: Date, required: true },
    vestingEndDate: { type: Date, required: true },
    vestingPeriodMonths: { type: Number, required: true },
    cliffMonths: { type: Number, default: 0 },
    totalShares: { type: Number, required: true },
    exercisePrice: { type: Number },
    vestingSchedule: { type: String } // e.g., "4-year monthly with 1-year cliff"
  },

  // Fair value inputs (for options)
  fairValueInputs: {
    stockPrice: { type: Number, required: true },
    exercisePrice: { type: Number },
    expectedTerm: { type: Number }, // in years
    volatility: { type: Number }, // as decimal
    riskFreeRate: { type: Number }, // as decimal
    dividendYield: { type: Number, default: 0 },
    valuationMethod: {
      type: String,
      enum: ['black_scholes', 'binomial', 'monte_carlo', 'intrinsic'],
      default: 'black_scholes'
    }
  },

  // Calculated fair value
  fairValue: {
    perShare: { type: Number, required: true },
    total: { type: Number, required: true },
    calculatedAt: { type: Date, default: Date.now }
  },

  // Expense recognition
  recognition: {
    method: {
      type: String,
      enum: ['straight_line', 'graded', 'accelerated'],
      default: 'straight_line'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalExpense: { type: Number, required: true },
    recognizedToDate: { type: Number, default: 0 },
    remainingExpense: { type: Number }
  },

  // Period-by-period expense schedule
  expenseSchedule: [periodExpenseSchema],

  // Modification tracking
  modifications: [{
    modificationDate: { type: Date },
    originalFairValue: { type: Number },
    newFairValue: { type: Number },
    incrementalExpense: { type: Number },
    reason: { type: String }
  }],

  // Forfeiture tracking
  forfeitures: {
    estimatedRate: { type: Number, default: 0 },
    actualForfeitures: { type: Number, default: 0 },
    forfeitureAdjustment: { type: Number, default: 0 }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'fully_recognized', 'forfeited', 'modified', 'cancelled'],
    default: 'active',
    index: true
  },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastCalculatedAt: { type: Date },

  notes: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ASC718ExpenseSchema.index({ companyId: 1, status: 1 });
ASC718ExpenseSchema.index({ grantId: 1 }, { unique: true });
ASC718ExpenseSchema.index({ 'grantDetails.grantDate': 1 });

// Pre-save: calculate remaining expense
ASC718ExpenseSchema.pre('save', function(next) {
  this.recognition.remainingExpense = this.recognition.totalExpense - this.recognition.recognizedToDate;

  if (this.recognition.recognizedToDate >= this.recognition.totalExpense) {
    this.status = 'fully_recognized';
  }

  next();
});

// Virtuals
ASC718ExpenseSchema.virtual('percentRecognized').get(function() {
  if (this.recognition.totalExpense === 0) return 100;
  return Math.round((this.recognition.recognizedToDate / this.recognition.totalExpense) * 100);
});

ASC718ExpenseSchema.virtual('monthsRemaining').get(function() {
  const now = new Date();
  const endDate = new Date(this.recognition.endDate);
  if (now >= endDate) return 0;

  const diffTime = endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
});

// Instance methods
ASC718ExpenseSchema.methods.calculatePeriodExpense = function(periodStart, periodEnd) {
  if (this.status === 'forfeited' || this.status === 'cancelled') {
    return 0;
  }

  const vestStart = new Date(this.recognition.startDate);
  const vestEnd = new Date(this.recognition.endDate);
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  // If period is outside vesting window
  if (pEnd < vestStart || pStart > vestEnd) {
    return 0;
  }

  // Calculate overlap
  const effectiveStart = pStart > vestStart ? pStart : vestStart;
  const effectiveEnd = pEnd < vestEnd ? pEnd : vestEnd;

  // Total vesting duration in days
  const totalDays = (vestEnd - vestStart) / (1000 * 60 * 60 * 24);
  const periodDays = (effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24);

  if (this.recognition.method === 'straight_line') {
    return (this.recognition.totalExpense / totalDays) * periodDays;
  }

  // For graded vesting, would need more complex calculation
  return (this.recognition.totalExpense / totalDays) * periodDays;
};

ASC718ExpenseSchema.methods.recordForfeiture = async function(forfeitedShares, userId) {
  const forfeitedPercentage = forfeitedShares / this.grantDetails.totalShares;
  const forfeitedExpense = this.recognition.totalExpense * forfeitedPercentage;

  this.forfeitures.actualForfeitures += forfeitedShares;
  this.forfeitures.forfeitureAdjustment += forfeitedExpense;

  // Reduce remaining expense
  this.recognition.totalExpense -= forfeitedExpense;
  this.updatedBy = userId;

  if (forfeitedShares >= this.grantDetails.totalShares) {
    this.status = 'forfeited';
  }

  return this.save();
};

ASC718ExpenseSchema.methods.recordModification = async function(newFairValuePerShare, reason, userId) {
  const currentFairValue = this.fairValue.total;
  const newFairValue = newFairValuePerShare * this.grantDetails.totalShares;
  const incrementalExpense = Math.max(0, newFairValue - currentFairValue);

  this.modifications.push({
    modificationDate: new Date(),
    originalFairValue: currentFairValue,
    newFairValue,
    incrementalExpense,
    reason
  });

  if (incrementalExpense > 0) {
    this.recognition.totalExpense += incrementalExpense;
  }

  this.fairValue.perShare = newFairValuePerShare;
  this.fairValue.total = newFairValue;
  this.status = 'modified';
  this.updatedBy = userId;

  return this.save();
};

ASC718ExpenseSchema.methods.updateRecognizedExpense = async function(amount, userId) {
  this.recognition.recognizedToDate += amount;
  this.updatedBy = userId;
  this.lastCalculatedAt = new Date();

  return this.save();
};

// Static methods
ASC718ExpenseSchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ 'grantDetails.grantDate': -1 });
};

ASC718ExpenseSchema.statics.getCompanyPeriodExpense = async function(companyId, periodStart, periodEnd) {
  const activeExpenses = await this.find({
    companyId,
    status: { $in: ['active', 'modified'] }
  });

  let totalExpense = 0;
  const details = [];

  for (const expense of activeExpenses) {
    const periodExpense = expense.calculatePeriodExpense(periodStart, periodEnd);
    totalExpense += periodExpense;

    details.push({
      grantId: expense.grantId,
      employeeName: expense.employeeName,
      grantType: expense.grantType,
      periodExpense
    });
  }

  return {
    periodStart,
    periodEnd,
    totalExpense,
    details
  };
};

ASC718ExpenseSchema.statics.getCompanyExpenseSummary = async function(companyId) {
  const expenses = await this.find({ companyId });

  const summary = {
    totalGrants: expenses.length,
    activeGrants: 0,
    totalFairValue: 0,
    totalRecognized: 0,
    totalRemaining: 0,
    byType: {},
    byStatus: {}
  };

  for (const expense of expenses) {
    // By status
    summary.byStatus[expense.status] = (summary.byStatus[expense.status] || 0) + 1;

    if (expense.status === 'active' || expense.status === 'modified') {
      summary.activeGrants++;
    }

    // By type
    if (!summary.byType[expense.grantType]) {
      summary.byType[expense.grantType] = { count: 0, totalExpense: 0, recognized: 0 };
    }
    summary.byType[expense.grantType].count++;
    summary.byType[expense.grantType].totalExpense += expense.recognition.totalExpense;
    summary.byType[expense.grantType].recognized += expense.recognition.recognizedToDate;

    // Totals
    summary.totalFairValue += expense.fairValue.total;
    summary.totalRecognized += expense.recognition.recognizedToDate;
    summary.totalRemaining += expense.recognition.remainingExpense || 0;
  }

  return summary;
};

module.exports = mongoose.model('ASC718Expense', ASC718ExpenseSchema);
