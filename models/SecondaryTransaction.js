/**
 * SecondaryTransaction Model
 * Issue #103: Create Secondary Transaction Model
 *
 * Data model for tracking secondary share transactions including:
 * - Private sales between stakeholders
 * - Tender offers
 * - ROFR (Right of First Refusal) exercises
 * - Gift transfers
 */
const mongoose = require('mongoose');

// Fee structure sub-schema
const transactionFeesSchema = new mongoose.Schema({
  platformFee: { type: Number, default: 0, min: 0 },
  legalFees: { type: Number, default: 0, min: 0 },
  transferAgentFee: { type: Number, default: 0, min: 0 },
  escrowFee: { type: Number, default: 0, min: 0 },
  otherFees: { type: Number, default: 0, min: 0 },
  feesPaidBy: {
    type: String,
    enum: ['seller', 'buyer', 'split', 'company'],
    default: 'seller'
  }
}, { _id: false });

// Document reference sub-schema
const documentReferenceSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  documentType: {
    type: String,
    enum: ['purchase_agreement', 'board_consent', 'rofr_waiver', 'transfer_notice', 'tax_form', 'other'],
    required: true
  },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String }
}, { _id: false });

// Secondary Transaction schema
const secondaryTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Company reference
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Seller and Buyer (Stakeholder IDs)
  sellerId: {
    type: String,
    required: true,
    index: true
  },
  buyerId: {
    type: String,
    required: true,
    index: true
  },

  // Share details
  shareClassId: {
    type: String,
    required: true,
    index: true
  },
  numberOfShares: {
    type: Number,
    required: true,
    min: 1
  },

  // Pricing
  pricePerShare: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },

  // Dates
  transactionDate: {
    type: Date,
    required: true
  },
  settlementDate: {
    type: Date
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_escrow', 'completed', 'canceled', 'failed', 'rejected'],
    default: 'pending',
    index: true
  },

  // Transaction type
  transactionType: {
    type: String,
    enum: ['private_sale', 'tender_offer', 'rofr_exercise', 'gift', 'estate_transfer', 'company_buyback'],
    required: true,
    index: true
  },

  // Transfer approval workflow reference
  transferRequestId: {
    type: String,
    index: true
  },

  // ROFR details (if applicable)
  rofrDetails: {
    rofrHolderId: { type: String },
    rofrExercised: { type: Boolean, default: false },
    rofrWaived: { type: Boolean, default: false },
    rofrDeadline: { type: Date },
    originalBuyerId: { type: String }
  },

  // Documents
  documents: [documentReferenceSchema],

  // Fees
  fees: {
    type: transactionFeesSchema,
    default: () => ({})
  },

  // Escrow information
  escrow: {
    escrowAgentId: { type: String },
    escrowAccountNumber: { type: String },
    fundsReceivedAt: { type: Date },
    fundsReleasedAt: { type: Date }
  },

  // Approval tracking
  approvals: [{
    approverType: {
      type: String,
      enum: ['board', 'company_admin', 'legal', 'transfer_agent']
    },
    approverId: { type: String },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    notes: { type: String }
  }],

  // Notes and metadata
  notes: {
    type: String
  },
  internalNotes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Cancellation/Failure tracking
  cancellationReason: {
    type: String
  },
  failureReason: {
    type: String
  },
  canceledBy: {
    type: String
  },
  canceledAt: {
    type: Date
  },

  // Audit
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
secondaryTransactionSchema.index({ companyId: 1, status: 1 });
secondaryTransactionSchema.index({ sellerId: 1, status: 1 });
secondaryTransactionSchema.index({ buyerId: 1, status: 1 });
secondaryTransactionSchema.index({ companyId: 1, transactionDate: -1 });
secondaryTransactionSchema.index({ shareClassId: 1, status: 1 });

// Pre-save hook to calculate totalAmount if not set
secondaryTransactionSchema.pre('save', function(next) {
  // Calculate total amount if not explicitly set
  if (this.numberOfShares && this.pricePerShare && !this.totalAmount) {
    this.totalAmount = this.numberOfShares * this.pricePerShare;
  }

  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Set canceledAt when status changes to canceled
  if (this.isModified('status') && this.status === 'canceled' && !this.canceledAt) {
    this.canceledAt = new Date();
  }

  next();
});

// Virtual for net amount after fees
secondaryTransactionSchema.virtual('netAmount').get(function() {
  const totalFees = (this.fees?.platformFee || 0) +
                    (this.fees?.legalFees || 0) +
                    (this.fees?.transferAgentFee || 0) +
                    (this.fees?.escrowFee || 0) +
                    (this.fees?.otherFees || 0);
  return this.totalAmount - totalFees;
});

// Virtual for total fees
secondaryTransactionSchema.virtual('totalFees').get(function() {
  return (this.fees?.platformFee || 0) +
         (this.fees?.legalFees || 0) +
         (this.fees?.transferAgentFee || 0) +
         (this.fees?.escrowFee || 0) +
         (this.fees?.otherFees || 0);
});

// Method to check if all required approvals are obtained
secondaryTransactionSchema.methods.hasAllApprovals = function() {
  if (!this.approvals || this.approvals.length === 0) {
    return false;
  }
  return this.approvals.every(approval => approval.status === 'approved');
};

// Method to add an approval
secondaryTransactionSchema.methods.addApproval = function(approval) {
  this.approvals.push({
    approverType: approval.approverType,
    approverId: approval.approverId,
    approvedAt: approval.status === 'approved' ? new Date() : null,
    status: approval.status,
    notes: approval.notes
  });
};

// Ensure virtuals are included in JSON
secondaryTransactionSchema.set('toJSON', { virtuals: true });
secondaryTransactionSchema.set('toObject', { virtuals: true });

const SecondaryTransaction = mongoose.model('SecondaryTransaction', secondaryTransactionSchema);

module.exports = SecondaryTransaction;
