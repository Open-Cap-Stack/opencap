/**
 * StakeholderReportController Unit Tests
 * Issue #198: Enhance Stakeholder Report Generation
 *
 * TDD tests for stakeholder report controller
 */

// Mock dependencies before importing
jest.mock('../../../services/stakeholderReportService');

const stakeholderReportService = require('../../../services/stakeholderReportService');
const stakeholderReportController = require('../../../controllers/stakeholderReportController');

describe('StakeholderReportController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getStakeholderReports', () => {
    it('should return all reports for a stakeholder', async () => {
      const mockReports = [
        { reportId: 'SR-001', reportType: 'holdings' },
        { reportId: 'SR-002', reportType: 'transactions' }
      ];

      mockReq.params.id = 'STK-001';
      stakeholderReportService.getStakeholderReports.mockResolvedValue(mockReports);

      await stakeholderReportController.getStakeholderReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports
      });
    });

    it('should filter reports by type', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.query.reportType = 'holdings';
      stakeholderReportService.getStakeholderReports.mockResolvedValue([
        { reportId: 'SR-001', reportType: 'holdings' }
      ]);

      await stakeholderReportController.getStakeholderReports(mockReq, mockRes);

      expect(stakeholderReportService.getStakeholderReports).toHaveBeenCalledWith(
        'STK-001',
        { reportType: 'holdings' }
      );
    });

    it('should return 400 if stakeholder ID is missing', async () => {
      mockReq.params = {};

      await stakeholderReportController.getStakeholderReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Stakeholder ID is required'
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.params.id = 'STK-001';
      stakeholderReportService.getStakeholderReports.mockRejectedValue(
        new Error('Database error')
      );

      await stakeholderReportController.getStakeholderReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('generateHoldingsReport', () => {
    it('should generate a holdings report successfully', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        reportType: 'holdings',
        status: 'completed'
      };

      mockReq.params.id = 'STK-001';
      mockReq.body = { companyId: 'COMP-001', format: 'pdf' };
      stakeholderReportService.generateHoldingsReport.mockResolvedValue(mockReport);

      await stakeholderReportController.generateHoldingsReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 400 if companyId is missing', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = {};

      await stakeholderReportController.generateHoldingsReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Company ID is required'
      });
    });

    it('should return 404 if stakeholder not found', async () => {
      mockReq.params.id = 'INVALID-STK';
      mockReq.body = { companyId: 'COMP-001' };
      stakeholderReportService.generateHoldingsReport.mockRejectedValue(
        new Error('Stakeholder not found')
      );

      await stakeholderReportController.generateHoldingsReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Stakeholder not found'
      });
    });
  });

  describe('generateTransactionsReport', () => {
    it('should generate a transactions report successfully', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        reportType: 'transactions',
        status: 'completed'
      };

      mockReq.params.id = 'STK-001';
      mockReq.body = {
        companyId: 'COMP-001',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
      stakeholderReportService.generateTransactionsReport.mockResolvedValue(mockReport);

      await stakeholderReportController.generateTransactionsReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
      expect(stakeholderReportService.generateTransactionsReport).toHaveBeenCalledWith(
        'STK-001',
        'COMP-001',
        expect.objectContaining({
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        })
      );
    });

    it('should return 400 if companyId is missing', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = { startDate: '2023-01-01' };

      await stakeholderReportController.generateTransactionsReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('generateValuationsReport', () => {
    it('should generate a valuations report successfully', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        reportType: 'valuations',
        status: 'completed'
      };

      mockReq.params.id = 'STK-001';
      mockReq.body = { companyId: 'COMP-001' };
      stakeholderReportService.generateValuationsReport.mockResolvedValue(mockReport);

      await stakeholderReportController.generateValuationsReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('generateTaxReport', () => {
    it('should generate a tax report successfully', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        reportType: 'tax',
        status: 'completed'
      };

      mockReq.params.id = 'STK-001';
      mockReq.body = { companyId: 'COMP-001', taxYear: 2023 };
      stakeholderReportService.generateTaxReport.mockResolvedValue(mockReport);

      await stakeholderReportController.generateTaxReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 400 if taxYear is missing', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = { companyId: 'COMP-001' };

      await stakeholderReportController.generateTaxReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tax year is required'
      });
    });

    it('should return 400 for invalid tax year', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = { companyId: 'COMP-001', taxYear: 'invalid' };
      stakeholderReportService.generateTaxReport.mockRejectedValue(
        new Error('Invalid tax year')
      );

      await stakeholderReportController.generateTaxReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('downloadReport', () => {
    it('should return download URL for completed report', async () => {
      const mockDownload = {
        reportId: 'SR-12345678',
        fileUrl: '/files/reports/SR-12345678.pdf',
        format: 'pdf'
      };

      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'SR-12345678';
      stakeholderReportService.downloadReport.mockResolvedValue(mockDownload);

      await stakeholderReportController.downloadReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDownload
      });
    });

    it('should return 404 if report not found', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'INVALID-ID';
      stakeholderReportService.downloadReport.mockRejectedValue(
        new Error('Report not found')
      );

      await stakeholderReportController.downloadReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report not found'
      });
    });

    it('should return 400 if report not ready', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'SR-12345678';
      stakeholderReportService.downloadReport.mockRejectedValue(
        new Error('Report is not ready for download')
      );

      await stakeholderReportController.downloadReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if reportId is missing', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = undefined;

      await stakeholderReportController.downloadReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report ID is required'
      });
    });
  });

  describe('scheduleAutomatedDelivery', () => {
    it('should create an automated delivery schedule', async () => {
      const mockSchedule = {
        reportId: 'SR-12345678',
        stakeholderId: 'STK-001',
        schedule: '0 9 1 * *',
        status: 'scheduled'
      };

      mockReq.params.id = 'STK-001';
      mockReq.body = {
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: ['investor@example.com'],
        format: 'pdf'
      };
      stakeholderReportService.scheduleAutomatedDelivery.mockResolvedValue(mockSchedule);

      await stakeholderReportController.scheduleAutomatedDelivery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSchedule
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = { companyId: 'COMP-001' };

      await stakeholderReportController.scheduleAutomatedDelivery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid schedule format', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = {
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: 'invalid-cron',
        recipients: ['test@example.com']
      };
      stakeholderReportService.scheduleAutomatedDelivery.mockRejectedValue(
        new Error('Invalid schedule format')
      );

      await stakeholderReportController.scheduleAutomatedDelivery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid email format', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = {
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: ['invalid-email']
      };
      stakeholderReportService.scheduleAutomatedDelivery.mockRejectedValue(
        new Error('Invalid email format')
      );

      await stakeholderReportController.scheduleAutomatedDelivery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('emailReport', () => {
    it('should email a report successfully', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'completed',
        reportType: 'holdings'
      };

      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'SR-12345678';
      mockReq.body = {
        to: 'investor@example.com',
        subject: 'Your Holdings Report',
        message: 'Please find your report attached.'
      };
      stakeholderReportService.getReportById.mockResolvedValue(mockReport);

      await stakeholderReportController.emailReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          reportId: 'SR-12345678',
          to: 'investor@example.com',
          status: 'sent'
        })
      });
    });

    it('should return 400 if recipient email is missing', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'SR-12345678';
      mockReq.body = {};

      await stakeholderReportController.emailReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Recipient email is required'
      });
    });

    it('should return 404 if report not found', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'INVALID-ID';
      mockReq.body = { to: 'investor@example.com' };
      stakeholderReportService.getReportById.mockResolvedValue(null);

      await stakeholderReportController.emailReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report not found'
      });
    });

    it('should return 400 if report is not ready', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'SR-12345678';
      mockReq.body = { to: 'investor@example.com' };
      stakeholderReportService.getReportById.mockResolvedValue({
        reportId: 'SR-12345678',
        status: 'pending'
      });

      await stakeholderReportController.emailReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report is not ready to be emailed'
      });
    });
  });

  describe('getReportById', () => {
    it('should return a report by ID', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        stakeholderId: 'STK-001',
        reportType: 'holdings',
        status: 'completed'
      };

      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'SR-12345678';
      stakeholderReportService.getReportById.mockResolvedValue(mockReport);

      await stakeholderReportController.getReportById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 404 if report not found', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.params.reportId = 'INVALID-ID';
      stakeholderReportService.getReportById.mockResolvedValue(null);

      await stakeholderReportController.getReportById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report not found'
      });
    });
  });

  describe('Input Validation', () => {
    it('should sanitize stakeholder ID', async () => {
      mockReq.params.id = '<script>alert("xss")</script>';
      mockReq.body = { companyId: 'COMP-001' };

      await stakeholderReportController.generateHoldingsReport(mockReq, mockRes);

      // Service should receive sanitized input
      expect(stakeholderReportService.generateHoldingsReport).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>'),
        expect.anything(),
        expect.anything()
      );
    });
  });
});
