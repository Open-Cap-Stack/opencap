/**
 * Event Streaming Service - Expanded Test Suite
 *
 * Covers additional branches not in the original test file:
 * - publishEvent (with notifyUsers, metadata, websocket errors)
 * - publishCompanyEvent / publishTransactionEvent / publishDocumentEvent
 * - createSubscription edge cases (missing userId, empty topics)
 * - getSubscriptions
 * - deleteSubscription (not found scenarios)
 * - matchSubscriptions (filter matching, no subscriptions)
 * - registerWebhook (invalid URL, secret hashing, invalid topics)
 * - getWebhooks (strips secret_hash)
 * - deleteWebhook
 * - triggerWebhooks / deliverWebhook
 * - generateWebhookSignature
 * - logWebhookDelivery
 * - notifySubscribers (success and error paths)
 * - broadcastEvent
 * - filterEvents (topic, date, payload filters)
 * - getAuditLog (with filters)
 * - replayEvents
 * - getEventStats (empty stats)
 * - updateConfig
 * - validateEventSchema edge cases
 */

jest.mock('../../../services/zerodbService');
jest.mock('../../../services/websocketService');

const zerodbService = require('../../../services/zerodbService');
const websocketService = require('../../../services/websocketService');

// Must require after mocks
const eventStreamingService = require('../../../services/eventStreamingService');

