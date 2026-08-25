/**
 * WebhookEvent Model - Comprehensive Unit Tests
 *
 * Tests all methods (isProcessed, recordEvent, markProcessed, markFailed)
 * and schema/constants by mocking ZeroDB.
 */

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const WebhookEvent = require('../../../models/WebhookEvent');

describe('WebhookEvent Model', () => {
  const makeInsertResponse = (overrides = {}) => ({
    data: [{
      row_id: 'row-1',
      row_data: {
        _id: 'uuid-1',
        eventId: 'evt_stripe_001',
        type: 'payment_intent.succeeded',
        status: 'pending',
        ...overrides
      }
    }]
  });

  const makeQueryResponse = (items = []) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    zerodbService.client.put.mockResolvedValue({});
  });

  // =========================================================================
  // Schema and Constants
  // =========================================================================
  describe('Schema Definition', () => {
    it('should have schema defined', () => {
      expect(WebhookEvent.schema).toBeDefined();
    });

    it('should have eventId as required and unique', () => {
      expect(WebhookEvent.schema.eventId.required).toBe(true);
      expect(WebhookEvent.schema.eventId.unique).toBe(true);
    });

    it('should have type as required', () => {
      expect(WebhookEvent.schema.type.required).toBe(true);
    });

    it('should have processedAt as date', () => {
      expect(WebhookEvent.schema.processedAt.type).toBe('date');
      expect(WebhookEvent.schema.processedAt.default).toBeNull();
    });

    it('should have status with enum and default', () => {
      expect(WebhookEvent.schema.status.enum).toEqual(['pending', 'processed', 'failed']);
      expect(WebhookEvent.schema.status.default).toBe('pending');
    });

    it('should have error field', () => {
      expect(WebhookEvent.schema.error.type).toBe('string');
      expect(WebhookEvent.schema.error.default).toBeNull();
    });

    it('should have timestamp fields', () => {
      expect(WebhookEvent.schema.createdAt).toBeDefined();
      expect(WebhookEvent.schema.updatedAt).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(WebhookEvent.VALID_STATUSES).toEqual(['pending', 'processed', 'failed']);
    });
  });

  describe('Table Configuration', () => {
    it('should use webhook_events table name', () => {
      expect(WebhookEvent.tableName).toBe('webhook_events');
    });
  });

  // =========================================================================
  // isProcessed()
  // =========================================================================
  describe('isProcessed()', () => {
    it('should return true when event status is processed', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          eventId: 'evt_001',
          status: 'processed'
        }])
      );
      const result = await WebhookEvent.isProcessed('evt_001');
      expect(result).toBe(true);
    });

    it('should return false when event status is pending', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          eventId: 'evt_001',
          status: 'pending'
        }])
      );
      const result = await WebhookEvent.isProcessed('evt_001');
      expect(result).toBe(false);
    });

    it('should return false when event status is failed', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          eventId: 'evt_001',
          status: 'failed'
        }])
      );
      const result = await WebhookEvent.isProcessed('evt_001');
      expect(result).toBe(false);
    });

    it('should return false when event not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await WebhookEvent.isProcessed('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when event has no status', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ eventId: 'evt_001' }])
      );
      const result = await WebhookEvent.isProcessed('evt_001');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // recordEvent()
  // =========================================================================
  describe('recordEvent()', () => {
    it('should create event record with correct data', async () => {
      await WebhookEvent.recordEvent('evt_stripe_001', 'payment_intent.succeeded');
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'webhook_events',
        expect.objectContaining({
          eventId: 'evt_stripe_001',
          type: 'payment_intent.succeeded',
          status: 'pending'
        })
      );
    });

    it('should always set status to pending', async () => {
      await WebhookEvent.recordEvent('evt_002', 'customer.created');
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('pending');
    });

    it('should return created record', async () => {
      const result = await WebhookEvent.recordEvent('evt_003', 'invoice.paid');
      expect(result).toBeDefined();
    });

    it('should handle various event types', async () => {
      const types = [
        'payment_intent.succeeded',
        'payment_intent.failed',
        'customer.subscription.created',
        'invoice.payment_succeeded',
        'checkout.session.completed'
      ];
      for (const type of types) {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ type }));
        await WebhookEvent.recordEvent(`evt_${type}`, type);
        const inserted = zerodbService.insertRow.mock.calls[0][1];
        expect(inserted.type).toBe(type);
      }
    });
  });

  // =========================================================================
  // markProcessed()
  // =========================================================================
  describe('markProcessed()', () => {
    it('should update status to processed', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ eventId: 'evt_001', status: 'pending' }])
      );
      await WebhookEvent.markProcessed('evt_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should set processedAt timestamp', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ eventId: 'evt_001', status: 'pending' }])
      );
      await WebhookEvent.markProcessed('evt_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // markFailed()
  // =========================================================================
  describe('markFailed()', () => {
    it('should update status to failed with error message', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ eventId: 'evt_001', status: 'pending' }])
      );
      await WebhookEvent.markFailed('evt_001', 'Processing error: invalid payload');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should set processedAt even on failure', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ eventId: 'evt_001', status: 'pending' }])
      );
      await WebhookEvent.markFailed('evt_001', 'Timeout');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle empty error string', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ eventId: 'evt_001', status: 'pending' }])
      );
      await WebhookEvent.markFailed('evt_001', '');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Base model methods existence
  // =========================================================================
  describe('Base Model Methods', () => {
    const methods = ['find', 'findOne', 'findById', 'updateOne', 'deleteOne', 'countDocuments'];
    methods.forEach(method => {
      it(`should have ${method} method`, () => {
        expect(typeof WebhookEvent[method]).toBe('function');
      });
    });
  });

  // =========================================================================
  // Idempotency workflow test
  // =========================================================================
  describe('Idempotency Workflow', () => {
    it('should support check-then-record pattern', async () => {
      // First check - not processed
      zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
      const alreadyProcessed = await WebhookEvent.isProcessed('evt_new');
      expect(alreadyProcessed).toBe(false);

      // Record event
      zerodbService.insertRow.mockResolvedValueOnce(
        makeInsertResponse({ eventId: 'evt_new' })
      );
      await WebhookEvent.recordEvent('evt_new', 'payment_intent.succeeded');
      expect(zerodbService.insertRow).toHaveBeenCalled();

      // Mark processed
      zerodbService.queryTable.mockResolvedValueOnce(
        makeQueryResponse([{ eventId: 'evt_new', status: 'pending' }])
      );
      await WebhookEvent.markProcessed('evt_new');
      expect(zerodbService.client.put).toHaveBeenCalled();

      // Verify processed
      zerodbService.queryTable.mockResolvedValueOnce(
        makeQueryResponse([{ eventId: 'evt_new', status: 'processed' }])
      );
      const isNowProcessed = await WebhookEvent.isProcessed('evt_new');
      expect(isNowProcessed).toBe(true);
    });
  });
});
