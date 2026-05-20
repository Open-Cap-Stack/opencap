/**
 * SPV Status Transition Tests (Issue #580)
 * Tests for PUT /api/v1/spv/:id/status lifecycle endpoint
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../models/SPV', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  findByIdAndDelete: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  LEGACY_STATUS_MAP: {
    active: 'raising',
    inactive: 'draft',
    dissolved: 'canceled',
    pending: 'in_review',
    closed: 'wired',
    liquidated: 'canceled'
  },
  TRANSITION_RULES: {
    draft: ['in_review', 'canceled'],
    in_review: ['raising', 'draft', 'canceled'],
    raising: ['closing', 'canceled'],
    closing: ['wired', 'canceled'],
    wired: ['canceled'],
    canceled: []
  },
  REQUIRED_STEPS_FOR_REVIEW: ['terms', 'adviser', 'memo', 'carry'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview'],
  VALID_COMPANY_STAGES: ['pre-seed', 'seed', 'series-a', 'series-b', 'post-revenue', 'other'],
  VALID_INCORPORATION_TYPES: ['c-corp', 'llc', 's-corp', 'other'],
  VALID_MONTHS_OF_RUNWAY: ['less-than-12', '12-or-more'],
  VALID_TRANSACTION_TYPES: ['primary', 'secondary'],
  VALID_INSTRUMENTS: ['safe', 'convertible-note', 'preferred-equity', 'common-equity', 'other'],
  VALID_VALUATIONS: ['capped', 'uncapped'],
  VALID_ADVISER_TYPES: ['platform-advisor', 'self-advised'],
  normalizeStatus: jest.fn((status) => {
    if (!status) return 'draft';
    const lower = status.toLowerCase();
    const valid = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];
    if (valid.includes(lower)) return lower;
    const map = { active: 'raising', inactive: 'draft', dissolved: 'canceled', pending: 'in_review', closed: 'wired', liquidated: 'canceled' };
    return map[lower] || lower;
  }),
  validateTransition: jest.fn((from, to) => {
    const valid = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];
    if (!valid.includes(to)) {
      return { valid: false, reason: `Invalid target status '${to}'. Must be one of: ${valid.join(', ')}` };
    }
    if (to === 'canceled') return { valid: true };
    const rules = {
      draft: ['in_review', 'canceled'],
      in_review: ['raising', 'draft', 'canceled'],
      raising: ['closing', 'canceled'],
      closing: ['wired', 'canceled'],
      wired: ['canceled'],
      canceled: []
    };
    const allowed = rules[from];
    if (!allowed || !allowed.includes(to)) {
      return { valid: false, reason: `Transition from '${from}' to '${to}' is not allowed` };
    }
    return { valid: true };
  })
}));

const httpMocks = require('node-mocks-http');
const spvController = require('../../../controllers/SPV');
const SPV = require('../../../models/SPV');

describe('SPV Status Transition (Issue #580)', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { id: 'user-123', role: 'admin' };
    jest.clearAllMocks();
  });

  // Helper to build a mock SPV with given status and optional overrides
  function mockSPV(overrides = {}) {
    return {
      SPVID: 'spv_test-001',
      Name: 'Test SPV',
      Status: 'draft',
      statusHistory: [],
      wizardCompletedSteps: [],
      ...overrides
    };
  }

  describe('Valid transitions succeed', () => {
    it('should transition draft -> in_review when wizard steps are complete', async () => {
      const spv = mockSPV({
        Status: 'draft',
        wizardCompletedSteps: ['terms', 'adviser', 'memo', 'carry']
      });
      req.params = { id: spv.SPVID };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'in_review', statusHistory: [{ status: 'in_review', changedAt: expect.any(String), changedBy: 'user-123' }] });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.Status).toBe('in_review');
    });

    it('should transition draft -> canceled for admin', async () => {
      const spv = mockSPV({ Status: 'draft' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'canceled' };
      req.user = { id: 'admin-1', role: 'admin' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'canceled' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should transition in_review -> raising for admin user', async () => {
      const spv = mockSPV({ Status: 'in_review' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };
      req.user = { id: 'admin-1', role: 'admin' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'raising' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should transition in_review -> draft (rollback)', async () => {
      const spv = mockSPV({ Status: 'in_review' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'draft' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'draft' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should transition in_review -> raising for founder user', async () => {
      const spv = mockSPV({ Status: 'in_review' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };
      req.user = { id: 'founder-1', role: 'founder' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'raising' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should transition raising -> closing for admin', async () => {
      const spv = mockSPV({ Status: 'raising' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'closing' };
      req.user = { id: 'admin-1', role: 'admin' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'closing' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should transition raising -> closing for fund lead', async () => {
      const spv = mockSPV({ Status: 'raising', fundLead: 'lead-user-1' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'closing' };
      req.user = { id: 'lead-user-1', role: 'user' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'closing' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should transition closing -> wired for admin', async () => {
      const spv = mockSPV({ Status: 'closing' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'wired' };
      req.user = { id: 'admin-1', role: 'admin' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'wired' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should allow any status -> canceled for admin', async () => {
      for (const fromStatus of ['draft', 'in_review', 'raising', 'closing', 'wired']) {
        const spv = mockSPV({ Status: fromStatus });
        req.params = { id: spv.SPVID };
        req.body = { status: 'canceled' };
        req.user = { id: 'admin-1', role: 'admin' };

        SPV.findOne.mockResolvedValue(spv);
        SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'canceled' });

        const localRes = httpMocks.createResponse();
        await spvController.transitionStatus(req, localRes);
        expect(localRes.statusCode).toBe(200);
      }
    });

    it('should allow any status -> canceled for fund lead', async () => {
      for (const fromStatus of ['draft', 'in_review', 'raising', 'closing', 'wired']) {
        const spv = mockSPV({ Status: fromStatus, fundLead: 'lead-user-1' });
        req.params = { id: spv.SPVID };
        req.body = { status: 'canceled' };
        req.user = { id: 'lead-user-1', role: 'user' };

        SPV.findOne.mockResolvedValue(spv);
        SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'canceled' });

        const localRes = httpMocks.createResponse();
        await spvController.transitionStatus(req, localRes);
        expect(localRes.statusCode).toBe(200);
      }
    });
  });

  describe('Invalid transitions return 400', () => {
    it('should reject draft -> raising (skipping in_review)', async () => {
      const spv = mockSPV({ Status: 'draft' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('not allowed');
    });

    it('should reject wired -> raising (backward jump)', async () => {
      const spv = mockSPV({ Status: 'wired' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should reject canceled -> draft (terminal state)', async () => {
      const spv = mockSPV({ Status: 'canceled' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'draft' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid target status', async () => {
      const spv = mockSPV({ Status: 'draft' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'nonexistent' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Invalid target status');
    });

    it('should return 400 when status is missing from body', async () => {
      req.params = { id: 'spv_test-001' };
      req.body = {};

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Missing required field');
    });
  });

  describe('draft -> in_review without required wizard steps returns 400', () => {
    it('should return 400 with all missing steps when wizardCompletedSteps is empty', async () => {
      const spv = mockSPV({ Status: 'draft', wizardCompletedSteps: [] });
      req.params = { id: spv.SPVID };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('missing required wizard steps');
      expect(data.missingSteps).toEqual(['terms', 'adviser', 'memo', 'carry']);
    });

    it('should return 400 with only the specific missing steps', async () => {
      const spv = mockSPV({ Status: 'draft', wizardCompletedSteps: ['terms', 'carry'] });
      req.params = { id: spv.SPVID };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.missingSteps).toEqual(['adviser', 'memo']);
    });

    it('should return 400 when wizardCompletedSteps is undefined', async () => {
      const spv = mockSPV({ Status: 'draft' });
      delete spv.wizardCompletedSteps;
      req.params = { id: spv.SPVID };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.missingSteps).toEqual(['terms', 'adviser', 'memo', 'carry']);
    });
  });

  describe('in_review -> raising without admin/founder role returns 403', () => {
    it('should return 403 for non-admin/non-founder user', async () => {
      const spv = mockSPV({ Status: 'in_review' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };
      req.user = { id: 'user-456', role: 'user' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('admin');
      expect(data.message).toContain('founder');
    });

    it('should return 403 when user has no role', async () => {
      const spv = mockSPV({ Status: 'in_review' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };
      req.user = { id: 'user-789' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('should return 403 when no user on request', async () => {
      const spv = mockSPV({ Status: 'in_review' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'raising' };
      req.user = null;

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('raising -> closing guard (fund lead or admin)', () => {
    it('should return 403 for regular user who is not fund lead', async () => {
      const spv = mockSPV({ Status: 'raising', fundLead: 'lead-user-1' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'closing' };
      req.user = { id: 'other-user', role: 'user' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('fund lead');
    });

    it('should return 403 when no user on request', async () => {
      const spv = mockSPV({ Status: 'raising' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'closing' };
      req.user = null;

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('closing -> wired guard (admin only)', () => {
    it('should return 403 for non-admin user', async () => {
      const spv = mockSPV({ Status: 'closing' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'wired' };
      req.user = { id: 'user-456', role: 'founder' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('admin');
    });

    it('should return 403 for fund lead (admin only for wired)', async () => {
      const spv = mockSPV({ Status: 'closing', fundLead: 'lead-user-1' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'wired' };
      req.user = { id: 'lead-user-1', role: 'user' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('any -> canceled guard (fund lead or admin)', () => {
    it('should return 403 for regular user who is not fund lead', async () => {
      const spv = mockSPV({ Status: 'raising', fundLead: 'lead-user-1' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'canceled' };
      req.user = { id: 'other-user', role: 'user' };

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('fund lead');
    });

    it('should return 403 when no user on request', async () => {
      const spv = mockSPV({ Status: 'draft' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'canceled' };
      req.user = null;

      SPV.findOne.mockResolvedValue(spv);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('should allow founder to cancel', async () => {
      const spv = mockSPV({ Status: 'raising' });
      req.params = { id: spv.SPVID };
      req.body = { status: 'canceled' };
      req.user = { id: 'founder-1', role: 'founder' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockResolvedValue({ ...spv, Status: 'canceled' });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('statusHistory is appended correctly', () => {
    it('should append a new entry to existing statusHistory', async () => {
      const existingHistory = [
        { status: 'draft', changedAt: '2026-01-01T00:00:00.000Z', changedBy: 'system' }
      ];
      const spv = mockSPV({
        Status: 'draft',
        statusHistory: existingHistory,
        wizardCompletedSteps: ['terms', 'adviser', 'memo', 'carry']
      });
      req.params = { id: spv.SPVID };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockImplementation((filter, update) => {
        return Promise.resolve({
          ...spv,
          Status: 'in_review',
          statusHistory: update.$set.statusHistory
        });
      });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);

      // Verify findOneAndUpdate was called with appended history
      const updateCall = SPV.findOneAndUpdate.mock.calls[0];
      const updatedHistory = updateCall[1].$set.statusHistory;
      expect(updatedHistory).toHaveLength(2);
      expect(updatedHistory[0]).toEqual(existingHistory[0]);
      expect(updatedHistory[1].status).toBe('in_review');
      expect(updatedHistory[1].changedBy).toBe('user-123');
      expect(updatedHistory[1].changedAt).toBeDefined();
    });

    it('should create statusHistory array when it does not exist', async () => {
      const spv = mockSPV({ Status: 'draft' });
      delete spv.statusHistory;
      spv.wizardCompletedSteps = ['terms', 'adviser', 'memo', 'carry'];
      req.params = { id: spv.SPVID };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(spv);
      SPV.findOneAndUpdate.mockImplementation((filter, update) => {
        return Promise.resolve({
          ...spv,
          Status: 'in_review',
          statusHistory: update.$set.statusHistory
        });
      });

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(200);

      const updateCall = SPV.findOneAndUpdate.mock.calls[0];
      const updatedHistory = updateCall[1].$set.statusHistory;
      expect(updatedHistory).toHaveLength(1);
      expect(updatedHistory[0].status).toBe('in_review');
    });
  });

  describe('SPV not found', () => {
    it('should return 404 when SPV does not exist', async () => {
      req.params = { id: 'nonexistent-id' };
      req.body = { status: 'in_review' };

      SPV.findOne.mockResolvedValue(null);
      SPV.findById.mockResolvedValue(null);

      await spvController.transitionStatus(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Model-level transition validation', () => {
    // These test the SPV model's validateTransition and normalizeStatus directly
    // using the real implementation (not mocked)
    const realSPV = jest.requireActual('../../../models/SPV');

    it('normalizeStatus should map legacy values correctly', () => {
      expect(realSPV.normalizeStatus('active')).toBe('raising');
      expect(realSPV.normalizeStatus('inactive')).toBe('draft');
      expect(realSPV.normalizeStatus('dissolved')).toBe('canceled');
      expect(realSPV.normalizeStatus('pending')).toBe('in_review');
      expect(realSPV.normalizeStatus('closed')).toBe('wired');
      expect(realSPV.normalizeStatus('liquidated')).toBe('canceled');
    });

    it('normalizeStatus should return valid statuses unchanged', () => {
      expect(realSPV.normalizeStatus('draft')).toBe('draft');
      expect(realSPV.normalizeStatus('in_review')).toBe('in_review');
      expect(realSPV.normalizeStatus('raising')).toBe('raising');
      expect(realSPV.normalizeStatus('closing')).toBe('closing');
      expect(realSPV.normalizeStatus('wired')).toBe('wired');
      expect(realSPV.normalizeStatus('canceled')).toBe('canceled');
    });

    it('normalizeStatus should default to draft when null/undefined', () => {
      expect(realSPV.normalizeStatus(null)).toBe('draft');
      expect(realSPV.normalizeStatus(undefined)).toBe('draft');
    });

    it('validateTransition should accept valid transitions', () => {
      expect(realSPV.validateTransition('draft', 'in_review')).toEqual({ valid: true });
      expect(realSPV.validateTransition('draft', 'canceled')).toEqual({ valid: true });
      expect(realSPV.validateTransition('in_review', 'raising')).toEqual({ valid: true });
      expect(realSPV.validateTransition('in_review', 'draft')).toEqual({ valid: true });
      expect(realSPV.validateTransition('raising', 'closing')).toEqual({ valid: true });
      expect(realSPV.validateTransition('closing', 'wired')).toEqual({ valid: true });
    });

    it('validateTransition should reject invalid transitions', () => {
      expect(realSPV.validateTransition('draft', 'raising').valid).toBe(false);
      expect(realSPV.validateTransition('draft', 'wired').valid).toBe(false);
      expect(realSPV.validateTransition('wired', 'draft').valid).toBe(false);
      expect(realSPV.validateTransition('canceled', 'draft').valid).toBe(false);
    });

    it('validateTransition should always allow any -> canceled', () => {
      for (const status of ['draft', 'in_review', 'raising', 'closing', 'wired']) {
        expect(realSPV.validateTransition(status, 'canceled')).toEqual({ valid: true });
      }
    });
  });
});
