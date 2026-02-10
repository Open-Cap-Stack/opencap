/**
 * BulkMessage Routes Unit Tests
 * Issue #86: Create Bulk Messaging System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock auth middleware before requiring routes
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  },
  authenticate: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  }
}));

// Mock the controller
jest.mock('../../../../controllers/bulkMessageController', () => ({
  createBulkMessage: jest.fn((req, res) => res.status(201).json({ bulkMessage: { _id: 'msg123' } })),
  getBulkMessages: jest.fn((req, res) => res.status(200).json({ bulkMessages: [], total: 0 })),
  getBulkMessageById: jest.fn((req, res) => res.status(200).json({ bulkMessage: { _id: req.params.id } })),
  updateBulkMessage: jest.fn((req, res) => res.status(200).json({ bulkMessage: { _id: req.params.id } })),
  deleteBulkMessage: jest.fn((req, res) => res.status(200).json({ message: 'Bulk message deleted' })),
  sendBulkMessage: jest.fn((req, res) => res.status(200).json({ success: true })),
  scheduleBulkMessage: jest.fn((req, res) => res.status(200).json({ scheduled: true })),
  cancelScheduledMessage: jest.fn((req, res) => res.status(200).json({ cancelled: true })),
  previewRecipients: jest.fn((req, res) => res.status(200).json({ recipients: [], totalCount: 0 })),
  getDeliveryStatus: jest.fn((req, res) => res.status(200).json({ status: 'sent' })),
  retryFailedRecipients: jest.fn((req, res) => res.status(200).json({ retried: 0 })),
  getMessageHistory: jest.fn((req, res) => res.status(200).json({ messages: [], total: 0 }))
}));

const bulkMessageRoutes = require('../../../../routes/v1/bulkMessageRoutes');
const bulkMessageController = require('../../../../controllers/bulkMessageController');

describe('BulkMessage Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/bulk-messages', bulkMessageRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/bulk-messages', () => {
    it('should create a new bulk message', async () => {
      const response = await request(app)
        .post('/api/v1/bulk-messages')
        .send({
          bulkMessageId: 'BM-001',
          companyId: 'COMP-001',
          senderId: 'user123',
          subject: 'Test Subject',
          content: 'Test Content',
          messageType: 'email',
          recipientFilter: { filterType: 'all' }
        });

      expect(response.status).toBe(201);
      expect(bulkMessageController.createBulkMessage).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bulk-messages', () => {
    it('should get all bulk messages', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-messages');

      expect(response.status).toBe(200);
      expect(bulkMessageController.getBulkMessages).toHaveBeenCalled();
    });

    it('should support query parameters for filtering', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-messages')
        .query({ companyId: 'COMP-001', status: 'sent' });

      expect(response.status).toBe(200);
      expect(bulkMessageController.getBulkMessages).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bulk-messages/history', () => {
    it('should get message history for a company', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-messages/history')
        .query({ companyId: 'COMP-001' });

      expect(response.status).toBe(200);
      expect(bulkMessageController.getMessageHistory).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bulk-messages/:id', () => {
    it('should get a bulk message by ID', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-messages/msg123');

      expect(response.status).toBe(200);
      expect(bulkMessageController.getBulkMessageById).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/bulk-messages/:id', () => {
    it('should update a bulk message', async () => {
      const response = await request(app)
        .put('/api/v1/bulk-messages/msg123')
        .send({ subject: 'Updated Subject' });

      expect(response.status).toBe(200);
      expect(bulkMessageController.updateBulkMessage).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/bulk-messages/:id', () => {
    it('should delete a bulk message', async () => {
      const response = await request(app)
        .delete('/api/v1/bulk-messages/msg123');

      expect(response.status).toBe(200);
      expect(bulkMessageController.deleteBulkMessage).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/bulk-messages/:id/send', () => {
    it('should send a bulk message', async () => {
      const response = await request(app)
        .post('/api/v1/bulk-messages/msg123/send');

      expect(response.status).toBe(200);
      expect(bulkMessageController.sendBulkMessage).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/bulk-messages/:id/schedule', () => {
    it('should schedule a bulk message', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const response = await request(app)
        .post('/api/v1/bulk-messages/msg123/schedule')
        .send({ scheduledAt: futureDate.toISOString() });

      expect(response.status).toBe(200);
      expect(bulkMessageController.scheduleBulkMessage).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/bulk-messages/:id/cancel', () => {
    it('should cancel a scheduled message', async () => {
      const response = await request(app)
        .post('/api/v1/bulk-messages/msg123/cancel');

      expect(response.status).toBe(200);
      expect(bulkMessageController.cancelScheduledMessage).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bulk-messages/:id/recipients', () => {
    it('should preview recipients for a bulk message', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-messages/msg123/recipients');

      expect(response.status).toBe(200);
      expect(bulkMessageController.previewRecipients).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bulk-messages/:id/status', () => {
    it('should get delivery status for a bulk message', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-messages/msg123/status');

      expect(response.status).toBe(200);
      expect(bulkMessageController.getDeliveryStatus).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/bulk-messages/:id/retry', () => {
    it('should retry failed recipients', async () => {
      const response = await request(app)
        .post('/api/v1/bulk-messages/msg123/retry');

      expect(response.status).toBe(200);
      expect(bulkMessageController.retryFailedRecipients).toHaveBeenCalled();
    });
  });
});
