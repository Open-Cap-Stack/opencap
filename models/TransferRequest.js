/**
 * TransferRequest Model
 * Issue #104: Build Transfer Approval Workflow
 *
 * Data model for tracking share transfer requests including:
 * - Seller and buyer information
 * - Share transfer details
 * - Approval workflow status
 * - Right of First Refusal (ROFR) tracking
 */
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String },
  type: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const transferRequestSchema = new mongoose.Schema({
  requestId: {
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

  // Transfer parties
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
  pricePerShare: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Workflow status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'completed', 'canceled'],
    default: 'pending',
    index: true
  },

  // Timestamps
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },

  // Review details
  reviewedBy: {
    type: String
  },
  rejectionReason: {
    type: String
  },

  // Supporting documents
  documents: [documentSchema],

  // Right of First Refusal (ROFR)
  rofrStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'waived', 'exercised', 'expired'],
    default: 'not_applicable',
    index: true
  },
  rofrExpirationDate: {
    type: Date
  },
  rofrEligibleParties: [{
    type: String
  }],

  // Audit fields
  notes: {
    type: String
  },
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transferRequestSchema.index({ companyId: 1, status: 1 });
transferRequestSchema.index({ sellerId: 1, status: 1 });
transferRequestSchema.index({ buyerId: 1, status: 1 });
transferRequestSchema.index({ companyId: 1, requestedAt: -1 });

// Pre-save hook to calculate totalAmount
transferRequestSchema.pre('save', function(next) {
  if (this.numberOfShares && this.pricePerShare) {
    this.totalAmount = this.numberOfShares * this.pricePerShare;
  }
  next();
});

// Virtual for isActive
transferRequestSchema.virtual('isActive').get(function() {
  return ['pending', 'under_review', 'approved'].includes(this.status);
});

// Virtual for canBeModified
transferRequestSchema.virtual('canBeModified').get(function() {
  return this.status === 'pending';
});

// Virtual for canBeCanceled
transferRequestSchema.virtual('canBeCanceled').get(function() {
  return ['pending', 'under_review'].includes(this.status);
});

// Ensure virtuals are included in JSON
transferRequestSchema.set('toJSON', { virtuals: true });
transferRequestSchema.set('toObject', { virtuals: true });

const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);

module.exports = TransferRequest;
