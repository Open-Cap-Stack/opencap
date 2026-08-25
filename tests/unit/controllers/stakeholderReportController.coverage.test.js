/**
 * StakeholderReportController Coverage Tests
 * Covers uncovered lines: sanitizeInput branches, emailReport edge cases,
 * downloadReport error branches, scheduleAutomatedDelivery validation,
 * generateTaxReport invalid year error, getReportById
 */

jest.mock('../../../services/stakeholderReportService');

const stakeholderReportService = require('../../../services/stakeholderReportService');
const controller = require('../../../controllers/stakeholderReportController');

describe('StakeholderReportController - Coverage', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: 'stk-1' },
      body: {},
      query: {}
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.clearAllMocks();
  });

  // ---- getStakeholderReports ----
  describe('getStakeholderReports', () => {
    it('should return reports with filters', async () => {
      req.query = { reportType: 'holdings', status: 'completed' };
      stakeholderReportService.getStakeholderReports = jest.fn().mockResolvedValue([{ id: 'r1' }]);

      await controller.getStakeholderReports(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(stakeholderReportService.getStakeholderReports).toHaveBeenCalledWith('stk-1', {
        reportType: 'holdings',
        status: 'completed'
      });
    });

    it('should handle error', async () => {
      stakeholderReportService.getStakeholderReports = jest.fn().mockRejectedValue(new Error('DB'));
      await controller.getStakeholderReports(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 400 for missing stakeholder ID', async () => {
      req.params = { id: '' };
      await controller.getStakeholderReports(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---- generateHoldingsReport ----
  describe('generateHoldingsReport', () => {
    it('should generate report', async () => {
      req.body = { companyId: 'c1', format: 'csv' };
      stakeholderReportService.generateHoldingsReport = jest.fn().mockResolvedValue({ id: 'r1' });

      await controller.generateHoldingsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '' };
      req.body = { companyId: 'c1' };
      await controller.generateHoldingsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no company ID', async () => {
      req.body = {};
      await controller.generateHoldingsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for stakeholder not found', async () => {
      req.body = { companyId: 'c1' };
      stakeholderReportService.generateHoldingsReport = jest.fn().mockRejectedValue(new Error('Stakeholder not found'));
      await controller.generateHoldingsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should use default pdf format', async () => {
      req.body = { companyId: 'c1' };
      stakeholderReportService.generateHoldingsReport = jest.fn().mockResolvedValue({ id: 'r1' });
      await controller.generateHoldingsReport(req, res);
      expect(stakeholderReportService.generateHoldingsReport).toHaveBeenCalledWith('stk-1', 'c1', { format: 'pdf' });
    });
  });

  // ---- generateTransactionsReport ----
  describe('generateTransactionsReport', () => {
    it('should generate with date range', async () => {
      req.body = { companyId: 'c1', startDate: '2026-01-01', endDate: '2026-12-31', format: 'xlsx' };
      stakeholderReportService.generateTransactionsReport = jest.fn().mockResolvedValue({ id: 'r1' });

      await controller.generateTransactionsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '' };
      req.body = { companyId: 'c1' };
      await controller.generateTransactionsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no company ID', async () => {
      req.body = {};
      await controller.generateTransactionsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for stakeholder not found', async () => {
      req.body = { companyId: 'c1' };
      stakeholderReportService.generateTransactionsReport = jest.fn().mockRejectedValue(new Error('Stakeholder not found'));
      await controller.generateTransactionsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle generic error', async () => {
      req.body = { companyId: 'c1' };
      stakeholderReportService.generateTransactionsReport = jest.fn().mockRejectedValue(new Error('Unknown'));
      await controller.generateTransactionsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- generateValuationsReport ----
  describe('generateValuationsReport', () => {
    it('should generate report', async () => {
      req.body = { companyId: 'c1' };
      stakeholderReportService.generateValuationsReport = jest.fn().mockResolvedValue({ id: 'r1' });

      await controller.generateValuationsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '' };
      req.body = { companyId: 'c1' };
      await controller.generateValuationsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no company ID', async () => {
      req.body = {};
      await controller.generateValuationsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for stakeholder not found', async () => {
      req.body = { companyId: 'c1' };
      stakeholderReportService.generateValuationsReport = jest.fn().mockRejectedValue(new Error('Stakeholder not found'));
      await controller.generateValuationsReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---- generateTaxReport ----
  describe('generateTaxReport', () => {
    it('should generate tax report', async () => {
      req.body = { companyId: 'c1', taxYear: 2025 };
      stakeholderReportService.generateTaxReport = jest.fn().mockResolvedValue({ id: 'r1' });

      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if no taxYear', async () => {
      req.body = { companyId: 'c1' };
      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '' };
      req.body = { companyId: 'c1', taxYear: 2025 };
      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no company ID', async () => {
      req.body = { taxYear: 2025 };
      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for stakeholder not found', async () => {
      req.body = { companyId: 'c1', taxYear: 2025 };
      stakeholderReportService.generateTaxReport = jest.fn().mockRejectedValue(new Error('Stakeholder not found'));
      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid tax year', async () => {
      req.body = { companyId: 'c1', taxYear: 2025 };
      stakeholderReportService.generateTaxReport = jest.fn().mockRejectedValue(new Error('Invalid tax year'));
      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for other errors', async () => {
      req.body = { companyId: 'c1', taxYear: 2025 };
      stakeholderReportService.generateTaxReport = jest.fn().mockRejectedValue(new Error('Unknown'));
      await controller.generateTaxReport(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- emailReport ----
  describe('emailReport', () => {
    it('should email report', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      req.body = { to: 'a@b.com', subject: 'Test <script>', message: 'Hello' };
      stakeholderReportService.getReportById = jest.fn().mockResolvedValue({ id: 'r1', status: 'completed' });

      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '', reportId: 'r1' };
      req.body = { to: 'a@b.com' };
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no report ID', async () => {
      req.params = { id: 'stk-1', reportId: '' };
      req.body = { to: 'a@b.com' };
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no recipient', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      req.body = {};
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if report not found', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      req.body = { to: 'a@b.com' };
      stakeholderReportService.getReportById = jest.fn().mockResolvedValue(null);
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if report not ready', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      req.body = { to: 'a@b.com' };
      stakeholderReportService.getReportById = jest.fn().mockResolvedValue({ id: 'r1', status: 'generating' });
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should allow delivered reports to be emailed', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      req.body = { to: 'a@b.com' };
      stakeholderReportService.getReportById = jest.fn().mockResolvedValue({ id: 'r1', status: 'delivered' });
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle error', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      req.body = { to: 'a@b.com' };
      stakeholderReportService.getReportById = jest.fn().mockRejectedValue(new Error('DB'));
      await controller.emailReport(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- getReportById ----
  describe('getReportById', () => {
    it('should return report', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      stakeholderReportService.getReportById = jest.fn().mockResolvedValue({ id: 'r1' });

      await controller.getReportById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '', reportId: 'r1' };
      await controller.getReportById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no report ID', async () => {
      req.params = { id: 'stk-1', reportId: '' };
      await controller.getReportById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if not found', async () => {
      req.params = { id: 'stk-1', reportId: 'missing' };
      stakeholderReportService.getReportById = jest.fn().mockResolvedValue(null);
      await controller.getReportById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle error', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      stakeholderReportService.getReportById = jest.fn().mockRejectedValue(new Error('DB'));
      await controller.getReportById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- downloadReport ----
  describe('downloadReport', () => {
    it('should download report', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      stakeholderReportService.downloadReport = jest.fn().mockResolvedValue({ url: 'http://download' });

      await controller.downloadReport(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '', reportId: 'r1' };
      await controller.downloadReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no report ID', async () => {
      req.params = { id: 'stk-1', reportId: '' };
      await controller.downloadReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for report not found', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      stakeholderReportService.downloadReport = jest.fn().mockRejectedValue(new Error('Report not found'));
      await controller.downloadReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for report not ready', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      stakeholderReportService.downloadReport = jest.fn().mockRejectedValue(new Error('Report is not ready for download'));
      await controller.downloadReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for other errors', async () => {
      req.params = { id: 'stk-1', reportId: 'r1' };
      stakeholderReportService.downloadReport = jest.fn().mockRejectedValue(new Error('Unknown'));
      await controller.downloadReport(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- scheduleAutomatedDelivery ----
  describe('scheduleAutomatedDelivery', () => {
    it('should schedule delivery', async () => {
      req.body = {
        companyId: 'c1',
        reportType: 'holdings',
        schedule: 'monthly',
        recipients: ['a@b.com'],
        format: 'csv'
      };
      stakeholderReportService.scheduleAutomatedDelivery = jest.fn().mockResolvedValue({ id: 'sch-1' });

      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if no stakeholder ID', async () => {
      req.params = { id: '' };
      req.body = { companyId: 'c1', reportType: 'h', schedule: 'm', recipients: ['a@b.com'] };
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no companyId', async () => {
      req.body = { reportType: 'h', schedule: 'm', recipients: ['a@b.com'] };
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no reportType', async () => {
      req.body = { companyId: 'c1', schedule: 'm', recipients: ['a@b.com'] };
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no schedule', async () => {
      req.body = { companyId: 'c1', reportType: 'h', recipients: ['a@b.com'] };
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no recipients', async () => {
      req.body = { companyId: 'c1', reportType: 'h', schedule: 'm' };
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if recipients is empty array', async () => {
      req.body = { companyId: 'c1', reportType: 'h', schedule: 'm', recipients: [] };
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid schedule format', async () => {
      req.body = { companyId: 'c1', reportType: 'h', schedule: 'invalid', recipients: ['a@b.com'] };
      stakeholderReportService.scheduleAutomatedDelivery = jest.fn().mockRejectedValue(new Error('Invalid schedule format'));
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid email format', async () => {
      req.body = { companyId: 'c1', reportType: 'h', schedule: 'm', recipients: ['bad'] };
      stakeholderReportService.scheduleAutomatedDelivery = jest.fn().mockRejectedValue(new Error('Invalid email format'));
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for other errors', async () => {
      req.body = { companyId: 'c1', reportType: 'h', schedule: 'm', recipients: ['a@b.com'] };
      stakeholderReportService.scheduleAutomatedDelivery = jest.fn().mockRejectedValue(new Error('Unknown'));
      await controller.scheduleAutomatedDelivery(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---- sanitizeInput - non-string input ----
  describe('sanitizeInput edge cases', () => {
    it('should handle XSS in stakeholder ID', async () => {
      req.params = { id: '<script>alert(1)</script>test' };
      stakeholderReportService.getStakeholderReports = jest.fn().mockResolvedValue([]);
      await controller.getStakeholderReports(req, res);
      expect(stakeholderReportService.getStakeholderReports).toHaveBeenCalledWith(
        'alert(1)test', // Tags stripped
        expect.any(Object)
      );
    });
  });
});
