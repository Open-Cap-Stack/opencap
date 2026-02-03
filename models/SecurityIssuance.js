/**
 * SecurityIssuance Model
 * Issue #76: Implement Security Issuances Register
 *
 * Comprehensive model for tracking all issued securities with:
 * - Blue-sky law compliance tracking
 * - State-by-state filing requirements
 * - Exemption tracking (Rule 701, Regulation D)
 * - Filing deadline management
 */

const mongoose = require('mongoose');

// Constants
const SECURITY_TYPES = [
  'common_stock',
  'preferred_stock',
  'convertible_note',
  'safe',
  'warrant',
  'option',
  'restricted_stock',
  'rsu'
];

const EXEMPTION_TYPES = [
  'rule_701',
  'regulation_d_506b',
  'regulation_d_506c',
  'regulation_a',
  'regulation_cf',
  'section_4a2',
  'intrastate',
  'other'
];

const ISSUANCE_STATUSES = [
  'pending',
  'issued',
  'cancelled',
  'transferred',
  'exercised',
  'converted'
];

const COMPLIANCE_STATUSES = [
  'compliant',
  'pending_review',
  'non_compliant',
  'remediation_required'
];

const FILING_STATUSES = [
  'not_required',
  'pending',
  'filed',
  'overdue',
  'exempt'
];

