// __tests__/setup/jest.setup.js
// ... existing code ...

// Set Mongoose options to suppress deprecation warnings
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

// Import MongoDB connection utility
const mongoDbConnection = require('../../utils/mongoDbConnection');

// Suppress deprecation warnings
const originalConsoleWarn = console.warn;
console.warn = function(msg) {
  if (msg.includes('collection.ensureIndex is deprecated')) return;
  originalConsoleWarn.apply(console, arguments);
};

// Load Docker test environment configuration
const { setupDockerTestEnv, checkDockerContainersRunning } = require('./docker-test-env');

// Configure higher timeout for tests that might need to wait for Docker services
jest.setTimeout(120000); // Increased from 45000ms to 120000ms (2 minutes) for MongoDB connection retries

// Global setup and cleanup for MongoDB connections
let mongoConnection = null;

beforeAll(async () => {
  // Set up Docker test environment variables
  setupDockerTestEnv();
  
  // Check if Docker test containers are running
  try {
    await checkDockerContainersRunning();
    
    // Establish MongoDB connection for the test suite with extended timeout
    const mongoOptions = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    mongoConnection = await mongoDbConnection.connectWithRetry(null, mongoOptions, 5, 1000);
    
    // Ensure collections are properly indexed
    await mongoose.connection.db.listCollections().toArray();
  } catch (error) {
    console.warn('⚠️ Docker test containers not detected or connection failed:', error.message);
    console.warn('To fix: run "docker-compose -f docker-compose.test.yml up -d"');
  }
  
  // Suppress console logs during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Add global afterEach hook to help with test isolation
afterEach(async () => {
  // Clean up any lingering operations
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterAll(async () => {
  // Restore console
  jest.restoreAllMocks();
  
  // Close MongoDB connection properly
  if (mongoConnection) {
    await mongoDbConnection.disconnect();
  }
});