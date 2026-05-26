'use strict';

/**
 * Tests for services/emailService.js
 *
 * Covers all 8 email functions, graceful skip behaviour, subject/to correctness,
 * role-aware welcome copy, and rapid-fire stress invocations.
 *
 * Strategy: we load emailService once per describe block using jest.isolateModules()
 * so each block gets its own nodemailer mock with a fresh sendMail spy.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load emailService in an isolated module registry, optionally pre-setting env vars.
 * Returns { emailService, sendMailMock }.
 */
function loadEmailService(env = {}) {
  // Save and patch env
  const saved = {};
  const envKeys = ['RESEND_API_KEY', 'EMAIL_PASS', 'FRONTEND_URL', 'EMAIL_FROM', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER'];
  envKeys.forEach(k => { saved[k] = process.env[k]; delete process.env[k]; });
  Object.entries(env).forEach(([k, v]) => { process.env[k] = v; });

  let svc;
  let sendMailMock;

  jest.isolateModules(() => {
    const nodemailer = require('nodemailer');
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: sendMailMock });
    svc = require('../../../services/emailService');
  });

  // Restore env after loading (module already captured the values it cares about at call time)
  envKeys.forEach(k => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  // But we need the env to still be set during the async calls, so re-apply
  Object.entries(env).forEach(([k, v]) => { process.env[k] = v; });

  return { emailService: svc, sendMailMock };
}

afterEach(() => {
  // Clean up any env pollution between tests
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_PASS;
  delete process.env.FRONTEND_URL;
  jest.restoreAllMocks();
});

// ─── Graceful skip when no key configured ────────────────────────────────────

describe('graceful skip when no key configured', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_PASS;
    ({ emailService, sendMailMock } = loadEmailService({}));
  });

  test('sendPasswordReset does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendPasswordReset({ to: 'user@example.com', resetUrl: 'https://example.com/reset' })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendEmailVerification does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendEmailVerification({ to: 'user@example.com', firstName: 'Alice', verificationUrl: 'https://example.com/verify' })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendWelcome does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendWelcome({ to: 'user@example.com', firstName: 'Alice', role: 'employee' })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendEmployeeInvite does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendEmployeeInvite({ to: 'emp@example.com', firstName: 'Bob', companyName: 'Acme', inviteToken: 'tok123' })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendServiceProviderInvite does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendServiceProviderInvite({ to: 'sp@example.com', firstName: 'Carol', companyName: 'Acme', engagementType: 'legal', inviteToken: 'tok456' })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendReportReleased does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendReportReleased({ to: 'founder@example.com', companyId: 'c1', valuationId: 'v1', fmv: 1.23, signedBy: 'Jane CPA' })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendAccountantQueueNotification does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendAccountantQueueNotification({ accountantEmails: ['acct@example.com'], companyId: 'c1', valuationId: 'v1', fmv: 2.5 })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('sendPaymentConfirmed does not throw and does not call sendMail', async () => {
    await expect(
      emailService.sendPaymentConfirmed({ to: 'pay@example.com', companyId: 'c1', valuationId: 'v1', fmv: 3.0 })
    ).resolves.toBeUndefined();
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});

// ─── EMAIL_PASS as alternative key ───────────────────────────────────────────

