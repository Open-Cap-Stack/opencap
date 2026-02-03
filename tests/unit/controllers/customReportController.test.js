/**
 * CustomReportController Tests
 * Issue #197: Build Custom Report Builder Engine
 */

const customReportController = require('../../../controllers/customReportController');
const CustomReport = require('../../../models/CustomReport');
const ReportFilter = require('../../../models/ReportFilter');
const queryBuilderService = require('../../../services/queryBuilderService');
const reportAggregationService = require('../../../services/reportAggregationService');
const zeroDbService = require('../../../services/zeroDbService');

// Mock dependencies
jest.mock('../../../models/CustomReport');
jest.mock('../../../models/ReportFilter');
jest.mock('../../../services/queryBuilderService');
jest.mock('../../../services/reportAggregationService');
jest.mock('../../../services/zeroDbService');

describe('CustomReportController Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 'user-001',
        companyId: 'company-001',
        role: 'user'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('createCustomReport', () => {
    describe('When creating a valid custom report', () => {
      it('should create report successfully', async () => {
        const reportData = {
          name: 'Test Report',
          dataSources: ['stakeholders'],
          fields: ['name', 'email'],
          companyId: 'company-001'
        };

        req.body = reportData;

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: true,
          errors: []
        });

        const mockReport = {
          reportId: 'report-001',
          ...reportData,
          createdBy: 'user-001',
          save: jest.fn().mockResolvedValue({
            reportId: 'report-001',
            ...reportData
          })
        };

        CustomReport.mockImplementation(() => mockReport);

        zeroDbService.insertRow = jest.fn().mockResolvedValue({});

        await customReportController.createCustomReport(req, res, next);

        expect(queryBuilderService.validateReportConfig).toHaveBeenCalledWith(reportData);
        expect(mockReport.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
      });

      it('should handle ZeroDB insertion failure gracefully', async () => {
        const reportData = {
          name: 'Test Report',
          dataSources: ['stakeholders'],
          fields: ['name'],
          companyId: 'company-001'
        };

        req.body = reportData;

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: true,
          errors: []
        });

        const mockReport = {
          reportId: 'report-002',
          ...reportData,
          save: jest.fn().mockResolvedValue({ reportId: 'report-002', ...reportData })
        };

        CustomReport.mockImplementation(() => mockReport);

        zeroDbService.insertRow = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

        await customReportController.createCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
      });
    });

    describe('When creating invalid custom report', () => {
      it('should return 401 when user not authenticated', async () => {
        req.user = null;

        await customReportController.createCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
      });

      it('should return 400 when report config is invalid', async () => {
        req.body = {
          name: 'Invalid Report',
          dataSources: [],
          fields: []
        };

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: false,
          errors: ['At least one data source is required', 'At least one field is required']
        });

        await customReportController.createCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Invalid report configuration',
          errors: expect.any(Array)
        });
      });
    });
  });

  describe('getCustomReport', () => {
    describe('When retrieving existing report', () => {
      it('should return report when user is creator', async () => {
        req.params.id = 'report-001';

        const mockReport = {
          reportId: 'report-001',
          name: 'Test Report',
          createdBy: 'user-001',
          isPublic: false,
          sharedWith: []
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.getCustomReport(req, res, next);

        expect(CustomReport.findOne).toHaveBeenCalledWith({ reportId: 'report-001' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockReport);
      });

      it('should return report when report is public', async () => {
        req.params.id = 'report-002';
        req.user.id = 'user-002';

        const mockReport = {
          reportId: 'report-002',
          name: 'Public Report',
          createdBy: 'user-001',
          isPublic: true,
          sharedWith: []
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.getCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockReport);
      });

      it('should return report when user is in sharedWith list', async () => {
        req.params.id = 'report-003';
        req.user.id = 'user-002';

        const mockReport = {
          reportId: 'report-003',
          name: 'Shared Report',
          createdBy: 'user-001',
          isPublic: false,
          sharedWith: ['user-002']
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.getCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockReport);
      });

      it('should return report when user is admin', async () => {
        req.params.id = 'report-004';
        req.user.id = 'admin-001';
        req.user.role = 'admin';

        const mockReport = {
          reportId: 'report-004',
          name: 'Private Report',
          createdBy: 'user-001',
          isPublic: false,
          sharedWith: []
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.getCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockReport);
      });
    });

    describe('When retrieving non-existent or unauthorized report', () => {
      it('should return 404 when report not found', async () => {
        req.params.id = 'nonexistent';

        CustomReport.findOne = jest.fn().mockResolvedValue(null);

        await customReportController.getCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Report not found' });
      });

      it('should return 403 when user lacks access', async () => {
        req.params.id = 'report-005';
        req.user.id = 'user-002';

        const mockReport = {
          reportId: 'report-005',
          name: 'Private Report',
          createdBy: 'user-001',
          isPublic: false,
          sharedWith: []
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.getCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Access denied to this report' });
      });

      it('should return 401 when user not authenticated', async () => {
        req.user = null;

        await customReportController.getCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
      });
    });
  });

  describe('listCustomReports', () => {
    describe('When listing reports', () => {
      it('should list reports for regular user', async () => {
        const mockReports = [
          { reportId: 'report-001', name: 'Report 1', createdBy: 'user-001' },
          { reportId: 'report-002', name: 'Report 2', isPublic: true }
        ];

        CustomReport.find = jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue(mockReports)
        });

        CustomReport.countDocuments = jest.fn().mockResolvedValue(2);

        await customReportController.listCustomReports(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          reports: mockReports,
          totalCount: 2,
          currentPage: 1,
          totalPages: 1,
          limit: 10
        });
      });

      it('should list all reports for admin', async () => {
        req.user.role = 'admin';

        const mockReports = [
          { reportId: 'report-001', name: 'Report 1' },
          { reportId: 'report-002', name: 'Report 2' }
        ];

        CustomReport.find = jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue(mockReports)
        });

        CustomReport.countDocuments = jest.fn().mockResolvedValue(2);

        await customReportController.listCustomReports(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
      });

      it('should handle pagination correctly', async () => {
        req.query.page = '2';
        req.query.limit = '5';

        CustomReport.find = jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue([])
        });

        CustomReport.countDocuments = jest.fn().mockResolvedValue(15);

        await customReportController.listCustomReports(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          reports: [],
          totalCount: 15,
          currentPage: 2,
          totalPages: 3,
          limit: 5
        });
      });
    });
  });

  describe('executeCustomReport', () => {
    describe('When executing report', () => {
      it('should execute report successfully', async () => {
        req.params.id = 'report-001';

        const mockReport = {
          reportId: 'report-001',
          name: 'Test Report',
          createdBy: 'user-001',
          dataSources: ['stakeholders'],
          fields: ['name', 'email'],
          executionCount: 0,
          save: jest.fn().mockResolvedValue({})
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        ReportFilter.find = jest.fn().mockResolvedValue([]);

        queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});

        const mockResults = [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ];

        reportAggregationService.executeReport = jest.fn().mockResolvedValue(mockResults);

        await customReportController.executeCustomReport(req, res, next);

        expect(mockReport.executionCount).toBe(1);
        expect(mockReport.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          reportId: 'report-001',
          reportName: 'Test Report',
          executedAt: expect.any(Date),
          rowCount: 2,
          data: mockResults
        });
      });

      it('should return 404 when report not found', async () => {
        req.params.id = 'nonexistent';

        CustomReport.findOne = jest.fn().mockResolvedValue(null);

        await customReportController.executeCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Report not found' });
      });

      it('should return 403 when user lacks access', async () => {
        req.params.id = 'report-002';
        req.user.id = 'user-002';

        const mockReport = {
          reportId: 'report-002',
          name: 'Private Report',
          createdBy: 'user-001',
          isPublic: false,
          sharedWith: []
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.executeCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Access denied to this report' });
      });
    });
  });

  describe('getDataSources', () => {
    describe('When retrieving data sources', () => {
      it('should return data sources from ZeroDB', async () => {
        const mockTables = [
          { table_name: 'stakeholders', row_count: 100 },
          { table_name: 'transactions', row_count: 500 }
        ];

        zeroDbService.listTables = jest.fn().mockResolvedValue(mockTables);

        await customReportController.getDataSources(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          dataSources: [
            { name: 'stakeholders', displayName: 'Stakeholders', recordCount: 100 },
            { name: 'transactions', displayName: 'Transactions', recordCount: 500 }
          ]
        });
      });

      it('should return default data sources on ZeroDB error', async () => {
        zeroDbService.listTables = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

        await customReportController.getDataSources(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          dataSources: expect.arrayContaining([
            expect.objectContaining({ name: 'stakeholders' })
          ])
        });
      });
    });
  });

  describe('previewReport', () => {
    describe('When previewing report', () => {
      it('should return preview data successfully', async () => {
        req.body = {
          dataSources: ['stakeholders'],
          fields: ['name', 'email'],
          limit: 10
        };

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: true,
          errors: []
        });

        queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});

        const mockResults = [
          { name: 'John Doe', email: 'john@example.com' }
        ];

        reportAggregationService.executeReport = jest.fn().mockResolvedValue(mockResults);

        await customReportController.previewReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          preview: true,
          rowCount: 1,
          data: mockResults
        });
      });

      it('should limit preview to 50 rows maximum', async () => {
        req.body = {
          dataSources: ['stakeholders'],
          fields: ['name'],
          limit: 1000
        };

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: true,
          errors: []
        });

        queryBuilderService.buildFilterQuery = jest.fn().mockReturnValue({});
        reportAggregationService.executeReport = jest.fn().mockResolvedValue([]);

        await customReportController.previewReport(req, res, next);

        expect(reportAggregationService.executeReport).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 50 }),
          expect.any(Object)
        );
      });

      it('should return 400 for invalid configuration', async () => {
        req.body = {
          dataSources: [],
          fields: []
        };

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: false,
          errors: ['Invalid configuration']
        });

        await customReportController.previewReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Invalid report configuration',
          errors: ['Invalid configuration']
        });
      });
    });
  });

  describe('updateCustomReport', () => {
    describe('When updating report', () => {
      it('should update report successfully', async () => {
        req.params.id = 'report-001';
        req.body = {
          name: 'Updated Report',
          fields: ['name', 'email', 'phone']
        };

        const mockReport = {
          reportId: 'report-001',
          name: 'Original Report',
          createdBy: 'user-001',
          save: jest.fn().mockResolvedValue({})
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        queryBuilderService.validateReportConfig = jest.fn().mockResolvedValue({
          isValid: true,
          errors: []
        });

        zeroDbService.updateRows = jest.fn().mockResolvedValue({});

        await customReportController.updateCustomReport(req, res, next);

        expect(mockReport.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should return 403 when user is not creator', async () => {
        req.params.id = 'report-001';
        req.user.id = 'user-002';
        req.body = { name: 'Updated' };

        const mockReport = {
          reportId: 'report-001',
          createdBy: 'user-001'
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.updateCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Not authorized to update this report'
        });
      });
    });
  });

  describe('deleteCustomReport', () => {
    describe('When deleting report', () => {
      it('should delete report successfully', async () => {
        req.params.id = 'report-001';

        const mockReport = {
          reportId: 'report-001',
          createdBy: 'user-001'
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);
        CustomReport.deleteOne = jest.fn().mockResolvedValue({});
        zeroDbService.deleteRows = jest.fn().mockResolvedValue({});

        await customReportController.deleteCustomReport(req, res, next);

        expect(CustomReport.deleteOne).toHaveBeenCalledWith({ reportId: 'report-001' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Report deleted successfully' });
      });

      it('should return 403 when user is not creator', async () => {
        req.params.id = 'report-001';
        req.user.id = 'user-002';

        const mockReport = {
          reportId: 'report-001',
          createdBy: 'user-001'
        };

        CustomReport.findOne = jest.fn().mockResolvedValue(mockReport);

        await customReportController.deleteCustomReport(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });
});
