/**
 * DigitalSignature Model
 * Issue #100: Build Digital Signature Workflow
 *
 * Data model for managing digital signature workflows with support for:
 * - Multiple signature providers (DocuSign, HelloSign, internal)
 * - Multiple signers with sequential or parallel signing
 * - Comprehensive audit trail
 * - Status tracking and expiration
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Sub-schema for signature data captured when signer signs
const signatureDataSchema = new mongoose.Schema({
  signature: { type: String },        // Base64 encoded signature image
  initials: { type: String },         // Initials if required
  ipAddress: { type: String },        // IP address at time of signing
  userAgent: { type: String },        // Browser/device info
  timestamp: { type: Date }           // Exact moment of signature
}, { _id: false });

// Sub-schema for individual signers
const signerSchema = new mongoose.Schema({
  signerId: { type: String },                    // Reference to user if applicable
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: {
    type: String,
    enum: ['investor', 'company_representative', 'witness', 'legal_counsel', 'board_member'],
    required: true
  },
  order: { type: Number, default: 1 },           // Signing order for sequential signing
  status: {
    type: String,
    enum: ['pending', 'sent', 'viewed', 'signed', 'declined', 'expired'],
    default: 'pending'
  },
  sentAt: { type: Date },
  viewedAt: { type: Date },
  signedAt: { type: Date },
  declinedAt: { type: Date },
  declineReason: { type: String },
  signatureData: signatureDataSchema,
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: { type: Date }
}, { _id: true });

// Sub-schema for audit trail events
const auditEventSchema = new mongoose.Schema({
  event: {
    type: String,
    enum: [
      'created', 'sent', 'viewed', 'signed', 'declined',
      'reminder_sent', 'expired', 'cancelled', 'completed',
      'document_downloaded', 'voided'
    ],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  userId: { type: String },                      // User who triggered the event
  signerEmail: { type: String },                 // Signer involved (if applicable)
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed } // Additional event data
}, { _id: false });

// Sub-schema for document file references
const documentFileSchema = new mongoose.Schema({
  url: { type: String },
  filename: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  generatedAt: { type: Date }
}, { _id: false });

// Sub-schema for settings
const settingsSchema = new mongoose.Schema({
  reminderEnabled: { type: Boolean, default: true },
  reminderDays: { type: Number, default: 3 },
  maxReminders: { type: Number, default: 3 },
  expirationDays: { type: Number, default: 30 },
  requireInitials: { type: Boolean, default: false },
  allowDecline: { type: Boolean, default: true }
}, { _id: false });

// Main Digital Signature Schema
const digitalSignatureSchema = new mongoose.Schema({
  // Unique identifier
  signatureId: {
    type: String,
    unique: true,
    default: () => `SIG-${uuidv4().slice(0, 8).toUpperCase()}`,
    index: true
  },

  // Document reference
  documentId: { type: String, required: true, index: true },
  documentType: {
    type: String,
    enum: ['safe', 'stock_option_agreement', 'board_consent', 'employment_agreement', 'nda', 'investor_agreement', 'other'],
    required: true
  },
  documentModel: {
    type: String,
    enum: ['SAFE', 'Document', 'EquityGrant', 'Contract'],
    default: 'Document'
  },

  // Company reference
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Request details
  title: { type: String, required: true },
  message: { type: String },

  // Signers
  signers: [signerSchema],
  signingOrder: {
    type: String,
    enum: ['parallel', 'sequential'],
    default: 'parallel'
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled', 'voided'],
    default: 'draft',
    index: true
  },

  // Timestamps
  requestedAt: { type: Date },
  sentAt: { type: Date },
  completedAt: { type: Date },
  expiresAt: { type: Date },
  cancelledAt: { type: Date },
  voidedAt: { type: Date },

  // Document files
  originalDocument: documentFileSchema,
  signedDocument: documentFileSchema,

  // External provider integration
  provider: {
    type: String,
    enum: ['internal', 'docusign', 'hellosign', 'pandadoc'],
    default: 'internal'
  },
  externalSignatureId: { type: String, index: true },
  externalData: { type: mongoose.Schema.Types.Mixed },

  // Audit trail
  auditTrail: [auditEventSchema],

  // Settings
  settings: {
    type: settingsSchema,
    default: () => ({
      reminderEnabled: true,
      reminderDays: 3,
      maxReminders: 3,
      expirationDays: 30,
      requireInitials: false,
      allowDecline: true
    })
  },

  // Metadata and notes
  notes: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Audit fields
  createdBy: { type: String, required: true },
  updatedBy: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
digitalSignatureSchema.index({ companyId: 1, status: 1 });
digitalSignatureSchema.index({ status: 1, expiresAt: 1 });
digitalSignatureSchema.index({ 'signers.email': 1 });
digitalSignatureSchema.index({ documentId: 1, documentType: 1 });
digitalSignatureSchema.index({ provider: 1, externalSignatureId: 1 });

// Virtuals
digitalSignatureSchema.virtual('isComplete').get(function() {
  return this.signers.every(s => s.status === 'signed');
});

digitalSignatureSchema.virtual('pendingSigners').get(function() {
  return this.signers.filter(s => !['signed', 'declined'].includes(s.status));
});

digitalSignatureSchema.virtual('signedCount').get(function() {
  return this.signers.filter(s => s.status === 'signed').length;
});

digitalSignatureSchema.virtual('totalSigners').get(function() {
  return this.signers.length;
});

digitalSignatureSchema.virtual('progress').get(function() {
  if (this.signers.length === 0) return 0;
  return Math.round((this.signedCount / this.signers.length) * 100);
});

// Instance methods
digitalSignatureSchema.methods.addAuditEvent = function(event, data = {}) {
  this.auditTrail.push({
    event,
    timestamp: new Date(),
    ...data
  });
  return this;
};

digitalSignatureSchema.methods.send = async function(userId) {
  if (this.status !== 'draft') {
    throw new Error('Can only send requests in draft status');
  }

  this.status = 'sent';
  this.sentAt = new Date();
  this.expiresAt = new Date(Date.now() + (this.settings.expirationDays * 24 * 60 * 60 * 1000));
  this.updatedBy = userId;

  // Update all pending signers to sent
  this.signers.forEach(signer => {
    if (signer.status === 'pending') {
      signer.status = 'sent';
      signer.sentAt = new Date();
    }
  });

  this.addAuditEvent('sent', { userId });

  return this.save();
};

digitalSignatureSchema.methods.recordView = async function(signerEmail, ipAddress, userAgent) {
  const signer = this.signers.find(s => s.email === signerEmail);
  if (!signer) {
    throw new Error('Signer not found');
  }

  if (!signer.viewedAt) {
    signer.viewedAt = new Date();
    signer.status = 'viewed';

    this.addAuditEvent('viewed', { signerEmail, ipAddress, userAgent });

    return this.save();
  }

  return this;
};

digitalSignatureSchema.methods.recordSignature = async function(signerEmail, signatureData, ipAddress, userAgent) {
  const signer = this.signers.find(s => s.email === signerEmail);
  if (!signer) {
    throw new Error('Signer not found');
  }

  if (signer.status === 'signed') {
    throw new Error('Document already signed by this signer');
  }

  signer.status = 'signed';
  signer.signedAt = new Date();
  signer.signatureData = {
    ...signatureData,
    ipAddress,
    userAgent,
    timestamp: new Date()
  };

  this.addAuditEvent('signed', { signerEmail, ipAddress, userAgent });

  // Check if all signers have signed
  if (this.signers.every(s => s.status === 'signed')) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.addAuditEvent('completed', {});
  } else {
    this.status = 'in_progress';
  }

  return this.save();
};

digitalSignatureSchema.methods.recordDecline = async function(signerEmail, reason, ipAddress, userAgent) {
  const signer = this.signers.find(s => s.email === signerEmail);
  if (!signer) {
    throw new Error('Signer not found');
  }

  signer.status = 'declined';
  signer.declinedAt = new Date();
  signer.declineReason = reason;

  this.status = 'declined';
  this.addAuditEvent('declined', { signerEmail, reason, ipAddress, userAgent });

  return this.save();
};

digitalSignatureSchema.methods.cancel = async function(userId, reason) {
  if (['completed', 'cancelled', 'voided'].includes(this.status)) {
    throw new Error(`Cannot cancel request in ${this.status} status`);
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.updatedBy = userId;

  this.addAuditEvent('cancelled', { userId, reason });

  return this.save();
};

digitalSignatureSchema.methods.void = async function(userId, reason) {
  this.status = 'voided';
  this.voidedAt = new Date();
  this.updatedBy = userId;

  this.addAuditEvent('voided', { userId, reason });

  return this.save();
};

digitalSignatureSchema.methods.sendReminder = async function(signerEmail, userId) {
  const signer = this.signers.find(s => s.email === signerEmail);
  if (!signer) {
    throw new Error('Signer not found');
  }

  if (signer.status === 'signed') {
    throw new Error('Signer has already signed');
  }

  if (signer.remindersSent >= this.settings.maxReminders) {
    throw new Error('Maximum reminders already sent');
  }

  signer.remindersSent += 1;
  signer.lastReminderAt = new Date();

  this.addAuditEvent('reminder_sent', { signerEmail, userId, reminderCount: signer.remindersSent });

  return this.save();
};

digitalSignatureSchema.methods.expire = async function() {
  this.status = 'expired';

  // Mark all pending signers as expired
  this.signers.forEach(signer => {
    if (['pending', 'sent', 'viewed'].includes(signer.status)) {
      signer.status = 'expired';
    }
  });

  this.addAuditEvent('expired', {});

  return this.save();
};

// Static methods
digitalSignatureSchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

digitalSignatureSchema.statics.findBySigner = function(email) {
  return this.find({ 'signers.email': email }).sort({ createdAt: -1 });
};

digitalSignatureSchema.statics.findPendingSignatures = function(email) {
  return this.find({
    'signers.email': email,
    'signers.status': { $in: ['sent', 'viewed'] },
    status: { $in: ['sent', 'in_progress'] }
  }).sort({ expiresAt: 1 });
};

digitalSignatureSchema.statics.findExpired = function() {
  return this.find({
    status: { $in: ['sent', 'in_progress'] },
    expiresAt: { $lt: new Date() }
  });
};

digitalSignatureSchema.statics.findNeedingReminder = function(daysSinceLastAction = 3) {
  const cutoffDate = new Date(Date.now() - (daysSinceLastAction * 24 * 60 * 60 * 1000));
  return this.find({
    status: { $in: ['sent', 'in_progress'] },
    'settings.reminderEnabled': true,
    $or: [
      { 'signers.sentAt': { $lt: cutoffDate }, 'signers.viewedAt': null, 'signers.status': 'sent' },
      { 'signers.viewedAt': { $lt: cutoffDate }, 'signers.status': 'viewed' }
    ]
  });
};

digitalSignatureSchema.statics.findByExternalId = function(externalSignatureId) {
  return this.findOne({ externalSignatureId });
};

module.exports = mongoose.model('DigitalSignature', digitalSignatureSchema);
