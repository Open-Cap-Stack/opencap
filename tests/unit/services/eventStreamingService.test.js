/**
 * Event Streaming Service Test Suite
 * Issue #28: Implement event streaming for real-time updates
 */

const eventStreamingService = require('../../../services/eventStreamingService');
const zerodbService = require('../../../services/zerodbService');
const websocketService = require('../../../services/websocketService');

jest.mock('../../../services/zerodbService');
jest.mock('../../../services/websocketService');

describe('Event Streaming Service', () => {
    beforeEach(() => {
    jest.clearAllMocks();
        zerodbService.publishEvent = jest.fn().mockResolvedValue({ event_id: 'evt_123', topic: 'test.topic', published_at: new Date().toISOString() });
    zerodbService.listEvents = jest.fn().mockResolvedValue([]);
    zerodbService.insertRows = jest.fn().mockResolvedValue({ inserted: 1 });
    zerodbService.queryTable = jest.fn().mockResolvedValue([]);
    zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted: 1 });

    websocketService.sendToUser = jest.fn();
    websocketService.broadcastToAll = jest.fn();
  });

  describe('Event Topics', () => {
    it('should define all required event topics', () => {
      expect(eventStreamingService.topics.USER_CREATED).toBe('user.created');
      expect(eventStreamingService.topics.USER_UPDATED).toBe('user.updated');
      expect(eventStreamingService.topics.USER_DELETED).toBe('user.deleted');
      expect(eventStreamingService.topics.COMPANY_CREATED).toBe('company.created');
      expect(eventStreamingService.topics.COMPANY_UPDATED).toBe('company.updated');
      expect(eventStreamingService.topics.TRANSACTION_CREATED).toBe('transaction.created');
      expect(eventStreamingService.topics.TRANSACTION_COMPLETED).toBe('transaction.completed');
      expect(eventStreamingService.topics.DOCUMENT_UPLOADED).toBe('document.uploaded');
      expect(eventStreamingService.topics.DOCUMENT_SIGNED).toBe('document.signed');
    });
  });

  describe('Event Schema Validation', () => {
    it('should validate valid event schema', () => {
      const result = eventStreamingService.validateEventSchema({ topic: 'user.created', payload: { userId: 'user_123' } });
      expect(result.valid).toBe(true);
    });

    it('should reject events without topic', () => {
      const result = eventStreamingService.validateEventSchema({ payload: { userId: 'user_123' } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('topic is required');
    });

    it('should reject events without payload', () => {
      const result = eventStreamingService.validateEventSchema({ topic: 'user.created' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('payload is required');
    });
  });

  describe('Event Publishing', () => {
    it('should publish event to ZeroDB', async () => {
      const result = await eventStreamingService.publishEvent({ topic: 'user.created', payload: { userId: 'user_123' } });
      expect(result).toBeDefined();
      expect(result.event_id).toBeDefined();
      expect(zerodbService.publishEvent).toHaveBeenCalled();
    });

    it('should throw error for invalid event', async () => {
      await expect(eventStreamingService.publishEvent({ payload: { userId: 'user_123' } }))
        .rejects.toThrow('Invalid event: topic is required');
    });
  });

  describe('User Events', () => {
    it('should publish user.created event', async () => {
      await eventStreamingService.publishUserEvent('created', { userId: 'user_123' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('user.created', expect.objectContaining({ action: 'created' }));
    });

    it('should throw error for invalid user action', async () => {
      await expect(eventStreamingService.publishUserEvent('invalid', { userId: 'user_123' }))
        .rejects.toThrow('Invalid user action: invalid');
    });
  });

  describe('Subscriptions', () => {
    it('should create subscription', async () => {
      const result = await eventStreamingService.createSubscription({ topics: ['user.created'], userId: 'user_123' });
      expect(result.subscriptionId).toBeDefined();
      expect(zerodbService.insertRows).toHaveBeenCalled();
    });

    it('should throw error for invalid topic', async () => {
      await expect(eventStreamingService.createSubscription({ topics: ['invalid.topic'], userId: 'user_123' }))
        .rejects.toThrow('Invalid topic: invalid.topic');
    });

    it('should delete subscription', async () => {
      zerodbService.queryTable.mockResolvedValue([{ subscription_id: 'sub_123', user_id: 'user_123' }]);
      await eventStreamingService.deleteSubscription('sub_123', 'user_123');
      expect(zerodbService.deleteRows).toHaveBeenCalled();
    });
  });

  describe('Webhooks', () => {
    it('should register webhook', async () => {
      const result = await eventStreamingService.registerWebhook({
        url: 'https://example.com/webhook',
        topics: ['user.created'],
        userId: 'user_123'
      });
      expect(result.webhookId).toBeDefined();
    });

    it('should reject non-HTTPS webhook URL', async () => {
      await expect(eventStreamingService.registerWebhook({
        url: 'http://example.com/webhook',
        topics: ['user.created'],
        userId: 'user_123'
      })).rejects.toThrow('Webhook URL must use HTTPS');
    });
  });

  describe('Audit Log', () => {
    it('should get audit log', async () => {
      zerodbService.queryTable.mockResolvedValue([{ event_id: 'evt_123', topic: 'user.created' }]);
      const result = await eventStreamingService.getAuditLog({});
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Event Stats', () => {
    it('should get event statistics', async () => {
      zerodbService.queryTable.mockResolvedValue([{ topic: 'user.created', count: 10 }]);
      const result = await eventStreamingService.getEventStats({});
      expect(result.totalEvents).toBeDefined();
    });
  });
});
