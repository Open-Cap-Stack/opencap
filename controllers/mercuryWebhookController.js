'use strict';

/**
 * Mercury Webhook Controller
 * Issue #678: Handle incoming Mercury webhook events
 *
 * Events handled:
 * - transaction.created  — new transaction; check for SAFE funding matches on credits
 * - transaction.updated  — transaction status change
 * - payment.completed    — outgoing payment succeeded
 * - payment.failed       — outgoing payment failed
 */

const crypto = require('crypto');
const zerodbService = require('../services/zerodbService');

const MERCURY_EVENTS_TABLE = 'mercury_events';

/**
 * Ensure the mercury_events table exists in ZeroDB.
 */
async function ensureMercuryEventsTable() {
  try {
    await zerodbService.createTable(MERCURY_EVENTS_TABLE, {
      fields: {
        eventId: { type: 'string' },
        eventType: { type: 'string' },
        payload: { type: 'string' },
        direction: { type: 'string' },
        amount: { type: 'number' },
        transactionId: { type: 'string' },
        matchedSafeId: { type: 'string' },
        processedAt: { type: 'string' },
      },
    });
  } catch (err) {
    const detail = err.response?.data?.detail || '';
    const alreadyExists =
      err.response?.status === 409 ||
      err.message?.includes('already exist') ||
      detail.includes('UniqueViolation') ||
      detail.includes('already exists');

    if (!alreadyExists) {
      console.warn(`Could not pre-create table "${MERCURY_EVENTS_TABLE}": ${err.message}`);
    }
  }
}

/**
 * POST /api/v1/webhooks/mercury
 * Handle incoming Mercury webhook events.
 * No auth required — Mercury sends webhooks directly.
 */
async function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.MERCURY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-mercury-signature'];
      if (!signature) {
        return res.status(401).json({ success: false, error: 'Missing X-Mercury-Signature header' });
      }
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }
    }

    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({ success: false, error: 'Invalid webhook payload: missing type' });
    }

    const eventType = event.type;
    const data = event.data || {};

    console.log(`[Mercury Webhook] Received event: ${eventType}`, {
      id: event.id || 'unknown',
      transactionId: data.id || data.transactionId || null,
    });

    // Store event in ZeroDB for audit trail
    const eventRecord = {
      eventId: event.id || `evt_${Date.now()}`,
      eventType,
      payload: JSON.stringify(event),
      direction: data.direction || null,
      amount: data.amount ? Math.abs(data.amount) : null,
      transactionId: data.id || data.transactionId || null,
      matchedSafeId: null,
      processedAt: new Date().toISOString(),
    };

    // Handle specific event types
    switch (eventType) {
      case 'transaction.created': {
        // Check if incoming credit might match a pending SAFE funding
        if (data.direction === 'credit' || (data.amount && data.amount > 0)) {
          const amount = Math.abs(data.amount);
          console.log(`[Mercury Webhook] Incoming credit: $${amount} — checking SAFE matches`);

          try {
            // Search for SAFEs with matching investment amounts in pending/signed status
            const safeResults = await zerodbService.queryRows('safes', {}, { limit: 100 });
            const safes = (safeResults?.data || []).map(r => r.row_data || r);
            const matchingSafe = safes.find(s => {
              const safeAmount = s.investmentAmount || s.amount || 0;
              return (
                Math.abs(safeAmount - amount) <= 1 &&
                ['fully_signed', 'pending', 'awaiting_funding'].includes(s.status)
              );
            });

            if (matchingSafe) {
              eventRecord.matchedSafeId = matchingSafe.safeId || matchingSafe._id;
              console.log(`[Mercury Webhook] Matched SAFE: ${eventRecord.matchedSafeId}`);
            }
          } catch (safeErr) {
            console.error('[Mercury Webhook] SAFE lookup failed:', safeErr.message);
          }
        }
        break;
      }

      case 'transaction.updated': {
        console.log(`[Mercury Webhook] Transaction updated: ${data.id} status=${data.status}`);
        break;
      }

      case 'payment.completed': {
        console.log(`[Mercury Webhook] Payment completed: ${data.id} amount=$${data.amount}`);
        break;
      }

      case 'payment.failed': {
        console.error(`[Mercury Webhook] Payment FAILED: ${data.id} reason=${data.failureReason || 'unknown'}`);
        break;
      }

      default: {
        console.log(`[Mercury Webhook] Unhandled event type: ${eventType}`);
      }
    }

    // Persist the event record
    try {
      await zerodbService.insertRow(MERCURY_EVENTS_TABLE, eventRecord);
    } catch (dbErr) {
      console.error('[Mercury Webhook] Failed to store event:', dbErr.message);
    }

    return res.status(200).json({ success: true, received: eventType });
  } catch (err) {
    console.error('[Mercury Webhook] Error processing webhook:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = {
  handleWebhook,
  ensureMercuryEventsTable,
};
