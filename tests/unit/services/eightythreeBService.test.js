'use strict';

/**
 * 83(b) Election Service Test Suite
 * Issue #667: 83(b) deadline tracking and automated email reminders
 *
 * Tests:
 * - Deadline calculation (grant date + 30 days)
 * - Status determination (filed, expired, urgent, pending)
 * - Status retrieval for a company's grants
 * - Mark grant as filed
 * - Manual reminder dispatch
 * - Automated reminder check with schedule tracking
 */

// Mock dependencies before requiring the module under test
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../../services/emailService', () => ({
  send83bDeadlineReminder: jest.fn().mockResolvedValue(undefined),
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const emailService = require('../../../services/emailService');
const eightythreeBService = require('../../../services/eightythreeBService');

describe('eightythreeBService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── calculate83bDeadline ────────────────────────────────────────────────────

  describe('calculate83bDeadline', () => {
    it('should return a date 30 calendar days after the grant date', () => {
      const grantDate = '2026-05-01';
      const deadline = eightythreeBService.calculate83bDeadline(grantDate);
      expect(deadline).toEqual(new Date('2026-05-31'));
    });

    it('should handle Date objects as input', () => {
      const grantDate = new Date('2026-01-15');
      const deadline = eightythreeBService.calculate83bDeadline(grantDate);
      expect(deadline).toEqual(new Date('2026-02-14'));
    });

    it('should handle month boundaries correctly', () => {
      const deadline = eightythreeBService.calculate83bDeadline('2026-01-31');
      // Jan 31 + 30 = Mar 2
      expect(deadline).toEqual(new Date('2026-03-02'));
    });

    it('should throw for invalid date input', () => {
      expect(() => eightythreeBService.calculate83bDeadline('not-a-date')).toThrow('Invalid grant date');
    });
  });

  // ── determineStatus ─────────────────────────────────────────────────────────

  describe('determineStatus', () => {
    it('should return "filed" when grant is marked as filed', () => {
      const grant = { eightythreeBFiled: true };
      const status = eightythreeBService.determineStatus(grant, new Date(), 15);
      expect(status).toBe('filed');
    });

    it('should return "expired" when daysRemaining is negative', () => {
      const grant = {};
      const status = eightythreeBService.determineStatus(grant, new Date(), -1);
      expect(status).toBe('expired');
    });

    it('should return "urgent" when 7 or fewer days remain', () => {
      const grant = {};
      expect(eightythreeBService.determineStatus(grant, new Date(), 7)).toBe('urgent');
      expect(eightythreeBService.determineStatus(grant, new Date(), 1)).toBe('urgent');
      expect(eightythreeBService.determineStatus(grant, new Date(), 0)).toBe('urgent');
    });

    it('should return "pending" when more than 7 days remain', () => {
      const grant = {};
      expect(eightythreeBService.determineStatus(grant, new Date(), 8)).toBe('pending');
      expect(eightythreeBService.determineStatus(grant, new Date(), 25)).toBe('pending');
    });
  });

  // ── get83bStatus ────────────────────────────────────────────────────────────

  describe('get83bStatus', () => {
    it('should throw if companyId is missing', async () => {
      await expect(eightythreeBService.get83bStatus()).rejects.toThrow('companyId is required');
    });

    it('should return empty array when no grants exist', async () => {
      databaseAdapter.find.mockResolvedValueOnce([]);
      const result = await eightythreeBService.get83bStatus('company-1');
      expect(result).toEqual([]);
    });

    it('should return status for each grant with stakeholder data joined', async () => {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 5); // grant date 5 days ago means 25 days left
      const grantDate = new Date(now);
      grantDate.setDate(grantDate.getDate() - 5);

      databaseAdapter.find
        .mockResolvedValueOnce([
          {
            _id: 'grant-1',
            stakeholderId: 'sh-1',
            grantDate: grantDate.toISOString(),
            numberOfShares: 10000,
            companyId: 'company-1',
            remindersSent: [25],
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: 'sh-1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            companyId: 'company-1',
          },
        ]);

      const result = await eightythreeBService.get83bStatus('company-1');

      expect(result).toHaveLength(1);
      expect(result[0].grantId).toBe('grant-1');
      expect(result[0].stakeholderName).toBe('Jane Doe');
      expect(result[0].stakeholderEmail).toBe('jane@example.com');
      expect(result[0].shares).toBe(10000);
      expect(result[0].status).toBe('pending');
      expect(result[0].daysRemaining).toBeGreaterThan(0);
      expect(result[0].remindersSent).toEqual([25]);
    });

    it('should skip grants without a grantDate', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([{ _id: 'grant-no-date', stakeholderId: 'sh-1' }])
        .mockResolvedValueOnce([]);

      const result = await eightythreeBService.get83bStatus('company-1');
      expect(result).toHaveLength(0);
    });
  });

  // ── mark83bFiled ────────────────────────────────────────────────────────────

  describe('mark83bFiled', () => {
    it('should throw if grantId is missing', async () => {
      await expect(eightythreeBService.mark83bFiled()).rejects.toThrow('grantId is required');
    });

    it('should update the grant record with filed status', async () => {
      databaseAdapter.findOne.mockResolvedValueOnce({ _id: 'grant-1', numberOfShares: 5000 });
      databaseAdapter.update.mockResolvedValueOnce({ _id: 'grant-1', eightythreeBFiled: true });

      const result = await eightythreeBService.mark83bFiled('grant-1');

      expect(databaseAdapter.update).toHaveBeenCalledWith(
        'EquityGrant',
        { _id: 'grant-1' },
        expect.objectContaining({ eightythreeBFiled: true })
      );
      expect(result.eightythreeBFiled).toBe(true);
    });

    it('should fall back to row_id lookup if _id lookup returns null', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(null) // _id lookup fails
        .mockResolvedValueOnce({ row_id: 'grant-1', numberOfShares: 5000 }); // row_id lookup succeeds
      databaseAdapter.update.mockResolvedValueOnce({ row_id: 'grant-1', eightythreeBFiled: true });

      const result = await eightythreeBService.mark83bFiled('grant-1');

      expect(databaseAdapter.update).toHaveBeenCalledWith(
        'EquityGrant',
        { row_id: 'grant-1' },
        expect.objectContaining({ eightythreeBFiled: true })
      );
      expect(result.eightythreeBFiled).toBe(true);
    });

    it('should throw when grant is not found by either ID field', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(eightythreeBService.mark83bFiled('nonexistent')).rejects.toThrow('Equity grant not found');
    });
  });

  // ── sendManualReminder ──────────────────────────────────────────────────────

  describe('sendManualReminder', () => {
    it('should throw if stakeholderId or grantId missing', async () => {
      await expect(eightythreeBService.sendManualReminder(null, 'g1')).rejects.toThrow();
      await expect(eightythreeBService.sendManualReminder('s1', null)).rejects.toThrow();
    });

    it('should send reminder email and return result', async () => {
      const grantDate = new Date();
      grantDate.setDate(grantDate.getDate() - 10); // 20 days remaining

      databaseAdapter.findOne
        .mockResolvedValueOnce({
          _id: 'grant-1',
          grantDate: grantDate.toISOString(),
          numberOfShares: 5000,
          companyName: 'Acme Inc',
          stakeholderId: 'sh-1',
        })
        .mockResolvedValueOnce({
          _id: 'sh-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
        });

      const result = await eightythreeBService.sendManualReminder('sh-1', 'grant-1');

      expect(emailService.send83bDeadlineReminder).toHaveBeenCalledWith(
        'john@example.com',
        'John Smith',
        expect.objectContaining({ shares: 5000, companyName: 'Acme Inc' }),
        expect.any(Number),
        expect.any(Date)
      );
      expect(result.success).toBe(true);
      expect(result.email).toBe('john@example.com');
    });

    it('should throw when stakeholder has no email', async () => {
      databaseAdapter.findOne
        .mockResolvedValueOnce({ _id: 'grant-1', grantDate: '2026-05-01', stakeholderId: 'sh-1' })
        .mockResolvedValueOnce({ _id: 'sh-1', firstName: 'No', lastName: 'Email' });

      await expect(
        eightythreeBService.sendManualReminder('sh-1', 'grant-1')
      ).rejects.toThrow('Stakeholder has no email address');
    });
  });

  // ── checkAndSendReminders ───────────────────────────────────────────────────

  describe('checkAndSendReminders', () => {
    it('should return 0 when no unfiled grants exist', async () => {
      databaseAdapter.find.mockResolvedValueOnce([]);
      const count = await eightythreeBService.checkAndSendReminders();
      expect(count).toBe(0);
    });

    it('should send reminders for grants within schedule thresholds', async () => {
      const now = new Date();
      const grantDate = new Date(now);
      grantDate.setDate(grantDate.getDate() - 17); // 13 days remaining
      // With 13 days remaining, the first threshold hit iterating [25,14,7,3,1] is 25 (13 <= 25)

      databaseAdapter.find
        .mockResolvedValueOnce([
          {
            _id: 'grant-1',
            stakeholderId: 'sh-1',
            grantDate: grantDate.toISOString(),
            numberOfShares: 1000,
            companyName: 'TestCo',
            remindersSent: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: 'sh-1',
            firstName: 'Alice',
            lastName: 'Wonder',
            email: 'alice@example.com',
          },
        ]);

      databaseAdapter.update.mockResolvedValueOnce({});

      const count = await eightythreeBService.checkAndSendReminders();

      expect(count).toBe(1);
      expect(emailService.send83bDeadlineReminder).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.update).toHaveBeenCalledWith(
        'EquityGrant',
        { _id: 'grant-1' },
        { remindersSent: [25] }
      );
    });

    it('should not re-send a reminder that was already sent', async () => {
      const now = new Date();
      const grantDate = new Date(now);
      grantDate.setDate(grantDate.getDate() - 17); // 13 days remaining

      databaseAdapter.find
        .mockResolvedValueOnce([
          {
            _id: 'grant-1',
            stakeholderId: 'sh-1',
            grantDate: grantDate.toISOString(),
            numberOfShares: 1000,
            remindersSent: [25, 14], // 14-day already sent
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'sh-1', email: 'alice@example.com' },
        ]);

      const count = await eightythreeBService.checkAndSendReminders();

      expect(count).toBe(0);
      expect(emailService.send83bDeadlineReminder).not.toHaveBeenCalled();
    });

    it('should skip grants where deadline has already passed', async () => {
      const now = new Date();
      const grantDate = new Date(now);
      grantDate.setDate(grantDate.getDate() - 35); // expired

      databaseAdapter.find
        .mockResolvedValueOnce([
          {
            _id: 'grant-expired',
            stakeholderId: 'sh-1',
            grantDate: grantDate.toISOString(),
            remindersSent: [],
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'sh-1', email: 'user@example.com' },
        ]);

      const count = await eightythreeBService.checkAndSendReminders();
      expect(count).toBe(0);
    });

    it('should skip stakeholders without email addresses', async () => {
      const now = new Date();
      const grantDate = new Date(now);
      grantDate.setDate(grantDate.getDate() - 5); // 25 days remaining

      databaseAdapter.find
        .mockResolvedValueOnce([
          {
            _id: 'grant-1',
            stakeholderId: 'sh-noemail',
            grantDate: grantDate.toISOString(),
            remindersSent: [],
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'sh-noemail', firstName: 'No', lastName: 'Email' },
        ]);

      const count = await eightythreeBService.checkAndSendReminders();
      expect(count).toBe(0);
    });
  });

  // ── Constants ───────────────────────────────────────────────────────────────

  describe('constants', () => {
    it('should export REMINDER_SCHEDULE with correct thresholds', () => {
      expect(eightythreeBService.REMINDER_SCHEDULE).toEqual([25, 14, 7, 3, 1]);
    });

    it('should export DEADLINE_DAYS as 30', () => {
      expect(eightythreeBService.DEADLINE_DAYS).toBe(30);
    });
  });
});
