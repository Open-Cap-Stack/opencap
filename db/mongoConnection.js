/**
 * MongoDB Connection Module
 * Feature: OCDI-101: Set up MongoDB connection
 * 
 * This module provides centralized MongoDB connection management
 * with environment-specific configuration and error handling.
 */

const mongoose = require('mongoose');

// Set mongoose options
mongoose.set('strictQuery', false);

/**
 * Connect to MongoDB based on the current environment
 * @returns {Promise} Mongoose connection promise
 * @throws {Error} If connection fails
 */
const connectToMongoDB = async () => {
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
    await mongoose.connect(connectionURI, connectionOptions);
    
    // Get the connection instance
    const db = mongoose.connection;
    
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
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
    throw error;
  }
};

module.exports = {
  connectToMongoDB,
  closeMongoDBConnection
};
