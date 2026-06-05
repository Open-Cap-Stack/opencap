/**
 * Mercury Controller Extended Unit Tests
 * Issues #676, #677: Activity feed + Financial summary
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/mercuryService');
jest.mock('../../../services/zerodbService', () => ({
  createTable: jest.fn(),
  insertRow: jest.fn(),
  queryRows: jest.fn(),
}));
jest.mock('../../../models/SAFE', () => ({
  findOne: jest.fn(),
  canTransitionTo: jest.fn(),
  transitionTo: jest.fn(),
  updateOne: jest.fn(),
}));

const httpMocks = require('node-mocks-http');
const mercuryService = require('../../../services/mercuryService');
const controller = require('../../../controllers/mercuryController');

describe('MercuryController — Extended', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_123', role: 'admin' };
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /activity — transaction activity feed (#677)
  // -----------------------------------------------------------------------
  describe('getActivityFeed', () => {
    it('should return formatted activity feed items', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [{ id: 'acc_1', name: 'Checking' }],
      });
      mercuryService.getTransactions.mockResolvedValue({
        transactions: [
          { id: 'txn_1', amount: -5000, counterpartyName: 'AWS', kind: 'externalTransfer', createdAt: '2026-06-01T10:00:00Z', status: 'sent' },
          { id: 'txn_2', amount: 50000, counterpartyName: 'Investor A', kind: 'externalTransfer', createdAt: '2026-06-02T10:00:00Z', status: 'sent' },
        ],
      });

      req.query = { limit: '10', offset: '0' };
      await controller.getActivityFeed(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.items).toHaveLength(2);
      // Sorted by date descending — txn_2 (June 2) first
      expect(data.items[0].id).toBe('txn_2');
      expect(data.items[0].direction).toBe('credit');
      expect(data.items[1].direction).toBe('debit');
      expect(data.total).toBe(2);
    });

    it('should apply pagination via limit and offset', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [{ id: 'acc_1', name: 'Checking' }],
      });
      mercuryService.getTransactions.mockResolvedValue({
        transactions: [
          { id: 'txn_1', amount: -1000, createdAt: '2026-06-01T10:00:00Z' },
          { id: 'txn_2', amount: -2000, createdAt: '2026-06-02T10:00:00Z' },
          { id: 'txn_3', amount: -3000, createdAt: '2026-06-03T10:00:00Z' },
        ],
      });

      req.query = { limit: '1', offset: '1' };
      await controller.getActivityFeed(req, res);

      const data = res._getJSONData();
      expect(data.items).toHaveLength(1);
      expect(data.total).toBe(3);
    });

    it('should use default limit=25 and offset=0', async () => {
      mercuryService.getAccounts.mockResolvedValue({ accounts: [] });
      req.query = {};
      await controller.getActivityFeed(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.limit).toBe(25);
      expect(data.offset).toBe(0);
    });

    it('should return 401 when Mercury not connected', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Mercury not connected'));
      req.query = {};
      await controller.getActivityFeed(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 500 on unexpected error', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Network timeout'));
      req.query = {};
      await controller.getActivityFeed(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // GET /financial-summary — auto-populate investor update template (#676)
  // -----------------------------------------------------------------------
  describe('getFinancialSummary', () => {
    it('should return financial metrics', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [
          { id: 'acc_1', name: 'Checking', currentBalance: 300000 },
          { id: 'acc_2', name: 'Savings', currentBalance: 200000 },
        ],
      });
      mercuryService.getTransactions
        .mockResolvedValueOnce({
          transactions: [
            { id: 'txn_1', amount: -10000, createdAt: '2026-05-01T10:00:00Z' },
            { id: 'txn_2', amount: 50000, createdAt: '2026-05-02T10:00:00Z' },
          ],
        })
        .mockResolvedValueOnce({
          transactions: [
            { id: 'txn_3', amount: -5000, createdAt: '2026-05-10T10:00:00Z' },
          ],
        });

      await controller.getFinancialSummary(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.totalBalance).toBe(500000);
      expect(data.burnRate30d).toBe(15000); // 10000 + 5000
      expect(data.monthlyRevenue).toBe(50000);
      expect(data.monthlyExpenses).toBe(15000);
      expect(data.cashOnHand).toBe(500000);
      expect(data.runwayMonths).toBeGreaterThan(0);
      expect(data.lastUpdated).toBeDefined();
    });

    it('should handle zero expenses (infinite runway)', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [{ id: 'acc_1', name: 'Checking', currentBalance: 500000 }],
      });
      mercuryService.getTransactions.mockResolvedValue({
        transactions: [
          { id: 'txn_1', amount: 100000, createdAt: '2026-05-01T10:00:00Z' },
        ],
      });

      await controller.getFinancialSummary(req, res);

      const data = res._getJSONData();
      expect(data.burnRate30d).toBe(0);
      expect(data.runwayMonths).toBeNull();
    });

    it('should return 401 when Mercury not connected', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Mercury not connected'));
      await controller.getFinancialSummary(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 500 on unexpected error', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('API down'));
      await controller.getFinancialSummary(req, res);
      expect(res.statusCode).toBe(500);
    });
  });
});
