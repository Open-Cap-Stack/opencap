/**
 * SAFE Controller - deleteSAFE Tests
 * Feature: Issue #179 - SAFE delete uses correct identifier from resolved record
 */

jest.mock('../../../models/SAFE', () => ({
  findOne: jest.fn(),
  findOneAndDelete: jest.fn()
}));
jest.mock('../../../models/SignatureRequest', () => ({}));
jest.mock('../../../models/SAFEConversion', () => ({}));
jest.mock('../../../services/safeConversionService', () => ({}));

const SAFE = require('../../../models/SAFE');
const ctrl = require('../../../controllers/safeController');

describe('deleteSAFE', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: { _id: 'uid' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should delete when SAFE is found by safeId', async () => {
    const safeRecord = {
      _id: 'row-abc-123',
      safeId: 'safe_001',
      companyId: 'c1',
      status: 'draft'
    };

    req.params.safeId = 'safe_001';

    // resolveSafe: first findOne({ safeId }) succeeds
    SAFE.findOne.mockResolvedValueOnce(safeRecord);
    SAFE.findOneAndDelete.mockResolvedValueOnce(safeRecord);

    await ctrl.deleteSAFE(req, res);

    expect(SAFE.findOneAndDelete).toHaveBeenCalledWith({ _id: 'row-abc-123' });
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'SAFE deleted' });
  });

  it('should delete when SAFE is found by _id (fallback)', async () => {
    const safeRecord = {
      _id: 'some-uuid-456',
      safeId: 'safe_actual_id',
      companyId: 'c1',
      status: 'draft'
    };

    // URL param is the _id, not the safeId
    req.params.safeId = 'some-uuid-456';

    // resolveSafe: first findOne({ safeId }) returns null, second findOne({ _id }) returns the record
    SAFE.findOne.mockResolvedValueOnce(null);
    SAFE.findOne.mockResolvedValueOnce(safeRecord);
    SAFE.findOneAndDelete.mockResolvedValueOnce(safeRecord);

    await ctrl.deleteSAFE(req, res);

    // Must use the resolved record's _id, NOT the raw URL param as safeId
    expect(SAFE.findOneAndDelete).toHaveBeenCalledWith({ _id: 'some-uuid-456' });
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'SAFE deleted' });
  });

  it('should return 404 for non-existent SAFE', async () => {
    req.params.safeId = 'does-not-exist';

    // resolveSafe: both lookups return null
    SAFE.findOne.mockResolvedValueOnce(null);
    SAFE.findOne.mockResolvedValueOnce(null);

    await ctrl.deleteSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'SAFE not found' }) });
    expect(SAFE.findOneAndDelete).not.toHaveBeenCalled();
  });
});
