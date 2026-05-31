/**
 * SAFE Controller Tests
 * Feature: Issue #39 - Controller Test Coverage
 */

jest.mock('../../../models/SAFE', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
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
  create: jest.fn()
}));
jest.mock('../../../models/SAFEConversion');
jest.mock('../../../services/safeConversionService');

const SAFE = require('../../../models/SAFE');
const SignatureRequest = require('../../../models/SignatureRequest');
const SAFEConversionService = require('../../../services/safeConversionService');
const ctrl = require('../../../controllers/safeController');

describe('SAFE Controller', () => {
  let req, res;
  beforeEach(() => {
    req = { body: {}, params: {}, query: {}, user: { _id: 'uid', displayName: 'Test User', firstName: 'Test', lastName: 'User', email: 'test@example.com' }, ip: '127.0.0.1', get: jest.fn().mockReturnValue('Mozilla/5.0') };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.clearAllMocks();
  });

  describe('createSAFE', () => {
    it('should create successfully with issueDate', async () => {
      req.body = { companyId: 'c1', investorId: 'i1', investorName: 'J', investorEmail: 'j@i.com', investmentAmount: 100000, safeType: 'post-money', valuationCap: 5000000, issueDate: '2026-03-15' };
      const createdSafe = { ...req.body, safeId: 'safe_123', status: 'draft' };
      SAFE.create.mockResolvedValue(createdSafe);
      await ctrl.createSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(SAFE.create).toHaveBeenCalledWith(expect.objectContaining({ issueDate: '2026-03-15' }));
    });
    it('should default issueDate to current date if not provided', async () => {
      req.body = { companyId: 'c1', investorId: 'i1', investorName: 'J', investorEmail: 'j@i.com', investmentAmount: 100000, safeType: 'post-money', valuationCap: 5000000 };
      const createdSafe = { ...req.body, safeId: 'safe_123', status: 'draft' };
      SAFE.create.mockResolvedValue(createdSafe);
      await ctrl.createSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createArg = SAFE.create.mock.calls[0][0];
      expect(createArg.issueDate).toBeDefined();
    });
    it('should return 400 for invalid data', async () => {
      req.body = {};
      SAFE.create.mockRejectedValue(new Error('Validation failed'));
      await ctrl.createSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompanySAFEs', () => {
    it('should return paginated SAFEs with issueDate normalized', async () => {
      req.params.companyId = 'c1'; req.query = { page: '1', limit: '20' };
      const safes = [{ safeId: 's1', createdAt: '2026-01-01' }, { safeId: 's2', issueDate: '2026-02-01' }];
      SAFE.find.mockResolvedValue(safes);
      SAFE.countDocuments.mockResolvedValue(2);
      await ctrl.getCompanySAFEs(req, res);
      const call = res.json.mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.data).toHaveLength(2);
      // First SAFE should have issueDate filled from createdAt
      expect(call.data[0].issueDate).toBe('2026-01-01');
      // Second SAFE already had issueDate
      expect(call.data[1].issueDate).toBe('2026-02-01');
      expect(call.pagination).toEqual({ page: 1, limit: 20, total: 2, pages: 1 });
    });
    it('should filter by status', async () => {
      req.params.companyId = 'c1'; req.query = { status: 'funded' };
      SAFE.find.mockResolvedValue([]);
      SAFE.countDocuments.mockResolvedValue(0);
      await ctrl.getCompanySAFEs(req, res);
      expect(SAFE.find).toHaveBeenCalledWith({ companyId: 'c1', status: 'funded' }, expect.objectContaining({ sort: { createdAt: -1 } }));
    });
  });

  describe('getSAFE', () => {
    it('should return a SAFE', async () => {
      req.params.safeId = 'safe_123';
      const safe = { safeId: 'safe_123' };
      SAFE.findOne.mockResolvedValue(safe);
      await ctrl.getSAFE(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: safe });
    });
    it('should return 404', async () => {
      req.params.safeId = 'x';
      SAFE.findOne.mockResolvedValue(null);
      await ctrl.getSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateSAFE', () => {
    it('should update draft SAFE', async () => {
      req.params.safeId = 's1'; req.body = { investmentAmount: 75000, notes: 'Updated' };
      const safe = { safeId: 's1', status: 'draft', investmentAmount: 50000 };
      const updatedSafe = { safeId: 's1', status: 'draft', investmentAmount: 75000, notes: 'Updated', updatedBy: 'uid' };
      SAFE.findOne.mockResolvedValueOnce(safe).mockResolvedValueOnce(updatedSafe);
      SAFE.updateOne.mockResolvedValue({ modifiedCount: 1 });
      await ctrl.updateSAFE(req, res);
      expect(SAFE.updateOne).toHaveBeenCalledWith({ safeId: 's1' }, { $set: expect.objectContaining({ investmentAmount: 75000, notes: 'Updated', updatedBy: 'uid' }) });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedSafe });
    });
    it('should prevent updates to non-draft', async () => {
      req.params.safeId = 's1'; req.body = { investmentAmount: 75000 };
      SAFE.findOne.mockResolvedValue({ safeId: 's1', status: 'sent' });
      await ctrl.updateSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('sendSAFE', () => {
    it('should send for signatures', async () => {
      req.params.safeId = 's1'; req.body = { message: 'Sign' };
      const safe = { _id: 'oid', safeId: 's1', status: 'draft', investorName: 'Inv', investorEmail: 'i@t.com', companyId: 'cid' };
      SAFE.findOne.mockResolvedValue(safe);
      SAFE.canTransitionTo.mockReturnValue(true);
      const updatedSafe = { ...safe, status: 'sent' };
      SAFE.transitionTo.mockResolvedValue(updatedSafe);
      const sr = { _id: 'sr1', requestId: 'sr1' };
      SignatureRequest.create.mockResolvedValue(sr);
      SignatureRequest.send = jest.fn().mockResolvedValue(true);
      await ctrl.sendSAFE(req, res);
      expect(SignatureRequest.create).toHaveBeenCalled();
      expect(SignatureRequest.send).toHaveBeenCalledWith('sr1', expect.anything());
      expect(SAFE.transitionTo).toHaveBeenCalledWith('s1', 'sent', expect.anything(), 'Sent for signatures');
    });
  });

  describe('recordInvestorSignature', () => {
    it('should record investor signature', async () => {
      req.params.safeId = 's1';
      req.body = { signatureData: 'sig', signerName: 'Inv', signerEmail: 'i@t.com', signerTitle: 'CEO' };
      const safe = { safeId: 's1', status: 'sent' };
      const updatedSafe = { ...safe, investorSignature: { signerName: 'Inv' } };
      SAFE.findOne.mockResolvedValue(safe);
      SAFE.addInvestorSignature.mockResolvedValue(updatedSafe);
      await ctrl.recordInvestorSignature(req, res);
      expect(SAFE.addInvestorSignature).toHaveBeenCalledWith('s1', expect.objectContaining({ signerName: 'Inv' }), 'uid');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedSafe });
    });
  });

  describe('recordCompanySignature', () => {
    it('should record company signature', async () => {
      req.params.safeId = 's1';
      req.body = { signatureData: 'sig', signerName: 'Rep', signerEmail: 'r@t.com', signerTitle: 'CFO' };
      const safe = { safeId: 's1', status: 'sent' };
      const updatedSafe = { ...safe, companySignature: { signerName: 'Rep' } };
      SAFE.findOne.mockResolvedValue(safe);
      SAFE.addCompanySignature.mockResolvedValue(updatedSafe);
      await ctrl.recordCompanySignature(req, res);
      expect(SAFE.addCompanySignature).toHaveBeenCalledWith('s1', expect.objectContaining({ signerName: 'Rep' }), 'uid');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedSafe });
    });
  });

  describe('markFunded', () => {
    it('should mark as funded', async () => {
      req.params.safeId = 's1'; req.body = { notes: 'Wire received' };
      const safe = { safeId: 's1', status: 'fully_signed', investmentAmount: 100000 };
      SAFE.findOne.mockResolvedValue(safe);
      SAFE.canTransitionTo.mockReturnValue(true);
      const updatedSafe = { ...safe, status: 'funded' };
      SAFE.transitionTo.mockResolvedValue(updatedSafe);
      await ctrl.markFunded(req, res);
      expect(SAFE.transitionTo).toHaveBeenCalledWith('s1', 'funded', req.user._id, 'Wire received', expect.any(Object));
    });
    it('should reject wrong status', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockResolvedValue({ status: 'draft' });
      SAFE.canTransitionTo.mockReturnValue(false);
      await ctrl.markFunded(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelSAFE', () => {
    it('should cancel', async () => {
      req.params.safeId = 's1'; req.body = { reason: 'Deal fell through' };
      const safe = { safeId: 's1', status: 'draft' };
      SAFE.findOne.mockResolvedValue(safe);
      SAFE.canTransitionTo.mockReturnValue(true);
      const updatedSafe = { ...safe, status: 'cancelled' };
      SAFE.transitionTo.mockResolvedValue(updatedSafe);
      await ctrl.cancelSAFE(req, res);
      expect(SAFE.transitionTo).toHaveBeenCalledWith('s1', 'cancelled', req.user._id, 'Deal fell through');
    });
  });

  describe('previewConversion', () => {
    it('should return preview', async () => {
      req.params.companyId = 'c1'; req.body = { roundTerms: { pricePerShare: 1.00, fullyDilutedShares: 10000000 } };
      SAFEConversionService.previewRoundConversions = jest.fn().mockResolvedValue({ eligibleSAFEsCount: 3 });
      await ctrl.previewConversion(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { eligibleSAFEsCount: 3 } });
    });
    it('should validate round terms', async () => {
      req.params.companyId = 'c1'; req.body = { roundTerms: {} };
      await ctrl.previewConversion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompanySummary', () => {
    it('should return summary counting only records with safeId', async () => {
      req.params.companyId = 'c1';
      // Mix of SAFE records (have safeId) and non-SAFE securities (no safeId)
      SAFE.find.mockResolvedValue([
        { safeId: 'safe_1', status: 'draft', investmentAmount: 50000 },
        { safeId: 'safe_2', status: 'funded', investmentAmount: 100000 },
        { safeId: 'safe_3', status: 'funded', investmentAmount: 150000 },
        { status: 'active', investmentAmount: 200000 }  // stock issuance, no safeId
      ]);
      SAFE.getTotalFundedAmount.mockResolvedValue(250000);
      SAFE.getPendingConversion.mockResolvedValue([{ investmentAmount: 100000 }, { investmentAmount: 150000 }]);
      await ctrl.getCompanySummary(req, res);
      const data = res.json.mock.calls[0][0].data;
      // Should only count the 3 records with safeId, not the stock issuance
      expect(data.total).toBe(3);
      expect(data.totalInvestment).toBe(300000);
      expect(data.totalFunded).toBe(250000);
      expect(data.pendingConversionCount).toBe(2);
    });
  });
});
