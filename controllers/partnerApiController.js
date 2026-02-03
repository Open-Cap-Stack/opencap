/**
 * Partner API Controller
 * Issue #119: Create API Access for Partners
 *
 * API controller for managing partner API keys:
 * - CRUD operations for API keys
 * - Key lifecycle management (create, revoke, refresh)
 * - Usage statistics
 * - Suspension and reactivation
 */

const partnerApiService = require('../services/partnerApiService');

/**
 * Create a new API key
 */
const createApiKey = async (req, res) => {
  try {
    const { partnerId, companyId, name, description, permissions, rateLimit, expiresAt, ipWhitelist } = req.body;

    // Validate required fields
    if (!partnerId || !companyId || !name) {
      return res.status(400).json({
        error: 'Missing required fields: partnerId, companyId, and name are required'
      });
    }

    const result = await partnerApiService.generateApiKey({
      partnerId,
      companyId,
      name,
      description,
      permissions,
      rateLimit,
      expiresAt,
      ipWhitelist
    });

    res.status(201).json({
      ...result,
      message: 'API key created successfully. Store the key and secret securely - the secret will not be shown again.'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all API keys for a partner
 */
const getApiKeys = async (req, res) => {
  try {
    const { partnerId } = req.query;

    if (!partnerId) {
      return res.status(400).json({ error: 'Partner ID required' });
    }

    const apiKeys = await partnerApiService.getApiKeysByPartner(partnerId);
    res.status(200).json(apiKeys);
  } catch (error) {
    console.error('Error getting API keys:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get API key by ID
 */
const getApiKeyById = async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await partnerApiService.getApiKeyById(id);

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.status(200).json(apiKey);
  } catch (error) {
    console.error('Error getting API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update API key
 */
const updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedApiKey = await partnerApiService.updateApiKey(id, updates);

    if (!updatedApiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.status(200).json(updatedApiKey);
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete API key
 */
const deleteApiKey = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await partnerApiService.deleteApiKey(id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.status(200).json({ message: 'API key deleted' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Revoke API key
 */
const revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await partnerApiService.revokeApiKey(id);

    if (!result.success) {
      if (result.error === 'API key not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ message: 'API key revoked' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Refresh API key secret
 */
const refreshApiKey = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await partnerApiService.refreshApiKey(id);

    if (!result.success) {
      if (result.error === 'API key not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({
      newSecret: result.newSecret,
      message: 'API key secret refreshed. Store the new secret securely - it will not be shown again.'
    });
  } catch (error) {
    console.error('Error refreshing API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get API key usage statistics
 */
const getApiKeyUsage = async (req, res) => {
  try {
    const { id } = req.params;

    const usage = await partnerApiService.getApiKeyUsage(id);

    if (usage.error) {
      return res.status(404).json({ error: usage.error });
    }

    res.status(200).json(usage);
  } catch (error) {
    console.error('Error getting API key usage:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Suspend API key
 */
const suspendApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await partnerApiService.suspendApiKey(id, reason);

    if (!result.success) {
      if (result.error === 'API key not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ message: 'API key suspended' });
  } catch (error) {
    console.error('Error suspending API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reactivate suspended API key
 */
const reactivateApiKey = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await partnerApiService.reactivateApiKey(id);

    if (!result.success) {
      if (result.error === 'API key not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ message: 'API key reactivated' });
  } catch (error) {
    console.error('Error reactivating API key:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Validate API key
 */
const validateApiKey = async (req, res) => {
  try {
    const { key, secret } = req.body;

    if (!key || !secret) {
      return res.status(400).json({
        error: 'Key and secret are required'
      });
    }

    const result = await partnerApiService.validateApiKey(key, secret);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createApiKey,
  getApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  revokeApiKey,
  refreshApiKey,
  getApiKeyUsage,
  suspendApiKey,
  reactivateApiKey,
  validateApiKey
};
