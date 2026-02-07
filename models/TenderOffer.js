/**
 * TenderOffer Model
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * Data model for company-initiated liquidity events (share buybacks)
 * Supports:
 * - Offer configuration and eligibility
 * - Status lifecycle management
 * - Participation limits
 * - Submission tracking
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['draft', 'open', 'closed', 'canceled', 'settled'];

// Valid employee statuses for eligibility
const EMPLOYEE_STATUSES = ['active', 'former', 'terminated', 'retired'];

// Schema definition for documentation and validation
const tenderOfferSchema = {
  offerId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  pricePerShare: { type: 'number', required: true },
  totalBudget: { type: 'number', required: true },
  shareClasses: { type: 'array', default: [] },
  startDate: { type: 'date', default: null },
  endDate: { type: 'date', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  minShares: { type: 'number', default: 1 },
  maxShares: { type: 'number', default: null },
  eligibilityCriteria: {
    type: 'object',
    default: {
      minTenureMonths: 0,
      minSharesHeld: 0,
      employeeStatus: ['active', 'former'],
      excludedStakeholders: [],
      customRules: {}
    }
  },
  totalSharesTendered: { type: 'number', default: 0 },
  totalSharesAccepted: { type: 'number', default: 0 },
  totalPayoutAmount: { type: 'number', default: 0 },
  prorataPercentage: { type: 'number', default: null },
  isOversubscribed: { type: 'boolean', default: false },
  publishedAt: { type: 'date', default: null },
  closedAt: { type: 'date', default: null },
  settledAt: { type: 'date', default: null },
  canceledAt: { type: 'date', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('tender_offers', tenderOfferSchema);

// Extended TenderOffer model with business logic
const TenderOffer = {
  ...baseModel,
  tableName: 'tender_offers',
  schema: tenderOfferSchema,

  // Export constants
  VALID_STATUSES,
  EMPLOYEE_STATUSES,

  /**
   * Create a new tender offer with defaults
   * @param {Object} data - Offer data
   * @returns {Object} Created offer
   */
  async create(data) {
    if (!data.offerId) {
      data.offerId = `offer_${uuidv4()}`;
    }

    // Validate price
    if (data.pricePerShare < 0) {
      throw new Error('pricePerShare cannot be negative');
    }

    // Validate budget
    if (data.totalBudget < 0) {
      throw new Error('totalBudget cannot be negative');
    }

    if (!data.status) {
      data.status = 'draft';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find offer by offerId
   * @param {string} offerId - Offer ID
   * @returns {Object|null} Offer or null
   */
  async findByOfferId(offerId) {
    return baseModel.findOne.call(baseModel, { offerId });
  },

  /**
   * Find offers by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Offers for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find active offers
   * @param {string} companyId - Company ID
   * @returns {Array} Active offers
   */
  async findActive(companyId) {
    const offers = await baseModel.find.call(baseModel, { companyId, status: 'open' });
    const now = new Date();
    return offers.filter(offer => {
      if (offer.startDate && now < new Date(offer.startDate)) return false;
      if (offer.endDate && now > new Date(offer.endDate)) return false;
      return true;
    });
  },

  /**
   * Get maximum purchasable shares
   * @param {Object} offer - Offer object
   * @returns {number} Max purchasable shares
   */
  getMaxPurchasableShares(offer) {
    if (offer.pricePerShare === 0) return 0;
    return Math.floor(offer.totalBudget / offer.pricePerShare);
  },

  /**
   * Get remaining budget
   * @param {Object} offer - Offer object
   * @returns {number} Remaining budget
   */
  getRemainingBudget(offer) {
    return offer.totalBudget - (offer.totalPayoutAmount || 0);
  },

  /**
   * Get subscription ratio
   * @param {Object} offer - Offer object
   * @returns {number} Subscription ratio
   */
  getSubscriptionRatio(offer) {
    const maxShares = this.getMaxPurchasableShares(offer);
    if (maxShares === 0) return 0;
    return (offer.totalSharesTendered || 0) / maxShares;
  },

  /**
   * Check if offer is active
   * @param {Object} offer - Offer object
   * @returns {boolean} True if active
   */
  isActive(offer) {
    if (offer.status !== 'open') return false;
    const now = new Date();
    if (offer.startDate && now < new Date(offer.startDate)) return false;
    if (offer.endDate && now > new Date(offer.endDate)) return false;
    return true;
  },

  /**
   * Publish offer
   * @param {string} offerId - Offer ID
   * @returns {Object} Updated offer
   */
  async publish(offerId) {
    return baseModel.updateOne.call(baseModel,
      { offerId },
      {
        $set: {
          status: 'open',
          publishedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Close offer
   * @param {string} offerId - Offer ID
   * @returns {Object} Updated offer
   */
  async close(offerId) {
    return baseModel.updateOne.call(baseModel,
      { offerId },
      {
        $set: {
          status: 'closed',
          closedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Cancel offer
   * @param {string} offerId - Offer ID
   * @returns {Object} Updated offer
   */
  async cancel(offerId) {
    return baseModel.updateOne.call(baseModel,
      { offerId },
      {
        $set: {
          status: 'canceled',
          canceledAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Settle offer
   * @param {string} offerId - Offer ID
   * @param {Object} settlementData - Settlement data
   * @returns {Object} Updated offer
   */
  async settle(offerId, settlementData = {}) {
    return baseModel.updateOne.call(baseModel,
      { offerId },
      {
        $set: {
          status: 'settled',
          settledAt: new Date().toISOString(),
          totalSharesAccepted: settlementData.totalSharesAccepted,
          totalPayoutAmount: settlementData.totalPayoutAmount,
          prorataPercentage: settlementData.prorataPercentage,
          isOversubscribed: settlementData.isOversubscribed || false
        }
      }
    );
  },

  /**
   * Update tender totals
   * @param {string} offerId - Offer ID
   * @param {number} sharesTendered - Total shares tendered
   * @returns {Object} Updated offer
   */
  async updateTenderTotals(offerId, sharesTendered) {
    const offer = await this.findByOfferId(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    const maxShares = this.getMaxPurchasableShares(offer);
    const isOversubscribed = sharesTendered > maxShares;

    return baseModel.updateOne.call(baseModel,
      { offerId },
      {
        $set: {
          totalSharesTendered: sharesTendered,
          isOversubscribed
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

module.exports = TenderOffer;
