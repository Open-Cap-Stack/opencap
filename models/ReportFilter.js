/**
 * ReportFilter Model
 * Issue #197: Build Custom Report Builder Engine
 *
 * Represents filter conditions for custom reports.
 * Supports complex filtering logic with multiple operators.
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid operators
const VALID_OPERATORS = [
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
];

const VALID_DATA_TYPES = ['string', 'number', 'date', 'boolean', 'array'];
const VALID_LOGICAL_OPERATORS = ['AND', 'OR'];

// Schema definition for documentation and validation
const reportFilterSchema = {
  filterId: { type: 'string', required: true, unique: true },
  reportId: { type: 'string', required: true },
  field: { type: 'string', required: true },
  operator: { type: 'string', required: true, enum: VALID_OPERATORS },
  value: { type: 'any', default: null },
  dataType: { type: 'string', required: true, enum: VALID_DATA_TYPES },
  logicalOperator: { type: 'string', enum: VALID_LOGICAL_OPERATORS, default: 'AND' },
  parentFilterId: { type: 'string', default: null },
  isActive: { type: 'boolean', default: true },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('report_filters', reportFilterSchema);

// Extended ReportFilter model with business logic
const ReportFilter = {
  ...baseModel,
  tableName: 'report_filters',
  schema: reportFilterSchema,

  // Export constants
  VALID_OPERATORS,
  VALID_DATA_TYPES,
  VALID_LOGICAL_OPERATORS,

  /**
   * Create a new filter with defaults
   * @param {Object} data - Filter data
   * @returns {Object} Created filter
   */
  async create(data) {
    if (!data.filterId) {
      data.filterId = `filter_${uuidv4()}`;
    }

    // Validate operator
    if (!VALID_OPERATORS.includes(data.operator)) {
      throw new Error(`Invalid operator: ${data.operator}`);
    }

    // Validate data type
    if (!VALID_DATA_TYPES.includes(data.dataType)) {
      throw new Error(`Invalid data type: ${data.dataType}`);
    }

    // Validate value based on operator
    if (['is_null', 'is_not_null'].includes(data.operator)) {
      data.value = null;
    } else if (['in', 'not_in'].includes(data.operator)) {
      if (!Array.isArray(data.value)) {
        throw new Error(`Operator ${data.operator} requires an array value`);
      }
    } else if (data.operator === 'between') {
      if (!Array.isArray(data.value) || data.value.length !== 2) {
        throw new Error('Operator "between" requires an array with exactly 2 values');
      }
    } else {
      if (data.value === undefined || data.value === null) {
        throw new Error(`Operator ${data.operator} requires a value`);
      }
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find filter by filterId
   * @param {string} filterId - Filter ID
   * @returns {Object|null} Filter or null
   */
  async findByFilterId(filterId) {
    return baseModel.findOne.call(baseModel, { filterId });
  },

  /**
   * Find filters by report
   * @param {string} reportId - Report ID
   * @param {boolean} activeOnly - Only return active filters
   * @returns {Array} Filters for report
   */
  async findByReport(reportId, activeOnly = true) {
    const query = { reportId };
    if (activeOnly) {
      query.isActive = true;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Convert filter to query object
   * @param {Object} filter - Filter object
   * @returns {Object} Query object
   */
  toQuery(filter) {
    const query = {};

    switch (filter.operator) {
      case 'equals':
        query[filter.field] = filter.value;
        break;
      case 'not_equals':
        query[filter.field] = { $ne: filter.value };
        break;
      case 'greater_than':
        query[filter.field] = { $gt: filter.value };
        break;
      case 'greater_than_or_equal':
        query[filter.field] = { $gte: filter.value };
        break;
      case 'less_than':
        query[filter.field] = { $lt: filter.value };
        break;
      case 'less_than_or_equal':
        query[filter.field] = { $lte: filter.value };
        break;
      case 'contains':
        query[filter.field] = { $regex: filter.value, $options: 'i' };
        break;
      case 'not_contains':
        query[filter.field] = { $not: { $regex: filter.value, $options: 'i' } };
        break;
      case 'starts_with':
        query[filter.field] = { $regex: `^${filter.value}`, $options: 'i' };
        break;
      case 'ends_with':
        query[filter.field] = { $regex: `${filter.value}$`, $options: 'i' };
        break;
      case 'in':
        query[filter.field] = { $in: filter.value };
        break;
      case 'not_in':
        query[filter.field] = { $nin: filter.value };
        break;
      case 'is_null':
        query[filter.field] = null;
        break;
      case 'is_not_null':
        query[filter.field] = { $ne: null };
        break;
      case 'between':
        query[filter.field] = { $gte: filter.value[0], $lte: filter.value[1] };
        break;
    }

    return query;
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = ReportFilter;
