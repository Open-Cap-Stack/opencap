/**
 * ShareClass Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');
const { errorResponse } = require('../middleware/errorResponse');

const MODEL_NAME = 'ShareClass';

const createShareClass = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return errorResponse(res, 400, 'All fields are required');
  }

  try {
    const shareClass = await databaseAdapter.create(MODEL_NAME, { name, description });
    res.status(201).json({ shareClass });
  } catch (error) {
    errorResponse(res, 500, 'Error creating share class', error);
  }
};

const getAllShareClasses = async (req, res) => {
  try {
    const shareClasses = await databaseAdapter.find(MODEL_NAME, {});
    res.status(200).json({ shareClasses });
  } catch (error) {
    errorResponse(res, 500, 'Error fetching share classes', error);
  }
};

const getShareClassById = async (req, res) => {
  try {
    const shareClass = await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!shareClass) {
      return errorResponse(res, 404, 'Share class not found');
    }
    res.status(200).json({ shareClass });
  } catch (error) {
    errorResponse(res, 500, 'Error fetching share class', error);
  }
};

const updateShareClassById = async (req, res) => {
  try {
    const updatedShareClass = await databaseAdapter.findByIdAndUpdate(MODEL_NAME, req.params.id, req.body, { new: true });
    if (!updatedShareClass) {
      return errorResponse(res, 404, 'Share class not found');
    }
    res.status(200).json({ shareClass: updatedShareClass });
  } catch (error) {
    errorResponse(res, 500, 'Error updating share class', error);
  }
};

const deleteShareClassById = async (req, res) => {
  try {
    const deletedShareClass = await databaseAdapter.findByIdAndDelete(MODEL_NAME, req.params.id);
    if (!deletedShareClass) {
      return errorResponse(res, 404, 'Share class not found');
    }
    res.status(200).json({ message: 'Share class deleted' });
  } catch (error) {
    errorResponse(res, 500, 'Error deleting share class', error);
  }
};

module.exports = {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById,
};
