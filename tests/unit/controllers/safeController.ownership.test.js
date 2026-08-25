/**
 * SAFE Controller Ownership Tests
 * Feature: Issue #181 - Cross-company access denied for SAFE endpoints
 */

jest.mock('../../../models/SAFE', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
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
const ctrl = require('../../../controllers/safeController');

describe('SAFE Controller - Company Ownership Checks (Issue #181)', () => {
  let req, res;

  const COMPANY_A = 'company-a-id';
  const COMPANY_B = 'company-b-id';

  const safeOwnedByA = {
    _id: 'safe-row-1',
    safeId: 'safe_001',
    companyId: COMPANY_A,
    investorName: 'Investor One',
    investorEmail: 'inv@example.com',
    investmentAmount: 100000,
    safeType: 'post-money',
    valuationCap: 5000000,
    status: 'draft'
  };

  beforeEach(() => {
    req = {
      body: {},
      params: { safeId: 'safe_001' },
      query: {},
      user: {
        _id: 'user-b',
        companyId: COMPANY_B,
        displayName: 'User B',
        firstName: 'User',
        lastName: 'B',
        email: 'userb@companyb.com'
      },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();

    // Default: resolveSafe returns Company A's SAFE
    SAFE.findOne.mockImplementation((query) => {
      if (query.safeId === 'safe_001' || query._id === 'safe_001') {
        return Promise.resolve(safeOwnedByA);
      }
      return Promise.resolve(null);
    });
  });

  // ---- createSAFE ----
  describe('createSAFE', () => {
    it('should use req.user.companyId instead of req.body.companyId', async () => {
      req.user.companyId = COMPANY_B;
      req.body = {
        companyId: COMPANY_A, // attacker tries to set another company
        investorId: 'inv1',
        investorName: 'Investor',
        investorEmail: 'inv@example.com',
        investmentAmount: 50000,
        safeType: 'post-money',
        valuationCap: 3000000
      };
      SAFE.create.mockResolvedValue({ ...req.body, companyId: COMPANY_B, safeId: 'safe_new' });

      await ctrl.createSAFE(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const createArg = SAFE.create.mock.calls[0][0];
      expect(createArg.companyId).toBe(COMPANY_B);
    });
  });

  // ---- getSAFE ----
  describe('getSAFE', () => {
    it('should return 403 when user from Company B reads Company A SAFE', async () => {
      await ctrl.getSAFE(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });

    it('should allow access when user belongs to same company', async () => {
      req.user.companyId = COMPANY_A;
      await ctrl.getSAFE(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ---- updateSAFE ----
  describe('updateSAFE', () => {
    it('should return 403 when user from Company B updates Company A SAFE', async () => {
      req.body = { valuationCap: 9999999 };
      await ctrl.updateSAFE(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });

    it('should allow update when user belongs to same company', async () => {
      req.user.companyId = COMPANY_A;
      req.body = { valuationCap: 6000000 };
      SAFE.updateOne.mockResolvedValue({});
      // resolveSafe is called again after update
      SAFE.findOne.mockResolvedValue({ ...safeOwnedByA, valuationCap: 6000000 });
      await ctrl.updateSAFE(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
    });
  });

  // ---- updateStatus ----
  describe('updateStatus', () => {
    it('should return 403 when user from Company B changes status of Company A SAFE', async () => {
      req.body = { status: 'sent' };
      await ctrl.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });
  });

  // ---- deleteSAFE ----
  describe('deleteSAFE', () => {
    it('should return 403 when user from Company B deletes Company A SAFE', async () => {
      await ctrl.deleteSAFE(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });

    it('should allow delete when user belongs to same company', async () => {
      req.user.companyId = COMPANY_A;
      SAFE.findOneAndDelete.mockResolvedValue({});
      await ctrl.deleteSAFE(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ---- sendSAFE ----
  describe('sendSAFE', () => {
    it('should return 403 when user from Company B sends Company A SAFE', async () => {
      req.body = { message: 'Please sign' };
      await ctrl.sendSAFE(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });
  });

  // ---- recordInvestorSignature ----
  describe('recordInvestorSignature', () => {
    it('should return 403 when user from Company B records signature on Company A SAFE', async () => {
      req.body = { signatureData: 'sig', signerName: 'Inv', signerEmail: 'inv@ex.com' };
      await ctrl.recordInvestorSignature(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });
  });

  // ---- recordCompanySignature ----
  describe('recordCompanySignature', () => {
    it('should return 403 when user from Company B records company signature on Company A SAFE', async () => {
      req.body = { signatureData: 'sig', signerName: 'Rep', signerTitle: 'CEO' };
      await ctrl.recordCompanySignature(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });
  });

  // ---- markFunded ----
  describe('markFunded', () => {
    it('should return 403 when user from Company B marks Company A SAFE as funded', async () => {
      req.body = { fundedAmount: 100000 };
      await ctrl.markFunded(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });
  });

  // ---- cancelSAFE ----
  describe('cancelSAFE', () => {
    it('should return 403 when user from Company B cancels Company A SAFE', async () => {
      req.body = { reason: 'No longer needed' };
      await ctrl.cancelSAFE(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'Access denied' }) });
    });

    it('should allow cancel when user belongs to same company', async () => {
      req.user.companyId = COMPANY_A;
      req.body = { reason: 'Changed terms' };
      SAFE.canTransitionTo.mockReturnValue(true);
      SAFE.transitionTo.mockResolvedValue({ ...safeOwnedByA, status: 'cancelled' });
      await ctrl.cancelSAFE(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
