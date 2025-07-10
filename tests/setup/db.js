/**
 * Test Database Setup and Utilities
 * 
 * Provides database connection management for testing
 * Uses MongoDB Memory Server for isolated testing
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to the in-memory database
 */
async function connectDB() {
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

module.exports = {
  connectDB,
  closeDB,
  clearDB,
  createTestData
};