/**
 * Bulk Reports Controller Tests
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Test suite for bulk report generation functionality including:
 * - Bulk report generation
 * - Queue handling
 * - Authentication
 * - Validation
 * - Error handling
 */

const httpMocks = require('node-mocks-http');
const bulkReportsController = require('../../../controllers/bulkReportsController');
const BulkReportsService = require('../../../services/bulkReportsService');

// Mock the BulkReportsService
jest.mock('../../../services/bulkReportsService');

describe('BulkReportsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/reports/bulk - generateBulkReports', () => {
    describe('when bulk generation is successful', () => {
      it('should create a bulk job and return job details with 202 status', async () => {
        // Arrange
        const mockJobResult = {
          jobId: 'JOB-BULK-12345',
          status: 'queued',
          totalReports: 3,
          completedReports: 0,
          failedReports: 0,
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'pending' },
            { reportType: 'equity', format: 'csv', status: 'pending' },
            { reportType: 'compliance', format: 'xlsx', status: 'pending' }
          ],
          createdAt: new Date('2026-02-05T10:00:00Z'),
          estimatedCompletionTime: new Date('2026-02-05T10:05:00Z')
        };

        BulkReportsService.createBulkJob.mockResolvedValue(mockJobResult);

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: [
              { reportType: 'financial', format: 'pdf', parameters: { year: 2025 } },
              { reportType: 'equity', format: 'csv', parameters: { asOf: '2025-12-31' } },
              { reportType: 'compliance', format: 'xlsx', parameters: { quarter: 'Q4' } }
            ]
          },
          user: {
            userId: 'user-123',
            email: 'test@example.com',
            role: 'admin',
            companyId: 'company-123'
          }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(BulkReportsService.createBulkJob).toHaveBeenCalledWith({
          reports: [
            { reportType: 'financial', format: 'pdf', parameters: { year: 2025 } },
            { reportType: 'equity', format: 'csv', parameters: { asOf: '2025-12-31' } },
            { reportType: 'compliance', format: 'xlsx', parameters: { quarter: 'Q4' } }
          ],
          userId: 'user-123',
          companyId: 'company-123'
        });

        expect(res.statusCode).toBe(202);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.message).toBe('Bulk report generation job created');
        expect(data.data.jobId).toBe('JOB-BULK-12345');
        expect(data.data.totalReports).toBe(3);
        expect(data.data.status).toBe('queued');
      });

      it('should handle single report in bulk request', async () => {
        // Arrange
        const mockJobResult = {
          jobId: 'JOB-BULK-67890',
          status: 'queued',
          totalReports: 1,
          completedReports: 0,
          failedReports: 0,
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'pending' }
          ],
          createdAt: new Date(),
          estimatedCompletionTime: new Date()
        };

        BulkReportsService.createBulkJob.mockResolvedValue(mockJobResult);

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: [
              { reportType: 'financial', format: 'pdf' }
            ]
          },
          user: {
            userId: 'user-123',
            companyId: 'company-123'
          }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(202);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.data.totalReports).toBe(1);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 when reports array is missing', async () => {
        // Arrange
        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {},
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(400);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('reports array is required');
      });

      it('should return 400 when reports array is empty', async () => {
        // Arrange
        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: []
          },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(400);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('At least one report is required');
      });

      it('should return 400 when reports array exceeds maximum limit', async () => {
        // Arrange
        const tooManyReports = Array(51).fill({ reportType: 'financial', format: 'pdf' });

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: tooManyReports
          },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(400);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Maximum 50 reports allowed');
      });

      it('should return 400 when report is missing required fields', async () => {
        // Arrange
        BulkReportsService.createBulkJob.mockRejectedValue(
          new Error('Missing required field: reportType')
        );

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: [
              { format: 'pdf' } // Missing reportType
            ]
          },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(400);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Missing required field');
      });

      it('should return 400 when report has invalid format', async () => {
        // Arrange
        BulkReportsService.createBulkJob.mockRejectedValue(
          new Error('Invalid format: txt. Allowed formats: pdf, csv, xlsx, json')
        );

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: [
              { reportType: 'financial', format: 'txt' }
            ]
          },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(400);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid format');
      });
    });

    describe('when authentication fails', () => {
      it('should return 401 when user is not authenticated', async () => {
        // Arrange
        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: [
              { reportType: 'financial', format: 'pdf' }
            ]
          }
          // No user object
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(401);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Authentication required');
      });
    });

    describe('when service errors occur', () => {
      it('should return 500 when service throws unexpected error', async () => {
        // Arrange
        BulkReportsService.createBulkJob.mockRejectedValue(
          new Error('Database connection failed')
        );

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: {
            reports: [
              { reportType: 'financial', format: 'pdf' }
            ]
          },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.generateBulkReports(req, res);

        // Assert
        expect(res.statusCode).toBe(500);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Database connection failed');
      });
    });
  });

  describe('GET /api/v1/reports/bulk/:jobId - getBulkJobStatus', () => {
    describe('when job exists', () => {
      it('should return job status with 200', async () => {
        // Arrange
        const mockJobStatus = {
          jobId: 'JOB-BULK-12345',
          status: 'processing',
          totalReports: 5,
          completedReports: 3,
          failedReports: 1,
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'completed', reportId: 'RPT-001' },
            { reportType: 'equity', format: 'csv', status: 'completed', reportId: 'RPT-002' },
            { reportType: 'compliance', format: 'xlsx', status: 'completed', reportId: 'RPT-003' },
            { reportType: 'investor', format: 'pdf', status: 'failed', error: 'Data not found' },
            { reportType: 'operational', format: 'json', status: 'pending' }
          ],
          createdAt: new Date('2026-02-05T10:00:00Z'),
          startedAt: new Date('2026-02-05T10:00:30Z'),
          progress: 60
        };

        BulkReportsService.getJobStatus.mockResolvedValue(mockJobStatus);

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk/JOB-BULK-12345',
          params: { jobId: 'JOB-BULK-12345' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getBulkJobStatus(req, res);

        // Assert
        expect(BulkReportsService.getJobStatus).toHaveBeenCalledWith('JOB-BULK-12345', 'user-123');
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.data.jobId).toBe('JOB-BULK-12345');
        expect(data.data.status).toBe('processing');
        expect(data.data.progress).toBe(60);
        expect(data.data.completedReports).toBe(3);
        expect(data.data.failedReports).toBe(1);
      });

      it('should return completed job with all reports', async () => {
        // Arrange
        const mockJobStatus = {
          jobId: 'JOB-BULK-67890',
          status: 'completed',
          totalReports: 2,
          completedReports: 2,
          failedReports: 0,
          reports: [
            { reportType: 'financial', format: 'pdf', status: 'completed', reportId: 'RPT-001', downloadUrl: '/reports/RPT-001' },
            { reportType: 'equity', format: 'csv', status: 'completed', reportId: 'RPT-002', downloadUrl: '/reports/RPT-002' }
          ],
          createdAt: new Date('2026-02-05T10:00:00Z'),
          completedAt: new Date('2026-02-05T10:02:00Z'),
          progress: 100
        };

        BulkReportsService.getJobStatus.mockResolvedValue(mockJobStatus);

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk/JOB-BULK-67890',
          params: { jobId: 'JOB-BULK-67890' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getBulkJobStatus(req, res);

        // Assert
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('completed');
        expect(data.data.progress).toBe(100);
        expect(data.data.reports).toHaveLength(2);
        expect(data.data.reports[0].downloadUrl).toBeDefined();
      });
    });

    describe('when job does not exist', () => {
      it('should return 404 when job is not found', async () => {
        // Arrange
        BulkReportsService.getJobStatus.mockRejectedValue(
          new Error('Job not found')
        );

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk/INVALID-JOB',
          params: { jobId: 'INVALID-JOB' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getBulkJobStatus(req, res);

        // Assert
        expect(res.statusCode).toBe(404);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Job not found');
      });
    });

    describe('when authorization fails', () => {
      it('should return 403 when user tries to access another user job', async () => {
        // Arrange
        BulkReportsService.getJobStatus.mockRejectedValue(
          new Error('Unauthorized access to job')
        );

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk/JOB-BULK-12345',
          params: { jobId: 'JOB-BULK-12345' },
          user: { userId: 'different-user', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getBulkJobStatus(req, res);

        // Assert
        expect(res.statusCode).toBe(403);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Unauthorized');
      });
    });
  });

  describe('DELETE /api/v1/reports/bulk/:jobId - cancelBulkJob', () => {
    describe('when cancellation is successful', () => {
      it('should cancel a queued job and return 200', async () => {
        // Arrange
        const mockCancelledJob = {
          jobId: 'JOB-BULK-12345',
          status: 'cancelled',
          totalReports: 5,
          completedReports: 0,
          failedReports: 0,
          cancelledAt: new Date()
        };

        BulkReportsService.cancelJob.mockResolvedValue(mockCancelledJob);

        const req = httpMocks.createRequest({
          method: 'DELETE',
          url: '/api/v1/reports/bulk/JOB-BULK-12345',
          params: { jobId: 'JOB-BULK-12345' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.cancelBulkJob(req, res);

        // Assert
        expect(BulkReportsService.cancelJob).toHaveBeenCalledWith('JOB-BULK-12345', 'user-123');
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.message).toBe('Bulk job cancelled successfully');
        expect(data.data.status).toBe('cancelled');
      });

      it('should cancel a processing job and stop remaining reports', async () => {
        // Arrange
        const mockCancelledJob = {
          jobId: 'JOB-BULK-67890',
          status: 'cancelled',
          totalReports: 5,
          completedReports: 2,
          failedReports: 0,
          cancelledReports: 3,
          cancelledAt: new Date()
        };

        BulkReportsService.cancelJob.mockResolvedValue(mockCancelledJob);

        const req = httpMocks.createRequest({
          method: 'DELETE',
          url: '/api/v1/reports/bulk/JOB-BULK-67890',
          params: { jobId: 'JOB-BULK-67890' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.cancelBulkJob(req, res);

        // Assert
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.data.completedReports).toBe(2);
        expect(data.data.cancelledReports).toBe(3);
      });
    });

    describe('when cancellation fails', () => {
      it('should return 400 when job is already completed', async () => {
        // Arrange
        BulkReportsService.cancelJob.mockRejectedValue(
          new Error('Cannot cancel a completed job')
        );

        const req = httpMocks.createRequest({
          method: 'DELETE',
          url: '/api/v1/reports/bulk/JOB-BULK-12345',
          params: { jobId: 'JOB-BULK-12345' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.cancelBulkJob(req, res);

        // Assert
        expect(res.statusCode).toBe(400);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Cannot cancel');
      });

      it('should return 404 when job does not exist', async () => {
        // Arrange
        BulkReportsService.cancelJob.mockRejectedValue(
          new Error('Job not found')
        );

        const req = httpMocks.createRequest({
          method: 'DELETE',
          url: '/api/v1/reports/bulk/INVALID-JOB',
          params: { jobId: 'INVALID-JOB' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.cancelBulkJob(req, res);

        // Assert
        expect(res.statusCode).toBe(404);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Job not found');
      });
    });
  });

  describe('GET /api/v1/reports/bulk - getUserBulkJobs', () => {
    describe('when jobs exist for user', () => {
      it('should return list of user jobs with 200', async () => {
        // Arrange
        const mockJobs = [
          {
            jobId: 'JOB-BULK-001',
            status: 'completed',
            totalReports: 3,
            completedReports: 3,
            failedReports: 0,
            createdAt: new Date('2026-02-05T09:00:00Z'),
            completedAt: new Date('2026-02-05T09:02:00Z')
          },
          {
            jobId: 'JOB-BULK-002',
            status: 'processing',
            totalReports: 5,
            completedReports: 2,
            failedReports: 0,
            createdAt: new Date('2026-02-05T10:00:00Z')
          },
          {
            jobId: 'JOB-BULK-003',
            status: 'queued',
            totalReports: 2,
            completedReports: 0,
            failedReports: 0,
            createdAt: new Date('2026-02-05T10:30:00Z')
          }
        ];

        BulkReportsService.getUserJobs.mockResolvedValue(mockJobs);

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk',
          query: {},
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getUserBulkJobs(req, res);

        // Assert
        expect(BulkReportsService.getUserJobs).toHaveBeenCalledWith('user-123', {});
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(3);
        expect(data.count).toBe(3);
      });

      it('should filter jobs by status when provided', async () => {
        // Arrange
        const mockJobs = [
          {
            jobId: 'JOB-BULK-001',
            status: 'completed',
            totalReports: 3,
            completedReports: 3,
            failedReports: 0
          }
        ];

        BulkReportsService.getUserJobs.mockResolvedValue(mockJobs);

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk?status=completed',
          query: { status: 'completed' },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getUserBulkJobs(req, res);

        // Assert
        expect(BulkReportsService.getUserJobs).toHaveBeenCalledWith('user-123', { status: 'completed' });
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.data).toHaveLength(1);
        expect(data.data[0].status).toBe('completed');
      });

      it('should return empty array when user has no jobs', async () => {
        // Arrange
        BulkReportsService.getUserJobs.mockResolvedValue([]);

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk',
          query: {},
          user: { userId: 'new-user', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getUserBulkJobs(req, res);

        // Assert
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.data).toEqual([]);
        expect(data.count).toBe(0);
      });
    });

    describe('when service errors occur', () => {
      it('should return 500 when service throws error', async () => {
        // Arrange
        BulkReportsService.getUserJobs.mockRejectedValue(
          new Error('Database error')
        );

        const req = httpMocks.createRequest({
          method: 'GET',
          url: '/api/v1/reports/bulk',
          query: {},
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();

        // Act
        await bulkReportsController.getUserBulkJobs(req, res);

        // Assert
        expect(res.statusCode).toBe(500);
        const data = res._getJSONData();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Database error');
      });
    });
  });
});
