// __tests__/setup/jest.setup.js
// ... existing code ...

// Set Mongoose options to suppress deprecation warnings
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

// Suppress deprecation warnings
const originalConsoleWarn = console.warn;
console.warn = function(msg) {
  if (msg.includes('collection.ensureIndex is deprecated')) return;
  originalConsoleWarn.apply(console, arguments);
};

// Load Docker test environment configuration
const { setupDockerTestEnv, checkDockerContainersRunning } = require('./docker-test-env');

// Configure higher timeout for tests that might need to wait for Docker services
jest.setTimeout(30000);

beforeAll(async () => {
  // Set up Docker test environment variables
  setupDockerTestEnv();
  
  // Check if Docker test containers are running
  try {
    await checkDockerContainersRunning();
  } catch (error) {
    console.warn('⚠️ Docker test containers not detected. Some integration tests may fail.');
    console.warn('To fix: run "docker-compose -f docker-compose.test.yml up -d"');
  }
  
  // Suppress console logs during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console
  jest.restoreAllMocks();
});