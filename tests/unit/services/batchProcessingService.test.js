/**
 * Batch Processing Service Unit Tests
 * Issue #50: Implement Data Processing Pipeline
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.NODE_ENV = 'test';

const BatchProcessingService = require('../../../services/batchProcessingService');

// Mock dependencies
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');

describe('BatchProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    BatchProcessingService.clearAllJobs();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('processBatch', () => {
    it('should process data in batches with default batch size', async () => {
      const data = Array(150).fill(null).map((_, i) => ({ id: String(i), value: i * 10 }));
      const processor = jest.fn(async (item) => ({ ...item, processed: true }));

      const result = await BatchProcessingService.processBatch(data, processor);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(150);
      expect(result.batchCount).toBe(2); // Default batch size is 100
      expect(processor).toHaveBeenCalledTimes(150);
    });

    it('should process data with custom batch size', async () => {
      const data = Array(100).fill(null).map((_, i) => ({ id: String(i), value: i }));
      const processor = jest.fn(async (item) => ({ ...item, processed: true }));

      const result = await BatchProcessingService.processBatch(data, processor, {
        batchSize: 25
      });

      expect(result.batchCount).toBe(4);
      expect(result.totalProcessed).toBe(100);
    });

    it('should collect results from processor', async () => {
      const data = [
        { id: '1', value: 10 },
        { id: '2', value: 20 }
      ];
      const processor = jest.fn(async (item) => ({
        ...item,
        doubled: item.value * 2
      }));

      const result = await BatchProcessingService.processBatch(data, processor, {
        collectResults: true
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].doubled).toBe(20);
      expect(result.results[1].doubled).toBe(40);
    });

    it('should handle processor errors gracefully', async () => {
      const data = [
        { id: '1', value: 10 },
        { id: '2', value: 20 },
        { id: '3', value: 30 }
      ];
      const processor = jest.fn(async (item) => {
        if (item.id === '2') {
          throw new Error('Processing failed');
        }
        return { ...item, processed: true };
      });

      const result = await BatchProcessingService.processBatch(data, processor, {
        continueOnError: true
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('item');
      expect(result.errors[0]).toHaveProperty('error');
    });

    it('should stop processing on error when continueOnError is false', async () => {
      const data = Array(10).fill(null).map((_, i) => ({ id: String(i), value: i }));
      const processor = jest.fn(async (item) => {
        if (item.id === '5') {
          throw new Error('Fatal error');
        }
        return { ...item, processed: true };
      });

      const result = await BatchProcessingService.processBatch(data, processor, {
        continueOnError: false
      });

      expect(result.success).toBe(false);
      expect(result.totalProcessed).toBeLessThan(10);
      expect(result.error).toContain('Fatal error');
    });

    it('should support parallel processing within batches', async () => {
      const data = Array(20).fill(null).map((_, i) => ({ id: String(i), value: i }));
      const processor = jest.fn(async (item) => {
        return { ...item, processed: true };
      });

      const result = await BatchProcessingService.processBatch(data, processor, {
        batchSize: 5,
        parallel: true,
        concurrency: 3
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(20);
    });

    it('should report progress during processing', async () => {
      const data = Array(50).fill(null).map((_, i) => ({ id: String(i) }));
      const processor = jest.fn(async (item) => item);
      const onProgress = jest.fn();

      await BatchProcessingService.processBatch(data, processor, {
        batchSize: 10,
        onProgress
      });

      expect(onProgress).toHaveBeenCalledTimes(5);
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        processedCount: expect.any(Number),
        totalCount: 50,
        percentage: expect.any(Number),
        currentBatch: expect.any(Number)
      }));
    });

    it('should handle empty data array', async () => {
      const processor = jest.fn();

      const result = await BatchProcessingService.processBatch([], processor);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(0);
      expect(result.batchCount).toBe(0);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should support batch-level callbacks', async () => {
      const data = Array(30).fill(null).map((_, i) => ({ id: String(i) }));
      const processor = jest.fn(async (item) => item);
      const onBatchComplete = jest.fn();

      await BatchProcessingService.processBatch(data, processor, {
        batchSize: 10,
        onBatchComplete
      });

      expect(onBatchComplete).toHaveBeenCalledTimes(3);
      expect(onBatchComplete).toHaveBeenCalledWith(expect.objectContaining({
        batchNumber: expect.any(Number),
        processedInBatch: 10,
        batchResults: expect.any(Array)
      }));
    });

    it('should support retry logic for failed items', async () => {
      jest.useRealTimers();

      let attemptCount = 0;
      const data = [{ id: '1', value: 10 }];
      const processor = jest.fn(async (item) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { ...item, processed: true };
      });

      const result = await BatchProcessingService.processBatch(data, processor, {
        retryConfig: {
          maxRetries: 3,
          retryDelay: 10  // Short delay for test
        }
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);

      jest.useFakeTimers();
    }, 10000);
  });

  describe('scheduleJob', () => {
    it('should schedule a batch job for immediate execution', async () => {
      const jobConfig = {
        name: 'immediate-job',
        data: [{ id: '1' }, { id: '2' }],
        processor: async (item) => ({ ...item, processed: true }),
        schedule: { type: 'immediate' }
      };

      const job = await BatchProcessingService.scheduleJob(jobConfig);

      expect(job).toHaveProperty('jobId');
      expect(job).toHaveProperty('status', 'scheduled');
      expect(job).toHaveProperty('scheduledAt');
    });

    it('should schedule a job for delayed execution', async () => {
      const jobConfig = {
        name: 'delayed-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 5000 }
      };

      const job = await BatchProcessingService.scheduleJob(jobConfig);

      expect(job.status).toBe('scheduled');
      expect(job.scheduledFor).toBeDefined();
    });

    it('should schedule a recurring job', async () => {
      const jobConfig = {
        name: 'recurring-job',
        dataSource: async () => [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'cron', expression: '0 * * * *' } // Every hour
      };

      const job = await BatchProcessingService.scheduleJob(jobConfig);

      expect(job.status).toBe('scheduled');
      expect(job.schedule.type).toBe('cron');
      expect(job.nextRun).toBeDefined();
    });

    it('should schedule a job with priority', async () => {
      const highPriorityJob = {
        name: 'high-priority',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' },
        priority: 'high'
      };

      const lowPriorityJob = {
        name: 'low-priority',
        data: [{ id: '2' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' },
        priority: 'low'
      };

      const job1 = await BatchProcessingService.scheduleJob(highPriorityJob);
      const job2 = await BatchProcessingService.scheduleJob(lowPriorityJob);

      expect(job1.priority).toBe('high');
      expect(job2.priority).toBe('low');
    });

    it('should validate job configuration', async () => {
      const invalidConfig = {
        name: 'invalid-job'
        // Missing required fields
      };

      await expect(BatchProcessingService.scheduleJob(invalidConfig))
        .rejects.toThrow('Job configuration must include');
    });

    it('should persist job to database', async () => {
      databaseAdapter.create.mockResolvedValue({ _id: 'job-123' });

      const jobConfig = {
        name: 'persistent-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' },
        persist: true
      };

      const job = await BatchProcessingService.scheduleJob(jobConfig);

      expect(databaseAdapter.create).toHaveBeenCalled();
      expect(job.persisted).toBe(true);
    });

    it('should support job dependencies', async () => {
      const job1 = await BatchProcessingService.scheduleJob({
        name: 'parent-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' }
      });

      const job2 = await BatchProcessingService.scheduleJob({
        name: 'dependent-job',
        data: [{ id: '2' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' },
        dependsOn: [job1.jobId]
      });

      expect(job2.dependsOn).toContain(job1.jobId);
      expect(job2.status).toBe('waiting_for_dependencies');
    });
  });

  describe('getJobStatus', () => {
    it('should return status of a scheduled job', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'status-test-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 10000 }
      });

      const status = BatchProcessingService.getJobStatus(job.jobId);

      expect(status).toHaveProperty('jobId', job.jobId);
      expect(status).toHaveProperty('name', 'status-test-job');
      expect(status).toHaveProperty('status', 'scheduled');
      expect(status).toHaveProperty('createdAt');
    });

    it('should return detailed progress for running jobs', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'running-job',
        data: Array(100).fill(null).map((_, i) => ({ id: String(i) })),
        processor: async (item) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return item;
        },
        schedule: { type: 'immediate' }
      });

      // Simulate job starting
      BatchProcessingService._setJobRunning(job.jobId, { processed: 50, total: 100 });

      const status = BatchProcessingService.getJobStatus(job.jobId);

      expect(status.status).toBe('running');
      expect(status.progress).toHaveProperty('processed', 50);
      expect(status.progress).toHaveProperty('total', 100);
      expect(status.progress).toHaveProperty('percentage', 50);
    });

    it('should return completion details for finished jobs', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'completed-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' }
      });

      // Simulate job completion
      BatchProcessingService._setJobCompleted(job.jobId, {
        totalProcessed: 1,
        duration: 500,
        errors: []
      });

      const status = BatchProcessingService.getJobStatus(job.jobId);

      expect(status.status).toBe('completed');
      expect(status.result).toHaveProperty('totalProcessed', 1);
      expect(status.result).toHaveProperty('duration', 500);
      expect(status).toHaveProperty('completedAt');
    });

    it('should return error details for failed jobs', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'failed-job',
        data: [{ id: '1' }],
        processor: async () => { throw new Error('Test error'); },
        schedule: { type: 'immediate' }
      });

      // Simulate job failure
      BatchProcessingService._setJobFailed(job.jobId, new Error('Processing failed'));

      const status = BatchProcessingService.getJobStatus(job.jobId);

      expect(status.status).toBe('failed');
      expect(status.error).toContain('Processing failed');
      expect(status).toHaveProperty('failedAt');
    });

    it('should return null for non-existent job', () => {
      const status = BatchProcessingService.getJobStatus('non-existent-id');

      expect(status).toBeNull();
    });

    it('should include execution history for recurring jobs', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'recurring-status-job',
        dataSource: async () => [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'cron', expression: '0 * * * *' }
      });

      // Simulate multiple executions
      BatchProcessingService._addExecutionHistory(job.jobId, {
        executionId: 'exec-1',
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'completed'
      });

      const status = BatchProcessingService.getJobStatus(job.jobId);

      expect(status.executionHistory).toBeDefined();
      expect(status.executionHistory).toHaveLength(1);
    });
  });

  describe('cancelJob', () => {
    it('should cancel a scheduled job', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'to-cancel-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 10000 }
      });

      const result = await BatchProcessingService.cancelJob(job.jobId);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe(job.jobId);
      expect(result.previousStatus).toBe('scheduled');

      const status = BatchProcessingService.getJobStatus(job.jobId);
      expect(status.status).toBe('cancelled');
    });

    it('should cancel a running job', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'running-to-cancel',
        data: Array(1000).fill(null).map((_, i) => ({ id: String(i) })),
        processor: async (item) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return item;
        },
        schedule: { type: 'immediate' }
      });

      BatchProcessingService._setJobRunning(job.jobId, { processed: 100, total: 1000 });

      const result = await BatchProcessingService.cancelJob(job.jobId);

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('running');
      expect(result.processedBeforeCancel).toBe(100);
    });

    it('should not cancel already completed jobs', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'completed-cancel-attempt',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' }
      });

      BatchProcessingService._setJobCompleted(job.jobId, { totalProcessed: 1 });

      const result = await BatchProcessingService.cancelJob(job.jobId);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('already completed');
    });

    it('should return error for non-existent job', async () => {
      const result = await BatchProcessingService.cancelJob('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should cancel recurring job and all future executions', async () => {
      const job = await BatchProcessingService.scheduleJob({
        name: 'recurring-to-cancel',
        dataSource: async () => [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'cron', expression: '0 * * * *' }
      });

      const result = await BatchProcessingService.cancelJob(job.jobId, {
        cancelFutureExecutions: true
      });

      expect(result.success).toBe(true);
      expect(result.futureExecutionsCancelled).toBe(true);

      const status = BatchProcessingService.getJobStatus(job.jobId);
      expect(status.status).toBe('cancelled');
      expect(status.nextRun).toBeNull();
    });

    it('should support cancellation with cleanup callback', async () => {
      const cleanupFn = jest.fn();

      const job = await BatchProcessingService.scheduleJob({
        name: 'cleanup-cancel-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 10000 },
        onCancel: cleanupFn
      });

      await BatchProcessingService.cancelJob(job.jobId);

      expect(cleanupFn).toHaveBeenCalledWith(expect.objectContaining({
        jobId: job.jobId
      }));
    });
  });

  describe('Job Queue Management', () => {
    it('should list all scheduled jobs', async () => {
      await BatchProcessingService.scheduleJob({
        name: 'job-1',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 10000 }
      });

      await BatchProcessingService.scheduleJob({
        name: 'job-2',
        data: [{ id: '2' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 20000 }
      });

      const jobs = BatchProcessingService.listJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs[0]).toHaveProperty('name');
      expect(jobs[0]).toHaveProperty('status');
    });

    it('should filter jobs by status', async () => {
      const job1 = await BatchProcessingService.scheduleJob({
        name: 'scheduled-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 10000 }
      });

      const job2 = await BatchProcessingService.scheduleJob({
        name: 'running-job',
        data: [{ id: '2' }],
        processor: async (item) => item,
        schedule: { type: 'immediate' }
      });

      BatchProcessingService._setJobRunning(job2.jobId, { processed: 0, total: 1 });

      const scheduledJobs = BatchProcessingService.listJobs({ status: 'scheduled' });
      const runningJobs = BatchProcessingService.listJobs({ status: 'running' });

      expect(scheduledJobs).toHaveLength(1);
      expect(runningJobs).toHaveLength(1);
    });

    it('should pause and resume job queue', async () => {
      await BatchProcessingService.scheduleJob({
        name: 'pausable-job',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 1000 }
      });

      BatchProcessingService.pauseQueue();
      expect(BatchProcessingService.isQueuePaused()).toBe(true);

      BatchProcessingService.resumeQueue();
      expect(BatchProcessingService.isQueuePaused()).toBe(false);
    });

    it('should get queue statistics', async () => {
      await BatchProcessingService.scheduleJob({
        name: 'stats-job-1',
        data: [{ id: '1' }],
        processor: async (item) => item,
        schedule: { type: 'delayed', delay: 10000 }
      });

      const stats = BatchProcessingService.getQueueStats();

      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('scheduledJobs');
      expect(stats).toHaveProperty('runningJobs');
      expect(stats).toHaveProperty('completedJobs');
      expect(stats).toHaveProperty('failedJobs');
      expect(stats).toHaveProperty('queueStatus');
    });
  });

  describe('Batch Processing Options', () => {
    it('should support transaction-like batch processing', async () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const processor = jest.fn(async (item) => {
        if (item.id === '3') throw new Error('Failed');
        return item;
      });

      const result = await BatchProcessingService.processBatch(data, processor, {
        transactional: true,
        continueOnError: false  // Must be false for transactional rollback
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
    });

    it('should support custom batch completion criteria', async () => {
      const data = Array(100).fill(null).map((_, i) => ({ id: String(i), value: i }));
      const processor = jest.fn(async (item) => ({ ...item, processed: true }));

      const result = await BatchProcessingService.processBatch(data, processor, {
        batchSize: 10,
        completionCriteria: {
          maxProcessed: 50
        }
      });

      expect(result.totalProcessed).toBe(50);
      expect(result.stoppedEarly).toBe(true);
      expect(result.stopReason).toBe('maxProcessed reached');
    });

    it('should support timeout for batch processing', async () => {
      jest.useRealTimers();

      const data = Array(100).fill(null).map((_, i) => ({ id: String(i) }));
      const processor = jest.fn(async (item) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return item;
      });

      const result = await BatchProcessingService.processBatch(data, processor, {
        timeout: 150,
        batchSize: 10
      });

      expect(result.timedOut).toBe(true);
      expect(result.totalProcessed).toBeLessThan(100);

      jest.useFakeTimers();
    }, 10000);
  });
});
