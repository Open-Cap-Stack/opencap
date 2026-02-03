/**
 * EquityGrant Model
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * Represents equity grants (stock options, RSUs, etc.) given to employees.
 * Tracks grant details, vesting schedules, and exercise history.
 */

const mongoose = require('mongoose');

const vestingScheduleSchema = new mongoose.Schema({
  vestingStartDate: {
    type: Date,
    required: false
  },
  vestingPeriodMonths: {
    type: Number,
    required: false,
    default: 48,
    min: [1, 'Vesting period must be at least 1 month']
  },
  cliffMonths: {
    type: Number,
    required: false,
    default: 12,
    min: [0, 'Cliff cannot be negative']
  },
  vestingFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly'
  }
}, { _id: false });

const exerciseHistorySchema = new mongoose.Schema({
  exerciseDate: {
    type: Date,
    required: true
  },
  sharesExercised: {
    type: Number,
    required: true,
    min: [1, 'Must exercise at least 1 share']
  },
  exercisePrice: {
    type: Number,
    required: true,
    min: [0, 'Exercise price cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cashless', 'stock_swap'],
    default: 'cash'
  },
  totalCost: {
    type: Number,
    required: false
  },
  notes: {
    type: String,
    required: false
  }
}, { _id: true, timestamps: true });

const equityGrantSchema = new mongoose.Schema({
  grantId: {
    type: String,
    required: [true, 'Grant ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
    index: true
  },
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    trim: true,
    index: true
  },
  equityPlanId: {
    type: String,
    required: false,
    trim: true,
    index: true
  },
  grantType: {
    type: String,
    required: [true, 'Grant type is required'],
    enum: {
      values: ['ISO', 'NSO', 'RSU', 'RSA', 'SAR', 'phantom'],
      message: '{VALUE} is not a valid grant type'
    }
  },
  numberOfShares: {
    type: Number,
    required: [true, 'Number of shares is required'],
    min: [1, 'Number of shares must be positive']
  },
  strikePrice: {
    type: Number,
    required: [true, 'Strike price is required'],
    min: [0, 'Strike price cannot be negative']
  },
  grantDate: {
    type: Date,
    required: [true, 'Grant date is required']
  },
  expirationDate: {
    type: Date,
    required: false
  },
  vestingSchedule: {
    type: vestingScheduleSchema,
    required: false
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
    index: true
  },
  exercisedShares: {
    type: Number,
    default: 0,
    min: [0, 'Exercised shares cannot be negative']
  },
  exerciseHistory: [exerciseHistorySchema],
  approvedDate: {
    type: Date,
    required: false
  },
  approvedBy: {
    type: String,
    required: false
  },
  cancellationDate: {
    type: Date,
    required: false
  },
  cancellationReason: {
    type: String,
    required: false
  },
  terminationDate: {
    type: Date,
    required: false
  },
  postTerminationExercisePeriodDays: {
    type: Number,
    default: 90,
    min: [0, 'Post-termination period cannot be negative']
  },
  fairMarketValueAtGrant: {
    type: Number,
    required: false,
    min: [0, 'FMV cannot be negative']
  },
  notes: {
    type: String,
    required: false,
    maxLength: [2000, 'Notes cannot exceed 2000 characters']
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining unvested shares
equityGrantSchema.virtual('unvestedShares').get(function() {
  return this.numberOfShares - this.exercisedShares;
});

// Virtual for checking if fully exercised
equityGrantSchema.virtual('isFullyExercised').get(function() {
  return this.exercisedShares >= this.numberOfShares;
});

// Pre-save validation
equityGrantSchema.pre('save', function(next) {
  // Ensure exercised shares don't exceed total shares
  if (this.exercisedShares > this.numberOfShares) {
    return next(new Error('Exercised shares cannot exceed total number of shares'));
  }

  // Set expiration date if not provided (default 10 years for options)
  if (!this.expirationDate && ['ISO', 'NSO'].includes(this.grantType)) {
    const expirationDate = new Date(this.grantDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 10);
    this.expirationDate = expirationDate;
  }

  // Set vesting start date to grant date if not provided
  if (this.vestingSchedule && !this.vestingSchedule.vestingStartDate) {
    this.vestingSchedule.vestingStartDate = this.grantDate;
  }

  next();
});

// Index for efficient queries
equityGrantSchema.index({ employeeId: 1, status: 1 });
equityGrantSchema.index({ companyId: 1, status: 1 });
equityGrantSchema.index({ grantType: 1, status: 1 });
equityGrantSchema.index({ grantDate: -1 });

const EquityGrant = mongoose.model('EquityGrant', equityGrantSchema);

module.exports = EquityGrant;
