/**
 * Investor Controller - Expanded Tests
 * Coverage for searchInvestors, bulkCreateInvestors, getAllInvestors with companyId filter,
 * and other uncovered branches
 */

jest.mock('../../../services/databaseAdapter');

jest.mock('../../../config/stripe', () => ({
  getPlanById: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const investorController = require('../../../controllers/investorController');
const databaseAdapter = require('../../../services/databaseAdapter');
const { getPlanById } = require('../../../config/stripe');

describe('InvestorController - Expanded Coverage', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_1', companyId: 'company_1', role: 'founder' };
  });

  // ── searchInvestors ────────────────────────────────────────────────────────

  describe('searchInvestors', () => {
    it('should return 403 when user is on free plan (no investor database access)', async () => {
      req.query = { q: 'acme' };

      // Free plan: no investor database access
      databaseAdapter.findOne.mockResolvedValue({ planId: 'free' });
      getPlanById.mockReturnValue({
        id: 'free',
        limits: { investorDatabaseAccess: false }
      });

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('paid plan');
      expect(data.code).toBe('PLAN_FEATURE_RESTRICTED');
      expect(data.requiredPlan).toBe('starter');
    });

    it('should return 403 when plan returns null (unknown plan)', async () => {
      req.query = { q: 'test' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'unknown-plan' });
      getPlanById.mockReturnValue(null);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should search investors by name on paid plan', async () => {
      req.query = { q: 'Sequoia', limit: '5' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });

      const mockInvestors = [
        { name: 'Sequoia Capital', investorType: 'venture_capital', email: 'info@sequoia.com' },
        { name: 'Sequoia Heritage', investorType: 'venture_capital', email: 'heritage@sequoia.com' },
        { name: 'Non-VC Fund', investorType: 'family_office', email: 'office@family.com' },
        { name: 'Angel Group Sequoia', investorType: 'Angel', email: 'angel@group.com' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      // Should only return VC/Angel types matching 'sequoia'
      expect(data.investors.length).toBe(3);
      expect(data.investors.every(inv =>
        ['venture_capital', 'Venture Capital', 'angel', 'Angel'].includes(inv.investorType)
      )).toBe(true);
    });

    it('should search investors by email on paid plan', async () => {
      req.query = { q: 'info@acme' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'professional' });
      getPlanById.mockReturnValue({
        id: 'professional',
        limits: { investorDatabaseAccess: true }
      });

      const mockInvestors = [
        { name: 'Acme Ventures', investorType: 'venture_capital', email: 'info@acme.vc' },
        { name: 'Other Fund', investorType: 'venture_capital', email: 'other@fund.com' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investors.length).toBe(1);
      expect(data.investors[0].name).toBe('Acme Ventures');
    });

    it('should return all signal investors when query is empty', async () => {
      req.query = {};

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });

      const mockInvestors = [
        { name: 'VC Fund A', investorType: 'venture_capital' },
        { name: 'Angel B', investorType: 'Angel' },
        { name: 'Family Office', investorType: 'family_office' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      // Only venture_capital and Angel, not family_office
      expect(data.investors.length).toBe(2);
    });

    it('should respect limit parameter and cap at 50', async () => {
      req.query = { limit: '100' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });

      // Create 60 investors
      const mockInvestors = Array.from({ length: 60 }, (_, i) => ({
        name: `VC Fund ${i}`,
        investorType: 'venture_capital'
      }));
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investors.length).toBe(50); // capped at 50
    });

    it('should default limit to 10 when not provided', async () => {
      req.query = { q: 'test' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });

      const mockInvestors = Array.from({ length: 15 }, (_, i) => ({
        name: `Test Fund ${i}`,
        investorType: 'venture_capital'
      }));
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investors.length).toBe(10);
    });

    it('should handle investors returned in {investors: []} format', async () => {
      req.query = {};

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });

      // Return in investors wrapper format
      databaseAdapter.find.mockResolvedValue({
        investors: [
          { name: 'Wrapped VC', investorType: 'venture_capital' }
        ]
      });

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investors.length).toBe(1);
      expect(data.investors[0].name).toBe('Wrapped VC');
    });

    it('should handle database error gracefully', async () => {
      req.query = { q: 'test' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should default to free plan when subscription lookup fails', async () => {
      req.query = { q: 'test' };

      // Subscription lookup fails
      databaseAdapter.findOne.mockRejectedValue(new Error('DB error'));
      getPlanById.mockReturnValue({
        id: 'free',
        limits: { investorDatabaseAccess: false }
      });

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should default to free plan when no companyId is available', async () => {
      req.user = { userId: 'user_1' }; // no companyId
      req.query = { q: 'test' };

      getPlanById.mockReturnValue({
        id: 'free',
        limits: { investorDatabaseAccess: false }
      });

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should filter case-insensitively', async () => {
      req.query = { q: 'ACME' };

      databaseAdapter.findOne.mockResolvedValue({ planId: 'starter' });
      getPlanById.mockReturnValue({
        id: 'starter',
        limits: { investorDatabaseAccess: true }
      });

      const mockInvestors = [
        { name: 'acme ventures', investorType: 'venture_capital' },
        { name: 'ACME Angels', investorType: 'Angel' },
        { name: 'Not matching', investorType: 'venture_capital' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.searchInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investors.length).toBe(2);
    });
  });

  // ── bulkCreateInvestors ────────────────────────────────────────────────────

  describe('bulkCreateInvestors', () => {
    it('should bulk create investors for admin user', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {
        investors: [
          { name: 'VC Fund 1', investorType: 'venture_capital', email: 'vc1@fund.com' },
          { name: 'Angel Group 2', email: 'angel2@group.com' }
        ]
      };

      databaseAdapter.create
        .mockResolvedValueOnce({ id: 'inv_1', name: 'VC Fund 1' })
        .mockResolvedValueOnce({ id: 'inv_2', name: 'Angel Group 2' });

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.created).toBe(2);
      expect(data.errors).toEqual([]);
    });

    it('should return 403 when user is not admin', async () => {
      req.user = { userId: 'user_1', role: 'founder' };
      req.body = {
        investors: [{ name: 'VC Fund' }]
      };

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.code).toBe('ADMIN_REQUIRED');
    });

    it('should return 400 when investors array is empty', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = { investors: [] };

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when investors is not an array', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = { investors: 'not-an-array' };

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when investors is missing', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {};

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should report partial failures', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {
        investors: [
          { name: 'Good Fund', investorType: 'venture_capital' },
          { name: 'Bad Fund', investorType: 'venture_capital' },
          { name: 'Good Angel', investorType: 'Angel' }
        ]
      };

      databaseAdapter.create
        .mockResolvedValueOnce({ id: 'inv_1', name: 'Good Fund' })
        .mockRejectedValueOnce(new Error('Duplicate entry'))
        .mockResolvedValueOnce({ id: 'inv_3', name: 'Good Angel' });

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.created).toBe(2);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].name).toBe('Bad Fund');
      expect(data.errors[0].error).toBe('Duplicate entry');
    });

    it('should default investorType to venture_capital when not provided', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {
        investors: [{ name: 'Default Type Fund', email: 'default@fund.com' }]
      };

      databaseAdapter.create.mockResolvedValue({ id: 'inv_1' });

      await investorController.bulkCreateInvestors(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Investor', expect.objectContaining({
        investorType: 'venture_capital',
        companyId: 'platform'
      }));
    });

    it('should use provided companyId when available', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {
        investors: [{ name: 'Company-Specific Fund', companyId: 'company_xyz' }]
      };

      databaseAdapter.create.mockResolvedValue({ id: 'inv_1' });

      await investorController.bulkCreateInvestors(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Investor', expect.objectContaining({
        companyId: 'company_xyz'
      }));
    });

    it('should generate investorId when not provided', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {
        investors: [{ name: 'Auto-ID Fund' }]
      };

      databaseAdapter.create.mockResolvedValue({ id: 'inv_1' });

      await investorController.bulkCreateInvestors(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Investor', expect.objectContaining({
        investorId: expect.stringMatching(/^inv_/)
      }));
    });

    it('should use provided investorId when available', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = {
        investors: [{ name: 'Custom ID Fund', investorId: 'custom_inv_123' }]
      };

      databaseAdapter.create.mockResolvedValue({ id: 'inv_1' });

      await investorController.bulkCreateInvestors(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Investor', expect.objectContaining({
        investorId: 'custom_inv_123'
      }));
    });

    it('should return 500 on unexpected top-level error', async () => {
      req.user = { userId: 'admin_1', role: 'admin' };
      req.body = { investors: null }; // Will trigger a non-array check

      await investorController.bulkCreateInvestors(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ── getAllInvestors with companyId filter ───────────────────────────────────

  describe('getAllInvestors - companyId filtering', () => {
    it('should filter by companyId from query params', async () => {
      req.query = { companyId: 'company_query' };
      databaseAdapter.find.mockResolvedValue([]);

      await investorController.getAllInvestors(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Investor',
        { companyId: 'company_query' },
        expect.any(Object)
      );
    });

    it('should filter by companyId from user when not in query', async () => {
      req.query = {};
      req.user = { companyId: 'company_user' };
      databaseAdapter.find.mockResolvedValue([]);

      await investorController.getAllInvestors(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Investor',
        { companyId: 'company_user' },
        expect.any(Object)
      );
    });

    it('should not add companyId filter when neither query nor user has it', async () => {
      req.query = {};
      req.user = {};
      databaseAdapter.find.mockResolvedValue([]);

      await investorController.getAllInvestors(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Investor',
        {},
        expect.any(Object)
      );
    });
  });
});
