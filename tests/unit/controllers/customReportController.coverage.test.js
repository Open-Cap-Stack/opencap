/**
 * CustomReportController Coverage Tests
 * Covers uncovered branches: error delegation via next(), updateReport ZeroDB error,
 * deleteReport ZeroDB error, getAvailableFields without dataSource, listCustomReports
 * with status/companyId filters, executeReport 401
 */

jest.mock('../../../models/CustomReport', () => {
  const MockCustomReport = jest.fn();
  MockCustomReport.findOne = jest.fn();
  MockCustomReport.find = jest.fn();
  MockCustomReport.countDocuments = jest.fn();
  MockCustomReport.deleteOne = jest.fn();
  MockCustomReport.create = jest.fn();
  MockCustomReport.updateOne = jest.fn();
  return MockCustomReport;
});

jest.mock('../../../models/CustomReportField', () => ({
  find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) })
}));

jest.mock('../../../models/ReportFilter', () => ({
  find: jest.fn()
}));

jest.mock('../../../services/queryBuilderService');
jest.mock('../../../services/reportAggregationService');
jest.mock('../../../services/zerodbService');

const controller = require('../../../controllers/customReportController');
const CustomReport = require('../../../models/CustomReport');
const CustomReportField = require('../../../models/CustomReportField');
const queryBuilderService = require('../../../services/queryBuilderService');
const reportAggregationService = require('../../../services/reportAggregationService');
const zeroDbService = require('../../../services/zerodbService');

