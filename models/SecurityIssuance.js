/**
 * SecurityIssuance Model
 * Issue #76: Implement Security Issuances Register
 *
 * Comprehensive model for tracking all issued securities with:
 * - Blue-sky law compliance tracking
 * - State-by-state filing requirements
 * - Exemption tracking (Rule 701, Regulation D)
 * - Filing deadline management
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

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

const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const ACCREDITED_VERIFICATION_METHODS = [
  'self_certification',
  'third_party_verification',
  'tax_returns',
  'financial_statements',
  'other'
];

const RULE_701_RECIPIENT_TYPES = ['employee', 'director', 'officer', 'consultant', 'advisor'];

const ISSUE_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const ISSUE_STATUSES = ['open', 'in_progress', 'resolved'];

// Schema definition for documentation and validation
const securityIssuanceSchema = {
  issuanceId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  securityType: { type: 'string', required: true, enum: SECURITY_TYPES },
  shareClassId: { type: 'string', default: null },
  stakeholderId: { type: 'string', required: true },
  stakeholderName: { type: 'string', default: null },
  numberOfShares: { type: 'number', required: true },
  pricePerShare: { type: 'number', required: true },
  totalConsideration: { type: 'number', default: 0 },
  issuanceDate: { type: 'date', required: true },
  status: { type: 'string', enum: ISSUANCE_STATUSES, default: 'pending' },
  vestingScheduleId: { type: 'string', default: null },
  vestingStartDate: { type: 'date', default: null },
  vestingCliffDate: { type: 'date', default: null },
  fullyVestedDate: { type: 'date', default: null },
  certificateNumber: { type: 'string', default: null },
  certificateIssued: { type: 'boolean', default: false },
  certificateIssuedDate: { type: 'date', default: null },
  boardApprovalDate: { type: 'date', default: null },
  boardResolutionId: { type: 'string', default: null },
  exemptionType: { type: 'string', enum: EXEMPTION_TYPES, default: null },
  exemptionDetails: {
    type: 'object',
    default: {
      rule701Qualified: false,
      rule701RecipientType: null,
      regulationDFormFiled: false,
      regulationDFilingDate: null,
      accreditedInvestorVerified: false,
      accreditedVerificationMethod: null,
      sophisticatedInvestor: false,
      preexistingRelationship: false,
      investorQuestionnaire: false,
      subscriptionAgreement: false,
      legendedCertificate: false
    }
  },
  federalFilingRequired: { type: 'boolean', default: false },
  federalFilingStatus: { type: 'string', enum: FILING_STATUSES, default: 'not_required' },
  federalFilingDeadline: { type: 'date', default: null },
  formDFilingDate: { type: 'date', default: null },
  formDConfirmationNumber: { type: 'string', default: null },
  formDAmendmentRequired: { type: 'boolean', default: false },
  formDAmendmentDeadline: { type: 'date', default: null },
  stateFilings: { type: 'array', default: [] },
  complianceStatus: { type: 'string', enum: COMPLIANCE_STATUSES, default: 'pending_review' },
  complianceNotes: { type: 'string', default: '' },
  complianceIssues: { type: 'array', default: [] },
  lastComplianceReview: { type: 'date', default: null },
  nextComplianceReview: { type: 'date', default: null },
  reviewedBy: { type: 'string', default: null },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  notes: { type: 'string', default: '' },
  attachments: { type: 'array', default: [] },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('security_issuances', securityIssuanceSchema);

// Extended SecurityIssuance model with business logic
const SecurityIssuance = {
  ...baseModel,
  tableName: 'security_issuances',
  schema: securityIssuanceSchema,

  // Export constants
  SECURITY_TYPES,
  EXEMPTION_TYPES,
  ISSUANCE_STATUSES,
  COMPLIANCE_STATUSES,
  FILING_STATUSES,
  US_STATE_CODES,
  ACCREDITED_VERIFICATION_METHODS,
  RULE_701_RECIPIENT_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,

  /**
   * Create a new security issuance with defaults
   * @param {Object} data - Issuance data
   * @returns {Object} Created issuance
   */
  async create(data) {
    if (!data.issuanceId) {
      data.issuanceId = `iss_${uuidv4()}`;
    }

    // Validate security type
    if (!SECURITY_TYPES.includes(data.securityType)) {
      throw new Error(`securityType must be one of: ${SECURITY_TYPES.join(', ')}`);
    }

    // Validate shares and price
    if (data.numberOfShares < 0) {
      throw new Error('Number of shares must be non-negative');
    }
    if (data.pricePerShare < 0) {
      throw new Error('Price per share must be non-negative');
    }

    // Calculate total consideration
    data.totalConsideration = data.numberOfShares * data.pricePerShare;

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find issuance by issuanceId
   * @param {string} issuanceId - Issuance ID
   * @returns {Object|null} Issuance or null
   */
  async findByIssuanceId(issuanceId) {
    return baseModel.findOne.call(baseModel, { issuanceId });
  },

  /**
   * Find issuances by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Issuances for company
   */
  async findByCompany(companyId, options = {}) {
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
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find issuances by stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {Object} options - Query options
   * @returns {Array} Issuances for stakeholder
   */
  async findByStakeholder(stakeholderId, options = {}) {
    const query = { stakeholderId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find by exemption type
   * @param {string} exemptionType - Exemption type
   * @param {Object} options - Query options
   * @returns {Array} Matching issuances
   */
  async findByExemptionType(exemptionType, options = {}) {
    const query = { exemptionType };
    if (options.companyId) {
      query.companyId = options.companyId;
    }
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get total value
   * @param {Object} issuance - Issuance object
   * @returns {number} Total value
   */
  getTotalValue(issuance) {
    return issuance.numberOfShares * issuance.pricePerShare;
  },

  /**
   * Check if any filing is overdue
   * @param {Object} issuance - Issuance object
   * @returns {boolean} True if overdue
   */
  isOverdue(issuance) {
    const now = new Date();

    // Check federal filing
    if (issuance.federalFilingStatus === 'pending' &&
        issuance.federalFilingDeadline &&
        new Date(issuance.federalFilingDeadline) < now) {
      return true;
    }

    // Check state filings
    if (issuance.stateFilings && issuance.stateFilings.length > 0) {
      return issuance.stateFilings.some(filing =>
        filing.filingStatus === 'pending' &&
        filing.filingDeadline &&
        new Date(filing.filingDeadline) < now
      );
    }

    return false;
  },

  /**
   * Get pending filings count
   * @param {Object} issuance - Issuance object
   * @returns {number} Pending filings count
   */
  getPendingFilingsCount(issuance) {
    let count = 0;

    if (issuance.federalFilingStatus === 'pending') {
      count++;
    }

    if (issuance.stateFilings && issuance.stateFilings.length > 0) {
      count += issuance.stateFilings.filter(f => f.filingStatus === 'pending').length;
    }

    return count;
  },

  /**
   * Check if state filing is needed
   * @param {Object} issuance - Issuance object
   * @param {string} stateCode - State code
   * @returns {boolean} True if filing needed
   */
  needsStateFiling(issuance, stateCode) {
    const exemptionsRequiringStateFiling = [
      'regulation_d_506b',
      'regulation_d_506c',
      'regulation_a',
      'regulation_cf'
    ];

    if (!exemptionsRequiringStateFiling.includes(issuance.exemptionType)) {
      return false;
    }

    const existingFiling = (issuance.stateFilings || []).find(f => f.stateCode === stateCode);
    if (existingFiling && existingFiling.filingStatus === 'filed') {
      return false;
    }

    return true;
  },

  /**
   * Get upcoming deadlines
   * @param {Object} issuance - Issuance object
   * @param {number} daysAhead - Days to look ahead
   * @returns {Array} Upcoming deadlines
   */
  getUpcomingDeadlines(issuance, daysAhead = 30) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const deadlines = [];

    // Check federal deadline
    if (issuance.federalFilingDeadline &&
        issuance.federalFilingStatus === 'pending' &&
        new Date(issuance.federalFilingDeadline) <= futureDate) {
      deadlines.push({
        type: 'federal',
        filingType: 'Form D',
        deadline: issuance.federalFilingDeadline,
        daysRemaining: Math.ceil((new Date(issuance.federalFilingDeadline) - now) / (24 * 60 * 60 * 1000))
      });
    }

    // Check Form D amendment deadline
    if (issuance.formDAmendmentRequired &&
        issuance.formDAmendmentDeadline &&
        new Date(issuance.formDAmendmentDeadline) <= futureDate) {
      deadlines.push({
        type: 'federal',
        filingType: 'Form D Amendment',
        deadline: issuance.formDAmendmentDeadline,
        daysRemaining: Math.ceil((new Date(issuance.formDAmendmentDeadline) - now) / (24 * 60 * 60 * 1000))
      });
    }

    // Check state deadlines
    (issuance.stateFilings || []).forEach(filing => {
      if (filing.filingDeadline &&
          filing.filingStatus === 'pending' &&
          new Date(filing.filingDeadline) <= futureDate) {
        deadlines.push({
          type: 'state',
          stateCode: filing.stateCode,
          filingType: 'State Notice',
          deadline: filing.filingDeadline,
          daysRemaining: Math.ceil((new Date(filing.filingDeadline) - now) / (24 * 60 * 60 * 1000))
        });
      }
    });

    return deadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  },

  /**
   * Update compliance status
   * @param {string} issuanceId - Issuance ID
   * @param {string} status - Compliance status
   * @param {string} notes - Notes
   * @param {string} reviewedBy - Reviewer ID
   * @returns {Object} Updated issuance
   */
  async updateComplianceStatus(issuanceId, status, notes = null, reviewedBy = null) {
    const nextReviewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return baseModel.updateOne.call(baseModel,
      { issuanceId },
      {
        $set: {
          complianceStatus: status,
          complianceNotes: notes,
          reviewedBy,
          lastComplianceReview: new Date().toISOString(),
          nextComplianceReview: nextReviewDate.toISOString()
        }
      }
    );
  },

  /**
   * Find overdue filings for a company
   * @param {string} companyId - Company ID
   * @returns {Array} Issuances with overdue filings
   */
  async findOverdueFilings(companyId) {
    const issuances = await baseModel.find.call(baseModel, { companyId });
    return issuances.filter(i => this.isOverdue(i));
  },

  /**
   * Get compliance summary for a company
   * @param {string} companyId - Company ID
   * @returns {Object} Compliance summary
   */
  async getComplianceSummary(companyId) {
    const issuances = await baseModel.find.call(baseModel, { companyId });

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

    issuances.forEach(issuance => {
      if (summary.byComplianceStatus[issuance.complianceStatus] !== undefined) {
        summary.byComplianceStatus[issuance.complianceStatus]++;
      }

      if (summary.byFederalFilingStatus[issuance.federalFilingStatus] !== undefined) {
        summary.byFederalFilingStatus[issuance.federalFilingStatus]++;
      }

      if (this.isOverdue(issuance)) {
        summary.overdueFilings++;
      }

      const deadlines = this.getUpcomingDeadlines(issuance, 30);
      summary.upcomingDeadlines.push(...deadlines.map(d => ({
        ...d,
        issuanceId: issuance.issuanceId
      })));
    });

    summary.upcomingDeadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    return summary;
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = SecurityIssuance;
