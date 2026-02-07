/**
 * PreferredTerms Model
 * Issue #260: Create preferred_terms table for liquidation preferences and seniority stack
 *
 * Data model for storing liquidation preferences and economic terms for
 * preferred share classes. Critical for 409A valuation waterfall calculations.
 *
 * Features:
 * - Liquidation preferences (1x, 2x, etc.)
 * - Seniority stack/rank
 * - Participation rights (participating vs non-participating)
 * - Participation caps
 * - Conversion ratios
 * - Anti-dilution provisions
 * - Dividend rights
 * - Voting rights
 * - Protective provisions
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid dividend types
const DIVIDEND_TYPES = ['NONE', 'NON_CUMULATIVE', 'CUMULATIVE'];

// Valid anti-dilution types
const ANTI_DILUTION_TYPES = ['NONE', 'FULL_RATCHET', 'BROAD_BASED_WEIGHTED_AVERAGE', 'NARROW_BASED_WEIGHTED_AVERAGE'];

// Valid voting rights types
const VOTING_RIGHTS_TYPES = ['AS_CONVERTED', 'CLASS_SPECIFIC', 'NONE'];

// Valid statuses
const VALID_STATUSES = ['ACTIVE', 'CONVERTED', 'REDEEMED', 'MODIFIED', 'ARCHIVED'];

// Schema definition for documentation and validation
const preferredTermsSchema = {
  preferredTermsId: { type: 'string', required: true, unique: true },
  shareClassId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },

  // Liquidation preference
  liquidationPreferenceMultiple: { type: 'number', required: true, default: 1.0, min: 0 },

  // Participation rights
  isParticipating: { type: 'boolean', default: false },
  participationCapMultiple: { type: 'number', default: null, min: 0 },

  // Dividend rights
  dividendType: { type: 'string', enum: DIVIDEND_TYPES, default: 'NONE' },
  dividendRate: { type: 'number', default: null, min: 0, max: 1 },
  accruedDividends: { type: 'number', default: 0 },

  // Conversion rights
  conversionRatio: { type: 'number', default: 1.0, min: 0 },
  isAutoConvert: { type: 'boolean', default: false },
  autoConvertThreshold: { type: 'number', default: null },
  autoConvertTrigger: { type: 'string', default: null }, // e.g., 'IPO', 'QUALIFIED_FINANCING'

  // Redemption rights
  hasRedemptionRights: { type: 'boolean', default: false },
  redemptionStartDate: { type: 'date', default: null },
  redemptionPrice: { type: 'number', default: null },
  redemptionTerms: { type: 'string', default: null },

  // Seniority
  seniorityRank: { type: 'number', required: true, min: 1 },
  pariPassuGroup: { type: 'string', default: null }, // Group ID for pari passu share classes

  // Anti-dilution protection
  antiDilutionType: { type: 'string', enum: ANTI_DILUTION_TYPES, default: 'NONE' },
  antiDilutionExclusions: { type: 'array', default: [] }, // Issuances excluded from anti-dilution

  // Voting rights
  votingRightsType: { type: 'string', enum: VOTING_RIGHTS_TYPES, default: 'AS_CONVERTED' },
  votesPerShare: { type: 'number', default: 1 },
  hasVetoRights: { type: 'boolean', default: false },

  // Protective provisions (veto rights)
  protectiveProvisions: {
    type: 'object',
    default: {
      amendCharterOrBylaws: false,
      createSeniorSecurity: false,
      authorizeAdditionalShares: false,
      declareOrPayDividends: false,
      redeemOrRepurchaseStock: false,
      mergerOrAcquisition: false,
      sellAllAssets: false,
      incurIndebtedness: false,
      issueNewSecurities: false,
      changeCapitalization: false,
      enterNewBusinessLine: false,
      hireOrFireExecutives: false,
      changeBoardSize: false,
      approveAnnualBudget: false,
      customProvisions: []
    }
  },

  // Pay-to-play provisions
  hasPayToPlay: { type: 'boolean', default: false },
  payToPlayTerms: { type: 'string', default: null },
  payToPlayConversionRatio: { type: 'number', default: null },

  // ROFR and co-sale
  hasROFR: { type: 'boolean', default: false }, // Right of First Refusal
  hasCoSale: { type: 'boolean', default: false }, // Co-sale/tag-along rights
  hasDragAlong: { type: 'boolean', default: false }, // Drag-along rights

  // Original investment info (for preference calculations)
  originalInvestment: { type: 'number', default: null },
  pricePerShare: { type: 'number', default: null },
  totalShares: { type: 'number', default: null },

  // Source documentation
  sourceDocument: { type: 'string', default: null },
  effectiveDate: { type: 'date', default: null },

  // Status and audit
  status: { type: 'string', enum: VALID_STATUSES, default: 'ACTIVE' },
  notes: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  auditLog: { type: 'array', default: [] },

  // Timestamps
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('preferred_terms', preferredTermsSchema);

// Extended PreferredTerms model with business logic
const PreferredTerms = {
  ...baseModel,
  tableName: 'preferred_terms',
  schema: preferredTermsSchema,

  // Export constants
  DIVIDEND_TYPES,
  ANTI_DILUTION_TYPES,
  VOTING_RIGHTS_TYPES,
  VALID_STATUSES,

  /**
   * Create a new preferred terms record with defaults
   * @param {Object} data - Preferred terms data
   * @returns {Object} Created preferred terms
   */
  async create(data) {
    // Generate ID if not provided
    if (!data.preferredTermsId) {
      data.preferredTermsId = `pt_${uuidv4()}`;
    }

    // Validate required fields
    if (!data.shareClassId) {
      throw new Error('shareClassId is required');
    }
    if (!data.companyId) {
      throw new Error('companyId is required');
    }
    if (data.seniorityRank === undefined || data.seniorityRank < 1) {
      throw new Error('seniorityRank is required and must be >= 1');
    }

    // Validate liquidation preference
    if (data.liquidationPreferenceMultiple !== undefined && data.liquidationPreferenceMultiple < 0) {
      throw new Error('liquidationPreferenceMultiple cannot be negative');
    }
    if (data.liquidationPreferenceMultiple === undefined) {
      data.liquidationPreferenceMultiple = 1.0;
    }

    // Validate participation cap only valid if participating
    if (data.participationCapMultiple !== null && data.participationCapMultiple !== undefined && !data.isParticipating) {
      throw new Error('participationCapMultiple is only valid if isParticipating is true');
    }

    // Validate dividend rate required if dividend type is not NONE
    if (data.dividendType && data.dividendType !== 'NONE') {
      if (data.dividendRate === null || data.dividendRate === undefined) {
        throw new Error('dividendRate is required when dividendType is not NONE');
      }
      if (data.dividendRate < 0 || data.dividendRate > 1) {
        throw new Error('dividendRate must be between 0 and 1 (percentage as decimal)');
      }
    }

    // Validate dividend type enum
    if (data.dividendType && !DIVIDEND_TYPES.includes(data.dividendType)) {
      throw new Error(`dividendType must be one of: ${DIVIDEND_TYPES.join(', ')}`);
    }

    // Validate anti-dilution type enum
    if (data.antiDilutionType && !ANTI_DILUTION_TYPES.includes(data.antiDilutionType)) {
      throw new Error(`antiDilutionType must be one of: ${ANTI_DILUTION_TYPES.join(', ')}`);
    }

    // Validate voting rights type enum
    if (data.votingRightsType && !VOTING_RIGHTS_TYPES.includes(data.votingRightsType)) {
      throw new Error(`votingRightsType must be one of: ${VOTING_RIGHTS_TYPES.join(', ')}`);
    }

    // Validate conversion ratio
    if (data.conversionRatio !== undefined && data.conversionRatio < 0) {
      throw new Error('conversionRatio cannot be negative');
    }

    // Set default status
    if (!data.status) {
      data.status = 'ACTIVE';
    }

    // Set effective date if not provided
    if (!data.effectiveDate) {
      data.effectiveDate = new Date().toISOString();
    }

    // Add creation audit entry
    if (!data.auditLog) {
      data.auditLog = [];
    }
    data.auditLog.push({
      action: 'CREATED',
      userId: data.createdBy || 'system',
      timestamp: new Date().toISOString(),
      changes: { newValues: data }
    });

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find preferred terms by preferredTermsId
   * @param {string} preferredTermsId - Preferred terms ID
   * @returns {Object|null} Preferred terms or null
   */
  async findByPreferredTermsId(preferredTermsId) {
    return baseModel.findOne.call(baseModel, { preferredTermsId });
  },

  /**
   * Find preferred terms by share class
   * @param {string} shareClassId - Share class ID
   * @returns {Object|null} Preferred terms or null
   */
  async findByShareClass(shareClassId) {
    return baseModel.findOne.call(baseModel, { shareClassId });
  },

  /**
   * Find all preferred terms for a company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Preferred terms for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by seniority rank (most senior first)
    records.sort((a, b) => a.seniorityRank - b.seniorityRank);

    return records;
  },

  /**
   * Get preference stack ordered by seniority
   * @param {string} companyId - Company ID
   * @returns {Array} Ordered preference stack
   */
  async getPreferenceStack(companyId) {
    const records = await this.findByCompany(companyId, { status: 'ACTIVE' });
    return records.sort((a, b) => a.seniorityRank - b.seniorityRank);
  },

  /**
   * Validate seniority rank uniqueness within company
   * @param {string} companyId - Company ID
   * @param {number} seniorityRank - Seniority rank to validate
   * @param {string} excludeId - ID to exclude from check (for updates)
   * @returns {boolean} True if rank is unique
   */
  async validateSeniorityRank(companyId, seniorityRank, excludeId = null) {
    const existingRecords = await this.findByCompany(companyId, { status: 'ACTIVE' });

    for (const record of existingRecords) {
      if (record.seniorityRank === seniorityRank) {
        // If we're updating, exclude the current record
        if (excludeId && (record.preferredTermsId === excludeId || record._id === excludeId)) {
          continue;
        }
        return false;
      }
    }
    return true;
  },

  /**
   * Calculate total liquidation preference for a share class
   * @param {Object} preferredTerms - Preferred terms object
   * @returns {number} Total liquidation preference amount
   */
  calculateLiquidationPreference(preferredTerms) {
    const investment = preferredTerms.originalInvestment ||
      (preferredTerms.totalShares * preferredTerms.pricePerShare) || 0;

    let preference = investment * preferredTerms.liquidationPreferenceMultiple;

    // Add accrued dividends for cumulative preferred
    if (preferredTerms.dividendType === 'CUMULATIVE') {
      preference += preferredTerms.accruedDividends || 0;
    }

    return preference;
  },

  /**
   * Calculate participation proceeds
   * @param {Object} preferredTerms - Preferred terms object
   * @param {number} remainingProceeds - Remaining proceeds after preferences
   * @param {number} fullyDilutedShares - Total fully diluted shares
   * @returns {number} Participation proceeds
   */
  calculateParticipation(preferredTerms, remainingProceeds, fullyDilutedShares) {
    if (!preferredTerms.isParticipating) {
      return 0;
    }

    const shares = preferredTerms.totalShares || 0;
    // Handle explicit 0 conversion ratio as well as undefined
    const conversionRatio = preferredTerms.conversionRatio === 0 ? 0 : (preferredTerms.conversionRatio || 1);
    const asConvertedShares = shares * conversionRatio;
    const proRataShare = (asConvertedShares / fullyDilutedShares) * remainingProceeds;

    // Apply participation cap if applicable
    if (preferredTerms.participationCapMultiple !== null && preferredTerms.participationCapMultiple !== undefined) {
      const investment = preferredTerms.originalInvestment ||
        (preferredTerms.totalShares * preferredTerms.pricePerShare) || 0;
      const maxTotal = investment * preferredTerms.participationCapMultiple;
      const preference = this.calculateLiquidationPreference(preferredTerms);
      const maxParticipation = Math.max(0, maxTotal - preference);
      return Math.min(proRataShare, maxParticipation);
    }

    return proRataShare;
  },

  /**
   * Determine if share class should convert to common
   * @param {Object} preferredTerms - Preferred terms object
   * @param {number} exitValuation - Exit valuation amount
   * @param {number} fullyDilutedShares - Total fully diluted shares
   * @returns {Object} Conversion recommendation
   */
  shouldConvert(preferredTerms, exitValuation, fullyDilutedShares) {
    const shares = preferredTerms.totalShares || 0;
    const asConvertedShares = shares * (preferredTerms.conversionRatio || 1);
    const asConvertedValue = (asConvertedShares / fullyDilutedShares) * exitValuation;

    // Calculate value if taking preference
    let preferenceValue = this.calculateLiquidationPreference(preferredTerms);

    // For participating preferred, add participation
    if (preferredTerms.isParticipating) {
      const remainingAfterPreferences = exitValuation - preferenceValue; // Simplified
      preferenceValue += this.calculateParticipation(
        preferredTerms,
        remainingAfterPreferences,
        fullyDilutedShares
      );
    }

    return {
      shouldConvert: asConvertedValue > preferenceValue,
      asConvertedValue,
      preferenceValue,
      valueDifference: asConvertedValue - preferenceValue
    };
  },

  /**
   * Check if share class has active protective provisions
   * @param {Object} preferredTerms - Preferred terms object
   * @returns {Array} List of active protective provisions
   */
  getActiveProtectiveProvisions(preferredTerms) {
    const provisions = preferredTerms.protectiveProvisions || {};
    const activeProvisions = [];

    const provisionNames = {
      amendCharterOrBylaws: 'Amend Charter or Bylaws',
      createSeniorSecurity: 'Create Senior Security',
      authorizeAdditionalShares: 'Authorize Additional Shares',
      declareOrPayDividends: 'Declare or Pay Dividends',
      redeemOrRepurchaseStock: 'Redeem or Repurchase Stock',
      mergerOrAcquisition: 'Merger or Acquisition',
      sellAllAssets: 'Sell All Assets',
      incurIndebtedness: 'Incur Indebtedness',
      issueNewSecurities: 'Issue New Securities',
      changeCapitalization: 'Change Capitalization',
      enterNewBusinessLine: 'Enter New Business Line',
      hireOrFireExecutives: 'Hire or Fire Executives',
      changeBoardSize: 'Change Board Size',
      approveAnnualBudget: 'Approve Annual Budget'
    };

    for (const [key, label] of Object.entries(provisionNames)) {
      if (provisions[key] === true) {
        activeProvisions.push({ key, label });
      }
    }

    // Add custom provisions
    if (provisions.customProvisions && Array.isArray(provisions.customProvisions)) {
      provisions.customProvisions.forEach((provision, index) => {
        activeProvisions.push({
          key: `custom_${index}`,
          label: provision.name || provision,
          custom: true
        });
      });
    }

    return activeProvisions;
  },

  /**
   * Check if redemption is available
   * @param {Object} preferredTerms - Preferred terms object
   * @returns {Object} Redemption availability info
   */
  isRedemptionAvailable(preferredTerms) {
    if (!preferredTerms.hasRedemptionRights) {
      return { available: false, reason: 'No redemption rights' };
    }

    if (preferredTerms.redemptionStartDate) {
      const startDate = new Date(preferredTerms.redemptionStartDate);
      if (new Date() < startDate) {
        return {
          available: false,
          reason: 'Redemption period not yet started',
          startDate: preferredTerms.redemptionStartDate
        };
      }
    }

    return {
      available: true,
      redemptionPrice: preferredTerms.redemptionPrice,
      terms: preferredTerms.redemptionTerms
    };
  },

  /**
   * Add audit entry
   * @param {string} preferredTermsId - Preferred terms ID
   * @param {string} action - Audit action
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Object} Update result
   */
  async addAuditEntry(preferredTermsId, action, userId, options = {}) {
    const record = await this.findByPreferredTermsId(preferredTermsId);
    if (!record) {
      throw new Error('PreferredTerms not found');
    }

    const auditLog = record.auditLog || [];
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
      { preferredTermsId },
      { $set: { auditLog } }
    );
  },

  /**
   * Update seniority ranks (reorder)
   * @param {string} companyId - Company ID
   * @param {Array} newOrder - Array of { preferredTermsId, newRank }
   * @returns {Array} Updated records
   */
  async reorderSeniority(companyId, newOrder) {
    const results = [];

    for (const { preferredTermsId, newRank } of newOrder) {
      const result = await baseModel.updateOne.call(baseModel,
        { preferredTermsId, companyId },
        { $set: { seniorityRank: newRank } }
      );
      results.push(result);
    }

    return results;
  },

  /**
   * Convert to common (mark as converted)
   * @param {string} preferredTermsId - Preferred terms ID
   * @param {Object} conversionDetails - Conversion details
   * @returns {Object} Update result
   */
  async markConverted(preferredTermsId, conversionDetails = {}) {
    const record = await this.findByPreferredTermsId(preferredTermsId);
    if (!record) {
      throw new Error('PreferredTerms not found');
    }

    const auditLog = record.auditLog || [];
    auditLog.push({
      action: 'CONVERTED',
      userId: conversionDetails.convertedBy || 'system',
      timestamp: new Date().toISOString(),
      reason: conversionDetails.reason,
      conversionDetails
    });

    return baseModel.updateOne.call(baseModel,
      { preferredTermsId },
      {
        $set: {
          status: 'CONVERTED',
          auditLog,
          metadata: {
            ...record.metadata,
            conversionDate: new Date().toISOString(),
            conversionDetails
          }
        }
      }
    );
  },

  /**
   * Mark as redeemed
   * @param {string} preferredTermsId - Preferred terms ID
   * @param {Object} redemptionDetails - Redemption details
   * @returns {Object} Update result
   */
  async markRedeemed(preferredTermsId, redemptionDetails = {}) {
    const record = await this.findByPreferredTermsId(preferredTermsId);
    if (!record) {
      throw new Error('PreferredTerms not found');
    }

    const auditLog = record.auditLog || [];
    auditLog.push({
      action: 'REDEEMED',
      userId: redemptionDetails.redeemedBy || 'system',
      timestamp: new Date().toISOString(),
      reason: redemptionDetails.reason,
      redemptionDetails
    });

    return baseModel.updateOne.call(baseModel,
      { preferredTermsId },
      {
        $set: {
          status: 'REDEEMED',
          auditLog,
          metadata: {
            ...record.metadata,
            redemptionDate: new Date().toISOString(),
            redemptionDetails
          }
        }
      }
    );
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

module.exports = PreferredTerms;
