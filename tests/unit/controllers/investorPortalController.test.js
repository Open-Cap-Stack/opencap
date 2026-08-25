/**
 * InvestorPortal Controller Tests
 *
 * Unit tests for investor portal: summary metrics, invite management,
 * and access list retrieval.
 */

const httpMocks = require('node-mocks-http');
const investorPortalController = require('../../../controllers/investorPortalController');

jest.mock('../../../services/zerodbService', () => ({
  createTable: jest.fn(),
  queryRows: jest.fn(),
  insertRow: jest.fn()
}));

const zerodbService = require('../../../services/zerodbService');

describe('InvestorPortalController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = {
      userId: 'user-1',
      email: 'founder@test.com',
      name: 'Test Founder',
      companyId: 'comp-1'
    };
    req.query = {};
    req.body = {};
  });

  // ─── getSummary ────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('should return aggregated portal metrics', async () => {
      // SAFEs query
      zerodbService.queryRows.mockResolvedValueOnce({
        data: [
          { row_data: { safeId: 's1', status: 'funded', investmentAmount: 500000, valuationCap: 5000000 } },
          { row_data: { safeId: 's2', status: 'funded', investmentAmount: 250000, valuationCap: 10000000 } },
          { row_data: { safeId: 's3', status: 'pending', investmentAmount: 100000, valuationCap: 8000000 } }
        ]
      });
      // Stakeholders query
      zerodbService.queryRows.mockResolvedValueOnce({
        data: [
          { row_data: { stakeholderId: 'stk-1', role: 'investor' } },
          { row_data: { stakeholderId: 'stk-2', role: 'investor' } },
          { row_data: { stakeholderId: 'stk-3', role: 'founder' } }
        ]
      });

      await investorPortalController.getSummary(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.totalRaised).toBe(750000); // 500k + 250k (funded only)
      expect(data.data.safeCount).toBe(3);
      expect(data.data.investorCount).toBe(2);
      expect(data.data.avgValuationCap).toBe(7666667); // avg of 5M, 10M, 8M
    });

    it('should return zeros when no SAFEs exist', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });

      await investorPortalController.getSummary(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.totalRaised).toBe(0);
      expect(data.data.safeCount).toBe(0);
      expect(data.data.avgValuationCap).toBe(0);
    });

    it('should handle SAFE query table not found', async () => {
      zerodbService.queryRows.mockRejectedValueOnce(new Error('Table not found'));
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });

      await investorPortalController.getSummary(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.safeCount).toBe(0);
    });

    it('should handle stakeholder query table not found', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });
      zerodbService.queryRows.mockRejectedValueOnce(new Error('Table not found'));

      await investorPortalController.getSummary(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.investorCount).toBe(0);
    });

    it('should filter SAFEs correctly (only records with safeId or safeType)', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({
        data: [
          { row_data: { safeId: 's1', status: 'funded', investmentAmount: 100000 } },
          { row_data: { name: 'Not a SAFE', status: 'active' } } // No safeId
        ]
      });
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });

      await investorPortalController.getSummary(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.safeCount).toBe(1);
    });

    it('should only count funded/converted SAFEs in totalRaised', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({
        data: [
          { row_data: { safeId: 's1', status: 'funded', investmentAmount: 100000 } },
          { row_data: { safeId: 's2', status: 'converted', investmentAmount: 200000 } },
          { row_data: { safeId: 's3', status: 'pending', investmentAmount: 300000 } }
        ]
      });
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });

      await investorPortalController.getSummary(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.totalRaised).toBe(300000); // 100k + 200k (not pending)
    });

    it('should handle rows or other result format', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({
        rows: [
          { row_data: { safeId: 's1', status: 'funded', investmentAmount: 50000, valuationCap: 1000000 } }
        ]
      });
      zerodbService.queryRows.mockResolvedValueOnce({
        rows: [
          { row_data: { stakeholderId: 'stk-1', role: 'investor' } }
        ]
      });

      await investorPortalController.getSummary(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.safeCount).toBe(1);
      expect(data.data.investorCount).toBe(1);
    });

    it('should use stakeholderType when role is missing', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });
      zerodbService.queryRows.mockResolvedValueOnce({
        data: [
          { row_data: { stakeholderId: 'stk-1', stakeholderType: 'Investor' } }
        ]
      });

      await investorPortalController.getSummary(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.investorCount).toBe(1);
    });

    it('should return 500 on unexpected error in outer try', async () => {
      // Force the outer try/catch by making the inner try/catch throw in a way
      // that propagates: throw after the SAFE inner try block
      const origQueryRows = zerodbService.queryRows;
      // First call (SAFEs) succeeds, but returns data that causes an error in reduce
      zerodbService.queryRows
        .mockResolvedValueOnce({ data: [] }) // SAFEs - ok
        .mockImplementationOnce(() => { throw new Error('Unexpected crash'); }); // stakeholders - throws outside inner catch

      // The stakeholder inner try/catch will catch it and investorCount stays 0
      // So this won't actually reach 500. Instead test that a top-level crash works
      // by having the res.json itself fail.
      const origJson = res.json;
      res.json = jest.fn().mockImplementationOnce(() => { throw new Error('Serialization error'); });

      await investorPortalController.getSummary(req, res);

      // After the first json call throws, the catch block calls res.status(500).json(...)
      // which uses the original mock
      expect(res.statusCode).toBe(500);

      // Restore
      res.json = origJson;
    });

    it('should exclude zero-cap SAFEs from average calculation', async () => {
      zerodbService.queryRows.mockResolvedValueOnce({
        data: [
          { row_data: { safeId: 's1', status: 'funded', investmentAmount: 100000, valuationCap: 5000000 } },
          { row_data: { safeId: 's2', status: 'funded', investmentAmount: 50000, valuationCap: 0 } }
        ]
      });
      zerodbService.queryRows.mockResolvedValueOnce({ data: [] });

      await investorPortalController.getSummary(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.avgValuationCap).toBe(5000000); // Only the non-zero cap
    });
  });

  // ─── inviteInvestor ────────────────────────────────────────────────────

  describe('inviteInvestor', () => {
    it('should create an invite successfully', async () => {
      req.body = { email: 'investor@test.com', name: 'Test Investor', accessLevel: 'view' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] }); // No existing invite
      zerodbService.insertRow.mockResolvedValue({});

      await investorPortalController.inviteInvestor(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('investor@test.com');
      expect(data.data.status).toBe('pending');
      expect(data.data.accessLevel).toBe('view');
    });

    it('should return 400 when email is missing', async () => {
      req.body = { name: 'No Email' };

      await investorPortalController.inviteInvestor(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('email is required');
    });

    it('should return 409 when invite already exists', async () => {
      req.body = { email: 'existing@test.com' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({
        data: [{ row_data: { email: 'existing@test.com', status: 'pending', id: 'inv-1' } }]
      });

      await investorPortalController.inviteInvestor(req, res);

      expect(res.statusCode).toBe(409);
    });

    it('should default accessLevel to view', async () => {
      req.body = { email: 'new@test.com' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockResolvedValue({});

      await investorPortalController.inviteInvestor(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.accessLevel).toBe('view');
    });

    it('should use company_id fallback', async () => {
      req.user = { userId: 'user-1', email: 'test@test.com', company_id: 'comp-alt' };
      req.body = { email: 'new@test.com' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockResolvedValue({});

      await investorPortalController.inviteInvestor(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.companyId).toBe('comp-alt');
    });

    it('should use default companyId when neither available', async () => {
      req.user = { userId: 'user-1', email: 'test@test.com' };
      req.body = { email: 'new@test.com' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockResolvedValue({});

      await investorPortalController.inviteInvestor(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.companyId).toBe('default');
    });

    it('should handle existing invite query error gracefully', async () => {
      req.body = { email: 'new@test.com' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockRejectedValue(new Error('Table empty'));
      zerodbService.insertRow.mockResolvedValue({});

      await investorPortalController.inviteInvestor(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 500 on error', async () => {
      req.body = { email: 'new@test.com' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockRejectedValue(new Error('Insert failed'));

      await investorPortalController.inviteInvestor(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getAccessList ─────────────────────────────────────────────────────

  describe('getAccessList', () => {
    it('should return access list for the company', async () => {
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({
        data: [
          { row_data: { email: 'inv1@test.com', status: 'pending', id: 'i1' } },
          { row_data: { email: 'inv2@test.com', status: 'accepted', id: 'i2' } }
        ]
      });

      await investorPortalController.getAccessList(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should return empty list when no invites exist', async () => {
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] });

      await investorPortalController.getAccessList(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it('should handle query error gracefully', async () => {
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockRejectedValue(new Error('Table empty'));

      await investorPortalController.getAccessList(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(0);
    });

    it('should use company_id fallback', async () => {
      req.user = { userId: 'user-1', company_id: 'comp-alt' };
      zerodbService.createTable.mockResolvedValue({});
      zerodbService.queryRows.mockResolvedValue({ data: [] });

      await investorPortalController.getAccessList(req, res);

      expect(zerodbService.queryRows).toHaveBeenCalledWith(
        'investor_portal_invites',
        { companyId: 'comp-alt' },
        expect.any(Object)
      );
    });

    it('should return 500 on unexpected top-level error', async () => {
      zerodbService.createTable.mockResolvedValue({});
      // The inner try/catch around queryRows means DB errors are caught there.
      // Force a top-level error by making res.json throw.
      zerodbService.queryRows.mockResolvedValue({ data: [] });
      const origJson = res.json;
      res.json = jest.fn().mockImplementationOnce(() => { throw new Error('Serialization error'); });

      await investorPortalController.getAccessList(req, res);

      expect(res.statusCode).toBe(500);

      res.json = origJson;
    });
  });
});
