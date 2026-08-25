/**
 * Email Service - Final Coverage Tests
 *
 * Targets the remaining uncovered branches:
 * - Line 194: sendReportReleased with signedBy set (truthy branch)
 * - Line 214: sendAccountantQueueNotification with non-empty accountantEmails
 * - Line 194: sendReportReleased without signedBy (falsy branch - empty string)
 * - sendPaymentConfirmed: subject and content checks
 * - sendOnboardingReminder: daysAgo === 1 (singular form)
 * - send83bDeadlineReminder: non-urgent path (> 7 days)
 * - sendWelcome: default role (not employee or service_provider)
 * - sendEmployeeInvite: without companyName
 * - sendServiceProviderInvite: with engagementType set
 */

'use strict';

function loadEmailService(env = {}) {
  const saved = {};
  const envKeys = [
    'RESEND_API_KEY', 'EMAIL_PASS', 'FRONTEND_URL',
    'EMAIL_FROM', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER',
  ];
  envKeys.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
  Object.entries(env).forEach(([k, v]) => { process.env[k] = v; });

  let svc;
  let sendMailMock;

  jest.isolateModules(() => {
    const nodemailer = require('nodemailer');
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: sendMailMock });
    svc = require('../../../services/emailService');
  });

  const restore = () => {
    envKeys.forEach((k) => {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    });
  };

  return { svc, sendMailMock, restore };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Email Service - Final Coverage', () => {

  // ── sendReportReleased: signedBy truthy (line 194 branch) ─────────────────

  describe('sendReportReleased - with signedBy', () => {
    it('should include signedBy in the HTML when provided', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendReportReleased({
        to: 'admin@test.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.2345,
        signedBy: 'Jane Doe, CPA',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Jane Doe, CPA');
      expect(html).toContain('Reviewed');
      expect(html).toContain('$1.2345');
      restore();
    });

    it('should NOT include signedBy div when signedBy is empty string', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendReportReleased({
        to: 'admin@test.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 2.0,
        signedBy: '',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).not.toContain('Reviewed');
      restore();
    });

    it('should NOT include signedBy div when signedBy is undefined', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendReportReleased({
        to: 'admin@test.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 0,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).not.toContain('Reviewed');
      expect(html).toContain('$0.0000');
      restore();
    });
  });

  // ── sendAccountantQueueNotification: with accountantEmails (line 214) ─────

  describe('sendAccountantQueueNotification - with emails', () => {
    it('should send to all accountant emails', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendAccountantQueueNotification({
        accountantEmails: ['cpa1@test.com', 'cpa2@test.com'],
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 3.5,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(2);
      expect(sendMailMock.mock.calls[0][0].to).toBe('cpa1@test.com');
      expect(sendMailMock.mock.calls[1][0].to).toBe('cpa2@test.com');

      // Check HTML content
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('comp_1');
      expect(html).toContain('$3.5000');
      expect(html).toContain('accountant dashboard');
      restore();
    });

    it('should send to single accountant email', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendAccountantQueueNotification({
        accountantEmails: ['solo@test.com'],
        companyId: 'comp_2',
        valuationId: 'val_2',
        fmv: 0.5,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.to).toBe('solo@test.com');
      expect(call.subject).toContain('comp_2');
      restore();
    });

    it('should skip when accountantEmails is empty array', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendAccountantQueueNotification({
        accountantEmails: [],
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.0,
      });

      expect(sendMailMock).not.toHaveBeenCalled();
      restore();
    });

    it('should skip when accountantEmails is null', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendAccountantQueueNotification({
        accountantEmails: null,
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.0,
      });

      expect(sendMailMock).not.toHaveBeenCalled();
      restore();
    });
  });

  // ── sendPaymentConfirmed: content verification ────────────────────────────

  describe('sendPaymentConfirmed', () => {
    it('should send payment confirmation with correct content', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendPaymentConfirmed({
        to: 'user@test.com',
        companyId: 'comp_1',
        valuationId: 'val_123',
        fmv: 2.5,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.to).toBe('user@test.com');
      expect(call.subject).toContain('Payment confirmed');
      expect(call.html).toContain('val_123');
      expect(call.html).toContain('comp_1');
      restore();
    });
  });

  // ── sendWelcome: default role (founder/admin path) ────────────────────────

  describe('sendWelcome - default role', () => {
    it('should send generic welcome for founder role', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendWelcome({
        to: 'founder@test.com',
        firstName: 'Alex',
        role: 'founder',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('full suite');
      expect(html).toContain('cap table management');
      restore();
    });

    it('should handle missing firstName gracefully', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendWelcome({
        to: 'user@test.com',
        role: 'admin',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Hi there');
      restore();
    });
  });

  // ── sendEmployeeInvite: without companyName ───────────────────────────────

  describe('sendEmployeeInvite - without companyName', () => {
    it('should use fallback "your company" when companyName is missing', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendEmployeeInvite({
        to: 'emp@test.com',
        firstName: 'Bob',
        inviteToken: 'token123',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('your company');
      expect(html).toContain('token123');
      restore();
    });
  });

  // ── sendServiceProviderInvite: with engagementType ────────────────────────

  describe('sendServiceProviderInvite - with engagementType', () => {
    it('should capitalize and display engagementType', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendServiceProviderInvite({
        to: 'sp@test.com',
        firstName: 'Carol',
        companyName: 'Acme Corp',
        engagementType: 'auditor',
        inviteToken: 'sp-token',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Auditor');
      expect(html).toContain('Acme Corp');
      restore();
    });
  });

  // ── sendOnboardingReminder: singular day ──────────────────────────────────

  describe('sendOnboardingReminder - singular day', () => {
    it('should use singular "day" for daysAgo === 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendOnboardingReminder({
        to: 'user@test.com',
        firstName: 'Dana',
        daysAgo: 1,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('1 day ago');
      restore();
    });
  });

  // ── send83bDeadlineReminder: non-urgent path ──────────────────────────────

  describe('send83bDeadlineReminder - non-urgent', () => {
    it('should not include urgent banner when daysRemaining > 7', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.send83bDeadlineReminder(
        'user@test.com',
        'Eric',
        {
          grantDate: '2026-07-01',
          companyName: 'TechCo',
          shares: 10000,
        },
        20,
        '2026-08-01'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).not.toContain('URGENT');
      expect(html).toContain('20 days');
      expect(html).toContain('TechCo');
      expect(html).toContain('10,000');
      restore();
    });

    it('should include urgent banner when daysRemaining <= 7', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.send83bDeadlineReminder(
        'user@test.com',
        'Fran',
        {
          grantDate: '2026-07-20',
          companyName: 'StartupCo',
          shares: 5000,
        },
        3,
        '2026-08-19'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('URGENT');
      expect(html).toContain('3 days');
      restore();
    });

    it('should use singular "day" when daysRemaining === 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.send83bDeadlineReminder(
        'user@test.com',
        null,
        {
          grantDate: '2026-08-22',
          shares: 100,
        },
        1,
        '2026-08-23'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('1 day remaining');
      const subject = sendMailMock.mock.calls[0][0].subject;
      expect(subject).toContain('1 Day');
      restore();
    });
  });

  // ── sendOnboardingComplete: content checks ────────────────────────────────

  describe('sendOnboardingComplete', () => {
    it('should include company name and next steps', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendOnboardingComplete({
        to: 'admin@test.com',
        firstName: 'George',
        companyName: 'NewCo',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.subject).toContain('NewCo');
      expect(call.html).toContain('George');
      expect(call.html).toContain('NewCo');
      expect(call.html).toContain('Add stakeholders');
      restore();
    });

    it('should use fallbacks when firstName and companyName are missing', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendOnboardingComplete({ to: 'admin@test.com' });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Hi there');
      expect(html).toContain('your company');
      restore();
    });
  });

  // ── sendEmailVerification: with firstName ─────────────────────────────────

  describe('sendEmailVerification - with firstName', () => {
    it('should include the first name in the greeting', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendEmailVerification({
        to: 'user@test.com',
        firstName: 'Hannah',
        verificationUrl: 'https://example.com/verify?token=abc',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Hi Hannah');
      expect(html).toContain('verify?token=abc');
      restore();
    });
  });

  // ── sendClerkyDocumentNotification: singular record ───────────────────────

  describe('sendClerkyDocumentNotification - singular', () => {
    it('should use singular "record" when count is 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendClerkyDocumentNotification({
        to: 'admin@test.com',
        companyId: 'comp_1',
        documentName: 'Stock Purchase Agreement',
        recordsQueued: 1,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.subject).toContain('1 record ready');
      expect(call.html).toContain('1 record');
      restore();
    });
  });

  // ── send: with custom EMAIL_FROM and FRONTEND_URL ─────────────────────────

  describe('send - with custom env overrides', () => {
    it('should use custom FROM and APP_URL', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({
        RESEND_API_KEY: 'key',
        EMAIL_FROM: 'custom@example.com',
        FRONTEND_URL: 'https://custom.app',
      });

      await svc.sendPasswordReset({
        to: 'user@test.com',
        resetUrl: 'https://custom.app/reset?t=abc',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.from).toBe('custom@example.com');
      restore();
    });
  });
});
