/**
 * SAFE Controller Tests
 * Feature: Issue #39 - Controller Test Coverage
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock the models before requiring controller
jest.mock('../../../models/SAFE');
jest.mock('../../../models/SignatureRequest');
jest.mock('../../../models/SAFEConversion');
jest.mock('../../../services/safeConversionService');

const SAFE = require('../../../models/SAFE');
const SignatureRequest = require('../../../models/SignatureRequest');
const SAFEConversionService = require('../../../services/safeConversionService');
const safeController = require('../../../controllers/safeController');

describe('SAFE Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        _id: new mongoose.Types.ObjectId(),
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('createSAFE', () => {
    it('should create a new SAFE successfully', async () => {
      const safeData = {
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'John Investor',
        investorEmail: 'john@investor.com',
        investmentAmount: 100000,
        safeType: 'post-money',
        valuationCap: 5000000
      };

      mockReq.body = safeData;

      const mockSafe = {
        ...safeData,
        _id: new mongoose.Types.ObjectId(),
        safeId: 'safe_123',
        status: 'draft',
        save: jest.fn().mockResolvedValue(true)
      };

      SAFE.mockImplementation(() => mockSafe);

      await safeController.createSAFE(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object)
      });
    });

    it('should return 400 for invalid data', async () => {
      mockReq.body = { investmentAmount: -100 };

      const mockSafe = {
        save: jest.fn().mockRejectedValue(new Error('Validation failed'))
      };
      SAFE.mockImplementation(() => mockSafe);

      await safeController.createSAFE(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
    });
  });

  describe('getCompanySAFEs', () => {
    it('should return paginated SAFEs for a company', async () => {
      const companyId = new mongoose.Types.ObjectId();
      mockReq.params.companyId = companyId.toString();
      mockReq.query = { page: '1', limit: '20' };

      const mockSafes = [
        { safeId: 'safe_1', investorName: 'Investor 1' },
        { safeId: 'safe_2', investorName: 'Investor 2' }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockSafes)
      };

      SAFE.find = jest.fn().mockReturnValue(mockQuery);
      SAFE.countDocuments = jest.fn().mockResolvedValue(2);

      await safeController.getCompanySAFEs(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSafes,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1
        }
      });
    });

    it('should filter by status when provided', async () => {
      mockReq.params.companyId = new mongoose.Types.ObjectId().toString();
      mockReq.query = { status: 'funded' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      SAFE.find = jest.fn().mockReturnValue(mockQuery);
      SAFE.countDocuments = jest.fn().mockResolvedValue(0);

      await safeController.getCompanySAFEs(mockReq, mockRes);

      expect(SAFE.find).toHaveBeenCalledWith({
        companyId: mockReq.params.companyId,
        status: 'funded'
      });
    });
  });

  describe('getSAFE', () => {
    it('should return a SAFE by safeId', async () => {
      const safeId = 'safe_123';
      mockReq.params.safeId = safeId;

      const mockSafe = {
        safeId,
        investorName: 'Test Investor',
        investmentAmount: 50000
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(mockSafe);

      SAFE.findOne = jest.fn().mockReturnValue(mockQuery);

      await safeController.getSAFE(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSafe
      });
    });

    it('should return 404 when SAFE not found', async () => {
      mockReq.params.safeId = 'nonexistent';

      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(null);

      SAFE.findOne = jest.fn().mockReturnValue(mockQuery);

      await safeController.getSAFE(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'SAFE not found'
      });
    });
  });

  describe('updateSAFE', () => {
    it('should update a SAFE in draft status', async () => {
      mockReq.params.safeId = 'safe_123';
      mockReq.body = { investmentAmount: 75000, notes: 'Updated' };

      const mockSafe = {
        safeId: 'safe_123',
        status: 'draft',
        save: jest.fn().mockResolvedValue(true)
      };

      SAFE.findOne = jest.fn().mockResolvedValue(mockSafe);

      await safeController.updateSAFE(mockReq, mockRes);

      expect(mockSafe.investmentAmount).toBe(75000);
      expect(mockSafe.notes).toBe('Updated');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSafe
      });
    });

    it('should prevent updates to non-draft SAFEs', async () => {
      mockReq.params.safeId = 'safe_123';
      mockReq.body = { investmentAmount: 75000 };

      const mockSafe = {
        safeId: 'safe_123',
        status: 'sent'
      };

      SAFE.findOne = jest.fn().mockResolvedValue(mockSafe);

      await safeController.updateSAFE(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Can only update SAFEs in draft status'
      });
    });
  });

  describe('sendSAFE', () => {
    it('should send a SAFE for signatures', async () => {
      mockReq.params.safeId = 'safe_123';
      mockReq.body = { message: 'Please sign this SAFE' };

      const mockSafe = {
        _id: new mongoose.Types.ObjectId(),
        safeId: 'safe_123',
        status: 'draft',
        investorId: { _id: new mongoose.Types.ObjectId(), name: 'Investor', email: 'inv@test.com' },
        investorName: 'Test Investor',
        investorEmail: 'investor@test.com',
        companyId: { _id: new mongoose.Types.ObjectId(), name: 'Test Co' },
        canTransitionTo: jest.fn().mockReturnValue(true),
        transitionTo: jest.fn().mockResolvedValue(true)
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(mockSafe);

      SAFE.findOne = jest.fn().mockReturnValue(mockQuery);

      const mockSignatureRequest = {
        save: jest.fn().mockResolvedValue(true),
        send: jest.fn().mockResolvedValue(true)
      };

      SignatureRequest.mockImplementation(() => mockSignatureRequest);

      await safeController.sendSAFE(mockReq, mockRes);

      expect(mockSignatureRequest.save).toHaveBeenCalled();
      expect(mockSignatureRequest.send).toHaveBeenCalled();
      expect(mockSafe.transitionTo).toHaveBeenCalledWith('sent', expect.any(Object), 'Sent for signatures');
    });
  });

  describe('markFunded', () => {
    it('should mark a fully signed SAFE as funded', async () => {
      mockReq.params.safeId = 'safe_123';
      mockReq.body = { notes: 'Wire received' };

      const mockSafe = {
        safeId: 'safe_123',
        status: 'fully_signed',
        investmentAmount: 100000,
        canTransitionTo: jest.fn().mockReturnValue(true),
        transitionTo: jest.fn().mockResolvedValue(true)
      };

      SAFE.findOne = jest.fn().mockResolvedValue(mockSafe);

      await safeController.markFunded(mockReq, mockRes);

      expect(mockSafe.transitionTo).toHaveBeenCalledWith(
        'funded',
        mockReq.user._id,
        'Wire received',
        expect.any(Object)
      );
    });

    it('should reject funding for wrong status', async () => {
      mockReq.params.safeId = 'safe_123';

      const mockSafe = {
        safeId: 'safe_123',
        status: 'draft',
        canTransitionTo: jest.fn().mockReturnValue(false)
      };

      SAFE.findOne = jest.fn().mockResolvedValue(mockSafe);

      await safeController.markFunded(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelSAFE', () => {
    it('should cancel a SAFE with valid status', async () => {
      mockReq.params.safeId = 'safe_123';
      mockReq.body = { reason: 'Deal fell through' };

      const mockSafe = {
        safeId: 'safe_123',
        status: 'draft',
        canTransitionTo: jest.fn().mockReturnValue(true),
        transitionTo: jest.fn().mockResolvedValue(true)
      };

      SAFE.findOne = jest.fn().mockResolvedValue(mockSafe);

      await safeController.cancelSAFE(mockReq, mockRes);

      expect(mockSafe.transitionTo).toHaveBeenCalledWith(
        'cancelled',
        mockReq.user._id,
        'Deal fell through'
      );
    });
  });

  describe('previewConversion', () => {
    it('should return conversion preview for company SAFEs', async () => {
      const companyId = new mongoose.Types.ObjectId();
      mockReq.params.companyId = companyId.toString();
      mockReq.body = {
        roundTerms: {
          pricePerShare: 1.00,
          fullyDilutedShares: 10000000,
          preMoneyValuation: 10000000
        }
      };

      const mockPreview = {
        eligibleSAFEsCount: 3,
        totalInvestment: 500000,
        totalSharesFromConversion: 600000,
        previews: []
      };

      SAFEConversionService.previewRoundConversions = jest.fn().mockResolvedValue(mockPreview);

      await safeController.previewConversion(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreview
      });
    });

    it('should validate required round terms', async () => {
      mockReq.params.companyId = new mongoose.Types.ObjectId().toString();
      mockReq.body = { roundTerms: {} };

      await safeController.previewConversion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompanySummary', () => {
    it('should return SAFE summary for a company', async () => {
      const companyId = new mongoose.Types.ObjectId();
      mockReq.params.companyId = companyId.toString();

      const mockSafes = [
        { status: 'draft', investmentAmount: 50000 },
        { status: 'funded', investmentAmount: 100000 },
        { status: 'funded', investmentAmount: 150000 }
      ];

      SAFE.find = jest.fn().mockResolvedValue(mockSafes);
      SAFE.getTotalFundedAmount = jest.fn().mockResolvedValue(250000);
      SAFE.getPendingConversion = jest.fn().mockResolvedValue([
        { investmentAmount: 100000 },
        { investmentAmount: 150000 }
      ]);

      await safeController.getCompanySummary(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: 3,
          totalFunded: 250000,
          pendingConversionCount: 2
        })
      });
    });
  });
});
