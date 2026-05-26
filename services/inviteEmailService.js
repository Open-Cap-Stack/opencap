'use strict';

/**
 * Invite Email Service
 *
 * Sends invite emails for employee and service provider onboarding
 * via Resend SMTP (nodemailer). Follows the same pattern as
 * valuation409AEmailService.js.
 */

const nodemailer = require('nodemailer');

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

const FROM = process.env.EMAIL_FROM || 'noreply@opencapstack.com';
const APP_URL = process.env.FRONTEND_URL || 'https://opencapstack.com';

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

async function send(to, subject, html) {
  if (!process.env.EMAIL_PASS && !process.env.RESEND_API_KEY) {
    console.warn(`[InviteEmail] No EMAIL_PASS or RESEND_API_KEY set — skipping email to ${to}: ${subject}`);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({ from: FROM, to, subject, html });
  console.log(`[InviteEmail] Sent "${subject}" to ${to}`);
}

/**
 * Send employee invite email.
 *
 * @param {Object} params
 * @param {string} params.to           - Employee email address
 * @param {string} params.firstName    - Employee first name
 * @param {string} params.companyName  - Company name (optional, falls back to generic)
 * @param {string} params.inviteToken  - The invite token
 */
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
  `, 'You\'ve been invited to OpenCap Stack');

  await send(to, `You've been invited to join ${company} on OpenCap Stack`, html);
}

/**
 * Send service provider invite email.
 *
 * @param {Object} params
 * @param {string} params.to             - Service provider email address
 * @param {string} params.firstName      - Service provider first name
 * @param {string} params.companyName    - Company name (optional)
 * @param {string} params.engagementType - e.g. 'legal', 'accounting', 'compliance'
 * @param {string} params.inviteToken    - The invite token
 */
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

module.exports = {
  sendEmployeeInvite,
  sendServiceProviderInvite,
};
