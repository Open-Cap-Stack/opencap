/**
 * BulkMessage Model Unit Tests
 * Issue #86: Create Bulk Messaging System
 *
 * Rewritten for ZeroDB compatibility
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService before importing model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  client: { put: jest.fn() }
}));

describe('BulkMessage Model', () => {
  let BulkMessage;
  let schema;

  beforeAll(() => {
    BulkMessage = require('../../../models/BulkMessage');
    schema = BulkMessage.schema;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have all required fields defined in schema', () => {
      expect(schema.bulkMessageId).toBeDefined();
      expect(schema.bulkMessageId.required).toBe(true);
      expect(schema.companyId).toBeDefined();
      expect(schema.companyId.required).toBe(true);
      expect(schema.senderId).toBeDefined();
      expect(schema.senderId.required).toBe(true);
      expect(schema.subject).toBeDefined();
      expect(schema.subject.required).toBe(true);
      expect(schema.content).toBeDefined();
      expect(schema.content.required).toBe(true);
      expect(schema.messageType).toBeDefined();
      expect(schema.messageType.required).toBe(true);
    });

    it('should require bulkMessageId', () => {
      expect(schema.bulkMessageId.required).toBe(true);
    });

    it('should require companyId', () => {
      expect(schema.companyId.required).toBe(true);
    });

    it('should require senderId', () => {
      expect(schema.senderId.required).toBe(true);
    });

    it('should require subject', () => {
      expect(schema.subject.required).toBe(true);
    });

    it('should require content', () => {
      expect(schema.content.required).toBe(true);
    });

    it('should require messageType', () => {
      expect(schema.messageType.required).toBe(true);
    });

    it('should validate messageType enum values', () => {
      expect(schema.messageType.enum).toBeDefined();
      expect(schema.messageType.enum).not.toContain('invalid-type');
    });

    it('should accept valid messageType values (email, sms, notification, in-app)', () => {
      const validTypes = ['email', 'sms', 'notification', 'in-app'];
      validTypes.forEach(type => {
        expect(schema.messageType.enum).toContain(type);
      });
    });

    it('should validate status enum values', () => {
      expect(schema.status.enum).toBeDefined();
      expect(schema.status.enum).not.toContain('invalid-status');
    });

    it('should accept valid status values', () => {
      const validStatuses = ['draft', 'scheduled', 'processing', 'sent', 'partially_sent', 'failed', 'cancelled'];
      validStatuses.forEach(status => {
        expect(schema.status.enum).toContain(status);
      });
    });

    it('should default status to draft', () => {
      expect(schema.status.default).toBe('draft');
    });

    it('should have recipientFilter as object type', () => {
      expect(schema.recipientFilter).toBeDefined();
      expect(schema.recipientFilter.type).toBe('object');
    });

    it('should have recipientFilter default with filterType', () => {
      expect(schema.recipientFilter.default).toBeDefined();
      expect(schema.recipientFilter.default.filterType).toBe('all');
    });

    it('should accept valid filterType values in recipientFilter default', () => {
      const validFilterTypes = ['all', 'role', 'company', 'custom'];
      // Check that FILTER_TYPES constant contains valid filter types
      validFilterTypes.forEach(filterType => {
        expect(BulkMessage.FILTER_TYPES).toContain(filterType);
      });
    });

    it('should support template variables as array', () => {
      expect(schema.templateVariables).toBeDefined();
      expect(schema.templateVariables.type).toBe('array');
      expect(schema.templateVariables.default).toEqual([]);
    });

    it('should support scheduling with scheduledAt', () => {
      expect(schema.scheduledAt).toBeDefined();
      expect(schema.scheduledAt.type).toBe('date');
    });

    it('should have deliveryStats as object type with defaults', () => {
      expect(schema.deliveryStats).toBeDefined();
      expect(schema.deliveryStats.type).toBe('object');
      expect(schema.deliveryStats.default.totalRecipients).toBe(0);
      expect(schema.deliveryStats.default.sent).toBe(0);
      expect(schema.deliveryStats.default.delivered).toBe(0);
      expect(schema.deliveryStats.default.failed).toBe(0);
      expect(schema.deliveryStats.default.bounced).toBe(0);
      expect(schema.deliveryStats.default.opened).toBe(0);
      expect(schema.deliveryStats.default.clicked).toBe(0);
    });

    it('should support rate limiting configuration', () => {
      expect(schema.rateLimiting).toBeDefined();
      expect(schema.rateLimiting.type).toBe('object');
    });

    it('should default rateLimiting values', () => {
      expect(schema.rateLimiting.default.batchSize).toBe(100);
      expect(schema.rateLimiting.default.delayBetweenBatches).toBe(500);
    });

    it('should support recipients array', () => {
      expect(schema.recipients).toBeDefined();
      expect(schema.recipients.type).toBe('array');
      expect(schema.recipients.default).toEqual([]);
    });

    it('should have timestamps', () => {
      expect(schema.createdAt).toBeDefined();
      expect(schema.updatedAt).toBeDefined();
    });
  });

  describe('Schema Field Properties', () => {
    it('should have bulkMessageId marked as unique', () => {
      expect(schema.bulkMessageId.unique).toBe(true);
    });

    it('should have companyId field of type string', () => {
      expect(schema.companyId.type).toBe('string');
    });

    it('should have status field of type string', () => {
      expect(schema.status.type).toBe('string');
    });

    it('should have scheduledAt field of type date', () => {
      expect(schema.scheduledAt.type).toBe('date');
    });
  });

  describe('Instance Methods', () => {
    describe('updateDeliveryStats', () => {
      it('should calculate stats from recipients with sent status', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'sent' },
            { stakeholderId: 'STK-002', status: 'sent' },
            { stakeholderId: 'STK-003', status: 'sent' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(3);
        expect(stats.sent).toBe(3);
        expect(stats.delivered).toBe(0);
        expect(stats.failed).toBe(0);
      });

      it('should calculate stats from recipients with delivered status', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'delivered' },
            { stakeholderId: 'STK-002', status: 'delivered' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(2);
        expect(stats.delivered).toBe(2);
      });

      it('should calculate stats from recipients with failed status', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'failed' },
            { stakeholderId: 'STK-002', status: 'sent' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(1);
        expect(stats.failed).toBe(1);
      });

      it('should calculate stats from recipients with bounced status', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'bounced' },
            { stakeholderId: 'STK-002', status: 'delivered' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(2);
        expect(stats.bounced).toBe(1);
        expect(stats.delivered).toBe(1);
      });

      it('should calculate stats from recipients with opened status', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'opened' },
            { stakeholderId: 'STK-002', status: 'sent' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(2);
        expect(stats.delivered).toBe(1);
        expect(stats.opened).toBe(1);
      });

      it('should calculate stats from recipients with clicked status', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'clicked' },
            { stakeholderId: 'STK-002', status: 'opened' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(2);
        expect(stats.delivered).toBe(2);
        expect(stats.opened).toBe(2);
        expect(stats.clicked).toBe(1);
      });

      it('should handle mixed recipient statuses', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'clicked' },
            { stakeholderId: 'STK-002', status: 'opened' },
            { stakeholderId: 'STK-003', status: 'delivered' },
            { stakeholderId: 'STK-004', status: 'sent' },
            { stakeholderId: 'STK-005', status: 'failed' },
            { stakeholderId: 'STK-006', status: 'bounced' },
            { stakeholderId: 'STK-007', status: 'pending' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(7);
        expect(stats.sent).toBe(4); // clicked, opened, delivered, sent
        expect(stats.delivered).toBe(3); // clicked, opened, delivered
        expect(stats.opened).toBe(2); // clicked, opened
        expect(stats.clicked).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.bounced).toBe(1);
      });

      it('should return correct stats object structure', () => {
        const message = {
          recipients: [
            { stakeholderId: 'STK-001', status: 'sent' }
          ]
        };

        const stats = BulkMessage.updateDeliveryStats(message);

        expect(stats.totalRecipients).toBe(1);
        expect(stats.sent).toBe(1);
        expect(stats).toHaveProperty('totalRecipients');
        expect(stats).toHaveProperty('sent');
        expect(stats).toHaveProperty('delivered');
        expect(stats).toHaveProperty('failed');
        expect(stats).toHaveProperty('bounced');
        expect(stats).toHaveProperty('opened');
        expect(stats).toHaveProperty('clicked');
      });
    });
  });

  describe('Static Methods', () => {
    describe('findScheduledForProcessing', () => {
      it('should be a static method', () => {
        expect(typeof BulkMessage.findScheduledForProcessing).toBe('function');
      });
    });

    describe('getStatsByCompany', () => {
      it('should be a static method', () => {
        expect(typeof BulkMessage.getStatsByCompany).toBe('function');
      });
    });
  });

  describe('Status Lifecycle', () => {
    it('should support processing status in enum', () => {
      expect(schema.status.enum).toContain('processing');
    });

    it('should support sent status in enum', () => {
      expect(schema.status.enum).toContain('sent');
    });

    it('should support partially_sent status in enum', () => {
      expect(schema.status.enum).toContain('partially_sent');
    });

    it('should support failed status in enum', () => {
      expect(schema.status.enum).toContain('failed');
    });

    it('should support cancelled status in enum', () => {
      expect(schema.status.enum).toContain('cancelled');
      expect(schema.cancelledAt).toBeDefined();
    });
  });

  describe('Exported Constants', () => {
    it('should export MESSAGE_TYPES', () => {
      expect(BulkMessage.MESSAGE_TYPES).toBeDefined();
      expect(BulkMessage.MESSAGE_TYPES).toContain('email');
      expect(BulkMessage.MESSAGE_TYPES).toContain('sms');
      expect(BulkMessage.MESSAGE_TYPES).toContain('notification');
      expect(BulkMessage.MESSAGE_TYPES).toContain('in-app');
    });

    it('should export STATUSES', () => {
      expect(BulkMessage.STATUSES).toBeDefined();
      expect(BulkMessage.STATUSES).toContain('draft');
      expect(BulkMessage.STATUSES).toContain('scheduled');
      expect(BulkMessage.STATUSES).toContain('processing');
      expect(BulkMessage.STATUSES).toContain('sent');
      expect(BulkMessage.STATUSES).toContain('partially_sent');
      expect(BulkMessage.STATUSES).toContain('failed');
      expect(BulkMessage.STATUSES).toContain('cancelled');
    });

    it('should export FILTER_TYPES', () => {
      expect(BulkMessage.FILTER_TYPES).toBeDefined();
      expect(BulkMessage.FILTER_TYPES).toContain('all');
      expect(BulkMessage.FILTER_TYPES).toContain('role');
      expect(BulkMessage.FILTER_TYPES).toContain('company');
      expect(BulkMessage.FILTER_TYPES).toContain('custom');
    });

    it('should export RECIPIENT_STATUSES', () => {
      expect(BulkMessage.RECIPIENT_STATUSES).toBeDefined();
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('pending');
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('sent');
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('delivered');
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('failed');
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('bounced');
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('opened');
      expect(BulkMessage.RECIPIENT_STATUSES).toContain('clicked');
    });
  });

  describe('Additional Schema Validations', () => {
    it('should have subject field of type string', () => {
      expect(schema.subject.type).toBe('string');
    });

    it('should have content field of type string', () => {
      expect(schema.content.type).toBe('string');
    });

    it('should support metadata field', () => {
      expect(schema.metadata).toBeDefined();
      expect(schema.metadata.type).toBe('object');
      expect(schema.metadata.default).toEqual({});
    });

    it('should support tags array', () => {
      expect(schema.tags).toBeDefined();
      expect(schema.tags.type).toBe('array');
      expect(schema.tags.default).toEqual([]);
    });

    it('should have recipientFilter default with roles array', () => {
      expect(schema.recipientFilter.default.roles).toEqual([]);
    });

    it('should have recipientFilter default with companyIds array', () => {
      expect(schema.recipientFilter.default.companyIds).toEqual([]);
    });

    it('should have recipientFilter default with stakeholderIds array', () => {
      expect(schema.recipientFilter.default.stakeholderIds).toEqual([]);
    });

    it('should have recipientFilter default with customQuery as null', () => {
      expect(schema.recipientFilter.default.customQuery).toBeNull();
    });

    it('should have recipientFilter required', () => {
      expect(schema.recipientFilter.required).toBe(true);
    });
  });
});
