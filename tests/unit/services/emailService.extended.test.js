/**
 * Email Service - Extended Coverage Tests
 *
 * Covers functions not tested in the base emailService.test.js:
 * - sendClerkyDocumentNotification
 * - send83bDeadlineReminder (urgent and non-urgent)
 * - sendOnboardingComplete
 * - sendOnboardingReminder
 */

'use strict';

// ─── Helper ──────────────────────────────────────────────────────────────────

function loadEmailService(env = {}) {
  const saved = {};
  const envKeys = [
    'RESEND_API_KEY',
    'EMAIL_PASS',
    'FRONTEND_URL',
    'EMAIL_FROM',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
  ];
  envKeys.forEach((k) => {
    saved[k] = process.env[k];
    delete process.env[k];
  });
  Object.entries(env).forEach(([k, v]) => {
    process.env[k] = v;
  });

  let svc;
  let sendMailMock;

  jest.isolateModules(() => {
    const nodemailer = require('nodemailer');
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: sendMailMock });
    svc = require('../../../services/emailService');
  });

  envKeys.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  Object.entries(env).forEach(([k, v]) => {
    process.env[k] = v;
  });

  return { emailService: svc, sendMailMock };
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── sendClerkyDocumentNotification ─────────────────────────────────────────

describe('sendClerkyDocumentNotification', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail with correct to and subject', async () => {
    await emailService.sendClerkyDocumentNotification({
      to: 'admin@example.com',
      companyId: 'comp_1',
      documentName: 'Certificate of Incorporation',
      recordsQueued: 5,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe('admin@example.com');
    expect(call.subject).toContain('5 records');
  });

  test('HTML contains document name', async () => {
    await emailService.sendClerkyDocumentNotification({
      to: 'admin@example.com',
      companyId: 'comp_1',
      documentName: 'Stock Purchase Agreement',
      recordsQueued: 3,
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Stock Purchase Agreement');
  });

  test('HTML contains data-rooms link', async () => {
    await emailService.sendClerkyDocumentNotification({
      to: 'admin@example.com',
      companyId: 'comp_1',
      documentName: 'Doc',
      recordsQueued: 1,
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/data-rooms');
  });

  test('handles singular record count in subject', async () => {
    await emailService.sendClerkyDocumentNotification({
      to: 'admin@example.com',
      companyId: 'comp_1',
      documentName: 'Doc',
      recordsQueued: 1,
    });

    const { subject } = sendMailMock.mock.calls[0][0];
    expect(subject).toContain('1 record ');
  });

  test('handles undefined documentName and recordsQueued', async () => {
    await emailService.sendClerkyDocumentNotification({
      to: 'admin@example.com',
      companyId: 'comp_1',
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Unknown');
  });

  test('does not throw when no API key is set', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_PASS;
    const { emailService: svc, sendMailMock: mock } = loadEmailService({});

    await expect(
      svc.sendClerkyDocumentNotification({
        to: 'admin@example.com',
        companyId: 'comp_1',
        documentName: 'Doc',
        recordsQueued: 2,
      })
    ).resolves.toBeUndefined();
    expect(mock).not.toHaveBeenCalled();
  });
});

// ─── send83bDeadlineReminder ────────────────────────────────────────────────

describe('send83bDeadlineReminder', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('sends non-urgent reminder (daysRemaining > 7)', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      'Alice',
      {
        grantDate: '2026-07-01',
        companyName: 'Acme Inc',
        shares: 10000,
      },
      20,
      '2026-08-15'
    );

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe('employee@example.com');
    expect(call.subject).toContain('20 Day');
    expect(call.subject).toContain('Acme Inc');
  });

  test('sends urgent reminder (daysRemaining <= 7)', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      'Bob',
      {
        grantDate: '2026-07-20',
        companyName: 'Startup Co',
        shares: 5000,
      },
      3,
      '2026-08-20'
    );

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('URGENT');
    expect(html).toContain('3 day');
  });

  test('HTML contains grant date and company name', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      'Carol',
      {
        grantDate: '2026-06-15',
        companyName: 'Test Corp',
        shares: 25000,
      },
      14,
      '2026-07-15'
    );

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('Test Corp');
    expect(html).toContain('25,000');
  });

  test('handles missing name gracefully', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      null,
      { grantDate: '2026-07-01', shares: 1000 },
      10,
      '2026-07-31'
    );

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('there');
  });

  test('handles missing companyName gracefully', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      'Dave',
      { grantDate: '2026-07-01', shares: 500 },
      5,
      '2026-07-31'
    );

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('your company');
  });

  test('handles daysRemaining === 1 (singular)', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      'Eve',
      { grantDate: '2026-07-30', companyName: 'LastDay Co', shares: 100 },
      1,
      '2026-07-31'
    );

    const { subject } = sendMailMock.mock.calls[0][0];
    expect(subject).toContain('1 Day');
  });

  test('contains equity-grants link', async () => {
    await emailService.send83bDeadlineReminder(
      'employee@example.com',
      'Frank',
      { grantDate: '2026-07-01', companyName: 'Co', shares: 100 },
      15,
      '2026-07-31'
    );

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/equity-grants');
  });
});

// ─── sendOnboardingComplete ─────────────────────────────────────────────────

describe('sendOnboardingComplete', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail with correct to and subject', async () => {
    await emailService.sendOnboardingComplete({
      to: 'founder@example.com',
      firstName: 'Grace',
      companyName: 'NewCo',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe('founder@example.com');
    expect(call.subject).toContain('NewCo');
    expect(call.subject).toContain('live');
  });

  test('HTML contains company name and dashboard link', async () => {
    await emailService.sendOnboardingComplete({
      to: 'founder@example.com',
      firstName: 'Grace',
      companyName: 'NewCo',
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('NewCo');
    expect(html).toContain('/dashboard');
  });

  test('handles missing firstName and companyName', async () => {
    await emailService.sendOnboardingComplete({
      to: 'founder@example.com',
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('there');
    expect(html).toContain('your company');
  });
});

// ─── sendOnboardingReminder ─────────────────────────────────────────────────

describe('sendOnboardingReminder', () => {
  let emailService;
  let sendMailMock;

  beforeEach(() => {
    ({ emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' }));
  });

  test('calls sendMail with correct to', async () => {
    await emailService.sendOnboardingReminder({
      to: 'user@example.com',
      firstName: 'Hank',
      daysAgo: 3,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].to).toBe('user@example.com');
  });

  test('HTML contains company-setup link', async () => {
    await emailService.sendOnboardingReminder({
      to: 'user@example.com',
      firstName: 'Hank',
      daysAgo: 5,
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('/company-setup');
  });

  test('subject contains user first name', async () => {
    await emailService.sendOnboardingReminder({
      to: 'user@example.com',
      firstName: 'Ivy',
      daysAgo: 7,
    });

    const { subject } = sendMailMock.mock.calls[0][0];
    expect(subject).toContain('Ivy');
  });

  test('HTML contains days ago', async () => {
    await emailService.sendOnboardingReminder({
      to: 'user@example.com',
      firstName: 'Jack',
      daysAgo: 2,
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('2 days ago');
  });

  test('handles singular daysAgo', async () => {
    await emailService.sendOnboardingReminder({
      to: 'user@example.com',
      firstName: 'Kate',
      daysAgo: 1,
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('1 day ago');
  });

  test('handles missing firstName', async () => {
    await emailService.sendOnboardingReminder({
      to: 'user@example.com',
      daysAgo: 4,
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('there');
  });
});
