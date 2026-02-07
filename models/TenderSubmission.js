/**
 * TenderSubmission Model
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * Data model for stakeholder submissions to tender offers
 * Tracks:
 * - Shares offered by stakeholders
 * - Acceptance and payout amounts
 * - Submission status lifecycle
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn', 'settled'];

// Valid payment methods
const PAYMENT_METHODS = ['wire', 'check', 'ach', 'other'];

// Schema definition for documentation and validation
const tenderSubmissionSchema = {
  submissionId: { type: 'string', required: true, unique: true },
  offerId: { type: 'string', required: true },
  stakeholderId: { type: 'string', required: true },
  sharesOffered: { type: 'number', required: true },
  pricePerShare: { type: 'number', required: true },
  shareClass: { type: 'string', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  sharesAccepted: { type: 'number', default: 0 },
  prorataPercentage: { type: 'number', default: null },
  payoutAmount: { type: 'number', default: 0 },
  payoutDate: { type: 'date', default: null },
  paymentMethod: { type: 'string', enum: PAYMENT_METHODS, default: null },
  paymentReference: { type: 'string', default: null },
  submittedAt: { type: 'date', default: null },
  processedAt: { type: 'date', default: null },
  withdrawnAt: { type: 'date', default: null },
  settledAt: { type: 'date', default: null },
  rejectionReason: { type: 'string', default: null },
  eligibilityVerified: { type: 'boolean', default: false },
  eligibilityNotes: { type: 'string', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('tender_submissions', tenderSubmissionSchema);

// Extended TenderSubmission model with business logic
const TenderSubmission = {
  ...baseModel,
  tableName: 'tender_submissions',
  schema: tenderSubmissionSchema,

  // Export constants
  VALID_STATUSES,
  PAYMENT_METHODS,

  /**
   * Create a new submission with defaults
   * @param {Object} data - Submission data
   * @returns {Object} Created submission
   */
  async create(data) {
    if (!data.submissionId) {
      data.submissionId = `sub_${uuidv4()}`;
    }

    // Validate shares
    if (data.sharesOffered < 1) {
      throw new Error('sharesOffered must be at least 1');
    }

    // Validate price
    if (data.pricePerShare < 0) {
      throw new Error('pricePerShare cannot be negative');
    }

    if (!data.status) {
      data.status = 'pending';
    }

    if (!data.submittedAt) {
      data.submittedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find submission by submissionId
   * @param {string} submissionId - Submission ID
   * @returns {Object|null} Submission or null
   */
  async findBySubmissionId(submissionId) {
    return baseModel.findOne.call(baseModel, { submissionId });
  },

  /**
   * Find submissions by offer
   * @param {string} offerId - Offer ID
   * @param {Object} options - Query options
   * @returns {Array} Submissions for offer
   */
  async findByOffer(offerId, options = {}) {
    const query = { offerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find submissions by stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {Object} options - Query options
   * @returns {Array} Submissions by stakeholder
   */
  async findByStakeholder(stakeholderId, options = {}) {
    const query = { stakeholderId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find submission by offer and stakeholder
   * @param {string} offerId - Offer ID
   * @param {string} stakeholderId - Stakeholder ID
   * @returns {Object|null} Submission or null
   */
  async findByOfferAndStakeholder(offerId, stakeholderId) {
    return baseModel.findOne.call(baseModel, { offerId, stakeholderId });
  },

  /**
   * Get expected payout
   * @param {Object} submission - Submission object
   * @returns {number} Expected payout
   */
  getExpectedPayout(submission) {
    return submission.sharesOffered * submission.pricePerShare;
  },

  /**
   * Get actual payout
   * @param {Object} submission - Submission object
   * @returns {number} Actual payout
   */
  getActualPayout(submission) {
    return (submission.sharesAccepted || 0) * submission.pricePerShare;
  },

  /**
   * Get acceptance rate
   * @param {Object} submission - Submission object
   * @returns {number} Acceptance rate percentage
   */
  getAcceptanceRate(submission) {
    if (submission.sharesOffered === 0) return 0;
    return ((submission.sharesAccepted || 0) / submission.sharesOffered) * 100;
  },

  /**
   * Check if submission is modifiable
   * @param {Object} submission - Submission object
   * @returns {boolean} True if modifiable
   */
  isModifiable(submission) {
    return submission.status === 'pending';
  },

  /**
   * Accept submission
   * @param {string} submissionId - Submission ID
   * @param {number} sharesAccepted - Shares accepted
   * @param {number} prorataPercentage - Prorata percentage
   * @returns {Object} Updated submission
   */
  async accept(submissionId, sharesAccepted, prorataPercentage = 100) {
    const submission = await this.findBySubmissionId(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const payoutAmount = sharesAccepted * submission.pricePerShare;

    return baseModel.updateOne.call(baseModel,
      { submissionId },
      {
        $set: {
          status: 'accepted',
          sharesAccepted,
          prorataPercentage,
          payoutAmount,
          processedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Reject submission
   * @param {string} submissionId - Submission ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Updated submission
   */
  async reject(submissionId, reason) {
    return baseModel.updateOne.call(baseModel,
      { submissionId },
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
          processedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Withdraw submission
   * @param {string} submissionId - Submission ID
   * @returns {Object} Updated submission
   */
  async withdraw(submissionId) {
    return baseModel.updateOne.call(baseModel,
      { submissionId },
      {
        $set: {
          status: 'withdrawn',
          withdrawnAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Settle submission
   * @param {string} submissionId - Submission ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Object} Updated submission
   */
  async settle(submissionId, paymentDetails = {}) {
    return baseModel.updateOne.call(baseModel,
      { submissionId },
      {
        $set: {
          status: 'settled',
          settledAt: new Date().toISOString(),
          payoutDate: paymentDetails.payoutDate || new Date().toISOString(),
          paymentMethod: paymentDetails.paymentMethod,
          paymentReference: paymentDetails.paymentReference
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

module.exports = TenderSubmission;
