/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
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
    res.status(201).json(savedAsset);
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
    const assets = await SPVAsset.find();
    res.status(200).json({ spvassets: assets });
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

    const asset = await SPVAsset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }
    
    res.status(200).json(asset);
  } catch (error) {
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
    const assets = await SPVAsset.find({ SPVID: spvId });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found for SPV: ${spvId}` });
    }
    
    res.status(200).json({ assets });
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
    const assets = await SPVAsset.find({ SPVID: spvId });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found for SPV: ${spvId}` });
    }
    
    const totalValuation = assets.reduce((sum, asset) => sum + asset.Value, 0);
    
    res.status(200).json({
      spvId,
      totalValuation,
      assetCount: assets.length,
      assetBreakdown: assets.map(asset => ({
        assetId: asset.AssetID,
        type: asset.Type,
        value: asset.Value,
        description: asset.Description
      }))
    });
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
    const assets = await SPVAsset.find({ Type: assetType });
    
    if (assets.length === 0) {
      return res.status(404).json({ message: `No assets found of type: ${assetType}` });
    }
    
    const totalValuation = assets.reduce((sum, asset) => sum + asset.Value, 0);
    
    res.status(200).json({
      type: assetType,
      totalValuation,
      assetCount: assets.length,
      assets: assets.map(asset => ({
        assetId: asset.AssetID,
        spvId: asset.SPVID,
        value: asset.Value,
        description: asset.Description
      }))
    });
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
    
    const updatedAsset = await SPVAsset.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedAsset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }
    
    res.status(200).json(updatedAsset);
  } catch (error) {
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
    const deletedAsset = await SPVAsset.findByIdAndDelete(req.params.id);

    if (!deletedAsset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    res.status(200).json({ message: 'SPVAsset deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
