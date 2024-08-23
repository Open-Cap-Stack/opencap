const Corporation = require('../models/Corporation');

// List all corporations
exports.listCorporations = async (req, res) => {
  try {
    const corporations = await Corporation.find();
    res.status(200).json({ corporations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve corporations' });
  }
};

// Create a new corporation
exports.createCorporation = async (req, res) => {
  try {
    const { legalName, doingBusinessAsName, website } = req.body;
    const corporation = new Corporation({ legalName, doingBusinessAsName, website });
    await corporation.save();
    res.status(201).json(corporation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create corporation' });
  }
};

// Update a corporation
exports.updateCorporation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const corporation = await Corporation.findByIdAndUpdate(id, updates, { new: true });
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }
    res.status(200).json(corporation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update corporation' });
  }
};

// Delete a corporation
exports.deleteCorporation = async (req, res) => {
  try {
    const { id } = req.params;
    const corporation = await Corporation.findByIdAndDelete(id);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }
    res.status(200).json({ message: 'Corporation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete corporation' });
  }
};
