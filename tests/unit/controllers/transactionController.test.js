/**
 * Unit Tests for Transaction Controller (ZeroDB Migration)
 *
 * Feature: OCAE-18: Migrate Transaction controller to ZeroDB
 * TDD Red Phase: Tests written before implementation
 */

const transactionController = require('../../../controllers/transactionController');
const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

describe('Transaction Controller (ZeroDB)', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-123', role: 'user' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset ZeroDB mock
    zerodbService.queryTable = jest.fn();
    zerodbService.insertRow = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
    zerodbService.countRows = jest.fn();
  });

  describe('createTransaction', () => {
    const validTransactionData = {
      transactionId: 'txn-001',
      userId: 'user-123',
      companyId: 'company-456',
      amount: 1000,
      currency: 'USD',
      type: 'payment',
      status: 'pending',
      description: 'Test transaction'
    };

    it('should create a new transaction successfully', async () => {
      mockReq.body = validTransactionData;
      const createdTransaction = {
        ...validTransactionData,
        id: 'zerodb-id-123',
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow.mockResolvedValue({ rows: [createdTransaction] });

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          transactionId: 'txn-001',
          userId: 'user-123',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        transactionId: 'txn-001'
      }));
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = { amount: 1000 }; // Missing required fields

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should return 400 for invalid currency code', async () => {
      mockReq.body = {
        ...validTransactionData,
        currency: 'INVALID'
      };

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('currency') })
      );
    });

    it('should return 400 for invalid transaction type', async () => {
      mockReq.body = {
        ...validTransactionData,
        type: 'invalid_type'
      };

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('type') })
      );
    });

    it('should return 400 for invalid transaction status', async () => {
      mockReq.body = {
        ...validTransactionData,
        status: 'invalid_status'
      };

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('status') })
      );
    });

    it('should return 400 for negative amount', async () => {
      mockReq.body = {
        ...validTransactionData,
        amount: -100
      };

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('amount') })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.body = validTransactionData;
      zerodbService.insertRow.mockRejectedValue(new Error('ZeroDB connection failed'));

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('getTransaction', () => {
    it('should retrieve a transaction by ID', async () => {
      mockReq.params.id = 'txn-001';
      const mockTransaction = {
        id: 'zerodb-id-123',
        transactionId: 'txn-001',
        userId: 'user-123',
        amount: 1000,
        currency: 'USD',
        type: 'payment',
        status: 'completed'
      };

      zerodbService.queryTable.mockResolvedValue([mockTransaction]);

      await transactionController.getTransaction(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: { transactionId: 'txn-001' }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should return 400 for missing transaction ID', async () => {
      mockReq.params.id = undefined;

      await transactionController.getTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('ID') })
      );
    });

    it('should return 404 when transaction not found', async () => {
      mockReq.params.id = 'non-existent-txn';
      zerodbService.queryTable.mockResolvedValue([]);

      await transactionController.getTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('not found') })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.params.id = 'txn-001';
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query failed'));

      await transactionController.getTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('listTransactions', () => {
    const mockTransactions = [
      { transactionId: 'txn-001', amount: 1000, status: 'completed' },
      { transactionId: 'txn-002', amount: 2000, status: 'pending' }
    ];

    it('should list all transactions with pagination', async () => {
      mockReq.query = { page: 1, limit: 10 };
      zerodbService.queryTable.mockResolvedValue(mockTransactions);

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      // Controller fetches with filter and sort, then paginates in-memory
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: expect.any(Object),
          sort: { createdAt: -1 }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        transactions: expect.any(Array),
        totalCount: expect.any(Number),
        currentPage: 1,
        totalPages: expect.any(Number)
      }));
    });

    it('should filter transactions by companyId', async () => {
      mockReq.query = { companyId: 'company-456' };
      zerodbService.queryTable.mockResolvedValue(mockTransactions);

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: expect.objectContaining({ companyId: 'company-456' })
        })
      );
    });

    it('should filter transactions by status', async () => {
      mockReq.query = { status: 'completed' };
      zerodbService.queryTable.mockResolvedValue([mockTransactions[0]]);

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: expect.objectContaining({ status: 'completed' })
        })
      );
    });

    it('should filter transactions by type', async () => {
      mockReq.query = { type: 'payment' };
      zerodbService.queryTable.mockResolvedValue(mockTransactions);

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'payment' })
        })
      );
    });

    it('should filter transactions by date range in-memory', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      zerodbService.queryTable.mockResolvedValue(mockTransactions);

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      // Controller fetches all matching transactions then filters dates in-memory
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: expect.any(Object),
          sort: { createdAt: -1 }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should sort transactions by date descending by default', async () => {
      zerodbService.queryTable.mockResolvedValue(mockTransactions);

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          sort: { createdAt: -1 }
        })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query failed'));

      await transactionController.listTransactions(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateTransaction', () => {
    const updateData = {
      status: 'completed',
      description: 'Updated description'
    };

    it('should update a transaction successfully', async () => {
      mockReq.params.id = 'txn-001';
      mockReq.body = updateData;

      const existingTransaction = {
        transactionId: 'txn-001',
        status: 'pending',
        amount: 1000
      };

      const updatedTransaction = {
        ...existingTransaction,
        ...updateData
      };

      zerodbService.queryTable.mockResolvedValue([existingTransaction]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'transactions',
        { transactionId: 'txn-001' },
        expect.objectContaining(updateData)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing transaction ID', async () => {
      mockReq.params.id = undefined;
      mockReq.body = updateData;

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when transaction not found', async () => {
      mockReq.params.id = 'non-existent-txn';
      mockReq.body = updateData;
      zerodbService.queryTable.mockResolvedValue([]);

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should not allow updating immutable fields', async () => {
      mockReq.params.id = 'txn-001';
      mockReq.body = {
        transactionId: 'new-id', // Should not be allowed
        amount: 5000 // Should not be allowed after creation
      };

      zerodbService.queryTable.mockResolvedValue([{ transactionId: 'txn-001' }]);

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('immutable') })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.params.id = 'txn-001';
      mockReq.body = updateData;
      zerodbService.queryTable.mockResolvedValue([{ transactionId: 'txn-001' }]);
      zerodbService.updateRows.mockRejectedValue(new Error('ZeroDB update failed'));

      await transactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction successfully', async () => {
      mockReq.params.id = 'txn-001';

      zerodbService.queryTable.mockResolvedValue([{ transactionId: 'txn-001' }]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      await transactionController.deleteTransaction(mockReq, mockRes, mockNext);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'transactions',
        { transactionId: 'txn-001' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('deleted') })
      );
    });

    it('should return 400 for missing transaction ID', async () => {
      mockReq.params.id = undefined;

      await transactionController.deleteTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when transaction not found', async () => {
      mockReq.params.id = 'non-existent-txn';
      zerodbService.queryTable.mockResolvedValue([]);

      await transactionController.deleteTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.params.id = 'txn-001';
      zerodbService.queryTable.mockResolvedValue([{ transactionId: 'txn-001' }]);
      zerodbService.deleteRows.mockRejectedValue(new Error('ZeroDB delete failed'));

      await transactionController.deleteTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTransactionsByUser', () => {
    it('should retrieve all transactions for a user', async () => {
      mockReq.params.userId = 'user-123';
      const userTransactions = [
        { transactionId: 'txn-001', userId: 'user-123' },
        { transactionId: 'txn-002', userId: 'user-123' }
      ];

      zerodbService.queryTable.mockResolvedValue(userTransactions);

      await transactionController.getTransactionsByUser(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: { userId: 'user-123' }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(userTransactions);
    });

    it('should return 400 for missing user ID', async () => {
      mockReq.params.userId = undefined;

      await transactionController.getTransactionsByUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTransactionsByCompany', () => {
    it('should retrieve all transactions for a company', async () => {
      mockReq.params.companyId = 'company-456';
      const companyTransactions = [
        { transactionId: 'txn-001', companyId: 'company-456' },
        { transactionId: 'txn-002', companyId: 'company-456' }
      ];

      zerodbService.queryTable.mockResolvedValue(companyTransactions);

      await transactionController.getTransactionsByCompany(mockReq, mockRes, mockNext);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          filter: { companyId: 'company-456' }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(companyTransactions);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params.companyId = undefined;

      await transactionController.getTransactionsByCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTransactionSummary', () => {
    it('should calculate transaction summary for a company', async () => {
      mockReq.params.companyId = 'company-456';
      mockReq.query = { startDate: '2024-01-01', endDate: '2024-12-31' };

      const transactions = [
        { amount: 1000, type: 'payment', status: 'completed', fees: { processingFee: 10 } },
        { amount: 2000, type: 'payment', status: 'completed', fees: { processingFee: 20 } },
        { amount: 500, type: 'refund', status: 'completed', fees: { processingFee: 5 } }
      ];

      zerodbService.queryTable.mockResolvedValue(transactions);

      await transactionController.getTransactionSummary(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        totalTransactions: 3,
        totalAmount: expect.any(Number),
        totalFees: expect.any(Number),
        netAmount: expect.any(Number),
        byType: expect.any(Object),
        byStatus: expect.any(Object)
      }));
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params.companyId = undefined;

      await transactionController.getTransactionSummary(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('processTransaction', () => {
    it('should process a pending transaction', async () => {
      mockReq.params.id = 'txn-001';

      const pendingTransaction = {
        transactionId: 'txn-001',
        status: 'pending',
        amount: 1000
      };

      zerodbService.queryTable.mockResolvedValue([pendingTransaction]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await transactionController.processTransaction(mockReq, mockRes, mockNext);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'transactions',
        { transactionId: 'txn-001' },
        expect.objectContaining({
          status: 'processing'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for already processed transaction', async () => {
      mockReq.params.id = 'txn-001';

      const completedTransaction = {
        transactionId: 'txn-001',
        status: 'completed'
      };

      zerodbService.queryTable.mockResolvedValue([completedTransaction]);

      await transactionController.processTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('already') })
      );
    });
  });

  describe('refundTransaction', () => {
    it('should create a refund for a completed transaction', async () => {
      mockReq.params.id = 'txn-001';
      mockReq.body = { amount: 500, reason: 'Customer request' };

      const completedTransaction = {
        transactionId: 'txn-001',
        status: 'completed',
        amount: 1000,
        currency: 'USD',
        userId: 'user-123',
        companyId: 'company-456'
      };

      zerodbService.queryTable.mockResolvedValue([completedTransaction]);
      zerodbService.insertRow.mockResolvedValue({
        rows: [{
          transactionId: expect.any(String),
          type: 'refund'
        }]
      });
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await transactionController.refundTransaction(mockReq, mockRes, mockNext);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          type: 'refund',
          amount: 500
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for refund amount greater than original', async () => {
      mockReq.params.id = 'txn-001';
      mockReq.body = { amount: 2000 };

      const completedTransaction = {
        transactionId: 'txn-001',
        status: 'completed',
        amount: 1000
      };

      zerodbService.queryTable.mockResolvedValue([completedTransaction]);

      await transactionController.refundTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('exceed') })
      );
    });

    it('should return 400 for non-completed transaction', async () => {
      mockReq.params.id = 'txn-001';
      mockReq.body = { amount: 500 };

      const pendingTransaction = {
        transactionId: 'txn-001',
        status: 'pending'
      };

      zerodbService.queryTable.mockResolvedValue([pendingTransaction]);

      await transactionController.refundTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('completed') })
      );
    });
  });

  describe('Validation', () => {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];
    const validTypes = ['payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'];
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'];

    validCurrencies.forEach(currency => {
      it(`should accept ${currency} as valid currency`, async () => {
        mockReq.body = {
          transactionId: 'txn-001',
          userId: 'user-123',
          amount: 1000,
          currency,
          type: 'payment',
          status: 'pending'
        };

        zerodbService.insertRow.mockResolvedValue({ rows: [mockReq.body] });

        await transactionController.createTransaction(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });
    });

    validTypes.forEach(type => {
      it(`should accept ${type} as valid transaction type`, async () => {
        mockReq.body = {
          transactionId: 'txn-001',
          userId: 'user-123',
          amount: 1000,
          currency: 'USD',
          type,
          status: 'pending'
        };

        zerodbService.insertRow.mockResolvedValue({ rows: [mockReq.body] });

        await transactionController.createTransaction(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });
    });

    validStatuses.forEach(status => {
      it(`should accept ${status} as valid transaction status`, async () => {
        mockReq.body = {
          transactionId: 'txn-001',
          userId: 'user-123',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status
        };

        zerodbService.insertRow.mockResolvedValue({ rows: [mockReq.body] });

        await transactionController.createTransaction(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockReq.params.id = 'txn-001';
      const networkError = new Error('Network error');
      networkError.code = 'ECONNREFUSED';

      zerodbService.queryTable.mockRejectedValue(networkError);

      await transactionController.getTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Failed')
        })
      );
    });

    it('should handle timeout errors', async () => {
      mockReq.params.id = 'txn-001';
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      zerodbService.queryTable.mockRejectedValue(timeoutError);

      await transactionController.getTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle invalid JSON in request body', async () => {
      mockReq.body = undefined;

      await transactionController.createTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
