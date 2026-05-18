/**
 * ExerciseRequest Model
 * Feature: Issue #79 - Build Exercise Management System
 *
 * Tracks stock option exercise requests through their complete lifecycle:
 * pending -> approved -> processed -> completed
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'processed', 'completed', 'cancelled'];

// Valid option types
const OPTION_TYPES = ['ISO', 'NSO', 'RSA', 'RSU'];

// Valid payment methods
const PAYMENT_METHODS = ['cash', 'check', 'wire', 'cashless', 'stock_swap'];

// Valid withholding methods
const WITHHOLDING_METHODS = ['cash', 'sell_to_cover', 'same_day_sale'];

// Valid filing statuses
const FILING_STATUSES = ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'];

// Valid exercise window types
const WINDOW_TYPES = ['open', 'blackout', 'limited', 'termination'];

// Schema definition for documentation and validation
const exerciseRequestSchema = {
  exerciseRequestId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  stakeholderId: { type: 'string', required: true },
  equityGrantId: { type: 'string', required: true },
  optionType: { type: 'string', required: true, enum: OPTION_TYPES },
  exerciseDetails: {
    type: 'object',
    default: {
      sharesRequested: 0,
      exercisePrice: 0,
      currentFMV: 0,
      spread: 0,
      totalSpread: 0,
      totalExerciseCost: 0,
      totalValue: 0,
      isUnderwater: false,
      grantTotalShares: 0,
      previouslyExercised: 0,
      vestedShares: 0,
      remainingExercisable: 0,
      isPartialExercise: false
    }
  },
  exerciseWindow: {
    type: 'object',
    default: {
      windowStart: null,
      windowEnd: null,
      windowType: 'open',
      grantExpirationDate: null,
      daysUntilExpiration: null
    }
  },
  paymentMethod: { type: 'string', enum: PAYMENT_METHODS, default: 'cash' },
  payment: {
    type: 'object',
    default: {
      paymentReceived: false,
      paymentAmount: 0,
      paymentDate: null,
      paymentReference: null,
      paymentMethod: 'cash'
    }
  },
  employeeProfile: {
    type: 'object',
    default: {
      filingStatus: 'single',
      federalAllowances: 0,
      stateCode: null,
      stateAllowances: 0,
      additionalWithholding: 0,
      isSubjectToAMT: false,
      ytdWages: 0,
      ytdSocialSecurity: 0
    }
  },
  taxWithholding: {
    type: 'object',
    default: {
      calculated: false,
      totalWithholding: 0,
      federalWithholding: 0,
      stateWithholding: 0,
      socialSecurityWithholding: 0,
      medicareWithholding: 0,
      additionalMedicare: 0,
      amtWithholding: 0,
      sharesToWithhold: 0,
      withholdingMethod: 'cash'
    }
  },
  certificateData: {
    type: 'object',
    default: {
      certificateNumber: null,
      sharesIssued: 0,
      issueDate: null,
      companyId: null,
      holderId: null,
      shareClassId: null,
      restrictionPeriod: null,
      restrictionEndDate: null,
      legendText: null
    }
  },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  requestedBy: { type: 'string', required: true },
  requestedAt: { type: 'date', default: null },
  requestNotes: { type: 'string', default: '' },
  approvedBy: { type: 'string', default: null },
  approvedAt: { type: 'date', default: null },
  approvalNotes: { type: 'string', default: '' },
  rejectedBy: { type: 'string', default: null },
  rejectedAt: { type: 'date', default: null },
  rejectionReason: { type: 'string', default: '' },
  processedBy: { type: 'string', default: null },
  processedAt: { type: 'date', default: null },
  processingNotes: { type: 'string', default: '' },
  completedBy: { type: 'string', default: null },
  completedAt: { type: 'date', default: null },
  completionNotes: { type: 'string', default: '' },
  cancelledBy: { type: 'string', default: null },
  cancelledAt: { type: 'date', default: null },
  cancellationReason: { type: 'string', default: '' },
  form3921Id: { type: 'string', default: null },
  form3921Generated: { type: 'boolean', default: false },
  form3921GeneratedAt: { type: 'date', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('exercise_requests', exerciseRequestSchema);

// Extended ExerciseRequest model with business logic
const ExerciseRequest = {
  ...baseModel,
  tableName: 'exercise_requests',
  schema: exerciseRequestSchema,

  // Export constants
  VALID_STATUSES,
  OPTION_TYPES,
  PAYMENT_METHODS,
  WITHHOLDING_METHODS,
  FILING_STATUSES,
  WINDOW_TYPES,

  /**
   * Create a new exercise request with defaults
   * @param {Object} data - Request data
   * @returns {Object} Created request
   */
  async create(data) {
    if (!data.exerciseRequestId) {
      data.exerciseRequestId = `exr_${uuidv4()}`;
    }

    // Validate option type
    if (!OPTION_TYPES.includes(data.optionType)) {
      throw new Error(`optionType must be one of: ${OPTION_TYPES.join(', ')}`);
    }

    if (!data.requestedAt) {
      data.requestedAt = new Date().toISOString();
    }

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find request by exerciseRequestId
   * @param {string} exerciseRequestId - Request ID
   * @returns {Object|null} Request or null
   */
  async findByExerciseRequestId(exerciseRequestId) {
    return baseModel.findOne.call(baseModel, { exerciseRequestId });
  },

  /**
   * Find requests by company
   * @param {string} companyId - Company ID
   * @param {string} status - Optional status filter
   * @returns {Array} Requests for company
   */
  async findByCompany(companyId, status = null) {
    const query = { companyId };
    if (status) query.status = status;
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find requests by stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {string} status - Optional status filter
   * @returns {Array} Requests for stakeholder
   */
  async findByStakeholder(stakeholderId, status = null) {
    const query = { stakeholderId };
    if (status) query.status = status;
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find pending requests by grant
   * @param {string} equityGrantId - Grant ID
   * @returns {Array} Pending requests
   */
  async findPendingByGrant(equityGrantId) {
    const requests = await baseModel.find.call(baseModel, { equityGrantId });
    return requests.filter(r => ['pending', 'approved'].includes(r.status));
  },

  /**
   * Find requests by equity grant
   * @param {string} equityGrantId - Grant ID
   * @param {string} status - Optional status filter
   * @returns {Array} Requests for grant
   */
  async findByEquityGrant(equityGrantId, status = null) {
    const query = { equityGrantId };
    if (status) query.status = status;
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get net shares after withholding
   * @param {Object} request - Request object
   * @returns {number|null} Net shares
   */
  getNetShares(request) {
    if (!request.exerciseDetails || !request.taxWithholding) return null;
    return request.exerciseDetails.sharesRequested - (request.taxWithholding.sharesToWithhold || 0);
  },

  /**
   * Check if request can be approved
   * @param {Object} request - Request object
   * @returns {boolean} True if can be approved
   */
  canBeApproved(request) {
    return request.status === 'pending';
  },

  /**
   * Check if request can be rejected
   * @param {Object} request - Request object
   * @returns {boolean} True if can be rejected
   */
  canBeRejected(request) {
    return request.status === 'pending';
  },

  /**
   * Check if request can be processed
   * @param {Object} request - Request object
   * @returns {boolean} True if can be processed
   */
  canBeProcessed(request) {
    return request.status === 'approved';
  },

  /**
   * Check if request can be completed
   * @param {Object} request - Request object
   * @returns {boolean} True if can be completed
   */
  canBeCompleted(request) {
    return request.status === 'processed';
  },

  /**
   * Check if request can be cancelled
   * @param {Object} request - Request object
   * @returns {boolean} True if can be cancelled
   */
  canBeCancelled(request) {
    return ['pending', 'approved'].includes(request.status);
  },

  /**
   * Approve request
   * @param {string} exerciseRequestId - Request ID
   * @param {string} approvedBy - User ID
   * @param {string} notes - Approval notes
   * @returns {Object} Updated request
   */
  async approve(exerciseRequestId, approvedBy, notes = '') {
    return baseModel.updateOne.call(baseModel,
      { exerciseRequestId },
      {
        $set: {
          status: 'approved',
          approvedBy,
          approvedAt: new Date().toISOString(),
          approvalNotes: notes
        }
      }
    );
  },

  /**
   * Reject request
   * @param {string} exerciseRequestId - Request ID
   * @param {string} rejectedBy - User ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Updated request
   */
  async reject(exerciseRequestId, rejectedBy, reason = '') {
    return baseModel.updateOne.call(baseModel,
      { exerciseRequestId },
      {
        $set: {
          status: 'rejected',
          rejectedBy,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason
        }
      }
    );
  },

  /**
   * Process request
   * @param {string} exerciseRequestId - Request ID
   * @param {string} processedBy - User ID
   * @param {string} notes - Processing notes
   * @returns {Object} Updated request
   */
  async process(exerciseRequestId, processedBy, notes = '') {
    return baseModel.updateOne.call(baseModel,
      { exerciseRequestId },
      {
        $set: {
          status: 'processed',
          processedBy,
          processedAt: new Date().toISOString(),
          processingNotes: notes
        }
      }
    );
  },

  /**
   * Complete request
   * @param {string} exerciseRequestId - Request ID
   * @param {string} completedBy - User ID
   * @param {string} notes - Completion notes
   * @returns {Object} Updated request
   */
  async complete(exerciseRequestId, completedBy, notes = '') {
    return baseModel.updateOne.call(baseModel,
      { exerciseRequestId },
      {
        $set: {
          status: 'completed',
          completedBy,
          completedAt: new Date().toISOString(),
          completionNotes: notes
        }
      }
    );
  },

  /**
   * Cancel request
   * @param {string} exerciseRequestId - Request ID
   * @param {string} cancelledBy - User ID
   * @param {string} reason - Cancellation reason
   * @returns {Object} Updated request
   */
  async cancel(exerciseRequestId, cancelledBy, reason = '') {
    return baseModel.updateOne.call(baseModel,
      { exerciseRequestId },
      {
        $set: {
          status: 'cancelled',
          cancelledBy,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason
        }
      }
    );
  },

  /**
   * Get exercise summary by equity grant ID
   * Aggregates total exercised shares and pending shares for a grant
   * @param {string} equityGrantId - Equity grant ID
   * @returns {Object} Exercise summary
   */
  async getExerciseSummaryByGrant(equityGrantId) {
    const requests = await baseModel.find.call(baseModel, { equityGrantId });

    const completedRequests = requests.filter(r => r.status === 'completed');
    const pendingRequests = requests.filter(r =>
      ['pending', 'approved', 'processed'].includes(r.status)
    );

    const totalExercisedShares = completedRequests.reduce(
      (sum, r) => sum + (r.exerciseDetails?.sharesRequested || 0), 0
    );
    const totalPendingShares = pendingRequests.reduce(
      (sum, r) => sum + (r.exerciseDetails?.sharesRequested || 0), 0
    );

    return {
      equityGrantId,
      totalExercisedShares,
      totalPendingShares,
      completedCount: completedRequests.length,
      pendingCount: pendingRequests.length,
      totalCount: requests.length
    };
  },

  /**
   * Get ISO exercises for a specific tax year
   * @param {string} companyId - Company ID
   * @param {number} taxYear - Tax year
   * @returns {Array} Completed ISO exercises in that tax year
   */
  async getISOExercisesForTaxYear(companyId, taxYear) {
    const requests = await baseModel.find.call(baseModel, {
      companyId,
      optionType: 'ISO',
      status: 'completed'
    });

    return requests.filter(r => {
      const completedDate = r.completedAt ? new Date(r.completedAt) : null;
      return completedDate && completedDate.getFullYear() === taxYear;
    });
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

module.exports = ExerciseRequest;
