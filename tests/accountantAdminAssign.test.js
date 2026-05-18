/**
 * Tests for Admin Manual Queue Assignment
 * Endpoint: PATCH /api/v1/accountant/queue/:queueId/assign
 *
 * Covers:
 * - Admin can assign a queue item to an accountant
 * - Non-admin gets 403
 * - Missing accountantUserId gets 400
 * - Unknown queueId gets 404
 */

jest.mock('../models/AccountantQueue', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn()
}));
jest.mock('../models/Valuation409A', () => ({}));
jest.mock('../models/User', () => ({}));
jest.mock('../services/valuation409AEmailService', () => ({}));
jest.mock('../services/stripeService', () => ({}));

const AccountantQueue = require('../models/AccountantQueue');
const accountantController = require('../controllers/accountantController');

function mockReqRes(overrides = {}) {
  const req = {
    user: { userId: 'admin-1', role: 'admin' },
    params: { queueId: 'queue_123' },
    body: { accountantUserId: 'acct-1' },
    ...overrides
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  return { req, res };
}

describe('adminAssignQueueItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should assign a queue item when called by an admin', async () => {
    AccountantQueue.findOne.mockResolvedValue({ queueId: 'queue_123', status: 'unassigned' });
    AccountantQueue.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const { req, res } = mockReqRes();
    await accountantController.adminAssignQueueItem(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Queue item assigned' });
    expect(AccountantQueue.findOne).toHaveBeenCalledWith({ queueId: 'queue_123' });
    expect(AccountantQueue.updateOne).toHaveBeenCalledWith(
      { queueId: 'queue_123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          assignedAccountantId: 'acct-1',
          status: 'assigned'
        })
      })
    );
  });

  it('should return 403 for non-admin users', async () => {
    const { req, res } = mockReqRes({ user: { userId: 'user-1', role: 'accountant' } });
    await accountantController.adminAssignQueueItem(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('should return 400 when accountantUserId is missing', async () => {
    const { req, res } = mockReqRes({ body: {} });
    await accountantController.adminAssignQueueItem(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/accountantUserId/);
  });

  it('should return 404 when queue item does not exist', async () => {
    AccountantQueue.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes();
    await accountantController.adminAssignQueueItem(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should return 500 on unexpected errors', async () => {
    AccountantQueue.findOne.mockRejectedValue(new Error('DB failure'));

    const { req, res } = mockReqRes();
    await accountantController.adminAssignQueueItem(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('DB failure');
  });
});
