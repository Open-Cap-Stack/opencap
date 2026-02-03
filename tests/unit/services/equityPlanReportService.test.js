/**
 * EquityPlanReport Service Unit Tests
 * Issue #110: Implement Equity Plan Reports
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn()
}));

const equityPlanReportService = require('../../../services/equityPlanReportService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityPlanReport Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReportId', () => {
    it('should generate unique report IDs', () => {
      const id1 = equityPlanReportService.generateReportId();
      const id2 = equityPlanReportService.generateReportId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should start with RPT prefix', () => {
      const id = equityPlanReportService.generateReportId();
      expect(id).toMatch(/^RPT-/);
    });
  });

  describe('generateOptionPoolSummary', () => {
    const mockCompanyId = 'COMP-001';

    it('should generate option pool summary report', async () => {
      const mockGrants = [
        { grantType: 'ISO', numberOfShares: 10000, exercisedShares: 2500, status: 'active' },
        { grantType: 'NSO', numberOfShares: 5000, exercisedShares: 0, status: 'active' },
        { grantType: 'RSU', numberOfShares: 3000, exercisedShares: 1000, status: 'active' }
      ];

      const mockShareClasses = [
        { name: 'Common', authorizedShares: 1000000, dilutedShares: 800000 },
        { name: 'Preferred Series A', authorizedShares: 200000, dilutedShares: 150000 }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(mockGrants)
        .mockResolvedValueOnce(mockShareClasses);

      const result = await equityPlanReportService.generateOptionPoolSummary(mockCompanyId);

      expect(result).toBeDefined();
      expect(result.totalPoolShares).toBeDefined();
      expect(result.grantedShares).toBeDefined();
      expect(result.availableShares).toBeDefined();
      expect(result.byShareClass).toBeDefined();
      expect(result.byGrantType).toBeDefined();
    });

    it('should calculate total granted shares correctly', async () => {
      const mockGrants = [
        { grantType: 'ISO', numberOfShares: 10000, exercisedShares: 0, status: 'active' },
        { grantType: 'NSO', numberOfShares: 5000, exercisedShares: 0, status: 'active' }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(mockGrants)
        .mockResolvedValueOnce([]);

      const result = await equityPlanReportService.generateOptionPoolSummary(mockCompanyId);

      expect(result.grantedShares).toBe(15000);
    });

    it('should break down by grant type', async () => {
      const mockGrants = [
        { grantType: 'ISO', numberOfShares: 10000, exercisedShares: 2500, status: 'active' },
        { grantType: 'ISO', numberOfShares: 5000, exercisedShares: 0, status: 'active' },
        { grantType: 'NSO', numberOfShares: 3000, exercisedShares: 1000, status: 'active' }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(mockGrants)
        .mockResolvedValueOnce([]);

      const result = await equityPlanReportService.generateOptionPoolSummary(mockCompanyId);

      expect(result.byGrantType.ISO).toBeDefined();
      expect(result.byGrantType.ISO.totalShares).toBe(15000);
      expect(result.byGrantType.NSO).toBeDefined();
      expect(result.byGrantType.NSO.totalShares).toBe(3000);
    });

    it('should handle company with no grants', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await equityPlanReportService.generateOptionPoolSummary(mockCompanyId);

      expect(result.grantedShares).toBe(0);
      expect(result.byGrantType).toEqual({});
    });
  });

  describe('generateGrantStatusReport', () => {
    const mockCompanyId = 'COMP-001';

    it('should generate grant status report with all grants', async () => {
      const mockGrants = [
        {
          grantId: 'GRANT-001',
          employeeId: 'EMP-001',
          grantType: 'ISO',
          numberOfShares: 10000,
          exercisedShares: 2500,
          status: 'active',
          grantDate: new Date('2024-01-15'),
          vestingSchedule: {
            vestingStartDate: new Date('2024-01-15'),
            vestingPeriodMonths: 48,
            cliffMonths: 12,
            vestingFrequency: 'monthly'
          }
        },
        {
          grantId: 'GRANT-002',
          employeeId: 'EMP-002',
          grantType: 'RSU',
          numberOfShares: 5000,
          exercisedShares: 0,
          status: 'pending',
          grantDate: new Date('2024-06-01')
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockGrants);

      const result = await equityPlanReportService.generateGrantStatusReport(mockCompanyId);

      expect(result).toBeDefined();
      expect(result.totalGrants).toBe(2);
      expect(result.grants).toHaveLength(2);
      expect(result.summary).toBeDefined();
    });

    it('should include vesting progress for each grant', async () => {
      const mockGrants = [
        {
          grantId: 'GRANT-001',
          employeeId: 'EMP-001',
          grantType: 'ISO',
          numberOfShares: 10000,
          exercisedShares: 0,
          status: 'active',
          grantDate: new Date('2023-01-15'),
          vestingSchedule: {
            vestingStartDate: new Date('2023-01-15'),
            vestingPeriodMonths: 48,
            cliffMonths: 12,
            vestingFrequency: 'monthly'
          }
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockGrants);

      const result = await equityPlanReportService.generateGrantStatusReport(mockCompanyId);

      expect(result.grants[0].vestingProgress).toBeDefined();
      expect(result.grants[0].vestingProgress.vestedShares).toBeDefined();
      expect(result.grants[0].vestingProgress.vestedPercentage).toBeDefined();
    });

    it('should group grants by status', async () => {
      const mockGrants = [
        { grantId: 'GRANT-001', status: 'active', numberOfShares: 10000 },
        { grantId: 'GRANT-002', status: 'active', numberOfShares: 5000 },
        { grantId: 'GRANT-003', status: 'pending', numberOfShares: 3000 },
        { grantId: 'GRANT-004', status: 'cancelled', numberOfShares: 2000 }
      ];

      databaseAdapter.find.mockResolvedValue(mockGrants);

      const result = await equityPlanReportService.generateGrantStatusReport(mockCompanyId);

      expect(result.summary.byStatus.active).toBe(2);
      expect(result.summary.byStatus.pending).toBe(1);
      expect(result.summary.byStatus.cancelled).toBe(1);
    });

    it('should filter by date range if provided', async () => {
      const mockGrants = [
        { grantId: 'GRANT-001', grantDate: new Date('2024-03-15'), numberOfShares: 10000 }
      ];

      databaseAdapter.find.mockResolvedValue(mockGrants);

      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30')
      };

      await equityPlanReportService.generateGrantStatusReport(mockCompanyId, options);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'EquityGrant',
        expect.objectContaining({
          companyId: mockCompanyId,
          grantDate: expect.any(Object)
        })
      );
    });
  });

  describe('generateVestingScheduleReport', () => {
    const mockCompanyId = 'COMP-001';

    it('should generate vesting schedule report with upcoming events', async () => {
      const mockSchedules = [
        {
          scheduleId: 'SCHED-001',
          stakeholderId: 'EMP-001',
          totalShares: 10000,
          vestedShares: 2500,
          unvestedShares: 7500,
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
          nextVestingDate: new Date('2025-02-15'),
          status: 'active'
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockSchedules);

      const result = await equityPlanReportService.generateVestingScheduleReport(mockCompanyId);

      expect(result).toBeDefined();
      expect(result.upcomingVestingEvents).toBeDefined();
      expect(result.schedules).toHaveLength(1);
    });

    it('should calculate upcoming vesting events for forecast period', async () => {
      const mockSchedules = [
        {
          scheduleId: 'SCHED-001',
          stakeholderId: 'EMP-001',
          totalShares: 10000,
          vestedShares: 2500,
          unvestedShares: 7500,
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
          status: 'active'
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockSchedules);

      const options = { forecastMonths: 6 };
      const result = await equityPlanReportService.generateVestingScheduleReport(mockCompanyId, options);

      expect(result.upcomingVestingEvents).toBeDefined();
      expect(Array.isArray(result.upcomingVestingEvents)).toBe(true);
    });

    it('should summarize total vested and unvested shares', async () => {
      const mockSchedules = [
        {
          scheduleId: 'SCHED-001',
          totalShares: 10000,
          vestedShares: 2500,
          unvestedShares: 7500,
          status: 'active'
        },
        {
          scheduleId: 'SCHED-002',
          totalShares: 5000,
          vestedShares: 1000,
          unvestedShares: 4000,
          status: 'active'
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockSchedules);

      const result = await equityPlanReportService.generateVestingScheduleReport(mockCompanyId);

      expect(result.summary.totalVested).toBe(3500);
      expect(result.summary.totalUnvested).toBe(11500);
    });

    it('should handle empty vesting schedules', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await equityPlanReportService.generateVestingScheduleReport(mockCompanyId);

      expect(result.schedules).toHaveLength(0);
      expect(result.summary.totalVested).toBe(0);
    });
  });

  describe('generateDilutionAnalysis', () => {
    const mockCompanyId = 'COMP-001';

    it('should generate dilution analysis report', async () => {
      const mockShareClasses = [
        { name: 'Common', authorizedShares: 1000000, dilutedShares: 800000 }
      ];

      const mockGrants = [
        { grantType: 'ISO', numberOfShares: 50000, exercisedShares: 10000, status: 'active' },
        { grantType: 'NSO', numberOfShares: 30000, exercisedShares: 0, status: 'active' }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(mockShareClasses)
        .mockResolvedValueOnce(mockGrants);

      const result = await equityPlanReportService.generateDilutionAnalysis(mockCompanyId);

      expect(result).toBeDefined();
      expect(result.currentDilution).toBeDefined();
      expect(result.fullyDilutedShares).toBeDefined();
      expect(result.dilutionBreakdown).toBeDefined();
    });

    it('should calculate fully diluted cap table impact', async () => {
      const mockShareClasses = [
        { name: 'Common', authorizedShares: 1000000, dilutedShares: 800000 }
      ];

      const mockGrants = [
        { grantType: 'ISO', numberOfShares: 100000, exercisedShares: 25000, status: 'active' }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(mockShareClasses)
        .mockResolvedValueOnce(mockGrants);

      const result = await equityPlanReportService.generateDilutionAnalysis(mockCompanyId);

      // 800000 (issued) + 75000 (unvested options) = 875000 fully diluted
      expect(result.fullyDilutedShares).toBeDefined();
      expect(result.dilutionImpact).toBeDefined();
    });

    it('should break down dilution by equity type', async () => {
      const mockShareClasses = [
        { name: 'Common', authorizedShares: 1000000, dilutedShares: 800000 }
      ];

      const mockGrants = [
        { grantType: 'ISO', numberOfShares: 50000, status: 'active' },
        { grantType: 'RSU', numberOfShares: 30000, status: 'active' }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(mockShareClasses)
        .mockResolvedValueOnce(mockGrants);

      const result = await equityPlanReportService.generateDilutionAnalysis(mockCompanyId);

      expect(result.dilutionBreakdown.options).toBeDefined();
      expect(result.dilutionBreakdown.rsus).toBeDefined();
    });

    it('should include ownership percentages', async () => {
      const mockShareClasses = [
        { name: 'Common', authorizedShares: 1000000, dilutedShares: 800000, ownershipPercentage: 80 }
      ];

      const mockGrants = [];

      databaseAdapter.find
        .mockResolvedValueOnce(mockShareClasses)
        .mockResolvedValueOnce(mockGrants);

      const result = await equityPlanReportService.generateDilutionAnalysis(mockCompanyId);

      expect(result.ownershipTable).toBeDefined();
    });
  });

  describe('exportReport', () => {
    it('should export report to JSON format', async () => {
      const reportData = {
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        generatedData: { totalPoolShares: 100000 }
      };

      const result = await equityPlanReportService.exportReport(reportData, 'json');

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.data).toBeDefined();
    });

    it('should export report to CSV format', async () => {
      const reportData = {
        reportId: 'RPT-001',
        reportType: 'grant_status',
        generatedData: {
          grants: [
            { grantId: 'GRANT-001', numberOfShares: 10000 },
            { grantId: 'GRANT-002', numberOfShares: 5000 }
          ]
        }
      };

      const result = await equityPlanReportService.exportReport(reportData, 'csv');

      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.data).toBeDefined();
    });

    it('should throw error for unsupported format', async () => {
      const reportData = {
        reportId: 'RPT-001',
        generatedData: {}
      };

      await expect(
        equityPlanReportService.exportReport(reportData, 'unsupported')
      ).rejects.toThrow('Unsupported export format');
    });
  });

  describe('createReport', () => {
    it('should create a new report record', async () => {
      const reportData = {
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        requestedBy: 'USER-001'
      };

      const mockCreatedReport = {
        _id: 'report123',
        reportId: expect.any(String),
        ...reportData,
        status: 'pending'
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedReport);

      const result = await equityPlanReportService.createReport(reportData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'EquityPlanReport',
        expect.objectContaining({
          reportType: 'option_pool_summary',
          companyId: 'COMP-001'
        })
      );
      expect(result).toEqual(mockCreatedReport);
    });
  });

  describe('getReportById', () => {
    it('should retrieve a report by ID', async () => {
      const mockReport = {
        _id: 'report123',
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        status: 'completed'
      };

      databaseAdapter.findById.mockResolvedValue(mockReport);

      const result = await equityPlanReportService.getReportById('report123');

      expect(databaseAdapter.findById).toHaveBeenCalledWith('EquityPlanReport', 'report123');
      expect(result).toEqual(mockReport);
    });

    it('should return null if report not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      const result = await equityPlanReportService.getReportById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getReportsByCompany', () => {
    it('should retrieve all reports for a company', async () => {
      const mockReports = [
        { reportId: 'RPT-001', companyId: 'COMP-001', reportType: 'option_pool_summary' },
        { reportId: 'RPT-002', companyId: 'COMP-001', reportType: 'grant_status' }
      ];

      databaseAdapter.find.mockResolvedValue(mockReports);

      const result = await equityPlanReportService.getReportsByCompany('COMP-001');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'EquityPlanReport',
        { companyId: 'COMP-001' }
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by report type if provided', async () => {
      const mockReports = [
        { reportId: 'RPT-001', companyId: 'COMP-001', reportType: 'option_pool_summary' }
      ];

      databaseAdapter.find.mockResolvedValue(mockReports);

      await equityPlanReportService.getReportsByCompany('COMP-001', { reportType: 'option_pool_summary' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'EquityPlanReport',
        { companyId: 'COMP-001', reportType: 'option_pool_summary' }
      );
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status to generating', async () => {
      const mockUpdatedReport = {
        _id: 'report123',
        reportId: 'RPT-001',
        status: 'generating'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedReport);

      const result = await equityPlanReportService.updateReportStatus('report123', 'generating');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'EquityPlanReport',
        'report123',
        expect.objectContaining({ status: 'generating' }),
        { new: true }
      );
      expect(result.status).toBe('generating');
    });

    it('should set generatedAt when status is completed', async () => {
      const mockUpdatedReport = {
        _id: 'report123',
        reportId: 'RPT-001',
        status: 'completed',
        generatedAt: new Date()
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedReport);

      await equityPlanReportService.updateReportStatus('report123', 'completed');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'EquityPlanReport',
        'report123',
        expect.objectContaining({
          status: 'completed',
          generatedAt: expect.any(Date)
        }),
        { new: true }
      );
    });

    it('should set errorMessage when status is failed', async () => {
      const errorMessage = 'Failed to generate report';
      const mockUpdatedReport = {
        _id: 'report123',
        reportId: 'RPT-001',
        status: 'failed',
        errorMessage
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedReport);

      await equityPlanReportService.updateReportStatus('report123', 'failed', errorMessage);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'EquityPlanReport',
        'report123',
        expect.objectContaining({
          status: 'failed',
          errorMessage
        }),
        { new: true }
      );
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const mockDeletedReport = {
        _id: 'report123',
        reportId: 'RPT-001'
      };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedReport);

      const result = await equityPlanReportService.deleteReport('report123');

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('EquityPlanReport', 'report123');
      expect(result).toEqual(mockDeletedReport);
    });
  });
});
