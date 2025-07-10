/**
 * MongoDB Connection Utility
 * 
 * Provides robust MongoDB connection handling with:
 * - Consistent timeout settings
 * - Retry logic with exponential backoff
 * - Proper connection pooling and cleanup
 * - Consistent error handling
 * 
 * Created for: [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 * Following Semantic Seed Venture Studio Coding Standards
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Default mongoose connection options with increased timeouts
const DEFAULT_MONGOOSE_OPTIONS = {
  connectTimeoutMS: 30000,        // Increased from 10000ms default
  socketTimeoutMS: 45000,         // Increased from 30000ms default
  serverSelectionTimeoutMS: 30000, // Increased from 10000ms default
  heartbeatFrequencyMS: 10000,    // Default is 10000ms, maintain for stability
  maxPoolSize: 20,                // Increase pool size for high-concurrency tests
  minPoolSize: 5,                 // Ensure minimum connections are maintained
  retryWrites: true,              // Enable retry for write operations
  retryReads: true,               // Enable retry for read operations
  maxIdleTimeMS: 45000,           // Close idle connections after 45 seconds
  w: 'majority',                  // Wait for majority write confirmation
};

/**
 * Get the MongoDB URI based on environment and configuration
 * Ensures consistent connection string usage across the application
 * 
 * @param {string} dbName - Optional database name, defaults to environment variable
 * @returns {string} - MongoDB connection URI
 */
function getMongoURI(dbName = null) {
  // Default to environment variable
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    throw new Error('MONGO_URI environment variable is required');
  }
  
  // If dbName is specified, replace the database name in the URI
  if (dbName) {
    // Extract the base URI without the database name
    const baseUri = uri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
    return baseUri;
  }
  
  return uri;
}

/**
 * Connect to MongoDB with retry logic
 * 
 * @param {string} uri - MongoDB URI
 * @param {object} options - Connection options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<mongoose.Connection>} - Mongoose connection object
 */
async function connectWithRetry(uri = null, options = {}, maxRetries = 5, initialDelay = 1000) {
  // Combine default options with any provided options
  const connectionOptions = { ...DEFAULT_MONGOOSE_OPTIONS, ...options };
  
  // Use provided URI or get default
  const connectionUri = uri || getMongoURI();
  
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('MongoDB already connected');
        return mongoose.connection;
      }
      
      console.log(`Connecting to MongoDB (Attempt ${retries + 1}/${maxRetries})...`);
      await mongoose.connect(connectionUri, connectionOptions);
      
      console.log('MongoDB connection established successfully');
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      retries++;
      
      if (retries >= maxRetries) {
        console.error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
        break;
      }
      
      // Calculate backoff delay with exponential increase and jitter
      const backoffDelay = initialDelay * Math.pow(2, retries - 1) * (0.5 + Math.random() * 0.5);
      console.log(`Connection attempt failed. Retrying in ${Math.round(backoffDelay)}ms...`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw lastError;
}

/**
 * Safely disconnect from MongoDB
 * 
 * @returns {Promise<void>}
 */
async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Safely perform database operations with retry logic
 * 
 * @param {Function} operation - Async function with the operation to perform
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<any>} - Result of the operation
 */
async function withRetry(operation, maxRetries = 3, initialDelay = 200) {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      // Only retry on connection-related errors
      if (
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoTimeoutError' ||
        error.message.includes('buffering timed out') ||
        error.message.includes('connection timed out')
      ) {
        lastError = error;
        retries++;
        
        if (retries >= maxRetries) {
          console.error(`Operation failed after ${maxRetries} attempts`);
          break;
        }
        
        // Calculate backoff delay with exponential increase
        const backoffDelay = initialDelay * Math.pow(2, retries - 1);
        console.log(`Operation attempt failed. Retrying in ${backoffDelay}ms...`);
        
        // Wait for the backoff period
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        // For other types of errors, don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Run a MongoDB command directly using the driver (useful for admin operations)
 * 
 * @param {string} command - Command to run
 * @param {object} options - Command options
 * @param {string} dbName - Database name
 * @returns {Promise<any>} - Command result
 */
async function runCommand(command, options = {}, dbName = 'admin') {
  const uri = getMongoURI();
  const client = new MongoClient(uri, DEFAULT_MONGOOSE_OPTIONS);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.command({ [command]: 1, ...options });
  } finally {
    await client.close();
  }
}

/**
 * Clean up all documents in a collection with retry logic
 * 
 * @param {string} collectionName - Collection name to clean
 * @returns {Promise<void>}
 */
async function cleanupCollection(collectionName) {
  return withRetry(async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectWithRetry();
    }
    
    const result = await mongoose.connection.collection(collectionName).deleteMany({});
    console.log(`Cleaned up ${result.deletedCount} documents from ${collectionName}`);
  });
}

/**
 * Setup for test environment 
 * Establishes connection and registers cleanup hooks
 * 
 * @param {Object} options - Setup options
 * @param {boolean} options.dropDatabase - Whether to drop the database before tests
 * @returns {Promise<mongoose.Connection>}
 */
async function setupTestEnvironment(options = { dropDatabase: false }) {
  // Connect with retry logic
  const connection = await connectWithRetry();
  
  // Optionally drop the database to ensure clean state
  if (options.dropDatabase) {
    await withRetry(async () => {
      await mongoose.connection.dropDatabase();
      console.log('Test database dropped for clean environment');
    });
  }
  
  return connection;
}

// Export all functions
module.exports = {
  DEFAULT_MONGOOSE_OPTIONS,
  getMongoURI,
  connectWithRetry,
  disconnect,
  withRetry,
  runCommand,
  cleanupCollection,
  setupTestEnvironment
};
