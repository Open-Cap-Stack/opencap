/**
 * Form 3921 Model
 * Feature: Issue #71 - IRS Form 3921 Generation
 * Form 3921: Exercise of an Incentive Stock Option Under Section 422(b)
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const Form3921Schema = new mongoose.Schema({
  // Unique identifier
  formId: {
    type: String,
    unique: true,
    default: () => `f3921_${uuidv4()}`,
    index: true
  },

  // Tax year
  taxYear: {
    type: Number,
    required: true,
    min: 2020,
    index: true
  },

  // Company (Transferor) information - Box 1-6
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  transferor: {
    name: { type: String, required: true },
    ein: { type: String, required: true }, // Employer Identification Number
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'US' }
    },
    telephone: { type: String }
  },

  // Employee (Transferee) information - Box 7-10
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stakeholder',
    required: true,
    index: true
  },
  transferee: {
    name: { type: String, required: true },
    ssn: { type: String, required: true }, // Social Security Number (encrypted)
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'US' }
    },
    accountNumber: { type: String } // Optional account number
  },

  // Exercise details - Boxes on Form 3921
  exerciseDetails: {
    // Box 1: Date option granted
    grantDate: { type: Date, required: true },

    // Box 2: Date option exercised
    exerciseDate: { type: Date, required: true },

    // Box 3: Exercise price per share
    exercisePrice: {
      type: Number,
      required: true,
      min: 0
    },

    // Box 4: Fair market value per share on exercise date
    fmvOnExercise: {
      type: Number,
      required: true,
      min: 0
    },

    // Box 5: Number of shares transferred
    sharesTransferred: {
      type: Number,
      required: true,
      min: 1
    }
  },

  // Calculated values
  calculations: {
    // Total exercise cost
    totalExerciseCost: { type: Number },

    // Total FMV at exercise
    totalFMVAtExercise: { type: Number },

    // Bargain element (spread)
    bargainElement: { type: Number },

    // AMT preference item
    amtPreference: { type: Number }
  },

  // Reference to option grant and exercise
  optionGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'OptionGrant' },
  optionExerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'OptionExercise' },

  // Filing status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'filed', 'corrected', 'voided'],
    default: 'draft',
    index: true
  },

  // Filing details
  filing: {
    filedDate: { type: Date },
    filedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmationNumber: { type: String },
    method: {
      type: String,
      enum: ['electronic', 'paper']
    }
  },

  // Correction tracking
  isCorrection: { type: Boolean, default: false },
  correctedFormId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form3921' },
  correctionReason: { type: String },

  // Copy tracking
  copies: {
    copyAFiled: { type: Boolean, default: false }, // For IRS
    copyBProvided: { type: Boolean, default: false }, // For employee
    copy1Filed: { type: Boolean, default: false }, // For state (if required)
    copyCSent: { type: Boolean, default: false } // For transferor records
  },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },

  notes: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
Form3921Schema.index({ companyId: 1, taxYear: 1 });
Form3921Schema.index({ employeeId: 1, taxYear: 1 });
Form3921Schema.index({ status: 1, taxYear: 1 });
Form3921Schema.index({ 'exerciseDetails.exerciseDate': 1 });

// Pre-save hook to calculate values
Form3921Schema.pre('save', function(next) {
  const { exercisePrice, fmvOnExercise, sharesTransferred } = this.exerciseDetails;

  this.calculations = {
    totalExerciseCost: exercisePrice * sharesTransferred,
    totalFMVAtExercise: fmvOnExercise * sharesTransferred,
    bargainElement: (fmvOnExercise - exercisePrice) * sharesTransferred,
    amtPreference: Math.max(0, (fmvOnExercise - exercisePrice) * sharesTransferred)
  };

  next();
});

// Virtuals
Form3921Schema.virtual('spreadPerShare').get(function() {
  return this.exerciseDetails.fmvOnExercise - this.exerciseDetails.exercisePrice;
});

Form3921Schema.virtual('isQualifyingDisposition').get(function() {
  // ISO must be held for 2 years from grant and 1 year from exercise
  // This can only be determined at sale time
  return null;
});

// Instance methods
Form3921Schema.methods.approve = async function(userId) {
  if (this.status !== 'pending_review') {
    throw new Error('Form must be in pending_review status to approve');
  }

  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.updatedBy = userId;

  return this.save();
};

Form3921Schema.methods.markFiled = async function(userId, filingData) {
  if (this.status !== 'approved') {
    throw new Error('Form must be approved before filing');
  }

  this.status = 'filed';
  this.filing = {
    filedDate: new Date(),
    filedBy: userId,
    ...filingData
  };
  this.updatedBy = userId;

  return this.save();
};

Form3921Schema.methods.createCorrection = async function(userId, correctionReason) {
  const correction = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    formId: undefined,
    status: 'draft',
    isCorrection: true,
    correctedFormId: this._id,
    correctionReason,
    createdBy: userId,
    filing: {},
    copies: {
      copyAFiled: false,
      copyBProvided: false,
      copy1Filed: false,
      copyCSent: false
    },
    createdAt: undefined,
    updatedAt: undefined
  });

  await correction.save();

  this.status = 'corrected';
  this.updatedBy = userId;
  await this.save();

  return correction;
};

// Static methods
Form3921Schema.statics.findByCompanyAndYear = function(companyId, taxYear) {
  return this.find({ companyId, taxYear }).sort({ 'transferee.name': 1 });
};

Form3921Schema.statics.findByEmployeeAndYear = function(employeeId, taxYear) {
  return this.find({ employeeId, taxYear }).sort({ 'exerciseDetails.exerciseDate': 1 });
};

Form3921Schema.statics.getPendingFiling = function(companyId, taxYear) {
  return this.find({
    companyId,
    taxYear,
    status: 'approved'
  });
};

Form3921Schema.statics.getFilingSummary = async function(companyId, taxYear) {
  const forms = await this.find({ companyId, taxYear });

  return {
    total: forms.length,
    byStatus: forms.reduce((acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    }, {}),
    totalBargainElement: forms.reduce((sum, f) => sum + (f.calculations?.bargainElement || 0), 0),
    totalShares: forms.reduce((sum, f) => sum + f.exerciseDetails.sharesTransferred, 0),
    employeeCount: new Set(forms.map(f => f.employeeId.toString())).size
  };
};

module.exports = mongoose.model('Form3921', Form3921Schema);
