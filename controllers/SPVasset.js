/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Bug: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to use robust MongoDB connection utilities with retry logic
 * Following Semantic Seed Venture Studio Coding Standards
 */
const mongoose = require('mongoose');
const mongoDbConnection = require('../utils/mongoDbConnection');

// Helper function to get the SPVAsset model with singleton pattern
const getSPVAssetModel = () => {
  try {
    // Check if model is already defined
    if (mongoose.models.SPVAsset) {
      return mongoose.model('SPVAsset');
    }
    
    // If not defined, require it
    return require('../models/SPVAssetModel');
  } catch (error) {
    console.error('Error getting SPVAsset model:', error);
    throw error;
  }
};

/**
 * Create a new SPV Asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSPVAsset = async (req, res) => {
  try {
    const { AssetID, SPVID, Type, Value, Description, AcquisitionDate } = req.body;
    const spvAssetModel = getSPVAssetModel();

    if (!AssetID || !SPVID || !Type || !Value || !Description || !AcquisitionDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Use withRetry for the MongoDB operation to handle potential connection issues
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new spvAssetModel({
        AssetID,
        SPVID,
        Type,
        Value,
        Description,
        AcquisitionDate,
      });
      return await newAsset.save();
    });

    // Convert to plain object if possible
    const responseData = savedAsset.toObject ? savedAsset.toObject() : savedAsset;
    
    // Store a copy in res.locals for the responseDebugger middleware
    res.locals.responseData = responseData;
    res.status(201).json(responseData);
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
    const spvAssetModel = getSPVAssetModel();
    const assets = await mongoDbConnection.withRetry(async () => {
      return await spvAssetModel.find().exec();
    });

    // Convert Mongoose documents to plain objects
    const spvAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    
    // Store response data for debugging
    const responseData = { spvassets: spvAssets };
    res.locals.responseData = responseData;
    
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
    const spvAssetModel = getSPVAssetModel();
    const assetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    const asset = await mongoDbConnection.withRetry(async () => {
      return await spvAssetModel.findById(assetId).exec();
    });
    
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
    const spvAssetModel = getSPVAssetModel();
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
    const assets = await spvAssetModel.find({ SPVID: spvId });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for this SPV' });
    }
    
    // Check if the referenced SPV still exists
    const spvExists = await mongoDbConnection.withRetry(async () => {
      return await SPV.exists({ SPVID: spvId });
    });
    
    // Convert Mongoose documents to plain objects
    let plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    
    // If SPV doesn't exist, mark assets as orphaned
    if (!spvExists) {
      plainAssets = plainAssets.map(asset => ({
        ...asset,
        SPVStatus: 'Orphaned'  // Add SPVStatus field to indicate the SPV was deleted
      }));
    }
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = { assets: plainAssets };
    res.status(200).json(res.locals.responseData);
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
    const spvAssetModel = getSPVAssetModel();
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
    const assets = await spvAssetModel.find({ SPVID: spvId });
    
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
    const spvAssetModel = getSPVAssetModel();
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({ message: 'Asset type is required' });
    }

    // Get all assets of the specified type
    const result = await spvAssetModel.aggregate([
      { $match: { Type: type } },
      { $group: { _id: "$SPVID", totalValue: { $sum: "$Value" } } }
    ]);

    if (result.length === 0) {
      return res.status(404).json({ message: `No assets found for type: ${type}` });
    }
    
    // Create response data
    const responseData = {
      assetType: type, 
      totalValuation: result.reduce((sum, item) => sum + item.totalValue, 0),
      assetCount: result.length,
      assetBreakdown: result.map(item => ({ 
        spvId: item._id,
        totalValue: item.totalValue
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
 * Update an existing SPV Asset
 * @route PUT /api/spvassets/:id
 * @access Private (requires valid JWT)
 */
exports.updateSPVAsset = async (req, res) => {
  try {
    const spvAssetModel = getSPVAssetModel();
    const assetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
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
        return await spvAssetModel.findByIdAndUpdate(req.params.id, updates, options).exec();
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
        updatedAsset[field] = req.body[field];
      }
    });

    // Save the updated asset
    await updatedAsset.save();

    res.status(200).json(updatedAsset);
  } catch (error) {
    console.error('Error updating SPV Asset:', error);
    res.status(500).json({ message: 'Failed to update SPV Asset', error: error.message });
  }
};

/**
 * Delete an SPV Asset
 * @route DELETE /api/spvassets/:id
 * @access Private (requires valid JWT)
 */
exports.deleteSPVAsset = async (req, res) => {
  try {
    const spvAssetModel = getSPVAssetModel();
    const assetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Delete the asset
    const deletedAsset = await spvAssetModel.findByIdAndDelete(assetId).exec();
    
    if (!deletedAsset) {
      return res.status(500).json({ message: 'Failed to delete SPVAsset' });
    }

    res.status(200).json({ message: 'SPVAsset deleted successfully' });
  } catch (error) {
    console.error('Error deleting SPV Asset:', error);
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
