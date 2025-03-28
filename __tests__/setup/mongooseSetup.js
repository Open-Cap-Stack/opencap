/**
 * Mongoose Setup for Tests
 * 
 * Handles MongoDB connection and collection index creation for tests.
 * Updated for: [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 * Following Semantic Seed Venture Studio Coding Standards
 */

const mongoose = require('mongoose');
const mongoDbConnection = require('../../utils/mongoDbConnection');

/**
 * Create indexes on all collections defined in Mongoose models
 * Uses retry logic for reliability
 * 
 * @returns {Promise<void>}
 */
async function createIndexes() {
  // Get all registered models
  const modelNames = Object.keys(mongoose.models);
  
  // For each model
  for (const modelName of modelNames) {
    const model = mongoose.models[modelName];
    
    // Use the retry utility for reliable index creation even during high load
    await mongoDbConnection.withRetry(async () => {
      // Create all indexes defined in the schema
      await model.createIndexes();
      console.log(`Created indexes for model: ${modelName}`);
    });
  }
}

/**
 * Setup Mongoose for tests with improved connection handling
 * Uses retry logic and higher timeout values
 * 
 * @returns {Promise<mongoose.Connection>}
 */
async function setupMongoose() {
  // Connect to MongoDB using the robust connection utility
  const connection = await mongoDbConnection.connectWithRetry();
  
  // Create indexes on all collections
  await createIndexes();
  
  return connection;
}

module.exports = {
  setupMongoose,
  createIndexes
};