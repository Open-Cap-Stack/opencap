// Test setup file to handle MongoDB connection and model cleanup
const mongoose = require('mongoose');

// Clear the test database before each test
beforeEach(async () => {
  // Skip if not in test environment
  if (process.env.NODE_ENV !== 'test') return;
  
  // Get all models
  const collections = Object.keys(mongoose.connection.collections);
  
  // Clear each collection
  for (const collection of collections) {
    try {
      await mongoose.connection.collections[collection].deleteMany({});
    } catch (error) {
      // Collection might not exist, which is fine
    }
  }
});

// Close the connection after all tests are done
afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});
