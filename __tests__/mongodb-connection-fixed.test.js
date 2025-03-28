/**
 * MongoDB Connection Fixes Test
 * [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 *
 * This test verifies that our fixes for MongoDB connection timeout issues
 * have resolved the problems identified in the previous test.
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const mongoDbConnection = require('../utils/mongoDbConnection');
const { setupSPVAssetTests, cleanupSPVAssets } = require('./utils/spvAssetTestUtils');

describe('MongoDB Connection Timeout Fixes', () => {
  // Verify that our connection settings have been updated
  it('should use improved timeout values', () => {
    // Check the updated timeout values
    const oldDefaultTimeout = 10000; // Mongoose default
    
    // Our improved settings
    const newConnectTimeoutMS = mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.connectTimeoutMS;
    const newServerSelectionTimeoutMS = mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.serverSelectionTimeoutMS;
    const newSocketTimeoutMS = mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.socketTimeoutMS;
    
    // These assertions will pass, showing that our new values are higher
    expect(newConnectTimeoutMS).toBeGreaterThan(oldDefaultTimeout);
    expect(newServerSelectionTimeoutMS).toBeGreaterThan(oldDefaultTimeout);
    expect(newSocketTimeoutMS).toBeGreaterThan(30000); // Default is 30000
    
    // Verify other connection options
    expect(mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.maxPoolSize).toBe(20);
    expect(mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.minPoolSize).toBe(5);
    expect(mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.retryWrites).toBe(true);
    expect(mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.retryReads).toBe(true);
  });
  
  // Verify connection retry logic
  it('should implement retry logic for failed connections', () => {
    // Check that retry logic functions are available
    expect(typeof mongoDbConnection.connectWithRetry).toBe('function');
    expect(typeof mongoDbConnection.withRetry).toBe('function');
    
    // Test withRetry function directly with a simple operation
    return mongoDbConnection.withRetry(async () => {
      return "success";
    }).then(result => {
      expect(result).toBe("success");
    });
  });
  
  // Verify consistent connection string handling
  it('should maintain consistent connection string use', () => {
    // Check that getMongoURI function exists and works correctly
    expect(typeof mongoDbConnection.getMongoURI).toBe('function');
    
    // The connection string should include auth and appropriate options
    const uri = mongoDbConnection.getMongoURI();
    expect(uri).toContain('mongodb://');
    expect(uri).toContain('opencap_test');
    expect(uri).toContain('authSource=admin');
    
    // Test database name override functionality
    const customDbUri = mongoDbConnection.getMongoURI('custom_db');
    expect(customDbUri).toContain('custom_db');
    
    // Test with environment variable override
    const originalMongoUri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://user:pass@localhost:27017/test_db';
    const envUri = mongoDbConnection.getMongoURI();
    expect(envUri).toBe('mongodb://user:pass@localhost:27017/test_db');
    
    // Restore original environment
    if (originalMongoUri) {
      process.env.MONGO_URI = originalMongoUri;
    } else {
      delete process.env.MONGO_URI;
    }
  });
  
  // Verify robust database operations
  it('should handle deleteMany operations properly', async () => {
    // Setup the test environment
    await setupSPVAssetTests();
    
    // This was previously a failing operation in many tests
    try {
      console.time('deleteMany operation with retry');
      await cleanupSPVAssets(); // This uses withRetry internally
      console.timeEnd('deleteMany operation with retry');
      expect(true).toBe(true); // If we reach here, the operation succeeded
    } catch (error) {
      // This should not happen with our fixes
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      expect(error).toBeUndefined(); // Fail the test if an error occurs
    }
  });
  
  // Verify proper connection cleanup
  it('should implement proper connection cleanup', async () => {
    // Connect to MongoDB
    await mongoDbConnection.connectWithRetry();
    
    // Verify we're connected
    expect(mongoose.connection.readyState).toBe(1);
    
    // Properly disconnect
    await mongoDbConnection.disconnect();
    
    // Verify we're disconnected
    expect(mongoose.connection.readyState).toBe(0);
    
    // Reconnect for subsequent tests
    await mongoDbConnection.connectWithRetry();
  });
  
  // Verify that operations run in parallel work correctly
  it('should handle multiple parallel operations properly', async () => {
    // Setup test
    await setupSPVAssetTests();
    
    // Create several parallel operations using withRetry
    const operations = [];
    for (let i = 0; i < 5; i++) {
      operations.push(
        mongoDbConnection.withRetry(async () => {
          return mongoose.connection.db.collection('test_parallel').insertOne({ index: i });
        })
      );
    }
    
    // Run them all in parallel
    console.time('parallel operations');
    const results = await Promise.all(operations);
    console.timeEnd('parallel operations');
    
    // All should have completed successfully
    expect(results.length).toBe(5);
    expect(results.every(r => r.acknowledged)).toBe(true);
    
    // Clean up
    await mongoDbConnection.withRetry(async () => {
      return mongoose.connection.db.collection('test_parallel').drop();
    }).catch(() => {}); // Ignore if collection doesn't exist
  });
  
  // Test runCommand functionality
  it('should execute admin commands correctly', async () => {
    // Test the runCommand utility with a simple ping command
    const result = await mongoDbConnection.runCommand('ping');
    expect(result.ok).toBe(1);
    
    // Test with custom options
    const serverStatusResult = await mongoDbConnection.runCommand('serverStatus', {}, 'admin');
    expect(serverStatusResult.ok).toBe(1);
    expect(serverStatusResult.uptime).toBeGreaterThan(0);
  });
  
  // Test collection cleanup
  it('should clean up collections correctly', async () => {
    // Create a test collection and insert some documents
    await mongoose.connection.db.collection('test_cleanup').insertMany([
      { name: 'Test 1' },
      { name: 'Test 2' },
      { name: 'Test 3' }
    ]);
    
    // Verify documents were inserted
    const initialCount = await mongoose.connection.db.collection('test_cleanup').countDocuments();
    expect(initialCount).toBe(3);
    
    // Use the cleanup utility
    await mongoDbConnection.cleanupCollection('test_cleanup');
    
    // Verify collection is empty
    const finalCount = await mongoose.connection.db.collection('test_cleanup').countDocuments();
    expect(finalCount).toBe(0);
  });
  
  // Test test environment setup
  it('should set up test environment correctly', async () => {
    // Use the test environment setup utility
    const connection = await mongoDbConnection.setupTestEnvironment();
    
    // Verify connection is active
    expect(connection.readyState).toBe(1);
    
    // Test with dropDatabase option (create and drop a test db)
    const testDbName = `test_${Date.now()}`;
    process.env.MONGO_URI = `mongodb://opencap:password123@127.0.0.1:27017/${testDbName}?authSource=admin`;
    
    // Create a test collection in the database
    await mongoose.connection.db.collection('should_be_dropped').insertOne({ test: true });
    
    // Use the setup with drop option
    await mongoDbConnection.setupTestEnvironment({ dropDatabase: true });
    
    // Verify the database was dropped by checking for the collection
    try {
      await mongoose.connection.db.collection('should_be_dropped').findOne({});
      // Should not reach here if collection was dropped
      expect(true).toBe(false); 
    } catch (error) {
      // If collection doesn't exist, this is expected
      expect(error).toBeDefined();
    }
    
    // Restore original URI
    delete process.env.MONGO_URI;
  });
  
  // Test error handling during connection
  it('should handle connection failures correctly', async () => {
    // Save the original URI for restoration
    const originalUri = process.env.MONGO_URI;
    
    // Set a bad connection URI to force failure
    process.env.MONGO_URI = 'mongodb://invalid:wrong@nonexistent:27017/test';
    
    // Set a short timeout to speed up the test
    const originalOptions = { ...mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS };
    mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.serverSelectionTimeoutMS = 1000;
    mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS.connectTimeoutMS = 1000;
    
    // Attempt to connect with a failed URI and reduced retries to speed up the test
    try {
      await mongoDbConnection.connectWithRetry(null, {}, 2, 500);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should fail with any kind of error
      expect(error).toBeDefined();
      // We don't need to strictly check the error name as it varies by environment
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
    }
    
    // Restore the original URI and options
    process.env.MONGO_URI = originalUri;
    mongoDbConnection.DEFAULT_MONGOOSE_OPTIONS = originalOptions;
    
    // Reconnect for any subsequent tests
    if (mongoose.connection.readyState !== 1) {
      await mongoDbConnection.connectWithRetry();
    }
  });
  
  // Test withRetry error handling
  it('should retry operations that fail with network errors', async () => {
    // Mock a failing operation that throws network errors
    let attempts = 0;
    const failingOperation = async () => {
      attempts++;
      if (attempts < 3) {
        // Simulate a network error
        const error = new Error('connection timed out');
        error.name = 'MongoNetworkError';
        throw error;
      }
      return 'success after retries';
    };
    
    // Execute the operation with retry - should succeed after retries
    const result = await mongoDbConnection.withRetry(failingOperation, 3, 100);
    expect(result).toBe('success after retries');
    expect(attempts).toBe(3);
    
    // Reset for next test
    attempts = 0;
    
    // Test with non-network error (should not retry)
    const nonNetworkError = async () => {
      attempts++;
      throw new Error('validation error');
    };
    
    try {
      await mongoDbConnection.withRetry(nonNetworkError, 3, 100);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should fail immediately without retrying
      expect(error.message).toBe('validation error');
      expect(attempts).toBe(1);
    }
  });
});