describe('CustomReportController - Coverage', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-1', companyId: 'comp-1', role: 'employee' }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCustomReport - error propagation via next()', () => {
    it('should call next on unexpected error', async () => {
      req.body = { name: 'Report' };
      queryBuilderService.validateReportConfig = jest.fn().mockRejectedValue(new Error('Unexpected'));

      await controller.createCustomReport(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCustomReport - error propagation', () => {
    it('should call next on unexpected error', async () => {
      req.params.id = 'r1';
      CustomReport.findOne.mockRejectedValue(new Error('DB fail'));

      await controller.getCustomReport(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('listCustomReports - filters', () => {
    it('should apply status filter', async () => {
      req.query = { status: 'active' };
      CustomReport.find.mockResolvedValue([]);
      CustomReport.countDocuments.mockResolvedValue(0);

      await controller.listCustomReports(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply explicit companyId filter', async () => {
      req.query = { companyId: 'c2' };
      CustomReport.find.mockResolvedValue([]);
      CustomReport.countDocuments.mockResolvedValue(0);

      await controller.listCustomReports(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user not authenticated', async () => {
      req.user = null;
      await controller.listCustomReports(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next on error', async () => {
      CustomReport.find.mockRejectedValue(new Error('DB fail'));
      await controller.listCustomReports(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should clamp page and limit to minimum values', async () => {
      req.query = { page: '-5', limit: '0' };
      CustomReport.find.mockResolvedValue([]);
      CustomReport.countDocuments.mockResolvedValue(0);

      await controller.listCustomReports(req, res, next);
      const result = res.json.mock.calls[0][0];
      expect(result.currentPage).toBe(1);
      // limit '0' is falsy so || 10 fallback kicks in, then Math.max(10,1) = 10
      expect(result.limit).toBe(10);
    });

    it('should cap limit to 100', async () => {
      req.query = { limit: '500' };
      CustomReport.find.mockResolvedValue([]);
      CustomReport.countDocuments.mockResolvedValue(0);

      await controller.listCustomReports(req, res, next);
      expect(res.json.mock.calls[0][0].limit).toBe(100);
    });
  });

  describe('updateCustomReport - edge cases', () => {
    it('should return 401 if not authenticated', async () => {
      req.user = null;
      await controller.updateCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when report not found', async () => {
      req.params.id = 'missing';
      CustomReport.findOne.mockResolvedValue(null);
      await controller.updateCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid config on update', async () => {
      req.params.id = 'r1';
      req.body = { name: 'Updated' };
      CustomReport.findOne.mockResolvedValue({ reportId: 'r1', createdBy: 'user-1' });
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
        isValid: false, errors: ['Invalid']
      });

      await controller.updateCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle ZeroDB update failure gracefully', async () => {
      req.params.id = 'r1';
      req.body = { name: 'Updated' };
      CustomReport.findOne.mockResolvedValue({ reportId: 'r1', createdBy: 'user-1' });
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      CustomReport.updateOne.mockResolvedValue({});
      zeroDbService.updateRows = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

      await controller.updateCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should allow admin to update any report', async () => {
      req.params.id = 'r1';
      req.body = { name: 'Admin Updated' };
      req.user = { userId: 'admin-1', role: 'admin', companyId: 'comp-1' };
      CustomReport.findOne.mockResolvedValue({ reportId: 'r1', createdBy: 'other-user' });
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      CustomReport.updateOne.mockResolvedValue({});
      zeroDbService.updateRows = jest.fn().mockResolvedValue({});

      await controller.updateCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should call next on error', async () => {
      req.params.id = 'r1';
      CustomReport.findOne.mockRejectedValue(new Error('DB fail'));
      await controller.updateCustomReport(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('deleteCustomReport - edge cases', () => {
    it('should return 401 if not authenticated', async () => {
      req.user = null;
      await controller.deleteCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when not found', async () => {
      req.params.id = 'missing';
      CustomReport.findOne.mockResolvedValue(null);
      await controller.deleteCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle ZeroDB delete failure gracefully', async () => {
      req.params.id = 'r1';
      CustomReport.findOne.mockResolvedValue({ reportId: 'r1', createdBy: 'user-1' });
      CustomReport.deleteOne.mockResolvedValue({});
      zeroDbService.deleteRows = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

      await controller.deleteCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should allow admin to delete any report', async () => {
      req.params.id = 'r1';
      req.user = { userId: 'admin-1', role: 'admin', companyId: 'comp-1' };
      CustomReport.findOne.mockResolvedValue({ reportId: 'r1', createdBy: 'other-user' });
      CustomReport.deleteOne.mockResolvedValue({});
      zeroDbService.deleteRows = jest.fn().mockResolvedValue({});

      await controller.deleteCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should call next on error', async () => {
      req.params.id = 'r1';
      CustomReport.findOne.mockRejectedValue(new Error('DB'));
      await controller.deleteCustomReport(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('executeCustomReport - edge cases', () => {
    it('should return 401 if not authenticated', async () => {
      req.user = null;
      await controller.executeCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next on error', async () => {
      req.params.id = 'r1';
      CustomReport.findOne.mockRejectedValue(new Error('DB'));
      await controller.executeCustomReport(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getDataSources - edge cases', () => {
    it('should return 401 if not authenticated', async () => {
      req.user = null;
      await controller.getDataSources(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle tables as plain strings', async () => {
      zeroDbService.listTables = jest.fn().mockResolvedValue(['stakeholders', 'transactions']);
      await controller.getDataSources(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      const sources = res.json.mock.calls[0][0].dataSources;
      expect(sources[0].name).toBe('stakeholders');
      expect(sources[0].recordCount).toBe(0);
    });

    it('should call next on general error', async () => {
      const error = new Error('General error');
      // Make req.user getter throw
      Object.defineProperty(req, 'user', { get: () => { throw error; } });
      await controller.getDataSources(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getAvailableFields', () => {
    it('should return fields for specific dataSource', async () => {
      req.query = { dataSource: 'stakeholders' };
      queryBuilderService.getAvailableFields = jest.fn().mockResolvedValue([{ name: 'name' }]);

      await controller.getAvailableFields(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0]).toHaveProperty('fields');
    });

    it('should return grouped fields when no dataSource specified', async () => {
      req.query = {};
      const mockFields = [
        { dataSource: 'stakeholders', displayName: 'Name' },
        { dataSource: 'transactions', displayName: 'Amount' }
      ];
      CustomReportField.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockFields)
      });

      await controller.getAvailableFields(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0]).toHaveProperty('fieldsByDataSource');
    });

    it('should return 401 if not authenticated', async () => {
      req.user = null;
      await controller.getAvailableFields(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next on error', async () => {
      req.query = { dataSource: 'bad' };
      queryBuilderService.getAvailableFields = jest.fn().mockRejectedValue(new Error('Error'));
      await controller.getAvailableFields(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('previewReport - edge cases', () => {
    it('should return 401 if not authenticated', async () => {
      req.user = null;
      await controller.previewReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next on error', async () => {
      req.body = { dataSources: ['s'] };
      queryBuilderService.validateReportConfig = jest.fn().mockRejectedValue(new Error('Error'));
      await controller.previewReport(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should use default limit when not specified', async () => {
      req.body = { dataSources: ['s'], fields: ['name'] };
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});
      reportAggregationService.executeReport = jest.fn().mockResolvedValue([]);

      await controller.previewReport(req, res, next);
      expect(reportAggregationService.executeReport).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
        expect.any(Object)
      );
    });
  });
});
