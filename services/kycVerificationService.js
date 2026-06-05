/**
 * KYC Verification Service
 * Feature: KYC/Accredited Investor Verification Enforcement
 *
 * Business logic for accredited investor verification, self-certification,
 * document-based review, and accreditation lifecycle management.
 */
const { v4: uuidv4 } = require('uuid');
const KYCVerification = require('../models/KYCVerification');
const KYCAuditLog = require('../models/KYCAuditLog');
const Investor = require('../models/Investor');

// 12-month expiry window for accreditation
const ACCREDITATION_VALIDITY_DAYS = 365;

/**
 * Check whether an investor currently holds valid accreditation.
 * If the accreditation has expired, the Investor record is updated
 * to reflect the new status and an audit entry is written.
 *
 * @param {string} investorId
 * @returns {Object} { isAccredited, status, expiresAt, daysUntilExpiry, verificationId }
 */
async function checkAccreditationStatus(investorId) {
  const investor = await Investor.findOne({ investorId });
  if (!investor) {
    return {
      isAccredited: false,
      status: 'not_found',
      expiresAt: null,
      daysUntilExpiry: null,
      verificationId: null
    };
  }

  const accreditedField = investor.accreditedInvestor === true;
  const expiresAt = investor.accreditationExpiryDate
    ? new Date(investor.accreditationExpiryDate)
    : null;

  // If marked accredited but expiry has passed, transition to expired
  if (accreditedField && expiresAt && expiresAt < new Date()) {
    await Investor.updateByInvestorId(investorId, {
      accreditedInvestor: false
    });

    await KYCAuditLog.create({
      investorId,
      companyId: investor.companyId,
      action: 'accreditation_expired',
      outcome: 'blocked',
      reason: `Accreditation expired on ${expiresAt.toISOString()}`
    });

    return {
      isAccredited: false,
      status: 'expired',
      expiresAt: expiresAt.toISOString(),
      daysUntilExpiry: 0,
      verificationId: investor.kycVerificationId || null
    };
  }

  if (!accreditedField) {
    return {
      isAccredited: false,
      status: 'not_verified',
      expiresAt: null,
      daysUntilExpiry: null,
      verificationId: investor.kycVerificationId || null
    };
  }

  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    isAccredited: true,
    status: 'verified',
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    daysUntilExpiry,
    verificationId: investor.kycVerificationId || null
  };
}

/**
 * Submit a self-certification questionnaire.
 * For 506(b) offerings this auto-approves; for 506(c) it remains submitted.
 *
 * @param {string} investorId
 * @param {string} companyId
 * @param {Object} certData - { investorType, attestations }
 * @returns {Object} Created KYCVerification record
 */
