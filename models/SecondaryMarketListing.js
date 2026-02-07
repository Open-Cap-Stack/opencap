/**
 * SecondaryMarketListing Model
 * Issue #103: Create Secondary Transaction Model
 *
 * Data model for managing secondary market share listings including:
 * - Share listings for sale
 * - Visibility controls
 * - Interested buyer tracking
 * - Expiration handling
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['draft', 'active', 'pending_approval', 'sold', 'partially_sold', 'expired', 'withdrawn', 'suspended'];

// Valid visibility options
const VISIBILITY_OPTIONS = ['public', 'private', 'invited_only'];

// Valid buyer interest statuses
const BUYER_STATUSES = ['interested', 'negotiating', 'accepted', 'rejected', 'withdrawn'];

// Schema definition for documentation and validation
const secondaryMarketListingSchema = {
  listingId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  sellerId: { type: 'string', required: true },
  sellerName: { type: 'string', default: null },
  shareClassId: { type: 'string', required: true },
  shareClassName: { type: 'string', default: null },
  numberOfShares: { type: 'number', required: true },
  sharesAvailable: { type: 'number', default: null },
  askingPrice: { type: 'number', required: true },
  minPrice: { type: 'number', default: null },
  pricePerShare: { type: 'number', default: null },
  currency: { type: 'string', default: 'USD' },
  negotiable: { type: 'boolean', default: true },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  listedAt: { type: 'date', default: null },
  expiresAt: { type: 'date', default: null },
  soldAt: { type: 'date', default: null },
  withdrawnAt: { type: 'date', default: null },
  visibility: { type: 'string', enum: VISIBILITY_OPTIONS, default: 'private' },
  invitedStakeholders: { type: 'array', default: [] },
  interestedBuyers: { type: 'array', default: [] },
  completedTransactions: { type: 'array', default: [] },
  restrictions: {
    type: 'object',
    default: {
      minPurchaseShares: 1,
      maxPurchaseShares: null,
      accreditedInvestorsOnly: false,
      existingStakeholdersOnly: false,
      requiresCompanyApproval: true
    }
  },
  description: { type: 'string', default: '' },
  sellerNotes: { type: 'string', default: '' },
  termsAndConditions: { type: 'string', default: '' },
  valuationContext: {
    type: 'object',
    default: {
      lastValuationPrice: null,
      lastValuationDate: null,
      valuationSource: null
    }
  },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('secondary_market_listings', secondaryMarketListingSchema);

// Extended SecondaryMarketListing model with business logic
const SecondaryMarketListing = {
  ...baseModel,
  tableName: 'secondary_market_listings',
  schema: secondaryMarketListingSchema,

  // Export constants
  VALID_STATUSES,
  VISIBILITY_OPTIONS,
  BUYER_STATUSES,

  /**
   * Create a new listing with defaults
   * @param {Object} data - Listing data
   * @returns {Object} Created listing
   */
  async create(data) {
    if (!data.listingId) {
      data.listingId = `lst_${uuidv4()}`;
    }

    // Validate shares
    if (data.numberOfShares < 1) {
      throw new Error('numberOfShares must be at least 1');
    }

    // Validate asking price
    if (data.askingPrice < 0) {
      throw new Error('askingPrice cannot be negative');
    }

    // Initialize shares available
    if (data.sharesAvailable === undefined || data.sharesAvailable === null) {
      data.sharesAvailable = data.numberOfShares;
    }

    // Calculate price per share
    if (!data.pricePerShare && data.askingPrice && data.numberOfShares) {
      data.pricePerShare = data.askingPrice / data.numberOfShares;
    }

    if (!data.status) {
      data.status = 'active';
    }

    if (!data.listedAt) {
      data.listedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find listing by listingId
   * @param {string} listingId - Listing ID
   * @returns {Object|null} Listing or null
   */
  async findByListingId(listingId) {
    return baseModel.findOne.call(baseModel, { listingId });
  },

  /**
   * Find listings by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Listings for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.visibility) {
      query.visibility = options.visibility;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find listings by seller
   * @param {string} sellerId - Seller ID
   * @param {Object} options - Query options
   * @returns {Array} Listings by seller
   */
  async findBySeller(sellerId, options = {}) {
    const query = { sellerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find active listings
   * @param {string} companyId - Company ID
   * @returns {Array} Active listings
   */
  async findActive(companyId) {
    return baseModel.find.call(baseModel, { companyId, status: 'active' });
  },

  /**
   * Get interested buyers count
   * @param {Object} listing - Listing object
   * @returns {number} Number of interested buyers
   */
  getInterestedBuyersCount(listing) {
    return listing.interestedBuyers ? listing.interestedBuyers.length : 0;
  },

  /**
   * Get total asking value
   * @param {Object} listing - Listing object
   * @returns {number} Total asking value
   */
  getTotalAskingValue(listing) {
    return listing.askingPrice || (listing.pricePerShare * listing.numberOfShares);
  },

  /**
   * Get sold percentage
   * @param {Object} listing - Listing object
   * @returns {number} Sold percentage
   */
  getSoldPercentage(listing) {
    if (listing.numberOfShares === 0) return 0;
    const soldShares = listing.numberOfShares - (listing.sharesAvailable || 0);
    return (soldShares / listing.numberOfShares) * 100;
  },

  /**
   * Check if listing is expired
   * @param {Object} listing - Listing object
   * @returns {boolean} True if expired
   */
  isExpired(listing) {
    if (!listing.expiresAt) return false;
    return new Date() > new Date(listing.expiresAt);
  },

  /**
   * Add interested buyer
   * @param {string} listingId - Listing ID
   * @param {Object} buyerInfo - Buyer information
   * @returns {Object} Updated listing
   */
  async addInterestedBuyer(listingId, buyerInfo) {
    const listing = await this.findByListingId(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const interestedBuyers = listing.interestedBuyers || [];
    const existingIndex = interestedBuyers.findIndex(b => b.buyerId === buyerInfo.buyerId);

    if (existingIndex >= 0) {
      // Update existing interest
      interestedBuyers[existingIndex] = {
        ...interestedBuyers[existingIndex],
        offeredPrice: buyerInfo.offeredPrice || interestedBuyers[existingIndex].offeredPrice,
        offeredShares: buyerInfo.offeredShares || interestedBuyers[existingIndex].offeredShares,
        message: buyerInfo.message || interestedBuyers[existingIndex].message,
        expressedAt: new Date().toISOString()
      };
    } else {
      // Add new interest
      interestedBuyers.push({
        buyerId: buyerInfo.buyerId,
        buyerName: buyerInfo.buyerName,
        expressedAt: new Date().toISOString(),
        offeredPrice: buyerInfo.offeredPrice,
        offeredShares: buyerInfo.offeredShares,
        status: 'interested',
        message: buyerInfo.message
      });
    }

    return baseModel.updateOne.call(baseModel,
      { listingId },
      { $set: { interestedBuyers } }
    );
  },

  /**
   * Respond to interested buyer
   * @param {string} listingId - Listing ID
   * @param {string} buyerId - Buyer ID
   * @param {Object} response - Response data
   * @returns {Object} Updated listing
   */
  async respondToBuyer(listingId, buyerId, response) {
    const listing = await this.findByListingId(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const interestedBuyers = listing.interestedBuyers || [];
    const buyerIndex = interestedBuyers.findIndex(b => b.buyerId === buyerId);

    if (buyerIndex < 0) {
      throw new Error('Buyer not found');
    }

    interestedBuyers[buyerIndex].status = response.status;
    interestedBuyers[buyerIndex].responseMessage = response.message;
    interestedBuyers[buyerIndex].respondedAt = new Date().toISOString();

    return baseModel.updateOne.call(baseModel,
      { listingId },
      { $set: { interestedBuyers } }
    );
  },

  /**
   * Record completed transaction
   * @param {string} listingId - Listing ID
   * @param {Object} transaction - Transaction data
   * @returns {Object} Updated listing
   */
  async recordTransaction(listingId, transaction) {
    const listing = await this.findByListingId(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const completedTransactions = listing.completedTransactions || [];
    completedTransactions.push({
      transactionId: transaction.transactionId,
      buyerId: transaction.buyerId,
      numberOfShares: transaction.numberOfShares,
      pricePerShare: transaction.pricePerShare,
      completedAt: new Date().toISOString()
    });

    const sharesAvailable = Math.max(0, (listing.sharesAvailable || listing.numberOfShares) - transaction.numberOfShares);
    let status = listing.status;

    // Update status based on shares available
    if (sharesAvailable === 0) {
      status = 'sold';
    } else if (sharesAvailable < listing.numberOfShares) {
      status = 'partially_sold';
    }

    const updateData = {
      completedTransactions,
      sharesAvailable,
      status
    };

    if (status === 'sold') {
      updateData.soldAt = new Date().toISOString();
    }

    return baseModel.updateOne.call(baseModel,
      { listingId },
      { $set: updateData }
    );
  },

  /**
   * Withdraw listing
   * @param {string} listingId - Listing ID
   * @returns {Object} Updated listing
   */
  async withdraw(listingId) {
    return baseModel.updateOne.call(baseModel,
      { listingId },
      {
        $set: {
          status: 'withdrawn',
          withdrawnAt: new Date().toISOString()
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

module.exports = SecondaryMarketListing;
