/**
 * Email Service - Gap Coverage Tests
 *
 * Targets uncovered branch conditions:
 * - sendWelcome: role === 'service_provider' (line 110/119)
 * - sendServiceProviderInvite: no engagementType (line 165)
 * - sendReportReleased: no signedBy (line 194)
 * - sendAccountantQueueNotification: empty accountantEmails (line 214)
 * - send83bDeadlineReminder: daysRemaining === 1 (singular) (line 277)
 * - sendClerkyDocumentNotification: count === 1 (singular)
 * - send: no FROM override, default APP_URL
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

describe('Email Service - Gap Coverage', () => {
  // ─── sendWelcome: service_provider role ─────────────────────────────────────

  describe('sendWelcome - service_provider role', () => {
    it('should send welcome with service_provider specific content', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendWelcome({
        to: 'sp@test.com',
        firstName: 'Dana',
        role: 'service_provider',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('service provider');
      expect(html).toContain('scoped access');
      restore();
    });
  });

  // ─── sendWelcome: employee role ─────────────────────────────────────────────

  describe('sendWelcome - employee role', () => {
    it('should send welcome with employee-specific content', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendWelcome({
        to: 'emp@test.com',
        firstName: 'Eve',
        role: 'employee',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('equity grants');
      expect(html).toContain('vesting schedule');
      restore();
    });
  });

  // ─── sendWelcome: default role (not employee, not service_provider) ─────────

  describe('sendWelcome - default role', () => {
    it('should send welcome with default content for founders/admins', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendWelcome({
        to: 'founder@test.com',
        firstName: 'Fred',
        role: 'founder',
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('full suite');
      restore();
    });
  });

  // ─── sendServiceProviderInvite: no engagementType ───────────────────────────

  describe('sendServiceProviderInvite - missing engagementType', () => {
    it('should default to "Service Provider" label when no engagementType', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendServiceProviderInvite({
        to: 'sp@test.com',
        firstName: 'Sam',
        companyName: 'TestCo',
        inviteToken: 'tok_123',
        // no engagementType
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Service Provider');
      restore();
    });

    it('should capitalize engagementType when provided', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendServiceProviderInvite({
        to: 'sp@test.com',
        firstName: 'Sam',
        companyName: 'TestCo',
        inviteToken: 'tok_123',
        engagementType: 'legal',
      });

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Legal');
      restore();
    });
  });

  // ─── sendReportReleased: no signedBy ────────────────────────────────────────

  describe('sendReportReleased - no signedBy', () => {
    it('should omit signer line when signedBy is not provided', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendReportReleased({
        to: 'admin@test.com',
        companyId: 'comp-1',
        valuationId: 'val-1',
        fmv: 1.2345,
        // no signedBy
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('$1.2345');
      expect(html).not.toContain('Reviewed');
      restore();
    });

    it('should include signer line when signedBy is provided', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendReportReleased({
        to: 'admin@test.com',
        companyId: 'comp-1',
        valuationId: 'val-1',
        fmv: 2.5,
        signedBy: 'John CPA',
      });

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('John CPA');
      restore();
    });
  });

  // ─── sendAccountantQueueNotification: empty emails ──────────────────────────

  describe('sendAccountantQueueNotification - empty array', () => {
    it('should return early when accountantEmails is empty', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendAccountantQueueNotification({
        accountantEmails: [],
        companyId: 'comp-1',
        valuationId: 'val-1',
        fmv: 1.0,
      });

      expect(sendMailMock).not.toHaveBeenCalled();
      restore();
    });

    it('should return early when accountantEmails is undefined', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendAccountantQueueNotification({
        companyId: 'comp-1',
        valuationId: 'val-1',
        fmv: 1.0,
      });

      expect(sendMailMock).not.toHaveBeenCalled();
      restore();
    });
  });

  // ─── send83bDeadlineReminder: singular day ──────────────────────────────────

  describe('send83bDeadlineReminder - singular day', () => {
    it('should use singular "day" when daysRemaining is 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.send83bDeadlineReminder(
        'user@test.com',
        'Alice',
        {
          grantDate: '2026-07-01',
          companyName: 'TestCo',
          shares: 10000,
        },
        1, // daysRemaining
        '2026-07-31'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const subject = sendMailMock.mock.calls[0][0].subject;
      expect(subject).toContain('1 Day');
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('1 day remaining');
      expect(html).toContain('URGENT');
      restore();
    });

    it('should use plural "days" when daysRemaining > 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.send83bDeadlineReminder(
        'user@test.com',
        null, // no name
        {
          grantDate: '2026-07-01',
          // no companyName
          shares: 0,
        },
        15,
        '2026-07-31'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const subject = sendMailMock.mock.calls[0][0].subject;
      expect(subject).toContain('15 Days');
      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).not.toContain('URGENT');
      restore();
    });

    it('should show urgent banner when daysRemaining <= 7', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.send83bDeadlineReminder(
        'user@test.com',
        'Bob',
        { grantDate: '2026-07-01', companyName: 'Co', shares: 5000 },
        7,
        '2026-07-31'
      );

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('URGENT');
      expect(html).toContain('7 days remaining');
      restore();
    });
  });

  // ─── sendClerkyDocumentNotification: count === 1 (singular) ─────────────────

  describe('sendClerkyDocumentNotification - singular record', () => {
    it('should use singular "record" when count is 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendClerkyDocumentNotification({
        to: 'admin@test.com',
        companyId: 'comp-1',
        documentName: 'Certificate of Incorporation',
        recordsQueued: 1,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const subject = sendMailMock.mock.calls[0][0].subject;
      expect(subject).toContain('1 record ready');
      restore();
    });
  });

  // ─── sendOnboardingReminder: singular day ───────────────────────────────────

  describe('sendOnboardingReminder - singular', () => {
    it('should use singular "day" when daysAgo is 1', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendOnboardingReminder({
        to: 'user@test.com',
        firstName: 'Zia',
        daysAgo: 1,
      });

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('1 day ago');
      restore();
    });
  });

  // ─── send: no credentials skips gracefully ──────────────────────────────────

  describe('send - no credentials', () => {
    it('should skip sending when no API key or password is set', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({});

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await svc.sendPasswordReset({ to: 'x@test.com', resetUrl: 'http://reset' });

      expect(sendMailMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No RESEND_API_KEY set')
      );
      warnSpy.mockRestore();
      restore();
    });
  });

  // ─── sendWelcome/sendEmployeeInvite: no firstName defaults ──────────────────

  describe('name defaults', () => {
    it('sendWelcome should default to "there" when no firstName', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendWelcome({ to: 'x@test.com', role: 'admin' });

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('Hi there');
      restore();
    });

    it('sendEmployeeInvite with no companyName should default', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendEmployeeInvite({
        to: 'emp@test.com',
        firstName: 'Joe',
        inviteToken: 'tok_1',
        // no companyName
      });

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('your company');
      restore();
    });

    it('sendServiceProviderInvite with no companyName should default', async () => {
      const { svc, sendMailMock, restore } = loadEmailService({ RESEND_API_KEY: 'key' });

      await svc.sendServiceProviderInvite({
        to: 'sp@test.com',
        firstName: 'SP',
        inviteToken: 'tok_1',
        // no companyName
      });

      const html = sendMailMock.mock.calls[0][0].html;
      expect(html).toContain('a company');
      restore();
    });
  });
});
