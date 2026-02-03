/**
 * MessageTrigger Model Tests
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * TDD Tests for the MessageTrigger model
 * Tests trigger definitions, message templates, and rules engine data
 */

const mongoose = require('mongoose');

// Get the model - it should already be registered from the existing mongoose instance
const MessageTrigger = require('../../../models/MessageTrigger');

describe('MessageTrigger Model', () => {
  describe('Schema Validation', () => {
    it('should have required fields defined', () => {
      const schema = MessageTrigger.schema;

      expect(schema.path('triggerId').isRequired).toBe(true);
      expect(schema.path('name').isRequired).toBe(true);
      expect(schema.path('eventType').isRequired).toBe(true);
      expect(schema.path('triggerType').isRequired).toBe(true);
    });

    it('should validate eventType enum values', () => {
      const schema = MessageTrigger.schema;
      const eventTypeEnum = schema.path('eventType').enumValues;

      expect(eventTypeEnum).toContain('vesting');
      expect(eventTypeEnum).toContain('document_signing');
      expect(eventTypeEnum).toContain('compliance_deadline');
      expect(eventTypeEnum).toContain('equity_grant');
      expect(eventTypeEnum).toContain('share_transfer');
      expect(eventTypeEnum).toContain('company_update');
      expect(eventTypeEnum).toContain('custom');
    });

    it('should validate triggerType enum values', () => {
      const schema = MessageTrigger.schema;
      const triggerTypeEnum = schema.path('triggerType').enumValues;

      expect(triggerTypeEnum).toContain('immediate');
      expect(triggerTypeEnum).toContain('scheduled');
      expect(triggerTypeEnum).toContain('delayed');
      expect(triggerTypeEnum).toContain('recurring');
    });

    it('should have messageTemplate as a required embedded schema', () => {
      const schema = MessageTrigger.schema;
      const messageTemplate = schema.path('messageTemplate');

      expect(messageTemplate).toBeDefined();
      expect(messageTemplate.schema.path('subject').isRequired).toBe(true);
      expect(messageTemplate.schema.path('body').isRequired).toBe(true);
    });

    it('should have triggerRules as an optional embedded schema', () => {
      const schema = MessageTrigger.schema;
      const triggerRules = schema.path('triggerRules');

      expect(triggerRules).toBeDefined();
      expect(triggerRules.schema.path('logic').enumValues).toContain('AND');
      expect(triggerRules.schema.path('logic').enumValues).toContain('OR');
    });

    it('should have deliveryChannels with enum validation', () => {
      const schema = MessageTrigger.schema;
      const deliveryChannels = schema.path('deliveryChannels');

      expect(deliveryChannels).toBeDefined();
    });

    it('should have priority field with enum values', () => {
      const schema = MessageTrigger.schema;
      const priority = schema.path('priority');

      expect(priority.enumValues).toContain('low');
      expect(priority.enumValues).toContain('normal');
      expect(priority.enumValues).toContain('high');
      expect(priority.enumValues).toContain('urgent');
    });

    it('should have isActive field with default true', () => {
      const schema = MessageTrigger.schema;
      const isActive = schema.path('isActive');

      expect(isActive.defaultValue).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    describe('matchesRules', () => {
      it('should return true when no rules defined', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-001',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: { subject: 'Test', body: 'Test', variables: [] }
        });

        expect(trigger.matchesRules({ any: 'payload' })).toBe(true);
      });

      it('should evaluate equality conditions', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-002',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: { subject: 'Test', body: 'Test', variables: [] },
          triggerRules: {
            conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
            logic: 'AND'
          }
        });

        expect(trigger.matchesRules({ status: 'active' })).toBe(true);
        expect(trigger.matchesRules({ status: 'inactive' })).toBe(false);
      });

      it('should evaluate greater than conditions', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-003',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: { subject: 'Test', body: 'Test', variables: [] },
          triggerRules: {
            conditions: [{ field: 'amount', operator: 'gt', value: 100 }],
            logic: 'AND'
          }
        });

        expect(trigger.matchesRules({ amount: 150 })).toBe(true);
        expect(trigger.matchesRules({ amount: 50 })).toBe(false);
      });

      it('should evaluate contains conditions for arrays', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-004',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: { subject: 'Test', body: 'Test', variables: [] },
          triggerRules: {
            conditions: [{ field: 'roles', operator: 'contains', value: 'admin' }],
            logic: 'AND'
          }
        });

        expect(trigger.matchesRules({ roles: ['admin', 'user'] })).toBe(true);
        expect(trigger.matchesRules({ roles: ['user'] })).toBe(false);
      });

      it('should evaluate OR logic', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-005',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: { subject: 'Test', body: 'Test', variables: [] },
          triggerRules: {
            conditions: [
              { field: 'status', operator: 'eq', value: 'active' },
              { field: 'status', operator: 'eq', value: 'pending' }
            ],
            logic: 'OR'
          }
        });

        expect(trigger.matchesRules({ status: 'active' })).toBe(true);
        expect(trigger.matchesRules({ status: 'pending' })).toBe(true);
        expect(trigger.matchesRules({ status: 'inactive' })).toBe(false);
      });

      it('should evaluate AND logic requiring all conditions', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-006',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: { subject: 'Test', body: 'Test', variables: [] },
          triggerRules: {
            conditions: [
              { field: 'status', operator: 'eq', value: 'active' },
              { field: 'amount', operator: 'gt', value: 100 }
            ],
            logic: 'AND'
          }
        });

        expect(trigger.matchesRules({ status: 'active', amount: 150 })).toBe(true);
        expect(trigger.matchesRules({ status: 'active', amount: 50 })).toBe(false);
        expect(trigger.matchesRules({ status: 'inactive', amount: 150 })).toBe(false);
      });
    });

    describe('renderMessage', () => {
      it('should substitute simple variables', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-007',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: {
            subject: 'Hello {{name}}',
            body: 'Your balance is {{balance}}',
            variables: ['name', 'balance']
          }
        });

        const rendered = trigger.renderMessage({ name: 'John', balance: 1000 });

        expect(rendered.subject).toBe('Hello John');
        expect(rendered.body).toBe('Your balance is 1000');
      });

      it('should substitute nested variables', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-008',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: {
            subject: 'User: {{user.name}}',
            body: 'Email: {{user.email}}',
            variables: ['user.name', 'user.email']
          }
        });

        const rendered = trigger.renderMessage({
          user: { name: 'John', email: 'john@example.com' }
        });

        expect(rendered.subject).toBe('User: John');
        expect(rendered.body).toBe('Email: john@example.com');
      });

      it('should preserve unmatched variables', () => {
        const trigger = new MessageTrigger({
          triggerId: 'TEST-009',
          name: 'Test',
          eventType: 'vesting',
          triggerType: 'immediate',
          messageTemplate: {
            subject: 'Hello {{name}}',
            body: 'Missing: {{unknown}}',
            variables: ['name', 'unknown']
          }
        });

        const rendered = trigger.renderMessage({ name: 'John' });

        expect(rendered.subject).toBe('Hello John');
        expect(rendered.body).toBe('Missing: {{unknown}}');
      });
    });
  });

  describe('Static Methods', () => {
    it('should have findActiveByEventType method', () => {
      expect(typeof MessageTrigger.findActiveByEventType).toBe('function');
    });
  });

  describe('Indexes', () => {
    it('should have triggerId indexed', () => {
      const indexes = MessageTrigger.schema.indexes();
      const triggerIdIndex = indexes.find(idx => idx[0].triggerId);
      expect(triggerIdIndex).toBeDefined();
    });

    it('should have eventType indexed', () => {
      const indexes = MessageTrigger.schema.indexes();
      const eventTypeIndex = indexes.find(idx => idx[0].eventType);
      expect(eventTypeIndex).toBeDefined();
    });
  });
});
