const Stakeholder = require('../models/Stakeholder');

exports.createStakeholder = async (req, res) => {
  const { stakeholderId, name, ownershipPercentage, sharesOwned } = req.body;

  if (!stakeholderId || !name || !ownershipPercentage || !sharesOwned) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const stakeholder = new Stakeholder({ stakeholderId, name, ownershipPercentage, sharesOwned });
    await stakeholder.save();
    res.status(201).json({ stakeholder });
  } catch (error) {
    res.status(500).json({ error: 'Error creating stakeholder' });
  }
};

exports.getAllStakeholders = async (req, res) => {
  try {
    const stakeholders = await Stakeholder.find();
    res.status(200).json({ stakeholders });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
};

exports.getStakeholderById = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findById(req.params.id);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.status(200).json({ stakeholder });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stakeholder' });
  }
};

exports.updateStakeholderById = async (req, res) => {
  try {
    const updatedStakeholder = await Stakeholder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedStakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.status(200).json({ stakeholder: updatedStakeholder });
  } catch (error) {
    res.status(500).json({ error: 'Error updating stakeholder' });
  }
};

exports.deleteStakeholderById = async (req, res) => {
  try {
    const deletedStakeholder = await Stakeholder.findByIdAndDelete(req.params.id);
    if (!deletedStakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.status(200).json({ message: 'Stakeholder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting stakeholder' });
  }
};
