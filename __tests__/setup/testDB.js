/**
 * Test Database Setup
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * DB connection utilities for testing
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Connect to the in-memory database
const connectDB = async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Error connecting to test database:', error);
    process.exit(1);
  }
};

// Close the database connection
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    console.log('✅ Disconnected from test database');
  } catch (error) {
    console.error('❌ Error disconnecting from test database:', error);
  }
};

// Clear all data in the database
const clearDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    console.log('✅ Test database cleared');
  } catch (error) {
    console.error('❌ Error clearing test database:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDB
};
