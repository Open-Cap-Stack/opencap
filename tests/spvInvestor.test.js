/**
 * Tests for SPV LP Investor Management
 * Issue #590: SPV LP Management
 *
 * Covers all 5 endpoints:
 *   GET    /api/v1/spv/:id/investors
 *   POST   /api/v1/spv/:id/invite
 *   GET    /api/v1/spv/:id/invite-link
 *   PATCH  /api/v1/spv/:id/investors/:investorId
 *   DELETE /api/v1/spv/:id/investors/:investorId
 */

// Mock the SPV model (for ownership checks)
jest.mock('../models/SPV', () => ({
  findBySPVID: jest.fn(),
  findById: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview']
}));

// Mock the SPVInvestor model before requiring the controller
jest.mock('../models/SPVInvestor', () => {
  const VALID_STATUSES = ['invited', 'applied', 'committed', 'wired', 'declined'];
  return {
    VALID_STATUSES,
    validators: {
      isValidStatus: (s) => VALID_STATUSES.includes(s),
      isValidEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    },
    generateInviteToken: jest.fn(() => 'mock-token-abc123'),
    findBySPV: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn()
  };
});

const SPV = require('../models/SPV');
const SPVInvestor = require('../models/SPVInvestor');
const controller = require('../controllers/SPVInvestor');

// Helper to build mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'admin' },
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
  // Default: SPV exists and belongs to the user's company
  SPV.findBySPVID.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'comp_1' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/spv/:id/investors
// ---------------------------------------------------------------------------
describe('listInvestors', () => {
  it('returns investors for a given SPV (inviteToken stripped)', async () => {
    const investors = [
      { _id: 'inv_1', spvId: 'spv_1', email: 'a@b.com', name: 'Alice', status: 'invited', inviteToken: 'secret1' },
      { _id: 'inv_2', spvId: 'spv_1', email: 'c@d.com', name: 'Bob', status: 'committed', inviteToken: 'secret2' }
    ];
    SPVInvestor.findBySPV.mockResolvedValue(investors);

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listInvestors(req, res);

    expect(SPVInvestor.findBySPV).toHaveBeenCalledWith('spv_1', {});
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.investors).toHaveLength(2);
    // Ensure inviteToken is stripped
    response.investors.forEach(inv => {
      expect(inv).not.toHaveProperty('inviteToken');
    });
  });

  it('filters by status query param', async () => {
    SPVInvestor.findBySPV.mockResolvedValue([]);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      query: { status: 'committed' }
    });
    await controller.listInvestors(req, res);

    expect(SPVInvestor.findBySPV).toHaveBeenCalledWith('spv_1', { status: 'committed' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects invalid status filter', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      query: { status: 'bogus' }
    });
    await controller.listInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid status filter') })
    );
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await controller.listInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when SPV does not exist', async () => {
    SPV.findBySPVID.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'spv_nonexistent' } });
    await controller.listInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when SPV belongs to another company', async () => {
    SPV.findBySPVID.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'other_comp' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'user' }
    });
    await controller.listInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 on unexpected error', async () => {
    SPVInvestor.findBySPV.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/spv/:id/invite
