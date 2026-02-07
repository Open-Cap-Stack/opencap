/**
 * SAFE Controller Tests
 * Feature: Issue #39 - Controller Test Coverage
 */

jest.mock('../../../models/SAFE', () => {
  const mc = jest.fn().mockImplementation((d) => ({ ...d, save: jest.fn().mockResolvedValue(true) }));
  mc.find = jest.fn(); mc.findOne = jest.fn(); mc.countDocuments = jest.fn();
  mc.getTotalFundedAmount = jest.fn(); mc.getPendingConversion = jest.fn();
  return mc;
});
jest.mock('../../../models/SignatureRequest', () => {
  const mc = jest.fn().mockImplementation((d) => ({ ...d, save: jest.fn().mockResolvedValue(true), send: jest.fn().mockResolvedValue(true) }));
  return mc;
});
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
    it('should create successfully', async () => {
      req.body = { companyId: 'c1', investorId: 'i1', investorName: 'J', investorEmail: 'j@i.com', investmentAmount: 100000, safeType: 'post-money', valuationCap: 5000000 };
      SAFE.mockImplementation(() => ({ ...req.body, save: jest.fn().mockResolvedValue(true) }));
      await ctrl.createSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
    it('should return 400 for invalid data', async () => {
      req.body = {};
      SAFE.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(new Error('Validation failed')) }));
      await ctrl.createSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompanySAFEs', () => {
    it('should return paginated SAFEs', async () => {
      req.params.companyId = 'c1'; req.query = { page: '1', limit: '20' };
      const safes = [{ safeId: 's1' }, { safeId: 's2' }];
      const q = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(safes) };
      SAFE.find.mockReturnValue(q); SAFE.countDocuments.mockResolvedValue(2);
      await ctrl.getCompanySAFEs(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: safes, pagination: { page: 1, limit: 20, total: 2, pages: 1 } });
    });
    it('should filter by status', async () => {
      req.params.companyId = 'c1'; req.query = { status: 'funded' };
      const q = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
      SAFE.find.mockReturnValue(q); SAFE.countDocuments.mockResolvedValue(0);
      await ctrl.getCompanySAFEs(req, res);
      expect(SAFE.find).toHaveBeenCalledWith({ companyId: 'c1', status: 'funded' });
    });
  });

  describe('getSAFE', () => {
    it('should return a SAFE', async () => {
      req.params.safeId = 'safe_123';
      const safe = { safeId: 'safe_123' };
      const q = { populate: jest.fn().mockReturnThis() };
      q.populate.mockReturnValueOnce(q).mockReturnValueOnce(q).mockReturnValueOnce(q).mockReturnValueOnce(q).mockResolvedValueOnce(safe);
      SAFE.findOne.mockReturnValue(q);
      await ctrl.getSAFE(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: safe });
    });
    it('should return 404', async () => {
      req.params.safeId = 'x';
      const q = { populate: jest.fn().mockReturnThis() };
      q.populate.mockReturnValueOnce(q).mockReturnValueOnce(q).mockReturnValueOnce(q).mockReturnValueOnce(q).mockResolvedValueOnce(null);
      SAFE.findOne.mockReturnValue(q);
      await ctrl.getSAFE(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateSAFE', () => {
    it('should update draft SAFE', async () => {
      req.params.safeId = 's1'; req.body = { investmentAmount: 75000, notes: 'Updated' };
      const safe = { safeId: 's1', status: 'draft', save: jest.fn().mockResolvedValue(true) };
      SAFE.findOne.mockResolvedValue(safe);
      await ctrl.updateSAFE(req, res);
      expect(safe.investmentAmount).toBe(75000);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: safe });
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
      const safe = { _id: 'oid', safeId: 's1', investorName: 'Inv', investorEmail: 'i@t.com', companyId: { _id: 'cid', name: 'Co' }, canTransitionTo: jest.fn().mockReturnValue(true), transitionTo: jest.fn().mockResolvedValue(true) };
      const q = { populate: jest.fn().mockReturnThis() };
      q.populate.mockReturnValueOnce(q).mockResolvedValueOnce(safe);
      SAFE.findOne.mockReturnValue(q);
      const sr = { save: jest.fn().mockResolvedValue(true), send: jest.fn().mockResolvedValue(true) };
      SignatureRequest.mockImplementation(() => sr);
      await ctrl.sendSAFE(req, res);
      expect(sr.save).toHaveBeenCalled();
      expect(safe.transitionTo).toHaveBeenCalledWith('sent', expect.anything(), 'Sent for signatures');
    });
  });

  describe('markFunded', () => {
    it('should mark as funded', async () => {
      req.params.safeId = 's1'; req.body = { notes: 'Wire received' };
      const safe = { safeId: 's1', investmentAmount: 100000, canTransitionTo: jest.fn().mockReturnValue(true), transitionTo: jest.fn().mockResolvedValue(true) };
      SAFE.findOne.mockResolvedValue(safe);
      await ctrl.markFunded(req, res);
      expect(safe.transitionTo).toHaveBeenCalledWith('funded', req.user._id, 'Wire received', expect.any(Object));
    });
    it('should reject wrong status', async () => {
      req.params.safeId = 's1';
      SAFE.findOne.mockResolvedValue({ status: 'draft', canTransitionTo: jest.fn().mockReturnValue(false) });
      await ctrl.markFunded(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelSAFE', () => {
    it('should cancel', async () => {
      req.params.safeId = 's1'; req.body = { reason: 'Deal fell through' };
      const safe = { canTransitionTo: jest.fn().mockReturnValue(true), transitionTo: jest.fn().mockResolvedValue(true) };
      SAFE.findOne.mockResolvedValue(safe);
      await ctrl.cancelSAFE(req, res);
      expect(safe.transitionTo).toHaveBeenCalledWith('cancelled', req.user._id, 'Deal fell through');
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
    it('should return summary', async () => {
      req.params.companyId = 'c1';
      SAFE.find.mockResolvedValue([{ status: 'draft', investmentAmount: 50000 }, { status: 'funded', investmentAmount: 100000 }, { status: 'funded', investmentAmount: 150000 }]);
      SAFE.getTotalFundedAmount.mockResolvedValue(250000);
      SAFE.getPendingConversion.mockResolvedValue([{ investmentAmount: 100000 }, { investmentAmount: 150000 }]);
      await ctrl.getCompanySummary(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({ total: 3, totalFunded: 250000, pendingConversionCount: 2 }) });
    });
  });
});
