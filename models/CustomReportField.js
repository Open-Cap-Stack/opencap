/**
 * CustomReportField Model
 * Issue #197: Build Custom Report Builder Engine
 *
 * Defines available fields for custom report building.
 * Tracks field metadata, data types, and allowed operations.
 */

const mongoose = require('mongoose');

const customReportFieldSchema = new mongoose.Schema({
  fieldId: {
    type: String,
    required: [true, 'Field ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  dataSource: {
    type: String,
    required: [true, 'Data source is required'],
    trim: true,
    index: true
  },
  fieldName: {
    type: String,
    required: [true, 'Field name is required'],
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  dataType: {
    type: String,
    required: [true, 'Data type is required'],
    enum: {
      values: ['string', 'number', 'date', 'boolean', 'currency', 'percentage'],
      message: '{VALUE} is not a valid data type'
    }
  },
  isFilterable: {
    type: Boolean,
    default: true
  },
  isSortable: {
    type: Boolean,
    default: true
  },
  isAggregatable: {
    type: Boolean,
    default: false
  },
  allowedAggregations: {
    type: [String],
    required: false,
    default: [],
    validate: {
      validator: function(v) {
        const validAggregations = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT'];
        return v.every(agg => validAggregations.includes(agg));
      },
      message: 'Invalid aggregation function specified'
    }
  },
  isGroupable: {
    type: Boolean,
    default: true
  },
  format: {
    type: String,
    required: false,
    trim: true
  },
  category: {
    type: String,
    required: false,
    trim: true,
    index: true
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

// Virtual for full field path
customReportFieldSchema.virtual('fullPath').get(function() {
  return `${this.dataSource}.${this.fieldName}`;
});

// Pre-save validation
customReportFieldSchema.pre('save', function(next) {
  // Set default aggregations based on data type
  if (this.isAggregatable && (!this.allowedAggregations || this.allowedAggregations.length === 0)) {
    if (this.dataType === 'number' || this.dataType === 'currency' || this.dataType === 'percentage') {
      this.allowedAggregations = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
    } else {
      this.allowedAggregations = ['COUNT', 'DISTINCT_COUNT'];
    }
  }

  // Set format based on data type if not provided
  if (!this.format) {
    switch (this.dataType) {
      case 'currency':
        this.format = '$0,0.00';
        break;
      case 'percentage':
        this.format = '0.00%';
        break;
      case 'date':
        this.format = 'YYYY-MM-DD';
        break;
      case 'number':
        this.format = '0,0.00';
        break;
      default:
        this.format = null;
    }
  }

  next();
});

// Indexes for efficient queries
customReportFieldSchema.index({ dataSource: 1, fieldName: 1 }, { unique: true });
customReportFieldSchema.index({ category: 1 });
customReportFieldSchema.index({ isFilterable: 1 });
customReportFieldSchema.index({ isAggregatable: 1 });

const CustomReportField = mongoose.model('CustomReportField', customReportFieldSchema);

module.exports = CustomReportField;
