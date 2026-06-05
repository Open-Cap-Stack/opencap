/**
 * KYC Verification Middleware
 * Feature: KYC/Accredited Investor Verification Enforcement
 *
 * Express middleware factories that gate investment routes behind
 * accredited investor verification checks.
 */
const { checkAccreditationStatus } = require('../services/kycVerificationService');
const KYCVerification = require('../models/KYCVerification');
const KYCAuditLog = require('../models/KYCAuditLog');

// Roles that bypass investor accreditation checks
const BYPASS_ROLES = ['super_admin', 'admin', 'founder', 'manager', 'accountant', 'employee', 'service_provider'];

/**
 * Factory that returns middleware requiring accredited investor status.
 * Non-investor roles (admin, founder, etc.) pass through without checks.
 *
 * @param {string} offeringType - 'safe' | 'spv' | 'securities'
 * @returns {Function} Express middleware
 */
function requireAccreditation(offeringType) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Non-investor roles pass through
      if (user.role && BYPASS_ROLES.includes(user.role)) {
        return next();
      }

      // Investor role requires accreditation check
      const investorId = user.investorId || user.userId || user.id;
      if (!investorId) {
        return res.status(403).json({
          success: false,
          error: 'Investor identity not found on request'
        });
      }

      const status = await checkAccreditationStatus(investorId);

      if (!status.isAccredited) {
        // Log the blocked attempt
        await KYCAuditLog.create({
          investorId,
          companyId: user.companyId || null,
          action: 'investment_blocked',
          offeringType,
          outcome: 'blocked',
          reason: `Accreditation status: ${status.status}`
        });

        return res.status(403).json({
          success: false,
          error: 'Accredited investor verification required',
          accreditationStatus: status.status,
          verificationId: status.verificationId
        });
      }

      // Log the allowed access
      await KYCAuditLog.create({
        investorId,
        companyId: user.companyId || null,
        action: 'investment_allowed',
        offeringType,
        outcome: 'passed',
        reason: `Accreditation valid, expires ${status.expiresAt || 'N/A'}`
      });

      // Attach accreditation info to request for downstream use
      req.accreditationStatus = status;
      return next();
    } catch (err) {
      console.error('KYC middleware error:', err.message);
      return res.status(500).json({ success: false, error: 'Accreditation check failed' });
    }
  };
}

/**
 * Middleware for 506(c) offerings: requires document_review or third_party_letter
 * verification type (self-certification alone is insufficient for 506(c)).
 */
async function require506cVerification(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Non-investor roles pass through
    if (user.role && BYPASS_ROLES.includes(user.role)) {
      return next();
    }

    const investorId = user.investorId || user.userId || user.id;
    if (!investorId) {
      return res.status(403).json({ success: false, error: 'Investor identity not found' });
    }

    const status = await checkAccreditationStatus(investorId);
    if (!status.isAccredited) {
      return res.status(403).json({
        success: false,
        error: 'Accredited investor verification required for 506(c) offering',
        accreditationStatus: status.status
      });
    }

    // For 506(c), check that verification type is document_review or third_party_letter
    if (status.verificationId) {
      const verification = await KYCVerification.findOne({ verificationId: status.verificationId });
      if (verification) {
        const validTypes = ['document_review', 'third_party_letter'];
        if (!validTypes.includes(verification.verificationType)) {
          return res.status(403).json({
            success: false,
            error: '506(c) offerings require document review or third-party letter verification',
            currentVerificationType: verification.verificationType
          });
        }
      }
    }

    req.accreditationStatus = status;
    return next();
  } catch (err) {
    console.error('506(c) verification middleware error:', err.message);
    return res.status(500).json({ success: false, error: 'Verification check failed' });
  }
}

/**
 * Middleware that restricts SPV access to investor and founder roles only.
 */
function requireSPVRoleEligibility(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const eligibleRoles = ['investor', 'founder', 'super_admin', 'admin'];
  if (user.role && eligibleRoles.includes(user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'SPV access restricted to investors and founders'
  });
}

module.exports = {
  requireAccreditation,
  require506cVerification,
  requireSPVRoleEligibility
};
