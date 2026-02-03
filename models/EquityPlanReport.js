/**
 * EquityPlanReport Model
 * Issue #110: Implement Equity Plan Reports
 *
 * Data model for equity plan reports including option pool summaries,
 * grant status reports, vesting schedules, and dilution analysis.
 */
const mongoose = require('mongoose');

const equityPlanReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: [true, 'Report ID is required'],
    unique: true,
    trim: true,
    index: true
  },

  reportType: {
    type: String,
    required: [true, 'Report type is required'],
    enum: {
      values: ['option_pool_summary', 'grant_status', 'vesting_schedule', 'dilution_analysis'],
      message: '{VALUE} is not a valid report type'
    }
  },

  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    trim: true,
    index: true
  },

  // Date range for the report
  startDate: {
    type: Date,
    required: false
  },

  endDate: {
    type: Date,
    required: false
  },

  // Report parameters/configuration
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Generated report data/results
  generatedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Export format
  format: {
    type: String,
    enum: {
      values: ['pdf', 'excel', 'csv', 'json'],
      message: '{VALUE} is not a valid format'
    },
    default: 'json'
  },

  // Report status
  status: {
    type: String,
    enum: {
      values: ['pending', 'generating', 'completed', 'failed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
    index: true
  },

  // User who requested the report
  requestedBy: {
    type: String,
    trim: true
  },

  // Timestamp when report was generated
  generatedAt: {
    type: Date
  },

  // Error message if report generation failed
  errorMessage: {
    type: String
  },

  // URL to exported file (PDF, Excel, etc.)
  fileUrl: {
    type: String
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
equityPlanReportSchema.index({ companyId: 1, status: 1 });
equityPlanReportSchema.index({ reportType: 1, companyId: 1 });
equityPlanReportSchema.index({ createdAt: -1 });

// Virtual for checking if report is ready
equityPlanReportSchema.virtual('isReady').get(function() {
  return this.status === 'completed';
});

// Virtual for checking if report failed
equityPlanReportSchema.virtual('hasFailed').get(function() {
  return this.status === 'failed';
});

// Pre-save hook to set generatedAt when status changes to completed
equityPlanReportSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.generatedAt) {
    this.generatedAt = new Date();
  }
  next();
});

const EquityPlanReport = mongoose.model('EquityPlanReport', equityPlanReportSchema);

module.exports = EquityPlanReport;
