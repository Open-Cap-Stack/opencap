/**
 * Test Database Utilities
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * [Feature] OCAE-206: Enhanced validation for financial reports
 * In-memory MongoDB for isolated testing
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  
  await mongoose.connect(uri, mongooseOpts);
  console.log('Connected to in-memory MongoDB server for testing');
};

/**
 * Drop database, close the connection and stop mongod.
 */
const closeDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    if (mongoServer) {
      await mongoServer.stop();
      console.log('Disconnected from in-memory MongoDB server');
    }
  }
};

/**
 * Remove all the data for all db collections.
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    console.log('Cleared all collections');
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