describe('Event Streaming Service (Expanded)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.publishEvent = jest.fn().mockResolvedValue({ event_id: 'evt_123' });
    zerodbService.listEvents = jest.fn().mockResolvedValue([]);
    zerodbService.insertRows = jest.fn().mockResolvedValue({ inserted: 1 });
    zerodbService.queryTable = jest.fn().mockResolvedValue([]);
    zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted: 1 });
    websocketService.sendToUser = jest.fn();
    websocketService.broadcastToAll = jest.fn();
    eventStreamingService.httpClient = null;
  });

  // ── updateConfig ──
  describe('updateConfig', () => {
    it('should merge new config into existing config', () => {
      const original = { ...eventStreamingService.config };
      eventStreamingService.updateConfig({ webhookRetryAttempts: 5 });
      expect(eventStreamingService.config.webhookRetryAttempts).toBe(5);
      expect(eventStreamingService.config.webhookRetryDelay).toBe(original.webhookRetryDelay);
      // Restore
      eventStreamingService.updateConfig(original);
    });
  });

  // ── validateEventSchema edge cases ──
  describe('validateEventSchema edge cases', () => {
    it('should reject null input', () => {
      const result = eventStreamingService.validateEventSchema(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('event must be an object');
    });

    it('should reject non-object input', () => {
      const result = eventStreamingService.validateEventSchema('string');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid topic format', () => {
      const result = eventStreamingService.validateEventSchema({
        topic: 'not.a.valid.topic',
        payload: {}
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid topic format');
    });

    it('should return multiple errors at once', () => {
      const result = eventStreamingService.validateEventSchema({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── publishEvent with notifyUsers ──
  describe('publishEvent with notifyUsers', () => {
    it('should notify websocket users when notifyUsers is provided', async () => {
      await eventStreamingService.publishEvent({
        topic: 'user.created',
        payload: { userId: 'u1' },
        notifyUsers: ['user_1', 'user_2']
      });

      expect(websocketService.sendToUser).toHaveBeenCalledTimes(2);
      expect(websocketService.sendToUser).toHaveBeenCalledWith('user_1', expect.objectContaining({ type: 'event' }));
    });

    it('should continue notifying other users if one fails', async () => {
      websocketService.sendToUser
        .mockImplementationOnce(() => { throw new Error('Connection lost'); })
        .mockImplementationOnce(() => {});

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventStreamingService.publishEvent({
        topic: 'user.created',
        payload: { userId: 'u1' },
        notifyUsers: ['user_1', 'user_2']
      });

      expect(websocketService.sendToUser).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to notify user user_1'), expect.any(String));
      consoleSpy.mockRestore();
    });

    it('should include metadata actorId in audit log', async () => {
      await eventStreamingService.publishEvent({
        topic: 'user.created',
        payload: { userId: 'u1' },
        metadata: { actorId: 'admin_1' }
      });

      expect(zerodbService.insertRows).toHaveBeenCalledWith('event_audit_log', [
        expect.objectContaining({ actor_id: 'admin_1' })
      ]);
    });

    it('should default actorId to system when no metadata', async () => {
      await eventStreamingService.publishEvent({
        topic: 'user.created',
        payload: { userId: 'u1' }
      });

      expect(zerodbService.insertRows).toHaveBeenCalledWith('event_audit_log', [
        expect.objectContaining({ actor_id: 'system' })
      ]);
    });
  });

  // ── publishCompanyEvent ──
  describe('publishCompanyEvent', () => {
    it('should publish company.created event', async () => {
      await eventStreamingService.publishCompanyEvent('created', { companyId: 'c1' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('company.created', expect.objectContaining({ action: 'created' }));
    });

    it('should publish company.updated event', async () => {
      await eventStreamingService.publishCompanyEvent('updated', { companyId: 'c1' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('company.updated', expect.objectContaining({ action: 'updated' }));
    });

    it('should throw for invalid company action', async () => {
      await expect(eventStreamingService.publishCompanyEvent('deleted', {}))
        .rejects.toThrow('Invalid company action: deleted');
    });
  });

  // ── publishTransactionEvent ──
  describe('publishTransactionEvent', () => {
    it('should publish transaction.created event', async () => {
      await eventStreamingService.publishTransactionEvent('created', { txId: 'tx1' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('transaction.created', expect.objectContaining({ action: 'created' }));
    });

    it('should publish transaction.completed event', async () => {
      await eventStreamingService.publishTransactionEvent('completed', { txId: 'tx1' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('transaction.completed', expect.objectContaining({ action: 'completed' }));
    });

    it('should throw for invalid transaction action', async () => {
      await expect(eventStreamingService.publishTransactionEvent('deleted', {}))
        .rejects.toThrow('Invalid transaction action: deleted');
    });
  });

  // ── publishDocumentEvent ──
  describe('publishDocumentEvent', () => {
    it('should publish document.uploaded event', async () => {
      await eventStreamingService.publishDocumentEvent('uploaded', { docId: 'd1' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('document.uploaded', expect.objectContaining({ action: 'uploaded' }));
    });

    it('should publish document.signed event', async () => {
      await eventStreamingService.publishDocumentEvent('signed', { docId: 'd1' });
      expect(zerodbService.publishEvent).toHaveBeenCalledWith('document.signed', expect.objectContaining({ action: 'signed' }));
    });

    it('should throw for invalid document action', async () => {
      await expect(eventStreamingService.publishDocumentEvent('deleted', {}))
        .rejects.toThrow('Invalid document action: deleted');
    });
  });

  // ── createSubscription edge cases ──
  describe('createSubscription edge cases', () => {
    it('should throw when userId is missing', async () => {
      await expect(eventStreamingService.createSubscription({
        topics: ['user.created']
      })).rejects.toThrow('userId is required');
    });

    it('should throw when topics is empty', async () => {
      await expect(eventStreamingService.createSubscription({
        userId: 'u1',
        topics: []
      })).rejects.toThrow('At least one topic is required');
    });

    it('should throw when topics is missing', async () => {
      await expect(eventStreamingService.createSubscription({
        userId: 'u1'
      })).rejects.toThrow();
    });

    it('should default filters to empty object', async () => {
      const result = await eventStreamingService.createSubscription({
        userId: 'u1',
        topics: ['user.created']
      });

      expect(result.filters).toEqual({});
    });

    it('should accept custom filters', async () => {
      const result = await eventStreamingService.createSubscription({
        userId: 'u1',
        topics: ['user.created'],
        filters: { companyId: 'c1' }
      });

      expect(result.filters).toEqual({ companyId: 'c1' });
    });
  });

  // ── getSubscriptions ──
  describe('getSubscriptions', () => {
    it('should query subscriptions by userId', async () => {
      zerodbService.queryTable.mockResolvedValue([{ user_id: 'u1' }]);
      const result = await eventStreamingService.getSubscriptions('u1');
      expect(zerodbService.queryTable).toHaveBeenCalledWith('event_subscriptions', { filter: { user_id: 'u1' } });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      const result = await eventStreamingService.getSubscriptions('u1');
      expect(result).toEqual([]);
    });
  });

  // ── deleteSubscription ──
  describe('deleteSubscription edge cases', () => {
    it('should throw when subscription not found (null result)', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      await expect(eventStreamingService.deleteSubscription('sub_x', 'u1'))
        .rejects.toThrow('Subscription not found');
    });

    it('should throw when subscription not found (empty array)', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await expect(eventStreamingService.deleteSubscription('sub_x', 'u1'))
        .rejects.toThrow('Subscription not found');
    });

    it('should throw when subscription exists but wrong user_id', async () => {
      zerodbService.queryTable.mockResolvedValue([{ subscription_id: 'sub_x', user_id: 'u2' }]);
      await expect(eventStreamingService.deleteSubscription('sub_x', 'u1'))
        .rejects.toThrow('Subscription not found');
    });
  });

  // ── matchSubscriptions ──
  describe('matchSubscriptions', () => {
    it('should return matching subscriptions based on topic', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { user_id: 'u1', topics: ['user.created'], filters: {} },
        { user_id: 'u2', topics: ['company.created'], filters: {} }
      ]);

      const matches = await eventStreamingService.matchSubscriptions({
        topic: 'user.created',
        payload: {}
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].user_id).toBe('u1');
    });

    it('should filter by payload when filters are set', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { user_id: 'u1', topics: ['user.created'], filters: { companyId: 'c1' } },
        { user_id: 'u2', topics: ['user.created'], filters: { companyId: 'c2' } }
      ]);

      const matches = await eventStreamingService.matchSubscriptions({
        topic: 'user.created',
        payload: { companyId: 'c1' }
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].user_id).toBe('u1');
    });

    it('should return empty when no subscriptions exist', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      const matches = await eventStreamingService.matchSubscriptions({
        topic: 'user.created',
        payload: {}
      });
      expect(matches).toEqual([]);
    });

    it('should return empty when no subscriptions match', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { user_id: 'u1', topics: ['company.created'], filters: {} }
      ]);

      const matches = await eventStreamingService.matchSubscriptions({
        topic: 'user.created',
        payload: {}
      });

      expect(matches).toHaveLength(0);
    });

    it('should handle subscriptions with missing topics', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { user_id: 'u1', filters: {} } // no topics field
      ]);

      const matches = await eventStreamingService.matchSubscriptions({
        topic: 'user.created',
        payload: {}
      });

      expect(matches).toHaveLength(0);
    });
  });

  // ── registerWebhook ──
  describe('registerWebhook edge cases', () => {
    it('should throw for invalid URL format', async () => {
      await expect(eventStreamingService.registerWebhook({
        url: 'not-a-url',
        topics: ['user.created'],
        userId: 'u1'
      })).rejects.toThrow('Invalid webhook URL');
    });

    it('should throw for missing topics', async () => {
      await expect(eventStreamingService.registerWebhook({
        url: 'https://example.com/hook',
        topics: [],
        userId: 'u1'
      })).rejects.toThrow('At least one topic is required');
    });

    it('should throw for invalid topic in topics array', async () => {
      await expect(eventStreamingService.registerWebhook({
        url: 'https://example.com/hook',
        topics: ['user.created', 'invalid.topic'],
        userId: 'u1'
      })).rejects.toThrow('Invalid topic: invalid.topic');
    });

    it('should hash the secret when provided', async () => {
      await eventStreamingService.registerWebhook({
        url: 'https://example.com/hook',
        topics: ['user.created'],
        userId: 'u1',
        secret: 'my-secret'
      });

      const insertCall = zerodbService.insertRows.mock.calls[0];
      const data = insertCall[1][0];
      expect(data.secret_hash).toBeTruthy();
      expect(data.secret_hash).not.toBe('my-secret');
    });

    it('should set secret_hash to null when no secret', async () => {
      await eventStreamingService.registerWebhook({
        url: 'https://example.com/hook',
        topics: ['user.created'],
        userId: 'u1'
      });

      const data = zerodbService.insertRows.mock.calls[0][1][0];
      expect(data.secret_hash).toBeNull();
    });
  });

  // ── getWebhooks ──
  describe('getWebhooks', () => {
    it('should strip secret_hash from returned webhooks', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { webhook_id: 'wh_1', url: 'https://example.com', secret_hash: 'abc123', topics: ['user.created'] }
      ]);

      const result = await eventStreamingService.getWebhooks('u1');
      expect(result[0]).not.toHaveProperty('secret_hash');
      expect(result[0]).toHaveProperty('webhook_id', 'wh_1');
    });

    it('should return empty array when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      const result = await eventStreamingService.getWebhooks('u1');
      expect(result).toEqual([]);
    });
  });

  // ── deleteWebhook ──
  describe('deleteWebhook', () => {
    it('should throw when webhook not found', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await expect(eventStreamingService.deleteWebhook('wh_x', 'u1'))
        .rejects.toThrow('Webhook not found');
    });

    it('should delete webhook successfully', async () => {
      zerodbService.queryTable.mockResolvedValue([{ webhook_id: 'wh_1', user_id: 'u1' }]);
      await eventStreamingService.deleteWebhook('wh_1', 'u1');
      expect(zerodbService.deleteRows).toHaveBeenCalled();
    });
  });

  // ── triggerWebhooks ──
  describe('triggerWebhooks', () => {
    it('should skip when no webhooks exist', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      await eventStreamingService.triggerWebhooks({ topic: 'user.created', payload: {} });
      // Should not throw
    });

    it('should skip when no active webhooks', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await eventStreamingService.triggerWebhooks({ topic: 'user.created', payload: {} });
    });

    it('should deliver to matching webhooks only', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { webhook_id: 'wh_1', topics: ['user.created'], url: 'https://a.com', active: true },
        { webhook_id: 'wh_2', topics: ['company.created'], url: 'https://b.com', active: true }
      ]);

      const deliverSpy = jest.spyOn(eventStreamingService, 'deliverWebhook').mockResolvedValue();
      await eventStreamingService.triggerWebhooks({ topic: 'user.created', payload: {} });

      expect(deliverSpy).toHaveBeenCalledTimes(1);
      deliverSpy.mockRestore();
    });
  });

  // ── deliverWebhook ──
  describe('deliverWebhook', () => {
    it('should call httpClient.post when available', async () => {
      const mockPost = jest.fn().mockResolvedValue({});
      eventStreamingService.httpClient = { post: mockPost };

      await eventStreamingService.deliverWebhook(
        { webhook_id: 'wh_1', url: 'https://example.com', secret_hash: 'hash' },
        { topic: 'user.created', payload: { userId: 'u1' } }
      );

      expect(mockPost).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ event: expect.any(Object) }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String)
          })
        })
      );
    });

    it('should log failure when httpClient.post throws', async () => {
      const mockPost = jest.fn().mockRejectedValue(new Error('Connection refused'));
      eventStreamingService.httpClient = { post: mockPost };

      await eventStreamingService.deliverWebhook(
        { webhook_id: 'wh_1', url: 'https://example.com', secret_hash: null },
        { topic: 'user.created', payload: {} }
      );

      expect(zerodbService.insertRows).toHaveBeenCalledWith('webhook_delivery_log', [
        expect.objectContaining({ status: 'failed', error: 'Connection refused' })
      ]);
    });

    it('should skip delivery when httpClient is null', async () => {
      eventStreamingService.httpClient = null;

      await eventStreamingService.deliverWebhook(
        { webhook_id: 'wh_1', url: 'https://example.com', secret_hash: null },
        { topic: 'user.created', payload: {} }
      );

      // Should not call insertRows for delivery log since no delivery was attempted
      expect(zerodbService.insertRows).not.toHaveBeenCalled();
    });
  });

  // ── generateWebhookSignature ──
  describe('generateWebhookSignature', () => {
    it('should return empty string when no secret hash', () => {
      const sig = eventStreamingService.generateWebhookSignature('payload', null);
      expect(sig).toBe('');
    });

    it('should return a hex string when secret hash is provided', () => {
      const sig = eventStreamingService.generateWebhookSignature('payload', 'secrethash');
      expect(sig).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent signatures for same input', () => {
      const sig1 = eventStreamingService.generateWebhookSignature('data', 'key');
      const sig2 = eventStreamingService.generateWebhookSignature('data', 'key');
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const sig1 = eventStreamingService.generateWebhookSignature('data1', 'key');
      const sig2 = eventStreamingService.generateWebhookSignature('data2', 'key');
      expect(sig1).not.toBe(sig2);
    });
  });

  // ── notifySubscribers ──
  describe('notifySubscribers', () => {
    it('should notify all matching subscribers via websocket', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { user_id: 'u1', subscription_id: 'sub_1', topics: ['user.created'], filters: {} },
        { user_id: 'u2', subscription_id: 'sub_2', topics: ['user.created'], filters: {} }
      ]);

      await eventStreamingService.notifySubscribers({ topic: 'user.created', payload: { userId: 'x' } });

      expect(websocketService.sendToUser).toHaveBeenCalledTimes(2);
    });

    it('should handle websocket errors gracefully', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { user_id: 'u1', subscription_id: 'sub_1', topics: ['user.created'], filters: {} }
      ]);
      websocketService.sendToUser.mockImplementation(() => { throw new Error('ws error'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventStreamingService.notifySubscribers({ topic: 'user.created', payload: {} });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle matchSubscriptions error gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventStreamingService.notifySubscribers({ topic: 'user.created', payload: {} });

      expect(consoleSpy).toHaveBeenCalledWith('Error notifying subscribers:', expect.any(String));
      consoleSpy.mockRestore();
    });
  });

  // ── broadcastEvent ──
  describe('broadcastEvent', () => {
    it('should broadcast to all connected clients', async () => {
      await eventStreamingService.broadcastEvent({ topic: 'user.created', payload: { msg: 'hello' } });

      expect(websocketService.broadcastToAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          topic: 'user.created',
          payload: { msg: 'hello' }
        })
      );
    });
  });

  // ── filterEvents ──
  describe('filterEvents', () => {
    it('should filter by topic', async () => {
      zerodbService.listEvents.mockResolvedValue([
        { topic: 'user.created', published_at: '2024-06-01T00:00:00Z', event_payload: {} },
        { topic: 'company.created', published_at: '2024-06-01T00:00:00Z', event_payload: {} }
      ]);

      const result = await eventStreamingService.filterEvents({ topic: 'user.created' });
      expect(result).toHaveLength(1);
      expect(result[0].topic).toBe('user.created');
    });

    it('should filter by date range', async () => {
      zerodbService.listEvents.mockResolvedValue([
        { topic: 'user.created', published_at: '2024-01-01T00:00:00Z', event_payload: {} },
        { topic: 'user.created', published_at: '2024-06-15T00:00:00Z', event_payload: {} },
        { topic: 'user.created', published_at: '2024-12-31T00:00:00Z', event_payload: {} }
      ]);

      const result = await eventStreamingService.filterEvents({
        startDate: '2024-06-01',
        endDate: '2024-07-01'
      });

      expect(result).toHaveLength(1);
    });

    it('should filter by payload fields', async () => {
      zerodbService.listEvents.mockResolvedValue([
        { topic: 'user.created', published_at: '2024-01-01', event_payload: { companyId: 'c1' } },
        { topic: 'user.created', published_at: '2024-01-01', event_payload: { companyId: 'c2' } }
      ]);

      const result = await eventStreamingService.filterEvents({
        payloadFilter: { companyId: 'c1' }
      });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when listEvents returns null', async () => {
      zerodbService.listEvents.mockResolvedValue(null);
      const result = await eventStreamingService.filterEvents({});
      expect(result).toEqual([]);
    });

    it('should use default limit and offset', async () => {
      zerodbService.listEvents.mockResolvedValue([]);
      await eventStreamingService.filterEvents({});
      expect(zerodbService.listEvents).toHaveBeenCalledWith(undefined, 0, 100);
    });

    it('should use custom limit and offset', async () => {
      zerodbService.listEvents.mockResolvedValue([]);
      await eventStreamingService.filterEvents({ limit: 50, offset: 10, topic: 'user.created' });
      expect(zerodbService.listEvents).toHaveBeenCalledWith('user.created', 10, 50);
    });
  });

  // ── getAuditLog ──
  describe('getAuditLog', () => {
    it('should query with actorId filter', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await eventStreamingService.getAuditLog({ actorId: 'admin_1' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith('event_audit_log', expect.objectContaining({
        filter: expect.objectContaining({ actor_id: 'admin_1' })
      }));
    });

    it('should query with date range filter', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await eventStreamingService.getAuditLog({ startDate: '2024-01-01', endDate: '2024-12-31' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith('event_audit_log', expect.objectContaining({
        filter: expect.objectContaining({
          timestamp: { $gte: '2024-01-01', $lte: '2024-12-31' }
        })
      }));
    });

    it('should return empty array when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      const result = await eventStreamingService.getAuditLog({});
      expect(result).toEqual([]);
    });

    it('should pass custom limit and offset', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await eventStreamingService.getAuditLog({ limit: 50, offset: 10 });
      expect(zerodbService.queryTable).toHaveBeenCalledWith('event_audit_log', expect.objectContaining({
        limit: 50,
        skip: 10
      }));
    });
  });

  // ── replayEvents ──
  describe('replayEvents', () => {
    it('should call callback for each event in chronological order', async () => {
      zerodbService.listEvents.mockResolvedValue([
        { event_id: 'e2', published_at: '2024-06-02T00:00:00Z' },
        { event_id: 'e1', published_at: '2024-06-01T00:00:00Z' }
      ]);

      const callOrder = [];
      const callback = jest.fn(async (event) => { callOrder.push(event.event_id); });

      await eventStreamingService.replayEvents({ topic: 'user.created', callback });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callOrder).toEqual(['e1', 'e2']); // sorted by published_at
    });

    it('should do nothing when events is null', async () => {
      zerodbService.listEvents.mockResolvedValue(null);
      const callback = jest.fn();

      await eventStreamingService.replayEvents({ topic: 'user.created', callback });
      expect(callback).not.toHaveBeenCalled();
    });

    it('should use default limit and offset', async () => {
      zerodbService.listEvents.mockResolvedValue([]);
      await eventStreamingService.replayEvents({ topic: 'test', callback: jest.fn() });
      expect(zerodbService.listEvents).toHaveBeenCalledWith('test', 0, 1000);
    });
  });

  // ── getEventStats ──
  describe('getEventStats', () => {
    it('should return zero totals when no stats exist', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      const result = await eventStreamingService.getEventStats({});
      expect(result).toEqual({ totalEvents: 0, eventsByTopic: {} });
    });

    it('should return zero totals when stats is null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);
      const result = await eventStreamingService.getEventStats({});
      expect(result).toEqual({ totalEvents: 0, eventsByTopic: {} });
    });

    it('should aggregate events by topic', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { topic: 'user.created', count: 10 },
        { topic: 'user.created', count: 5 },
        { topic: 'company.created', count: 3 }
      ]);

      const result = await eventStreamingService.getEventStats({});

      expect(result.totalEvents).toBe(18);
      expect(result.eventsByTopic['user.created']).toBe(15);
      expect(result.eventsByTopic['company.created']).toBe(3);
    });

    it('should count entries without count field as 1', async () => {
      zerodbService.queryTable.mockResolvedValue([
        { topic: 'user.created' },
        { topic: 'user.created' }
      ]);

      const result = await eventStreamingService.getEventStats({});
      expect(result.totalEvents).toBe(2);
      expect(result.eventsByTopic['user.created']).toBe(2);
    });

    it('should pass date range filters', async () => {
      zerodbService.queryTable.mockResolvedValue([]);
      await eventStreamingService.getEventStats({ startDate: '2024-01-01', endDate: '2024-12-31' });

      expect(zerodbService.queryTable).toHaveBeenCalledWith('event_audit_log', expect.objectContaining({
        filter: expect.objectContaining({
          timestamp: { $gte: '2024-01-01', $lte: '2024-12-31' }
        })
      }));
    });
  });

  // ── logAuditEntry ──
  describe('logAuditEntry', () => {
    it('should insert audit entry with all fields', async () => {
      await eventStreamingService.logAuditEntry({
        eventId: 'evt_1',
        topic: 'user.created',
        actorId: 'admin_1',
        action: 'publish',
        metadata: { ip: '127.0.0.1' }
      });

      expect(zerodbService.insertRows).toHaveBeenCalledWith('event_audit_log', [
        expect.objectContaining({
          event_id: 'evt_1',
          topic: 'user.created',
          actor_id: 'admin_1',
          action: 'publish',
          metadata: { ip: '127.0.0.1' }
        })
      ]);
    });

    it('should default metadata to empty object', async () => {
      await eventStreamingService.logAuditEntry({
        eventId: 'evt_1',
        topic: 'user.created',
        actorId: 'admin_1',
        action: 'publish'
      });

      const data = zerodbService.insertRows.mock.calls[0][1][0];
      expect(data.metadata).toEqual({});
    });
  });

  // ── logWebhookDelivery ──
  describe('logWebhookDelivery', () => {
    it('should insert delivery log with success status', async () => {
      await eventStreamingService.logWebhookDelivery('wh_1', { topic: 'user.created' }, 'success');

      expect(zerodbService.insertRows).toHaveBeenCalledWith('webhook_delivery_log', [
        expect.objectContaining({
          webhook_id: 'wh_1',
          topic: 'user.created',
          status: 'success',
          error: null
        })
      ]);
    });

    it('should include error message when status is failed', async () => {
      await eventStreamingService.logWebhookDelivery('wh_1', { topic: 'user.created' }, 'failed', 'Timeout');

      const data = zerodbService.insertRows.mock.calls[0][1][0];
      expect(data.status).toBe('failed');
      expect(data.error).toBe('Timeout');
    });
  });
});
