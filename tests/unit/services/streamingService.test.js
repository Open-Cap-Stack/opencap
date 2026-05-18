/**
 * Unit Tests for StreamingService
 *
 * Tests event publishing, batch processing, analytics, and buffer management.
 * ZeroDB calls are mocked; the EventEmitter is tested directly.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  publishEvent: jest.fn(),
  listEvents: jest.fn(),
  projectId: 'mock-project-id'
}));

const zerodbService = require('../../../services/zerodbService');
// Require service AFTER mocks are registered (singleton exported as instance)
const streamingService = require('../../../services/streamingService');

describe('StreamingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.publishEvent.mockResolvedValue({ event_id: 'evt-1', published: true });
    zerodbService.listEvents.mockResolvedValue([]);
    // Clear event buffer between tests
    streamingService.eventBuffer = [];
  });

  // ---------------------------------------------------------------------------
  // Constructor / initial state
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('exposes expected topic constants', () => {
      const topics = streamingService.topics;
      expect(topics.FINANCIAL_TRANSACTION).toBe('financial_transaction');
      expect(topics.USER_ACTIVITY).toBe('user_activity');
      expect(topics.DOCUMENT_ACTIVITY).toBe('document_activity');
      expect(topics.COMPLIANCE_EVENT).toBe('compliance_event');
      expect(topics.WORKFLOW_STATE).toBe('workflow_state');
      expect(topics.SYSTEM_ALERT).toBe('system_alert');
      expect(topics.SPV_ACTIVITY).toBe('spv_activity');
      expect(topics.NOTIFICATION).toBe('notification');
    });

    it('initializes eventBuffer as empty array', () => {
      expect(Array.isArray(streamingService.eventBuffer)).toBe(true);
    });

    it('sets maxBufferSize to 1000', () => {
      expect(streamingService.maxBufferSize).toBe(1000);
    });

    it('sets batchSize to 10', () => {
      expect(streamingService.batchSize).toBe(10);
    });

    it('sets flushInterval to 5000ms', () => {
      expect(streamingService.flushInterval).toBe(5000);
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------
  describe('initialize', () => {
    it('calls zerodbService.initialize with provided token', async () => {
      zerodbService.initialize.mockResolvedValue(undefined);
      await streamingService.initialize('jwt-token-123');

      expect(zerodbService.initialize).toHaveBeenCalledWith('jwt-token-123');
    });

    it('rethrows errors from zerodbService.initialize', async () => {
      zerodbService.initialize.mockRejectedValue(new Error('Init error'));
      await expect(streamingService.initialize('bad-token')).rejects.toThrow('Init error');
    });
  });

  // ---------------------------------------------------------------------------
  // publishEvent — buffered (default)
  // ---------------------------------------------------------------------------
  describe('publishEvent (buffered)', () => {
    it('adds event to buffer and returns buffered status', async () => {
      const result = await streamingService.publishEvent('test_topic', {
        action: 'click', timestamp: new Date().toISOString()
      });

      expect(result.status).toBe('buffered');
      expect(result.topic).toBe('test_topic');
      expect(streamingService.eventBuffer).toHaveLength(1);
    });

    it('emits "event" on buffered publish', async () => {
      const emittedEvents = [];
      streamingService.once('event', e => emittedEvents.push(e));

      await streamingService.publishEvent('some_topic', { data: 'value' });

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].topic).toBe('some_topic');
    });

    it('trims buffer when it exceeds maxBufferSize', async () => {
      // Pre-fill with maxBufferSize events
      streamingService.eventBuffer = new Array(streamingService.maxBufferSize).fill({
        topic: 't', eventPayload: {}, timestamp: Date.now()
      });

      await streamingService.publishEvent('new_topic', { data: 'new' });

      expect(streamingService.eventBuffer.length).toBe(streamingService.maxBufferSize);
    });
  });

  // ---------------------------------------------------------------------------
  // publishEvent — immediate (batch = false)
  // ---------------------------------------------------------------------------
  describe('publishEvent (immediate)', () => {
    it('calls zerodbService.publishEvent immediately when batch is false', async () => {
      const mockResult = { event_id: 'evt-imm', published: true };
      zerodbService.publishEvent.mockResolvedValue(mockResult);

      const result = await streamingService.publishEvent(
        'immediate_topic', { data: 'now' }, false
      );

      expect(zerodbService.publishEvent).toHaveBeenCalledWith('immediate_topic', { data: 'now' });
      expect(result).toEqual(mockResult);
    });

    it('emits "event" with published flag on immediate publish', async () => {
      zerodbService.publishEvent.mockResolvedValue({ event_id: 'e1' });
      const emitted = [];
      streamingService.once('event', e => emitted.push(e));

      await streamingService.publishEvent('imm_topic', {}, false);

      expect(emitted[0].published).toBe(true);
    });

    it('emits "error" and rethrows when immediate publish fails', async () => {
      zerodbService.publishEvent.mockRejectedValue(new Error('Publish failed'));
      const errors = [];
      streamingService.once('error', e => errors.push(e));

      await expect(
        streamingService.publishEvent('fail_topic', {}, false)
      ).rejects.toThrow('Publish failed');

      expect(errors).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // publishFinancialTransaction
  // ---------------------------------------------------------------------------
  describe('publishFinancialTransaction', () => {
    it('publishes to financial_transaction topic with correct payload shape', async () => {
      const transaction = {
        id: 'txn-123', type: 'income', amount: 500, currency: 'USD',
        companyId: 'co-1', category: 'revenue', status: 'completed'
      };

      await streamingService.publishFinancialTransaction(transaction, 'user-1');

      expect(streamingService.eventBuffer).toHaveLength(1);
      const buffered = streamingService.eventBuffer[0];
      expect(buffered.topic).toBe('financial_transaction');
      expect(buffered.eventPayload.transaction_id).toBe('txn-123');
      expect(buffered.eventPayload.user_id).toBe('user-1');
      expect(buffered.eventPayload.amount).toBe(500);
      expect(buffered.eventPayload.metadata.company_id).toBe('co-1');
    });

    it('includes timestamp in the published payload', async () => {
      await streamingService.publishFinancialTransaction({ id: 't1', type: 'expense', amount: 100 }, 'u1');

      const payload = streamingService.eventBuffer[0].eventPayload;
      // timestamp is an ISO string — verify it is a valid date string
      expect(typeof payload.timestamp).toBe('string');
      expect(new Date(payload.timestamp).getTime()).not.toBeNaN();
    });
  });

  // ---------------------------------------------------------------------------
  // publishUserActivity
  // ---------------------------------------------------------------------------
  describe('publishUserActivity', () => {
    it('publishes to user_activity topic with correct payload shape', async () => {
      await streamingService.publishUserActivity('user-2', 'login', {
        sessionId: 'sess-1', ipAddress: '10.0.0.1', page: '/dashboard'
      });

      const buffered = streamingService.eventBuffer[0];
      expect(buffered.topic).toBe('user_activity');
      expect(buffered.eventPayload.user_id).toBe('user-2');
      expect(buffered.eventPayload.action).toBe('login');
      expect(buffered.eventPayload.session_id).toBe('sess-1');
      expect(buffered.eventPayload.metadata.page).toBe('/dashboard');
    });

    it('defaults success metadata to true when not explicitly false', async () => {
      await streamingService.publishUserActivity('u1', 'view', {});
      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(payload.metadata.success).toBe(true);
    });

    it('records success as false when context.success is false', async () => {
      await streamingService.publishUserActivity('u1', 'export', { success: false });
      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(payload.metadata.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // publishDocumentActivity
  // ---------------------------------------------------------------------------
  describe('publishDocumentActivity', () => {
    it('publishes to document_activity topic with correct payload', async () => {
      await streamingService.publishDocumentActivity('doc-1', 'user-1', 'view', {
        documentType: 'pdf', fileSize: 1024, accessLevel: 'public'
      });

      const buffered = streamingService.eventBuffer[0];
      expect(buffered.topic).toBe('document_activity');
      expect(buffered.eventPayload.document_id).toBe('doc-1');
      expect(buffered.eventPayload.action).toBe('view');
      expect(buffered.eventPayload.metadata.document_type).toBe('pdf');
    });
  });

  // ---------------------------------------------------------------------------
  // publishComplianceEvent
  // ---------------------------------------------------------------------------
  describe('publishComplianceEvent', () => {
    it('publishes to compliance_event topic with severity and rule details', async () => {
      await streamingService.publishComplianceEvent('check-1', 'failed', {
        severity: 'high', ruleId: 'rule-sox-1', entityType: 'document', entityId: 'doc-5'
      });

      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(streamingService.eventBuffer[0].topic).toBe('compliance_event');
      expect(payload.status).toBe('failed');
      expect(payload.severity).toBe('high');
      expect(payload.rule_id).toBe('rule-sox-1');
    });

    it('defaults severity to "medium" when not provided', async () => {
      await streamingService.publishComplianceEvent('check-2', 'warning', {});
      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(payload.severity).toBe('medium');
    });
  });

  // ---------------------------------------------------------------------------
  // publishWorkflowStateChange
  // ---------------------------------------------------------------------------
  describe('publishWorkflowStateChange', () => {
    it('publishes to workflow_state topic with state transition data', async () => {
      await streamingService.publishWorkflowStateChange(
        'wf-1', 'pending', 'approved', 'user-3',
        { workflowType: 'equity_grant', entityId: 'grant-99', reason: 'approved by board' }
      );

      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(streamingService.eventBuffer[0].topic).toBe('workflow_state');
      expect(payload.workflow_id).toBe('wf-1');
      expect(payload.from_state).toBe('pending');
      expect(payload.to_state).toBe('approved');
      expect(payload.user_id).toBe('user-3');
      expect(payload.metadata.workflow_type).toBe('equity_grant');
    });

    it('defaults automatic to false when not provided in context', async () => {
      await streamingService.publishWorkflowStateChange('wf-2', 'a', 'b', 'u1', {});
      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(payload.metadata.automatic).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // publishSPVActivity
  // ---------------------------------------------------------------------------
  describe('publishSPVActivity', () => {
    it('publishes to spv_activity topic with SPV details', async () => {
      await streamingService.publishSPVActivity('spv-1', 'capital_call', 'user-4', {
        amount: 500000, currency: 'USD', investorCount: 10, status: 'pending'
      });

      const buffered = streamingService.eventBuffer[0];
      expect(buffered.topic).toBe('spv_activity');
      expect(buffered.eventPayload.spv_id).toBe('spv-1');
      expect(buffered.eventPayload.activity).toBe('capital_call');
      expect(buffered.eventPayload.metadata.amount).toBe(500000);
    });
  });

  // ---------------------------------------------------------------------------
  // publishSystemAlert
  // ---------------------------------------------------------------------------
  describe('publishSystemAlert', () => {
    it('publishes to system_alert topic with severity and message', async () => {
      await streamingService.publishSystemAlert('disk_full', 'critical', 'Disk usage at 95%', {
        component: 'storage', errorCode: 'DISK_001'
      });

      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(streamingService.eventBuffer[0].topic).toBe('system_alert');
      expect(payload.alert_type).toBe('disk_full');
      expect(payload.severity).toBe('critical');
      expect(payload.message).toBe('Disk usage at 95%');
      expect(payload.metadata.component).toBe('storage');
    });
  });

  // ---------------------------------------------------------------------------
  // publishNotification
  // ---------------------------------------------------------------------------
  describe('publishNotification', () => {
    it('publishes to notification topic with all required fields', async () => {
      await streamingService.publishNotification(
        'user-5', 'alert', 'Equity Grant Approved', 'Your equity grant has been approved.',
        { priority: 'high', category: 'equity', actionUrl: '/equity/grants/1' }
      );

      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(streamingService.eventBuffer[0].topic).toBe('notification');
      expect(payload.user_id).toBe('user-5');
      expect(payload.type).toBe('alert');
      expect(payload.title).toBe('Equity Grant Approved');
      expect(payload.metadata.priority).toBe('high');
    });

    it('defaults priority to "normal" when not provided', async () => {
      await streamingService.publishNotification('u1', 'info', 'Title', 'Msg', {});
      const payload = streamingService.eventBuffer[0].eventPayload;
      expect(payload.metadata.priority).toBe('normal');
    });
  });

  // ---------------------------------------------------------------------------
  // flushEventBuffer
  // ---------------------------------------------------------------------------
  describe('flushEventBuffer', () => {
    it('does nothing when buffer is empty', async () => {
      streamingService.eventBuffer = [];
      await streamingService.flushEventBuffer();
      expect(zerodbService.publishEvent).not.toHaveBeenCalled();
    });

    it('flushes up to batchSize events', async () => {
      // Add 15 events to the buffer
      for (let i = 0; i < 15; i++) {
        streamingService.eventBuffer.push({
          topic: 'test', eventPayload: { id: i }, timestamp: Date.now()
        });
      }
      zerodbService.publishEvent.mockResolvedValue({ event_id: 'e1' });

      await streamingService.flushEventBuffer();

      // Should have published exactly batchSize (10) events
      expect(zerodbService.publishEvent).toHaveBeenCalledTimes(10);
      // Remaining 5 stay in buffer
      expect(streamingService.eventBuffer).toHaveLength(5);
    });

    it('puts failed events back at the front of the buffer for retry', async () => {
      streamingService.eventBuffer.push({
        topic: 'fail_topic', eventPayload: { id: 'fail' }, timestamp: Date.now()
      });
      zerodbService.publishEvent.mockRejectedValue(new Error('Publish error'));

      const errors = [];
      streamingService.on('error', e => errors.push(e));

      await streamingService.flushEventBuffer();

      // Failed event should be back in buffer
      expect(streamingService.eventBuffer).toHaveLength(1);
      expect(errors).toHaveLength(1);
      streamingService.removeAllListeners('error');
    });

    it('emits "event" for each successfully flushed event', async () => {
      streamingService.eventBuffer.push(
        { topic: 'topic_a', eventPayload: { n: 1 }, timestamp: Date.now() },
        { topic: 'topic_b', eventPayload: { n: 2 }, timestamp: Date.now() }
      );
      zerodbService.publishEvent.mockResolvedValue({ event_id: 'ok' });

      const emitted = [];
      streamingService.on('event', e => emitted.push(e));

      await streamingService.flushEventBuffer();

      expect(emitted).toHaveLength(2);
      streamingService.removeAllListeners('event');
    });

    it('handles a mix of successes and failures in the same batch', async () => {
      streamingService.eventBuffer.push(
        { topic: 'ok', eventPayload: { n: 1 }, timestamp: Date.now() },
        { topic: 'fail', eventPayload: { n: 2 }, timestamp: Date.now() }
      );

      zerodbService.publishEvent
        .mockResolvedValueOnce({ event_id: 'e1' })
        .mockRejectedValueOnce(new Error('Partial failure'));

      streamingService.on('error', () => {}); // prevent unhandled error

      await streamingService.flushEventBuffer();

      // The failed event should be back in buffer; successful one is gone
      expect(streamingService.eventBuffer).toHaveLength(1);
      expect(streamingService.eventBuffer[0].topic).toBe('fail');
      streamingService.removeAllListeners('error');
    });
  });

  // ---------------------------------------------------------------------------
  // forceFlush
  // ---------------------------------------------------------------------------
  describe('forceFlush', () => {
    it('flushes all events in multiple passes', async () => {
      // Add 25 events (> 2 * batchSize = 20, needs 3 passes)
      for (let i = 0; i < 25; i++) {
        streamingService.eventBuffer.push({ topic: 't', eventPayload: { i }, timestamp: Date.now() });
      }
      zerodbService.publishEvent.mockResolvedValue({ event_id: 'e' });

      await streamingService.forceFlush();

      expect(streamingService.eventBuffer).toHaveLength(0);
      expect(zerodbService.publishEvent).toHaveBeenCalledTimes(25);
    });

    it('is a no-op when buffer is already empty', async () => {
      streamingService.eventBuffer = [];
      await streamingService.forceFlush();
      expect(zerodbService.publishEvent).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getBufferStatus
  // ---------------------------------------------------------------------------
  describe('getBufferStatus', () => {
    it('returns correct buffer status fields', () => {
      streamingService.eventBuffer = [{ topic: 't', eventPayload: {}, timestamp: Date.now() }];

      const status = streamingService.getBufferStatus();

      expect(status.buffered_events).toBe(1);
      expect(status.max_buffer_size).toBe(1000);
      expect(status.batch_size).toBe(10);
      expect(status.flush_interval_ms).toBe(5000);
    });

    it('shows 0 buffered_events on empty buffer', () => {
      streamingService.eventBuffer = [];
      expect(streamingService.getBufferStatus().buffered_events).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getEvents
  // ---------------------------------------------------------------------------
  describe('getEvents', () => {
    it('delegates to zerodbService.listEvents with topic, skip, limit', async () => {
      const mockEvents = [{ event_id: 'e1' }, { event_id: 'e2' }];
      zerodbService.listEvents.mockResolvedValue(mockEvents);

      const result = await streamingService.getEvents('user_activity', 50, 10);

      expect(zerodbService.listEvents).toHaveBeenCalledWith('user_activity', 10, 50);
      expect(result).toEqual(mockEvents);
    });

    it('rethrows errors from zerodbService.listEvents', async () => {
      zerodbService.listEvents.mockRejectedValue(new Error('List error'));
      await expect(streamingService.getEvents('topic')).rejects.toThrow('List error');
    });
  });

  // ---------------------------------------------------------------------------
  // getAnalytics
  // ---------------------------------------------------------------------------
  describe('getAnalytics', () => {
    it('returns analytics object with topic and time_range', async () => {
      zerodbService.listEvents.mockResolvedValue([]);

      const result = await streamingService.getAnalytics('user_activity', '24h');

      expect(result.topic).toBe('user_activity');
      expect(result.time_range).toBe('24h');
      expect(result.total_events).toBe(0);
    });

    it('filters events by timeRange', async () => {
      const recentEvent = {
        event_id: 'e1',
        published_at: new Date().toISOString(),
        event_payload: { user_id: 'u1', action: 'login' }
      };
      const oldEvent = {
        event_id: 'e2',
        published_at: new Date('2020-01-01').toISOString(),
        event_payload: { user_id: 'u2', action: 'logout' }
      };
      zerodbService.listEvents.mockResolvedValue([recentEvent, oldEvent]);

      const result = await streamingService.getAnalytics('user_activity', '1h');

      expect(result.total_events).toBe(1);
    });

    it('rethrows errors from getEvents', async () => {
      zerodbService.listEvents.mockRejectedValue(new Error('Analytics error'));
      await expect(streamingService.getAnalytics('topic', '24h')).rejects.toThrow('Analytics error');
    });
  });

  // ---------------------------------------------------------------------------
  // calculateEventsPerHour
  // ---------------------------------------------------------------------------
  describe('calculateEventsPerHour', () => {
    it('returns empty object for empty events array', () => {
      expect(streamingService.calculateEventsPerHour([])).toEqual({});
    });

    it('counts events grouped by hour', () => {
      const events = [
        { published_at: '2024-01-15T10:05:00Z' },
        { published_at: '2024-01-15T10:55:00Z' },
        { published_at: '2024-01-15T11:30:00Z' }
      ];
      const result = streamingService.calculateEventsPerHour(events);

      expect(result['2024-01-15T10']).toBe(2);
      expect(result['2024-01-15T11']).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getTopUsers
  // ---------------------------------------------------------------------------
  describe('getTopUsers', () => {
    it('returns empty array for events without user_id', () => {
      const events = [{ event_payload: {} }, { event_payload: {} }];
      expect(streamingService.getTopUsers(events)).toEqual([]);
    });

    it('returns users sorted by event count descending', () => {
      const events = [
        { event_payload: { user_id: 'u1' } },
        { event_payload: { user_id: 'u1' } },
        { event_payload: { user_id: 'u2' } }
      ];
      const result = streamingService.getTopUsers(events);

      expect(result[0].user_id).toBe('u1');
      expect(result[0].event_count).toBe(2);
      expect(result[1].user_id).toBe('u2');
      expect(result[1].event_count).toBe(1);
    });

    it('returns at most 10 users', () => {
      const events = [];
      for (let i = 0; i < 15; i++) {
        events.push({ event_payload: { user_id: `user-${i}` } });
      }
      const result = streamingService.getTopUsers(events);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  // ---------------------------------------------------------------------------
  // getEventDistribution
  // ---------------------------------------------------------------------------
  describe('getEventDistribution', () => {
    it('returns empty object for events without action or type', () => {
      const events = [{ event_payload: {} }];
      const result = streamingService.getEventDistribution(events);
      expect(result.unknown).toBe(1);
    });

    it('counts events by action', () => {
      const events = [
        { event_payload: { action: 'login' } },
        { event_payload: { action: 'login' } },
        { event_payload: { action: 'logout' } }
      ];
      const result = streamingService.getEventDistribution(events);
      expect(result.login).toBe(2);
      expect(result.logout).toBe(1);
    });

    it('uses type when action is absent', () => {
      const events = [
        { event_payload: { type: 'income' } },
        { event_payload: { type: 'expense' } }
      ];
      const result = streamingService.getEventDistribution(events);
      expect(result.income).toBe(1);
      expect(result.expense).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // cleanup
  // ---------------------------------------------------------------------------
  describe('cleanup', () => {
    it('clears the interval and removes all listeners', () => {
      const removeAllListenersSpy = jest.spyOn(streamingService, 'removeAllListeners');

      streamingService.cleanup();

      expect(streamingService.intervalId).toBeNull();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      removeAllListenersSpy.mockRestore();
    });
  });
});
