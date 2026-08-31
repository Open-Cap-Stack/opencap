/**
 * Tests for SPV wire transfer instructions and payment confirmation endpoints
 * Issue #749
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
const controller = require('../../../controllers/SPVInvestor');

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
  wireInstructions: {
    bankName: 'First National Bank',
    routingNumber: '021000021',
    accountNumber: '123456789',
    swiftCode: 'FNBKUS33',
    referencePrefix: 'ALPHA',
    specialInstructions: 'Include SPV ID in memo',
  },
};

beforeEach(() => jest.clearAllMocks());

describe('GET /spv/:id/wire-instructions — getWireInstructions', () => {
  it('returns wire instructions for committed LP', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1',
      status: 'committed', committedAmount: 50000,
    });

    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await controller.getWireInstructions(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.wireInstructions.bankName).toBe('First National Bank');
    expect(body.wireInstructions.routingNumber).toBe('021000021');
    expect(body.wireInstructions.wireReference).toBe('ALPHA-lp_1');
    expect(body.commitment.amount).toBe(50000);
  });

  it('returns wire instructions for wired LP', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1',
      status: 'wired', committedAmount: 50000,
    });

    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await controller.getWireInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 403 for invited (not committed) LP', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'invited',
    });

    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await controller.getWireInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].message).toContain('after commitment');
  });

  it('returns 403 for non-LP investor', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await controller.getWireInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 for missing SPV', async () => {
    SPV.findBySPVID.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'spv_missing' } });
    await controller.getWireInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 for empty SPV ID', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await controller.getWireInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on error', async () => {
    SPV.findBySPVID.mockRejectedValue(new Error('db error'));
    const { req, res } = mockReqRes({ params: { id: 'spv_001' } });
    await controller.getWireInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /spv/:id/confirm-wire — confirmWireReceipt', () => {
  it('confirms wire and updates LP to wired status', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'committed',
    });
    SPVInvestor.findOneAndUpdate.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', status: 'wired', wiredAmount: 50000,
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { investorId: 'lp_1', wiredAmount: 50000, wireReference: 'ALPHA-lp_1' },
      user: { userId: 'admin_1', role: 'admin', email: 'admin@test.com', companyId: 'comp_1' },
    });
    await controller.confirmWireReceipt(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].investor.status).toBe('wired');
  });

  it('rejects non-committed LP', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue({
      _id: 'lp_1', spvId: 'spv_001', userId: 'inv_1', status: 'invited',
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { investorId: 'lp_1', wiredAmount: 50000 },
      user: { userId: 'admin_1', role: 'admin' },
    });
    await controller.confirmWireReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('committed');
  });

  it('returns 404 for missing investor', async () => {
    SPV.findBySPVID.mockResolvedValue(MOCK_SPV);
    SPVInvestor.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { investorId: 'lp_missing', wiredAmount: 50000 },
      user: { userId: 'admin_1', role: 'admin' },
    });
    await controller.confirmWireReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 for missing SPV', async () => {
    SPV.findBySPVID.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_missing' },
      body: { investorId: 'lp_1', wiredAmount: 50000 },
      user: { userId: 'admin_1', role: 'admin' },
    });
    await controller.confirmWireReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 for missing investorId', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { wiredAmount: 50000 },
      user: { userId: 'admin_1', role: 'admin' },
    });
    await controller.confirmWireReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid wiredAmount', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { investorId: 'lp_1', wiredAmount: -100 },
      user: { userId: 'admin_1', role: 'admin' },
    });
    await controller.confirmWireReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on error', async () => {
    SPV.findBySPVID.mockRejectedValue(new Error('db error'));
    const { req, res } = mockReqRes({
      params: { id: 'spv_001' },
      body: { investorId: 'lp_1', wiredAmount: 50000 },
      user: { userId: 'admin_1', role: 'admin' },
    });
    await controller.confirmWireReceipt(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('Route configuration for #749', () => {
  it('GET /:id/wire-instructions route exists', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'), 'utf8'
    );
    expect(src).toContain("/:id/wire-instructions");
    expect(src).toContain("'investor'");
  });

  it('POST /:id/confirm-wire route exists (admin only)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'), 'utf8'
    );
    expect(src).toContain("/:id/confirm-wire");
  });
});
