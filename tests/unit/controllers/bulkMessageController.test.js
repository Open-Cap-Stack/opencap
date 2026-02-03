/**
 * BulkMessage Controller Unit Tests
 * Issue #86: Create Bulk Messaging System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn(),
  update: jest.fn()
}));

jest.mock('../../../services/bulkMessageService', () => ({
  sendBulkMessage: jest.fn(),
  getRecipientsByFilter: jest.fn(),
  processScheduledMessages: jest.fn(),
  cancelScheduledMessage: jest.fn(),
  retryFailedRecipients: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const bulkMessageController = require('../../../controllers/bulkMessageController');
const databaseAdapter = require('../../../services/databaseAdapter');
const bulkMessageService = require('../../../services/bulkMessageService');

describe('BulkMessage Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createBulkMessage', () => {
    const validBulkMessageData = {
      bulkMessageId: 'BM-001',
      companyId: 'COMP-001',
      senderId: 'user123',
      subject: 'Important Update',
      content: 'This is the message content',
      messageType: 'email',
      recipientFilter: {
        filterType: 'role',
        roles: ['investor']
      }
    };

    it('should create a bulk message successfully', async () => {
      req.body = validBulkMessageData;
      const mockSavedMessage = { _id: 'msg123', ...validBulkMessageData, status: 'draft' };
      databaseAdapter.create.mockResolvedValue(mockSavedMessage);

      await bulkMessageController.createBulkMessage(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('BulkMessage', expect.objectContaining({
        bulkMessageId: 'BM-001',
        subject: 'Important Update',
        status: 'draft'
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toHaveProperty('bulkMessage');
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { bulkMessageId: 'BM-001', subject: 'Test' };

      await bulkMessageController.createBulkMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Missing required fields');
    });

    it('should return 400 for invalid messageType', async () => {
      req.body = { ...validBulkMessageData, messageType: 'invalid' };

      await bulkMessageController.createBulkMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      req.body = validBulkMessageData;
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await bulkMessageController.createBulkMessage(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to create bulk message');
    });
  });

  describe('getBulkMessages', () => {
    it('should return all bulk messages with pagination', async () => {
      const mockMessages = [
        { _id: 'msg1', bulkMessageId: 'BM-001', subject: 'Message 1' },
        { _id: 'msg2', bulkMessageId: 'BM-002', subject: 'Message 2' }
      ];
      databaseAdapter.find.mockResolvedValue(mockMessages);
      databaseAdapter.count.mockResolvedValue(2);

      await bulkMessageController.getBulkMessages(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage', {}, expect.any(Object));
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.bulkMessages).toEqual(mockMessages);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'COMP-001' };
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await bulkMessageController.getBulkMessages(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage',
        expect.objectContaining({ companyId: 'COMP-001' }),
        expect.any(Object)
      );
    });

    it('should filter by status', async () => {
      req.query = { status: 'sent' };
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await bulkMessageController.getBulkMessages(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage',
        expect.objectContaining({ status: 'sent' }),
        expect.any(Object)
      );
    });

    it('should filter by messageType', async () => {
      req.query = { messageType: 'email' };
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await bulkMessageController.getBulkMessages(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage',
        expect.objectContaining({ messageType: 'email' }),
        expect.any(Object)
      );
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await bulkMessageController.getBulkMessages(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve bulk messages');
    });
  });

  describe('getBulkMessageById', () => {
    it('should return bulk message by ID', async () => {
      const mockMessage = { _id: 'msg123', bulkMessageId: 'BM-001', subject: 'Test' };
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockResolvedValue(mockMessage);

      await bulkMessageController.getBulkMessageById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('BulkMessage', 'msg123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ bulkMessage: mockMessage });
    });

    it('should return 404 when message not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await bulkMessageController.getBulkMessageById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Bulk message not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await bulkMessageController.getBulkMessageById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve bulk message');
    });
  });

  describe('updateBulkMessage', () => {
    it('should update a draft bulk message', async () => {
      req.params = { id: 'msg123' };
      req.body = { subject: 'Updated Subject', content: 'Updated content' };
      const existingMessage = { _id: 'msg123', status: 'draft' };
      const updatedMessage = { ...existingMessage, ...req.body };

      databaseAdapter.findById.mockResolvedValue(existingMessage);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedMessage);

      await bulkMessageController.updateBulkMessage(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'BulkMessage',
        'msg123',
        expect.objectContaining({ subject: 'Updated Subject' }),
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
    });

    it('should not update a sent message', async () => {
      req.params = { id: 'msg123' };
      req.body = { subject: 'Updated Subject' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'sent' });

      await bulkMessageController.updateBulkMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Cannot update a sent message');
    });

    it('should return 404 when message not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { subject: 'Updated Subject' };
      databaseAdapter.findById.mockResolvedValue(null);

      await bulkMessageController.updateBulkMessage(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteBulkMessage', () => {
    it('should delete bulk message successfully', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'msg123' });

      await bulkMessageController.deleteBulkMessage(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('BulkMessage', 'msg123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Bulk message deleted');
    });

    it('should return 404 when message not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await bulkMessageController.deleteBulkMessage(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('sendBulkMessage', () => {
    it('should send a bulk message', async () => {
      req.params = { id: 'msg123' };
      const mockMessage = {
        _id: 'msg123',
        status: 'draft',
        recipientFilter: { filterType: 'all' }
      };
      databaseAdapter.findById.mockResolvedValue(mockMessage);
      bulkMessageService.sendBulkMessage.mockResolvedValue({
        success: true,
        totalRecipients: 50,
        sent: 48,
        failed: 2
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockMessage,
        status: 'sent'
      });

      await bulkMessageController.sendBulkMessage(req, res);

      expect(bulkMessageService.sendBulkMessage).toHaveBeenCalledWith(mockMessage);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('totalRecipients', 50);
    });

    it('should not send an already sent message', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'sent' });

      await bulkMessageController.sendBulkMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Message has already been sent');
    });

    it('should return 404 when message not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await bulkMessageController.sendBulkMessage(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle sending errors', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'draft' });
      bulkMessageService.sendBulkMessage.mockRejectedValue(new Error('Sending failed'));

      await bulkMessageController.sendBulkMessage(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('scheduleBulkMessage', () => {
    it('should schedule a bulk message for future delivery', async () => {
      req.params = { id: 'msg123' };
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      req.body = { scheduledAt: futureDate.toISOString() };

      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'draft' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'msg123',
        status: 'scheduled',
        scheduledAt: futureDate
      });

      await bulkMessageController.scheduleBulkMessage(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'BulkMessage',
        'msg123',
        expect.objectContaining({
          status: 'scheduled',
          scheduledAt: expect.any(Date)
        }),
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
    });

    it('should not schedule a past date', async () => {
      req.params = { id: 'msg123' };
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      req.body = { scheduledAt: pastDate.toISOString() };

      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'draft' });

      await bulkMessageController.scheduleBulkMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Scheduled time must be in the future');
    });

    it('should not schedule an already sent message', async () => {
      req.params = { id: 'msg123' };
      req.body = { scheduledAt: new Date(Date.now() + 86400000).toISOString() };

      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'sent' });

      await bulkMessageController.scheduleBulkMessage(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('cancelScheduledMessage', () => {
    it('should cancel a scheduled message', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'scheduled' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'msg123',
        status: 'cancelled'
      });

      await bulkMessageController.cancelScheduledMessage(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'BulkMessage',
        'msg123',
        expect.objectContaining({ status: 'cancelled' }),
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
    });

    it('should not cancel a non-scheduled message', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'draft' });

      await bulkMessageController.cancelScheduledMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Only scheduled messages can be cancelled');
    });
  });

  describe('previewRecipients', () => {
    it('should return list of recipients based on filter', async () => {
      req.params = { id: 'msg123' };
      const mockMessage = {
        _id: 'msg123',
        recipientFilter: { filterType: 'role', roles: ['investor'] }
      };
      const mockRecipients = [
        { stakeholderId: 'STK-001', name: 'John Doe', email: 'john@example.com' },
        { stakeholderId: 'STK-002', name: 'Jane Smith', email: 'jane@example.com' }
      ];

      databaseAdapter.findById.mockResolvedValue(mockMessage);
      bulkMessageService.getRecipientsByFilter.mockResolvedValue(mockRecipients);

      await bulkMessageController.previewRecipients(req, res);

      expect(bulkMessageService.getRecipientsByFilter).toHaveBeenCalledWith(mockMessage.recipientFilter);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.recipients).toEqual(mockRecipients);
      expect(data.totalCount).toBe(2);
    });

    it('should return 404 when message not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await bulkMessageController.previewRecipients(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for a bulk message', async () => {
      req.params = { id: 'msg123' };
      const mockMessage = {
        _id: 'msg123',
        status: 'sent',
        deliveryStats: {
          totalRecipients: 100,
          sent: 95,
          delivered: 90,
          failed: 5,
          opened: 50,
          clicked: 25
        },
        recipients: [
          { stakeholderId: 'STK-001', status: 'delivered' },
          { stakeholderId: 'STK-002', status: 'failed', errorMessage: 'Invalid email' }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockMessage);

      await bulkMessageController.getDeliveryStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.status).toBe('sent');
      expect(data.deliveryStats.totalRecipients).toBe(100);
      expect(data.failedRecipients).toHaveLength(1);
    });

    it('should return 404 when message not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await bulkMessageController.getDeliveryStatus(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('retryFailedRecipients', () => {
    it('should retry sending to failed recipients', async () => {
      req.params = { id: 'msg123' };
      const mockMessage = {
        _id: 'msg123',
        status: 'partially_sent',
        recipients: [
          { stakeholderId: 'STK-001', status: 'failed' },
          { stakeholderId: 'STK-002', status: 'failed' }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockMessage);
      bulkMessageService.retryFailedRecipients.mockResolvedValue({
        success: true,
        retried: 2,
        succeeded: 1,
        stillFailed: 1
      });

      await bulkMessageController.retryFailedRecipients(req, res);

      expect(bulkMessageService.retryFailedRecipients).toHaveBeenCalledWith(mockMessage);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.retried).toBe(2);
    });

    it('should return 400 if no failed recipients', async () => {
      req.params = { id: 'msg123' };
      databaseAdapter.findById.mockResolvedValue({
        _id: 'msg123',
        status: 'sent',
        recipients: [{ stakeholderId: 'STK-001', status: 'delivered' }]
      });

      await bulkMessageController.retryFailedRecipients(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'No failed recipients to retry');
    });
  });

  describe('getMessageHistory', () => {
    it('should return message history for a company', async () => {
      req.query = { companyId: 'COMP-001', limit: '10', offset: '0' };
      const mockMessages = [
        { _id: 'msg1', subject: 'Message 1', status: 'sent', createdAt: new Date() },
        { _id: 'msg2', subject: 'Message 2', status: 'sent', createdAt: new Date() }
      ];

      databaseAdapter.find.mockResolvedValue(mockMessages);
      databaseAdapter.count.mockResolvedValue(2);

      await bulkMessageController.getMessageHistory(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'BulkMessage',
        expect.objectContaining({ companyId: 'COMP-001' }),
        expect.objectContaining({ sort: { createdAt: -1 } })
      );
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.messages).toHaveLength(2);
      expect(data).toHaveProperty('total');
    });

    it('should require companyId parameter', async () => {
      req.query = {};

      await bulkMessageController.getMessageHistory(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'companyId is required');
    });

    it('should handle database error', async () => {
      req.query = { companyId: 'COMP-001' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await bulkMessageController.getMessageHistory(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should handle missing count function gracefully', async () => {
      req.query = { companyId: 'COMP-001', limit: '10', offset: '0' };
      const mockMessages = [
        { _id: 'msg1', subject: 'Message 1' }
      ];

      // Temporarily remove count function
      const originalCount = databaseAdapter.count;
      delete databaseAdapter.count;
      databaseAdapter.find.mockResolvedValue(mockMessages);

      await bulkMessageController.getMessageHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.total).toBe(1);

      // Restore count function
      databaseAdapter.count = originalCount;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('getBulkMessages - filter building', () => {
      it('should filter by multiple statuses (comma-separated)', async () => {
        req.query = { status: 'sent,partially_sent' };
        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await bulkMessageController.getBulkMessages(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage',
          expect.objectContaining({
            status: { $in: ['sent', 'partially_sent'] }
          }),
          expect.any(Object)
        );
      });

      it('should filter by senderId', async () => {
        req.query = { senderId: 'user123' };
        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await bulkMessageController.getBulkMessages(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith('BulkMessage',
          expect.objectContaining({ senderId: 'user123' }),
          expect.any(Object)
        );
      });

      it('should handle missing count function gracefully', async () => {
        req.query = {};
        const mockMessages = [{ _id: 'msg1' }];

        // Temporarily remove count function
        const originalCount = databaseAdapter.count;
        delete databaseAdapter.count;
        databaseAdapter.find.mockResolvedValue(mockMessages);

        await bulkMessageController.getBulkMessages(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.total).toBe(1);

        // Restore count function
        databaseAdapter.count = originalCount;
      });
    });

    describe('updateBulkMessage - additional cases', () => {
      it('should allow updating scheduled messages', async () => {
        req.params = { id: 'msg123' };
        req.body = { subject: 'Updated Subject' };
        const existingMessage = { _id: 'msg123', status: 'scheduled' };
        const updatedMessage = { ...existingMessage, subject: 'Updated Subject' };

        databaseAdapter.findById.mockResolvedValue(existingMessage);
        databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedMessage);

        await bulkMessageController.updateBulkMessage(req, res);

        expect(res.statusCode).toBe(200);
      });

      it('should return 500 on update error', async () => {
        req.params = { id: 'msg123' };
        req.body = { subject: 'Updated Subject' };
        databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'draft' });
        databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));

        await bulkMessageController.updateBulkMessage(req, res);

        expect(res.statusCode).toBe(500);
      });
    });

    describe('deleteBulkMessage - additional cases', () => {
      it('should return 500 on delete error', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Delete failed'));

        await bulkMessageController.deleteBulkMessage(req, res);

        expect(res.statusCode).toBe(500);
      });
    });

    describe('sendBulkMessage - additional cases', () => {
      it('should not send message currently being processed', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'processing' });

        await bulkMessageController.sendBulkMessage(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toHaveProperty('message', 'Message is currently being processed');
      });

      it('should not send partially_sent message', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'partially_sent' });

        await bulkMessageController.sendBulkMessage(req, res);

        expect(res.statusCode).toBe(400);
      });
    });

    describe('scheduleBulkMessage - additional cases', () => {
      it('should return 400 when scheduledAt is missing', async () => {
        req.params = { id: 'msg123' };
        req.body = {};

        await bulkMessageController.scheduleBulkMessage(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toHaveProperty('message', 'scheduledAt is required');
      });

      it('should return 500 on schedule error', async () => {
        req.params = { id: 'msg123' };
        const futureDate = new Date(Date.now() + 86400000);
        req.body = { scheduledAt: futureDate.toISOString() };

        databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'draft' });
        databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Schedule failed'));

        await bulkMessageController.scheduleBulkMessage(req, res);

        expect(res.statusCode).toBe(500);
      });
    });

    describe('cancelScheduledMessage - additional cases', () => {
      it('should return 500 on cancel error', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({ _id: 'msg123', status: 'scheduled' });
        databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Cancel failed'));

        await bulkMessageController.cancelScheduledMessage(req, res);

        expect(res.statusCode).toBe(500);
      });
    });

    describe('previewRecipients - additional cases', () => {
      it('should return 500 on preview error', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({
          _id: 'msg123',
          recipientFilter: { filterType: 'all' }
        });
        bulkMessageService.getRecipientsByFilter.mockRejectedValue(new Error('Preview failed'));

        await bulkMessageController.previewRecipients(req, res);

        expect(res.statusCode).toBe(500);
      });
    });

    describe('getDeliveryStatus - additional cases', () => {
      it('should handle message with empty recipients', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({
          _id: 'msg123',
          status: 'sent',
          deliveryStats: { totalRecipients: 0 }
          // No recipients array
        });

        await bulkMessageController.getDeliveryStatus(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.failedRecipients).toEqual([]);
      });

      it('should return 500 on status error', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockRejectedValue(new Error('Status failed'));

        await bulkMessageController.getDeliveryStatus(req, res);

        expect(res.statusCode).toBe(500);
      });
    });

    describe('retryFailedRecipients - additional cases', () => {
      it('should return 404 when message not found', async () => {
        req.params = { id: 'nonexistent' };
        databaseAdapter.findById.mockResolvedValue(null);

        await bulkMessageController.retryFailedRecipients(req, res);

        expect(res.statusCode).toBe(404);
      });

      it('should handle message with no recipients array', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({
          _id: 'msg123',
          status: 'sent'
          // No recipients array
        });

        await bulkMessageController.retryFailedRecipients(req, res);

        expect(res.statusCode).toBe(400);
      });

      it('should return 500 on retry error', async () => {
        req.params = { id: 'msg123' };
        databaseAdapter.findById.mockResolvedValue({
          _id: 'msg123',
          recipients: [{ stakeholderId: 'STK-001', status: 'failed' }]
        });
        bulkMessageService.retryFailedRecipients.mockRejectedValue(new Error('Retry failed'));

        await bulkMessageController.retryFailedRecipients(req, res);

        expect(res.statusCode).toBe(500);
      });
    });
  });
});
