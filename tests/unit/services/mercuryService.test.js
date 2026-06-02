/**
 * Mercury Banking Service Unit Tests
 * Issues #671, #672, #673: Mercury banking integration
 * TDD: Tests for token retrieval, API calls, rate limiting, and auto-refresh
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock ZeroDB service
jest.mock('../../../services/zerodbService', () => ({
  queryRows: jest.fn(),
  insertRow: jest.fn(),
  updateRows: jest.fn(),
}));

// Mock token encryption module so it doesn't interfere
jest.mock('../../../utils/tokenEncryption', () => ({
  encrypt: jest.fn((t) => t),
  decrypt: jest.fn((t) => t),
}));

// Mock axios with factory that preserves real post/get signatures
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  get: mockAxiosGet,
  post: mockAxiosPost,
  create: jest.fn(() => ({ get: mockAxiosGet, post: mockAxiosPost })),
}));

const zerodbService = require('../../../services/zerodbService');
const mercuryService = require('../../../services/mercuryService');

// Helper: set up zerodbService.queryRows to return a valid non-expired token
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

describe('MercuryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosGet.mockResolvedValue({ data: {} });
    mockAxiosPost.mockResolvedValue({ data: {} });
    mercuryService._resetRateLimiter && mercuryService._resetRateLimiter();
  });

  // -----------------------------------------------------------------------
  // _getToken — token retrieval from integrations table
  // -----------------------------------------------------------------------
  describe('_getToken', () => {
    it('should retrieve Mercury token from integrations table', async () => {
      mockValidToken('mercury_tok_abc');

      const token = await mercuryService._getToken('user_123');
      expect(token).toBe('mercury_tok_abc');
      expect(zerodbService.queryRows).toHaveBeenCalledWith(
        'integrations',
        { userId: 'user_123', provider: 'mercury' },
        { limit: 1 }
      );
    });

    it('should throw when no Mercury integration exists', async () => {
      zerodbService.queryRows.mockResolvedValue({ data: [] });

      await expect(mercuryService._getToken('user_999'))
        .rejects.toThrow('Mercury not connected');
    });

    it('should auto-refresh when token is expired', async () => {
      const expiredDate = new Date(Date.now() - 120000).toISOString();
      zerodbService.queryRows.mockResolvedValue({
        data: [{
          row_id: 'int_1',
          row_data: {
            userId: 'user_123',
            provider: 'mercury',
            accessToken: 'mercury_tok_old',
            refreshToken: 'mercury_ref_xyz',
            tokenExpiry: expiredDate,
          },
        }],
      });

      mockAxiosPost.mockResolvedValue({
        data: {
          access_token: 'mercury_tok_new',
          refresh_token: 'mercury_ref_new',
          expires_in: 3600,
        },
      });

      zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });

      const token = await mercuryService._getToken('user_123');
      expect(token).toBe('mercury_tok_new');
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('mercury.com/oauth/token'),
        expect.objectContaining({
          grant_type: 'refresh_token',
          refresh_token: 'mercury_ref_xyz',
        })
      );
    });

    it('should throw when refresh fails and no refresh_token exists', async () => {
      const expiredDate = new Date(Date.now() - 120000).toISOString();
      zerodbService.queryRows.mockResolvedValue({
        data: [{
          row_id: 'int_1',
          row_data: {
            userId: 'user_123',
            provider: 'mercury',
            accessToken: 'mercury_tok_old',
            refreshToken: null,
            tokenExpiry: expiredDate,
          },
        }],
      });

      await expect(mercuryService._getToken('user_123'))
        .rejects.toThrow('Mercury token expired');
    });
  });

  // -----------------------------------------------------------------------
  // getAccounts
  // -----------------------------------------------------------------------
  describe('getAccounts', () => {
    it('should fetch accounts from Mercury API', async () => {
      const mockAccounts = {
        accounts: [
          { id: 'acc_1', name: 'Checking', currentBalance: 125000.50 },
          { id: 'acc_2', name: 'Savings', currentBalance: 500000 },
        ],
      };

      mockValidToken('mercury_tok_abc');
      mockAxiosGet.mockResolvedValue({ data: mockAccounts });

      const result = await mercuryService.getAccounts('user_123');
      expect(result).toEqual(mockAccounts);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/accounts',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-token:mercury_mercury_tok_abc',
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // getBalance
  // -----------------------------------------------------------------------
  describe('getBalance', () => {
    it('should fetch balance for a specific account', async () => {
      const mockAccount = { id: 'acc_1', name: 'Checking', currentBalance: 125000.50 };

      mockValidToken('mercury_tok_abc');
      mockAxiosGet.mockResolvedValue({ data: mockAccount });

      const result = await mercuryService.getBalance('user_123', 'acc_1');
      expect(result).toEqual(mockAccount);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/accounts/acc_1',
        expect.anything()
      );
    });

    it('should throw when accountId is missing', async () => {
      await expect(mercuryService.getBalance('user_123', null))
        .rejects.toThrow('accountId is required');
    });
  });

  // -----------------------------------------------------------------------
  // getTransactions
  // -----------------------------------------------------------------------
  describe('getTransactions', () => {
    it('should fetch transactions with query params', async () => {
      const mockTxns = {
        transactions: [
          { id: 'txn_1', amount: -5000, counterpartyName: 'AWS' },
          { id: 'txn_2', amount: -2500, counterpartyName: 'Gusto' },
        ],
      };

      mockValidToken('mercury_tok_abc');
      mockAxiosGet.mockResolvedValue({ data: mockTxns });

      const params = { accountId: 'acc_1', limit: 50, offset: 0 };
      const result = await mercuryService.getTransactions('user_123', params);
      expect(result).toEqual(mockTxns);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/accounts/acc_1/transactions',
        expect.objectContaining({
          params: { limit: 50, offset: 0 },
        })
      );
    });

    it('should throw when accountId is missing in params', async () => {
      await expect(mercuryService.getTransactions('user_123', {}))
        .rejects.toThrow('accountId is required');
    });
  });

  // -----------------------------------------------------------------------
  // getStatements
  // -----------------------------------------------------------------------
  describe('getStatements', () => {
    it('should fetch statements for an account', async () => {
      const mockStatements = {
        statements: [
          { id: 'stmt_1', month: '2026-04', url: 'https://...' },
        ],
      };

      mockValidToken('mercury_tok_abc');
      mockAxiosGet.mockResolvedValue({ data: mockStatements });

      const result = await mercuryService.getStatements('user_123', 'acc_1');
      expect(result).toEqual(mockStatements);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/accounts/acc_1/statements',
        expect.anything()
      );
    });
  });

  // -----------------------------------------------------------------------
  // verifyPayment
  // -----------------------------------------------------------------------
  describe('verifyPayment', () => {
    it('should find a matching wire transfer', async () => {
      mockValidToken('mercury_tok_abc');

      // First call: getAccounts
      mockAxiosGet.mockResolvedValueOnce({
        data: { accounts: [{ id: 'acc_1' }] },
      });
      // Second call: getTransactions (called internally via getTransactions which calls _getToken again + _mercuryGet)
      // _getToken will be called again, so we need queryRows to return valid token again
      zerodbService.queryRows.mockResolvedValue({
        data: [{
          row_id: 'int_1',
          row_data: {
            userId: 'user_123',
            provider: 'mercury',
            accessToken: 'mercury_tok_abc',
            refreshToken: 'mercury_ref_xyz',
            tokenExpiry: new Date(Date.now() + 3600000).toISOString(),
          },
        }],
      });
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'txn_1', amount: 50000, kind: 'externalTransfer', status: 'sent', createdAt: '2026-05-20T10:00:00Z' },
            { id: 'txn_2', amount: 25000, kind: 'externalTransfer', status: 'sent', createdAt: '2026-05-21T10:00:00Z' },
          ],
        },
      });

      const result = await mercuryService.verifyPayment('user_123', 50000, '2026-05-15');
      expect(result.found).toBe(true);
      expect(result.transaction.id).toBe('txn_1');
    });

    it('should return found=false when no matching wire exists', async () => {
      mockValidToken('mercury_tok_abc');
      // getAccounts
      mockAxiosGet.mockResolvedValueOnce({
        data: { accounts: [{ id: 'acc_1' }] },
      });
      // getTransactions
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'txn_1', amount: 10000, kind: 'externalTransfer', status: 'sent', createdAt: '2026-05-20T10:00:00Z' },
          ],
        },
      });

      const result = await mercuryService.verifyPayment('user_123', 99999, '2026-05-15');
      expect(result.found).toBe(false);
      expect(result.transaction).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------
  describe('rate limiting', () => {
    it('should track request count', () => {
      expect(mercuryService._getRateLimitRemaining()).toBeLessThanOrEqual(100);
    });

    it('should expose rate limit status', () => {
      const status = mercuryService._getRateLimitStatus();
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('limit', 100);
      expect(status).toHaveProperty('windowMs');
    });
  });

  // -----------------------------------------------------------------------
  // _mercuryGet — internal HTTP helper
  // -----------------------------------------------------------------------
  describe('_mercuryGet', () => {
    it('should make authenticated GET request to Mercury API', async () => {
      mockAxiosGet.mockResolvedValue({ data: { accounts: [] } });

      const result = await mercuryService._mercuryGet('mercury_tok_abc', '/accounts');
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/accounts',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-token:mercury_mercury_tok_abc',
          }),
        })
      );
      expect(result).toEqual({ accounts: [] });
    });

    it('should pass query params when provided', async () => {
      mockAxiosGet.mockResolvedValue({ data: { transactions: [] } });

      await mercuryService._mercuryGet('tok', '/accounts/acc_1/transactions', { limit: 10 });
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.mercury.com/api/v1/accounts/acc_1/transactions',
        expect.objectContaining({
          params: { limit: 10 },
        })
      );
    });

    it('should throw on 401 with descriptive message', async () => {
      mockAxiosGet.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      await expect(mercuryService._mercuryGet('bad_tok', '/accounts'))
        .rejects.toThrow('Mercury API authentication failed');
    });

    it('should throw on rate limit (429)', async () => {
      mockAxiosGet.mockRejectedValue({
        response: { status: 429, data: { message: 'Rate limited' } },
      });

      await expect(mercuryService._mercuryGet('tok', '/accounts'))
        .rejects.toThrow('Mercury API rate limit exceeded');
    });
  });
});
