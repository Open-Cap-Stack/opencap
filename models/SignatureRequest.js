/**
 * SignatureRequest Model
 * Feature: Issue #66 - SAFE Digital Signature Workflow
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const signerSchema = new mongoose.Schema({
  signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: {
    type: String,
    enum: ['investor', 'company_representative', 'witness', 'legal_counsel'],
    required: true
  },
  order: { type: Number, default: 1 },
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
  signatureData: {
    signature: { type: String },
    initials: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date }
  },
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: { type: Date }
}, { _id: true });

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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signerEmail: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const SignatureRequestSchema = new mongoose.Schema({
  // Unique identifier
  requestId: {
    type: String,
    unique: true,
    default: () => `sig_${uuidv4()}`,
    index: true
  },

  // Document reference
  documentType: {
    type: String,
    enum: ['safe', 'stock_option_agreement', 'board_consent', 'employment_agreement', 'nda', 'other'],
    required: true
  },
  documentId: { type: mongoose.Schema.Types.ObjectId, refPath: 'documentModel' },
  documentModel: {
    type: String,
    enum: ['SAFE', 'Document', 'EquityGrant'],
    default: 'Document'
  },

  // Company reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
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
  sentAt: { type: Date },
  completedAt: { type: Date },
  expiresAt: { type: Date },
  cancelledAt: { type: Date },
  voidedAt: { type: Date },

  // Document files
  originalDocument: {
    url: { type: String },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number }
  },
  signedDocument: {
    url: { type: String },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    generatedAt: { type: Date }
  },

  // External provider integration
  provider: {
    type: String,
    enum: ['internal', 'docusign', 'hellosign', 'pandadoc'],
    default: 'internal'
  },
  externalId: { type: String },
  externalData: { type: mongoose.Schema.Types.Mixed },

  // Audit trail
  auditTrail: [auditEventSchema],

  // Settings
  settings: {
    reminderEnabled: { type: Boolean, default: true },
    reminderDays: { type: Number, default: 3 },
    maxReminders: { type: Number, default: 3 },
    expirationDays: { type: Number, default: 30 },
    requireInitials: { type: Boolean, default: false },
    allowDecline: { type: Boolean, default: true }
  },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SignatureRequestSchema.index({ companyId: 1, status: 1 });
SignatureRequestSchema.index({ status: 1, expiresAt: 1 });
SignatureRequestSchema.index({ 'signers.email': 1 });
SignatureRequestSchema.index({ documentId: 1, documentType: 1 });

// Virtuals
SignatureRequestSchema.virtual('isComplete').get(function() {
  return this.signers.every(s => s.status === 'signed');
});

SignatureRequestSchema.virtual('pendingSigners').get(function() {
  return this.signers.filter(s => !['signed', 'declined'].includes(s.status));
});

SignatureRequestSchema.virtual('signedCount').get(function() {
  return this.signers.filter(s => s.status === 'signed').length;
});

SignatureRequestSchema.virtual('progress').get(function() {
  if (this.signers.length === 0) return 0;
  return Math.round((this.signedCount / this.signers.length) * 100);
});

// Instance methods
SignatureRequestSchema.methods.addAuditEvent = function(event, data = {}) {
  this.auditTrail.push({
    event,
    timestamp: new Date(),
    ...data
  });
  return this;
};

SignatureRequestSchema.methods.send = async function(userId) {
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

SignatureRequestSchema.methods.recordView = async function(signerEmail, ipAddress, userAgent) {
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

SignatureRequestSchema.methods.recordSignature = async function(signerEmail, signatureData, ipAddress, userAgent) {
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

SignatureRequestSchema.methods.recordDecline = async function(signerEmail, reason, ipAddress, userAgent) {
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

SignatureRequestSchema.methods.cancel = async function(userId, reason) {
  if (['completed', 'cancelled', 'voided'].includes(this.status)) {
    throw new Error(`Cannot cancel request in ${this.status} status`);
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.updatedBy = userId;

  this.addAuditEvent('cancelled', { userId, reason });

  return this.save();
};

SignatureRequestSchema.methods.void = async function(userId, reason) {
  this.status = 'voided';
  this.voidedAt = new Date();
  this.updatedBy = userId;

  this.addAuditEvent('voided', { userId, reason });

  return this.save();
};

SignatureRequestSchema.methods.sendReminder = async function(signerEmail, userId) {
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

// Static methods
SignatureRequestSchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

SignatureRequestSchema.statics.findBySigner = function(email) {
  return this.find({ 'signers.email': email }).sort({ createdAt: -1 });
};

SignatureRequestSchema.statics.findPendingSignatures = function(email) {
  return this.find({
    'signers.email': email,
    'signers.status': { $in: ['sent', 'viewed'] },
    status: { $in: ['sent', 'in_progress'] }
  }).sort({ expiresAt: 1 });
};

SignatureRequestSchema.statics.findExpired = function() {
  return this.find({
    status: { $in: ['sent', 'in_progress'] },
    expiresAt: { $lt: new Date() }
  });
};

SignatureRequestSchema.statics.findNeedingReminder = function(daysSinceLastAction = 3) {
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

module.exports = mongoose.model('SignatureRequest', SignatureRequestSchema);
