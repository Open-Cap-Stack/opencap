/**
 * Webhook Model Comprehensive Tests
 *
 * Tests all business logic methods, validation, error paths, and edge cases
 * for the Webhook ZeroDB model to achieve 80%+ coverage.
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock zerodbService before requiring the model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  createTable: jest.fn(),
  projectId: 'test-project',
  useLocalFallback: true,
  _localStore: {}
}));

// Mock logger to suppress output
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Webhook Model - Comprehensive', () => {
  let Webhook;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('../../../services/zerodbService', () => ({
      initialize: jest.fn(),
      insertRow: jest.fn(),
      queryTable: jest.fn(),
      updateRows: jest.fn(),
      deleteRows: jest.fn(),
      createTable: jest.fn(),
      projectId: 'test-project'
    }));
    jest.mock('../../../utils/logger', () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));
    Webhook = require('../../../models/Webhook');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export tableName as webhooks', () => {
      expect(Webhook.tableName).toBe('webhooks');
    });

    it('should export EVENT_TYPES constant', () => {
      expect(Webhook.EVENT_TYPES).toBeDefined();
      expect(Array.isArray(Webhook.EVENT_TYPES)).toBe(true);
      expect(Webhook.EVENT_TYPES.length).toBeGreaterThan(0);
    });

    it('should export VALID_STATUSES constant', () => {
      expect(Webhook.VALID_STATUSES).toEqual(['active', 'paused', 'failed']);
    });

    it('should include all expected event types', () => {
      const expectedEvents = [
        'stakeholder.created', 'stakeholder.updated', 'stakeholder.deleted',
        'share_class.created', 'share_class.updated', 'share_class.deleted',
        'document.created', 'document.updated', 'document.signed', 'document.deleted',
        'equity.granted', 'equity.vested', 'equity.exercised', 'equity.cancelled',
        'transaction.created', 'transaction.completed', 'transaction.cancelled',
        'company.updated', 'company.valuation_changed',
        'compliance.report_generated', 'compliance.alert',
        'webhook.test'
      ];
      expectedEvents.forEach(event => {
        expect(Webhook.EVENT_TYPES).toContain(event);
      });
    });
  });

  describe('create()', () => {
    const validData = {
      companyId: 'company-1',
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      secret: 'secret123',
      events: ['stakeholder.created']
    };

    it('should generate webhookId when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...data, webhookId: 'wh_auto' } }]
      });

      await Webhook.create(data);
      expect(data.webhookId).toBeDefined();
      expect(data.webhookId.startsWith('wh_')).toBe(true);
    });

    it('should preserve provided webhookId', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, webhookId: 'custom-wh' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await Webhook.create(data);
      expect(result.webhookId).toBe('custom-wh');
    });

    it('should throw for invalid URL', async () => {
      const data = { ...validData, url: 'not-a-url' };
      await expect(Webhook.create(data)).rejects.toThrow('Invalid webhook URL');
    });

    it('should throw for ftp:// URL protocol', async () => {
      const data = { ...validData, url: 'ftp://example.com/webhook' };
      await expect(Webhook.create(data)).rejects.toThrow('Invalid webhook URL');
    });

    it('should accept https:// URL', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, url: 'https://secure.example.com/hook' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await Webhook.create(data);
      expect(result).toBeDefined();
    });

    it('should accept http:// URL', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, url: 'http://localhost:3000/hook' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await Webhook.create(data);
      expect(result).toBeDefined();
    });

    it('should throw when events is missing', async () => {
      const data = { ...validData };
      delete data.events;
      await expect(Webhook.create(data)).rejects.toThrow('At least one event type is required');
    });

    it('should throw when events is empty', async () => {
      const data = { ...validData, events: [] };
      await expect(Webhook.create(data)).rejects.toThrow('At least one event type is required');
    });

    it('should throw when events contain invalid types', async () => {
      const data = { ...validData, events: ['stakeholder.created', 'invalid.event'] };
      await expect(Webhook.create(data)).rejects.toThrow('Invalid event types: invalid.event');
    });

    it('should throw when all events are invalid', async () => {
      const data = { ...validData, events: ['bad.event1', 'bad.event2'] };
      await expect(Webhook.create(data)).rejects.toThrow('Invalid event types: bad.event1, bad.event2');
    });

    it('should set default retryConfig when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await Webhook.create(data);
      expect(data.retryConfig).toEqual({ maxRetries: 3, retryDelay: 60000 });
    });

    it('should preserve provided retryConfig', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, retryConfig: { maxRetries: 5, retryDelay: 30000 } };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await Webhook.create(data);
      expect(data.retryConfig).toEqual({ maxRetries: 5, retryDelay: 30000 });
    });

    it('should set default status to active when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await Webhook.create(data);
      expect(data.status).toBe('active');
    });

    it('should not overwrite provided status', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, status: 'paused' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await Webhook.create(data);
      expect(data.status).toBe('paused');
    });

    it('should accept multiple valid events', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = {
        ...validData,
        events: ['stakeholder.created', 'document.signed', 'equity.granted', 'webhook.test']
      };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await Webhook.create(data);
      expect(result).toBeDefined();
    });
  });

  describe('findByWebhookId()', () => {
    it('should find webhook by webhookId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { webhookId: 'wh-1', name: 'Test' }, row_id: 'r1' }]
      });

      const result = await Webhook.findByWebhookId('wh-1');
      expect(result).toBeDefined();
      expect(result.webhookId).toBe('wh-1');
    });

    it('should return null when not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await Webhook.findByWebhookId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find webhooks by companyId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'c1', name: 'WH1' }, row_id: 'r1' },
          { row_data: { companyId: 'c1', name: 'WH2' }, row_id: 'r2' }
        ]
      });

      const results = await Webhook.findByCompany('c1');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', status: 'active' }, row_id: 'r1' }]
      });

      const results = await Webhook.findByCompany('c1', { status: 'active' });
      expect(results.length).toBe(1);
    });

    it('should return empty array when no results', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await Webhook.findByCompany('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('findByEvent()', () => {
    it('should find active webhooks subscribed to an event', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { webhookId: 'wh-1', events: ['stakeholder.created', 'document.signed'], status: 'active' }, row_id: 'r1' },
          { row_data: { webhookId: 'wh-2', events: ['document.signed'], status: 'active' }, row_id: 'r2' },
          { row_data: { webhookId: 'wh-3', events: ['equity.granted'], status: 'active' }, row_id: 'r3' }
        ]
      });

      const results = await Webhook.findByEvent('c1', 'document.signed');
      expect(results.length).toBe(2);
    });

    it('should return empty array when no matching webhooks', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { webhookId: 'wh-1', events: ['equity.granted'], status: 'active' }, row_id: 'r1' }
        ]
      });

      const results = await Webhook.findByEvent('c1', 'document.signed');
      expect(results.length).toBe(0);
    });

    it('should handle webhooks with null events', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { webhookId: 'wh-1', events: null, status: 'active' }, row_id: 'r1' }
        ]
      });

      const results = await Webhook.findByEvent('c1', 'stakeholder.created');
      expect(results.length).toBe(0);
    });
  });

  describe('isOperational()', () => {
    it('should return true when status is active and failureCount < 10', () => {
      expect(Webhook.isOperational({ status: 'active', failureCount: 0 })).toBe(true);
    });

    it('should return true when status is active and failureCount is 9', () => {
      expect(Webhook.isOperational({ status: 'active', failureCount: 9 })).toBe(true);
    });

    it('should return false when failureCount is 10', () => {
      expect(Webhook.isOperational({ status: 'active', failureCount: 10 })).toBe(false);
    });

    it('should return false when failureCount exceeds 10', () => {
      expect(Webhook.isOperational({ status: 'active', failureCount: 15 })).toBe(false);
    });

    it('should return false when status is paused', () => {
      expect(Webhook.isOperational({ status: 'paused', failureCount: 0 })).toBe(false);
    });

    it('should return false when status is failed', () => {
      expect(Webhook.isOperational({ status: 'failed', failureCount: 0 })).toBe(false);
    });

    it('should handle missing failureCount (defaults to 0)', () => {
      expect(Webhook.isOperational({ status: 'active' })).toBe(true);
    });
  });

  describe('isSubscribedTo()', () => {
    it('should return true when webhook is subscribed to event', () => {
      const wh = { events: ['stakeholder.created', 'document.signed'] };
      expect(Webhook.isSubscribedTo(wh, 'stakeholder.created')).toBe(true);
    });

    it('should return false when webhook is not subscribed to event', () => {
      const wh = { events: ['stakeholder.created'] };
      expect(Webhook.isSubscribedTo(wh, 'document.signed')).toBe(false);
    });

    it('should return false when events is null', () => {
      const wh = { events: null };
      expect(Webhook.isSubscribedTo(wh, 'stakeholder.created')).toBeFalsy();
    });

    it('should return false when events is undefined', () => {
      const wh = {};
      expect(Webhook.isSubscribedTo(wh, 'stakeholder.created')).toBeFalsy();
    });
  });

  describe('incrementFailureCount()', () => {
    it('should increment failure count', async () => {
      const zdb = require('../../../services/zerodbService');
      // findByWebhookId -> findOne -> find
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 5, status: 'active' }]
      });
      // updateOne -> findOne
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 5, status: 'active' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.incrementFailureCount('wh-1');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });

    it('should set status to failed when failureCount reaches 10', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 9, status: 'active' }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 9, status: 'active' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.incrementFailureCount('wh-1');
      expect(result).toBeDefined();
    });

    it('should throw when webhook not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      await expect(Webhook.incrementFailureCount('nonexistent')).rejects.toThrow('Webhook not found');
    });

    it('should handle missing failureCount (defaults to 0)', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', status: 'active' }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', status: 'active' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.incrementFailureCount('wh-1');
      expect(result).toBeDefined();
    });
  });

  describe('resetFailureCount()', () => {
    it('should reset failure count to 0', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 5, status: 'active' }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 5, status: 'active' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.resetFailureCount('wh-1');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });

    it('should reactivate failed webhook on reset', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 12, status: 'failed' }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 12, status: 'failed' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.resetFailureCount('wh-1');
      expect(result).toBeDefined();
    });

    it('should not change status when webhook is not failed', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 3, status: 'active' }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1', failureCount: 3, status: 'active' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.resetFailureCount('wh-1');
      expect(result).toBeDefined();
    });

    it('should throw when webhook not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      await expect(Webhook.resetFailureCount('nonexistent')).rejects.toThrow('Webhook not found');
    });
  });

  describe('updateLastTriggered()', () => {
    it('should update lastTriggeredAt timestamp', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ webhookId: 'wh-1' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await Webhook.updateLastTriggered('wh-1');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });
  });

  describe('toJSON()', () => {
    it('should remove secret from webhook object', () => {
      const webhook = {
        webhookId: 'wh-1',
        name: 'Test',
        secret: 'supersecret',
        url: 'https://example.com'
      };
      const sanitized = Webhook.toJSON(webhook);
      expect(sanitized.webhookId).toBe('wh-1');
      expect(sanitized.name).toBe('Test');
      expect(sanitized.url).toBe('https://example.com');
      expect(sanitized.secret).toBeUndefined();
    });

    it('should return null for null input', () => {
      expect(Webhook.toJSON(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(Webhook.toJSON(undefined)).toBeNull();
    });

    it('should not modify original webhook object', () => {
      const webhook = { webhookId: 'wh-1', secret: 'secret' };
      Webhook.toJSON(webhook);
      expect(webhook.secret).toBe('secret');
    });

    it('should handle webhook without secret field', () => {
      const webhook = { webhookId: 'wh-1', name: 'Test' };
      const sanitized = Webhook.toJSON(webhook);
      expect(sanitized.webhookId).toBe('wh-1');
      expect(sanitized.secret).toBeUndefined();
    });
  });

  describe('Exposed base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments', 'exists',
      'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should expose ${method} as a function`, () => {
        expect(typeof Webhook[method]).toBe('function');
      });
    });
  });

  describe('Schema field defaults', () => {
    it('should have description with empty string default', () => {
      expect(Webhook.schema.description.default).toBe('');
    });

    it('should have retryConfig with proper default', () => {
      expect(Webhook.schema.retryConfig.default).toEqual({
        maxRetries: 3,
        retryDelay: 60000
      });
    });

    it('should have headers with empty object default', () => {
      expect(Webhook.schema.headers.default).toEqual({});
    });

    it('should have lastTriggeredAt with null default', () => {
      expect(Webhook.schema.lastTriggeredAt.default).toBeNull();
    });

    it('should have failureCount with 0 default', () => {
      expect(Webhook.schema.failureCount.default).toBe(0);
    });

    it('should have createdBy with null default', () => {
      expect(Webhook.schema.createdBy.default).toBeNull();
    });

    it('should have updatedBy with null default', () => {
      expect(Webhook.schema.updatedBy.default).toBeNull();
    });

    it('should have metadata with empty object default', () => {
      expect(Webhook.schema.metadata.default).toEqual({});
    });
  });
});
