/**
 * DataRoom Controller Tests - Issue #194
 */
const dataRoomController = require('../../../controllers/dataRoomController');
const DataRoom = require('../../../models/DataRoom');

jest.mock('../../../models/DataRoom');
jest.mock('../../../services/zerodbService', () => ({ queryTable: jest.fn(), insertRow: jest.fn(), updateRows: jest.fn(), deleteRows: jest.fn() }));

DataRoom.permissionLevels = ['view', 'download', 'upload', 'admin'];
DataRoom.dataRoomStatuses = ['active', 'archived', 'deleted'];

describe('DataRoom Controller', () => {
  let mockReq, mockRes;
  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { body: {}, params: {}, query: {}, user: { userId: 'user-123', companyId: 'company-456', role: 'employee' } };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  describe('createDataRoom', () => {
    it('should create a data room successfully', async () => {
      mockReq.body = { name: 'Q4 Due Diligence' };
      DataRoom.create.mockResolvedValue({ dataRoomId: 'dr_gen', name: 'Q4 Due Diligence', createdBy: 'user-123' });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.createDataRoom(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if name is missing', async () => {
      mockReq.body = {};
      await dataRoomController.createDataRoom(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getDataRooms', () => {
    it('should return data rooms for the user company', async () => {
      DataRoom.findByCompany.mockResolvedValue([{ dataRoomId: 'dr-1' }]);
      await dataRoomController.getDataRooms(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getDataRoomById', () => {
    it('should return a data room by ID', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', ownerCompany: 'company-456', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      await dataRoomController.getDataRoomById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if not found', async () => {
      mockReq.params = { id: 'non-existent' };
      DataRoom.findByDataRoomId.mockResolvedValue(null);
      await dataRoomController.getDataRoomById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if user lacks permission', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', ownerCompany: 'other', createdBy: 'other', permissions: [] });
      DataRoom.hasPermission = jest.fn().mockReturnValue(false);
      await dataRoomController.getDataRoomById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateDataRoom', () => {
    it('should update a data room successfully', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = { name: 'Updated' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.updateOne.mockResolvedValue({ modifiedCount: 1 });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.updateDataRoom(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if user lacks admin permission', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'other' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(false);
      await dataRoomController.updateDataRoom(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteDataRoom', () => {
    it('should soft delete a data room', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.softDelete.mockResolvedValue({ modifiedCount: 1 });
      await dataRoomController.deleteDataRoom(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addDocument', () => {
    it('should add a document to the data room', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = { documentId: 'doc-456' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.addDocument.mockResolvedValue({ modifiedCount: 1 });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.addDocument(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if documentId is missing', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = {};
      await dataRoomController.addDocument(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeDocument', () => {
    it('should remove a document from the data room', async () => {
      mockReq.params = { id: 'dr-123', docId: 'doc-456' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.removeDocument.mockResolvedValue({ modifiedCount: 1 });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.removeDocument(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('managePermissions', () => {
    it('should add permission to the data room', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = { action: 'add', userId: 'user-789', level: 'view' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123', permissions: [] });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.addPermission.mockResolvedValue({ modifiedCount: 1 });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.managePermissions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should remove permission from the data room', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = { action: 'remove', userId: 'user-789' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123', permissions: [{ userId: 'user-789' }] });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.removePermission.mockResolvedValue({ modifiedCount: 1 });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.managePermissions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid action', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = { action: 'invalid' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      await dataRoomController.managePermissions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getActivityLog', () => {
    it('should return activity log for the data room', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.getActivityLog.mockResolvedValue([{ action: 'test' }]);
      await dataRoomController.getActivityLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('exportAsZip', () => {
    it('should initiate ZIP export', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', name: 'Test', createdBy: 'user-123', documents: [] });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.exportAsZip(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if user lacks download permission', async () => {
      mockReq.params = { id: 'dr-123' };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'other' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(false);
      await dataRoomController.exportAsZip(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('generateExternalLink', () => {
    it('should generate external access link', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.body = { expiresInHours: 48 };
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', createdBy: 'user-123' });
      DataRoom.hasPermission = jest.fn().mockReturnValue(true);
      DataRoom.generateAccessLink.mockResolvedValue({ accessToken: 'token', expiresAt: new Date().toISOString(), dataRoomId: 'dr-123' });
      DataRoom.logActivity = jest.fn().mockResolvedValue({});
      await dataRoomController.generateExternalLink(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('validateExternalAccess', () => {
    it('should validate external access token', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.query = { token: 'valid-token' };
      DataRoom.validateAccessToken.mockResolvedValue(true);
      DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', name: 'Test', documents: [] });
      await dataRoomController.validateExternalAccess(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 for invalid token', async () => {
      mockReq.params = { id: 'dr-123' };
      mockReq.query = { token: 'invalid' };
      DataRoom.validateAccessToken.mockResolvedValue(false);
      await dataRoomController.validateExternalAccess(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
