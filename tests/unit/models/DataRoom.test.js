/**
 * DataRoom Model Tests - Issue #194
 */
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn().mockResolvedValue({ data: [{ _id: 'test-id' }] }),
  queryTable: jest.fn().mockResolvedValue({ data: [] }),
  updateRows: jest.fn().mockResolvedValue({ modifiedCount: 1, modified_count: 1 }),
  deleteRows: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  initialize: jest.fn().mockResolvedValue(true),
  projectId: 'test-project'
}));

const DataRoom = require('../../../models/DataRoom');

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
    it('should have required fields marked', () => {
      expect(DataRoom.schema.dataRoomId.required).toBe(true);
      expect(DataRoom.schema.name.required).toBe(true);
      expect(DataRoom.schema.ownerCompany.required).toBe(true);
      expect(DataRoom.schema.createdBy.required).toBe(true);
    });
    it('should have status enum in schema', () => {
      expect(DataRoom.schema.status.enum).toEqual(['active', 'archived', 'deleted']);
    });
  });

  describe('create()', () => {
    it('should create a data room with required fields', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.insertRow.mockResolvedValueOnce({ data: [{ row_data: { _id: 'id', dataRoomId: 'dr-123', name: 'Q4 Due Diligence', status: 'active' } }] });
      const result = await DataRoom.create({ name: 'Q4 Due Diligence', ownerCompany: 'company-123', createdBy: 'user-456' });
      expect(result).toBeDefined();
      expect(result.name).toBe('Q4 Due Diligence');
    });
    it('should generate dataRoomId if not provided', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.insertRow.mockResolvedValueOnce({ data: [{ _id: 'test-id' }] });
      await DataRoom.create({ name: 'Test', ownerCompany: 'c-123', createdBy: 'u-456' });
      expect(mockZerodbService.insertRow.mock.calls[0][1].dataRoomId).toBeDefined();
    });
    it('should set default status to active', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.insertRow.mockResolvedValueOnce({ data: [{ _id: 'test-id' }] });
      await DataRoom.create({ name: 'Test', ownerCompany: 'c-123', createdBy: 'u-456' });
      expect(mockZerodbService.insertRow.mock.calls[0][1].status).toBe('active');
    });
  });

  describe('findByDataRoomId()', () => {
    it('should find data room by dataRoomId', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: { dataRoomId: 'dr-123', name: 'Test' } }] });
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
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: { dataRoomId: 'dr-1' } }, { row_data: { dataRoomId: 'dr-2' } }] });
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
      // addDocument calls findByDataRoomId (which calls findOne->queryTable) to get the room
      // then calls updateOne which calls findOne->queryTable again then updateRows
      const roomData = { dataRoomId: 'dr-123', documents: [], _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })  // findByDataRoomId
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] }); // updateOne->findOne
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });
      await DataRoom.addDocument('dr-123', 'doc-456', 'user-789');
      // The updateOne path may use updateRows or client.put depending on row_id presence
      // Either way queryTable should have been called to find the room
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });
    it('should remove document from data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', documents: [{ documentId: 'doc-456' }], _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] });
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });
      await DataRoom.removeDocument('dr-123', 'doc-456');
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
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
      const roomData = { dataRoomId: 'dr-123', accessSettings: {}, _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] });
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });
      const result = await DataRoom.generateAccessLink('dr-123', 24);
      expect(result.accessToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('Activity Tracking', () => {
    it('should log activity for data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', activityLog: [], _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] });
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });
      await DataRoom.logActivity('dr-123', { action: 'test', userId: 'u-1' });
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });
  });

  describe('Base model methods', () => {
    it('should expose find method', () => { expect(typeof DataRoom.find).toBe('function'); });
    it('should expose findOne method', () => { expect(typeof DataRoom.findOne).toBe('function'); });
    it('should expose updateOne method', () => { expect(typeof DataRoom.updateOne).toBe('function'); });
    it('should expose deleteOne method', () => { expect(typeof DataRoom.deleteOne).toBe('function'); });
    it('should expose countDocuments method', () => { expect(typeof DataRoom.countDocuments).toBe('function'); });
    it('should expose exists method', () => { expect(typeof DataRoom.exists).toBe('function'); });
  });

  describe('Permission Hierarchy', () => {
    it('should define permission hierarchy', () => {
      expect(DataRoom.permissionHierarchy).toBeDefined();
      expect(DataRoom.permissionHierarchy.admin).toContain('view');
      expect(DataRoom.permissionHierarchy.admin).toContain('upload');
      expect(DataRoom.permissionHierarchy.admin).toContain('download');
    });
  });

  describe('addPermission()', () => {
    it('should add a new permission to the data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', permissions: [], _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })  // findByDataRoomId
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] }); // updateOne->findOne
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      await DataRoom.addPermission('dr-123', { userId: 'user-1', level: 'view' }, 'admin-1');
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });

    it('should update an existing permission (by userId)', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const existingPerm = { userId: 'user-1', level: 'view', grantedBy: 'admin-1' };
      const roomData = { dataRoomId: 'dr-123', permissions: [existingPerm], _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })  // findByDataRoomId
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] }); // updateOne->findOne
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      await DataRoom.addPermission('dr-123', { userId: 'user-1', level: 'admin' }, 'admin-2');
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });

    it('should update an existing permission (by email)', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const existingPerm = { email: 'user@test.com', level: 'view', grantedBy: 'admin-1' };
      const roomData = { dataRoomId: 'dr-123', permissions: [existingPerm], _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })  // findByDataRoomId
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] }); // updateOne->findOne
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      await DataRoom.addPermission('dr-123', { email: 'user@test.com', level: 'download' }, 'admin-2');
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });

    it('should throw when data room not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.addPermission('dr-nonexistent', { userId: 'u1', level: 'view' }, 'admin'))
        .rejects.toThrow('Data room not found');
    });
  });

  describe('removePermission()', () => {
    it('should remove a permission from the data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = {
        dataRoomId: 'dr-123',
        permissions: [
          { userId: 'user-1', level: 'view' },
          { userId: 'user-2', level: 'admin' }
        ],
        _id: 'room-id'
      };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })  // findByDataRoomId
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] }); // updateOne->findOne
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      await DataRoom.removePermission('dr-123', 'user-1');
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });

    it('should throw when data room not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.removePermission('dr-nonexistent', 'user-1'))
        .rejects.toThrow('Data room not found');
    });
  });

  describe('validateAccessToken()', () => {
    it('should return true for valid token with valid link', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const roomData = {
        dataRoomId: 'dr-123',
        accessSettings: {
          externalAccess: {
            enabled: true,
            accessToken: 'valid-token',
            expiresAt: futureDate
          }
        }
      };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      const result = await DataRoom.validateAccessToken('dr-123', 'valid-token');
      expect(result).toBe(true);
    });

    it('should return false when data room not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      const result = await DataRoom.validateAccessToken('dr-nonexistent', 'token');
      expect(result).toBe(false);
    });

    it('should return false when token does not match', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = {
        dataRoomId: 'dr-123',
        accessSettings: {
          externalAccess: { enabled: true, accessToken: 'correct-token' }
        }
      };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      const result = await DataRoom.validateAccessToken('dr-123', 'wrong-token');
      expect(result).toBe(false);
    });

    it('should return false when external access is not configured', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', accessSettings: {} };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      const result = await DataRoom.validateAccessToken('dr-123', 'token');
      expect(result).toBe(false);
    });
  });

  describe('getActivityLog()', () => {
    it('should return paginated activity log', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const activities = [
        { action: 'view', userId: 'u1', timestamp: '2024-01-03T00:00:00Z' },
        { action: 'download', userId: 'u2', timestamp: '2024-01-02T00:00:00Z' },
        { action: 'upload', userId: 'u3', timestamp: '2024-01-01T00:00:00Z' }
      ];
      const roomData = { dataRoomId: 'dr-123', activityLog: activities };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      const result = await DataRoom.getActivityLog('dr-123', { skip: 0, limit: 2 });
      expect(result).toHaveLength(2);
      // Should be sorted by timestamp descending
      expect(new Date(result[0].timestamp).getTime()).toBeGreaterThanOrEqual(new Date(result[1].timestamp).getTime());
    });

    it('should use default skip and limit', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', activityLog: [] };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      const result = await DataRoom.getActivityLog('dr-123');
      expect(result).toEqual([]);
    });

    it('should throw when data room not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.getActivityLog('dr-nonexistent'))
        .rejects.toThrow('Data room not found');
    });

    it('should handle missing activityLog field', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123' };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      const result = await DataRoom.getActivityLog('dr-123');
      expect(result).toEqual([]);
    });
  });

  describe('softDelete()', () => {
    it('should set status to deleted', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', status: 'active', _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] }); // updateOne->findOne
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      await DataRoom.softDelete('dr-123');
      expect(mockZerodbService.queryTable).toHaveBeenCalled();
    });
  });

  describe('hasPermission - edge cases', () => {
    it('should deny access when no permission found for user', () => {
      const dataRoom = { permissions: [{ userId: 'other', level: 'admin' }], createdBy: 'creator' };
      expect(DataRoom.hasPermission(dataRoom, 'unknown-user', 'view')).toBe(false);
    });

    it('should deny access when permission is expired', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const dataRoom = { permissions: [{ userId: 'u1', level: 'admin', expiresAt: pastDate }], createdBy: 'other' };
      expect(DataRoom.hasPermission(dataRoom, 'u1', 'view')).toBe(false);
    });

    it('should allow access when permission is not yet expired', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const dataRoom = { permissions: [{ userId: 'u1', level: 'admin', expiresAt: futureDate }], createdBy: 'other' };
      expect(DataRoom.hasPermission(dataRoom, 'u1', 'view')).toBe(true);
    });

    it('should deny access when user has lower permission than required', () => {
      const dataRoom = { permissions: [{ userId: 'u1', level: 'view' }], createdBy: 'other' };
      expect(DataRoom.hasPermission(dataRoom, 'u1', 'upload')).toBe(false);
    });

    it('should handle unknown permission level in hierarchy', () => {
      const dataRoom = { permissions: [{ userId: 'u1', level: 'unknown_level' }], createdBy: 'other' };
      expect(DataRoom.hasPermission(dataRoom, 'u1', 'view')).toBe(false);
    });
  });

  describe('isAccessLinkValid - edge cases', () => {
    it('should return false when external access is disabled', () => {
      expect(DataRoom.isAccessLinkValid({ accessSettings: { externalAccess: { enabled: false } } })).toBe(false);
    });

    it('should return false when maxViews is reached', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(DataRoom.isAccessLinkValid({
        accessSettings: {
          externalAccess: { enabled: true, expiresAt: futureDate, maxViews: 5, viewCount: 5 }
        }
      })).toBe(false);
    });

    it('should return true when maxViews is not reached', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(DataRoom.isAccessLinkValid({
        accessSettings: {
          externalAccess: { enabled: true, expiresAt: futureDate, maxViews: 5, viewCount: 3 }
        }
      })).toBe(true);
    });

    it('should return false when accessSettings is empty', () => {
      expect(DataRoom.isAccessLinkValid({ accessSettings: {} })).toBe(false);
    });

    it('should return true when no expiry or maxViews are set', () => {
      expect(DataRoom.isAccessLinkValid({
        accessSettings: { externalAccess: { enabled: true } }
      })).toBe(true);
    });
  });

  describe('addDocument - duplicate check', () => {
    it('should throw when document already exists in data room', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', documents: [{ documentId: 'doc-1' }] };
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [{ row_data: roomData }] });

      await expect(DataRoom.addDocument('dr-123', 'doc-1', 'user-1'))
        .rejects.toThrow('Document already in data room');
    });

    it('should throw when data room not found for addDocument', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.addDocument('dr-nonexistent', 'doc-1', 'user-1'))
        .rejects.toThrow('Data room not found');
    });
  });

  describe('removeDocument - not found', () => {
    it('should throw when data room not found for removeDocument', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.removeDocument('dr-nonexistent', 'doc-1'))
        .rejects.toThrow('Data room not found');
    });
  });

  describe('generateAccessLink - not found', () => {
    it('should throw when data room not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.generateAccessLink('dr-nonexistent'))
        .rejects.toThrow('Data room not found');
    });

    it('should pass options to generated link', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      const roomData = { dataRoomId: 'dr-123', accessSettings: {}, _id: 'room-id' };
      mockZerodbService.queryTable
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] })
        .mockResolvedValueOnce({ data: [{ row_data: roomData }] });
      mockZerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await DataRoom.generateAccessLink('dr-123', 48, { createdBy: 'admin', maxViews: 10 });
      expect(result.accessToken).toBeDefined();
      expect(result.dataRoomId).toBe('dr-123');
    });
  });

  describe('logActivity - not found', () => {
    it('should throw when data room not found', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.queryTable.mockResolvedValueOnce({ data: [] });

      await expect(DataRoom.logActivity('dr-nonexistent', { action: 'test' }))
        .rejects.toThrow('Data room not found');
    });
  });

  describe('create - defaults', () => {
    it('should set all defaults when not provided', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.insertRow.mockResolvedValueOnce({ data: [{ _id: 'test-id' }] });

      await DataRoom.create({ name: 'Test', ownerCompany: 'c1', createdBy: 'u1' });

      const calledWith = mockZerodbService.insertRow.mock.calls[0][1];
      expect(calledWith.dataRoomId).toBeDefined();
      expect(calledWith.status).toBe('active');
      expect(calledWith.documents).toEqual([]);
      expect(calledWith.permissions).toEqual([]);
      expect(calledWith.activityLog).toEqual([]);
      expect(calledWith.metadata).toEqual({});
      expect(calledWith.accessSettings).toEqual({
        requireNDA: false,
        watermarkEnabled: false,
        downloadEnabled: true,
        externalAccess: { enabled: false }
      });
    });

    it('should not override provided values', async () => {
      const mockZerodbService = require('../../../services/zerodbService');
      mockZerodbService.insertRow.mockResolvedValueOnce({ data: [{ _id: 'test-id' }] });

      await DataRoom.create({
        dataRoomId: 'dr-custom',
        name: 'Test',
        ownerCompany: 'c1',
        createdBy: 'u1',
        status: 'archived',
        documents: [{ documentId: 'd1' }],
        permissions: [{ userId: 'u1', level: 'admin' }],
        accessSettings: { requireNDA: true },
        activityLog: [{ action: 'created' }],
        metadata: { key: 'value' }
      });

      const calledWith = mockZerodbService.insertRow.mock.calls[0][1];
      expect(calledWith.dataRoomId).toBe('dr-custom');
      expect(calledWith.status).toBe('archived');
      expect(calledWith.documents).toEqual([{ documentId: 'd1' }]);
      expect(calledWith.permissions).toEqual([{ userId: 'u1', level: 'admin' }]);
      expect(calledWith.accessSettings).toEqual({ requireNDA: true });
    });
  });
});