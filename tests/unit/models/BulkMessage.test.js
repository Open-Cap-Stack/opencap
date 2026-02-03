/**
 * BulkMessage Model Unit Tests
 * Issue #86: Create Bulk Messaging System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// Clear mongoose models cache to avoid OverwriteModelError
if (mongoose.models.BulkMessage) {
  delete mongoose.models.BulkMessage;
}

describe('BulkMessage Model', () => {
  let BulkMessage;

  beforeAll(() => {
    // Import model after mongoose setup
    BulkMessage = require('../../../models/BulkMessage');
  });

  describe('Schema Validation', () => {
    it('should create a valid bulk message with all required fields', () => {
      const bulkMessageData = {
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Important Company Update',
        content: 'This is the message content',
        messageType: 'email',
        recipientFilter: {
          filterType: 'role',
          roles: ['investor', 'employee']
        },
        status: 'draft'
      };

      const bulkMessage = new BulkMessage(bulkMessageData);
      const validationError = bulkMessage.validateSync();

      expect(validationError).toBeUndefined();
      expect(bulkMessage.bulkMessageId).toBe('BM-001');
      expect(bulkMessage.subject).toBe('Important Company Update');
      expect(bulkMessage.messageType).toBe('email');
    });

    it('should require bulkMessageId', () => {
      const bulkMessage = new BulkMessage({
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.bulkMessageId).toBeDefined();
    });

    it('should require companyId', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.companyId).toBeDefined();
    });

    it('should require senderId', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.senderId).toBeDefined();
    });

    it('should require subject', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.subject).toBeDefined();
    });

    it('should require content', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.content).toBeDefined();
    });

    it('should require messageType', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.messageType).toBeDefined();
    });

    it('should validate messageType enum values', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'invalid-type',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.messageType).toBeDefined();
    });

    it('should accept valid messageType values (email, sms, notification, in-app)', () => {
      const validTypes = ['email', 'sms', 'notification', 'in-app'];

      validTypes.forEach(type => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: `BM-${type}`,
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: type,
          recipientFilter: { filterType: 'all' }
        });

        const validationError = bulkMessage.validateSync();
        expect(validationError).toBeUndefined();
      });
    });

    it('should validate status enum values', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'invalid-status'
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.status).toBeDefined();
    });

    it('should accept valid status values', () => {
      const validStatuses = ['draft', 'scheduled', 'processing', 'sent', 'partially_sent', 'failed', 'cancelled'];

      validStatuses.forEach(status => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: `BM-${status}`,
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          status
        });

        const validationError = bulkMessage.validateSync();
        expect(validationError).toBeUndefined();
      });
    });

    it('should default status to draft', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      expect(bulkMessage.status).toBe('draft');
    });

    it('should validate recipientFilter.filterType enum', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'invalid-filter' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors['recipientFilter.filterType']).toBeDefined();
    });

    it('should accept valid filterType values', () => {
      const validFilterTypes = ['all', 'role', 'company', 'custom'];

      validFilterTypes.forEach(filterType => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: `BM-${filterType}`,
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType }
        });

        const validationError = bulkMessage.validateSync();
        expect(validationError).toBeUndefined();
      });
    });

    it('should support template variables', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Hello {{firstName}}',
        content: 'Dear {{firstName}} {{lastName}}, welcome to {{companyName}}',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        templateVariables: ['firstName', 'lastName', 'companyName']
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.templateVariables).toContain('firstName');
    });

    it('should support scheduling with scheduledAt', () => {
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'scheduled',
        scheduledAt: scheduledTime
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.scheduledAt).toEqual(scheduledTime);
    });

    it('should track delivery statistics', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        deliveryStats: {
          totalRecipients: 100,
          sent: 95,
          delivered: 90,
          failed: 5,
          opened: 50,
          clicked: 25
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.deliveryStats.totalRecipients).toBe(100);
      expect(bulkMessage.deliveryStats.sent).toBe(95);
    });

    it('should support rate limiting configuration', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        rateLimiting: {
          batchSize: 50,
          delayBetweenBatches: 1000
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.rateLimiting.batchSize).toBe(50);
    });

    it('should default rateLimiting values', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      expect(bulkMessage.rateLimiting.batchSize).toBe(100);
      expect(bulkMessage.rateLimiting.delayBetweenBatches).toBe(500);
    });

    it('should track recipients with their delivery status', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        recipients: [
          {
            stakeholderId: 'STK-001',
            email: 'user1@example.com',
            status: 'delivered',
            sentAt: new Date(),
            deliveredAt: new Date()
          },
          {
            stakeholderId: 'STK-002',
            email: 'user2@example.com',
            status: 'failed',
            sentAt: new Date(),
            errorMessage: 'Invalid email address'
          }
        ]
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.recipients).toHaveLength(2);
      expect(bulkMessage.recipients[0].status).toBe('delivered');
      expect(bulkMessage.recipients[1].errorMessage).toBe('Invalid email address');
    });

    it('should have timestamps', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      // Schema should have timestamps option
      expect(BulkMessage.schema.options.timestamps).toBe(true);
    });
  });

  describe('Indexes', () => {
    it('should have unique index on bulkMessageId', () => {
      const indexes = BulkMessage.schema.indexes();
      const bulkMessageIdIndex = indexes.find(idx =>
        idx[0].bulkMessageId !== undefined
      );
      expect(bulkMessageIdIndex).toBeDefined();
    });

    it('should have index on companyId', () => {
      const indexes = BulkMessage.schema.indexes();
      const companyIdIndex = indexes.find(idx =>
        idx[0].companyId !== undefined
      );
      expect(companyIdIndex).toBeDefined();
    });

    it('should have index on status', () => {
      const indexes = BulkMessage.schema.indexes();
      const statusIndex = indexes.find(idx =>
        idx[0].status !== undefined
      );
      expect(statusIndex).toBeDefined();
    });

    it('should have index on scheduledAt', () => {
      const indexes = BulkMessage.schema.indexes();
      const scheduledAtIndex = indexes.find(idx =>
        idx[0].scheduledAt !== undefined
      );
      expect(scheduledAtIndex).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    describe('updateDeliveryStats', () => {
      it('should calculate stats from recipients with sent status', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-001',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'sent' },
            { stakeholderId: 'STK-002', status: 'sent' },
            { stakeholderId: 'STK-003', status: 'sent' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(3);
        expect(stats.sent).toBe(3);
        expect(stats.delivered).toBe(0);
        expect(stats.failed).toBe(0);
      });

      it('should calculate stats from recipients with delivered status', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-002',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'delivered' },
            { stakeholderId: 'STK-002', status: 'delivered' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(2);
        expect(stats.delivered).toBe(2);
      });

      it('should calculate stats from recipients with failed status', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-003',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'failed' },
            { stakeholderId: 'STK-002', status: 'sent' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(1);
        expect(stats.failed).toBe(1);
      });

      it('should calculate stats from recipients with bounced status', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-004',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'bounced' },
            { stakeholderId: 'STK-002', status: 'delivered' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(2);
        expect(stats.bounced).toBe(1);
        expect(stats.delivered).toBe(1);
      });

      it('should calculate stats from recipients with opened status', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-005',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'opened' },
            { stakeholderId: 'STK-002', status: 'sent' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(2);
        expect(stats.delivered).toBe(1);
        expect(stats.opened).toBe(1);
      });

      it('should calculate stats from recipients with clicked status', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-006',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'clicked' },
            { stakeholderId: 'STK-002', status: 'opened' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(2);
        expect(stats.sent).toBe(2);
        expect(stats.delivered).toBe(2);
        expect(stats.opened).toBe(2);
        expect(stats.clicked).toBe(1);
      });

      it('should handle mixed recipient statuses', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-007',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'clicked' },
            { stakeholderId: 'STK-002', status: 'opened' },
            { stakeholderId: 'STK-003', status: 'delivered' },
            { stakeholderId: 'STK-004', status: 'sent' },
            { stakeholderId: 'STK-005', status: 'failed' },
            { stakeholderId: 'STK-006', status: 'bounced' },
            { stakeholderId: 'STK-007', status: 'pending' }
          ]
        });

        const stats = bulkMessage.updateDeliveryStats();

        expect(stats.totalRecipients).toBe(7);
        expect(stats.sent).toBe(4); // clicked, opened, delivered, sent
        expect(stats.delivered).toBe(3); // clicked, opened, delivered
        expect(stats.opened).toBe(2); // clicked, opened
        expect(stats.clicked).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.bounced).toBe(1);
      });

      it('should update deliveryStats on the document', () => {
        const bulkMessage = new BulkMessage({
          bulkMessageId: 'BM-008',
          companyId: 'COMP-001',
          senderId: new mongoose.Types.ObjectId(),
          subject: 'Test',
          content: 'Test content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' },
          recipients: [
            { stakeholderId: 'STK-001', status: 'sent' }
          ]
        });

        bulkMessage.updateDeliveryStats();

        expect(bulkMessage.deliveryStats.totalRecipients).toBe(1);
        expect(bulkMessage.deliveryStats.sent).toBe(1);
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

  describe('Pre-save Middleware', () => {
    it('should have pre-save middleware configured', () => {
      // Verify the schema has pre-save hooks
      expect(BulkMessage.schema.s.hooks._pres.has('save')).toBe(true);
    });

    it('should set initial values for processing status', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-PRESAVE-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'processing'
      });

      // Verify the model is valid with processing status
      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.status).toBe('processing');
    });

    it('should support sent status', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-PRESAVE-002',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'sent'
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.status).toBe('sent');
    });

    it('should support partially_sent status', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-PRESAVE-003',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'partially_sent'
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should support failed status', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-PRESAVE-004',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'failed'
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should support cancelled status', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-PRESAVE-005',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        status: 'cancelled',
        cancelledAt: new Date()
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.cancelledAt).toBeDefined();
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
    it('should enforce max length on subject (500 characters)', () => {
      const longSubject = 'a'.repeat(501);
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-MAX-LEN-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: longSubject,
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.subject).toBeDefined();
    });

    it('should enforce max length on content (50000 characters)', () => {
      const longContent = 'a'.repeat(50001);
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-MAX-LEN-002',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: longContent,
        messageType: 'email',
        recipientFilter: { filterType: 'all' }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors.content).toBeDefined();
    });

    it('should support metadata field', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-META-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        metadata: {
          campaignId: 'CAMP-001',
          customField: 'value'
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.metadata.campaignId).toBe('CAMP-001');
    });

    it('should support tags array', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-TAGS-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        tags: ['important', 'quarterly-update', 'investor']
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.tags).toHaveLength(3);
      expect(bulkMessage.tags).toContain('important');
    });

    it('should validate rateLimiting batchSize within range', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-RATE-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        rateLimiting: {
          batchSize: 1001, // exceeds max of 1000
          delayBetweenBatches: 500
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError.errors['rateLimiting.batchSize']).toBeDefined();
    });

    it('should accept valid rateLimiting batchSize', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-RATE-002',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        rateLimiting: {
          batchSize: 500,
          delayBetweenBatches: 1000
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('should support recipientFilter with roles array', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-FILTER-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: {
          filterType: 'role',
          roles: ['investor', 'employee', 'advisor']
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.recipientFilter.roles).toHaveLength(3);
    });

    it('should support recipientFilter with companyIds array', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-FILTER-002',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: {
          filterType: 'company',
          companyIds: ['COMP-001', 'COMP-002']
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.recipientFilter.companyIds).toHaveLength(2);
    });

    it('should support recipientFilter with stakeholderIds array', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-FILTER-003',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: {
          filterType: 'custom',
          stakeholderIds: ['STK-001', 'STK-002', 'STK-003']
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.recipientFilter.stakeholderIds).toHaveLength(3);
    });

    it('should support recipientFilter with customQuery', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-FILTER-004',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: {
          filterType: 'custom',
          customQuery: { shares: { $gte: 1000 } }
        }
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.recipientFilter.customQuery).toBeDefined();
    });

    it('should support recipient retryCount tracking', () => {
      const bulkMessage = new BulkMessage({
        bulkMessageId: 'BM-RETRY-001',
        companyId: 'COMP-001',
        senderId: new mongoose.Types.ObjectId(),
        subject: 'Test',
        content: 'Test content',
        messageType: 'email',
        recipientFilter: { filterType: 'all' },
        recipients: [
          {
            stakeholderId: 'STK-001',
            email: 'user1@example.com',
            status: 'failed',
            retryCount: 3,
            errorMessage: 'Connection timeout'
          }
        ]
      });

      const validationError = bulkMessage.validateSync();
      expect(validationError).toBeUndefined();
      expect(bulkMessage.recipients[0].retryCount).toBe(3);
    });
  });
});
