/**
 * TransferApproval Controller
 * Issue #104: Build Transfer Approval Workflow
 *
 * API controller for managing transfer approval workflow including:
 * - CRUD operations for transfer requests
 * - Approval, rejection, and change request handling
 * - ROFR eligibility checking
 * - Transfer execution
 */
const TransferApprovalService = require('../services/transferApprovalService');
const databaseAdapter = require('../services/databaseAdapter');

/**
 * Create a new transfer request
 */
exports.createTransferRequest = async (req, res) => {
  try {
    const result = await TransferApprovalService.createTransferRequest(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get transfer request by ID
 */
exports.getTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await TransferApprovalService.getTransferRequest(requestId);

    if (!result) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all transfer requests for a company
 */
exports.getTransferRequestsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.sellerId) {
      filters.sellerId = req.query.sellerId;
    }
    if (req.query.buyerId) {
      filters.buyerId = req.query.buyerId;
    }

    const result = await TransferApprovalService.getTransferRequestsByCompany(companyId, filters);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update transfer request
 */
exports.updateTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be modified' });
    }

    // Recalculate totalAmount if shares or price changed
    const updateData = { ...req.body };
    if (updateData.numberOfShares || updateData.pricePerShare) {
      const numberOfShares = updateData.numberOfShares || request.numberOfShares;
      const pricePerShare = updateData.pricePerShare || request.pricePerShare;
      updateData.totalAmount = numberOfShares * pricePerShare;
    }

    const result = await databaseAdapter.findByIdAndUpdate(
      'TransferRequest',
      request._id,
      updateData,
      { new: true }
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete transfer request
 */
exports.deleteTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await databaseAdapter.findOne('TransferRequest', { requestId });

    if (!request) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (!['pending', 'canceled'].includes(request.status)) {
      return res.status(400).json({ error: 'Only pending or canceled requests can be deleted' });
    }

    await databaseAdapter.findByIdAndDelete('TransferRequest', request._id);
    res.status(200).json({ message: 'Transfer request deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Submit transfer request for approval
 */
exports.submitForApproval = async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await TransferApprovalService.submitForApproval(requestId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Approve transfer request
 */
exports.approveTransfer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approverId, approverRole, comments } = req.body;

    const result = await TransferApprovalService.approveTransfer({
      requestId,
      approverId,
      approverRole,
      comments
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Reject transfer request
 */
exports.rejectTransfer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approverId, approverRole, comments, rejectionReason } = req.body;

    const result = await TransferApprovalService.rejectTransfer({
      requestId,
      approverId,
      approverRole,
      comments,
      rejectionReason
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Request changes to transfer request
 */
exports.requestChanges = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approverId, approverRole, comments, conditions } = req.body;

    const result = await TransferApprovalService.requestChanges({
      requestId,
      approverId,
      approverRole,
      comments,
      conditions
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Execute approved transfer
 */
exports.executeTransfer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await TransferApprovalService.executeTransfer(requestId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Check ROFR eligibility
 */
exports.checkRofrEligibility = async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await TransferApprovalService.checkRofrEligibility(requestId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get approval history for a transfer request
 */
exports.getApprovalHistory = async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await TransferApprovalService.getApprovalHistory(requestId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel transfer request
 */
exports.cancelTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;
    const result = await TransferApprovalService.cancelTransferRequest(requestId, userId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update ROFR status
 */
exports.updateRofrStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rofrStatus } = req.body;
    const result = await TransferApprovalService.updateRofrStatus(requestId, rofrStatus);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transfer request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};
