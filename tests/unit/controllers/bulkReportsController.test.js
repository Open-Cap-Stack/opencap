/**
 * Bulk Reports Controller Tests
 * Issue #238: Implement Bulk Reports Endpoint
 */

const httpMocks = require('node-mocks-http');
const bulkReportsController = require('../../../controllers/bulkReportsController');
const BulkReportsService = require('../../../services/bulkReportsService');

jest.mock('../../../services/bulkReportsService');

describe('BulkReportsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/reports/bulk - generateBulkReports', () => {
    describe('when bulk generation is successful', () => {
      it('should create a bulk job and return job details with 200 status', async () => {
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
          createdAt: new Date('2026-02-05T10:00:00Z')
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
          user: { userId: 'user-123', email: 'test@example.com', role: 'admin', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);

        expect(BulkReportsService.createBulkJob).toHaveBeenCalledWith({
          reports: expect.any(Array),
          userId: 'user-123',
          companyId: 'company-123'
        });

        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.jobId).toBe('JOB-BULK-12345');
        expect(data.totalReports).toBe(3);
      });

      it('should handle single report in bulk request', async () => {
        const mockJobResult = {
          jobId: 'JOB-BULK-67890',
          status: 'queued',
          totalReports: 1,
          completedReports: 0,
          failedReports: 0,
          reports: [{ reportType: 'financial', format: 'pdf', status: 'pending' }],
          createdAt: new Date()
        };

        BulkReportsService.createBulkJob.mockResolvedValue(mockJobResult);

        const req = httpMocks.createRequest({
          method: 'POST',
          url: '/api/v1/reports/bulk',
          body: { reports: [{ reportType: 'financial', format: 'pdf' }] },
          user: { userId: 'user-123', companyId: 'company-123' }
        });

        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);

        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.success).toBe(true);
        expect(data.totalReports).toBe(1);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 when reports array is missing', async () => {
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk', body: {},
          user: { userId: 'user-123', companyId: 'company-123' }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().error).toContain('reports array is required');
      });

      it('should return 400 when reports array is empty', async () => {
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk',
          body: { reports: [] },
          user: { userId: 'user-123', companyId: 'company-123' }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().error).toContain('At least one report is required');
      });

      it('should return 400 when reports array exceeds maximum limit', async () => {
        const tooManyReports = Array(51).fill({ reportType: 'financial', format: 'pdf' });
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk',
          body: { reports: tooManyReports },
          user: { userId: 'user-123', companyId: 'company-123' }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().error).toContain('Maximum 50 reports allowed');
      });

      it('should return 400 when report is missing required fields', async () => {
        BulkReportsService.createBulkJob.mockRejectedValue(new Error('Missing required field: reportType'));
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk',
          body: { reports: [{ format: 'pdf' }] },
          user: { userId: 'user-123', companyId: 'company-123' }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().error).toContain('Missing required field');
      });

      it('should return 400 when report has invalid format', async () => {
        BulkReportsService.createBulkJob.mockRejectedValue(new Error('Invalid format: txt. Allowed formats: pdf, csv, xlsx, json'));
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk',
          body: { reports: [{ reportType: 'financial', format: 'txt' }] },
          user: { userId: 'user-123', companyId: 'company-123' }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(400);
        expect(res._getJSONData().error).toContain('Invalid format');
      });
    });

    describe('when authentication fails', () => {
      it('should return 401 when user is not authenticated', async () => {
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk',
          body: { reports: [{ reportType: 'financial', format: 'pdf' }] }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(401);
        expect(res._getJSONData().error).toContain('Authentication required');
      });
    });

    describe('when service errors occur', () => {
      it('should return 500 when service throws unexpected error', async () => {
        BulkReportsService.createBulkJob.mockRejectedValue(new Error('Database connection failed'));
        const req = httpMocks.createRequest({
          method: 'POST', url: '/api/v1/reports/bulk',
          body: { reports: [{ reportType: 'financial', format: 'pdf' }] },
          user: { userId: 'user-123', companyId: 'company-123' }
        });
        const res = httpMocks.createResponse();
        await bulkReportsController.generateBulkReports(req, res);
        expect(res.statusCode).toBe(500);
        expect(res._getJSONData().error).toBe('Database connection failed');
      });
    });
  });

  describe('GET /api/v1/reports/bulk/:jobId - getBulkJobStatus', () => {
    it('should return job status with 200', async () => {
      const mockJobStatus = {
        jobId: 'JOB-BULK-12345', status: 'processing', totalReports: 5,
        completedReports: 3, failedReports: 1,
        reports: [
          { reportType: 'financial', format: 'pdf', status: 'completed', reportId: 'RPT-001' },
          { reportType: 'equity', format: 'csv', status: 'completed', reportId: 'RPT-002' },
          { reportType: 'compliance', format: 'xlsx', status: 'completed', reportId: 'RPT-003' },
          { reportType: 'investor', format: 'pdf', status: 'failed', error: 'Data not found' },
          { reportType: 'operational', format: 'json', status: 'pending' }
        ],
        createdAt: new Date('2026-02-05T10:00:00Z'), startedAt: new Date('2026-02-05T10:00:30Z'), progress: 60
      };
      BulkReportsService.getJobStatus.mockResolvedValue(mockJobStatus);
      const req = httpMocks.createRequest({ method: 'GET', params: { jobId: 'JOB-BULK-12345' }, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getBulkJobStatus(req, res);
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBe('JOB-BULK-12345');
    });

    it('should return 404 when job is not found', async () => {
      BulkReportsService.getJobStatus.mockRejectedValue(new Error('Job not found'));
      const req = httpMocks.createRequest({ method: 'GET', params: { jobId: 'INVALID-JOB' }, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getBulkJobStatus(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when user tries to access another user job', async () => {
      BulkReportsService.getJobStatus.mockRejectedValue(new Error('Unauthorized access to job'));
      const req = httpMocks.createRequest({ method: 'GET', params: { jobId: 'JOB-BULK-12345' }, user: { userId: 'different-user', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getBulkJobStatus(req, res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/reports/bulk/:jobId - cancelBulkJob', () => {
    it('should cancel a queued job and return 200', async () => {
      BulkReportsService.cancelJob.mockResolvedValue({ jobId: 'JOB-BULK-12345', status: 'cancelled', cancelledAt: new Date() });
      const req = httpMocks.createRequest({ method: 'DELETE', params: { jobId: 'JOB-BULK-12345' }, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.cancelBulkJob(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().message).toBe('Bulk job cancelled successfully');
    });

    it('should return 400 when job is already completed', async () => {
      BulkReportsService.cancelJob.mockRejectedValue(new Error('Cannot cancel a completed job'));
      const req = httpMocks.createRequest({ method: 'DELETE', params: { jobId: 'JOB-BULK-12345' }, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.cancelBulkJob(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when job does not exist', async () => {
      BulkReportsService.cancelJob.mockRejectedValue(new Error('Job not found'));
      const req = httpMocks.createRequest({ method: 'DELETE', params: { jobId: 'INVALID-JOB' }, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.cancelBulkJob(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/reports/bulk - getUserBulkJobs', () => {
    it('should return list of user jobs with 200', async () => {
      const mockJobs = [
        { jobId: 'JOB-BULK-001', status: 'completed', totalReports: 3 },
        { jobId: 'JOB-BULK-002', status: 'processing', totalReports: 5 },
        { jobId: 'JOB-BULK-003', status: 'queued', totalReports: 2 }
      ];
      BulkReportsService.getUserJobs.mockResolvedValue(mockJobs);
      const req = httpMocks.createRequest({ method: 'GET', query: {}, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getUserBulkJobs(req, res);
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.data).toHaveLength(3);
      expect(data.count).toBe(3);
    });

    it('should filter jobs by status when provided', async () => {
      BulkReportsService.getUserJobs.mockResolvedValue([{ jobId: 'JOB-BULK-001', status: 'completed' }]);
      const req = httpMocks.createRequest({ method: 'GET', query: { status: 'completed' }, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getUserBulkJobs(req, res);
      expect(BulkReportsService.getUserJobs).toHaveBeenCalledWith('user-123', { status: 'completed' });
    });

    it('should return empty array when user has no jobs', async () => {
      BulkReportsService.getUserJobs.mockResolvedValue([]);
      const req = httpMocks.createRequest({ method: 'GET', query: {}, user: { userId: 'new-user', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getUserBulkJobs(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data).toEqual([]);
    });

    it('should return 500 when service throws error', async () => {
      BulkReportsService.getUserJobs.mockRejectedValue(new Error('Database error'));
      const req = httpMocks.createRequest({ method: 'GET', query: {}, user: { userId: 'user-123', companyId: 'company-123' } });
      const res = httpMocks.createResponse();
      await bulkReportsController.getUserBulkJobs(req, res);
      expect(res.statusCode).toBe(500);
      expect(res._getJSONData().error).toBe('Database error');
    });
  });
});
