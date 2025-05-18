/**
 * Database Connection Tests
 * Following OpenCap TDD principles and Semantic Seed standards
 */
const mongoose = require('mongoose');
// Use the centralized test utilities
const { connectDB, disconnectDB } = require('./setup/testDB');

describe('Database Connection', () => {
  // The centralized jest.setup.js already handles the connection
  // This test just verifies the connection is active
  it('should have an active database connection', () => {
    // Connection should already be active from the global setup
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  // Test our utility functions work correctly
  it('should reconnect if disconnected', async () => {
    // First disconnect
    await disconnectDB();
    expect(mongoose.connection.readyState).not.toBe(1);
    
    // Then reconnect
    await connectDB();
    expect(mongoose.connection.readyState).toBe(1);
  });
});
