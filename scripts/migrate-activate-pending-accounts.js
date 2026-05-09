/**
 * Migration: Activate pending user accounts
 * Issue #514
 *
 * Finds all users with status='pending' (created before email verification
 * was properly gated behind SMTP config) and sets them to status='active'.
 *
 * Usage:
 *   node scripts/migrate-activate-pending-accounts.js           # live run
 *   node scripts/migrate-activate-pending-accounts.js --dry-run # preview only
 */

require('dotenv').config();

const { createModel } = require('../models/base/ZeroDBModel');
const zerodbService = require('../services/zerodbService');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  console.log(`\nPending account migration — ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE RUN'}\n`);

  await zerodbService.initialize(process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY);

  const User = createModel('users', {});

  // Fetch all pending users
  const pending = await User.find({ status: 'pending' }, { limit: 1000 });

  // Filter out any suspended/banned that might slip through
  const eligible = pending.filter(u => u.status === 'pending');

  if (eligible.length === 0) {
    console.log('No pending accounts found. Nothing to do.');
    return;
  }

  console.log(`Found ${eligible.length} pending account(s):\n`);
  for (const u of eligible) {
    console.log(`  ${u.email} (${u.userId}) — created ${u.createdAt}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run without --dry-run to apply.');
    return;
  }

  console.log('\nActivating...\n');
  let activated = 0;
  let failed = 0;

  for (const u of eligible) {
    try {
      // ZeroDB uses PUT on /rows/:row_id with full row_data replacement
      await User.updateOne({ _id: u._id }, { $set: { status: 'active', updatedAt: new Date() } });
      console.log(`  ✓ ${u.email}`);
      activated++;
    } catch (err) {
      console.error(`  ✗ ${u.email}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Activated: ${activated}, Failed: ${failed}`);
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
