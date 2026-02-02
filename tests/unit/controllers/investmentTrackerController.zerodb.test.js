/**
 * Investment Tracker Controller ZeroDB Migration Tests
 * Issue #20 - Batch 3 Controllers
 */

const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

// Import controller after mocking
const { trackInvestment } = require('../../../controllers/investmentTrackerController');

describe('Investment Tracker Controller - ZeroDB Migration', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('trackInvestment', () => {
    it('should create an investment tracking record successfully', async () => {
      const investmentData = {
        TrackID: 'TRACK001',
        Company: 'TechStartup Inc',
        EquityPercentage: 15.5,
        CurrentValue: 500000,
      };
      req.body = investmentData;

      const mockSavedInvestment = {
        _id: 'investment123',
        ...investmentData,
      };

      databaseAdapter.create.mockResolvedValue(mockSavedInvestment);

      await trackInvestment(req, res, next);

      expect(databaseAdapter.create).toHaveBeenCalledWith('InvestmentTracker', investmentData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedInvestment);
    });

    it('should return 400 if TrackID is missing', async () => {
      req.body = {
        Company: 'TechStartup Inc',
        EquityPercentage: 15.5,
        CurrentValue: 500000,
      };

      await trackInvestment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if Company is missing', async () => {
      req.body = {
        TrackID: 'TRACK001',
        EquityPercentage: 15.5,
        CurrentValue: 500000,
      };

      await trackInvestment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if EquityPercentage is missing', async () => {
      req.body = {
        TrackID: 'TRACK001',
        Company: 'TechStartup Inc',
        CurrentValue: 500000,
      };

      await trackInvestment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if CurrentValue is missing', async () => {
      req.body = {
        TrackID: 'TRACK001',
        Company: 'TechStartup Inc',
        EquityPercentage: 15.5,
      };

      await trackInvestment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should call next() on database error', async () => {
      req.body = {
        TrackID: 'TRACK001',
        Company: 'TechStartup Inc',
        EquityPercentage: 15.5,
        CurrentValue: 500000,
      };

      const dbError = new Error('Database connection failed');
      databaseAdapter.create.mockRejectedValue(dbError);

      await trackInvestment(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it('should handle large numeric values', async () => {
      const investmentData = {
        TrackID: 'TRACK002',
        Company: 'BigCorp Ltd',
        EquityPercentage: 99.99,
        CurrentValue: 1000000000,
      };
      req.body = investmentData;

      const mockSavedInvestment = {
        _id: 'investment456',
        ...investmentData,
      };

      databaseAdapter.create.mockResolvedValue(mockSavedInvestment);

      await trackInvestment(req, res, next);

      expect(databaseAdapter.create).toHaveBeenCalledWith('InvestmentTracker', investmentData);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
