/**
 * Trigger Engine Service Tests
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * TDD Tests for the trigger processing engine
 * Tests event handling, rule evaluation, variable substitution, and message dispatch
 */

const TriggerEngineService = require('../../../services/triggerEngineService');
const databaseAdapter = require('../../../services/databaseAdapter');
const EventStreamingService = require('../../../services/eventStreamingService');

// Mock dependencies
jest.mock('../../../services/databaseAdapter');
jest.mock('../../../services/eventStreamingService');

describe('TriggerEngineService', () => {
  let triggerEngine;
  let mockEventStreaming;

  beforeEach(() => {
    jest.clearAllMocks();
    triggerEngine = new TriggerEngineService();
    mockEventStreaming = new EventStreamingService();
    triggerEngine.eventStreamingService = mockEventStreaming;
  });

  describe('Event Registration', () => {
    it('should register supported event types', () => {
      const supportedEvents = triggerEngine.getSupportedEventTypes();

      expect(supportedEvents).toContain('vesting');
      expect(supportedEvents).toContain('document_signing');
      expect(supportedEvents).toContain('compliance_deadline');
      expect(supportedEvents).toContain('equity_grant');
      expect(supportedEvents).toContain('share_transfer');
      expect(supportedEvents).toContain('company_update');
    });

    it('should validate event type on trigger registration', () => {
      expect(() => {
        triggerEngine.validateEventType('invalid_event');
      }).toThrow('Invalid event type: invalid_event');
    });

    it('should accept valid event types', () => {
      expect(() => {
        triggerEngine.validateEventType('vesting');
      }).not.toThrow();
    });
  });

  describe('Trigger Matching', () => {
    it('should find matching triggers for an event', async () => {
      const mockTriggers = [
        {
          triggerId: 'TRG-001',
          name: 'Vesting Alert',
          eventType: 'vesting',
          isActive: true,
          triggerRules: null
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);

      const event = {
        type: 'vesting',
        payload: { vestingAmount: 1000, recipientId: 'user-123' },
        companyId: 'company-001'
      };

      const matches = await triggerEngine.findMatchingTriggers(event);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        expect.objectContaining({
          eventType: 'vesting',
          isActive: true
        }),
        expect.any(Object)
      );
      expect(matches).toHaveLength(1);
    });

    it('should filter triggers by company scope', async () => {
      const mockTriggers = [
        { triggerId: 'TRG-001', eventType: 'vesting', isActive: true, companyId: 'company-001' }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);

      const event = {
        type: 'vesting',
        payload: {},
        companyId: 'company-001'
      };

      await triggerEngine.findMatchingTriggers(event);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        expect.objectContaining({
          $or: expect.arrayContaining([
            { companyId: 'company-001' },
            { companyId: null }
          ])
        }),
        expect.any(Object)
      );
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate simple equality condition', () => {
      const rule = {
        conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
        logic: 'AND'
      };
      const payload = { status: 'active' };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate inequality condition', () => {
      const rule = {
        conditions: [{ field: 'status', operator: 'ne', value: 'inactive' }],
        logic: 'AND'
      };
      const payload = { status: 'active' };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate greater than condition', () => {
      const rule = {
        conditions: [{ field: 'amount', operator: 'gt', value: 100 }],
        logic: 'AND'
      };
      const payload = { amount: 150 };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate greater than or equal condition', () => {
      const rule = {
        conditions: [{ field: 'amount', operator: 'gte', value: 100 }],
        logic: 'AND'
      };
      const payload = { amount: 100 };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate less than condition', () => {
      const rule = {
        conditions: [{ field: 'daysRemaining', operator: 'lt', value: 7 }],
        logic: 'AND'
      };
      const payload = { daysRemaining: 5 };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate less than or equal condition', () => {
      const rule = {
        conditions: [{ field: 'daysRemaining', operator: 'lte', value: 7 }],
        logic: 'AND'
      };
      const payload = { daysRemaining: 7 };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate contains condition for arrays', () => {
      const rule = {
        conditions: [{ field: 'roles', operator: 'contains', value: 'admin' }],
        logic: 'AND'
      };
      const payload = { roles: ['admin', 'user'] };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate contains condition for strings', () => {
      const rule = {
        conditions: [{ field: 'email', operator: 'contains', value: '@company.com' }],
        logic: 'AND'
      };
      const payload = { email: 'user@company.com' };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should evaluate AND logic with multiple conditions', () => {
      const rule = {
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'amount', operator: 'gt', value: 100 }
        ],
        logic: 'AND'
      };
      const payload = { status: 'active', amount: 150 };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should fail AND logic when one condition fails', () => {
      const rule = {
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'amount', operator: 'gt', value: 100 }
        ],
        logic: 'AND'
      };
      const payload = { status: 'active', amount: 50 };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(false);
    });

    it('should evaluate OR logic with multiple conditions', () => {
      const rule = {
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'status', operator: 'eq', value: 'pending' }
        ],
        logic: 'OR'
      };
      const payload = { status: 'pending' };

      const result = triggerEngine.evaluateRules(rule, payload);
      expect(result).toBe(true);
    });

    it('should return true when no rules are defined', () => {
      const result = triggerEngine.evaluateRules(null, { any: 'payload' });
      expect(result).toBe(true);
    });

    it('should return true when rules have no conditions', () => {
      const rule = { conditions: [], logic: 'AND' };
      const result = triggerEngine.evaluateRules(rule, { any: 'payload' });
      expect(result).toBe(true);
    });
  });

  describe('Variable Substitution', () => {
    it('should substitute simple variables in template', () => {
      const template = 'Hello {{name}}, your balance is {{balance}}';
      const variables = { name: 'John', balance: 1000 };

      const result = triggerEngine.substituteVariables(template, variables);
      expect(result).toBe('Hello John, your balance is 1000');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, your {{field}} is {{value}}';
      const variables = { name: 'John' };

      const result = triggerEngine.substituteVariables(template, variables);
      expect(result).toBe('Hello John, your {{field}} is {{value}}');
    });

    it('should substitute nested object values', () => {
      const template = 'User {{user.name}} has email {{user.email}}';
      const variables = { user: { name: 'John', email: 'john@example.com' } };

      const result = triggerEngine.substituteVariables(template, variables);
      expect(result).toBe('User John has email john@example.com');
    });

    it('should format date variables', () => {
      const template = 'Deadline: {{deadline}}';
      const deadline = new Date('2025-12-31');
      const variables = { deadline };

      const result = triggerEngine.substituteVariables(template, variables, { formatDates: true });
      expect(result).toContain('2025');
    });

    it('should format currency variables', () => {
      const template = 'Amount: {{amount}}';
      const variables = { amount: 10000 };

      const result = triggerEngine.substituteVariables(template, variables, {
        formatCurrency: true,
        currencyFields: ['amount']
      });
      expect(result).toMatch(/Amount: .+10.+000/);
    });
  });

  describe('Message Generation', () => {
    it('should generate message from trigger and payload', async () => {
      const trigger = {
        triggerId: 'TRG-001',
        messageTemplate: {
          subject: 'Vesting: {{vestingAmount}} shares',
          body: 'Dear {{recipientName}}, {{vestingAmount}} shares have vested.',
          variables: ['vestingAmount', 'recipientName']
        },
        deliveryChannels: ['email', 'in_app']
      };

      const payload = {
        vestingAmount: 1000,
        recipientName: 'John Doe'
      };

      const message = await triggerEngine.generateMessage(trigger, payload);

      expect(message.subject).toBe('Vesting: 1000 shares');
      expect(message.body).toContain('John Doe');
      expect(message.body).toContain('1000 shares');
      expect(message.channels).toContain('email');
    });

    it('should include metadata in generated message', async () => {
      const trigger = {
        triggerId: 'TRG-001',
        messageTemplate: {
          subject: 'Test',
          body: 'Test message',
          variables: []
        },
        deliveryChannels: ['email']
      };

      const message = await triggerEngine.generateMessage(trigger, {});

      expect(message.metadata).toBeDefined();
      expect(message.metadata.triggerId).toBe('TRG-001');
      expect(message.metadata.generatedAt).toBeDefined();
    });
  });

  describe('Event Processing', () => {
    it('should process event and dispatch messages', async () => {
      const mockTriggers = [
        {
          triggerId: 'TRG-001',
          eventType: 'vesting',
          isActive: true,
          triggerType: 'immediate',
          triggerRules: null,
          messageTemplate: {
            subject: 'Vesting Alert',
            body: 'Shares vested',
            variables: []
          },
          deliveryChannels: ['email'],
          recipients: {
            dynamicRecipient: 'recipientId'
          }
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);
      databaseAdapter.create.mockResolvedValue({ _id: 'history-001' });

      const event = {
        type: 'vesting',
        payload: { vestingAmount: 1000, recipientId: 'user-123' },
        companyId: 'company-001'
      };

      const result = await triggerEngine.processEvent(event);

      expect(result.processed).toBe(true);
      expect(result.triggersMatched).toBe(1);
      expect(result.messagesDispatched).toBe(1);
    });

    it('should handle scheduled triggers differently', async () => {
      const mockTriggers = [
        {
          triggerId: 'TRG-002',
          eventType: 'compliance_deadline',
          isActive: true,
          triggerType: 'scheduled',
          schedule: {
            scheduledAt: new Date(Date.now() + 86400000)
          },
          triggerRules: null,
          messageTemplate: {
            subject: 'Deadline Reminder',
            body: 'Deadline approaching',
            variables: []
          },
          deliveryChannels: ['email']
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);
      databaseAdapter.create.mockResolvedValue({ _id: 'schedule-001' });

      const event = {
        type: 'compliance_deadline',
        payload: { deadlineDate: new Date() },
        companyId: 'company-001'
      };

      const result = await triggerEngine.processEvent(event);

      expect(result.scheduledMessages).toBe(1);
    });

    it('should skip inactive triggers', async () => {
      const mockTriggers = [
        {
          triggerId: 'TRG-003',
          eventType: 'vesting',
          isActive: false,
          triggerRules: null,
          messageTemplate: {
            subject: 'Test',
            body: 'Test',
            variables: []
          }
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);

      const event = {
        type: 'vesting',
        payload: {},
        companyId: 'company-001'
      };

      const result = await triggerEngine.processEvent(event);

      expect(result.triggersMatched).toBe(0);
    });

    it('should skip triggers that fail rule evaluation', async () => {
      const mockTriggers = [
        {
          triggerId: 'TRG-004',
          eventType: 'vesting',
          isActive: true,
          triggerRules: {
            conditions: [{ field: 'amount', operator: 'gt', value: 1000 }],
            logic: 'AND'
          },
          messageTemplate: {
            subject: 'Test',
            body: 'Test',
            variables: []
          }
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);

      const event = {
        type: 'vesting',
        payload: { amount: 500 },
        companyId: 'company-001'
      };

      const result = await triggerEngine.processEvent(event);

      expect(result.triggersMatched).toBe(0);
    });
  });

  describe('Trigger History', () => {
    it('should log trigger execution to history', async () => {
      const trigger = {
        triggerId: 'TRG-001',
        name: 'Test Trigger'
      };

      const message = {
        subject: 'Test Subject',
        body: 'Test Body',
        channels: ['email']
      };

      const recipients = ['user-123'];

      databaseAdapter.create.mockResolvedValue({ _id: 'history-001' });

      await triggerEngine.logTriggerExecution(trigger, message, recipients, 'success');

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TriggerHistory',
        expect.objectContaining({
          triggerId: 'TRG-001',
          status: 'success',
          recipientCount: 1
        })
      );
    });

    it('should log failed trigger executions', async () => {
      databaseAdapter.create.mockResolvedValue({ _id: 'history-002' });

      const trigger = { triggerId: 'TRG-002', name: 'Failed Trigger' };
      const error = new Error('Delivery failed');

      await triggerEngine.logTriggerExecution(trigger, null, [], 'failed', error);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TriggerHistory',
        expect.objectContaining({
          triggerId: 'TRG-002',
          status: 'failed',
          errorMessage: 'Delivery failed'
        })
      );
    });
  });

  describe('Scheduled Trigger Processing', () => {
    it('should queue scheduled trigger for later execution', async () => {
      const trigger = {
        triggerId: 'TRG-SCHED-001',
        triggerType: 'scheduled',
        schedule: {
          scheduledAt: new Date(Date.now() + 3600000)
        }
      };

      const payload = { data: 'test' };

      databaseAdapter.create.mockResolvedValue({ _id: 'queue-001' });

      await triggerEngine.queueScheduledTrigger(trigger, payload);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledTrigger',
        expect.objectContaining({
          triggerId: 'TRG-SCHED-001',
          scheduledAt: trigger.schedule.scheduledAt,
          status: 'pending'
        })
      );
    });

    it('should process due scheduled triggers', async () => {
      const mockScheduled = [
        {
          _id: 'sched-001',
          triggerId: 'TRG-001',
          payload: { data: 'test' },
          status: 'pending'
        }
      ];

      const mockTrigger = {
        triggerId: 'TRG-001',
        messageTemplate: {
          subject: 'Scheduled Message',
          body: 'This is scheduled',
          variables: []
        },
        deliveryChannels: ['email'],
        isActive: true
      };

      databaseAdapter.find
        .mockResolvedValueOnce(mockScheduled)
        .mockResolvedValueOnce([mockTrigger]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'processed' });
      databaseAdapter.create.mockResolvedValue({ _id: 'history-001' });

      const result = await triggerEngine.processDueScheduledTriggers();

      expect(result.processed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Delayed Triggers', () => {
    it('should handle delayed trigger with delay configuration', async () => {
      const trigger = {
        triggerId: 'TRG-DELAY-001',
        triggerType: 'delayed',
        schedule: {
          delayMinutes: 30
        }
      };

      const payload = { data: 'test' };
      const now = new Date();

      databaseAdapter.create.mockResolvedValue({ _id: 'delay-001' });

      await triggerEngine.queueDelayedTrigger(trigger, payload);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledTrigger',
        expect.objectContaining({
          triggerId: 'TRG-DELAY-001',
          status: 'pending'
        })
      );

      // Verify scheduledAt is approximately 30 minutes from now
      const callArgs = databaseAdapter.create.mock.calls[0][1];
      const scheduledTime = new Date(callArgs.scheduledAt);
      const expectedTime = new Date(now.getTime() + 30 * 60 * 1000);
      expect(Math.abs(scheduledTime - expectedTime)).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('Recipient Resolution', () => {
    it('should resolve recipients from roles', async () => {
      const mockUsers = [
        { _id: 'user-1', email: 'admin1@test.com', role: 'admin' },
        { _id: 'user-2', email: 'admin2@test.com', role: 'admin' }
      ];

      databaseAdapter.find.mockResolvedValue(mockUsers);

      const recipients = {
        roles: ['admin'],
        companyId: 'company-001'
      };

      const resolved = await triggerEngine.resolveRecipients(recipients, {});

      expect(resolved).toHaveLength(2);
    });

    it('should resolve dynamic recipients from payload', async () => {
      const mockUser = { _id: 'user-123', email: 'user@test.com' };
      databaseAdapter.findById.mockResolvedValue(mockUser);

      const recipients = {
        dynamicRecipient: 'granteeId'
      };

      const payload = { granteeId: 'user-123' };

      const resolved = await triggerEngine.resolveRecipients(recipients, payload);

      expect(resolved).toHaveLength(1);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('User', 'user-123');
    });

    it('should include specific users in recipients', async () => {
      const mockUsers = [
        { _id: 'user-1', email: 'user1@test.com' },
        { _id: 'user-2', email: 'user2@test.com' }
      ];

      databaseAdapter.find.mockResolvedValue(mockUsers);

      const recipients = {
        specificUsers: ['user-1', 'user-2']
      };

      const resolved = await triggerEngine.resolveRecipients(recipients, {});

      expect(resolved).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database connection failed'));

      const event = {
        type: 'vesting',
        payload: {},
        companyId: 'company-001'
      };

      await expect(triggerEngine.processEvent(event)).rejects.toThrow('Database connection failed');
    });

    it('should continue processing other triggers if one fails', async () => {
      const mockTriggers = [
        {
          triggerId: 'TRG-001',
          eventType: 'vesting',
          isActive: true,
          triggerType: 'immediate',
          triggerRules: null,
          messageTemplate: null, // Will cause error
          deliveryChannels: ['email']
        },
        {
          triggerId: 'TRG-002',
          eventType: 'vesting',
          isActive: true,
          triggerType: 'immediate',
          triggerRules: null,
          messageTemplate: {
            subject: 'Test',
            body: 'Test',
            variables: []
          },
          deliveryChannels: ['email']
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);
      databaseAdapter.create.mockResolvedValue({ _id: 'history-001' });

      const event = {
        type: 'vesting',
        payload: {},
        companyId: 'company-001'
      };

      const result = await triggerEngine.processEvent(event);

      // Should still process the second trigger even if first fails
      expect(result.errors).toBeDefined();
    });
  });
});
