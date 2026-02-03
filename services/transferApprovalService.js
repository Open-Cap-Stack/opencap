/**
 * Transfer Approval Service
 * Issue #104: Build Transfer Approval Workflow
 *
 * Business logic for transfer approval workflow including:
 * - Creating and managing transfer requests
 * - Approval, rejection, and change request handling
 * - ROFR (Right of First Refusal) eligibility checking
 * - Transfer execution
 */
const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

// Valid ROFR status values
const VALID_ROFR_STATUSES = ['not_applicable', 'pending', 'waived', 'exercised', 'expired'];

class TransferApprovalService {
  /**
   * Create a new transfer request
   * @param {Object} requestData - Transfer request data
   * @returns {Object} Created transfer request
   */
  static async createTransferRequest(requestData) {
    const {
      companyId,
      sellerId,
      buyerId,
      shareClassId,
      numberOfShares,
      pricePerShare,
      documents,
      notes,
      createdBy
    } = requestData;

    // Calculate total amount
    const totalAmount = numberOfShares * pricePerShare;

    const transferRequest = {
      requestId: requestData.requestId || `TR-${uuidv4().slice(0, 8).toUpperCase()}`,
      companyId,
      sellerId,
      buyerId,
      shareClassId,
      numberOfShares,
      pricePerShare,
      totalAmount,
      status: 'pending',
      requestedAt: new Date(),
      documents: documents || [],
      notes,
      createdBy,
      rofrStatus: 'not_applicable'
    };

    return await databaseAdapter.create('TransferRequest', transferRequest);
  }

