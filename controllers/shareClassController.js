/**
 * ShareClass Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');

const MODEL_NAME = 'ShareClass';

const createShareClass = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const shareClass = await databaseAdapter.create(MODEL_NAME, { name, description });
    res.status(201).json({ shareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error creating share class' });
  }
};

const getAllShareClasses = async (req, res) => {
  try {
    const shareClasses = await databaseAdapter.find(MODEL_NAME, {});
    res.status(200).json({ shareClasses });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching share classes' });
  }
};

const getShareClassById = async (req, res) => {
  try {
    const shareClass = await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!shareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ shareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching share class' });
  }
};

const updateShareClassById = async (req, res) => {
  try {
    const updatedShareClass = await databaseAdapter.findByIdAndUpdate(MODEL_NAME, req.params.id, req.body, { new: true });
    if (!updatedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ shareClass: updatedShareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error updating share class' });
  }
};

const deleteShareClassById = async (req, res) => {
  try {
    const deletedShareClass = await databaseAdapter.findByIdAndDelete(MODEL_NAME, req.params.id);
    if (!deletedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ message: 'Share class deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting share class' });
  }
};

module.exports = {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById,
};
