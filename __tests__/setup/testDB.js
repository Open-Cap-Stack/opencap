/**
 * Test Database Utilities
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * [Feature] OCAE-206: Enhanced validation for financial reports
 * [Feature] OCAE-208: Implement share class management endpoints
 * DB connection utilities for isolated testing
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
const connectDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    const mongooseOpts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    
    await mongoose.connect(uri, mongooseOpts);
    console.log('✅ Connected to in-memory MongoDB server for testing');
  } catch (error) {
    console.error('❌ Error connecting to test database:', error);
    process.exit(1);
  }
};

/**
 * Drop database, close the connection and stop mongod.
 */
const closeDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      
      if (mongoServer) {
        await mongoServer.stop();
        console.log('✅ Disconnected from in-memory MongoDB server');
      }
    }
  } catch (error) {
    console.error('❌ Error disconnecting from test database:', error);
  }
};

/**
 * Remove all the data for all db collections.
 */
const clearDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;

      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
      console.log('✅ Test database cleared');
    }
  } catch (error) {
    console.error('❌ Error clearing test database:', error);
  }
};

// Aliases for compatibility with both naming conventions
const disconnectDB = closeDatabase;
const clearDB = clearDatabase;

module.exports = {
  connectDB,
  closeDatabase,
  clearDatabase,
  // Aliases
  disconnectDB,
  clearDB
};
