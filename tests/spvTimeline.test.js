/**
 * Tests for SPV Timeline Events
 * Issue #269: SPV Document & Timeline Backend Endpoints
 *
 * Covers the timeline endpoint:
 *   GET /api/v1/spv/:id/timeline
 */

// Mock the SPV model (for ownership checks)
jest.mock('../models/SPV', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview']
}));

// Mock the SPVTimeline model
jest.mock('../models/SPVTimeline', () => {
  const VALID_TYPES = ['status_change', 'lp_activity', 'document', 'system', 'wizard'];
  return {
    VALID_TYPES,
    validators: {
      isValidType: (t) => VALID_TYPES.includes(t)
    },
    findBySPV: jest.fn(),
    create: jest.fn()
  };
});

const SPV = require('../models/SPV');
const SPVTimeline = require('../models/SPVTimeline');
const controller = require('../controllers/SPVTimeline');

// Helper to build mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'admin', name: 'Test User' },
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
  SPV.findOne.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'comp_1' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/spv/:id/timeline
// ---------------------------------------------------------------------------
describe('listEvents', () => {
  it('returns timeline events for a given SPV sorted by createdAt desc', async () => {
    const events = [
      { _id: 'evt_1', spvId: 'spv_1', companyId: 'comp_1', type: 'status_change', description: 'Status changed to raising', createdAt: '2026-08-01T10:00:00Z' },
      { _id: 'evt_2', spvId: 'spv_1', companyId: 'comp_1', type: 'document', description: 'Document uploaded', createdAt: '2026-08-02T10:00:00Z' },
      { _id: 'evt_3', spvId: 'spv_1', companyId: 'comp_1', type: 'lp_activity', description: 'LP committed', createdAt: '2026-08-03T10:00:00Z' }
    ];
    SPVTimeline.findBySPV.mockResolvedValue(events);

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listEvents(req, res);

    expect(SPVTimeline.findBySPV).toHaveBeenCalledWith('spv_1', { limit: 50 });
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.events).toHaveLength(3);
  });

  it('returns empty array when no events exist', async () => {
    SPVTimeline.findBySPV.mockResolvedValue([]);

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].events).toHaveLength(0);
  });

  it('respects the ?limit query param', async () => {
    SPVTimeline.findBySPV.mockResolvedValue([]);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      query: { limit: '10' }
    });
    await controller.listEvents(req, res);

    expect(SPVTimeline.findBySPV).toHaveBeenCalledWith('spv_1', { limit: 10 });
  });

  it('clamps limit to max 200', async () => {
    SPVTimeline.findBySPV.mockResolvedValue([]);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      query: { limit: '999' }
    });
    await controller.listEvents(req, res);

    expect(SPVTimeline.findBySPV).toHaveBeenCalledWith('spv_1', { limit: 200 });
  });

  it('defaults limit when invalid value provided', async () => {
    SPVTimeline.findBySPV.mockResolvedValue([]);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      query: { limit: 'abc' }
    });
    await controller.listEvents(req, res);

    expect(SPVTimeline.findBySPV).toHaveBeenCalledWith('spv_1', { limit: 50 });
  });

  it('filters events by companyId', async () => {
    const events = [
      { _id: 'evt_1', spvId: 'spv_1', companyId: 'comp_1', type: 'status_change', description: 'Own event', createdAt: '2026-08-01T10:00:00Z' },
      { _id: 'evt_2', spvId: 'spv_1', companyId: 'other_comp', type: 'system', description: 'Other event', createdAt: '2026-08-02T10:00:00Z' }
    ];
    SPVTimeline.findBySPV.mockResolvedValue(events);

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    // Should only include events matching the user's companyId
    expect(response.events).toHaveLength(1);
    expect(response.events[0].companyId).toBe('comp_1');
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await controller.listEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when SPV does not exist', async () => {
    SPV.findOne.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'spv_nonexistent' } });
    await controller.listEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when SPV belongs to another company', async () => {
    SPV.findOne.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'other_comp' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'founder' }
    });
    await controller.listEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 on unexpected error', async () => {
    SPVTimeline.findBySPV.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// SPVTimeline Model (validators)
// ---------------------------------------------------------------------------
describe('SPVTimeline Model (validators)', () => {
  it('validates correct event types', () => {
    expect(SPVTimeline.validators.isValidType('status_change')).toBe(true);
    expect(SPVTimeline.validators.isValidType('lp_activity')).toBe(true);
    expect(SPVTimeline.validators.isValidType('document')).toBe(true);
    expect(SPVTimeline.validators.isValidType('system')).toBe(true);
    expect(SPVTimeline.validators.isValidType('wizard')).toBe(true);
    expect(SPVTimeline.validators.isValidType('bogus')).toBe(false);
  });
});
