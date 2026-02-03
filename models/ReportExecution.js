/**
 * ReportExecution Model
 * Issue #112: Create Report Scheduling System
 *
 * Data model for tracking report execution history with support for:
 * - Execution status tracking
 * - File storage metadata
 * - Delivery status per recipient
 * - Error tracking
 */
const mongoose = require('mongoose');

const deliveryStatusSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending'
  },
  deliveredAt: {
    type: Date
  },
  error: {
    type: String
  }
}, { _id: false });

const reportExecutionSchema = new mongoose.Schema({
  executionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  scheduleId: {
    type: String,
    required: true,
    index: true
  },

  // Execution timing
  startedAt: {
    type: Date,
    required: true,
    index: true
  },

  completedAt: {
    type: Date
  },

  // Execution status
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },

  // Generated file details
  fileUrl: {
    type: String
  },

  fileSize: {
    type: Number
  },

  fileName: {
    type: String
  },

  // Error details (if failed)
  error: {
    type: String
  },

  // Delivery tracking per recipient
  deliveryStatus: {
    type: [deliveryStatusSchema],
    default: []
  },

  // Report snapshot (parameters used at execution time)
  reportParameters: {
    type: mongoose.Schema.Types.Mixed
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
reportExecutionSchema.index({ scheduleId: 1, status: 1 });
reportExecutionSchema.index({ scheduleId: 1, startedAt: -1 });

// Virtual for calculating execution duration
reportExecutionSchema.virtual('duration').get(function() {
  if (!this.startedAt) {
    return null;
  }
  const endTime = this.completedAt || new Date();
  return endTime.getTime() - this.startedAt.getTime();
});

// Virtual for checking if execution is complete
reportExecutionSchema.virtual('isComplete').get(function() {
  return this.status === 'completed' || this.status === 'failed';
});

// Virtual for calculating delivery success rate
reportExecutionSchema.virtual('deliverySuccessRate').get(function() {
  if (!this.deliveryStatus || this.deliveryStatus.length === 0) {
    return null;
  }
  const delivered = this.deliveryStatus.filter(d => d.status === 'delivered').length;
  return (delivered / this.deliveryStatus.length) * 100;
});

// Ensure virtuals are included in JSON
reportExecutionSchema.set('toJSON', { virtuals: true });
reportExecutionSchema.set('toObject', { virtuals: true });

const ReportExecution = mongoose.model('ReportExecution', reportExecutionSchema);

module.exports = ReportExecution;
