/**
 * Tests for SPV invite token persistence and validation
 * Issue #755
 */

jest.mock('../../../models/SPV', () => ({
  findBySPVID: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview'],
  normalizeStatus: jest.fn((s) => s),
}));

jest.mock('../../../models/SPVInvestor', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findBySPV: jest.fn(),
  findByInviteToken: jest.fn(),
  generateInviteToken: jest.fn(() => 'mock-token-abc123def456'),
  VALID_STATUSES: ['invited', 'applied', 'committed', 'wired', 'declined'],
  validators: {
    isValidStatus: (s) => ['invited', 'applied', 'committed', 'wired', 'declined'].includes(s),
    isValidEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
  },
}));

jest.mock('../../../services/emailService', () => ({
  sendSPVInvite: jest.fn().mockResolvedValue(true),
}));

const SPV = require('../../../models/SPV');
const SPVInvestor = require('../../../models/SPVInvestor');
const controller = require('../../../controllers/SPVInvestor');

function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { userId: 'admin_1', role: 'admin', companyId: 'comp_1', email: 'admin@test.com' },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

beforeEach(() => jest.clearAllMocks());

describe('getInviteLink — token persistence', () => {
  it('creates an SPVInvestor placeholder with inviteToken and expiry', async () => {
    SPV.findBySPVID.mockResolvedValue({ SPVID: 'spv_1', Name: 'Alpha', ParentCompanyID: 'comp_1' });
    SPVInvestor.create.mockResolvedValue({ inviteToken: 'mock-token-abc123def456', spvId: 'spv_1' });

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.getInviteLink(req, res);

    expect(SPVInvestor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spvId: 'spv_1',
        inviteToken: 'mock-token-abc123def456',
        inviteTokenExpiry: expect.any(String),
        status: 'invited',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.token).toBe('mock-token-abc123def456');
    expect(response.expiresAt).toBeDefined();
    expect(response.url).toContain('/spv/join/mock-token-abc123def456');
  });

  it('returns 400 for empty SPV ID', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await controller.getInviteLink(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when SPV not found', async () => {
    SPV.findBySPVID.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'nonexistent' } });
    await controller.getInviteLink(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('joinViaToken — token validation', () => {
  it('returns SPV details for valid token', async () => {
    SPVInvestor.findByInviteToken.mockResolvedValue({
      inviteToken: 'valid-token',
      spvId: 'spv_1',
      email: 'investor@test.com',
      status: 'invited',
      invitedAt: '2026-08-01T00:00:00Z',
      inviteTokenExpiry: new Date(Date.now() + 86400000).toISOString(),
    });
    SPV.findBySPVID.mockResolvedValue({
      SPVID: 'spv_1',
      Name: 'Alpha Fund',
      Purpose: 'Investment',
      Status: 'raising',
      lpMinimumInvestment: 25000,
      valuationCap: 10000000,
      memo: 'Great opportunity',
    });

    const { req, res } = mockReqRes({ params: { token: 'valid-token' }, user: undefined });
    await controller.joinViaToken(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.valid).toBe(true);
    expect(response.spv.name).toBe('Alpha Fund');
    expect(response.spv.spvId).toBe('spv_1');
    expect(response.investor.email).toBe('investor@test.com');
  });

  it('returns 404 for invalid token', async () => {
    SPVInvestor.findByInviteToken.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { token: 'invalid-token' }, user: undefined });
    await controller.joinViaToken(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toContain('Invalid');
  });

  it('returns 410 for expired token', async () => {
    SPVInvestor.findByInviteToken.mockResolvedValue({
      inviteToken: 'expired-token',
      spvId: 'spv_1',
      email: 'investor@test.com',
      status: 'invited',
      inviteTokenExpiry: new Date(Date.now() - 86400000).toISOString(),
    });

    const { req, res } = mockReqRes({ params: { token: 'expired-token' }, user: undefined });
    await controller.joinViaToken(req, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json.mock.calls[0][0].message).toContain('expired');
  });

  it('returns 400 for empty token', async () => {
    const { req, res } = mockReqRes({ params: { token: '  ' }, user: undefined });
    await controller.joinViaToken(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when SPV no longer exists', async () => {
    SPVInvestor.findByInviteToken.mockResolvedValue({
      inviteToken: 'valid-token',
      spvId: 'deleted-spv',
      email: 'investor@test.com',
      status: 'invited',
      inviteTokenExpiry: new Date(Date.now() + 86400000).toISOString(),
    });
    SPV.findBySPVID.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { token: 'valid-token' }, user: undefined });
    await controller.joinViaToken(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toContain('no longer exists');
  });

  it('accepts token without expiry (legacy tokens)', async () => {
    SPVInvestor.findByInviteToken.mockResolvedValue({
      inviteToken: 'legacy-token',
      spvId: 'spv_1',
      email: 'investor@test.com',
      status: 'invited',
    });
    SPV.findBySPVID.mockResolvedValue({
      SPVID: 'spv_1',
      Name: 'Alpha Fund',
      Status: 'raising',
    });

    const { req, res } = mockReqRes({ params: { token: 'legacy-token' }, user: undefined });
    await controller.joinViaToken(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].valid).toBe(true);
  });

  it('returns 500 on unexpected error', async () => {
    SPVInvestor.findByInviteToken.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({ params: { token: 'any-token' }, user: undefined });
    await controller.joinViaToken(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
