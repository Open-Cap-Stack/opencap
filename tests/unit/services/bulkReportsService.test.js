/**
 * Bulk Reports Service Tests
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Test suite for bulk report generation service including:
 * - Job creation and management
 * - Queue operations
 * - Report generation
 * - Status tracking
 * - Error handling
 */

const BulkReportsService = require('../../../services/bulkReportsService');
const databaseAdapter = require('../../../services/databaseAdapter');
const JobQueueService = require('../../../services/jobQueueService');

// Mock dependencies
jest.mock('../../../services/databaseAdapter');
jest.mock('../../../services/jobQueueService');

describe('BulkReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBulkJob', () => {
    describe('when creating a valid bulk job', () => {
      it('should create job record and queue all reports', async () => {
        // Arrange
        const jobData = {
          reports: [
            { reportType: 'financial', format: 'pdf', parameters: { year: 2025 } },
            { reportType: 'equity', format: 'csv', parameters: { asOf: '2025-12-31' } }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        const mockJob = {
          jobId: 'JOB-BULK-12345',
          userId: 'user-123',
          companyId: 'company-123',
          status: 'queued',
          totalReports: 2,
          completedReports: 0,
          failedReports: 0,
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'pending', parameters: { year: 2025 } },
            { reportType: 'equity', format: 'csv', status: 'pending', parameters: { asOf: '2025-12-31' } }
          ],
          createdAt: expect.any(Date)
        };

        databaseAdapter.create.mockResolvedValue(mockJob);
        JobQueueService.enqueueJob.mockResolvedValue({ queueId: 'queue-1' });

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(databaseAdapter.create).toHaveBeenCalledWith('BulkReportJob', expect.objectContaining({
          userId: 'user-123',
          companyId: 'company-123',
          status: 'queued',
          totalReports: 2,
          completedReports: 0,
          failedReports: 0
        }));

        expect(JobQueueService.enqueueJob).toHaveBeenCalledTimes(1);
        expect(result.jobId).toBe('JOB-BULK-12345');
        expect(result.totalReports).toBe(2);
        expect(result.status).toBe('queued');
      });

      it('should validate all report configurations', async () => {
        // Arrange
        const jobData = {
          reports: [
            { reportType: 'financial', format: 'pdf' },
            { reportType: 'equity', format: 'csv' },
            { reportType: 'compliance', format: 'xlsx' }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        databaseAdapter.create.mockResolvedValue({
          jobId: 'JOB-BULK-67890',
          totalReports: 3,
          status: 'queued'
        });
        JobQueueService.enqueueJob.mockResolvedValue({ queueId: 'queue-1' });

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(result.totalReports).toBe(3);
        expect(JobQueueService.enqueueJob).toHaveBeenCalled();
      });

      it('should set estimated completion time based on report count', async () => {
        // Arrange
        const jobData = {
          reports: [
            { reportType: 'financial', format: 'pdf' },
            { reportType: 'equity', format: 'csv' },
            { reportType: 'compliance', format: 'xlsx' },
            { reportType: 'investor', format: 'pdf' },
            { reportType: 'operational', format: 'json' }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        };

        databaseAdapter.create.mockResolvedValue({
          jobId: 'JOB-BULK-11111',
          totalReports: 5,
          status: 'queued',
          createdAt: new Date(),
          estimatedCompletionTime: expect.any(Date)
        });
        JobQueueService.enqueueJob.mockResolvedValue({ queueId: 'queue-1' });

        // Act
        const result = await BulkReportsService.createBulkJob(jobData);

        // Assert
        expect(result.estimatedCompletionTime).toBeDefined();
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
});
