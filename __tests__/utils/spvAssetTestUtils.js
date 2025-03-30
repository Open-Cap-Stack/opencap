/**
 * SPV Asset Test Utilities
 * 
 * Helper functions for SPV Asset tests to ensure consistent
 * connection handling, cleanup, and test data management.
 * 
 * Created for: [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 * Following Semantic Seed Venture Studio Coding Standards
 */

const mongoose = require('mongoose');
const mongoDbConnection = require('../../utils/mongoDbConnection');
const SPVAsset = require('../../models/SPVasset');

/**
 * Setup the SPV Asset test environment with proper connection handling
 * 
 * @param {Object} options - Setup options
 * @param {boolean} options.dropCollection - Whether to drop the collection before tests
 * @returns {Promise<void>}
 */
async function setupSPVAssetTests(options = { dropCollection: false }) {
  // Ensure we're connected with the improved connection settings
  if (mongoose.connection.readyState !== 1) {
    await mongoDbConnection.connectWithRetry();
  }
  
  // If requested, drop the collection for a clean slate
  if (options.dropCollection) {
    await mongoDbConnection.withRetry(async () => {
      await SPVAsset.collection.drop().catch(err => {
        // Ignore "ns not found" errors which occur when collection doesn't exist
        if (err.code !== 26) {
          throw err;
        }
      });
    });
  }
}

/**
 * Clean up SPV Asset documents safely
 * 
 * @returns {Promise<void>}
 */
async function cleanupSPVAssets() {
  await mongoDbConnection.withRetry(async () => {
    const result = await SPVAsset.deleteMany({});
    return result;
  });
}

/**
 * Create a test SPV Asset with retry
 * 
 * @param {Object} assetData - Asset data
 * @returns {Promise<Object>} - Created asset
 */
async function createTestSPVAsset(assetData) {
  return mongoDbConnection.withRetry(async () => {
    const asset = new SPVAsset(assetData);
    return await asset.save();
  });
}

/**
 * Find SPV Assets with retry
 * 
 * @param {Object} filter - Filter criteria
 * @returns {Promise<Array>} - Found assets
 */
async function findSPVAssets(filter = {}) {
  return mongoDbConnection.withRetry(async () => {
    return await SPVAsset.find(filter);
  });
}

/**
 * Find a single SPV Asset by ID with retry
 * 
 * @param {string} id - Asset ID
 * @returns {Promise<Object>} - Found asset
 */
async function findSPVAssetById(id) {
  return mongoDbConnection.withRetry(async () => {
    return await SPVAsset.findById(id);
  });
}

/**
 * Delete a SPV Asset by ID with retry
 * 
 * @param {string} id - Asset ID
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteSPVAssetById(id) {
  return mongoDbConnection.withRetry(async () => {
    return await SPVAsset.findByIdAndDelete(id);
  });
}

/**
 * Create a sample SPV Asset object for testing
 * 
 * @param {Object} overrides - Optional properties to override defaults
 * @returns {Object} - Sample asset object
 */
function getSampleAssetData(overrides = {}) {
  return {
    AssetID: `test-asset-${Date.now()}`,
    SPVID: 'test-spv-123',
    Type: 'Real Estate',
    Value: 1000000,
    Description: 'Test building for integration tests',
    AcquisitionDate: new Date().toISOString(),
    ...overrides
  };
}

module.exports = {
  setupSPVAssetTests,
  cleanupSPVAssets,
  createTestSPVAsset,
  findSPVAssets,
  findSPVAssetById,
  deleteSPVAssetById,
  getSampleAssetData
};
