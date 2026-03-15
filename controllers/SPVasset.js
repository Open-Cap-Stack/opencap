/**
 * SPV Asset Management API Controller
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Updated: ZeroDB Migration - Uses SPVAsset model directly
 */
const SPVAsset = require('../models/SPVasset');
const SPV = require('../models/SPV');

/**
 * Helper function to validate ID format (UUID or row_id)
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if the ID is valid, false otherwise
 */
const isValidId = (id) => {
  if (!id || typeof id !== 'string') return false;
  // UUID format or numeric row_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) || /^\d+$/.test(id) || /^[A-Za-z0-9\-_]+$/.test(id);
};

/**
 * Create a new SPV Asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSPVAsset = async (req, res) => {
  try {
    const { AssetID, SPVID, Type, Value, Description, AcquisitionDate } = req.body;

    if (!SPVID || !Type || !Value || !Description || !AcquisitionDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const assetData = {
      AssetID, // Will be auto-generated if not provided
      SPVID,
      Type,
      Value,
      Description,
      AcquisitionDate,
    };

    const savedAsset = await SPVAsset.create(assetData);
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
    const query = {};
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;
    const assets = await SPVAsset.find(query);
    res.status(200).json({ spvassets: assets || [] });
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

    if (!isValidId(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Try finding by AssetID first, then by row_id
    let asset = await SPVAsset.findByAssetID(assetId);
    if (!asset) {
      asset = await SPVAsset.findById(assetId);
    }

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
    const assets = await SPVAsset.findBySPVID(spvId);

    if (!assets || assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for this SPV' });
    }

    res.status(200).json({ assets });
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

    // Get total value using model method
    const totalValuation = await SPVAsset.getTotalValueBySPVID(spvId);
    const assets = await SPVAsset.findBySPVID(spvId);

    if (!assets || assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for this SPV' });
    }

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
 * @route GET /api/spvassets/valuation/type/:type
 * @access Private (requires valid JWT)
 */
exports.getAssetTypeValuation = async (req, res) => {
  try {
    const type = req.params.type || req.query.type;

    if (!type) {
      return res.status(400).json({ message: 'Asset type is required' });
    }

    // Get all assets of the specified type
    const assets = await SPVAsset.findByType(type);

    if (!assets || assets.length === 0) {
      return res.status(404).json({ message: `No assets found for type: ${type}` });
    }

    // Group by SPV and calculate totals
    const spvGroups = {};
    for (const asset of assets) {
      const spvId = asset.SPVID;
      if (!spvGroups[spvId]) {
        spvGroups[spvId] = { totalValue: 0, count: 0 };
      }
      spvGroups[spvId].totalValue += asset.Value || 0;
      spvGroups[spvId].count += 1;
    }

    // Create response data
    const responseData = {
      assetType: type,
      totalValuation: assets.reduce((sum, asset) => sum + (asset.Value || 0), 0),
      assetCount: assets.length,
      assetBreakdown: Object.entries(spvGroups).map(([spvId, data]) => ({
        spvId,
        totalValue: data.totalValue
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

    if (!isValidId(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Create a copy of the request body and remove immutable fields
    const updates = { ...req.body };

    // Prevent updates to immutable fields
    delete updates.AssetID;
    delete updates.SPVID;

    // Validate data types
    if (updates.Value !== undefined && isNaN(Number(updates.Value))) {
      return res.status(400).json({ message: 'Invalid SPV Asset data: Value must be a number' });
    }

    // Try to find and update by AssetID first, then by row_id
    let updatedAsset = await SPVAsset.findOneAndUpdate(
      { AssetID: assetId.toUpperCase() },
      { $set: updates },
      { new: true }
    );

    if (!updatedAsset) {
      updatedAsset = await SPVAsset.findByIdAndUpdate(
        assetId,
        { $set: updates },
        { new: true }
      );
    }

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

    if (!isValidId(assetId)) {
      return res.status(400).json({ message: 'Invalid SPV Asset ID format' });
    }

    // Try to delete by AssetID first, then by row_id
    let deletedAsset = await SPVAsset.findOneAndDelete({ AssetID: assetId.toUpperCase() });

    if (!deletedAsset) {
      deletedAsset = await SPVAsset.findByIdAndDelete(assetId);
    }

    if (!deletedAsset) {
      return res.status(404).json({ message: 'SPVAsset not found' });
    }

    res.status(200).json({ message: 'SPVAsset deleted successfully' });
  } catch (error) {
    console.error('Error deleting SPV Asset:', error);
    res.status(500).json({ message: 'Failed to delete SPVAsset', error: error.message });
  }
};
