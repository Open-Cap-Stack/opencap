/**
 * MaterialEvent Model Tests
 * Feature: Issue #267 - Implement material events catalog and 409A trigger system
 * Tests creation, 409A logic, severity, workflow transitions, auto-detection, and queries.
 */

// Mock zerodbService before any require
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');

describe('MaterialEvent Model', () => {
  let MaterialEvent;

  beforeAll(() => {
    MaterialEvent = require('../../../models/MaterialEvent');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.queryTable.mockReset();
    zerodbService.insertRow.mockReset();
    zerodbService.client.put.mockReset();
    zerodbService.client.put.mockResolvedValue({});
    zerodbService.queryTable.mockResolvedValue({ data: [] });
  });

  // Helpers
  const mockInsert = (returnData = {}) => {
    const data = { _id: 'mock-id', ...returnData };
    zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'row_1', row_data: data }] });
    return data;
  };

  const mockFind = (docs = []) => {
    zerodbService.queryTable.mockResolvedValue({
      data: docs.map((d, i) => ({ row_id: `row_${i}`, row_data: d }))
    });
  };

  const mockFindOne = (doc) => {
    if (doc) {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    } else {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
    }
  };


  // -------------------------------------------------------------------
  // Exported Constants
  // -------------------------------------------------------------------
  describe('Exported Constants', () => {
    it('should export EVENT_TYPES with all required values', () => {
      const { EVENT_TYPES } = MaterialEvent;
      expect(EVENT_TYPES.FINANCING_ROUND).toBe('financing_round');
      expect(EVENT_TYPES.DOWN_ROUND).toBe('down_round');
      expect(EVENT_TYPES.BRIDGE_FINANCING).toBe('bridge_financing');
      expect(EVENT_TYPES.BOARD_COMPOSITION_CHANGE).toBe('board_composition_change');
      expect(EVENT_TYPES.STOCK_SPLIT).toBe('stock_split');
      expect(EVENT_TYPES.REVERSE_SPLIT).toBe('reverse_split');
      expect(EVENT_TYPES.SIGNIFICANT_REVENUE_CHANGE).toBe('significant_revenue_change');
      expect(EVENT_TYPES.MAJOR_CUSTOMER_WIN).toBe('major_customer_win');
      expect(EVENT_TYPES.MAJOR_CUSTOMER_LOSS).toBe('major_customer_loss');
      expect(EVENT_TYPES.KEY_EXECUTIVE_CHANGE).toBe('key_executive_change');
      expect(EVENT_TYPES.GOING_CONCERN_DOUBT).toBe('going_concern_doubt');
      expect(EVENT_TYPES.IPO_FILING).toBe('ipo_filing');
      expect(EVENT_TYPES.MA_ACTIVITY).toBe('ma_activity');
      expect(EVENT_TYPES.OTHER).toBe('other');
      expect(Object.keys(EVENT_TYPES).length).toBeGreaterThanOrEqual(20);
    });

    it('should export DETECTION_METHODS', () => {
      const { DETECTION_METHODS } = MaterialEvent;
      expect(DETECTION_METHODS.AUTO).toBe('auto');
      expect(DETECTION_METHODS.MANUAL).toBe('manual');
      expect(DETECTION_METHODS.EXTERNAL).toBe('external');
      expect(DETECTION_METHODS.API_INTEGRATION).toBe('api_integration');
      expect(DETECTION_METHODS.SCHEDULED_SCAN).toBe('scheduled_scan');
    });

    it('should export SEVERITY_LEVELS', () => {
      const { SEVERITY_LEVELS } = MaterialEvent;
      expect(SEVERITY_LEVELS.LOW).toBe('low');
      expect(SEVERITY_LEVELS.MEDIUM).toBe('medium');
      expect(SEVERITY_LEVELS.HIGH).toBe('high');
      expect(SEVERITY_LEVELS.CRITICAL).toBe('critical');
    });

    it('should export EVENT_STATUSES', () => {
      const { EVENT_STATUSES } = MaterialEvent;
      expect(EVENT_STATUSES.DETECTED).toBe('detected');
      expect(EVENT_STATUSES.ACKNOWLEDGED).toBe('acknowledged');
      expect(EVENT_STATUSES.ACTION_REQUIRED).toBe('action_required');
      expect(EVENT_STATUSES.RESOLVED).toBe('resolved');
      expect(EVENT_STATUSES.DISMISSED).toBe('dismissed');
      expect(Object.keys(EVENT_STATUSES).length).toBe(5);
    });

    it('should export AUTO_DETECTABLE_EVENTS', () => {
      const { AUTO_DETECTABLE_EVENTS, EVENT_TYPES } = MaterialEvent;
      expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.FINANCING_ROUND);
      expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.DOWN_ROUND);
      expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.STOCK_SPLIT);
      expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.REVERSE_SPLIT);
    });

    it('should export ALWAYS_TRIGGER_409A with at least 10 events', () => {
      expect(MaterialEvent.ALWAYS_TRIGGER_409A.length).toBeGreaterThanOrEqual(10);
      expect(MaterialEvent.ALWAYS_TRIGGER_409A).toContain('financing_round');
      expect(MaterialEvent.ALWAYS_TRIGGER_409A).toContain('down_round');
      expect(MaterialEvent.ALWAYS_TRIGGER_409A).toContain('ipo_filing');
      expect(MaterialEvent.ALWAYS_TRIGGER_409A).toContain('going_concern_doubt');
    });

    it('should have correct table name', () => {
      expect(MaterialEvent.tableName).toBe('material_events');
    });
  });

  // -------------------------------------------------------------------
  // Schema
  // -------------------------------------------------------------------
  describe('Schema', () => {
    it('should have required fields', () => {
      const { schema } = MaterialEvent;
      expect(schema.companyId.required).toBe(true);
      expect(schema.eventType.required).toBe(true);
      expect(schema.eventDate.required).toBe(true);
      expect(schema.description.required).toBe(true);
    });

    it('should have proper enums', () => {
      const { schema, SEVERITY_LEVELS, EVENT_STATUSES } = MaterialEvent;
      expect(schema.severity.enum).toEqual(Object.values(SEVERITY_LEVELS));
      expect(schema.status.enum).toEqual(Object.values(EVENT_STATUSES));
    });

    it('should have valuation reference fields', () => {
      const { schema } = MaterialEvent;
      expect(schema.invalidatesValuationId).toBeDefined();
      expect(schema.replacementValuationId).toBeDefined();
    });

    it('should have financial impact fields', () => {
      const { schema } = MaterialEvent;
      expect(schema.financialImpact).toBeDefined();
      expect(schema.impactPercentage).toBeDefined();
    });
  });

  // -------------------------------------------------------------------
  // alwaysTriggers409A
  // -------------------------------------------------------------------
  describe('alwaysTriggers409A', () => {
    it('should return true for all always-trigger events', () => {
      const alwaysEvents = [
        'financing_round', 'down_round', 'bridge_financing', 'significant_transaction',
        'acquisition_offer', 'merger_discussion', 'ma_activity', 'ipo_filing',
        'ipo_preparation', 'going_concern_doubt'
      ];
      alwaysEvents.forEach(evt => {
        expect(MaterialEvent.alwaysTriggers409A(evt)).toBe(true);
      });
    });

    it('should return false for non-always-trigger events', () => {
      expect(MaterialEvent.alwaysTriggers409A('litigation')).toBe(false);
      expect(MaterialEvent.alwaysTriggers409A('product_launch')).toBe(false);
      expect(MaterialEvent.alwaysTriggers409A('key_employee_hire')).toBe(false);
      expect(MaterialEvent.alwaysTriggers409A('other')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // isAutoDetectable
  // -------------------------------------------------------------------
  describe('isAutoDetectable', () => {
    it('should return true for auto-detectable events', () => {
      expect(MaterialEvent.isAutoDetectable('financing_round')).toBe(true);
      expect(MaterialEvent.isAutoDetectable('down_round')).toBe(true);
      expect(MaterialEvent.isAutoDetectable('stock_split')).toBe(true);
    });

    it('should return false for manually reported events', () => {
      expect(MaterialEvent.isAutoDetectable('litigation')).toBe(false);
      expect(MaterialEvent.isAutoDetectable('product_launch')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // requires409AUpdate (static logic)
  // -------------------------------------------------------------------
  describe('requires409AUpdate', () => {
    it('should return true for always-trigger events', () => {
      expect(MaterialEvent.requires409AUpdate('financing_round')).toBe(true);
      expect(MaterialEvent.requires409AUpdate('down_round')).toBe(true);
    });

    it('should return true for revenue change above threshold (50%)', () => {
      expect(MaterialEvent.requires409AUpdate('significant_revenue_change', { impactPercentage: 0.55 })).toBe(true);
      expect(MaterialEvent.requires409AUpdate('significant_revenue_change', { impactPercentage: -0.60 })).toBe(true);
    });

    it('should return false for revenue change below threshold', () => {
      expect(MaterialEvent.requires409AUpdate('significant_revenue_change', { impactPercentage: 0.30 })).toBe(false);
    });

    it('should return true for C-level executive changes', () => {
      expect(MaterialEvent.requires409AUpdate('key_executive_change', { role: 'CEO' })).toBe(true);
      expect(MaterialEvent.requires409AUpdate('key_employee_departure', { role: 'CFO' })).toBe(true);
      expect(MaterialEvent.requires409AUpdate('key_executive_change', { role: 'CTO and Co-Founder' })).toBe(true);
    });

    it('should return false for non-C-level changes', () => {
      expect(MaterialEvent.requires409AUpdate('key_employee_departure', { role: 'Senior Engineer' })).toBe(false);
    });

    it('should return true for major customer changes above threshold (25%)', () => {
      expect(MaterialEvent.requires409AUpdate('major_customer_loss', { impactPercentage: 0.30 })).toBe(true);
      expect(MaterialEvent.requires409AUpdate('major_customer_win', { impactPercentage: 0.26 })).toBe(true);
    });

    it('should return true for significant litigation', () => {
      expect(MaterialEvent.requires409AUpdate('litigation', { materialLevel: 'significant' })).toBe(true);
      expect(MaterialEvent.requires409AUpdate('litigation', { materialLevel: 'major' })).toBe(true);
      expect(MaterialEvent.requires409AUpdate('litigation', { materialLevel: 'critical' })).toBe(true);
    });

    it('should return false for minor litigation', () => {
      expect(MaterialEvent.requires409AUpdate('litigation', { materialLevel: 'minor' })).toBe(false);
      expect(MaterialEvent.requires409AUpdate('litigation', { materialLevel: 'moderate' })).toBe(false);
    });

    it('should return false for unrecognized event types', () => {
      expect(MaterialEvent.requires409AUpdate('unknown_event')).toBe(false);
    });

    it('should return true for major product launch', () => {
      expect(MaterialEvent.requires409AUpdate('product_launch', { materialLevel: 'significant' })).toBe(true);
    });

    it('should return true for major IP event', () => {
      expect(MaterialEvent.requires409AUpdate('ip_event', { materialLevel: 'major' })).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // determineSeverity
  // -------------------------------------------------------------------
  describe('determineSeverity', () => {
    it('should return critical for down_round, going_concern_doubt, ipo_filing, ma_activity, acquisition_offer', () => {
      expect(MaterialEvent.determineSeverity('down_round')).toBe('critical');
      expect(MaterialEvent.determineSeverity('going_concern_doubt')).toBe('critical');
      expect(MaterialEvent.determineSeverity('ipo_filing')).toBe('critical');
      expect(MaterialEvent.determineSeverity('ma_activity')).toBe('critical');
      expect(MaterialEvent.determineSeverity('acquisition_offer')).toBe('critical');
    });

    it('should return high for financing_round, bridge_financing, key_executive_change, merger_discussion, ipo_preparation', () => {
      expect(MaterialEvent.determineSeverity('financing_round')).toBe('high');
      expect(MaterialEvent.determineSeverity('bridge_financing')).toBe('high');
      expect(MaterialEvent.determineSeverity('key_executive_change')).toBe('high');
      expect(MaterialEvent.determineSeverity('merger_discussion')).toBe('high');
      expect(MaterialEvent.determineSeverity('ipo_preparation')).toBe('high');
    });

    it('should return high for large financial impact (>$1M)', () => {
      expect(MaterialEvent.determineSeverity('other', { financialImpact: 5000000 })).toBe('high');
    });

    it('should return high for significant percentage impact (>25%)', () => {
      expect(MaterialEvent.determineSeverity('other', { impactPercentage: 0.30 })).toBe('high');
      expect(MaterialEvent.determineSeverity('other', { impactPercentage: -0.30 })).toBe('high');
    });

    it('should return medium for regular events', () => {
      expect(MaterialEvent.determineSeverity('product_launch')).toBe('medium');
      expect(MaterialEvent.determineSeverity('regulatory_change')).toBe('medium');
      expect(MaterialEvent.determineSeverity('other')).toBe('medium');
    });
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('should create an event with auto-generated eventId', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'financing_round',
        eventDate: '2025-06-01',
        description: 'Series A',
        createdBy: 'user_1'
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventId).toMatch(/^evt_/);
    });

    it('should auto-determine requires409AUpdate for always-trigger events', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'financing_round',
        eventDate: '2025-06-01',
        description: 'Series A',
        createdBy: 'user_1'
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.requires409AUpdate).toBe(true);
      expect(insertArg.triggersValuation).toBe(true);
    });

    it('should auto-determine severity', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'down_round',
        eventDate: '2025-06-01',
        description: 'Down round',
        createdBy: 'user_1'
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.severity).toBe('critical');
    });

    it('should respect caller-provided requires409AUpdate', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'product_launch',
        eventDate: '2025-06-01',
        description: 'Product launch',
        createdBy: 'user_1',
        requires409AUpdate: true
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.requires409AUpdate).toBe(true);
    });

    it('should default status to detected', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'other',
        eventDate: '2025-06-01',
        description: 'Some event',
        createdBy: 'user_1'
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.status).toBe('detected');
    });

    it('should initialize statusHistory', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'other',
        eventDate: '2025-06-01',
        description: 'Event',
        createdBy: 'user_1'
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.statusHistory).toHaveLength(1);
      expect(insertArg.statusHistory[0].status).toBe('detected');
      expect(insertArg.statusHistory[0].changedBy).toBe('user_1');
    });

    it('should assign _id to action items', async () => {
      const data = {
        companyId: 'c1',
        eventType: 'other',
        eventDate: '2025-06-01',
        description: 'Event',
        createdBy: 'user_1',
        actionItems: [{ action: 'Review financials' }]
      };
      mockInsert({ ...data });

      await MaterialEvent.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.actionItems[0]._id).toBeDefined();
    });
  });

  // -------------------------------------------------------------------
  // requiresImmediateAction
  // -------------------------------------------------------------------
  describe('requiresImmediateAction', () => {
    it('should return true for critical unresolved 409A events', () => {
      expect(MaterialEvent.requiresImmediateAction({
        requires409AUpdate: true, severity: 'critical', status: 'detected'
      })).toBe(true);
    });

    it('should return false for resolved events', () => {
      expect(MaterialEvent.requiresImmediateAction({
        requires409AUpdate: true, severity: 'critical', status: 'resolved'
      })).toBe(false);
    });

    it('should return false for dismissed events', () => {
      expect(MaterialEvent.requiresImmediateAction({
        requires409AUpdate: true, severity: 'critical', status: 'dismissed'
      })).toBe(false);
    });

    it('should return false for non-critical events', () => {
      expect(MaterialEvent.requiresImmediateAction({
        requires409AUpdate: true, severity: 'medium', status: 'detected'
      })).toBe(false);
    });

    it('should return false when requires409AUpdate is false', () => {
      expect(MaterialEvent.requiresImmediateAction({
        requires409AUpdate: false, severity: 'critical', status: 'detected'
      })).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // getDaysSinceEvent
  // -------------------------------------------------------------------
  describe('getDaysSinceEvent', () => {
    it('should calculate days since event', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      expect(MaterialEvent.getDaysSinceEvent({ eventDate: tenDaysAgo.toISOString() })).toBe(10);
    });

    it('should return 0 for today', () => {
      expect(MaterialEvent.getDaysSinceEvent({ eventDate: new Date().toISOString() })).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // acknowledge
  // -------------------------------------------------------------------
  describe('acknowledge', () => {
    it('should acknowledge a detected event', async () => {
      const event = { _id: 'e1', eventId: 'evt_1', status: 'detected', statusHistory: [], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      await MaterialEvent.acknowledge('evt_1', 'user_1', 'Noted');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(MaterialEvent.acknowledge('missing', 'user_1'))
        .rejects.toThrow('Event not found');
    });

    it('should throw when event is not in detected status', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { eventId: 'evt_1', status: 'acknowledged', row_id: 'row_1' } }]
      });

      await expect(MaterialEvent.acknowledge('evt_1', 'user_1'))
        .rejects.toThrow('Can only acknowledge events in detected status');
    });
  });

  // -------------------------------------------------------------------
  // markActionRequired
  // -------------------------------------------------------------------
  describe('markActionRequired', () => {
    it('should mark event as action_required and add action items', async () => {
      const event = { _id: 'e1', eventId: 'evt_1', status: 'acknowledged', statusHistory: [], actionItems: [], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      await MaterialEvent.markActionRequired('evt_1', 'user_1', [
        { action: 'Request new 409A valuation' }
      ]);

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(MaterialEvent.markActionRequired('missing', 'user_1'))
        .rejects.toThrow('Event not found');
    });
  });

  // -------------------------------------------------------------------
  // resolve
  // -------------------------------------------------------------------
  describe('resolve', () => {
    it('should resolve an event', async () => {
      const event = { _id: 'e1', eventId: 'evt_1', status: 'action_required', statusHistory: [], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      await MaterialEvent.resolve('evt_1', 'user_1', {
        notes: 'New 409A obtained',
        valuationRequestId: 'val_123'
      });

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(MaterialEvent.resolve('missing', 'user_1'))
        .rejects.toThrow('Event not found');
    });
  });

  // -------------------------------------------------------------------
  // dismiss
  // -------------------------------------------------------------------
  describe('dismiss', () => {
    it('should dismiss an event with reason', async () => {
      const event = { _id: 'e1', eventId: 'evt_1', status: 'detected', statusHistory: [], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      await MaterialEvent.dismiss('evt_1', 'user_1', 'Not material');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when reason is not provided', async () => {
      await expect(MaterialEvent.dismiss('evt_1', 'user_1', ''))
        .rejects.toThrow('Dismissal reason is required');
    });

    it('should throw when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(MaterialEvent.dismiss('missing', 'user_1', 'reason'))
        .rejects.toThrow('Event not found');
    });
  });

  // -------------------------------------------------------------------
  // addActionItem
  // -------------------------------------------------------------------
  describe('addActionItem', () => {
    it('should add an action item to an event', async () => {
      const event = { _id: 'e1', eventId: 'evt_1', actionItems: [], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      await MaterialEvent.addActionItem('evt_1', { action: 'Review' }, 'user_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(MaterialEvent.addActionItem('missing', { action: 'Test' }, 'user_1'))
        .rejects.toThrow('Event not found');
    });
  });

  // -------------------------------------------------------------------
  // completeActionItem
  // -------------------------------------------------------------------
  describe('completeActionItem', () => {
    it('should mark action item as completed', async () => {
      const event = {
        _id: 'e1', eventId: 'evt_1', status: 'action_required', row_id: 'row_1',
        actionItems: [{ _id: 'a1', action: 'Do something', status: 'pending' }]
      };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      const result = await MaterialEvent.completeActionItem('evt_1', 'a1', 'user_1', 'Done');

      expect(result).toBeDefined();
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(MaterialEvent.completeActionItem('missing', 'a1', 'user_1'))
        .rejects.toThrow('Event not found');
    });

    it('should throw when action item not found', async () => {
      const event = { eventId: 'evt_1', actionItems: [{ _id: 'a1' }], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: event }]
      });

      await expect(MaterialEvent.completeActionItem('evt_1', 'nonexistent', 'user_1'))
        .rejects.toThrow('Action item not found');
    });
  });

  // -------------------------------------------------------------------
  // canIssueGrant
  // -------------------------------------------------------------------
  describe('canIssueGrant', () => {
    it('should return allowed:true when no blocking events', async () => {
      mockFind([]);

      const result = await MaterialEvent.canIssueGrant('c1');

      expect(result.allowed).toBe(true);
    });

    it('should return allowed:false when unresolved 409A events exist', async () => {
      const blockingEvent = {
        eventId: 'evt_1',
        eventType: 'financing_round',
        eventDate: '2025-01-01',
        status: 'detected',
        severity: 'high',
        requires409AUpdate: true
      };
      mockFind([blockingEvent]);

      const result = await MaterialEvent.canIssueGrant('c1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('UNRESOLVED_MATERIAL_EVENT');
      expect(result.events).toHaveLength(1);
    });

    it('should not block when 409A events are resolved', async () => {
      const resolvedEvent = {
        eventId: 'evt_1', status: 'resolved', requires409AUpdate: true,
        eventDate: '2025-01-01'
      };
      mockFind([resolvedEvent]);

      const result = await MaterialEvent.canIssueGrant('c1');

      expect(result.allowed).toBe(true);
    });

    it('should not block when 409A events are dismissed', async () => {
      const dismissedEvent = {
        eventId: 'evt_1', status: 'dismissed', requires409AUpdate: true,
        eventDate: '2025-01-01'
      };
      mockFind([dismissedEvent]);

      const result = await MaterialEvent.canIssueGrant('c1');

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // findByCompany
  // -------------------------------------------------------------------
  describe('findByCompany', () => {
    it('should query by companyId', async () => {
      mockFind([{ companyId: 'c1' }]);

      const result = await MaterialEvent.findByCompany('c1');

      expect(result).toHaveLength(1);
    });

    it('should filter by options', async () => {
      mockFind([]);

      await MaterialEvent.findByCompany('c1', { status: 'detected', eventType: 'financing_round' });

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.status).toBe('detected');
      expect(callArg.filter.eventType).toBe('financing_round');
    });

    it('should support triggersValuation backward compatibility', async () => {
      mockFind([]);

      await MaterialEvent.findByCompany('c1', { triggersValuation: true });

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.requires409AUpdate).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // findUnresolved
  // -------------------------------------------------------------------
  describe('findUnresolved', () => {
    it('should filter out resolved and dismissed events', async () => {
      const events = [
        { companyId: 'c1', status: 'detected', severity: 'high', eventDate: '2025-01-01' },
        { companyId: 'c1', status: 'resolved', severity: 'high', eventDate: '2025-02-01' },
        { companyId: 'c1', status: 'dismissed', severity: 'medium', eventDate: '2025-03-01' },
        { companyId: 'c1', status: 'action_required', severity: 'critical', eventDate: '2025-04-01' }
      ];
      mockFind(events);

      const result = await MaterialEvent.findUnresolved('c1');

      expect(result).toHaveLength(2);
      // Sorted by severity: critical (0) before high (1)
      expect(result[0].severity).toBe('critical');
      expect(result[1].severity).toBe('high');
    });
  });

  // -------------------------------------------------------------------
  // findActionRequired
  // -------------------------------------------------------------------
  describe('findActionRequired', () => {
    it('should query for action_required events', async () => {
      mockFind([{ status: 'action_required' }]);

      const result = await MaterialEvent.findActionRequired('c1');

      expect(result).toHaveLength(1);
    });

    it('should work without companyId', async () => {
      mockFind([]);

      await MaterialEvent.findActionRequired();

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.companyId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // findValuationTriggers
  // -------------------------------------------------------------------
  describe('findValuationTriggers', () => {
    it('should return unresolved 409A trigger events', async () => {
      const events = [
        { requires409AUpdate: true, status: 'detected', eventDate: '2025-06-01' },
        { requires409AUpdate: true, status: 'resolved', eventDate: '2025-05-01' }
      ];
      mockFind(events);

      const result = await MaterialEvent.findValuationTriggers('c1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('detected');
    });
  });

  // -------------------------------------------------------------------
  // getCompanySummary
  // -------------------------------------------------------------------
  describe('getCompanySummary', () => {
    it('should produce correct summary statistics', async () => {
      const events = [
        { eventId: 'e1', eventType: 'financing_round', status: 'detected', severity: 'high', requires409AUpdate: true, eventDate: '2025-06-01' },
        { eventId: 'e2', eventType: 'financing_round', status: 'resolved', severity: 'high', requires409AUpdate: true, eventDate: '2025-05-01' },
        { eventId: 'e3', eventType: 'product_launch', status: 'action_required', severity: 'medium', requires409AUpdate: false, eventDate: '2025-04-01' }
      ];
      mockFind(events);

      const summary = await MaterialEvent.getCompanySummary('c1');

      expect(summary.total).toBe(3);
      expect(summary.requires409AUpdate).toBe(2);
      expect(summary.actionRequired).toBe(1);
      expect(summary.unresolved).toBe(2);
      expect(summary.byStatus.detected).toBe(1);
      expect(summary.byStatus.resolved).toBe(1);
      expect(summary.byType.financing_round).toBe(2);
      expect(summary.bySeverity.high).toBe(2);
      expect(summary.recentEvents).toHaveLength(3);
    });

    it('should handle empty events', async () => {
      mockFind([]);

      const summary = await MaterialEvent.getCompanySummary('c1');

      expect(summary.total).toBe(0);
      expect(summary.requires409AUpdate).toBe(0);
      expect(summary.recentEvents).toHaveLength(0);
    });

    it('should limit recentEvents to 5', async () => {
      const events = Array.from({ length: 8 }, (_, i) => ({
        eventId: `e${i}`, eventType: 'other', status: 'detected',
        severity: 'medium', requires409AUpdate: false, eventDate: `2025-0${i + 1}-01`
      }));
      mockFind(events);

      const summary = await MaterialEvent.getCompanySummary('c1');

      expect(summary.recentEvents).toHaveLength(5);
    });
  });

  // -------------------------------------------------------------------
  // detectFromFinancingRound
  // -------------------------------------------------------------------
  describe('detectFromFinancingRound', () => {
    it('should create financing_round event', async () => {
      const roundData = { companyId: 'c1', name: 'Series A', amount: 5000000, _id: 'round_1' };
      mockInsert({});

      await MaterialEvent.detectFromFinancingRound(roundData, 'user_1');

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventType).toBe('financing_round');
      expect(insertArg.requires409AUpdate).toBe(true);
      expect(insertArg.detectionMethod).toBe('auto');
    });

    it('should detect down round', async () => {
      const roundData = {
        companyId: 'c1', name: 'Series B', amount: 3000000, _id: 'round_1',
        pricePerShare: 2.00, previousPricePerShare: 5.00
      };
      mockInsert({});

      await MaterialEvent.detectFromFinancingRound(roundData, 'user_1');

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventType).toBe('down_round');
      expect(insertArg.severity).toBe('critical');
    });

    it('should detect bridge financing', async () => {
      const roundData = {
        companyId: 'c1', name: 'Bridge', type: 'Bridge Round', amount: 1000000, _id: 'round_1'
      };
      mockInsert({});

      await MaterialEvent.detectFromFinancingRound(roundData, 'user_1');

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventType).toBe('bridge_financing');
    });
  });

  // -------------------------------------------------------------------
  // detectFromEmployeeChange
  // -------------------------------------------------------------------
  describe('detectFromEmployeeChange', () => {
    it('should detect C-level departure with high severity', async () => {
      const employeeData = { companyId: 'c1', name: 'John Doe', title: 'CEO', _id: 's1' };
      mockInsert({});

      await MaterialEvent.detectFromEmployeeChange(employeeData, 'departure', 'user_1');

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventType).toBe('key_employee_departure');
      expect(insertArg.requires409AUpdate).toBe(true);
      expect(insertArg.severity).toBe('high');
    });

    it('should detect non-C-level hire with medium severity', async () => {
      const employeeData = { companyId: 'c1', name: 'Jane Smith', title: 'Senior Engineer', _id: 's2' };
      mockInsert({});

      await MaterialEvent.detectFromEmployeeChange(employeeData, 'hire', 'user_1');

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventType).toBe('key_employee_hire');
      expect(insertArg.requires409AUpdate).toBe(false);
      expect(insertArg.severity).toBe('medium');
    });
  });

  // -------------------------------------------------------------------
  // checkGoingConcern
  // -------------------------------------------------------------------
  describe('checkGoingConcern', () => {
    it('should create event when runway is less than 6 months', async () => {
      mockInsert({});

      const result = await MaterialEvent.checkGoingConcern(
        { companyId: 'c1', cashBalance: 500000, monthlyBurnRate: 100000 },
        'user_1'
      );

      expect(result).toBeDefined();
      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.eventType).toBe('going_concern_doubt');
      expect(insertArg.severity).toBe('critical');
    });

    it('should return null when runway is 6+ months', async () => {
      const result = await MaterialEvent.checkGoingConcern(
        { companyId: 'c1', cashBalance: 1200000, monthlyBurnRate: 100000 },
        'user_1'
      );

      expect(result).toBeNull();
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    });

    it('should return null when cashBalance is missing', async () => {
      const result = await MaterialEvent.checkGoingConcern(
        { companyId: 'c1', monthlyBurnRate: 100000 },
        'user_1'
      );

      expect(result).toBeNull();
    });

    it('should return null when monthlyBurnRate is zero', async () => {
      const result = await MaterialEvent.checkGoingConcern(
        { companyId: 'c1', cashBalance: 500000, monthlyBurnRate: 0 },
        'user_1'
      );

      expect(result).toBeNull();
    });

    it('should return null when monthlyBurnRate is negative', async () => {
      const result = await MaterialEvent.checkGoingConcern(
        { companyId: 'c1', cashBalance: 500000, monthlyBurnRate: -100 },
        'user_1'
      );

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // CONDITIONAL_TRIGGER_409A
  // -------------------------------------------------------------------
  describe('Conditional Trigger Thresholds', () => {
    it('should have correct thresholds', () => {
      const { CONDITIONAL_TRIGGER_409A, EVENT_TYPES } = MaterialEvent;
      expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.SIGNIFICANT_REVENUE_CHANGE].threshold).toBe(0.50);
      expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.MAJOR_CUSTOMER_WIN].threshold).toBe(0.25);
      expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.MAJOR_CUSTOMER_LOSS].threshold).toBe(0.25);
      expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.BOARD_COMPOSITION_CHANGE].threshold).toBe(0.50);
    });

    it('should have correct roles for executive changes', () => {
      const { CONDITIONAL_TRIGGER_409A, EVENT_TYPES } = MaterialEvent;
      const roles = CONDITIONAL_TRIGGER_409A[EVENT_TYPES.KEY_EXECUTIVE_CHANGE].roles;
      expect(roles).toContain('CEO');
      expect(roles).toContain('CFO');
      expect(roles).toContain('CTO');
      expect(roles).toContain('COO');
      expect(roles).toContain('CMO');
      expect(roles).toContain('CPO');
      expect(roles).toContain('CLO');
    });
  });
});
