/**
 * KYC Controller
 * Feature: KYC/Accredited Investor Verification Enforcement
 *
 * Handles investor self-certification, document submission, verification
 * review, and audit log retrieval for SEC Regulation D compliance.
 */
const kycService = require('../services/kycVerificationService');
const KYCVerification = require('../models/KYCVerification');
const KYCAuditLog = require('../models/KYCAuditLog');

/**
 * POST /kyc/self-certify
 * Submit a self-certification questionnaire (auto-approves for 506(b))
 */
exports.submitSelfCertification = async (req, res) => {
  try {
    const { investorId, companyId, investorType, attestations } = req.body;
    if (!investorId) {
      return res.status(400).json({ success: false, error: 'investorId is required' });
    }

    const effectiveCompanyId = companyId || req.user?.companyId;
    if (!effectiveCompanyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const verification = await kycService.submitSelfCertification(
      investorId,
      effectiveCompanyId,
      { investorType, attestations }
    );

    return res.status(201).json({ success: true, data: verification });
  } catch (err) {
    console.error('Self-certification error:', err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * POST /kyc/documents
 * Submit documents for verification (requires manual review)
 */
exports.submitDocuments = async (req, res) => {
  try {
    const { investorId, companyId, documents, offeringType } = req.body;
    if (!investorId) {
      return res.status(400).json({ success: false, error: 'investorId is required' });
    }

    const effectiveCompanyId = companyId || req.user?.companyId;
    if (!effectiveCompanyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const verification = await kycService.submitDocumentVerification(
      investorId,
      effectiveCompanyId,
      documents,
      offeringType
    );

    return res.status(201).json({ success: true, data: verification });
  } catch (err) {
    console.error('Document submission error:', err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * GET /kyc/status/:investorId
 * Check current accreditation status for an investor
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { investorId } = req.params;
    if (!investorId) {
      return res.status(400).json({ success: false, error: 'investorId is required' });
    }

    const status = await kycService.checkAccreditationStatus(investorId);
    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    console.error('Status check error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /kyc/history/:investorId
 * Get all verification records for an investor
 */
exports.getVerificationHistory = async (req, res) => {
  try {
    const { investorId } = req.params;
    if (!investorId) {
      return res.status(400).json({ success: false, error: 'investorId is required' });
    }

    const verifications = await KYCVerification.find({ investorId });
    return res.status(200).json({ success: true, data: verifications });
  } catch (err) {
    console.error('History fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /kyc/review/:verificationId
 * Approve or reject a pending verification
 */
exports.reviewVerification = async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { action, note, reason } = req.body;
    const reviewerId = req.user?.userId || req.user?.id;

    if (!verificationId) {
      return res.status(400).json({ success: false, error: 'verificationId is required' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be "approve" or "reject"' });
    }

    let result;
    if (action === 'approve') {
      result = await kycService.approveVerification(verificationId, reviewerId, note);
    } else {
      if (!reason) {
        return res.status(400).json({ success: false, error: 'reason is required for rejection' });
      }
      result = await kycService.rejectVerification(verificationId, reviewerId, reason);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Review error:', err.message);
    const statusCode = err.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

/**
 * GET /kyc/pending
 * List all verifications in submitted or under_review status
 */
exports.listPendingVerifications = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;

    const all = await KYCVerification.find(filter);
    const pending = all.filter(v => ['submitted', 'under_review'].includes(v.status));

    return res.status(200).json({ success: true, data: pending });
  } catch (err) {
    console.error('Pending list error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /kyc/audit-log
 * Retrieve KYC audit log entries, optionally filtered by investorId or companyId
 */
exports.getAuditLog = async (req, res) => {
  try {
    const { investorId, companyId } = req.query;
    const filter = {};
    if (investorId) filter.investorId = investorId;
    if (companyId) filter.companyId = companyId;

    const logs = await KYCAuditLog.find(filter);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error('Audit log error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
