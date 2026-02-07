/**
 * EmailTracking Model Tests
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * Tests for ZeroDB-based EmailTracking model
 */
process.env.SKIP_DB_SETUP = 'true';

const EmailTracking = require('../../../models/EmailTracking');

describe('EmailTracking Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(EmailTracking.tableName).toBe('email_tracking');
    });

    it('should define the EmailTracking model', () => {
      expect(EmailTracking).toBeDefined();
      expect(EmailTracking.schema).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = EmailTracking.schema;
      expect(schema.trackingId).toBeDefined();
      expect(schema.trackingId.required).toBe(true);
      expect(schema.messageId).toBeDefined();
      expect(schema.messageId.required).toBe(true);
      expect(schema.recipientEmail).toBeDefined();
      expect(schema.recipientEmail.required).toBe(true);
      expect(schema.senderEmail).toBeDefined();
      expect(schema.senderEmail.required).toBe(true);
      expect(schema.subject).toBeDefined();
      expect(schema.subject.required).toBe(true);
    });

    it('should have status field with enum values', () => {
      const enumValues = EmailTracking.schema.status.enum;
      expect(enumValues).toContain('queued');
      expect(enumValues).toContain('sent');
      expect(enumValues).toContain('delivered');
      expect(enumValues).toContain('opened');
      expect(enumValues).toContain('clicked');
      expect(enumValues).toContain('bounced');
      expect(enumValues).toContain('failed');
      expect(enumValues).toContain('spam');
      expect(enumValues).toContain('unsubscribed');
    });

    it('should have bounceType field with enum values', () => {
      const enumValues = EmailTracking.schema.bounceType.enum;
      expect(enumValues).toContain('hard');
      expect(enumValues).toContain('soft');
      expect(enumValues).toContain('undetermined');
    });
  });

  describe('Default Values', () => {
    it('should default status to queued', () => {
      expect(EmailTracking.schema.status.default).toBe('queued');
    });

    it('should default openCount to 0', () => {
      expect(EmailTracking.schema.openCount.default).toBe(0);
    });

    it('should default clickCount to 0', () => {
      expect(EmailTracking.schema.clickCount.default).toBe(0);
    });
  });

  describe('Business Logic Methods', () => {
    describe('getEngagementScore', () => {
      it('should return 0 for queued email', () => {
        const tracking = { status: 'queued', openCount: 0, clickCount: 0 };
        expect(EmailTracking.getEngagementScore(tracking)).toBe(0);
      });

      it('should count delivery status', () => {
        const tracking = { status: 'delivered', openCount: 0, clickCount: 0 };
        expect(EmailTracking.getEngagementScore(tracking)).toBe(1);
      });

      it('should count opens (capped at 5)', () => {
        const tracking = { status: 'opened', openCount: 3, clickCount: 0 };
        expect(EmailTracking.getEngagementScore(tracking)).toBe(4); // 1 (status) + 3 (opens)
      });

      it('should cap opens at 5', () => {
        const tracking = { status: 'opened', openCount: 10, clickCount: 0 };
        expect(EmailTracking.getEngagementScore(tracking)).toBe(6); // 1 (status) + 5 (capped)
      });

      it('should weight clicks higher', () => {
        const tracking = { status: 'clicked', openCount: 1, clickCount: 2 };
        expect(EmailTracking.getEngagementScore(tracking)).toBe(6); // 1 (status) + 1 (open) + 4 (2 clicks * 2)
      });
    });

    describe('isEngaged', () => {
      it('should return true if opened', () => {
        const tracking = { openCount: 1, clickCount: 0 };
        expect(EmailTracking.isEngaged(tracking)).toBe(true);
      });

      it('should return true if clicked', () => {
        const tracking = { openCount: 0, clickCount: 1 };
        expect(EmailTracking.isEngaged(tracking)).toBe(true);
      });

      it('should return false if no opens or clicks', () => {
        const tracking = { openCount: 0, clickCount: 0 };
        expect(EmailTracking.isEngaged(tracking)).toBe(false);
      });
    });

    describe('getDeliveryTime', () => {
      it('should calculate delivery time in ms', () => {
        const sentAt = new Date('2025-01-01T10:00:00Z');
        const deliveredAt = new Date('2025-01-01T10:00:05Z');
        const tracking = {
          sentAt: sentAt.toISOString(),
          deliveredAt: deliveredAt.toISOString()
        };
        expect(EmailTracking.getDeliveryTime(tracking)).toBe(5000);
      });

      it('should return null when deliveredAt missing', () => {
        const tracking = { sentAt: new Date().toISOString() };
        expect(EmailTracking.getDeliveryTime(tracking)).toBeNull();
      });

      it('should return null when sentAt missing', () => {
        const tracking = { deliveredAt: new Date().toISOString() };
        expect(EmailTracking.getDeliveryTime(tracking)).toBeNull();
      });
    });
  });

  describe('Constants', () => {
    it('should export EMAIL_PROVIDERS constant', () => {
      expect(EmailTracking.EMAIL_PROVIDERS).toBeDefined();
      expect(EmailTracking.EMAIL_PROVIDERS).toContain('sendgrid');
      expect(EmailTracking.EMAIL_PROVIDERS).toContain('ses');
    });

    it('should export VALID_STATUSES constant', () => {
      expect(EmailTracking.VALID_STATUSES).toBeDefined();
      expect(EmailTracking.VALID_STATUSES).toContain('queued');
      expect(EmailTracking.VALID_STATUSES).toContain('delivered');
    });

    it('should export BOUNCE_TYPES constant', () => {
      expect(EmailTracking.BOUNCE_TYPES).toBeDefined();
      expect(EmailTracking.BOUNCE_TYPES).toContain('hard');
      expect(EmailTracking.BOUNCE_TYPES).toContain('soft');
    });
  });

  describe('Static Methods', () => {
    it('should have getDeliveryStats static method', () => {
      expect(EmailTracking.getDeliveryStats).toBeDefined();
      expect(typeof EmailTracking.getDeliveryStats).toBe('function');
    });

    it('should have findByTrackingId method', () => {
      expect(typeof EmailTracking.findByTrackingId).toBe('function');
    });

    it('should have findByMessageId method', () => {
      expect(typeof EmailTracking.findByMessageId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof EmailTracking.findByCompany).toBe('function');
    });

    it('should have findByRecipient method', () => {
      expect(typeof EmailTracking.findByRecipient).toBe('function');
    });

    it('should have recordOpen method', () => {
      expect(typeof EmailTracking.recordOpen).toBe('function');
    });

    it('should have recordClick method', () => {
      expect(typeof EmailTracking.recordClick).toBe('function');
    });

    it('should have recordBounce method', () => {
      expect(typeof EmailTracking.recordBounce).toBe('function');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof EmailTracking.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof EmailTracking.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof EmailTracking.findOne).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof EmailTracking.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof EmailTracking.deleteOne).toBe('function');
    });
  });
});
