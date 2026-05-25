/**
 * Tests for data room diff endpoint
 * Issue #655: Data room diff
 * GET /api/v1/data-rooms/:id/diff?from=<date>&to=<date>
 */

const DataRoom = require('../../../models/DataRoom');
const dataRoomController = require('../../../controllers/dataRoomController');

jest.mock('../../../models/DataRoom');

function makeReq(overrides = {}) {
  return {
    params: { id: 'dr-123' },
    query: { from: '2024-01-01T00:00:00.000Z', to: '2024-06-01T00:00:00.000Z' },
    user: { userId: 'user-1', companyId: 'co-1', role: 'admin' },
    body: {},
    ...overrides
  };
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
}

describe('dataRoomController.getDiff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 when data room not found', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('should return 400 when from or to query param is missing', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue({ dataRoomId: 'dr-123', documents: [] });

    const req = makeReq({ query: {} });
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return diff with added documents', async () => {
    const fromDate = '2024-01-01T00:00:00.000Z';
    const toDate = '2024-06-01T00:00:00.000Z';

    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      documents: [
        {
          documentId: 'doc-1',
          addedAt: '2024-03-15T00:00:00.000Z', // within range
          name: 'New Document',
          modifiedAt: null
        }
      ]
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq({ query: { from: fromDate, to: toDate } });
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('added');
    expect(responseData).toHaveProperty('removed');
    expect(responseData).toHaveProperty('modified');
    expect(responseData).toHaveProperty('summary');
  });

  it('should identify documents added in the time range', async () => {
    const fromDate = '2024-01-01T00:00:00.000Z';
    const toDate = '2024-06-01T00:00:00.000Z';

    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      documents: [
        {
          documentId: 'doc-added',
          addedAt: '2024-03-15T00:00:00.000Z', // IN range
          name: 'New Doc'
        },
        {
          documentId: 'doc-old',
          addedAt: '2023-12-01T00:00:00.000Z', // BEFORE range
          name: 'Old Doc'
        }
      ]
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq({ query: { from: fromDate, to: toDate } });
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.added).toHaveLength(1);
    expect(responseData.added[0].documentId).toBe('doc-added');
  });

  it('should identify modified documents in the time range', async () => {
    const fromDate = '2024-01-01T00:00:00.000Z';
    const toDate = '2024-06-01T00:00:00.000Z';

    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      documents: [
        {
          documentId: 'doc-modified',
          addedAt: '2023-06-01T00:00:00.000Z', // before range
          modifiedAt: '2024-02-15T00:00:00.000Z', // IN range
          name: 'Modified Doc'
        }
      ]
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq({ query: { from: fromDate, to: toDate } });
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.modified).toHaveLength(1);
    expect(responseData.modified[0].documentId).toBe('doc-modified');
  });

  it('should include a human-readable summary string', async () => {
    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      documents: [
        {
          documentId: 'doc-new',
          addedAt: '2024-03-15T00:00:00.000Z',
          name: 'New Doc'
        }
      ]
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq();
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(typeof responseData.summary).toBe('string');
    expect(responseData.summary.length).toBeGreaterThan(0);
  });

  it('should handle data rooms with no document changes gracefully', async () => {
    const dataRoom = {
      dataRoomId: 'dr-123',
      ownerCompany: 'co-1',
      documents: []
    };

    DataRoom.findByDataRoomId.mockResolvedValue(dataRoom);
    DataRoom.hasPermission.mockReturnValue(true);

    const req = makeReq();
    const res = makeRes();

    await dataRoomController.getDiff(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.added).toHaveLength(0);
    expect(responseData.removed).toHaveLength(0);
    expect(responseData.modified).toHaveLength(0);
  });
});
