/**
 * Bulk Reports Service Tests
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Test suite for bulk report generation service including:
 * - Job creation with real report generation
 * - Queue operations
 * - Report generation
 * - Status tracking
 * - Error handling
 */

const BulkReportsService = require('../../../services/bulkReportsService');
const databaseAdapter = require('../../../services/databaseAdapter');
const JobQueueService = require('../../../services/jobQueueService');
const stakeholderReportService = require('../../../services/stakeholderReportService');

// Mock dependencies
jest.mock('../../../services/databaseAdapter');
jest.mock('../../../services/jobQueueService');
jest.mock('../../../services/stakeholderReportService');

describe('BulkReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBulkJob', () => {
    describe('when creating a valid bulk job with stakeholder report types', () => {
      it('should call the real report service for each report', async () => {
        // Arrange
        const mockHoldingsReport = {
          reportId: 'SR-ABC12345',
          reportType: 'holdings',
          status: 'completed',
          format: 'pdf',
          stakeholderId: 'stk-001'
        };
        const mockTransactionsReport = {
          reportId: 'SR-DEF67890',
          reportType: 'transactions',
          status: 'completed',
          format: 'csv',
          stakeholderId: 'stk-002'
        };

        stakeholderReportService.generateHoldingsReport.mockResolvedValue(mockHoldingsReport);
        stakeholderReportService.generateTransactionsReport.mockResolvedValue(mockTransactionsReport);

        const jobData = {
          reports: [
            {
              reportType: 'holdings',
              format: 'pdf',
              parameters: { stakeholderId: 'stk-001' }
            },
            {
              reportType: 'transactions',
              format: 'csv',
              parameters: { stakeholderId: 'stk-002', dateRange: { startDate: '2025-01-01', endDate: '2025-12-31' } }
            }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(stakeholderReportService.generateHoldingsReport).toHaveBeenCalledWith(
          'stk-001',
          'company-123',
          expect.objectContaining({ format: 'pdf' })
        );
        expect(stakeholderReportService.generateTransactionsReport).toHaveBeenCalledWith(
          'stk-002',
          'company-123',
          expect.objectContaining({ format: 'csv', startDate: '2025-01-01', endDate: '2025-12-31' })
        );
        expect(result.totalReports).toBe(2);
        expect(result.successfulReports).toBe(2);
        expect(result.failedReports).toBe(0);
        expect(result.success).toBe(true);
      });

      it('should return reports with stakeholderId, fileName, and reportId at top level', async () => {
        // Arrange
        const mockReport = {
          reportId: 'SR-TESTID01',
          reportType: 'valuations',
          status: 'completed',
          format: 'pdf',
          stakeholderId: 'stk-100'
        };

        stakeholderReportService.generateValuationsReport.mockResolvedValue(mockReport);

        const jobData = {
          reports: [
            {
              reportType: 'valuations',
              format: 'pdf',
              parameters: { stakeholderId: 'stk-100' }
            }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(result.reports).toHaveLength(1);
        const report = result.reports[0];
        expect(report.stakeholderId).toBe('stk-100');
        expect(report.reportId).toBe('SR-TESTID01');
        expect(report.fileName).toMatch(/^valuations-report-\d+-0\.pdf$/);
        expect(report.reportType).toBe('valuations');
        expect(report.status).toBe('completed');
        expect(report.format).toBe('pdf');
      });

      it('should pass taxYear in options for tax reports', async () => {
        // Arrange
        const mockTaxReport = {
          reportId: 'SR-TAXRPT01',
          reportType: 'tax',
          status: 'completed',
          format: 'pdf'
        };

        stakeholderReportService.generateTaxReport.mockResolvedValue(mockTaxReport);

        const jobData = {
          reports: [
            {
              reportType: 'tax',
              format: 'pdf',
              parameters: {
                stakeholderId: 'stk-200',
                dateRange: { startDate: '2025-01-01', endDate: '2025-12-31' }
              }
            }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act
        await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(stakeholderReportService.generateTaxReport).toHaveBeenCalledWith(
          'stk-200',
          'company-123',
          expect.objectContaining({ taxYear: 2025 })
        );
      });

      it('should set estimated completion time', async () => {
        // Arrange
        stakeholderReportService.generateHoldingsReport.mockResolvedValue({
          reportId: 'SR-12345678',
          reportType: 'holdings',
          status: 'completed',
          format: 'pdf'
        });

        const jobData = {
          reports: [
            { reportType: 'holdings', format: 'pdf', parameters: { stakeholderId: 'stk-1' } }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(result.estimatedCompletionTime).toBeDefined();
      });
    });

    describe('when handling partial failures', () => {
      it('should track individual successes and failures', async () => {
        // Arrange
        stakeholderReportService.generateHoldingsReport.mockResolvedValue({
          reportId: 'SR-SUCCESS1',
          reportType: 'holdings',
          status: 'completed',
          format: 'pdf'
        });
        stakeholderReportService.generateTransactionsReport.mockRejectedValue(
          new Error('Stakeholder not found')
        );

        const jobData = {
          reports: [
            {
              reportType: 'holdings',
              format: 'pdf',
              parameters: { stakeholderId: 'stk-exists' }
            },
            {
              reportType: 'transactions',
              format: 'csv',
              parameters: { stakeholderId: 'stk-missing' }
            }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(result.totalReports).toBe(2);
        expect(result.successfulReports).toBe(1);
        expect(result.failedReports).toBe(1);
        expect(result.success).toBe(false);
        expect(result.reports).toHaveLength(1);
        expect(result.reports[0].reportId).toBe('SR-SUCCESS1');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].stakeholderId).toBe('stk-missing');
        expect(result.errors[0].error).toBe('Stakeholder not found');
      });

      it('should treat unsupported report types as failures', async () => {
        // Arrange
        const jobData = {
          reports: [
            {
              reportType: 'financial',
              format: 'pdf',
              parameters: {}
            }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(result.successfulReports).toBe(0);
        expect(result.failedReports).toBe(1);
        expect(result.errors[0].error).toContain('Unsupported report type');
      });
    });

    describe('when validation fails', () => {
      it('should reject when reports array is missing', async () => {
        // Arrange
        const jobData = {
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('Missing required field: reports');
      });

      it('should reject when reports array is empty', async () => {
        // Arrange
        const jobData = {
          reports: [],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('At least one report is required');
      });

      it('should reject when report is missing reportType', async () => {
        // Arrange
        const jobData = {
          reports: [
            { format: 'pdf' }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('Missing required field: reportType');
      });

      it('should reject when report is missing format', async () => {
        // Arrange
        const jobData = {
          reports: [
            { reportType: 'financial' }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('Missing required field: format');
      });

      it('should reject when format is invalid', async () => {
        // Arrange
        const jobData = {
          reports: [
            { reportType: 'financial', format: 'txt' }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('Invalid format: txt');
      });

      it('should reject when reportType is invalid', async () => {
        // Arrange
        const jobData = {
          reports: [
            { reportType: 'invalid-type', format: 'pdf' }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('Invalid reportType: invalid-type');
      });

      it('should reject when more than 50 reports', async () => {
        // Arrange
        const reports = Array.from({ length: 51 }, () => ({
          reportType: 'holdings',
          format: 'pdf',
          parameters: { stakeholderId: 'stk-1' }
        }));

        const jobData = {
          reports,
          userId: 'user-123',
          companyId: 'company-123'
        };

        // Act & Assert
        await expect(BulkReportsService.createBulkJob(jobData))
          .rejects.toThrow('Maximum 50 reports allowed per bulk job');
      });
    });
  });

  describe('getJobStatus', () => {
    describe('when job exists and user is authorized', () => {
      it('should return complete job status', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          status: 'processing',
          totalReports: 5,
          completedReports: 3,
          failedReports: 1,
          reports: [
            { reportType: 'financial', status: 'completed', reportId: 'RPT-001' },
            { reportType: 'equity', status: 'completed', reportId: 'RPT-002' },
            { reportType: 'compliance', status: 'completed', reportId: 'RPT-003' },
            { reportType: 'investor', status: 'failed', error: 'Data not found' },
            { reportType: 'operational', status: 'pending' }
          ],
          createdAt: new Date(),
          startedAt: new Date()
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act
        const result = await BulkReportsService.getJobStatus('JOB-BULK-12345', 'user-123');

        // Assert
        expect(databaseAdapter.findOne).toHaveBeenCalledWith('BulkReportJob', { jobId: 'JOB-BULK-12345' });
        expect(result.jobId).toBe('JOB-BULK-12345');
        expect(result.status).toBe('processing');
        expect(result.progress).toBe(60); // 3 out of 5 completed
      });

      it('should calculate progress percentage correctly', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-67890',
          userId: 'user-123',
          status: 'completed',
          totalReports: 10,
          completedReports: 10,
          failedReports: 0
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act
        const result = await BulkReportsService.getJobStatus('JOB-BULK-67890', 'user-123');

        // Assert
        expect(result.progress).toBe(100);
      });
    });

    describe('when job does not exist', () => {
      it('should throw error when job is not found', async () => {
        // Arrange
        databaseAdapter.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(BulkReportsService.getJobStatus('INVALID-JOB', 'user-123'))
          .rejects.toThrow('Job not found');
      });
    });

    describe('when user is not authorized', () => {
      it('should throw error when user is not job owner', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'different-user',
          status: 'processing'
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act & Assert
        await expect(BulkReportsService.getJobStatus('JOB-BULK-12345', 'user-123'))
          .rejects.toThrow('Unauthorized access to job');
      });
    });
  });

  describe('cancelJob', () => {
    describe('when cancellation is valid', () => {
      it('should cancel a queued job', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          status: 'queued',
          totalReports: 5,
          completedReports: 0,
          failedReports: 0
        };

        const mockUpdatedJob = {
          ...mockJob,
          status: 'cancelled',
          cancelledAt: expect.any(Date)
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);
        databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedJob);
        JobQueueService.cancelJob.mockResolvedValue(true);

        // Act
        const result = await BulkReportsService.cancelJob('JOB-BULK-12345', 'user-123');

        // Assert
        expect(JobQueueService.cancelJob).toHaveBeenCalledWith('JOB-BULK-12345');
        expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
          'BulkReportJob',
          'JOB-BULK-12345',
          expect.objectContaining({
            status: 'cancelled',
            cancelledAt: expect.any(Date)
          }),
          { new: true }
        );
        expect(result.status).toBe('cancelled');
      });

      it('should cancel a processing job and stop remaining reports', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-67890',
          userId: 'user-123',
          status: 'processing',
          totalReports: 5,
          completedReports: 2,
          failedReports: 0,
          reports: [
            { status: 'completed' },
            { status: 'completed' },
            { status: 'processing' },
            { status: 'pending' },
            { status: 'pending' }
          ]
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);
        databaseAdapter.findByIdAndUpdate.mockResolvedValue({
          ...mockJob,
          status: 'cancelled',
          cancelledReports: 3
        });
        JobQueueService.cancelJob.mockResolvedValue(true);

        // Act
        const result = await BulkReportsService.cancelJob('JOB-BULK-67890', 'user-123');

        // Assert
        expect(result.status).toBe('cancelled');
        expect(JobQueueService.cancelJob).toHaveBeenCalled();
      });
    });

    describe('when cancellation is invalid', () => {
      it('should reject when job is not found', async () => {
        // Arrange
        databaseAdapter.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(BulkReportsService.cancelJob('INVALID-JOB', 'user-123'))
          .rejects.toThrow('Job not found');
      });

      it('should reject when user is not authorized', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'different-user',
          status: 'queued'
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act & Assert
        await expect(BulkReportsService.cancelJob('JOB-BULK-12345', 'user-123'))
          .rejects.toThrow('Unauthorized access to job');
      });

      it('should reject when job is already completed', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          status: 'completed'
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act & Assert
        await expect(BulkReportsService.cancelJob('JOB-BULK-12345', 'user-123'))
          .rejects.toThrow('Cannot cancel a completed job');
      });

      it('should reject when job is already cancelled', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          status: 'cancelled'
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act & Assert
        await expect(BulkReportsService.cancelJob('JOB-BULK-12345', 'user-123'))
          .rejects.toThrow('Cannot cancel a cancelled job');
      });

      it('should reject when job is failed', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          status: 'failed'
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);

        // Act & Assert
        await expect(BulkReportsService.cancelJob('JOB-BULK-12345', 'user-123'))
          .rejects.toThrow('Cannot cancel a failed job');
      });
    });
  });

  describe('getUserJobs', () => {
    describe('when fetching user jobs', () => {
      it('should return all jobs for user', async () => {
        // Arrange
        const mockJobs = [
          { jobId: 'JOB-BULK-001', status: 'completed', totalReports: 3 },
          { jobId: 'JOB-BULK-002', status: 'processing', totalReports: 5 },
          { jobId: 'JOB-BULK-003', status: 'queued', totalReports: 2 }
        ];

        databaseAdapter.find.mockResolvedValue(mockJobs);

        // Act
        const result = await BulkReportsService.getUserJobs('user-123', {});

        // Assert
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'BulkReportJob',
          { userId: 'user-123' },
          { sort: { createdAt: -1 } }
        );
        expect(result).toHaveLength(3);
      });

      it('should filter jobs by status', async () => {
        // Arrange
        const mockJobs = [
          { jobId: 'JOB-BULK-001', status: 'completed', totalReports: 3 }
        ];

        databaseAdapter.find.mockResolvedValue(mockJobs);

        // Act
        const result = await BulkReportsService.getUserJobs('user-123', { status: 'completed' });

        // Assert
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'BulkReportJob',
          { userId: 'user-123', status: 'completed' },
          { sort: { createdAt: -1 } }
        );
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('completed');
      });

      it('should return empty array when user has no jobs', async () => {
        // Arrange
        databaseAdapter.find.mockResolvedValue([]);

        // Act
        const result = await BulkReportsService.getUserJobs('new-user', {});

        // Assert
        expect(result).toEqual([]);
      });

      it('should sort jobs by creation date descending', async () => {
        // Arrange
        const mockJobs = [
          { jobId: 'JOB-BULK-003', createdAt: new Date('2026-02-05T12:00:00Z') },
          { jobId: 'JOB-BULK-002', createdAt: new Date('2026-02-05T11:00:00Z') },
          { jobId: 'JOB-BULK-001', createdAt: new Date('2026-02-05T10:00:00Z') }
        ];

        databaseAdapter.find.mockResolvedValue(mockJobs);

        // Act
        const result = await BulkReportsService.getUserJobs('user-123', {});

        // Assert
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'BulkReportJob',
          expect.any(Object),
          { sort: { createdAt: -1 } }
        );
        expect(result[0].jobId).toBe('JOB-BULK-003');
      });
    });
  });

  describe('processJob', () => {
    describe('when processing job reports', () => {
      it('should process all reports in the job sequentially', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          companyId: 'company-123',
          status: 'queued',
          totalReports: 2,
          completedReports: 0,
          failedReports: 0,
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'pending', parameters: {} },
            { reportType: 'equity', format: 'csv', status: 'pending', parameters: {} }
          ]
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);
        databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockJob);

        // Act
        const result = await BulkReportsService.processJob('JOB-BULK-12345');

        // Assert
        expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
          'BulkReportJob',
          'JOB-BULK-12345',
          expect.objectContaining({
            status: 'processing',
            startedAt: expect.any(Date)
          }),
          { new: true }
        );
      });

      it('should handle partial failures gracefully', async () => {
        // Arrange
        const mockJob = {
          jobId: 'JOB-BULK-67890',
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'pending' },
            { reportType: 'invalid-type', format: 'pdf', status: 'pending' }
          ]
        };

        databaseAdapter.findOne.mockResolvedValue(mockJob);
        databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockJob);

        // Act
        const result = await BulkReportsService.processJob('JOB-BULK-67890');

        // Assert - Job should continue even if some reports fail
        expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('getValidReportTypes', () => {
    it('should return all valid report types', () => {
      const types = BulkReportsService.getValidReportTypes();
      expect(types).toContain('holdings');
      expect(types).toContain('transactions');
      expect(types).toContain('valuations');
      expect(types).toContain('tax');
      expect(types).toContain('financial');
    });
  });

  describe('getValidFormats', () => {
    it('should return all valid formats', () => {
      const formats = BulkReportsService.getValidFormats();
      expect(formats).toContain('pdf');
      expect(formats).toContain('csv');
      expect(formats).toContain('xlsx');
      expect(formats).toContain('json');
    });
  });
});
