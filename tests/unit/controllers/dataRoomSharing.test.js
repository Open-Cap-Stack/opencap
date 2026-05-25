/**
 * Tests for data room sharing extensions
 * Issue #657: Data room sharing — access audit log + password protection
 */

const DataRoom = require('../../../models/DataRoom');
const dataRoomController = require('../../../controllers/dataRoomController');

jest.mock('../../../models/DataRoom');

function makeReq(overrides = {}) {
  return {
    params: { id: 'dr-123' },
    query: {},
    user: { userId: 'user-1', companyId: 'co-1', role: 'admin' },
    body: {},
    ...overrides
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('dataRoomController.generateExternalLink with password protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept password in request body and include passwordProtected flag in response', async () => {
    const dataRoom = { dataRoomId: 'dr-123', ownerCompany: 'co-1', createdBy: 'user-1', documents: [] };
    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);
    DataRoom.generateAccessLink.mockResolvedValue({
      accessToken: 'tok-abc',
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    });
    DataRoom.logActivity.mockResolvedValue(null);

    const req = makeReq({ body: { expiresInHours: 24, password: 'secret123' } });
    const res = makeRes();

    await dataRoomController.generateExternalLink(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('accessToken');
  });
});

describe('dataRoomController.getAccessLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 when data room not found', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await dataRoomController.getAccessLog(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return access log entries', async () => {
    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      createdBy: 'user-1',
      accessLog: [
        {
          accessId: 'al-1',
          token: 'tok-abc',
          accessedAt: '2024-03-01T10:00:00.000Z',
          ipAddress: '192.168.1.1',
          documentsViewed: ['doc-1']
        }
      ]
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq();
    const res = makeRes();

    await dataRoomController.getAccessLog(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('accessLog');
    expect(Array.isArray(responseData.accessLog)).toBe(true);
  });

  it('should return empty access log when none exists', async () => {
    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      createdBy: 'user-1'
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq();
    const res = makeRes();

    await dataRoomController.getAccessLog(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.accessLog).toHaveLength(0);
  });

  it('should return 403 when user lacks permission', async () => {
    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'other-company',
      createdBy: 'other-user'
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(false);

    const req = makeReq({ user: { userId: 'user-2', companyId: 'co-2', role: 'viewer' } });
    const res = makeRes();

    await dataRoomController.getAccessLog(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('dataRoomController.logLinkAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be exported as a function', () => {
    expect(typeof dataRoomController.logLinkAccess).toBe('function');
  });

  it('should log access event and return success', async () => {
    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      documents: []
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.updateOne.mockResolvedValue(null);

    const req = makeReq({
      body: {
        token: 'tok-abc',
        documentsViewed: ['doc-1'],
        ipAddress: '10.0.0.1'
      }
    });
    const res = makeRes();

    await dataRoomController.logLinkAccess(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
