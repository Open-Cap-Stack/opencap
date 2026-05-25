/**
 * Clerk Webhook Controller
 * Issue #613: Clerk integration — identity sync, data room ingestion, cap table extraction
 *
 * Receives Clerk webhook events and syncs user/org data into ZeroDB.
 * Signature verification: Svix signs with HMAC-SHA256 over `{timestamp}.{body}`.
 *
 * Required env var: CLERK_WEBHOOK_SECRET (from Clerk Dashboard → Webhooks → signing secret)
 */

const crypto = require('crypto');
const zerodbService = require('../services/zerodbService');

const USERS_TABLE = 'users';

/**
 * Verify Svix webhook signature.
 * Svix signature header format:
 *   svix-id: <msg-id>
 *   svix-timestamp: <unix-seconds>
 *   svix-signature: v1,<base64-hmac> [,v1,<another>]
 *
 * Signed content: "{svix-id}.{svix-timestamp}.{raw-body}"
 */
function verifyClerkSignature(req) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // If secret not configured, skip verification in development only
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CLERK_WEBHOOK_SECRET not configured');
    }
    console.warn('⚠️  CLERK_WEBHOOK_SECRET not set — skipping signature verification (dev only)');
    return true;
  }

  const msgId = req.headers['svix-id'];
  const msgTimestamp = req.headers['svix-timestamp'];
  const msgSignature = req.headers['svix-signature'];

  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new Error('Missing required Svix headers');
  }

  // Reject timestamps older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(msgTimestamp, 10);
  if (Math.abs(now - ts) > 300) {
    throw new Error('Webhook timestamp too old — possible replay attack');
  }

  // Svix secret format: "whsec_<base64>" — strip the prefix and decode
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');

  // Raw body must be a Buffer (express.raw middleware applied in route)
  const body = req.rawBody || req.body;
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const toSign = `${msgId}.${msgTimestamp}.${bodyStr}`;

  const computed = crypto
    .createHmac('sha256', secretBytes)
    .update(toSign)
    .digest('base64');

  // svix-signature may have multiple sigs: "v1,abc123 v1,def456"
  const sigs = msgSignature.split(' ');
  const valid = sigs.some((sig) => {
    const parts = sig.split(',');
    if (parts.length < 2 || parts[0] !== 'v1') return false;
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(parts[1])
    );
  });

  if (!valid) {
    throw new Error('Webhook signature verification failed');
  }

  return true;
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
 * Map a Clerk user object to an OCS user record shape.
 */
function clerkUserToRecord(clerkUser) {
  const primaryEmail = clerkUser.email_addresses?.find(
    (e) => e.id === clerkUser.primary_email_address_id
  )?.email_address || clerkUser.email_addresses?.[0]?.email_address || null;

  const primaryPhone = clerkUser.phone_numbers?.find(
    (p) => p.id === clerkUser.primary_phone_number_id
  )?.phone_number || null;

  return {
    clerkId: clerkUser.id,
    email: primaryEmail,
    firstName: clerkUser.first_name || null,
    lastName: clerkUser.last_name || null,
    imageUrl: clerkUser.image_url || clerkUser.profile_image_url || null,
    phone: primaryPhone,
    clerkMetadata: JSON.stringify(clerkUser.public_metadata || {}),
    clerkCreatedAt: clerkUser.created_at
      ? new Date(clerkUser.created_at).toISOString()
      : null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * POST /api/v1/webhooks/clerk
 * Receives Clerk webhook events. Raw body required for signature verification.
 */
exports.handleClerkWebhook = async (req, res) => {
  try {
    verifyClerkSignature(req);
  } catch (err) {
    console.error('Clerk webhook signature error:', err.message);
    return res.status(401).json({ message: err.message });
  }

  let event;
  try {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  const { type, data } = event;
  console.log(`Clerk webhook received: ${type}`);

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      default:
        // Acknowledge unknown events without error
        console.log(`Clerk webhook: unhandled event type "${type}" — acknowledged`);
    }

    return res.status(200).json({ received: true, type });
  } catch (err) {
    console.error(`Clerk webhook handler error (${type}):`, err.message);
    // Return 200 so Clerk doesn't retry — log for manual investigation
    return res.status(200).json({ received: true, type, warning: 'Handler error — logged' });
  }
};

async function handleUserCreated(clerkUser) {
  const record = clerkUserToRecord(clerkUser);

  // Check if user already exists by clerkId (idempotent)
  const existing = unwrap(
    await zerodbService.queryTable(USERS_TABLE, { filter: { clerkId: record.clerkId } })
  );

  if (existing.length > 0) {
    console.log(`Clerk user.created: user ${record.clerkId} already exists — skipping`);
    return;
  }

  const now = new Date().toISOString();
  const userId = `user_${require('crypto').randomUUID()}`;

  await zerodbService.insertRow(USERS_TABLE, {
    userId,
    ...record,
    role: 'employee',
    companyId: null,
    createdAt: now,
    updatedAt: now,
    clerkSynced: true,
  });

  console.log(`Clerk user.created: synced ${record.email} → userId ${userId}`);
}

async function handleUserUpdated(clerkUser) {
  const updates = clerkUserToRecord(clerkUser);

  const existing = unwrap(
    await zerodbService.queryTable(USERS_TABLE, { filter: { clerkId: clerkUser.id } })
  );

  if (existing.length === 0) {
    // User doesn't exist yet — create them
    console.log(`Clerk user.updated: user ${clerkUser.id} not found — creating`);
    return handleUserCreated(clerkUser);
  }

  await zerodbService.updateRows(USERS_TABLE, {
    filter: { clerkId: clerkUser.id },
    update: { ...updates, clerkSynced: true },
  });

  console.log(`Clerk user.updated: synced ${updates.email}`);
}

async function handleUserDeleted(clerkUser) {
  // Soft-delete: mark as deleted but retain data for audit/compliance
  await zerodbService.updateRows(USERS_TABLE, {
    filter: { clerkId: clerkUser.id },
    update: {
      clerkDeleted: true,
      clerkDeletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  console.log(`Clerk user.deleted: soft-deleted user ${clerkUser.id}`);
}
