/**
 * Data Processing Controller Unit Tests
 * Issue #50: Implement Data Processing Pipeline
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.NODE_ENV = 'test';

const dataProcessingController = require('../../../controllers/dataProcessingController');

// Mock services
jest.mock('../../../services/etlService', () => ({
  runETLPipeline: jest.fn(),
  getPipelineStatus: jest.fn(),
  cancelPipeline: jest.fn(),
  listRunningPipelines: jest.fn()
}));

jest.mock('../../../services/dataQualityService', () => ({
  validateSchema: jest.fn(),
  checkCompleteness: jest.fn(),
  detectAnomalies: jest.fn(),
  generateQualityReport: jest.fn(),
  profileData: jest.fn()
}));

jest.mock('../../../services/batchProcessingService', () => ({
  scheduleJob: jest.fn(),
  getJobStatus: jest.fn(),
  cancelJob: jest.fn(),
  listJobs: jest.fn(),
  getQueueStats: jest.fn(),
  pauseQueue: jest.fn(),
  resumeQueue: jest.fn(),
  isQueuePaused: jest.fn()
}));

jest.mock('../../../services/streamProcessingService', () => ({
  getMetrics: jest.fn(),
  getDeadLetterQueue: jest.fn()
}));

const etlService = require('../../../services/etlService');
const dataQualityService = require('../../../services/dataQualityService');
const batchProcessingService = require('../../../services/batchProcessingService');
const streamProcessingService = require('../../../services/streamProcessingService');

describe('DataProcessingController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('ETL Pipeline Endpoints', () => {
    describe('runETLPipeline', () => {
      it('should run ETL pipeline successfully', async () => {
        const pipelineResult = {
          success: true,
          pipelineName: 'test-pipeline',
          extractedRecords: 100,
          transformedRecords: 95,
          loadedRecords: 95
        };

        etlService.runETLPipeline.mockResolvedValue(pipelineResult);

        mockReq.body = {
          name: 'test-pipeline',
          extract: { source: 'zerodb', collection: 'data' },
          transform: { operations: [] },
          load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
        };

        await dataProcessingController.runETLPipeline(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: pipelineResult
        });
      });

      it('should return 400 if pipeline name is missing', async () => {
        mockReq.body = {
          extract: { source: 'zerodb', collection: 'data' },
          load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
        };

        await dataProcessingController.runETLPipeline(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Pipeline name is required'
        });
      });

      it('should return 400 if extract/load config is missing', async () => {
        mockReq.body = { name: 'test-pipeline' };

        await dataProcessingController.runETLPipeline(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Extract and load configurations are required'
        });
      });

      it('should handle pipeline failure', async () => {
        const pipelineResult = {
          success: false,
          error: 'Extraction failed'
        };

        etlService.runETLPipeline.mockResolvedValue(pipelineResult);

        mockReq.body = {
          name: 'test-pipeline',
          extract: { source: 'zerodb', collection: 'data' },
          load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
        };

        await dataProcessingController.runETLPipeline(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });

    describe('getPipelineStatus', () => {
      it('should return pipeline status', async () => {
        const status = {
          pipelineId: 'pipeline-123',
          status: 'completed',
          stages: {}
        };

        etlService.getPipelineStatus.mockReturnValue(status);
        mockReq.params = { pipelineId: 'pipeline-123' };

        await dataProcessingController.getPipelineStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: status
        });
      });

      it('should return 404 for non-existent pipeline', async () => {
        etlService.getPipelineStatus.mockReturnValue({ status: 'not_found' });
        mockReq.params = { pipelineId: 'non-existent' };

        await dataProcessingController.getPipelineStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('cancelPipeline', () => {
      it('should cancel pipeline successfully', async () => {
        etlService.cancelPipeline.mockResolvedValue({ cancelled: true, pipelineId: 'pipeline-123' });
        mockReq.params = { pipelineId: 'pipeline-123' };

        await dataProcessingController.cancelPipeline(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should handle cancel failure', async () => {
        etlService.cancelPipeline.mockResolvedValue({ cancelled: false, reason: 'Not found' });
        mockReq.params = { pipelineId: 'non-existent' };

        await dataProcessingController.cancelPipeline(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('listRunningPipelines', () => {
      it('should list running pipelines', async () => {
        const pipelines = [
          { pipelineId: 'p1', status: 'running' },
          { pipelineId: 'p2', status: 'running' }
        ];

        etlService.listRunningPipelines.mockReturnValue(pipelines);

        await dataProcessingController.listRunningPipelines(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: pipelines,
          count: 2
        });
      });
    });
  });

  describe('Batch Processing Endpoints', () => {
    describe('scheduleBatchJob', () => {
      it('should schedule a batch job', async () => {
        const job = {
          jobId: 'job-123',
          name: 'test-job',
          status: 'scheduled'
        };

        batchProcessingService.scheduleJob.mockResolvedValue(job);

        mockReq.body = {
          name: 'test-job',
          data: [{ id: '1' }],
          schedule: { type: 'immediate' }
        };

        await dataProcessingController.scheduleBatchJob(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: job
        });
      });

      it('should return 400 if job name is missing', async () => {
        mockReq.body = { data: [{ id: '1' }] };

        await dataProcessingController.scheduleBatchJob(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('getBatchJobStatus', () => {
      it('should return job status', async () => {
        const status = {
          jobId: 'job-123',
          status: 'completed'
        };

        batchProcessingService.getJobStatus.mockReturnValue(status);
        mockReq.params = { jobId: 'job-123' };

        await dataProcessingController.getBatchJobStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 404 for non-existent job', async () => {
        batchProcessingService.getJobStatus.mockReturnValue(null);
        mockReq.params = { jobId: 'non-existent' };

        await dataProcessingController.getBatchJobStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('cancelBatchJob', () => {
      it('should cancel job successfully', async () => {
        batchProcessingService.cancelJob.mockResolvedValue({ success: true, jobId: 'job-123' });
        mockReq.params = { jobId: 'job-123' };
        mockReq.body = {};

        await dataProcessingController.cancelBatchJob(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should handle cancel failure', async () => {
        batchProcessingService.cancelJob.mockResolvedValue({ success: false, reason: 'Not found' });
        mockReq.params = { jobId: 'non-existent' };
        mockReq.body = {};

        await dataProcessingController.cancelBatchJob(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('listBatchJobs', () => {
      it('should list all jobs', async () => {
        const jobs = [
          { jobId: 'j1', status: 'scheduled' },
          { jobId: 'j2', status: 'completed' }
        ];

        batchProcessingService.listJobs.mockReturnValue(jobs);

        await dataProcessingController.listBatchJobs(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: jobs,
          count: 2
        });
      });

      it('should filter jobs by status', async () => {
        const jobs = [{ jobId: 'j1', status: 'completed' }];

        batchProcessingService.listJobs.mockReturnValue(jobs);
        mockReq.query = { status: 'completed' };

        await dataProcessingController.listBatchJobs(mockReq, mockRes);

        expect(batchProcessingService.listJobs).toHaveBeenCalledWith({ status: 'completed' });
      });
    });

    describe('getQueueStats', () => {
      it('should return queue statistics', async () => {
        const stats = {
          totalJobs: 10,
          scheduledJobs: 3,
          runningJobs: 2,
          completedJobs: 5
        };

        batchProcessingService.getQueueStats.mockReturnValue(stats);

        await dataProcessingController.getQueueStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: stats
        });
      });
    });

    describe('manageQueue', () => {
      it('should pause queue', async () => {
        batchProcessingService.isQueuePaused.mockReturnValue(true);
        mockReq.params = { action: 'pause' };

        await dataProcessingController.manageQueue(mockReq, mockRes);

        expect(batchProcessingService.pauseQueue).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should resume queue', async () => {
        batchProcessingService.isQueuePaused.mockReturnValue(false);
        mockReq.params = { action: 'resume' };

        await dataProcessingController.manageQueue(mockReq, mockRes);

        expect(batchProcessingService.resumeQueue).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 400 for invalid action', async () => {
        mockReq.params = { action: 'invalid' };

        await dataProcessingController.manageQueue(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('Data Quality Endpoints', () => {
    describe('validateDataQuality', () => {
      it('should validate data against schema', async () => {
        const result = {
          valid: true,
          errors: [],
          validRecords: 10,
          invalidRecords: 0
        };

        dataQualityService.validateSchema.mockReturnValue(result);

        mockReq.body = {
          data: [{ id: '1', name: 'Test' }],
          schema: { fields: [{ name: 'id', type: 'string' }] }
        };

        await dataProcessingController.validateDataQuality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: result
        });
      });

      it('should return 400 if data is missing', async () => {
        mockReq.body = { schema: {} };

        await dataProcessingController.validateDataQuality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 if schema is missing', async () => {
        mockReq.body = { data: [{ id: '1' }] };

        await dataProcessingController.validateDataQuality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('checkCompleteness', () => {
      it('should check data completeness', async () => {
        const result = {
          overallCompleteness: 0.95,
          fieldCompleteness: { id: 1, name: 0.9 }
        };

        dataQualityService.checkCompleteness.mockReturnValue(result);

        mockReq.body = {
          data: [{ id: '1', name: 'Test' }],
          options: {}
        };

        await dataProcessingController.checkCompleteness(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 400 if data is missing', async () => {
        mockReq.body = {};

        await dataProcessingController.checkCompleteness(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('detectAnomalies', () => {
      it('should detect anomalies', async () => {
        const result = {
          anomalies: [],
          statistics: { totalRecords: 10, anomalyCount: 0 }
        };

        dataQualityService.detectAnomalies.mockReturnValue(result);

        mockReq.body = {
          data: [{ id: '1', value: 100 }],
          config: { method: 'zscore', fields: ['value'] }
        };

        await dataProcessingController.detectAnomalies(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 400 if config is missing', async () => {
        mockReq.body = { data: [{ id: '1' }] };

        await dataProcessingController.detectAnomalies(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('generateQualityReport', () => {
      it('should generate quality report', async () => {
        const report = {
          summary: { overallScore: 85 },
          recommendations: []
        };

        dataQualityService.generateQualityReport.mockReturnValue(report);

        mockReq.body = {
          data: [{ id: '1', name: 'Test' }],
          config: {}
        };

        await dataProcessingController.generateQualityReport(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: report
        });
      });
    });

    describe('profileData', () => {
      it('should profile data', async () => {
        const profile = {
          recordCount: 10,
          fieldCount: 3,
          fields: {}
        };

        dataQualityService.profileData.mockReturnValue(profile);

        mockReq.body = {
          data: [{ id: '1', name: 'Test', value: 100 }]
        };

        await dataProcessingController.profileData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe('Stream Processing Endpoints', () => {
    describe('getStreamMetrics', () => {
      it('should return stream metrics', async () => {
        const metrics = {
          eventsProcessed: 1000,
          processingTime: 5.5
        };

        streamProcessingService.getMetrics.mockReturnValue(metrics);

        await dataProcessingController.getStreamMetrics(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: metrics
        });
      });
    });

    describe('getDeadLetterQueue', () => {
      it('should return dead letter queue contents', async () => {
        const dlq = [
          { event: { id: '1' }, error: 'Processing failed' }
        ];

        streamProcessingService.getDeadLetterQueue.mockReturnValue(dlq);

        await dataProcessingController.getDeadLetterQueue(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: dlq,
          count: 1
        });
      });
    });
  });
});
