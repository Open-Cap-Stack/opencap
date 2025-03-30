/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Bug: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to use robust MongoDB connection utilities with retry logic
 * Following Semantic Seed Venture Studio Coding Standards
 */
const SPVAsset = require('../models/SPVasset');
const mongoose = require('mongoose');
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSPVAssets = async (req, res) => {
  try {
    // Use withRetry for the MongoDB operation to handle potential connection issues
    const assets = await mongoDbConnection.withRetry(async () => {
      return await SPVAsset.find().exec();
    });

    // Convert Mongoose documents to plain objects
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    
    // Store a copy in res.locals for the responseDebugger middleware
    res.locals.responseData = { spvassets: plainAssets };
    res.status(200).json(res.locals.responseData);
  } catch (error) {
    console.error('Error retrieving SPV Assets:', error);
    res.status(500).json({ message: 'Failed to retrieve SPVAssets', error: error.message });
  }
};

/**
 * Get SPV Asset by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSPVAssetById = async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Use withRetry for the MongoDB operation to handle potential connection issues
    const asset = await mongoDbConnection.withRetry(async () => {
      return await SPVAsset.findById(req.params.id).exec();
    });
    
    if (!asset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }
    
    // Convert to plain object for consistent handling
    const plainAsset = asset.toObject ? asset.toObject() : asset;
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = plainAsset;
    
    // Return the plain JavaScript object
    return res.status(200).json(plainAsset);
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
    const spvId = req.params.spvId;
    
    // Use withRetry for the MongoDB operation to handle potential connection issues
    const assets = await mongoDbConnection.withRetry(async () => {
      return await SPVAsset.find({ SPVID: spvId }).exec();
    });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found for SPV: ${spvId}` });
    }
    
    // Convert Mongoose documents to plain objects
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    // Store in res.locals for potential use by middleware
    res.locals.responseData = { assets: plainAssets };
    res.status(200).json(res.locals.responseData);
  } catch (error) {
    console.error('Error retrieving assets by SPV ID:', error);
    res.status(500).json({ message: 'Failed to retrieve SPV Assets', error: error.message });
  }
};

/**
 * Calculate total valuation for a specific SPV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSPVValuation = async (req, res) => {
  try {
    const spvId = req.params.spvId;
    
    // Use withRetry for the MongoDB operation to handle potential connection issues
    const assets = await mongoDbConnection.withRetry(async () => {
      return await SPVAsset.find({ SPVID: spvId }).exec();
    });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found for SPV: ${spvId}` });
    }
    
    // Convert Mongoose documents to plain objects for consistent handling
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    
    // Calculate total valuation
    const totalValuation = plainAssets.reduce((sum, asset) => sum + asset.Value, 0);
    
    // Create response data
    const responseData = {
      spvId,
      totalValuation,
      assetCount: plainAssets.length,
      assetBreakdown: plainAssets.map(asset => ({
        assetId: asset.AssetID,
        type: asset.Type,
        value: asset.Value,
        description: asset.Description
      }))
    };
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = responseData;
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error calculating SPV valuation:', error);
    res.status(500).json({ message: 'Failed to calculate SPV valuation', error: error.message });
  }
};

/**
 * Calculate total valuation by asset type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAssetTypeValuation = async (req, res) => {
  try {
    const assetType = req.params.type;
    
    // Use withRetry for the MongoDB operation to handle potential connection issues
    const assets = await mongoDbConnection.withRetry(async () => {
      return await SPVAsset.find({ Type: assetType }).exec();
    });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found of type: ${assetType}` });
    }
    
    // Convert Mongoose documents to plain objects for consistent handling
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    
    // Calculate total valuation
    const totalValuation = plainAssets.reduce((sum, asset) => sum + asset.Value, 0);
    
    // Create response data
    const responseData = {
      assetType: assetType, 
      totalValuation,
      assetCount: plainAssets.length,
      assetBreakdown: plainAssets.map(asset => ({ 
        assetId: asset.AssetID,
        type: asset.Type,
        value: asset.Value,
        description: asset.Description
      }))
    };
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = responseData;
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error calculating asset type valuation:', error);
    res.status(500).json({ message: 'Failed to calculate asset type valuation', error: error.message });
  }
};

/**
 * Update an SPV Asset by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateSPVAsset = async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Create a copy of the request body and remove immutable fields
    const updates = { ...req.body };
    
    // Prevent updates to immutable fields
    delete updates.AssetID;
    delete updates.SPVID;
    
    // Validate data types
    if (updates.Value && isNaN(Number(updates.Value))) {
      return res.status(400).json({ message: 'Invalid SPV Asset data: Value must be a number' });
    }
    
    const options = { new: true, runValidators: true };
    
    // Use withRetry for the MongoDB operation to handle potential connection issues
    let updatedAsset;
    try {
      updatedAsset = await mongoDbConnection.withRetry(async () => {
        return await SPVAsset.findByIdAndUpdate(req.params.id, updates, options).exec();
      });
    } catch (error) {
      // Handle validation errors from Mongoose
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid SPV Asset data', error: error.message });
      }
      throw error; // Re-throw other errors to be caught by the outer catch
    }
    
    if (!updatedAsset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }
    
    // Convert to plain object for consistent handling
    const plainAsset = updatedAsset.toObject ? updatedAsset.toObject() : updatedAsset;
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = plainAsset;
    
    res.status(200).json(plainAsset);
  } catch (error) {
    console.error('Error updating SPV Asset:', error);
    res.status(500).json({ message: 'Failed to update SPV Asset', error: error.message });
  }
};

/**
 * Delete an SPV Asset by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteSPVAsset = async (req, res) => {
  try {
    // Use withRetry for the MongoDB operation to handle potential connection issues
    const deletedAsset = await mongoDbConnection.withRetry(async () => {
      return await SPVAsset.findByIdAndDelete(req.params.id).exec();
    });

    if (!deletedAsset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    res.status(200).json({ message: 'SPVAsset deleted' });
  } catch (error) {
    console.error('Error deleting SPV Asset:', error);
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
