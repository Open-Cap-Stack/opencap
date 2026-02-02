/**
 * SPV Nested Endpoints Unit Tests
 * Issue #123: Add SPV Nested Endpoints
 */

jest.mock('../../../models/SPV', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

jest.mock('../../../models/SPVAssetModel', () => ({
  find: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock('../../../models/SPVInvestment', () => ({
  find: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const spvNestedController = require('../../../controllers/SPVNested');
const SPV = require('../../../models/SPV');
const SPVAsset = require('../../../models/SPVAssetModel');
const SPVInvestment = require('../../../models/SPVInvestment');

describe('SPV Nested Endpoints', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  const mockSPV = {
    _id: '507f1f77bcf86cd799439011',
    SPVID: 'SPV001',
    Name: 'Test SPV',
    Purpose: 'Investment vehicle',
    CreationDate: new Date('2024-01-15'),
    Status: 'Active',
    ParentCompanyID: 'COMPANY001',
    ComplianceStatus: 'Compliant'
  };

  const mockInvestments = [
    { _id: 'inv001', spvId: '507f1f77bcf86cd799439011', investorId: 'INV001', investorName: 'John Doe', investmentAmount: 100000, investmentDate: new Date('2024-02-01'), equityPercentage: 10, status: 'active' },
    { _id: 'inv002', spvId: '507f1f77bcf86cd799439011', investorId: 'INV002', investorName: 'Jane Smith', investmentAmount: 250000, investmentDate: new Date('2024-02-15'), equityPercentage: 25, status: 'active' }
  ];

  const mockAssets = [
    { _id: 'asset001', spvId: '507f1f77bcf86cd799439011', name: 'Real Estate Property A', type: 'real_estate', acquisitionCost: 500000, currentValue: 550000, acquisitionDate: new Date('2024-01-20'), status: 'active', annualReturn: 12.5, irr: 15.2, multiple: 1.1 },
    { _id: 'asset002', spvId: '507f1f77bcf86cd799439011', name: 'Startup Equity', type: 'venture_capital', acquisitionCost: 200000, currentValue: 300000, acquisitionDate: new Date('2024-02-01'), status: 'active', annualReturn: 25.0, irr: 30.5, multiple: 1.5 }
  ];

  describe('getSPVInvestments', () => {
    it('should return all investments for a valid SPV', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVInvestment.find.mockResolvedValue(mockInvestments);
      await spvNestedController.getSPVInvestments(req, res);
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.investments).toHaveLength(2);
      expect(responseData.totalInvested).toBe(350000);
    });

    it('should return empty array when SPV has no investments', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVInvestment.find.mockResolvedValue([]);
      await spvNestedController.getSPVInvestments(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).totalInvested).toBe(0);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      SPV.findById.mockResolvedValue(null);
      SPV.findOne.mockResolvedValue(null);
      await spvNestedController.getSPVInvestments(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid SPV ID format', async () => {
      req.params = { id: '123456789012345678901234' };
      await spvNestedController.getSPVInvestments(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockRejectedValue(new Error('Database error'));
      await spvNestedController.getSPVInvestments(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSPVPerformance', () => {
    it('should return performance metrics for a valid SPV', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      await spvNestedController.getSPVPerformance(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('nav');
      expect(data).toHaveProperty('roi');
    });

    it('should calculate correct NAV from assets', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      await spvNestedController.getSPVPerformance(req, res);
      const data = JSON.parse(res._getData());
      expect(data.nav).toBe(850000);
      expect(data.totalInvestment).toBe(700000);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      SPV.findById.mockResolvedValue(null);
      SPV.findOne.mockResolvedValue(null);
      await spvNestedController.getSPVPerformance(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return zero values when no assets', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue([]);
      await spvNestedController.getSPVPerformance(req, res);
      expect(JSON.parse(res._getData()).nav).toBe(0);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      SPV.findById.mockRejectedValue(new Error('Database error'));
      await spvNestedController.getSPVPerformance(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSPVReport', () => {
    it('should generate summary report', async () => {
      req.params = { id: '507f1f77bcf86cd799439011', type: 'summary' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      SPVInvestment.find.mockResolvedValue(mockInvestments);
      await spvNestedController.getSPVReport(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).reportType).toBe('summary');
    });

    it('should generate detailed report', async () => {
      req.params = { id: '507f1f77bcf86cd799439011', type: 'detailed' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      SPVInvestment.find.mockResolvedValue(mockInvestments);
      await spvNestedController.getSPVReport(req, res);
      const data = JSON.parse(res._getData());
      expect(data.reportType).toBe('detailed');
      expect(data).toHaveProperty('assets');
    });

    it('should generate tax report', async () => {
      req.params = { id: '507f1f77bcf86cd799439011', type: 'tax' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      SPVInvestment.find.mockResolvedValue(mockInvestments);
      await spvNestedController.getSPVReport(req, res);
      expect(JSON.parse(res._getData()).reportType).toBe('tax');
    });

    it('should return 400 for invalid report type', async () => {
      req.params = { id: '507f1f77bcf86cd799439011', type: 'invalid' };
      await spvNestedController.getSPVReport(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent', type: 'summary' };
      SPV.findById.mockResolvedValue(null);
      SPV.findOne.mockResolvedValue(null);
      await spvNestedController.getSPVReport(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: '507f1f77bcf86cd799439011', type: 'summary' };
      SPV.findById.mockRejectedValue(new Error('Database error'));
      await spvNestedController.getSPVReport(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('closeSPV', () => {
    it('should close an active SPV without active assets', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { reason: 'Investment objectives met' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue([]);
      const closedSPV = { ...mockSPV, Status: 'Closed' };
      SPV.findByIdAndUpdate.mockResolvedValue(closedSPV);
      await spvNestedController.closeSPV(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).spv.Status).toBe('Closed');
    });

    it('should return 400 when trying to close an already closed SPV', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { reason: 'Already closed' };
      SPV.findById.mockResolvedValue({ ...mockSPV, Status: 'Closed' });
      await spvNestedController.closeSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when SPV has active assets', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { reason: 'Testing' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      await spvNestedController.closeSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { reason: 'Testing' };
      SPV.findById.mockResolvedValue(null);
      SPV.findOne.mockResolvedValue(null);
      await spvNestedController.closeSPV(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { reason: 'Testing' };
      SPV.findById.mockRejectedValue(new Error('Database error'));
      await spvNestedController.closeSPV(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('liquidateSPV', () => {
    it('should liquidate an active SPV with assets', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { distributionMethod: 'proportional' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      SPVAsset.updateMany.mockResolvedValue({ modifiedCount: 2 });
      SPVInvestment.find.mockResolvedValue(mockInvestments);
      SPV.findByIdAndUpdate.mockResolvedValue({ ...mockSPV, Status: 'Closed' });
      await spvNestedController.liquidateSPV(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.liquidationSummary.totalValue).toBe(850000);
    });

    it('should return 400 when SPV is already closed', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { distributionMethod: 'proportional' };
      SPV.findById.mockResolvedValue({ ...mockSPV, Status: 'Closed' });
      await spvNestedController.liquidateSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when no assets to liquidate', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { distributionMethod: 'proportional' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue([]);
      await spvNestedController.liquidateSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid distribution method', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { distributionMethod: 'invalid' };
      await spvNestedController.liquidateSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { distributionMethod: 'proportional' };
      SPV.findById.mockResolvedValue(null);
      SPV.findOne.mockResolvedValue(null);
      await spvNestedController.liquidateSPV(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { distributionMethod: 'proportional' };
      SPV.findById.mockRejectedValue(new Error('Database error'));
      await spvNestedController.liquidateSPV(req, res);
      expect(res.statusCode).toBe(500);
    });

    it('should calculate equal distributions when method is equal', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { distributionMethod: 'equal' };
      SPV.findById.mockResolvedValue(mockSPV);
      SPVAsset.find.mockResolvedValue(mockAssets);
      SPVAsset.updateMany.mockResolvedValue({ modifiedCount: 2 });
      SPVInvestment.find.mockResolvedValue(mockInvestments);
      SPV.findByIdAndUpdate.mockResolvedValue({ ...mockSPV, Status: 'Closed' });
      await spvNestedController.liquidateSPV(req, res);
      const data = JSON.parse(res._getData());
      expect(data.liquidationSummary.distributions[0].distributionAmount).toBe(425000);
    });
  });
});
