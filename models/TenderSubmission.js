/**
 * TenderSubmission Model
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * Data model for stakeholder submissions to tender offers
 * Tracks:
 * - Shares offered by stakeholders
 * - Acceptance and payout amounts
 * - Submission status lifecycle
 */
const mongoose = require('mongoose');

const tenderSubmissionSchema = new mongoose.Schema({
  submissionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  offerId: {
    type: String,
    required: true,
    index: true
  },

  stakeholderId: {
    type: String,
    required: true,
    index: true
  },

  // Shares submitted
  sharesOffered: {
    type: Number,
    required: true,
    min: 1
  },

  // Price at time of submission (locked from offer)
  pricePerShare: {
    type: Number,
    required: true,
    min: 0
  },

  // Share class being tendered
  shareClass: {
    type: String
  },

  // Status lifecycle
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'settled'],
    default: 'pending',
    index: true
  },

  // Acceptance details (set when offer closes)
  sharesAccepted: {
    type: Number,
    default: 0,
    min: 0
  },
  prorataPercentage: {
    type: Number,
    min: 0,
    max: 100
  },

  // Payout details (set when offer settles)
  payoutAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  payoutDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['wire', 'check', 'ach', 'other']
  },
  paymentReference: {
    type: String
  },

  // Timestamps for lifecycle tracking
  submittedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  withdrawnAt: {
    type: Date
  },
  settledAt: {
    type: Date
  },

  // Rejection details
  rejectionReason: {
    type: String
  },

  // Eligibility verification
  eligibilityVerified: {
    type: Boolean,
    default: false
  },
  eligibilityNotes: {
    type: String
  },

  // Notes and metadata
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Audit fields
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
tenderSubmissionSchema.index({ offerId: 1, stakeholderId: 1 }, { unique: true });
tenderSubmissionSchema.index({ offerId: 1, status: 1 });
tenderSubmissionSchema.index({ stakeholderId: 1, status: 1 });

// Virtual for expected payout (based on shares offered)
tenderSubmissionSchema.virtual('expectedPayout').get(function() {
  return this.sharesOffered * this.pricePerShare;
});

// Virtual for actual payout (based on shares accepted)
tenderSubmissionSchema.virtual('actualPayout').get(function() {
  return this.sharesAccepted * this.pricePerShare;
});

// Virtual for acceptance rate
tenderSubmissionSchema.virtual('acceptanceRate').get(function() {
  if (this.sharesOffered === 0) return 0;
  return (this.sharesAccepted / this.sharesOffered) * 100;
});

// Virtual for whether submission is modifiable
tenderSubmissionSchema.virtual('isModifiable').get(function() {
  return this.status === 'pending';
});

// Ensure virtuals are included in JSON
tenderSubmissionSchema.set('toJSON', { virtuals: true });
tenderSubmissionSchema.set('toObject', { virtuals: true });

const TenderSubmission = mongoose.model('TenderSubmission', tenderSubmissionSchema);

module.exports = TenderSubmission;
