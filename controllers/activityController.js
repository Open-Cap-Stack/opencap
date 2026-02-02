/**
 * Activity Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Handles CRUD operations for activities using DatabaseAdapter
 * for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');

/**
 * Create a new activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createActivity = async (req, res) => {
  try {
    const activity = await databaseAdapter.create('Activity', req.body);
    res.status(201).send(activity);
  } catch (error) {
    res.status(400).send(error);
  }
};

/**
 * Get all activities with optional pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActivities = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 100, 1);
    const skip = (page - 1) * limit;

    const activities = await databaseAdapter.find('Activity', {}, { skip, limit });
    res.send(activities);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activities' });
  }
};

/**
 * Get activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActivityById = async (req, res) => {
  try {
    const activity = await databaseAdapter.findById('Activity', req.params.id);
    if (!activity) {
      res.status(404).send({ message: 'Activity not found' });
    } else {
      res.send(activity);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activity' });
  }
};

/**
 * Update activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateActivity = async (req, res) => {
  try {
    const activity = await databaseAdapter.findByIdAndUpdate(
      'Activity',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!activity) {
      res.status(404).send({ message: 'Activity not found' });
    } else {
      res.send(activity);
    }
  } catch (error) {
    res.status(400).send(error);
  }
};

/**
 * Delete activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteActivity = async (req, res) => {
  try {
    await databaseAdapter.findByIdAndDelete('Activity', req.params.id);
    res.send({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
};
