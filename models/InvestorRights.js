/**
 * InvestorRights Model
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * Data model for tracking investor rights including:
 * - Pro-rata rights
 * - Information rights
 * - Board seats
 * - Anti-dilution protections
 * - Veto rights
 * - And other investor preferences
 */

const mongoose = require('mongoose');

// Schema for exercise history entries
const exerciseHistorySchema = new mongoose.Schema({
  exerciseDate: {
    type: Date,
    required: true
  },
  exerciseAmount: {
    type: Number
  },
  exercisedBy: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  documentReference: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Schema for audit log entries
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['CREATED', 'UPDATED', 'EXERCISED', 'WAIVED', 'EXPIRED', 'SUSPENDED', 'REACTIVATED'],
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  previousValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },
  changes: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String
  }
}, { _id: true });

// Main InvestorRights schema
const investorRightsSchema = new mongoose.Schema({
  rightId: {
    type: String,
    required: [true, 'Right ID is required'],
    unique: true,
    trim: true
  },
  investorId: {
    type: String,
    required: [true, 'Investor ID is required'],
    trim: true
  },
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    trim: true
  },
  shareClassId: {
    type: String,
    trim: true
  },
  rightType: {
    type: String,
    required: [true, 'Right type is required'],
    enum: {
      values: [
        'PRO_RATA',
        'INFORMATION_RIGHTS',
        'BOARD_SEAT',
        'OBSERVER_SEAT',
        'ANTI_DILUTION',
        'VETO_RIGHTS',
        'DRAG_ALONG',
        'TAG_ALONG',
        'PREEMPTIVE',
        'FIRST_REFUSAL',
        'CO_SALE',
        'REDEMPTION',
        'REGISTRATION'
      ],
      message: '{VALUE} is not a valid right type'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'EXPIRED', 'EXERCISED', 'WAIVED', 'PENDING', 'SUSPENDED'],
      message: '{VALUE} is not a valid status'
    },
    default: 'ACTIVE'
  },
  terms: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expirationDate: {
    type: Date
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  sourceDocument: {
    type: String,
    trim: true
  },
  sourceDocumentType: {
    type: String,
    enum: ['INVESTOR_RIGHTS_AGREEMENT', 'VOTING_AGREEMENT', 'ROFR_AGREEMENT', 'SIDE_LETTER', 'TERM_SHEET', 'OTHER'],
    default: 'INVESTOR_RIGHTS_AGREEMENT'
  },
  exerciseHistory: [exerciseHistorySchema],
  auditLog: [auditLogSchema],
  waiveDetails: {
    reason: String,
    documentReference: String,
    waivedBy: String,
    waivedAt: Date
  },
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
investorRightsSchema.index({ investorId: 1, companyId: 1 });
investorRightsSchema.index({ companyId: 1, rightType: 1 });
investorRightsSchema.index({ shareClassId: 1 });
investorRightsSchema.index({ expirationDate: 1 });
investorRightsSchema.index({ status: 1 });
investorRightsSchema.index({ rightId: 1 }, { unique: true });

// Virtual to check if right is currently expired
investorRightsSchema.virtual('isCurrentlyExpired').get(function() {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate;
});

/**
 * Instance method to check if the right is expired
 * @returns {boolean} True if the right is expired
 */
investorRightsSchema.methods.isExpired = function() {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate;
};

/**
 * Instance method to check if the right can be exercised
 * @returns {boolean} True if the right can be exercised
 */
investorRightsSchema.methods.canExercise = function() {
  // Cannot exercise if not active
  if (this.status !== 'ACTIVE') return false;

  // Cannot exercise if expired
  if (this.isExpired()) return false;

  // Check if effective date has passed
  if (this.effectiveDate && new Date() < this.effectiveDate) return false;

  return true;
};

/**
 * Instance method to add an audit entry
 * @param {string} action - The action being recorded
 * @param {string} userId - ID of the user performing the action
 * @param {Object} options - Additional options (previousValues, newValues, reason)
 */
investorRightsSchema.methods.addAuditEntry = function(action, userId, options = {}) {
  const entry = {
    action,
    userId,
    timestamp: new Date(),
    previousValues: options.previousValues,
    newValues: options.newValues,
    changes: options.changes,
    reason: options.reason
  };

  this.auditLog.push(entry);
};

/**
 * Static method to find rights by investor
 * @param {string} investorId - The investor ID
 * @param {Object} options - Query options (status, companyId)
 * @returns {Promise<Array>} Array of investor rights
 */
investorRightsSchema.statics.findByInvestor = function(investorId, options = {}) {
  const query = { investorId };

  if (options.status) query.status = options.status;
  if (options.companyId) query.companyId = options.companyId;

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find rights by company
 * @param {string} companyId - The company ID
 * @param {Object} options - Query options (status, rightType)
 * @returns {Promise<Array>} Array of investor rights
 */
investorRightsSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId };

  if (options.status) query.status = options.status;
  if (options.rightType) query.rightType = options.rightType;

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find rights by share class
 * @param {string} shareClassId - The share class ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of investor rights
 */
investorRightsSchema.statics.findByShareClass = function(shareClassId, options = {}) {
  const query = { shareClassId };

  if (options.status) query.status = options.status;

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find rights expiring within a specified number of days
 * @param {number} days - Number of days to look ahead
 * @param {Object} options - Query options (companyId, investorId)
 * @returns {Promise<Array>} Array of expiring investor rights
 */
investorRightsSchema.statics.findExpiring = function(days = 30, options = {}) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const query = {
    status: 'ACTIVE',
    expirationDate: {
      $gte: now,
      $lte: futureDate
    }
  };

  if (options.companyId) query.companyId = options.companyId;
  if (options.investorId) query.investorId = options.investorId;

  return this.find(query).sort({ expirationDate: 1 });
};

/**
 * Static method to check for conflicts with existing rights
 * @param {Object} newRight - The new right to check
 * @returns {Promise<Array>} Array of conflicts found
 */
investorRightsSchema.statics.checkConflicts = async function(newRight) {
  const conflicts = [];
  const { companyId, rightType, terms } = newRight;

  // Find existing active rights of the same type for this company
  const existingRights = await this.find({
    companyId,
    rightType,
    status: 'ACTIVE'
  });

  // Check for board seat conflicts
  if (rightType === 'BOARD_SEAT') {
    const totalSeats = existingRights.reduce((sum, r) => {
      return sum + (r.terms?.totalSeats || 0);
    }, 0);
    const assignedSeats = existingRights.reduce((sum, r) => {
      return sum + (r.terms?.assignedSeats || 0);
    }, 0);

    if (assignedSeats >= totalSeats) {
      conflicts.push({
        type: 'BOARD_SEAT_LIMIT',
        message: 'All board seats are already assigned',
        existingRights: existingRights.map(r => r.rightId)
      });
    }
  }

  // Check for veto rights conflicts
  if (rightType === 'VETO_RIGHTS' && terms?.vetoScope) {
    const overlappingVeto = existingRights.find(r =>
      r.terms?.vetoScope === terms.vetoScope ||
      r.terms?.vetoScope === 'ALL_DECISIONS' ||
      terms.vetoScope === 'ALL_DECISIONS'
    );

    if (overlappingVeto) {
      conflicts.push({
        type: 'VETO_OVERLAP',
        message: 'Veto rights overlap with existing rights',
        existingRight: overlappingVeto.rightId
      });
    }
  }

  // Check for pro-rata percentage exceeding 100%
  if (rightType === 'PRO_RATA' && terms?.percentage) {
    const totalPercentage = existingRights.reduce((sum, r) => {
      return sum + (r.terms?.percentage || 0);
    }, terms.percentage);

    if (totalPercentage > 100) {
      conflicts.push({
        type: 'PRO_RATA_EXCEEDS_100',
        message: `Total pro-rata percentage would exceed 100% (${totalPercentage}%)`,
        totalPercentage
      });
    }
  }

  return conflicts;
};

// Pre-save middleware to update timestamps and validate
investorRightsSchema.pre('save', function(next) {
  // Auto-expire if past expiration date
  if (this.expirationDate && new Date() > this.expirationDate && this.status === 'ACTIVE') {
    this.status = 'EXPIRED';
  }

  next();
});

const InvestorRights = mongoose.model('InvestorRights', investorRightsSchema);

module.exports = InvestorRights;
