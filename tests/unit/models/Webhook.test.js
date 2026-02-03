/**
 * Webhook Model Unit Tests
 * Issue #118: Build Webhook System
 */
process.env.SKIP_DB_SETUP = 'true';

describe('Webhook Model', () => {
  let Webhook;

  beforeAll(() => {
    jest.resetModules();
    // Don't mock mongoose, use the actual model
    Webhook = require('../../../models/Webhook');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have webhookId field', () => {
      expect(Webhook.schema.path('webhookId')).toBeDefined();
    });

    it('should have companyId field', () => {
      expect(Webhook.schema.path('companyId')).toBeDefined();
    });

    it('should have name field', () => {
      expect(Webhook.schema.path('name')).toBeDefined();
    });

    it('should have description field', () => {
      expect(Webhook.schema.path('description')).toBeDefined();
    });

    it('should have url field', () => {
      expect(Webhook.schema.path('url')).toBeDefined();
    });

    it('should have secret field', () => {
      expect(Webhook.schema.path('secret')).toBeDefined();
    });

    it('should have events field as array', () => {
      expect(Webhook.schema.path('events')).toBeDefined();
    });

    it('should have status field with enum values', () => {
      expect(Webhook.schema.path('status')).toBeDefined();
    });

    it('should have retryConfig field', () => {
      expect(Webhook.schema.path('retryConfig')).toBeDefined();
    });

    it('should have headers field', () => {
      expect(Webhook.schema.path('headers')).toBeDefined();
    });

    it('should have lastTriggeredAt field', () => {
      expect(Webhook.schema.path('lastTriggeredAt')).toBeDefined();
    });

    it('should have failureCount field', () => {
      expect(Webhook.schema.path('failureCount')).toBeDefined();
    });

    it('should have timestamps enabled', () => {
      expect(Webhook.schema.options.timestamps).toBe(true);
    });
  });

  describe('Field Validations', () => {
    it('should require webhookId to be unique', () => {
      const webhookIdPath = Webhook.schema.path('webhookId');
      expect(webhookIdPath.options.unique).toBe(true);
    });

    it('should require companyId', () => {
      const companyIdPath = Webhook.schema.path('companyId');
      expect(companyIdPath.options.required).toBe(true);
    });

    it('should require name', () => {
      const namePath = Webhook.schema.path('name');
      expect(namePath.options.required).toBe(true);
    });

    it('should require url', () => {
      const urlPath = Webhook.schema.path('url');
      expect(urlPath.options.required).toBe(true);
    });

    it('should require secret', () => {
      const secretPath = Webhook.schema.path('secret');
      expect(secretPath.options.required).toBe(true);
    });

    it('should have status enum with active, paused, failed values', () => {
      const statusPath = Webhook.schema.path('status');
      expect(statusPath.options.enum).toContain('active');
      expect(statusPath.options.enum).toContain('paused');
      expect(statusPath.options.enum).toContain('failed');
    });

    it('should default status to active', () => {
      const statusPath = Webhook.schema.path('status');
      expect(statusPath.options.default).toBe('active');
    });

    it('should default failureCount to 0', () => {
      const failureCountPath = Webhook.schema.path('failureCount');
      expect(failureCountPath.options.default).toBe(0);
    });
  });

  describe('RetryConfig Sub-Schema', () => {
    it('should have maxRetries field with default of 3', () => {
      const retryConfigPath = Webhook.schema.path('retryConfig.maxRetries');
      expect(retryConfigPath).toBeDefined();
      expect(retryConfigPath.options.default).toBe(3);
    });

    it('should have retryDelay field with default of 60000', () => {
      const retryConfigPath = Webhook.schema.path('retryConfig.retryDelay');
      expect(retryConfigPath).toBeDefined();
      expect(retryConfigPath.options.default).toBe(60000);
    });
  });

  describe('Events Array', () => {
    it('should accept valid event types', () => {
      const eventsPath = Webhook.schema.path('events');
      expect(eventsPath.caster.options.enum).toContain('stakeholder.created');
      expect(eventsPath.caster.options.enum).toContain('stakeholder.updated');
      expect(eventsPath.caster.options.enum).toContain('stakeholder.deleted');
      expect(eventsPath.caster.options.enum).toContain('share_class.created');
      expect(eventsPath.caster.options.enum).toContain('share_class.updated');
      expect(eventsPath.caster.options.enum).toContain('document.created');
      expect(eventsPath.caster.options.enum).toContain('document.signed');
      expect(eventsPath.caster.options.enum).toContain('equity.granted');
      expect(eventsPath.caster.options.enum).toContain('equity.vested');
      expect(eventsPath.caster.options.enum).toContain('transaction.completed');
    });
  });

  describe('Indexes', () => {
    it('should have index on webhookId', () => {
      const indexes = Webhook.schema.indexes();
      const webhookIdIndex = indexes.find(idx => idx[0].webhookId);
      expect(webhookIdIndex).toBeDefined();
    });

    it('should have index on companyId', () => {
      const indexes = Webhook.schema.indexes();
      const companyIdIndex = indexes.find(idx => idx[0].companyId);
      expect(companyIdIndex).toBeDefined();
    });

    it('should have index on status', () => {
      const indexes = Webhook.schema.indexes();
      const statusIndex = indexes.find(idx => idx[0].status);
      expect(statusIndex).toBeDefined();
    });
  });

  describe('Model Instance Methods', () => {
    it('should have isSubscribedTo method', () => {
      expect(Webhook.schema.methods.isSubscribedTo).toBeDefined();
    });

    it('should have incrementFailureCount method', () => {
      expect(Webhook.schema.methods.incrementFailureCount).toBeDefined();
    });

    it('should have resetFailureCount method', () => {
      expect(Webhook.schema.methods.resetFailureCount).toBeDefined();
    });
  });

  describe('Model Virtual Properties', () => {
    it('should have isOperational virtual', () => {
      expect(Webhook.schema.virtuals.isOperational).toBeDefined();
    });
  });

  describe('Model Creation', () => {
    it('should create a valid webhook with all required fields', () => {
      const webhookData = {
        webhookId: 'WH-12345678',
        companyId: 'company123',
        name: 'Test Webhook',
        description: 'A test webhook for integration',
        url: 'https://api.example.com/webhook',
        secret: 'supersecretkey123',
        events: ['stakeholder.created', 'stakeholder.updated'],
        status: 'active',
        retryConfig: {
          maxRetries: 5,
          retryDelay: 30000
        },
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      };

      const webhook = new Webhook(webhookData);
      expect(webhook.webhookId).toBe('WH-12345678');
      expect(webhook.companyId).toBe('company123');
      expect(webhook.name).toBe('Test Webhook');
      expect(webhook.url).toBe('https://api.example.com/webhook');
      expect(webhook.secret).toBe('supersecretkey123');
      expect(webhook.events).toContain('stakeholder.created');
      expect(webhook.status).toBe('active');
      expect(webhook.retryConfig.maxRetries).toBe(5);
    });

    it('should validate webhook has required webhookId', () => {
      const webhookIdPath = Webhook.schema.path('webhookId');
      expect(webhookIdPath.options.required).toBe(true);
    });
  });
});
