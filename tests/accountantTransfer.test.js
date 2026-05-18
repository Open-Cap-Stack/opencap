/**
 * Tests for Stripe Transfer on 409A Valuation Release
 * Covers: releaseToCompany transfer logic + GET /transfers endpoint
 */
const { v4: uuidv4 } = require('uuid');

// --- Mocks ---

jest.mock('../models/Valuation409A', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn()
}));
jest.mock('../models/AccountantQueue', () => ({
  findOne: jest.fn()
}));
jest.mock('../models/User', () => ({
  findOne: jest.fn()
}));
jest.mock('../models/TransferLog', () => ({
  create: jest.fn(),
  find: jest.fn()
}));
jest.mock('../services/valuation409AEmailService', () => ({
  sendReportReleased: jest.fn().mockResolvedValue(true)
}));
jest.mock('../services/stripeService', () => ({
  isConfigured: jest.fn(),
  getStripe: jest.fn()
}));

const Valuation409A = require('../models/Valuation409A');
const AccountantQueue = require('../models/AccountantQueue');
const User = require('../models/User');
const TransferLog = require('../models/TransferLog');
const stripeService = require('../services/stripeService');
const accountantController = require('../controllers/accountantController');

// Helper to build mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    params: { valuationId: 'val-001' },
    user: { userId: 'admin-1', role: 'admin' },
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  return { req, res };
}

describe('releaseToCompany — Stripe transfer', () => {
  const mockValuation = {
    valuationId: 'val-001',
    status: 'accountant_approved',
    companyId: 'comp-1',
    requestedBy: 'user-1',
    fairMarketValue: 150000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Valuation409A.findOne.mockResolvedValue(mockValuation);
    Valuation409A.updateOne.mockResolvedValue({});
    User.findOne.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
  });

  it('triggers transfer when accountant has stripeConnectAccountId', async () => {
    const mockTransfer = { id: 'tr_abc123' };
    const mockStripe = { transfers: { create: jest.fn().mockResolvedValue(mockTransfer) } };

    AccountantQueue.findOne.mockResolvedValue({
      queueId: 'queue-1',
      assignedAccountantId: 'acct-user-1'
    });
    User.findOne.mockImplementation(async (filter) => {
      if (filter.userId === 'acct-user-1') {
        return { userId: 'acct-user-1', stripeConnectAccountId: 'acct_stripe_1' };
      }
      return { userId: 'user-1', email: 'user@example.com' };
    });
    stripeService.isConfigured.mockReturnValue(true);
    stripeService.getStripe.mockReturnValue(mockStripe);
    TransferLog.create.mockResolvedValue({});

    const { req, res } = mockReqRes();
    await accountantController.releaseToCompany(req, res);

    expect(mockStripe.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 24975,
        currency: 'usd',
        destination: 'acct_stripe_1'
      })
    );
    expect(TransferLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        valuationId: 'val-001',
        queueId: 'queue-1',
        accountantUserId: 'acct-user-1',
        stripeTransferId: 'tr_abc123',
        amount: 24975,
        status: 'pending'
      })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('does NOT fail when accountant has no stripeConnectAccountId', async () => {
    AccountantQueue.findOne.mockResolvedValue({
      queueId: 'queue-1',
      assignedAccountantId: 'acct-user-2'
    });
    User.findOne.mockImplementation(async (filter) => {
      if (filter.userId === 'acct-user-2') {
        return { userId: 'acct-user-2' }; // no stripeConnectAccountId
      }
      return { userId: 'user-1', email: 'user@example.com' };
    });
    stripeService.isConfigured.mockReturnValue(true);

    const { req, res } = mockReqRes();
    await accountantController.releaseToCompany(req, res);

    expect(TransferLog.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('does NOT fail when Stripe is not configured', async () => {
    AccountantQueue.findOne.mockResolvedValue({
      queueId: 'queue-1',
      assignedAccountantId: 'acct-user-1'
    });
    stripeService.isConfigured.mockReturnValue(false);

    const { req, res } = mockReqRes();
    await accountantController.releaseToCompany(req, res);

    expect(TransferLog.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('logs transfer in TransferLog on successful Stripe call', async () => {
    const mockTransfer = { id: 'tr_logged' };
    const mockStripe = { transfers: { create: jest.fn().mockResolvedValue(mockTransfer) } };

    AccountantQueue.findOne.mockResolvedValue({
      queueId: 'queue-99',
      assignedAccountantId: 'acct-user-1'
    });
    User.findOne.mockImplementation(async (filter) => {
      if (filter.userId === 'acct-user-1') {
        return { userId: 'acct-user-1', stripeConnectAccountId: 'acct_stripe_99' };
      }
      return { userId: 'user-1', email: 'user@example.com' };
    });
    stripeService.isConfigured.mockReturnValue(true);
    stripeService.getStripe.mockReturnValue(mockStripe);
    TransferLog.create.mockResolvedValue({});

    const { req, res } = mockReqRes();
    await accountantController.releaseToCompany(req, res);

    expect(TransferLog.create).toHaveBeenCalledTimes(1);
    const logArg = TransferLog.create.mock.calls[0][0];
    expect(logArg.stripeTransferId).toBe('tr_logged');
    expect(logArg.amount).toBe(24975);
    expect(logArg.currency).toBe('usd');
    expect(logArg.status).toBe('pending');
    expect(logArg.transferId).toBeDefined();
  });

  it('continues release even if Stripe transfer throws', async () => {
    const mockStripe = { transfers: { create: jest.fn().mockRejectedValue(new Error('Stripe down')) } };

    AccountantQueue.findOne.mockResolvedValue({
      queueId: 'queue-1',
      assignedAccountantId: 'acct-user-1'
    });
    User.findOne.mockImplementation(async (filter) => {
      if (filter.userId === 'acct-user-1') {
        return { userId: 'acct-user-1', stripeConnectAccountId: 'acct_stripe_1' };
      }
      return { userId: 'user-1', email: 'user@example.com' };
    });
    stripeService.isConfigured.mockReturnValue(true);
    stripeService.getStripe.mockReturnValue(mockStripe);

    const { req, res } = mockReqRes();
    await accountantController.releaseToCompany(req, res);

    // Release still succeeds
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('getTransferHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only the authenticated accountant transfers', async () => {
    const mockLogs = [
      { transferId: 't1', accountantUserId: 'acct-user-1', amount: 24975 }
    ];
    TransferLog.find.mockResolvedValue(mockLogs);

    const { req, res } = mockReqRes({
      user: { userId: 'acct-user-1', role: 'accountant' }
    });
    delete req.params; // not needed for this endpoint
    req.params = {};

    await accountantController.getTransferHistory(req, res);

    expect(TransferLog.find).toHaveBeenCalledWith(
      { accountantUserId: 'acct-user-1' },
      { sort: { createdAt: -1 } }
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockLogs });
  });

  it('admin sees all transfers', async () => {
    const mockLogs = [
      { transferId: 't1', accountantUserId: 'acct-user-1', amount: 24975 },
      { transferId: 't2', accountantUserId: 'acct-user-2', amount: 24975 }
    ];
    TransferLog.find.mockResolvedValue(mockLogs);

    const { req, res } = mockReqRes({
      user: { userId: 'admin-1', role: 'admin' }
    });
    req.params = {};

    await accountantController.getTransferHistory(req, res);

    expect(TransferLog.find).toHaveBeenCalledWith(
      {},
      { sort: { createdAt: -1 } }
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockLogs });
  });
});
