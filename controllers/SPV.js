const SPV = require('../models/SPV');

// Create a new SPV
exports.createSPV = async (req, res) => {
  try {
    const { SPVID, Name, Purpose, CreationDate, Status, ParentCompanyID, ComplianceStatus } = req.body;

    if (!SPVID || !Name || !Purpose || !CreationDate || !Status || !ParentCompanyID || !ComplianceStatus) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newSPV = new SPV({
      SPVID,
      Name,
      Purpose,
      CreationDate,
      Status,
      ParentCompanyID,
      ComplianceStatus,
    });

    const savedSPV = await newSPV.save();
    res.status(201).json(savedSPV);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create SPV', error: error.message });
  }
};

// Get all SPVs
exports.getSPVs = async (req, res) => {
  try {
    const spvs = await SPV.find();
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs', error: error.message });
  }
};

// Delete an SPV by ID
exports.deleteSPV = async (req, res) => {
  try {
    const deletedSPV = await SPV.findByIdAndDelete(req.params.id);

    if (!deletedSPV) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    res.status(200).json({ message: 'SPV deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete SPV', error: error.message });
  }
};
