/**
 * Mercury Service Payment Methods Unit Tests
 * Issues #676-#678: Mercury payment capabilities
 * TDD: Tests for addRecipient, getRecipients, sendPayment, createInternalTransfer, getTransactionById, _mercuryPost
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/zerodbService', () => ({
  queryRows: jest.fn(),
  insertRow: jest.fn(),
  updateRows: jest.fn(),
}));

jest.mock('../../../utils/tokenEncryption', () => ({
  encrypt: jest.fn((t) => t),
  decrypt: jest.fn((t) => t),
}));

const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  get: mockAxiosGet,
  post: mockAxiosPost,
  create: jest.fn(() => ({ get: mockAxiosGet, post: mockAxiosPost })),
}));

const zerodbService = require('../../../services/zerodbService');
const mercuryService = require('../../../services/mercuryService');

function mockValidToken(accessToken = 'mercury_tok_abc') {
  zerodbService.queryRows.mockResolvedValue({
    data: [{
      row_id: 'int_1',
      row_data: {
        userId: 'user_123',
        provider: 'mercury',
        accessToken,
        refreshToken: 'mercury_ref_xyz',
        tokenExpiry: new Date(Date.now() + 3600000).toISOString(),
      },
    }],
  });
}

describe('MercuryService — Payment Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosGet.mockResolvedValue({ data: {} });
    mockAxiosPost.mockResolvedValue({ data: {} });
    mercuryService._resetRateLimiter && mercuryService._resetRateLimiter();
  });

  // -----------------------------------------------------------------------
  // _mercuryPost
  // -----------------------------------------------------------------------
  describe('_mercuryPost', () => {
    it('should make authenticated POST request to Mercury API', async () => {
      const body = { name: 'Acme Corp' };
      mockAxiosPost.mockResolvedValue({ data: { id: 'rec_1' } });

      const result = await mercuryService._mercuryPost('tok_abc', '/recipients', body);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/recipients',
        body,
        expect.objectContaining({
          auth: { username: 'tok_abc', password: '' },
        })
      );
      expect(result).toEqual({ id: 'rec_1' });
    });

    it('should throw on 401', async () => {
      mockAxiosPost.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      await expect(mercuryService._mercuryPost('bad', '/recipients', {}))
        .rejects.toThrow('Mercury API authentication failed');
    });

    it('should throw on 429 rate limit', async () => {
      mockAxiosPost.mockRejectedValue({
        response: { status: 429, data: {} },
      });

      await expect(mercuryService._mercuryPost('tok', '/recipients', {}))
        .rejects.toThrow('Mercury API rate limit exceeded');
    });
  });

  // -----------------------------------------------------------------------
  // addRecipient
  // -----------------------------------------------------------------------
  describe('addRecipient', () => {
    it('should create a payment recipient', async () => {
      mockValidToken();
      const recipientData = { name: 'Vendor Inc', email: 'pay@vendor.com', accountNumber: '123', routingNumber: '456', type: 'business' };
      mockAxiosPost.mockResolvedValue({ data: { id: 'rec_1', ...recipientData } });

      const result = await mercuryService.addRecipient('user_123', recipientData);
      expect(result).toHaveProperty('id', 'rec_1');
    });

    it('should throw when recipientData is missing name', async () => {
      await expect(mercuryService.addRecipient('user_123', { email: 'x@y.com' }))
        .rejects.toThrow('recipientData with name is required');
    });

    it('should throw when recipientData is null', async () => {
      await expect(mercuryService.addRecipient('user_123', null))
        .rejects.toThrow('recipientData with name is required');
    });
  });

  // -----------------------------------------------------------------------
  // getRecipients
  // -----------------------------------------------------------------------
  describe('getRecipients', () => {
    it('should list all recipients', async () => {
      mockValidToken();
      const mockRecipients = { recipients: [{ id: 'rec_1', name: 'Vendor' }] };
      mockAxiosGet.mockResolvedValue({ data: mockRecipients });

      const result = await mercuryService.getRecipients('user_123');
      expect(result).toEqual(mockRecipients);
    });
  });

  // -----------------------------------------------------------------------
  // sendPayment
  // -----------------------------------------------------------------------
  describe('sendPayment', () => {
    it('should send a payment', async () => {
      mockValidToken();
      const paymentData = { recipientId: 'rec_1', amount: 5000, paymentMethod: 'ach', note: 'Invoice 123' };
      mockAxiosPost.mockResolvedValue({ data: { id: 'pay_1', status: 'pending' } });

      const result = await mercuryService.sendPayment('user_123', paymentData);
      expect(result).toHaveProperty('id', 'pay_1');
    });

    it('should throw when recipientId is missing', async () => {
      await expect(mercuryService.sendPayment('user_123', { amount: 5000 }))
        .rejects.toThrow('paymentData with recipientId and amount is required');
    });

    it('should throw when amount is missing', async () => {
      await expect(mercuryService.sendPayment('user_123', { recipientId: 'rec_1' }))
        .rejects.toThrow('paymentData with recipientId and amount is required');
    });
  });

  // -----------------------------------------------------------------------
  // createInternalTransfer
  // -----------------------------------------------------------------------
  describe('createInternalTransfer', () => {
    it('should create an internal transfer', async () => {
      mockValidToken();
      const transferData = { fromAccountId: 'acc_1', toAccountId: 'acc_2', amount: 10000 };
      mockAxiosPost.mockResolvedValue({ data: { id: 'xfr_1', status: 'completed' } });

      const result = await mercuryService.createInternalTransfer('user_123', transferData);
      expect(result).toHaveProperty('id', 'xfr_1');
    });

    it('should throw when amount is missing', async () => {
      await expect(mercuryService.createInternalTransfer('user_123', { fromAccountId: 'acc_1' }))
        .rejects.toThrow('transferData with amount is required');
    });

    it('should throw when transferData is null', async () => {
      await expect(mercuryService.createInternalTransfer('user_123', null))
        .rejects.toThrow('transferData with amount is required');
    });
  });

  // -----------------------------------------------------------------------
  // getTransactionById
  // -----------------------------------------------------------------------
  describe('getTransactionById', () => {
    it('should fetch a single transaction by ID', async () => {
      mockValidToken();
      const mockTxn = { id: 'txn_abc', amount: -5000, counterpartyName: 'AWS' };
      mockAxiosGet.mockResolvedValue({ data: mockTxn });

      const result = await mercuryService.getTransactionById('user_123', 'txn_abc');
      expect(result).toEqual(mockTxn);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/transactions/txn_abc',
        expect.anything()
      );
    });

    it('should throw when transactionId is missing', async () => {
      await expect(mercuryService.getTransactionById('user_123', null))
        .rejects.toThrow('transactionId is required');
    });
  });
});
