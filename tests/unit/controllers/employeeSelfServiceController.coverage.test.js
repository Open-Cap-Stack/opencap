/**
 * EmployeeSelfServiceController Coverage Tests
 * Covers uncovered lines: stakeholder-based grant lookup, document lookup via
 * stakeholder, valuation with stakeholder fallback, getMyProfile, dedup logic
 */

jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../../../models/Valuation409A', () => ({
  findOne: jest.fn()
}));

jest.mock('../../../services/equityGrantService', () => ({
  calculateVestedShares: jest.fn()
}));

jest.mock('../../../models/User', () => ({
  findOne: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const Valuation409A = require('../../../models/Valuation409A');
const equityGrantService = require('../../../services/equityGrantService');
const controller = require('../../../controllers/employeeSelfServiceController');

describe('EmployeeSelfServiceController - Coverage', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { userId: 'u1', companyId: 'comp-1', email: 'test@test.com' }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.clearAllMocks();
  });

  // ---- getMyEquity ----
  describe('getMyEquity', () => {
    it('should return grants found by userId', async () => {
      databaseAdapter.find.mockResolvedValue([{ grantId: 'g1', totalShares: 1000 }]);
      equityGrantService.calculateVestedShares.mockReturnValue({ vestedShares: 500, unvestedShares: 500 });

      await controller.getMyEquity(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const grants = res.json.mock.calls[0][0];
      expect(grants.length).toBe(1);
      expect(grants[0].vestedShares).toBe(500);
    });

    it('should fall back to stakeholder lookup when no grants by userId', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([]) // EquityGrant by userId - empty
        .mockResolvedValueOnce([{ _id: 'stk-1', stakeholderId: 'stk-1', email: 'test@test.com' }]) // Stakeholder
        .mockResolvedValueOnce([{ grantId: 'g1', employeeId: 'stk-1', totalShares: 500 }]); // Grants by employeeId
      equityGrantService.calculateVestedShares.mockReturnValue({ vestedShares: 250 });

      await controller.getMyEquity(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should deduplicate grants', async () => {
      databaseAdapter.find.mockResolvedValue([
        { grantId: 'g1', totalShares: 1000 },
        { grantId: 'g1', totalShares: 1000 } // duplicate
      ]);
      equityGrantService.calculateVestedShares.mockReturnValue({ vestedShares: 500 });

      await controller.getMyEquity(req, res);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should handle vesting calculation error gracefully', async () => {
      databaseAdapter.find.mockResolvedValue([{ grantId: 'g1', totalShares: 1000 }]);
      equityGrantService.calculateVestedShares.mockImplementation(() => { throw new Error('Calc error'); });

      await controller.getMyEquity(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      // Grant returned without vesting info
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should handle error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('DB error'));
      await controller.getMyEquity(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should use row_id as dedup key', async () => {
      databaseAdapter.find.mockResolvedValue([
        { row_id: 'r1', totalShares: 1000 },
        { row_id: 'r1', totalShares: 1000 }
      ]);
      equityGrantService.calculateVestedShares.mockReturnValue({ vestedShares: 500 });

      await controller.getMyEquity(req, res);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });
  });

  // ---- getMyDocuments ----
  describe('getMyDocuments', () => {
    it('should return documents by userId', async () => {
      databaseAdapter.find.mockResolvedValue([{ _id: 'd1', title: 'Offer' }]);

      await controller.getMyDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should fall back to stakeholder lookup', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([]) // Document by userId
        .mockResolvedValueOnce([{ stakeholderId: 'stk-1' }]) // Stakeholder
        .mockResolvedValueOnce([{ _id: 'd1', stakeholderId: 'stk-1' }]); // Document by stakeholderId

      await controller.getMyDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should deduplicate documents', async () => {
      databaseAdapter.find.mockResolvedValue([
        { _id: 'd1', title: 'Offer' },
        { _id: 'd1', title: 'Offer' }
      ]);

      await controller.getMyDocuments(req, res);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should handle error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('DB'));
      await controller.getMyDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should use row_id for dedup when no _id', async () => {
      databaseAdapter.find.mockResolvedValue([
        { row_id: 'r1', title: 'Offer' },
        { row_id: 'r1', title: 'Offer' }
      ]);

      await controller.getMyDocuments(req, res);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it('should use id for dedup when no _id or row_id', async () => {
      databaseAdapter.find.mockResolvedValue([
        { id: 'i1', title: 'Offer' },
        { id: 'i1', title: 'Offer' }
      ]);

      await controller.getMyDocuments(req, res);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });
  });

  // ---- getMyValuation ----
  describe('getMyValuation', () => {
    it('should return valuation with employee share value', async () => {
      Valuation409A.findOne.mockResolvedValue({
        pricePerShare: 2.50,
        effectiveDate: '2026-01-01',
        totalShares: 10000
      });
      databaseAdapter.find.mockResolvedValue([
        { grantId: 'g1', totalShares: 1000 }
      ]);
      equityGrantService.calculateVestedShares.mockReturnValue({ vestedShares: 500 });

      await controller.getMyValuation(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.pricePerShare).toBe(2.50);
      expect(body.employeeShareValue).toBe(1250);
    });

    it('should calculate pricePerShare from fairMarketValue when not directly available', async () => {
      Valuation409A.findOne.mockResolvedValue({
        fairMarketValue: 25000,
        totalShares: 10000,
        effectiveDate: '2026-01-01'
      });
      databaseAdapter.find.mockResolvedValue([]);

      await controller.getMyValuation(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].pricePerShare).toBe(2.5);
    });

    it('should return 0 pricePerShare if no data available', async () => {
      Valuation409A.findOne.mockResolvedValue({ effectiveDate: '2026-01-01' });
      databaseAdapter.find.mockResolvedValue([]);

      await controller.getMyValuation(req, res);
      expect(res.json.mock.calls[0][0].pricePerShare).toBe(0);
    });

    it('should return 404 when no valuation found', async () => {
      Valuation409A.findOne.mockResolvedValue(null);
      await controller.getMyValuation(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should fall back to stakeholder grants', async () => {
      Valuation409A.findOne.mockResolvedValue({
        pricePerShare: 1.00,
        effectiveDate: '2026-01-01'
      });
      databaseAdapter.find
        .mockResolvedValueOnce([]) // EquityGrant by userId
        .mockResolvedValueOnce([{ stakeholderId: 'stk-1' }]) // Stakeholder
        .mockResolvedValueOnce([{ grantId: 'g1', employeeId: 'stk-1' }]); // Grants by employeeId
      equityGrantService.calculateVestedShares.mockReturnValue({ vestedShares: 100 });

      await controller.getMyValuation(req, res);
      expect(res.json.mock.calls[0][0].employeeShareValue).toBe(100);
    });

    it('should handle vesting calculation error in valuation', async () => {
      Valuation409A.findOne.mockResolvedValue({
        pricePerShare: 1.00,
        effectiveDate: '2026-01-01'
      });
      databaseAdapter.find.mockResolvedValue([{ grantId: 'g1' }]);
      equityGrantService.calculateVestedShares.mockImplementation(() => { throw new Error('Calc error'); });

      await controller.getMyValuation(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].employeeShareValue).toBe(0);
    });

    it('should handle error', async () => {
      Valuation409A.findOne.mockRejectedValue(new Error('DB'));
      await controller.getMyValuation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getMyProfile ----
  describe('getMyProfile', () => {
    it('should return sanitized profile', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        userId: 'u1',
        email: 'test@test.com',
        password: 'secret',
        passwordResetToken: 'tok',
        passwordResetExpires: 'date',
        inviteToken: 'inv',
        inviteTokenExpires: 'date'
      });

      await controller.getMyProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const profile = res.json.mock.calls[0][0];
      expect(profile.password).toBeUndefined();
      expect(profile.passwordResetToken).toBeUndefined();
      expect(profile.inviteToken).toBeUndefined();
    });

    it('should return 404 if user not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      await controller.getMyProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      databaseAdapter.findOne.mockRejectedValue(new Error('DB'));
      await controller.getMyProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
