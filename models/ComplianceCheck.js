const mongoose = require('mongoose');

// Constants
const REGULATION_TYPES = ['GDPR', 'HIPAA', 'SOX', 'CCPA'];
const COMPLIANCE_STATUSES = ['Compliant', 'Non-Compliant'];
const ID_FORMAT = /^[A-Z0-9-]+$/;
const MAX_DETAILS_LENGTH = 1000;
const DEFAULT_EXPIRY_DAYS = 365;

// Utility Functions
const calculateAge = (timestamp) => {
  if (!timestamp) return null;
  return Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
};

const normalizeRegulationType = (type) => {
  if (!type || typeof type !== 'string') return '';
  return type.trim().toUpperCase();
};

// Schema Definition
const ComplianceCheckSchema = new mongoose.Schema({
  CheckID: {
    type: String,
    required: [true, 'CheckID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: v => ID_FORMAT.test(v),
      message: 'CheckID must contain only uppercase letters, numbers, and hyphens'
    }
  },
  SPVID: {
    type: String,
    required: [true, 'SPVID is required'],
    trim: true,
    validate: {
      validator: v => ID_FORMAT.test(v),
      message: 'SPVID must contain only uppercase letters, numbers, and hyphens'
    }
  },
  RegulationType: {
    type: String,
    enum: {
      values: REGULATION_TYPES,
      message: `RegulationType must be one of: ${REGULATION_TYPES.join(', ')}`
    },
    required: [true, 'RegulationType is required'],
    uppercase: true,
    set: normalizeRegulationType
  },
  Status: {
    type: String,
    enum: {
      values: COMPLIANCE_STATUSES,
      message: `Status must be one of: ${COMPLIANCE_STATUSES.join(', ')}`
    },
    required: [true, 'Status is required']
  },
  Details: {
    type: String,
    trim: true,
    maxlength: [MAX_DETAILS_LENGTH, `Details cannot be longer than ${MAX_DETAILS_LENGTH} characters`]
  },
  Timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    validate: [
      {
        validator: function(v) {
          if (!(v instanceof Date) || isNaN(v)) {
            throw new Error('Timestamp must be a valid date');
          }
          if (v > new Date()) {
            throw new Error('Timestamp cannot be in the future');
          }
          return true;
        },
        message: error => error.message
      }
    ]
  },
  LastCheckedBy: {
    type: String,
    required: [true, 'LastCheckedBy is required'],
    trim: true
  }
}, {
  timestamps: { 
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  },
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtuals
ComplianceCheckSchema.virtual('complianceAge').get(function() {
  return calculateAge(this.Timestamp);
});

// Instance Methods
ComplianceCheckSchema.methods.isExpired = function(daysThreshold = DEFAULT_EXPIRY_DAYS) {
  const age = calculateAge(this.Timestamp);
  return age === null ? true : age > daysThreshold;
};

// Static Methods
ComplianceCheckSchema.statics = {
  async findNonCompliant() {
    try {
      return await this.find({ Status: 'Non-Compliant' })
        .sort({ Timestamp: -1 })
        .exec();
    } catch (error) {
      return [];
    }
  },

  async findByRegulation(regulationType) {
    try {
      const normalizedType = normalizeRegulationType(regulationType);
      if (!normalizedType || !REGULATION_TYPES.includes(normalizedType)) {
        return [];
      }
      return await this.find({ RegulationType: normalizedType })
        .sort({ Timestamp: -1 })
        .exec();
    } catch (error) {
      return [];
    }
  }
};

// Indexes
ComplianceCheckSchema.index({ CheckID: 1 }, { unique: true });
ComplianceCheckSchema.index({ SPVID: 1, Timestamp: -1 });
ComplianceCheckSchema.index({ RegulationType: 1, Status: 1 });
ComplianceCheckSchema.index(
  { SPVID: 1, RegulationType: 1, Timestamp: -1 }
);

// Middleware
ComplianceCheckSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      const existingDoc = await this.constructor.findOne({ 
        CheckID: this.CheckID 
      });
      if (existingDoc) {
        throw new Error('A compliance check with this CheckID already exists');
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const ComplianceCheck = mongoose.model('ComplianceCheck', ComplianceCheckSchema);

module.exports = ComplianceCheck;
module.exports.REGULATION_TYPES = REGULATION_TYPES;
module.exports.COMPLIANCE_STATUSES = COMPLIANCE_STATUSES;