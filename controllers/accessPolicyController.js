/**
 * Access Policy Controller
 *
 * Handles CRUD operations for access policies using ZeroDB
 * Issue #247: Implement Access Policies Endpoints
 *
 * Access policies define granular permissions for different resource types
 * such as documents, share classes, stakeholders, etc.
 */

const zerodbService = require('../services/zerodbService');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'access_policies';

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
 * Create a new access policy
 * POST /api/v1/access-policies
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Policy data
 * @param {string} req.body.name - Policy name
 * @param {string} req.body.description - Policy description
 * @param {string} req.body.resourceType - Type of resource (document, share_class, etc.)
 * @param {Array<string>} req.body.actions - Allowed actions (read, write, delete, etc.)
 * @param {Object} req.body.conditions - Conditions for policy application
 * @param {string} req.body.status - Policy status (active, inactive)
 * @param {Object} res - Express response object
 */
exports.createAccessPolicy = async (req, res) => {
  try {
    const {
      name,
      description,
      resourceType,
      actions,
      conditions,
      status
    } = req.body;

    // Validation
    if (!name || !resourceType || !actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        error: 'Name, resourceType, and actions are required'
      });
    }

    // Prepare policy data
    const policyData = {
      policyId: `POL-${uuidv4().split('-')[0].toUpperCase()}`,
      name,
      description: description || '',
      resourceType,
      actions,
      conditions: conditions || {},
      status: status || 'active',
      createdBy: req.user?.userId || 'system',
      companyId: req.user?.companyId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert into ZeroDB
    const result = await zerodbService.insertRow(TABLE_NAME, policyData);

    // Extract the saved policy from ZeroDB response
    const insertedRow = result.data?.[0] || result.rows?.[0] || result;
    const createdPolicy = {
      ...policyData,
      ...insertedRow.row_data,
      id: insertedRow.row_id || insertedRow.id,
      _id: insertedRow.row_id || insertedRow.id,
      row_id: insertedRow.row_id
    };

    res.status(201).json(createdPolicy);
  } catch (error) {
    console.error('Error creating access policy:', error);
    res.status(500).json({ error: 'Error creating access policy' });
  }
};

/**
 * Get all access policies
 * GET /api/v1/access-policies
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAccessPolicies = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    // Build query filter
    const filter = companyId ? { companyId } : {};

    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter,
      limit: 1000
    });

    const policies = unwrapZeroDBResponse(result);
    res.status(200).json(policies);
  } catch (error) {
    console.error('Error fetching access policies:', error);
    res.status(500).json({ error: 'Error fetching access policies' });
  }
};

/**
 * Get access policy by ID
 * GET /api/v1/access-policies/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Policy ID
 * @param {Object} res - Express response object
 */
exports.getAccessPolicyById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { policyId: id },
      limit: 1
    });

    const policies = unwrapZeroDBResponse(result);

    if (!policies || policies.length === 0) {
      return res.status(404).json({ error: 'Access policy not found' });
    }

    res.status(200).json(policies[0]);
  } catch (error) {
    console.error('Error fetching access policy:', error);
    res.status(500).json({ error: 'Error fetching access policy' });
  }
};

/**
 * Update access policy by ID
 * PUT /api/v1/access-policies/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Policy ID
 * @param {Object} req.body - Updated policy data
 * @param {Object} res - Express response object
 */
exports.updateAccessPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated
    delete updateData.policyId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    const result = await zerodbService.updateRows(TABLE_NAME, {
      filter: { policyId: id },
      update: updateData
    });

    if (!result || result.modified_count === 0) {
      return res.status(404).json({ error: 'Access policy not found' });
    }

    // Fetch the updated policy
    const fetchResult = await zerodbService.queryTable(TABLE_NAME, {
      filter: { policyId: id },
      limit: 1
    });

    const policies = unwrapZeroDBResponse(fetchResult);
    const updatedPolicy = policies[0] || null;

    res.status(200).json(updatedPolicy);
  } catch (error) {
    console.error('Error updating access policy:', error);
    res.status(500).json({ error: 'Error updating access policy' });
  }
};

/**
 * Delete access policy by ID
 * DELETE /api/v1/access-policies/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Policy ID
 * @param {Object} res - Express response object
 */
