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
let isConnected = false;

/**
 * Connect to in-memory MongoDB for testing with singleton pattern
 */
const connectDB = async () => {
  // If already connected, return existing connection
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  try {
    // Create new in-memory server if not exists
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create({
        // Use MongoDB version 7.0.3 to ensure compatibility with Debian 12
        binary: {
          version: '7.0.3'
        },
        instance: {
          // Use a fixed port for stability
          port: 27018,
          // Disable IPv6 to prevent issues on some systems
          ip: '127.0.0.1',
          // Increase timeouts
          storageEngine: 'wiredTiger',
          args: ['--setParameter', 'maxTransactionLockRequestTimeoutMillis=5000']
        }
      });
    }
    
    const uri = mongoServer.getUri();
    
    const mongooseOpts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Increase timeouts
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      // Connection pool settings
      maxPoolSize: 20,
      minPoolSize: 5,
      // Enable retry for operations
      retryWrites: true,
      retryReads: true,
      // Close idle connections after 45 seconds
      maxIdleTimeMS: 45000,
      // Wait for majority write confirmation
      w: 'majority',
    };
    
    // Connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, mongooseOpts);
    }
    
    isConnected = true;
    console.log('✅ Connected to in-memory MongoDB server for testing');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Error connecting to test database:', error);
    throw error; // Don't exit, let the test handle the error
  }
};

/**
 * Drop database, close the connection and stop mongod.
 */
const closeDatabase = async () => {
  // Don't close the connection between tests, just clear the data
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
      console.log('✅ Dropped test database');
    } catch (error) {
      console.error('❌ Error dropping test database:', error);
      throw error; // Rethrow to fail the test
    }
  }
};

/**
 * Remove all the data for all db collections.
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      const collections = mongoose.connection.collections;
      
      // Clear each collection
      await Promise.all(
        Object.values(collections).map(async (collection) => {
          try {
            await collection.deleteMany({});
          } catch (error) {
            console.warn(`⚠️ Warning: Could not clear collection ${collection.name}:`, error.message);
          }
        })
      );
      
      console.log('✅ Cleared all test data');
    } catch (error) {
      console.error('❌ Error clearing test data:', error);
      throw error; // Rethrow to fail the test
    }
  }
};

// Aliases for compatibility with both naming conventions
const disconnectDB = async () => {
  try {
    await closeDatabase();
    
    // Only close the actual connection when explicitly asked to disconnect
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      isConnected = false;
      console.log('✅ Closed MongoDB connection');
    }
    
    // Only stop the server when explicitly asked to disconnect
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
      console.log('✅ Stopped MongoDB memory server');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from test database:', error);
    throw error;
  }
};

const clearDB = clearDatabase;

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  closeDatabase,
  clearDatabase,
  disconnectDB,
  clearDB,
  // Export mongoose for direct access if needed
  mongoose,
  // Export the server for advanced scenarios
  getMongoServer: () => mongoServer,
};
