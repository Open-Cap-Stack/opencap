/**
 * Stakeholder Controller
 *
 * Migrated to use ZeroDB instead of MongoDB
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const zerodbService = require('../services/zerodbService');

const TABLE_NAME = 'stakeholders';

/**
 * Helper to unwrap ZeroDB response data
 * ZeroDB returns { data: [{ row_data: {...}, row_id: ... }] }
 */
function unwrapZeroDBResponse(result) {
  const rawData = result.data || result.rows || result || [];
  if (Array.isArray(rawData)) {
    return rawData.map(item => {
      if (item.row_data) {
        return {
          ...item.row_data,
          id: item.row_id || item.row_data.id,
          _id: item.row_id || item.row_data._id || item.row_data.id,
          row_id: item.row_id
        };
      }
      return item;
    });
  }
  return rawData;
}

exports.createStakeholder = async (req, res) => {
  const { stakeholderId, name, role, projectId } = req.body;

  if (!stakeholderId || !name || !role || !projectId) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const stakeholderData = { stakeholderId, name, role, projectId };
    const result = await zerodbService.insertRow(TABLE_NAME, stakeholderData);

    // Extract the saved stakeholder from ZeroDB response
    const insertedRow = result.data?.[0] || result.rows?.[0] || result;
    const createdStakeholder = {
      ...stakeholderData,
      ...insertedRow.row_data,
      id: insertedRow.row_id || insertedRow.id,
      _id: insertedRow.row_id || insertedRow.id,
      row_id: insertedRow.row_id
    };

    res.status(201).json(createdStakeholder);
  } catch (error) {
    console.error('Error creating stakeholder:', error);
    res.status(500).json({ error: 'Error creating stakeholder' });
  }
};

exports.getAllStakeholders = async (req, res) => {
  try {
    const result = await zerodbService.queryTable(TABLE_NAME, { limit: 1000 });
    const stakeholders = unwrapZeroDBResponse(result);
    res.status(200).json(stakeholders);
  } catch (error) {
    console.error('Error fetching stakeholders:', error);
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
};

exports.getStakeholderById = async (req, res) => {
  try {
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { id: req.params.id },
      limit: 1
    });

    const stakeholders = unwrapZeroDBResponse(result);

    if (!stakeholders || stakeholders.length === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ stakeholder: stakeholders[0] });
  } catch (error) {
    console.error('Error fetching stakeholder:', error);
    res.status(500).json({ error: 'Error fetching stakeholder' });
  }
};

exports.updateStakeholderById = async (req, res) => {
  try {
    const result = await zerodbService.updateRows(TABLE_NAME, {
      filter: { id: req.params.id },
      update: req.body
    });

    if (!result || result.modified_count === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    // Fetch the updated stakeholder
    const fetchResult = await zerodbService.queryTable(TABLE_NAME, {
      filter: { id: req.params.id },
      limit: 1
    });
    const stakeholders = unwrapZeroDBResponse(fetchResult);
    const updatedStakeholder = stakeholders[0] || null;

    res.status(200).json({ stakeholder: updatedStakeholder });
  } catch (error) {
    console.error('Error updating stakeholder:', error);
    res.status(500).json({ error: 'Error updating stakeholder' });
  }
};

exports.deleteStakeholderById = async (req, res) => {
  try {
    const result = await zerodbService.deleteRows(TABLE_NAME, {
      filter: { id: req.params.id }
    });

    if (!result || result.deleted_count === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ message: 'Stakeholder deleted' });
  } catch (error) {
    console.error('Error deleting stakeholder:', error);
    res.status(500).json({ error: 'Error deleting stakeholder' });
  }
};
