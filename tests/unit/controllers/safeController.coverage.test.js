/**
 * SAFE Controller Coverage Tests
 * Covers uncovered lines: updateStatus, deleteSAFE, createConversions, executeConversion,
 * normalizeSafeType branches, error paths, ZeroDB 422/429 handling in getCompanySAFEs
 */

jest.mock('../../../models/SAFE', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  canTransitionTo: jest.fn(),
  transitionTo: jest.fn(),
  addInvestorSignature: jest.fn(),
  addCompanySignature: jest.fn(),
  getTotalFundedAmount: jest.fn(),
  getPendingConversion: jest.fn()
}));
jest.mock('../../../models/SignatureRequest', () => ({
  create: jest.fn(),
  send: jest.fn()
}));
jest.mock('../../../models/SAFEConversion');
jest.mock('../../../services/safeConversionService');

const SAFE = require('../../../models/SAFE');
const SAFEConversionService = require('../../../services/safeConversionService');
const ctrl = require('../../../controllers/safeController');

describe('SAFE Controller - Coverage', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: 'uid', userId: 'uid', displayName: 'Test User', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.clearAllMocks();
  });

  // ---- updateStatus ----
  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      req.params.safeId = 's1';
      req.body = { status: 'sent', reason: 'Ready to send' };
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'draft' });
      SAFE.canTransitionTo.mockReturnValue(true);
      SAFE.transitionTo.mockResolvedValue({ safeId: 's1', status: 'sent' });

      await ctrl.updateStatus(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: 'sent' })
      }));
    });

    it('should return 400 if no status provided', async () => {
      req.params.safeId = 's1';
      req.body = {};
      await ctrl.updateStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      req.body = { status: 'sent' };
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.updateStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid transition', async () => {
      req.params.safeId = 's1';
      req.body = { status: 'converted' };
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'draft' });
      SAFE.canTransitionTo.mockReturnValue(false);
      await ctrl.updateStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should use default reason when none provided', async () => {
      req.params.safeId = 's1';
      req.body = { status: 'sent' };
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'draft' });
      SAFE.canTransitionTo.mockReturnValue(true);
      SAFE.transitionTo.mockResolvedValue({ safeId: 's1', status: 'sent' });

      await ctrl.updateStatus(req, res);
      expect(SAFE.transitionTo).toHaveBeenCalledWith('s1', 'sent', 'uid', 'Status changed to sent');
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      req.body = { status: 'sent' };
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.updateStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- updateSAFE - status change rejection ----
  describe('updateSAFE - status field rejection', () => {
    it('should return 400 if status field is in update body', async () => {
      req.params.safeId = 's1';
      req.body = { status: 'sent', investmentAmount: 50000 };
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'draft' });

      await ctrl.updateSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Status cannot be changed via PUT');
    });

    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      req.body = { investmentAmount: 50000 };
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.updateSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      req.body = { investmentAmount: 50000 };
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.updateSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- deleteSAFE ----
  describe('deleteSAFE', () => {
    it('should delete SAFE', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockResolvedValue({ safeId: 's1' });
      SAFE.findOneAndDelete = jest.fn().mockResolvedValue({});

      await ctrl.deleteSAFE(req, res);
      expect(SAFE.findOneAndDelete).toHaveBeenCalledWith({ safeId: 's1' });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'SAFE deleted' });
    });

    it('should return 404 if not found', async () => {
      req.params.safeId = 'missing';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.deleteSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.deleteSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- createConversions ----
  describe('createConversions', () => {
    it('should create conversions', async () => {
      req.params.companyId = 'c1';
      req.body = { fundingRoundId: 'fr1', roundTerms: { pricePerShare: 1 }, shareClassId: 'sc1' };
      SAFEConversionService.createRoundConversions = jest.fn().mockResolvedValue({ converted: 2 });

      await ctrl.createConversions(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle error', async () => {
      req.params.companyId = 'c1';
      req.body = {};
      SAFEConversionService.createRoundConversions = jest.fn().mockRejectedValue(new Error('Invalid'));
      await ctrl.createConversions(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- executeConversion ----
  describe('executeConversion', () => {
    it('should execute conversion', async () => {
      req.params.conversionId = 'conv1';
      SAFEConversionService.executeConversion = jest.fn().mockResolvedValue({ status: 'executed' });

      await ctrl.executeConversion(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { status: 'executed' } });
    });

    it('should handle error', async () => {
      req.params.conversionId = 'conv1';
      SAFEConversionService.executeConversion = jest.fn().mockRejectedValue(new Error('Execute failed'));
      await ctrl.executeConversion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- getCompanySAFEs - ZeroDB 422/429 handling ----
  describe('getCompanySAFEs - ZeroDB error handling', () => {
    it('should return empty list on 422 error', async () => {
      req.params.companyId = 'c1';
      const err = new Error('Schema mismatch');
      err.response = { status: 422 };
      SAFE.find.mockRejectedValue(err);

      await ctrl.getCompanySAFEs(req, res);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data).toEqual([]);
    });

    it('should return empty list on 429 error', async () => {
      req.params.companyId = 'c1';
      const err = new Error('Rate limited');
      err.response = { status: 429 };
      SAFE.find.mockRejectedValue(err);

      await ctrl.getCompanySAFEs(req, res);
      expect(res.json.mock.calls[0][0].success).toBe(true);
      expect(res.json.mock.calls[0][0].data).toEqual([]);
    });

    it('should return 500 for other errors', async () => {
      req.params.companyId = 'c1';
      SAFE.find.mockRejectedValue(new Error('Unknown error'));
      await ctrl.getCompanySAFEs(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return all SAFEs for default companyId', async () => {
      req.params.companyId = 'default';
      SAFE.find.mockResolvedValue([{ safeId: 's1' }]);
      await ctrl.getCompanySAFEs(req, res);
      expect(SAFE.find).toHaveBeenCalledWith({}, expect.any(Object));
    });

    it('should normalize post_money to post-money', async () => {
      req.params.companyId = 'c1';
      SAFE.find.mockResolvedValue([
        { safeId: 's1', safeType: 'post_money', createdAt: '2026-01-01' },
        { safeId: 's2', safeType: 'pre_money', issueDate: '2026-02-01' }
      ]);
      await ctrl.getCompanySAFEs(req, res);
      const data = res.json.mock.calls[0][0].data;
      expect(data[0].safeType).toBe('post-money');
      expect(data[1].safeType).toBe('pre-money');
    });
  });

  // ---- getSAFE - error path ----
  describe('getSAFE - error', () => {
    it('should return 500 on error', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.getSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- sendSAFE - error paths ----
  describe('sendSAFE', () => {
    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.sendSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if cannot transition to sent', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'funded' });
      SAFE.canTransitionTo.mockReturnValue(false);
      await ctrl.sendSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.sendSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- recordInvestorSignature - error paths ----
  describe('recordInvestorSignature', () => {
    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.recordInvestorSignature(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.recordInvestorSignature(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- recordCompanySignature - error paths ----
  describe('recordCompanySignature', () => {
    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.recordCompanySignature(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.recordCompanySignature(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- markFunded - error paths ----
  describe('markFunded', () => {
    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.markFunded(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockRejectedValue(new Error('DB error'));
      await ctrl.markFunded(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- cancelSAFE - error paths ----
  describe('cancelSAFE', () => {
    it('should return 404 if SAFE not found', async () => {
      req.params.safeId = 'missing';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.cancelSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid transition', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'converted' });
      SAFE.canTransitionTo.mockReturnValue(false);
      await ctrl.cancelSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should use default reason', async () => {
      req.params.safeId = 's1';
      req.body = {};
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'draft' });
      SAFE.canTransitionTo.mockReturnValue(true);
      SAFE.transitionTo.mockResolvedValue({ safeId: 's1', status: 'cancelled' });
      await ctrl.cancelSAFE(req, res);
      expect(SAFE.transitionTo).toHaveBeenCalledWith('s1', 'cancelled', 'uid', 'Cancelled');
    });
  });

  // ---- previewConversion - error paths ----
  describe('previewConversion', () => {
    it('should return 400 if no roundTerms', async () => {
      req.params.companyId = 'c1';
      req.body = {};
      await ctrl.previewConversion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for incomplete roundTerms', async () => {
      req.params.companyId = 'c1';
      req.body = { roundTerms: { pricePerShare: 1 } }; // missing fullyDilutedShares
      await ctrl.previewConversion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle error', async () => {
      req.params.companyId = 'c1';
      req.body = { roundTerms: { pricePerShare: 1, fullyDilutedShares: 1000 } };
      SAFEConversionService.previewRoundConversions = jest.fn().mockRejectedValue(new Error('Preview failed'));
      await ctrl.previewConversion(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getCompanySummary - error ----
  describe('getCompanySummary', () => {
    it('should handle error', async () => {
      req.params.companyId = 'c1';
      SAFE.find.mockRejectedValue(new Error('DB error'));
      await ctrl.getCompanySummary(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
