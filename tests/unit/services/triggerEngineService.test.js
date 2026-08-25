/**
 * TriggerEngineService Tests
 * Issue #88: Build Automated Triggered Messages
 *
 * Test suite for trigger engine including:
 * - Event type validation
 * - Rule evaluation (conditions, AND/OR logic)
 * - Variable substitution in templates
 * - Message generation and dispatch
 * - Scheduled and delayed triggers
 * - Recipient resolution
 */

const TriggerEngineService = require('../../../services/triggerEngineService');
const databaseAdapter = require('../../../services/databaseAdapter');

jest.mock('../../../services/databaseAdapter');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('00000000-0000-0000-0000-000000000000')
}));

describe('TriggerEngineService', () => {
  let engine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new TriggerEngineService();
  });

  describe('getSupportedEventTypes', () => {
    it('should return a copy of supported event types', () => {
      const types = engine.getSupportedEventTypes();
      expect(types).toContain('vesting');
      expect(types).toContain('document_signing');
      expect(types).toContain('custom');

      // Should be a copy, not a reference
      types.push('extra');
      expect(engine.getSupportedEventTypes()).not.toContain('extra');
    });
  });

  describe('getSupportedTriggerTypes', () => {
    it('should return supported trigger types', () => {
      const types = engine.getSupportedTriggerTypes();
      expect(types).toContain('immediate');
      expect(types).toContain('scheduled');
      expect(types).toContain('delayed');
      expect(types).toContain('recurring');
    });
  });

  describe('validateEventType', () => {
    it('should not throw for valid event types', () => {
      expect(() => engine.validateEventType('vesting')).not.toThrow();
      expect(() => engine.validateEventType('custom')).not.toThrow();
    });

    it('should throw for invalid event types', () => {
      expect(() => engine.validateEventType('invalid_type')).toThrow('Invalid event type');
    });
  });

  describe('getNestedValue', () => {
    it('should get top-level value', () => {
      expect(engine.getNestedValue({ name: 'John' }, 'name')).toBe('John');
    });

    it('should get nested value by dot path', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(engine.getNestedValue(obj, 'user.profile.name')).toBe('John');
    });

    it('should return undefined for missing path', () => {
      expect(engine.getNestedValue({ a: 1 }, 'b.c')).toBeUndefined();
    });

    it('should return undefined for null object', () => {
      expect(engine.getNestedValue(null, 'a')).toBeUndefined();
    });

    it('should return undefined for null path', () => {
      expect(engine.getNestedValue({ a: 1 }, null)).toBeUndefined();
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate eq operator', () => {
      expect(engine.evaluateCondition(
        { field: 'status', operator: 'eq', value: 'active' },
        { status: 'active' }
      )).toBe(true);
      expect(engine.evaluateCondition(
        { field: 'status', operator: 'eq', value: 'active' },
        { status: 'inactive' }
      )).toBe(false);
    });

    it('should evaluate ne operator', () => {
      expect(engine.evaluateCondition(
        { field: 'status', operator: 'ne', value: 'deleted' },
        { status: 'active' }
      )).toBe(true);
    });

    it('should evaluate gt and gte operators', () => {
      expect(engine.evaluateCondition(
        { field: 'amount', operator: 'gt', value: 100 },
        { amount: 150 }
      )).toBe(true);
      expect(engine.evaluateCondition(
        { field: 'amount', operator: 'gte', value: 100 },
        { amount: 100 }
      )).toBe(true);
    });

    it('should evaluate lt and lte operators', () => {
      expect(engine.evaluateCondition(
        { field: 'amount', operator: 'lt', value: 100 },
        { amount: 50 }
      )).toBe(true);
      expect(engine.evaluateCondition(
        { field: 'amount', operator: 'lte', value: 100 },
        { amount: 100 }
      )).toBe(true);
    });

    it('should evaluate contains operator with string', () => {
      expect(engine.evaluateCondition(
        { field: 'name', operator: 'contains', value: 'John' },
        { name: 'John Smith' }
      )).toBe(true);
    });

    it('should evaluate contains operator with array', () => {
      expect(engine.evaluateCondition(
        { field: 'tags', operator: 'contains', value: 'vip' },
        { tags: ['vip', 'early'] }
      )).toBe(true);
    });

    it('should evaluate notContains operator', () => {
      expect(engine.evaluateCondition(
        { field: 'name', operator: 'notContains', value: 'xyz' },
        { name: 'John' }
      )).toBe(true);
    });

    it('should evaluate in operator', () => {
      expect(engine.evaluateCondition(
        { field: 'status', operator: 'in', value: ['active', 'pending'] },
        { status: 'active' }
      )).toBe(true);
      expect(engine.evaluateCondition(
        { field: 'status', operator: 'in', value: ['active', 'pending'] },
        { status: 'deleted' }
      )).toBe(false);
    });

    it('should evaluate notIn operator', () => {
      expect(engine.evaluateCondition(
        { field: 'status', operator: 'notIn', value: ['deleted', 'banned'] },
        { status: 'active' }
      )).toBe(true);
    });

    it('should evaluate exists operator', () => {
      expect(engine.evaluateCondition(
        { field: 'email', operator: 'exists', value: true },
        { email: 'test@test.com' }
      )).toBe(true);
      expect(engine.evaluateCondition(
        { field: 'email', operator: 'exists', value: true },
        { name: 'John' }
      )).toBe(false);
    });

    it('should evaluate regex operator', () => {
      expect(engine.evaluateCondition(
        { field: 'email', operator: 'regex', value: '@company\\.com$' },
        { email: 'user@company.com' }
      )).toBe(true);
    });

    it('should handle invalid regex gracefully', () => {
      expect(engine.evaluateCondition(
        { field: 'email', operator: 'regex', value: '[invalid' },
        { email: 'test' }
      )).toBe(false);
    });

    it('should return false for unknown operator', () => {
      expect(engine.evaluateCondition(
        { field: 'x', operator: 'unknown', value: 1 },
        { x: 1 }
      )).toBe(false);
    });
  });

  describe('evaluateRules', () => {
    it('should return true when no rules', () => {
      expect(engine.evaluateRules(null, {})).toBe(true);
      expect(engine.evaluateRules({}, {})).toBe(true);
      expect(engine.evaluateRules({ conditions: [] }, {})).toBe(true);
    });

    it('should evaluate AND logic (default)', () => {
      const rules = {
        logic: 'AND',
        conditions: [
          { field: 'amount', operator: 'gt', value: 100 },
          { field: 'status', operator: 'eq', value: 'active' }
        ]
      };

      expect(engine.evaluateRules(rules, { amount: 200, status: 'active' })).toBe(true);
      expect(engine.evaluateRules(rules, { amount: 50, status: 'active' })).toBe(false);
    });

    it('should evaluate OR logic', () => {
      const rules = {
        logic: 'OR',
        conditions: [
          { field: 'amount', operator: 'gt', value: 1000 },
          { field: 'isVip', operator: 'eq', value: true }
        ]
      };

      expect(engine.evaluateRules(rules, { amount: 50, isVip: true })).toBe(true);
      expect(engine.evaluateRules(rules, { amount: 50, isVip: false })).toBe(false);
    });
  });

  describe('substituteVariables', () => {
    it('should substitute simple variables', () => {
      const result = engine.substituteVariables(
        'Hello {{name}}, welcome to {{company}}!',
        { name: 'John', company: 'Acme' }
      );
      expect(result).toBe('Hello John, welcome to Acme!');
    });

    it('should substitute nested variables', () => {
      const result = engine.substituteVariables(
        'Grant: {{grant.name}} ({{grant.shares}} shares)',
        { grant: { name: 'ISO Grant', shares: 1000 } }
      );
      expect(result).toBe('Grant: ISO Grant (1000 shares)');
    });

    it('should leave unresolved variables as-is', () => {
      const result = engine.substituteVariables(
        'Hello {{name}}, your {{missing}} is ready',
        { name: 'John' }
      );
      expect(result).toBe('Hello John, your {{missing}} is ready');
    });

    it('should return null/undefined templates as-is', () => {
      expect(engine.substituteVariables(null, {})).toBeNull();
      expect(engine.substituteVariables(undefined, {})).toBeUndefined();
    });

    it('should format currency when options set', () => {
      const result = engine.substituteVariables(
        'Total: {{amount}}',
        { amount: 1234.56 },
        {
          formatCurrency: true,
          currencyFields: ['amount'],
          currency: 'USD'
        }
      );
      expect(result).toContain('1,234.56');
    });

    it('should format dates when options set', () => {
      const testDate = new Date('2026-06-15');
      const result = engine.substituteVariables(
        'Date: {{vestingDate}}',
        { vestingDate: testDate },
        { formatDates: true }
      );
      expect(result).toContain('2026');
      expect(result).toContain('June');
    });
  });

  describe('generateMessage', () => {
    it('should generate message from trigger template', async () => {
      const trigger = {
        triggerId: 'trig-1',
        name: 'Vesting Reminder',
        eventType: 'vesting',
        messageTemplate: {
          subject: 'Vesting Milestone for {{stakeholder}}',
          body: 'Your shares ({{shares}}) are vesting.',
          htmlBody: '<p>Your shares ({{shares}}) are vesting.</p>'
        },
        deliveryChannels: ['in_app', 'email']
      };

      const payload = { stakeholder: 'John', shares: 1000 };

      const message = await engine.generateMessage(trigger, payload);

      expect(message.subject).toBe('Vesting Milestone for John');
      expect(message.body).toBe('Your shares (1000) are vesting.');
      expect(message.htmlBody).toContain('1000');
      expect(message.channels).toEqual(['in_app', 'email']);
      expect(message.metadata.triggerId).toBe('trig-1');
    });

    it('should throw if trigger has no message template', async () => {
      await expect(
        engine.generateMessage({}, {})
      ).rejects.toThrow('Trigger has no message template');
    });

    it('should default channels to in_app', async () => {
      const trigger = {
        messageTemplate: { subject: 'Test', body: 'Test' }
      };

      const message = await engine.generateMessage(trigger, {});
      expect(message.channels).toEqual(['in_app']);
    });
  });

  describe('findMatchingTriggers', () => {
    it('should find triggers matching event type and company', async () => {
      const triggers = [
        { triggerId: 't1', isActive: true, triggerRules: null },
        { triggerId: 't2', isActive: true, triggerRules: { conditions: [] } }
      ];

      databaseAdapter.find.mockResolvedValue(triggers);

      const result = await engine.findMatchingTriggers({
        type: 'vesting',
        companyId: 'comp-1',
        payload: {}
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        expect.objectContaining({ eventType: 'vesting', isActive: true }),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should filter out triggers that fail rule evaluation', async () => {
      const triggers = [
        {
          triggerId: 't1',
          isActive: true,
          triggerRules: {
            logic: 'AND',
            conditions: [{ field: 'amount', operator: 'gt', value: 1000 }]
          }
        }
      ];

      databaseAdapter.find.mockResolvedValue(triggers);

      const result = await engine.findMatchingTriggers({
        type: 'vesting',
        companyId: 'comp-1',
        payload: { amount: 500 }
      });

      expect(result).toHaveLength(0);
    });

    it('should filter out inactive triggers', async () => {
      databaseAdapter.find.mockResolvedValue([
        { triggerId: 't1', isActive: false, triggerRules: null }
      ]);

      const result = await engine.findMatchingTriggers({
        type: 'vesting',
        companyId: 'comp-1',
        payload: {}
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('processEvent', () => {
    it('should process event and dispatch immediate triggers', async () => {
      const trigger = {
        _id: 'tid1',
        triggerId: 'trig-1',
        name: 'Test Trigger',
        eventType: 'vesting',
        isActive: true,
        triggerType: 'immediate',
        triggerRules: null,
        messageTemplate: { subject: 'Test', body: 'Hello {{name}}' },
        deliveryChannels: ['in_app'],
        recipients: { roles: ['admin'] }
      };

      databaseAdapter.find.mockImplementation((model) => {
        if (model === 'MessageTrigger') return Promise.resolve([trigger]);
        if (model === 'User') return Promise.resolve([{ _id: 'u1', name: 'Admin' }]);
        return Promise.resolve([]);
      });
      databaseAdapter.create.mockResolvedValue({});
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await engine.processEvent({
        type: 'vesting',
        companyId: 'comp-1',
        payload: { name: 'John' }
      });

      expect(result.processed).toBe(true);
      expect(result.triggersMatched).toBe(1);
      expect(result.messagesDispatched).toBe(1);
    });

    it('should handle scheduled triggers', async () => {
      const trigger = {
        triggerId: 'trig-2',
        isActive: true,
        triggerType: 'scheduled',
        triggerRules: null,
        schedule: { scheduledAt: new Date() },
        companyId: 'comp-1',
        name: 'Scheduled'
      };

      databaseAdapter.find.mockResolvedValue([trigger]);
      databaseAdapter.create.mockResolvedValue({});

      const result = await engine.processEvent({
        type: 'vesting',
        companyId: 'comp-1',
        payload: {}
      });

      expect(result.scheduledMessages).toBe(1);
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledTrigger',
        expect.objectContaining({ triggerType: 'scheduled' })
      );
    });

    it('should handle delayed triggers', async () => {
      const trigger = {
        triggerId: 'trig-3',
        isActive: true,
        triggerType: 'delayed',
        triggerRules: null,
        schedule: { delayMinutes: 30 },
        companyId: 'comp-1',
        name: 'Delayed'
      };

      databaseAdapter.find.mockResolvedValue([trigger]);
      databaseAdapter.create.mockResolvedValue({});

      const result = await engine.processEvent({
        type: 'vesting',
        companyId: 'comp-1',
        payload: {}
      });

      expect(result.scheduledMessages).toBe(1);
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledTrigger',
        expect.objectContaining({
          triggerType: 'delayed',
          metadata: expect.objectContaining({ delayMinutes: 30 })
        })
      );
    });

    it('should catch errors per trigger and continue', async () => {
      const trigger1 = {
        triggerId: 'trig-1',
        isActive: true,
        triggerType: 'immediate',
        triggerRules: null,
        messageTemplate: null // will cause error
      };
      const trigger2 = {
        _id: 'tid2',
        triggerId: 'trig-2',
        isActive: true,
        triggerType: 'immediate',
        triggerRules: null,
        messageTemplate: { subject: 'Test', body: 'Body' },
        deliveryChannels: ['in_app'],
        recipients: {}
      };

      databaseAdapter.find.mockImplementation((model) => {
        if (model === 'MessageTrigger') return Promise.resolve([trigger1, trigger2]);
        return Promise.resolve([]);
      });
      databaseAdapter.create.mockResolvedValue({});
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await engine.processEvent({
        type: 'vesting',
        companyId: 'comp-1',
        payload: {}
      });

      expect(result.errors).toHaveLength(1);
      expect(result.triggersMatched).toBe(2);
    });
  });

  describe('resolveRecipients', () => {
    it('should resolve users by roles', async () => {
      databaseAdapter.find.mockResolvedValue([
        { _id: 'u1', name: 'Admin' },
        { _id: 'u2', name: 'Manager' }
      ]);

      const recipients = await engine.resolveRecipients(
        { roles: ['admin', 'manager'], companyId: 'comp-1' },
        {}
      );

      expect(recipients).toHaveLength(2);
    });

    it('should resolve specific users', async () => {
      databaseAdapter.find.mockResolvedValue([
        { _id: 'u1', name: 'Specific User' }
      ]);

      const recipients = await engine.resolveRecipients(
        { specificUsers: ['u1'] },
        {}
      );

      expect(recipients).toHaveLength(1);
    });

    it('should resolve dynamic recipient from payload', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: 'u3', name: 'Dynamic' });

      const recipients = await engine.resolveRecipients(
        { dynamicRecipient: 'assignee.userId' },
        { assignee: { userId: 'u3' } }
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0].name).toBe('Dynamic');
    });

    it('should deduplicate recipients', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([{ _id: 'u1' }])
        .mockResolvedValueOnce([{ _id: 'u1' }]);

      const recipients = await engine.resolveRecipients(
        { roles: ['admin'], specificUsers: ['u1'] },
        {}
      );

      expect(recipients).toHaveLength(1);
    });

    it('should handle empty recipient config', async () => {
      const recipients = await engine.resolveRecipients({}, {});
      expect(recipients).toHaveLength(0);
    });

    it('should skip dynamic recipient when not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      const recipients = await engine.resolveRecipients(
        { dynamicRecipient: 'userId' },
        { userId: 'u-missing' }
      );

      expect(recipients).toHaveLength(0);
    });
  });

  describe('dispatchMessage', () => {
    it('should dispatch in_app notification', async () => {
      databaseAdapter.create.mockResolvedValue({});

      await engine.dispatchMessage(
        { subject: 'Test', body: 'Body', channels: ['in_app'] },
        [{ _id: 'u1' }],
        { triggerId: 'trig-1' }
      );

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Notification',
        expect.objectContaining({
          title: 'Test',
          message: 'Body',
          recipient: 'u1'
        })
      );
    });

    it('should dispatch webhook when event streaming service is set', async () => {
      const mockPublish = jest.fn().mockResolvedValue();
      engine.eventStreamingService = { publishEvent: mockPublish };

      await engine.dispatchMessage(
        { subject: 'Test', body: 'Body', channels: ['webhook'] },
        [{ _id: 'u1' }],
        { triggerId: 'trig-1', eventType: 'vesting' }
      );

      expect(mockPublish).toHaveBeenCalled();
    });
  });

  describe('logTriggerExecution', () => {
    it('should log successful execution', async () => {
      databaseAdapter.create.mockResolvedValue({});

      await engine.logTriggerExecution(
        { triggerId: 'trig-1', name: 'Test', eventType: 'vesting', companyId: 'c1' },
        { subject: 'Sub', body: 'Body', channels: ['in_app'] },
        [{ _id: 'u1' }],
        'success'
      );

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TriggerHistory',
        expect.objectContaining({
          triggerId: 'trig-1',
          status: 'success',
          recipientCount: 1
        })
      );
    });

    it('should log failed execution with error details', async () => {
      databaseAdapter.create.mockResolvedValue({});

      await engine.logTriggerExecution(
        { triggerId: 'trig-1', name: 'Test', eventType: 'vesting' },
        null,
        [],
        'failed',
        new Error('dispatch failed')
      );

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TriggerHistory',
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'dispatch failed'
        })
      );
    });

    it('should handle logging failure gracefully', async () => {
      databaseAdapter.create.mockRejectedValue(new Error('db error'));

      // Should not throw
      await engine.logTriggerExecution(
        { triggerId: 'trig-1', name: 'Test', eventType: 'vesting' },
        null,
        [],
        'failed'
      );
    });
  });

  describe('queueScheduledTrigger', () => {
    it('should create a scheduled trigger record', async () => {
      databaseAdapter.create.mockResolvedValue({});

      const trigger = {
        triggerId: 'trig-1',
        companyId: 'c1',
        name: 'Scheduled',
        schedule: { scheduledAt: new Date('2026-06-15') }
      };

      await engine.queueScheduledTrigger(trigger, { data: 'test' });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledTrigger',
        expect.objectContaining({
          triggerId: 'trig-1',
          triggerType: 'scheduled',
          status: 'pending',
          payload: { data: 'test' }
        })
      );
    });
  });

  describe('queueDelayedTrigger', () => {
    it('should create a delayed trigger with computed scheduledAt', async () => {
      databaseAdapter.create.mockResolvedValue({});

      const trigger = {
        triggerId: 'trig-1',
        companyId: 'c1',
        name: 'Delayed',
        schedule: { delayMinutes: 60 }
      };

      const before = Date.now();
      await engine.queueDelayedTrigger(trigger, { data: 'test' });

      const callArg = databaseAdapter.create.mock.calls[0][1];
      const scheduledTime = new Date(callArg.scheduledAt).getTime();

      // Should be ~60 minutes in the future
      expect(scheduledTime).toBeGreaterThanOrEqual(before + 59 * 60 * 1000);
      expect(callArg.metadata.delayMinutes).toBe(60);
    });
  });

  describe('processDueScheduledTriggers', () => {
    it('should process due scheduled triggers', async () => {
      const scheduled = {
        _id: 'sched-1',
        scheduleId: 'sched_abc',
        triggerId: 'trig-1',
        payload: { name: 'John' }
      };
      const trigger = {
        _id: 'tid1',
        triggerId: 'trig-1',
        isActive: true,
        messageTemplate: { subject: 'Hello', body: 'Body' },
        deliveryChannels: ['in_app'],
        recipients: {}
      };

      databaseAdapter.find.mockImplementation((model, query) => {
        if (model === 'ScheduledTrigger') return Promise.resolve([scheduled]);
        if (model === 'MessageTrigger') return Promise.resolve([trigger]);
        return Promise.resolve([]);
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({});

      const result = await engine.processDueScheduledTriggers();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle failures in scheduled processing', async () => {
      const scheduled = {
        _id: 'sched-1',
        scheduleId: 'sched_abc',
        triggerId: 'trig-1',
        payload: {}
      };

      databaseAdapter.find.mockImplementation((model) => {
        if (model === 'ScheduledTrigger') return Promise.resolve([scheduled]);
        if (model === 'MessageTrigger') return Promise.resolve([]);
        return Promise.resolve([]);
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});
      databaseAdapter.create.mockResolvedValue({});

      const result = await engine.processDueScheduledTriggers();

      // No matching trigger found, but should complete without crash
      expect(result.processed + result.failed).toBeLessThanOrEqual(1);
    });
  });
});
