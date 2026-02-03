/**
 * ReportFilter Model
 * Issue #197: Build Custom Report Builder Engine
 *
 * Represents filter conditions for custom reports.
 * Supports complex filtering logic with multiple operators.
 */

const mongoose = require('mongoose');

const reportFilterSchema = new mongoose.Schema({
  filterId: {
    type: String,
    required: [true, 'Filter ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  reportId: {
    type: String,
    required: [true, 'Report ID is required'],
    trim: true,
    index: true
  },
  field: {
    type: String,
    required: [true, 'Field is required'],
    trim: true
  },
  operator: {
    type: String,
    required: [true, 'Operator is required'],
    enum: {
      values: [
        'equals',
        'not_equals',
        'greater_than',
        'greater_than_or_equal',
        'less_than',
        'less_than_or_equal',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'in',
        'not_in',
        'is_null',
        'is_not_null',
        'between'
      ],
      message: '{VALUE} is not a valid operator'
    }
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  dataType: {
    type: String,
    required: [true, 'Data type is required'],
    enum: {
      values: ['string', 'number', 'date', 'boolean', 'array'],
      message: '{VALUE} is not a valid data type'
    }
  },
  logicalOperator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },
  parentFilterId: {
    type: String,
    required: false,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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

// Pre-save validation
reportFilterSchema.pre('save', function(next) {
  // Validate value based on operator
  if (['is_null', 'is_not_null'].includes(this.operator)) {
    this.value = null; // These operators don't need a value
  } else if (['in', 'not_in'].includes(this.operator)) {
    if (!Array.isArray(this.value)) {
      return next(new Error(`Operator ${this.operator} requires an array value`));
    }
  } else if (this.operator === 'between') {
    if (!Array.isArray(this.value) || this.value.length !== 2) {
      return next(new Error('Operator "between" requires an array with exactly 2 values'));
    }
  } else {
    if (this.value === undefined || this.value === null) {
      return next(new Error(`Operator ${this.operator} requires a value`));
    }
  }

  // Validate data type compatibility
  if (this.value !== null && this.value !== undefined) {
    switch (this.dataType) {
      case 'number':
        if (Array.isArray(this.value)) {
          if (!this.value.every(v => typeof v === 'number')) {
            return next(new Error('All values must be numbers for numeric filters'));
          }
        } else if (typeof this.value !== 'number') {
          return next(new Error('Value must be a number for numeric filters'));
        }
        break;
      case 'boolean':
        if (typeof this.value !== 'boolean') {
          return next(new Error('Value must be a boolean for boolean filters'));
        }
        break;
      case 'date':
        if (Array.isArray(this.value)) {
          if (!this.value.every(v => v instanceof Date || !isNaN(Date.parse(v)))) {
            return next(new Error('All values must be valid dates for date filters'));
          }
        } else if (!(this.value instanceof Date) && isNaN(Date.parse(this.value))) {
          return next(new Error('Value must be a valid date for date filters'));
        }
        break;
      case 'array':
        if (!Array.isArray(this.value)) {
          return next(new Error('Value must be an array for array filters'));
        }
        break;
    }
  }

  next();
});

// Method to convert filter to MongoDB query
reportFilterSchema.methods.toMongoQuery = function() {
  const query = {};

  switch (this.operator) {
    case 'equals':
      query[this.field] = this.value;
      break;
    case 'not_equals':
      query[this.field] = { $ne: this.value };
      break;
    case 'greater_than':
      query[this.field] = { $gt: this.value };
      break;
    case 'greater_than_or_equal':
      query[this.field] = { $gte: this.value };
      break;
    case 'less_than':
      query[this.field] = { $lt: this.value };
      break;
    case 'less_than_or_equal':
      query[this.field] = { $lte: this.value };
      break;
    case 'contains':
      query[this.field] = { $regex: this.value, $options: 'i' };
      break;
    case 'not_contains':
      query[this.field] = { $not: { $regex: this.value, $options: 'i' } };
      break;
    case 'starts_with':
      query[this.field] = { $regex: `^${this.value}`, $options: 'i' };
      break;
    case 'ends_with':
      query[this.field] = { $regex: `${this.value}$`, $options: 'i' };
      break;
    case 'in':
      query[this.field] = { $in: this.value };
      break;
    case 'not_in':
      query[this.field] = { $nin: this.value };
      break;
    case 'is_null':
      query[this.field] = null;
      break;
    case 'is_not_null':
      query[this.field] = { $ne: null };
      break;
    case 'between':
      query[this.field] = { $gte: this.value[0], $lte: this.value[1] };
      break;
  }

  return query;
};

// Indexes for efficient queries
reportFilterSchema.index({ reportId: 1, isActive: 1 });
reportFilterSchema.index({ field: 1 });
reportFilterSchema.index({ parentFilterId: 1 });

const ReportFilter = mongoose.model('ReportFilter', reportFilterSchema);

module.exports = ReportFilter;
