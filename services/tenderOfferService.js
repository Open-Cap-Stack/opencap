/**
 * TenderOffer Service
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * Business logic for tender offer management including:
 * - Offer lifecycle (create, publish, close, settle, cancel)
 * - Submission handling
 * - Prorata allocation for oversubscribed offers
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

class TenderOfferService {
  /**
   * Create a new tender offer
   * @param {Object} offerData - Tender offer data
   * @returns {Object} Created tender offer
   */
  async createTenderOffer(offerData) {
    // Validate required fields
    if (!offerData.companyId) {
      throw new Error('companyId is required');
    }
    if (!offerData.name) {
      throw new Error('name is required');
    }
    if (offerData.pricePerShare === undefined || offerData.pricePerShare === null) {
      throw new Error('pricePerShare is required');
    }
    if (offerData.totalBudget === undefined || offerData.totalBudget === null) {
      throw new Error('totalBudget is required');
    }

    const offer = {
      ...offerData,
      offerId: offerData.offerId || `TO-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'draft',
      totalSharesTendered: 0,
      totalSharesAccepted: 0,
      totalPayoutAmount: 0,
      isOversubscribed: false
    };

    return await databaseAdapter.create('TenderOffer', offer);
  }

  /**
   * Get a tender offer by ID
   * @param {string} id - Tender offer ID
   * @returns {Object} Tender offer
   */
  async getTenderOffer(id) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }
    return offer;
  }

  /**
   * Get tender offers with optional filters
   * @param {Object} filters - Query filters
   * @returns {Array} Array of tender offers
   */
  async getTenderOffers(filters = {}) {
    return await databaseAdapter.find('TenderOffer', filters);
  }

  /**
   * Publish a tender offer (change status from draft to open)
   * @param {string} id - Tender offer ID
   * @returns {Object} Published tender offer
   */
  async publishTenderOffer(id) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status !== 'draft') {
      throw new Error('Can only publish offers in draft status');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      id,
      {
        status: 'open',
        publishedAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Submit shares to a tender offer
   * @param {Object} submissionData - Submission data
   * @returns {Object} Created submission
   */
  async submitTender(submissionData) {
    const { offerId, stakeholderId, sharesOffered, shareClass } = submissionData;

    // Get the offer
    const offer = await databaseAdapter.findById('TenderOffer', offerId);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    // Check offer is open
    if (offer.status !== 'open') {
      throw new Error('Tender offer is not open for submissions');
    }

    // Check if within date range
    const now = new Date();
    if (offer.startDate && now < new Date(offer.startDate)) {
      throw new Error('Tender offer has not started yet');
    }
    if (offer.endDate && now > new Date(offer.endDate)) {
      throw new Error('Tender offer has ended');
    }

    // Check for existing submission
    const existingSubmission = await databaseAdapter.findOne('TenderSubmission', {
      offerId,
      stakeholderId,
      status: { $nin: ['withdrawn', 'rejected'] }
    });
    if (existingSubmission) {
      throw new Error('Stakeholder already submitted to this offer');
    }

    // Validate share limits
    if (offer.minShares && sharesOffered < offer.minShares) {
      throw new Error('Shares offered below minimum');
    }
    if (offer.maxShares && sharesOffered > offer.maxShares) {
      throw new Error('Shares offered above maximum');
    }

    // Create the submission
    const submission = {
      submissionId: `TS-${uuidv4().slice(0, 8).toUpperCase()}`,
      offerId,
      stakeholderId,
      sharesOffered,
      pricePerShare: offer.pricePerShare,
      shareClass: shareClass || (offer.shareClasses && offer.shareClasses[0]),
      status: 'pending',
      sharesAccepted: 0,
      payoutAmount: 0,
      submittedAt: new Date(),
      eligibilityVerified: false
    };

    const createdSubmission = await databaseAdapter.create('TenderSubmission', submission);

    // Update total shares tendered on the offer
    await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      offerId,
      {
        totalSharesTendered: (offer.totalSharesTendered || 0) + sharesOffered
      },
      { new: true }
    );

    return createdSubmission;
  }

  /**
   * Withdraw a tender submission
   * @param {string} submissionId - Submission ID
   * @returns {Object} Withdrawn submission
   */
  async withdrawSubmission(submissionId) {
    const submission = await databaseAdapter.findById('TenderSubmission', submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.status !== 'pending') {
      throw new Error('Can only withdraw pending submissions');
    }

    // Get the offer to check if it's still open
    const offer = await databaseAdapter.findById('TenderOffer', submission.offerId);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status === 'closed' || offer.status === 'settled') {
      throw new Error('Cannot withdraw from closed offer');
    }

    // Update submission status
    const withdrawnSubmission = await databaseAdapter.findByIdAndUpdate(
      'TenderSubmission',
      submissionId,
      {
        status: 'withdrawn',
        withdrawnAt: new Date()
      },
      { new: true }
    );

    // Update total shares tendered on the offer
    await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      submission.offerId,
      {
        totalSharesTendered: Math.max(0, (offer.totalSharesTendered || 0) - submission.sharesOffered)
      },
      { new: true }
    );

    return withdrawnSubmission;
  }

  /**
   * Close a tender offer and process submissions
   * @param {string} id - Tender offer ID
   * @returns {Object} Closed offer with processing details
   */
  async closeTenderOffer(id) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status !== 'open') {
      throw new Error('Can only close open offers');
    }

    // Get all pending submissions
    const submissions = await databaseAdapter.find('TenderSubmission', {
      offerId: id,
      status: 'pending'
    });

    // Calculate available shares based on budget
    const availableShares = offer.pricePerShare > 0
      ? Math.floor(offer.totalBudget / offer.pricePerShare)
      : 0;

    // Calculate prorata allocation
    const allocations = this.calculateProrataAllocation(submissions, availableShares);

    // Check if oversubscribed
    const totalOffered = submissions.reduce((sum, s) => sum + s.sharesOffered, 0);
    const isOversubscribed = totalOffered > availableShares;
    const prorataPercentage = isOversubscribed
      ? (availableShares / totalOffered) * 100
      : 100;

    // Update each submission with acceptance
    let totalSharesAccepted = 0;
    for (const allocation of allocations) {
      const status = allocation.sharesAccepted > 0 ? 'accepted' : 'rejected';
      await databaseAdapter.findByIdAndUpdate(
        'TenderSubmission',
        allocation._id,
        {
          sharesAccepted: allocation.sharesAccepted,
          prorataPercentage: allocation.prorataPercentage,
          status,
          processedAt: new Date(),
          rejectionReason: allocation.sharesAccepted === 0 ? 'No shares accepted' : null
        },
        { new: true }
      );
      totalSharesAccepted += allocation.sharesAccepted;
    }

    // Update the offer
    const closedOffer = await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      id,
      {
        status: 'closed',
        closedAt: new Date(),
        totalSharesAccepted,
        isOversubscribed,
        prorataPercentage
      },
      { new: true }
    );

    return {
      ...closedOffer,
      prorata: isOversubscribed ? {
        percentage: prorataPercentage,
        totalOffered,
        availableShares
      } : null
    };
  }

  /**
   * Settle a closed tender offer (execute payouts)
   * @param {string} id - Tender offer ID
   * @returns {Object} Settled offer with settlement details
   */
  async settleOffer(id) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status !== 'closed') {
      throw new Error('Can only settle closed offers');
    }

    // Get all accepted submissions
    const acceptedSubmissions = await databaseAdapter.find('TenderSubmission', {
      offerId: id,
      status: 'accepted'
    });

    const settlements = [];
    let totalPayoutAmount = 0;

    // Process each accepted submission
    for (const submission of acceptedSubmissions) {
      const payoutAmount = submission.sharesAccepted * submission.pricePerShare;
      totalPayoutAmount += payoutAmount;

      const settledSubmission = await databaseAdapter.findByIdAndUpdate(
        'TenderSubmission',
        submission._id,
        {
          payoutAmount,
          status: 'settled',
          settledAt: new Date()
        },
        { new: true }
      );

      settlements.push({
        submissionId: settledSubmission.submissionId,
        stakeholderId: settledSubmission.stakeholderId,
        sharesAccepted: settledSubmission.sharesAccepted,
        payoutAmount
      });
    }

    // Update the offer
    const settledOffer = await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      id,
      {
        status: 'settled',
        settledAt: new Date(),
        totalPayoutAmount
      },
      { new: true }
    );

    return {
      ...settledOffer,
      settlements
    };
  }

  /**
   * Cancel a tender offer
   * @param {string} id - Tender offer ID
   * @returns {Object} Canceled offer
   */
  async cancelTenderOffer(id) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status === 'settled') {
      throw new Error('Cannot cancel settled offer');
    }

    // Reject all pending submissions
    const pendingSubmissions = await databaseAdapter.find('TenderSubmission', {
      offerId: id,
      status: 'pending'
    });

    for (const submission of pendingSubmissions) {
      await databaseAdapter.findByIdAndUpdate(
        'TenderSubmission',
        submission._id,
        {
          status: 'rejected',
          rejectionReason: 'Offer canceled',
          processedAt: new Date()
        },
        { new: true }
      );
    }

    // Update the offer
    return await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      id,
      {
        status: 'canceled',
        canceledAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Calculate prorata allocation for submissions
   * @param {Array} submissions - Array of submissions
   * @param {number} availableShares - Total available shares
   * @returns {Array} Submissions with allocation details
   */
  calculateProrataAllocation(submissions, availableShares) {
    if (!submissions || submissions.length === 0) {
      return [];
    }

    const totalOffered = submissions.reduce((sum, s) => sum + s.sharesOffered, 0);

    if (totalOffered === 0) {
      return submissions.map(s => ({
        ...s,
        sharesAccepted: 0,
        prorataPercentage: 0
      }));
    }

    // If not oversubscribed, accept all
    if (totalOffered <= availableShares) {
      return submissions.map(s => ({
        ...s,
        sharesAccepted: s.sharesOffered,
        prorataPercentage: 100
      }));
    }

    // Calculate prorata percentage
    const prorataPercentage = (availableShares / totalOffered) * 100;

    // Allocate shares proportionally
    return submissions.map(s => ({
      ...s,
      sharesAccepted: Math.floor(s.sharesOffered * (availableShares / totalOffered)),
      prorataPercentage
    }));
  }

  /**
   * Get all submissions for a tender offer
   * @param {string} offerId - Tender offer ID
   * @returns {Array} Array of submissions
   */
  async getSubmissionsForOffer(offerId) {
    return await databaseAdapter.find('TenderSubmission', { offerId });
  }

  /**
   * Get a submission by ID
   * @param {string} id - Submission ID
   * @returns {Object} Submission
   */
  async getSubmission(id) {
    const submission = await databaseAdapter.findById('TenderSubmission', id);
    if (!submission) {
      throw new Error('Submission not found');
    }
    return submission;
  }

  /**
   * Update a tender offer
   * @param {string} id - Tender offer ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated offer
   */
  async updateTenderOffer(id, updateData) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status !== 'draft') {
      throw new Error('Can only update offers in draft status');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'TenderOffer',
      id,
      updateData,
      { new: true }
    );
  }

  /**
   * Delete a tender offer
   * @param {string} id - Tender offer ID
   * @returns {Object} Deleted offer
   */
  async deleteTenderOffer(id) {
    const offer = await databaseAdapter.findById('TenderOffer', id);
    if (!offer) {
      throw new Error('Tender offer not found');
    }

    if (offer.status !== 'draft') {
      throw new Error('Can only delete offers in draft status');
    }

    return await databaseAdapter.findByIdAndDelete('TenderOffer', id);
  }

  /**
   * Get tender offer summary statistics
   * @param {string} id - Tender offer ID
   * @returns {Object} Offer summary
   */
  async getOfferSummary(id) {
    const offer = await this.getTenderOffer(id);
    const submissions = await this.getSubmissionsForOffer(id);

    const pendingCount = submissions.filter(s => s.status === 'pending').length;
    const acceptedCount = submissions.filter(s => s.status === 'accepted').length;
    const rejectedCount = submissions.filter(s => s.status === 'rejected').length;
    const withdrawnCount = submissions.filter(s => s.status === 'withdrawn').length;
    const settledCount = submissions.filter(s => s.status === 'settled').length;

    const availableShares = offer.pricePerShare > 0
      ? Math.floor(offer.totalBudget / offer.pricePerShare)
      : 0;

    return {
      offer: {
        offerId: offer.offerId,
        name: offer.name,
        status: offer.status,
        pricePerShare: offer.pricePerShare,
        totalBudget: offer.totalBudget
      },
      submissions: {
        total: submissions.length,
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        withdrawn: withdrawnCount,
        settled: settledCount
      },
      shares: {
        available: availableShares,
        tendered: offer.totalSharesTendered,
        accepted: offer.totalSharesAccepted,
        subscriptionRatio: availableShares > 0
          ? (offer.totalSharesTendered / availableShares * 100).toFixed(2)
          : 0
      },
      financials: {
        totalBudget: offer.totalBudget,
        committedAmount: offer.totalSharesAccepted * offer.pricePerShare,
        paidAmount: offer.totalPayoutAmount,
        remainingBudget: offer.totalBudget - offer.totalPayoutAmount
      }
    };
  }
}

module.exports = new TenderOfferService();
