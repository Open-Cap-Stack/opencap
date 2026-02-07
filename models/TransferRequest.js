/**
 * TransferRequest Model
 * Issue #104: Build Transfer Approval Workflow
 *
 * Data model for tracking share transfer requests including:
 * - Seller and buyer information
 * - Share transfer details
 * - Approval workflow status
 * - Right of First Refusal (ROFR) tracking
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'completed', 'canceled'];

// Valid ROFR statuses
const ROFR_STATUSES = ['not_applicable', 'pending', 'waived', 'exercised', 'expired'];

// Schema definition for documentation and validation
const transferRequestSchema = {
  requestId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  sellerId: { type: 'string', required: true },
  buyerId: { type: 'string', required: true },
  shareClassId: { type: 'string', required: true },
  numberOfShares: { type: 'number', required: true },
  pricePerShare: { type: 'number', required: true },
  totalAmount: { type: 'number', default: 0 },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  requestedAt: { type: 'date', default: null },
  reviewedAt: { type: 'date', default: null },
  completedAt: { type: 'date', default: null },
  reviewedBy: { type: 'string', default: null },
  rejectionReason: { type: 'string', default: null },
  documents: { type: 'array', default: [] },
  rofrStatus: { type: 'string', enum: ROFR_STATUSES, default: 'not_applicable' },
  rofrExpirationDate: { type: 'date', default: null },
  rofrEligibleParties: { type: 'array', default: [] },
  notes: { type: 'string', default: '' },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('transfer_requests', transferRequestSchema);

// Extended TransferRequest model with business logic
const TransferRequest = {
  ...baseModel,
  tableName: 'transfer_requests',
  schema: transferRequestSchema,

  // Export constants
  VALID_STATUSES,
  ROFR_STATUSES,

  /**
   * Create a new transfer request with defaults
   * @param {Object} data - Request data
   * @returns {Object} Created request
   */
  async create(data) {
    if (!data.requestId) {
      data.requestId = `tr_${uuidv4()}`;
    }

    // Validate shares
    if (data.numberOfShares < 1) {
      throw new Error('numberOfShares must be at least 1');
    }

    // Validate price
    if (data.pricePerShare < 0) {
      throw new Error('pricePerShare cannot be negative');
    }

    // Calculate total amount
    data.totalAmount = data.numberOfShares * data.pricePerShare;

    if (!data.status) {
      data.status = 'pending';
    }

    if (!data.requestedAt) {
      data.requestedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find request by requestId
   * @param {string} requestId - Request ID
   * @returns {Object|null} Request or null
   */
  async findByRequestId(requestId) {
    return baseModel.findOne.call(baseModel, { requestId });
  },

  /**
   * Find requests by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Requests for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find requests by seller
   * @param {string} sellerId - Seller ID
   * @param {Object} options - Query options
   * @returns {Array} Requests by seller
   */
  async findBySeller(sellerId, options = {}) {
    const query = { sellerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find requests by buyer
   * @param {string} buyerId - Buyer ID
   * @param {Object} options - Query options
   * @returns {Array} Requests by buyer
   */
  async findByBuyer(buyerId, options = {}) {
    const query = { buyerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Check if request is active
   * @param {Object} request - Request object
   * @returns {boolean} True if active
   */
  isActive(request) {
    return ['pending', 'under_review', 'approved'].includes(request.status);
  },

  /**
   * Check if request can be modified
   * @param {Object} request - Request object
   * @returns {boolean} True if can be modified
   */
  canBeModified(request) {
    return request.status === 'pending';
  },

  /**
   * Check if request can be canceled
   * @param {Object} request - Request object
   * @returns {boolean} True if can be canceled
   */
  canBeCanceled(request) {
    return ['pending', 'under_review'].includes(request.status);
  },

  /**
   * Submit for review
   * @param {string} requestId - Request ID
   * @returns {Object} Updated request
   */
  async submitForReview(requestId) {
    return baseModel.updateOne.call(baseModel,
      { requestId },
      { $set: { status: 'under_review' } }
    );
  },

  /**
   * Approve request
   * @param {string} requestId - Request ID
   * @param {string} reviewedBy - Reviewer user ID
   * @returns {Object} Updated request
   */
  async approve(requestId, reviewedBy) {
    return baseModel.updateOne.call(baseModel,
      { requestId },
      {
        $set: {
          status: 'approved',
          reviewedBy,
          reviewedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Reject request
   * @param {string} requestId - Request ID
   * @param {string} reviewedBy - Reviewer user ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Updated request
   */
  async reject(requestId, reviewedBy, reason) {
    return baseModel.updateOne.call(baseModel,
      { requestId },
      {
        $set: {
          status: 'rejected',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          rejectionReason: reason
        }
      }
    );
  },

  /**
   * Complete request
   * @param {string} requestId - Request ID
   * @returns {Object} Updated request
   */
  async complete(requestId) {
    return baseModel.updateOne.call(baseModel,
      { requestId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Cancel request
   * @param {string} requestId - Request ID
   * @returns {Object} Updated request
   */
  async cancel(requestId) {
    return baseModel.updateOne.call(baseModel,
      { requestId },
      { $set: { status: 'canceled' } }
    );
  },

  /**
   * Update ROFR status
   * @param {string} requestId - Request ID
   * @param {string} rofrStatus - New ROFR status
   * @returns {Object} Updated request
   */
  async updateRofrStatus(requestId, rofrStatus) {
    if (!ROFR_STATUSES.includes(rofrStatus)) {
      throw new Error(`rofrStatus must be one of: ${ROFR_STATUSES.join(', ')}`);
    }

    return baseModel.updateOne.call(baseModel,
      { requestId },
      { $set: { rofrStatus } }
    );
  },

  /**
   * Add document
   * @param {string} requestId - Request ID
   * @param {Object} document - Document data
   * @returns {Object} Updated request
   */
  async addDocument(requestId, document) {
    const request = await this.findByRequestId(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const documents = request.documents || [];
    documents.push({
      documentId: document.documentId,
      name: document.name,
      url: document.url,
      type: document.type,
      uploadedAt: new Date().toISOString()
    });

    return baseModel.updateOne.call(baseModel,
      { requestId },
      { $set: { documents } }
    );
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

module.exports = TransferRequest;
