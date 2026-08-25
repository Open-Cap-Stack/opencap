/**
 * MaterialEvent Controller - Required Field Validation Tests
 * Issue #168: createEvent has no required field validation
 *
 * Validates that createEvent rejects requests missing companyId (from user
 * context) or eventType, and rejects invalid eventType values.
 */

const httpMocks = require('node-mocks-http');
const materialEventController = require('../../../controllers/materialEventController');

jest.mock('../../../models/MaterialEvent');
const MaterialEvent = require('../../../models/MaterialEvent');

describe('MaterialEventController - createEvent validation', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user-1', companyId: 'comp-1' };
  });

  // ── companyId validation ──────────────────────────────────────────────

  it('should return 400 when user has no companyId', async () => {
    req.user = { userId: 'user-1' }; // no companyId
    req.body = { eventType: 'financing_round' };

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('companyId');
  });

  it('should return 400 when req.user is null', async () => {
    req.user = null;
    req.body = { eventType: 'financing_round' };

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('companyId');
  });

  it('should return 400 when req.user is undefined', async () => {
    delete req.user;
    req.body = { eventType: 'financing_round' };

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('companyId');
  });

  it('should ignore companyId from req.body and use req.user.companyId', async () => {
    req.user = { userId: 'user-1', companyId: 'comp-from-user' };
    req.body = {
      companyId: 'comp-from-body',
      eventType: 'litigation',
      description: 'Patent suit'
    };
    MaterialEvent.create.mockResolvedValue({ eventId: 'evt-1', companyId: 'comp-from-user' });

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(201);
    expect(MaterialEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'comp-from-user' })
    );
    // Ensure body's companyId was NOT passed
    const callArg = MaterialEvent.create.mock.calls[0][0];
    expect(callArg.companyId).toBe('comp-from-user');
  });

  // ── eventType validation ──────────────────────────────────────────────

  it('should return 400 when eventType is missing', async () => {
    req.body = { description: 'Something happened' };

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('eventType is required');
  });

  it('should return 400 when eventType is empty string', async () => {
    req.body = { eventType: '' };

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('eventType is required');
  });

  it('should return 400 when eventType is invalid', async () => {
    req.body = { eventType: 'not_a_real_event' };

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.message).toContain("Invalid eventType 'not_a_real_event'");
  });

  // ── validation order ──────────────────────────────────────────────────

  it('should check companyId before eventType', async () => {
    req.user = { userId: 'user-1' }; // no companyId
    req.body = {}; // no eventType either

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('companyId');
  });

  // ── happy path with validation ────────────────────────────────────────

  it('should succeed with valid companyId from user and valid eventType', async () => {
    req.body = {
      eventType: 'financing_round',
      description: 'Series A round'
    };
    const mockEvent = { eventId: 'evt-1', companyId: 'comp-1', eventType: 'financing_round' };
    MaterialEvent.create.mockResolvedValue(mockEvent);

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.eventType).toBe('financing_round');
  });

  it('should accept all valid eventType values', async () => {
    const validTypes = [
      'financing_round', 'down_round', 'bridge_financing',
      'board_composition_change', 'stock_split', 'reverse_split',
      'significant_revenue_change', 'major_customer_win', 'major_customer_loss',
      'key_executive_change', 'key_employee_departure', 'key_employee_hire',
      'litigation', 'regulatory_change', 'ma_activity',
      'acquisition_offer', 'merger_discussion', 'going_concern_doubt',
      'ip_event', 'product_launch', 'product_failure', 'market_disruption',
      'ipo_filing', 'ipo_preparation', 'secondary_transaction',
      'significant_transaction', 'other'
    ];

    for (const eventType of validTypes) {
      jest.clearAllMocks();
      req = httpMocks.createRequest();
      res = httpMocks.createResponse();
      req.user = { userId: 'user-1', companyId: 'comp-1' };
      req.body = { eventType };
      MaterialEvent.create.mockResolvedValue({ eventId: 'evt-1', eventType });

      await materialEventController.createEvent(req, res);

      expect(res.statusCode).toBe(201);
    }
  });

  // ── MaterialEvent.create is NOT called on validation failure ──────────

  it('should not call MaterialEvent.create when validation fails', async () => {
    req.body = {}; // missing eventType
    req.user = { userId: 'user-1' }; // missing companyId

    await materialEventController.createEvent(req, res);

    expect(res.statusCode).toBe(400);
    expect(MaterialEvent.create).not.toHaveBeenCalled();
  });
});
