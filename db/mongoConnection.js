/**
 * MongoDB Connection Module
 * Feature: OCDI-101: Set up MongoDB connection
 * Issue #32: MongoDB is OPTIONAL - Only for Continuous Sync Feature
 * Issue #175: Complete ZeroDB migration - conditional mongoose loading
 *
 * IMPORTANT: This module is ONLY used for the continuous sync feature (GitHub Issue #14).
 * MongoDB is NOT the primary database - ZeroDB is used for all application data.
 *
 * This connection is only established when:
 * - SYNC_ENABLED=true in environment variables
 * - MIGRATION_MODE is not 'zerodb-only'
 * - The continuous sync feature is active
 *
 * Purpose: Real-time synchronization from MongoDB to ZeroDB using Change Streams
 *
 * If you want to run OpenCap Stack without MongoDB:
 * 1. Set MIGRATION_MODE=zerodb-only (or SYNC_ENABLED=false)
 * 2. Comment out MONGODB_URI in .env
 * 3. The application will work perfectly with ZeroDB only
 *
 * This module provides centralized MongoDB connection management
 * with environment-specific configuration and error handling.
 */

const migrationMode = process.env.MIGRATION_MODE || 'mongodb-only';
const isMongoDBRequired = migrationMode !== 'zerodb-only';

// Lazy-load mongoose only when needed
let mongoose = null;
function getMongoose() {
  if (!mongoose) {
    if (!isMongoDBRequired) {
      return null;
    }
    mongoose = require('mongoose');
    mongoose.set('strictQuery', false);
  }
  return mongoose;
}

/**
 * Connect to MongoDB based on the current environment
 * @returns {Promise} Mongoose connection promise
 * @throws {Error} If connection fails or MongoDB not available in zerodb-only mode
 */
const connectToMongoDB = async () => {
  // In zerodb-only mode, skip MongoDB connection
  if (!isMongoDBRequired) {
    console.log('ZeroDB-only mode: MongoDB connection skipped');
    return null;
  }

  const mg = getMongoose();
  if (!mg) {
    console.log('MongoDB not available - running in ZeroDB-only mode');
    return null;
  }

  try {
    // Determine connection URI based on environment
    let connectionURI;

    if (process.env.NODE_ENV === 'test') {
      connectionURI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/opencap_test?directConnection=true';
    } else {
      // For development and production
      connectionURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/opencap?directConnection=true';
    }

    // MongoDB connection options for Mongoose 7+
    const connectionOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // Mongoose 7+ uses the MongoDB driver's native connection string options
      // No need for useNewUrlParser or useUnifiedTopology
      // Enable retryWrites for better fault tolerance
      retryWrites: true,
      w: 'majority',
      // Enable server discovery and monitoring engine
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    };

    // Log connection attempt
    console.log(`Connecting to MongoDB (${process.env.NODE_ENV || 'development'} environment)...`);
    console.log(`Connection URI: ${connectionURI.replace(/:([^:]+)@/, ':***@')}`);

    // Connect to MongoDB
    await mg.connect(connectionURI, connectionOptions);

    // Get the connection instance
    const db = mg.connection;

    // Log successful connection
    console.log(`MongoDB connected: ${db.name} on ${db.host}:${db.port} (${process.env.NODE_ENV || 'development'} environment)`);

    // Set up connection event handlers
    db.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    db.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    db.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    // Return the mongoose connection
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
};

/**
 * Close MongoDB connection
 * @returns {Promise} Promise that resolves when connection is closed
 */
const closeMongoDBConnection = async () => {
  // In zerodb-only mode, nothing to close
  if (!isMongoDBRequired) {
    return;
  }

  const mg = getMongoose();
  if (!mg) {
    return;
  }

  try {
    if (mg.connection.readyState !== 0) {
      await mg.connection.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
    throw error;
  }
};

/**
 * Get mongoose instance (for external use)
 * @returns {Object|null} Mongoose instance or null in zerodb-only mode
 */
const getMongooseInstance = () => {
  return getMongoose();
};

module.exports = {
  connectToMongoDB,
  closeMongoDBConnection,
  getMongoose: getMongooseInstance,
  isMongoDBRequired
};
