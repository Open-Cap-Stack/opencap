/**
 * ExerciseRequest Model
 * Feature: Issue #79 - Build Exercise Management System
 *
 * Tracks stock option exercise requests through their complete lifecycle:
 * pending -> approved -> processed -> completed
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const exerciseDetailsSchema = new mongoose.Schema({
  sharesRequested: { type: Number, required: true, min: 1 },
  exercisePrice: { type: Number, required: true, min: 0 },
  currentFMV: { type: Number, required: true, min: 0 },
  spread: { type: Number }, // FMV - exercise price per share
  totalSpread: { type: Number }, // spread * shares
  totalExerciseCost: { type: Number }, // exercisePrice * shares
  totalValue: { type: Number }, // FMV * shares
  isUnderwater: { type: Boolean, default: false },
  // Partial exercise tracking
  grantTotalShares: { type: Number }, // Total shares in the grant
  previouslyExercised: { type: Number, default: 0 }, // Shares already exercised
  vestedShares: { type: Number }, // Shares vested at time of request
  remainingExercisable: { type: Number }, // Shares remaining after this exercise
  isPartialExercise: { type: Boolean, default: false }
}, { _id: false });

const taxWithholdingSchema = new mongoose.Schema({
  calculated: { type: Boolean, default: false },
  totalWithholding: { type: Number, default: 0 },
  federalWithholding: { type: Number, default: 0 },
  stateWithholding: { type: Number, default: 0 },
  socialSecurityWithholding: { type: Number, default: 0 },
  medicareWithholding: { type: Number, default: 0 },
  additionalMedicare: { type: Number, default: 0 },
  amtWithholding: { type: Number, default: 0 },
  sharesToWithhold: { type: Number, default: 0 }, // For sell-to-cover
  withholdingMethod: {
    type: String,
    enum: ['cash', 'sell_to_cover', 'same_day_sale'],
    default: 'cash'
  }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  paymentReceived: { type: Boolean, default: false },
  paymentAmount: { type: Number },
  paymentDate: { type: Date },
  paymentReference: { type: String },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'wire', 'cashless', 'stock_swap'],
    default: 'cash'
  }
}, { _id: false });

const certificateDataSchema = new mongoose.Schema({
  certificateNumber: { type: String },
  sharesIssued: { type: Number },
  issueDate: { type: Date },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  holderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stakeholder' },
  shareClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShareClass' },
  restrictionPeriod: { type: Number }, // Days
  restrictionEndDate: { type: Date },
  legendText: { type: String }
}, { _id: false });

const exerciseWindowSchema = new mongoose.Schema({
  windowStart: { type: Date },
  windowEnd: { type: Date },
  windowType: {
    type: String,
    enum: ['open', 'blackout', 'limited', 'termination'],
    default: 'open'
  },
  grantExpirationDate: { type: Date },
  daysUntilExpiration: { type: Number }
}, { _id: false });

const employeeProfileSchema = new mongoose.Schema({
  filingStatus: {
    type: String,
    enum: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'],
    default: 'single'
  },
  federalAllowances: { type: Number, default: 0 },
  stateCode: { type: String, required: true },
  stateAllowances: { type: Number, default: 0 },
  additionalWithholding: { type: Number, default: 0 },
  isSubjectToAMT: { type: Boolean, default: false },
  ytdWages: { type: Number, default: 0 },
  ytdSocialSecurity: { type: Number, default: 0 }
}, { _id: false });

const ExerciseRequestSchema = new mongoose.Schema({
  // Unique identifier
  exerciseRequestId: {
    type: String,
    unique: true,
    default: () => `exr_${uuidv4()}`,
    index: true
  },

  // References
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  stakeholderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stakeholder',
    required: true,
    index: true
  },
  equityGrantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityGrant',
    required: true,
    index: true
  },

  // Option type
  optionType: {
    type: String,
    enum: ['ISO', 'NSO', 'RSA', 'RSU'],
    required: true
  },

  // Exercise details
  exerciseDetails: exerciseDetailsSchema,

  // Exercise window tracking
  exerciseWindow: exerciseWindowSchema,

  // Payment information
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'wire', 'cashless', 'stock_swap'],
    default: 'cash'
  },
  payment: paymentSchema,

  // Tax withholding
  employeeProfile: employeeProfileSchema,
  taxWithholding: taxWithholdingSchema,

  // Certificate data (populated upon completion)
  certificateData: certificateDataSchema,

  // Workflow status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processed', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Audit trail - request
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
  requestNotes: { type: String },

  // Audit trail - approval
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  approvalNotes: { type: String },

  // Audit trail - rejection
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },

  // Audit trail - processing
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  processingNotes: { type: String },

  // Audit trail - completion
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  completionNotes: { type: String },

  // Audit trail - cancellation
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },

  // Form 3921 reference (for ISO exercises)
  form3921Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Form3921' },
  form3921Generated: { type: Boolean, default: false },
  form3921GeneratedAt: { type: Date },

  // General
  notes: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
ExerciseRequestSchema.index({ companyId: 1, status: 1 });
ExerciseRequestSchema.index({ stakeholderId: 1, status: 1 });
ExerciseRequestSchema.index({ equityGrantId: 1 });
ExerciseRequestSchema.index({ requestedAt: -1 });
ExerciseRequestSchema.index({ 'exerciseWindow.windowEnd': 1 });

// Virtual for net shares after withholding
ExerciseRequestSchema.virtual('netShares').get(function() {
  if (!this.exerciseDetails || !this.taxWithholding) return null;
  return this.exerciseDetails.sharesRequested - (this.taxWithholding.sharesToWithhold || 0);
});

// Instance methods
ExerciseRequestSchema.methods.canBeApproved = function() {
  return this.status === 'pending';
};

ExerciseRequestSchema.methods.canBeRejected = function() {
  return this.status === 'pending';
};

ExerciseRequestSchema.methods.canBeProcessed = function() {
  return this.status === 'approved';
};

ExerciseRequestSchema.methods.canBeCompleted = function() {
  return this.status === 'processed';
};

ExerciseRequestSchema.methods.canBeCancelled = function() {
  return ['pending', 'approved'].includes(this.status);
};

// Static methods
ExerciseRequestSchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ requestedAt: -1 });
};

ExerciseRequestSchema.statics.findByStakeholder = function(stakeholderId, status = null) {
  const query = { stakeholderId };
  if (status) query.status = status;
  return this.find(query).sort({ requestedAt: -1 });
};

ExerciseRequestSchema.statics.findPendingByGrant = function(equityGrantId) {
  return this.find({
    equityGrantId,
    status: { $in: ['pending', 'approved'] }
  });
};

ExerciseRequestSchema.statics.getCompanySummary = async function(companyId) {
  return this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalShares: { $sum: '$exerciseDetails.sharesRequested' },
        totalValue: { $sum: '$exerciseDetails.totalValue' }
      }
    }
  ]);
};

ExerciseRequestSchema.statics.getExerciseSummaryByGrant = async function(equityGrantId) {
  const exercises = await this.find({
    equityGrantId,
    status: { $in: ['completed', 'processed'] }
  });

  return {
    totalExercisedShares: exercises.reduce((sum, e) => sum + e.exerciseDetails.sharesRequested, 0),
    exerciseCount: exercises.length,
    exercises: exercises.map(e => ({
      exerciseRequestId: e.exerciseRequestId,
      sharesExercised: e.exerciseDetails.sharesRequested,
      exerciseDate: e.completedAt || e.processedAt,
      status: e.status
    }))
  };
};

ExerciseRequestSchema.statics.findByEquityGrant = function(equityGrantId, status = null) {
  const query = { equityGrantId };
  if (status) query.status = status;
  return this.find(query).sort({ requestedAt: -1 });
};

ExerciseRequestSchema.statics.getISOExercisesForTaxYear = function(companyId, taxYear) {
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear + 1, 0, 1);

  return this.find({
    companyId,
    optionType: 'ISO',
    status: 'completed',
    completedAt: { $gte: yearStart, $lt: yearEnd }
  }).sort({ completedAt: 1 });
};

module.exports = mongoose.model('ExerciseRequest', ExerciseRequestSchema);
