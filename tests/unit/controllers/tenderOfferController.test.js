/**
 * TenderOffer Controller Unit Tests
 * Issue #105: Implement Tender Offer System (Basic)
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const tenderOfferController = require('../../../controllers/tenderOfferController');

// Mock the service
jest.mock('../../../services/tenderOfferService', () => ({
  createTenderOffer: jest.fn(),
  getTenderOffer: jest.fn(),
  getTenderOffers: jest.fn(),
  publishTenderOffer: jest.fn(),
  submitTender: jest.fn(),
  withdrawSubmission: jest.fn(),
  closeTenderOffer: jest.fn(),
  settleOffer: jest.fn(),
  cancelTenderOffer: jest.fn(),
  getSubmissionsForOffer: jest.fn(),
  getSubmission: jest.fn()
}));

const tenderOfferService = require('../../../services/tenderOfferService');

describe('TenderOfferController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createTenderOffer', () => {
    it('should create a tender offer and return 201', async () => {
      const offerData = {
        companyId: 'COMP-001',
        name: 'Q1 Buyback',
        pricePerShare: 15.50,
        totalBudget: 1000000
      };

      mockReq.body = offerData;

      const createdOffer = {
        ...offerData,
        offerId: 'TO-12345678',
        status: 'draft'
      };

      tenderOfferService.createTenderOffer.mockResolvedValue(createdOffer);

      await tenderOfferController.createTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdOffer);
    });

    it('should return 400 on validation error', async () => {
      mockReq.body = { companyId: 'COMP-001' }; // Missing required fields

      tenderOfferService.createTenderOffer.mockRejectedValue(
        new Error('Missing required fields')
      );

      await tenderOfferController.createTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });
  });

  describe('getTenderOffer', () => {
    it('should return a tender offer by id', async () => {
      mockReq.params.id = 'offer-123';

      const offer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        name: 'Test Offer'
      };

      tenderOfferService.getTenderOffer.mockResolvedValue(offer);

      await tenderOfferController.getTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(offer);
    });

    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.getTenderOffer.mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.getTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tender offer not found' });
    });
  });

  describe('getTenderOffers', () => {
    it('should return all tender offers with filters', async () => {
      mockReq.query = { companyId: 'COMP-001', status: 'open' };

      const offers = [
        { offerId: 'TO-001', status: 'open' },
        { offerId: 'TO-002', status: 'open' }
      ];

      tenderOfferService.getTenderOffers.mockResolvedValue(offers);

      await tenderOfferController.getTenderOffers(mockReq, mockRes);

      expect(tenderOfferService.getTenderOffers).toHaveBeenCalledWith({
        companyId: 'COMP-001',
        status: 'open'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(offers);
    });

    it('should return 500 on server error', async () => {
      tenderOfferService.getTenderOffers.mockRejectedValue(
        new Error('Database error')
      );

      await tenderOfferController.getTenderOffers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishTenderOffer', () => {
    it('should publish a tender offer', async () => {
      mockReq.params.id = 'offer-123';

      const publishedOffer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'open'
      };

      tenderOfferService.publishTenderOffer.mockResolvedValue(publishedOffer);

      await tenderOfferController.publishTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(publishedOffer);
    });

    it('should return 400 if offer cannot be published', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.publishTenderOffer.mockRejectedValue(
        new Error('Can only publish offers in draft status')
      );

      await tenderOfferController.publishTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('submitTender', () => {
    it('should create a tender submission', async () => {
      mockReq.body = {
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      };

      const submission = {
        submissionId: 'TS-12345678',
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 500,
        status: 'pending'
      };

      tenderOfferService.submitTender.mockResolvedValue(submission);

      await tenderOfferController.submitTender(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(submission);
    });

    it('should return 400 for invalid submission', async () => {
      mockReq.body = {
        offerId: 'offer-123',
        stakeholderId: 'STK-001',
        sharesOffered: 50 // Below minimum
      };

      tenderOfferService.submitTender.mockRejectedValue(
        new Error('Shares offered below minimum')
      );

      await tenderOfferController.submitTender(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('withdrawSubmission', () => {
    it('should withdraw a submission', async () => {
      mockReq.params.id = 'sub-123';

      const withdrawnSubmission = {
        submissionId: 'TS-12345678',
        status: 'withdrawn'
      };

      tenderOfferService.withdrawSubmission.mockResolvedValue(withdrawnSubmission);

      await tenderOfferController.withdrawSubmission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(withdrawnSubmission);
    });

    it('should return 400 if submission cannot be withdrawn', async () => {
      mockReq.params.id = 'sub-123';

      tenderOfferService.withdrawSubmission.mockRejectedValue(
        new Error('Can only withdraw pending submissions')
      );

      await tenderOfferController.withdrawSubmission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('closeTenderOffer', () => {
    it('should close a tender offer', async () => {
      mockReq.params.id = 'offer-123';

      const closedOffer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'closed',
        totalSharesAccepted: 5000
      };

      tenderOfferService.closeTenderOffer.mockResolvedValue(closedOffer);

      await tenderOfferController.closeTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(closedOffer);
    });

    it('should return 400 if offer cannot be closed', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.closeTenderOffer.mockRejectedValue(
        new Error('Can only close open offers')
      );

      await tenderOfferController.closeTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('settleOffer', () => {
    it('should settle a tender offer', async () => {
      mockReq.params.id = 'offer-123';

      const settledOffer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'settled',
        settlements: [
          { submissionId: 'TS-001', payoutAmount: 31000 },
          { submissionId: 'TS-002', payoutAmount: 46500 }
        ]
      };

      tenderOfferService.settleOffer.mockResolvedValue(settledOffer);

      await tenderOfferController.settleOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(settledOffer);
    });

    it('should return 400 if offer cannot be settled', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.settleOffer.mockRejectedValue(
        new Error('Can only settle closed offers')
      );

      await tenderOfferController.settleOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelTenderOffer', () => {
    it('should cancel a tender offer', async () => {
      mockReq.params.id = 'offer-123';

      const canceledOffer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        status: 'canceled'
      };

      tenderOfferService.cancelTenderOffer.mockResolvedValue(canceledOffer);

      await tenderOfferController.cancelTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(canceledOffer);
    });

    it('should return 400 if offer cannot be canceled', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.cancelTenderOffer.mockRejectedValue(
        new Error('Cannot cancel settled offer')
      );

      await tenderOfferController.cancelTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSubmissionsForOffer', () => {
    it('should return all submissions for an offer', async () => {
      mockReq.params.id = 'offer-123';

      const submissions = [
        { submissionId: 'TS-001', sharesOffered: 500 },
        { submissionId: 'TS-002', sharesOffered: 1000 }
      ];

      tenderOfferService.getSubmissionsForOffer.mockResolvedValue(submissions);

      await tenderOfferController.getSubmissionsForOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(submissions);
    });
  });

  describe('getSubmission', () => {
    it('should return a submission by id', async () => {
      mockReq.params.id = 'sub-123';

      const submission = {
        _id: 'sub-123',
        submissionId: 'TS-12345678',
        sharesOffered: 500
      };

      tenderOfferService.getSubmission.mockResolvedValue(submission);

      await tenderOfferController.getSubmission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(submission);
    });

    it('should return 404 if submission not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.getSubmission.mockRejectedValue(
        new Error('Submission not found')
      );

      await tenderOfferController.getSubmission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on server error', async () => {
      mockReq.params.id = 'sub-123';

      tenderOfferService.getSubmission.mockRejectedValue(
        new Error('Database error')
      );

      await tenderOfferController.getSubmission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateTenderOffer', () => {
    it('should update a tender offer', async () => {
      mockReq.params.id = 'offer-123';
      mockReq.body = { name: 'Updated Name' };

      const updatedOffer = {
        _id: 'offer-123',
        offerId: 'TO-12345678',
        name: 'Updated Name'
      };

      tenderOfferService.updateTenderOffer = jest.fn().mockResolvedValue(updatedOffer);

      await tenderOfferController.updateTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedOffer);
    });

    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';
      mockReq.body = { name: 'Updated Name' };

      tenderOfferService.updateTenderOffer = jest.fn().mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.updateTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 on validation error', async () => {
      mockReq.params.id = 'offer-123';
      mockReq.body = { name: 'Updated Name' };

      tenderOfferService.updateTenderOffer = jest.fn().mockRejectedValue(
        new Error('Can only update offers in draft status')
      );

      await tenderOfferController.updateTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteTenderOffer', () => {
    it('should delete a tender offer', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.deleteTenderOffer = jest.fn().mockResolvedValue({
        _id: 'offer-123',
        offerId: 'TO-12345678'
      });

      await tenderOfferController.deleteTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tender offer deleted' });
    });

    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.deleteTenderOffer = jest.fn().mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.deleteTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if offer cannot be deleted', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.deleteTenderOffer = jest.fn().mockRejectedValue(
        new Error('Can only delete offers in draft status')
      );

      await tenderOfferController.deleteTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getOfferSummary', () => {
    it('should return offer summary', async () => {
      mockReq.params.id = 'offer-123';

      const summary = {
        offer: { offerId: 'TO-12345678', name: 'Test Offer' },
        submissions: { total: 5 },
        shares: { available: 1000 },
        financials: { totalBudget: 10000 }
      };

      tenderOfferService.getOfferSummary = jest.fn().mockResolvedValue(summary);

      await tenderOfferController.getOfferSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(summary);
    });

    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.getOfferSummary = jest.fn().mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.getOfferSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on server error', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.getOfferSummary = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await tenderOfferController.getOfferSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTenderOffer - server error', () => {
    it('should return 500 on server error', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.getTenderOffer.mockRejectedValue(
        new Error('Database error')
      );

      await tenderOfferController.getTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishTenderOffer - not found', () => {
    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.publishTenderOffer.mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.publishTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('submitTender - not found', () => {
    it('should return 404 if offer not found', async () => {
      mockReq.body = {
        offerId: 'nonexistent',
        stakeholderId: 'STK-001',
        sharesOffered: 500
      };

      tenderOfferService.submitTender.mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.submitTender(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('withdrawSubmission - not found', () => {
    it('should return 404 if submission not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.withdrawSubmission.mockRejectedValue(
        new Error('Submission not found')
      );

      await tenderOfferController.withdrawSubmission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('closeTenderOffer - not found', () => {
    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.closeTenderOffer.mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.closeTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('settleOffer - not found', () => {
    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.settleOffer.mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.settleOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cancelTenderOffer - not found', () => {
    it('should return 404 if offer not found', async () => {
      mockReq.params.id = 'nonexistent';

      tenderOfferService.cancelTenderOffer.mockRejectedValue(
        new Error('Tender offer not found')
      );

      await tenderOfferController.cancelTenderOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSubmissionsForOffer - error', () => {
    it('should return 500 on error', async () => {
      mockReq.params.id = 'offer-123';

      tenderOfferService.getSubmissionsForOffer.mockRejectedValue(
        new Error('Database error')
      );

      await tenderOfferController.getSubmissionsForOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
