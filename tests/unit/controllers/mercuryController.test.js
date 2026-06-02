/**
 * Mercury Controller Unit Tests
 * Issues #671, #672, #673: Mercury banking integration
 * Issues #674, #679: SAFE funding verification + Mercury snapshots
 * TDD: Tests for balance, accounts, status, verify-funding, and snapshots
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the service before requiring the controller
jest.mock('../../../services/mercuryService');
jest.mock('../../../services/zerodbService', () => ({
  createTable: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
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
const zerodbService = require('../../../services/zerodbService');
const SAFE = require('../../../models/SAFE');
const controller = require('../../../controllers/mercuryController');

describe('MercuryController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_123', _id: 'user_123', companyId: 'company_456', role: 'admin' };
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /status — connection status
  // -----------------------------------------------------------------------
  describe('getStatus', () => {
    it('should return connected=true when Mercury integration exists', async () => {
      mercuryService.getConnectionStatus.mockResolvedValue({
        connected: true,
        provider: 'mercury',
        connectedAt: '2026-05-20T10:00:00Z',
      });

      await controller.getStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.mercury.connected).toBe(true);
      expect(mercuryService.getConnectionStatus).toHaveBeenCalledWith('user_123');
    });

    it('should return connected=false when no Mercury integration', async () => {
      mercuryService.getConnectionStatus.mockResolvedValue({
        connected: false,
      });

      await controller.getStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.mercury.connected).toBe(false);
    });

    it('should return 500 on service error', async () => {
      mercuryService.getConnectionStatus.mockRejectedValue(new Error('DB down'));

      await controller.getStatus(req, res);

      expect(res.statusCode).toBe(500);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // GET /accounts — list connected accounts
  // -----------------------------------------------------------------------
  describe('getAccounts', () => {
    it('should return list of Mercury accounts', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [
          { id: 'acc_1', name: 'Checking', currentBalance: 125000.50 },
          { id: 'acc_2', name: 'Savings', currentBalance: 500000 },
        ],
      });

      await controller.getAccounts(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.accounts).toHaveLength(2);
      expect(data.accounts[0].name).toBe('Checking');
    });

    it('should return 500 on service error', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Token expired'));

      await controller.getAccounts(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should return 401 when Mercury not connected', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Mercury not connected'));

      await controller.getAccounts(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /balance — balance + burn rate + runway
  // -----------------------------------------------------------------------
  describe('getBalance', () => {
    it('should return balance, burn rate, and runway for all accounts', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [
          { id: 'acc_1', name: 'Checking', currentBalance: 300000 },
        ],
      });

      mercuryService.getTransactions.mockResolvedValue({
        transactions: [
          { id: 'txn_1', amount: -10000, createdAt: '2026-05-01T10:00:00Z' },
          { id: 'txn_2', amount: -15000, createdAt: '2026-05-10T10:00:00Z' },
          { id: 'txn_3', amount: -5000, createdAt: '2026-05-20T10:00:00Z' },
          { id: 'txn_4', amount: 50000, createdAt: '2026-05-05T10:00:00Z' }, // inflow, ignored for burn
        ],
      });

      await controller.getBalance(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.totalBalance).toBe(300000);
      expect(data.burnRate30d).toBeGreaterThan(0);
      expect(data.runwayMonths).toBeGreaterThan(0);
      expect(data.accounts).toHaveLength(1);
    });

    it('should handle zero burn rate (infinite runway)', async () => {
      mercuryService.getAccounts.mockResolvedValue({
        accounts: [{ id: 'acc_1', name: 'Checking', currentBalance: 300000 }],
      });

      mercuryService.getTransactions.mockResolvedValue({
        transactions: [
          { id: 'txn_1', amount: 50000, createdAt: '2026-05-01T10:00:00Z' }, // all inflows
        ],
      });

      await controller.getBalance(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.burnRate30d).toBe(0);
      expect(data.runwayMonths).toBeNull();
    });

    it('should return 401 when Mercury not connected', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Mercury not connected'));

      await controller.getBalance(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('should return 500 on unexpected error', async () => {
      mercuryService.getAccounts.mockRejectedValue(new Error('Network error'));

      await controller.getBalance(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // ensureMercurySnapshotsTable (#679)
  // -----------------------------------------------------------------------
  describe('ensureMercurySnapshotsTable', () => {
    it('should call createTable for mercury_snapshots', async () => {
      zerodbService.createTable.mockResolvedValueOnce({});
      await controller.ensureMercurySnapshotsTable();
      expect(zerodbService.createTable).toHaveBeenCalledWith(
        'mercury_snapshots',
        expect.objectContaining({ fields: expect.any(Object) })
      );
    });

    it('should not throw when table already exists (409)', async () => {
      zerodbService.createTable.mockRejectedValueOnce({
        response: { status: 409 },
        message: 'Table already exists',
      });
      await expect(controller.ensureMercurySnapshotsTable()).resolves.not.toThrow();
    });

    it('should not throw when table already exists (UniqueViolation)', async () => {
      zerodbService.createTable.mockRejectedValueOnce({
        response: { status: 500, data: { detail: 'UniqueViolation' } },
        message: 'duplicate key',
      });
      await expect(controller.ensureMercurySnapshotsTable()).resolves.not.toThrow();
    });

    it('should log warning for unexpected errors but not throw', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      zerodbService.createTable.mockRejectedValueOnce(new Error('network timeout'));
      await expect(controller.ensureMercurySnapshotsTable()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // POST /verify-funding (#674)
  // -----------------------------------------------------------------------
  describe('verifyFunding', () => {
    const baseSafe = {
      _id: 'row-1',
      safeId: 'safe_abc123',
      companyId: 'comp-1',
      investmentAmount: 250000,
      status: 'fully_signed',
      investorName: 'Alice',
    };

    it('should return 400 when safeId is missing', async () => {
      req.body = { amount: 250000 };
      await controller.verifyFunding(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/safeId/i);
    });

    it('should return 400 when amount is missing', async () => {
      req.body = { safeId: 'safe_abc123' };
      await controller.verifyFunding(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/amount/i);
    });

    it('should return 404 when SAFE does not exist', async () => {
      SAFE.findOne.mockResolvedValue(null);
      req.body = { safeId: 'safe_nope', amount: 100000 };
      await controller.verifyFunding(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should verify funding when a matching Mercury transaction is found', async () => {
      SAFE.findOne.mockResolvedValueOnce(baseSafe); // first lookup by safeId
      SAFE.canTransitionTo.mockReturnValueOnce(true);

      const txn = {
        id: 'txn_xyz789',
        amount: 250000,
        counterpartyName: 'Alice',
        createdAt: '2026-06-14T12:00:00Z',
        status: 'sent',
      };
      mercuryService.searchTransactions.mockResolvedValueOnce([txn]);

      const updatedSafe = { ...baseSafe, status: 'funded' };
      SAFE.transitionTo.mockResolvedValueOnce(updatedSafe);
      SAFE.updateOne.mockResolvedValueOnce({});

      req.body = { safeId: 'safe_abc123', amount: 250000, tolerance: 1 };
      await controller.verifyFunding(req, res);

      expect(mercuryService.searchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          minAmount: 249999,
          maxAmount: 250001,
          direction: 'credit',
        })
      );
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.data.verified).toBe(true);
      expect(data.data.fundingVerification.method).toBe('mercury_auto');
      expect(data.data.fundingVerification.mercuryTransactionId).toBe('txn_xyz789');
      expect(data.data.fundingVerification.verifiedAmount).toBe(250000);
      expect(data.data.fundingVerification.wireDate).toBe('2026-06-14T12:00:00Z');
    });

    it('should return verified:false when no matching transaction exists', async () => {
      SAFE.findOne.mockResolvedValueOnce(baseSafe);
      mercuryService.searchTransactions.mockResolvedValueOnce([]);

      req.body = { safeId: 'safe_abc123', amount: 250000 };
      await controller.verifyFunding(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.data.verified).toBe(false);
      expect(data.data.message).toMatch(/No matching wire found/i);
    });

    it('should default tolerance to 1 when not provided', async () => {
      SAFE.findOne.mockResolvedValueOnce(baseSafe);
      mercuryService.searchTransactions.mockResolvedValueOnce([]);

      req.body = { safeId: 'safe_abc123', amount: 500000 };
      await controller.verifyFunding(req, res);

      expect(mercuryService.searchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          minAmount: 499999,
          maxAmount: 500001,
        })
      );
    });

    it('should apply custom tolerance value', async () => {
      SAFE.findOne.mockResolvedValueOnce(baseSafe);
      mercuryService.searchTransactions.mockResolvedValueOnce([]);

      req.body = { safeId: 'safe_abc123', amount: 100000, tolerance: 50 };
      await controller.verifyFunding(req, res);

      expect(mercuryService.searchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          minAmount: 99950,
          maxAmount: 100050,
        })
      );
    });

    it('should still verify but skip status transition if SAFE cannot move to funded', async () => {
      const draftSafe = { ...baseSafe, status: 'draft' };
      SAFE.findOne.mockResolvedValueOnce(draftSafe);
      SAFE.canTransitionTo.mockReturnValueOnce(false);

      const txn = {
        id: 'txn_match1',
        amount: 250000,
        counterpartyName: 'Alice',
        createdAt: '2026-06-14T12:00:00Z',
        status: 'sent',
      };
      mercuryService.searchTransactions.mockResolvedValueOnce([txn]);

      req.body = { safeId: 'safe_abc123', amount: 250000 };
      await controller.verifyFunding(req, res);

      // Should NOT call transitionTo
      expect(SAFE.transitionTo).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.data.verified).toBe(true);
      expect(data.data.statusUpdated).toBe(false);
    });

    it('should return 502 when Mercury API call fails', async () => {
      SAFE.findOne.mockResolvedValueOnce(baseSafe);
      mercuryService.searchTransactions.mockRejectedValueOnce(
        new Error('Mercury API timeout')
      );

      req.body = { safeId: 'safe_abc123', amount: 250000 };
      await controller.verifyFunding(req, res);

      expect(res.statusCode).toBe(502);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Mercury/i);
    });
  });

  // -----------------------------------------------------------------------
  // POST /snapshots — create a balance snapshot (#679)
  // -----------------------------------------------------------------------
  describe('createSnapshot', () => {
    it('should insert a snapshot row into mercury_snapshots', async () => {
      zerodbService.insertRow.mockResolvedValueOnce({ row_id: 'snap-1' });

      req.body = {
        companyId: 'comp-1',
        accountId: 'acct-1',
        accountName: 'Operating',
        balance: 500000,
        currency: 'USD',
        burnRate30d: 40000,
        runwayMonths: 12.5,
      };
      await controller.createSnapshot(req, res);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'mercury_snapshots',
        expect.objectContaining({
          companyId: 'comp-1',
          accountId: 'acct-1',
          balance: 500000,
          snapshotAt: expect.any(String),
        })
      );
      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = { accountId: 'acct-1', balance: 500000 };
      await controller.createSnapshot(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when accountId is missing', async () => {
      req.body = { companyId: 'comp-1', balance: 500000 };
      await controller.createSnapshot(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on ZeroDB insertion error', async () => {
      zerodbService.insertRow.mockRejectedValueOnce(new Error('ZeroDB write failed'));

      req.body = {
        companyId: 'comp-1',
        accountId: 'acct-1',
        accountName: 'Operating',
        balance: 500000,
      };
      await controller.createSnapshot(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
