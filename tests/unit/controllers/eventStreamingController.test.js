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
    });
  });

  describe('getEvents', () => {
    it('should return events with pagination', async () => {
      mockReq.query = { topic: 'user.created', limit: '50', offset: '0' };
      mockFilterEvents.mockResolvedValue([{ event_id: 'evt_1' }]);
      await eventStreamingController.getEvents(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
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
  });

  describe('getAuditLog', () => {
    it('should return audit log entries', async () => {
      mockReq.query = { limit: '50', offset: '0' };
      mockGetAuditLog.mockResolvedValue([{ event_id: 'evt_123' }]);
      await eventStreamingController.getAuditLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getTopics', () => {
    it('should return available topics', async () => {
      await eventStreamingController.getTopics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
