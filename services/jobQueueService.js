/**
 * Job Queue Service
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Simple in-memory job queue service for managing asynchronous tasks.
 * For production use, consider replacing with Redis-based queue (Bull, BullMQ)
 * or cloud-based solutions (AWS SQS, Azure Queue Storage).
 */

const { v4: uuidv4 } = require('uuid');
const BulkReportsService = require('./bulkReportsService');

/**
 * In-memory job queue
 * Key: jobId, Value: job object
 */
const jobQueue = new Map();

/**
 * Job processing state
 */
const processingJobs = new Set();

class JobQueueService {
  /**
   * Enqueue a job for asynchronous processing
   *
   * @param {Object} jobData - Job data
   * @param {string} jobData.jobId - Unique job ID
   * @param {string} jobData.type - Job type (e.g., 'bulk-report')
   * @param {Object} jobData.payload - Job payload
   * @returns {Object} Queue result with queueId and status
   */
  static async enqueueJob(jobData) {
    const queueId = `QUEUE-${uuidv4().slice(0, 8).toUpperCase()}`;

    const job = {
      queueId,
      jobId: jobData.jobId,
      type: jobData.type,
      payload: jobData.payload,
      status: 'queued',
      enqueuedAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    jobQueue.set(jobData.jobId, job);

    // Start processing asynchronously (non-blocking)
    setImmediate(() => {
      this.processNextJob(jobData.jobId).catch(error => {
        console.error(`Job processing failed for ${jobData.jobId}:`, error);
      });
    });

    return {
      queueId,
      status: 'queued',
      enqueuedAt: job.enqueuedAt
    };
  }

  /**
   * Process the next job in the queue
   *
   * @param {string} jobId - Job ID to process
   * @private
   */
  static async processNextJob(jobId) {
    const job = jobQueue.get(jobId);

    if (!job || job.status === 'cancelled') {
      return;
    }

    if (processingJobs.has(jobId)) {
      return; // Already processing
    }

    processingJobs.add(jobId);
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      // Process based on job type
      switch (job.type) {
        case 'bulk-report':
          await BulkReportsService.processJob(job.jobId);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      job.retryCount++;
      job.lastError = error.message;

      if (job.retryCount < job.maxRetries) {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, job.retryCount) * 1000; // 2s, 4s, 8s
        job.status = 'queued';

        setTimeout(() => {
          processingJobs.delete(jobId);
          this.processNextJob(jobId).catch(err => {
            console.error(`Retry failed for ${jobId}:`, err);
          });
        }, retryDelay);
      } else {
        job.status = 'failed';
        job.failedAt = new Date();
      }
    } finally {
      if (job.status === 'completed' || job.status === 'failed') {
        processingJobs.delete(jobId);

        // Auto-cleanup completed/failed jobs after 1 hour
        setTimeout(() => {
          jobQueue.delete(jobId);
        }, 60 * 60 * 1000);
      }
    }
  }

  /**
   * Cancel a queued or processing job
   *
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} True if cancelled, false if not found
   */
  static async cancelJob(jobId) {
    const job = jobQueue.get(jobId);

    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false; // Cannot cancel completed/failed jobs
    }

    job.status = 'cancelled';
    job.cancelledAt = new Date();
    processingJobs.delete(jobId);

    return true;
  }

  /**
   * Get job status from queue
   *
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job object or null if not found
   */
  static getJob(jobId) {
    return jobQueue.get(jobId) || null;
  }

  /**
   * Get queue statistics
   *
   * @returns {Object} Queue status with counts
   */
  static getQueueStatus() {
    const jobs = Array.from(jobQueue.values());

    return {
      totalJobs: jobs.length,
      queuedJobs: jobs.filter(j => j.status === 'queued').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      cancelledJobs: jobs.filter(j => j.status === 'cancelled').length
    };
  }

  /**
   * Clear all jobs from queue (for testing)
   */
  static clearQueue() {
    jobQueue.clear();
    processingJobs.clear();
  }

  /**
   * Get all jobs (for admin/debugging)
   *
   * @param {Object} filters - Optional filters
   * @returns {Array} List of jobs
   */
  static getAllJobs(filters = {}) {
    let jobs = Array.from(jobQueue.values());

    if (filters.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }

    if (filters.type) {
      jobs = jobs.filter(j => j.type === filters.type);
    }

    return jobs.sort((a, b) => b.enqueuedAt - a.enqueuedAt);
  }
}

module.exports = JobQueueService;
