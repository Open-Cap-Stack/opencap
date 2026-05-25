/**
 * Report Library Routes Unit Tests
 * Issue #199: Add Report Library Categorization
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');

// Mock the auth middleware
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user-123' };
    next();
  }
}));

// Mock RBAC middleware — these tests verify route wiring, not role enforcement
jest.mock('../../../../middleware/rbacMiddleware', () => ({
  hasRole: () => (req, res, next) => next(),
  hasPermission: () => (req, res, next) => next(),
  requireUserNotAgent: (req, res, next) => next(),
}));

// Mock the service
jest.mock('../../../../services/reportLibraryService', () => ({
  getCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getTemplates: jest.fn(),
  createTemplate: jest.fn(),
  getTemplateById: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  getLibrary: jest.fn(),
  shareReport: jest.fn(),
  getShares: jest.fn(),
  revokeShare: jest.fn(),
  validateShareAccess: jest.fn()
}));

const reportLibraryRoutes = require('../../../../routes/v1/reportLibraryRoutes');
const ReportLibraryService = require('../../../../services/reportLibraryService');

describe('Report Library Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/reports', reportLibraryRoutes);
  });

  describe('Category Routes', () => {
    describe('GET /api/v1/reports/categories', () => {
      it('should return categories', async () => {
        const categories = [{ categoryId: 'CAT-001', name: 'Financial' }];
        ReportLibraryService.getCategories.mockResolvedValue(categories);

        const res = await request(app).get('/api/v1/reports/categories');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
      });

      it('should pass status filter to service', async () => {
        ReportLibraryService.getCategories.mockResolvedValue([]);

        await request(app).get('/api/v1/reports/categories?status=active');

        expect(ReportLibraryService.getCategories).toHaveBeenCalledWith({ status: 'active' });
      });
    });

    describe('POST /api/v1/reports/categories', () => {
      it('should create a category', async () => {
        const newCategory = { categoryId: 'CAT-001', name: 'Tax', slug: 'tax' };
        ReportLibraryService.createCategory.mockResolvedValue(newCategory);

        const res = await request(app)
          .post('/api/v1/reports/categories')
          .send({ name: 'Tax', slug: 'tax' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categoryId).toBe('CAT-001');
      });

      it('should return 400 for validation errors', async () => {
        ReportLibraryService.createCategory.mockRejectedValue(new Error('Missing required fields'));

        const res = await request(app)
          .post('/api/v1/reports/categories')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/reports/categories/:categoryId', () => {
      it('should update a category', async () => {
        const updated = { categoryId: 'CAT-001', name: 'Updated' };
        ReportLibraryService.updateCategory.mockResolvedValue(updated);

        const res = await request(app)
          .put('/api/v1/reports/categories/CAT-001')
          .send({ name: 'Updated' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent category', async () => {
        ReportLibraryService.updateCategory.mockRejectedValue(new Error('Category not found'));

        const res = await request(app)
          .put('/api/v1/reports/categories/nonexistent')
          .send({ name: 'Test' });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/v1/reports/categories/:categoryId', () => {
      it('should delete a category', async () => {
        ReportLibraryService.deleteCategory.mockResolvedValue({ categoryId: 'CAT-001' });

        const res = await request(app).delete('/api/v1/reports/categories/CAT-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent category', async () => {
        ReportLibraryService.deleteCategory.mockRejectedValue(new Error('Category not found'));

        const res = await request(app).delete('/api/v1/reports/categories/nonexistent');

        expect(res.status).toBe(404);
      });

      it('should return 400 when category has templates', async () => {
        ReportLibraryService.deleteCategory.mockRejectedValue(
          new Error('Cannot delete category with associated templates')
        );

        const res = await request(app).delete('/api/v1/reports/categories/CAT-001');

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Template Routes', () => {
    describe('GET /api/v1/reports/templates', () => {
      it('should return templates', async () => {
        const templates = [{ templateId: 'TPL-001', name: 'Balance Sheet' }];
        ReportLibraryService.getTemplates.mockResolvedValue(templates);

        const res = await request(app).get('/api/v1/reports/templates');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
      });

      it('should pass filters to service', async () => {
        ReportLibraryService.getTemplates.mockResolvedValue([]);

        await request(app).get('/api/v1/reports/templates?categoryId=CAT-001&page=2&limit=10');

        expect(ReportLibraryService.getTemplates).toHaveBeenCalledWith(
          { categoryId: 'CAT-001' },
          { page: 2, limit: 10 }
        );
      });
    });

    describe('POST /api/v1/reports/templates', () => {
      it('should create a template', async () => {
        const newTemplate = { templateId: 'TPL-001', name: 'Balance Sheet' };
        ReportLibraryService.createTemplate.mockResolvedValue(newTemplate);

        const res = await request(app)
          .post('/api/v1/reports/templates')
          .send({ name: 'Balance Sheet', categoryId: 'CAT-001' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent category', async () => {
        ReportLibraryService.createTemplate.mockRejectedValue(new Error('Category not found'));

        const res = await request(app)
          .post('/api/v1/reports/templates')
          .send({ name: 'Test', categoryId: 'nonexistent' });

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/v1/reports/templates/:templateId', () => {
      it('should return a template', async () => {
        const template = { templateId: 'TPL-001', name: 'Balance Sheet' };
        ReportLibraryService.getTemplateById.mockResolvedValue(template);

        const res = await request(app).get('/api/v1/reports/templates/TPL-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.templateId).toBe('TPL-001');
      });

      it('should return 404 for non-existent template', async () => {
        ReportLibraryService.getTemplateById.mockResolvedValue(null);

        const res = await request(app).get('/api/v1/reports/templates/nonexistent');

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/v1/reports/templates/:templateId', () => {
      it('should update a template', async () => {
        const updated = { templateId: 'TPL-001', name: 'Updated' };
        ReportLibraryService.updateTemplate.mockResolvedValue(updated);

        const res = await request(app)
          .put('/api/v1/reports/templates/TPL-001')
          .send({ name: 'Updated' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent template', async () => {
        ReportLibraryService.updateTemplate.mockRejectedValue(new Error('Template not found'));

        const res = await request(app)
          .put('/api/v1/reports/templates/nonexistent')
          .send({ name: 'Test' });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/v1/reports/templates/:templateId', () => {
      it('should delete a template', async () => {
        ReportLibraryService.deleteTemplate.mockResolvedValue({ templateId: 'TPL-001' });

        const res = await request(app).delete('/api/v1/reports/templates/TPL-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent template', async () => {
        ReportLibraryService.deleteTemplate.mockRejectedValue(new Error('Template not found'));

        const res = await request(app).delete('/api/v1/reports/templates/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('Library Routes', () => {
    describe('GET /api/v1/reports/library', () => {
      it('should return library', async () => {
        const library = {
          categories: [{ categoryId: 'CAT-001' }],
          reports: [{ templateId: 'TPL-001' }],
          totalCount: 1
        };
        ReportLibraryService.getLibrary.mockResolvedValue(library);

        const res = await request(app).get('/api/v1/reports/library');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categories).toHaveLength(1);
      });

      it('should pass search and categoryId filters', async () => {
        ReportLibraryService.getLibrary.mockResolvedValue({ categories: [], reports: [], totalCount: 0 });

        await request(app).get('/api/v1/reports/library?search=balance&categoryId=CAT-001');

        expect(ReportLibraryService.getLibrary).toHaveBeenCalledWith({
          search: 'balance',
          categoryId: 'CAT-001'
        });
      });
    });
  });

  describe('Share Routes', () => {
    describe('POST /api/v1/reports/:reportId/share', () => {
      it('should share a report', async () => {
        const share = { shareId: 'SHR-001', reportId: 'RPT-001' };
        ReportLibraryService.shareReport.mockResolvedValue(share);

        const res = await request(app)
          .post('/api/v1/reports/RPT-001/share')
          .send({ recipients: ['user@test.com'] });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.shareId).toBe('SHR-001');
      });

      it('should return 404 for non-existent report', async () => {
        ReportLibraryService.shareReport.mockRejectedValue(new Error('Report not found'));

        const res = await request(app)
          .post('/api/v1/reports/nonexistent/share')
          .send({ recipients: ['user@test.com'] });

        expect(res.status).toBe(404);
      });

      it('should return 400 for invalid email', async () => {
        ReportLibraryService.shareReport.mockRejectedValue(new Error('Invalid email format'));

        const res = await request(app)
          .post('/api/v1/reports/RPT-001/share')
          .send({ recipients: ['invalid-email'] });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/reports/:reportId/shares', () => {
      it('should return shares for a report', async () => {
        const shares = [{ shareId: 'SHR-001' }];
        ReportLibraryService.getShares.mockResolvedValue(shares);

        const res = await request(app).get('/api/v1/reports/RPT-001/shares');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
      });
    });

    describe('DELETE /api/v1/reports/shares/:shareId', () => {
      it('should revoke a share', async () => {
        ReportLibraryService.revokeShare.mockResolvedValue({ shareId: 'SHR-001', status: 'revoked' });

        const res = await request(app).delete('/api/v1/reports/shares/SHR-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent share', async () => {
        ReportLibraryService.revokeShare.mockRejectedValue(new Error('Share not found'));

        const res = await request(app).delete('/api/v1/reports/shares/nonexistent');

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/v1/reports/shares/:shareId/validate', () => {
      it('should validate share access', async () => {
        ReportLibraryService.validateShareAccess.mockResolvedValue(true);

        const res = await request(app).get('/api/v1/reports/shares/SHR-001/validate?email=user@test.com');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.valid).toBe(true);
      });

      it('should return 400 when email not provided', async () => {
        const res = await request(app).get('/api/v1/reports/shares/SHR-001/validate');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email is required');
      });

      it('should return valid: false for invalid access', async () => {
        ReportLibraryService.validateShareAccess.mockResolvedValue(false);

        const res = await request(app).get('/api/v1/reports/shares/SHR-001/validate?email=other@test.com');

        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(false);
      });
    });
  });
});
