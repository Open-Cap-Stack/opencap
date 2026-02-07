/**
 * WebhookDelivery Model Unit Tests
 * Issue #118: Build Webhook System
 * Rewritten for ZeroDB model compatibility
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  projectId: 'test-project'
}));

describe('WebhookDelivery Model', () => {
  let WebhookDelivery;

  beforeAll(() => {
    jest.resetModules();
    WebhookDelivery = require('../../../models/WebhookDelivery');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have deliveryId field', () => {
      expect(WebhookDelivery.schema.deliveryId).toBeDefined();
    });

    it('should have webhookId field', () => {
      expect(WebhookDelivery.schema.webhookId).toBeDefined();
    });

    it('should have eventType field', () => {
      expect(WebhookDelivery.schema.eventType).toBeDefined();
    });

    it('should have payload field', () => {
      expect(WebhookDelivery.schema.payload).toBeDefined();
    });

    it('should have response field', () => {
      expect(WebhookDelivery.schema.response).toBeDefined();
    });

    it('should have statusCode field', () => {
      expect(WebhookDelivery.schema.statusCode).toBeDefined();
    });

    it('should have status field', () => {
      expect(WebhookDelivery.schema.status).toBeDefined();
    });

    it('should have attempts field', () => {
      expect(WebhookDelivery.schema.attempts).toBeDefined();
    });

    it('should have nextRetryAt field', () => {
      expect(WebhookDelivery.schema.nextRetryAt).toBeDefined();
    });

    it('should have timestamps (createdAt and updatedAt)', () => {
      expect(WebhookDelivery.schema.createdAt).toBeDefined();
      expect(WebhookDelivery.schema.updatedAt).toBeDefined();
    });
  });

  describe('Field Validations', () => {
    it('should require deliveryId to be unique', () => {
      expect(WebhookDelivery.schema.deliveryId.unique).toBe(true);
    });

    it('should require webhookId', () => {
      expect(WebhookDelivery.schema.webhookId.required).toBe(true);
    });

    it('should require eventType', () => {
      expect(WebhookDelivery.schema.eventType.required).toBe(true);
    });

    it('should require payload', () => {
      expect(WebhookDelivery.schema.payload.required).toBe(true);
    });

    it('should have status enum with pending, success, failed values', () => {
      expect(WebhookDelivery.schema.status.enum).toContain('pending');
      expect(WebhookDelivery.schema.status.enum).toContain('success');
      expect(WebhookDelivery.schema.status.enum).toContain('failed');
    });

    it('should default status to pending', () => {
      expect(WebhookDelivery.schema.status.default).toBe('pending');
    });

    it('should default attempts to 0', () => {
      expect(WebhookDelivery.schema.attempts.default).toBe(0);
    });
  });

  describe('Response Default', () => {
    it('should have response with default body of null', () => {
      expect(WebhookDelivery.schema.response.default).toBeDefined();
      expect(WebhookDelivery.schema.response.default.body).toBeNull();
    });

    it('should have response with default headers of null', () => {
      expect(WebhookDelivery.schema.response.default.headers).toBeNull();
    });

    it('should have response with default error of null', () => {
      expect(WebhookDelivery.schema.response.default.error).toBeNull();
    });
  });

  describe('Additional Schema Fields', () => {
    it('should have duration field', () => {
      expect(WebhookDelivery.schema.duration).toBeDefined();
      expect(WebhookDelivery.schema.duration.type).toBe('number');
    });

    it('should have completedAt field', () => {
      expect(WebhookDelivery.schema.completedAt).toBeDefined();
    });

    it('should have requestHeaders field', () => {
      expect(WebhookDelivery.schema.requestHeaders).toBeDefined();
    });

    it('should have requestUrl field', () => {
      expect(WebhookDelivery.schema.requestUrl).toBeDefined();
    });
  });

  describe('Business Logic - canRetry', () => {
    it('should have canRetry method', () => {
      expect(typeof WebhookDelivery.canRetry).toBe('function');
    });

    it('should return true when status is failed and nextRetryAt is set', () => {
      const delivery = {
        status: 'failed',
        nextRetryAt: new Date(Date.now() + 60000).toISOString()
      };
      expect(WebhookDelivery.canRetry(delivery)).toBe(true);
    });

    it('should return false when status is not failed', () => {
      const delivery = {
        status: 'success',
        nextRetryAt: null
      };
      expect(WebhookDelivery.canRetry(delivery)).toBe(false);
    });

    it('should return false when nextRetryAt is null', () => {
      const delivery = {
        status: 'failed',
        nextRetryAt: null
      };
      expect(WebhookDelivery.canRetry(delivery)).toBe(false);
    });
  });

  describe('Business Logic - isRetryDue', () => {
    it('should have isRetryDue method', () => {
      expect(typeof WebhookDelivery.isRetryDue).toBe('function');
    });

    it('should return true when retry time has passed', () => {
      const delivery = {
        status: 'failed',
        nextRetryAt: new Date(Date.now() - 60000).toISOString()
      };
      expect(WebhookDelivery.isRetryDue(delivery)).toBe(true);
    });

    it('should return false when retry time has not passed', () => {
      const delivery = {
        status: 'failed',
        nextRetryAt: new Date(Date.now() + 60000).toISOString()
      };
      expect(WebhookDelivery.isRetryDue(delivery)).toBe(false);
    });
  });

  describe('Business Logic - calculateNextRetry', () => {
    it('should have calculateNextRetry method', () => {
      expect(typeof WebhookDelivery.calculateNextRetry).toBe('function');
    });

    it('should return null when attempts exceed maxRetries', () => {
      const delivery = { attempts: 3 };
      const result = WebhookDelivery.calculateNextRetry(delivery, 60000, 3);
      expect(result).toBeNull();
    });

    it('should return a future date when retries are available', () => {
      const delivery = { attempts: 0 };
      const result = WebhookDelivery.calculateNextRetry(delivery, 60000, 3);
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });

    it('should apply exponential backoff', () => {
      const delivery0 = { attempts: 0 };
      const delivery1 = { attempts: 1 };
      const baseDelay = 1000;

      const result0 = WebhookDelivery.calculateNextRetry(delivery0, baseDelay, 5);
      const result1 = WebhookDelivery.calculateNextRetry(delivery1, baseDelay, 5);

      // The difference should reflect exponential growth
      const diff0 = result0.getTime() - Date.now();
      const diff1 = result1.getTime() - Date.now();
      expect(diff1).toBeGreaterThan(diff0);
    });
  });

  describe('Static Methods', () => {
    it('should have findDueForRetry method', () => {
      expect(typeof WebhookDelivery.findDueForRetry).toBe('function');
    });

    it('should have getStatistics method', () => {
      expect(typeof WebhookDelivery.getStatistics).toBe('function');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof WebhookDelivery.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof WebhookDelivery.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof WebhookDelivery.findOne).toBe('function');
    });

    it('should have markSuccess method', () => {
      expect(typeof WebhookDelivery.markSuccess).toBe('function');
    });

    it('should have markFailed method', () => {
      expect(typeof WebhookDelivery.markFailed).toBe('function');
    });

    it('should have findByDeliveryId method', () => {
      expect(typeof WebhookDelivery.findByDeliveryId).toBe('function');
    });

    it('should have findByWebhook method', () => {
      expect(typeof WebhookDelivery.findByWebhook).toBe('function');
    });

    it('should have findByEventType method', () => {
      expect(typeof WebhookDelivery.findByEventType).toBe('function');
    });
  });

  describe('Exported Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(WebhookDelivery.VALID_STATUSES).toBeDefined();
      expect(WebhookDelivery.VALID_STATUSES).toContain('pending');
      expect(WebhookDelivery.VALID_STATUSES).toContain('success');
      expect(WebhookDelivery.VALID_STATUSES).toContain('failed');
    });
  });
});
