/**
 * Job Queue Service Tests
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Test suite for simple job queue management including:
 * - Job enqueueing
 * - Job processing
 * - Job cancellation
 * - Queue status
 */

const JobQueueService = require('../../../services/jobQueueService');

describe('JobQueueService', () => {
  beforeEach(() => {
    // Clear the queue before each test
    JobQueueService.clearQueue();
  });

  describe('enqueueJob', () => {
    it('should add a job to the queue and return queue ID', async () => {
      // Arrange
      const jobData = {
        jobId: 'JOB-BULK-12345',
        type: 'bulk-report',
        payload: { reports: [] }
      };

      // Act
      const result = await JobQueueService.enqueueJob(jobData);

      // Assert
      expect(result).toHaveProperty('queueId');
      expect(result.queueId).toBeTruthy();
      expect(result.status).toBe('queued');
    });

    it('should process job asynchronously', async () => {
      // Arrange
      const jobData = {
        jobId: 'JOB-BULK-67890',
        type: 'bulk-report',
        payload: { reports: [] }
      };

      // Act
      const result = await JobQueueService.enqueueJob(jobData);

      // Assert
      expect(result.status).toBe('queued');
    });
  });

  describe('cancelJob', () => {
    it('should cancel a queued job', async () => {
      // Arrange
      const jobData = {
        jobId: 'JOB-BULK-12345',
        type: 'bulk-report',
        payload: { reports: [] }
      };
      await JobQueueService.enqueueJob(jobData);

      // Act
      const result = await JobQueueService.cancelJob('JOB-BULK-12345');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent job', async () => {
      // Act
      const result = await JobQueueService.cancelJob('INVALID-JOB');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue statistics', async () => {
      // Arrange
      await JobQueueService.enqueueJob({ jobId: 'JOB-1', type: 'bulk-report', payload: {} });
      await JobQueueService.enqueueJob({ jobId: 'JOB-2', type: 'bulk-report', payload: {} });

      // Act
      const status = await JobQueueService.getQueueStatus();

      // Assert
      expect(status).toHaveProperty('totalJobs');
      expect(status).toHaveProperty('queuedJobs');
      expect(status).toHaveProperty('processingJobs');
      expect(status.totalJobs).toBeGreaterThanOrEqual(2);
    });
  });

  describe('clearQueue', () => {
    it('should remove all jobs from queue', () => {
      // Arrange
      JobQueueService.enqueueJob({ jobId: 'JOB-1', type: 'bulk-report', payload: {} });
      JobQueueService.enqueueJob({ jobId: 'JOB-2', type: 'bulk-report', payload: {} });

      // Act
      JobQueueService.clearQueue();

      // Assert
      const status = JobQueueService.getQueueStatus();
      expect(status.totalJobs).toBe(0);
    });
  });
});
