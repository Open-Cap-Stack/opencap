/**
 * Tests for Transaction Model
 * Feature: OCDI-103: Create Transaction data model
 */

const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction');
const { connectToMongoDB, closeMongoDBConnection } = require('../../db/mongoConnection');

// Use a separate test database
process.env.NODE_ENV = 'test';

describe('Transaction Model (OCDI-103)', () => {
  // Connect to test database before all tests
  beforeAll(async () => {
    await connectToMongoDB();
  });

  // Clean up database after each test
  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  // Disconnect from database after all tests
  afterAll(async () => {
    await closeMongoDBConnection();
  });

  describe('Fields validation', () => {
    it('should create a transaction with all required fields', async () => {
      const transactionData = {
        transactionId: 'txn12345',
        userId: 'user123',
        companyId: 'company123',
        amount: 500.75,
        currency: 'USD',
        type: 'payment',
        status: 'completed',
        description: 'Monthly subscription payment',
        metadata: { 
          paymentMethod: 'credit_card',
          cardLast4: '1234'
        }
      };

      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction._id).toBeDefined();
      expect(savedTransaction.transactionId).toBe(transactionData.transactionId);
      expect(savedTransaction.userId).toBe(transactionData.userId);
      expect(savedTransaction.companyId).toBe(transactionData.companyId);
      expect(savedTransaction.amount).toBe(transactionData.amount);
      expect(savedTransaction.currency).toBe(transactionData.currency);
      expect(savedTransaction.type).toBe(transactionData.type);
      expect(savedTransaction.status).toBe(transactionData.status);
      expect(savedTransaction.description).toBe(transactionData.description);
      expect(savedTransaction.metadata.paymentMethod).toBe('credit_card');
      expect(savedTransaction.createdAt).toBeDefined();
      expect(savedTransaction.updatedAt).toBeDefined();
    });

    it('should require transaction ID, user ID, amount, currency, type and status', async () => {
      const transactionData = {
        description: 'Incomplete transaction data'
      };

      let validationError;
      try {
        const transaction = new Transaction(transactionData);
        await transaction.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.errors.transactionId).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
      expect(validationError.errors.amount).toBeDefined();
      expect(validationError.errors.currency).toBeDefined();
      expect(validationError.errors.type).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
    });

    it('should validate amount is a positive number', async () => {
      const invalidTransaction = {
        transactionId: 'txn12345',
        userId: 'user123',
        amount: -50.25,
        currency: 'USD',
        type: 'payment',
        status: 'completed'
      };
      
      let validationError;
      try {
        const transaction = new Transaction(invalidTransaction);
        await transaction.save();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.errors.amount).toBeDefined();
    });
    
    it('should validate currency is a valid ISO currency code', async () => {
      const invalidTransaction = {
        transactionId: 'txn12345',
        userId: 'user123',
        amount: 100,
        currency: 'INVALID',
        type: 'payment',
        status: 'completed'
      };
      
      let validationError;
      try {
        const transaction = new Transaction(invalidTransaction);
        await transaction.save();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.errors.currency).toBeDefined();
    });
  });
  
  describe('Indexes', () => {
    it('should enforce unique transaction ID constraint', async () => {
      // Create first transaction
      const transaction1 = {
        transactionId: 'duplicate_txn',
        userId: 'user123',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'completed'
      };
      
      await new Transaction(transaction1).save();
      
      // Attempt to create second transaction with same ID
      const transaction2 = {
        transactionId: 'duplicate_txn',
        userId: 'user456',
        amount: 200,
        currency: 'USD',
        type: 'payment',
        status: 'pending'
      };
      
      let duplicateError;
      try {
        await new Transaction(transaction2).save();
      } catch (error) {
        duplicateError = error;
      }
      
      expect(duplicateError).toBeDefined();
      expect(duplicateError.name).toBe('MongoServerError');
      expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
    });
  });

  describe('Methods', () => {
    it('should correctly calculate transaction fees', async () => {
      const transactionData = {
        transactionId: 'txn12345',
        userId: 'user123',
        amount: 1000,
        currency: 'USD',
        type: 'payment',
        status: 'completed',
        fees: {
          processingFee: 29.50,
          platformFee: 10.00,
          taxAmount: 5.00
        }
      };
      
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();
      
      // Get net amount (amount - all fees)
      const netAmount = savedTransaction.getNetAmount();
      const expectedNet = 1000 - 29.50 - 10.00 - 5.00;
      
      expect(netAmount).toBe(expectedNet);
      
      // Test with all fees at 0
      const zeroFeesTransaction = new Transaction({
        transactionId: 'txn_zerofees',
        userId: 'user123',
        amount: 1000,
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
      await zeroFeesTransaction.save();
      expect(zeroFeesTransaction.getNetAmount()).toBe(1000);
      
      // Test with some undefined fees
      const partialFeesTransaction = new Transaction({
        transactionId: 'txn_partialfees',
        userId: 'user123',
        amount: 1000,
        currency: 'USD',
        type: 'payment',
        status: 'completed',
        fees: {
          processingFee: 10,
          // platformFee is undefined
          // taxAmount is undefined
          otherFees: 5
        }
      });
      await partialFeesTransaction.save();
      expect(partialFeesTransaction.getNetAmount()).toBe(985); // 1000 - 10 - 5
    });
    
    it('should correctly format the amount with currency symbol', async () => {
      const transactionData = {
        transactionId: 'txn12345',
        userId: 'user123',
        amount: 1000,
        currency: 'USD',
        type: 'payment',
        status: 'completed'
      };
      
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();
      
      const formattedAmount = savedTransaction.getFormattedAmount();
      expect(formattedAmount).toBe('$1,000.00');
      
      // Test with different currency
      savedTransaction.currency = 'EUR';
      savedTransaction.amount = 1500.50;
      await savedTransaction.save();
      
      const formattedEuroAmount = savedTransaction.getFormattedAmount();
      expect(formattedEuroAmount).toBe('€1,500.50');
      
      // Test with currency that doesn't have a symbol mapping - but don't save to DB
      // to avoid validation errors
      const unsavedTransaction = new Transaction({
        transactionId: 'txn_unsaved',
        userId: 'user123',
        amount: 2000,
        currency: 'USD',
        type: 'payment',
        status: 'completed'
      });
      
      // Manually modify the currency without validation
      unsavedTransaction.currency = 'XYZ'; // Invalid currency, but we're not saving to DB
      
      const formattedUnknownAmount = unsavedTransaction.getFormattedAmount();
      expect(formattedUnknownAmount).toBe('2,000.00'); // No symbol, just the formatted number
    });
  });
  
  describe('Lifecycle hooks', () => {
    it('should set processedAt timestamp when status changes to completed', async () => {
      // Create transaction with pending status
      const transaction = new Transaction({
        transactionId: 'txn_pending',
        userId: 'user123',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'pending'
      });
      
      // Save initially - should not have processedAt
      await transaction.save();
      expect(transaction.processedAt).toBeNull();
      
      // Update to completed
      transaction.status = 'completed';
      await transaction.save();
      
      // Should now have processedAt
      expect(transaction.processedAt).toBeInstanceOf(Date);
      
      // Update something else - processedAt shouldn't change
      const oldProcessedAt = transaction.processedAt;
      transaction.description = 'Updated description';
      await transaction.save();
      
      expect(transaction.processedAt).toEqual(oldProcessedAt);
      
      // Update another transaction from completed to failed - should retain processedAt
      const completedTransaction = new Transaction({
        transactionId: 'txn_completed',
        userId: 'user123',
        amount: 100,
        currency: 'USD',
        type: 'payment',
        status: 'completed'
      });
      
      await completedTransaction.save();
      expect(completedTransaction.processedAt).toBeInstanceOf(Date);
      
      completedTransaction.status = 'failed';
      await completedTransaction.save();
      
      // Should still have the original processedAt
      expect(completedTransaction.processedAt).toBeInstanceOf(Date);
    });
  });
});
