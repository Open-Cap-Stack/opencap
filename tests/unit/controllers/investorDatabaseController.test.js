/**
 * InvestorDatabase Controller Tests
 *
 * Unit tests for the platform-wide VC/angel investor directory.
 * Tests listing, counting, filtering, searching, and single investor retrieval.
 */

const httpMocks = require('node-mocks-http');
const investorDatabaseController = require('../../../controllers/investorDatabaseController');

jest.mock('../../../services/zerodbService', () => ({
  queryTable: jest.fn()
}));
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

const zerodbService = require('../../../services/zerodbService');

describe('InvestorDatabaseController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user-1', role: 'admin' };
    req.query = {};
  });

  // ─── listInvestors ─────────────────────────────────────────────────────

  describe('listInvestors', () => {
    it('should list investors with default pagination', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: '/fund/sequoia-capital', role: 'investor', notes: 'Sequoia Capital — VC | Seed, Series A | AI, Enterprise' } },
          { row_id: 'r2', row_data: { name: '/angel/john-doe', role: 'investor', notes: 'Angel Investor' } }
        ],
        total: 2
      });

      await investorDatabaseController.listInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(2);
      expect(data.limit).toBe(50);
      expect(data.skip).toBe(0);
    });

    it('should enrich investor records with parsed fields', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: '/fund/acme-ventures', role: 'investor', notes: 'Acme Ventures — VC | Pre-Seed, Seed | AI, Fintech' } }
        ],
        total: 1
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      const investor = data.data[0];
      expect(investor.firm).toBe('Acme Ventures');
      expect(investor.investorType).toBe('VC');
      expect(investor.stages).toContain('Pre-Seed');
      expect(investor.stages).toContain('Seed');
      expect(investor.sectors).toContain('AI');
      expect(investor.sectors).toContain('Fintech');
      expect(investor.displayName).toBe('Acme Ventures');
    });

    it('should parse angel investor display names', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: '/angel/jane-smith', role: 'investor', notes: 'Angel' } }
        ],
        total: 1
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data[0].displayName).toBe('Jane Smith');
      expect(data.data[0].investorType).toBe('Angel');
    });

    it('should filter by search term across multiple fields', async () => {
      req.query = { search: 'sequoia' };
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Sequoia Capital', role: 'investor', email: 'info@sequoia.com', notes: 'VC' } },
          { row_id: 'r2', row_data: { name: 'Other Fund', role: 'investor', email: 'info@other.com', notes: 'Another VC' } }
        ],
        total: 2
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Sequoia Capital');
    });

    it('should filter by investor type', async () => {
      req.query = { type: 'vc' };
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Fund A', role: 'investor', notes: 'VC Fund' } },
          { row_id: 'r2', row_data: { name: 'Angel B', role: 'investor', notes: 'Angel Investor' } }
        ],
        total: 2
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
      expect(data.data[0].investorType).toBe('VC');
    });

    it('should filter by sector', async () => {
      req.query = { sector: 'ai' };
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'AI Fund', role: 'investor', notes: 'AI, SaaS — VC' } },
          { row_id: 'r2', row_data: { name: 'Health Fund', role: 'investor', notes: 'Health, Biotech — VC' } }
        ],
        total: 2
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
    });

    it('should filter by stage', async () => {
      req.query = { stage: 'series a' };
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Fund A', role: 'investor', notes: 'VC — Series A, Series B' } },
          { row_id: 'r2', row_data: { name: 'Fund B', role: 'investor', notes: 'VC — Seed only' } }
        ],
        total: 2
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
    });

    it('should respect limit and skip pagination', async () => {
      req.query = { limit: '10', skip: '5' };
      zerodbService.queryTable.mockResolvedValue({ data: [], total: 0 });

      await investorDatabaseController.listInvestors(req, res);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('stakeholders', expect.objectContaining({
        limit: 10,
        skip: 5
      }));
    });

    it('should cap limit at 200', async () => {
      req.query = { limit: '500' };
      zerodbService.queryTable.mockResolvedValue({ data: [], total: 0 });

      await investorDatabaseController.listInvestors(req, res);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('stakeholders', expect.objectContaining({
        limit: 200
      }));
    });

    it('should enforce minimum limit of 1', async () => {
      // parseInt('0') || 50 evaluates to 50 because 0 is falsy, so
      // Math.min(Math.max(1, 50), 200) = 50. Use -1 to verify clamping.
      req.query = { limit: '-1' };
      zerodbService.queryTable.mockResolvedValue({ data: [], total: 0 });

      await investorDatabaseController.listInvestors(req, res);

      // -1 || 50 = 50 (because -1 is truthy), so Math.max(1, -1) = 1
      expect(zerodbService.queryTable).toHaveBeenCalledWith('stakeholders', expect.objectContaining({
        limit: 1
      }));
    });

    it('should filter out non-investor roles', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Investor A', role: 'investor' } },
          { row_id: 'r2', row_data: { name: 'Founder B', role: 'founder' } }
        ],
        total: 2
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
    });

    it('should handle array result format', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { name: 'Investor A', role: 'investor', notes: '' }
      ]);

      await investorDatabaseController.listInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
    });

    it('should return 500 on error', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      await investorDatabaseController.listInvestors(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Error fetching investor database');
    });

    it('should detect various investor types from notes', async () => {
      // Note: the enrichment checks patterns in order: angel, vc/venture, pe,
      // family office, corporate/cvc, accelerator. "Corporate Venture Capital"
      // matches "venture" first so it resolves to VC, not Corporate.
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'A', role: 'investor', notes: 'Private Equity firm' } },
          { row_id: 'r2', row_data: { name: 'B', role: 'investor', notes: 'Family Office' } },
          { row_id: 'r3', row_data: { name: 'C', role: 'investor', notes: 'Corporate strategic arm of BigCo' } },
          { row_id: 'r4', row_data: { name: 'D', role: 'investor', notes: 'Accelerator program' } }
        ],
        total: 4
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data[0].investorType).toBe('PE');
      expect(data.data[1].investorType).toBe('Family Office');
      expect(data.data[2].investorType).toBe('Corporate');
      expect(data.data[3].investorType).toBe('Accelerator');
    });

    it('should parse firm name using hyphen separator', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Test', role: 'investor', notes: 'Firm Name - VC' } }
        ],
        total: 1
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data[0].firm).toBe('Firm Name');
    });

    it('should use displayName as is when name has no prefix', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Plain Name', role: 'investor', notes: '' } }
        ],
        total: 1
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data[0].displayName).toBe('Plain Name');
    });

    it('should search by email', async () => {
      req.query = { search: 'john@vc.com' };
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_id: 'r1', row_data: { name: 'Test', role: 'investor', email: 'john@vc.com', notes: '' } }
        ],
        total: 1
      });

      await investorDatabaseController.listInvestors(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
    });
  });

  // ─── countInvestors ────────────────────────────────────────────────────

  describe('countInvestors', () => {
    it('should return count from total field', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 42 });

      await investorDatabaseController.countInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(42);
    });

    it('should handle array result format', async () => {
      zerodbService.queryTable.mockResolvedValue([{ name: 'A' }, { name: 'B' }]);

      await investorDatabaseController.countInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(2);
    });

    it('should handle result with data array', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [{ name: 'A' }] });

      await investorDatabaseController.countInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(1);
    });

    it('should return 500 on error', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      await investorDatabaseController.countInvestors(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Error counting investors');
    });
  });

  // ─── getInvestorById ───────────────────────────────────────────────────

  describe('getInvestorById', () => {
    it('should return investor by investorId', async () => {
      req.params = { id: 'inv-1' };
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ row_id: 'r1', row_data: { investorId: 'inv-1', name: 'Test Fund', role: 'investor', notes: '' } }]
      });

      await investorDatabaseController.getInvestorById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investor.name).toBe('Test Fund');
    });

    it('should fallback to stakeholderId when investorId not found', async () => {
      req.params = { id: 'stk-1' };
      zerodbService.queryTable
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: [{ row_id: 'r1', row_data: { stakeholderId: 'stk-1', name: 'Fallback Fund', role: 'investor', notes: '' } }]
        });

      await investorDatabaseController.getInvestorById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investor.name).toBe('Fallback Fund');
      // Should have called queryTable twice
      expect(zerodbService.queryTable).toHaveBeenCalledTimes(2);
    });

    it('should return 404 when not found by any id', async () => {
      req.params = { id: 'nonexistent' };
      zerodbService.queryTable
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      await investorDatabaseController.getInvestorById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Investor not found');
    });

    it('should handle array result format', async () => {
      req.params = { id: 'inv-1' };
      zerodbService.queryTable.mockResolvedValueOnce([
        { name: 'Test Fund', role: 'investor', notes: '' }
      ]);

      await investorDatabaseController.getInvestorById(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      req.params = { id: 'inv-1' };
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      await investorDatabaseController.getInvestorById(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Error fetching investor');
    });

    it('should enrich the returned investor record', async () => {
      req.params = { id: 'inv-1' };
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ row_id: 'r1', row_data: { investorId: 'inv-1', name: '/fund/great-fund', role: 'investor', notes: 'Great Fund — VC | Seed | AI' } }]
      });

      await investorDatabaseController.getInvestorById(req, res);

      const data = JSON.parse(res._getData());
      expect(data.investor.displayName).toBe('Great Fund');
      expect(data.investor.investorType).toBe('VC');
    });
  });
});
