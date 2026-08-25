/**
 * InviteManagement Model Unit Tests
 * Tests the actual ZeroDB-based invitemanagement model with mocked service layer
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const InviteManagement = require('../../../models/invitemanagement');
const zerodbService = require('../../../services/zerodbService');

describe('InviteManagement Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    zerodbService.queryTable.mockImplementation((tableName, { filter = {}, limit } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      const totalCount = results.length;
      if (limit) {
        results = results.slice(0, limit);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: totalCount
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.deleteRowById.mockImplementation(() => Promise.resolve({ deleted: true }));
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose VALID_STATUSES', () => {
      expect(InviteManagement.VALID_STATUSES).toEqual(['Pending', 'Accepted', 'Declined']);
    });
  });

  // ─── create() ───────────────────────────────────────────────

  describe('create()', () => {
    it('should create an invite with valid data', async () => {
      const result = await InviteManagement.create({
        InviteID: 'INV_001',
        ReceiverID: 'RCV_001'
      });

      expect(result).toBeDefined();
      expect(result.InviteID).toBe('INV_001');
      expect(result.ReceiverID).toBe('RCV_001');
      expect(result.Status).toBe('Pending');
    });

    it('should apply default Status of Pending', async () => {
      const result = await InviteManagement.create({
        InviteID: 'INV_DEF',
        ReceiverID: 'RCV_DEF'
      });
      expect(result.Status).toBe('Pending');
    });

    it('should apply default Timestamp', async () => {
      const result = await InviteManagement.create({
        InviteID: 'INV_TS',
        ReceiverID: 'RCV_TS'
      });
      expect(result.Timestamp).toBeDefined();
    });

    it('should allow overriding Status', async () => {
      const result = await InviteManagement.create({
        InviteID: 'INV_ACC',
        ReceiverID: 'RCV_ACC',
        Status: 'Accepted'
      });
      expect(result.Status).toBe('Accepted');
    });

    it('should throw when InviteID is missing', async () => {
      await expect(InviteManagement.create({
        ReceiverID: 'RCV_001'
      })).rejects.toThrow('InviteID is required');
    });

    it('should throw when ReceiverID is missing', async () => {
      await expect(InviteManagement.create({
        InviteID: 'INV_001'
      })).rejects.toThrow('ReceiverID is required');
    });

    it('should throw for invalid Status', async () => {
      await expect(InviteManagement.create({
        InviteID: 'INV_BAD',
        ReceiverID: 'RCV_BAD',
        Status: 'InvalidStatus'
      })).rejects.toThrow('Invalid Status: InvalidStatus');
    });
  });

  // ─── findByInviteId() ──────────────────────────────────────

  describe('findByInviteId()', () => {
    it('should find an invite by InviteID', async () => {
      await InviteManagement.create({
        InviteID: 'INV_FIND',
        ReceiverID: 'RCV_FIND'
      });

      const found = await InviteManagement.findByInviteId('INV_FIND');
      expect(found).toBeDefined();
      expect(found.InviteID).toBe('INV_FIND');
    });

    it('should return null for non-existent InviteID', async () => {
      const found = await InviteManagement.findByInviteId('INV_NONEXISTENT');
      expect(found).toBeNull();
    });
  });

  // ─── findByReceiverId() ────────────────────────────────────

  describe('findByReceiverId()', () => {
    beforeEach(async () => {
      await InviteManagement.create({ InviteID: 'INV_R1', ReceiverID: 'RCV_A' });
      await InviteManagement.create({ InviteID: 'INV_R2', ReceiverID: 'RCV_A' });
      await InviteManagement.create({ InviteID: 'INV_R3', ReceiverID: 'RCV_B' });
    });

    it('should find invites by ReceiverID', async () => {
      const results = await InviteManagement.findByReceiverId('RCV_A');
      expect(results.length).toBe(2);
    });

    it('should return empty array for unknown ReceiverID', async () => {
      const results = await InviteManagement.findByReceiverId('RCV_NONE');
      expect(results).toEqual([]);
    });
  });

  // ─── findByStatus() ────────────────────────────────────────

  describe('findByStatus()', () => {
    beforeEach(async () => {
      await InviteManagement.create({ InviteID: 'INV_S1', ReceiverID: 'R1', Status: 'Pending' });
      await InviteManagement.create({ InviteID: 'INV_S2', ReceiverID: 'R2', Status: 'Accepted' });
      await InviteManagement.create({ InviteID: 'INV_S3', ReceiverID: 'R3', Status: 'Pending' });
    });

    it('should find invites by status', async () => {
      const results = await InviteManagement.findByStatus('Pending');
      expect(results.length).toBe(2);
    });

    it('should throw for invalid status', async () => {
      await expect(InviteManagement.findByStatus('Invalid'))
        .rejects.toThrow('Invalid status: Invalid');
    });

    it('should find accepted invites', async () => {
      const results = await InviteManagement.findByStatus('Accepted');
      expect(results.length).toBe(1);
    });

    it('should return empty for unused status', async () => {
      const results = await InviteManagement.findByStatus('Declined');
      expect(results).toEqual([]);
    });
  });

  // ─── acceptInvite() ────────────────────────────────────────

  describe('acceptInvite()', () => {
    it('should accept a pending invite', async () => {
      await InviteManagement.create({
        InviteID: 'INV_ACCEPT',
        ReceiverID: 'RCV_ACCEPT'
      });

      const result = await InviteManagement.acceptInvite('INV_ACCEPT');
      expect(result).toBeDefined();
    });

    it('should throw when invite not found', async () => {
      await expect(InviteManagement.acceptInvite('INV_NOTFOUND'))
        .rejects.toThrow('Invite not found');
    });

    it('should throw when invite is not Pending', async () => {
      await InviteManagement.create({
        InviteID: 'INV_ALREADY',
        ReceiverID: 'RCV_A',
        Status: 'Accepted'
      });

      await expect(InviteManagement.acceptInvite('INV_ALREADY'))
        .rejects.toThrow('Cannot accept invite with status: Accepted');
    });

    it('should throw when trying to accept a declined invite', async () => {
      await InviteManagement.create({
        InviteID: 'INV_DECLINED',
        ReceiverID: 'RCV_D',
        Status: 'Declined'
      });

      await expect(InviteManagement.acceptInvite('INV_DECLINED'))
        .rejects.toThrow('Cannot accept invite with status: Declined');
    });
  });

  // ─── declineInvite() ───────────────────────────────────────

  describe('declineInvite()', () => {
    it('should decline a pending invite', async () => {
      await InviteManagement.create({
        InviteID: 'INV_DECLINE',
        ReceiverID: 'RCV_DECLINE'
      });

      const result = await InviteManagement.declineInvite('INV_DECLINE');
      expect(result).toBeDefined();
    });

    it('should throw when invite not found', async () => {
      await expect(InviteManagement.declineInvite('INV_NOTFOUND'))
        .rejects.toThrow('Invite not found');
    });

    it('should throw when invite is not Pending', async () => {
      await InviteManagement.create({
        InviteID: 'INV_ACCEPTED',
        ReceiverID: 'RCV_A',
        Status: 'Accepted'
      });

      await expect(InviteManagement.declineInvite('INV_ACCEPTED'))
        .rejects.toThrow('Cannot decline invite with status: Accepted');
    });

    it('should throw when trying to decline a declined invite', async () => {
      await InviteManagement.create({
        InviteID: 'INV_ALRDECL',
        ReceiverID: 'RCV_D',
        Status: 'Declined'
      });

      await expect(InviteManagement.declineInvite('INV_ALRDECL'))
        .rejects.toThrow('Cannot decline invite with status: Declined');
    });
  });

  // ─── updateStatus() ────────────────────────────────────────

  describe('updateStatus()', () => {
    it('should update invite status to valid value', async () => {
      await InviteManagement.create({
        InviteID: 'INV_UPST',
        ReceiverID: 'RCV_UPST'
      });

      const result = await InviteManagement.updateStatus('INV_UPST', 'Accepted');
      expect(result).toBeDefined();
    });

    it('should throw for invalid status', async () => {
      await expect(InviteManagement.updateStatus('INV_X', 'BadStatus'))
        .rejects.toThrow('Invalid status: BadStatus');
    });

    it('should accept all valid statuses', async () => {
      for (const status of InviteManagement.VALID_STATUSES) {
        await InviteManagement.create({
          InviteID: `INV_VS_${status}`,
          ReceiverID: `RCV_VS_${status}`
        });
        const result = await InviteManagement.updateStatus(`INV_VS_${status}`, status);
        expect(result).toBeDefined();
      }
    });
  });

  // ─── getPendingInvites() ───────────────────────────────────

  describe('getPendingInvites()', () => {
    beforeEach(async () => {
      await InviteManagement.create({ InviteID: 'INV_P1', ReceiverID: 'RCV_PEND', Status: 'Pending' });
      await InviteManagement.create({ InviteID: 'INV_P2', ReceiverID: 'RCV_PEND', Status: 'Accepted' });
      await InviteManagement.create({ InviteID: 'INV_P3', ReceiverID: 'RCV_PEND', Status: 'Pending' });
      await InviteManagement.create({ InviteID: 'INV_P4', ReceiverID: 'RCV_OTHER', Status: 'Pending' });
    });

    it('should return only pending invites for a receiver', async () => {
      const results = await InviteManagement.getPendingInvites('RCV_PEND');
      expect(results.length).toBe(2);
      results.forEach(r => {
        expect(r.Status).toBe('Pending');
        expect(r.ReceiverID).toBe('RCV_PEND');
      });
    });

    it('should return empty for receiver with no pending invites', async () => {
      // Create a non-pending invite for a specific receiver
      await InviteManagement.create({ InviteID: 'INV_NOPEND', ReceiverID: 'RCV_NOPEND', Status: 'Accepted' });
      const results = await InviteManagement.getPendingInvites('RCV_NOPEND');
      expect(results).toEqual([]);
    });
  });

  // ─── countByStatus() ──────────────────────────────────────

  describe('countByStatus()', () => {
    beforeEach(async () => {
      await InviteManagement.create({ InviteID: 'INV_CS1', ReceiverID: 'R1', Status: 'Pending' });
      await InviteManagement.create({ InviteID: 'INV_CS2', ReceiverID: 'R2', Status: 'Pending' });
      await InviteManagement.create({ InviteID: 'INV_CS3', ReceiverID: 'R3', Status: 'Accepted' });
    });

    it('should count invites by status', async () => {
      const pendingCount = await InviteManagement.countByStatus('Pending');
      expect(pendingCount).toBe(2);
    });

    it('should count accepted invites', async () => {
      const acceptedCount = await InviteManagement.countByStatus('Accepted');
      expect(acceptedCount).toBe(1);
    });

    it('should return 0 for status with no invites', async () => {
      const declinedCount = await InviteManagement.countByStatus('Declined');
      expect(declinedCount).toBe(0);
    });

    it('should throw for invalid status', async () => {
      await expect(InviteManagement.countByStatus('Invalid'))
        .rejects.toThrow('Invalid status: Invalid');
    });
  });
});
