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
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid right types
const RIGHT_TYPES = [
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
];

// Valid statuses
const VALID_STATUSES = ['ACTIVE', 'EXPIRED', 'EXERCISED', 'WAIVED', 'PENDING', 'SUSPENDED'];

// Valid source document types
const SOURCE_DOCUMENT_TYPES = ['INVESTOR_RIGHTS_AGREEMENT', 'VOTING_AGREEMENT', 'ROFR_AGREEMENT', 'SIDE_LETTER', 'TERM_SHEET', 'OTHER'];

// Valid audit actions
const AUDIT_ACTIONS = ['CREATED', 'UPDATED', 'EXERCISED', 'WAIVED', 'EXPIRED', 'SUSPENDED', 'REACTIVATED'];

// Schema definition for documentation and validation
const investorRightsSchema = {
  rightId: { type: 'string', required: true, unique: true },
  investorId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  shareClassId: { type: 'string', default: null },
  rightType: { type: 'string', required: true, enum: RIGHT_TYPES },
  status: { type: 'string', enum: VALID_STATUSES, default: 'ACTIVE' },
  terms: { type: 'object', default: {} },
  expirationDate: { type: 'date', default: null },
  effectiveDate: { type: 'date', default: null },
  sourceDocument: { type: 'string', default: null },
  sourceDocumentType: { type: 'string', enum: SOURCE_DOCUMENT_TYPES, default: 'INVESTOR_RIGHTS_AGREEMENT' },
  exerciseHistory: { type: 'array', default: [] },
  auditLog: { type: 'array', default: [] },
  waiveDetails: {
    type: 'object',
    default: {
      reason: null,
      documentReference: null,
      waivedBy: null,
      waivedAt: null
    }
  },
  notes: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('investor_rights', investorRightsSchema);

// Extended InvestorRights model with business logic
const InvestorRights = {
  ...baseModel,
  tableName: 'investor_rights',
  schema: investorRightsSchema,

  // Export constants
  RIGHT_TYPES,
  VALID_STATUSES,
  SOURCE_DOCUMENT_TYPES,
  AUDIT_ACTIONS,

  /**
   * Create a new investor right with defaults
   * @param {Object} data - Right data
   * @returns {Object} Created right
   */
  async create(data) {
    if (!data.rightId) {
      data.rightId = `right_${uuidv4()}`;
    }

    // Validate right type
    if (!RIGHT_TYPES.includes(data.rightType)) {
      throw new Error(`rightType must be one of: ${RIGHT_TYPES.join(', ')}`);
    }

    if (!data.status) {
      data.status = 'ACTIVE';
    }

    if (!data.effectiveDate) {
      data.effectiveDate = new Date().toISOString();
    }

    // Auto-expire if past expiration date
    if (data.expirationDate && new Date() > new Date(data.expirationDate) && data.status === 'ACTIVE') {
      data.status = 'EXPIRED';
    }

    // Add creation audit entry
    if (!data.auditLog) {
      data.auditLog = [];
    }
    data.auditLog.push({
      action: 'CREATED',
      userId: data.createdBy || 'system',
      timestamp: new Date().toISOString(),
      newValues: data
    });

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find right by rightId
   * @param {string} rightId - Right ID
   * @returns {Object|null} Right or null
   */
  async findByRightId(rightId) {
    return baseModel.findOne.call(baseModel, { rightId });
  },

  /**
   * Find rights by investor
   * @param {string} investorId - Investor ID
   * @param {Object} options - Query options
   * @returns {Array} Rights for investor
   */
  async findByInvestor(investorId, options = {}) {
    const query = { investorId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.companyId) {
      query.companyId = options.companyId;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by createdAt descending
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return records;
  },

  /**
   * Find rights by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Rights for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.rightType) {
      query.rightType = options.rightType;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by createdAt descending
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return records;
  },

  /**
   * Find rights by share class
   * @param {string} shareClassId - Share class ID
   * @param {Object} options - Query options
   * @returns {Array} Rights for share class
   */
  async findByShareClass(shareClassId, options = {}) {
    const query = { shareClassId };
    if (options.status) {
      query.status = options.status;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by createdAt descending
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return records;
  },

  /**
   * Find rights expiring within days
   * @param {number} days - Days to look ahead
   * @param {Object} options - Query options
   * @returns {Array} Expiring rights
   */
  async findExpiring(days = 30, options = {}) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const query = { status: 'ACTIVE' };
    if (options.companyId) {
      query.companyId = options.companyId;
    }
    if (options.investorId) {
      query.investorId = options.investorId;
    }

    const records = await baseModel.find.call(baseModel, query);

    return records
      .filter(r => {
        if (!r.expirationDate) return false;
        const expDate = new Date(r.expirationDate);
        return expDate >= now && expDate <= futureDate;
      })
      .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
  },

  /**
   * Check if right is expired
   * @param {Object} right - Right object
   * @returns {boolean} True if expired
   */
  isExpired(right) {
    if (!right.expirationDate) return false;
    return new Date() > new Date(right.expirationDate);
  },

  /**
   * Check if right is currently expired (virtual)
   * @param {Object} right - Right object
   * @returns {boolean} True if currently expired
   */
  isCurrentlyExpired(right) {
    if (!right.expirationDate) return false;
    return new Date() > new Date(right.expirationDate);
  },

  /**
   * Check if right can be exercised
   * @param {Object} right - Right object
   * @returns {boolean} True if can exercise
   */
  canExercise(right) {
    // Cannot exercise if not active
    if (right.status !== 'ACTIVE') return false;

    // Cannot exercise if expired
    if (this.isExpired(right)) return false;

    // Check if effective date has passed
    if (right.effectiveDate && new Date() < new Date(right.effectiveDate)) return false;

    return true;
  },

  /**
   * Add audit entry to right
   * @param {string} rightId - Right ID
   * @param {string} action - Audit action
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Object} Updated right
   */
  async addAuditEntry(rightId, action, userId, options = {}) {
    const right = await this.findByRightId(rightId);
    if (!right) {
      throw new Error('Right not found');
    }

    const auditLog = right.auditLog || [];
    auditLog.push({
      action,
      userId,
      timestamp: new Date().toISOString(),
      previousValues: options.previousValues,
      newValues: options.newValues,
      changes: options.changes,
      reason: options.reason
    });

    return baseModel.updateOne.call(baseModel,
      { rightId },
      { $set: { auditLog } }
    );
  },

  /**
   * Record exercise of right
   * @param {string} rightId - Right ID
   * @param {Object} exerciseData - Exercise details
   * @returns {Object} Updated right
   */
  async recordExercise(rightId, exerciseData) {
    const right = await this.findByRightId(rightId);
    if (!right) {
      throw new Error('Right not found');
    }

    const exerciseHistory = right.exerciseHistory || [];
    exerciseHistory.push({
      exerciseDate: exerciseData.exerciseDate || new Date().toISOString(),
      exerciseAmount: exerciseData.exerciseAmount,
      exercisedBy: exerciseData.exercisedBy,
      notes: exerciseData.notes,
      documentReference: exerciseData.documentReference,
      timestamp: new Date().toISOString()
    });

    const auditLog = right.auditLog || [];
    auditLog.push({
      action: 'EXERCISED',
      userId: exerciseData.exercisedBy,
      timestamp: new Date().toISOString(),
      newValues: exerciseData
    });

    return baseModel.updateOne.call(baseModel,
      { rightId },
      {
        $set: {
          exerciseHistory,
          auditLog,
          status: 'EXERCISED'
        }
      }
    );
  },

  /**
   * Waive right
   * @param {string} rightId - Right ID
   * @param {Object} waiveData - Waive details
   * @returns {Object} Updated right
   */
  async waive(rightId, waiveData) {
    const right = await this.findByRightId(rightId);
    if (!right) {
      throw new Error('Right not found');
    }

    const auditLog = right.auditLog || [];
    auditLog.push({
      action: 'WAIVED',
      userId: waiveData.waivedBy,
      timestamp: new Date().toISOString(),
      reason: waiveData.reason
    });

    return baseModel.updateOne.call(baseModel,
      { rightId },
      {
        $set: {
          status: 'WAIVED',
          waiveDetails: {
            reason: waiveData.reason,
            documentReference: waiveData.documentReference,
            waivedBy: waiveData.waivedBy,
            waivedAt: new Date().toISOString()
          },
          auditLog
        }
      }
    );
  },

  /**
   * Check for conflicts with existing rights
   * @param {Object} newRight - New right to check
   * @returns {Array} Conflicts found
   */
  async checkConflicts(newRight) {
    const conflicts = [];
    const { companyId, rightType, terms } = newRight;

    // Find existing active rights of the same type for this company
    const existingRights = await baseModel.find.call(baseModel, {
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

module.exports = InvestorRights;
