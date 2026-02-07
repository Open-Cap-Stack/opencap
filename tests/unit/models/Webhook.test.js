/**
 * Webhook Model Unit Tests
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

describe('Webhook Model', () => {
  let Webhook;

  beforeAll(() => {
    jest.resetModules();
    Webhook = require('../../../models/Webhook');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have webhookId field', () => {
      expect(Webhook.schema.webhookId).toBeDefined();
    });

    it('should have companyId field', () => {
      expect(Webhook.schema.companyId).toBeDefined();
    });

    it('should have name field', () => {
      expect(Webhook.schema.name).toBeDefined();
    });

    it('should have description field', () => {
      expect(Webhook.schema.description).toBeDefined();
    });

    it('should have url field', () => {
      expect(Webhook.schema.url).toBeDefined();
    });

    it('should have secret field', () => {
      expect(Webhook.schema.secret).toBeDefined();
    });

    it('should have events field as array', () => {
      expect(Webhook.schema.events).toBeDefined();
      expect(Webhook.schema.events.type).toBe('array');
    });

    it('should have status field with enum values', () => {
      expect(Webhook.schema.status).toBeDefined();
      expect(Webhook.schema.status.enum).toBeDefined();
    });

    it('should have retryConfig field', () => {
      expect(Webhook.schema.retryConfig).toBeDefined();
    });

    it('should have headers field', () => {
      expect(Webhook.schema.headers).toBeDefined();
    });

    it('should have lastTriggeredAt field', () => {
      expect(Webhook.schema.lastTriggeredAt).toBeDefined();
    });

    it('should have failureCount field', () => {
      expect(Webhook.schema.failureCount).toBeDefined();
    });

    it('should have timestamps (createdAt and updatedAt)', () => {
      expect(Webhook.schema.createdAt).toBeDefined();
      expect(Webhook.schema.updatedAt).toBeDefined();
    });
  });

  describe('Field Validations', () => {
    it('should require webhookId to be unique', () => {
      expect(Webhook.schema.webhookId.unique).toBe(true);
    });

    it('should require companyId', () => {
      expect(Webhook.schema.companyId.required).toBe(true);
    });

    it('should require name', () => {
      expect(Webhook.schema.name.required).toBe(true);
    });

    it('should require url', () => {
      expect(Webhook.schema.url.required).toBe(true);
    });

    it('should require secret', () => {
      expect(Webhook.schema.secret.required).toBe(true);
    });

    it('should have status enum with active, paused, failed values', () => {
      expect(Webhook.schema.status.enum).toContain('active');
      expect(Webhook.schema.status.enum).toContain('paused');
      expect(Webhook.schema.status.enum).toContain('failed');
    });

    it('should default status to active', () => {
      expect(Webhook.schema.status.default).toBe('active');
    });

    it('should default failureCount to 0', () => {
      expect(Webhook.schema.failureCount.default).toBe(0);
    });
  });

  describe('RetryConfig Defaults', () => {
    it('should have retryConfig with default maxRetries of 3', () => {
      expect(Webhook.schema.retryConfig.default).toBeDefined();
      expect(Webhook.schema.retryConfig.default.maxRetries).toBe(3);
    });

    it('should have retryConfig with default retryDelay of 60000', () => {
      expect(Webhook.schema.retryConfig.default).toBeDefined();
      expect(Webhook.schema.retryConfig.default.retryDelay).toBe(60000);
    });
  });

  describe('Event Types', () => {
    it('should export valid EVENT_TYPES', () => {
      expect(Webhook.EVENT_TYPES).toBeDefined();
      expect(Webhook.EVENT_TYPES).toContain('stakeholder.created');
      expect(Webhook.EVENT_TYPES).toContain('stakeholder.updated');
      expect(Webhook.EVENT_TYPES).toContain('stakeholder.deleted');
      expect(Webhook.EVENT_TYPES).toContain('share_class.created');
      expect(Webhook.EVENT_TYPES).toContain('share_class.updated');
      expect(Webhook.EVENT_TYPES).toContain('document.created');
      expect(Webhook.EVENT_TYPES).toContain('document.signed');
      expect(Webhook.EVENT_TYPES).toContain('equity.granted');
      expect(Webhook.EVENT_TYPES).toContain('equity.vested');
      expect(Webhook.EVENT_TYPES).toContain('transaction.completed');
    });
  });

  describe('Business Logic Methods', () => {
    it('should have isSubscribedTo method', () => {
      expect(typeof Webhook.isSubscribedTo).toBe('function');
    });

    it('should check if webhook is subscribed to an event', () => {
      const webhook = {
        events: ['stakeholder.created', 'stakeholder.updated']
      };
      expect(Webhook.isSubscribedTo(webhook, 'stakeholder.created')).toBe(true);
      expect(Webhook.isSubscribedTo(webhook, 'document.created')).toBe(false);
    });

    it('should have incrementFailureCount method', () => {
      expect(typeof Webhook.incrementFailureCount).toBe('function');
    });

    it('should have resetFailureCount method', () => {
      expect(typeof Webhook.resetFailureCount).toBe('function');
    });

    it('should have isOperational method', () => {
      expect(typeof Webhook.isOperational).toBe('function');
    });

    it('should return true for isOperational when status is active and failure count is low', () => {
      const webhook = { status: 'active', failureCount: 0 };
      expect(Webhook.isOperational(webhook)).toBe(true);
    });

    it('should return false for isOperational when status is not active', () => {
      const webhook = { status: 'paused', failureCount: 0 };
      expect(Webhook.isOperational(webhook)).toBe(false);
    });

    it('should return false for isOperational when failure count exceeds threshold', () => {
      const webhook = { status: 'active', failureCount: 10 };
      expect(Webhook.isOperational(webhook)).toBe(false);
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof Webhook.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof Webhook.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof Webhook.findOne).toBe('function');
    });

    it('should have findByWebhookId method', () => {
      expect(typeof Webhook.findByWebhookId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof Webhook.findByCompany).toBe('function');
    });

    it('should have findByEvent method', () => {
      expect(typeof Webhook.findByEvent).toBe('function');
    });

    it('should have updateLastTriggered method', () => {
      expect(typeof Webhook.updateLastTriggered).toBe('function');
    });

    it('should have toJSON method that sanitizes sensitive data', () => {
      expect(typeof Webhook.toJSON).toBe('function');

      const webhook = {
        webhookId: 'WH-123',
        name: 'Test',
        secret: 'supersecret'
      };
      const sanitized = Webhook.toJSON(webhook);
      expect(sanitized.webhookId).toBe('WH-123');
      expect(sanitized.secret).toBeUndefined();
    });
  });

  describe('Exported Constants', () => {
    it('should export EVENT_TYPES', () => {
      expect(Webhook.EVENT_TYPES).toBeDefined();
      expect(Array.isArray(Webhook.EVENT_TYPES)).toBe(true);
    });

    it('should export VALID_STATUSES', () => {
      expect(Webhook.VALID_STATUSES).toBeDefined();
      expect(Webhook.VALID_STATUSES).toContain('active');
      expect(Webhook.VALID_STATUSES).toContain('paused');
      expect(Webhook.VALID_STATUSES).toContain('failed');
    });

    it('should require webhookId', () => {
      expect(Webhook.schema.webhookId.required).toBe(true);
    });
  });
});
