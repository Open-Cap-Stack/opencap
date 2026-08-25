/**
 * Event Streaming Controller Test Suite
 * Issue #28: Implement event streaming for real-time updates
 */

const mockPublishEvent = jest.fn();
const mockFilterEvents = jest.fn();
const mockPublishUserEvent = jest.fn();
const mockPublishCompanyEvent = jest.fn();
const mockPublishTransactionEvent = jest.fn();
const mockPublishDocumentEvent = jest.fn();
const mockCreateSubscription = jest.fn();
const mockGetSubscriptions = jest.fn();
const mockDeleteSubscription = jest.fn();
const mockRegisterWebhook = jest.fn();
const mockGetWebhooks = jest.fn();
const mockDeleteWebhook = jest.fn();
const mockGetAuditLog = jest.fn();
const mockGetEventStats = jest.fn();

// Mock as a plain object (not a constructor), matching how the controller imports and uses it
jest.mock('../../../services/eventStreamingService', () => ({
  publishEvent: mockPublishEvent,
  publishUserEvent: mockPublishUserEvent,
  publishCompanyEvent: mockPublishCompanyEvent,
  publishTransactionEvent: mockPublishTransactionEvent,
  publishDocumentEvent: mockPublishDocumentEvent,
  filterEvents: mockFilterEvents,
  createSubscription: mockCreateSubscription,
  getSubscriptions: mockGetSubscriptions,
  deleteSubscription: mockDeleteSubscription,
  registerWebhook: mockRegisterWebhook,
  getWebhooks: mockGetWebhooks,
  deleteWebhook: mockDeleteWebhook,
  getAuditLog: mockGetAuditLog,
  getEventStats: mockGetEventStats,
  topics: { USER_CREATED: 'user.created', USER_UPDATED: 'user.updated' }
}));

const eventStreamingController = require('../../../controllers/eventStreamingController');

