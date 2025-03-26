/**
 * DB Connection Utilities
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * Utility functions for managing database connections in tests
 */

const mongoose = require('mongoose');

/**
 * Connect to the test database
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/opencap-test';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB test database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from the database
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
