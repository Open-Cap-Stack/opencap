/**
 * Test Database Utilities
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * [Feature] OCAE-206: Enhanced validation for financial reports
 * [Feature] OCAE-208: Implement share class management endpoints
 * DB connection utilities for isolated testing
 */

const mongoose = require('mongoose');
// Using real MongoDB container instead of mongodb-memory-server for compatibility

let isConnected = false;

/**
 * Connect to MongoDB for testing with singleton pattern
 * Uses the actual MongoDB container from Docker environment
 */
const connectDB = async () => {
  // If already connected, return existing connection
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  try {
    // Use MongoDB URI from environment variable or fallback to default test container URI
    const mongoUri = process.env.MONGODB_URI || 'mongodb://opencap:password123@mongodb:27017/opencap_test?authSource=admin';
    console.log(`📊 Connecting to MongoDB at: ${mongoUri.split('@')[1]}`);
    
    const mongooseOpts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Increase timeouts for stability in Docker environment
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
      await mongoose.connect(mongoUri, mongooseOpts);
    }
    
    isConnected = true;
    console.log('✅ Connected to MongoDB container for testing');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Error connecting to test database:', error);
    throw error; // Don't exit, let the test handle the error
  }
};

/**
 * Clear the database but don't drop it - we're using a real container.
 */
const closeDatabase = async () => {
  // Don't close the connection between tests, just clear the data
  if (mongoose.connection.readyState !== 0) {
    try {
      // Instead of dropping the database, just clear all collections
      // This is safer for a shared container environment
      await clearDatabase();
      console.log('✅ Cleared test database');
    } catch (error) {
      console.error('❌ Error clearing test database:', error);
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
  // No server to export since we're using a real MongoDB container
  getTestDbUri: () => process.env.MONGODB_URI || 'mongodb://opencap:password123@mongodb:27017/opencap_test?authSource=admin',
};
