'use strict';

/**
 * Tests for SPV invite email sending (Issue #754)
 */

function loadEmailService(env = {}) {
  const saved = {};
  const envKeys = ['RESEND_API_KEY', 'EMAIL_PASS', 'FRONTEND_URL', 'EMAIL_FROM'];
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

  envKeys.forEach(k => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  Object.entries(env).forEach(([k, v]) => { process.env[k] = v; });

  return { emailService: svc, sendMailMock };
}

afterEach(() => jest.restoreAllMocks());

describe('sendSPVInvite', () => {
  it('sends email with SPV name, invite link, and founder info', async () => {
    const { emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' });

    await emailService.sendSPVInvite({
      to: 'investor@test.com',
      spvName: 'Alpha Fund I',
      inviteLink: 'https://opencapstack.com/spv/join/abc123',
      founderName: 'Jane Doe',
      companyName: 'AcmeCorp',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe('investor@test.com');
    expect(call.subject).toContain('Alpha Fund I');
    expect(call.subject).toContain('AcmeCorp');
    expect(call.html).toContain('Alpha Fund I');
    expect(call.html).toContain('Jane Doe');
    expect(call.html).toContain('AcmeCorp');
    expect(call.html).toContain('https://opencapstack.com/spv/join/abc123');
  });

  it('includes custom message when provided', async () => {
    const { emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' });

    await emailService.sendSPVInvite({
      to: 'lp@test.com',
      spvName: 'Beta Fund',
      inviteLink: 'https://opencapstack.com/spv/join/xyz',
      message: 'Excited to have you join us!',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].html).toContain('Excited to have you join us!');
  });

  it('skips gracefully when no RESEND_API_KEY is set', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_PASS;
    const { emailService, sendMailMock } = loadEmailService({});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await emailService.sendSPVInvite({
      to: 'lp@test.com',
      spvName: 'Gamma Fund',
      inviteLink: 'https://example.com',
    });

    expect(sendMailMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('uses fallback values when optional fields are missing', async () => {
    const { emailService, sendMailMock } = loadEmailService({ RESEND_API_KEY: 'test-key' });

    await emailService.sendSPVInvite({
      to: 'lp@test.com',
      inviteLink: 'https://example.com',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const html = sendMailMock.mock.calls[0][0].html;
    expect(html).toContain('an SPV');
    expect(html).toContain('The team');
    expect(html).toContain('a company');
  });
});
