// __tests__/setup/jest.setup.js
// Test setup for OpenCap project
// Following Semantic Seed Venture Studio Coding Standards V2.0

// Set Mongoose options to suppress deprecation warnings
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

// Import test database utilities
const { connectDB, clearDB, disconnectDB } = require('./testDB');

// Suppress deprecation warnings
const originalConsoleWarn = console.warn;
console.warn = function(msg) {
  if (msg.includes('collection.ensureIndex is deprecated') || 
      msg.includes('Mongoose: the `strictQuery`')) {
    return;
  }
  originalConsoleWarn.apply(console, arguments);
};

// Load Docker test environment configuration
const { setupDockerTestEnv, checkDockerContainersRunning } = require('./docker-test-env');

// Configure higher timeout for tests that might need to wait for Docker services
jest.setTimeout(60000); // Increased to 60s to handle slower CI environments

// Global setup and cleanup for MongoDB connections
beforeAll(async () => {
  // Set up Docker test environment variables
  setupDockerTestEnv();
  
  // Check if Docker test containers are running
  try {
    await checkDockerContainersRunning();
    
    // Connect to the test database
    const connection = await connectDB();
    
    // Ensure the connection is valid before accessing the database
    if (connection && connection.db) {
      // Ensure collections are properly indexed
      await connection.db.listCollections().toArray();
    }
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all test data but keep the connection open
    await clearDB();
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
  }
});

// Clean up after all tests are done
afterAll(async () => {
  try {
    // Disconnect from the test database
    await disconnectDB();
  } catch (error) {
    console.error('❌ Error during test teardown:', error);
    process.exit(1);
  }
});

// Global test setup
describe('Test Environment', () => {
  beforeAll(() => {
    // Suppress console logs during tests
    if (process.env.DEBUG !== 'true') {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    }
  });

  // Add a simple test to verify the test environment
  it('should have a working test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});