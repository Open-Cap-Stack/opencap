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

// Increase Jest timeout for setup/teardown hooks (30 seconds)
jest.setTimeout(30000);

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
let isMongoInitialized = false;

beforeAll(async () => {
  try {
    // Initialize ZeroDB mocks if enabled
    if ((useZeroDB || useDualMode) && zerodbMocksModule) {
      zerodbMocks = zerodbMocksModule.createZeroDBMocks();
      await zerodbMocks.initialize('test-project');
    }

    // Initialize MongoDB if not using ZeroDB-only mode
    if (!useZeroDB) {
      // Skip if already connected (from another test file)
      if (mongoose.connection.readyState === 1) {
        isMongoInitialized = true;
        return;
      }

      // Disconnect any existing connection first
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch (err) {
          // Ignore disconnect errors
        }
      }

      mongo = await MongoMemoryServer.create();
      const mongoUri = mongo.getUri();

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      isMongoInitialized = true;
    }
  } catch (error) {
    console.error('Test setup beforeAll error:', error.message);
    // Don't throw - let tests handle missing connections gracefully
  }
}, 30000);

beforeEach(async () => {
  try {
    // Clear ZeroDB mocks if enabled
    if ((useZeroDB || useDualMode) && zerodbMocksModule) {
      zerodbMocksModule.resetZeroDBMocks();
      // Re-create mocks after reset
      zerodbMocks = zerodbMocksModule.createZeroDBMocks();
    }

    // Clear MongoDB collections if not using ZeroDB-only mode
    if (!useZeroDB && mongoose.connection.readyState === 1 && mongoose.connection.db) {
      try {
        const collections = await mongoose.connection.db.collections();
        for (const collection of collections) {
          try {
            await collection.deleteMany({});
          } catch (err) {
            // Ignore errors during cleanup
          }
        }
      } catch (err) {
        // Ignore errors during collection cleanup
      }
    }
  } catch (error) {
    // Ignore errors during beforeEach - tests may not need DB
  }
}, 15000);

afterAll(async () => {
  try {
    // Clean up ZeroDB mocks
    if ((useZeroDB || useDualMode) && zerodbMocksModule) {
      zerodbMocksModule.resetZeroDBMocks();
      zerodbMocks = null;
    }

    // Clean up MongoDB if not using ZeroDB-only mode
    if (!useZeroDB && isMongoInitialized) {
      if (mongoose.connection.readyState === 1) {
        try {
          await mongoose.connection.dropDatabase();
        } catch (err) {
          // Ignore drop errors
        }
        try {
          await mongoose.connection.close();
        } catch (err) {
          // Ignore close errors
        }
      }

      if (mongo) {
        try {
          await mongo.stop();
        } catch (err) {
          // Ignore stop errors
        }
        mongo = null;
      }
      isMongoInitialized = false;
    }
  } catch (error) {
    console.error('Test setup afterAll error:', error.message);
  }
}, 30000);

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
