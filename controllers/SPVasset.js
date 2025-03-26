/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Bug: OCAE-empty-response: Fix SPVasset controller empty response objects
 */
const SPVAsset = require('../models/SPVasset');
const mongoose = require('mongoose');

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

    const newAsset = new SPVAsset({
      AssetID,
      SPVID,
      Type,
      Value,
      Description,
      AcquisitionDate,
    });

    const savedAsset = await newAsset.save();
    // Store a copy in res.locals for the responseDebugger middleware
    res.locals.responseData = savedAsset.toObject ? savedAsset.toObject() : savedAsset;
    res.status(201).json(res.locals.responseData);
  } catch (error) {
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
    const assets = await SPVAsset.find().exec();
    // Convert Mongoose documents to plain objects
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    // Store a copy in res.locals for the responseDebugger middleware
    res.locals.responseData = { spvassets: plainAssets };
    res.status(200).json(res.locals.responseData);
  } catch (error) {
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

    // Explicitly add exec to ensure proper promise handling
    const asset = await SPVAsset.findById(req.params.id).exec();
    
    if (!asset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }
    
    // Convert to plain object for consistent handling
    const plainAsset = asset.toObject ? asset.toObject() : asset;
    
    // Debug log to diagnose issues
    console.log('Asset found:', asset._id, 'Converting to plain object');
    
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
    const assets = await SPVAsset.find({ SPVID: spvId }).exec();
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found for SPV: ${spvId}` });
    }
    
    // Convert Mongoose documents to plain objects
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    // Store in res.locals for potential use by middleware
    res.locals.responseData = { assets: plainAssets };
    res.status(200).json(res.locals.responseData);
  } catch (error) {
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
    const assets = await SPVAsset.find({ SPVID: spvId }).exec();
    
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
    const assets = await SPVAsset.find({ Type: assetType }).exec();
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found of type: ${assetType}` });
    }
    
    // Convert Mongoose documents to plain objects for consistent handling
    const plainAssets = assets.map(asset => asset.toObject ? asset.toObject() : asset);
    
    // Calculate total valuation
    const totalValuation = plainAssets.reduce((sum, asset) => sum + asset.Value, 0);
    
    // Create response data
    const responseData = {
      type: assetType,
      totalValuation,
      assetCount: plainAssets.length,
      assets: plainAssets.map(asset => ({
        assetId: asset.AssetID,
        spvId: asset.SPVID,
        value: asset.Value,
        description: asset.Description
      }))
    };
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = responseData;
    res.status(200).json(responseData);
  } catch (error) {
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
    
    // Prevent AssetID and SPVID from being updated (they're unique identifiers)
    if (req.body.AssetID) {
      delete req.body.AssetID;
    }
    
    if (req.body.SPVID) {
      delete req.body.SPVID;
    }

    // Validate Value field is numeric
    if (req.body.Value !== undefined && (isNaN(req.body.Value) || typeof req.body.Value !== 'number')) {
      return res.status(400).json({ message: 'Invalid SPV Asset data' });
    }
    
    // Explicitly add exec to ensure proper promise handling
    const updatedAsset = await SPVAsset.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).exec();
    
    if (!updatedAsset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }
    
    // Convert to plain object for consistent handling
    const plainAsset = updatedAsset.toObject ? updatedAsset.toObject() : updatedAsset;
    
    // Debug log
    console.log('Asset updated:', updatedAsset._id, 'Converting to plain object');
    
    // Store in res.locals for potential use by middleware
    res.locals.responseData = plainAsset;
    
    // Return the plain JavaScript object
    return res.status(200).json(plainAsset);
  } catch (error) {
    console.error('Error in updateSPVAsset:', error);
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
    const deletedAsset = await SPVAsset.findByIdAndDelete(req.params.id).exec();

    if (!deletedAsset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    res.status(200).json({ message: 'SPVAsset deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
