/**
 * MessageTrigger Model Tests
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Tests for ZeroDB-based MessageTrigger model
 */
process.env.SKIP_DB_SETUP = 'true';

const MessageTrigger = require('../../../models/MessageTrigger');

describe('MessageTrigger Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(MessageTrigger.tableName).toBe('message_triggers');
    });

    it('should have required fields defined', () => {
      const schema = MessageTrigger.schema;
      expect(schema.triggerId.required).toBe(true);
      expect(schema.name.required).toBe(true);
      expect(schema.eventType.required).toBe(true);
      expect(schema.triggerType.required).toBe(true);
    });

    it('should validate eventType enum values', () => {
      const enumValues = MessageTrigger.schema.eventType.enum;
      expect(enumValues).toContain('vesting');
      expect(enumValues).toContain('document_signing');
      expect(enumValues).toContain('compliance_deadline');
      expect(enumValues).toContain('equity_grant');
      expect(enumValues).toContain('share_transfer');
      expect(enumValues).toContain('company_update');
      expect(enumValues).toContain('custom');
    });

    it('should validate triggerType enum values', () => {
      const enumValues = MessageTrigger.schema.triggerType.enum;
      expect(enumValues).toContain('immediate');
      expect(enumValues).toContain('scheduled');
      expect(enumValues).toContain('delayed');
      expect(enumValues).toContain('recurring');
    });

    it('should have messageTemplate as a required object field', () => {
      const schema = MessageTrigger.schema;
      expect(schema.messageTemplate).toBeDefined();
      expect(schema.messageTemplate.type).toBe('object');
      expect(schema.messageTemplate.required).toBe(true);
    });

    it('should have triggerRules as an object field', () => {
      const schema = MessageTrigger.schema;
      expect(schema.triggerRules).toBeDefined();
      expect(schema.triggerRules.type).toBe('object');
    });

    it('should have triggerRules default with AND logic', () => {
      const triggerRulesDefault = MessageTrigger.schema.triggerRules.default;
      expect(triggerRulesDefault.logic).toBe('AND');
      expect(triggerRulesDefault.conditions).toEqual([]);
    });

    it('should have deliveryChannels as array field', () => {
      const schema = MessageTrigger.schema;
      expect(schema.deliveryChannels).toBeDefined();
      expect(schema.deliveryChannels.type).toBe('array');
    });

    it('should have priority field with enum values', () => {
      const enumValues = MessageTrigger.schema.priority.enum;
      expect(enumValues).toContain('low');
      expect(enumValues).toContain('normal');
      expect(enumValues).toContain('high');
      expect(enumValues).toContain('urgent');
    });

    it('should have isActive field with default true', () => {
      expect(MessageTrigger.schema.isActive.default).toBe(true);
    });
  });

  describe('matchesRules', () => {
    it('should return true when no rules defined', () => {
      const trigger = {
        triggerRules: null
      };
      expect(MessageTrigger.matchesRules(trigger, { any: 'payload' })).toBe(true);
    });

    it('should return true when conditions array is empty', () => {
      const trigger = {
        triggerRules: { conditions: [], logic: 'AND' }
      };
      expect(MessageTrigger.matchesRules(trigger, { any: 'payload' })).toBe(true);
    });

    it('should evaluate equality conditions', () => {
      const trigger = {
        triggerRules: {
          conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
          logic: 'AND'
        }
      };

      expect(MessageTrigger.matchesRules(trigger, { status: 'active' })).toBe(true);
      expect(MessageTrigger.matchesRules(trigger, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate greater than conditions', () => {
      const trigger = {
        triggerRules: {
          conditions: [{ field: 'amount', operator: 'gt', value: 100 }],
          logic: 'AND'
        }
      };

      expect(MessageTrigger.matchesRules(trigger, { amount: 150 })).toBe(true);
      expect(MessageTrigger.matchesRules(trigger, { amount: 50 })).toBe(false);
    });

    it('should evaluate contains conditions for arrays', () => {
      const trigger = {
        triggerRules: {
          conditions: [{ field: 'roles', operator: 'contains', value: 'admin' }],
          logic: 'AND'
        }
      };

      expect(MessageTrigger.matchesRules(trigger, { roles: ['admin', 'user'] })).toBe(true);
      expect(MessageTrigger.matchesRules(trigger, { roles: ['user'] })).toBe(false);
    });

    it('should evaluate OR logic', () => {
      const trigger = {
        triggerRules: {
          conditions: [
            { field: 'status', operator: 'eq', value: 'active' },
            { field: 'status', operator: 'eq', value: 'pending' }
          ],
          logic: 'OR'
        }
      };

      expect(MessageTrigger.matchesRules(trigger, { status: 'active' })).toBe(true);
      expect(MessageTrigger.matchesRules(trigger, { status: 'pending' })).toBe(true);
      expect(MessageTrigger.matchesRules(trigger, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate AND logic requiring all conditions', () => {
      const trigger = {
        triggerRules: {
          conditions: [
            { field: 'status', operator: 'eq', value: 'active' },
            { field: 'amount', operator: 'gt', value: 100 }
          ],
          logic: 'AND'
        }
      };

      expect(MessageTrigger.matchesRules(trigger, { status: 'active', amount: 150 })).toBe(true);
      expect(MessageTrigger.matchesRules(trigger, { status: 'active', amount: 50 })).toBe(false);
      expect(MessageTrigger.matchesRules(trigger, { status: 'inactive', amount: 150 })).toBe(false);
    });
  });

  describe('renderMessage', () => {
    it('should substitute simple variables', () => {
      const trigger = {
        messageTemplate: {
          subject: 'Hello {{name}}',
          body: 'Your balance is {{balance}}',
          variables: ['name', 'balance']
        }
      };

      const rendered = MessageTrigger.renderMessage(trigger, { name: 'John', balance: 1000 });

      expect(rendered.subject).toBe('Hello John');
      expect(rendered.body).toBe('Your balance is 1000');
    });

    it('should substitute nested variables', () => {
      const trigger = {
        messageTemplate: {
          subject: 'User: {{user.name}}',
          body: 'Email: {{user.email}}',
          variables: ['user.name', 'user.email']
        }
      };

      const rendered = MessageTrigger.renderMessage(trigger, {
        user: { name: 'John', email: 'john@example.com' }
      });

      expect(rendered.subject).toBe('User: John');
      expect(rendered.body).toBe('Email: john@example.com');
    });

    it('should preserve unmatched variables', () => {
      const trigger = {
        messageTemplate: {
          subject: 'Hello {{name}}',
          body: 'Missing: {{unknown}}',
          variables: ['name', 'unknown']
        }
      };

      const rendered = MessageTrigger.renderMessage(trigger, { name: 'John' });

      expect(rendered.subject).toBe('Hello John');
      expect(rendered.body).toBe('Missing: {{unknown}}');
    });
  });

  describe('Constants', () => {
    it('should export EVENT_TYPES constant', () => {
      expect(MessageTrigger.EVENT_TYPES).toBeDefined();
      expect(MessageTrigger.EVENT_TYPES).toContain('vesting');
      expect(MessageTrigger.EVENT_TYPES).toContain('custom');
    });

    it('should export TRIGGER_TYPES constant', () => {
      expect(MessageTrigger.TRIGGER_TYPES).toBeDefined();
      expect(MessageTrigger.TRIGGER_TYPES).toContain('immediate');
    });

    it('should export DELIVERY_CHANNELS constant', () => {
      expect(MessageTrigger.DELIVERY_CHANNELS).toBeDefined();
      expect(MessageTrigger.DELIVERY_CHANNELS).toContain('email');
    });

    it('should export PRIORITY_LEVELS constant', () => {
      expect(MessageTrigger.PRIORITY_LEVELS).toBeDefined();
      expect(MessageTrigger.PRIORITY_LEVELS).toContain('normal');
    });

    it('should export LOGIC_TYPES constant', () => {
      expect(MessageTrigger.LOGIC_TYPES).toBeDefined();
      expect(MessageTrigger.LOGIC_TYPES).toContain('AND');
      expect(MessageTrigger.LOGIC_TYPES).toContain('OR');
    });
  });

  describe('Static Methods', () => {
    it('should have findActiveByEventType method', () => {
      expect(typeof MessageTrigger.findActiveByEventType).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof MessageTrigger.findByCompany).toBe('function');
    });

    it('should have findByTriggerId method', () => {
      expect(typeof MessageTrigger.findByTriggerId).toBe('function');
    });

    it('should have activate method', () => {
      expect(typeof MessageTrigger.activate).toBe('function');
    });

    it('should have deactivate method', () => {
      expect(typeof MessageTrigger.deactivate).toBe('function');
    });

    it('should have recordFired method', () => {
      expect(typeof MessageTrigger.recordFired).toBe('function');
    });
  });
});
