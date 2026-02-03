/**
 * EmailTracking Model Tests
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * TDD: Tests for EmailTracking model schema validation
 */

describe('EmailTracking Model', () => {
  let EmailTracking;

  beforeAll(() => {
    // Reset modules to get fresh model
    jest.resetModules();
    // Require the actual model
    EmailTracking = require('../../../models/EmailTracking');
  });

  afterAll(async () => {
    // Clean up mongoose connections if needed
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Schema Definition', () => {
    it('should define the EmailTracking model', () => {
      expect(EmailTracking).toBeDefined();
      expect(EmailTracking.modelName).toBe('EmailTracking');
    });

    it('should have required fields', () => {
      const schema = EmailTracking.schema;
      expect(schema.path('trackingId')).toBeDefined();
      expect(schema.path('messageId')).toBeDefined();
      expect(schema.path('recipientEmail')).toBeDefined();
      expect(schema.path('senderEmail')).toBeDefined();
      expect(schema.path('subject')).toBeDefined();
    });

    it('should have status field with enum values', () => {
      const schema = EmailTracking.schema;
      const statusPath = schema.path('status');
      expect(statusPath).toBeDefined();
      expect(statusPath.enumValues).toContain('queued');
      expect(statusPath.enumValues).toContain('sent');
      expect(statusPath.enumValues).toContain('delivered');
      expect(statusPath.enumValues).toContain('opened');
      expect(statusPath.enumValues).toContain('clicked');
      expect(statusPath.enumValues).toContain('bounced');
      expect(statusPath.enumValues).toContain('failed');
      expect(statusPath.enumValues).toContain('spam');
      expect(statusPath.enumValues).toContain('unsubscribed');
    });

    it('should have bounceType field with enum values', () => {
      const schema = EmailTracking.schema;
      const bounceTypePath = schema.path('bounceType');
      expect(bounceTypePath).toBeDefined();
      expect(bounceTypePath.enumValues).toContain('hard');
      expect(bounceTypePath.enumValues).toContain('soft');
      expect(bounceTypePath.enumValues).toContain('undetermined');
    });
  });

  describe('Default Values', () => {
    it('should default status to queued', () => {
      const schema = EmailTracking.schema;
      const statusPath = schema.path('status');
      expect(statusPath.defaultValue).toBe('queued');
    });

    it('should default openCount to 0', () => {
      const schema = EmailTracking.schema;
      const openCountPath = schema.path('openCount');
      expect(openCountPath.defaultValue).toBe(0);
    });

    it('should default clickCount to 0', () => {
      const schema = EmailTracking.schema;
      const clickCountPath = schema.path('clickCount');
      expect(clickCountPath.defaultValue).toBe(0);
    });
  });

  describe('Index Definitions', () => {
    it('should have indexes defined', () => {
      const schema = EmailTracking.schema;
      const indexes = schema.indexes();
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should have index on messageId', () => {
      const schema = EmailTracking.schema;
      const messageIdPath = schema.path('messageId');
      expect(messageIdPath.options.index).toBe(true);
    });

    it('should have index on recipientEmail', () => {
      const schema = EmailTracking.schema;
      const recipientEmailPath = schema.path('recipientEmail');
      expect(recipientEmailPath.options.index).toBe(true);
    });
  });

  describe('Virtual Properties', () => {
    it('should have engagementScore virtual', () => {
      const schema = EmailTracking.schema;
      expect(schema.virtuals.engagementScore).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    it('should have isEngaged method', () => {
      const schema = EmailTracking.schema;
      expect(schema.methods.isEngaged).toBeDefined();
      expect(typeof schema.methods.isEngaged).toBe('function');
    });

    it('should have getDeliveryTime method', () => {
      const schema = EmailTracking.schema;
      expect(schema.methods.getDeliveryTime).toBeDefined();
      expect(typeof schema.methods.getDeliveryTime).toBe('function');
    });
  });

  describe('Static Methods', () => {
    it('should have getDeliveryStats static method', () => {
      expect(EmailTracking.getDeliveryStats).toBeDefined();
      expect(typeof EmailTracking.getDeliveryStats).toBe('function');
    });
  });
});
