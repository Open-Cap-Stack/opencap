/**
 * KYCVerification Model
 * Feature: KYC/Accredited Investor Verification Enforcement
 *
 * Tracks investor verification submissions, reviews, and approval status
 * for SEC Regulation D compliance (506(b) and 506(c) offerings).
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const baseModel = createModel('kyc_verifications');

// Allowed verification types
const VERIFICATION_TYPES = ['self_certification', 'document_review', 'third_party_letter'];

// Offering types requiring accreditation checks
const OFFERING_TYPES = ['506b', '506c', 'general'];

// Verification lifecycle statuses
const STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'info_requested', 'expired'];

const KYCVerification = {
  VERIFICATION_TYPES,
  OFFERING_TYPES,
  STATUSES,

  async create(data) {
    const now = new Date().toISOString();
    const record = {
      verificationId: data.verificationId || `kyc_${uuidv4()}`,
      investorId: data.investorId,
      companyId: data.companyId,
      verificationType: data.verificationType || 'self_certification',
      offeringType: data.offeringType || 'general',
      status: data.status || 'draft',
      submittedAt: data.submittedAt || null,
      reviewedAt: data.reviewedAt || null,
      reviewedBy: data.reviewedBy || null,
      expiresAt: data.expiresAt || null,
      selfCertification: data.selfCertification || null,
      documents: data.documents || [],
      reviewNotes: data.reviewNotes || [],
      rejectionReason: data.rejectionReason || null,
      createdAt: now,
      updatedAt: now
    };
    return baseModel.create(record);
  },

  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel)
};

module.exports = KYCVerification;
