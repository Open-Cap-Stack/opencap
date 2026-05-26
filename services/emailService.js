'use strict';

/**
 * Email Service
 *
 * Single authoritative transactional email service for OpenCap Stack.
 * All email flows — auth, invite, 409A — route through here via Resend SMTP.
 *
 * Transport: Resend SMTP (smtp.resend.com:465)
 * Env vars:  EMAIL_PASS or RESEND_API_KEY (required to actually send)
 *            EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_FROM (optional overrides)
 *            FRONTEND_URL (base URL for action links)
 */

const nodemailer = require('nodemailer');

const FROM = process.env.EMAIL_FROM || 'noreply@opencapstack.com';
const APP_URL = process.env.FRONTEND_URL || 'https://opencapstack.com';

// ─── Transport ────────────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.resend.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
    auth: {
      user: process.env.EMAIL_USER || 'resend',
      pass: process.env.EMAIL_PASS || process.env.RESEND_API_KEY,
    },
  });
}

// ─── Branded HTML layout ──────────────────────────────────────────────────────

function layout(body, title) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f9fafb; margin:0; padding:20px; color:#111827; }
  .card { max-width:560px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
  .header { background:#1e40af; padding:24px 32px; }
  .header h1 { color:#fff; margin:0; font-size:20px; font-weight:700; }
  .header p  { color:#bfdbfe; margin:4px 0 0; font-size:13px; }
  .body   { padding:28px 32px; }
  .body p  { font-size:14px; line-height:1.6; margin:0 0 14px; }
  .highlight { background:#eff6ff; border-left:4px solid #1e40af; padding:12px 16px; border-radius:4px; margin:16px 0; font-size:14px; }
  .highlight .big { font-size:22px; font-weight:700; color:#1e40af; }
  .btn { display:inline-block; background:#1e40af; color:#fff !important; text-decoration:none; padding:11px 22px; border-radius:6px; font-size:14px; font-weight:600; margin:16px 0; }
  .footer { padding:16px 32px; border-top:1px solid #f3f4f6; font-size:11px; color:#9ca3af; }
</style>
</head>
<body>
<div class="card">
  <div class="header"><h1>OpenCap Stack</h1><p>Equity Management Platform</p></div>
  <div class="body">${body}</div>
  <div class="footer">OpenCap Stack · This is an automated message. Please do not reply.</div>
</div>
</body>
</html>`;
}

// ─── Core send (graceful skip when no key) ────────────────────────────────────

async function send(to, subject, html) {
  if (!process.env.EMAIL_PASS && !process.env.RESEND_API_KEY) {
    console.warn(`[Email] No RESEND_API_KEY set — skipping: ${subject} to ${to}`);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({ from: FROM, to, subject, html });
  console.log(`[Email] Sent "${subject}" to ${to}`);
}

// ─── 1. Password reset ────────────────────────────────────────────────────────

async function sendPasswordReset({ to, resetUrl }) {
  const html = layout(`
    <p>Hi there,</p>
    <p>You requested a password reset for your OpenCap Stack account.</p>
    <div class="highlight">
      <div>Click the button below to set a new password. This link expires in 24 hours.</div>
    </div>
    <a class="btn" href="${resetUrl}">Reset Password →</a>
    <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `, 'OpenCap Stack — Password Reset');
  await send(to, 'OpenCap Stack — Password Reset', html);
}

// ─── 2. Email verification ────────────────────────────────────────────────────

async function sendEmailVerification({ to, firstName, verificationUrl }) {
  const name = firstName || 'there';
  const html = layout(`
    <p>Hi ${name},</p>
    <p>Thanks for registering with OpenCap Stack. Please verify your email address to activate your account.</p>
    <div class="highlight">
      <div>Click the button below to verify your email. This link expires in 24 hours.</div>
    </div>
    <a class="btn" href="${verificationUrl}">Verify Email Address →</a>
    <p>If you didn't create an account, you can safely ignore this email.</p>
  `, 'Verify your OpenCap Stack email');
  await send(to, 'Verify your OpenCap Stack email address', html);
}

// ─── 3. Welcome email (role-aware) ────────────────────────────────────────────

async function sendWelcome({ to, firstName, role }) {
  const name = firstName || 'there';

  let roleSection;
  if (role === 'employee') {
    roleSection = `
      <p>As an employee, you can view your equity grants, vesting schedule, and the current fair market value of your shares — all in one place.</p>
      <a class="btn" href="${APP_URL}/dashboard">View Your Equity Dashboard →</a>
    `;
  } else if (role === 'service_provider') {
    roleSection = `
      <p>As a service provider, you have scoped access to the cap table data and documents relevant to your engagement. You can review your permissions from your dashboard.</p>
      <a class="btn" href="${APP_URL}/dashboard">Open Your Dashboard →</a>
    `;
  } else {
    roleSection = `
      <p>You now have access to OpenCap Stack's full suite of equity management tools — cap table management, 409A valuations, document storage, and more.</p>
      <a class="btn" href="${APP_URL}/dashboard">Go to Dashboard →</a>
    `;
  }

  const html = layout(`
    <p>Hi ${name},</p>
    <p>Welcome to <strong>OpenCap Stack</strong> — your account has been created and you're ready to go.</p>
    ${roleSection}
    <p>If you have any questions, reply to this email or reach out to your company administrator.</p>
  `, 'Welcome to OpenCap Stack');

  await send(to, 'Welcome to OpenCap Stack', html);
}

// ─── 4. Employee invite ───────────────────────────────────────────────────────

async function sendEmployeeInvite({ to, firstName, companyName, inviteToken }) {
  const acceptUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;
  const company = companyName || 'your company';

  const html = layout(`
    <p>Hi ${firstName},</p>
    <p>You've been invited to join <strong>${company}</strong> on OpenCap Stack to view your equity grants, vesting schedule, and share value.</p>
    <div class="highlight">
      <div>Click the button below to set your password and activate your account.</div>
      <div style="margin-top:8px;font-size:12px;color:#6b7280;">This link expires in 72 hours.</div>
    </div>
    <a class="btn" href="${acceptUrl}">Accept Invite &amp; Set Password →</a>
    <p>Once you're set up, you'll be able to see your equity grants, vesting timeline, and what your shares are worth at the current valuation.</p>
    <p>If you weren't expecting this invite, you can safely ignore this email.</p>
  `, "You've been invited to OpenCap Stack");

  await send(to, `You've been invited to join ${company} on OpenCap Stack`, html);
}

// ─── 5. Service provider invite ───────────────────────────────────────────────

async function sendServiceProviderInvite({ to, firstName, companyName, engagementType, inviteToken }) {
  const acceptUrl = `${APP_URL}/accept-service-invite?token=${inviteToken}`;
  const company = companyName || 'a company';
  const engagementLabel = engagementType
    ? engagementType.charAt(0).toUpperCase() + engagementType.slice(1)
    : 'Service Provider';

  const html = layout(`
    <p>Hi ${firstName},</p>
    <p>You've been invited to access <strong>${company}</strong>'s cap table data on OpenCap Stack as a <strong>${engagementLabel}</strong> service provider.</p>
    <div class="highlight">
      <div>Click the button below to set your password and activate your account.</div>
      <div style="margin-top:8px;font-size:12px;color:#6b7280;">This link expires in 72 hours.</div>
    </div>
    <a class="btn" href="${acceptUrl}">Accept Invite &amp; Set Password →</a>
    <p>Your access is scoped to the documents and data relevant to your engagement. You can review those permissions after logging in.</p>
    <p>If you weren't expecting this invite, you can safely ignore this email.</p>
  `, `You've been invited to access ${company} on OpenCap Stack`);

  await send(to, `You've been invited to access ${company}'s cap table data`, html);
}

// ─── 6. 409A report released ──────────────────────────────────────────────────

async function sendReportReleased({ to, companyId, valuationId, fmv, signedBy }) {
  const url = `${APP_URL}/valuations/${valuationId}`;
  const html = layout(`
    <p>Hi there,</p>
    <p>Great news — your 409A Valuation Report has been reviewed, signed off by a licensed accountant, and is now available in your dashboard.</p>
    <div class="highlight">
      <div>Company: <strong>${companyId}</strong></div>
      <div class="big">$${Number(fmv || 0).toFixed(4)}</div>
      <div style="font-size:12px;color:#374151;">Fair Market Value per Common Share</div>
      ${signedBy ? `<div style="margin-top:6px;font-size:12px;color:#059669;">✓ Reviewed &amp; signed by ${signedBy}</div>` : ''}
    </div>
    <p>You can view the full report and download a PDF from your dashboard:</p>
    <a class="btn" href="${url}">View Your 409A Report →</a>
    <p>This valuation is valid for 12 months from the effective date, or until a material event (new financing round, acquisition, etc.).</p>
  `, '409A Valuation Report Ready');
  await send(to, 'Your 409A Valuation Report is ready', html);
}

// ─── 7. Accountant queue notification ────────────────────────────────────────

async function sendAccountantQueueNotification({ accountantEmails, companyId, valuationId, fmv }) {
  if (!accountantEmails?.length) return;
  const url = `${APP_URL}/accountant`;
  const html = layout(`
    <p>A new AI-generated 409A valuation is ready for your review.</p>
    <div class="highlight">
      <div>Company: <strong>${companyId}</strong></div>
      <div class="big">$${Number(fmv || 0).toFixed(4)}</div>
      <div style="font-size:12px;color:#374151;">AI-computed Fair Market Value per Common Share</div>
    </div>
    <p>Please log in to the accountant dashboard to claim and review this valuation. Your review and digital sign-off is required before the report can be released to the company.</p>
    <a class="btn" href="${url}">Open Accountant Dashboard →</a>
  `, 'New 409A Ready for Review');
  for (const email of accountantEmails) {
    await send(email, `New 409A valuation ready for review — ${companyId}`, html);
  }
}

// ─── 8. Payment confirmed ─────────────────────────────────────────────────────

async function sendPaymentConfirmed({ to, companyId, valuationId, fmv }) {
  const url = `${APP_URL}/valuations/${valuationId}`;
  const html = layout(`
    <p>Hi there,</p>
    <p>Your payment for the <strong>409A Valuation Report</strong> has been confirmed. Our AI agent is now analyzing your company data.</p>
    <div class="highlight">
      <div>Company: <strong>${companyId}</strong></div>
      <div>Valuation ID: <code>${valuationId}</code></div>
    </div>
    <p>You can track the progress of your valuation in real time:</p>
    <a class="btn" href="${url}">View Valuation Status →</a>
    <p>The AI analysis typically completes within 5–10 minutes. A licensed accountant will then review and sign off — usually within 2–3 business days.</p>
  `, 'Payment Confirmed — AI Analysis Starting');
  await send(to, 'Payment confirmed — your 409A analysis is starting', html);
}

// ─── 9. Clerky document sync notification ───────────────────────────────────

async function sendClerkyDocumentNotification({ to, companyId, documentName, recordsQueued }) {
  const url = `${APP_URL}/data-rooms`;
  const count = recordsQueued || 0;
  const html = layout(`
    <p>Hi there,</p>
    <p>A new document has been synced from Clerky to your OpenCap Stack data room.</p>
    <div class="highlight">
      <div>Document: <strong>${documentName || 'Unknown'}</strong></div>
      <div class="big">${count} record${count !== 1 ? 's' : ''}</div>
      <div style="font-size:12px;color:#374151;">ready for review</div>
    </div>
    <p>Please review the extracted records in your data room and approve or reject them.</p>
    <a class="btn" href="${url}">Review Extracted Records →</a>
  `, 'New Document Synced from Clerky');
  await send(to, `New document synced from Clerky — ${count} record${count !== 1 ? 's' : ''} ready for review`, html);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendPasswordReset,
  sendEmailVerification,
  sendWelcome,
  sendEmployeeInvite,
  sendServiceProviderInvite,
  sendReportReleased,
  sendAccountantQueueNotification,
  sendPaymentConfirmed,
  sendClerkyDocumentNotification,
};
