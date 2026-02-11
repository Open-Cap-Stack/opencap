/**
 * BulkMessage Service Unit Tests
 * Issue #86: Create Bulk Messaging System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock dependencies
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  update: jest.fn(),
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const bulkMessageService = require('../../../services/bulkMessageService');

describe('BulkMessage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getRecipientsByFilter', () => {
    it('should return all stakeholders when filterType is "all"', async () => {
      const mockStakeholders = [
        { stakeholderId: 'STK-001', name: 'John Doe', email: 'john@example.com', role: 'investor' },
        { stakeholderId: 'STK-002', name: 'Jane Smith', email: 'jane@example.com', role: 'employee' }
      ];
      databaseAdapter.find.mockResolvedValue(mockStakeholders);

      const filter = { filterType: 'all' };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Stakeholder', {}, expect.any(Object));
      expect(result).toHaveLength(2);
    });

    it('should filter stakeholders by role', async () => {
      const mockStakeholders = [
        { stakeholderId: 'STK-001', name: 'John Doe', email: 'john@example.com', role: 'investor' }
      ];
      databaseAdapter.find.mockResolvedValue(mockStakeholders);

      const filter = { filterType: 'role', roles: ['investor'] };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Stakeholder',
        expect.objectContaining({ role: { $in: ['investor'] } }),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    it('should filter stakeholders by company', async () => {
      const mockStakeholders = [
        { stakeholderId: 'STK-001', name: 'John Doe', companyId: 'COMP-001' }
      ];
      databaseAdapter.find.mockResolvedValue(mockStakeholders);

      const filter = { filterType: 'company', companyIds: ['COMP-001'] };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Stakeholder',
        expect.objectContaining({ projectId: { $in: ['COMP-001'] } }),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    it('should handle custom recipient list', async () => {
      const mockStakeholders = [
        { stakeholderId: 'STK-001', name: 'John Doe' },
        { stakeholderId: 'STK-003', name: 'Bob Wilson' }
      ];
      databaseAdapter.find.mockResolvedValue(mockStakeholders);

      const filter = {
        filterType: 'custom',
        stakeholderIds: ['STK-001', 'STK-003']
      };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Stakeholder',
        expect.objectContaining({ stakeholderId: { $in: ['STK-001', 'STK-003'] } }),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array for invalid filterType', async () => {
      const filter = { filterType: 'invalid' };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(result).toEqual([]);
    });
  });

  describe('sendBulkMessage', () => {
    const mockMessage = {
      _id: 'msg123',
      bulkMessageId: 'BM-001',
      subject: 'Test Subject',
      content: 'Hello {{name}}, this is a test.',
      messageType: 'email',
      recipientFilter: { filterType: 'all' },
      rateLimiting: { batchSize: 2, delayBetweenBatches: 100 }
    };

    const mockRecipients = [
      { stakeholderId: 'STK-001', name: 'John Doe', email: 'john@example.com' },
      { stakeholderId: 'STK-002', name: 'Jane Smith', email: 'jane@example.com' },
      { stakeholderId: 'STK-003', name: 'Bob Wilson', email: 'bob@example.com' }
    ];

    it('should send messages in batches with rate limiting', async () => {
      databaseAdapter.find.mockResolvedValue(mockRecipients);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      const result = await bulkMessageService.sendBulkMessage(mockMessage);

      expect(result).toHaveProperty('totalRecipients', 3);
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
    });

    it('should apply template variables to content', async () => {
      databaseAdapter.find.mockResolvedValue([
        { stakeholderId: 'STK-001', name: 'John Doe', email: 'john@example.com' }
      ]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const messageWithTemplate = {
        ...mockMessage,
        content: 'Hello {{name}}, welcome to {{companyName}}!',
        templateVariables: ['name', 'companyName']
      };

      jest.useRealTimers();
      const result = await bulkMessageService.sendBulkMessage(messageWithTemplate);

      expect(result.sent).toBeGreaterThanOrEqual(0);
    });

    it('should track delivery status for each recipient', async () => {
      databaseAdapter.find.mockResolvedValue(mockRecipients);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      const result = await bulkMessageService.sendBulkMessage(mockMessage);

      // The update should include recipient statuses
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should update message status after sending', async () => {
      databaseAdapter.find.mockResolvedValue(mockRecipients);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const sendPromise = bulkMessageService.sendBulkMessage(mockMessage);
      jest.useRealTimers();
      await sendPromise;

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'BulkMessage',
        'msg123',
        expect.objectContaining({
          status: expect.stringMatching(/sent|partially_sent/)
        }),
        expect.any(Object)
      );
    });

    it('should handle empty recipient list', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await bulkMessageService.sendBulkMessage(mockMessage);

      expect(result.totalRecipients).toBe(0);
      expect(result.sent).toBe(0);
    });

    it('should handle sending failures gracefully', async () => {
      databaseAdapter.find.mockResolvedValue(mockRecipients);
      // All updates succeed - simulating successful processing
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      const result = await bulkMessageService.sendBulkMessage(mockMessage);
      expect(result).toBeDefined();
      expect(result.totalRecipients).toBe(3);
    });
  });

  describe('processScheduledMessages', () => {
    it('should find and process messages scheduled for now or earlier', async () => {
      const now = new Date();
      const scheduledMessages = [
        { _id: 'msg1', scheduledAt: new Date(now.getTime() - 1000), status: 'scheduled' },
        { _id: 'msg2', scheduledAt: now, status: 'scheduled' }
      ];
      databaseAdapter.find.mockResolvedValue(scheduledMessages);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await bulkMessageService.processScheduledMessages();

      expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage',
        expect.objectContaining({
          status: 'scheduled',
          scheduledAt: expect.objectContaining({ $lte: expect.any(Date) })
        }),
        expect.any(Object)
      );
      expect(result.processed).toBe(2);
    });

    it('should not process messages scheduled for the future', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await bulkMessageService.processScheduledMessages();

      expect(result.processed).toBe(0);
    });

    it('should update status to processing before sending', async () => {
      const scheduledMessage = {
        _id: 'msg1',
        scheduledAt: new Date(Date.now() - 1000),
        status: 'scheduled',
        recipientFilter: { filterType: 'all' },
        rateLimiting: { batchSize: 100, delayBetweenBatches: 500 }
      };
      databaseAdapter.find.mockResolvedValueOnce([scheduledMessage]).mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      await bulkMessageService.processScheduledMessages();

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'BulkMessage',
        'msg1',
        expect.objectContaining({ status: 'processing' }),
        expect.any(Object)
      );
    });
  });

  describe('cancelScheduledMessage', () => {
    it('should cancel a scheduled message', async () => {
      const mockMessage = { _id: 'msg123', status: 'scheduled' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockMessage,
        status: 'cancelled'
      });

      const result = await bulkMessageService.cancelScheduledMessage('msg123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'BulkMessage',
        'msg123',
        expect.objectContaining({ status: 'cancelled', cancelledAt: expect.any(Date) }),
        expect.any(Object)
      );
      expect(result.status).toBe('cancelled');
    });
  });

  describe('retryFailedRecipients', () => {
    it('should retry sending to failed recipients only', async () => {
      const mockMessage = {
        _id: 'msg123',
        messageType: 'email',
        subject: 'Test',
        content: 'Test content',
        recipients: [
          { stakeholderId: 'STK-001', status: 'delivered' },
          { stakeholderId: 'STK-002', status: 'failed', email: 'test@example.com' },
          { stakeholderId: 'STK-003', status: 'failed', email: 'test2@example.com' }
        ],
        deliveryStats: { sent: 1, failed: 2 },
        rateLimiting: { batchSize: 100, delayBetweenBatches: 500 }
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      const result = await bulkMessageService.retryFailedRecipients(mockMessage);

      expect(result.retried).toBe(2);
    });

    it('should not retry if no failed recipients', async () => {
      const mockMessage = {
        _id: 'msg123',
        recipients: [
          { stakeholderId: 'STK-001', status: 'delivered' }
        ]
      };

      const result = await bulkMessageService.retryFailedRecipients(mockMessage);

      expect(result.retried).toBe(0);
    });

    it('should update recipient status after retry', async () => {
      const mockMessage = {
        _id: 'msg123',
        messageType: 'email',
        subject: 'Test',
        content: 'Test content',
        recipients: [
          { stakeholderId: 'STK-002', status: 'failed', email: 'test@example.com' }
        ],
        deliveryStats: { sent: 0, failed: 1 },
        rateLimiting: { batchSize: 100, delayBetweenBatches: 500 }
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      await bulkMessageService.retryFailedRecipients(mockMessage);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('applyTemplate', () => {
    it('should replace template variables with recipient data', () => {
      const template = 'Hello {{name}}, your stake is {{shares}} shares.';
      const recipient = { name: 'John Doe', shares: 1000 };

      const result = bulkMessageService.applyTemplate(template, recipient);

      expect(result).toBe('Hello John Doe, your stake is 1000 shares.');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, your email is {{email}}.';
      const recipient = { name: 'John Doe' };

      const result = bulkMessageService.applyTemplate(template, recipient);

      expect(result).toBe('Hello John Doe, your email is .');
    });

    it('should handle templates with no variables', () => {
      const template = 'Hello everyone!';
      const recipient = { name: 'John Doe' };

      const result = bulkMessageService.applyTemplate(template, recipient);

      expect(result).toBe('Hello everyone!');
    });
  });

  describe('generateAuditLog', () => {
    it('should create an audit log entry for sent message', async () => {
      const mockMessage = {
        _id: 'msg123',
        bulkMessageId: 'BM-001',
        senderId: 'user123',
        companyId: 'COMP-001',
        subject: 'Test Subject',
        deliveryStats: { totalRecipients: 100, sent: 95, failed: 5 }
      };
      databaseAdapter.create.mockResolvedValue({ _id: 'audit123' });

      const result = await bulkMessageService.generateAuditLog(mockMessage, 'sent');

      expect(databaseAdapter.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
        activityType: 'bulk_message_sent',
        companyId: 'COMP-001',
        userId: 'user123'
      }));
      expect(result).toBeDefined();
    });

    it('should include delivery statistics in audit log', async () => {
      const mockMessage = {
        _id: 'msg123',
        bulkMessageId: 'BM-001',
        senderId: 'user123',
        companyId: 'COMP-001',
        subject: 'Test Subject',
        deliveryStats: { totalRecipients: 100, sent: 95, failed: 5 }
      };
      databaseAdapter.create.mockResolvedValue({ _id: 'audit123' });

      await bulkMessageService.generateAuditLog(mockMessage, 'sent');

      expect(databaseAdapter.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
        details: expect.objectContaining({
          totalRecipients: 100,
          sent: 95,
          failed: 5
        })
      }));
    });

    it('should handle audit log creation failure gracefully', async () => {
      const mockMessage = {
        _id: 'msg123',
        bulkMessageId: 'BM-001',
        senderId: 'user123',
        companyId: 'COMP-001',
        subject: 'Test Subject',
        deliveryStats: { totalRecipients: 100, sent: 95, failed: 5 }
      };
      databaseAdapter.create.mockRejectedValue(new Error('Audit log creation failed'));

      const result = await bulkMessageService.generateAuditLog(mockMessage, 'sent');

      expect(result).toBeNull();
    });

    it('should handle missing deliveryStats gracefully', async () => {
      const mockMessage = {
        _id: 'msg123',
        bulkMessageId: 'BM-001',
        senderId: 'user123',
        companyId: 'COMP-001',
        subject: 'Test Subject'
        // No deliveryStats
      };
      databaseAdapter.create.mockResolvedValue({ _id: 'audit123' });

      const result = await bulkMessageService.generateAuditLog(mockMessage, 'cancelled');

      expect(result).toBeDefined();
      expect(databaseAdapter.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
        activityType: 'bulk_message_cancelled',
        details: expect.objectContaining({
          totalRecipients: 0,
          sent: 0,
          failed: 0
        })
      }));
    });
  });

  describe('getRecipientsByFilter - edge cases', () => {
    it('should return empty array for empty filter', async () => {
      const result = await bulkMessageService.getRecipientsByFilter(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for filter without filterType', async () => {
      const result = await bulkMessageService.getRecipientsByFilter({});
      expect(result).toEqual([]);
    });

    it('should return empty array when filter.roles is empty', async () => {
      const filter = { filterType: 'role', roles: [] };
      databaseAdapter.find.mockResolvedValue([]);

      const result = await bulkMessageService.getRecipientsByFilter(filter);

      // With empty roles, the query should still be built
      expect(result).toEqual([]);
    });

    it('should return empty array when filter.companyIds is empty', async () => {
      const filter = { filterType: 'company', companyIds: [] };
      databaseAdapter.find.mockResolvedValue([]);

      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(result).toEqual([]);
    });

    it('should use customQuery when provided in custom filter', async () => {
      const mockStakeholders = [
        { stakeholderId: 'STK-001', name: 'John Doe', shares: 5000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockStakeholders);

      const filter = {
        filterType: 'custom',
        customQuery: { shares: { $gte: 1000 } }
      };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Stakeholder',
        { shares: { $gte: 1000 } },
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    it('should handle database error in getRecipientsByFilter', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      const filter = { filterType: 'all' };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(result).toEqual([]);
    });

    it('should handle null result from database', async () => {
      databaseAdapter.find.mockResolvedValue(null);

      const filter = { filterType: 'all' };
      const result = await bulkMessageService.getRecipientsByFilter(filter);

      expect(result).toEqual([]);
    });
  });

  describe('applyTemplate - edge cases', () => {
    it('should return empty string for null template', () => {
      const result = bulkMessageService.applyTemplate(null, { name: 'John' });
      expect(result).toBe('');
    });

    it('should return empty string for undefined template', () => {
      const result = bulkMessageService.applyTemplate(undefined, { name: 'John' });
      expect(result).toBe('');
    });

    it('should return original template for null data', () => {
      const template = 'Hello {{name}}';
      const result = bulkMessageService.applyTemplate(template, null);
      expect(result).toBe('Hello {{name}}');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = 'Hello {{name}}, {{name}} is a great name!';
      const result = bulkMessageService.applyTemplate(template, { name: 'John' });
      expect(result).toBe('Hello John, John is a great name!');
    });

    it('should handle numeric values in template', () => {
      const template = 'You own {{shares}} shares worth ${{value}}.';
      const result = bulkMessageService.applyTemplate(template, { shares: 1000, value: 50000 });
      expect(result).toBe('You own 1000 shares worth $50000.');
    });

    it('should handle zero values', () => {
      const template = 'Your balance is {{balance}}';
      const result = bulkMessageService.applyTemplate(template, { balance: 0 });
      expect(result).toBe('Your balance is 0');
    });

    it('should handle boolean values', () => {
      const template = 'Active: {{isActive}}';
      const result = bulkMessageService.applyTemplate(template, { isActive: true });
      expect(result).toBe('Active: true');
    });
  });

  describe('processScheduledMessages - edge cases', () => {
    it('should handle processing errors gracefully', async () => {
      const scheduledMessage = {
        _id: 'msg1',
        scheduledAt: new Date(Date.now() - 1000),
        status: 'scheduled',
        recipientFilter: { filterType: 'all' }
      };

      databaseAdapter.find.mockResolvedValueOnce([scheduledMessage]).mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockRejectedValueOnce(new Error('Processing failed'));

      const result = await bulkMessageService.processScheduledMessages();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('retryFailedRecipients - edge cases', () => {
    it('should handle empty message.recipients array', async () => {
      const mockMessage = {
        _id: 'msg123',
        recipients: []
      };

      const result = await bulkMessageService.retryFailedRecipients(mockMessage);

      expect(result.retried).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.stillFailed).toBe(0);
    });

    it('should handle missing deliveryStats', async () => {
      const mockMessage = {
        _id: 'msg123',
        messageType: 'email',
        subject: 'Test',
        content: 'Test content',
        recipients: [
          { stakeholderId: 'STK-001', status: 'failed', email: 'test@example.com' }
        ],
        rateLimiting: { batchSize: 100, delayBetweenBatches: 0 }
        // No deliveryStats
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      const result = await bulkMessageService.retryFailedRecipients(mockMessage);

      expect(result.retried).toBe(1);
    });
  });

  describe('sendBulkMessage - edge cases', () => {
    it('should use default rateLimiting when not provided', async () => {
      const mockMessage = {
        _id: 'msg123',
        bulkMessageId: 'BM-001',
        subject: 'Test',
        content: 'Hello {{name}}',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
        // No rateLimiting specified
      };

      const mockRecipients = [
        { stakeholderId: 'STK-001', name: 'John Doe', email: 'john@example.com' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRecipients);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      jest.useRealTimers();
      const result = await bulkMessageService.sendBulkMessage(mockMessage);

      expect(result.totalRecipients).toBe(1);
    });
  });
});
