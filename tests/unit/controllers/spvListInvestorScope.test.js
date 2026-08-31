/**
 * Tests for investor-scoped SPV listing (GET /api/v1/spv/)
 * Issues #269 & #271
 */

jest.mock('../../../models/SPV', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview'],
  normalizeStatus: jest.fn((s) => s),
}));

jest.mock('../../../models/SPVInvestor', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  VALID_STATUSES: ['invited', 'applied', 'committed', 'wired', 'declined'],
  validators: {
    isValidStatus: (s) => ['invited', 'applied', 'committed', 'wired', 'declined'].includes(s),
  },
}));

const SPV = require('../../../models/SPV');
const SPVInvestor = require('../../../models/SPVInvestor');
const spvController = require('../../../controllers/SPV');

function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'admin', email: 'admin@test.com' },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

beforeEach(() => jest.clearAllMocks());

describe('getSPVs — investor role scoping', () => {
  it('returns only SPVs where the investor is an LP (by userId)', async () => {
    SPVInvestor.find.mockResolvedValue([
      { spvId: 'spv_1', userId: 'inv_user_1' },
      { spvId: 'spv_3', userId: 'inv_user_1' },
    ]);
    SPV.findOne.mockImplementation(async (filter) => {
      if (filter.SPVID === 'spv_1') return { SPVID: 'spv_1', Name: 'Alpha Fund', Status: 'raising' };
      if (filter.SPVID === 'spv_3') return { SPVID: 'spv_3', Name: 'Gamma Fund', Status: 'closing' };
      return null;
    });

    const { req, res } = mockReqRes({ user: { userId: 'inv_user_1', role: 'investor', email: 'inv@test.com' } });
    await spvController.getSPVs(req, res);

    expect(SPVInvestor.find).toHaveBeenCalledWith({ userId: 'inv_user_1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].spvs).toHaveLength(2);
  });

  it('falls back to email lookup when userId yields no LP records', async () => {
    SPVInvestor.find.mockResolvedValueOnce([]);
    SPVInvestor.find.mockResolvedValueOnce([{ spvId: 'spv_2', email: 'inv@test.com' }]);
    SPV.findOne.mockResolvedValue({ SPVID: 'spv_2', Name: 'Beta Fund', Status: 'raising' });

    const { req, res } = mockReqRes({ user: { userId: 'inv_user_1', role: 'investor', email: 'inv@test.com' } });
    await spvController.getSPVs(req, res);

    expect(SPVInvestor.find).toHaveBeenCalledTimes(2);
    expect(SPVInvestor.find).toHaveBeenNthCalledWith(2, { email: 'inv@test.com' });
    expect(res.json.mock.calls[0][0].spvs).toHaveLength(1);
  });

  it('returns empty list when investor has no LP records', async () => {
    SPVInvestor.find.mockResolvedValue([]);
    const { req, res } = mockReqRes({ user: { userId: 'inv_user_1', role: 'investor', email: 'inv@test.com' } });
    await spvController.getSPVs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].spvs).toHaveLength(0);
  });

  it('deduplicates SPV IDs from multiple LP records', async () => {
    SPVInvestor.find.mockResolvedValue([
      { spvId: 'spv_1', userId: 'inv_user_1' },
      { spvId: 'spv_1', userId: 'inv_user_1' },
    ]);
    SPV.findOne.mockResolvedValue({ SPVID: 'spv_1', Name: 'Alpha Fund', Status: 'raising' });

    const { req, res } = mockReqRes({ user: { userId: 'inv_user_1', role: 'investor', email: 'inv@test.com' } });
    await spvController.getSPVs(req, res);

    expect(SPV.findOne).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].spvs).toHaveLength(1);
  });

  it('filters out LP records where SPV no longer exists', async () => {
    SPVInvestor.find.mockResolvedValue([
      { spvId: 'spv_1', userId: 'inv_user_1' },
      { spvId: 'spv_deleted', userId: 'inv_user_1' },
    ]);
    SPV.findOne.mockImplementation(async (filter) => {
      if (filter.SPVID === 'spv_1') return { SPVID: 'spv_1', Name: 'Alpha Fund', Status: 'raising' };
      return null;
    });
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ user: { userId: 'inv_user_1', role: 'investor', email: 'inv@test.com' } });
    await spvController.getSPVs(req, res);

    expect(res.json.mock.calls[0][0].spvs).toHaveLength(1);
  });

  it('returns 500 on unexpected error', async () => {
    SPVInvestor.find.mockRejectedValue(new Error('db down'));
    const { req, res } = mockReqRes({ user: { userId: 'inv_user_1', role: 'investor', email: 'inv@test.com' } });
    await spvController.getSPVs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('non-investor roles use company-scoped listing', async () => {
    SPV.find.mockResolvedValue([{ SPVID: 'spv_1', Name: 'Alpha Fund', Status: 'raising', ParentCompanyID: 'comp_1' }]);
    const { req, res } = mockReqRes({ user: { userId: 'admin_1', role: 'admin', companyId: 'comp_1' } });
    await spvController.getSPVs(req, res);

    expect(SPVInvestor.find).not.toHaveBeenCalled();
    expect(SPV.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('SPV route role configuration', () => {
  it('GET / route allows investor role', () => {
    const routesSource = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'),
      'utf8'
    );
    const match = routesSource.match(/router\.get\('\/'\s*,\s*hasRole\(\[([^\]]+)\]\)/);
    expect(match).toBeTruthy();
    expect(match[1]).toContain("'investor'");
  });

  it('GET /:id/documents route allows investor role', () => {
    const routesSource = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'),
      'utf8'
    );
    const match = routesSource.match(/router\.get\('\/:id\/documents'\s*,\s*hasRole\(\[([^\]]+)\]\)/);
    expect(match).toBeTruthy();
    expect(match[1]).toContain("'investor'");
  });

  it('GET /:id/timeline route allows investor role', () => {
    const routesSource = require('fs').readFileSync(
      require('path').join(__dirname, '../../../routes/v1/spvRoutes.js'),
      'utf8'
    );
    const match = routesSource.match(/router\.get\('\/:id\/timeline'\s*,\s*hasRole\(\[([^\]]+)\]\)/);
    expect(match).toBeTruthy();
    expect(match[1]).toContain("'investor'");
  });
});
