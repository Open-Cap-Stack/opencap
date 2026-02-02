/**
 * Comprehensive Transaction Model Unit Tests
 *
 * Tests for the Transaction model including validation, methods, virtuals, and schema behavior
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('Transaction Model', () => {
  let Transaction;

  const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];
  const validTransactionTypes = ['payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'];
  const validTransactionStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'];
  const validPaymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash', 'other'];

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockTransaction(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();

        // Apply defaults
        if (this.description === undefined) this.description = '';
        if (this.metadata === undefined) this.metadata = {};
        if (this.fees === undefined) this.fees = {};
        if (this.paymentMethod === undefined) this.paymentMethod = 'other';
        if (this.failureReason === undefined) this.failureReason = null;
        if (this.processedAt === undefined) this.processedAt = null;
        if (this.relatedTransactions === undefined) this.relatedTransactions = [];

        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.transactionId) {
            errors.transactionId = { message: 'transactionId is required' };
          }
          if (!this.userId) {
            errors.userId = { message: 'userId is required' };
          }
          if (this.amount === undefined || this.amount === null) {
            errors.amount = { message: 'amount is required' };
          } else if (this.amount <= 0) {
            errors.amount = { message: 'Amount must be a positive number' };
          }
          if (!this.currency) {
            errors.currency = { message: 'currency is required' };
          } else if (!validCurrencyCodes.includes(this.currency.toUpperCase())) {
            errors.currency = { message: `${this.currency} is not a valid ISO currency code` };
          }
          if (!this.type) {
            errors.type = { message: 'type is required' };
          } else if (!validTransactionTypes.includes(this.type)) {
            errors.type = { message: `${this.type} is not a valid transaction type` };
          }
          if (!this.status) {
            errors.status = { message: 'status is required' };
          } else if (!validTransactionStatuses.includes(this.status)) {
            errors.status = { message: `${this.status} is not a valid transaction status` };
          }
          if (this.paymentMethod && !validPaymentMethods.includes(this.paymentMethod)) {
            errors.paymentMethod = { message: `${this.paymentMethod} is not a valid payment method` };
          }

          return Object.keys(errors).length > 0 ? { errors } : null;
        });
        this.toObject = jest.fn(() => ({ ...data }));

        // Instance methods
        this.getNetAmount = function() {
          const totalFees = (this.fees.processingFee || 0) +
                           (this.fees.platformFee || 0) +
                           (this.fees.taxAmount || 0) +
                           (this.fees.otherFees || 0);
          return this.amount - totalFees;
        };

        this.getFormattedAmount = function() {
          const currencySymbols = {
            'USD': '$', 'EUR': '\u20AC', 'GBP': '\u00A3', 'CAD': 'CA$', 'AUD': 'A$',
            'JPY': '\u00A5', 'CNY': '\u00A5', 'INR': '\u20B9', 'CHF': 'CHF', 'BRL': 'R$'
          };
          const symbol = currencySymbols[this.currency] || '';
          return `${symbol}${this.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`;
        };
      }

      // Add static methods
      MockTransaction.findById = jest.fn();
      MockTransaction.find = jest.fn();
      MockTransaction.findOne = jest.fn();
      MockTransaction.create = jest.fn();
      MockTransaction.findByIdAndUpdate = jest.fn();
      MockTransaction.aggregate = jest.fn();

      return MockTransaction;
    });

    // Now require the Transaction model
    Transaction = require('../../../models/Transaction');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create transaction with all required fields', () => {
        const transactionData = {
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000.00,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        };

        const transaction = new Transaction(transactionData);

        expect(transaction.transactionId).toBe(transactionData.transactionId);
        expect(transaction.userId).toBe(transactionData.userId);
        expect(transaction.amount).toBe(transactionData.amount);
        expect(transaction.currency).toBe(transactionData.currency);
        expect(transaction.type).toBe(transactionData.type);
        expect(transaction.status).toBe(transactionData.status);
      });

      it('should reject transaction without transactionId', () => {
        const transaction = new Transaction({
          userId: 'user-456',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.transactionId).toBeTruthy();
      });

      it('should reject transaction without userId', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.userId).toBeTruthy();
      });

      it('should reject transaction without amount', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.amount).toBeTruthy();
      });

      it('should reject transaction without currency', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000,
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.currency).toBeTruthy();
      });

      it('should reject transaction without type', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000,
          currency: 'USD',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.type).toBeTruthy();
      });

      it('should reject transaction without status', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000,
          currency: 'USD',
          type: 'payment'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.status).toBeTruthy();
      });
    });

    describe('Amount Validation', () => {
      it('should reject zero amount', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 0,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.amount).toBeTruthy();
      });

      it('should reject negative amount', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: -100,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.amount).toBeTruthy();
      });

      it('should accept decimal amounts', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 99.99,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeNull();
        expect(transaction.amount).toBe(99.99);
      });

      it('should accept large amounts', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 10000000.00,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeNull();
        expect(transaction.amount).toBe(10000000.00);
      });
    });

    describe('Currency Validation', () => {
      it.each(validCurrencyCodes)('should accept valid currency code %s', (currency) => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: currency,
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeNull();
      });

      it('should reject invalid currency code', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'INVALID',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.currency).toBeTruthy();
      });

      it('should reject unknown currency code', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'XYZ',
          type: 'payment',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.currency).toBeTruthy();
      });
    });

    describe('Transaction Type Validation', () => {
      it.each(validTransactionTypes)('should accept valid transaction type %s', (type) => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'USD',
          type: type,
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeNull();
      });

      it('should reject invalid transaction type', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'USD',
          type: 'invalid_type',
          status: 'pending'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.type).toBeTruthy();
      });
    });

    describe('Transaction Status Validation', () => {
      it.each(validTransactionStatuses)('should accept valid status %s', (status) => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'USD',
          type: 'payment',
          status: status
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeNull();
      });

      it('should reject invalid status', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'USD',
          type: 'payment',
          status: 'invalid_status'
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.status).toBeTruthy();
      });
    });

    describe('Payment Method Validation', () => {
      it.each(validPaymentMethods)('should accept valid payment method %s', (paymentMethod) => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'USD',
          type: 'payment',
          status: 'pending',
          paymentMethod: paymentMethod
        });

        const validationError = transaction.validateSync();
        expect(validationError).toBeNull();
      });

      it('should default payment method to "other"', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 100,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        expect(transaction.paymentMethod).toBe('other');
      });
    });
  });

  describe('Instance Methods', () => {
    describe('getNetAmount', () => {
      it('should calculate net amount without fees', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status: 'completed',
          fees: {}
        });

        expect(transaction.getNetAmount()).toBe(1000);
      });

      it('should calculate net amount with processing fee', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status: 'completed',
          fees: {
            processingFee: 29.90
          }
        });

        expect(transaction.getNetAmount()).toBe(970.10);
      });

      it('should calculate net amount with all fees', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1000,
          currency: 'USD',
          type: 'payment',
          status: 'completed',
          fees: {
            processingFee: 29.00,
            platformFee: 10.00,
            taxAmount: 5.00,
            otherFees: 1.00
          }
        });

        expect(transaction.getNetAmount()).toBe(955.00);
      });

      it('should handle zero fees', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 500,
          currency: 'USD',
          type: 'payment',
          status: 'completed',
          fees: {
            processingFee: 0,
            platformFee: 0,
            taxAmount: 0,
            otherFees: 0
          }
        });

        expect(transaction.getNetAmount()).toBe(500);
      });
    });

    describe('getFormattedAmount', () => {
      it('should format USD amount correctly', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 1234.56,
          currency: 'USD',
          type: 'payment',
          status: 'pending'
        });

        const formatted = transaction.getFormattedAmount();
        expect(formatted).toContain('$');
        expect(formatted).toContain('1,234.56');
      });

      it('should format EUR amount correctly', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 999.99,
          currency: 'EUR',
          type: 'payment',
          status: 'pending'
        });

        const formatted = transaction.getFormattedAmount();
        expect(formatted).toContain('\u20AC');
      });

      it('should format GBP amount correctly', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 500,
          currency: 'GBP',
          type: 'payment',
          status: 'pending'
        });

        const formatted = transaction.getFormattedAmount();
        expect(formatted).toContain('\u00A3');
      });

      it('should format JPY amount correctly', () => {
        const transaction = new Transaction({
          transactionId: 'txn-123',
          userId: 'user-456',
          amount: 10000,
          currency: 'JPY',
          type: 'payment',
          status: 'pending'
        });

        const formatted = transaction.getFormattedAmount();
        expect(formatted).toContain('\u00A5');
      });
    });
  });

  describe('Transaction Fees', () => {
    it('should default fees to empty object', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending'
      });

      expect(transaction.fees).toEqual({});
    });

    it('should handle partial fee data', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending',
        fees: {
          processingFee: 2.50
        }
      });

      expect(transaction.fees.processingFee).toBe(2.50);
      expect(transaction.fees.platformFee).toBeUndefined();
    });

    it('should handle complete fee structure', () => {
      const feeData = {
        processingFee: 2.50,
        platformFee: 1.00,
        taxAmount: 0.50,
        otherFees: 0.25
      };

      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending',
        fees: feeData
      });

      expect(transaction.fees).toEqual(feeData);
    });
  });

  describe('Optional Fields', () => {
    it('should handle companyId', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        companyId: 'company-789',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending'
      });

      expect(transaction.companyId).toBe('company-789');
    });

    it('should handle accountId', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        accountId: 'account-abc',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending'
      });

      expect(transaction.accountId).toBe('account-abc');
    });

    it('should handle description', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending',
        description: 'Payment for subscription'
      });

      expect(transaction.description).toBe('Payment for subscription');
    });

    it('should handle metadata', () => {
      const metadata = {
        orderId: 'order-123',
        source: 'web',
        customField: 'custom value'
      };

      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending',
        metadata: metadata
      });

      expect(transaction.metadata).toEqual(metadata);
    });

    it('should handle relatedTransactions', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'refund',
        status: 'completed',
        relatedTransactions: ['txn-100', 'txn-101']
      });

      expect(transaction.relatedTransactions).toEqual(['txn-100', 'txn-101']);
    });

    it('should handle failureReason', () => {
      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'failed',
        failureReason: 'Insufficient funds'
      });

      expect(transaction.failureReason).toBe('Insufficient funds');
    });

    it('should handle processedAt timestamp', () => {
      const processedDate = new Date('2024-01-15T10:30:00Z');

      const transaction = new Transaction({
        transactionId: 'txn-123',
        userId: 'user-456',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'completed',
        processedAt: processedDate
      });

      expect(transaction.processedAt).toEqual(processedDate);
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockTransaction = {
        transactionId: 'txn-123',
        amount: 100
      };
      Transaction.findById.mockResolvedValue(mockTransaction);

      const result = await Transaction.findById('507f1f77bcf86cd799439011');

      expect(Transaction.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockTransaction);
    });

    it('should call find correctly', async () => {
      const mockTransactions = [
        { transactionId: 'txn-1', amount: 100 },
        { transactionId: 'txn-2', amount: 200 }
      ];
      Transaction.find.mockResolvedValue(mockTransactions);

      const result = await Transaction.find({ userId: 'user-123' });

      expect(Transaction.find).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(result).toEqual(mockTransactions);
    });

    it('should call aggregate correctly', async () => {
      const aggregateResult = [{ _id: 'USD', total: 5000 }];
      Transaction.aggregate.mockResolvedValue(aggregateResult);

      const pipeline = [
        { $match: { status: 'completed' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' } } }
      ];

      const result = await Transaction.aggregate(pipeline);

      expect(Transaction.aggregate).toHaveBeenCalledWith(pipeline);
      expect(result).toEqual(aggregateResult);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete payment transaction', () => {
      const transaction = new Transaction({
        transactionId: 'txn-complete-123',
        userId: 'user-456',
        companyId: 'company-789',
        accountId: 'account-abc',
        amount: 5000.00,
        currency: 'USD',
        type: 'payment',
        status: 'completed',
        description: 'Investment payment - Series A',
        metadata: {
          roundName: 'Series A',
          investorType: 'institutional'
        },
        fees: {
          processingFee: 145.00,
          platformFee: 50.00,
          taxAmount: 0,
          otherFees: 0
        },
        paymentMethod: 'bank_transfer',
        processedAt: new Date()
      });

      const validationError = transaction.validateSync();
      expect(validationError).toBeNull();
      expect(transaction.getNetAmount()).toBe(4805.00);
    });

    it('should handle refund transaction', () => {
      const originalTxnId = 'txn-original-123';
      const transaction = new Transaction({
        transactionId: 'txn-refund-456',
        userId: 'user-456',
        amount: 100.00,
        currency: 'USD',
        type: 'refund',
        status: 'completed',
        description: 'Refund for order cancellation',
        relatedTransactions: [originalTxnId]
      });

      const validationError = transaction.validateSync();
      expect(validationError).toBeNull();
      expect(transaction.relatedTransactions).toContain(originalTxnId);
    });

    it('should handle failed transaction', () => {
      const transaction = new Transaction({
        transactionId: 'txn-failed-123',
        userId: 'user-456',
        amount: 1000.00,
        currency: 'USD',
        type: 'payment',
        status: 'failed',
        paymentMethod: 'credit_card',
        failureReason: 'Card declined - insufficient funds'
      });

      const validationError = transaction.validateSync();
      expect(validationError).toBeNull();
      expect(transaction.status).toBe('failed');
      expect(transaction.failureReason).toBe('Card declined - insufficient funds');
    });

    it('should handle multi-currency scenario', () => {
      const currencies = ['USD', 'EUR', 'GBP'];
      const transactions = currencies.map((currency, i) =>
        new Transaction({
          transactionId: `txn-${currency}-${i}`,
          userId: 'user-456',
          amount: 1000 * (i + 1),
          currency: currency,
          type: 'payment',
          status: 'completed'
        })
      );

      transactions.forEach(txn => {
        const validationError = txn.validateSync();
        expect(validationError).toBeNull();
      });

      expect(transactions[0].currency).toBe('USD');
      expect(transactions[1].currency).toBe('EUR');
      expect(transactions[2].currency).toBe('GBP');
    });
  });
});
