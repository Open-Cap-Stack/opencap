/**
 * MaterialEvent Controller Tests
 *
 * Unit tests for material event tracking: CRUD, status transitions,
 * action items, compliance dashboard, and auto-detection endpoints.
 */

const httpMocks = require('node-mocks-http');
const materialEventController = require('../../../controllers/materialEventController');

jest.mock('../../../models/MaterialEvent');
const MaterialEvent = require('../../../models/MaterialEvent');

describe('MaterialEventController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user-1', companyId: 'comp-1' };
  });

  // ─── createEvent ───────────────────────────────────────────────────────

  describe('createEvent', () => {
    it('should create a material event successfully', async () => {
      req.body = {
        eventType: 'financing_round',
        description: 'Series A round',
        triggersValuation: true,
        impactSeverity: 'high'
      };
      const mockEvent = { eventId: 'evt-1', companyId: 'comp-1', ...req.body };
      MaterialEvent.create.mockResolvedValue(mockEvent);

      await materialEventController.createEvent(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.eventType).toBe('financing_round');
    });

    it('should set default eventDate if not provided', async () => {
      req.body = { eventType: 'litigation' };
      MaterialEvent.create.mockResolvedValue({ eventId: 'evt-1' });

      await materialEventController.createEvent(req, res);

      expect(MaterialEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventDate: expect.any(String),
          detectionSource: 'manual',
          detectedBy: 'user-1',
          createdBy: 'user-1'
        })
      );
    });

    it('should include statusHistory in created event', async () => {
      req.body = { eventType: 'key_executive_change' };
      MaterialEvent.create.mockResolvedValue({ eventId: 'evt-1' });

      await materialEventController.createEvent(req, res);

      expect(MaterialEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusHistory: expect.arrayContaining([
            expect.objectContaining({ status: 'detected', reason: 'Event created manually' })
          ])
        })
      );
    });

    it('should return 400 on creation error', async () => {
      req.body = { eventType: 'litigation' };
      MaterialEvent.create.mockRejectedValue(new Error('Validation error'));

      await materialEventController.createEvent(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Validation error');
    });

    it('should return 400 when user is null (no companyId)', async () => {
      req.user = null;
      req.body = { eventType: 'litigation' };

      await materialEventController.createEvent(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('companyId');
    });

    it('should pass all optional fields', async () => {
      req.body = {
        eventType: 'litigation',
        eventDate: '2026-03-01',
        description: 'Patent suit',
        triggersValuation: false,
        impactSeverity: 'medium',
        valuationImpactReason: 'Potential damages',
        relatedEntities: ['entity-1'],
        notes: 'Watch closely',
        tags: ['legal'],
        metadata: { caseNumber: '123' }
      };
      MaterialEvent.create.mockResolvedValue({ eventId: 'evt-1' });

      await materialEventController.createEvent(req, res);

      expect(MaterialEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventDate: '2026-03-01',
          notes: 'Watch closely',
          tags: ['legal'],
          metadata: { caseNumber: '123' }
        })
      );
    });
  });

  // ─── getCompanyEvents ──────────────────────────────────────────────────

  describe('getCompanyEvents', () => {
    it('should return paginated events for a company', async () => {
      req.params = { companyId: 'comp-1' };
      req.query = {};
      MaterialEvent.find.mockResolvedValue([
        { eventId: 'e1', eventType: 'litigation' },
        { eventId: 'e2', eventType: 'financing_round' }
      ]);
      MaterialEvent.countDocuments.mockResolvedValue(2);

      await materialEventController.getCompanyEvents(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(20);
    });

    it('should filter by status', async () => {
      req.params = { companyId: 'comp-1' };
      req.query = { status: 'detected' };
      MaterialEvent.find.mockResolvedValue([]);
      MaterialEvent.countDocuments.mockResolvedValue(0);

      await materialEventController.getCompanyEvents(req, res);

      expect(MaterialEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'comp-1', status: 'detected' }),
        expect.any(Object)
      );
    });

    it('should filter by eventType', async () => {
      req.params = { companyId: 'comp-1' };
      req.query = { eventType: 'financing_round' };
      MaterialEvent.find.mockResolvedValue([]);
      MaterialEvent.countDocuments.mockResolvedValue(0);

      await materialEventController.getCompanyEvents(req, res);

      expect(MaterialEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'financing_round' }),
        expect.any(Object)
      );
    });

    it('should filter by triggersValuation boolean', async () => {
      req.params = { companyId: 'comp-1' };
      req.query = { triggersValuation: 'true' };
      MaterialEvent.find.mockResolvedValue([]);
      MaterialEvent.countDocuments.mockResolvedValue(0);

      await materialEventController.getCompanyEvents(req, res);

      expect(MaterialEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({ triggersValuation: true }),
        expect.any(Object)
      );
    });

    it('should handle pagination params', async () => {
      req.params = { companyId: 'comp-1' };
      req.query = { page: '3', limit: '10' };
      MaterialEvent.find.mockResolvedValue([]);
      MaterialEvent.countDocuments.mockResolvedValue(50);

      await materialEventController.getCompanyEvents(req, res);

      expect(MaterialEvent.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: 20, limit: 10 })
      );
      const data = JSON.parse(res._getData());
      expect(data.pagination.pages).toBe(5);
    });

    it('should return 500 on error', async () => {
      req.params = { companyId: 'comp-1' };
      req.query = {};
      MaterialEvent.find.mockRejectedValue(new Error('DB error'));

      await materialEventController.getCompanyEvents(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getEvent ──────────────────────────────────────────────────────────

  describe('getEvent', () => {
    it('should return a single event', async () => {
      req.params = { eventId: 'evt-1' };
      MaterialEvent.findOne.mockResolvedValue({ eventId: 'evt-1', eventType: 'litigation' });

      await materialEventController.getEvent(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.eventId).toBe('evt-1');
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      MaterialEvent.findOne.mockResolvedValue(null);

      await materialEventController.getEvent(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on error', async () => {
      req.params = { eventId: 'evt-1' };
      MaterialEvent.findOne.mockRejectedValue(new Error('DB error'));

      await materialEventController.getEvent(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── updateEvent ───────────────────────────────────────────────────────

  describe('updateEvent', () => {
    it('should update event fields', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { description: 'Updated description', impactSeverity: 'critical' };
      MaterialEvent.findOne
        .mockResolvedValueOnce({ eventId: 'evt-1' })
        .mockResolvedValueOnce({ eventId: 'evt-1', description: 'Updated description' });
      MaterialEvent.updateOne.mockResolvedValue({});

      await materialEventController.updateEvent(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.description).toBe('Updated description');
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      req.body = { description: 'test' };
      MaterialEvent.findOne.mockResolvedValue(null);

      await materialEventController.updateEvent(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should strip status and statusHistory from updates', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { description: 'test', status: 'resolved', statusHistory: [] };
      MaterialEvent.findOne
        .mockResolvedValueOnce({ eventId: 'evt-1' })
        .mockResolvedValueOnce({ eventId: 'evt-1' });
      MaterialEvent.updateOne.mockResolvedValue({});

      await materialEventController.updateEvent(req, res);

      expect(MaterialEvent.updateOne).toHaveBeenCalledWith(
        { eventId: 'evt-1' },
        { $set: expect.not.objectContaining({ status: 'resolved' }) }
      );
    });

    it('should set updatedBy to current user', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { description: 'test' };
      MaterialEvent.findOne
        .mockResolvedValueOnce({ eventId: 'evt-1' })
        .mockResolvedValueOnce({ eventId: 'evt-1' });
      MaterialEvent.updateOne.mockResolvedValue({});

      await materialEventController.updateEvent(req, res);

      expect(MaterialEvent.updateOne).toHaveBeenCalledWith(
        { eventId: 'evt-1' },
        { $set: expect.objectContaining({ updatedBy: 'user-1' }) }
      );
    });

    it('should return 400 on error', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = {};
      MaterialEvent.findOne.mockRejectedValue(new Error('Validation error'));

      await materialEventController.updateEvent(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── acknowledgeEvent ──────────────────────────────────────────────────

  describe('acknowledgeEvent', () => {
    it('should acknowledge an event', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { notes: 'Acknowledged' };
      MaterialEvent.acknowledge.mockResolvedValue({ eventId: 'evt-1', status: 'acknowledged' });

      await materialEventController.acknowledgeEvent(req, res);

      expect(res.statusCode).toBe(200);
      expect(MaterialEvent.acknowledge).toHaveBeenCalledWith('evt-1', 'user-1', 'Acknowledged');
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      req.body = {};
      MaterialEvent.acknowledge.mockRejectedValue(new Error('Event not found'));

      await materialEventController.acknowledgeEvent(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for other errors', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = {};
      MaterialEvent.acknowledge.mockRejectedValue(new Error('Invalid state'));

      await materialEventController.acknowledgeEvent(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── markActionRequired ────────────────────────────────────────────────

  describe('markActionRequired', () => {
    it('should mark event as action required', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { actionItems: ['Review docs'], notes: 'Urgent' };
      MaterialEvent.markActionRequired.mockResolvedValue({ eventId: 'evt-1', status: 'action_required' });

      await materialEventController.markActionRequired(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should default actionItems to empty array', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = {};
      MaterialEvent.markActionRequired.mockResolvedValue({ eventId: 'evt-1' });

      await materialEventController.markActionRequired(req, res);

      expect(MaterialEvent.markActionRequired).toHaveBeenCalledWith('evt-1', 'user-1', [], undefined);
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      req.body = {};
      MaterialEvent.markActionRequired.mockRejectedValue(new Error('Event not found'));

      await materialEventController.markActionRequired(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── resolveEvent ─────────────────────────────────────────────────────

  describe('resolveEvent', () => {
    it('should resolve an event', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { notes: 'Resolved', valuationRequestId: 'val-1' };
      MaterialEvent.resolve.mockResolvedValue({ eventId: 'evt-1', status: 'resolved' });

      await materialEventController.resolveEvent(req, res);

      expect(res.statusCode).toBe(200);
      expect(MaterialEvent.resolve).toHaveBeenCalledWith(
        'evt-1', 'user-1', { notes: 'Resolved', valuationRequestId: 'val-1' }
      );
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      req.body = {};
      MaterialEvent.resolve.mockRejectedValue(new Error('Event not found'));

      await materialEventController.resolveEvent(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── dismissEvent ─────────────────────────────────────────────────────

  describe('dismissEvent', () => {
    it('should dismiss event with reason', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { reason: 'Not relevant' };
      MaterialEvent.dismiss.mockResolvedValue({ eventId: 'evt-1', status: 'dismissed' });

      await materialEventController.dismissEvent(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when reason not provided', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = {};

      await materialEventController.dismissEvent(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Dismissal reason is required');
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      req.body = { reason: 'Not relevant' };
      MaterialEvent.dismiss.mockRejectedValue(new Error('Event not found'));

      await materialEventController.dismissEvent(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── addActionItem ─────────────────────────────────────────────────────

  describe('addActionItem', () => {
    it('should add action item to event', async () => {
      req.params = { eventId: 'evt-1' };
      req.body = { action: 'Review contract', assignedTo: 'user-2', dueDate: '2026-04-01' };
      MaterialEvent.addActionItem.mockResolvedValue({ eventId: 'evt-1' });

      await materialEventController.addActionItem(req, res);

      expect(res.statusCode).toBe(200);
      expect(MaterialEvent.addActionItem).toHaveBeenCalledWith(
        'evt-1',
        { action: 'Review contract', assignedTo: 'user-2', dueDate: '2026-04-01' },
        'user-1'
      );
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent' };
      req.body = { action: 'test' };
      MaterialEvent.addActionItem.mockRejectedValue(new Error('Event not found'));

      await materialEventController.addActionItem(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── completeActionItem ────────────────────────────────────────────────

  describe('completeActionItem', () => {
    it('should complete an action item', async () => {
      req.params = { eventId: 'evt-1', actionItemId: 'ai-1' };
      req.body = { notes: 'Done' };
      MaterialEvent.completeActionItem.mockResolvedValue({ eventId: 'evt-1' });

      await materialEventController.completeActionItem(req, res);

      expect(res.statusCode).toBe(200);
      expect(MaterialEvent.completeActionItem).toHaveBeenCalledWith('evt-1', 'ai-1', 'user-1', 'Done');
    });

    it('should return 404 when event not found', async () => {
      req.params = { eventId: 'nonexistent', actionItemId: 'ai-1' };
      req.body = {};
      MaterialEvent.completeActionItem.mockRejectedValue(new Error('Event not found'));

      await materialEventController.completeActionItem(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when action item not found', async () => {
      req.params = { eventId: 'evt-1', actionItemId: 'nonexistent' };
      req.body = {};
      MaterialEvent.completeActionItem.mockRejectedValue(new Error('Action item not found'));

      await materialEventController.completeActionItem(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for other errors', async () => {
      req.params = { eventId: 'evt-1', actionItemId: 'ai-1' };
      req.body = {};
      MaterialEvent.completeActionItem.mockRejectedValue(new Error('Invalid state'));

      await materialEventController.completeActionItem(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── getActionRequired ─────────────────────────────────────────────────

  describe('getActionRequired', () => {
    it('should return events requiring action', async () => {
      req.query = { companyId: 'comp-1' };
      MaterialEvent.findActionRequired.mockResolvedValue([
        { eventId: 'evt-1', status: 'action_required' }
      ]);

      await materialEventController.getActionRequired(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(1);
    });

    it('should pass null when companyId not provided', async () => {
      req.query = {};
      MaterialEvent.findActionRequired.mockResolvedValue([]);

      await materialEventController.getActionRequired(req, res);

      expect(MaterialEvent.findActionRequired).toHaveBeenCalledWith(null);
    });

    it('should return 500 on error', async () => {
      req.query = {};
      MaterialEvent.findActionRequired.mockRejectedValue(new Error('DB error'));

      await materialEventController.getActionRequired(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getValuationTriggers ──────────────────────────────────────────────

  describe('getValuationTriggers', () => {
    it('should return valuation trigger events', async () => {
      req.query = { companyId: 'comp-1' };
      MaterialEvent.findValuationTriggers.mockResolvedValue([
        { eventId: 'evt-1', triggersValuation: true }
      ]);

      await materialEventController.getValuationTriggers(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(1);
    });

    it('should pass null when companyId not provided', async () => {
      req.query = {};
      MaterialEvent.findValuationTriggers.mockResolvedValue([]);

      await materialEventController.getValuationTriggers(req, res);

      expect(MaterialEvent.findValuationTriggers).toHaveBeenCalledWith(null);
    });

    it('should return 500 on error', async () => {
      req.query = {};
      MaterialEvent.findValuationTriggers.mockRejectedValue(new Error('DB error'));

      await materialEventController.getValuationTriggers(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getCompanySummary ─────────────────────────────────────────────────

  describe('getCompanySummary', () => {
    it('should return company event summary', async () => {
      req.params = { companyId: 'comp-1' };
      MaterialEvent.getCompanySummary.mockResolvedValue({
        totalEvents: 10,
        byStatus: { detected: 3, resolved: 7 }
      });

      await materialEventController.getCompanySummary(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.totalEvents).toBe(10);
    });

    it('should return 500 on error', async () => {
      req.params = { companyId: 'comp-1' };
      MaterialEvent.getCompanySummary.mockRejectedValue(new Error('DB error'));

      await materialEventController.getCompanySummary(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── detectFromFundraisingRound ────────────────────────────────────────

  describe('detectFromFundraisingRound', () => {
    it('should detect event from fundraising round data', async () => {
      req.body = { roundType: 'Series A', amount: 5000000 };
      MaterialEvent.detectFromFinancingRound.mockResolvedValue({ eventId: 'evt-auto' });

      await materialEventController.detectFromFundraisingRound(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.data.eventId).toBe('evt-auto');
    });

    it('should return 400 on error', async () => {
      req.body = {};
      MaterialEvent.detectFromFinancingRound.mockRejectedValue(new Error('Invalid data'));

      await materialEventController.detectFromFundraisingRound(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── detectFromEmployeeChange ──────────────────────────────────────────

  describe('detectFromEmployeeChange', () => {
    it('should detect departure event', async () => {
      req.body = { employeeData: { name: 'John', role: 'CTO' }, changeType: 'departure' };
      MaterialEvent.detectFromEmployeeChange.mockResolvedValue({ eventId: 'evt-auto' });

      await materialEventController.detectFromEmployeeChange(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should detect hire event', async () => {
      req.body = { employeeData: { name: 'Jane', role: 'CFO' }, changeType: 'hire' };
      MaterialEvent.detectFromEmployeeChange.mockResolvedValue({ eventId: 'evt-auto' });

      await materialEventController.detectFromEmployeeChange(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 for invalid changeType', async () => {
      req.body = { employeeData: {}, changeType: 'transfer' };

      await materialEventController.detectFromEmployeeChange(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toContain('changeType must be');
    });

    it('should return 400 on error', async () => {
      req.body = { employeeData: {}, changeType: 'departure' };
      MaterialEvent.detectFromEmployeeChange.mockRejectedValue(new Error('Error'));

      await materialEventController.detectFromEmployeeChange(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── getComplianceDashboard ────────────────────────────────────────────

  describe('getComplianceDashboard', () => {
    it('should return full compliance dashboard data', async () => {
      req.params = { companyId: 'comp-1' };
      MaterialEvent.findActionRequired.mockResolvedValue([
        { eventId: 'e1', status: 'action_required' }
      ]);
      MaterialEvent.findValuationTriggers.mockResolvedValue([
        { eventId: 'e2', triggersValuation: true }
      ]);
      MaterialEvent.getCompanySummary.mockResolvedValue({ totalEvents: 5 });
      MaterialEvent.find.mockResolvedValue([
        { eventId: 'e1', eventType: 'litigation', eventDate: '2026-03-01', status: 'detected', triggersValuation: false, severity: 'high' },
        { eventId: 'e2', eventType: 'financing_round', eventDate: '2026-02-01', status: 'resolved', triggersValuation: true, severity: 'critical' }
      ]);

      await materialEventController.getComplianceDashboard(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.actionRequiredCount).toBe(1);
      expect(data.data.valuationTriggersCount).toBe(1);
      expect(data.data.recentEvents).toHaveLength(2);
      // Should be sorted by date descending
      expect(data.data.recentEvents[0].eventId).toBe('e1');
    });

    it('should limit recent events to 10', async () => {
      req.params = { companyId: 'comp-1' };
      MaterialEvent.findActionRequired.mockResolvedValue([]);
      MaterialEvent.findValuationTriggers.mockResolvedValue([]);
      MaterialEvent.getCompanySummary.mockResolvedValue({});
      const manyEvents = Array.from({ length: 15 }, (_, i) => ({
        eventId: `e${i}`,
        eventType: 'litigation',
        eventDate: `2026-01-${String(i + 1).padStart(2, '0')}`,
        status: 'detected',
        triggersValuation: false,
        severity: 'low'
      }));
      MaterialEvent.find.mockResolvedValue(manyEvents);

      await materialEventController.getComplianceDashboard(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.recentEvents).toHaveLength(10);
    });

    it('should limit actionRequired and valuationTriggers to 5', async () => {
      req.params = { companyId: 'comp-1' };
      const manyItems = Array.from({ length: 8 }, (_, i) => ({ eventId: `e${i}` }));
      MaterialEvent.findActionRequired.mockResolvedValue(manyItems);
      MaterialEvent.findValuationTriggers.mockResolvedValue(manyItems);
      MaterialEvent.getCompanySummary.mockResolvedValue({});
      MaterialEvent.find.mockResolvedValue([]);

      await materialEventController.getComplianceDashboard(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data.actionRequired).toHaveLength(5);
      expect(data.data.valuationTriggers).toHaveLength(5);
    });

    it('should return 500 on error', async () => {
      req.params = { companyId: 'comp-1' };
      MaterialEvent.findActionRequired.mockRejectedValue(new Error('DB error'));

      await materialEventController.getComplianceDashboard(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
