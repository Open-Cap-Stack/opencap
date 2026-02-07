/**
 * Valuation409A Controller Tests
 * Feature: Issue #59 - Create 409A Valuation Request System
 */

const mockSave = jest.fn();
let mockValuationInstance = {};

// Mock the model as a constructor function with static methods
jest.mock('../../../models/Valuation409A', () => {
  const MockValuation409A = jest.fn().mockImplementation((data) => {
    Object.assign(mockValuationInstance, data);
    mockValuationInstance.save = mockSave;
    return mockValuationInstance;
  });
  MockValuation409A.find = jest.fn();
  MockValuation409A.findOne = jest.fn();
  MockValuation409A.countDocuments = jest.fn();
  MockValuation409A.findCurrentValuation = jest.fn();
  MockValuation409A.findExpiringValuations = jest.fn();
  MockValuation409A.getCompanyValuationHistory = jest.fn();
  MockValuation409A.findExpiredValuations = jest.fn();
  return MockValuation409A;
});

// Mock the audit service to prevent import errors
jest.mock('../../../services/valuationAuditService', () => ({
  getValuationAuditTrail: jest.fn(),
  generateIRSComplianceReport: jest.fn(),
  generateGAAPComplianceReport: jest.fn(),
  generateAuditReport: jest.fn(),
  exportAuditData: jest.fn()
}));

const Valuation409A = require('../../../models/Valuation409A');
const valuation409AController = require('../../../controllers/valuation409AController');

