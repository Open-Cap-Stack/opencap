/**
 * Clerk Integration Controller
 * Issues #618, #619, #620: Customer Clerk API key connect, bulk import with rate-limit safeguards
 *
 * Each OCS company connects their own Clerk instance via their sk_live_xxx / sk_test_xxx secret key.
 * Keys are encrypted at rest using AES-256-GCM (ENCRYPTION_KEY env var).
 * The plaintext key is never logged or returned after storage.
 */

const crypto = require('crypto');
const axios = require('axios');
const zerodbService = require('../services/zerodbService');

const INTEGRATIONS_TABLE = 'integrations';
const USERS_TABLE = 'users';

// ── Encryption helpers ────────────────────────────────────────────────────────

function getEncryptionKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  return Buffer.from(hex, 'hex');
}

function encryptKey(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

function decryptKey(encryptedHex, ivHex, authTagHex) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ── ZeroDB helpers ────────────────────────────────────────────────────────────

function unwrap(result) {
  if (!result) return [];
  const raw = result.data || result.rows || result || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    item.row_data ? { ...item.row_data, _rowId: item.row_id } : item
  );
}

// Scope integrations by companyId when available, fall back to userId.
// This lets users connect Clerk before they've created a company.
async function getIntegration(scopeId, scopeField) {
  const result = await zerodbService.queryTable(INTEGRATIONS_TABLE, {
    filter: { [scopeField]: scopeId, provider: 'clerk' },
  });
  const rows = unwrap(result);
  return rows[0] || null;
}

function getScope(user) {
  if (user?.companyId) return { id: user.companyId, field: 'companyId' };
  return { id: user?.userId, field: 'userId' };
}

// ── Clerk API client factory ──────────────────────────────────────────────────

function clerkClient(secretKey) {
  return axios.create({
    baseURL: 'https://api.clerk.com/v1',
    headers: { Authorization: `Bearer ${secretKey}` },
    timeout: 15000,
  });
}

// ── Rate-limited paginator ────────────────────────────────────────────────────

const PAGE_SIZE = 100;           // 1 API call per 100 users
const PAGE_DELAY_MS = 200;       // 5 req/sec — 20x headroom on dev (100/10s), 200x on prod
const MAX_PAGES = 50;            // Hard cap: 5,000 users per import call
const MAX_RETRIES = 1;           // Retry once on 429, then abort

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all users from a Clerk instance with rate-limit safeguards.
 * Yields pages of users. On 429, waits Retry-After then retries once.
 * On second 429, throws { code: 'RATE_LIMITED', retryAfter, offset }.
 */
async function* fetchClerkUserPages(secretKey, startOffset = 0) {
  const client = clerkClient(secretKey);
  let offset = startOffset;
  let pageNum = 0;

  while (pageNum < MAX_PAGES) {
    let response;
    let retried = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await client.get('/users', {
          params: { limit: PAGE_SIZE, offset },
        });
        break;
      } catch (err) {
        if (err.response?.status === 429) {
          const retryAfter = parseInt(err.response.headers['retry-after'] || '5', 10);
          if (attempt < MAX_RETRIES) {
            console.warn(`Clerk API rate limited — waiting ${retryAfter}s before retry (offset=${offset})`);
            await sleep(retryAfter * 1000);
            retried = true;
          } else {
            const rateLimitErr = new Error('Clerk rate limit hit after retry');
            rateLimitErr.code = 'RATE_LIMITED';
            rateLimitErr.retryAfter = retryAfter;
            rateLimitErr.offset = offset;
            throw rateLimitErr;
          }
        } else {
          throw err;
        }
      }
    }

    const users = response.data;
    if (!Array.isArray(users) || users.length === 0) break;

    yield { users, offset, page: pageNum };

    offset += users.length;
    pageNum++;

    if (users.length < PAGE_SIZE) break; // Last page

    // Throttle between pages (skip delay after last page)
    await sleep(PAGE_DELAY_MS);
  }
}

// ── Upsert a single Clerk user into ZeroDB ────────────────────────────────────

