/**
 * Test Database Setup and Utilities
 *
 * Provides database connection management for testing.
 * Supports both MongoDB Memory Server (legacy) and ZeroDB mocks (migration target).
 *
 * Usage:
 *   const { connectDB, closeDB, clearDB, createTestData } = require('./db');
 *
 *   beforeAll(async () => await connectDB());
 *   afterAll(async () => await closeDB());
 *   beforeEach(async () => await clearDB());
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Try to load ZeroDB mocks - they may not exist in all environments
let zerodbMocksModule;
try {
  zerodbMocksModule = require('../utils/zerodbMocks');
} catch (error) {
  // ZeroDB mocks not available
  zerodbMocksModule = null;
}

// Determine test mode from environment
const useZeroDB = process.env.USE_ZERODB_TESTS === 'true';

let mongoServer;
let zerodbMocks;

/**
 * Connect to the in-memory database
 */
async function connectDB() {
  if (useZeroDB && zerodbMocksModule) {
    return connectZeroDB();
  }
  return connectMongoDB();
}

/**
 * Connect to ZeroDB mock environment
 * @returns {Object} ZeroDB mock service
 */
async function connectZeroDB() {
  if (!zerodbMocksModule) {
    throw new Error('ZeroDB mocks not available');
  }

  try {
    zerodbMocks = zerodbMocksModule.createZeroDBMocks();
    await zerodbMocks.initialize('test-token-db');
    console.log('ZeroDB mock database connected successfully');
    return zerodbMocks;
  } catch (error) {
    console.error('Error initializing ZeroDB mocks:', error);
    throw error;
  }
}

/**
 * Connect to MongoDB in-memory database
 * @returns {Object} Mongoose connection
 */
async function connectMongoDB() {
  try {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27018, // Use different port for tests
        dbName: 'opencap_test'
      }
    });

    const mongoUri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Test database connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
}

/**
 * Close database connection and stop in-memory server
 */
async function closeDB() {
  if (useZeroDB && zerodbMocksModule) {
    return closeZeroDB();
  }
  return closeMongoDB();
}

/**
 * Close ZeroDB mock environment
 */
async function closeZeroDB() {
  try {
    if (zerodbMocksModule) {
      zerodbMocksModule.resetZeroDBMocks();
    }
    zerodbMocks = null;
    console.log('ZeroDB mock database disconnected successfully');
  } catch (error) {
    console.error('Error closing ZeroDB mocks:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
async function closeMongoDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log('Test database disconnected successfully');
  } catch (error) {
    console.error('Error closing test database:', error);
    throw error;
  }
}

/**
 * Clear all collections in the database
 */
async function clearDB() {
  if (useZeroDB && zerodbMocksModule) {
    return clearZeroDB();
  }
  return clearMongoDB();
}

/**
 * Clear ZeroDB mock data
 */
async function clearZeroDB() {
  try {
    if (zerodbMocksModule) {
      zerodbMocksModule.clearAllMockTables();
    }
    console.log('ZeroDB mock database cleared');
  } catch (error) {
    console.error('Error clearing ZeroDB mocks:', error);
    throw error;
  }
}

/**
 * Clear MongoDB collections
 */
async function clearMongoDB() {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    console.log('Test database cleared');
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
}

/**
 * Create test data for a given model
 */
async function createTestData(Model, data) {
  if (useZeroDB && zerodbMocksModule && typeof Model === 'string') {
    return createZeroDBTestData(Model, data);
  }
  return createMongoDBTestData(Model, data);
}

/**
 * Create test data in ZeroDB mock
 * @param {string} tableName - Table name
 * @param {Object|Array} data - Data to insert
 * @returns {Object} Insert result
 */
async function createZeroDBTestData(tableName, data) {
  try {
    if (Array.isArray(data)) {
      zerodbMocksModule.seedMockData(tableName, data);
      return data;
    } else {
      zerodbMocksModule.seedMockData(tableName, [data]);
      return data;
    }
  } catch (error) {
    console.error('Error creating ZeroDB test data:', error);
    throw error;
  }
}

/**
 * Create test data in MongoDB
 * @param {Object} Model - Mongoose model
 * @param {Object|Array} data - Data to insert
 * @returns {Object|Array} Created documents
 */
async function createMongoDBTestData(Model, data) {
  try {
    if (Array.isArray(data)) {
      return await Model.insertMany(data);
    } else {
      return await Model.create(data);
    }
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
}

/**
 * Get the current database service
 * @returns {Object} ZeroDB mocks or Mongoose connection
 */
function getDBService() {
  if (useZeroDB && zerodbMocks) {
    return zerodbMocks;
  }
  return mongoose.connection;
}

/**
 * Check if using ZeroDB test mode
 * @returns {boolean}
 */
function isUsingZeroDB() {
  return useZeroDB;
}

/**
 * Get mock storage for ZeroDB assertions
 * @returns {Object|null} Mock storage or null if using MongoDB
 */
function getZeroDBMockStorage() {
  if (useZeroDB && zerodbMocksModule) {
    return zerodbMocksModule.getMockStorage();
  }
  return null;
}

/**
 * Seed test data directly into ZeroDB mock storage
 * @param {string} tableName - Table to seed
 * @param {Array} data - Array of rows
 */
function seedZeroDBData(tableName, data) {
  if (useZeroDB && zerodbMocksModule) {
    zerodbMocksModule.seedMockData(tableName, data);
  } else {
    console.warn('seedZeroDBData called but not using ZeroDB test mode');
  }
}

module.exports = {
  connectDB,
  closeDB,
  clearDB,
  createTestData,
  getDBService,
  isUsingZeroDB,
  getZeroDBMockStorage,
  seedZeroDBData,
  // Legacy exports for backward compatibility
  connectMongoDB,
  closeMongoDB,
  clearMongoDB,
  createMongoDBTestData,
  // ZeroDB specific exports
  connectZeroDB,
  closeZeroDB,
  clearZeroDB,
  createZeroDBTestData
};
