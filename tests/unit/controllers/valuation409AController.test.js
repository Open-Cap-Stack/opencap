/**
 * Valuation409A Controller Tests
 * Feature: Issue #59 - Create 409A Valuation Request System
 */

// Mock the model as a plain ZeroDB object with static methods
jest.mock('../../../models/Valuation409A', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  countDocuments: jest.fn(),
  findCurrentValuation: jest.fn(),
  findExpiringValuations: jest.fn(),
  getCompanyValuationHistory: jest.fn(),
  findExpiredValuations: jest.fn(),
  assignValuationFirm: jest.fn(),
  receiveDraft: jest.fn(),
  startReview: jest.fn(),
  approve: jest.fn(),
  transitionTo: jest.fn(),
  canTransitionTo: jest.fn(),
  addDocument: jest.fn(),
}));

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
  });

  describe('createValuationRequest', () => {
    it('should create a new valuation request', async () => {
      mockReq.body = {
        companyId: 'company_123',
        reason: 'annual_valuation',
        reasonDetails: 'Annual 409A refresh'
      };

      Valuation409A.create.mockResolvedValue({
        valuationId: 'val_new',
        companyId: 'company_123',
        status: 'requested'
      });

      await valuation409AController.createValuationRequest(mockReq, mockRes);

      expect(Valuation409A.create).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'company_123',
        reason: 'annual_valuation',
        createdBy: 'user_123'
      }));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 on validation error', async () => {
      mockReq.body = { companyId: 'company_123' };

      Valuation409A.create.mockRejectedValue(new Error('Validation failed'));

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

  describe('updateValuation', () => {
    it('should update a valuation in requested status', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { notes: 'Updated notes' };

      Valuation409A.findOne
        .mockResolvedValueOnce({ valuationId: 'val_123', status: 'requested' })
        .mockResolvedValueOnce({ valuationId: 'val_123', status: 'requested', notes: 'Updated notes' });
      Valuation409A.updateOne.mockResolvedValue({});

      await valuation409AController.updateValuation(mockReq, mockRes);

      expect(Valuation409A.updateOne).toHaveBeenCalledWith(
        { valuationId: 'val_123' },
        { $set: expect.objectContaining({ notes: 'Updated notes', updatedBy: 'user_123' }) }
      );
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject updates for approved valuations', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { notes: 'Updated notes' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });

      await valuation409AController.updateValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('assignValuationFirm', () => {
    it('should assign a valuation firm', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { name: 'ABC Valuation Services', contactName: 'John Doe', contactEmail: 'john@abc.com' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.assignValuationFirm.mockResolvedValue({
        valuationId: 'val_123',
        valuationFirm: { name: 'ABC Valuation Services' }
      });

      await valuation409AController.assignValuationFirm(mockReq, mockRes);
      expect(Valuation409A.assignValuationFirm).toHaveBeenCalledWith(
        'val_123',
        { name: 'ABC Valuation Services', contactName: 'John Doe', contactEmail: 'john@abc.com', phone: undefined },
        'user_123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('receiveDraft', () => {
    it('should record receipt of draft', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { fairMarketValue: 1.25, valuationMethod: 'income', effectiveDate: '2024-01-15' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'in_progress' });
      Valuation409A.receiveDraft.mockResolvedValue({ valuationId: 'val_123', status: 'draft_received', fairMarketValue: 1.25 });

      await valuation409AController.receiveDraft(mockReq, mockRes);
      expect(Valuation409A.receiveDraft).toHaveBeenCalledWith(
        'val_123',
        expect.objectContaining({ fairMarketValue: 1.25 }),
        'user_123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('startReview', () => {
    it('should start review of a valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { notes: 'Starting review' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'draft_received' });
      Valuation409A.startReview.mockResolvedValue({ valuationId: 'val_123', status: 'under_review' });

      await valuation409AController.startReview(mockReq, mockRes);
      expect(Valuation409A.startReview).toHaveBeenCalledWith('val_123', 'user_123', 'Starting review');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('approveValuation', () => {
    it('should approve a valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { resolution: 'Board approved on 2024-01-20' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'under_review' });
      Valuation409A.approve.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(Valuation409A.approve).toHaveBeenCalledWith(
        'val_123',
        'user_123',
        { resolution: 'Board approved on 2024-01-20' }
      );
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should update notes after approval if provided', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { resolution: 'Approved', notes: 'Additional notes' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'approved', notes: 'Additional notes' });
      Valuation409A.approve.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });
      Valuation409A.updateOne.mockResolvedValue({});

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(Valuation409A.approve).toHaveBeenCalled();
      expect(Valuation409A.updateOne).toHaveBeenCalledWith(
        { valuationId: 'val_123' },
        { $set: { notes: 'Additional notes' } }
      );
    });
  });

  describe('cancelValuation', () => {
    it('should cancel a valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { reason: 'No longer needed' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'requested' });
      Valuation409A.canTransitionTo.mockReturnValue(true);
      Valuation409A.transitionTo.mockResolvedValue({ valuationId: 'val_123', status: 'cancelled' });

      await valuation409AController.cancelValuation(mockReq, mockRes);
      expect(Valuation409A.canTransitionTo).toHaveBeenCalledWith('requested', 'cancelled');
      expect(Valuation409A.transitionTo).toHaveBeenCalledWith('val_123', 'cancelled', 'user_123', 'No longer needed');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject cancellation for non-cancellable statuses', async () => {
      mockReq.params = { valuationId: 'val_123' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });
      Valuation409A.canTransitionTo.mockReturnValue(false);

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

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.addDocument.mockResolvedValue({ valuationId: 'val_123', documents: [{ documentId: 'doc_123' }] });

      await valuation409AController.addDocument(mockReq, mockRes);
      expect(Valuation409A.addDocument).toHaveBeenCalledWith(
        'val_123',
        { documentId: 'doc_123', type: 'valuation_report', name: 'Q1 2024 Valuation Report.pdf' },
        'user_123'
      );
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
      Valuation409A.find.mockResolvedValue([]);

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