async function upsertClerkUser(clerkUser, companyId) {
  const primaryEmail = clerkUser.email_addresses?.find(
    (e) => e.id === clerkUser.primary_email_address_id
  )?.email_address || clerkUser.email_addresses?.[0]?.email_address || null;

  const now = new Date().toISOString();
  const updates = {
    clerkId: clerkUser.id,
    firstName: clerkUser.first_name || null,
    lastName: clerkUser.last_name || null,
    imageUrl: clerkUser.image_url || clerkUser.profile_image_url || null,
    clerkMetadata: JSON.stringify(clerkUser.public_metadata || {}),
    clerkSynced: true,
    clerkSyncedAt: now,
    updatedAt: now,
  };

  // Try match on clerkId first, then email
  let existing = unwrap(
    await zerodbService.queryTable(USERS_TABLE, { filter: { clerkId: clerkUser.id } })
  );

  if (existing.length === 0 && primaryEmail) {
    existing = unwrap(
      await zerodbService.queryTable(USERS_TABLE, { filter: { email: primaryEmail } })
    );
  }

  if (existing.length > 0) {
    // Update — never overwrite companyId or role if already set
    const safe = { ...updates };
    if (existing[0].companyId) delete safe.companyId;
    if (existing[0].role && existing[0].role !== 'user') delete safe.role;

    await zerodbService.updateRows(USERS_TABLE, {
      filter: { userId: existing[0].userId || existing[0].id },
      update: safe,
    });
    return 'updated';
  } else {
    const userId = `user_${crypto.randomUUID()}`;
    await zerodbService.insertRow(USERS_TABLE, {
      userId,
      email: primaryEmail,
      role: 'user',
      companyId: companyId || null,
      createdAt: now,
      ...updates,
    });
    return 'created';
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/integrations/clerk/connect
 * Customer pastes their Clerk secret key. We validate, encrypt, and store it.
 */
exports.connect = async (req, res) => {
  const { clerkSecretKey } = req.body;
  const scope = getScope(req.user);

  if (!scope.id) {
    return res.status(401).json({ message: 'Could not identify your account. Please log in again.' });
  }

  if (!clerkSecretKey || typeof clerkSecretKey !== 'string') {
    return res.status(400).json({ message: 'clerkSecretKey is required' });
  }

  if (!clerkSecretKey.startsWith('sk_live_') && !clerkSecretKey.startsWith('sk_test_')) {
    return res.status(400).json({ message: 'Invalid Clerk secret key format. Must start with sk_live_ or sk_test_' });
  }

  // Validate key against Clerk API
  try {
    const client = clerkClient(clerkSecretKey);
    const { data: users } = await client.get('/users', { params: { limit: 1 } });
    let totalUsers = Array.isArray(users) ? users.length : 0;
    try {
      const { data: countData } = await client.get('/users/count');
      totalUsers = countData?.total_count ?? totalUsers;
    } catch { /* count endpoint optional */ }

    // Encrypt and store
    const { encryptedKey, iv, authTag } = encryptKey(clerkSecretKey);
    const keyHint = clerkSecretKey.slice(-4);
    const now = new Date().toISOString();

    const existing = await getIntegration(scope.id, scope.field);

    const record = {
      [scope.field]: scope.id,
      provider: 'clerk',
      encryptedKey,
      iv,
      authTag,
      keyHint,
      userCount: totalUsers,
      validatedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await zerodbService.updateRows(INTEGRATIONS_TABLE, {
        filter: { [scope.field]: scope.id, provider: 'clerk' },
        update: record,
      });
    } else {
      await zerodbService.insertRow(INTEGRATIONS_TABLE, {
        integrationId: `integration_${crypto.randomUUID()}`,
        createdAt: now,
        ...record,
      });
    }

    return res.status(200).json({
      connected: true,
      keyHint,
      userCount: totalUsers,
      message: `Connected — ${totalUsers} user${totalUsers !== 1 ? 's' : ''} found in your Clerk instance.`,
    });
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      return res.status(400).json({ message: 'Invalid Clerk secret key — authentication failed. Check the key in your Clerk dashboard.' });
    }
    console.error('clerk connect error:', err.message);
    return res.status(500).json({ message: 'Failed to validate Clerk key. Try again.' });
  }
};

/**
 * DELETE /api/v1/integrations/clerk/disconnect
 * Removes stored Clerk integration for the company.
 */
exports.disconnect = async (req, res) => {
  const scope = getScope(req.user);
  if (!scope.id) return res.status(401).json({ message: 'Could not identify your account.' });

  try {
    await zerodbService.deleteRows(INTEGRATIONS_TABLE, {
      filter: { [scope.field]: scope.id, provider: 'clerk' },
    });
    return res.status(200).json({ disconnected: true });
  } catch (err) {
    console.error('clerk disconnect error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/v1/integrations/clerk/status
 * Returns connection state for the company.
 */
exports.getStatus = async (req, res) => {
  const configured = !!process.env.CLERK_SECRET_KEY;
  const scope = getScope(req.user);

  try {
    if (!scope.id) {
      return res.status(200).json({ configured, connected: false });
    }

    const integration = await getIntegration(scope.id, scope.field);

    return res.status(200).json({
      configured,
      connected: !!integration,
      keyHint: integration?.keyHint || null,
      userCount: integration?.userCount || 0,
      validatedAt: integration?.validatedAt || null,
      lastImportAt: integration?.lastImportAt || null,
      lastImportCount: integration?.lastImportCount || null,
    });
  } catch (err) {
    console.error('clerk status error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/v1/integrations/clerk/import
 * Bulk-imports all users from the company's connected Clerk instance.
 * Rate-limited: 200ms between pages, retry-once on 429, abort on second 429.
 */
exports.importUsers = async (req, res) => {
  const scope = getScope(req.user);
  if (!scope.id) return res.status(401).json({ message: 'Could not identify your account.' });

  const integration = await getIntegration(scope.id, scope.field);
  if (!integration) {
    return res.status(400).json({ message: 'No Clerk integration connected. Connect your Clerk key first.' });
  }
  const companyId = req.user?.companyId || null;

  let secretKey;
  try {
    secretKey = decryptKey(integration.encryptedKey, integration.iv, integration.authTag);
  } catch (err) {
    console.error('clerk import decrypt error:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve Clerk credentials. Please reconnect.' });
  }

  const resumeOffset = parseInt(req.body?.resumeOffset || '0', 10);
  const counts = { created: 0, updated: 0, errors: 0 };
  let lastOffset = resumeOffset;
  let rateLimitedAt = null;

  try {
    for await (const { users, offset } of fetchClerkUserPages(secretKey, resumeOffset)) {
      lastOffset = offset;

      for (const clerkUser of users) {
        try {
          const result = await upsertClerkUser(clerkUser, companyId);
          counts[result]++;
        } catch (err) {
          console.error(`Failed to upsert Clerk user ${clerkUser.id}:`, err.message);
          counts.errors++;
        }
      }
    }
  } catch (err) {
    if (err.code === 'RATE_LIMITED') {
      rateLimitedAt = err.offset;
      console.warn(`Clerk import rate limited at offset ${err.offset} — partial results returned`);
    } else {
      console.error('clerk import error:', err.message);
      return res.status(500).json({ message: 'Import failed. Try again.' });
    }
  }

  const total = counts.created + counts.updated + counts.errors;
  const now = new Date().toISOString();

  // Update integration record with last import stats
  await zerodbService.updateRows(INTEGRATIONS_TABLE, {
    filter: { companyId, provider: 'clerk' },
    update: { lastImportAt: now, lastImportCount: total, updatedAt: now },
  }).catch(() => {});

  return res.status(200).json({
    success: !rateLimitedAt,
    created: counts.created,
    updated: counts.updated,
    errors: counts.errors,
    total,
    rateLimited: !!rateLimitedAt,
    resumeOffset: rateLimitedAt ?? null,
    message: rateLimitedAt
      ? `Imported ${total} users before hitting Clerk rate limit. Resume import to continue from offset ${rateLimitedAt}.`
      : `Import complete — ${counts.created} created, ${counts.updated} updated${counts.errors ? `, ${counts.errors} errors` : ''}.`,
  });
};
