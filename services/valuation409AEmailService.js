/**
 * 409A Valuation Email Notification Service
 *
 * Sends transactional emails for the 409A workflow using Resend SMTP via nodemailer.
 * All emails are plain HTML, no external dependencies beyond nodemailer (already installed).
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
  .highlight { background:#eff6ff; border-left:4px solid #1e40af; padding:12px 16px; border-radius:4px; margin:16px 0; }
  .highlight .big { font-size:22px; font-weight:700; color:#1e40af; }
  .btn { display:inline-block; background:#1e40af; color:#fff !important; text-decoration:none; padding:11px 22px; border-radius:6px; font-size:14px; font-weight:600; margin:16px 0; }
  .footer { padding:16px 32px; border-top:1px solid #f3f4f6; font-size:11px; color:#9ca3af; }
</style>
</head>
<body>
<div class="card">
  <div class="header"><h1>OpenCap Stack</h1><p>409A Valuation Platform</p></div>
  <div class="body">${body}</div>
  <div class="footer">OpenCap Stack · This is an automated message. Please do not reply.</div>
</div>
</body>
</html>`;
}

async function send(to, subject, html) {
  if (!process.env.EMAIL_PASS && !process.env.RESEND_API_KEY) {
    console.warn(`[Email] No EMAIL_PASS or RESEND_API_KEY set — skipping email to ${to}: ${subject}`);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({ from: FROM, to, subject, html });
  console.log(`[Email] Sent "${subject}" to ${to}`);
}

// ─── 1. Payment Confirmed — AI is starting ────────────────────────────────────
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

// ─── 2. AI Complete — Notify Accountants ─────────────────────────────────────
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

// ─── 3. Report Released — Notify Company ─────────────────────────────────────
async function sendReportReleased({ to, companyId, valuationId, fmv, signedBy }) {
  const url = `${APP_URL}/valuations/${valuationId}`;
  const html = layout(`
    <p>Hi there,</p>
    <p>Great news — your 409A Valuation Report has been reviewed, signed off by a licensed accountant, and is now available in your dashboard.</p>
    <div class="highlight">
      <div>Company: <strong>${companyId}</strong></div>
      <div class="big">$${Number(fmv || 0).toFixed(4)}</div>
      <div style="font-size:12px;color:#374151;">Fair Market Value per Common Share</div>
      ${signedBy ? `<div style="margin-top:6px;font-size:12px;color:#059669;">✓ Reviewed & signed by ${signedBy}</div>` : ''}
    </div>
    <p>You can view the full report and download a PDF from your dashboard:</p>
    <a class="btn" href="${url}">View Your 409A Report →</a>
    <p>This valuation is valid for 12 months from the effective date, or until a material event (new financing round, acquisition, etc.).</p>
  `, '409A Valuation Report Ready');
  await send(to, 'Your 409A Valuation Report is ready', html);
}

module.exports = {
  sendPaymentConfirmed,
  sendAccountantQueueNotification,
  sendReportReleased,
};
