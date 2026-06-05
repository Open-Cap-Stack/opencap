/**
 * Mercury Webhook Controller Unit Tests
 * Issue #678: Mercury webhook handler
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/zerodbService', () => ({
  createTable: jest.fn(),
  insertRow: jest.fn(),
  queryRows: jest.fn(),
}));

const httpMocks = require('node-mocks-http');
const zerodbService = require('../../../services/zerodbService');
const controller = require('../../../controllers/mercuryWebhookController');

describe('MercuryWebhookController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue({ row_id: 'evt-1' });
  });

  describe('handleWebhook', () => {
    it('should return 400 for missing event type', async () => {
      req.body = {};
      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should process transaction.created event', async () => {
      req.body = {
        id: 'evt_1',
        type: 'transaction.created',
        data: { id: 'txn_1', amount: 50000, direction: 'credit' },
      };
      zerodbService.queryRows.mockResolvedValue({ data: [] });

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.received).toBe('transaction.created');
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'mercury_events',
        expect.objectContaining({
          eventType: 'transaction.created',
          amount: 50000,
        })
      );
    });

    it('should match incoming credit to a pending SAFE', async () => {
      req.body = {
        id: 'evt_2',
        type: 'transaction.created',
        data: { id: 'txn_2', amount: 250000, direction: 'credit' },
      };
      zerodbService.queryRows.mockResolvedValue({
        data: [{
          row_data: {
            safeId: 'safe_match',
            investmentAmount: 250000,
            status: 'fully_signed',
          },
        }],
      });

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'mercury_events',
        expect.objectContaining({
          matchedSafeId: 'safe_match',
        })
      );
    });

    it('should process transaction.updated event', async () => {
      req.body = {
        id: 'evt_3',
        type: 'transaction.updated',
        data: { id: 'txn_1', status: 'completed' },
      };

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().received).toBe('transaction.updated');
    });

    it('should process payment.completed event', async () => {
      req.body = {
        id: 'evt_4',
        type: 'payment.completed',
        data: { id: 'pay_1', amount: 5000 },
      };

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().received).toBe('payment.completed');
    });

    it('should process payment.failed event', async () => {
      req.body = {
        id: 'evt_5',
        type: 'payment.failed',
        data: { id: 'pay_2', amount: 3000, failureReason: 'Insufficient funds' },
      };

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().received).toBe('payment.failed');
    });

    it('should handle unrecognized event types gracefully', async () => {
      req.body = {
        id: 'evt_6',
        type: 'account.updated',
        data: { id: 'acc_1' },
      };

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should still return 200 even if DB write fails', async () => {
      zerodbService.insertRow.mockRejectedValue(new Error('DB write failed'));
      req.body = {
        id: 'evt_7',
        type: 'transaction.created',
        data: { id: 'txn_3', amount: 1000, direction: 'debit' },
      };

      await controller.handleWebhook(req, res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('ensureMercuryEventsTable', () => {
    it('should call createTable for mercury_events', async () => {
      zerodbService.createTable.mockResolvedValueOnce({});
      await controller.ensureMercuryEventsTable();
      expect(zerodbService.createTable).toHaveBeenCalledWith(
        'mercury_events',
        expect.objectContaining({ fields: expect.any(Object) })
      );
    });

    it('should not throw when table already exists', async () => {
      zerodbService.createTable.mockRejectedValueOnce({
        response: { status: 409 },
        message: 'already exists',
      });
      await expect(controller.ensureMercuryEventsTable()).resolves.not.toThrow();
    });
  });
});
