import Stakeholder from '../models/Stakeholder.js';

export const createStakeholder = async (req, res) => {
  const { name, role, email } = req.body;

  if (!name || !role || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const stakeholder = new Stakeholder({ name, role, email });
    await stakeholder.save();
    res.status(201).json({ stakeholder });
  } catch (error) {
    res.status(500).json({ error: 'Error creating stakeholder' });
  }
};

export const getAllStakeholders = async (req, res) => {
  try {
    const stakeholders = await Stakeholder.find();
    res.status(200).json({ stakeholders });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
};

export const getStakeholderById = async (req, res) => {
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

export const updateStakeholderById = async (req, res) => {
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

export const deleteStakeholderById = async (req, res) => {
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