describe('Valuation409A Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { _id: 'user_123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
    mockValuationInstance = {};
  });

  describe('createValuationRequest', () => {
    it('should create a new valuation request', async () => {
      mockReq.body = {
        companyId: 'company_123',
        reason: 'annual_valuation',
        reasonDetails: 'Annual 409A refresh'
      };

      mockSave.mockResolvedValue({
        valuationId: 'val_new',
        companyId: 'company_123',
        status: 'requested'
      });

      await valuation409AController.createValuationRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 on validation error', async () => {
      mockReq.body = { companyId: 'company_123' };

      mockSave.mockRejectedValue(new Error('Validation failed'));

      await valuation409AController.createValuationRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getCompanyValuations', () => {
    it('should return valuations for a company', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = { page: 1, limit: 20 };

      Valuation409A.find.mockResolvedValue([{ valuationId: 'val_123' }]);
      Valuation409A.countDocuments.mockResolvedValue(1);

      await valuation409AController.getCompanyValuations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({ page: 1, limit: 20 })
        })
      );
    });

    it('should filter by status when provided', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = { status: 'approved' };

      Valuation409A.find.mockResolvedValue([]);
      Valuation409A.countDocuments.mockResolvedValue(0);

      await valuation409AController.getCompanyValuations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getValuation', () => {
    it('should return a specific valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'requested' });

      await valuation409AController.getValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.getValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('assignValuationFirm', () => {
    it('should assign a valuation firm', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { name: 'ABC Valuation Services', contactName: 'John Doe', contactEmail: 'john@abc.com' };

      const mockValuation = {
        valuationId: 'val_123',
        assignValuationFirm: jest.fn().mockResolvedValue({
          valuationId: 'val_123',
          valuationFirm: { name: 'ABC Valuation Services' }
        })
      };
      Valuation409A.findOne.mockResolvedValue(mockValuation);

      await valuation409AController.assignValuationFirm(mockReq, mockRes);
      expect(mockValuation.assignValuationFirm).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('receiveDraft', () => {
    it('should record receipt of draft', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { fairMarketValue: 1.25, valuationMethod: 'income', effectiveDate: '2024-01-15' };

      const mockValuation = {
        valuationId: 'val_123',
        status: 'in_progress',
        receiveDraft: jest.fn().mockResolvedValue({ valuationId: 'val_123', status: 'draft_received', fairMarketValue: 1.25 })
      };
      Valuation409A.findOne.mockResolvedValue(mockValuation);

      await valuation409AController.receiveDraft(mockReq, mockRes);
      expect(mockValuation.receiveDraft).toHaveBeenCalledWith(expect.objectContaining({ fairMarketValue: 1.25 }), 'user_123');
    });
  });

  describe('approveValuation', () => {
    it('should approve a valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { resolution: 'Board approved on 2024-01-20' };

      const mockValuation = {
        valuationId: 'val_123',
        status: 'under_review',
        approve: jest.fn().mockResolvedValue({ valuationId: 'val_123', status: 'approved' }),
        save: jest.fn().mockResolvedValue(this)
      };
      Valuation409A.findOne.mockResolvedValue(mockValuation);

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(mockValuation.approve).toHaveBeenCalled();
    });
  });

  describe('cancelValuation', () => {
    it('should cancel a valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { reason: 'No longer needed' };

      const mockValuation = {
        valuationId: 'val_123',
        status: 'requested',
        canTransitionTo: jest.fn().mockReturnValue(true),
        transitionTo: jest.fn().mockResolvedValue({ valuationId: 'val_123', status: 'cancelled' })
      };
      Valuation409A.findOne.mockResolvedValue(mockValuation);

      await valuation409AController.cancelValuation(mockReq, mockRes);
      expect(mockValuation.transitionTo).toHaveBeenCalledWith('cancelled', 'user_123', 'No longer needed');
    });

    it('should reject cancellation for non-cancellable statuses', async () => {
      mockReq.params = { valuationId: 'val_123' };

      const mockValuation = {
        valuationId: 'val_123',
        status: 'approved',
        canTransitionTo: jest.fn().mockReturnValue(false)
      };
      Valuation409A.findOne.mockResolvedValue(mockValuation);

      await valuation409AController.cancelValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCurrentValuation', () => {
    it('should return current valuation for company', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue({ valuationId: 'val_123', status: 'approved', fairMarketValue: 1.25 });

      await valuation409AController.getCurrentValuation(mockReq, mockRes);
      expect(Valuation409A.findCurrentValuation).toHaveBeenCalledWith('company_123');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when no current valuation', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue(null);

      await valuation409AController.getCurrentValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getExpiringValuations', () => {
    it('should return expiring valuations', async () => {
      mockReq.query = { days: 30 };
      Valuation409A.findExpiringValuations.mockResolvedValue([
        { valuationId: 'val_1', expirationDate: new Date() },
        { valuationId: 'val_2', expirationDate: new Date() }
      ]);

      await valuation409AController.getExpiringValuations(mockReq, mockRes);
      expect(Valuation409A.findExpiringValuations).toHaveBeenCalledWith(30);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));
    });
  });

  describe('getCompanySummary', () => {
    it('should return company valuation summary', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.find.mockResolvedValue([{ status: 'approved' }, { status: 'expired' }, { status: 'cancelled' }]);
      Valuation409A.findCurrentValuation.mockResolvedValue({
        valuationId: 'val_123', fairMarketValue: 1.25, effectiveDate: new Date(),
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        daysUntilExpiration: 180, needsRenewalReminder: false
      });

      await valuation409AController.getCompanySummary(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 3, hasCurrentValuation: true }) })
      );
    });
  });

  describe('addDocument', () => {
    it('should add document to valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { documentId: 'doc_123', type: 'valuation_report', name: 'Q1 2024 Valuation Report.pdf' };

      const mockValuation = {
        valuationId: 'val_123',
        addDocument: jest.fn().mockResolvedValue({ valuationId: 'val_123', documents: [{ documentId: 'doc_123' }] })
      };
      Valuation409A.findOne.mockResolvedValue(mockValuation);

      await valuation409AController.addDocument(mockReq, mockRes);
      expect(mockValuation.addDocument).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getLatestValuation', () => {
    it('should return latest valuation for a company', async () => {
      mockReq.query = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue({ valuationId: 'val_123', status: 'approved', fairMarketValue: 1.25 });

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(Valuation409A.findCurrentValuation).toHaveBeenCalledWith('company_123');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, valuation: expect.objectContaining({ valuationId: 'val_123' }) }));
    });

    it('should return null when no valuation exists', async () => {
      mockReq.query = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue(null);

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, valuation: null }));
    });

    it('should return 400 when companyId is missing', async () => {
      mockReq.query = {};
      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'companyId query parameter is required' }));
    });
  });
});
