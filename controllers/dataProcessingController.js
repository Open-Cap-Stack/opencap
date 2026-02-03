/**
 * Data Processing Controller
 * Issue #50: Implement Data Processing Pipeline
 *
 * Handles API endpoints for ETL pipelines, batch jobs, and data quality operations
 */

const etlService = require('../services/etlService');
const dataQualityService = require('../services/dataQualityService');
const batchProcessingService = require('../services/batchProcessingService');
const streamProcessingService = require('../services/streamProcessingService');

/**
 * Run ETL Pipeline
 * POST /api/v1/data-processing/etl/run
 */
const runETLPipeline = async (req, res) => {
  try {
    const pipelineConfig = req.body;

    if (!pipelineConfig.name) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline name is required'
      });
    }

    if (!pipelineConfig.extract || !pipelineConfig.load) {
      return res.status(400).json({
        success: false,
        error: 'Extract and load configurations are required'
      });
    }

    const result = await etlService.runETLPipeline(pipelineConfig);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        details: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Pipeline Status
 * GET /api/v1/data-processing/etl/:pipelineId/status
 */
const getPipelineStatus = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const status = etlService.getPipelineStatus(pipelineId);

    if (status.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel Pipeline
 * POST /api/v1/data-processing/etl/:pipelineId/cancel
 */
const cancelPipeline = async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const result = await etlService.cancelPipeline(pipelineId);

    if (result.cancelled) {
      res.status(200).json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.reason
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * List Running Pipelines
 * GET /api/v1/data-processing/etl/running
 */
const listRunningPipelines = async (req, res) => {
  try {
    const pipelines = etlService.listRunningPipelines();

    res.status(200).json({
      success: true,
      data: pipelines,
      count: pipelines.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Schedule Batch Job
 * POST /api/v1/data-processing/batch/schedule
 */
const scheduleBatchJob = async (req, res) => {
  try {
    const jobConfig = req.body;

    if (!jobConfig.name) {
      return res.status(400).json({
        success: false,
        error: 'Job name is required'
      });
    }

    // Note: processor function cannot be passed via HTTP request
    // In real implementation, this would reference a registered processor
    const job = await batchProcessingService.scheduleJob({
      ...jobConfig,
      processor: async (item) => item // Default passthrough processor
    });

    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Batch Job Status
 * GET /api/v1/data-processing/batch/:jobId/status
 */
const getBatchJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = batchProcessingService.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel Batch Job
 * POST /api/v1/data-processing/batch/:jobId/cancel
 */
const cancelBatchJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { cancelFutureExecutions } = req.body;

    const result = await batchProcessingService.cancelJob(jobId, { cancelFutureExecutions });

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.reason
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * List Batch Jobs
 * GET /api/v1/data-processing/batch/jobs
 */
const listBatchJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const jobs = batchProcessingService.listJobs({ status });

    res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Queue Statistics
 * GET /api/v1/data-processing/batch/stats
 */
const getQueueStats = async (req, res) => {
  try {
    const stats = batchProcessingService.getQueueStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Pause/Resume Queue
 * POST /api/v1/data-processing/batch/queue/:action
 */
const manageQueue = async (req, res) => {
  try {
    const { action } = req.params;

    if (action === 'pause') {
      batchProcessingService.pauseQueue();
    } else if (action === 'resume') {
      batchProcessingService.resumeQueue();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "pause" or "resume"'
      });
    }

    res.status(200).json({
      success: true,
      message: `Queue ${action}d successfully`,
      isPaused: batchProcessingService.isQueuePaused()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate Data Quality
 * POST /api/v1/data-processing/quality/validate
 */
const validateDataQuality = async (req, res) => {
  try {
    const { data, schema } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }

    if (!schema) {
      return res.status(400).json({
        success: false,
        error: 'Schema is required'
      });
    }

    const result = dataQualityService.validateSchema(data, schema);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check Data Completeness
 * POST /api/v1/data-processing/quality/completeness
 */
const checkCompleteness = async (req, res) => {
  try {
    const { data, options } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }

    const result = dataQualityService.checkCompleteness(data, options || {});

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Detect Anomalies
 * POST /api/v1/data-processing/quality/anomalies
 */
const detectAnomalies = async (req, res) => {
  try {
    const { data, config } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }

    if (!config || !config.method) {
      return res.status(400).json({
        success: false,
        error: 'Anomaly detection config with method is required'
      });
    }

    const result = dataQualityService.detectAnomalies(data, config);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Generate Quality Report
 * POST /api/v1/data-processing/quality/report
 */
const generateQualityReport = async (req, res) => {
  try {
    const { data, config } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }

    const report = dataQualityService.generateQualityReport(data, config || {});

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Profile Data
 * POST /api/v1/data-processing/quality/profile
 */
const profileData = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }

    const profile = dataQualityService.profileData(data);

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Stream Processing Metrics
 * GET /api/v1/data-processing/stream/metrics
 */
const getStreamMetrics = async (req, res) => {
  try {
    const metrics = streamProcessingService.getMetrics();

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Dead Letter Queue
 * GET /api/v1/data-processing/stream/dlq
 */
const getDeadLetterQueue = async (req, res) => {
  try {
    const dlq = streamProcessingService.getDeadLetterQueue();

    res.status(200).json({
      success: true,
      data: dlq,
      count: dlq.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  // ETL endpoints
  runETLPipeline,
  getPipelineStatus,
  cancelPipeline,
  listRunningPipelines,

  // Batch processing endpoints
  scheduleBatchJob,
  getBatchJobStatus,
  cancelBatchJob,
  listBatchJobs,
  getQueueStats,
  manageQueue,

  // Data quality endpoints
  validateDataQuality,
  checkCompleteness,
  detectAnomalies,
  generateQualityReport,
  profileData,

  // Stream processing endpoints
  getStreamMetrics,
  getDeadLetterQueue
};
