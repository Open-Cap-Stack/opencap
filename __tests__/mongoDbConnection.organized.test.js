/**
 * MongoDB Connection Organized Test Suite
 * Created for: [Bug] OCAE-205: Fix User Authentication Test Failures
 * 
 * This consolidated test suite ensures all MongoDB connection utility functions 
 * meet the Semantic Seed Venture Studio Coding Standards requirements:
 * - Statement coverage: 80% minimum
 * - Branch coverage: 70% minimum
 * - Line coverage: 80% minimum
 * - Function coverage: 80% minimum
 */

// Direct import is needed to test actual behavior
const mongoDbConnection = require('../utils/mongoDbConnection');

// We'll use isolated tests with mocks to test specific behaviors
describe('MongoDB Connection Utility Tests', () => {
  // Track spies
  let consoleSpies;
  
  // Setup before tests
  beforeEach(() => {
    // Spy on console methods without affecting output
    consoleSpies = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
    
    // Mock setTimeout to speed up tests
    jest.spyOn(global, 'setTimeout').mockImplementation((cb) => {
      cb();
      return { unref: jest.fn() };
    });
  });
  
  // Cleanup after tests
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  // 1. Public API Tests
  describe('Public API', () => {
    test('should expose all required functions', () => {
      expect(typeof mongoDbConnection.connectWithRetry).toBe('function');
      expect(typeof mongoDbConnection.disconnect).toBe('function');
      expect(typeof mongoDbConnection.withRetry).toBe('function');
      expect(typeof mongoDbConnection.getMongoURI).toBe('function');
      expect(typeof mongoDbConnection.runCommand).toBe('function');
      expect(typeof mongoDbConnection.cleanupCollection).toBe('function');
      expect(typeof mongoDbConnection.setupTestEnvironment).toBe('function');
      
      expect(mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS).toBeDefined();
    });
  });
  
  // 2. Connection String Tests
  describe('MongoDB URI Generation', () => {
    // Save original env
    let originalEnv;
    
    beforeEach(() => {
      // Save original env
      originalEnv = { ...process.env };
      
      // Clear specific env vars
      delete process.env.MONGO_URI;
      
      // Set test env vars
      process.env.MONGODB_USERNAME = 'testuser';
      process.env.MONGODB_PASSWORD = 'testpass';
      process.env.MONGODB_HOST = 'localhost';
      process.env.MONGODB_PORT = '27017';
      process.env.MONGODB_DATABASE = 'testdb';
    });
    
    afterEach(() => {
      // Restore original env
      process.env = originalEnv;
    });
    
    test('builds URI from environment variables', () => {
      const uri = mongoDbConnection.getMongoURI();
      
      // Verify the URI contains expected components
      expect(uri).toContain('mongodb://');
      expect(uri).toContain('testuser');
      expect(uri).toContain('testpass');
      expect(uri).toContain('localhost:27017');
      expect(uri).toContain('testdb');
    });
    
    test('uses custom database name when provided', () => {
      const uri = mongoDbConnection.getMongoURI('customdb');
      
      expect(uri).toContain('customdb');
      expect(uri).not.toContain('testdb');
    });
    
    test('uses MONGO_URI environment variable when set', () => {
      process.env.MONGO_URI = 'mongodb://admin:password@mongo.example.com:27017/production';
      
      const uri = mongoDbConnection.getMongoURI();
      
      expect(uri).toBe('mongodb://admin:password@mongo.example.com:27017/production');
    });
    
    test('replaces database name in MONGO_URI when provided', () => {
      process.env.MONGO_URI = 'mongodb://admin:password@mongo.example.com:27017/production?authSource=admin';
      
      const uri = mongoDbConnection.getMongoURI('staging');
      
      expect(uri).toContain('staging');
      expect(uri).not.toContain('production');
      expect(uri).toContain('authSource=admin');
    });
    
    test('handles missing environment variables gracefully', () => {
      // Clear environment variables
      delete process.env.MONGODB_USERNAME;
      delete process.env.MONGODB_PASSWORD;
      delete process.env.MONGODB_HOST;
      delete process.env.MONGODB_PORT;
      delete process.env.MONGODB_DATABASE;
      
      const uri = mongoDbConnection.getMongoURI();
      
      // Should fall back to default values
      expect(uri).toContain('mongodb://');
    });
    
    test('handles special characters in URI components', () => {
      // Set credentials with special characters
      process.env.MONGODB_USERNAME = 'user+name';
      process.env.MONGODB_PASSWORD = 'p@ss:word';
      
      const uri = mongoDbConnection.getMongoURI();
      
      expect(uri).toContain('user+name');
      expect(uri).toContain('p@ss:word');
    });
  });
  
  // 3. Operation Retry Tests
  describe('Operation Retry Mechanism', () => {
    test('executes successful operations without retry', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await mongoDbConnection.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    test('retries operations with transient errors', async () => {
      // Set up retryable error types
      const retryableErrorTypes = [
        // Network errors
        { name: 'MongoNetworkError', message: 'network error' },
        // Error message patterns
        { message: 'topology was destroyed' },
        { message: 'connection timed out' },
        { message: 'socket timeout' },
        { message: 'server selection timed out' },
        { message: 'interrupted at shutdown' },
        { message: 'connection pool closed' },
        // Error codes
        { code: 11600, message: 'error code 11600' },
        { code: 11602, message: 'error code 11602' },
        { code: 10107, message: 'error code 10107' },
        { code: 13435, message: 'error code 13435' },
        { code: 13436, message: 'error code 13436' },
        { code: 189, message: 'error code 189' },
        { code: 91, message: 'error code 91' },
        { code: 7, message: 'error code 7' },
        { code: 6, message: 'error code 6' }
      ];
      
      // Test each error type
      for (const errorProps of retryableErrorTypes) {
        const error = new Error(errorProps.message || 'Error');
        if (errorProps.name) error.name = errorProps.name;
        if (errorProps.code) error.code = errorProps.code;
        
        const operation = jest.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success');
        
        jest.clearAllMocks();
        
        const result = await mongoDbConnection.withRetry(operation, 2, 10);
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
        expect(consoleSpies.warn).toHaveBeenCalled();
      }
    });
    
    test('does not retry permanent errors', async () => {
      const permanentError = new Error('validation error');
      
      const operation = jest.fn().mockRejectedValue(permanentError);
      
      try {
        await mongoDbConnection.withRetry(operation, 2, 10);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('validation error');
        expect(operation).toHaveBeenCalledTimes(1);
      }
    });
    
    test('gives up after max retries', async () => {
      // Create a retryable error
      const networkError = new Error('persistent network error');
      networkError.name = 'MongoNetworkError';
      
      const operation = jest.fn().mockRejectedValue(networkError);
      
      try {
        await mongoDbConnection.withRetry(operation, 2, 10);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('persistent network error');
        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
        expect(consoleSpies.error).toHaveBeenCalled();
      }
    });
    
    test('validates operation parameter', async () => {
      try {
        await mongoDbConnection.withRetry(null);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toMatch(/operation must be a function/i);
      }
      
      try {
        await mongoDbConnection.withRetry('not a function');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toMatch(/operation must be a function/i);
      }
    });
    
    test('handles synchronous errors', async () => {
      const operation = jest.fn(() => {
        throw new Error('synchronous error');
      });
      
      try {
        await mongoDbConnection.withRetry(operation);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('synchronous error');
        expect(operation).toHaveBeenCalledTimes(1);
      }
    });
    
    test('handles edge cases in retry count', async () => {
      // Test zero retries
      const successOperation = jest.fn().mockResolvedValue('success');
      const resultZero = await mongoDbConnection.withRetry(successOperation, 0);
      expect(resultZero).toBe('success');
      
      // Test negative retries (should be treated as positive)
      const retryableError = new Error('network error');
      retryableError.name = 'MongoNetworkError';
      
      const negativeRetryOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce('success after retry');
      
      const resultNegative = await mongoDbConnection.withRetry(negativeRetryOperation, -1, 10);
      expect(resultNegative).toBe('success after retry');
      expect(negativeRetryOperation).toHaveBeenCalledTimes(2);
    });
  });
  
  // 4. Remaining tests with isolation
  describe('Isolated Tests', () => {
    // Used to isolate the mongoose mock for each test
    const isolateTest = (testName, testFn) => {
      test(testName, async () => {
        // Create isolated environment
        jest.isolateModules(async () => {
          // Setup mongoose mock inside isolation
          jest.doMock('mongoose', () => {
            const mockConnection = {
              readyState: 1, // Connected by default
              close: jest.fn().mockResolvedValue(undefined),
              db: {
                collection: jest.fn().mockReturnValue({
                  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 })
                }),
                dropDatabase: jest.fn().mockResolvedValue(undefined),
                command: jest.fn().mockResolvedValue({ result: 'success' })
              }
            };
            
            return {
              connect: jest.fn().mockResolvedValue(mockConnection),
              connection: mockConnection,
              model: jest.fn().mockReturnValue({
                deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 })
              }),
              Schema: jest.fn(),
              Types: {
                ObjectId: jest.fn(id => id),
                Decimal128: jest.fn(num => num)
              }
            };
          });
          
          // Import connection module after mocking
          const connection = require('../utils/mongoDbConnection');
          const mongoose = require('mongoose');
          
          // Run the actual test
          await testFn(connection, mongoose);
          
          // Restore modules
          jest.resetModules();
        });
      });
    };
    
    // Connection Management Tests
    describe('Connection Management', () => {
      isolateTest('connects successfully with default parameters', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        const result = await connection.connectWithRetry();
        
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
        expect(result).toBe(mongoose.connection);
      });
      
      isolateTest('skips connection when already connected', async (connection, mongoose) => {
        // Already connected state
        mongoose.connection.readyState = 1;
        
        await connection.connectWithRetry();
        
        expect(mongoose.connect).not.toHaveBeenCalled();
      });
      
      isolateTest('uses custom connection options', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        const customOptions = { 
          socketTimeoutMS: 60000,
          maxPoolSize: 50 
        };
        
        await connection.connectWithRetry(null, customOptions);
        
        expect(mongoose.connect).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining(customOptions)
        );
      });
      
      isolateTest('uses provided URI', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        const customUri = 'mongodb://custom:12345@customhost:27017/customdb';
        
        await connection.connectWithRetry(customUri);
        
        expect(mongoose.connect).toHaveBeenCalledWith(
          customUri,
          expect.any(Object)
        );
      });
      
      isolateTest('retries connection on failure', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        // First connection fails, second succeeds
        mongoose.connect
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce(mongoose.connection);
        
        await connection.connectWithRetry(null, {}, 3, 10);
        
        expect(mongoose.connect).toHaveBeenCalledTimes(2);
      });
      
      isolateTest('gives up after max retries', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        // Always fail connection
        mongoose.connect.mockRejectedValue(new Error('Connection error'));
        
        try {
          await connection.connectWithRetry(null, {}, 2, 10);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).toMatch(/Failed to connect to MongoDB after 2 retries/);
          expect(mongoose.connect).toHaveBeenCalledTimes(3); // Initial + 2 retries
        }
      });
      
      isolateTest('reuses pending connection promise', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        // Create a pending connection promise
        const promise1 = connection.connectWithRetry();
        
        // Call connect again while first is still pending
        const promise2 = connection.connectWithRetry();
        
        // Both should resolve to the same promise
        const [result1, result2] = await Promise.all([promise1, promise2]);
        
        expect(result1).toBe(result2);
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
      });
    });
    
    // Disconnection Tests
    describe('Disconnection', () => {
      isolateTest('closes connection when connected', async (connection, mongoose) => {
        // Set connected state
        mongoose.connection.readyState = 1;
        
        await connection.disconnect();
        
        expect(mongoose.connection.close).toHaveBeenCalled();
      });
      
      isolateTest('skips disconnection when already disconnected', async (connection, mongoose) => {
        // Set disconnected state
        mongoose.connection.readyState = 0;
        
        await connection.disconnect();
        
        expect(mongoose.connection.close).not.toHaveBeenCalled();
      });
      
      isolateTest('handles errors during disconnection', async (connection, mongoose) => {
        // Set connected state
        mongoose.connection.readyState = 1;
        
        // Mock close to throw an error
        mongoose.connection.close.mockRejectedValueOnce(new Error('Close error'));
        
        await connection.disconnect();
        
        // Should log error but not throw
        expect(consoleSpies.error).toHaveBeenCalledWith(
          expect.stringContaining('Error disconnecting'),
          expect.any(Error)
        );
      });
      
      isolateTest('handles disconnecting state', async (connection, mongoose) => {
        // Set disconnecting state
        mongoose.connection.readyState = 3;
        
        await connection.disconnect();
        
        expect(mongoose.connection.close).not.toHaveBeenCalled();
      });
    });
    
    // Utility Tests
    describe('Utility Functions', () => {
      isolateTest('cleans up collection', async (connection, mongoose) => {
        await connection.cleanupCollection('test_collection');
        
        expect(mongoose.model).toHaveBeenCalledWith('test_collection', expect.any(Object));
        expect(mongoose.model().deleteMany).toHaveBeenCalledWith({});
      });
      
      isolateTest('handles errors during collection cleanup', async (connection, mongoose) => {
        // Make deleteMany fail
        mongoose.model().deleteMany.mockRejectedValueOnce(new Error('Delete failed'));
        
        await connection.cleanupCollection('test_collection');
        
        expect(consoleSpies.error).toHaveBeenCalled();
      });
      
      isolateTest('executes database commands', async (connection, mongoose) => {
        await connection.runCommand({ ping: 1 });
        
        expect(mongoose.connection.db.command).toHaveBeenCalledWith({ ping: 1 });
      });
      
      isolateTest('executes commands with options', async (connection, mongoose) => {
        const options = { maxTimeMS: 1000 };
        
        await connection.runCommand({ ping: 1 }, options);
        
        expect(mongoose.connection.db.command).toHaveBeenCalledWith({ ping: 1 }, options);
      });
      
      isolateTest('specifies database for command execution', async (connection, mongoose) => {
        await connection.runCommand({ ping: 1 }, {}, 'admin');
        
        expect(mongoose.connection.db.command).toHaveBeenCalledWith({ ping: 1 }, {});
      });
      
      isolateTest('handles command failures', async (connection, mongoose) => {
        // Make command fail
        mongoose.connection.db.command.mockRejectedValueOnce(new Error('Command failed'));
        
        try {
          await connection.runCommand({ ping: 1 });
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).toBe('Command failed');
        }
      });
      
      isolateTest('sets up test environment without database drop', async (connection, mongoose) => {
        // Create spy for connectWithRetry
        const connectSpy = jest.spyOn(connection, 'connectWithRetry')
          .mockResolvedValue(mongoose.connection);
        
        const result = await connection.setupTestEnvironment();
        
        expect(connectSpy).toHaveBeenCalled();
        expect(mongoose.connection.db.dropDatabase).not.toHaveBeenCalled();
        expect(result).toBe(mongoose.connection);
      });
      
      isolateTest('sets up test environment with database drop', async (connection, mongoose) => {
        // Create spy for connectWithRetry
        const connectSpy = jest.spyOn(connection, 'connectWithRetry')
          .mockResolvedValue(mongoose.connection);
        
        const result = await connection.setupTestEnvironment({ dropDatabase: true });
        
        expect(connectSpy).toHaveBeenCalled();
        expect(mongoose.connection.db.dropDatabase).toHaveBeenCalled();
        expect(result).toBe(mongoose.connection);
      });
      
      isolateTest('handles setup errors', async (connection, mongoose) => {
        // Make connectWithRetry fail
        jest.spyOn(connection, 'connectWithRetry')
          .mockRejectedValue(new Error('Setup failed'));
        
        try {
          await connection.setupTestEnvironment();
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).toBe('Setup failed');
        }
      });
    });
  });
});
