/**
 * WebhookDelivery Model Unit Tests
 * Issue #118: Build Webhook System
 */
process.env.SKIP_DB_SETUP = 'true';

describe('WebhookDelivery Model', () => {
  let WebhookDelivery;

  beforeAll(() => {
    jest.resetModules();
    // Don't mock mongoose, use the actual model
    WebhookDelivery = require('../../../models/WebhookDelivery');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have deliveryId field', () => {
      expect(WebhookDelivery.schema.path('deliveryId')).toBeDefined();
    });

    it('should have webhookId field', () => {
      expect(WebhookDelivery.schema.path('webhookId')).toBeDefined();
    });

    it('should have eventType field', () => {
      expect(WebhookDelivery.schema.path('eventType')).toBeDefined();
    });

    it('should have payload field', () => {
      expect(WebhookDelivery.schema.path('payload')).toBeDefined();
    });

    it('should have response field', () => {
      expect(WebhookDelivery.schema.path('response')).toBeDefined();
    });

    it('should have statusCode field', () => {
      expect(WebhookDelivery.schema.path('statusCode')).toBeDefined();
    });

    it('should have status field', () => {
      expect(WebhookDelivery.schema.path('status')).toBeDefined();
    });

    it('should have attempts field', () => {
      expect(WebhookDelivery.schema.path('attempts')).toBeDefined();
    });

    it('should have nextRetryAt field', () => {
      expect(WebhookDelivery.schema.path('nextRetryAt')).toBeDefined();
    });

    it('should have timestamps enabled', () => {
      expect(WebhookDelivery.schema.options.timestamps).toBe(true);
    });
  });

  describe('Field Validations', () => {
    it('should require deliveryId to be unique', () => {
      const deliveryIdPath = WebhookDelivery.schema.path('deliveryId');
      expect(deliveryIdPath.options.unique).toBe(true);
    });

    it('should require webhookId', () => {
      const webhookIdPath = WebhookDelivery.schema.path('webhookId');
      expect(webhookIdPath.options.required).toBe(true);
    });

    it('should require eventType', () => {
      const eventTypePath = WebhookDelivery.schema.path('eventType');
      expect(eventTypePath.options.required).toBe(true);
    });

    it('should require payload', () => {
      const payloadPath = WebhookDelivery.schema.path('payload');
      expect(payloadPath.options.required).toBe(true);
    });

    it('should have status enum with pending, success, failed values', () => {
      const statusPath = WebhookDelivery.schema.path('status');
      expect(statusPath.options.enum).toContain('pending');
      expect(statusPath.options.enum).toContain('success');
      expect(statusPath.options.enum).toContain('failed');
    });

    it('should default status to pending', () => {
      const statusPath = WebhookDelivery.schema.path('status');
      expect(statusPath.options.default).toBe('pending');
    });

    it('should default attempts to 0', () => {
      const attemptsPath = WebhookDelivery.schema.path('attempts');
      expect(attemptsPath.options.default).toBe(0);
    });
  });

  describe('Response Sub-Schema', () => {
    it('should have response.body field', () => {
      const responsePath = WebhookDelivery.schema.path('response.body');
      expect(responsePath).toBeDefined();
    });

    it('should have response.headers field', () => {
      const responsePath = WebhookDelivery.schema.path('response.headers');
      expect(responsePath).toBeDefined();
    });

    it('should have response.error field', () => {
      const responsePath = WebhookDelivery.schema.path('response.error');
      expect(responsePath).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have index on deliveryId', () => {
      const indexes = WebhookDelivery.schema.indexes();
      const deliveryIdIndex = indexes.find(idx => idx[0].deliveryId);
      expect(deliveryIdIndex).toBeDefined();
    });

    it('should have index on webhookId', () => {
      const indexes = WebhookDelivery.schema.indexes();
      const webhookIdIndex = indexes.find(idx => idx[0].webhookId);
      expect(webhookIdIndex).toBeDefined();
    });

    it('should have index on status', () => {
      const indexes = WebhookDelivery.schema.indexes();
      const statusIndex = indexes.find(idx => idx[0].status);
      expect(statusIndex).toBeDefined();
    });

    it('should have index on nextRetryAt for pending retries', () => {
      const indexes = WebhookDelivery.schema.indexes();
      const nextRetryAtIndex = indexes.find(idx => idx[0].nextRetryAt);
      expect(nextRetryAtIndex).toBeDefined();
    });
  });

  describe('Model Instance Methods', () => {
    it('should have markSuccess method', () => {
      expect(WebhookDelivery.schema.methods.markSuccess).toBeDefined();
    });

    it('should have markFailed method', () => {
      expect(WebhookDelivery.schema.methods.markFailed).toBeDefined();
    });

    it('should have calculateNextRetry method', () => {
      expect(WebhookDelivery.schema.methods.calculateNextRetry).toBeDefined();
    });
  });

  describe('Model Virtual Properties', () => {
    it('should have canRetry virtual', () => {
      expect(WebhookDelivery.schema.virtuals.canRetry).toBeDefined();
    });

    it('should have isRetryDue virtual', () => {
      expect(WebhookDelivery.schema.virtuals.isRetryDue).toBeDefined();
    });
  });

  describe('Model Static Methods', () => {
    it('should have findDueForRetry static method', () => {
      expect(WebhookDelivery.findDueForRetry).toBeDefined();
    });

    it('should have getStatistics static method', () => {
      expect(WebhookDelivery.getStatistics).toBeDefined();
    });
  });

  describe('Model Creation', () => {
    it('should create a valid webhook delivery with all required fields', () => {
      const deliveryData = {
        deliveryId: 'DEL-12345678',
        webhookId: 'WH-12345678',
        eventType: 'stakeholder.created',
        payload: {
          eventId: 'evt-123',
          timestamp: new Date().toISOString(),
          data: {
            stakeholderId: 'sh-123',
            name: 'John Doe'
          }
        },
        response: {
          body: '{"status": "received"}',
          headers: { 'content-type': 'application/json' },
          error: null
        },
        statusCode: 200,
        status: 'success',
        attempts: 1,
        nextRetryAt: null
      };

      const delivery = new WebhookDelivery(deliveryData);
      expect(delivery.deliveryId).toBe('DEL-12345678');
      expect(delivery.webhookId).toBe('WH-12345678');
      expect(delivery.eventType).toBe('stakeholder.created');
      expect(delivery.payload).toHaveProperty('data');
      expect(delivery.statusCode).toBe(200);
      expect(delivery.status).toBe('success');
      expect(delivery.attempts).toBe(1);
    });

    it('should handle failed delivery with error response', () => {
      const failedDeliveryData = {
        deliveryId: 'DEL-87654321',
        webhookId: 'WH-12345678',
        eventType: 'stakeholder.created',
        payload: { data: {} },
        response: {
          body: null,
          headers: null,
          error: 'Connection timeout'
        },
        statusCode: null,
        status: 'failed',
        attempts: 3,
        nextRetryAt: new Date(Date.now() + 60000)
      };

      const delivery = new WebhookDelivery(failedDeliveryData);
      expect(delivery.status).toBe('failed');
      expect(delivery.response.error).toBe('Connection timeout');
      expect(delivery.attempts).toBe(3);
      expect(delivery.nextRetryAt).toBeDefined();
    });
  });

  describe('Computed Fields', () => {
    it('should track delivery duration if completedAt is set', () => {
      const deliveryData = {
        deliveryId: 'DEL-12345678',
        webhookId: 'WH-12345678',
        eventType: 'stakeholder.created',
        payload: { data: {} },
        status: 'success',
        duration: 2000
      };

      const delivery = new WebhookDelivery(deliveryData);
      expect(delivery.duration).toBe(2000);
    });
  });
});