// US State codes
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// State Filing Sub-schema
const stateFilingSchema = new mongoose.Schema({
  stateCode: {
    type: String,
    required: true,
    enum: US_STATE_CODES,
    uppercase: true
  },
  filingRequired: {
    type: Boolean,
    default: true
  },
  filingStatus: {
    type: String,
    enum: FILING_STATUSES,
    default: 'pending'
  },
  filingDeadline: {
    type: Date
  },
  filingDate: {
    type: Date
  },
  confirmationNumber: {
    type: String,
    trim: true
  },
  exemptionClaimed: {
    type: String,
    trim: true
  },
  feeAmount: {
    type: Number,
    default: 0
  },
  feePaid: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, { _id: false });

// Exemption Details Sub-schema
const exemptionDetailsSchema = new mongoose.Schema({
  rule701Qualified: {
    type: Boolean,
    default: false
  },
  rule701RecipientType: {
    type: String,
    enum: ['employee', 'director', 'officer', 'consultant', 'advisor']
  },
  regulationDFormFiled: {
    type: Boolean,
    default: false
  },
  regulationDFilingDate: {
    type: Date
  },
  accreditedInvestorVerified: {
    type: Boolean,
    default: false
  },
  accreditedVerificationMethod: {
    type: String,
    enum: ['self_certification', 'third_party_verification', 'tax_returns', 'financial_statements', 'other']
  },
  sophisticatedInvestor: {
    type: Boolean,
    default: false
  },
  preexistingRelationship: {
    type: Boolean,
    default: false
  },
  investorQuestionnaire: {
    type: Boolean,
    default: false
  },
  subscriptionAgreement: {
    type: Boolean,
    default: false
  },
  legendedCertificate: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Main Security Issuance Schema
const securityIssuanceSchema = new mongoose.Schema({
  // Identification
  issuanceId: {
    type: String,
    required: [true, 'Issuance ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    trim: true,
    index: true
  },

  // Security Details
  securityType: {
    type: String,
    required: [true, 'Security type is required'],
    enum: {
      values: SECURITY_TYPES,
      message: `Security type must be one of: ${SECURITY_TYPES.join(', ')}`
    }
  },
  shareClassId: {
    type: String,
    trim: true
  },
  stakeholderId: {
    type: String,
    required: [true, 'Stakeholder ID is required'],
    trim: true,
    index: true
  },
  stakeholderName: {
    type: String,
    trim: true
  },

  // Issuance Terms
  numberOfShares: {
    type: Number,
    required: [true, 'Number of shares is required'],
    min: [0, 'Number of shares must be non-negative']
  },
  pricePerShare: {
    type: Number,
    required: [true, 'Price per share is required'],
    min: [0, 'Price per share must be non-negative']
  },
  totalConsideration: {
    type: Number,
    default: 0
  },
  issuanceDate: {
    type: Date,
    required: [true, 'Issuance date is required']
  },
  status: {
    type: String,
    enum: {
      values: ISSUANCE_STATUSES,
      message: `Status must be one of: ${ISSUANCE_STATUSES.join(', ')}`
    },
    default: 'pending'
  },

  // Vesting Information
  vestingScheduleId: {
    type: String,
    trim: true
  },
  vestingStartDate: {
    type: Date
  },
  vestingCliffDate: {
    type: Date
  },
  fullyVestedDate: {
    type: Date
  },

  // Certificate Information
  certificateNumber: {
    type: String,
    trim: true
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateIssuedDate: {
    type: Date
  },

  // Board Approval
  boardApprovalDate: {
    type: Date
  },
  boardResolutionId: {
    type: String,
    trim: true
  },

  // Exemption Tracking
  exemptionType: {
    type: String,
    enum: {
      values: EXEMPTION_TYPES,
      message: `Exemption type must be one of: ${EXEMPTION_TYPES.join(', ')}`
    }
  },
  exemptionDetails: exemptionDetailsSchema,

  // Federal Filing Management
  federalFilingRequired: {
    type: Boolean,
    default: false
  },
  federalFilingStatus: {
    type: String,
    enum: {
      values: FILING_STATUSES,
      message: `Federal filing status must be one of: ${FILING_STATUSES.join(', ')}`
    },
    default: 'not_required'
  },
  federalFilingDeadline: {
    type: Date
  },
  formDFilingDate: {
    type: Date
  },
  formDConfirmationNumber: {
    type: String,
    trim: true
  },
  formDAmendmentRequired: {
    type: Boolean,
    default: false
  },
  formDAmendmentDeadline: {
    type: Date
  },

  // State Filings (Blue-Sky Compliance)
  stateFilings: [stateFilingSchema],

  // Compliance Status
  complianceStatus: {
    type: String,
    enum: {
      values: COMPLIANCE_STATUSES,
      message: `Compliance status must be one of: ${COMPLIANCE_STATUSES.join(', ')}`
    },
    default: 'pending_review'
  },
  complianceNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  complianceIssues: [{
    issue: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    identifiedDate: Date,
    resolvedDate: Date,
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved']
    }
  }],
  lastComplianceReview: {
    type: Date
  },
  nextComplianceReview: {
    type: Date
  },
  reviewedBy: {
    type: String,
    trim: true
  },

  // Metadata
  createdBy: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  attachments: [{
    documentId: String,
    documentType: String,
    fileName: String,
    uploadedAt: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Calculate total value
securityIssuanceSchema.virtual('totalValue').get(function() {
  return this.numberOfShares * this.pricePerShare;
});

// Virtual: Check if any filing is overdue
securityIssuanceSchema.virtual('isOverdue').get(function() {
  const now = new Date();

  // Check federal filing
  if (this.federalFilingStatus === 'pending' &&
      this.federalFilingDeadline &&
      this.federalFilingDeadline < now) {
    return true;
  }

  // Check state filings
  if (this.stateFilings && this.stateFilings.length > 0) {
    return this.stateFilings.some(filing =>
      filing.filingStatus === 'pending' &&
      filing.filingDeadline &&
      filing.filingDeadline < now
    );
  }

  return false;
});

// Virtual: Count pending filings
securityIssuanceSchema.virtual('pendingFilingsCount').get(function() {
  let count = 0;

  if (this.federalFilingStatus === 'pending') {
    count++;
  }

  if (this.stateFilings && this.stateFilings.length > 0) {
    count += this.stateFilings.filter(f => f.filingStatus === 'pending').length;
  }

  return count;
});

// Instance Method: Check if state filing is needed
securityIssuanceSchema.methods.needsStateFiling = function(stateCode) {
  // Check if exemption type requires state filing
  const exemptionsRequiringStateFiling = [
    'regulation_d_506b',
    'regulation_d_506c',
    'regulation_a',
    'regulation_cf'
  ];

  if (!exemptionsRequiringStateFiling.includes(this.exemptionType)) {
    return false;
  }

  // Check if already filed for this state
  const existingFiling = this.stateFilings.find(f => f.stateCode === stateCode);
  if (existingFiling && existingFiling.filingStatus === 'filed') {
    return false;
  }

  return true;
};

// Instance Method: Get upcoming deadlines
securityIssuanceSchema.methods.getUpcomingDeadlines = function(daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const deadlines = [];

  // Check federal deadline
  if (this.federalFilingDeadline &&
      this.federalFilingStatus === 'pending' &&
      this.federalFilingDeadline <= futureDate) {
    deadlines.push({
      type: 'federal',
      filingType: 'Form D',
      deadline: this.federalFilingDeadline,
      daysRemaining: Math.ceil((this.federalFilingDeadline - now) / (24 * 60 * 60 * 1000))
    });
  }

  // Check Form D amendment deadline
  if (this.formDAmendmentRequired &&
      this.formDAmendmentDeadline &&
      this.formDAmendmentDeadline <= futureDate) {
    deadlines.push({
      type: 'federal',
      filingType: 'Form D Amendment',
      deadline: this.formDAmendmentDeadline,
      daysRemaining: Math.ceil((this.formDAmendmentDeadline - now) / (24 * 60 * 60 * 1000))
    });
  }

  // Check state deadlines
  this.stateFilings.forEach(filing => {
    if (filing.filingDeadline &&
        filing.filingStatus === 'pending' &&
        filing.filingDeadline <= futureDate) {
      deadlines.push({
        type: 'state',
        stateCode: filing.stateCode,
        filingType: 'State Notice',
        deadline: filing.filingDeadline,
        daysRemaining: Math.ceil((filing.filingDeadline - now) / (24 * 60 * 60 * 1000))
      });
    }
  });

  return deadlines.sort((a, b) => a.deadline - b.deadline);
};

// Instance Method: Update compliance status
securityIssuanceSchema.methods.updateComplianceStatus = function(status, notes, reviewedBy) {
  this.complianceStatus = status;
  if (notes) {
    this.complianceNotes = notes;
  }
  if (reviewedBy) {
    this.reviewedBy = reviewedBy;
  }
  this.lastComplianceReview = new Date();

  // Calculate next review date (90 days from now)
  this.nextComplianceReview = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return this;
};

// Static Method: Find by company
securityIssuanceSchema.statics.findByCompany = async function(companyId, options = {}) {
  const query = { companyId };

  if (options.status) {
    query.status = options.status;
  }
  if (options.securityType) {
    query.securityType = options.securityType;
  }
  if (options.exemptionType) {
    query.exemptionType = options.exemptionType;
  }

  return this.find(query).sort({ issuanceDate: -1 });
};

// Static Method: Find overdue filings
securityIssuanceSchema.statics.findOverdueFilings = async function(companyId) {
  const now = new Date();

  return this.find({
    companyId,
    $or: [
      {
        federalFilingStatus: 'pending',
        federalFilingDeadline: { $lt: now }
      },
      {
        'stateFilings.filingStatus': 'pending',
        'stateFilings.filingDeadline': { $lt: now }
      }
    ]
  });
};

// Static Method: Find by exemption type
securityIssuanceSchema.statics.findByExemptionType = async function(exemptionType, options = {}) {
  const query = { exemptionType };

  if (options.companyId) {
    query.companyId = options.companyId;
  }
  if (options.status) {
    query.status = options.status;
  }

  return this.find(query).sort({ issuanceDate: -1 });
};

// Static Method: Get compliance summary
securityIssuanceSchema.statics.getComplianceSummary = async function(companyId) {
  const issuances = await this.find({ companyId });

  const summary = {
    totalIssuances: issuances.length,
    byComplianceStatus: {
      compliant: 0,
      pending_review: 0,
      non_compliant: 0,
      remediation_required: 0
    },
    byFederalFilingStatus: {
      not_required: 0,
      pending: 0,
      filed: 0,
      overdue: 0,
      exempt: 0
    },
    overdueFilings: 0,
    upcomingDeadlines: []
  };

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  issuances.forEach(issuance => {
    // Count by compliance status
    if (summary.byComplianceStatus[issuance.complianceStatus] !== undefined) {
      summary.byComplianceStatus[issuance.complianceStatus]++;
    }

    // Count by federal filing status
    if (summary.byFederalFilingStatus[issuance.federalFilingStatus] !== undefined) {
      summary.byFederalFilingStatus[issuance.federalFilingStatus]++;
    }

    // Count overdue
    if (issuance.isOverdue) {
      summary.overdueFilings++;
    }

    // Collect upcoming deadlines
    const deadlines = issuance.getUpcomingDeadlines(30);
    summary.upcomingDeadlines.push(...deadlines.map(d => ({
      ...d,
      issuanceId: issuance.issuanceId
    })));
  });

  // Sort upcoming deadlines
  summary.upcomingDeadlines.sort((a, b) => a.deadline - b.deadline);

  return summary;
};

// Indexes
securityIssuanceSchema.index({ issuanceId: 1 }, { unique: true });
securityIssuanceSchema.index({ companyId: 1 });
securityIssuanceSchema.index({ stakeholderId: 1 });
securityIssuanceSchema.index({ companyId: 1, issuanceDate: -1 });
securityIssuanceSchema.index({ exemptionType: 1 });
securityIssuanceSchema.index({ complianceStatus: 1 });
securityIssuanceSchema.index({ federalFilingStatus: 1 });
securityIssuanceSchema.index({ 'stateFilings.stateCode': 1 });
securityIssuanceSchema.index({ 'stateFilings.filingStatus': 1 });

// Pre-save middleware
securityIssuanceSchema.pre('save', function(next) {
  // Calculate total consideration if not set
  if (!this.totalConsideration || this.isModified('numberOfShares') || this.isModified('pricePerShare')) {
    this.totalConsideration = this.numberOfShares * this.pricePerShare;
  }

  // Update federal filing status to overdue if deadline passed
  if (this.federalFilingStatus === 'pending' &&
      this.federalFilingDeadline &&
      this.federalFilingDeadline < new Date()) {
    this.federalFilingStatus = 'overdue';
  }

  // Update state filing statuses
  if (this.stateFilings && this.stateFilings.length > 0) {
    const now = new Date();
    this.stateFilings.forEach(filing => {
      if (filing.filingStatus === 'pending' &&
          filing.filingDeadline &&
          filing.filingDeadline < now) {
        filing.filingStatus = 'overdue';
      }
    });
  }

  next();
});

const SecurityIssuance = mongoose.model('SecurityIssuance', securityIssuanceSchema);

module.exports = SecurityIssuance;
module.exports.SECURITY_TYPES = SECURITY_TYPES;
module.exports.EXEMPTION_TYPES = EXEMPTION_TYPES;
module.exports.ISSUANCE_STATUSES = ISSUANCE_STATUSES;
module.exports.COMPLIANCE_STATUSES = COMPLIANCE_STATUSES;
module.exports.FILING_STATUSES = FILING_STATUSES;
module.exports.US_STATE_CODES = US_STATE_CODES;
module.exports.schema = securityIssuanceSchema;
