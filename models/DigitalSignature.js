/**
 * DigitalSignature Model
 * Issue #100: Build Digital Signature Workflow
 *
 * Data model for managing digital signature workflows with support for:
 * - Multiple signature providers (DocuSign, HelloSign, internal)
 * - Multiple signers with sequential or parallel signing
 * - Comprehensive audit trail
 * - Status tracking and expiration
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid enums
const SIGNER_ROLES = ['investor', 'company_representative', 'witness', 'legal_counsel', 'board_member'];
const SIGNER_STATUSES = ['pending', 'sent', 'viewed', 'signed', 'declined', 'expired'];
const SIGNATURE_STATUSES = ['draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled', 'voided'];
const SIGNING_ORDERS = ['parallel', 'sequential'];
const DOCUMENT_TYPES = ['safe', 'stock_option_agreement', 'board_consent', 'employment_agreement', 'nda', 'investor_agreement', 'other'];
const DOCUMENT_MODELS = ['SAFE', 'Document', 'EquityGrant', 'Contract'];
const PROVIDERS = ['internal', 'docusign', 'hellosign', 'pandadoc'];
const AUDIT_EVENTS = ['created', 'sent', 'viewed', 'signed', 'declined', 'reminder_sent', 'expired', 'cancelled', 'completed', 'document_downloaded', 'voided'];

// Schema definition for documentation and validation
const digitalSignatureSchema = {
  signatureId: { type: 'string', required: true, unique: true },
  documentId: { type: 'string', required: true },
  documentType: { type: 'string', required: true, enum: DOCUMENT_TYPES },
  documentModel: { type: 'string', enum: DOCUMENT_MODELS, default: 'Document' },
  companyId: { type: 'string', required: true },
  title: { type: 'string', required: true },
  message: { type: 'string', default: '' },
  signers: { type: 'array', default: [] },
  signingOrder: { type: 'string', enum: SIGNING_ORDERS, default: 'parallel' },
  status: { type: 'string', enum: SIGNATURE_STATUSES, default: 'draft' },
  requestedAt: { type: 'date', default: null },
  sentAt: { type: 'date', default: null },
  completedAt: { type: 'date', default: null },
  expiresAt: { type: 'date', default: null },
  cancelledAt: { type: 'date', default: null },
  voidedAt: { type: 'date', default: null },
  originalDocument: { type: 'object', default: null },
  signedDocument: { type: 'object', default: null },
  provider: { type: 'string', enum: PROVIDERS, default: 'internal' },
  externalSignatureId: { type: 'string', default: null },
  externalData: { type: 'object', default: {} },
  auditTrail: { type: 'array', default: [] },
  settings: {
    type: 'object',
    default: {
      reminderEnabled: true,
      reminderDays: 3,
      maxReminders: 3,
      expirationDays: 30,
      requireInitials: false,
      allowDecline: true
    }
  },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', required: true },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('digital_signatures', digitalSignatureSchema);

// Extended DigitalSignature model with business logic
const DigitalSignature = {
  ...baseModel,
  tableName: 'digital_signatures',
  schema: digitalSignatureSchema,

  // Export constants
  SIGNER_ROLES,
  SIGNER_STATUSES,
  SIGNATURE_STATUSES,
  SIGNING_ORDERS,
  DOCUMENT_TYPES,
  DOCUMENT_MODELS,
  PROVIDERS,
  AUDIT_EVENTS,

  /**
   * Create a new digital signature with defaults
   * @param {Object} data - Signature data
   * @returns {Object} Created signature
   */
  async create(data) {
    if (!data.signatureId) {
      data.signatureId = `SIG-${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    if (!data.settings) {
      data.settings = {
        reminderEnabled: true,
        reminderDays: 3,
        maxReminders: 3,
        expirationDays: 30,
        requireInitials: false,
        allowDecline: true
      };
    }

    if (!data.status) {
      data.status = 'draft';
    }

    // Add creation audit event
    if (!data.auditTrail) {
      data.auditTrail = [];
    }
    data.auditTrail.push({
      event: 'created',
      timestamp: new Date().toISOString(),
      userId: data.createdBy
    });

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find signature by signatureId
   * @param {string} signatureId - Signature ID
   * @returns {Object|null} Signature or null
   */
  async findBySignatureId(signatureId) {
    return baseModel.findOne.call(baseModel, { signatureId });
  },

  /**
   * Find signatures by company
   * @param {string} companyId - Company ID
   * @param {string} status - Optional status filter
   * @returns {Array} Signatures for company
   */
  async findByCompany(companyId, status = null) {
    const query = { companyId };
    if (status) query.status = status;
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find signatures by signer email
   * @param {string} email - Signer email
   * @returns {Array} Signatures for signer
   */
  async findBySigner(email) {
    const all = await baseModel.find.call(baseModel, {});
    return all.filter(sig => sig.signers && sig.signers.some(s => s.email === email));
  },

  /**
   * Find pending signatures for a signer
   * @param {string} email - Signer email
   * @returns {Array} Pending signatures
   */
  async findPendingSignatures(email) {
    const all = await baseModel.find.call(baseModel, { status: { $in: ['sent', 'in_progress'] } });
    return all.filter(sig =>
      sig.signers && sig.signers.some(s => s.email === email && ['sent', 'viewed'].includes(s.status))
    );
  },

  /**
   * Find expired signatures
   * @returns {Array} Expired signatures
   */
  async findExpired() {
    const now = new Date().toISOString();
    const all = await baseModel.find.call(baseModel, { status: { $in: ['sent', 'in_progress'] } });
    return all.filter(sig => sig.expiresAt && sig.expiresAt < now);
  },

  /**
   * Find by external ID
   * @param {string} externalSignatureId - External ID
   * @returns {Object|null} Signature or null
   */
  async findByExternalId(externalSignatureId) {
    return baseModel.findOne.call(baseModel, { externalSignatureId });
  },

  /**
   * Add audit event to signature
   * @param {Object} signature - Signature object
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @returns {Object} Updated signature
   */
  addAuditEvent(signature, event, data = {}) {
    if (!signature.auditTrail) {
      signature.auditTrail = [];
    }
    signature.auditTrail.push({
      event,
      timestamp: new Date().toISOString(),
      ...data
    });
    return signature;
  },

  /**
   * Check if signature is complete
   * @param {Object} signature - Signature object
   * @returns {boolean} True if complete
   */
  isComplete(signature) {
    return signature.signers && signature.signers.every(s => s.status === 'signed');
  },

  /**
   * Get pending signers
   * @param {Object} signature - Signature object
   * @returns {Array} Pending signers
   */
  getPendingSigners(signature) {
    return signature.signers ? signature.signers.filter(s => !['signed', 'declined'].includes(s.status)) : [];
  },

  /**
   * Get signed count
   * @param {Object} signature - Signature object
   * @returns {number} Number of signed signers
   */
  getSignedCount(signature) {
    return signature.signers ? signature.signers.filter(s => s.status === 'signed').length : 0;
  },

  /**
   * Get progress percentage
   * @param {Object} signature - Signature object
   * @returns {number} Progress percentage
   */
  getProgress(signature) {
    if (!signature.signers || signature.signers.length === 0) return 0;
    return Math.round((this.getSignedCount(signature) / signature.signers.length) * 100);
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

module.exports = DigitalSignature;
