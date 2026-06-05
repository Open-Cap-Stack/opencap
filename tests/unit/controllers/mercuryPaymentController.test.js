/**
 * Mercury Payment Controller Unit Tests
 * Issues #676-#678: Mercury payment capabilities
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/mercuryService');
jest.mock('../../../services/zerodbService', () => ({
  createTable: jest.fn(),
  insertRow: jest.fn(),
  queryRows: jest.fn(),
}));

const httpMocks = require('node-mocks-http');
const mercuryService = require('../../../services/mercuryService');
const controller = require('../../../controllers/mercuryPaymentController');

describe('MercuryPaymentController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_123', role: 'admin' };
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // POST /recipients
  // -----------------------------------------------------------------------
  describe('addRecipient', () => {
    it('should create a recipient and return 201', async () => {
      mercuryService.addRecipient.mockResolvedValue({ id: 'rec_1', name: 'Vendor' });
      req.body = { name: 'Vendor', email: 'pay@vendor.com', type: 'business' };

      await controller.addRecipient(req, res);
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData().success).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      req.body = { email: 'pay@vendor.com' };
      await controller.addRecipient(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 401 when Mercury not connected', async () => {
      mercuryService.addRecipient.mockRejectedValue(new Error('Mercury not connected'));
      req.body = { name: 'Vendor' };
      await controller.addRecipient(req, res);
      expect(res.statusCode).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /recipients
  // -----------------------------------------------------------------------
  describe('getRecipients', () => {
    it('should list recipients', async () => {
      mercuryService.getRecipients.mockResolvedValue({ recipients: [{ id: 'rec_1' }] });
      await controller.getRecipients(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().success).toBe(true);
    });

    it('should return 500 on error', async () => {
      mercuryService.getRecipients.mockRejectedValue(new Error('Network error'));
      await controller.getRecipients(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // POST /payments
  // -----------------------------------------------------------------------
  describe('sendPayment', () => {
    it('should send payment and return 201', async () => {
      mercuryService.sendPayment.mockResolvedValue({ id: 'pay_1', status: 'pending' });
      req.body = { recipientId: 'rec_1', amount: 5000, paymentMethod: 'ach', note: 'Invoice' };

      await controller.sendPayment(req, res);
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData().success).toBe(true);
    });

    it('should return 400 when recipientId is missing', async () => {
      req.body = { amount: 5000 };
      await controller.sendPayment(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when amount is zero', async () => {
      req.body = { recipientId: 'rec_1', amount: 0 };
      await controller.sendPayment(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when amount is negative', async () => {
      req.body = { recipientId: 'rec_1', amount: -100 };
      await controller.sendPayment(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // POST /transfers
  // -----------------------------------------------------------------------
  describe('createTransfer', () => {
    it('should create an internal transfer and return 201', async () => {
      mercuryService.createInternalTransfer.mockResolvedValue({ id: 'xfr_1', status: 'completed' });
      req.body = { fromAccountId: 'acc_1', toAccountId: 'acc_2', amount: 10000 };

      await controller.createTransfer(req, res);
      expect(res.statusCode).toBe(201);
      expect(res._getJSONData().success).toBe(true);
    });

    it('should return 400 when account IDs are missing', async () => {
      req.body = { amount: 10000 };
      await controller.createTransfer(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when amount is missing', async () => {
      req.body = { fromAccountId: 'acc_1', toAccountId: 'acc_2' };
      await controller.createTransfer(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /transactions/:id
  // -----------------------------------------------------------------------
  describe('getTransaction', () => {
    it('should return a transaction by ID', async () => {
      mercuryService.getTransactionById.mockResolvedValue({ id: 'txn_1', amount: -5000 });
      req.params = { id: 'txn_1' };

      await controller.getTransaction(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data.id).toBe('txn_1');
    });

    it('should return 500 on error', async () => {
      mercuryService.getTransactionById.mockRejectedValue(new Error('API error'));
      req.params = { id: 'txn_bad' };

      await controller.getTransaction(req, res);
      expect(res.statusCode).toBe(500);
    });
  });
});
