/**
 * SPV Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Special Purpose Vehicle (SPV) entity for managing investment structures.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid status values (lifecycle states for issue #580)
const VALID_STATUSES = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];

// Map legacy status values to new lifecycle states
const LEGACY_STATUS_MAP = {
  active: 'raising',
  inactive: 'draft',
  dissolved: 'canceled',
  pending: 'in_review',
  closed: 'wired',
  liquidated: 'canceled'
};

// Transition rules: key = current status, value = array of allowed next statuses
const TRANSITION_RULES = {
  draft: ['in_review', 'canceled'],
  in_review: ['raising', 'draft', 'canceled'],
  raising: ['closing', 'canceled'],
  closing: ['wired', 'canceled'],
  wired: ['canceled'],
  canceled: []
};

// Steps required for draft -> in_review transition
const REQUIRED_STEPS_FOR_REVIEW = ['terms', 'adviser', 'memo', 'carry'];
const VALID_COMPLIANCE_STATUSES = ['Compliant', 'NonCompliant', 'PendingReview'];

// Enum constants for new fields
const VALID_COMPANY_STAGES = ['pre-seed', 'seed', 'series-a', 'series-b', 'post-revenue', 'other'];
const VALID_INCORPORATION_TYPES = ['c-corp', 'llc', 's-corp', 'other'];
const VALID_MONTHS_OF_RUNWAY = ['less-than-12', '12-or-more'];
const VALID_TRANSACTION_TYPES = ['primary', 'secondary'];
const VALID_INSTRUMENTS = ['safe', 'convertible-note', 'preferred-equity', 'common-equity', 'other'];
const VALID_VALUATIONS = ['capped', 'uncapped'];
const VALID_ADVISER_TYPES = ['platform-advisor', 'self-advised'];

// Validation functions
const validators = {
    isValidStatus: (status) => VALID_STATUSES.includes(status),
    isValidComplianceStatus: (status) => VALID_COMPLIANCE_STATUSES.includes(status),
    isValidDate: (date) => date instanceof Date && !isNaN(date),
    isValidCompanyStage: (stage) => VALID_COMPANY_STAGES.includes(stage),
    isValidIncorporationType: (type) => VALID_INCORPORATION_TYPES.includes(type),
    isValidMonthsOfRunway: (val) => VALID_MONTHS_OF_RUNWAY.includes(val),
    isValidTransactionType: (type) => VALID_TRANSACTION_TYPES.includes(type),
    isValidInstrument: (inst) => VALID_INSTRUMENTS.includes(inst),
    isValidValuation: (val) => VALID_VALUATIONS.includes(val),
    isValidAdviserType: (type) => VALID_ADVISER_TYPES.includes(type)
};

// Schema definition for documentation and validation
const spvSchema = {
    // --- Original fields (required) ---
    SPVID: { type: 'string', required: true, unique: true },
    Name: { type: 'string', required: true },
    Purpose: { type: 'string', required: true },
    CreationDate: { type: 'date', required: true },
    Status: {
        type: 'string',
        required: true,
        enum: VALID_STATUSES
    },
    ParentCompanyID: { type: 'string', required: true },
    ComplianceStatus: {
        type: 'string',
        required: true,
        enum: VALID_COMPLIANCE_STATUSES
    },

    // --- Basic Info additions (all optional) ---
    companyId: { type: 'string' },
    companyLegalName: { type: 'string' },
    companyStage: { type: 'string', enum: VALID_COMPANY_STAGES },
    countryOfIncorporation: { type: 'string', default: 'United States' },
    incorporationType: { type: 'string', enum: VALID_INCORPORATION_TYPES },
    founderEmails: { type: 'array' },
    monthsOfRunway: { type: 'string', enum: VALID_MONTHS_OF_RUNWAY },
    proRataRights: { type: 'boolean' },
    targetClosingDate: { type: 'date' },
    lpMinimumInvestment: { type: 'number' },

    // --- Terms ---
    transactionType: { type: 'string', enum: VALID_TRANSACTION_TYPES },
    instrument: { type: 'string', enum: VALID_INSTRUMENTS },
    includesTokenWarrant: { type: 'boolean' },
    valuation: { type: 'string', enum: VALID_VALUATIONS },
    valuationCap: { type: 'number' },
    discount: { type: 'number' },
    round: { type: 'string' },
    roundSize: { type: 'number' },
    allocation: { type: 'number' },
    otherTerms: { type: 'string' },
    termDocuments: { type: 'array' },

    // --- Adviser & ERA ---
    adviserType: { type: 'string', enum: VALID_ADVISER_TYPES },
    masterPartnershipEntity: { type: 'string' },
    fundLead: { type: 'string' },

    // --- Data room & memo ---
    memo: { type: 'string' },
    pitchDeckUrl: { type: 'string' },
    coInvestors: { type: 'array' },  // [{name: string, amount: number}]
    pastFinancing: { type: 'boolean' },
    risks: { type: 'array' },
    disclosures: { type: 'object' },  // boolean fields: investedPreviously, downRound, advisoryShares, officerOrEmployee, relativeWorking, otherConflicts, noConflicts

    // --- Carry & GP ---
    carryPercentage: { type: 'number', default: 0 },
    carryRecipientEntity: { type: 'string' },
    gpCommitmentAmount: { type: 'number' },
    gpCommitmentFromFund: { type: 'boolean' },
    investingOnDifferentTerms: { type: 'boolean' },
    dealPartners: { type: 'array' },  // [{userId: string, carryPercentage: number}]

    // --- Platform fee ---
    // OpenCap Stack takes 5% carried interest on every SPV as a platform fee.
    // This is fixed and non-negotiable; stored for auditability and waterfall calculations.
    platformCarryPercentage: { type: 'number', default: 5 },

    // --- Additional services ---
    has3c7ParallelFunds: { type: 'boolean' },
    hasFinancialStatements: { type: 'boolean' },

    // --- Metrics ---
    totalRaised: { type: 'number', default: 0 },
    lpCount: { type: 'number', default: 0 },

    // --- Wizard state ---
    wizardStep: { type: 'number', default: 0 },
    wizardCompletedSteps: { type: 'array' },

    // --- Wire instructions ---
    wireInstructions: { type: 'object' }, // {bankName, routingNumber, accountNumber, swiftCode, referencePrefix, specialInstructions}

    // --- Status lifecycle (issue #580) ---
    statusHistory: { type: 'array' }, // [{status, changedAt, changedBy}]

    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spvs', spvSchema);

// Extended SPV model with business logic
const SPV = {
    ...baseModel,
    tableName: 'spvs',
    schema: spvSchema,
    validators,
    VALID_STATUSES,
    LEGACY_STATUS_MAP,
    TRANSITION_RULES,
    REQUIRED_STEPS_FOR_REVIEW,
    VALID_COMPLIANCE_STATUSES,
    VALID_COMPANY_STAGES,
    VALID_INCORPORATION_TYPES,
    VALID_MONTHS_OF_RUNWAY,
    VALID_TRANSACTION_TYPES,
    VALID_INSTRUMENTS,
    VALID_VALUATIONS,
    VALID_ADVISER_TYPES,

    /**
     * Normalize a legacy status value to the new lifecycle status.
     * Returns the status unchanged if it is already a valid lifecycle status.
     * @param {string} status - Status value (possibly legacy)
     * @returns {string} Normalized status
     */
    normalizeStatus(status) {
        if (!status) return 'draft';
        const lower = status.toLowerCase();
        if (VALID_STATUSES.includes(lower)) return lower;
        if (LEGACY_STATUS_MAP[lower]) return LEGACY_STATUS_MAP[lower];
        return lower;
    },

    /**
     * Validate whether a status transition is allowed.
     * @param {string} fromStatus - Current status
     * @param {string} toStatus - Desired status
     * @returns {{ valid: boolean, reason?: string }}
     */
    validateTransition(fromStatus, toStatus) {
        if (!VALID_STATUSES.includes(toStatus)) {
            return { valid: false, reason: `Invalid target status '${toStatus}'. Must be one of: ${VALID_STATUSES.join(', ')}` };
        }
        // "any -> canceled" is always allowed
        if (toStatus === 'canceled') {
            return { valid: true };
        }
        const allowed = TRANSITION_RULES[fromStatus];
        if (!allowed || !allowed.includes(toStatus)) {
            return { valid: false, reason: `Transition from '${fromStatus}' to '${toStatus}' is not allowed` };
        }
        return { valid: true };
    },

    /**
     * Create a new SPV with defaults and validation
     * @param {Object} data - SPV data
     * @returns {Object} Created SPV
     */
    async create(data) {
        // Generate SPVID if not provided
        if (!data.SPVID) {
            data.SPVID = `spv_${uuidv4()}`;
        }

        // Validate required fields
        if (!data.Name) {
            throw new Error('Name is required');
        }
        if (!data.Purpose) {
            throw new Error('Purpose is required');
        }
        if (!data.ParentCompanyID) {
            throw new Error('ParentCompanyID is required');
        }

        // Validate Status
        if (data.Status && !validators.isValidStatus(data.Status)) {
            throw new Error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`);
        }

        // Validate ComplianceStatus
        if (data.ComplianceStatus && !validators.isValidComplianceStatus(data.ComplianceStatus)) {
            throw new Error(`Invalid compliance status. Valid values: ${VALID_COMPLIANCE_STATUSES.join(', ')}`);
        }

        // Ensure CreationDate is set
        if (!data.CreationDate) {
            data.CreationDate = new Date().toISOString();
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find SPV by SPVID
     * @param {string} spvId - SPV ID
     * @returns {Object|null} SPV or null
     */
    async findBySPVID(spvId) {
        return baseModel.findOne.call(baseModel, { SPVID: spvId });
    },

    /**
     * Find SPVs by parent company
     * @param {string} parentCompanyId - Parent Company ID
     * @returns {Array} SPVs belonging to the parent company
     */
    async findByParentCompany(parentCompanyId) {
        return baseModel.find.call(baseModel, { ParentCompanyID: parentCompanyId });
    },

    /**
     * Find SPVs by status
     * @param {string} status - SPV status
     * @returns {Array} SPVs with given status
     */
    async findByStatus(status) {
        if (!validators.isValidStatus(status)) {
            return [];
        }
        return baseModel.find.call(baseModel, { Status: status });
    },

    /**
     * Find SPVs by compliance status
     * @param {string} complianceStatus - Compliance status
     * @returns {Array} SPVs with given compliance status
     */
    async findByComplianceStatus(complianceStatus) {
        if (!validators.isValidComplianceStatus(complianceStatus)) {
            return [];
        }
        return baseModel.find.call(baseModel, { ComplianceStatus: complianceStatus });
    },

    /**
     * Find active SPVs
     * @returns {Array} Active SPVs
     */
    async findActive() {
        return baseModel.find.call(baseModel, { Status: 'active' });
    },

    /**
     * Update SPV status
     * @param {string} spvId - SPV ID
     * @param {string} status - New status
     * @returns {Object} Update result
     */
    async updateStatus(spvId, status) {
        if (!validators.isValidStatus(status)) {
            throw new Error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`);
        }
        return baseModel.updateOne.call(baseModel, { SPVID: spvId }, { $set: { Status: status } });
    },

    /**
     * Update SPV compliance status
     * @param {string} spvId - SPV ID
     * @param {string} complianceStatus - New compliance status
     * @returns {Object} Update result
     */
    async updateComplianceStatus(spvId, complianceStatus) {
        if (!validators.isValidComplianceStatus(complianceStatus)) {
            throw new Error(`Invalid compliance status. Valid values: ${VALID_COMPLIANCE_STATUSES.join(', ')}`);
        }
        return baseModel.updateOne.call(baseModel, { SPVID: spvId }, { $set: { ComplianceStatus: complianceStatus } });
    },

    /**
     * Get valid status values
     * @returns {Array} Valid status values
     */
    getValidStatuses() {
        return [...VALID_STATUSES];
    },

    /**
     * Get valid compliance status values
     * @returns {Array} Valid compliance status values
     */
    getValidComplianceStatuses() {
        return [...VALID_COMPLIANCE_STATUSES];
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

module.exports = SPV;
