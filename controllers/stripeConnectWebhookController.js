/**
 * Stripe Connect Webhook Controller
 * Issue #567: Handle Stripe Connect events for accountant payouts
 *
 * Events handled:
 * - account.updated: Set weekly payout schedule when payouts_enabled becomes true
 * - transfer.created: Log transfer creation
 * - payout.paid: Log successful payout disbursement
 * - payout.failed: Alert on failed payout
 */

const stripeService = require('../services/stripeService');
const User = require('../models/User');

/**
 * Handle account.updated event
 * When an accountant completes Stripe Connect onboarding and payouts_enabled becomes true,
 * configure their payout schedule to weekly (Monday).
 */
async function handleAccountUpdated(event) {
  const account = event.data.object;
  const accountId = account.id;

  if (!account.payouts_enabled) {
    // Payouts not yet enabled, nothing to do
    return;
  }

  // Set weekly payout schedule
  const stripe = stripeService.getStripe();
  await stripe.accounts.update(accountId, {
    settings: {
      payouts: {
        schedule: {
          interval: 'weekly',
          weekly_anchor: 'monday'
        }
      }
    }
  });

  // Look up user and log
  const users = await User.find({ stripeConnectAccountId: accountId });
  const user = users && users.length > 0 ? users[0] : null;
  console.log(
    `[stripe-connect] account.updated: payouts enabled for ${accountId}` +
    (user ? ` (user: ${user.userId})` : '') +
    ' - set weekly payout schedule (Monday)'
  );
}

/**
 * Handle transfer.created event
 * Log the transfer; in future could persist to TransferLog model.
 */
async function handleTransferCreated(event) {
  const transfer = event.data.object;
  console.log(
    `[stripe-connect] transfer.created: ${transfer.id} amount=${transfer.amount} destination=${transfer.destination}`
  );
}

/**
 * Handle payout.paid event
 * Log successful payout; in future will mark transfer as disbursed.
 */
async function handlePayoutPaid(event) {
  const payout = event.data.object;
  console.log(
    `[stripe-connect] payout.paid: ${payout.id} amount=${payout.amount} destination=${payout.destination}`
  );
}

/**
 * Handle payout.failed event
 * Log and alert on failed payout.
 */
async function handlePayoutFailed(event) {
  const payout = event.data.object;
  const failureMessage = payout.failure_message || 'Unknown failure';

  console.error(
    `[stripe-connect] payout.failed: ${payout.id} amount=${payout.amount} ` +
    `destination=${payout.destination} reason="${failureMessage}"`
  );

  // Attempt to send email alert via emailService if available
  try {
    const emailService = require('../services/valuation409AEmailService');
    if (emailService && typeof emailService.sendAlert === 'function') {
      await emailService.sendAlert({
        subject: `Stripe Connect Payout Failed: ${payout.id}`,
        message: `Payout ${payout.id} for amount ${payout.amount} failed. Reason: ${failureMessage}`
      });
    }
  } catch (emailErr) {
    // emailService not available or send failed; already logged above
    console.warn('[stripe-connect] Could not send payout failure alert email:', emailErr.message);
  }
}

/**
 * Main webhook handler
 * POST /api/v1/webhooks/stripe-connect
 * Unauthenticated - uses Stripe signature verification
 */
async function handleStripeConnectWebhook(req, res) {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-connect] STRIPE_CONNECT_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripeService.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-connect] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Return 200 immediately for Stripe, then process async
  res.status(200).json({ received: true });

  // Process event in background (errors logged, not thrown to caller)
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event);
        break;
      case 'transfer.created':
        await handleTransferCreated(event);
        break;
      case 'payout.paid':
        await handlePayoutPaid(event);
        break;
      case 'payout.failed':
        await handlePayoutFailed(event);
        break;
      default:
        console.log(`[stripe-connect] Unhandled event type: ${event.type}`);
    }
  } catch (processingErr) {
    console.error(`[stripe-connect] Error processing ${event.type}:`, processingErr);
  }
}

module.exports = {
  handleStripeConnectWebhook,
  // Exported for testing
  handleAccountUpdated,
  handleTransferCreated,
  handlePayoutPaid,
  handlePayoutFailed
};