describe('EMAIL_PASS as alternative key', () => {
  test('sendPasswordReset calls sendMail when EMAIL_PASS is set', async () => {
    process.env.EMAIL_PASS = 'smtp-pass';
    delete process.env.RESEND_API_KEY;
    const { emailService, sendMailMock } = loadEmailService({ EMAIL_PASS: 'smtp-pass' });
    await emailService.sendPasswordReset({ to: 'user@example.com', resetUrl: 'https://example.com/reset' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    delete process.env.EMAIL_PASS;
  });
});

// ─── sendPasswordReset ────────────────────────────────────────────────────────

describe('sendPasswordReset', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail with correct to and subject', async () => {
    await emailService.sendPasswordReset({ to: 'user@example.com', resetUrl: 'https://opencapstack.com/reset-password?token=abc' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe('user@example.com');
    expect(call.subject).toMatch(/Password Reset/i);
  });

  test('HTML contains the reset URL', async () => {
    const resetUrl = 'https://opencapstack.com/reset-password?token=xyz123';
    await emailService.sendPasswordReset({ to: 'user@example.com', resetUrl });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain(resetUrl);
  });
});

// ─── sendEmailVerification ────────────────────────────────────────────────────

describe('sendEmailVerification', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail with correct to', async () => {
    await emailService.sendEmailVerification({ to: 'alice@example.com', firstName: 'Alice', verificationUrl: 'https://opencapstack.com/verify-email/tok' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].to).toBe('alice@example.com');
  });

  test('HTML contains verification URL', async () => {
    const verificationUrl = 'https://opencapstack.com/verify-email/unique-token-99';
    await emailService.sendEmailVerification({ to: 'alice@example.com', firstName: 'Alice', verificationUrl });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain(verificationUrl);
  });

  test('HTML contains first name', async () => {
    await emailService.sendEmailVerification({ to: 'alice@example.com', firstName: 'Alice', verificationUrl: 'https://example.com/v' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Alice');
  });

  test('falls back gracefully when firstName is omitted', async () => {
    await emailService.sendEmailVerification({ to: 'anon@example.com', verificationUrl: 'https://example.com/v' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('there');
  });
});

// ─── sendWelcome (role-aware) ─────────────────────────────────────────────────

describe('sendWelcome', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('employee role — HTML mentions equity', async () => {
    await emailService.sendWelcome({ to: 'emp@example.com', firstName: 'Bob', role: 'employee' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html.toLowerCase()).toContain('equity');
  });

  test('service_provider role — HTML mentions engagement', async () => {
    await emailService.sendWelcome({ to: 'sp@example.com', firstName: 'Carol', role: 'service_provider' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html.toLowerCase()).toContain('engagement');
  });

  test('admin role — HTML contains dashboard link', async () => {
    await emailService.sendWelcome({ to: 'admin@example.com', firstName: 'Dave', role: 'admin' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/dashboard');
  });

  test('founder role — HTML contains dashboard link (generic path)', async () => {
    await emailService.sendWelcome({ to: 'founder@example.com', firstName: 'Eve', role: 'founder' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/dashboard');
  });

  test('subject is Welcome to OpenCap Stack', async () => {
    await emailService.sendWelcome({ to: 'emp@example.com', firstName: 'Frank', role: 'employee' });
    expect(sendMailMock.mock.calls[0][0].subject).toMatch(/Welcome to OpenCap Stack/);
  });
});

// ─── sendEmployeeInvite ───────────────────────────────────────────────────────

describe('sendEmployeeInvite', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('subject contains company name', async () => {
    await emailService.sendEmployeeInvite({ to: 'emp@example.com', firstName: 'Grace', companyName: 'Initech', inviteToken: 'tok789' });
    expect(sendMailMock.mock.calls[0][0].subject).toContain('Initech');
  });

  test('HTML contains accept-invite URL with token', async () => {
    await emailService.sendEmployeeInvite({ to: 'emp@example.com', firstName: 'Grace', companyName: 'Initech', inviteToken: 'mytoken' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/accept-invite?token=mytoken');
  });

  test('uses fallback company name when omitted', async () => {
    await emailService.sendEmployeeInvite({ to: 'emp@example.com', firstName: 'Grace', inviteToken: 'tok' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('your company');
  });
});

// ─── sendServiceProviderInvite ────────────────────────────────────────────────

describe('sendServiceProviderInvite', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('subject contains company name', async () => {
    await emailService.sendServiceProviderInvite({ to: 'sp@example.com', firstName: 'Hank', companyName: 'Globex', engagementType: 'legal', inviteToken: 'sp-tok' });
    expect(sendMailMock.mock.calls[0][0].subject).toContain('Globex');
  });

  test('HTML contains accept-service-invite URL with token', async () => {
    await emailService.sendServiceProviderInvite({ to: 'sp@example.com', firstName: 'Hank', companyName: 'Globex', engagementType: 'legal', inviteToken: 'sp-tok' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/accept-service-invite?token=sp-tok');
  });

  test('HTML contains capitalized engagement type', async () => {
    await emailService.sendServiceProviderInvite({ to: 'sp@example.com', firstName: 'Hank', companyName: 'Globex', engagementType: 'accounting', inviteToken: 'sp-tok2' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Accounting');
  });

  test('falls back to Service Provider label when engagementType omitted', async () => {
    await emailService.sendServiceProviderInvite({ to: 'sp@example.com', firstName: 'Hank', companyName: 'Globex', inviteToken: 'sp-tok3' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Service Provider');
  });
});

// ─── sendReportReleased ───────────────────────────────────────────────────────

describe('sendReportReleased', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail once with correct to', async () => {
    await emailService.sendReportReleased({ to: 'founder@example.com', companyId: 'comp1', valuationId: 'val1', fmv: 5.6789, signedBy: 'J. Smith CPA' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].to).toBe('founder@example.com');
  });

  test('HTML contains FMV formatted to 4 decimal places', async () => {
    await emailService.sendReportReleased({ to: 'founder@example.com', companyId: 'c1', valuationId: 'v1', fmv: 1.23, signedBy: null });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('1.2300');
  });

  test('HTML contains signed-by name when provided', async () => {
    await emailService.sendReportReleased({ to: 'founder@example.com', companyId: 'c1', valuationId: 'v1', fmv: 2, signedBy: 'Jane CPA' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Jane CPA');
  });

  test('HTML contains valuation link', async () => {
    await emailService.sendReportReleased({ to: 'founder@example.com', companyId: 'c1', valuationId: 'val-999', fmv: 1 });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/valuations/val-999');
  });
});

// ─── sendAccountantQueueNotification ─────────────────────────────────────────

describe('sendAccountantQueueNotification', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('sends one email per accountant', async () => {
    await emailService.sendAccountantQueueNotification({
      accountantEmails: ['a1@example.com', 'a2@example.com', 'a3@example.com'],
      companyId: 'c1',
      valuationId: 'v1',
      fmv: 3.5,
    });
    expect(sendMailMock).toHaveBeenCalledTimes(3);
  });

  test('does nothing when accountantEmails is empty', async () => {
    await emailService.sendAccountantQueueNotification({ accountantEmails: [], companyId: 'c1', valuationId: 'v1', fmv: 1 });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('does nothing when accountantEmails is undefined', async () => {
    await emailService.sendAccountantQueueNotification({ companyId: 'c1', valuationId: 'v1', fmv: 1 });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('subject contains company id', async () => {
    await emailService.sendAccountantQueueNotification({ accountantEmails: ['a@example.com'], companyId: 'MyStartup', valuationId: 'v1', fmv: 1 });
    expect(sendMailMock.mock.calls[0][0].subject).toContain('MyStartup');
  });
});

// ─── sendPaymentConfirmed ─────────────────────────────────────────────────────

describe('sendPaymentConfirmed', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail with correct to', async () => {
    await emailService.sendPaymentConfirmed({ to: 'pay@example.com', companyId: 'c1', valuationId: 'v1', fmv: 4 });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].to).toBe('pay@example.com');
  });

  test('HTML contains valuation link', async () => {
    await emailService.sendPaymentConfirmed({ to: 'pay@example.com', companyId: 'c1', valuationId: 'val-payment-123', fmv: 4 });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/valuations/val-payment-123');
  });

  test('subject mentions 409A analysis', async () => {
    await emailService.sendPaymentConfirmed({ to: 'pay@example.com', companyId: 'c1', valuationId: 'v1', fmv: 4 });
    expect(sendMailMock.mock.calls[0][0].subject).toMatch(/409A|analysis/i);
  });
});

// ─── FRONTEND_URL override ────────────────────────────────────────────────────

describe('FRONTEND_URL override', () => {
  test('employee invite accept URL uses FRONTEND_URL', async () => {
    process.env.FRONTEND_URL = 'https://my-staging.example.com';
    const { emailService, sendMailMock } = loadEmailService({
      RESEND_API_KEY: 'test-key',
      FRONTEND_URL: 'https://my-staging.example.com',
    });
    await emailService.sendEmployeeInvite({ to: 'e@example.com', firstName: 'X', companyName: 'Co', inviteToken: 'tok' });
    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('my-staging.example.com');
    delete process.env.FRONTEND_URL;
  });
});

// ─── Stress test ──────────────────────────────────────────────────────────────

describe('stress test — rapid fire', () => {
  test('sendPasswordReset called 100 times does not throw, calls sendMail 100 times', async () => {
    const { emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' });
    const calls = Array.from({ length: 100 }, (_, i) =>
      emailService.sendPasswordReset({ to: `user${i}@example.com`, resetUrl: `https://opencapstack.com/reset?token=token${i}` })
    );
    await Promise.all(calls);
    expect(sendMailMock).toHaveBeenCalledTimes(100);
  });
});
