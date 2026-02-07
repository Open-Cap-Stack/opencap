/**
 * Access Group Controller
 *
 * Handles CRUD operations for access groups using ZeroDB
 * Issue #274: Implement Access Groups and Policy Management endpoints
 *
 * Access groups are used to organize users for bulk policy assignment.
 * Groups can be assigned policies which then apply to all group members.
 */

const zerodbService = require('../services/zerodbService');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'access_groups';

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

/**
 * Get all access groups
 * GET /api/v1/access-groups
 *
 * Returns a list of all access groups available for policy assignment.
 * If no groups exist in the database, returns predefined default groups.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAccessGroups = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    // Build query filter
    const filter = companyId ? { companyId } : {};

    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter,
      limit: 1000
    });

    let groups = unwrapZeroDBResponse(result);

    // If no groups exist, return predefined default groups
    if (!groups || groups.length === 0) {
      groups = getDefaultAccessGroups(companyId);
    }

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching access groups:', error);

    // If table doesn't exist or other error, return default groups
    const companyId = req.user?.companyId;
    const defaultGroups = getDefaultAccessGroups(companyId);
    res.status(200).json(defaultGroups);
  }
};

/**
 * Get access group by ID
 * GET /api/v1/access-groups/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Group ID
 * @param {Object} res - Express response object
 */
exports.getAccessGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { groupId: id },
      limit: 1
    });

    const groups = unwrapZeroDBResponse(result);

    if (!groups || groups.length === 0) {
      // Check if it's a default group
      const defaultGroups = getDefaultAccessGroups(req.user?.companyId);
      const defaultGroup = defaultGroups.find(g => g.id === id);

      if (defaultGroup) {
        return res.status(200).json(defaultGroup);
      }

      return res.status(404).json({ error: 'Access group not found' });
    }

    res.status(200).json(groups[0]);
  } catch (error) {
    console.error('Error fetching access group:', error);
    res.status(500).json({ error: 'Error fetching access group' });
  }
};

/**
 * Create a new access group
 * POST /api/v1/access-groups
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Group data
 * @param {string} req.body.name - Group name
 * @param {string} req.body.description - Group description
 * @param {Object} res - Express response object
 */
exports.createAccessGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Group name is required'
      });
    }

    // Prepare group data
    const groupData = {
      groupId: `GRP-${uuidv4().split('-')[0].toUpperCase()}`,
      name: name.trim(),
      description: description || '',
      memberCount: 0,
      createdBy: req.user?.userId || 'system',
      companyId: req.user?.companyId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert into ZeroDB
    const result = await zerodbService.insertRow(TABLE_NAME, groupData);

    // Extract the saved group from ZeroDB response
    const insertedRow = result.data?.[0] || result.rows?.[0] || result;
    const createdGroup = {
      ...groupData,
      ...insertedRow.row_data,
      id: insertedRow.row_id || groupData.groupId,
      _id: insertedRow.row_id || groupData.groupId,
      row_id: insertedRow.row_id
    };

    res.status(201).json(createdGroup);
  } catch (error) {
    console.error('Error creating access group:', error);
    res.status(500).json({ error: 'Error creating access group' });
  }
};

/**
 * Update access group by ID
 * PUT /api/v1/access-groups/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Group ID
 * @param {Object} req.body - Updated group data
 * @param {Object} res - Express response object
 */
exports.updateAccessGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated
    delete updateData.groupId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    const result = await zerodbService.updateRows(TABLE_NAME, {
      filter: { groupId: id },
      update: updateData
    });

    if (!result || result.modified_count === 0) {
      return res.status(404).json({ error: 'Access group not found' });
    }

    // Fetch the updated group
    const fetchResult = await zerodbService.queryTable(TABLE_NAME, {
      filter: { groupId: id },
      limit: 1
    });

    const groups = unwrapZeroDBResponse(fetchResult);
    const updatedGroup = groups[0] || null;

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error updating access group:', error);
    res.status(500).json({ error: 'Error updating access group' });
  }
};

/**
 * Delete access group by ID
 * DELETE /api/v1/access-groups/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Group ID
 * @param {Object} res - Express response object
 */
exports.deleteAccessGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await zerodbService.deleteRows(TABLE_NAME, {
      filter: { groupId: id }
    });

    if (!result || result.deleted_count === 0) {
      return res.status(404).json({ error: 'Access group not found' });
    }

    res.status(200).json({ message: 'Access group deleted successfully' });
  } catch (error) {
    console.error('Error deleting access group:', error);
    res.status(500).json({ error: 'Error deleting access group' });
  }
};

/**
 * Get predefined default access groups
 * These are returned when no custom groups exist
 *
 * @param {string} companyId - Company ID for group association
 * @returns {Array} Array of default access groups
 */
function getDefaultAccessGroups(companyId = null) {
  const now = new Date().toISOString();

  return [
    {
      id: 'GRP-ADMINS',
      groupId: 'GRP-ADMINS',
      name: 'Administrators',
      description: 'Full administrative access to all resources',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-INVESTORS',
      groupId: 'GRP-INVESTORS',
      name: 'Investors',
      description: 'Access to investor-related documents and reports',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-EMPLOYEES',
      groupId: 'GRP-EMPLOYEES',
      name: 'Employees',
      description: 'Standard employee access to company documents',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-ADVISORS',
      groupId: 'GRP-ADVISORS',
      name: 'Advisors',
      description: 'Access for company advisors and consultants',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-LEGAL',
      groupId: 'GRP-LEGAL',
      name: 'Legal Team',
      description: 'Access to legal documents and compliance materials',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-FINANCE',
      groupId: 'GRP-FINANCE',
      name: 'Finance Team',
      description: 'Access to financial data and reports',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-BOARD',
      groupId: 'GRP-BOARD',
      name: 'Board Members',
      description: 'Board of directors access to governance documents',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    },
    {
      id: 'GRP-DATAROOM',
      groupId: 'GRP-DATAROOM',
      name: 'Data Room Guests',
      description: 'Limited access for due diligence data room visitors',
      memberCount: 0,
      companyId,
      createdAt: now,
      updatedAt: now,
      isSystem: true
    }
  ];
}
