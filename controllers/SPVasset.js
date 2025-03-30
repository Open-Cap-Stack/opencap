/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Bug: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to use robust MongoDB connection utilities with retry logic
 * Following Semantic Seed Venture Studio Coding Standards
 */
const mongoose = require('mongoose');
const SPV = require('../models/SPV');
const SPVAsset = require('../models/SPVAsset');
const mongoDbConnection = require('../utils/mongoDbConnection');

/**
 * Create a new SPV Asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSPVAsset = async (req, res) => {
  try {
    const { AssetID, SPVID, Type, Value, Description, AcquisitionDate } = req.body;

    if (!AssetID || !SPVID || !Type || !Value || !Description || !AcquisitionDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Use withRetry for the MongoDB operation to handle potential connection issues
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset({
        AssetID,
        SPVID,
        Type,
        Value,
        Description,
        AcquisitionDate,
      });
      return await newAsset.save();
    });

    // Store a copy in res.locals for the responseDebugger middleware
    res.locals.responseData = savedAsset.toObject ? savedAsset.toObject() : savedAsset;
    res.status(201).json(res.locals.responseData);
  } catch (error) {
    console.error('Error creating SPV Asset:', error);
    res.status(500).json({ message: 'Failed to create SPVAsset', error: error.message });
  }
};

/**
 * Get all SPV Assets
 * @route GET /api/spvassets
 * @access Private (requires valid JWT)
 */
exports.getSPVAssets = async (req, res) => {
  try {
    // Get all SPV assets directly without using the withRetry method
    const spvAssets = await SPVAsset.find({});
    
    // Convert to API response format if needed
    const responseData = { spvassets: spvAssets };
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error retrieving SPV Assets:', error);
    res.status(500).json({ message: 'Failed to retrieve SPVAssets', error: error.message });
  }
};

/**
 * Get a specific SPV Asset by ID
 * @route GET /api/spvassets/:id
 * @access Private (requires valid JWT)
 */
exports.getSPVAssetById = async (req, res) => {
  try {
    const assetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Get SPV asset by ID directly without using withRetry
    const asset = await SPVAsset.findById(assetId);
    
    if (!asset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    return res.status(200).json(asset);
  } catch (error) {
    console.error('Error in getSPVAssetById:', error);
    res.status(500).json({ message: 'Failed to retrieve SPV Asset', error: error.message });
  }
};

/**
 * Get assets by SPV ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAssetsBySPVId = async (req, res) => {
  try {
    // Format spvId to uppercase for consistent querying
    const spvId = req.params.spvId ? req.params.spvId.trim().toUpperCase() : null;
    
    if (!spvId) {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    // Check if the SPV exists
    const spv = await SPV.findOne({ SPVID: spvId });
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    // Get all assets for this SPV
    const assets = await SPVAsset.find({ SPVID: spvId });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for this SPV' });
    }

    res.status(200).json({ spvId: spvId, assets: assets });
  } catch (error) {
    console.error('Error retrieving assets by SPV ID:', error);
    res.status(500).json({ message: 'Failed to retrieve assets', error: error.message });
  }
};

/**
 * Calculate total valuation for a specific SPV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSPVValuation = async (req, res) => {
  try {
    // Format spvId to uppercase for consistent querying
    const spvId = req.params.spvId ? req.params.spvId.trim().toUpperCase() : null;
    
    if (!spvId) {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    // Check if the SPV exists
    const spv = await SPV.findOne({ SPVID: spvId });
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    // Get all assets for this SPV
    const assets = await SPVAsset.find({ SPVID: spvId });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for this SPV' });
    }

    // Calculate total valuation
    const totalValuation = assets.reduce((total, asset) => total + asset.Value, 0);
    
    res.status(200).json({
      spvId: spvId,
      totalValuation: totalValuation,
      assetCount: assets.length
    });
  } catch (error) {
    console.error('Error calculating SPV valuation:', error);
    res.status(500).json({ message: 'Failed to calculate SPV valuation', error: error.message });
  }
};

/**
 * Calculate total valuation by asset type
 * @route GET /api/spvassets/valuation
 * @access Private (requires valid JWT)
 */
exports.getAssetTypeValuation = async (req, res) => {
  try {
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({ message: 'Asset type is required' });
    }

    // Get all assets of the specified type
    const assets = await SPVAsset.find({ Type: type });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found for type: ${type}` });
    }
    
    // Calculate total valuation
    const totalValuation = assets.reduce((sum, asset) => sum + asset.Value, 0);
    
    res.status(200).json({
      assetType: type,
      totalValuation,
      assetCount: assets.length
    });
  } catch (error) {
    console.error('Error calculating asset type valuation:', error);
    res.status(500).json({ message: 'Failed to calculate asset type valuation', error: error.message });
  }
};

/**
 * Update an existing SPV Asset
 * @route PUT /api/spvassets/:id
 * @access Private (requires valid JWT)
 */
exports.updateSPVAsset = async (req, res) => {
  try {
    const assetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Check if the asset exists
    const asset = await SPVAsset.findById(assetId);
    
    if (!asset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    // Check for immutable fields in the update data
    const immutableFields = ['AssetID', 'SPVID'];
    for (const field of immutableFields) {
      if (req.body[field] !== undefined) {
        return res.status(400).json({ message: 'Cannot update immutable fields', immutableFields });
      }
    }

    // Update allowed fields
    const allowedFields = ['Type', 'Value', 'Description', 'AcquisitionDate'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    });

    // Save the updated asset
    await asset.save();

    res.status(200).json(asset);
  } catch (error) {
    console.error('Error updating SPV Asset:', error);
    res.status(500).json({ message: 'Failed to update SPVAsset', error: error.message });
  }
};

/**
 * Delete an SPV Asset
 * @route DELETE /api/spvassets/:id
 * @access Private (requires valid JWT)
 */
exports.deleteSPVAsset = async (req, res) => {
  try {
    const assetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Check if the asset exists
    const asset = await SPVAsset.findById(assetId);
    
    if (!asset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    // Delete the asset
    await asset.deleteOne();

    res.status(200).json({ message: 'SPVAsset deleted successfully' });
  } catch (error) {
    console.error('Error deleting SPV Asset:', error);
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
