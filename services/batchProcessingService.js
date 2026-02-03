/**
 * Batch Processing Service
 * Issue #50: Implement Data Processing Pipeline
 *
 * Provides batch processing capabilities including job scheduling,
 * parallel processing, retry logic, and job management
 */

const databaseAdapter = require('./databaseAdapter');

class BatchProcessingService {
  constructor() {
    this.jobs = new Map();
    this.jobQueue = [];
    this.queuePaused = false;
    this.defaultBatchSize = 100;
  }

  /**
   * Process data in batches
   * @param {Array} data - Data to process
   * @param {Function|Array} processor - Processing function(s)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processBatch(data, processor, options = {}) {
    const {
      batchSize = this.defaultBatchSize,
      collectResults = false,
      continueOnError = true,
      parallel = false,
      concurrency = 4,
      onProgress,
      onBatchComplete,
      retryConfig = null,
      transactional = false,
      completionCriteria = null,
      timeout = null
    } = options;

    if (data.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        batchCount: 0,
        errors: []
      };
    }

    const startTime = Date.now();
    const results = [];
    const errors = [];
    let totalProcessed = 0;
    let batchCount = 0;
    let stoppedEarly = false;
    let stopReason = null;
    let timedOut = false;
    const processedItems = [];

    try {
      // Split data into batches
      const batches = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        // Check timeout
        if (timeout && (Date.now() - startTime) > timeout) {
          timedOut = true;
          break;
        }

        // Check completion criteria
        if (completionCriteria) {
          if (completionCriteria.maxProcessed && totalProcessed >= completionCriteria.maxProcessed) {
            stoppedEarly = true;
            stopReason = 'maxProcessed reached';
            break;
          }
        }

        batchCount++;
        const batchResults = [];

        if (parallel) {
          // Process batch items in parallel with concurrency limit
          const batchResults = await this._processParallelBatch(
            batch, processor, concurrency, retryConfig, continueOnError, errors
          );
          results.push(...batchResults.filter(r => r !== undefined));
          totalProcessed += batchResults.length;
          processedItems.push(...batch);
        } else {
          // Process batch items sequentially
          for (const item of batch) {
            try {
              let result;
              if (retryConfig) {
                result = await this._processWithRetry(item, processor, retryConfig);
              } else {
                result = await processor(item);
              }

              if (collectResults && result !== undefined) {
                results.push(result);
              }
              batchResults.push(result);
              totalProcessed++;
              processedItems.push(item);
            } catch (error) {
              errors.push({ item, error: error.message });
              if (!continueOnError) {
                if (transactional) {
                  return {
                    success: false,
                    totalProcessed,
                    batchCount,
                    error: error.message,
                    errors,
                    rolledBack: true
                  };
                }
                return {
                  success: false,
                  totalProcessed,
                  batchCount,
                  error: error.message,
                  errors
                };
              }
            }
          }
        }

        // Report progress
        if (onProgress) {
          onProgress({
            processedCount: totalProcessed,
            totalCount: data.length,
            percentage: Math.round((totalProcessed / data.length) * 100),
            currentBatch: batchCount
          });
        }

        // Batch complete callback
        if (onBatchComplete) {
          onBatchComplete({
            batchNumber: batchCount,
            processedInBatch: batch.length,
            batchResults
          });
        }
      }

      return {
        success: true,
        totalProcessed,
        batchCount,
        errors,
        results: collectResults ? results : undefined,
        stoppedEarly,
        stopReason,
        timedOut,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        totalProcessed,
        batchCount,
        error: error.message,
        errors
      };
    }
  }

  /**
   * Process batch items in parallel with concurrency limit
   */
  async _processParallelBatch(batch, processor, concurrency, retryConfig, continueOnError, errors) {
    const results = [];
    const queue = [...batch];

    const workers = [];
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      workers.push(this._parallelWorker(queue, processor, results, retryConfig, continueOnError, errors));
    }