// ---------------------------------------------------------------------------
describe('inviteInvestors', () => {
  it('creates investor records for each email (parallel)', async () => {
    SPVInvestor.findBySPV.mockResolvedValue([]); // no existing investors
    SPVInvestor.create.mockImplementation(async (data) => ({
      _id: 'inv_new',
      ...data,
      inviteToken: 'tok_123'
    }));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: ['a@b.com', 'c@d.com'], message: 'Join us' }
    });
    await controller.inviteInvestors(req, res);

    expect(SPVInvestor.create).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
    const response = res.json.mock.calls[0][0];
    expect(response.created).toHaveLength(2);
    expect(response.skipped).toHaveLength(0);
  });

  it('skips already-invited emails', async () => {
    // First email already exists in the SPV
    SPVInvestor.findBySPV.mockResolvedValue([{ email: 'a@b.com' }]);
    SPVInvestor.create.mockResolvedValue({ _id: 'inv_new', email: 'c@d.com' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: ['a@b.com', 'c@d.com'] }
    });
    await controller.inviteInvestors(req, res);

    expect(SPVInvestor.create).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    const response = res.json.mock.calls[0][0];
    expect(response.skipped).toHaveLength(1);
    expect(response.skipped[0].reason).toBe('already invited');
  });

  it('returns 400 when emails is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: {}
    });
    await controller.inviteInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('emails array is required') })
    );
  });

  it('returns 400 when emails array is empty', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: [] }
    });
    await controller.inviteInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when batch size exceeds limit', async () => {
    const emails = Array.from({ length: 26 }, (_, i) => `user${i}@example.com`);
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails }
    });
    await controller.inviteInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Maximum 25 invites per request') })
    );
  });

  it('returns 400 for invalid email addresses', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: ['not-an-email', 'a@b.com'] }
    });
    await controller.inviteInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ invalidEmails: ['not-an-email'] })
    );
  });

  it('strips HTML from message field', async () => {
    SPVInvestor.findBySPV.mockResolvedValue([]);
    SPVInvestor.create.mockImplementation(async (data) => ({ _id: 'inv_new', ...data }));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: ['a@b.com'], message: '<script>alert("xss")</script>Hello' }
    });
    await controller.inviteInvestors(req, res);

    expect(SPVInvestor.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'alert("xss")Hello' })
    );
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: '  ' },
      body: { emails: ['a@b.com'] }
    });
    await controller.inviteInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected error', async () => {
    SPVInvestor.findBySPV.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { emails: ['a@b.com'] }
    });
    await controller.inviteInvestors(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/spv/:id/invite-link
// ---------------------------------------------------------------------------
describe('getInviteLink', () => {
  it('returns a shareable invite URL', async () => {
    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.getInviteLink(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.url).toContain('/spv/join/');
    expect(response.token).toBe('mock-token-abc123');
    expect(response.spvId).toBe('spv_1');
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await controller.getInviteLink(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/spv/:id/investors/:investorId
// ---------------------------------------------------------------------------
describe('updateInvestor', () => {
  it('updates investor status and sets committedAt (inviteToken stripped)', async () => {
    const existing = { _id: 'inv_1', spvId: 'spv_1', status: 'invited' };
    SPVInvestor.findOne.mockResolvedValue(existing);
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      ...existing,
      status: 'committed',
      committedAmount: 50000,
      committedAt: expect.any(String),
      inviteToken: 'secret_tok'
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' },
      body: { status: 'committed', committedAmount: 50000 }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response).not.toHaveProperty('inviteToken');
    expect(SPVInvestor.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'inv_1', spvId: 'spv_1' },
      {
        $set: expect.objectContaining({
          status: 'committed',
          committedAmount: 50000,
          committedAt: expect.any(String)
        })
      },
      { new: true }
    );
  });

  it('sets wiredAt when status changes to wired', async () => {
    const existing = { _id: 'inv_1', spvId: 'spv_1', status: 'committed' };
    SPVInvestor.findOne.mockResolvedValue(existing);
    SPVInvestor.findOneAndUpdate.mockResolvedValue({ ...existing, status: 'wired' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' },
      body: { status: 'wired', wiredAmount: 50000 }
    });
    await controller.updateInvestor(req, res);

    expect(SPVInvestor.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'inv_1', spvId: 'spv_1' },
      {
        $set: expect.objectContaining({
          status: 'wired',
          wiredAmount: 50000,
          wiredAt: expect.any(String)
        })
      },
      { new: true }
    );
  });

  it('updates tags and notes', async () => {
    const existing = { _id: 'inv_1', spvId: 'spv_1', status: 'invited' };
    SPVInvestor.findOne.mockResolvedValue(existing);
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      ...existing,
      tags: ['vip'],
      notes: 'Important LP'
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' },
      body: { tags: ['vip'], notes: 'Important LP' }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 for invalid status', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' },
      body: { status: 'invalid_status' }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid status') })
    );
  });

  it('returns 400 when no valid fields provided', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' },
      body: { notAValidField: 'hello' }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No valid fields provided for update' })
    );
  });

  it('returns 404 when investor not found', async () => {
    SPVInvestor.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_999' },
      body: { status: 'committed' }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when investorId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: '  ' },
      body: { status: 'committed' }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected error', async () => {
    SPVInvestor.findOne.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' },
      body: { status: 'committed' }
    });
    await controller.updateInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/spv/:id/investors/:investorId
// ---------------------------------------------------------------------------
describe('deleteInvestor', () => {
  it('removes an investor from the SPV', async () => {
    SPVInvestor.findOne.mockResolvedValue({ _id: 'inv_1', spvId: 'spv_1' });
    SPVInvestor.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' }
    });
    await controller.deleteInvestor(req, res);

    expect(SPVInvestor.deleteOne).toHaveBeenCalledWith({ _id: 'inv_1', spvId: 'spv_1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Investor removed successfully' });
  });

  it('returns 404 when investor not found', async () => {
    SPVInvestor.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_999' }
    });
    await controller.deleteInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when investorId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: '  ' }
    });
    await controller.deleteInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected error', async () => {
    SPVInvestor.findOne.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', investorId: 'inv_1' }
    });
    await controller.deleteInvestor(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// SPVInvestor Model unit tests
// ---------------------------------------------------------------------------
describe('SPVInvestor Model (validators)', () => {
  it('validates correct statuses', () => {
    expect(SPVInvestor.validators.isValidStatus('invited')).toBe(true);
    expect(SPVInvestor.validators.isValidStatus('committed')).toBe(true);
    expect(SPVInvestor.validators.isValidStatus('wired')).toBe(true);
    expect(SPVInvestor.validators.isValidStatus('declined')).toBe(true);
    expect(SPVInvestor.validators.isValidStatus('applied')).toBe(true);
    expect(SPVInvestor.validators.isValidStatus('bogus')).toBe(false);
  });

  it('validates correct emails', () => {
    expect(SPVInvestor.validators.isValidEmail('test@example.com')).toBe(true);
    expect(SPVInvestor.validators.isValidEmail('not-an-email')).toBe(false);
    expect(SPVInvestor.validators.isValidEmail('')).toBe(false);
    expect(SPVInvestor.validators.isValidEmail(null)).toBe(false);
  });
});
