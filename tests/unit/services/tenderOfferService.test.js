/**
 * TenderOffer Service Unit Tests
 * Issue #105: Implement Tender Offer System (Basic)
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const tenderOfferService = require('../../../services/tenderOfferService');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');

describe('TenderOfferService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenderOffer', () => {
    it('should create a new tender offer', async () => {
      const offerData = {
        companyId: 'COMP-001',
        name: 'Q1 2026 Buyback Program',
        description: 'Quarterly share buyback',
        pricePerShare: 15.50,
        totalBudget: 1000000,
        shareClasses: ['common', 'preferred-a'],
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
        minShares: 100,
        maxShares: 10000
      };

      const expectedOffer = {
        ...offerData,
        offerId: expect.stringMatching(/^TO-[A-Z0-9]+$/),
        status: 'draft',
        totalSharesTendered: 0,
        totalSharesAccepted: 0
      };

      databaseAdapter.create.mockResolvedValue(expectedOffer);

      const result = await tenderOfferService.createTenderOffer(offerData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TenderOffer',
        expect.objectContaining({
          companyId: 'COMP-001',
          name: 'Q1 2026 Buyback Program',
          status: 'draft'
        })
      );
      expect(result.status).toBe('draft');
    });

    it('should generate unique offerId if not provided', async () => {
      const offerData = {
        companyId: 'COMP-001',
        name: 'Test Offer',
        pricePerShare: 10,
        totalBudget: 100000
      };

      databaseAdapter.create.mockResolvedValue({ ...offerData, offerId: 'TO-12345678' });

      await tenderOfferService.createTenderOffer(offerData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TenderOffer',
        expect.objectContaining({
          offerId: expect.stringMatching(/^TO-[A-Z0-9]+$/)
        })
      );
    });

    it('should throw error for missing required fields', async () => {
      const offerData = {
        companyId: 'COMP-001'
        // Missing name, pricePerShare, totalBudget
      };

      await expect(tenderOfferService.createTenderOffer(offerData))
        .rejects.toThrow();
    });
  });

  describe('publishTenderOffer', () => {
    it('should change status from draft to open', async () => {
      const offerId = 'offer-123';
      const existingOffer = {
        _id: offerId,
        offerId: 'TO-12345678',
        status: 'draft',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28')
      };

      databaseAdapter.findById.mockResolvedValue(existingOffer);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...existingOffer, status: 'open' });

      const result = await tenderOfferService.publishTenderOffer(offerId);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TenderOffer',
        offerId,
        expect.objectContaining({ status: 'open' }),
        { new: true }
      );
      expect(result.status).toBe('open');
    });

    it('should throw error if offer is not in draft status', async () => {
      const offerId = 'offer-123';
      const existingOffer = {
        _id: offerId,
        status: 'closed'
      };

      databaseAdapter.findById.mockResolvedValue(existingOffer);

      await expect(tenderOfferService.publishTenderOffer(offerId))
        .rejects.toThrow('Can only publish offers in draft status');
    });

    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.publishTenderOffer('nonexistent'))
        .rejects.toThrow('Tender offer not found');
    });
  });

  describe('submitTender', () => {
    const mockOffer = {
      _id: 'offer-123',
      offerId: 'TO-12345678',
      status: 'open',
      pricePerShare: 15.50,
      minShares: 100,
      maxShares: 10000,
      totalBudget: 1000000,
      shareClasses: ['common'],
      totalSharesTendered: 0
    };

    it('should create a new tender submission', async () => {
      const submissionData = {
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      };

      databaseAdapter.findById.mockResolvedValue(mockOffer);
      databaseAdapter.findOne.mockResolvedValue(null); // No existing submission
      databaseAdapter.create.mockResolvedValue({
        ...submissionData,
        submissionId: 'TS-12345678',
        status: 'pending',
        pricePerShare: 15.50,
        sharesAccepted: 0,
        payoutAmount: 0,
        submittedAt: expect.any(Date)
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockOffer,
        totalSharesTendered: 500
      });

      const result = await tenderOfferService.submitTender(submissionData);

      expect(result.status).toBe('pending');
      expect(result.pricePerShare).toBe(15.50);
    });

    it('should throw error if offer is not open', async () => {
      const closedOffer = { ...mockOffer, status: 'closed' };
      databaseAdapter.findById.mockResolvedValue(closedOffer);

      await expect(tenderOfferService.submitTender({
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      })).rejects.toThrow('Tender offer is not open for submissions');
    });

    it('should throw error if shares below minimum', async () => {
      databaseAdapter.findById.mockResolvedValue(mockOffer);
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(tenderOfferService.submitTender({
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 50 // Below min of 100
      })).rejects.toThrow('Shares offered below minimum');
    });

    it('should throw error if shares above maximum', async () => {
      databaseAdapter.findById.mockResolvedValue(mockOffer);
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(tenderOfferService.submitTender({
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 15000 // Above max of 10000
      })).rejects.toThrow('Shares offered above maximum');
    });

    it('should throw error if stakeholder already submitted', async () => {
      databaseAdapter.findById.mockResolvedValue(mockOffer);
      databaseAdapter.findOne.mockResolvedValue({ submissionId: 'TS-EXISTING' });

      await expect(tenderOfferService.submitTender({
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      })).rejects.toThrow('Stakeholder already submitted to this offer');
    });
  });

  describe('withdrawSubmission', () => {
    it('should withdraw a pending submission', async () => {
      const submission = {
        _id: 'sub-123',
        submissionId: 'TS-12345678',
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500,
        status: 'pending'
      };

      const offer = {
        _id: 'offer-123',
        status: 'open',
        totalSharesTendered: 500
      };

      databaseAdapter.findById
        .mockResolvedValueOnce(submission)
        .mockResolvedValueOnce(offer);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...submission, status: 'withdrawn' });

      const result = await tenderOfferService.withdrawSubmission('sub-123');

      expect(result.status).toBe('withdrawn');
    });

    it('should throw error if submission is not pending', async () => {
      const submission = {
        _id: 'sub-123',
        status: 'accepted'
      };

      databaseAdapter.findById.mockResolvedValue(submission);

      await expect(tenderOfferService.withdrawSubmission('sub-123'))
        .rejects.toThrow('Can only withdraw pending submissions');
    });

    it('should throw error if offer is closed', async () => {
      const submission = {
        _id: 'sub-123',
        offerId: 'offer-123',
        status: 'pending'
      };

      const offer = {
        _id: 'offer-123',
        status: 'closed'
      };

      databaseAdapter.findById
        .mockResolvedValueOnce(submission)
        .mockResolvedValueOnce(offer);

      await expect(tenderOfferService.withdrawSubmission('sub-123'))
        .rejects.toThrow('Cannot withdraw from closed offer');
    });
  });

  describe('closeTenderOffer', () => {
    it('should close an open offer and process submissions', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'open',
        pricePerShare: 15.50,
        totalBudget: 1000000,
        totalSharesTendered: 5000
      };

      const submissions = [
        { _id: 'sub-1', stakeholderId: 'STK-001', sharesOffered: 2000, status: 'pending' },
        { _id: 'sub-2', stakeholderId: 'STK-002', sharesOffered: 3000, status: 'pending' }
      ];

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue(submissions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'closed' });

      const result = await tenderOfferService.closeTenderOffer('offer-123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TenderOffer',
        'offer-123',
        expect.objectContaining({ status: 'closed' }),
        { new: true }
      );
      expect(result.status).toBe('closed');
    });

    it('should throw error if offer is not open', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'draft'
      };

      databaseAdapter.findById.mockResolvedValue(offer);

      await expect(tenderOfferService.closeTenderOffer('offer-123'))
        .rejects.toThrow('Can only close open offers');
    });

    it('should apply prorata allocation if oversubscribed', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'open',
        pricePerShare: 10,
        totalBudget: 10000, // Can only buy 1000 shares
        totalSharesTendered: 2000 // Oversubscribed by 2x
      };

      const submissions = [
        { _id: 'sub-1', stakeholderId: 'STK-001', sharesOffered: 1000, status: 'pending' },
        { _id: 'sub-2', stakeholderId: 'STK-002', sharesOffered: 1000, status: 'pending' }
      ];

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue(submissions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'closed' });

      const result = await tenderOfferService.closeTenderOffer('offer-123');

      // Each should get 50% of their submission (500 shares each)
      expect(result).toHaveProperty('prorata');
    });
  });

  describe('settleOffer', () => {
    it('should settle all accepted submissions', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'closed',
        pricePerShare: 15.50,
        totalSharesAccepted: 5000
      };

      const acceptedSubmissions = [
        { _id: 'sub-1', sharesAccepted: 2000, pricePerShare: 15.50, status: 'accepted' },
        { _id: 'sub-2', sharesAccepted: 3000, pricePerShare: 15.50, status: 'accepted' }
      ];

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue(acceptedSubmissions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'settled' });

      const result = await tenderOfferService.settleOffer('offer-123');

      expect(result.status).toBe('settled');
      expect(result.settlements).toHaveLength(2);
    });

    it('should calculate correct payout amounts', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'closed',
        pricePerShare: 10
      };

      const acceptedSubmissions = [
        { _id: 'sub-1', sharesAccepted: 1000, pricePerShare: 10, status: 'accepted' }
      ];

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue(acceptedSubmissions);
      databaseAdapter.findByIdAndUpdate.mockImplementation((model, id, update) => {
        if (model === 'TenderSubmission') {
          return { ...acceptedSubmissions[0], ...update, payoutAmount: 10000 };
        }
        return { ...offer, status: 'settled' };
      });

      const result = await tenderOfferService.settleOffer('offer-123');

      expect(result.settlements[0].payoutAmount).toBe(10000);
    });

    it('should throw error if offer is not closed', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'open'
      };

      databaseAdapter.findById.mockResolvedValue(offer);

      await expect(tenderOfferService.settleOffer('offer-123'))
        .rejects.toThrow('Can only settle closed offers');
    });
  });

  describe('calculateProrataAllocation', () => {
    it('should calculate prorata allocation for oversubscribed offer', () => {
      const submissions = [
        { stakeholderId: 'STK-001', sharesOffered: 1000 },
        { stakeholderId: 'STK-002', sharesOffered: 2000 },
        { stakeholderId: 'STK-003', sharesOffered: 3000 }
      ];
      const availableShares = 3000; // Total offered: 6000, available: 3000

      const result = tenderOfferService.calculateProrataAllocation(submissions, availableShares);

      // Each gets 50% of their submission
      expect(result).toHaveLength(3);
      expect(result[0].sharesAccepted).toBe(500);
      expect(result[1].sharesAccepted).toBe(1000);
      expect(result[2].sharesAccepted).toBe(1500);
    });

    it('should accept all shares if not oversubscribed', () => {
      const submissions = [
        { stakeholderId: 'STK-001', sharesOffered: 1000 },
        { stakeholderId: 'STK-002', sharesOffered: 2000 }
      ];
      const availableShares = 5000; // More than enough

      const result = tenderOfferService.calculateProrataAllocation(submissions, availableShares);

      expect(result[0].sharesAccepted).toBe(1000);
      expect(result[1].sharesAccepted).toBe(2000);
    });

    it('should handle empty submissions array', () => {
      const result = tenderOfferService.calculateProrataAllocation([], 1000);

      expect(result).toHaveLength(0);
    });

    it('should handle zero available shares', () => {
      const submissions = [
        { stakeholderId: 'STK-001', sharesOffered: 1000 }
      ];

      const result = tenderOfferService.calculateProrataAllocation(submissions, 0);

      expect(result[0].sharesAccepted).toBe(0);
    });
  });

  describe('getTenderOffer', () => {
    it('should get tender offer by id', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        name: 'Test Offer'
      };

      databaseAdapter.findById.mockResolvedValue(offer);

      const result = await tenderOfferService.getTenderOffer('offer-123');

      expect(result.offerId).toBe('TO-12345678');
    });

    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.getTenderOffer('nonexistent'))
        .rejects.toThrow('Tender offer not found');
    });
  });

  describe('getTenderOffers', () => {
    it('should get all tender offers with filters', async () => {
      const offers = [
        { offerId: 'TO-001', status: 'open' },
        { offerId: 'TO-002', status: 'open' }
      ];

      databaseAdapter.find.mockResolvedValue(offers);

      const result = await tenderOfferService.getTenderOffers({ status: 'open' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TenderOffer',
        { status: 'open' }
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getSubmissionsForOffer', () => {
    it('should get all submissions for an offer', async () => {
      const submissions = [
        { submissionId: 'TS-001', offerId: 'offer-123' },
        { submissionId: 'TS-002', offerId: 'offer-123' }
      ];

      databaseAdapter.find.mockResolvedValue(submissions);

      const result = await tenderOfferService.getSubmissionsForOffer('offer-123');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TenderSubmission',
        { offerId: 'offer-123' }
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('cancelTenderOffer', () => {
    it('should cancel a draft or open offer', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'draft'
      };

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'canceled' });

      const result = await tenderOfferService.cancelTenderOffer('offer-123');

      expect(result.status).toBe('canceled');
    });

    it('should reject pending submissions when canceling', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'open'
      };

      const submissions = [
        { _id: 'sub-1', status: 'pending' }
      ];

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue(submissions);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'canceled' });

      await tenderOfferService.cancelTenderOffer('offer-123');

      // Should update submissions to rejected
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TenderSubmission',
        'sub-1',
        expect.objectContaining({ status: 'rejected' }),
        expect.any(Object)
      );
    });

    it('should throw error if offer already settled', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'settled'
      };

      databaseAdapter.findById.mockResolvedValue(offer);

      await expect(tenderOfferService.cancelTenderOffer('offer-123'))
        .rejects.toThrow('Cannot cancel settled offer');
    });

    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.cancelTenderOffer('nonexistent'))
        .rejects.toThrow('Tender offer not found');
    });
  });

  describe('getSubmission', () => {
    it('should get submission by id', async () => {
      const submission = {
        _id: 'sub-123',
        submissionId: 'TS-12345678',
        sharesOffered: 500
      };

      databaseAdapter.findById.mockResolvedValue(submission);

      const result = await tenderOfferService.getSubmission('sub-123');

      expect(result.submissionId).toBe('TS-12345678');
    });

    it('should throw error if submission not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.getSubmission('nonexistent'))
        .rejects.toThrow('Submission not found');
    });
  });

  describe('updateTenderOffer', () => {
    it('should update a draft offer', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'draft',
        name: 'Original Name'
      };

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, name: 'Updated Name' });

      const result = await tenderOfferService.updateTenderOffer('offer-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.updateTenderOffer('nonexistent', { name: 'New' }))
        .rejects.toThrow('Tender offer not found');
    });

    it('should throw error if offer is not in draft status', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'open'
      };

      databaseAdapter.findById.mockResolvedValue(offer);

      await expect(tenderOfferService.updateTenderOffer('offer-123', { name: 'New' }))
        .rejects.toThrow('Can only update offers in draft status');
    });
  });

  describe('deleteTenderOffer', () => {
    it('should delete a draft offer', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'draft'
      };

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(offer);

      const result = await tenderOfferService.deleteTenderOffer('offer-123');

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('TenderOffer', 'offer-123');
    });

    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.deleteTenderOffer('nonexistent'))
        .rejects.toThrow('Tender offer not found');
    });

    it('should throw error if offer is not in draft status', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'open'
      };

      databaseAdapter.findById.mockResolvedValue(offer);

      await expect(tenderOfferService.deleteTenderOffer('offer-123'))
        .rejects.toThrow('Can only delete offers in draft status');
    });
  });

  describe('getOfferSummary', () => {
    it('should return offer summary with statistics', async () => {
      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        name: 'Test Offer',
        status: 'open',
        pricePerShare: 10,
        totalBudget: 10000,
        totalSharesTendered: 500,
        totalSharesAccepted: 400,
        totalPayoutAmount: 4000
      };

      const submissions = [
        { status: 'pending' },
        { status: 'accepted' },
        { status: 'rejected' },
        { status: 'withdrawn' },
        { status: 'settled' }
      ];

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue(submissions);

      const result = await tenderOfferService.getOfferSummary('offer-123');

      expect(result).toHaveProperty('offer');
      expect(result).toHaveProperty('submissions');
      expect(result).toHaveProperty('shares');
      expect(result).toHaveProperty('financials');
      expect(result.submissions.total).toBe(5);
      expect(result.submissions.pending).toBe(1);
      expect(result.submissions.accepted).toBe(1);
      expect(result.shares.available).toBe(1000);
    });
  });

  describe('submitTender - additional scenarios', () => {
    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.submitTender({
        offerId: 'nonexistent',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      })).rejects.toThrow('Tender offer not found');
    });

    it('should throw error if offer has not started', async () => {
      const futureOffer = {
        _id: 'offer-123',
        status: 'open',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        pricePerShare: 10,
        minShares: 1
      };

      databaseAdapter.findById.mockResolvedValue(futureOffer);
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(tenderOfferService.submitTender({
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      })).rejects.toThrow('Tender offer has not started yet');
    });

    it('should throw error if offer has ended', async () => {
      const expiredOffer = {
        _id: 'offer-123',
        status: 'open',
        startDate: new Date(Date.now() - 172800000), // 2 days ago
        endDate: new Date(Date.now() - 86400000), // Yesterday
        pricePerShare: 10,
        minShares: 1
      };

      databaseAdapter.findById.mockResolvedValue(expiredOffer);
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(tenderOfferService.submitTender({
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      })).rejects.toThrow('Tender offer has ended');
    });
  });

  describe('withdrawSubmission - additional scenarios', () => {
    it('should throw error if submission not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.withdrawSubmission('nonexistent'))
        .rejects.toThrow('Submission not found');
    });

    it('should throw error if offer not found', async () => {
      const submission = {
        _id: 'sub-123',
        offerId: 'nonexistent',
        status: 'pending'
      };

      databaseAdapter.findById
        .mockResolvedValueOnce(submission)
        .mockResolvedValueOnce(null);

      await expect(tenderOfferService.withdrawSubmission('sub-123'))
        .rejects.toThrow('Tender offer not found');
    });

    it('should throw error if offer is settled', async () => {
      const submission = {
        _id: 'sub-123',
        offerId: 'offer-123',
        status: 'pending'
      };

      const offer = {
        _id: 'offer-123',
        status: 'settled'
      };

      databaseAdapter.findById
        .mockResolvedValueOnce(submission)
        .mockResolvedValueOnce(offer);

      await expect(tenderOfferService.withdrawSubmission('sub-123'))
        .rejects.toThrow('Cannot withdraw from closed offer');
    });
  });

  describe('closeTenderOffer - additional scenarios', () => {
    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.closeTenderOffer('nonexistent'))
        .rejects.toThrow('Tender offer not found');
    });

    it('should handle no pending submissions', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'open',
        pricePerShare: 10,
        totalBudget: 10000
      };

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'closed' });

      const result = await tenderOfferService.closeTenderOffer('offer-123');

      expect(result.status).toBe('closed');
    });

    it('should handle zero price per share', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'open',
        pricePerShare: 0,
        totalBudget: 10000
      };

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'closed' });

      const result = await tenderOfferService.closeTenderOffer('offer-123');

      expect(result.status).toBe('closed');
    });
  });

  describe('settleOffer - additional scenarios', () => {
    it('should throw error if offer not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(tenderOfferService.settleOffer('nonexistent'))
        .rejects.toThrow('Tender offer not found');
    });

    it('should handle no accepted submissions', async () => {
      const offer = {
        _id: 'offer-123',
        status: 'closed',
        pricePerShare: 10
      };

      databaseAdapter.findById.mockResolvedValue(offer);
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...offer, status: 'settled' });

      const result = await tenderOfferService.settleOffer('offer-123');

      expect(result.status).toBe('settled');
      expect(result.settlements).toHaveLength(0);
    });
  });

  describe('calculateProrataAllocation - additional scenarios', () => {
    it('should handle submissions with zero shares offered', () => {
      const submissions = [
        { stakeholderId: 'STK-001', sharesOffered: 0 },
        { stakeholderId: 'STK-002', sharesOffered: 0 }
      ];

      const result = tenderOfferService.calculateProrataAllocation(submissions, 1000);

      expect(result[0].sharesAccepted).toBe(0);
      expect(result[1].sharesAccepted).toBe(0);
    });

    it('should handle null submissions', () => {
      const result = tenderOfferService.calculateProrataAllocation(null, 1000);

      expect(result).toHaveLength(0);
    });
  });

  describe('createTenderOffer - validation', () => {
    it('should throw error if companyId is missing', async () => {
      await expect(tenderOfferService.createTenderOffer({
        name: 'Test',
        pricePerShare: 10,
        totalBudget: 10000
      })).rejects.toThrow('companyId is required');
    });

    it('should throw error if name is missing', async () => {
      await expect(tenderOfferService.createTenderOffer({
        companyId: 'COMP-001',
        pricePerShare: 10,
        totalBudget: 10000
      })).rejects.toThrow('name is required');
    });

    it('should throw error if pricePerShare is missing', async () => {
      await expect(tenderOfferService.createTenderOffer({
        companyId: 'COMP-001',
        name: 'Test',
        totalBudget: 10000
      })).rejects.toThrow('pricePerShare is required');
    });

    it('should throw error if totalBudget is missing', async () => {
      await expect(tenderOfferService.createTenderOffer({
        companyId: 'COMP-001',
        name: 'Test',
        pricePerShare: 10
      })).rejects.toThrow('totalBudget is required');
    });
  });
});
