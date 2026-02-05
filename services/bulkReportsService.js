/**
 * Bulk Reports Service
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Service for managing bulk report generation including:
 * - Bulk job creation and validation
 * - Job status tracking
 * - Report generation orchestration
 * - Job cancellation
 */

const databaseAdapter = require('./databaseAdapter');
const JobQueueService = require('./jobQueueService');
const { v4: uuidv4 } = require('uuid');

/**
 * Valid report types
 */
const VALID_REPORT_TYPES = [
  'financial',
  'equity',
  'compliance',
  'investor',
  'operational',
  'custom'
];

/**
 * Valid output formats
 */
const VALID_FORMATS = ['pdf', 'csv', 'xlsx', 'json'];

/**
 * Average time to generate a report (in seconds)
 */
const AVG_REPORT_GENERATION_TIME = 30;

class BulkReportsService {
  /**
   * Validate a single report configuration
   *
   * @param {Object} report - Report configuration
   * @throws {Error} If validation fails
   * @private
   */
  static _validateReport(report) {
    if (!report.reportType) {
      throw new Error('Missing required field: reportType');
    }

    if (!report.format) {
      throw new Error('Missing required field: format');
    }

    if (!VALID_REPORT_TYPES.includes(report.reportType)) {
      throw new Error(`Invalid reportType: ${report.reportType}. Allowed types: ${VALID_REPORT_TYPES.join(', ')}`);
    }

    if (!VALID_FORMATS.includes(report.format)) {
      throw new Error(`Invalid format: ${report.format}. Allowed formats: ${VALID_FORMATS.join(', ')}`);
    }
  }

  /**
   * Calculate estimated completion time based on report count
   *
   * @param {number} reportCount - Number of reports
   * @returns {Date} Estimated completion time
   * @private
   */
  static _calculateEstimatedCompletion(reportCount) {
    const estimatedSeconds = reportCount * AVG_REPORT_GENERATION_TIME;
    return new Date(Date.now() + estimatedSeconds * 1000);
  }

  /**
   * Create a bulk report generation job
   *
   * @param {Object} jobData - Job data
   * @param {Array} jobData.reports - Array of report configurations
   * @param {string} jobData.userId - User ID
   * @param {string} jobData.companyId - Company ID
   * @returns {Object} Created job
   */
  static async createBulkJob(jobData) {
    // Validate required fields
    if (!jobData.reports) {
      throw new Error('Missing required field: reports');
    }

    if (!Array.isArray(jobData.reports)) {
      throw new Error('Reports must be an array');
    }

    if (jobData.reports.length === 0) {
      throw new Error('At least one report is required');
    }

    if (jobData.reports.length > 50) {
      throw new Error('Maximum 50 reports allowed per bulk job');
    }

    // Validate each report configuration
    for (let i = 0; i < jobData.reports.length; i++) {
      try {
        this._validateReport(jobData.reports[i]);
      } catch (error) {
        throw new Error(`Report ${i + 1}: ${error.message}`);
      }
    }

    // Create job record
    const jobId = `JOB-BULK-${uuidv4().slice(0, 8).toUpperCase()}`;

    const job = {
      jobId,
      userId: jobData.userId,
      companyId: jobData.companyId,
      status: 'queued',
      totalReports: jobData.reports.length,
      completedReports: 0,
      failedReports: 0,
      cancelledReports: 0,
      reports: jobData.reports.map(report => ({
        ...report,
        status: 'pending',
        reportId: null,
        error: null,
        startedAt: null,
        completedAt: null
      })),
      createdAt: new Date(),
      estimatedCompletionTime: this._calculateEstimatedCompletion(jobData.reports.length)
    };

    // Save to database
    const createdJob = await databaseAdapter.create('BulkReportJob', job);

    // Enqueue for processing
    await JobQueueService.enqueueJob({
      jobId,
      type: 'bulk-report',
      payload: {
        reports: jobData.reports,
        userId: jobData.userId,
        companyId: jobData.companyId
      }
    });

    return createdJob;
  }

  /**
   * Get job status
   *
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Job status with progress
   */
  static async getJobStatus(jobId, userId) {
    const job = await databaseAdapter.findOne('BulkReportJob', { jobId });

    if (!job) {
      throw new Error('Job not found');
    }

    // Verify user has access to this job
    if (job.userId !== userId) {
      throw new Error('Unauthorized access to job');
    }

    // Calculate progress percentage
    const progress = job.totalReports > 0
      ? Math.round((job.completedReports / job.totalReports) * 100)
      : 0;

    return {
      ...job,
      progress
    };
  }

