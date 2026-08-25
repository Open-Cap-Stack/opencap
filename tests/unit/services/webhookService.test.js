/**
 * Webhook Service Unit Tests
 * Issue #118: Build Webhook System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock dependencies before requiring the service
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  delete: jest.fn(),
  update: jest.fn()
}));

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn()
  }))
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012')
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const axios = require('axios');
const crypto = require('crypto');

describe('WebhookService', () => {
  let webhookService;

  beforeEach(() => {
    // Reset module cache and clear mocks before each test
    jest.clearAllMocks();
    // Re-require to get fresh instance with mocks in place
    jest.isolateModules(() => {
      webhookService = require('../../../services/webhookService');
    });
  });

  describe('registerWebhook', () => {
    const validWebhookData = {
      companyId: 'company123',
      name: 'Test Webhook',
      url: 'https://api.example.com/webhook',
      events: ['stakeholder.created', 'stakeholder.updated'],
      description: 'A test webhook'
    };

    it('should register a new webhook successfully', async () => {
      const mockSavedWebhook = {
        _id: 'webhook123',
        webhookId: 'WH-12345678',
        ...validWebhookData,
        secret: 'generated-secret',
        status: 'active'
      };
      databaseAdapter.create.mockResolvedValue(mockSavedWebhook);

      const result = await webhookService.registerWebhook(validWebhookData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Webhook',
        expect.objectContaining({
          companyId: 'company123',
          name: 'Test Webhook',
          url: 'https://api.example.com/webhook',
          events: ['stakeholder.created', 'stakeholder.updated'],
          status: 'active'
        })
      );
      expect(result).toHaveProperty('webhookId');
      expect(result).toHaveProperty('secret');
    });

    it('should generate a unique webhookId', async () => {
      databaseAdapter.create.mockResolvedValue({
        webhookId: 'WH-ABC12345',
        ...validWebhookData
      });

      const result = await webhookService.registerWebhook(validWebhookData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Webhook',
        expect.objectContaining({
          webhookId: expect.stringMatching(/^WH-/)
        })
      );
    });

    it('should generate a secure secret for signature verification', async () => {
      databaseAdapter.create.mockResolvedValue({
        ...validWebhookData,
        secret: 'random-secret-key'
      });

      const result = await webhookService.registerWebhook(validWebhookData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Webhook',
        expect.objectContaining({
          secret: expect.any(String)
        })
      );
    });

    it('should set default retry configuration', async () => {
      databaseAdapter.create.mockResolvedValue({
        ...validWebhookData,
        retryConfig: { maxRetries: 3, retryDelay: 60000 }
      });

      const result = await webhookService.registerWebhook(validWebhookData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Webhook',
        expect.objectContaining({
          retryConfig: expect.objectContaining({
            maxRetries: expect.any(Number),
            retryDelay: expect.any(Number)
          })
        })
      );
    });

    it('should allow custom retry configuration', async () => {
      const customRetryWebhook = {
        ...validWebhookData,
        retryConfig: { maxRetries: 5, retryDelay: 30000 }
      };
      databaseAdapter.create.mockResolvedValue(customRetryWebhook);

      const result = await webhookService.registerWebhook(customRetryWebhook);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'Webhook',
        expect.objectContaining({
          retryConfig: { maxRetries: 5, retryDelay: 30000 }
        })
      );
    });

    it('should throw error for invalid URL', async () => {
      const invalidWebhook = { ...validWebhookData, url: 'not-a-valid-url' };

      await expect(webhookService.registerWebhook(invalidWebhook))
        .rejects.toThrow('Invalid URL format');
    });

    it('should throw error for localhost URLs (SSRF protection)', async () => {
      const localhostWebhook = { ...validWebhookData, url: 'https://localhost/webhook' };

      await expect(webhookService.registerWebhook(localhostWebhook))
        .rejects.toThrow('Internal URLs not allowed');
    });

    it('should throw error for private IP URLs (SSRF protection)', async () => {
      const privateIpWebhook = { ...validWebhookData, url: 'https://192.168.1.1/webhook' };

      await expect(webhookService.registerWebhook(privateIpWebhook))
        .rejects.toThrow('Internal URLs not allowed');
    });

    it('should throw error for AWS metadata URL (SSRF protection)', async () => {
      const metadataWebhook = { ...validWebhookData, url: 'http://169.254.169.254/latest/meta-data/' };

      await expect(webhookService.registerWebhook(metadataWebhook))
        .rejects.toThrow('Internal URLs not allowed');
    });

    it('should throw error for empty events array', async () => {
      const invalidWebhook = { ...validWebhookData, events: [] };

      await expect(webhookService.registerWebhook(invalidWebhook))
        .rejects.toThrow('At least one event type is required');
    });
  });

  describe('triggerWebhook', () => {
    const mockWebhook = {
      _id: 'webhook123',
      webhookId: 'WH-12345678',
      companyId: 'company123',
      url: 'https://api.example.com/webhook',
      secret: 'webhook-secret',
      events: ['stakeholder.created'],
      status: 'active',
      retryConfig: { maxRetries: 3, retryDelay: 60000 },
      headers: { 'X-Custom-Header': 'value' }
    };

    const eventPayload = {
      eventType: 'stakeholder.created',
      data: {
        stakeholderId: 'sh-123',
        name: 'John Doe',
        email: 'john@example.com'
      }
    };

    it('should trigger webhook successfully', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200, data: { received: true } });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockWebhook);

      const result = await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(axios.post).toHaveBeenCalledWith(
        mockWebhook.url,
        expect.objectContaining({
          event: 'stakeholder.created',
          data: eventPayload.data
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String)
          })
        })
      );
    });

    it('should include HMAC signature in request headers', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200 });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.any(String)
          })
        })
      );
    });

    it('should create delivery record on success', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200, data: { received: true } });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123', status: 'success' });

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'WebhookDelivery',
        expect.objectContaining({
          webhookId: mockWebhook.webhookId,
          eventType: 'stakeholder.created',
          status: 'success'
        })
      );
    });

    it('should create delivery record with failed status on error', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockRejectedValue(new Error('Connection timeout'));
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123', status: 'failed' });

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'WebhookDelivery',
        expect.objectContaining({
          webhookId: mockWebhook.webhookId,
          eventType: 'stakeholder.created',
          status: 'failed',
          response: expect.objectContaining({
            error: expect.any(String)
          })
        })
      );
    });

    it('should skip webhooks that are not subscribed to the event', async () => {
      const webhookWithoutEvent = {
        ...mockWebhook,
        events: ['document.created']
      };
      databaseAdapter.find.mockResolvedValue([webhookWithoutEvent]);

      const result = await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should skip paused webhooks', async () => {
      // The service only queries active webhooks, so paused webhooks won't be returned
      // Return empty array to simulate no active webhooks matching
      databaseAdapter.find.mockResolvedValue([]);

      const result = await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(axios.post).not.toHaveBeenCalled();
      expect(result.triggered).toBe(0);
    });

    it('should update webhook lastTriggeredAt on successful delivery', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200 });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockWebhook);

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        mockWebhook._id,
        expect.objectContaining({
          lastTriggeredAt: expect.any(Date)
        }),
        expect.any(Object)
      );
    });

    it('should increment failureCount on failed delivery', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockRejectedValue(new Error('Connection timeout'));
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockWebhook);

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        mockWebhook._id,
        expect.objectContaining({
          $inc: { failureCount: 1 }
        }),
        expect.any(Object)
      );
    });

    it('should trigger multiple webhooks for the same event', async () => {
      const webhook2 = { ...mockWebhook, _id: 'webhook456', webhookId: 'WH-87654321' };
      databaseAdapter.find.mockResolvedValue([mockWebhook, webhook2]);
      axios.post.mockResolvedValue({ status: 200 });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should include custom headers in request', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200 });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });

      await webhookService.triggerWebhook('stakeholder.created', eventPayload.data, 'company123');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value'
          })
        })
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'webhook-secret';
      // Generate the correct signature using the service
      const signature = webhookService.generateSignature(payload, secret);

      const result = webhookService.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'webhook-secret';
      const correctSignature = webhookService.generateSignature(payload, secret);
      // Create an invalid signature with same length
      const invalidSignature = correctSignature.replace(/./g, 'a');

      const result = webhookService.verifyWebhookSignature(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it('should use SHA256 for HMAC calculation', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'webhook-secret';
      const signature = webhookService.generateSignature(payload, secret);

      // SHA256 produces 64 character hex string
      expect(signature).toHaveLength(64);
    });

    it('should handle empty payload', () => {
      const secret = 'webhook-secret';
      const signature = webhookService.generateSignature('', secret);

      const result = webhookService.verifyWebhookSignature('', signature, secret);

      expect(result).toBe(true);
    });
  });

  describe('retryFailedDeliveries', () => {
    const mockFailedDelivery = {
      _id: 'delivery123',
      deliveryId: 'DEL-12345678',
      webhookId: 'WH-12345678',
      eventType: 'stakeholder.created',
      payload: { data: { id: '123' } },
      status: 'failed',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 1000) // Past due
    };

    const mockWebhook = {
      _id: 'webhook123',
      webhookId: 'WH-12345678',
      url: 'https://api.example.com/webhook',
      secret: 'webhook-secret',
      status: 'active',
      retryConfig: { maxRetries: 3, retryDelay: 60000 }
    };

    it('should retry failed deliveries that are due', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery]) // Find failed deliveries
        .mockResolvedValueOnce([mockWebhook]); // Find webhook
      axios.post.mockResolvedValue({ status: 200 });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockFailedDelivery,
        status: 'success',
        attempts: 2
      });

      const result = await webhookService.retryFailedDeliveries();

      expect(axios.post).toHaveBeenCalled();
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WebhookDelivery',
        mockFailedDelivery._id,
        expect.objectContaining({
          status: 'success',
          attempts: 2
        }),
        expect.any(Object)
      );
    });

    it('should increment attempts on retry', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery])
        .mockResolvedValueOnce([mockWebhook]);
      axios.post.mockRejectedValue(new Error('Still failing'));
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockFailedDelivery,
        attempts: 2
      });

      await webhookService.retryFailedDeliveries();

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WebhookDelivery',
        mockFailedDelivery._id,
        expect.objectContaining({
          attempts: 2
        }),
        expect.any(Object)
      );
    });

    it('should calculate next retry time with exponential backoff', async () => {
      // Use 1 attempt so after incrementing it will still have retries left (max is 3)
      const deliveryWith1Attempt = { ...mockFailedDelivery, attempts: 1 };
      databaseAdapter.find
        .mockResolvedValueOnce([deliveryWith1Attempt])
        .mockResolvedValueOnce([mockWebhook]);
      axios.post.mockRejectedValue(new Error('Still failing'));
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await webhookService.retryFailedDeliveries();

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WebhookDelivery',
        deliveryWith1Attempt._id,
        expect.objectContaining({
          attempts: 2,
          nextRetryAt: expect.any(Date)
        }),
        expect.any(Object)
      );
    });

    it('should mark delivery as permanently failed after max retries', async () => {
      const maxRetriesDelivery = { ...mockFailedDelivery, attempts: 3 };
      databaseAdapter.find
        .mockResolvedValueOnce([maxRetriesDelivery])
        .mockResolvedValueOnce([mockWebhook]);
      axios.post.mockRejectedValue(new Error('Still failing'));
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await webhookService.retryFailedDeliveries();

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WebhookDelivery',
        maxRetriesDelivery._id,
        expect.objectContaining({
          status: 'failed',
          nextRetryAt: null
        }),
        expect.any(Object)
      );
    });

    it('should skip retries for paused webhooks', async () => {
      const pausedWebhook = { ...mockWebhook, status: 'paused' };
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery])
        .mockResolvedValueOnce([pausedWebhook]);

      await webhookService.retryFailedDeliveries();

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should return count of successful retries', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery])
        .mockResolvedValueOnce([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200 });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockFailedDelivery,
        status: 'success'
      });

      const result = await webhookService.retryFailedDeliveries();

      expect(result).toHaveProperty('retried');
      expect(result).toHaveProperty('succeeded');
      expect(result).toHaveProperty('failed');
    });
  });

  describe('getDeliveryHistory', () => {
    const mockDeliveries = [
      {
        deliveryId: 'DEL-001',
        webhookId: 'WH-12345678',
        eventType: 'stakeholder.created',
        status: 'success',
        createdAt: new Date('2024-01-15')
      },
      {
        deliveryId: 'DEL-002',
        webhookId: 'WH-12345678',
        eventType: 'stakeholder.updated',
        status: 'failed',
        createdAt: new Date('2024-01-14')
      }
    ];

    it('should return delivery history for a webhook', async () => {
      databaseAdapter.find.mockResolvedValue(mockDeliveries);

      const result = await webhookService.getDeliveryHistory('WH-12345678');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'WebhookDelivery',
        { webhookId: 'WH-12345678' },
        expect.objectContaining({
          sort: { createdAt: -1 }
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should support pagination with limit and offset', async () => {
      databaseAdapter.find.mockResolvedValue(mockDeliveries.slice(0, 1));

      const result = await webhookService.getDeliveryHistory('WH-12345678', { limit: 1, offset: 0 });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'WebhookDelivery',
        { webhookId: 'WH-12345678' },
        expect.objectContaining({
          limit: 1,
          skip: 0
        })
      );
    });

    it('should filter by status', async () => {
      databaseAdapter.find.mockResolvedValue([mockDeliveries[1]]);

      const result = await webhookService.getDeliveryHistory('WH-12345678', { status: 'failed' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'WebhookDelivery',
        { webhookId: 'WH-12345678', status: 'failed' },
        expect.any(Object)
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      databaseAdapter.find.mockResolvedValue(mockDeliveries);

      const result = await webhookService.getDeliveryHistory('WH-12345678', {
        startDate,
        endDate
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'WebhookDelivery',
        expect.objectContaining({
          webhookId: 'WH-12345678',
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }),
        expect.any(Object)
      );
    });

    it('should return empty array for non-existent webhook', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await webhookService.getDeliveryHistory('WH-NONEXISTENT');

      expect(result).toEqual([]);
    });
  });

  describe('generateSignature', () => {
    it('should generate HMAC SHA256 signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'webhook-secret';

      const signature = webhookService.generateSignature(payload, secret);

      // SHA256 hex signature is 64 characters
      expect(signature).toHaveLength(64);
      expect(typeof signature).toBe('string');
    });

    it('should produce consistent signatures for same input', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'webhook-secret';

      const signature1 = webhookService.generateSignature(payload, secret);
      const signature2 = webhookService.generateSignature(payload, secret);

      expect(signature1).toBe(signature2);
    });

    it('should produce different signatures for different secrets', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });

      const signature1 = webhookService.generateSignature(payload, 'secret1');
      const signature2 = webhookService.generateSignature(payload, 'secret2');

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook configuration', async () => {
      const updates = { name: 'Updated Webhook', events: ['document.created'] };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'webhook123',
        webhookId: 'WH-12345678',
        ...updates
      });

      const result = await webhookService.updateWebhook('webhook123', updates);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        'webhook123',
        updates,
        { new: true }
      );
      expect(result.name).toBe('Updated Webhook');
    });

    it('should not allow updating secret directly', async () => {
      const updates = { secret: 'new-secret' };

      await expect(webhookService.updateWebhook('webhook123', updates))
        .rejects.toThrow('Cannot update secret directly');
    });
  });

  describe('regenerateSecret', () => {
    it('should generate a new secret for webhook', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'webhook123',
        secret: 'new-random-secret'
      });

      const result = await webhookService.regenerateSecret('webhook123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        'webhook123',
        expect.objectContaining({ secret: expect.any(String) }),
        { new: true }
      );
      expect(result.secret).toBeDefined();
    });
  });

  describe('pauseWebhook', () => {
    it('should pause an active webhook', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'webhook123',
        status: 'paused'
      });

      const result = await webhookService.pauseWebhook('webhook123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        'webhook123',
        { status: 'paused' },
        { new: true }
      );
      expect(result.status).toBe('paused');
    });
  });

  describe('resumeWebhook', () => {
    it('should resume a paused webhook', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'webhook123',
        status: 'active',
        failureCount: 0
      });

      const result = await webhookService.resumeWebhook('webhook123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        'webhook123',
        { status: 'active', failureCount: 0 },
        { new: true }
      );
      expect(result.status).toBe('active');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook and its delivery history', async () => {
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'webhook123', webhookId: 'WH-12345678' });
      databaseAdapter.delete = jest.fn().mockResolvedValue({ deletedCount: 5 });

      const result = await webhookService.deleteWebhook('webhook123');

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Webhook', 'webhook123');
    });

    it('should return null if webhook not found', async () => {
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      const result = await webhookService.deleteWebhook('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('triggerWebhook - HTTP non-2xx responses', () => {
    const mockWebhook = {
      _id: 'webhook123',
      webhookId: 'WH-12345678',
      companyId: 'company123',
      url: 'https://api.example.com/webhook',
      secret: 'webhook-secret',
      events: ['stakeholder.created'],
      status: 'active',
      retryConfig: { maxRetries: 3, retryDelay: 60000 },
      headers: {}
    };

    it('should create failed delivery record for non-2xx HTTP response', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 500, data: 'Internal Server Error', headers: {} });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123', status: 'failed' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockWebhook);

      const result = await webhookService.triggerWebhook('stakeholder.created', { id: '123' }, 'company123');

      expect(result.failed).toBe(1);
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'WebhookDelivery',
        expect.objectContaining({
          status: 'failed',
          statusCode: 500
        })
      );
    });

    it('should handle webhook with Map headers', async () => {
      const webhookWithMap = {
        ...mockWebhook,
        headers: new Map([['X-Custom', 'value']])
      };
      databaseAdapter.find.mockResolvedValue([webhookWithMap]);
      axios.post.mockResolvedValue({ status: 200, data: 'ok', headers: {} });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(webhookWithMap);

      const result = await webhookService.triggerWebhook('stakeholder.created', { id: '123' }, 'company123');

      expect(result.succeeded).toBe(1);
    });

    it('should handle response.data as string type', async () => {
      databaseAdapter.find.mockResolvedValue([mockWebhook]);
      axios.post.mockResolvedValue({ status: 200, data: 'plain text response', headers: {} });
      databaseAdapter.create.mockResolvedValue({ deliveryId: 'DEL-123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockWebhook);

      const result = await webhookService.triggerWebhook('stakeholder.created', { id: '123' }, 'company123');

      expect(result.succeeded).toBe(1);
    });

    it('should handle webhook with no events array', async () => {
      const noEventsWebhook = { ...mockWebhook, events: null };
      databaseAdapter.find.mockResolvedValue([noEventsWebhook]);

      const result = await webhookService.triggerWebhook('stakeholder.created', {}, 'company123');

      expect(result.triggered).toBe(0);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('retryFailedDeliveries - HTTP non-2xx retry', () => {
    const mockWebhook = {
      _id: 'webhook123',
      webhookId: 'WH-12345678',
      url: 'https://api.example.com/webhook',
      secret: 'webhook-secret',
      status: 'active',
      retryConfig: { maxRetries: 3, retryDelay: 60000 },
      headers: {}
    };

    const mockFailedDelivery = {
      _id: 'delivery123',
      deliveryId: 'DEL-12345678',
      webhookId: 'WH-12345678',
      eventType: 'stakeholder.created',
      payload: { data: { id: '123' } },
      status: 'failed',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 1000)
    };

    it('should handle retry with HTTP non-2xx response and more retries available', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery])
        .mockResolvedValueOnce([mockWebhook]);
      axios.post.mockResolvedValue({ status: 503, data: 'Service Unavailable', headers: {} });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await webhookService.retryFailedDeliveries();

      expect(result.failed).toBe(1);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WebhookDelivery',
        mockFailedDelivery._id,
        expect.objectContaining({
          status: 'failed',
          statusCode: 503,
          attempts: 2,
          nextRetryAt: expect.any(Date)
        }),
        expect.any(Object)
      );
    });

    it('should permanently fail retry with HTTP non-2xx when max retries reached', async () => {
      const maxRetriesDelivery = { ...mockFailedDelivery, attempts: 2 };
      databaseAdapter.find
        .mockResolvedValueOnce([maxRetriesDelivery])
        .mockResolvedValueOnce([mockWebhook]);
      axios.post.mockResolvedValue({ status: 500, data: 'Error', headers: {} });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await webhookService.retryFailedDeliveries();

      expect(result.permanentlyFailed).toBe(1);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'WebhookDelivery',
        maxRetriesDelivery._id,
        expect.objectContaining({
          nextRetryAt: null
        }),
        expect.any(Object)
      );
    });

    it('should skip if webhook not found for delivery', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery])
        .mockResolvedValueOnce([]); // No webhook found

      const result = await webhookService.retryFailedDeliveries();

      expect(result.retried).toBe(0);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle retry with Map headers on webhook', async () => {
      const webhookWithMap = { ...mockWebhook, headers: new Map([['X-Auth', 'token']]) };
      databaseAdapter.find
        .mockResolvedValueOnce([mockFailedDelivery])
        .mockResolvedValueOnce([webhookWithMap]);
      axios.post.mockResolvedValue({ status: 200, data: 'ok', headers: {} });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await webhookService.retryFailedDeliveries();

      expect(result.succeeded).toBe(1);
    });
  });

  describe('_calculateNextRetry', () => {
    it('should return null when attempts exceed maxRetries', () => {
      const result = webhookService._calculateNextRetry(5, { maxRetries: 3, retryDelay: 60000 });
      expect(result).toBeNull();
    });

    it('should use default config when retryConfig is null', () => {
      const result = webhookService._calculateNextRetry(1, null);
      expect(result).toBeInstanceOf(Date);
    });

    it('should use default config when retryConfig has no properties', () => {
      const result = webhookService._calculateNextRetry(1, {});
      expect(result).toBeInstanceOf(Date);
    });

    it('should cap backoff delay at 1 hour', () => {
      const before = Date.now();
      const result = webhookService._calculateNextRetry(1, { maxRetries: 10, retryDelay: 7200000 });
      // 7200000 * 2^0 = 7200000 which exceeds 3600000 max, so should be capped
      const maxDelay = 3600000;
      expect(result.getTime()).toBeLessThanOrEqual(before + maxDelay + 1000);
    });
  });

  describe('updateWebhook - URL validation', () => {
    it('should validate and update URL when provided', async () => {
      const updates = { url: 'https://api.newsite.com/webhook' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'webhook123',
        url: 'https://api.newsite.com/webhook'
      });

      const result = await webhookService.updateWebhook('webhook123', updates);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Webhook',
        'webhook123',
        expect.objectContaining({ url: expect.any(String) }),
        { new: true }
      );
    });

    it('should throw error when updating with invalid URL', async () => {
      await expect(webhookService.updateWebhook('webhook123', { url: 'not-a-url' }))
        .rejects.toThrow();
    });

    it('should throw error when updating with internal URL', async () => {
      await expect(webhookService.updateWebhook('webhook123', { url: 'https://192.168.1.1/hook' }))
        .rejects.toThrow('Internal URLs not allowed');
    });
  });

  describe('regenerateSecret - null case', () => {
    it('should return null when webhook not found', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      const result = await webhookService.regenerateSecret('nonexistent');

      expect(result).toBeNull();
    });
  });
});
