/**
 * SecondaryMarketListing Model
 * Issue #103: Create Secondary Transaction Model
 *
 * Data model for managing secondary market share listings including:
 * - Share listings for sale
 * - Visibility controls
 * - Interested buyer tracking
 * - Expiration handling
 */
const mongoose = require('mongoose');

// Interested buyer sub-schema
const interestedBuyerSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  buyerName: { type: String },
  expressedAt: { type: Date, default: Date.now },
  offeredPrice: { type: Number, min: 0 },
  offeredShares: { type: Number, min: 1 },
  status: {
    type: String,
    enum: ['interested', 'negotiating', 'accepted', 'rejected', 'withdrawn'],
    default: 'interested'
  },
  message: { type: String },
  respondedAt: { type: Date },
  responseMessage: { type: String }
}, { _id: false });

// Invited stakeholder sub-schema (for private/invited_only listings)
const invitedStakeholderSchema = new mongoose.Schema({
  stakeholderId: { type: String, required: true },
  invitedAt: { type: Date, default: Date.now },
  invitedBy: { type: String },
  viewed: { type: Boolean, default: false },
  viewedAt: { type: Date }
}, { _id: false });

// Secondary Market Listing schema
const secondaryMarketListingSchema = new mongoose.Schema({
  listingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Company reference
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Seller (Stakeholder ID)
  sellerId: {
    type: String,
    required: true,
    index: true
  },
  sellerName: {
    type: String
  },

  // Share details
  shareClassId: {
    type: String,
    required: true,
    index: true
  },
  shareClassName: {
    type: String
  },
  numberOfShares: {
    type: Number,
    required: true,
    min: 1
  },
  sharesAvailable: {
    type: Number,
    min: 0
  },

  // Pricing
  askingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minPrice: {
    type: Number,
    min: 0
  },
  pricePerShare: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  negotiable: {
    type: Boolean,
    default: true
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'pending_approval', 'sold', 'partially_sold', 'expired', 'withdrawn', 'suspended'],
    default: 'active',
    index: true
  },

  // Dates
  listedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: true
  },
  soldAt: {
    type: Date
  },
  withdrawnAt: {
    type: Date
  },

  // Visibility controls
  visibility: {
    type: String,
    enum: ['public', 'private', 'invited_only'],
    default: 'private',
    index: true
  },

  // Invited stakeholders (for private/invited_only listings)
  invitedStakeholders: [invitedStakeholderSchema],

  // Interested buyers tracking
  interestedBuyers: [interestedBuyerSchema],

  // Completed transactions from this listing
  completedTransactions: [{
    transactionId: { type: String },
    buyerId: { type: String },
    numberOfShares: { type: Number },
    pricePerShare: { type: Number },
    completedAt: { type: Date }
  }],

  // Listing restrictions
  restrictions: {
    minPurchaseShares: { type: Number, min: 1, default: 1 },
    maxPurchaseShares: { type: Number },
    accreditedInvestorsOnly: { type: Boolean, default: false },
    existingStakeholdersOnly: { type: Boolean, default: false },
    requiresCompanyApproval: { type: Boolean, default: true }
  },

  // Description and notes
  description: {
    type: String
  },
  sellerNotes: {
    type: String
  },
  termsAndConditions: {
    type: String
  },

  // Valuation context (optional)
  valuationContext: {
    lastValuationPrice: { type: Number },
    lastValuationDate: { type: Date },
    valuationSource: { type: String }
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Audit
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
secondaryMarketListingSchema.index({ companyId: 1, status: 1 });
secondaryMarketListingSchema.index({ sellerId: 1, status: 1 });
secondaryMarketListingSchema.index({ shareClassId: 1, status: 1 });
secondaryMarketListingSchema.index({ status: 1, expiresAt: 1 });
secondaryMarketListingSchema.index({ visibility: 1, status: 1 });

// Pre-save hook to initialize values
secondaryMarketListingSchema.pre('save', function(next) {
  // Initialize sharesAvailable to numberOfShares if not set
  if (this.isNew && this.sharesAvailable === undefined) {
    this.sharesAvailable = this.numberOfShares;
  }

  // Calculate price per share if not set
  if (this.askingPrice && this.numberOfShares && !this.pricePerShare) {
    this.pricePerShare = this.askingPrice / this.numberOfShares;
  }

  // Set soldAt when status changes to sold
  if (this.isModified('status') && this.status === 'sold' && !this.soldAt) {
    this.soldAt = new Date();
  }

  // Set withdrawnAt when status changes to withdrawn
  if (this.isModified('status') && this.status === 'withdrawn' && !this.withdrawnAt) {
    this.withdrawnAt = new Date();
  }

  // Update status to partially_sold if some shares are sold
  if (this.sharesAvailable < this.numberOfShares && this.sharesAvailable > 0 && this.status === 'active') {
    this.status = 'partially_sold';
  }

  // Update status to sold if all shares are sold
  if (this.sharesAvailable === 0 && this.status !== 'sold') {
    this.status = 'sold';
    this.soldAt = new Date();
  }

  next();
});

// Virtual for total interested buyers count
secondaryMarketListingSchema.virtual('interestedBuyersCount').get(function() {
  return this.interestedBuyers ? this.interestedBuyers.length : 0;
});

// Virtual for total asking value
secondaryMarketListingSchema.virtual('totalAskingValue').get(function() {
  return this.askingPrice || (this.pricePerShare * this.numberOfShares);
});

// Virtual for sold percentage
secondaryMarketListingSchema.virtual('soldPercentage').get(function() {
  if (this.numberOfShares === 0) return 0;
  const soldShares = this.numberOfShares - (this.sharesAvailable || 0);
  return (soldShares / this.numberOfShares) * 100;
});

// Virtual to check if listing is expired
secondaryMarketListingSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to express interest from a buyer
secondaryMarketListingSchema.methods.addInterestedBuyer = function(buyerInfo) {
  const existingBuyer = this.interestedBuyers.find(b => b.buyerId === buyerInfo.buyerId);
  if (existingBuyer) {
    // Update existing interest
    existingBuyer.offeredPrice = buyerInfo.offeredPrice || existingBuyer.offeredPrice;
    existingBuyer.offeredShares = buyerInfo.offeredShares || existingBuyer.offeredShares;
    existingBuyer.message = buyerInfo.message || existingBuyer.message;
    existingBuyer.expressedAt = new Date();
  } else {
    // Add new interest
    this.interestedBuyers.push({
      buyerId: buyerInfo.buyerId,
      buyerName: buyerInfo.buyerName,
      offeredPrice: buyerInfo.offeredPrice,
      offeredShares: buyerInfo.offeredShares,
      message: buyerInfo.message,
      status: 'interested'
    });
  }
};

// Method to respond to an interested buyer
secondaryMarketListingSchema.methods.respondToBuyer = function(buyerId, response) {
  const buyer = this.interestedBuyers.find(b => b.buyerId === buyerId);
  if (buyer) {
    buyer.status = response.status;
    buyer.responseMessage = response.message;
    buyer.respondedAt = new Date();
    return true;
  }
  return false;
};

// Method to record a completed transaction
secondaryMarketListingSchema.methods.recordTransaction = function(transaction) {
  this.completedTransactions.push({
    transactionId: transaction.transactionId,
    buyerId: transaction.buyerId,
    numberOfShares: transaction.numberOfShares,
    pricePerShare: transaction.pricePerShare,
    completedAt: new Date()
  });
  this.sharesAvailable = Math.max(0, (this.sharesAvailable || this.numberOfShares) - transaction.numberOfShares);
};

// Ensure virtuals are included in JSON
secondaryMarketListingSchema.set('toJSON', { virtuals: true });
secondaryMarketListingSchema.set('toObject', { virtuals: true });

const SecondaryMarketListing = mongoose.model('SecondaryMarketListing', secondaryMarketListingSchema);

module.exports = SecondaryMarketListing;
