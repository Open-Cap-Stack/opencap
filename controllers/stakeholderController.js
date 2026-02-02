/**
 * Stakeholder Controller
 *
 * Migrated to use ZeroDB instead of MongoDB
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const zerodbService = require('../services/zerodbService');

const TABLE_NAME = 'stakeholders';

exports.createStakeholder = async (req, res) => {
  const { stakeholderId, name, role, projectId } = req.body;

  if (!stakeholderId || !name || !role || !projectId) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const stakeholderData = { stakeholderId, name, role, projectId };
    const result = await zerodbService.insertRow(TABLE_NAME, stakeholderData);
    const createdStakeholder = result.rows && result.rows[0] ? result.rows[0] : stakeholderData;
    res.status(201).json(createdStakeholder);
  } catch (error) {
    res.status(500).json({ error: 'Error creating stakeholder' });
  }
};

exports.getAllStakeholders = async (req, res) => {
  try {
    const stakeholders = await zerodbService.queryTable(TABLE_NAME, {});
    res.status(200).json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
};

exports.getStakeholderById = async (req, res) => {
  try {
    const stakeholders = await zerodbService.queryTable(TABLE_NAME, {
      filter: { id: req.params.id }
    });

    if (!stakeholders || stakeholders.length === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ stakeholder: stakeholders[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stakeholder' });
  }
};

exports.updateStakeholderById = async (req, res) => {
  try {
    const result = await zerodbService.updateRows(
      TABLE_NAME,
      { id: req.params.id },
      { $set: req.body }
    );

    if (!result || result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    const updatedStakeholder = result.rows && result.rows[0] ? result.rows[0] : null;
    res.status(200).json({ stakeholder: updatedStakeholder });
  } catch (error) {
    res.status(500).json({ error: 'Error updating stakeholder' });
  }
};

exports.deleteStakeholderById = async (req, res) => {
  try {
    const result = await zerodbService.deleteRows(TABLE_NAME, { id: req.params.id });

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ message: 'Stakeholder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting stakeholder' });
  }
};
