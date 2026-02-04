/**
 * DataRoom Model Tests - Issue #194
 */
const DataRoom = require('../../../models/DataRoom');

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn().mockResolvedValue({ data: [{ _id: 'test-id' }] }),
  queryTable: jest.fn().mockResolvedValue({ data: [] }),
  updateRows: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  deleteRows: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  initialize: jest.fn().mockResolvedValue(true),
  projectId: 'test-project'
}));

describe('DataRoom Model', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('Schema Definition', () => {
    it('should have the correct table name', () => { expect(DataRoom.tableName).toBe('data_rooms'); });
    it('should have required schema fields', () => {
      expect(DataRoom.schema).toBeDefined();
      expect(DataRoom.schema.dataRoomId).toBeDefined();
      expect(DataRoom.schema.name).toBeDefined();
    });
    it('should have valid status enum values', () => { expect(DataRoom.dataRoomStatuses).toEqual(['active', 'archived', 'deleted']); });
    it('should have valid permission level enum values', () => { expect(DataRoom.permissionLevels).toEqual(['view', 'download', 'upload', 'admin']); });
  });

  describe('create()', () => {
    it('should create a data room with required fields', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.insertRow.mockResolvedValueOnce({ data: [{ _id: 'id', dataRoomId: 'dr-123', name: 'Q4 Due Diligence', status: 'active' }] });
      const result = await DataRoom.create({ name: 'Q4 Due Diligence', ownerCompany: 'company-123', createdBy: 'user-456' });
      expect(result).toBeDefined();
      expect(result.name).toBe('Q4 Due Diligence');
    });

    it('should generate dataRoomId if not provided', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      await DataRoom.create({ name: 'Test', ownerCompany: 'c-123', createdBy: 'u-456' });
      expect(mockZerodbService.insertRow.mock.calls[0][1].dataRoomId).toBeDefined();
    });

    it('should set default status to active', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      await DataRoom.create({ name: 'Test', ownerCompany: 'c-123', createdBy: 'u-456' });
      expect(mockZerodbService.insertRow.mock.calls[0][1].status).toBe('active');
    });
  });

  describe('findByDataRoomId()', () => {
    it('should find data room by dataRoomId', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ dataRoomId: 'dr-123', name: 'Test' }] });
      const result = await DataRoom.findByDataRoomId('dr-123');
      expect(result).toBeDefined();
      expect(result.dataRoomId).toBe('dr-123');
    });

    it('should return null if not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });
      expect(await DataRoom.findByDataRoomId('non-existent')).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find all data rooms for a company', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ dataRoomId: 'dr-1' }, { dataRoomId: 'dr-2' }] });
      const result = await DataRoom.findByCompany('company-123');
      expect(result).toHaveLength(2);
    });
  });

  describe('Permission Management', () => {
    it('should check if user has specific permission', () => {
      const dataRoom = { permissions: [{ userId: 'user-1', level: 'view' }], createdBy: 'creator-id' };
      expect(DataRoom.hasPermission(dataRoom, 'user-1', 'view')).toBe(true);
      expect(DataRoom.hasPermission(dataRoom, 'user-1', 'admin')).toBe(false);
    });

    it('should grant admin permission to creator', () => {
      const dataRoom = { permissions: [], createdBy: 'creator-id' };
      expect(DataRoom.hasPermission(dataRoom, 'creator-id', 'admin')).toBe(true);
    });

    it('should grant higher level permissions access to lower levels', () => {
      const dataRoom = { permissions: [{ userId: 'user-1', level: 'admin' }], createdBy: 'other' };
      expect(DataRoom.hasPermission(dataRoom, 'user-1', 'view')).toBe(true);
      expect(DataRoom.hasPermission(dataRoom, 'user-1', 'download')).toBe(true);
    });
  });

  describe('Document Management', () => {
    it('should add document to data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ dataRoomId: 'dr-123', documents: [] }] });
      await DataRoom.addDocument('dr-123', 'doc-456', 'user-789');
      expect(mockZerodbService.updateRows).toHaveBeenCalled();
    });

    it('should remove document from data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ dataRoomId: 'dr-123', documents: [{ documentId: 'doc-456' }] }] });
      await DataRoom.removeDocument('dr-123', 'doc-456');
      expect(mockZerodbService.updateRows).toHaveBeenCalled();
    });
  });

  describe('Access Settings', () => {
    it('should check if access link is valid', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(DataRoom.isAccessLinkValid({ accessSettings: { externalAccess: { enabled: true, expiresAt: futureDate } } })).toBe(true);
      expect(DataRoom.isAccessLinkValid({ accessSettings: { externalAccess: { enabled: true, expiresAt: pastDate } } })).toBe(false);
    });

    it('should generate time-limited access link', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ dataRoomId: 'dr-123', accessSettings: {} }] });
      const result = await DataRoom.generateAccessLink('dr-123', 24);
      expect(result.accessToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('Activity Tracking', () => {
    it('should log activity for data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ dataRoomId: 'dr-123', activityLog: [] }] });
      await DataRoom.logActivity('dr-123', { action: 'test', userId: 'u-1' });
      expect(mockZerodbService.updateRows).toHaveBeenCalled();
    });
  });

  describe('Base model methods', () => {
    it('should expose find method', () => { expect(typeof DataRoom.find).toBe('function'); });
    it('should expose findOne method', () => { expect(typeof DataRoom.findOne).toBe('function'); });
    it('should expose updateOne method', () => { expect(typeof DataRoom.updateOne).toBe('function'); });
    it('should expose deleteOne method', () => { expect(typeof DataRoom.deleteOne).toBe('function'); });
  });
});
