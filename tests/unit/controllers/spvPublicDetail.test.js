/**
 * Tests for investor-facing SPV detail and commitment endpoints
 * Issue #748
 */

jest.mock('../../../models/SPV', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findBySPVID: jest.fn(),
  find: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview'],
  VALID_COMPANY_STAGES: ['pre-seed', 'seed', 'series-a', 'series-b', 'post-revenue', 'other'],
  VALID_INCORPORATION_TYPES: ['c-corp', 'llc', 's-corp', 'other'],
  VALID_MONTHS_OF_RUNWAY: ['less-than-12', '12-or-more'],
  VALID_TRANSACTION_TYPES: ['primary', 'secondary'],
  VALID_INSTRUMENTS: ['safe', 'convertible-note', 'preferred-equity', 'common-equity', 'other'],
  VALID_VALUATIONS: ['capped', 'uncapped'],
  VALID_ADVISER_TYPES: ['platform-advisor', 'self-advised'],
  normalizeStatus: jest.fn((s) => s),
}));

jest.mock('../../../models/SPVInvestor', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findBySPV: jest.fn(),
  findOneAndUpdate: jest.fn(),
  VALID_STATUSES: ['invited', 'applied', 'committed', 'wired', 'declined'],
  validators: {
    isValidStatus: (s) => ['invited', 'applied', 'committed', 'wired', 'declined'].includes(s),
    isValidEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
  },
  generateInviteToken: jest.fn(() => 'mock-token'),
}));

const SPV = require('../../../models/SPV');
const SPVInvestor = require('../../../models/SPVInvestor');
const spvController = require('../../../controllers/SPV');
const spvInvestorController = require('../../../controllers/SPVInvestor');

function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { userId: 'inv_1', role: 'investor', email: 'inv@test.com', companyId: 'comp_1' },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

const MOCK_SPV = {
  SPVID: 'spv_001',
  Name: 'Alpha Fund',
  Purpose: 'Series A investment',
  Status: 'raising',
  CreationDate: '2026-01-01',
  companyLegalName: 'Alpha Inc.',
  lpMinimumInvestment: 25000,
  valuationCap: 10000000,
  carryPercentage: 20,
  memo: 'Invest in alpha',
  pitchDeckUrl: 'https://example.com/deck.pdf',
  founderEmails: ['founder@alpha.com'],
  statusHistory: [{ status: 'draft', changedAt: '2025-12-01' }],
  dealPartners: [{ userId: 'gp_1', carryPercentage: 15 }],
  gpCommitmentAmount: 50000,
  wizardStep: 4,
  wizardCompletedSteps: ['terms', 'adviser', 'memo', 'carry'],
};

beforeEach(() => jest.clearAllMocks());

describe('GET /spv/:id/public — getPublicSPVDetail', () => {
  it('returns public fields for LP investor', async () => {
    SPV.findOne.mockResolvedValue(MOCK_SPV);
    SPVInvestor.find.mockResolvedValue([{ spvId: 'spv_001', userId: 'inv_1', status: 'invited', committedAmount: 0, wiredAmount: 0 }]);

    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await spvController.getPublicSPVDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.spv.Name).toBe('Alpha Fund');
    expect(body.spv.valuationCap).toBe(10000000);
    expect(body.spv.memo).toBe('Invest in alpha');
    expect(body.spv.founderEmails).toBeUndefined();
    expect(body.spv.statusHistory).toBeUndefined();
    expect(body.spv.dealPartners).toBeUndefined();
    expect(body.spv.gpCommitmentAmount).toBeUndefined();
    expect(body.spv.wizardStep).toBeUndefined();
    expect(body.spv.wizardCompletedSteps).toBeUndefined();
    expect(body.myCommitment).toBeDefined();
    expect(body.myCommitment.status).toBe('invited');
  });

  it('returns 403 for investor with no LP record', async () => {
    SPV.findOne.mockResolvedValue(MOCK_SPV);
    SPVInvestor.find.mockResolvedValue([]);

    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await spvController.getPublicSPVDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 for non-existent SPV', async () => {
    SPV.findOne.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'spv_missing' } });
    await spvController.getPublicSPVDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 for empty ID', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await spvController.getPublicSPVDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows admin role without LP record', async () => {
    SPV.findOne.mockResolvedValue(MOCK_SPV);
    SPVInvestor.find.mockResolvedValue([]);

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      user: { userId: 'admin_1', role: 'admin', email: 'admin@test.com', companyId: 'comp_1' },
    });
    await spvController.getPublicSPVDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].myCommitment).toBeNull();
  });

  it('returns 500 on unexpected error', async () => {
    SPV.findOne.mockRejectedValue(new Error('db error'));
    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await spvController.getPublicSPVDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /spv/:id/commit — commitToSPV', () => {
  it('commits investor with valid amount and acceptTerms', async () => {
    SPV.findBySPVID.mockResolvedValue({ ...MOCK_SPV, lpMinimumInvestment: 25000 });
    SPVInvestor.findOne.mockResolvedValue({ _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'invited' });
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1',
      status: 'committed', committedAmount: 50000,
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.investor.status).toBe('committed');
    expect(body.investor.committedAmount).toBe(50000);
  });

  it('rejects commitment below minimum investment', async () => {
    SPV.findBySPVID.mockResolvedValue({ ...MOCK_SPV, lpMinimumInvestment: 25000 });
    SPVInvestor.findOne.mockResolvedValue({ _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'invited' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 10000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('at least');
  });

  it('rejects when acceptTerms is false', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 50000, acceptTerms: false },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('accept');
  });

  it('rejects when amount is not a positive number', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: -100, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 for non-existent SPV', async () => {
    SPV.findBySPVID.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_missing' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 for non-LP investor', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects commitment from already-wired investor', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({ _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'wired' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('already wired');
  });

  it('rejects commitment from declined investor', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({ _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'declined' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('declined');
  });

  it('returns 400 for empty SPV ID', async () => {
    const { req, res } = mockReqRes({
      params: { id: '  ' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected error', async () => {
    SPV.findBySPVID.mockRejectedValue(new Error('db error'));
    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { amount: 50000, acceptTerms: true },
    });
    await spvInvestorController.commitToSPV(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('Route configuration for #748', () => {
  it('GET /:id/public route exists and allows investor role', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'), 'utf8'
    );
    const match = src.match(/router\.get\('\/:id\/public'/);
    expect(match).toBeTruthy();
    expect(src).toContain("'investor'");
  });

  it('POST /:id/commit route exists and allows investor role', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'), 'utf8'
    );
    const match = src.match(/router\.post\('\/:id\/commit'/);
    expect(match).toBeTruthy();
    expect(src).toContain("'investor'");
  });
});