exports.deleteAccessPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await zerodbService.deleteRows(TABLE_NAME, {
      filter: { policyId: id }
    });

    if (!result || result.deleted_count === 0) {
      return res.status(404).json({ error: 'Access policy not found' });
    }

    res.status(200).json({ message: 'Access policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting access policy:', error);
    res.status(500).json({ error: 'Error deleting access policy' });
  }
};

/**
 * Get predefined access policy templates
 * GET /api/v1/access-policies/templates
 *
 * Returns a list of common access policy templates that can be used
 * as starting points for creating new policies.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAccessPolicyTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'TPL-DOCUMENT-READ',
        name: 'Document Read Access',
        description: 'Allows read-only access to documents',
        resourceType: 'document',
        actions: ['read', 'download'],
        conditions: {
          roleRequired: 'investor',
          documentType: null
        },
        status: 'active',
        category: 'documents'
      },
      {
        id: 'TPL-DOCUMENT-FULL',
        name: 'Document Full Access',
        description: 'Allows full access to documents including upload and delete',
        resourceType: 'document',
        actions: ['read', 'write', 'delete', 'download', 'upload'],
        conditions: {
          roleRequired: 'admin',
          documentType: null
        },
        status: 'active',
        category: 'documents'
      },
      {
        id: 'TPL-SHARECLASS-READ',
        name: 'Share Class View Access',
        description: 'Allows viewing share class information',
        resourceType: 'share_class',
        actions: ['read'],
        conditions: {
          roleRequired: 'investor',
          shareClassType: null
        },
        status: 'active',
        category: 'equity'
      },
      {
        id: 'TPL-SHARECLASS-MANAGE',
        name: 'Share Class Management',
        description: 'Allows full management of share classes',
        resourceType: 'share_class',
        actions: ['read', 'write', 'delete', 'issue'],
        conditions: {
          roleRequired: 'admin',
          shareClassType: null
        },
        status: 'active',
        category: 'equity'
      },
      {
        id: 'TPL-STAKEHOLDER-VIEW',
        name: 'Stakeholder View Access',
        description: 'Allows viewing stakeholder information',
        resourceType: 'stakeholder',
        actions: ['read'],
        conditions: {
          roleRequired: 'user',
          stakeholderType: null
        },
        status: 'active',
        category: 'stakeholders'
      },
      {
        id: 'TPL-STAKEHOLDER-MANAGE',
        name: 'Stakeholder Management',
        description: 'Allows full management of stakeholders',
        resourceType: 'stakeholder',
        actions: ['read', 'write', 'delete', 'invite'],
        conditions: {
          roleRequired: 'admin',
          stakeholderType: null
        },
        status: 'active',
        category: 'stakeholders'
      },
      {
        id: 'TPL-FINANCIAL-READ',
        name: 'Financial Data Read Access',
        description: 'Allows read-only access to financial data',
        resourceType: 'financial_data',
        actions: ['read', 'export'],
        conditions: {
          roleRequired: 'investor',
          dataType: null
        },
        status: 'active',
        category: 'financials'
      },
      {
        id: 'TPL-FINANCIAL-FULL',
        name: 'Financial Data Full Access',
        description: 'Allows full access to financial data',
        resourceType: 'financial_data',
        actions: ['read', 'write', 'delete', 'export', 'import'],
        conditions: {
          roleRequired: 'admin',
          dataType: null
        },
        status: 'active',
        category: 'financials'
      },
      {
        id: 'TPL-DATAROOM-GUEST',
        name: 'Data Room Guest Access',
        description: 'Limited access for data room guests',
        resourceType: 'data_room',
        actions: ['read', 'download'],
        conditions: {
          roleRequired: 'guest',
          dataRoomId: null,
          expiresAt: null
        },
        status: 'active',
        category: 'data_room'
      },
      {
        id: 'TPL-DATAROOM-ADMIN',
        name: 'Data Room Admin Access',
        description: 'Full administrative access to data room',
        resourceType: 'data_room',
        actions: ['read', 'write', 'delete', 'manage_permissions', 'download', 'upload'],
        conditions: {
          roleRequired: 'admin',
          dataRoomId: null
        },
        status: 'active',
        category: 'data_room'
      }
    ];

    res.status(200).json({ templates });
  } catch (error) {
    console.error('Error fetching access policy templates:', error);
    res.status(500).json({ error: 'Error fetching access policy templates' });
  }
};
