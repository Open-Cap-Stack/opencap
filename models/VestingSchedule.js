/**
 * VestingSchedule Model
 * Issue #78: Implement Automated Vesting Schedules
 *
 * Data model for tracking equity vesting schedules with support for:
 * - Cliff periods and vesting frequencies
 * - Single and double trigger acceleration
 * - Status tracking and notifications
 */
const mongoose = require('mongoose');

const accelerationTermsSchema = new mongoose.Schema({
  singleTrigger: {
    enabled: { type: Boolean, default: false },
    accelerationPercentage: { type: Number, default: 0, min: 0, max: 100 },
    events: [{ type: String, enum: ['change_of_control', 'ipo', 'merger', 'acquisition'] }]
  },
  doubleTrigger: {
    enabled: { type: Boolean, default: false },
    accelerationPercentage: { type: Number, default: 100, min: 0, max: 100 },
    terminationTypes: [{
      type: String,
      enum: ['involuntary_without_cause', 'constructive_termination', 'good_reason', 'death', 'disability']
    }],
    windowPeriodMonths: { type: Number, default: 12 }
  }
}, { _id: false });

const vestingEventSchema = new mongoose.Schema({
  eventDate: { type: Date, required: true },
  eventType: {
    type: String,
    enum: ['cliff', 'periodic', 'acceleration', 'manual'],
    required: true
  },
  sharesVested: { type: Number, required: true },
  cumulativeVested: { type: Number, required: true },
  notes: { type: String }
}, { _id: false });

const vestingScheduleSchema = new mongoose.Schema({
  scheduleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // References
  equityPlanId: {
    type: String,
    required: true,
    index: true
  },
  stakeholderId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    index: true
  },

  // Grant details
  totalShares: {
    type: Number,
    required: true,
    min: 1
  },
  grantDate: {
    type: Date,
    required: true
  },
  grantType: {
    type: String,
    enum: ['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'phantom'],
    default: 'ISO'
  },
  exercisePrice: {
    type: Number,
    min: 0
  },

  // Vesting configuration
  vestingStartDate: {
    type: Date,
    required: true
  },
  cliffPeriodMonths: {
    type: Number,
    default: 12,
    min: 0
  },
  vestingPeriodMonths: {
    type: Number,
    default: 48,
    min: 1
  },
  vestingFrequency: {
    type: String,
    enum: ['daily', 'monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },

  // Acceleration terms
  accelerationTerms: {
    type: accelerationTermsSchema,
    default: () => ({
      singleTrigger: { enabled: false, accelerationPercentage: 0, events: [] },
      doubleTrigger: { enabled: false, accelerationPercentage: 100, terminationTypes: [], windowPeriodMonths: 12 }
    })
  },

  // Current vesting status
  vestedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  unvestedShares: {
    type: Number,
    default: function() {
      return this.totalShares || 0;
    },
    min: 0
  },

  // Tracking dates
  lastVestingDate: {
    type: Date
  },
  nextVestingDate: {
    type: Date
  },
  cliffDate: {
    type: Date
  },
  vestingEndDate: {
    type: Date
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'terminated', 'accelerated'],
    default: 'active',
    index: true
  },

  // Event history
  vestingHistory: [vestingEventSchema],

  // Pause tracking
  pausedAt: {
    type: Date
  },
  pausedDays: {
    type: Number,
    default: 0
  },

  // Termination/Acceleration details
  terminationDate: {
    type: Date
  },
  terminationType: {
    type: String,
    enum: ['voluntary', 'involuntary_without_cause', 'involuntary_with_cause', 'constructive_termination', 'good_reason', 'death', 'disability']
  },
  accelerationDate: {
    type: Date
  },
  accelerationType: {
    type: String,
    enum: ['single_trigger', 'double_trigger', 'board_discretion']
  },
  acceleratedShares: {
    type: Number,
    default: 0
  },

  // Notes and metadata
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
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

// Indexes for efficient queries
vestingScheduleSchema.index({ stakeholderId: 1, status: 1 });
vestingScheduleSchema.index({ equityPlanId: 1, status: 1 });
vestingScheduleSchema.index({ companyId: 1, status: 1 });
vestingScheduleSchema.index({ nextVestingDate: 1, status: 1 });
vestingScheduleSchema.index({ status: 1 });

// Pre-save hook to calculate derived fields
vestingScheduleSchema.pre('save', function(next) {
  // Calculate cliff date
  if (this.vestingStartDate && this.cliffPeriodMonths > 0) {
    const cliffDate = new Date(this.vestingStartDate);
    cliffDate.setMonth(cliffDate.getMonth() + this.cliffPeriodMonths);
    this.cliffDate = cliffDate;
  } else if (this.cliffPeriodMonths === 0) {
    this.cliffDate = this.vestingStartDate;
  }

  // Calculate vesting end date
  if (this.vestingStartDate && this.vestingPeriodMonths) {
    const endDate = new Date(this.vestingStartDate);
    endDate.setMonth(endDate.getMonth() + this.vestingPeriodMonths);
    this.vestingEndDate = endDate;
  }

  // Ensure unvestedShares is correct
  this.unvestedShares = this.totalShares - this.vestedShares;

  next();
});

// Virtual for vesting percentage
vestingScheduleSchema.virtual('vestingPercentage').get(function() {
  if (this.totalShares === 0) return 0;
  return (this.vestedShares / this.totalShares) * 100;
});

// Virtual for cliff passed
vestingScheduleSchema.virtual('cliffPassed').get(function() {
  if (!this.cliffDate) return true;
  return new Date() >= this.cliffDate;
});

// Virtual for fully vested
vestingScheduleSchema.virtual('fullyVested').get(function() {
  return this.vestedShares >= this.totalShares;
});

// Method to add vesting event
vestingScheduleSchema.methods.addVestingEvent = function(event) {
  this.vestingHistory.push({
    eventDate: event.eventDate || new Date(),
    eventType: event.eventType,
    sharesVested: event.sharesVested,
    cumulativeVested: event.cumulativeVested || this.vestedShares,
    notes: event.notes
  });
};

// Ensure virtuals are included in JSON
vestingScheduleSchema.set('toJSON', { virtuals: true });
vestingScheduleSchema.set('toObject', { virtuals: true });

const VestingSchedule = mongoose.model('VestingSchedule', vestingScheduleSchema);

module.exports = VestingSchedule;
