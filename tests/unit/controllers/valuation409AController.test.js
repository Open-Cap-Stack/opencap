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
  findOneAndDelete: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

// Mock the audit service to prevent import errors
const mockValuationAuditService = {
  getValuationAuditTrail: jest.fn(),
  generateIRSComplianceReport: jest.fn(),
  generateGAAPComplianceReport: jest.fn(),
  generateAuditReport: jest.fn(),
  exportAuditData: jest.fn()
};
jest.mock('../../../services/valuationAuditService', () => mockValuationAuditService);

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
      user: { _id: 'user_123', userId: 'user_123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
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

    it('should handle frontend field aliases (name, valuationDate, provider)', async () => {
      mockReq.body = {
        name: 'Q1 Valuation',
        valuationDate: '2024-03-15',
        fairMarketValue: '1.25',
        provider: 'ABC Valuations'
      };

      Valuation409A.create.mockResolvedValue({ valuationId: 'val_new' });

      await valuation409AController.createValuationRequest(mockReq, mockRes);

      expect(Valuation409A.create).toHaveBeenCalledWith(expect.objectContaining({
        reasonDetails: 'Q1 Valuation',
        effectiveDate: '2024-03-15',
        fairMarketValue: 1.25,
        valuationFirm: { name: 'ABC Valuations' }
      }));
    });

    it('should use default companyId and reason', async () => {
      mockReq.body = {};
      mockReq.user = { _id: 'user_123' };
      Valuation409A.create.mockResolvedValue({ valuationId: 'val_new' });

      await valuation409AController.createValuationRequest(mockReq, mockRes);
      expect(Valuation409A.create).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'default',
        reason: 'other'
      }));
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

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      Valuation409A.find.mockRejectedValue(new Error('DB error'));

      await valuation409AController.getCompanyValuations(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
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

    it('should return 500 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockRejectedValue(new Error('DB error'));

      await valuation409AController.getValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
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

    it('should return 404 when valuation not found after retries', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = { notes: 'Updated' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.updateValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should strip invalid status updates', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { status: 'invalid_status' };

      Valuation409A.findOne
        .mockResolvedValueOnce({ valuationId: 'val_123', status: 'requested' })
        .mockResolvedValueOnce({ valuationId: 'val_123', status: 'requested' });
      Valuation409A.updateOne.mockResolvedValue({});

      await valuation409AController.updateValuation(mockReq, mockRes);
      const updateCall = Valuation409A.updateOne.mock.calls[0][1];
      expect(updateCall.$set.status).toBeUndefined();
    });

    it('should fall back to row_id lookup', async () => {
      mockReq.params = { valuationId: 'row_abc' };
      mockReq.body = { notes: 'Updated' };

      Valuation409A.findOne
        .mockResolvedValueOnce(null) // not found by valuationId
        .mockResolvedValueOnce({ row_id: 'row_abc', status: 'requested' }) // found by row_id
        .mockResolvedValueOnce({ row_id: 'row_abc', status: 'requested', notes: 'Updated' });
      Valuation409A.updateOne.mockResolvedValue({});

      await valuation409AController.updateValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { notes: 'Updated' };
      Valuation409A.findOne.mockRejectedValue(new Error('DB error'));

      await valuation409AController.updateValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteValuation', () => {
    it('should delete valuation by valuationId field', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOneAndDelete.mockResolvedValue({ valuationId: 'val_123' });

      await valuation409AController.deleteValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should fall back to findByIdAndDelete', async () => {
      mockReq.params = { valuationId: 'some_id' };
      Valuation409A.findOneAndDelete.mockResolvedValue(null);
      Valuation409A.findByIdAndDelete.mockResolvedValue({ _id: 'some_id' });

      await valuation409AController.deleteValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      Valuation409A.findOneAndDelete.mockResolvedValue(null);
      Valuation409A.findByIdAndDelete.mockResolvedValue(null);

      await valuation409AController.deleteValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOneAndDelete.mockRejectedValue(new Error('DB error'));

      await valuation409AController.deleteValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
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
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = { name: 'ABC' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.assignValuationFirm(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { name: 'ABC' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.assignValuationFirm.mockRejectedValue(new Error('Validation failed'));

      await valuation409AController.assignValuationFirm(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('receiveDraft', () => {
    it('should record receipt of draft', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { fairMarketValue: 1.25, valuationMethod: 'income', effectiveDate: '2024-01-15' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'in_progress' });
      Valuation409A.receiveDraft.mockResolvedValue({ valuationId: 'val_123', status: 'draft_received' });

      await valuation409AController.receiveDraft(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = { fairMarketValue: 1.25 };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.receiveDraft(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { fairMarketValue: 1.25 };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.receiveDraft.mockRejectedValue(new Error('Error'));

      await valuation409AController.receiveDraft(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('startReview', () => {
    it('should start review', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { notes: 'Starting review' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.startReview.mockResolvedValue({ valuationId: 'val_123', status: 'under_review' });

      await valuation409AController.startReview(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = {};
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.startReview(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('approveValuation', () => {
    it('should approve a valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { resolution: 'Board approved on 2024-01-20' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'under_review' });
      Valuation409A.approve.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should update notes after approval if provided', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { resolution: 'Approved', notes: 'Additional notes' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'approved', notes: 'Additional notes' });
      Valuation409A.approve.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });
      Valuation409A.updateOne.mockResolvedValue({});

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(Valuation409A.updateOne).toHaveBeenCalled();
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = {};
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should approve without resolution (no notes)', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = {};

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.approve.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });

      await valuation409AController.approveValuation(mockReq, mockRes);
      expect(Valuation409A.approve).toHaveBeenCalledWith('val_123', 'user_123', null);
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
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject cancellation for non-cancellable statuses', async () => {
      mockReq.params = { valuationId: 'val_123' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });
      Valuation409A.canTransitionTo.mockReturnValue(false);

      await valuation409AController.cancelValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.cancelValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should use default reason if not provided', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = {};

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'requested' });
      Valuation409A.canTransitionTo.mockReturnValue(true);
      Valuation409A.transitionTo.mockResolvedValue({ valuationId: 'val_123', status: 'cancelled' });

      await valuation409AController.cancelValuation(mockReq, mockRes);
      expect(Valuation409A.transitionTo).toHaveBeenCalledWith('val_123', 'cancelled', 'user_123', 'Cancelled by user');
    });
  });

  describe('getCurrentValuation', () => {
    it('should return current valuation for company', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });

      await valuation409AController.getCurrentValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when no current valuation', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue(null);

      await valuation409AController.getCurrentValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockRejectedValue(new Error('DB error'));

      await valuation409AController.getCurrentValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getExpiringValuations', () => {
    it('should return expiring valuations', async () => {
      mockReq.query = { days: 30 };
      Valuation409A.findExpiringValuations.mockResolvedValue([
        { valuationId: 'val_1' }, { valuationId: 'val_2' }
      ]);

      await valuation409AController.getExpiringValuations(mockReq, mockRes);
      expect(Valuation409A.findExpiringValuations).toHaveBeenCalledWith(30);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    });

    it('should use default 60 days', async () => {
      mockReq.query = {};
      Valuation409A.findExpiringValuations.mockResolvedValue([]);

      await valuation409AController.getExpiringValuations(mockReq, mockRes);
      expect(Valuation409A.findExpiringValuations).toHaveBeenCalledWith(60);
    });

    it('should return 500 on error', async () => {
      mockReq.query = {};
      Valuation409A.findExpiringValuations.mockRejectedValue(new Error('Error'));

      await valuation409AController.getExpiringValuations(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getValuationHistory', () => {
    it('should return valuation history', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.getCompanyValuationHistory.mockResolvedValue([]);

      await valuation409AController.getValuationHistory(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.getCompanyValuationHistory.mockRejectedValue(new Error('Error'));

      await valuation409AController.getValuationHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
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

    it('should handle no current valuation', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.find.mockResolvedValue([]);
      Valuation409A.findCurrentValuation.mockResolvedValue(null);

      await valuation409AController.getCompanySummary(mockReq, mockRes);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.hasCurrentValuation).toBe(false);
      expect(response.data.needsNewValuation).toBe(true);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      Valuation409A.find.mockRejectedValue(new Error('Error'));

      await valuation409AController.getCompanySummary(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('processExpiredValuations', () => {
    it('should process expired valuations', async () => {
      Valuation409A.findExpiredValuations.mockResolvedValue([
        { valuationId: 'val_1', companyId: 'c1', expirationDate: '2024-01-01' }
      ]);

      await valuation409AController.processExpiredValuations(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('1')
      }));
    });

    it('should return 500 on error', async () => {
      Valuation409A.findExpiredValuations.mockRejectedValue(new Error('Error'));

      await valuation409AController.processExpiredValuations(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('addDocument', () => {
    it('should add document to valuation', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { documentId: 'doc_123', type: 'valuation_report', name: 'Report.pdf' };

      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.addDocument.mockResolvedValue({ valuationId: 'val_123', documents: [{ documentId: 'doc_123' }] });

      await valuation409AController.addDocument(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = { documentId: 'doc_1' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.addDocument(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getAllValuations', () => {
    it('should return all valuations', async () => {
      mockReq.query = { page: 1, limit: 10 };
      Valuation409A.find.mockResolvedValue([{ valuationId: 'val_1' }]);

      await valuation409AController.getAllValuations(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ page: 1, limit: 10 })
      }));
    });

    it('should filter by companyId and status', async () => {
      mockReq.query = { companyId: 'comp_1', status: 'approved' };
      Valuation409A.find.mockResolvedValue([]);

      await valuation409AController.getAllValuations(mockReq, mockRes);
      expect(Valuation409A.find).toHaveBeenCalledWith(
        { companyId: 'comp_1', status: 'approved' },
        expect.any(Object)
      );
    });

    it('should handle DB error gracefully', async () => {
      mockReq.query = {};
      Valuation409A.find.mockRejectedValue(new Error('Table does not exist'));

      await valuation409AController.getAllValuations(mockReq, mockRes);
      // Should still return 200 with empty data
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: []
      }));
    });

    it('should return 500 on outer error', async () => {
      // Force an error in the outer try-catch by making the response throw
      mockReq.query = null; // This causes parseInt to throw
      const badRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      // Need a specific scenario that triggers the outer catch
      // Override query getter to throw
      const throwReq = {
        ...mockReq,
        get query() { throw new Error('Outer error'); }
      };
      await valuation409AController.getAllValuations(throwReq, badRes);
      expect(badRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getValuationAnalytics', () => {
    it('should return analytics data', async () => {
      Valuation409A.find.mockResolvedValue([
        { status: 'requested', createdAt: '2024-01-15T00:00:00Z' },
        { status: 'approved', createdAt: '2024-01-20T00:00:00Z' },
        { status: 'completed', createdAt: '2024-02-15T00:00:00Z' }
      ]);

      await valuation409AController.getValuationAnalytics(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalValuations: 3,
          pendingValuations: 1,
          completedValuations: 2,
          valuationsByStatus: expect.any(Array),
          valuationsByMonth: expect.any(Array),
          recentActivity: expect.any(Array)
        })
      }));
    });

    it('should handle empty valuations', async () => {
      Valuation409A.find.mockResolvedValue([]);

      await valuation409AController.getValuationAnalytics(mockReq, mockRes);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.totalValuations).toBe(0);
    });

    it('should handle DB error gracefully', async () => {
      Valuation409A.find.mockRejectedValue(new Error('DB error'));

      await valuation409AController.getValuationAnalytics(mockReq, mockRes);
      // Should still return analytics with empty data
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ totalValuations: 0 })
      }));
    });
  });

  describe('getLatestValuation', () => {
    it('should return latest valuation for a company', async () => {
      mockReq.query = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue({ valuationId: 'val_123', status: 'approved' });

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return null when no valuation exists', async () => {
      mockReq.query = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue(null);
      Valuation409A.find.mockResolvedValue([]);

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ valuation: null }));
    });

    it('should return 400 when companyId is missing', async () => {
      mockReq.query = {};
      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should fall back to most recent valuation when no current valuation', async () => {
      mockReq.query = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockResolvedValue(null);
      Valuation409A.find.mockResolvedValue([{ valuationId: 'val_old', status: 'expired' }]);

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        valuation: expect.objectContaining({ valuationId: 'val_old' })
      }));
    });

    it('should handle default companyId gracefully', async () => {
      mockReq.query = { companyId: 'default' };
      Valuation409A.findCurrentValuation.mockResolvedValue(null);
      Valuation409A.find.mockResolvedValue([]);

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ valuation: null }));
    });

    it('should return 500 on error', async () => {
      mockReq.query = { companyId: 'company_123' };
      Valuation409A.findCurrentValuation.mockRejectedValue(new Error('Error'));

      await valuation409AController.getLatestValuation(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // Audit trail endpoints
  describe('getValuationAuditTrail', () => {
    it('should return audit trail', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockValuationAuditService.getValuationAuditTrail.mockResolvedValue([{ action: 'created' }]);

      await valuation409AController.getValuationAuditTrail(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockValuationAuditService.getValuationAuditTrail.mockRejectedValue(new Error('Valuation not found'));

      await valuation409AController.getValuationAuditTrail(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockValuationAuditService.getValuationAuditTrail.mockRejectedValue(new Error('DB error'));

      await valuation409AController.getValuationAuditTrail(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('generateIRSComplianceReport', () => {
    it('should generate IRS compliance report', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = { fiscalYear: '2024' };
      mockValuationAuditService.generateIRSComplianceReport.mockResolvedValue({ compliant: true });

      await valuation409AController.generateIRSComplianceReport(mockReq, mockRes);
      expect(mockValuationAuditService.generateIRSComplianceReport).toHaveBeenCalledWith('company_123', 2024);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should pass null fiscalYear when not provided', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      mockValuationAuditService.generateIRSComplianceReport.mockResolvedValue({});

      await valuation409AController.generateIRSComplianceReport(mockReq, mockRes);
      expect(mockValuationAuditService.generateIRSComplianceReport).toHaveBeenCalledWith('company_123', null);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      mockValuationAuditService.generateIRSComplianceReport.mockRejectedValue(new Error('Error'));

      await valuation409AController.generateIRSComplianceReport(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('generateGAAPComplianceReport', () => {
    it('should generate GAAP compliance report', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = { fiscalYear: '2024' };
      mockValuationAuditService.generateGAAPComplianceReport.mockResolvedValue({ compliant: true });

      await valuation409AController.generateGAAPComplianceReport(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      mockValuationAuditService.generateGAAPComplianceReport.mockRejectedValue(new Error('Error'));

      await valuation409AController.generateGAAPComplianceReport(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = { fiscalYear: '2024', startDate: '2024-01-01', endDate: '2024-12-31' };
      mockValuationAuditService.generateAuditReport.mockResolvedValue({});

      await valuation409AController.generateAuditReport(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      mockValuationAuditService.generateAuditReport.mockRejectedValue(new Error('Error'));

      await valuation409AController.generateAuditReport(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('exportAuditData', () => {
    it('should export audit data in JSON format', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = { format: 'json' };
      mockValuationAuditService.exportAuditData.mockResolvedValue([]);

      await valuation409AController.exportAuditData(mockReq, mockRes);
      expect(mockValuationAuditService.exportAuditData).toHaveBeenCalledWith('company_123', 'json');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should use default json format', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      mockValuationAuditService.exportAuditData.mockResolvedValue([]);

      await valuation409AController.exportAuditData(mockReq, mockRes);
      expect(mockValuationAuditService.exportAuditData).toHaveBeenCalledWith('company_123', 'json');
    });

    it('should return 500 on error', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {};
      mockValuationAuditService.exportAuditData.mockRejectedValue(new Error('Error'));

      await valuation409AController.exportAuditData(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('submitInputs', () => {
    it('should submit financial inputs', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = {
        financialInputs: { revenue: 1000000 },
        businessContext: { industry: 'SaaS' }
      };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.updateOne.mockResolvedValue({});
      const updated = { valuationId: 'val_123', status: 'data_collection' };
      // findOne called twice: first to find, then after update
      Valuation409A.findOne
        .mockResolvedValueOnce({ valuationId: 'val_123' })
        .mockResolvedValueOnce(updated);

      await valuation409AController.submitInputs(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 when financialInputs is missing', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { businessContext: { industry: 'SaaS' } };

      await valuation409AController.submitInputs(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when businessContext is missing', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { financialInputs: { revenue: 1000000 } };

      await valuation409AController.submitInputs(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = { financialInputs: {}, businessContext: {} };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.submitInputs(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { financialInputs: {}, businessContext: {} };
      Valuation409A.findOne.mockRejectedValue(new Error('Error'));

      await valuation409AController.submitInputs(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('markPaid', () => {
    it('should mark valuation as paid', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = { stripeSessionId: 'sess_abc' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123' });
      Valuation409A.updateOne.mockResolvedValue({});

      await valuation409AController.markPaid(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      mockReq.body = {};
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.markPaid(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      mockReq.body = {};
      Valuation409A.findOne.mockRejectedValue(new Error('Error'));

      await valuation409AController.markPaid(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAIStatus', () => {
    it('should return AI status', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'val_123',
        aiStatus: 'researching',
        status: 'ai_processing'
      });

      await valuation409AController.getAIStatus(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ aiStatus: 'researching' })
      }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.getAIStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return not_started when aiStatus is not set', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', status: 'requested' });

      await valuation409AController.getAIStatus(mockReq, mockRes);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.aiStatus).toBe('not_started');
    });
  });

  describe('getAIReport', () => {
    it('should return AI report', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'val_123',
        aiReport: { summary: 'Report content' },
        aiSelectedComparables: ['comp1'],
        aiReconciliation: { method: 'income' },
        fairMarketValue: 1.25,
        status: 'released'
      });

      await valuation409AController.getAIReport(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ report: { summary: 'Report content' } })
      }));
    });

    it('should return 404 when valuation not found', async () => {
      mockReq.params = { valuationId: 'nonexistent' };
      Valuation409A.findOne.mockResolvedValue(null);

      await valuation409AController.getAIReport(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when AI report not yet generated', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'val_123', aiReport: null });

      await valuation409AController.getAIReport(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'AI report not yet generated'
      }));
    });

    it('should return 500 on error', async () => {
      mockReq.params = { valuationId: 'val_123' };
      Valuation409A.findOne.mockRejectedValue(new Error('Error'));

      await valuation409AController.getAIReport(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
