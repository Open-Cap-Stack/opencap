/**
 * KYC Routes
 * Feature: KYC/Accredited Investor Verification Enforcement
 *
 * API routes for investor accreditation self-certification,
 * document submission, review workflow, and audit trail.
 */
const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/kycController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// All KYC routes require authentication
router.use(authenticateToken);

// ── Investor-facing endpoints ──────────────────────────────────────────────

// Submit self-certification questionnaire
router.post(
  '/self-certify',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'investor']),
  kycController.submitSelfCertification
);

// Submit documents for verification
router.post(
  '/documents',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'investor']),
  kycController.submitDocuments
);

// Check own verification status (logged-in user)
router.get(
  '/status',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'investor']),
  (req, res, next) => { req.params.investorId = req.user?.userId || req.user?.id; next(); },
  kycController.getVerificationStatus
);

// Check verification status for a specific investor
router.get(
  '/status/:investorId',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'investor']),
  kycController.getVerificationStatus
);

// Get own verification history
router.get(
  '/history',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'investor']),
  (req, res, next) => { req.params.investorId = req.user?.userId || req.user?.id; next(); },
  kycController.getVerificationHistory
);

// Get verification history for a specific investor
router.get(
  '/history/:investorId',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'investor']),
  kycController.getVerificationHistory
);

// ── Admin / reviewer endpoints ─────────────────────────────────────────────

// Review (approve/reject) a verification
router.patch(
  '/review/:verificationId',
  hasRole(['super_admin', 'admin', 'founder']),
  kycController.reviewVerification
);

// List all pending verifications
router.get(
  '/pending',
  hasRole(['super_admin', 'admin', 'founder']),
  kycController.listPendingVerifications
);

// Get audit log
router.get(
  '/audit-log',
  hasRole(['super_admin', 'admin', 'founder']),
  kycController.getAuditLog
);

module.exports = router;
