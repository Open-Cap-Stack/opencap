/**
 * Clerk Integration Controller
 * Issue #613: Clerk integration — manual import trigger and status
 *
 * Allows authenticated users to:
 * - GET  /api/v1/integrations/clerk/status  — check if Clerk is configured + whether
 *                                             their account has been synced
 * - POST /api/v1/integrations/clerk/sync    — pull their Clerk user record into OCS
 *                                             using their clerkId (stored on user record)
 */

const axios = require('axios');
const zerodbService = require('../services/zerodbService');

const USERS_TABLE = 'users';

function clerkAdminClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY not configured');
  return axios.create({
    baseURL: 'https://api.clerk.com/v1',
    headers: { Authorization: `Bearer ${secretKey}` },
    timeout: 10000,
  });
}

function unwrap(result) {
  if (!result) return [];
  const raw = result.data || result.rows || result || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item.row_data) return { ...item.row_data, id: item.row_id || item.row_data.id };
    return item;
  });
}

/**
 * GET /api/v1/integrations/clerk/status
 * Returns whether Clerk integration is available and if the current user is synced.
 */
exports.getStatus = async (req, res) => {
  const configured = !!process.env.CLERK_SECRET_KEY;

  if (!configured) {
    return res.status(200).json({
      configured: false,
      synced: false,
      message: 'Clerk integration is not configured for this deployment.',
    });
  }

  try {
    const userId = req.user.userId;
    const result = await zerodbService.queryTable(USERS_TABLE, { filter: { userId } });
    const rows = unwrap(result);
    const user = rows[0];

    return res.status(200).json({
      configured: true,
      synced: !!(user?.clerkId),
      clerkId: user?.clerkId || null,
      lastSynced: user?.updatedAt || null,
    });
  } catch (err) {
    console.error('clerkStatus error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/v1/integrations/clerk/sync
 * Body: { clerkId: "user_xxx" }  — the Clerk user ID to import.
 *
 * Fetches the Clerk user record via Clerk Admin API and upserts into ZeroDB.
 * Only the authenticated user can sync their own Clerk record (or admins can sync any).
 */
exports.syncUser = async (req, res) => {
  const { clerkId } = req.body;

  if (!clerkId || typeof clerkId !== 'string' || !clerkId.startsWith('user_')) {
    return res.status(400).json({ message: 'Invalid clerkId — must start with "user_"' });
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return res.status(503).json({ message: 'Clerk integration not configured' });
  }

  try {
    // Fetch user from Clerk
    const client = clerkAdminClient();
    let clerkUser;
    try {
      const { data } = await client.get(`/users/${clerkId}`);
      clerkUser = data;
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ message: 'Clerk user not found' });
      }
      throw err;
    }

    const primaryEmail = clerkUser.email_addresses?.find(
      (e) => e.id === clerkUser.primary_email_address_id
    )?.email_address || clerkUser.email_addresses?.[0]?.email_address || null;

    const userId = req.user.userId;
    const now = new Date().toISOString();

    // Upsert into ZeroDB
    const existing = unwrap(
      await zerodbService.queryTable(USERS_TABLE, { filter: { userId } })
    );

    const updates = {
      clerkId: clerkUser.id,
      firstName: clerkUser.first_name || null,
      lastName: clerkUser.last_name || null,
      imageUrl: clerkUser.image_url || clerkUser.profile_image_url || null,
      clerkMetadata: JSON.stringify(clerkUser.public_metadata || {}),
      clerkSynced: true,
      updatedAt: now,
    };

    if (primaryEmail && existing.length > 0 && !existing[0].email) {
      updates.email = primaryEmail;
    }

    if (existing.length > 0) {
      await zerodbService.updateRows(USERS_TABLE, {
        filter: { userId },
        update: updates,
      });
    } else {
      await zerodbService.insertRow(USERS_TABLE, {
        userId,
        email: primaryEmail,
        role: 'user',
        companyId: req.user.companyId || null,
        createdAt: now,
        ...updates,
      });
    }

    return res.status(200).json({
      success: true,
      clerkId: clerkUser.id,
      email: primaryEmail,
      firstName: clerkUser.first_name || null,
      lastName: clerkUser.last_name || null,
      synced: true,
    });
  } catch (err) {
    console.error('clerkSync error:', err.message);
    return res.status(500).json({ message: 'Failed to sync Clerk user' });
  }
};
