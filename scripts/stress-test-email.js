#!/usr/bin/env node
'use strict';

/**
 * Email flow stress tester
 *
 * Tests every email function in services/emailService.js against the real
 * Resend API when RESEND_API_KEY is set, or logs a graceful skip when not.
 *
 * Usage:
 *   node scripts/stress-test-email.js
 *
 * Set STRESS_TO=you@example.com to receive real delivery.
 * All other env vars are read from process.env (or .env if dotenv is installed).
 */

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const emailService = require('../services/emailService');

const TO = process.env.STRESS_TO || 'test@example.com';
const COMPANY_ID = 'stress-test-co';
const VALUATION_ID = 'stress-val-001';
const FMV = 1.2345;

const results = [];

async function run(label, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.push({ label, status: 'PASS', ms });
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ label, status: 'FAIL', ms, error: err.message });
  }
}

(async () => {
  console.log('=== OpenCap Stack Email Stress Test ===\n');
  console.log(`Sending to: ${TO}`);
  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'set' : 'NOT SET (graceful skip expected)'}\n`);

  await run('sendPasswordReset', () =>
    emailService.sendPasswordReset({
      to: TO,
      resetUrl: 'https://opencapstack.com/reset-password?token=stress-test-token',
    })
  );

  await run('sendEmailVerification', () =>
    emailService.sendEmailVerification({
      to: TO,
      firstName: 'Stress',
      verificationUrl: 'https://opencapstack.com/verify-email/stress-test-token',
    })
  );

  await run('sendWelcome (employee)', () =>
    emailService.sendWelcome({ to: TO, firstName: 'Stress', role: 'employee' })
  );

  await run('sendWelcome (service_provider)', () =>
    emailService.sendWelcome({ to: TO, firstName: 'Stress', role: 'service_provider' })
  );

  await run('sendWelcome (admin)', () =>
    emailService.sendWelcome({ to: TO, firstName: 'Stress', role: 'admin' })
  );

  await run('sendEmployeeInvite', () =>
    emailService.sendEmployeeInvite({
      to: TO,
      firstName: 'Stress',
      companyName: 'StressTest Corp',
      inviteToken: 'stress-invite-token',
    })
  );

  await run('sendServiceProviderInvite', () =>
    emailService.sendServiceProviderInvite({
      to: TO,
      firstName: 'Stress',
      companyName: 'StressTest Corp',
      engagementType: 'legal',
      inviteToken: 'stress-sp-token',
    })
  );

  await run('sendReportReleased', () =>
    emailService.sendReportReleased({
      to: TO,
      companyId: COMPANY_ID,
      valuationId: VALUATION_ID,
      fmv: FMV,
      signedBy: 'Stress Test CPA',
    })
  );

  await run('sendAccountantQueueNotification', () =>
    emailService.sendAccountantQueueNotification({
      accountantEmails: [TO],
      companyId: COMPANY_ID,
      valuationId: VALUATION_ID,
      fmv: FMV,
    })
  );

  await run('sendPaymentConfirmed', () =>
    emailService.sendPaymentConfirmed({
      to: TO,
      companyId: COMPANY_ID,
      valuationId: VALUATION_ID,
      fmv: FMV,
    })
  );

  // ─── Rapid-fire burst: 20 password resets ───────────────────────────────────
  const burstStart = Date.now();
  let burstFails = 0;
  try {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        emailService.sendPasswordReset({
          to: TO,
          resetUrl: `https://opencapstack.com/reset-password?token=burst-${i}`,
        })
      )
    );
  } catch (err) {
    burstFails++;
  }
  results.push({
    label: 'sendPasswordReset x20 burst',
    status: burstFails === 0 ? 'PASS' : 'FAIL',
    ms: Date.now() - burstStart,
  });

  // ─── Summary table ──────────────────────────────────────────────────────────
  console.log('\n=== Results ===\n');
  const col = (s, w) => String(s).padEnd(w);
  console.log(`${col('Test', 46)} ${col('Status', 6)} ${col('ms', 6)}`);
  console.log('-'.repeat(62));
  let failures = 0;
  for (const r of results) {
    if (r.status === 'FAIL') failures++;
    const statusLabel = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`${col(r.label, 46)} ${col(statusLabel, 6)} ${col(r.ms, 6)}${r.error ? `  ERROR: ${r.error}` : ''}`);
  }
  console.log('-'.repeat(62));
  console.log(`\n${results.length} tests — ${failures} failure(s)\n`);
  process.exit(failures > 0 ? 1 : 0);
})();
