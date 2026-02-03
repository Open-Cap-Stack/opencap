/**
 * Webhook Controller Unit Tests
 * Issue #118: Build Webhook System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock dependencies before requiring the controller
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

jest.mock('../../../services/webhookService', () => ({
  registerWebhook: jest.fn(),
  triggerWebhook: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  retryFailedDeliveries: jest.fn(),
  getDeliveryHistory: jest.fn(),
  updateWebhook: jest.fn(),
  regenerateSecret: jest.fn(),
  pauseWebhook: jest.fn(),
  resumeWebhook: jest.fn(),
  deleteWebhook: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const webhookController = require('../../../controllers/webhookController');
const databaseAdapter = require('../../../services/databaseAdapter');
const webhookService = require('../../../services/webhookService');

describe('WebhookController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    const validWebhookData = {
      companyId: 'company123',
      name: 'Test Webhook',
      url: 'https://api.example.com/webhook',
      events: ['stakeholder.created', 'stakeholder.updated'],
      description: 'A test webhook for integration'
    };

    it('should create a webhook successfully', async () => {
      req.body = validWebhookData;
      const mockCreatedWebhook = {
        _id: 'webhook123',
        webhookId: 'WH-12345678',
        ...validWebhookData,
        secret: 'generated-secret',
        status: 'active'
      };
      webhookService.registerWebhook.mockResolvedValue(mockCreatedWebhook);

      await webhookController.createWebhook(req, res);

      expect(webhookService.registerWebhook).toHaveBeenCalledWith(validWebhookData);
      expect(res.statusCode).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('webhookId', 'WH-12345678');
      expect(responseData).toHaveProperty('secret', 'generated-secret');
    });

    it('should return 400 for missing required fields', async () => {
      req.body = { name: 'Test Webhook' }; // Missing url and events
      webhookService.registerWebhook.mockRejectedValue(new Error('URL is required'));

      await webhookController.createWebhook(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 for invalid URL', async () => {
      req.body = { ...validWebhookData, url: 'invalid-url' };
      webhookService.registerWebhook.mockRejectedValue(new Error('Invalid webhook URL'));

      await webhookController.createWebhook(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Invalid webhook URL');
    });

    it('should return 400 for empty events array', async () => {
      req.body = { ...validWebhookData, events: [] };
      webhookService.registerWebhook.mockRejectedValue(new Error('At least one event type is required'));

      await webhookController.createWebhook(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getWebhooks', () => {
    const mockWebhooks = [
      { _id: 'wh1', webhookId: 'WH-001', name: 'Webhook 1', status: 'active' },
      { _id: 'wh2', webhookId: 'WH-002', name: 'Webhook 2', status: 'paused' }
    ];

    it('should return all webhooks for a company', async () => {
      req.query = { companyId: 'company123' };
      databaseAdapter.find.mockResolvedValue(mockWebhooks);

      await webhookController.getWebhooks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Webhook',
        { companyId: 'company123' }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should filter by status', async () => {
      req.query = { companyId: 'company123', status: 'active' };
      databaseAdapter.find.mockResolvedValue([mockWebhooks[0]]);

      await webhookController.getWebhooks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Webhook',
        { companyId: 'company123', status: 'active' }
      );
    });

    it('should return empty array when no webhooks found', async () => {
      req.query = { companyId: 'company123' };
      databaseAdapter.find.mockResolvedValue([]);

      await webhookController.getWebhooks(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      req.query = { companyId: 'company123' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await webhookController.getWebhooks(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getWebhookById', () => {
    const mockWebhook = {
      _id: 'webhook123',
      webhookId: 'WH-12345678',
      name: 'Test Webhook',
      url: 'https://api.example.com/webhook',
      status: 'active'
    };

    it('should return webhook by ID', async () => {
      req.params = { id: 'webhook123' };
      databaseAdapter.findById.mockResolvedValue(mockWebhook);

      await webhookController.getWebhookById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('Webhook', 'webhook123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('webhookId', 'WH-12345678');
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await webhookController.getWebhookById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Webhook not found');
    });

    it('should not expose secret in response by default', async () => {
      req.params = { id: 'webhook123' };
      const webhookWithSecret = { ...mockWebhook, secret: 'super-secret' };
      databaseAdapter.findById.mockResolvedValue(webhookWithSecret);

      await webhookController.getWebhookById(req, res);

      const responseData = JSON.parse(res._getData());
      // Secret should be masked or not included
      expect(responseData.secret).toBeUndefined();
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook successfully', async () => {
      req.params = { id: 'webhook123' };
      req.body = { name: 'Updated Webhook', events: ['document.created'] };
      const mockUpdatedWebhook = {
        _id: 'webhook123',
        webhookId: 'WH-12345678',
        name: 'Updated Webhook',
        events: ['document.created']
      };
      webhookService.updateWebhook.mockResolvedValue(mockUpdatedWebhook);

      await webhookController.updateWebhook(req, res);

      expect(webhookService.updateWebhook).toHaveBeenCalledWith('webhook123', req.body);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('name', 'Updated Webhook');
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { name: 'Updated Webhook' };
      webhookService.updateWebhook.mockResolvedValue(null);

      await webhookController.updateWebhook(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when trying to update secret', async () => {
      req.params = { id: 'webhook123' };
      req.body = { secret: 'new-secret' };
      webhookService.updateWebhook.mockRejectedValue(new Error('Cannot update secret directly'));

      await webhookController.updateWebhook(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      req.params = { id: 'webhook123' };
      webhookService.deleteWebhook.mockResolvedValue({ _id: 'webhook123' });

      await webhookController.deleteWebhook(req, res);

      expect(webhookService.deleteWebhook).toHaveBeenCalledWith('webhook123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Webhook deleted successfully');
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      webhookService.deleteWebhook.mockResolvedValue(null);

      await webhookController.deleteWebhook(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('triggerWebhook', () => {
    it('should trigger webhook manually', async () => {
      req.params = { id: 'webhook123' };
      req.body = {
        eventType: 'stakeholder.created',
        data: { stakeholderId: 'sh-123', name: 'John Doe' }
      };
      databaseAdapter.findById.mockResolvedValue({
        _id: 'webhook123',
        webhookId: 'WH-12345678',
        companyId: 'company123',
        status: 'active'
      });
      webhookService.triggerWebhook.mockResolvedValue({
        triggered: 1,
        deliveryId: 'DEL-123'
      });

      await webhookController.triggerWebhook(req, res);

      expect(webhookService.triggerWebhook).toHaveBeenCalledWith(
        'stakeholder.created',
        req.body.data,
        'company123'
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { eventType: 'stakeholder.created', data: {} };
      databaseAdapter.findById.mockResolvedValue(null);

      await webhookController.triggerWebhook(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when webhook is paused', async () => {
      req.params = { id: 'webhook123' };
      req.body = { eventType: 'stakeholder.created', data: {} };
      databaseAdapter.findById.mockResolvedValue({
        _id: 'webhook123',
        status: 'paused'
      });

      await webhookController.triggerWebhook(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Webhook is paused');
    });

    it('should return 400 for missing eventType', async () => {
      req.params = { id: 'webhook123' };
      req.body = { data: {} }; // Missing eventType

      await webhookController.triggerWebhook(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getDeliveryHistory', () => {
    const mockDeliveries = [
      {
        deliveryId: 'DEL-001',
        eventType: 'stakeholder.created',
        status: 'success',
        createdAt: new Date()
      },
      {
        deliveryId: 'DEL-002',
        eventType: 'stakeholder.updated',
        status: 'failed',
        createdAt: new Date()
      }
    ];

    it('should return delivery history for a webhook', async () => {
      req.params = { id: 'webhook123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'webhook123', webhookId: 'WH-12345678' });
      webhookService.getDeliveryHistory.mockResolvedValue(mockDeliveries);

      await webhookController.getDeliveryHistory(req, res);

      expect(webhookService.getDeliveryHistory).toHaveBeenCalledWith('WH-12345678', expect.any(Object));
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should support pagination', async () => {
      req.params = { id: 'webhook123' };
      req.query = { limit: '10', offset: '0' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'webhook123', webhookId: 'WH-12345678' });
      webhookService.getDeliveryHistory.mockResolvedValue(mockDeliveries);

      await webhookController.getDeliveryHistory(req, res);

      expect(webhookService.getDeliveryHistory).toHaveBeenCalledWith(
        'WH-12345678',
        expect.objectContaining({ limit: 10, offset: 0 })
      );
    });

    it('should filter by status', async () => {
      req.params = { id: 'webhook123' };
      req.query = { status: 'failed' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'webhook123', webhookId: 'WH-12345678' });
      webhookService.getDeliveryHistory.mockResolvedValue([mockDeliveries[1]]);

      await webhookController.getDeliveryHistory(req, res);

      expect(webhookService.getDeliveryHistory).toHaveBeenCalledWith(
        'WH-12345678',
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await webhookController.getDeliveryHistory(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('retryFailedDeliveries', () => {
    it('should retry all failed deliveries', async () => {
      webhookService.retryFailedDeliveries.mockResolvedValue({
        retried: 5,
        succeeded: 3,
        failed: 2
      });

      await webhookController.retryFailedDeliveries(req, res);

      expect(webhookService.retryFailedDeliveries).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('retried', 5);
      expect(responseData).toHaveProperty('succeeded', 3);
      expect(responseData).toHaveProperty('failed', 2);
    });

    it('should return 500 on error', async () => {
      webhookService.retryFailedDeliveries.mockRejectedValue(new Error('Retry failed'));

      await webhookController.retryFailedDeliveries(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('pauseWebhook', () => {
    it('should pause an active webhook', async () => {
      req.params = { id: 'webhook123' };
      webhookService.pauseWebhook.mockResolvedValue({
        _id: 'webhook123',
        status: 'paused'
      });

      await webhookController.pauseWebhook(req, res);

      expect(webhookService.pauseWebhook).toHaveBeenCalledWith('webhook123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'paused');
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      webhookService.pauseWebhook.mockResolvedValue(null);

      await webhookController.pauseWebhook(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('resumeWebhook', () => {
    it('should resume a paused webhook', async () => {
      req.params = { id: 'webhook123' };
      webhookService.resumeWebhook.mockResolvedValue({
        _id: 'webhook123',
        status: 'active'
      });

      await webhookController.resumeWebhook(req, res);

      expect(webhookService.resumeWebhook).toHaveBeenCalledWith('webhook123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'active');
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      webhookService.resumeWebhook.mockResolvedValue(null);

      await webhookController.resumeWebhook(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('regenerateSecret', () => {
    it('should regenerate webhook secret', async () => {
      req.params = { id: 'webhook123' };
      webhookService.regenerateSecret.mockResolvedValue({
        _id: 'webhook123',
        secret: 'new-generated-secret'
      });

      await webhookController.regenerateSecret(req, res);

      expect(webhookService.regenerateSecret).toHaveBeenCalledWith('webhook123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('secret', 'new-generated-secret');
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      webhookService.regenerateSecret.mockResolvedValue(null);

      await webhookController.regenerateSecret(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      req.body = {
        payload: '{"event":"test"}',
        signature: 'valid-signature',
        secret: 'webhook-secret'
      };
      webhookService.verifyWebhookSignature.mockReturnValue(true);

      await webhookController.verifySignature(req, res);

      expect(webhookService.verifyWebhookSignature).toHaveBeenCalledWith(
        '{"event":"test"}',
        'valid-signature',
        'webhook-secret'
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('valid', true);
    });

    it('should reject invalid signature', async () => {
      req.body = {
        payload: '{"event":"test"}',
        signature: 'invalid-signature',
        secret: 'webhook-secret'
      };
      webhookService.verifyWebhookSignature.mockReturnValue(false);

      await webhookController.verifySignature(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('valid', false);
    });

    it('should return 400 for missing parameters', async () => {
      req.body = { payload: '{"event":"test"}' }; // Missing signature and secret

      await webhookController.verifySignature(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('testWebhook', () => {
    it('should send test payload to webhook', async () => {
      req.params = { id: 'webhook123' };
      databaseAdapter.findById.mockResolvedValue({
        _id: 'webhook123',
        webhookId: 'WH-12345678',
        companyId: 'company123',
        url: 'https://api.example.com/webhook',
        status: 'active'
      });
      webhookService.triggerWebhook.mockResolvedValue({
        triggered: 1,
        deliveryId: 'DEL-TEST-123'
      });

      await webhookController.testWebhook(req, res);

      expect(webhookService.triggerWebhook).toHaveBeenCalledWith(
        'webhook.test',
        expect.objectContaining({ test: true }),
        'company123'
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await webhookController.testWebhook(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
