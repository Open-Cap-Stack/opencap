/**
 * Stakeholder Controller
 *
 * Migrated to use ZeroDB instead of MongoDB
 * Uses Stakeholder model for database operations
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const Stakeholder = require('../models/Stakeholder');

/**
 * Create a new stakeholder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createStakeholder = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.create(req.body);
    res.status(201).json(stakeholder);
  } catch (error) {
    console.error('Error creating stakeholder:', error);
    res.status(500).json({ error: 'Error creating stakeholder' });
  }
};

/**
 * Get all stakeholders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllStakeholders = async (req, res) => {
  try {
    // Build filter from query params
    const filter = {};
    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }
    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const stakeholders = await Stakeholder.find(filter);
    res.status(200).json(stakeholders);
  } catch (error) {
    console.error('Error fetching stakeholders:', error);
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
};

/**
 * Get stakeholder by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStakeholderById = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findById(req.params.id);

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ stakeholder });
  } catch (error) {
    console.error('Error fetching stakeholder:', error);
    res.status(500).json({ error: 'Error fetching stakeholder' });
  }
};

/**
 * Update stakeholder by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateStakeholderById = async (req, res) => {
  try {
    // ZeroDB: Use direct update without MongoDB $set operator
    const stakeholder = await Stakeholder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ stakeholder });
  } catch (error) {
    console.error('Error updating stakeholder:', error);
    res.status(500).json({ error: 'Error updating stakeholder' });
  }
};

/**
 * Delete stakeholder by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteStakeholderById = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findByIdAndDelete(req.params.id);

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ message: 'Stakeholder deleted' });
  } catch (error) {
    console.error('Error deleting stakeholder:', error);
    res.status(500).json({ error: 'Error deleting stakeholder' });
  }
};