async function submitSelfCertification(investorId, companyId, certData) {
  if (!certData || !certData.investorType) {
    throw new Error('Self-certification requires investorType');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCREDITATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const verificationData = {
    verificationId: `kyc_${uuidv4()}`,
    investorId,
    companyId,
    verificationType: 'self_certification',
    offeringType: '506b',
    status: 'approved', // Self-cert auto-approves for 506(b)
    submittedAt: now.toISOString(),
    reviewedAt: now.toISOString(),
    reviewedBy: 'system_auto_approve',
    expiresAt: expiresAt.toISOString(),
    selfCertification: {
      investorType: certData.investorType,
      attestations: certData.attestations || [],
      attestedAt: now.toISOString()
    }
  };

  const verification = await KYCVerification.create(verificationData);

  // Update denormalized fields on the Investor record
  await Investor.updateByInvestorId(investorId, {
    accreditedInvestor: true,
    accreditationMethod: certData.investorType,
    accreditationVerifiedDate: now.toISOString(),
    accreditationExpiryDate: expiresAt.toISOString(),
    kycVerificationId: verification.verificationId
  });

  await KYCAuditLog.create({
    investorId,
    companyId,
    action: 'verification_submitted',
    verificationId: verification.verificationId,
    outcome: 'passed',
    reason: 'Self-certification auto-approved for 506(b)'
  });

  return verification;
}

/**
 * Submit documents for third-party or document-based verification.
 * Creates a verification in "submitted" status that requires manual review.
 *
 * @param {string} investorId
 * @param {string} companyId
 * @param {Array} documents - [{ name, url, type }]
 * @param {string} offeringType - '506b' | '506c' | 'general'
 * @returns {Object} Created KYCVerification record
 */
async function submitDocumentVerification(investorId, companyId, documents, offeringType = '506c') {
  if (!documents || documents.length === 0) {
    throw new Error('At least one document is required for document verification');
  }

  const now = new Date();
  const verificationData = {
    verificationId: `kyc_${uuidv4()}`,
    investorId,
    companyId,
    verificationType: 'document_review',
    offeringType,
    status: 'submitted',
    submittedAt: now.toISOString(),
    documents
  };

  const verification = await KYCVerification.create(verificationData);

  await KYCAuditLog.create({
    investorId,
    companyId,
    action: 'verification_submitted',
    verificationId: verification.verificationId,
    outcome: 'warning',
    reason: 'Document verification submitted, awaiting review'
  });

  return verification;
}

/**
 * Approve a pending verification. Sets a 12-month expiry and
 * updates the Investor record with accredited status.
 *
 * @param {string} verificationId
 * @param {string} reviewerId
 * @param {string} note - Optional reviewer note
 * @returns {Object} Updated KYCVerification record
 */
async function approveVerification(verificationId, reviewerId, note) {
  const verification = await KYCVerification.findOne({ verificationId });
  if (!verification) {
    throw new Error('Verification not found');
  }

  if (verification.status === 'approved') {
    throw new Error('Verification is already approved');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCREDITATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const reviewNotes = [...(verification.reviewNotes || [])];
  if (note) {
    reviewNotes.push({ reviewerId, note, createdAt: now.toISOString() });
  }

  await KYCVerification.updateOne(
    { verificationId },
    {
      $set: {
        status: 'approved',
        reviewedAt: now.toISOString(),
        reviewedBy: reviewerId,
        expiresAt: expiresAt.toISOString(),
        reviewNotes,
        updatedAt: now.toISOString()
      }
    }
  );

  // Update Investor denormalized fields
  await Investor.updateByInvestorId(verification.investorId, {
    accreditedInvestor: true,
    accreditationVerifiedDate: now.toISOString(),
    accreditationExpiryDate: expiresAt.toISOString(),
    kycVerificationId: verificationId
  });

  await KYCAuditLog.create({
    investorId: verification.investorId,
    companyId: verification.companyId,
    action: 'verification_approved',
    verificationId,
    outcome: 'passed',
    reason: note || 'Verification approved by reviewer'
  });

  return KYCVerification.findOne({ verificationId });
}

/**
 * Reject a pending verification and update the Investor record.
 *
 * @param {string} verificationId
 * @param {string} reviewerId
 * @param {string} reason - Reason for rejection
 * @returns {Object} Updated KYCVerification record
 */
async function rejectVerification(verificationId, reviewerId, reason) {
  const verification = await KYCVerification.findOne({ verificationId });
  if (!verification) {
    throw new Error('Verification not found');
  }

  const now = new Date();

  await KYCVerification.updateOne(
    { verificationId },
    {
      $set: {
        status: 'rejected',
        reviewedAt: now.toISOString(),
        reviewedBy: reviewerId,
        rejectionReason: reason || 'No reason provided',
        updatedAt: now.toISOString()
      }
    }
  );

  // Update Investor — mark as not accredited
  await Investor.updateByInvestorId(verification.investorId, {
    accreditedInvestor: false
  });

  await KYCAuditLog.create({
    investorId: verification.investorId,
    companyId: verification.companyId,
    action: 'verification_rejected',
    verificationId,
    outcome: 'blocked',
    reason: reason || 'Verification rejected'
  });

  return KYCVerification.findOne({ verificationId });
}

module.exports = {
  checkAccreditationStatus,
  submitSelfCertification,
  submitDocumentVerification,
  approveVerification,
  rejectVerification,
  ACCREDITATION_VALIDITY_DAYS
};
