/**
 * Tests for SPV Access Middleware (LP Membership Check)
 * Issue #271: Add Investor Role Access to SPV Backend API Routes
 */

jest.mock('../../../models/SPVInvestor', () => ({
  find: jest.fn()
}));

const SPVInvestor = require('../../../models/SPVInvestor');
const { requireLPMembership } = require('../../../middleware/spvAccessMiddleware');

function mockReqRes(overrides = {}) {
  const req = {
    params: { id: 'spv_1' },
    body: {},
    query: {},
    user: { userId: 'user_1', email: 'investor@example.com', role: 'investor' },
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requireLPMembership', () => {
  it('passes through for non-investor roles (admin)', async () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'admin_1', role: 'admin' }
    });

    await requireLPMembership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through for non-investor roles (founder)', async () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'founder_1', role: 'founder' }
    });

    await requireLPMembership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through for non-investor roles (manager)', async () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'mgr_1', role: 'manager' }
    });

    await requireLPMembership(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('passes through for non-investor roles (service_provider)', async () => {
    const { req, res, next } = mockReqRes({
      user: { userId: 'sp_1', role: 'service_provider' }
    });

    await requireLPMembership(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows investor who is an LP (matched by userId)', async () => {
    const lpRecord = { _id: 'inv_1', spvId: 'spv_1', userId: 'user_1', email: 'investor@example.com', status: 'committed' };
    SPVInvestor.find.mockResolvedValue([lpRecord]);

    const { req, res, next } = mockReqRes();

    await requireLPMembership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.lpRecord).toEqual(lpRecord);
    expect(SPVInvestor.find).toHaveBeenCalledWith({ spvId: 'spv_1', userId: 'user_1' });
  });

  it('allows investor who is an LP (matched by email fallback)', async () => {
    const lpRecord = { _id: 'inv_1', spvId: 'spv_1', email: 'investor@example.com', status: 'invited' };
    // First call (by userId) returns empty, second (by email) returns match
    SPVInvestor.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([lpRecord]);

    const { req, res, next } = mockReqRes();

    await requireLPMembership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.lpRecord).toEqual(lpRecord);
    expect(SPVInvestor.find).toHaveBeenCalledTimes(2);
  });

  it('returns 403 for investor who is NOT an LP in the SPV', async () => {
    SPVInvestor.find.mockResolvedValue([]);

    const { req, res, next } = mockReqRes();

    await requireLPMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Access denied: You are not an LP in this SPV' })
    );
  });

  it('returns 400 when SPV ID is empty', async () => {
    const { req, res, next } = mockReqRes({ params: { id: '  ' } });

    await requireLPMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when investor has no userId and no email', async () => {
    const { req, res, next } = mockReqRes({
      user: { role: 'investor' }
    });

    await requireLPMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Access denied: Unable to identify investor' })
    );
  });

  it('returns 500 on database error', async () => {
    SPVInvestor.find.mockRejectedValue(new Error('db connection lost'));

    const { req, res, next } = mockReqRes();

    await requireLPMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