describe('Event Streaming Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { body: {}, query: {}, params: {}, user: { userId: 'user_123' } };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    mockPublishEvent.mockResolvedValue({ event_id: 'evt_123', topic: 'user.created', published_at: new Date().toISOString() });
    mockPublishUserEvent.mockResolvedValue({ event_id: 'evt_123' });
    mockPublishCompanyEvent.mockResolvedValue({ event_id: 'evt_123' });
    mockPublishTransactionEvent.mockResolvedValue({ event_id: 'evt_123' });
    mockPublishDocumentEvent.mockResolvedValue({ event_id: 'evt_123' });
    mockFilterEvents.mockResolvedValue([]);
    mockCreateSubscription.mockResolvedValue({ subscriptionId: 'sub_123' });
    mockGetSubscriptions.mockResolvedValue([]);
    mockDeleteSubscription.mockResolvedValue();
    mockRegisterWebhook.mockResolvedValue({ webhookId: 'wh_123' });
    mockGetWebhooks.mockResolvedValue([]);
    mockDeleteWebhook.mockResolvedValue();
    mockGetAuditLog.mockResolvedValue([]);
    mockGetEventStats.mockResolvedValue({ totalEvents: 0 });
  });

  describe('publishEvent', () => {
    it('should publish event successfully', async () => {
      mockReq.body = { topic: 'user.created', payload: { userId: 'user_456' } };
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when topic is missing', async () => {
      mockReq.body = { payload: { userId: 'user_456' } };
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'topic is required' }));
    });

    it('should return 400 when payload is missing', async () => {
      mockReq.body = { topic: 'user.created' };
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'payload is required' }));
    });

    it('should return 400 when service throws Invalid event error', async () => {
      mockReq.body = { topic: 'user.created', payload: { userId: 'user_456' } };
      mockPublishEvent.mockRejectedValue(new Error('Invalid event format'));
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid event format' }));
    });

    it('should return 500 on generic service error', async () => {
      mockReq.body = { topic: 'user.created', payload: { userId: 'user_456' } };
      mockPublishEvent.mockRejectedValue(new Error('DB connection failed'));
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should include metadata with actorId from user', async () => {
      mockReq.body = { topic: 'user.created', payload: { data: 'test' }, metadata: { extra: 'info' } };
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockPublishEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ actorId: 'user_123', source: 'api', extra: 'info' })
      }));
    });

    it('should use anonymous when user is not set', async () => {
      mockReq.user = null;
      mockReq.body = { topic: 'user.created', payload: { data: 'test' } };
      await eventStreamingController.publishEvent(mockReq, mockRes);
      expect(mockPublishEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ actorId: 'anonymous' })
      }));
    });
  });

  describe('getEvents', () => {
    it('should return events with pagination', async () => {
      mockReq.query = { topic: 'user.created', limit: '50', offset: '0' };
      mockFilterEvents.mockResolvedValue([{ event_id: 'evt_1' }]);
      await eventStreamingController.getEvents(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({ limit: 50, offset: 0, count: 1 })
      }));
    });

    it('should use default limit and offset', async () => {
      mockReq.query = {};
      await eventStreamingController.getEvents(mockReq, mockRes);
      expect(mockFilterEvents).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100, offset: 0
      }));
    });

    it('should return 400 for invalid filter JSON', async () => {
      mockReq.query = { filter: 'not-valid-json' };
      await eventStreamingController.getEvents(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Invalid filter format')
      }));
    });

    it('should parse valid filter JSON', async () => {
      mockReq.query = { filter: '{"key":"value"}' };
      await eventStreamingController.getEvents(mockReq, mockRes);
      expect(mockFilterEvents).toHaveBeenCalledWith(expect.objectContaining({
        payloadFilter: { key: 'value' }
      }));
    });

    it('should return 500 on service error', async () => {
      mockReq.query = {};
      mockFilterEvents.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.getEvents(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishUserEvent', () => {
    it('should publish user event successfully', async () => {
      mockReq.body = { action: 'created', userData: { name: 'John' } };
      await eventStreamingController.publishUserEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      mockReq.body = { userData: { name: 'John' } };
      await eventStreamingController.publishUserEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'action is required' }));
    });

    it('should return 400 when userData is missing', async () => {
      mockReq.body = { action: 'created' };
      await eventStreamingController.publishUserEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'userData is required' }));
    });

    it('should return 400 on Invalid user action error', async () => {
      mockReq.body = { action: 'bad', userData: { name: 'John' } };
      mockPublishUserEvent.mockRejectedValue(new Error('Invalid user action'));
      await eventStreamingController.publishUserEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on generic error', async () => {
      mockReq.body = { action: 'created', userData: { name: 'John' } };
      mockPublishUserEvent.mockRejectedValue(new Error('Server error'));
      await eventStreamingController.publishUserEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishCompanyEvent', () => {
    it('should publish company event successfully', async () => {
      mockReq.body = { action: 'created', companyData: { name: 'Acme' } };
      await eventStreamingController.publishCompanyEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      mockReq.body = { companyData: { name: 'Acme' } };
      await eventStreamingController.publishCompanyEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when companyData is missing', async () => {
      mockReq.body = { action: 'created' };
      await eventStreamingController.publishCompanyEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid company action error', async () => {
      mockReq.body = { action: 'bad', companyData: { name: 'Acme' } };
      mockPublishCompanyEvent.mockRejectedValue(new Error('Invalid company action'));
      await eventStreamingController.publishCompanyEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on generic error', async () => {
      mockReq.body = { action: 'created', companyData: { name: 'Acme' } };
      mockPublishCompanyEvent.mockRejectedValue(new Error('Server error'));
      await eventStreamingController.publishCompanyEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishTransactionEvent', () => {
    it('should publish transaction event successfully', async () => {
      mockReq.body = { action: 'completed', transactionData: { amount: 1000 } };
      await eventStreamingController.publishTransactionEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      mockReq.body = { transactionData: { amount: 1000 } };
      await eventStreamingController.publishTransactionEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when transactionData is missing', async () => {
      mockReq.body = { action: 'completed' };
      await eventStreamingController.publishTransactionEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid transaction action error', async () => {
      mockReq.body = { action: 'bad', transactionData: { amount: 1000 } };
      mockPublishTransactionEvent.mockRejectedValue(new Error('Invalid transaction action'));
      await eventStreamingController.publishTransactionEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on generic error', async () => {
      mockReq.body = { action: 'completed', transactionData: { amount: 1000 } };
      mockPublishTransactionEvent.mockRejectedValue(new Error('Server error'));
      await eventStreamingController.publishTransactionEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('publishDocumentEvent', () => {
    it('should publish document event successfully', async () => {
      mockReq.body = { action: 'uploaded', documentData: { name: 'doc.pdf' } };
      await eventStreamingController.publishDocumentEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      mockReq.body = { documentData: { name: 'doc.pdf' } };
      await eventStreamingController.publishDocumentEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when documentData is missing', async () => {
      mockReq.body = { action: 'uploaded' };
      await eventStreamingController.publishDocumentEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid document action error', async () => {
      mockReq.body = { action: 'bad', documentData: { name: 'doc.pdf' } };
      mockPublishDocumentEvent.mockRejectedValue(new Error('Invalid document action'));
      await eventStreamingController.publishDocumentEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on generic error', async () => {
      mockReq.body = { action: 'uploaded', documentData: { name: 'doc.pdf' } };
      mockPublishDocumentEvent.mockRejectedValue(new Error('Server error'));
      await eventStreamingController.publishDocumentEvent(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      mockReq.body = { topics: ['user.created'], filters: {} };
      await eventStreamingController.createSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = null;
      mockReq.body = { topics: ['user.created'] };
      await eventStreamingController.createSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when topics is not an array', async () => {
      mockReq.body = { topics: 'not-array' };
      await eventStreamingController.createSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'topics must be an array' }));
    });

    it('should return 400 when topics is missing', async () => {
      mockReq.body = {};
      await eventStreamingController.createSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid topic error from service', async () => {
      mockReq.body = { topics: ['bad.topic'] };
      mockCreateSubscription.mockRejectedValue(new Error('Invalid topic specified'));
      await eventStreamingController.createSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on generic service error', async () => {
      mockReq.body = { topics: ['user.created'] };
      mockCreateSubscription.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.createSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSubscriptions', () => {
    it('should return subscriptions', async () => {
      await eventStreamingController.getSubscriptions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockGetSubscriptions).toHaveBeenCalledWith('user_123');
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = null;
      await eventStreamingController.getSubscriptions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 on service error', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.getSubscriptions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteSubscription', () => {
    it('should delete subscription successfully', async () => {
      mockReq.params = { id: 'sub_123' };
      await eventStreamingController.deleteSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockDeleteSubscription).toHaveBeenCalledWith('sub_123', 'user_123');
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: 'sub_123' };
      await eventStreamingController.deleteSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when subscription not found', async () => {
      mockReq.params = { id: 'sub_nonexistent' };
      mockDeleteSubscription.mockRejectedValue(new Error('Subscription not found'));
      await eventStreamingController.deleteSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic service error', async () => {
      mockReq.params = { id: 'sub_123' };
      mockDeleteSubscription.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.deleteSubscription(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('registerWebhook', () => {
    it('should register webhook successfully', async () => {
      mockReq.body = { url: 'https://example.com/webhook', topics: ['user.created'] };
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when url is missing', async () => {
      mockReq.body = { topics: ['user.created'] };
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when topics is not an array', async () => {
      mockReq.body = { url: 'https://example.com/webhook', topics: 'not-array' };
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when topics is missing', async () => {
      mockReq.body = { url: 'https://example.com/webhook' };
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = null;
      mockReq.body = { url: 'https://example.com/webhook', topics: ['user.created'] };
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 on HTTPS validation error from service', async () => {
      mockReq.body = { url: 'http://insecure.com/webhook', topics: ['user.created'] };
      mockRegisterWebhook.mockRejectedValue(new Error('HTTPS required'));
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on generic error', async () => {
      mockReq.body = { url: 'https://example.com/webhook', topics: ['user.created'] };
      mockRegisterWebhook.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.registerWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getWebhooks', () => {
    it('should return webhooks', async () => {
      await eventStreamingController.getWebhooks(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockGetWebhooks).toHaveBeenCalledWith('user_123');
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = null;
      await eventStreamingController.getWebhooks(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 on service error', async () => {
      mockGetWebhooks.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.getWebhooks(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      mockReq.params = { id: 'wh_123' };
      await eventStreamingController.deleteWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: 'wh_123' };
      await eventStreamingController.deleteWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when webhook not found', async () => {
      mockReq.params = { id: 'wh_nonexistent' };
      mockDeleteWebhook.mockRejectedValue(new Error('Webhook not found'));
      await eventStreamingController.deleteWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { id: 'wh_123' };
      mockDeleteWebhook.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.deleteWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAuditLog', () => {
    it('should return audit log entries', async () => {
      mockReq.query = { limit: '50', offset: '0' };
      mockGetAuditLog.mockResolvedValue([{ event_id: 'evt_123' }]);
      await eventStreamingController.getAuditLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({ limit: 50, offset: 0, count: 1 })
      }));
    });

    it('should use default values when query params are empty', async () => {
      mockReq.query = {};
      await eventStreamingController.getAuditLog(mockReq, mockRes);
      expect(mockGetAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100, offset: 0
      }));
    });

    it('should return 500 on service error', async () => {
      mockReq.query = {};
      mockGetAuditLog.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.getAuditLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      mockReq.query = { startDate: '2024-01-01', endDate: '2024-12-31' };
      mockGetEventStats.mockResolvedValue({ totalEvents: 42 });
      await eventStreamingController.getEventStats(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { totalEvents: 42 }
      }));
    });

    it('should return 500 on service error', async () => {
      mockReq.query = {};
      mockGetEventStats.mockRejectedValue(new Error('DB error'));
      await eventStreamingController.getEventStats(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTopics', () => {
    it('should return available topics', async () => {
      await eventStreamingController.getTopics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.length).toBe(2);
      expect(response.data[0]).toHaveProperty('key');
      expect(response.data[0]).toHaveProperty('topic');
      expect(response.data[0]).toHaveProperty('description');
    });
  });
});
