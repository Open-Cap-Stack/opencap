/**
 * Test Setup Configuration
 *
 * Configures the test environment for both MongoDB and ZeroDB.
 * Supports dual-mode testing during migration period.
 *
 * Environment Variables:
 *   USE_ZERODB_TESTS=true - Run tests with ZeroDB mocks only
 *   USE_DUAL_MODE_TESTS=true - Run tests with both MongoDB and ZeroDB
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Try to load ZeroDB mocks - they may not exist in all environments
let zerodbMocksModule;
try {
  zerodbMocksModule = require('./utils/zerodbMocks');
} catch (error) {
  // ZeroDB mocks not available
  zerodbMocksModule = null;
}

// Determine test mode from environment
const useZeroDB = process.env.USE_ZERODB_TESTS === 'true';
const useDualMode = process.env.USE_DUAL_MODE_TESTS === 'true';

let mongo;
let zerodbMocks;

beforeAll(async () => {
  // Initialize ZeroDB mocks if enabled
  if ((useZeroDB || useDualMode) && zerodbMocksModule) {
    zerodbMocks = zerodbMocksModule.createZeroDBMocks();
    await zerodbMocks.initialize('test-project');
  }

  // Initialize MongoDB if not using ZeroDB-only mode
  if (!useZeroDB) {
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

beforeEach(async () => {
  // Clear ZeroDB mocks if enabled
  if ((useZeroDB || useDualMode) && zerodbMocksModule) {
    zerodbMocksModule.resetZeroDBMocks();
    // Re-create mocks after reset
    zerodbMocks = zerodbMocksModule.createZeroDBMocks();
  }

  // Clear MongoDB collections if not using ZeroDB-only mode
  if (!useZeroDB && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  // Clean up ZeroDB mocks
  if ((useZeroDB || useDualMode) && zerodbMocksModule) {
    zerodbMocksModule.resetZeroDBMocks();
    zerodbMocks = null;
  }

  // Clean up MongoDB if not using ZeroDB-only mode
  if (!useZeroDB) {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (mongo) {
      await mongo.stop();
    }
  }
});

/**
 * Get the current ZeroDB mocks (for test use)
 * @returns {Object|null} ZeroDB mocks or null
 */
function getZeroDBMocks() {
  return zerodbMocks;
}

/**
 * Check if using ZeroDB test mode
 * @returns {boolean}
 */
function isUsingZeroDB() {
  return useZeroDB;
}

/**
 * Check if using dual mode testing
 * @returns {boolean}
 */
function isUsingDualMode() {
  return useDualMode;
}

/**
 * Get the ZeroDB mocks module (for direct access to utilities)
 * @returns {Object|null}
 */
function getZeroDBMocksModule() {
  return zerodbMocksModule;
}

module.exports = {
  getZeroDBMocks,
  isUsingZeroDB,
  isUsingDualMode,
  getZeroDBMocksModule
};
