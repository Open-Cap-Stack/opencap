/**
 * Tests for Investor Role Access to SPV Routes
 * Issue #271: Add Investor Role Access to SPV Backend API Routes
 *
 * Covers:
 *   - PATCH /:id/investors/me (investor self-service)
 *   - Investor access control on read endpoints
 *   - Investor exclusion from admin endpoints
 */

jest.mock('../../../models/SPV', () => ({
  findBySPVID: jest.fn(),
  findById: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview']
}));

jest.mock('../../../models/SPVInvestor', () => {
  const VALID_STATUSES = ['invited', 'applied', 'committed', 'wired', 'declined'];
  return {
    VALID_STATUSES,
    validators: {
      isValidStatus: (s) => VALID_STATUSES.includes(s),
      isValidEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    },
    generateInviteToken: jest.fn(() => 'mock-token-abc123'),
    findBySPV: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn()
  };
});

const SPV = require('../../../models/SPV');
const SPVInvestor = require('../../../models/SPVInvestor');
const controller = require('../../../controllers/SPVInvestor');

function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { _id: 'investor_1', userId: 'investor_1', email: 'alice@example.com', role: 'investor' },
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
  SPV.findBySPVID.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'comp_1' });
});

// ---------------------------------------------------------------------------
// PATCH /:id/investors/me  (investor self-service)
// ---------------------------------------------------------------------------
describe('updateMyInvestorRecord', () => {
  const lpRecord = {
    _id: 'inv_1',
    spvId: 'spv_1',
    userId: 'investor_1',
    email: 'alice@example.com',
    status: 'invited',
    committedAmount: 0
  };

  it('allows investor to commit with an amount (via req.lpRecord)', async () => {
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      ...lpRecord,
      status: 'committed',
      committedAmount: 25000,
      committedAt: '2026-08-31T00:00:00.000Z'
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'committed', committedAmount: 25000 },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(SPVInvestor.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'inv_1', spvId: 'spv_1' },
      {
        $set: expect.objectContaining({
          status: 'committed',
          committedAmount: 25000,
          committedAt: expect.any(String)
        })
      },
      { new: true }
    );
    // inviteToken should be stripped from response
    const response = res.json.mock.calls[0][0];
    expect(response).not.toHaveProperty('inviteToken');
  });

  it('allows investor to decline', async () => {
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      ...lpRecord,
      status: 'declined'
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'declined' },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects investor trying to set status to wired (admin-only transition)', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'wired' },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Allowed values') })
    );
  });

  it('rejects investor trying to set status to invited', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'invited' },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows investor to update only committedAmount', async () => {
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      ...lpRecord,
      committedAmount: 50000
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { committedAmount: 50000 },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(SPVInvestor.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'inv_1', spvId: 'spv_1' },
      { $set: { committedAmount: 50000 } },
      { new: true }
    );
  });

  it('rejects non-self-service fields (tags, notes, accreditation, name)', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { tags: ['vip'], notes: 'test', accreditation: 'verified', name: 'NewName' },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('No valid fields') })
    );
  });

  it('rejects negative committedAmount', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { committedAmount: -100 },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('non-negative') })
    );
  });

  it('rejects non-numeric committedAmount', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { committedAmount: 'not-a-number' },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when SPV ID is empty', async () => {
    const { req, res } = mockReqRes({
      params: { id: '  ' },
      body: { status: 'committed' },
      lpRecord
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('falls back to userId lookup when lpRecord is not set', async () => {
    SPVInvestor.findOne.mockResolvedValue(lpRecord);
    SPVInvestor.findOneAndUpdate.mockResolvedValue({ ...lpRecord, status: 'committed' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'committed' }
      // no lpRecord set
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(SPVInvestor.findOne).toHaveBeenCalledWith({ spvId: 'spv_1', userId: 'investor_1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('falls back to email lookup when userId lookup returns null', async () => {
    SPVInvestor.findOne
      .mockResolvedValueOnce(null) // userId lookup
      .mockResolvedValueOnce(lpRecord); // email lookup
    SPVInvestor.findOneAndUpdate.mockResolvedValue({ ...lpRecord, status: 'declined' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'declined' }
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(SPVInvestor.findOne).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when LP record is not found', async () => {
    SPVInvestor.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'committed' }
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 on database error', async () => {
    SPVInvestor.findOne.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { status: 'committed' }
    });
    await controller.updateMyInvestorRecord(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// Verify investor CANNOT access admin-only controller methods directly
// (hasRole in routes blocks this, but controllers also have ownership checks)
// ---------------------------------------------------------------------------
describe('Admin-only operations reject investor-originated requests', () => {
  it('investor cannot invite others via inviteInvestors (ownership check blocks)', async () => {
    // The SPV belongs to comp_1 but investor is in a different company
    SPV.findBySPVID.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'comp_1' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: ['new@person.com'] },
      user: { _id: 'investor_1', userId: 'investor_1', companyId: 'other_comp', role: 'investor' }
    });
    await controller.inviteInvestors(req, res);

    // Ownership check should deny (investor is not company admin)
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('investor cannot delete another investor via deleteInvestor (ownership check blocks)', async () => {
    SPV.findBySPVID.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'comp_1' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_other' },
      user: { _id: 'investor_1', userId: 'investor_1', companyId: 'other_comp', role: 'investor' }
    });
    await controller.deleteInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ---------------------------------------------------------------------------
// Verify hasRole behavior (unit test the middleware logic)
// ---------------------------------------------------------------------------
describe('hasRole middleware behavior for investor', () => {
  const { hasRole } = require('../../../middleware/rbacMiddleware');

  it('investor role is accepted when included in allowed list', () => {
    const middleware = hasRole(['admin', 'investor']);
    const req = { user: { role: 'investor' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('investor role is rejected when NOT in allowed list', () => {
    const middleware = hasRole(['admin', 'founder']);
    const req = { user: { role: 'investor' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
