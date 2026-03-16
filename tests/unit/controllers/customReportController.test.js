/**
 * CustomReportController Tests
 * Issue #197: Build Custom Report Builder Engine
 */

// Mock models with static methods (no constructor usage)
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
  find: jest.fn()
}));

jest.mock('../../../models/ReportFilter', () => ({
  find: jest.fn()
}));

jest.mock('../../../services/queryBuilderService');
jest.mock('../../../services/reportAggregationService');
jest.mock('../../../services/zerodbService');

const customReportController = require('../../../controllers/customReportController');
const CustomReport = require('../../../models/CustomReport');
const ReportFilter = require('../../../models/ReportFilter');
const queryBuilderService = require('../../../services/queryBuilderService');
const reportAggregationService = require('../../../services/reportAggregationService');
const zeroDbService = require('../../../services/zerodbService');

describe('CustomReportController Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-001', companyId: 'company-001', role: 'user' }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCustomReport', () => {
    it('should create report successfully', async () => {
      const reportData = { name: 'Test Report', dataSources: ['stakeholders'], fields: ['name', 'email'], companyId: 'company-001' };
      req.body = reportData;
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      const createdReport = { reportId: 'report-001', ...reportData, createdBy: 'user-001' };
      CustomReport.create.mockResolvedValue(createdReport);
      zeroDbService.insertRow = jest.fn().mockResolvedValue({});

      await customReportController.createCustomReport(req, res, next);

      expect(queryBuilderService.validateReportConfig).toHaveBeenCalledWith(reportData);
      expect(CustomReport.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle ZeroDB insertion failure gracefully', async () => {
      req.body = { name: 'Test Report', dataSources: ['stakeholders'], fields: ['name'], companyId: 'company-001' };
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      CustomReport.create.mockResolvedValue({ reportId: 'report-002' });
      zeroDbService.insertRow = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

      await customReportController.createCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 401 when user not authenticated', async () => {
      req.user = null;
      await customReportController.createCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should return 400 when report config is invalid', async () => {
      req.body = { name: 'Invalid Report', dataSources: [], fields: [] };
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
        isValid: false, errors: ['At least one data source is required']
      });

      await customReportController.createCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid report configuration', errors: expect.any(Array) });
    });
  });

  describe('getCustomReport', () => {
    it('should return report when user is creator', async () => {
      req.params.id = 'report-001';
      const mockReport = { reportId: 'report-001', name: 'Test Report', createdBy: 'user-001', isPublic: false, sharedWith: [] };
      CustomReport.findOne.mockResolvedValue(mockReport);

      await customReportController.getCustomReport(req, res, next);
      expect(CustomReport.findOne).toHaveBeenCalledWith({ reportId: 'report-001' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should return report when report is public', async () => {
      req.params.id = 'report-002';
      req.user.userId = 'user-002';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-002', createdBy: 'user-001', isPublic: true, sharedWith: [] });

      await customReportController.getCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return report when user is in sharedWith list', async () => {
      req.params.id = 'report-003';
      req.user.userId = 'user-002';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-003', createdBy: 'user-001', isPublic: false, sharedWith: ['user-002'] });

      await customReportController.getCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return report when user is admin', async () => {
      req.params.id = 'report-004';
      req.user.userId = 'admin-001';
      req.user.role = 'admin';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-004', createdBy: 'user-001', isPublic: false, sharedWith: [] });

      await customReportController.getCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when report not found', async () => {
      req.params.id = 'nonexistent';
      CustomReport.findOne.mockResolvedValue(null);

      await customReportController.getCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Report not found' });
    });

    it('should return 403 when user lacks access', async () => {
      req.params.id = 'report-005';
      req.user.userId = 'user-002';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-005', createdBy: 'user-001', isPublic: false, sharedWith: [] });

      await customReportController.getCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 401 when user not authenticated', async () => {
      req.user = null;
      await customReportController.getCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('listCustomReports', () => {
    it('should list reports for regular user', async () => {
      const mockReports = [{ reportId: 'report-001' }, { reportId: 'report-002' }];
      CustomReport.find.mockReturnValue({ skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(mockReports) });
      CustomReport.countDocuments.mockResolvedValue(2);

      await customReportController.listCustomReports(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ reports: mockReports, totalCount: 2, currentPage: 1, totalPages: 1, limit: 10 });
    });

    it('should list all reports for admin', async () => {
      req.user.role = 'admin';
      CustomReport.find.mockReturnValue({ skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([]) });
      CustomReport.countDocuments.mockResolvedValue(0);

      await customReportController.listCustomReports(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle pagination correctly', async () => {
      req.query.page = '2';
      req.query.limit = '5';
      CustomReport.find.mockReturnValue({ skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([]) });
      CustomReport.countDocuments.mockResolvedValue(15);

      await customReportController.listCustomReports(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ reports: [], totalCount: 15, currentPage: 2, totalPages: 3, limit: 5 });
    });
  });

  describe('executeCustomReport', () => {
    it('should execute report successfully', async () => {
      req.params.id = 'report-001';
      const mockReport = { reportId: 'report-001', name: 'Test Report', createdBy: 'user-001', fields: ['name'], executionCount: 0, isPublic: false, sharedWith: [] };
      CustomReport.findOne.mockResolvedValue(mockReport);
      CustomReport.updateOne.mockResolvedValue({ modifiedCount: 1 });
      ReportFilter.find.mockResolvedValue([]);
      queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});
      const mockResults = [{ name: 'John' }, { name: 'Jane' }];
      reportAggregationService.executeReport = jest.fn().mockResolvedValue(mockResults);

      await customReportController.executeCustomReport(req, res, next);
      expect(CustomReport.updateOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when report not found', async () => {
      req.params.id = 'nonexistent';
      CustomReport.findOne.mockResolvedValue(null);
      await customReportController.executeCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user lacks access', async () => {
      req.params.id = 'report-002';
      req.user.userId = 'user-002';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-002', createdBy: 'user-001', isPublic: false, sharedWith: [] });
      await customReportController.executeCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getDataSources', () => {
    it('should return data sources from ZeroDB', async () => {
      zeroDbService.listTables = jest.fn().mockResolvedValue([{ table_name: 'stakeholders', row_count: 100 }, { table_name: 'transactions', row_count: 500 }]);
      await customReportController.getDataSources(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        dataSources: [{ name: 'stakeholders', displayName: 'Stakeholders', recordCount: 100 }, { name: 'transactions', displayName: 'Transactions', recordCount: 500 }]
      });
    });

    it('should return default data sources on ZeroDB error', async () => {
      zeroDbService.listTables = jest.fn().mockRejectedValue(new Error('ZeroDB error'));
      await customReportController.getDataSources(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('previewReport', () => {
    it('should return preview data successfully', async () => {
      req.body = { dataSources: ['stakeholders'], fields: ['name', 'email'], limit: 10 };
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});
      reportAggregationService.executeReport = jest.fn().mockResolvedValue([{ name: 'John' }]);

      await customReportController.previewReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ preview: true, rowCount: 1, data: [{ name: 'John' }] });
    });

    it('should limit preview to 50 rows maximum', async () => {
      req.body = { dataSources: ['stakeholders'], fields: ['name'], limit: 1000 };
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});
      reportAggregationService.executeReport = jest.fn().mockResolvedValue([]);

      await customReportController.previewReport(req, res, next);
      expect(reportAggregationService.executeReport).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }), expect.any(Object));
    });

    it('should return 400 for invalid configuration', async () => {
      req.body = { dataSources: [], fields: [] };
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: false, errors: ['Invalid configuration'] });

      await customReportController.previewReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateCustomReport', () => {
    it('should update report successfully', async () => {
      req.params.id = 'report-001';
      req.body = { name: 'Updated Report', fields: ['name', 'email', 'phone'] };
      const mockReport = { reportId: 'report-001', createdBy: 'user-001' };
      CustomReport.findOne.mockResolvedValue(mockReport);
      CustomReport.updateOne.mockResolvedValue({ modifiedCount: 1 });
      queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({ isValid: true, errors: [] });
      zeroDbService.updateRows = jest.fn().mockResolvedValue({});

      await customReportController.updateCustomReport(req, res, next);
      expect(CustomReport.updateOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 when user is not creator', async () => {
      req.params.id = 'report-001';
      req.user.userId = 'user-002';
      req.body = { name: 'Updated' };
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-001', createdBy: 'user-001' });

      await customReportController.updateCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteCustomReport', () => {
    it('should delete report successfully', async () => {
      req.params.id = 'report-001';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-001', createdBy: 'user-001' });
      CustomReport.deleteOne.mockResolvedValue({});
      zeroDbService.deleteRows = jest.fn().mockResolvedValue({});

      await customReportController.deleteCustomReport(req, res, next);
      expect(CustomReport.deleteOne).toHaveBeenCalledWith({ reportId: 'report-001' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Report deleted successfully' });
    });

    it('should return 403 when user is not creator', async () => {
      req.params.id = 'report-001';
      req.user.userId = 'user-002';
      CustomReport.findOne.mockResolvedValue({ reportId: 'report-001', createdBy: 'user-001' });

      await customReportController.deleteCustomReport(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
