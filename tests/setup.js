/**
 * Test Setup Configuration
 *
 * Configures the test environment for ZeroDB using mocks.
 * MongoDB has been removed - all tests use ZeroDB mocks.
 *
 * The ZeroDB service is automatically mocked to avoid requiring
 * authentication credentials during testing.
 */

// Increase Jest timeout for setup/teardown hooks (30 seconds)
jest.setTimeout(30000);

// Load ZeroDB mocks
const zerodbMocksModule = require('./utils/zerodbMocks');
const { zerodbMock } = require('./mocks');

// Store the mock instance
let zerodbMocks;

// Mock the ZeroDB service module
jest.mock('../services/zerodbService', () => {
  const mockData = new Map();
  let idCounter = 0;

  const generateId = () => {
    idCounter++;
    return `mock-id-${Date.now()}-${idCounter}`;
  };

  return {
    // Basic initialization
    initialize: jest.fn().mockResolvedValue({
      projectId: 'test-project-id',
      databaseStatus: { status: 'active' }
    }),
    initializeProject: jest.fn().mockResolvedValue({
      id: 'test-project-id',
      name: 'OpenCap Test'
    }),
    projectId: 'test-project-id',
    token: 'mock-token',

    // Table operations
    createTable: jest.fn().mockResolvedValue({ success: true }),
    deleteTable: jest.fn().mockResolvedValue({ success: true }),
    listTables: jest.fn().mockResolvedValue([]),

    // Row operations
    insertRow: jest.fn().mockImplementation((tableName, data) => {
      const id = data._id || generateId();
      const row = { _id: id, row_id: id, ...data, createdAt: new Date().toISOString() };
      return Promise.resolve({ data: [row] });
    }),
    insertRows: jest.fn().mockImplementation((tableName, rows) => {
      const results = rows.map(data => {
        const id = data._id || generateId();
        return { _id: id, row_id: id, ...data, createdAt: new Date().toISOString() };
      });
      return Promise.resolve({ data: results });
    }),
    queryTable: jest.fn().mockResolvedValue([]),
    queryRows: jest.fn().mockResolvedValue([]),
    updateRows: jest.fn().mockResolvedValue({ modified_count: 1, matched_count: 1 }),
    updateRowsByQuery: jest.fn().mockResolvedValue({ modified_count: 1, matched_count: 1 }),
    deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    deleteRowsByQuery: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    deleteRowById: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    countRows: jest.fn().mockResolvedValue(0),

    // Vector operations
    upsertVector: jest.fn().mockResolvedValue({ success: true, vectorId: 'mock-vector-id' }),
    searchVectors: jest.fn().mockResolvedValue({ results: [] }),
    listVectors: jest.fn().mockResolvedValue({ vectors: [] }),

    // Memory operations
    storeMemory: jest.fn().mockResolvedValue({ success: true }),
    listMemory: jest.fn().mockResolvedValue({ memories: [] }),

    // Event operations
    publishEvent: jest.fn().mockResolvedValue({ success: true }),
    listEvents: jest.fn().mockResolvedValue({ events: [] }),

    // File operations
    uploadFileMetadata: jest.fn().mockResolvedValue({ success: true }),
    listFiles: jest.fn().mockResolvedValue({ files: [] }),

    // RLHF and agent operations
    logRLHF: jest.fn().mockResolvedValue({ success: true }),
    storeAgentLog: jest.fn().mockResolvedValue({ success: true }),
    listAgentLogs: jest.fn().mockResolvedValue({ logs: [] }),

    // Database status
    getDatabaseStatus: jest.fn().mockResolvedValue({ status: 'active' }),

    // Internal helper
    _normalizeFilterForZeroDB: jest.fn().mockImplementation(filter => filter)
  };
});

beforeAll(async () => {
  try {
    // Initialize ZeroDB mocks
    zerodbMocks = zerodbMocksModule.createZeroDBMocks();
    await zerodbMocks.initialize('test-project');

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_ZERODB = 'true';
    process.env.ZERODB_API_KEY = 'test-api-key';
    process.env.AINATIVE_API_TOKEN = 'test-token';
  } catch (error) {
    console.error('Test setup beforeAll error:', error.message);
    // Don't throw - let tests handle initialization gracefully
  }
}, 30000);

beforeEach(async () => {
  try {
    // Clear and reset ZeroDB mocks before each test
    zerodbMocksModule.resetZeroDBMocks();
    zerodbMocks = zerodbMocksModule.createZeroDBMocks();

    // Also reset the service mock
    const zerodbService = require('../services/zerodbService');
    Object.keys(zerodbService).forEach(key => {
      if (zerodbService[key] && typeof zerodbService[key].mockClear === 'function') {
        zerodbService[key].mockClear();
      }
    });
  } catch (error) {
    // Ignore errors during beforeEach - tests may have custom setup
  }
}, 15000);

afterAll(async () => {
  try {
    // Clean up ZeroDB mocks
    zerodbMocksModule.resetZeroDBMocks();
    zerodbMocks = null;
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
 * Always returns true since MongoDB has been removed
 * @returns {boolean}
 */
function isUsingZeroDB() {
  return true;
}

/**
 * Check if using dual mode testing
 * Always returns false since MongoDB has been removed
 * @returns {boolean}
 */
function isUsingDualMode() {
  return false;
}

/**
 * Get the ZeroDB mocks module (for direct access to utilities)
 * @returns {Object}
 */
function getZeroDBMocksModule() {
  return zerodbMocksModule;
}

/**
 * Get the mocked ZeroDB service
 * @returns {Object} The mocked zerodbService module
 */
function getMockedZeroDBService() {
  return require('../services/zerodbService');
}

/**
 * Seed test data into ZeroDB mock storage
 * @param {string} tableName - Name of the table
 * @param {Array} data - Array of data objects to seed
 */
function seedTestData(tableName, data) {
  zerodbMocksModule.seedMockData(tableName, data);
}

/**
 * Clear test data from a specific table
 * @param {string} tableName - Name of the table to clear
 */
function clearTestData(tableName) {
  zerodbMocksModule.clearMockTable(tableName);
}

/**
 * Clear all test data from all tables
 */
function clearAllTestData() {
  zerodbMocksModule.clearAllMockTables();
}

module.exports = {
  getZeroDBMocks,
  isUsingZeroDB,
  isUsingDualMode,
  getZeroDBMocksModule,
  getMockedZeroDBService,
  seedTestData,
  clearTestData,
  clearAllTestData
};
