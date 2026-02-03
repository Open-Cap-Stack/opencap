/**
 * SecondaryTransaction Service
 * Issue #103: Create Secondary Transaction Model
 *
 * Business logic for secondary share transactions including:
 * - Creating and managing market listings
 * - Processing transactions between stakeholders
 * - Fee calculations
 * - Report generation
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

class SecondaryTransactionService {
  /**
   * Fee rates for different transaction types (as percentages)
   */
  static FEE_RATES = {
    private_sale: { platform: 1.5, legal: 0.5 },
    tender_offer: { platform: 1.0, legal: 0.75 },
    rofr_exercise: { platform: 1.0, legal: 0.5 },
    gift: { platform: 0.25, legal: 0.25 },
    estate_transfer: { platform: 0.5, legal: 0.5 },
    company_buyback: { platform: 0.5, legal: 0.25 }
  };

  /**
   * Generate a unique listing ID
   * @returns {string}
   */
  static generateListingId() {
    return `LST-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Generate a unique transaction ID
   * @returns {string}
   */
  static generateTransactionId() {
    return `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Create a new market listing for selling shares
   * @param {Object} listingData - Listing data
   * @returns {Object} Created listing
   */
  static async createListing(listingData) {
    const listing = {
      ...listingData,
      listingId: listingData.listingId || this.generateListingId(),
      status: listingData.status || 'active',
      sharesAvailable: listingData.sharesAvailable || listingData.numberOfShares,
      listedAt: new Date()
    };

    // Calculate price per share if not provided
    if (listing.askingPrice && listing.numberOfShares && !listing.pricePerShare) {
      listing.pricePerShare = listing.askingPrice / listing.numberOfShares;
    }

    return await databaseAdapter.create('SecondaryMarketListing', listing);
  }

  /**
   * Update an existing listing
   * @param {string} listingId - Listing ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated listing or null if not found
   */
  static async updateListing(listingId, updateData) {
    return await databaseAdapter.findByIdAndUpdate(
      'SecondaryMarketListing',
      listingId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Get a listing by ID
   * @param {string} listingId - Listing ID
   * @returns {Object|null} Listing or null
   */
  static async getListingById(listingId) {
    return await databaseAdapter.findById('SecondaryMarketListing', listingId);
  }

  /**
   * Get listings with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} List of listings
   */
  static async getListings(filters = {}) {
    const query = {};

    if (filters.companyId) query.companyId = filters.companyId;
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.shareClassId) query.shareClassId = filters.shareClassId;
    if (filters.status) query.status = filters.status;
    if (filters.visibility) query.visibility = filters.visibility;

    return await databaseAdapter.find('SecondaryMarketListing', query, {
      sort: { listedAt: -1 }
    });
  }

  /**
   * Express interest in a listing
   * @param {Object} interestData - Interest data
   * @returns {Object} Updated listing
   */
  static async expressInterest(interestData) {
    const { listingId, buyerId, buyerName, offeredPrice, offeredShares, message } = interestData;

    const listing = await databaseAdapter.findById('SecondaryMarketListing', listingId);

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active' && listing.status !== 'partially_sold') {
      throw new Error('Listing is not active');
    }

    // Build the update for interested buyers
    const interestedBuyers = listing.interestedBuyers || [];
    const existingBuyerIndex = interestedBuyers.findIndex(b => b.buyerId === buyerId);

    const buyerInterest = {
      buyerId,
      buyerName,
      offeredPrice,
      offeredShares,
      message,
      expressedAt: new Date(),
      status: 'interested'
    };

    if (existingBuyerIndex >= 0) {
      interestedBuyers[existingBuyerIndex] = buyerInterest;
    } else {
      interestedBuyers.push(buyerInterest);
    }

    return await databaseAdapter.findByIdAndUpdate(
      'SecondaryMarketListing',
      listingId,
      { interestedBuyers },
      { new: true }
    );
  }

  /**
   * Withdraw a listing from the market
   * @param {string} listingId - Listing ID
   * @param {string} withdrawnBy - User ID who withdrew
   * @returns {Object} Updated listing
   */
  static async withdrawListing(listingId, withdrawnBy) {
    const listing = await databaseAdapter.findById('SecondaryMarketListing', listingId);

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active' && listing.status !== 'partially_sold') {
      throw new Error('Listing cannot be withdrawn');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'SecondaryMarketListing',
      listingId,
      {
        status: 'withdrawn',
        withdrawnAt: new Date(),
        updatedBy: withdrawnBy
      },
      { new: true }
    );
  }

  /**
   * Initiate a new transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Created transaction
   */
  static async initiateTransaction(transactionData) {
    const transaction = {
      ...transactionData,
      transactionId: transactionData.transactionId || this.generateTransactionId(),
      status: 'pending',
      totalAmount: transactionData.totalAmount || (transactionData.numberOfShares * transactionData.pricePerShare),
      initiatedAt: new Date()
    };

    return await databaseAdapter.create('SecondaryTransaction', transaction);
  }

  /**
   * Get a transaction by ID
   * @param {string} transactionId - Transaction ID
   * @returns {Object|null} Transaction or null
   */
  static async getTransactionById(transactionId) {
    return await databaseAdapter.findById('SecondaryTransaction', transactionId);
  }

  /**
   * Complete a transaction
   * @param {string} transactionId - Transaction ID
   * @param {Object} completionData - Additional completion data
   * @returns {Object} Updated transaction
   */
  static async completeTransaction(transactionId, completionData = {}) {
    const transaction = await databaseAdapter.findById('SecondaryTransaction', transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const completableStatuses = ['pending', 'approved', 'in_escrow'];
    if (!completableStatuses.includes(transaction.status)) {
      throw new Error('Transaction cannot be completed');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'SecondaryTransaction',
      transactionId,
      {
        status: 'completed',
        completedAt: new Date(),
        settlementDate: completionData.settlementDate || new Date(),
        ...completionData
      },
      { new: true }
    );
  }

  /**
   * Cancel a transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Cancellation reason
   * @param {string} canceledBy - User ID who canceled
   * @returns {Object} Updated transaction
   */
  static async cancelTransaction(transactionId, reason, canceledBy) {
    const transaction = await databaseAdapter.findById('SecondaryTransaction', transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const cancelableStatuses = ['pending', 'approved', 'in_escrow'];
    if (!cancelableStatuses.includes(transaction.status)) {
      throw new Error('Transaction cannot be canceled');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'SecondaryTransaction',
      transactionId,
      {
        status: 'canceled',
        cancellationReason: reason,
        canceledBy,
        canceledAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Add approval to a transaction
   * @param {string} transactionId - Transaction ID
   * @param {Object} approvalData - Approval data
   * @returns {Object} Updated transaction
   */
  static async approveTransaction(transactionId, approvalData) {
    const transaction = await databaseAdapter.findById('SecondaryTransaction', transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const approvals = transaction.approvals || [];
    approvals.push({
      approverType: approvalData.approverType,
      approverId: approvalData.approverId,
      status: approvalData.status,
      approvedAt: approvalData.status === 'approved' ? new Date() : null,
      notes: approvalData.notes
    });

    // Check if all required approvals are obtained
    const allApproved = approvals.every(a => a.status === 'approved');
    const newStatus = allApproved && transaction.status === 'pending' ? 'approved' : transaction.status;

    return await databaseAdapter.findByIdAndUpdate(
      'SecondaryTransaction',
      transactionId,
      {
        approvals,
        status: newStatus
      },
      { new: true }
    );
  }

  /**
   * Get transaction history with filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} List of transactions
   */
  static async getTransactionHistory(filters = {}) {
    const query = {};

    if (filters.companyId) query.companyId = filters.companyId;
    if (filters.sellerId) query.sellerId = filters.sellerId;
    if (filters.buyerId) query.buyerId = filters.buyerId;
    if (filters.shareClassId) query.shareClassId = filters.shareClassId;
    if (filters.status) query.status = filters.status;
    if (filters.transactionType) query.transactionType = filters.transactionType;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.transactionDate = {};
      if (filters.startDate) query.transactionDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.transactionDate.$lte = new Date(filters.endDate);
    }

    return await databaseAdapter.find('SecondaryTransaction', query, {
      sort: { transactionDate: -1 }
    });
  }

  /**
   * Calculate transaction fees
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Fee breakdown
   */
  static async calculateFees(transactionData) {
    const { totalAmount, transactionType = 'private_sale' } = transactionData;
    const feeRates = this.FEE_RATES[transactionType] || this.FEE_RATES.private_sale;

    const platformFee = (totalAmount * feeRates.platform) / 100;
    const legalFees = (totalAmount * feeRates.legal) / 100;
    const transferAgentFee = Math.min(totalAmount * 0.001, 250); // 0.1% capped at $250
    const escrowFee = totalAmount >= 50000 ? 500 : 250; // Flat fee based on amount

    const totalFees = platformFee + legalFees + transferAgentFee + escrowFee;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      legalFees: Math.round(legalFees * 100) / 100,
      transferAgentFee: Math.round(transferAgentFee * 100) / 100,
      escrowFee,
      totalFees: Math.round(totalFees * 100) / 100,
      netAmount: Math.round((totalAmount - totalFees) * 100) / 100,
      feePercentage: Math.round((totalFees / totalAmount) * 10000) / 100
    };
  }

  /**
   * Generate a transaction report
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Transaction report
   */
  static async generateTransactionReport(transactionId) {
    const transaction = await databaseAdapter.findById('SecondaryTransaction', transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Calculate fees for the transaction
    const fees = await this.calculateFees({
      totalAmount: transaction.totalAmount,
      transactionType: transaction.transactionType
    });

    const report = {
      transaction,
      summary: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        transactionType: transaction.transactionType,
        sellerId: transaction.sellerId,
        buyerId: transaction.buyerId,
        shareClassId: transaction.shareClassId,
        numberOfShares: transaction.numberOfShares,
        pricePerShare: transaction.pricePerShare,
        totalAmount: transaction.totalAmount,
        transactionDate: transaction.transactionDate,
        completedAt: transaction.completedAt
      },
      fees,
      timeline: this.generateTransactionTimeline(transaction),
      approvals: transaction.approvals || [],
      documents: transaction.documents || []
    };

    return report;
  }

  /**
   * Generate a timeline of events for a transaction
   * @param {Object} transaction - Transaction object
   * @returns {Array} Timeline events
   */
  static generateTransactionTimeline(transaction) {
    const timeline = [];

    if (transaction.initiatedAt) {
      timeline.push({
        event: 'Transaction Initiated',
        date: transaction.initiatedAt,
        description: `Transaction ${transaction.transactionId} was initiated`
      });
    }

    // Add approval events
    if (transaction.approvals) {
      for (const approval of transaction.approvals) {
        if (approval.approvedAt) {
          timeline.push({
            event: `${approval.approverType} Approval`,
            date: approval.approvedAt,
            description: `${approval.status} by ${approval.approverType}`
          });
        }
      }
    }

    if (transaction.escrow?.fundsReceivedAt) {
      timeline.push({
        event: 'Funds Received in Escrow',
        date: transaction.escrow.fundsReceivedAt,
        description: 'Buyer funds have been received in escrow'
      });
    }

    if (transaction.escrow?.fundsReleasedAt) {
      timeline.push({
        event: 'Funds Released from Escrow',
        date: transaction.escrow.fundsReleasedAt,
        description: 'Funds have been released to the seller'
      });
    }

    if (transaction.completedAt) {
      timeline.push({
        event: 'Transaction Completed',
        date: transaction.completedAt,
        description: 'Share transfer has been completed'
      });
    }

    if (transaction.canceledAt) {
      timeline.push({
        event: 'Transaction Canceled',
        date: transaction.canceledAt,
        description: transaction.cancellationReason || 'Transaction was canceled'
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    return timeline;
  }

  /**
   * Get market statistics for a company
   * @param {string} companyId - Company ID
   * @returns {Object} Market statistics
   */
  static async getMarketStatistics(companyId) {
    const [transactions, listings] = await Promise.all([
      databaseAdapter.find('SecondaryTransaction', { companyId }),
      databaseAdapter.find('SecondaryMarketListing', { companyId })
    ]);

    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const activeListings = listings.filter(l => l.status === 'active' || l.status === 'partially_sold');

    const totalVolume = completedTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalShares = completedTransactions.reduce((sum, t) => sum + t.numberOfShares, 0);
    const averagePricePerShare = totalShares > 0 ? totalVolume / totalShares : 0;

    return {
      companyId,
      totalTransactions: transactions.length,
      completedTransactions: completedTransactions.length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      totalListings: listings.length,
      activeListings: activeListings.length,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalSharesTraded: totalShares,
      averagePricePerShare: Math.round(averagePricePerShare * 100) / 100,
      sharesAvailableForSale: activeListings.reduce((sum, l) => sum + (l.sharesAvailable || 0), 0)
    };
  }
}

module.exports = SecondaryTransactionService;
