/**
 * KYCAuditLog Model
 * Feature: KYC/Accredited Investor Verification Enforcement
 *
 * Immutable audit trail for all accreditation-related decisions,
 * investment gate checks, and verification lifecycle events.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const baseModel = createModel('kyc_audit_logs');

// Audit actions
const ACTIONS = [
  'investment_blocked',
  'investment_allowed',
  'verification_submitted',
  'verification_approved',
  'verification_rejected',
  'accreditation_expired'
];

// Offering types that trigger audit entries
const OFFERING_TYPES = ['safe', 'spv', 'securities'];

// Outcome values
const OUTCOMES = ['passed', 'blocked', 'warning'];

const KYCAuditLog = {
  ACTIONS,
  OFFERING_TYPES,
  OUTCOMES,

  async create(data) {
    const now = new Date().toISOString();
    const record = {
      auditId: data.auditId || `kyc_audit_${uuidv4()}`,
      investorId: data.investorId,
      companyId: data.companyId || null,
      action: data.action,
      offeringType: data.offeringType || null,
      offeringId: data.offeringId || null,
      verificationId: data.verificationId || null,
      outcome: data.outcome,
      reason: data.reason || null,
      createdAt: now
    };
    return baseModel.create(record);
  },

  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel)
};

module.exports = KYCAuditLog;