  /**
   * Cancel a bulk job
   *
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Cancelled job
   */
  static async cancelJob(jobId, userId) {
    const job = await databaseAdapter.findOne('BulkReportJob', { jobId });

    if (!job) {
      throw new Error('Job not found');
    }

    // Verify user has access to this job
    if (job.userId !== userId) {
      throw new Error('Unauthorized access to job');
    }

    // Check if job can be cancelled
    if (job.status === 'completed') {
      throw new Error('Cannot cancel a completed job');
    }

    if (job.status === 'cancelled') {
      throw new Error('Cannot cancel a cancelled job');
    }

    if (job.status === 'failed') {
      throw new Error('Cannot cancel a failed job');
    }

    // Cancel in queue
    await JobQueueService.cancelJob(jobId);

    // Count pending/processing reports that will be cancelled
    const cancelledReports = job.reports
      ? job.reports.filter(r => r.status === 'pending' || r.status === 'processing').length
      : 0;

    // Update job status
    const updatedJob = await databaseAdapter.findByIdAndUpdate(
      'BulkReportJob',
      jobId,
      {
        status: 'cancelled',
        cancelledReports,
        cancelledAt: new Date()
      },
      { new: true }
    );

    return updatedJob;
  }

  /**
   * Get all jobs for a user
   *
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (status, etc.)
   * @returns {Array} User's jobs
   */
  static async getUserJobs(userId, filters = {}) {
    const query = { userId };

    if (filters.status) {
      query.status = filters.status;
    }

    return await databaseAdapter.find('BulkReportJob', query, {
      sort: { createdAt: -1 }
    });
  }

  /**
   * Process a bulk job (generate all reports)
   * Called by JobQueueService
   *
   * @param {string} jobId - Job ID
   * @returns {Object} Processing result
   */
  static async processJob(jobId) {
    const job = await databaseAdapter.findOne('BulkReportJob', { jobId });

    if (!job) {
      throw new Error('Job not found');
    }

    // Update job status to processing
    await databaseAdapter.findByIdAndUpdate(
      'BulkReportJob',
      jobId,
      {
        status: 'processing',
        startedAt: new Date()
      },
      { new: true }
    );

    let completedCount = 0;
    let failedCount = 0;

    // Process each report sequentially
    for (let i = 0; i < job.reports.length; i++) {
      const report = job.reports[i];

      // Check if job was cancelled
      const currentJob = await databaseAdapter.findOne('BulkReportJob', { jobId });
      if (currentJob.status === 'cancelled') {
        break;
      }

      try {
        // Update report status to processing
        job.reports[i].status = 'processing';
        job.reports[i].startedAt = new Date();

        await databaseAdapter.findByIdAndUpdate(
          'BulkReportJob',
          jobId,
          { reports: job.reports },
          { new: true }
        );

        // Generate the report
        const reportId = await this._generateReport(
          report.reportType,
          report.format,
          report.parameters || {},
          job.userId,
          job.companyId
        );

        // Update report status to completed
        job.reports[i].status = 'completed';
        job.reports[i].reportId = reportId;
        job.reports[i].completedAt = new Date();
        job.reports[i].downloadUrl = `/api/v1/reports/${reportId}`;

        completedCount++;
      } catch (error) {
        console.error(`Failed to generate report ${i + 1}:`, error);

        // Update report status to failed
        job.reports[i].status = 'failed';
        job.reports[i].error = error.message;
        job.reports[i].completedAt = new Date();

        failedCount++;
      }

      // Update progress
      await databaseAdapter.findByIdAndUpdate(
        'BulkReportJob',
        jobId,
        {
          reports: job.reports,
          completedReports: completedCount,
          failedReports: failedCount
        },
        { new: true }
      );
    }

    // Update final job status
    const finalStatus = failedCount === job.reports.length ? 'failed' : 'completed';

    await databaseAdapter.findByIdAndUpdate(
      'BulkReportJob',
      jobId,
      {
        status: finalStatus,
        completedReports: completedCount,
        failedReports: failedCount,
        completedAt: new Date()
      },
      { new: true }
    );

    return {
      jobId,
      status: finalStatus,
      completedReports: completedCount,
      failedReports: failedCount
    };
  }

  /**
   * Generate a single report
   * This is a placeholder - integrate with your actual report generation logic
   *
   * @param {string} reportType - Report type
   * @param {string} format - Output format
   * @param {Object} parameters - Report parameters
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID
   * @returns {string} Generated report ID
   * @private
   */
  static async _generateReport(reportType, format, parameters, userId, companyId) {
    // Simulate report generation with a delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, this would call the actual report generation service
    // For now, create a placeholder report record
    const reportId = `RPT-${uuidv4().slice(0, 8).toUpperCase()}`;

    await databaseAdapter.create('GeneratedReport', {
      reportId,
      reportType,
      format,
      parameters,
      userId,
      companyId,
      status: 'completed',
      generatedAt: new Date(),
      fileSize: Math.floor(Math.random() * 1000000) + 50000, // Random size
      fileName: `${reportType}-report-${Date.now()}.${format}`
    });

    return reportId;
  }

  /**
   * Get valid report types
   *
   * @returns {Array} List of valid report types
   */
  static getValidReportTypes() {
    return [...VALID_REPORT_TYPES];
  }

  /**
   * Get valid formats
   *
   * @returns {Array} List of valid formats
   */
  static getValidFormats() {
    return [...VALID_FORMATS];
  }
}

module.exports = BulkReportsService;
