/**
 * MongoDB Connection Module
 * Feature: OCDI-101: Set up MongoDB connection
 * 
 * This module provides centralized MongoDB connection management
 * with environment-specific configuration and error handling.
 */

const mongoose = require('mongoose');

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
      connectionURI = process.env.MONGODB_URI_TEST || 'mongodb://opencap:password123@localhost:27017/opencap_test?authSource=admin';
    } else {
      // For development and production
      connectionURI = process.env.MONGODB_URI || 'mongodb://opencap:password123@localhost:27017/opencap?authSource=admin';
    }
    
    // MongoDB connection options
    const connectionOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    // Log connection attempt
    console.log(`Connecting to MongoDB (${process.env.NODE_ENV || 'development'} environment)...`);
    
    // Connect to MongoDB
    const connection = await mongoose.connect(connectionURI, connectionOptions);
    
    // Log successful connection
    const dbName = connection.connection.name;
    console.log(`MongoDB connected: ${dbName} (${process.env.NODE_ENV || 'development'} environment)`);
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
    
    return connection;
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
