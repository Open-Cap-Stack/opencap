/**
 * TransferApproval Model
 * Issue #104: Build Transfer Approval Workflow
 *
 * Data model for tracking approval decisions on transfer requests including:
 * - Approver information and role
 * - Decision and conditions
 * - Audit trail for approval workflow
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid approver roles
const APPROVER_ROLES = ['board_member', 'cfo', 'ceo', 'legal_counsel', 'compliance_officer', 'admin'];

// Valid decisions
const DECISIONS = ['approved', 'rejected', 'requested_changes'];

// Schema definition for documentation and validation
const transferApprovalSchema = {
  approvalId: { type: 'string', required: true, unique: true },
  requestId: { type: 'string', required: true },
  approverId: { type: 'string', required: true },
  approverRole: { type: 'string', required: true, enum: APPROVER_ROLES },
  decision: { type: 'string', required: true, enum: DECISIONS },
  comments: { type: 'string', default: '' },
  conditions: { type: 'array', default: [] },
  decidedAt: { type: 'date', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('transfer_approvals', transferApprovalSchema);

// Extended TransferApproval model with business logic
const TransferApproval = {
  ...baseModel,
  tableName: 'transfer_approvals',
  schema: transferApprovalSchema,

  // Export constants
  APPROVER_ROLES,
  DECISIONS,

  /**
   * Create a new transfer approval with defaults
   * @param {Object} data - Approval data
   * @returns {Object} Created approval
   */
  async create(data) {
    if (!data.approvalId) {
      data.approvalId = `appr_${uuidv4()}`;
    }

    // Validate approver role
    if (!APPROVER_ROLES.includes(data.approverRole)) {
      throw new Error(`approverRole must be one of: ${APPROVER_ROLES.join(', ')}`);
    }

    // Validate decision
    if (!DECISIONS.includes(data.decision)) {
      throw new Error(`decision must be one of: ${DECISIONS.join(', ')}`);
    }

    if (!data.decidedAt) {
      data.decidedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find approval by approvalId
   * @param {string} approvalId - Approval ID
   * @returns {Object|null} Approval or null
   */
  async findByApprovalId(approvalId) {
    return baseModel.findOne.call(baseModel, { approvalId });
  },

  /**
   * Find approvals by request
   * @param {string} requestId - Request ID
   * @returns {Array} Approvals for request
   */
  async findByRequest(requestId) {
    return baseModel.find.call(baseModel, { requestId });
  },

  /**
   * Find approvals by approver
   * @param {string} approverId - Approver ID
   * @returns {Array} Approvals by approver
   */
  async findByApprover(approverId) {
    return baseModel.find.call(baseModel, { approverId });
  },

  /**
   * Check if this is an approval
   * @param {Object} approval - Approval object
   * @returns {boolean} True if approved
   */
  isApproval(approval) {
    return approval.decision === 'approved';
  },

  /**
   * Check if this is a rejection
   * @param {Object} approval - Approval object
   * @returns {boolean} True if rejected
   */
  isRejection(approval) {
    return approval.decision === 'rejected';
  },

  /**
   * Check if changes were requested
   * @param {Object} approval - Approval object
   * @returns {boolean} True if changes requested
   */
  requiresChanges(approval) {
    return approval.decision === 'requested_changes';
  },

  /**
   * Get latest approval for request
   * @param {string} requestId - Request ID
   * @returns {Object|null} Latest approval or null
   */
  async getLatestForRequest(requestId) {
    const approvals = await this.findByRequest(requestId);
    if (approvals.length === 0) return null;

    return approvals.reduce((latest, current) => {
      const latestDate = new Date(latest.decidedAt);
      const currentDate = new Date(current.decidedAt);
      return currentDate > latestDate ? current : latest;
    });
  },

  /**
   * Check if request has been fully approved
   * @param {string} requestId - Request ID
   * @param {Array} requiredRoles - Required approver roles
   * @returns {boolean} True if all required approvals are present
   */
  async hasAllApprovals(requestId, requiredRoles = ['board_member']) {
    const approvals = await this.findByRequest(requestId);
    const approvedRoles = approvals
      .filter(a => a.decision === 'approved')
      .map(a => a.approverRole);

    return requiredRoles.every(role => approvedRoles.includes(role));
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

module.exports = TransferApproval;
