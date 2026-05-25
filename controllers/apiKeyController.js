/**
 * API Key Controller
 * Issue #610: Self-service API keys for integrations (MCP, automation, etc.)
 *
 * Keys are stored as SHA-256 hashes. Plaintext is shown once at creation.
 * Keys authenticate via the standard Bearer token flow in authMiddleware.
 */

const crypto = require('crypto');
const zerodbService = require('../services/zerodbService');

const TABLE = 'api_keys';
const KEY_PREFIX = 'ocs_';
const MAX_KEYS_PER_USER = 10;

function unwrap(result) {
  if (!result) return [];
  const raw = result.data || result.rows || result || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item.row_data) return { ...item.row_data, id: item.row_id || item.row_data.id, row_id: item.row_id };
    return item;
  });
}

function hashKey(plaintext) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

function generateKey() {
  return KEY_PREFIX + crypto.randomBytes(32).toString('hex');
}

function sanitize(key) {
  const { keyHash, ...safe } = key;
  return safe;
}

/**
 * POST /api/v1/api-keys
 * Generate a new API key. Returns the plaintext key once — never again.
 */
exports.createApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const name = (req.body.name || 'Default').slice(0, 64);

    // Enforce per-user limit
    const existing = unwrap(await zerodbService.queryTable(TABLE, { filter: { userId } }));
    if (existing.length >= MAX_KEYS_PER_USER) {
      return res.status(400).json({ message: `Maximum ${MAX_KEYS_PER_USER} API keys per user. Revoke one first.` });
    }

    const plaintext = generateKey();
    const keyHash = hashKey(plaintext);
    const keyId = `apikey_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const record = {
      keyId,
      userId,
      companyId: companyId || null,
      name,
      keyHash,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await zerodbService.insertRow(TABLE, record);

    // Return plaintext once — never stored
    return res.status(201).json({
      ...sanitize(record),
      key: plaintext,
      message: 'Save this key — it will not be shown again.',
    });
  } catch (err) {
    console.error('createApiKey error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/v1/api-keys
 * List all API keys for the current user (no plaintext or hash).
 */
exports.listApiKeys = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await zerodbService.queryTable(TABLE, { filter: { userId } });
    const keys = unwrap(result).map(sanitize);
    return res.status(200).json(keys);
  } catch (err) {
    console.error('listApiKeys error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/v1/api-keys/:keyId
 * Revoke (delete) an API key. Only the owning user can revoke.
 */
exports.revokeApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { keyId } = req.params;

    const result = await zerodbService.queryTable(TABLE, { filter: { keyId } });
    const rows = unwrap(result);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }

    const key = rows[0];
    if (key.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const rowId = key.row_id || key.id;
    await zerodbService.deleteRows(TABLE, { filter: { keyId } });

    return res.status(200).json({ message: 'API key revoked' });
  } catch (err) {
    console.error('revokeApiKey error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Lookup a user record by API key plaintext.
 * Called from authMiddleware when JWT decode fails.
 * Returns { userId, email, role, companyId } or null.
 */
exports.resolveApiKey = async (plaintext) => {
  try {
    const keyHash = hashKey(plaintext);
    const result = await zerodbService.queryTable(TABLE, { filter: { keyHash } });
    const rows = unwrap(result);
    if (rows.length === 0) return null;

    const keyRecord = rows[0];

    // Update lastUsedAt async — don't block the request
    zerodbService.updateRows(TABLE, {
      filter: { keyId: keyRecord.keyId },
      update: { lastUsedAt: new Date().toISOString() },
    }).catch(() => {});

    // Load the user record
    const userResult = await zerodbService.queryTable('users', { filter: { userId: keyRecord.userId } });
    const userRows = unwrap(userResult);
    if (userRows.length === 0) return null;

    const user = userRows[0];
    return {
      userId: user.userId || user._id,
      email: user.email,
      role: user.role || 'employee',
      companyId: user.companyId || keyRecord.companyId || null,
      apiKeyId: keyRecord.keyId,
      apiKeyName: keyRecord.name,
    };
  } catch (err) {
    console.error('resolveApiKey error:', err.message);
    return null;
  }
};
