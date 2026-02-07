/**
 * CustomReportField Model
 * Issue #197: Build Custom Report Builder Engine
 *
 * Defines available fields for custom report building.
 * Tracks field metadata, data types, and allowed operations.
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid data types
const VALID_DATA_TYPES = ['string', 'number', 'date', 'boolean', 'currency', 'percentage'];
const VALID_AGGREGATIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT'];

// Schema definition for documentation and validation
const customReportFieldSchema = {
  fieldId: { type: 'string', required: true, unique: true },
  dataSource: { type: 'string', required: true },
  fieldName: { type: 'string', required: true },
  displayName: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  dataType: { type: 'string', required: true, enum: VALID_DATA_TYPES },
  isFilterable: { type: 'boolean', default: true },
  isSortable: { type: 'boolean', default: true },
  isAggregatable: { type: 'boolean', default: false },
  allowedAggregations: { type: 'array', default: [] },
  isGroupable: { type: 'boolean', default: true },
  format: { type: 'string', default: null },
  category: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('custom_report_fields', customReportFieldSchema);

// Extended CustomReportField model with business logic
const CustomReportField = {
  ...baseModel,
  tableName: 'custom_report_fields',
  schema: customReportFieldSchema,

  // Export constants
  VALID_DATA_TYPES,
  VALID_AGGREGATIONS,

  /**
   * Create a new field with defaults
   * @param {Object} data - Field data
   * @returns {Object} Created field
   */
  async create(data) {
    if (!data.fieldId) {
      data.fieldId = `field_${uuidv4()}`;
    }

    // Validate data type
    if (!VALID_DATA_TYPES.includes(data.dataType)) {
      throw new Error(`Invalid data type: ${data.dataType}`);
    }

    // Set default aggregations based on data type
    if (data.isAggregatable && (!data.allowedAggregations || data.allowedAggregations.length === 0)) {
      if (['number', 'currency', 'percentage'].includes(data.dataType)) {
        data.allowedAggregations = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
      } else {
        data.allowedAggregations = ['COUNT', 'DISTINCT_COUNT'];
      }
    }

    // Validate allowed aggregations
    if (data.allowedAggregations && data.allowedAggregations.length > 0) {
      const invalid = data.allowedAggregations.filter(agg => !VALID_AGGREGATIONS.includes(agg));
      if (invalid.length > 0) {
        throw new Error(`Invalid aggregation functions: ${invalid.join(', ')}`);
      }
    }

    // Set format based on data type if not provided
    if (!data.format) {
      switch (data.dataType) {
        case 'currency':
          data.format = '$0,0.00';
          break;
        case 'percentage':
          data.format = '0.00%';
          break;
        case 'date':
          data.format = 'YYYY-MM-DD';
          break;
        case 'number':
          data.format = '0,0.00';
          break;
        default:
          data.format = null;
      }
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find field by fieldId
   * @param {string} fieldId - Field ID
   * @returns {Object|null} Field or null
   */
  async findByFieldId(fieldId) {
    return baseModel.findOne.call(baseModel, { fieldId });
  },

  /**
   * Find fields by data source
   * @param {string} dataSource - Data source name
   * @returns {Array} Fields for data source
   */
  async findByDataSource(dataSource) {
    return baseModel.find.call(baseModel, { dataSource });
  },

  /**
   * Find fields by category
   * @param {string} category - Category name
   * @returns {Array} Fields in category
   */
  async findByCategory(category) {
    return baseModel.find.call(baseModel, { category });
  },

  /**
   * Find filterable fields
   * @returns {Array} Filterable fields
   */
  async findFilterable() {
    return baseModel.find.call(baseModel, { isFilterable: true });
  },

  /**
   * Find aggregatable fields
   * @returns {Array} Aggregatable fields
   */
  async findAggregatable() {
    return baseModel.find.call(baseModel, { isAggregatable: true });
  },

  /**
   * Get full field path
   * @param {Object} field - Field object
   * @returns {string} Full path
   */
  getFullPath(field) {
    return `${field.dataSource}.${field.fieldName}`;
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

module.exports = CustomReportField;
