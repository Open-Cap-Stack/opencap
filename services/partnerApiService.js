/**
 * Partner API Service
 * Issue #119: Create API Access for Partners
 *
 * Business logic for partner API key management including:
 * - API key generation and validation
 * - Rate limiting
 * - Permission checking
 * - Usage tracking
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const databaseAdapter = require('./databaseAdapter');

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
const generateSecureString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a string using SHA-256
 * @param {string} value - Value to hash
 * @returns {string} Hashed value
 */
const hashValue = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Generate a new API key pair
 * @param {Object} partnerData - Partner data
 * @returns {Object} Generated API key info
 */
const generateApiKey = async (partnerData) => {
  const {
    partnerId,
    companyId,
    name,
    description = '',
    permissions = [],
    rateLimit = { requestsPerMinute: 60, requestsPerHour: 1000 },
    expiresAt = null,
    ipWhitelist = []
  } = partnerData;

  // Generate unique API key ID
  const apiKeyId = `APIK-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Generate key and secret
  const key = `oc_${generateSecureString(16)}`;
  const secret = `ocs_${generateSecureString(24)}`;

  // Hash key and secret for storage
  const keyHash = hashValue(key);
  const secretHash = hashValue(secret);

  // Create API key record
  const apiKeyData = {
    apiKeyId,
    partnerId,
    companyId,
    keyHash,
    secretHash,
    name,
    description,
    permissions,
    rateLimit,
    status: 'active',
    expiresAt,
    ipWhitelist,
    lastUsedAt: null,
    usageCount: 0,
    usageHistory: []
  };

  const savedApiKey = await databaseAdapter.create('ApiKey', apiKeyData);

  // Return the plaintext key and secret (only shown once)
  return {
    apiKeyId: savedApiKey.apiKeyId || apiKeyId,
    key,
    secret,
    partnerId,
    companyId,
    name,
    permissions,
    rateLimit,
    status: 'active',
    expiresAt,
    createdAt: savedApiKey.createdAt
  };
};

/**
 * Validate an API key and secret
 * @param {string} key - API key
 * @param {string} secret - API secret
 * @returns {Object} Validation result
 */
const validateApiKey = async (key, secret) => {
  try {
    // Hash the provided key to search
    const keyHash = hashValue(key);

    // Find API key by hash
    const apiKey = await databaseAdapter.findOne('ApiKey', { keyHash });

    if (!apiKey) {
      return { valid: false, reason: 'Invalid API key' };
    }

    // Verify secret
    const secretHash = hashValue(secret);
    if (apiKey.secretHash !== secretHash) {
      return { valid: false, reason: 'Invalid API secret' };
    }

    // Check status
    if (apiKey.status === 'suspended') {
      return { valid: false, reason: 'API key is suspended' };
    }

    if (apiKey.status === 'revoked') {
      return { valid: false, reason: 'API key is revoked' };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, reason: 'API key has expired' };
    }

    // Update last used timestamp
    await databaseAdapter.findByIdAndUpdate(
      'ApiKey',
      apiKey._id,
      { lastUsedAt: new Date() },
      { new: true }
    );

    return {
      valid: true,
      apiKey: {
        apiKeyId: apiKey.apiKeyId,
        partnerId: apiKey.partnerId,
        companyId: apiKey.companyId,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        ipWhitelist: apiKey.ipWhitelist
      }
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    throw error;
  }
};

/**
 * Revoke an API key
 * @param {string} apiKeyId - API key ID
 * @returns {Object} Result
 */
const revokeApiKey = async (apiKeyId) => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  if (apiKey.status === 'revoked') {
    return { success: false, error: 'API key is already revoked' };
  }

  await databaseAdapter.findByIdAndUpdate(
    'ApiKey',
    apiKey._id,
    { status: 'revoked', revokedAt: new Date() },
    { new: true }
  );

  return { success: true, message: 'API key revoked' };
};

/**
 * Refresh an API key secret
 * @param {string} apiKeyId - API key ID
 * @returns {Object} Result with new secret
 */
const refreshApiKey = async (apiKeyId) => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  if (apiKey.status === 'revoked') {
    return { success: false, error: 'Cannot refresh a revoked API key' };
  }

  // Generate new secret
  const newSecret = `ocs_${generateSecureString(24)}`;
  const secretHash = hashValue(newSecret);

  await databaseAdapter.findByIdAndUpdate(
    'ApiKey',
    apiKey._id,
    { secretHash },
    { new: true }
  );

  return {
    success: true,
    newSecret,
    message: 'API key secret refreshed. Store the new secret securely.'
  };
};

/**
 * Get API key usage statistics
 * @param {string} apiKeyId - API key ID
 * @returns {Object} Usage statistics
 */
const getApiKeyUsage = async (apiKeyId) => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return { error: 'API key not found' };
  }

  return {
    apiKeyId: apiKey.apiKeyId,
    totalRequests: apiKey.usageCount || 0,
    lastUsedAt: apiKey.lastUsedAt,
    usageHistory: apiKey.usageHistory || []
  };
};

/**
 * Check if request is within rate limits
 * @param {Object} apiKey - API key object
 * @param {Object} currentUsage - Current usage counts
 * @returns {Object} Rate limit check result
 */
const checkRateLimit = async (apiKey, currentUsage) => {
  const { requestsPerMinute, requestsPerHour } = apiKey.rateLimit;
  const { minuteCount, hourCount } = currentUsage;

  if (minuteCount > requestsPerMinute) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded (per minute)',
      retryAfter: 60
    };
  }

  if (hourCount > requestsPerHour) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded (per hour)',
      retryAfter: 3600
    };
  }

  return {
    allowed: true,
    remaining: {
      minute: requestsPerMinute - minuteCount,
      hour: requestsPerHour - hourCount
    }
  };
};

/**
 * Suspend an API key
 * @param {string} apiKeyId - API key ID
 * @param {string} reason - Suspension reason
 * @returns {Object} Result
 */
const suspendApiKey = async (apiKeyId, reason = 'No reason provided') => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  if (apiKey.status === 'revoked') {
    return { success: false, error: 'Cannot suspend a revoked API key' };
  }

  await databaseAdapter.findByIdAndUpdate(
    'ApiKey',
    apiKey._id,
    {
      status: 'suspended',
      suspendedAt: new Date(),
      suspensionReason: reason
    },
    { new: true }
  );

  return { success: true, message: 'API key suspended' };
};

/**
 * Reactivate a suspended API key
 * @param {string} apiKeyId - API key ID
 * @returns {Object} Result
 */
const reactivateApiKey = async (apiKeyId) => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  if (apiKey.status !== 'suspended') {
    return { success: false, error: 'API key is not suspended' };
  }

  await databaseAdapter.findByIdAndUpdate(
    'ApiKey',
    apiKey._id,
    {
      status: 'active',
      reactivatedAt: new Date(),
      suspendedAt: null,
      suspensionReason: null
    },
    { new: true }
  );

  return { success: true, message: 'API key reactivated' };
};

/**
 * Get all API keys for a partner
 * @param {string} partnerId - Partner ID
 * @returns {Array} API keys
 */
const getApiKeysByPartner = async (partnerId) => {
  return await databaseAdapter.find('ApiKey', { partnerId });
};

/**
 * Get API key by ID
 * @param {string} apiKeyId - API key ID
 * @returns {Object} API key
 */
const getApiKeyById = async (apiKeyId) => {
  return await databaseAdapter.findOne('ApiKey', { apiKeyId });
};

/**
 * Update API key
 * @param {string} apiKeyId - API key ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated API key
 */
const updateApiKey = async (apiKeyId, updates) => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return null;
  }

  // Don't allow updating sensitive fields
  const allowedUpdates = ['name', 'description', 'permissions', 'rateLimit', 'ipWhitelist', 'expiresAt'];
  const filteredUpdates = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  return await databaseAdapter.findByIdAndUpdate(
    'ApiKey',
    apiKey._id,
    filteredUpdates,
    { new: true }
  );
};

/**
 * Delete API key
 * @param {string} apiKeyId - API key ID
 * @returns {Object} Result
 */
const deleteApiKey = async (apiKeyId) => {
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  await databaseAdapter.findByIdAndDelete('ApiKey', apiKey._id);

  return { success: true };
};

/**
 * Check if API key has required permission
 * @param {Object} apiKey - API key object
 * @param {string} requiredPermission - Required permission
 * @returns {boolean} Has permission
 */
const checkPermission = (apiKey, requiredPermission) => {
  const { permissions } = apiKey;

  if (!permissions || permissions.length === 0) {
    return false;
  }

  // Check for wildcard permission
  if (permissions.includes('*')) {
    return true;
  }

  // Check for exact match
  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // Check for category wildcard (e.g., 'read:*' matches 'read:companies')
  const [action] = requiredPermission.split(':');
  if (permissions.includes(`${action}:*`)) {
    return true;
  }

  return false;
};

/**
 * Record API usage
 * @param {string} apiKeyId - API key ID
 */
const recordApiUsage = async (apiKeyId) => {
  const today = new Date().toISOString().split('T')[0];
  const apiKey = await databaseAdapter.findOne('ApiKey', { apiKeyId });

  if (!apiKey) {
    return;
  }

  // Update usage count
  const usageHistory = apiKey.usageHistory || [];
  const todayEntry = usageHistory.find(entry => entry.date === today);

  if (todayEntry) {
    todayEntry.count++;
  } else {
    usageHistory.push({ date: today, count: 1 });
    // Keep only last 30 days
    if (usageHistory.length > 30) {
      usageHistory.shift();
    }
  }

  await databaseAdapter.findByIdAndUpdate(
    'ApiKey',
    apiKey._id,
    {
      usageCount: (apiKey.usageCount || 0) + 1,
      usageHistory,
      lastUsedAt: new Date()
    },
    { new: true }
  );
};

module.exports = {
  generateApiKey,
  validateApiKey,
  revokeApiKey,
  refreshApiKey,
  getApiKeyUsage,
  checkRateLimit,
  suspendApiKey,
  reactivateApiKey,
  getApiKeysByPartner,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  checkPermission,
  recordApiUsage
};
