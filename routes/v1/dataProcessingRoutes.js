/**
 * Data Processing Routes
 * Issue #50: Implement Data Processing Pipeline
 *
 * API routes for ETL pipelines, batch jobs, data quality, and stream processing
 */

const express = require('express');
const router = express.Router();
const dataProcessingController = require('../../controllers/dataProcessingController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

// =====================================
// ETL Pipeline Routes
// =====================================

/**
 * @swagger
 * /api/v1/data-processing/etl/run:
 *   post:
 *     summary: Run an ETL pipeline
 *     tags: [Data Processing - ETL]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - extract
 *               - load
 *             properties:
 *               name:
 *                 type: string
 *               extract:
 *                 type: object
 *               transform:
 *                 type: object
 *               load:
 *                 type: object
 *               dryRun:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Pipeline executed successfully
 *       400:
 *         description: Invalid configuration
 *       500:
 *         description: Pipeline execution failed
 */
router.post('/etl/run', dataProcessingController.runETLPipeline);

/**
 * @swagger
 * /api/v1/data-processing/etl/running:
 *   get:
 *     summary: List all running ETL pipelines
 *     tags: [Data Processing - ETL]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of running pipelines
 */
router.get('/etl/running', dataProcessingController.listRunningPipelines);

/**
 * @swagger
 * /api/v1/data-processing/etl/{pipelineId}/status:
 *   get:
 *     summary: Get ETL pipeline status
 *     tags: [Data Processing - ETL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pipeline status
 *       404:
 *         description: Pipeline not found
 */
router.get('/etl/:pipelineId/status', dataProcessingController.getPipelineStatus);

/**
 * @swagger
 * /api/v1/data-processing/etl/{pipelineId}/cancel:
 *   post:
 *     summary: Cancel a running ETL pipeline
 *     tags: [Data Processing - ETL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pipeline cancelled
 *       400:
 *         description: Cannot cancel pipeline
 */
router.post('/etl/:pipelineId/cancel', dataProcessingController.cancelPipeline);

// =====================================
// Batch Processing Routes
// =====================================

/**
 * @swagger
 * /api/v1/data-processing/batch/schedule:
 *   post:
 *     summary: Schedule a batch processing job
 *     tags: [Data Processing - Batch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - data
 *               - schedule
 *             properties:
 *               name:
 *                 type: string
 *               data:
 *                 type: array
 *               schedule:
 *                 type: object
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *     responses:
 *       201:
 *         description: Job scheduled successfully
 *       400:
 *         description: Invalid job configuration
 */
router.post('/batch/schedule', dataProcessingController.scheduleBatchJob);

/**
 * @swagger
 * /api/v1/data-processing/batch/jobs:
 *   get:
 *     summary: List all batch jobs
 *     tags: [Data Processing - Batch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, running, completed, failed, cancelled]
 *     responses:
 *       200:
 *         description: List of batch jobs
 */
router.get('/batch/jobs', dataProcessingController.listBatchJobs);

/**
 * @swagger
 * /api/v1/data-processing/batch/stats:
 *   get:
 *     summary: Get batch processing queue statistics
 *     tags: [Data Processing - Batch]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics
 */
router.get('/batch/stats', dataProcessingController.getQueueStats);

/**
 * @swagger
 * /api/v1/data-processing/batch/{jobId}/status:
 *   get:
 *     summary: Get batch job status
 *     tags: [Data Processing - Batch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 *       404:
 *         description: Job not found
 */
router.get('/batch/:jobId/status', dataProcessingController.getBatchJobStatus);

/**
 * @swagger
 * /api/v1/data-processing/batch/{jobId}/cancel:
 *   post:
 *     summary: Cancel a batch job
 *     tags: [Data Processing - Batch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelFutureExecutions:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Job cancelled
 *       400:
 *         description: Cannot cancel job
 */
router.post('/batch/:jobId/cancel', dataProcessingController.cancelBatchJob);

/**
 * @swagger
 * /api/v1/data-processing/batch/queue/{action}:
 *   post:
 *     summary: Pause or resume the batch processing queue
 *     tags: [Data Processing - Batch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pause, resume]
 *     responses:
 *       200:
 *         description: Queue action performed
 *       400:
 *         description: Invalid action
 */
router.post('/batch/queue/:action', dataProcessingController.manageQueue);

// =====================================
// Data Quality Routes
// =====================================

/**
 * @swagger
 * /api/v1/data-processing/quality/validate:
 *   post:
 *     summary: Validate data against a schema
 *     tags: [Data Processing - Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - schema
 *             properties:
 *               data:
 *                 type: array
 *               schema:
 *                 type: object
 *     responses:
 *       200:
 *         description: Validation results
 *       400:
 *         description: Invalid input
 */
router.post('/quality/validate', dataProcessingController.validateDataQuality);

/**
 * @swagger
 * /api/v1/data-processing/quality/completeness:
 *   post:
 *     summary: Check data completeness
 *     tags: [Data Processing - Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: array
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Completeness results
 *       400:
 *         description: Invalid input
 */
router.post('/quality/completeness', dataProcessingController.checkCompleteness);

/**
 * @swagger
 * /api/v1/data-processing/quality/anomalies:
 *   post:
 *     summary: Detect anomalies in data
 *     tags: [Data Processing - Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - config
 *             properties:
 *               data:
 *                 type: array
 *               config:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [zscore, iqr, pattern, null_detection, business_rules]
 *                   fields:
 *                     type: array
 *                   threshold:
 *                     type: number
 *     responses:
 *       200:
 *         description: Anomaly detection results
 *       400:
 *         description: Invalid input
 */
router.post('/quality/anomalies', dataProcessingController.detectAnomalies);

/**
 * @swagger
 * /api/v1/data-processing/quality/report:
 *   post:
 *     summary: Generate comprehensive data quality report
 *     tags: [Data Processing - Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: array
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Quality report
 *       400:
 *         description: Invalid input
 */
router.post('/quality/report', dataProcessingController.generateQualityReport);

/**
 * @swagger
 * /api/v1/data-processing/quality/profile:
 *   post:
 *     summary: Profile data to understand its structure and characteristics
 *     tags: [Data Processing - Quality]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: array
 *     responses:
 *       200:
 *         description: Data profile
 *       400:
 *         description: Invalid input
 */
router.post('/quality/profile', dataProcessingController.profileData);

// =====================================
// Stream Processing Routes
// =====================================

/**
 * @swagger
 * /api/v1/data-processing/stream/metrics:
 *   get:
 *     summary: Get stream processing metrics
 *     tags: [Data Processing - Stream]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stream processing metrics
 */
router.get('/stream/metrics', dataProcessingController.getStreamMetrics);

/**
 * @swagger
 * /api/v1/data-processing/stream/dlq:
 *   get:
 *     summary: Get dead letter queue contents
 *     tags: [Data Processing - Stream]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dead letter queue events
 */
router.get('/stream/dlq', dataProcessingController.getDeadLetterQueue);

module.exports = router;
