/**
 * CustomReport Model
 * Issue #197: Build Custom Report Builder Engine
 *
 * Represents user-defined custom reports with dynamic query building.
 * Integrates with ZeroDB for scalable data storage and retrieval.
 */

const mongoose = require('mongoose');

const customReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: [true, 'Report ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true,
    maxLength: [255, 'Report name cannot exceed 255 characters']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    trim: true,
    index: true
  },
  createdBy: {
    type: String,
    required: [true, 'Creator ID is required'],
    trim: true,
    index: true
  },
  dataSources: {
    type: [String],
    required: [true, 'At least one data source is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one data source must be specified'
    }
  },
  fields: {
    type: [String],
    required: [true, 'At least one field is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one field must be specified'
    }
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    default: {}
  },
  groupBy: {
    type: [String],
    required: false,
    default: []
  },
  aggregations: [{
    field: {
      type: String,
      required: true
    },
    function: {
      type: String,
      required: true,
      enum: ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT']
    },
    alias: {
      type: String,
      required: false
    }
  }],
  sortBy: {
    field: {
      type: String,
      required: false
    },
    order: {
      type: String,
      enum: ['ASC', 'DESC'],
      default: 'ASC'
    }
  },
  limit: {
    type: Number,
    required: false,
    min: [1, 'Limit must be at least 1'],
    max: [10000, 'Limit cannot exceed 10000'],
    default: 100
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: {
    type: [String],
    required: false,
    default: []
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: false
    },
    recipients: {
      type: [String],
      required: false,
      default: []
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'draft'],
    default: 'draft',
    index: true
  },
  lastExecutedAt: {
    type: Date,
    required: false
  },
  executionCount: {
    type: Number,
    default: 0,
    min: [0, 'Execution count cannot be negative']
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if report has been executed
customReportSchema.virtual('hasBeenExecuted').get(function() {
  return this.executionCount > 0;
});

// Virtual for checking if report is scheduled
customReportSchema.virtual('isScheduled').get(function() {
  return this.schedule && this.schedule.enabled;
});

// Pre-save validation
customReportSchema.pre('save', function(next) {
  // Validate scheduled reports have required fields
  if (this.schedule && this.schedule.enabled) {
    if (!this.schedule.frequency) {
      return next(new Error('Frequency is required for scheduled reports'));
    }
    if (!this.schedule.recipients || this.schedule.recipients.length === 0) {
      return next(new Error('At least one recipient is required for scheduled reports'));
    }
  }

  // Validate aggregations have aliases
  if (this.aggregations && this.aggregations.length > 0) {
    for (const agg of this.aggregations) {
      if (!agg.alias) {
        agg.alias = `${agg.function}_${agg.field}`.toLowerCase();
      }
    }
  }

  next();
});

// Indexes for efficient queries
customReportSchema.index({ companyId: 1, status: 1 });
customReportSchema.index({ createdBy: 1, status: 1 });
customReportSchema.index({ dataSources: 1 });
customReportSchema.index({ 'schedule.enabled': 1 });
customReportSchema.index({ createdAt: -1 });

const CustomReport = mongoose.model('CustomReport', customReportSchema);

module.exports = CustomReport;
