/**
 * SecondaryTransaction Model
 * Issue #103: Create Secondary Transaction Model
 *
 * Data model for tracking secondary share transactions including:
 * - Private sales between stakeholders
 * - Tender offers
 * - ROFR (Right of First Refusal) exercises
 * - Gift transfers
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'approved', 'in_escrow', 'completed', 'canceled', 'failed', 'rejected'];

// Valid transaction types
const TRANSACTION_TYPES = ['private_sale', 'tender_offer', 'rofr_exercise', 'gift', 'estate_transfer', 'company_buyback'];

// Valid document types
const DOCUMENT_TYPES = ['purchase_agreement', 'board_consent', 'rofr_waiver', 'transfer_notice', 'tax_form', 'other'];

// Valid fee payers
const FEE_PAYERS = ['seller', 'buyer', 'split', 'company'];

// Valid approver types
const APPROVER_TYPES = ['board', 'company_admin', 'legal', 'transfer_agent'];

// Schema definition for documentation and validation
const secondaryTransactionSchema = {
  transactionId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  sellerId: { type: 'string', required: true },
  buyerId: { type: 'string', required: true },
  shareClassId: { type: 'string', required: true },
  numberOfShares: { type: 'number', required: true },
  pricePerShare: { type: 'number', required: true },
  totalAmount: { type: 'number', required: true },
  currency: { type: 'string', default: 'USD' },
  transactionDate: { type: 'date', required: true },
  settlementDate: { type: 'date', default: null },
  initiatedAt: { type: 'date', default: null },
  completedAt: { type: 'date', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  transactionType: { type: 'string', required: true, enum: TRANSACTION_TYPES },
  transferRequestId: { type: 'string', default: null },
  rofrDetails: {
    type: 'object',
    default: {
      rofrHolderId: null,
      rofrExercised: false,
      rofrWaived: false,
      rofrDeadline: null,
      originalBuyerId: null
    }
  },
  documents: { type: 'array', default: [] },
  fees: {
    type: 'object',
    default: {
      platformFee: 0,
      legalFees: 0,
      transferAgentFee: 0,
      escrowFee: 0,
      otherFees: 0,
      feesPaidBy: 'seller'
    }
  },
  escrow: {
    type: 'object',
    default: {
      escrowAgentId: null,
      escrowAccountNumber: null,
      fundsReceivedAt: null,
      fundsReleasedAt: null
    }
  },
  approvals: { type: 'array', default: [] },
  notes: { type: 'string', default: '' },
  internalNotes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  cancellationReason: { type: 'string', default: null },
  failureReason: { type: 'string', default: null },
  canceledBy: { type: 'string', default: null },
  canceledAt: { type: 'date', default: null },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('secondary_transactions', secondaryTransactionSchema);

// Extended SecondaryTransaction model with business logic
const SecondaryTransaction = {
  ...baseModel,
  tableName: 'secondary_transactions',
  schema: secondaryTransactionSchema,

  // Export constants
  VALID_STATUSES,
  TRANSACTION_TYPES,
  DOCUMENT_TYPES,
  FEE_PAYERS,
  APPROVER_TYPES,

  /**
   * Create a new secondary transaction with defaults
   * @param {Object} data - Transaction data
   * @returns {Object} Created transaction
   */
  async create(data) {
    if (!data.transactionId) {
      data.transactionId = `stx_${uuidv4()}`;
    }

    // Validate shares
    if (data.numberOfShares < 1) {
      throw new Error('numberOfShares must be at least 1');
    }

    // Validate price
    if (data.pricePerShare < 0) {
      throw new Error('pricePerShare cannot be negative');
    }

    // Calculate total amount if not set
    if (!data.totalAmount) {
      data.totalAmount = data.numberOfShares * data.pricePerShare;
    }

    // Validate transaction type
    if (!TRANSACTION_TYPES.includes(data.transactionType)) {
      throw new Error(`transactionType must be one of: ${TRANSACTION_TYPES.join(', ')}`);
    }

    if (!data.status) {
      data.status = 'pending';
    }

    if (!data.initiatedAt) {
      data.initiatedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find transaction by transactionId
   * @param {string} transactionId - Transaction ID
   * @returns {Object|null} Transaction or null
   */
  async findByTransactionId(transactionId) {
    return baseModel.findOne.call(baseModel, { transactionId });
  },

  /**
   * Find transactions by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Transactions for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.transactionType) {
      query.transactionType = options.transactionType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find transactions by seller
   * @param {string} sellerId - Seller ID
   * @param {Object} options - Query options
   * @returns {Array} Transactions by seller
   */
  async findBySeller(sellerId, options = {}) {
    const query = { sellerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find transactions by buyer
   * @param {string} buyerId - Buyer ID
   * @param {Object} options - Query options
   * @returns {Array} Transactions by buyer
   */
  async findByBuyer(buyerId, options = {}) {
    const query = { buyerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get net amount after fees
   * @param {Object} transaction - Transaction object
   * @returns {number} Net amount
   */
  getNetAmount(transaction) {
    const totalFees = this.getTotalFees(transaction);
    return transaction.totalAmount - totalFees;
  },

  /**
   * Get total fees
   * @param {Object} transaction - Transaction object
   * @returns {number} Total fees
   */
  getTotalFees(transaction) {
    const fees = transaction.fees || {};
    return (fees.platformFee || 0) +
           (fees.legalFees || 0) +
           (fees.transferAgentFee || 0) +
           (fees.escrowFee || 0) +
           (fees.otherFees || 0);
  },

  /**
   * Check if all required approvals are obtained
   * @param {Object} transaction - Transaction object
   * @returns {boolean} True if all approvals obtained
   */
  hasAllApprovals(transaction) {
    if (!transaction.approvals || transaction.approvals.length === 0) {
      return false;
    }
    return transaction.approvals.every(approval => approval.status === 'approved');
  },

  /**
   * Add an approval
   * @param {string} transactionId - Transaction ID
   * @param {Object} approval - Approval data
   * @returns {Object} Updated transaction
   */
  async addApproval(transactionId, approval) {
    const transaction = await this.findByTransactionId(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const approvals = transaction.approvals || [];
    approvals.push({
      approverType: approval.approverType,
      approverId: approval.approverId,
      approvedAt: approval.status === 'approved' ? new Date().toISOString() : null,
      status: approval.status,
      notes: approval.notes
    });

    return baseModel.updateOne.call(baseModel,
      { transactionId },
      { $set: { approvals } }
    );
  },

  /**
   * Add document
   * @param {string} transactionId - Transaction ID
   * @param {Object} document - Document data
   * @returns {Object} Updated transaction
   */
  async addDocument(transactionId, document) {
    const transaction = await this.findByTransactionId(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const documents = transaction.documents || [];
    documents.push({
      documentId: document.documentId,
      documentType: document.documentType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: document.uploadedBy
    });

    return baseModel.updateOne.call(baseModel,
      { transactionId },
      { $set: { documents } }
    );
  },

  /**
   * Complete transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Updated transaction
   */
  async complete(transactionId) {
    return baseModel.updateOne.call(baseModel,
      { transactionId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Cancel transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Cancellation reason
   * @param {string} canceledBy - User ID
   * @returns {Object} Updated transaction
   */
  async cancel(transactionId, reason, canceledBy) {
    return baseModel.updateOne.call(baseModel,
      { transactionId },
      {
        $set: {
          status: 'canceled',
          cancellationReason: reason,
          canceledBy,
          canceledAt: new Date().toISOString()
        }
      }
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

module.exports = SecondaryTransaction;
