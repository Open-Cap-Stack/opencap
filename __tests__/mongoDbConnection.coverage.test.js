/**
 * MongoDB Connection Coverage Tests
 * 
 * Targeting specific code paths in mongoDbConnection.js
 * to meet Semantic Seed Venture Studio Coding Standards:
 * - Statement coverage: 80% minimum
 * - Branch coverage: 70% minimum
 * - Line coverage: 80% minimum
 * - Function coverage: 80% minimum
 */

const mongoDbConnection = require('../utils/mongoDbConnection');

// Test without mocking to properly access mongoose native types and functionality
describe('MongoDB Connection Coverage Tests', () => {
  // Track console spy objects
  let consoleSpies;
  
  // Setup before each test
  beforeEach(() => {
    // Spy on console methods without interfering with output
    consoleSpies = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
    
    // Set up test environment variables
    process.env.MONGODB_USERNAME = 'testuser';
    process.env.MONGODB_PASSWORD = 'testpass';
    process.env.MONGODB_HOST = 'localhost';
    process.env.MONGODB_PORT = '27017';
    process.env.MONGODB_DATABASE = 'testdb';
  });
  
  // Cleanup after each test
  afterEach(() => {
    jest.restoreAllMocks();
    
    // Clean up environment variables
    delete process.env.MONGODB_USERNAME;
    delete process.env.MONGODB_PASSWORD;
    delete process.env.MONGODB_HOST;
    delete process.env.MONGODB_PORT;
    delete process.env.MONGODB_DATABASE;
    delete process.env.MONGO_URI;
  });
  
  // 1. Test URI construction logic for different scenarios
  describe('getMongoURI Function', () => {
    test('constructs URI from environment variables', () => {
      const uri = mongoDbConnection.getMongoURI();
      expect(uri).toBe('mongodb://testuser:testpass@localhost:27017/testdb');
    });
    
    test('replaces database name in URI when specified', () => {
      const uri = mongoDbConnection.getMongoURI('customdb');
      expect(uri).toBe('mongodb://testuser:testpass@localhost:27017/customdb');
    });
    
    test('uses MONGO_URI environment variable when available', () => {
      process.env.MONGO_URI = 'mongodb://admin:secure@db.example.com:27017/production';
      
      const uri = mongoDbConnection.getMongoURI();
      expect(uri).toBe('mongodb://admin:secure@db.example.com:27017/production');
    });
    
    test('replaces database in MONGO_URI when specified', () => {
      process.env.MONGO_URI = 'mongodb://admin:secure@db.example.com:27017/production?authSource=admin';
      
      const uri = mongoDbConnection.getMongoURI('staging');
      expect(uri).toBe('mongodb://admin:secure@db.example.com:27017/staging?authSource=admin');
    });
    
    test('handles missing environment variables', () => {
      // Clear all environment variables
      delete process.env.MONGODB_USERNAME;
      delete process.env.MONGODB_PASSWORD;
      delete process.env.MONGODB_HOST;
      delete process.env.MONGODB_PORT;
      delete process.env.MONGODB_DATABASE;
      
      const uri = mongoDbConnection.getMongoURI();
      // Should return a default URI or fallback
      expect(uri).toContain('mongodb://');
    });
  });
  
  // 2. Test operation retry logic extensively
  describe('withRetry Function', () => {
    test('handles successful operations without retry', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await mongoDbConnection.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    test('retries on network errors', async () => {
      // Create a network error that should trigger retry
      const networkError = new Error('network error');
      networkError.name = 'MongoNetworkError';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');
      
      const result = await mongoDbConnection.withRetry(operation, 3, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(consoleSpies.warn).toHaveBeenCalled();
    });
    
    test('retries on specific error messages', async () => {
      const errorMessages = [
        'topology was destroyed',
        'connection timed out',
        'socket timeout',
        'server selection timed out',
        'interrupted at shutdown',
        'connection pool closed'
      ];
      
      for (const message of errorMessages) {
        jest.clearAllMocks();
        
        const error = new Error(message);
        const operation = jest.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(`success for ${message}`);
        
        const result = await mongoDbConnection.withRetry(operation, 2, 10);
        
        expect(result).toBe(`success for ${message}`);
        expect(operation).toHaveBeenCalledTimes(2);
      }
    });
    
    test('retries on specific MongoDB error codes', async () => {
      const retryCodes = [11600, 11602, 10107, 13435, 13436, 189, 91, 7, 6];
      
      for (const code of retryCodes) {
        jest.clearAllMocks();
        
        const error = new Error(`MongoDB error ${code}`);
        error.code = code;
        
        const operation = jest.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(`success for code ${code}`);
        
        const result = await mongoDbConnection.withRetry(operation, 2, 10);
        
        expect(result).toBe(`success for code ${code}`);
        expect(operation).toHaveBeenCalledTimes(2);
      }
    });
    
    test('does not retry on validation errors', async () => {
      const error = new Error('validation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(mongoDbConnection.withRetry(operation))
        .rejects.toThrow('validation failed');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    test('gives up after reaching max retries', async () => {
      const error = new Error('persistent network error');
      error.name = 'MongoNetworkError';
      
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(mongoDbConnection.withRetry(operation, 2, 10))
        .rejects.toThrow('persistent network error');
      
      // Should have been called initial attempt + 2 retries = 3 times
      expect(operation).toHaveBeenCalledTimes(3);
      expect(consoleSpies.error).toHaveBeenCalled();
    });
    
    test('handles invalid operation parameter', async () => {
      await expect(mongoDbConnection.withRetry(null))
        .rejects.toThrow(/operation must be a function/i);
      
      await expect(mongoDbConnection.withRetry('not a function'))
        .rejects.toThrow(/operation must be a function/i);
      
      await expect(mongoDbConnection.withRetry(undefined))
        .rejects.toThrow(/operation must be a function/i);
    });
    
    test('handles zero maxRetries properly', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await mongoDbConnection.withRetry(operation, 0);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    test('uses default retry count for negative maxRetries', async () => {
      const networkError = new Error('network error');
      
      const operation = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');
      
      // Using negative number should default to a positive number
      const result = await mongoDbConnection.withRetry(operation, -1, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    test('handles synchronous errors in operation', async () => {
      const operation = jest.fn(() => {
        throw new Error('synchronous error');
      });
      
      await expect(mongoDbConnection.withRetry(operation))
        .rejects.toThrow('synchronous error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
  
  // 3. Test cleanupCollection behavior
  describe('cleanupCollection Function', () => {
    test('attempts to delete all documents in a collection', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 10 });
      
      // Mock the mongoose model lookup
      const mockModel = jest.fn().mockReturnValue({ 
        deleteMany: mockDeleteMany 
      });
      
      // Save original model function to restore later
      const originalModel = require('mongoose').model;
      require('mongoose').model = mockModel;
      
      await mongoDbConnection.cleanupCollection('test_collection');
      
      expect(mockModel).toHaveBeenCalledWith('test_collection', expect.any(Object));
      expect(mockDeleteMany).toHaveBeenCalledWith({});
      
      // Restore original
      require('mongoose').model = originalModel;
    });
    
    test('handles errors when cleaning collections', async () => {
      const mockDeleteMany = jest.fn().mockRejectedValue(new Error('Delete failed'));
      
      // Mock the mongoose model lookup
      const mockModel = jest.fn().mockReturnValue({ 
        deleteMany: mockDeleteMany 
      });
      
      // Save original model function to restore later
      const originalModel = require('mongoose').model;
      require('mongoose').model = mockModel;
      
      await mongoDbConnection.cleanupCollection('test_collection');
      
      expect(consoleSpies.error).toHaveBeenCalled();
      
      // Restore original
      require('mongoose').model = originalModel;
    });
  });
  
  // 4. Test error classification and identification
  describe('isRetryableError Function', () => {
    test('identifies MongoDB network errors as retryable', () => {
      const networkError = new Error('connection problem');
      networkError.name = 'MongoNetworkError';
      
      // Use the withRetry function to indirectly test isRetryableError
      const operation = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');
      
      return expect(mongoDbConnection.withRetry(operation, 1, 10)).resolves.toBe('success');
    });
    
    test('identifies errors with specific messages as retryable', () => {
      const timeoutError = new Error('connection timed out');
      
      const operation = jest.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');
      
      return expect(mongoDbConnection.withRetry(operation, 1, 10)).resolves.toBe('success');
    });
    
    test('identifies errors with specific codes as retryable', () => {
      const codeError = new Error('write conflict');
      codeError.code = 11000; // Duplicate key error
      
      // Use the withRetry function to indirectly test isRetryableError
      const operation = jest.fn()
        .mockRejectedValueOnce(codeError)
        .mockResolvedValueOnce('success');
      
      return expect(mongoDbConnection.withRetry(operation, 1, 10)).resolves.toBe('success');
    });
  });
  
  // 5. Additional test cases to ensure maximum coverage
  describe('Edge Cases', () => {
    test('handles unexpected error types', async () => {
      // Try with a non-Error object
      const operation = jest.fn().mockRejectedValue({ problem: 'something went wrong' });
      
      await expect(mongoDbConnection.withRetry(operation, 1, 10))
        .rejects.toEqual({ problem: 'something went wrong' });
      
      expect(operation).toHaveBeenCalledTimes(2); // Should try at least once more
    });
    
    test('handles empty error message', async () => {
      const operation = jest.fn().mockRejectedValue(new Error());
      
      await expect(mongoDbConnection.withRetry(operation, 1, 10))
        .rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(2); // Should try at least once more
    });
  });
});
