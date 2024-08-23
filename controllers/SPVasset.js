const SPVAsset = require('../models/spvasset');

// Create a new SPVAsset
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

// Get all SPVAssets
exports.getSPVAssets = async (req, res) => {
  try {
    const assets = await SPVAsset.find();
    res.status(200).json({ spvassets: assets });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVAssets', error: error.message });
  }
};

// Delete an SPVAsset by ID
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
