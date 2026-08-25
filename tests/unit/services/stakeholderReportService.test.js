/**
 * StakeholderReportService Unit Tests
 * Issue #198: Enhance Stakeholder Report Generation
 *
 * TDD tests for stakeholder report service
 */

// Mock dependencies before importing
jest.mock('../../../models/StakeholderReport');
jest.mock('../../../models/Stakeholder');
jest.mock('../../../models/EquityGrant', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Activity');
jest.mock('../../../models/Valuation409A', () => ({
  find: jest.fn()
}));
jest.mock('../../../services/zerodbService', () => ({
  createTable: jest.fn().mockResolvedValue({ success: true })
}));

const StakeholderReport = require('../../../models/StakeholderReport');
const Stakeholder = require('../../../models/Stakeholder');
const EquityGrant = require('../../../models/EquityGrant');
const Activity = require('../../../models/Activity');
const Valuation409A = require('../../../models/Valuation409A');
const zerodbService = require('../../../services/zerodbService');
const stakeholderReportService = require('../../../services/stakeholderReportService');

describe('StakeholderReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stakeholderReportService._resetTablesEnsured();
  });

  describe('getStakeholderReports', () => {
    it('should return reports for a stakeholder', async () => {
      const mockReports = [
        { reportId: 'SR-001', stakeholderId: 'STK-001', reportType: 'holdings' },
        { reportId: 'SR-002', stakeholderId: 'STK-001', reportType: 'transactions' }
      ];

      StakeholderReport.getStakeholderReports.mockResolvedValue(mockReports);

      const result = await stakeholderReportService.getStakeholderReports('STK-001');

      expect(result).toEqual(mockReports);
      expect(StakeholderReport.getStakeholderReports).toHaveBeenCalledWith('STK-001', {});
    });

    it('should apply filters when provided', async () => {
      StakeholderReport.getStakeholderReports.mockResolvedValue([]);

      await stakeholderReportService.getStakeholderReports('STK-001', {
        reportType: 'holdings',
        status: 'completed'
      });

      expect(StakeholderReport.getStakeholderReports).toHaveBeenCalledWith('STK-001', {
        reportType: 'holdings',
        status: 'completed'
      });
    });
  });

  describe('getReportById', () => {
    it('should return a report by ID', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        stakeholderId: 'STK-001',
        reportType: 'holdings'
      };

      StakeholderReport.findByReportId.mockResolvedValue(mockReport);

      const result = await stakeholderReportService.getReportById('SR-12345678');

      expect(result).toEqual(mockReport);
    });

    it('should return null for non-existent report', async () => {
      StakeholderReport.findByReportId.mockResolvedValue(null);

      const result = await stakeholderReportService.getReportById('INVALID-ID');

      expect(result).toBeNull();
    });
  });

  describe('generateHoldingsReport', () => {
    const mockStakeholder = {
      stakeholderId: 'STK-001',
      name: 'John Doe',
      email: 'john@example.com',
      type: 'investor'
    };

    const mockEquities = [
      {
        equityId: 'EQ-001',
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        shareClass: 'Common',
        shares: 10000,
        vestedShares: 7500,
        unvestedShares: 2500
      },
      {
        equityId: 'EQ-002',
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        shareClass: 'Preferred',
        shares: 5000,
        vestedShares: 5000,
        unvestedShares: 0
      }
    ];

    beforeEach(() => {
      Stakeholder.findOne.mockResolvedValue(mockStakeholder);
      EquityGrant.find.mockResolvedValue(mockEquities);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({
        ...data,
        reportId: data.reportId || 'SR-12345678'
      }));
    });

    it('should generate a holdings report successfully', async () => {
      const result = await stakeholderReportService.generateHoldingsReport(
        'STK-001',
        'COMP-001',
        { format: 'pdf' }
      );

      expect(result).toBeDefined();
      expect(result.reportType).toBe('holdings');
      expect(result.status).toBe('completed');
      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
      expect(result.fileName).toContain('holdings');
      expect(result.fileName).toContain('pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.downloadCount).toBe(0);
    });

    it('should throw error if stakeholder not found', async () => {
      Stakeholder.findOne.mockResolvedValue(null);

      await expect(
        stakeholderReportService.generateHoldingsReport('INVALID-STK', 'COMP-001')
      ).rejects.toThrow('Stakeholder not found');
    });

    it('should aggregate holdings correctly', async () => {
      const result = await stakeholderReportService.generateHoldingsReport(
        'STK-001',
        'COMP-001'
      );

      expect(result.data.summary.totalShares).toBe(15000);
      expect(result.data.summary.holdingsCount).toBe(2);
    });

    it('should include stakeholder info in report', async () => {
      const result = await stakeholderReportService.generateHoldingsReport(
        'STK-001',
        'COMP-001'
      );

      expect(result.data.stakeholder.name).toBe('John Doe');
      expect(result.data.stakeholder.email).toBe('john@example.com');
    });

    it('should use default format when not specified', async () => {
      const result = await stakeholderReportService.generateHoldingsReport(
        'STK-001',
        'COMP-001',
        {}
      );

      expect(result.format).toBe('pdf');
    });
  });

  describe('generateTransactionsReport', () => {
    const mockStakeholder = {
      stakeholderId: 'STK-001',
      name: 'John Doe',
      email: 'john@example.com'
    };

    const mockActivities = [
      {
        activityId: 'ACT-001',
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        type: 'purchase',
        date: '2023-06-15',
        shares: 1000,
        pricePerShare: 10.00
      },
      {
        activityId: 'ACT-002',
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        type: 'grant',
        date: '2023-03-01',
        shares: 5000,
        pricePerShare: 8.00
      }
    ];

    beforeEach(() => {
      Stakeholder.findOne.mockResolvedValue(mockStakeholder);
      Activity.find.mockResolvedValue(mockActivities);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({
        ...data,
        reportId: data.reportId || 'SR-12345678'
      }));
    });

    it('should generate a transactions report successfully', async () => {
      const result = await stakeholderReportService.generateTransactionsReport(
        'STK-001',
        'COMP-001',
        {}
      );

      expect(result).toBeDefined();
      expect(result.reportType).toBe('transactions');
      expect(result.status).toBe('completed');
      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
      expect(result.fileName).toContain('transactions');
      expect(result.fileName).toContain('pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.downloadCount).toBe(0);
    });

    it('should throw error if stakeholder not found', async () => {
      Stakeholder.findOne.mockResolvedValue(null);

      await expect(
        stakeholderReportService.generateTransactionsReport('INVALID-STK', 'COMP-001')
      ).rejects.toThrow('Stakeholder not found');
    });

    it('should filter transactions by date range', async () => {
      const result = await stakeholderReportService.generateTransactionsReport(
        'STK-001',
        'COMP-001',
        {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        }
      );

      expect(result.data.summary.dateRange.start).toBe('2023-01-01');
      expect(result.data.summary.dateRange.end).toBe('2023-12-31');
    });

    it('should include transaction count in summary', async () => {
      const result = await stakeholderReportService.generateTransactionsReport(
        'STK-001',
        'COMP-001'
      );

      expect(result.data.summary.totalTransactions).toBe(2);
    });
  });

  describe('generateValuationsReport', () => {
    const mockStakeholder = {
      stakeholderId: 'STK-001',
      name: 'John Doe',
      email: 'john@example.com'
    };

    const mockEquities = [
      {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        shares: 10000
      }
    ];

    const mockValuations = [
      {
        valuationId: 'VAL-002',
        companyId: 'COMP-001',
        valuationDate: '2023-12-01',
        pricePerShare: 7.50,
        totalValuation: 75000000,
        type: '409A'
      },
      {
        valuationId: 'VAL-001',
        companyId: 'COMP-001',
        valuationDate: '2023-06-01',
        pricePerShare: 5.00,
        totalValuation: 50000000,
        type: '409A'
      }
    ];

    beforeEach(() => {
      Stakeholder.findOne.mockResolvedValue(mockStakeholder);
      EquityGrant.find.mockResolvedValue(mockEquities);
      Valuation409A.find.mockResolvedValue(mockValuations);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({
        ...data,
        reportId: data.reportId || 'SR-12345678'
      }));
    });

    it('should generate a valuations report successfully', async () => {
      const result = await stakeholderReportService.generateValuationsReport(
        'STK-001',
        'COMP-001'
      );

      expect(result).toBeDefined();
      expect(result.reportType).toBe('valuations');
      expect(result.status).toBe('completed');
      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
      expect(result.fileName).toContain('valuations');
      expect(result.fileName).toContain('pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.downloadCount).toBe(0);
    });

    it('should throw error if stakeholder not found', async () => {
      Stakeholder.findOne.mockResolvedValue(null);

      await expect(
        stakeholderReportService.generateValuationsReport('INVALID-STK', 'COMP-001')
      ).rejects.toThrow('Stakeholder not found');
    });

    it('should calculate current equity value correctly', async () => {
      const result = await stakeholderReportService.generateValuationsReport(
        'STK-001',
        'COMP-001'
      );

      // 10000 shares * 7.50 (latest valuation price) = 75000
      expect(result.data.currentEquityValue).toBe(75000);
    });

    it('should include valuation history', async () => {
      const result = await stakeholderReportService.generateValuationsReport(
        'STK-001',
        'COMP-001'
      );

      expect(result.data.valuations.length).toBe(2);
    });
  });

  describe('generateTaxReport', () => {
    const mockStakeholder = {
      stakeholderId: 'STK-001',
      name: 'John Doe',
      email: 'john@example.com'
    };

    const mockActivities = [
      {
        activityId: 'ACT-001',
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        type: 'purchase',
        date: '2023-06-15',
        shares: 1000,
        pricePerShare: 10.00
      }
    ];

    beforeEach(() => {
      Stakeholder.findOne.mockResolvedValue(mockStakeholder);
      Activity.find.mockResolvedValue(mockActivities);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({
        ...data,
        reportId: data.reportId || 'SR-12345678'
      }));
    });

    it('should generate a tax report successfully', async () => {
      const result = await stakeholderReportService.generateTaxReport(
        'STK-001',
        'COMP-001',
        { taxYear: 2023 }
      );

      expect(result).toBeDefined();
      expect(result.reportType).toBe('tax');
      expect(result.status).toBe('completed');
      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
      expect(result.fileName).toContain('tax');
      expect(result.fileName).toContain('pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.downloadCount).toBe(0);
    });

    it('should throw error for invalid tax year', async () => {
      await expect(
        stakeholderReportService.generateTaxReport('STK-001', 'COMP-001', { taxYear: 'invalid' })
      ).rejects.toThrow('Invalid tax year');
    });

    it('should throw error for missing tax year', async () => {
      await expect(
        stakeholderReportService.generateTaxReport('STK-001', 'COMP-001', {})
      ).rejects.toThrow('Invalid tax year');
    });

    it('should throw error if stakeholder not found', async () => {
      Stakeholder.findOne.mockResolvedValue(null);

      await expect(
        stakeholderReportService.generateTaxReport('INVALID-STK', 'COMP-001', { taxYear: 2023 })
      ).rejects.toThrow('Stakeholder not found');
    });

    it('should include cost basis calculation', async () => {
      const result = await stakeholderReportService.generateTaxReport(
        'STK-001',
        'COMP-001',
        { taxYear: 2023 }
      );

      expect(result.data.costBasis).toBeDefined();
      expect(result.data.costBasis.totalCost).toBeDefined();
    });

    it('should include tax year in report', async () => {
      const result = await stakeholderReportService.generateTaxReport(
        'STK-001',
        'COMP-001',
        { taxYear: 2023 }
      );

      expect(result.data.taxYear).toBe(2023);
    });
  });

  describe('downloadReport', () => {
    it('should return download info for completed report', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'completed',
        format: 'pdf',
        fileUrl: '/files/reports/SR-12345678.pdf',
        generatedAt: '2023-12-01T10:00:00Z'
      };

      StakeholderReport.findByReportId.mockResolvedValue(mockReport);

      const result = await stakeholderReportService.downloadReport('SR-12345678');

      expect(result.reportId).toBe('SR-12345678');
      expect(result.fileUrl).toBe('/files/reports/SR-12345678.pdf');
      expect(result.format).toBe('pdf');
    });

    it('should throw error if report not found', async () => {
      StakeholderReport.findByReportId.mockResolvedValue(null);

      await expect(
        stakeholderReportService.downloadReport('INVALID-ID')
      ).rejects.toThrow('Report not found');
    });

    it('should throw error if report not ready', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'pending'
      };

      StakeholderReport.findByReportId.mockResolvedValue(mockReport);

      await expect(
        stakeholderReportService.downloadReport('SR-12345678')
      ).rejects.toThrow('Report is not ready for download');
    });

    it('should allow download for delivered reports', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'delivered',
        format: 'pdf',
        fileUrl: '/files/reports/SR-12345678.pdf'
      };

      StakeholderReport.findByReportId.mockResolvedValue(mockReport);

      const result = await stakeholderReportService.downloadReport('SR-12345678');

      expect(result.reportId).toBe('SR-12345678');
    });
  });

  describe('scheduleAutomatedDelivery', () => {
    beforeEach(() => {
      StakeholderReport.create.mockImplementation(data => Promise.resolve({
        ...data,
        reportId: data.reportId || 'SR-12345678'
      }));
    });

    it('should create a delivery schedule successfully', async () => {
      const scheduleData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: ['investor@example.com'],
        format: 'pdf'
      };

      const result = await stakeholderReportService.scheduleAutomatedDelivery(scheduleData);

      expect(result.reportId).toBeDefined();
      expect(result.status).toBe('scheduled');
      expect(result.schedule).toBe('0 9 1 * *');
    });

    it('should throw error for invalid cron expression', async () => {
      const scheduleData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: 'invalid-cron',
        recipients: ['investor@example.com']
      };

      await expect(
        stakeholderReportService.scheduleAutomatedDelivery(scheduleData)
      ).rejects.toThrow('Invalid schedule format');
    });

    it('should throw error for missing recipients', async () => {
      const scheduleData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: []
      };

      await expect(
        stakeholderReportService.scheduleAutomatedDelivery(scheduleData)
      ).rejects.toThrow('At least one recipient is required');
    });

    it('should throw error for invalid email format', async () => {
      const scheduleData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: ['invalid-email']
      };

      await expect(
        stakeholderReportService.scheduleAutomatedDelivery(scheduleData)
      ).rejects.toThrow('Invalid email format');
    });

    it('should accept multiple valid recipients', async () => {
      const scheduleData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: ['investor1@example.com', 'investor2@example.com']
      };

      const result = await stakeholderReportService.scheduleAutomatedDelivery(scheduleData);

      expect(result.status).toBe('scheduled');
    });

    it('should calculate next delivery time', async () => {
      const scheduleData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        schedule: '0 9 1 * *',
        recipients: ['investor@example.com']
      };

      const result = await stakeholderReportService.scheduleAutomatedDelivery(scheduleData);

      expect(result.nextDeliveryAt).toBeDefined();
    });
  });

  describe('Cron Expression Validation', () => {
    it('should validate valid cron expressions', async () => {
      const validExpressions = [
        '0 9 1 * *',      // First of month at 9 AM
        '* * * * *',      // Every minute
        '0 0 * * 0',      // Weekly on Sunday
        '30 14 1 * *'     // Monthly on 1st at 2:30 PM
      ];

      for (const expression of validExpressions) {
        StakeholderReport.create.mockImplementation(data => Promise.resolve({
          ...data,
          reportId: 'SR-12345678'
        }));

        const result = await stakeholderReportService.scheduleAutomatedDelivery({
          stakeholderId: 'STK-001',
          companyId: 'COMP-001',
          reportType: 'holdings',
          schedule: expression,
          recipients: ['test@example.com']
        });

        expect(result.status).toBe('scheduled');
      }
    });

    it('should reject invalid cron expressions', async () => {
      const invalidExpressions = [
        'invalid',
        '60 9 1 * *',     // Invalid minute (60)
        '0 25 1 * *',     // Invalid hour (25)
        '0 9 32 * *',     // Invalid day (32)
        '0 9 1 13 *',     // Invalid month (13)
        '0 9 1 * 7'       // Invalid weekday (7)
      ];

      for (const expression of invalidExpressions) {
        await expect(
          stakeholderReportService.scheduleAutomatedDelivery({
            stakeholderId: 'STK-001',
            companyId: 'COMP-001',
            reportType: 'holdings',
            schedule: expression,
            recipients: ['test@example.com']
          })
        ).rejects.toThrow('Invalid schedule format');
      }
    });
  });

  describe('ensureTables', () => {
    it('should call createTable for equity_grants and stakeholder_reports', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');

      expect(zerodbService.createTable).toHaveBeenCalledWith('equity_grants', { fields: {} });
      expect(zerodbService.createTable).toHaveBeenCalledWith('stakeholder_reports', { fields: {} });
    });

    it('should only call createTable once across multiple report generations', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');
      await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');

      // Should only be called twice total (once for each table), not four times
      expect(zerodbService.createTable).toHaveBeenCalledTimes(2);
    });

    it('should handle table already exists error gracefully', async () => {
      zerodbService.createTable.mockRejectedValue(new Error('Table already exists'));
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');
      expect(result).toBeDefined();
    });

    it('should handle 409 status response as already exists', async () => {
      const err409 = new Error('Conflict');
      err409.response = { status: 409 };
      zerodbService.createTable.mockRejectedValue(err409);
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');
      expect(result).toBeDefined();
    });

    it('should retry ensureTables on next call if previous call failed', async () => {
      // First call: createTable fails with a non-409 error
      zerodbService.createTable.mockRejectedValue(new Error('Network error'));
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');
      // createTable was called 2 times (once for each table)
      expect(zerodbService.createTable).toHaveBeenCalledTimes(2);

      // Second call: createTable succeeds now
      zerodbService.createTable.mockResolvedValue({ success: true });
      jest.clearAllMocks();
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');
      // Should retry createTable since previous call failed
      expect(zerodbService.createTable).toHaveBeenCalledTimes(2);
    });
  });

  describe('empty equity grants handling', () => {
    it('should generate holdings report with empty holdings when no equity grants exist', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');

      expect(result.data.holdings).toEqual([]);
      expect(result.data.summary.totalShares).toBe(0);
      expect(result.data.summary.holdingsCount).toBe(0);
    });

    it('should generate valuations report with zero value when no equity grants exist', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      EquityGrant.find.mockResolvedValue([]);
      Valuation409A.find.mockResolvedValue([{ pricePerShare: 10, valuationDate: '2023-01-01', totalValuation: 100000, type: '409A' }]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateValuationsReport('STK-001', 'COMP-001');

      expect(result.data.currentEquityValue).toBe(0);
      expect(result.data.summary.totalShares).toBe(0);
    });
  });

  describe('EquityGrant.find error resilience', () => {
    it('should generate holdings report with empty holdings when EquityGrant.find throws', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockRejectedValue(new Error('Table not found'));
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.data.holdings).toEqual([]);
      expect(result.data.summary.totalShares).toBe(0);
      expect(result.data.summary.holdingsCount).toBe(0);
    });

    it('should generate valuations report with zero equity value when EquityGrant.find throws', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      EquityGrant.find.mockRejectedValue(new Error('Table not found'));
      Valuation409A.find.mockResolvedValue([{ pricePerShare: 10, valuationDate: '2023-01-01', totalValuation: 100000, type: '409A' }]);
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateValuationsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.data.currentEquityValue).toBe(0);
      expect(result.data.summary.totalShares).toBe(0);
    });
  });

  describe('Activity.find error resilience', () => {
    it('should generate transactions report with empty transactions when Activity.find throws', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      Activity.find.mockRejectedValue(new Error('Table not found'));
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateTransactionsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.data.transactions).toEqual([]);
      expect(result.data.summary.totalTransactions).toBe(0);
    });

    it('should generate tax report with empty transactions when Activity.find throws', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      Activity.find.mockRejectedValue(new Error('Network error'));
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateTaxReport('STK-001', 'COMP-001', { taxYear: 2023 });

      expect(result).toBeDefined();
      expect(result.data.costBasis).toBeDefined();
      expect(result.data.costBasis.totalCost).toBe(0);
    });
  });

  describe('Valuation409A.find error resilience', () => {
    it('should generate valuations report with empty valuations when Valuation409A.find throws', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      EquityGrant.find.mockResolvedValue([{ shares: 1000 }]);
      Valuation409A.find.mockRejectedValue(new Error('Table not found'));
      StakeholderReport.create.mockImplementation(data => Promise.resolve({ ...data }));

      const result = await stakeholderReportService.generateValuationsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.data.valuations).toEqual([]);
      expect(result.data.currentEquityValue).toBe(0);
    });
  });

  describe('StakeholderReport.create error resilience', () => {
    it('should return report data even when StakeholderReport.create fails for holdings', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com', type: 'investor' });
      EquityGrant.find.mockResolvedValue([]);
      StakeholderReport.create.mockRejectedValue(new Error('Insert failed'));

      const result = await stakeholderReportService.generateHoldingsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.reportType).toBe('holdings');
      expect(result.status).toBe('completed');
      expect(result.data).toBeDefined();
    });

    it('should return report data even when StakeholderReport.create fails for transactions', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      Activity.find.mockResolvedValue([]);
      StakeholderReport.create.mockRejectedValue(new Error('Insert failed'));

      const result = await stakeholderReportService.generateTransactionsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.reportType).toBe('transactions');
      expect(result.status).toBe('completed');
    });

    it('should return report data even when StakeholderReport.create fails for valuations', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      EquityGrant.find.mockResolvedValue([]);
      Valuation409A.find.mockResolvedValue([]);
      StakeholderReport.create.mockRejectedValue(new Error('Insert failed'));

      const result = await stakeholderReportService.generateValuationsReport('STK-001', 'COMP-001');

      expect(result).toBeDefined();
      expect(result.reportType).toBe('valuations');
      expect(result.status).toBe('completed');
    });

    it('should return report data even when StakeholderReport.create fails for tax', async () => {
      Stakeholder.findOne.mockResolvedValue({ stakeholderId: 'STK-001', name: 'Test', email: 'test@test.com' });
      Activity.find.mockResolvedValue([]);
      StakeholderReport.create.mockRejectedValue(new Error('Insert failed'));

      const result = await stakeholderReportService.generateTaxReport('STK-001', 'COMP-001', { taxYear: 2023 });

      expect(result).toBeDefined();
      expect(result.reportType).toBe('tax');
      expect(result.status).toBe('completed');
    });
  });

  describe('findStakeholder error handling', () => {
    it('should throw Stakeholder not found when database throws unexpected error', async () => {
      Stakeholder.findOne.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        stakeholderReportService.generateHoldingsReport('STK-MISSING', 'COMP-001')
      ).rejects.toThrow('Stakeholder not found');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@company.co'
      ];

      for (const email of validEmails) {
        StakeholderReport.create.mockImplementation(data => Promise.resolve({
          ...data,
          reportId: 'SR-12345678'
        }));

        const result = await stakeholderReportService.scheduleAutomatedDelivery({
          stakeholderId: 'STK-001',
          companyId: 'COMP-001',
          reportType: 'holdings',
          schedule: '0 9 1 * *',
          recipients: [email]
        });

        expect(result.status).toBe('scheduled');
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user example.com'
      ];

      for (const email of invalidEmails) {
        await expect(
          stakeholderReportService.scheduleAutomatedDelivery({
            stakeholderId: 'STK-001',
            companyId: 'COMP-001',
            reportType: 'holdings',
            schedule: '0 9 1 * *',
            recipients: [email]
          })
        ).rejects.toThrow('Invalid email format');
      }
    });
  });
});