  /**
   * Submit a transfer request for approval
   * @param {string} requestId - Transfer request ID
   * @returns {Object} Updated transfer request
   */
  static async submitForApproval(requestId) {
    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be submitted for approval');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      { status: 'under_review' },
      { new: true }
    );
  }

  /**
   * Approve a transfer request
   * @param {Object} approvalData - Approval data including approverId, approverRole, comments
   * @returns {Object} Result containing updated request and approval record
   */
  static async approveTransfer(approvalData) {
    const { requestId, approverId, approverRole, comments } = approvalData;

    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    if (request.status !== 'under_review') {
      throw new Error('Only requests under review can be approved');
    }

    // Create approval record
    const approval = await databaseAdapter.create('TransferApproval', {
      approvalId: `AP-${uuidv4().slice(0, 8).toUpperCase()}`,
      requestId,
      approverId,
      approverRole,
      decision: 'approved',
      comments,
      decidedAt: new Date()
    });

    // Update request status
    const updatedRequest = await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: approverId
      },
      { new: true }
    );

    return {
      request: updatedRequest,
      approval
    };
  }

  /**
   * Reject a transfer request
   * @param {Object} rejectionData - Rejection data including approverId, approverRole, rejectionReason
   * @returns {Object} Result containing updated request and approval record
   */
  static async rejectTransfer(rejectionData) {
    const { requestId, approverId, approverRole, comments, rejectionReason } = rejectionData;

    if (!rejectionReason) {
      throw new Error('Rejection reason is required');
    }

    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    if (request.status !== 'under_review') {
      throw new Error('Only requests under review can be rejected');
    }

    // Create rejection record
    const approval = await databaseAdapter.create('TransferApproval', {
      approvalId: `AP-${uuidv4().slice(0, 8).toUpperCase()}`,
      requestId,
      approverId,
      approverRole,
      decision: 'rejected',
      comments,
      decidedAt: new Date()
    });

    // Update request status
    const updatedRequest = await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      {
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: approverId
      },
      { new: true }
    );

    return {
      request: updatedRequest,
      approval
    };
  }

  /**
   * Request changes to a transfer request
   * @param {Object} changeRequestData - Change request data including conditions
   * @returns {Object} Result containing updated request and approval record
   */
  static async requestChanges(changeRequestData) {
    const { requestId, approverId, approverRole, comments, conditions } = changeRequestData;

    if (!conditions && !comments) {
      throw new Error('Conditions or comments are required');
    }

    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    if (request.status !== 'under_review') {
      throw new Error('Only requests under review can have changes requested');
    }

    // Create change request record
    const approval = await databaseAdapter.create('TransferApproval', {
      approvalId: `AP-${uuidv4().slice(0, 8).toUpperCase()}`,
      requestId,
      approverId,
      approverRole,
      decision: 'requested_changes',
      comments,
      conditions: conditions || [],
      decidedAt: new Date()
    });

    // Update request status back to pending for modifications
    const updatedRequest = await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      {
        status: 'pending',
        reviewedAt: new Date(),
        reviewedBy: approverId
      },
      { new: true }
    );

    return {
      request: updatedRequest,
      approval
    };
  }

  /**
   * Execute an approved transfer
   * @param {string} requestId - Transfer request ID
   * @returns {Object} Updated transfer request
   */
  static async executeTransfer(requestId) {
    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    if (request.status !== 'approved') {
      throw new Error('Only approved requests can be executed');
    }

    // In a real implementation, this would:
    // 1. Update seller's share count
    // 2. Update buyer's share count
    // 3. Create transaction records
    // 4. Update cap table

    return await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      {
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Check ROFR (Right of First Refusal) eligibility for a transfer
   * @param {string} requestId - Transfer request ID
   * @returns {Object} ROFR eligibility information
   */
  static async checkRofrEligibility(requestId) {
    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    // Find stakeholders with ROFR rights for this share class
    // This is a simplified implementation
    const eligibleParties = await databaseAdapter.find(
      'Stakeholder',
      {
        companyId: request.companyId,
        hasRofrRights: true
      }
    ) || [];

    const isEligible = eligibleParties.length > 0;
    const expirationDate = isEligible
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      : null;

    return {
      requestId,
      isEligible,
      eligibleParties: eligibleParties.map(p => p._id || p.stakeholderId),
      expirationDate,
      shareClassId: request.shareClassId,
      numberOfShares: request.numberOfShares
    };
  }

  /**
   * Get approval history for a transfer request
   * @param {string} requestId - Transfer request ID
   * @returns {Array} List of approval records
   */
  static async getApprovalHistory(requestId) {
    return await databaseAdapter.find(
      'TransferApproval',
      { requestId },
      { sort: { decidedAt: -1 } }
    );
  }

  /**
   * Get a transfer request by requestId
   * @param {string} requestId - Transfer request ID
   * @returns {Object} Transfer request
   */
  static async getTransferRequest(requestId) {
    return await databaseAdapter.findOne('TransferRequest', { requestId });
  }

  /**
   * Get all transfer requests for a company
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters (status, etc.)
   * @returns {Array} List of transfer requests
   */
  static async getTransferRequestsByCompany(companyId, filters = {}) {
    const query = { companyId, ...filters };
    return await databaseAdapter.find(
      'TransferRequest',
      query,
      { sort: { requestedAt: -1 } }
    );
  }

  /**
   * Cancel a transfer request
   * @param {string} requestId - Transfer request ID
   * @param {string} userId - User requesting cancellation
   * @returns {Object} Updated transfer request
   */
  static async cancelTransferRequest(requestId, userId) {
    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    if (['completed', 'rejected'].includes(request.status)) {
      throw new Error('Completed or rejected requests cannot be canceled');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      {
        status: 'canceled',
        updatedBy: userId
      },
      { new: true }
    );
  }

  /**
   * Update ROFR status for a transfer request
   * @param {string} requestId - Transfer request ID
   * @param {string} rofrStatus - New ROFR status
   * @returns {Object} Updated transfer request
   */
  static async updateRofrStatus(requestId, rofrStatus) {
    if (!VALID_ROFR_STATUSES.includes(rofrStatus)) {
      throw new Error(`Invalid ROFR status. Must be one of: ${VALID_ROFR_STATUSES.join(', ')}`);
    }

    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      throw new Error('Transfer request not found');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      { rofrStatus },
      { new: true }
    );
  }
}

module.exports = TransferApprovalService;
