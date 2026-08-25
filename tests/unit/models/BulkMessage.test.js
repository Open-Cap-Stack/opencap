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

  describe('create()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.insertRow = jest.fn().mockResolvedValue({
        data: [{ _id: 'test-id', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should auto-generate bulkMessageId if not provided', async () => {
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email' };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ bulkMessageId: expect.stringMatching(/^msg_/) })
      );
    });

    it('should use provided bulkMessageId', async () => {
      const data = { bulkMessageId: 'msg_custom', companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email' };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ bulkMessageId: 'msg_custom' })
      );
    });

    it('should default status to draft if not provided', async () => {
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email' };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('should use provided status', async () => {
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email', status: 'scheduled' };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ status: 'scheduled' })
      );
    });

    it('should set default deliveryStats if not provided', async () => {
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email' };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({
          deliveryStats: { totalRecipients: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0 }
        })
      );
    });

    it('should use provided deliveryStats', async () => {
      const customStats = { totalRecipients: 5, sent: 3, delivered: 2, failed: 0, bounced: 0, opened: 1, clicked: 0 };
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email', deliveryStats: customStats };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ deliveryStats: customStats })
      );
    });

    it('should set default rateLimiting if not provided', async () => {
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email' };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ rateLimiting: { batchSize: 100, delayBetweenBatches: 500 } })
      );
    });

    it('should use provided rateLimiting', async () => {
      const customLimiting = { batchSize: 50, delayBetweenBatches: 1000 };
      const data = { companyId: 'c1', senderId: 's1', subject: 'Test', content: 'Body', messageType: 'email', rateLimiting: customLimiting };
      await BulkMessage.create(data);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ rateLimiting: customLimiting })
      );
    });
  });

  describe('findByBulkMessageId()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should find a bulk message by its bulkMessageId', async () => {
      const mockMsg = { _id: 'id-1', bulkMessageId: 'msg_123', subject: 'Hello' };
      zerodbService.queryTable.mockResolvedValue({ data: [mockMsg] });

      const result = await BulkMessage.findByBulkMessageId('msg_123');
      expect(result).toEqual(mockMsg);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ filter: { bulkMessageId: 'msg_123' }, limit: 1 })
      );
    });

    it('should return null if not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await BulkMessage.findByBulkMessageId('msg_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should find all bulk messages for a company', async () => {
      const mockMsgs = [
        { _id: '1', bulkMessageId: 'msg_1', companyId: 'c1' },
        { _id: '2', bulkMessageId: 'msg_2', companyId: 'c1' }
      ];
      zerodbService.queryTable.mockResolvedValue({ data: mockMsgs });

      const result = await BulkMessage.findByCompany('c1');
      expect(result).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'bulk_messages',
        expect.objectContaining({ filter: { companyId: 'c1' } })
      );
    });
  });

  describe('findScheduledForProcessing()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should return scheduled messages with scheduledAt in the past', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const futureDate = new Date(Date.now() + 60000).toISOString();
      const mockMsgs = [
        { bulkMessageId: 'msg_1', status: 'scheduled', scheduledAt: pastDate },
        { bulkMessageId: 'msg_2', status: 'scheduled', scheduledAt: futureDate },
        { bulkMessageId: 'msg_3', status: 'scheduled', scheduledAt: null }
      ];
      zerodbService.queryTable.mockResolvedValue({ data: mockMsgs });

      const result = await BulkMessage.findScheduledForProcessing();
      expect(result).toHaveLength(1);
      expect(result[0].bulkMessageId).toBe('msg_1');
    });

    it('should return empty array when no scheduled messages exist', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await BulkMessage.findScheduledForProcessing();
      expect(result).toEqual([]);
    });
  });

  describe('getStatsByCompany()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should aggregate stats by status', async () => {
      const mockMsgs = [
        { status: 'sent', deliveryStats: { totalRecipients: 10, sent: 8, delivered: 7, failed: 1 } },
        { status: 'sent', deliveryStats: { totalRecipients: 5, sent: 5, delivered: 5, failed: 0 } },
        { status: 'draft', deliveryStats: { totalRecipients: 0, sent: 0, delivered: 0, failed: 0 } }
      ];
      zerodbService.queryTable.mockResolvedValue({ data: mockMsgs });

      const stats = await BulkMessage.getStatsByCompany('c1');
      expect(stats).toHaveLength(2);

      const sentStat = stats.find(s => s._id === 'sent');
      expect(sentStat.count).toBe(2);
      expect(sentStat.totalRecipients).toBe(15);
      expect(sentStat.totalSent).toBe(13);
      expect(sentStat.totalDelivered).toBe(12);
      expect(sentStat.totalFailed).toBe(1);

      const draftStat = stats.find(s => s._id === 'draft');
      expect(draftStat.count).toBe(1);
    });

    it('should handle messages without deliveryStats', async () => {
      const mockMsgs = [
        { status: 'draft' },
        { status: 'draft', deliveryStats: null }
      ];
      zerodbService.queryTable.mockResolvedValue({ data: mockMsgs });

      const stats = await BulkMessage.getStatsByCompany('c1');
      expect(stats).toHaveLength(1);
      expect(stats[0]._id).toBe('draft');
      expect(stats[0].count).toBe(2);
      expect(stats[0].totalRecipients).toBe(0);
    });

    it('should return empty array when no messages exist', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const stats = await BulkMessage.getStatsByCompany('c1');
      expect(stats).toEqual([]);
    });
  });

  describe('updateDeliveryStats - empty recipients', () => {
    it('should handle message with no recipients array', () => {
      const message = {};
      const stats = BulkMessage.updateDeliveryStats(message);
      expect(stats.totalRecipients).toBe(0);
      expect(stats.sent).toBe(0);
    });

    it('should handle message with empty recipients array', () => {
      const message = { recipients: [] };
      const stats = BulkMessage.updateDeliveryStats(message);
      expect(stats.totalRecipients).toBe(0);
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
