/**
 * Test Database Utilities
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
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
 * Disconnect from in-memory MongoDB server
 */
const disconnectDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  if (mongoServer) {
    await mongoServer.stop();
    console.log('Disconnected from in-memory MongoDB server');
  }
};

/**
 * Clear all collections without dropping the database
 */
const clearDB = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  console.log('Cleared all collections');
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDB
};
