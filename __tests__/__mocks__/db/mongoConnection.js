/**
 * Mock MongoDB Connection for Testing
 * 
 * This mock replaces the actual MongoDB connection for testing purposes.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Mock the connectToMongoDB function
const connectToMongoDB = async () => {
  try {
    // Create new in-memory server if not exists
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          port: 27018,
          ip: '127.0.0.1',
          storageEngine: 'wiredTiger',
        }
      });
    }
    
    const uri = mongoServer.getUri();
    
    const mongooseOpts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
    };

    // Connect to the in-memory database
    await mongoose.connect(uri, mongooseOpts);
    
    console.log('Connected to in-memory MongoDB for testing');
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to in-memory MongoDB:', error);
    throw error;
  }
};

// Mock the closeMongoDBConnection function
const closeMongoDBConnection = async () => {
  try {
    if (mongoose.connection) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    
    console.log('Closed in-memory MongoDB connection');
  } catch (error) {
    console.error('Error closing in-memory MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectToMongoDB,
  closeMongoDBConnection
};
