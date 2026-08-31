'use strict';

/**
 * Tests for SPV notification email functions
 * Issue #752: Investor notification emails for SPV lifecycle events
 */

// Mock nodemailer before requiring the service
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Set env vars so the send function actually attempts delivery
process.env.EMAIL_PASS = 'test-resend-key';
process.env.FRONTEND_URL = 'https://test.opencapstack.com';

const {
  sendSPVStatusUpdate,
  sendCommitmentConfirmation,
  sendWireInstructionsEmail,
  sendCapitalCallNotice,
} = require('../../../services/emailService');

describe('SPV Notification Emails', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // sendSPVStatusUpdate
  // ──────────────────────────────────────────────────────────────────────────

  describe('sendSPVStatusUpdate', () => {
    const spv = { Name: 'Acme SPV', SPVID: 'spv-001', Status: 'raising' };

    test('sends status update email to each investor', async () => {
      const investors = [
        { email: 'lp1@example.com', name: 'Alice' },
        { email: 'lp2@example.com', name: 'Bob' },
      ];

      await sendSPVStatusUpdate(investors, spv, 'closing');

      expect(mockSendMail).toHaveBeenCalledTimes(2);

      const firstCall = mockSendMail.mock.calls[0][0];
      expect(firstCall.to).toBe('lp1@example.com');
      expect(firstCall.subject).toContain('Acme SPV');
      expect(firstCall.subject).toContain('Closing');
      expect(firstCall.html).toContain('Alice');
      expect(firstCall.html).toContain('Acme SPV');
      expect(firstCall.html).toContain('Closing');
      expect(firstCall.html).toContain('spv-001');

      const secondCall = mockSendMail.mock.calls[1][0];
      expect(secondCall.to).toBe('lp2@example.com');
      expect(secondCall.html).toContain('Bob');
    });

    test('skips when investors array is empty', async () => {
      await sendSPVStatusUpdate([], spv, 'closing');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('skips when investors is null or undefined', async () => {
      await sendSPVStatusUpdate(null, spv, 'closing');
      expect(mockSendMail).not.toHaveBeenCalled();

      await sendSPVStatusUpdate(undefined, spv, 'closing');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('skips investors without an email', async () => {
      const investors = [
        { name: 'No Email' },
        { email: 'valid@example.com', name: 'Valid' },
      ];

      await sendSPVStatusUpdate(investors, spv, 'raising');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail.mock.calls[0][0].to).toBe('valid@example.com');
    });

    test('formats underscored status labels correctly', async () => {
      const investors = [{ email: 'lp@example.com', name: 'Carol' }];

      await sendSPVStatusUpdate(investors, spv, 'in_review');

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('In Review');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // sendCommitmentConfirmation
  // ──────────────────────────────────────────────────────────────────────────

  describe('sendCommitmentConfirmation', () => {
    const spv = { Name: 'Growth Fund SPV', SPVID: 'spv-002' };

    test('sends confirmation with committed amount', async () => {
      const investor = {
        email: 'investor@example.com',
        name: 'Diana',
        committedAmount: 50000,
      };

      await sendCommitmentConfirmation(investor, spv);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('investor@example.com');
      expect(call.subject).toContain('Growth Fund SPV');
      expect(call.html).toContain('Diana');
      expect(call.html).toContain('50,000');
      expect(call.html).toContain('spv-002');
    });

    test('skips when investor is null', async () => {
      await sendCommitmentConfirmation(null, spv);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('skips when investor has no email', async () => {
      await sendCommitmentConfirmation({ name: 'No Email' }, spv);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('displays N/A when committedAmount is not provided', async () => {
      const investor = { email: 'test@example.com', name: 'Eve' };

      await sendCommitmentConfirmation(investor, spv);

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('N/A');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // sendWireInstructionsEmail
  // ──────────────────────────────────────────────────────────────────────────

  describe('sendWireInstructionsEmail', () => {
    const spv = { Name: 'Wire SPV', SPVID: 'spv-003' };
    const wireInstructions = {
      bankName: 'Silicon Valley Bank',
      routingNumber: '121000248',
      accountNumber: '9876543210',
      swiftCode: 'SVBKUS6S',
      wireReference: 'SPV003-INV-001',
      specialInstructions: 'Include investor ID',
    };

    test('sends wire instructions with all fields', async () => {
      const investor = {
        email: 'frank@example.com',
        name: 'Frank',
        committedAmount: 100000,
      };

      await sendWireInstructionsEmail(investor, spv, wireInstructions);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('frank@example.com');
      expect(call.subject).toContain('Wire SPV');
      expect(call.html).toContain('Silicon Valley Bank');
      expect(call.html).toContain('121000248');
      expect(call.html).toContain('9876543210');
      expect(call.html).toContain('SVBKUS6S');
      expect(call.html).toContain('SPV003-INV-001');
      expect(call.html).toContain('Include investor ID');
      expect(call.html).toContain('100,000');
    });

    test('skips when wireInstructions is null', async () => {
      const investor = { email: 'test@example.com', name: 'Test' };
      await sendWireInstructionsEmail(investor, spv, null);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('skips when investor has no email', async () => {
      await sendWireInstructionsEmail({ name: 'No Email' }, spv, wireInstructions);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('handles missing optional wire fields gracefully', async () => {
      const investor = { email: 'grace@example.com', name: 'Grace', committedAmount: 25000 };
      const minimalWire = { bankName: 'Test Bank', routingNumber: '000', accountNumber: '111' };

      await sendWireInstructionsEmail(investor, spv, minimalWire);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('Test Bank');
      // Should NOT contain SWIFT or special instructions sections
      expect(html).not.toContain('SWIFT Code');
      expect(html).not.toContain('Special Instructions');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // sendCapitalCallNotice
  // ──────────────────────────────────────────────────────────────────────────

  describe('sendCapitalCallNotice', () => {
    const spv = { Name: 'Capital SPV', SPVID: 'spv-004' };

    test('sends capital call notice to all investors', async () => {
      const investors = [
        { email: 'henry@example.com', name: 'Henry' },
        { email: 'irene@example.com', name: 'Irene' },
      ];

      await sendCapitalCallNotice(investors, spv, 500000);

      expect(mockSendMail).toHaveBeenCalledTimes(2);

      const firstCall = mockSendMail.mock.calls[0][0];
      expect(firstCall.to).toBe('henry@example.com');
      expect(firstCall.subject).toContain('Capital SPV');
      expect(firstCall.html).toContain('Henry');
      expect(firstCall.html).toContain('500,000');
      expect(firstCall.html).toContain('spv-004');

      const secondCall = mockSendMail.mock.calls[1][0];
      expect(secondCall.to).toBe('irene@example.com');
    });

    test('skips when investors array is empty', async () => {
      await sendCapitalCallNotice([], spv, 100000);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('skips when investors is null', async () => {
      await sendCapitalCallNotice(null, spv, 100000);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('displays N/A when amount is not provided', async () => {
      const investors = [{ email: 'test@example.com', name: 'Test' }];

      await sendCapitalCallNotice(investors, spv, null);

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('N/A');
    });
  });
});
