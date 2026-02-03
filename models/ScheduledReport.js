/**
 * ScheduledReport Model
 * Issue #112: Create Report Scheduling System
 *
 * Data model for automated recurring reports with support for:
 * - Cron-based scheduling
 * - Multiple report formats (PDF, Excel, CSV)
 * - Timezone-aware scheduling
 * - Recipient management
 */
const mongoose = require('mongoose');

const scheduledReportSchema = new mongoose.Schema({
  scheduleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  companyId: {
    type: String,
    required: true,
    index: true
  },

  reportType: {
    type: String,
    required: true,
    enum: [
      'cap_table',
      'financial_summary',
      'investor_report',
      'vesting_summary',
      'equity_plan',
      'transaction_history',
      'compliance',
      'custom'
    ]
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  // Cron expression for scheduling (e.g., "0 9 1 * *" for first of month at 9 AM)
  schedule: {
    type: String,
    required: true
  },

  // Scheduling dates
  nextRunAt: {
    type: Date,
    index: true
  },

  lastRunAt: {
    type: Date
  },

  // Email recipients for report delivery
  recipients: {
    type: [String],
    default: []
  },

  // Output format
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv'],
    default: 'pdf'
  },

  // Report-specific parameters
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Schedule status
  status: {
    type: String,
    enum: ['active', 'paused', 'failed', 'completed'],
    default: 'active',
    index: true
  },

  // Timezone for scheduling
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Pause tracking
  pausedAt: {
    type: Date
  },

  // Failure tracking
  failureCount: {
    type: Number,
    default: 0
  },

  lastError: {
    type: String
  },

  // Audit fields
  createdBy: {
    type: String
  },

  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
scheduledReportSchema.index({ companyId: 1, status: 1 });
scheduledReportSchema.index({ status: 1, nextRunAt: 1 });

// Virtual for checking if schedule is due
scheduledReportSchema.virtual('isDue').get(function() {
  if (this.status !== 'active' || !this.nextRunAt) {
    return false;
  }
  return new Date() >= this.nextRunAt;
});

// Ensure virtuals are included in JSON
scheduledReportSchema.set('toJSON', { virtuals: true });
scheduledReportSchema.set('toObject', { virtuals: true });

const ScheduledReport = mongoose.model('ScheduledReport', scheduledReportSchema);

module.exports = ScheduledReport;
