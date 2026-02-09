/**
 * Test Database Setup and Utilities
 *
 * Provides database connection management for testing using ZeroDB mocks.
 * MongoDB has been removed - all tests use ZeroDB mocks.
 *
 * Usage:
 *   const { connectDB, closeDB, clearDB, createTestData } = require('./db');
 *
 *   beforeAll(async () => await connectDB());
 *   afterAll(async () => await closeDB());
 *   beforeEach(async () => await clearDB());
 */

// Load ZeroDB mocks
const zerodbMocksModule = require('../utils/zerodbMocks');

let zerodbMocks;

/**
 * Connect to the ZeroDB mock database
 * @returns {Object} ZeroDB mock service
 */
async function connectDB() {
  try {
    zerodbMocks = zerodbMocksModule.createZeroDBMocks();
    await zerodbMocks.initialize('test-project-db');
    console.log('ZeroDB mock database connected successfully');
    return zerodbMocks;
  } catch (error) {
    console.error('Error initializing ZeroDB mocks:', error);
    throw error;
  }
}

/**
 * @deprecated Use connectDB() instead
 */
async function connectZeroDB() {
  return connectDB();
}

/**
 * @deprecated MongoDB has been removed. Returns null.
 */
async function connectMongoDB() {
  console.warn('connectMongoDB is deprecated. MongoDB has been removed. Using ZeroDB mocks instead.');
  return connectDB();
}

/**
 * Close database connection
 */
async function closeDB() {
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
 * @deprecated Use closeDB() instead
 */
async function closeZeroDB() {
  return closeDB();
}

/**
 * @deprecated MongoDB has been removed. Use closeDB().
 */
async function closeMongoDB() {
  console.warn('closeMongoDB is deprecated. MongoDB has been removed.');
  return closeDB();
}

/**
 * Clear all data in the database
 */
async function clearDB() {
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
 * @deprecated Use clearDB() instead
 */
async function clearZeroDB() {
  return clearDB();
}

/**
 * @deprecated MongoDB has been removed. Use clearDB().
 */
async function clearMongoDB() {
  console.warn('clearMongoDB is deprecated. MongoDB has been removed.');
  return clearDB();
}

/**
 * Create test data for a given table/model
 * @param {string} tableNameOrModel - Table name or model (string for ZeroDB)
 * @param {Object|Array} data - Data to insert
 * @returns {Object|Array} Inserted data
 */
async function createTestData(tableNameOrModel, data) {
  try {
    const tableName = typeof tableNameOrModel === 'string'
      ? tableNameOrModel
      : tableNameOrModel.modelName || tableNameOrModel.collection?.name || 'unknown';

    if (Array.isArray(data)) {
      zerodbMocksModule.seedMockData(tableName, data);
      return data;
    } else {
      zerodbMocksModule.seedMockData(tableName, [data]);
      return data;
    }
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
}

/**
 * @deprecated Use createTestData() instead
 */
async function createZeroDBTestData(tableName, data) {
  return createTestData(tableName, data);
}

/**
 * @deprecated MongoDB has been removed. Use createTestData().
 */
async function createMongoDBTestData(Model, data) {
  console.warn('createMongoDBTestData is deprecated. Using ZeroDB mock.');
  const tableName = Model.modelName || Model.collection?.name || 'unknown';
  return createTestData(tableName, data);
}

/**
 * Get the current database service
 * @returns {Object} ZeroDB mocks
 */
function getDBService() {
  return zerodbMocks || zerodbMocksModule.createZeroDBMocks();
}

/**
 * Check if using ZeroDB test mode
 * Always returns true since MongoDB has been removed
 * @returns {boolean}
 */
function isUsingZeroDB() {
  return true;
}

/**
 * Get mock storage for ZeroDB assertions
 * @returns {Object} Mock storage
 */
function getZeroDBMockStorage() {
  return zerodbMocksModule.getMockStorage();
}

/**
 * Seed test data directly into ZeroDB mock storage
 * @param {string} tableName - Table to seed
 * @param {Array} data - Array of rows
 */
function seedZeroDBData(tableName, data) {
  zerodbMocksModule.seedMockData(tableName, data);
}

/**
 * Get the ZeroDB mocks module for advanced usage
 * @returns {Object} ZeroDB mocks module
 */
function getZeroDBMocksModule() {
  return zerodbMocksModule;
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
  getZeroDBMocksModule,
  // Legacy exports for backward compatibility (deprecated)
  connectMongoDB,
  closeMongoDB,
  clearMongoDB,
  createMongoDBTestData,
  // ZeroDB specific exports (deprecated - use main functions)
  connectZeroDB,
  closeZeroDB,
  clearZeroDB,
  createZeroDBTestData
};
