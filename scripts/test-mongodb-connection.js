/**
 * MongoDB Connection Test Script
 * Feature: OCDI-101: Set up MongoDB connection
 * 
 * This script tests the MongoDB connection in different environments.
 * It can be run directly to verify MongoDB connectivity.
 */

const { connectToMongoDB, closeMongoDBConnection } = require('../db/mongoConnection');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set NODE_ENV based on command line argument if provided
if (process.argv[2]) {
  process.env.NODE_ENV = process.argv[2];
}

async function testMongoDBConnection() {
  console.log('🧪 Testing MongoDB Connection');
  console.log('-'.repeat(30));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    // Attempt connection
    console.log('Attempting to connect to MongoDB...');
    await connectToMongoDB();
    console.log('✅ Successfully connected to MongoDB');
    
    // Check connection details
    console.log('\nConnection Details:');
    console.log(`Database: ${process.env.NODE_ENV === 'test' ? 'opencap_test' : 'opencap'}`);
    console.log(`Host: ${process.env.MONGODB_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.MONGODB_PORT || '27017'}`);
    
    // Close connection
    await closeMongoDBConnection();
    console.log('✅ Successfully closed MongoDB connection');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\nTroubleshooting tips:');
      console.log('1. Make sure MongoDB is running (check with `docker ps | grep mongo`)');
      console.log('2. Check if MongoDB container is accessible (try `docker logs opencap_mongodb`)');
      console.log('3. Verify connection string in .env file or environment variables');
      console.log('4. Check if MongoDB port (27017) is accessible');
    }
    return false;
  }
}

// Run the test if called directly
if (require.main === module) {
  testMongoDBConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

module.exports = { testMongoDBConnection };
