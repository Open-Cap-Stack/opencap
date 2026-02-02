/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Issue #20: Migrate to ZeroDB via DatabaseAdapter
 */
const databaseAdapter = require('../services/databaseAdapter');

/**
 * Helper function to validate MongoDB ID format
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if the ID is valid, false otherwise
 */
const isValidMongoId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

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

    const assetData = {
      AssetID,
      SPVID,
      Type,
      Value,
      Description,
      AcquisitionDate,
    };

    const savedAsset = await databaseAdapter.create('SPVAsset', assetData);
    res.status(201).json(savedAsset);
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
    const assets = await databaseAdapter.find('SPVAsset', {});
    res.status(200).json({ spvassets: assets });
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

    if (!isValidMongoId(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    const asset = await databaseAdapter.findById('SPVAsset', assetId);

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
    const spv = await databaseAdapter.findOne('SPV', { SPVID: spvId });
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    // Get all assets for this SPV
    const assets = await databaseAdapter.find('SPVAsset', { SPVID: spvId });

    if (assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for this SPV' });
    }

    // Check if the referenced SPV still exists
    const spvExists = await databaseAdapter.findOne('SPV', { SPVID: spvId });

    // If SPV doesn't exist, mark assets as orphaned
    let plainAssets = assets;
    if (!spvExists) {
      plainAssets = assets.map(asset => ({
        ...asset,
        SPVStatus: 'Orphaned'
      }));
    }

    res.status(200).json({ assets: plainAssets });
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
    const spv = await databaseAdapter.findOne('SPV', { SPVID: spvId });
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    // Get all assets for this SPV
    const assets = await databaseAdapter.find('SPVAsset', { SPVID: spvId });

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

    // Get all assets of the specified type using aggregation
    const result = await databaseAdapter.aggregate('SPVAsset', [
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
    const assetId = req.params.id;

    if (!isValidMongoId(assetId)) {
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

    const updatedAsset = await databaseAdapter.findByIdAndUpdate('SPVAsset', assetId, updates, options);

    if (!updatedAsset) {
      return res.status(404).json({ message: 'SPV Asset not found' });
    }

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
    const assetId = req.params.id;

    if (!isValidMongoId(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Delete the asset
    const deletedAsset = await databaseAdapter.findByIdAndDelete('SPVAsset', assetId);

    if (!deletedAsset) {
      return res.status(500).json({ message: 'Failed to delete SPVAsset' });
    }

    res.status(200).json({ message: 'SPVAsset deleted successfully' });
  } catch (error) {
    console.error('Error deleting SPV Asset:', error);
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
