/**
 * TransferApproval Model
 * Issue #104: Build Transfer Approval Workflow
 *
 * Data model for tracking approval decisions on transfer requests including:
 * - Approver information and role
 * - Decision and conditions
 * - Audit trail for approval workflow
 */
const mongoose = require('mongoose');

const transferApprovalSchema = new mongoose.Schema({
  approvalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Reference to transfer request
  requestId: {
    type: String,
    required: true,
    index: true
  },

  // Approver details
  approverId: {
    type: String,
    required: true,
    index: true
  },
  approverRole: {
    type: String,
    required: true,
    enum: ['board_member', 'cfo', 'ceo', 'legal_counsel', 'compliance_officer', 'admin']
  },

  // Decision
  decision: {
    type: String,
    required: true,
    enum: ['approved', 'rejected', 'requested_changes']
  },

  // Additional details
  comments: {
    type: String
  },
  conditions: [{
    type: String
  }],

  // Timestamp
  decidedAt: {
    type: Date,
    default: Date.now
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transferApprovalSchema.index({ requestId: 1, decidedAt: -1 });
transferApprovalSchema.index({ approverId: 1, decidedAt: -1 });

// Virtual for isApproval
transferApprovalSchema.virtual('isApproval').get(function() {
  return this.decision === 'approved';
});

// Virtual for isRejection
transferApprovalSchema.virtual('isRejection').get(function() {
  return this.decision === 'rejected';
});

// Virtual for requiresChanges
transferApprovalSchema.virtual('requiresChanges').get(function() {
  return this.decision === 'requested_changes';
});

// Ensure virtuals are included in JSON
transferApprovalSchema.set('toJSON', { virtuals: true });
transferApprovalSchema.set('toObject', { virtuals: true });

const TransferApproval = mongoose.model('TransferApproval', transferApprovalSchema);

module.exports = TransferApproval;
