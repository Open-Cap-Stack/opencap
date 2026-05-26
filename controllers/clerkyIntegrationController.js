'use strict';

/**
 * Clerky Integration Controller
 * Issue #662: Clerky (clerky.com) OAuth integration
 *
 * Connects a founder's Clerky account, stores encrypted API tokens,
 * and syncs signed legal documents into OCS data rooms.
 *
 * API keys are encrypted at rest using AES-256-GCM (ENCRYPTION_KEY env var).
 * The plaintext key is never logged or returned after storage.
 */

const crypto = require('crypto');
const zerodbService = require('../services/zerodbService');

const CLERKY_TABLE = 'clerky_connections';
const DOCUMENTS_TABLE = 'documents';

// ── Encryption helpers (same pattern as Clerk integration) ───────────────────

function getEncryptionKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

// ── ZeroDB helpers ───────────────────────────────────────────────────────────

function unwrap(result) {
  if (!result) return [];
  const raw = result.data || result.rows || result || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    item.row_data ? { ...item.row_data, _rowId: item.row_id } : item
  );
}

async function getConnection(companyId) {
  const result = await zerodbService.queryTable(CLERKY_TABLE, {
    filter: { companyId, status: 'active' },
  });
  const rows = unwrap(result);
  return rows[0] || null;
}

// ── Mock Clerky document types ───────────────────────────────────────────────

const CLERKY_DOCUMENT_TYPES = [
  { name: 'Certificate of Incorporation', category: 'Certificate of Incorporation', mimeType: 'application/pdf' },
  { name: 'Bylaws', category: 'Bylaws', mimeType: 'application/pdf' },
  { name: 'SAFE Agreement', category: 'SAFE', mimeType: 'application/pdf' },
  { name: 'Option Grant Agreement', category: 'Option Grant', mimeType: 'application/pdf' },
  { name: 'Board Consent', category: 'Board Consent', mimeType: 'application/pdf' },
  { name: 'IP Assignment Agreement', category: 'IP Assignment', mimeType: 'application/pdf' },
  { name: '83(b) Election', category: '83b Election', mimeType: 'application/pdf' },
];

// ── Endpoints ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/integrations/clerky/connect
 * Connect a Clerky account by providing an API key and org ID.
 * The API key is encrypted and stored; plaintext is never returned.
 */
exports.connect = async (req, res) => {
  try {
    const { apiKey, orgId } = req.body;
    const user = req.user;

    if (!user?.companyId) {
      return res.status(400).json({ message: 'A company must be set up before connecting Clerky.' });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ message: 'apiKey is required and must be a string.' });
    }

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({ message: 'orgId is required and must be a string.' });
    }

    // Encrypt the API key
    const { encrypted, iv, authTag } = encrypt(apiKey);
    const now = new Date().toISOString();
    const connectionId = `clerky_${crypto.randomUUID()}`;

    // Check for existing connection and update or create
    const existing = await getConnection(user.companyId);

    const record = {
      companyId: user.companyId,
      userId: user.userId || user.id,
      clerkyOrgId: orgId,
      accessToken: encrypted,
      accessTokenIv: iv,
      accessTokenTag: authTag,
      refreshToken: null,
      refreshTokenIv: null,
      refreshTokenTag: null,
      status: 'active',
      lastSyncedAt: null,
      updatedAt: now,
    };

    if (existing) {
      await zerodbService.updateRows(CLERKY_TABLE, {
        filter: { companyId: user.companyId, status: 'active' },
        update: record,
      });
      return res.status(200).json({
        connected: true,
        connectionId: existing.connectionId,
      });
    }

    await zerodbService.insertRow(CLERKY_TABLE, {
      connectionId,
      connectedAt: now,
      ...record,
    });

    return res.status(200).json({
      connected: true,
      connectionId,
    });
  } catch (err) {
    console.error('clerky connect error:', err.message);
    return res.status(500).json({ message: 'Failed to connect Clerky account.' });
  }
};

/**
 * GET /api/v1/integrations/clerky/status
 * Returns connection status for the authenticated user's company.
 */
exports.getStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(200).json({ connected: false });
    }

    const connection = await getConnection(companyId);

    if (!connection) {
      return res.status(200).json({ connected: false });
    }

    return res.status(200).json({
      connected: true,
      connectedAt: connection.connectedAt,
      lastSyncedAt: connection.lastSyncedAt || null,
      clerkyOrgId: connection.clerkyOrgId,
    });
  } catch (err) {
    console.error('clerky status error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/v1/integrations/clerky/sync
 * Fetches documents from Clerky and syncs them into the company data room.
 * Currently uses mock document types since Clerky API is not yet public.
 */
exports.sync = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company context required.' });
    }

    const connection = await getConnection(companyId);

    if (!connection) {
      return res.status(404).json({ message: 'No Clerky connection found. Connect your Clerky account first.' });
    }

    const now = new Date().toISOString();
    const userId = req.user?.userId || req.user?.id;
    const documents = [];

    // Mock fetch from Clerky API — create Document records for each type
    for (const docType of CLERKY_DOCUMENT_TYPES) {
      const documentId = crypto.randomUUID();
      const docRecord = {
        documentId,
        name: docType.name,
        originalFilename: `${docType.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.pdf`,
        mimeType: docType.mimeType,
        size: 0,
        storageLocation: 'clerky',
        storagePath: `clerky/${connection.clerkyOrgId}/${documentId}`,
        category: docType.category,
        tags: ['clerky', 'legal', 'synced'],
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'active',
        version: 1,
        versionHistory: [],
        accessControl: { viewAccess: [], editAccess: [], deleteAccess: [], adminAccess: [] },
        relationships: [],
        metadata: {
          source: 'clerky',
          clerkyOrgId: connection.clerkyOrgId,
          syncedAt: now,
        },
        createdAt: now,
        updatedAt: now,
      };

      await zerodbService.insertRow(DOCUMENTS_TABLE, docRecord);

      documents.push({
        documentId,
        name: docType.name,
        category: docType.category,
        mimeType: docType.mimeType,
        status: 'active',
      });
    }

    // Update lastSyncedAt on the connection
    await zerodbService.updateRows(CLERKY_TABLE, {
      filter: { companyId, status: 'active' },
      update: { lastSyncedAt: now, updatedAt: now },
    });

    return res.status(200).json({
      synced: documents.length,
      documents,
    });
  } catch (err) {
    console.error('clerky sync error:', err.message);
    return res.status(500).json({ message: 'Failed to sync Clerky documents.' });
  }
};

/**
 * DELETE /api/v1/integrations/clerky/disconnect
 * Removes the Clerky connection for the authenticated user's company.
 */
exports.disconnect = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company context required.' });
    }

    const connection = await getConnection(companyId);

    if (!connection) {
      return res.status(404).json({ message: 'No Clerky connection found.' });
    }

    await zerodbService.deleteRows(CLERKY_TABLE, {
      filter: { companyId, status: 'active' },
    });

    return res.status(200).json({ disconnected: true });
  } catch (err) {
    console.error('clerky disconnect error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
