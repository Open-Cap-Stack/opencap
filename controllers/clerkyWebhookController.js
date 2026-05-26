'use strict';

/**
 * Clerky Webhook Controller
 * Issue #664: Real-time webhook receiver for Clerky document signing events
 *
 * Receives Clerky webhook events, verifies HMAC-SHA256 signatures,
 * and routes events to appropriate handlers for document processing.
 *
 * Signature verification: X-Clerky-Signature header, SHA-256 HMAC of raw body
 * using CLERKY_WEBHOOK_SECRET env var.
 */

const crypto = require('crypto');
const zerodbService = require('../services/zerodbService');
const emailService = require('../services/emailService');

// In-memory idempotency set to prevent duplicate event processing
const processedEvents = new Set();

// Max size for idempotency set to prevent memory leaks
const MAX_PROCESSED_EVENTS = 10000;

/**
 * Unwrap ZeroDB query results into a flat array of records.
 */
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
 * Verify HMAC-SHA256 signature from X-Clerky-Signature header.
 * Returns true if valid, throws on failure.
 */
function verifyClerkySignature(req) {
  const secret = process.env.CLERKY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('CLERKY_WEBHOOK_SECRET not configured');
  }

  const signature = req.headers['x-clerky-signature'];
  if (!signature) {
    throw new Error('Missing X-Clerky-Signature header');
  }

  const body = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body));
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );

  if (!isValid) {
    throw new Error('Invalid webhook signature');
  }

  return true;
}

/**
 * Find or create a Clerky data room for a company.
 */
async function findOrCreateDataRoom(companyId) {
  const existing = unwrap(
    await zerodbService.queryTable('data_rooms', {
      filter: { companyId, name: 'Clerky Documents' },
    })
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const dataRoomId = `dr_clerky_${companyId}_${Date.now()}`;
  const now = new Date().toISOString();
  await zerodbService.insertRow('data_rooms', {
    dataRoomId,
    companyId,
    name: 'Clerky Documents',
    description: 'Auto-created data room for documents synced from Clerky',
    createdAt: now,
    updatedAt: now,
  });

  return { dataRoomId, companyId, name: 'Clerky Documents' };
}

/**
 * Find company admin email for notifications.
 */
async function findCompanyAdminEmail(companyId) {
  const users = unwrap(
    await zerodbService.queryTable('users', {
      filter: { companyId },
    })
  );

  // Prefer admin, then founder
  const admin = users.find((u) => u.role === 'admin') || users.find((u) => u.role === 'founder');
  return admin ? admin.email : null;
}

/**
 * Handle document.signed event.
 * Finds or creates a data room, queues extraction, sends notification.
 */
async function handleDocumentSigned(payload) {
  const { companyId, documentType, documentName, documentText, signedAt } = payload;

  const dataRoom = await findOrCreateDataRoom(companyId);

  // Attempt to call clerkyDocumentParser if available (issue #663)
  let recordsQueued = 0;
  try {
    const parser = require('../services/clerkyDocumentParser');
    if (parser && typeof parser.parseAndQueueForReview === 'function') {
      const result = await parser.parseAndQueueForReview({
        dataRoomId: dataRoom.dataRoomId,
        companyId,
        documentType,
        documentName,
        documentText,
        signedAt,
      });
      recordsQueued = result?.recordsQueued || 0;
    }
  } catch (err) {
    // Parser not yet implemented (issue #663) — log and continue
    console.log('clerkyDocumentParser not available — skipping extraction:', err.message);
  }

  // Send email notification (fire-and-forget)
  try {
    const adminEmail = await findCompanyAdminEmail(companyId);
    if (adminEmail) {
      await emailService.sendClerkyDocumentNotification({
        to: adminEmail,
        companyId,
        documentName,
        recordsQueued,
      });
    }
  } catch (err) {
    console.error('Failed to send Clerky notification email:', err.message);
    // Do not let email failure block the webhook response
  }

  return { recordsQueued };
}

/**
 * Handle document.voided event.
 * Marks matching PendingExtraction records as rejected.
 */
async function handleDocumentVoided(payload) {
  const { companyId, documentName } = payload;

  await zerodbService.updateRows('pending_extractions', {
    filter: { sourceDocument: documentName, companyId, status: 'pending' },
    update: {
      status: 'rejected',
      rejectionReason: 'Document voided in Clerky',
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * POST /api/v1/webhooks/clerky
 * Main webhook handler. Verifies signature, checks idempotency, routes events.
 */
exports.handleWebhook = async (req, res) => {
  // 1. Verify HMAC signature
  try {
    verifyClerkySignature(req);
  } catch (err) {
    console.error('Clerky webhook signature error:', err.message);
    return res.status(401).json({ message: err.message });
  }

  // Parse body
  let payload;
  try {
    const body = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body);
    payload = typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  const { eventId, eventType } = payload;

  // 2. Idempotency check
  if (processedEvents.has(eventId)) {
    return res.status(200).json({ received: true, duplicate: true, eventId });
  }

  // Evict oldest entries if set grows too large
  if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
    const first = processedEvents.values().next().value;
    processedEvents.delete(first);
  }
  processedEvents.add(eventId);

  console.log(`Clerky webhook received: ${eventType} (${eventId})`);

  // 3. Route by event type
  try {
    switch (eventType) {
      case 'document.signed':
        await handleDocumentSigned(payload);
        break;

      case 'document.voided':
        await handleDocumentVoided(payload);
        break;

      case 'safe.executed':
        // Same flow as document.signed but with yc_safe type pre-set
        await handleDocumentSigned({ ...payload, documentType: 'yc_safe' });
        break;

      case 'grant.issued':
        // Same flow as document.signed but with option_grant type pre-set
        await handleDocumentSigned({ ...payload, documentType: 'option_grant' });
        break;

      default:
        console.log(`Clerky webhook: unhandled event type "${eventType}" — acknowledged`);
    }

    return res.status(200).json({ received: true, eventType, eventId });
  } catch (err) {
    console.error(`Clerky webhook handler error (${eventType}):`, err.message);
    // Return 200 so Clerky doesn't retry — log for manual investigation
    return res.status(200).json({ received: true, eventType, warning: 'Handler error — logged' });
  }
};
