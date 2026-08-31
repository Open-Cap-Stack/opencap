/**
 * SPVDocument Model
 * Issue #269: SPV Document Management
 *
 * Manages documents attached to a specific SPV, including
 * deal documents, data room files, LP documents, and compliance docs.
 */

const { createModel } = require('./base/ZeroDBModel');

// Valid document categories
const VALID_CATEGORIES = ['Deal documents', 'Data room', 'LP documents', 'Compliance'];

// Valid document statuses
const VALID_STATUSES = ['draft', 'pending', 'signed', 'executed'];

const validators = {
  isValidCategory: (cat) => VALID_CATEGORIES.includes(cat),
  isValidStatus: (status) => VALID_STATUSES.includes(status)
};

// Schema definition for documentation and validation
const spvDocumentSchema = {
  spvId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  name: { type: 'string', required: true },
  fileName: { type: 'string' },
  category: { type: 'string', enum: VALID_CATEGORIES, default: 'Deal documents' },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  url: { type: 'string' },
  fileUrl: { type: 'string' },
  uploadDate: { type: 'date' },
  uploaderName: { type: 'string' },
  uploaderId: { type: 'string' },
  signatories: { type: 'array', default: [] },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spv_documents', spvDocumentSchema);

// Extended SPVDocument model with business logic
const SPVDocument = {
  ...baseModel,
  tableName: 'spv_documents',
  schema: spvDocumentSchema,
  validators,
  VALID_CATEGORIES,
  VALID_STATUSES,

  /**
   * Create a new SPV document record with validation
   * @param {Object} data - Document data
   * @returns {Object} Created document
   */
  async create(data) {
    if (!data.spvId) {
      throw new Error('spvId is required');
    }
    if (!data.companyId) {
      throw new Error('companyId is required');
    }
    if (!data.name) {
      throw new Error('name is required');
    }
    if (data.category && !validators.isValidCategory(data.category)) {
      throw new Error(`Invalid category. Valid values: ${VALID_CATEGORIES.join(', ')}`);
    }
    if (data.status && !validators.isValidStatus(data.status)) {
      throw new Error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`);
    }

    const doc = {
      ...data,
      category: data.category || 'Deal documents',
      status: data.status || 'draft',
      signatories: data.signatories || [],
      uploadDate: data.uploadDate || new Date().toISOString()
    };

    return baseModel.create.call(baseModel, doc);
  },

  /**
   * Find all documents for a given SPV
   * @param {string} spvId - SPV identifier
   * @param {Object} filter - Additional filters
   * @returns {Array} Matching documents
   */
  async findBySPV(spvId, filter = {}) {
    return baseModel.find.call(baseModel, { spvId, ...filter });
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel)
};

module.exports = SPVDocument;
