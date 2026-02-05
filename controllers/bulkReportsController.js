/**
 * Bulk Reports Controller
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * REST API controller for bulk report generation including:
 * - Bulk report generation endpoint
 * - Job status tracking endpoint
 * - Job cancellation endpoint
 * - User jobs listing endpoint
 */

const BulkReportsService = require('../services/bulkReportsService');

/**
 * Generate multiple reports in bulk
 * POST /api/v1/reports/bulk
 *
 * Request body:
 * {
 *   reports: [
 *     { reportType: 'financial', format: 'pdf', parameters: {...} },
 *     { reportType: 'equity', format: 'csv', parameters: {...} }
 *   ]
 * }
 *
 * Response: 202 Accepted
 * {
 *   success: true,
 *   message: 'Bulk report generation job created',
 *   data: {
 *     jobId: 'JOB-BULK-12345',
 *     status: 'queued',
 *     totalReports: 2,
 *     completedReports: 0,
 *     failedReports: 0,
 *     estimatedCompletionTime: '2026-02-05T10:05:00Z'
 *   }
 * }
 */
const generateBulkReports = async (req, res) => {
  try {
    // Verify authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { reports } = req.body;

    // Validate request body
    if (!reports || !Array.isArray(reports)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: reports array is required'
      });
    }

    if (reports.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one report is required'
      });
    }

    if (reports.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 reports allowed per bulk request'
      });
    }

    // Create bulk job
    const job = await BulkReportsService.createBulkJob({
      reports,
      userId: req.user.userId,
      companyId: req.user.companyId
    });

    // Return 202 Accepted with job details
    res.status(202).json({
      success: true,
      message: 'Bulk report generation job created',
      data: {
        jobId: job.jobId,
        status: job.status,
        totalReports: job.totalReports,
        completedReports: job.completedReports,
        failedReports: job.failedReports,
        estimatedCompletionTime: job.estimatedCompletionTime,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    // Handle validation errors
    if (
      error.message.includes('Missing required field') ||
      error.message.includes('Invalid format') ||
      error.message.includes('Invalid reportType') ||
      error.message.includes('Report ')
    ) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Handle other errors
    console.error('Bulk reports generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get bulk job status
 * GET /api/v1/reports/bulk/:jobId
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     jobId: 'JOB-BULK-12345',
 *     status: 'processing',
 *     totalReports: 5,
 *     completedReports: 3,
 *     failedReports: 1,
 *     progress: 60,
 *     reports: [...],
 *     createdAt: '2026-02-05T10:00:00Z',
 *     startedAt: '2026-02-05T10:00:30Z'
 *   }
 * }
 */
const getBulkJobStatus = async (req, res) => {
  try {
    // Verify authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { jobId } = req.params;

    // Get job status
    const jobStatus = await BulkReportsService.getJobStatus(jobId, req.user.userId);

    res.status(200).json({
      success: true,
      data: jobStatus
    });
  } catch (error) {
    // Handle not found
    if (error.message === 'Job not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    // Handle unauthorized access
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    // Handle other errors
    console.error('Get bulk job status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel a bulk job
 * DELETE /api/v1/reports/bulk/:jobId
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: 'Bulk job cancelled successfully',
 *   data: {
 *     jobId: 'JOB-BULK-12345',
 *     status: 'cancelled',
 *     cancelledAt: '2026-02-05T10:05:00Z'
 *   }
 * }
 */
const cancelBulkJob = async (req, res) => {
  try {
    // Verify authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { jobId } = req.params;

    // Cancel job
    const cancelledJob = await BulkReportsService.cancelJob(jobId, req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Bulk job cancelled successfully',
      data: cancelledJob
    });
  } catch (error) {
    // Handle not found
    if (error.message === 'Job not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    // Handle unauthorized access
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    // Handle cannot cancel errors
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Handle other errors
    console.error('Cancel bulk job error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all bulk jobs for authenticated user
 * GET /api/v1/reports/bulk
 *
 * Query parameters:
 * - status: Filter by job status (queued, processing, completed, failed, cancelled)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: [
 *     {
 *       jobId: 'JOB-BULK-001',
 *       status: 'completed',
 *       totalReports: 3,
 *       completedReports: 3,
 *       failedReports: 0,
 *       createdAt: '2026-02-05T09:00:00Z',
 *       completedAt: '2026-02-05T09:02:00Z'
 *     },
 *     ...
 *   ],
 *   count: 10
 * }
 */
const getUserBulkJobs = async (req, res) => {
  try {
    // Verify authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const filters = {};

    // Apply status filter if provided
    if (req.query.status) {
      filters.status = req.query.status;
    }

    // Get user's jobs
    const jobs = await BulkReportsService.getUserJobs(req.user.userId, filters);

    res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('Get user bulk jobs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  generateBulkReports,
  getBulkJobStatus,
  cancelBulkJob,
  getUserBulkJobs
};