    await Promise.all(workers);
    return results;
  }

  /**
   * Worker for parallel processing
   */
  async _parallelWorker(queue, processor, results, retryConfig, continueOnError, errors) {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      try {
        let result;
        if (retryConfig) {
          result = await this._processWithRetry(item, processor, retryConfig);
        } else {
          result = await processor(item);
        }
        results.push(result);
      } catch (error) {
        errors.push({ item, error: error.message });
        if (!continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Process item with retry logic
   */
  async _processWithRetry(item, processor, retryConfig) {
    const { maxRetries = 3, retryDelay = 100 } = retryConfig;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await processor(item);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await this._delay(retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Delay helper
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Schedule a batch job
   * @param {Object} jobConfig - Job configuration
   * @returns {Promise<Object>} Scheduled job info
   */
  async scheduleJob(jobConfig) {
    const {
      name,
      data,
      dataSource,
      processor,
      schedule,
      priority = 'normal',
      persist = false,
      dependsOn = [],
      onCancel
    } = jobConfig;

    // Validate configuration
    if (!name) {
      throw new Error('Job configuration must include a name');
    }

    if (!data && !dataSource) {
      throw new Error('Job configuration must include data or dataSource');
    }

    if (!processor) {
      throw new Error('Job configuration must include a processor function');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job = {
      jobId,
      name,
      data,
      dataSource,
      processor,
      schedule,
      priority,
      status: dependsOn.length > 0 ? 'waiting_for_dependencies' : 'scheduled',
      createdAt: new Date(),
      scheduledAt: new Date(),
      scheduledFor: this._calculateScheduledTime(schedule),
      nextRun: this._calculateNextRun(schedule),
      dependsOn,
      persist,
      onCancel,
      executionHistory: []
    };

    this.jobs.set(jobId, job);
    this.jobQueue.push(job);

    // Persist to database if requested
    if (persist) {
      try {
        await databaseAdapter.create('BatchJob', {
          jobId,
          name,
          schedule,
          priority,
          status: job.status,
          createdAt: job.createdAt
        });
        job.persisted = true;
      } catch (error) {
        console.error('Failed to persist job:', error);
      }
    }

    return {
      jobId,
      name,
      status: job.status,
      scheduledAt: job.scheduledAt,
      scheduledFor: job.scheduledFor,
      nextRun: job.nextRun,
      priority,
      schedule,
      dependsOn: job.dependsOn,
      persisted: job.persisted || false
    };
  }

  /**
   * Calculate scheduled execution time
   */
  _calculateScheduledTime(schedule) {
    if (!schedule) return new Date();

    switch (schedule.type) {
      case 'immediate':
        return new Date();
      case 'delayed':
        return new Date(Date.now() + schedule.delay);
      case 'cron':
        return this._getNextCronTime(schedule.expression);
      default:
        return new Date();
    }
  }

  /**
   * Calculate next run time for recurring jobs
   */
  _calculateNextRun(schedule) {
    if (!schedule || schedule.type !== 'cron') return null;
    return this._getNextCronTime(schedule.expression);
  }

  /**
   * Simple cron time calculation (simplified implementation)
   */
  _getNextCronTime(expression) {
    // Simplified: just return next hour for "0 * * * *" style expressions
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job status
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const status = {
      jobId: job.jobId,
      name: job.name,
      status: job.status,
      createdAt: job.createdAt,
      scheduledFor: job.scheduledFor,
      priority: job.priority
    };

    if (job.status === 'running' && job.progress) {
      status.progress = {
        processed: job.progress.processed,
        total: job.progress.total,
        percentage: Math.round((job.progress.processed / job.progress.total) * 100)
      };
    }

    if (job.status === 'completed') {
      status.completedAt = job.completedAt;
      status.result = job.result;
    }

    if (job.status === 'failed') {
      status.failedAt = job.failedAt;
      status.error = job.error;
    }

    if (job.executionHistory && job.executionHistory.length > 0) {
      status.executionHistory = job.executionHistory;
    }

    if (job.schedule && job.schedule.type === 'cron') {
      status.nextRun = job.nextRun;
    }

    return status;
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @param {Object} options - Cancel options
   * @returns {Promise<Object>} Cancel result
   */
  async cancelJob(jobId, options = {}) {
    const { cancelFutureExecutions = false } = options;
    const job = this.jobs.get(jobId);

    if (!job) {
      return { success: false, reason: 'Job not found' };
    }

    if (job.status === 'completed') {
      return { success: false, reason: 'Job already completed' };
    }

    const previousStatus = job.status;
    const processedBeforeCancel = job.progress ? job.progress.processed : 0;

    // Call cancel callback if provided
    if (job.onCancel) {
      try {
        await job.onCancel({ jobId });
      } catch (error) {
        console.error('Cancel callback error:', error);
      }
    }

    job.status = 'cancelled';
    job.cancelledAt = new Date();

    if (cancelFutureExecutions) {
      job.nextRun = null;
    }

    return {
      success: true,
      jobId,
      previousStatus,
      processedBeforeCancel,
      futureExecutionsCancelled: cancelFutureExecutions
    };
  }

  /**
   * List all jobs
   * @param {Object} filter - Filter options
   * @returns {Array} List of jobs
   */
  listJobs(filter = {}) {
    const { status } = filter;
    let jobs = Array.from(this.jobs.values());

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    return jobs.map(j => ({
      jobId: j.jobId,
      name: j.name,
      status: j.status,
      priority: j.priority,
      createdAt: j.createdAt
    }));
  }

  /**
   * Pause job queue
   */
  pauseQueue() {
    this.queuePaused = true;
  }

  /**
   * Resume job queue
   */
  resumeQueue() {
    this.queuePaused = false;
  }

  /**
   * Check if queue is paused
   */
  isQueuePaused() {
    return this.queuePaused;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const jobs = Array.from(this.jobs.values());

    return {
      totalJobs: jobs.length,
      scheduledJobs: jobs.filter(j => j.status === 'scheduled').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      queueStatus: this.queuePaused ? 'paused' : 'active'
    };
  }

  /**
   * Clear all jobs (for testing)
   */
  clearAllJobs() {
    this.jobs.clear();
    this.jobQueue = [];
  }

  // Internal methods for testing job state transitions

  _setJobRunning(jobId, progress) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
      job.progress = progress;
      job.startedAt = new Date();
    }
  }

  _setJobCompleted(jobId, result) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
    }
  }

  _setJobFailed(jobId, error) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message;
      job.failedAt = new Date();
    }
  }

  _addExecutionHistory(jobId, execution) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.executionHistory.push(execution);
    }
  }
}

module.exports = new BatchProcessingService();
