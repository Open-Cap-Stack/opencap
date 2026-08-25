/**
 * Event Streaming Controller - Expanded Tests
 * Full branch coverage for all handler functions, error paths,
 * validation, and auth checks
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
  topics: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    COMPANY_CREATED: 'company.created',
    TRANSACTION_CREATED: 'transaction.created',
    DOCUMENT_UPLOADED: 'document.uploaded'
  }
}));

const controller = require('../../../controllers/eventStreamingController');

describe('EventStreamingController - Expanded Coverage', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      query: {},
      params: {},
      user: { userId: 'user_test_123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ── publishEvent ───────────────────────────────────────────────────────────

  describe('publishEvent', () => {
    it('should publish event successfully with metadata', async () => {
      req.body = {
        topic: 'user.created',
        payload: { userId: 'u1' },
        metadata: { source: 'test' },
        notifyUsers: ['u2']
      };
      mockPublishEvent.mockResolvedValue({ event_id: 'evt_1' });

      await controller.publishEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockPublishEvent).toHaveBeenCalledWith({
        topic: 'user.created',
        payload: { userId: 'u1' },
        metadata: expect.objectContaining({
          source: 'api',
          actorId: 'user_test_123'
        }),
        notifyUsers: ['u2']
      });
    });

    it('should return 400 when topic is missing', async () => {
      req.body = { payload: { data: 'test' } };

      await controller.publishEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'topic is required'
      });
    });

    it('should return 400 when payload is missing', async () => {
      req.body = { topic: 'user.created' };

      await controller.publishEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'payload is required'
      });
    });

    it('should return 400 when service throws Invalid event error', async () => {
      req.body = { topic: 'invalid.topic', payload: { data: 'test' } };
      mockPublishEvent.mockRejectedValue(new Error('Invalid event topic'));

      await controller.publishEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for unexpected service errors', async () => {
      req.body = { topic: 'user.created', payload: { data: 'test' } };
      mockPublishEvent.mockRejectedValue(new Error('Database connection lost'));

      await controller.publishEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Failed to publish event'
      }));
    });

    it('should use anonymous actorId when req.user is null', async () => {
      req.user = null;
      req.body = { topic: 'test.event', payload: { key: 'value' } };
      mockPublishEvent.mockResolvedValue({ event_id: 'evt_anon' });

      await controller.publishEvent(req, res);

      expect(mockPublishEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ actorId: 'anonymous' })
      }));
    });
  });

  // ── getEvents ──────────────────────────────────────────────────────────────

  describe('getEvents', () => {
    it('should return events with default pagination', async () => {
      req.query = {};
      mockFilterEvents.mockResolvedValue([{ event_id: 'evt_1' }]);

      await controller.getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockFilterEvents).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100,
        offset: 0
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        pagination: expect.objectContaining({ limit: 100, offset: 0, count: 1 })
      }));
    });

    it('should parse custom pagination parameters', async () => {
      req.query = { limit: '25', offset: '50', topic: 'user.created' };
      mockFilterEvents.mockResolvedValue([]);

      await controller.getEvents(req, res);

      expect(mockFilterEvents).toHaveBeenCalledWith(expect.objectContaining({
        limit: 25,
        offset: 50,
        topic: 'user.created'
      }));
    });

    it('should parse valid JSON filter', async () => {
      req.query = { filter: '{"status":"active"}' };
      mockFilterEvents.mockResolvedValue([]);

      await controller.getEvents(req, res);

      expect(mockFilterEvents).toHaveBeenCalledWith(expect.objectContaining({
        payloadFilter: { status: 'active' }
      }));
    });

    it('should return 400 for invalid JSON filter', async () => {
      req.query = { filter: '{invalid-json}' };

      await controller.getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.stringContaining('Invalid filter format')
      }));
    });

    it('should pass date range parameters', async () => {
      req.query = { startDate: '2026-01-01', endDate: '2026-12-31' };
      mockFilterEvents.mockResolvedValue([]);

      await controller.getEvents(req, res);

      expect(mockFilterEvents).toHaveBeenCalledWith(expect.objectContaining({
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }));
    });

    it('should return 500 on service error', async () => {
      req.query = {};
      mockFilterEvents.mockRejectedValue(new Error('Query failed'));

      await controller.getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── publishUserEvent ───────────────────────────────────────────────────────

  describe('publishUserEvent', () => {
    it('should publish user event successfully', async () => {
      req.body = { action: 'registered', userData: { email: 'user@test.com' } };
      mockPublishUserEvent.mockResolvedValue({ event_id: 'evt_user_1' });

      await controller.publishUserEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockPublishUserEvent).toHaveBeenCalledWith('registered', { email: 'user@test.com' });
    });

    it('should return 400 when action is missing', async () => {
      req.body = { userData: { email: 'user@test.com' } };

      await controller.publishUserEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'action is required' });
    });

    it('should return 400 when userData is missing', async () => {
      req.body = { action: 'registered' };

      await controller.publishUserEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'userData is required' });
    });

    it('should return 400 on Invalid user action error', async () => {
      req.body = { action: 'bad_action', userData: { id: '1' } };
      mockPublishUserEvent.mockRejectedValue(new Error('Invalid user action'));

      await controller.publishUserEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { action: 'registered', userData: { id: '1' } };
      mockPublishUserEvent.mockRejectedValue(new Error('Internal failure'));

      await controller.publishUserEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── publishCompanyEvent ────────────────────────────────────────────────────

  describe('publishCompanyEvent', () => {
    it('should publish company event successfully', async () => {
      req.body = { action: 'incorporated', companyData: { name: 'Acme Corp' } };
      mockPublishCompanyEvent.mockResolvedValue({ event_id: 'evt_comp_1' });

      await controller.publishCompanyEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      req.body = { companyData: { name: 'Acme' } };

      await controller.publishCompanyEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'action is required' });
    });

    it('should return 400 when companyData is missing', async () => {
      req.body = { action: 'incorporated' };

      await controller.publishCompanyEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'companyData is required' });
    });

    it('should return 400 on Invalid company action error', async () => {
      req.body = { action: 'invalid', companyData: { id: '1' } };
      mockPublishCompanyEvent.mockRejectedValue(new Error('Invalid company action'));

      await controller.publishCompanyEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { action: 'incorporated', companyData: { id: '1' } };
      mockPublishCompanyEvent.mockRejectedValue(new Error('Unexpected'));

      await controller.publishCompanyEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── publishTransactionEvent ────────────────────────────────────────────────

  describe('publishTransactionEvent', () => {
    it('should publish transaction event successfully', async () => {
      req.body = { action: 'completed', transactionData: { amount: 1000 } };
      mockPublishTransactionEvent.mockResolvedValue({ event_id: 'evt_tx_1' });

      await controller.publishTransactionEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      req.body = { transactionData: { amount: 1000 } };

      await controller.publishTransactionEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when transactionData is missing', async () => {
      req.body = { action: 'completed' };

      await controller.publishTransactionEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid transaction action error', async () => {
      req.body = { action: 'invalid', transactionData: { id: '1' } };
      mockPublishTransactionEvent.mockRejectedValue(new Error('Invalid transaction action'));

      await controller.publishTransactionEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { action: 'completed', transactionData: { id: '1' } };
      mockPublishTransactionEvent.mockRejectedValue(new Error('Network error'));

      await controller.publishTransactionEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── publishDocumentEvent ───────────────────────────────────────────────────

  describe('publishDocumentEvent', () => {
    it('should publish document event successfully', async () => {
      req.body = { action: 'uploaded', documentData: { name: 'doc.pdf' } };
      mockPublishDocumentEvent.mockResolvedValue({ event_id: 'evt_doc_1' });

      await controller.publishDocumentEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when action is missing', async () => {
      req.body = { documentData: { name: 'doc.pdf' } };

      await controller.publishDocumentEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when documentData is missing', async () => {
      req.body = { action: 'uploaded' };

      await controller.publishDocumentEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid document action error', async () => {
      req.body = { action: 'invalid', documentData: { id: '1' } };
      mockPublishDocumentEvent.mockRejectedValue(new Error('Invalid document action'));

      await controller.publishDocumentEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { action: 'uploaded', documentData: { id: '1' } };
      mockPublishDocumentEvent.mockRejectedValue(new Error('Storage error'));

      await controller.publishDocumentEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── createSubscription ─────────────────────────────────────────────────────

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      req.body = { topics: ['user.created', 'user.updated'], filters: { companyId: 'c1' } };
      mockCreateSubscription.mockResolvedValue({ subscriptionId: 'sub_1' });

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockCreateSubscription).toHaveBeenCalledWith({
        topics: ['user.created', 'user.updated'],
        filters: { companyId: 'c1' },
        userId: 'user_test_123'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = {};
      req.body = { topics: ['user.created'] };

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when user is null', async () => {
      req.user = null;
      req.body = { topics: ['user.created'] };

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when topics is not an array', async () => {
      req.body = { topics: 'user.created' };

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'topics must be an array'
      });
    });

    it('should return 400 when topics is missing', async () => {
      req.body = {};

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid topic error', async () => {
      req.body = { topics: ['invalid.topic'] };
      mockCreateSubscription.mockRejectedValue(new Error('Invalid topic specified'));

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on required field error', async () => {
      req.body = { topics: ['user.created'] };
      mockCreateSubscription.mockRejectedValue(new Error('userId is required'));

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { topics: ['user.created'] };
      mockCreateSubscription.mockRejectedValue(new Error('Internal failure'));

      await controller.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getSubscriptions ───────────────────────────────────────────────────────

  describe('getSubscriptions', () => {
    it('should return subscriptions successfully', async () => {
      mockGetSubscriptions.mockResolvedValue([{ subscriptionId: 'sub_1' }]);

      await controller.getSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockGetSubscriptions).toHaveBeenCalledWith('user_test_123');
    });

    it('should return 401 when not authenticated', async () => {
      req.user = {};

      await controller.getSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 on service error', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('DB error'));

      await controller.getSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── deleteSubscription ─────────────────────────────────────────────────────

  describe('deleteSubscription', () => {
    it('should delete subscription successfully', async () => {
      req.params = { id: 'sub_1' };
      mockDeleteSubscription.mockResolvedValue();

      await controller.deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockDeleteSubscription).toHaveBeenCalledWith('sub_1', 'user_test_123');
    });

    it('should return 401 when not authenticated', async () => {
      req.user = {};
      req.params = { id: 'sub_1' };

      await controller.deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when subscription not found', async () => {
      req.params = { id: 'sub_nonexistent' };
      mockDeleteSubscription.mockRejectedValue(new Error('Subscription not found'));

      await controller.deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      req.params = { id: 'sub_1' };
      mockDeleteSubscription.mockRejectedValue(new Error('Internal error'));

      await controller.deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── registerWebhook ────────────────────────────────────────────────────────

  describe('registerWebhook', () => {
    it('should register webhook successfully', async () => {
      req.body = { url: 'https://example.com/hook', topics: ['user.created'], secret: 'my_secret' };
      mockRegisterWebhook.mockResolvedValue({ webhookId: 'wh_1' });

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockRegisterWebhook).toHaveBeenCalledWith({
        url: 'https://example.com/hook',
        topics: ['user.created'],
        secret: 'my_secret',
        userId: 'user_test_123'
      });
    });

    it('should return 401 when not authenticated', async () => {
      req.user = {};
      req.body = { url: 'https://example.com/hook', topics: ['user.created'] };

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when url is missing', async () => {
      req.body = { topics: ['user.created'] };

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'url is required' });
    });

    it('should return 400 when topics is not an array', async () => {
      req.body = { url: 'https://example.com/hook', topics: 'user.created' };

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when topics is missing', async () => {
      req.body = { url: 'https://example.com/hook' };

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on Invalid error', async () => {
      req.body = { url: 'https://example.com/hook', topics: ['user.created'] };
      mockRegisterWebhook.mockRejectedValue(new Error('Invalid URL format'));

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on HTTPS error', async () => {
      req.body = { url: 'http://insecure.com/hook', topics: ['user.created'] };
      mockRegisterWebhook.mockRejectedValue(new Error('HTTPS is required'));

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { url: 'https://example.com/hook', topics: ['user.created'] };
      mockRegisterWebhook.mockRejectedValue(new Error('Database error'));

      await controller.registerWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getWebhooks ────────────────────────────────────────────────────────────

  describe('getWebhooks', () => {
    it('should return webhooks successfully', async () => {
      mockGetWebhooks.mockResolvedValue([{ webhookId: 'wh_1', url: 'https://test.com/hook' }]);

      await controller.getWebhooks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockGetWebhooks).toHaveBeenCalledWith('user_test_123');
    });

    it('should return 401 when not authenticated', async () => {
      req.user = {};

      await controller.getWebhooks(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 on service error', async () => {
      mockGetWebhooks.mockRejectedValue(new Error('Query failed'));

      await controller.getWebhooks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── deleteWebhook ──────────────────────────────────────────────────────────

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      req.params = { id: 'wh_1' };
      mockDeleteWebhook.mockResolvedValue();

      await controller.deleteWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Webhook deleted successfully'
      }));
    });

    it('should return 401 when not authenticated', async () => {
      req.user = {};
      req.params = { id: 'wh_1' };

      await controller.deleteWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when webhook not found', async () => {
      req.params = { id: 'wh_nonexistent' };
      mockDeleteWebhook.mockRejectedValue(new Error('Webhook not found'));

      await controller.deleteWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      req.params = { id: 'wh_1' };
      mockDeleteWebhook.mockRejectedValue(new Error('Internal error'));

      await controller.deleteWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAuditLog ────────────────────────────────────────────────────────────

  describe('getAuditLog', () => {
    it('should return audit log with all filters', async () => {
      req.query = {
        actorId: 'user_1',
        topic: 'user.created',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        limit: '25',
        offset: '10'
      };
      mockGetAuditLog.mockResolvedValue([{ event_id: 'evt_1' }, { event_id: 'evt_2' }]);

      await controller.getAuditLog(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockGetAuditLog).toHaveBeenCalledWith({
        actorId: 'user_1',
        topic: 'user.created',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        limit: 25,
        offset: 10
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: { limit: 25, offset: 10, count: 2 }
      }));
    });

    it('should use default pagination when not specified', async () => {
      req.query = {};
      mockGetAuditLog.mockResolvedValue([]);

      await controller.getAuditLog(req, res);

      expect(mockGetAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100,
        offset: 0
      }));
    });

    it('should return 500 on service error', async () => {
      req.query = {};
      mockGetAuditLog.mockRejectedValue(new Error('Audit query failed'));

      await controller.getAuditLog(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getEventStats ──────────────────────────────────────────────────────────

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      req.query = { startDate: '2026-01-01', endDate: '2026-06-30' };
      mockGetEventStats.mockResolvedValue({ totalEvents: 150, byTopic: {} });

      await controller.getEventStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockGetEventStats).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      });
    });

    it('should handle empty query params', async () => {
      req.query = {};
      mockGetEventStats.mockResolvedValue({ totalEvents: 0 });

      await controller.getEventStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on service error', async () => {
      req.query = {};
      mockGetEventStats.mockRejectedValue(new Error('Stats calculation failed'));

      await controller.getEventStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getTopics ──────────────────────────────────────────────────────────────

  describe('getTopics', () => {
    it('should return all available topics', async () => {
      await controller.getTopics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const call = res.json.mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.data).toBeInstanceOf(Array);
      expect(call.data.length).toBe(5);
      expect(call.data[0]).toHaveProperty('key');
      expect(call.data[0]).toHaveProperty('topic');
      expect(call.data[0]).toHaveProperty('description');
    });
  });
});
