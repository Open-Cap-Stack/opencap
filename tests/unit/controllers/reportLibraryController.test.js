/**
 * Report Library Controller Unit Tests
 * Issue #199: Add Report Library Categorization
 */
process.env.SKIP_DB_SETUP = 'true';

const reportLibraryController = require('../../../controllers/reportLibraryController');
const ReportLibraryService = require('../../../services/reportLibraryService');

jest.mock('../../../services/reportLibraryService');

describe('ReportLibraryController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('Category Endpoints', () => {
    describe('getCategories', () => {
      it('should return all categories with 200 status', async () => {
        const categories = [{ categoryId: 'CAT-001', name: 'Financial' }];
        ReportLibraryService.getCategories.mockResolvedValue(categories);

        await reportLibraryController.getCategories(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: categories,
          count: 1
        });
      });

      it('should filter by status when provided', async () => {
        mockReq.query.status = 'active';
        ReportLibraryService.getCategories.mockResolvedValue([]);

        await reportLibraryController.getCategories(mockReq, mockRes);

        expect(ReportLibraryService.getCategories).toHaveBeenCalledWith({ status: 'active' });
      });

      it('should return 500 on service error', async () => {
        ReportLibraryService.getCategories.mockRejectedValue(new Error('Database error'));

        await reportLibraryController.getCategories(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Database error'
        });
      });
    });

    describe('createCategory', () => {
      it('should create category with 201 status', async () => {
        const newCategory = { categoryId: 'CAT-001', name: 'Tax', slug: 'tax' };
        mockReq.body = { name: 'Tax', slug: 'tax' };
        ReportLibraryService.createCategory.mockResolvedValue(newCategory);

        await reportLibraryController.createCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: newCategory,
          message: 'Category created successfully'
        });
      });

      it('should return 400 for missing required fields', async () => {
        ReportLibraryService.createCategory.mockRejectedValue(new Error('Missing required fields'));

        await reportLibraryController.createCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for duplicate slug', async () => {
        ReportLibraryService.createCategory.mockRejectedValue(new Error('Category with this slug already exists'));

        await reportLibraryController.createCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('updateCategory', () => {
      it('should update category with 200 status', async () => {
        mockReq.params.categoryId = 'CAT-001';
        mockReq.body = { name: 'Updated Name' };
        const updated = { categoryId: 'CAT-001', name: 'Updated Name' };
        ReportLibraryService.updateCategory.mockResolvedValue(updated);

        await reportLibraryController.updateCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updated,
          message: 'Category updated successfully'
        });
      });

      it('should return 404 when category not found', async () => {
        mockReq.params.categoryId = 'nonexistent';
        ReportLibraryService.updateCategory.mockRejectedValue(new Error('Category not found'));

        await reportLibraryController.updateCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('deleteCategory', () => {
      it('should delete category with 200 status', async () => {
        mockReq.params.categoryId = 'CAT-001';
        ReportLibraryService.deleteCategory.mockResolvedValue({ categoryId: 'CAT-001' });

        await reportLibraryController.deleteCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Category deleted successfully'
        });
      });

      it('should return 404 when category not found', async () => {
        mockReq.params.categoryId = 'nonexistent';
        ReportLibraryService.deleteCategory.mockRejectedValue(new Error('Category not found'));

        await reportLibraryController.deleteCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      it('should return 400 when category has templates', async () => {
        mockReq.params.categoryId = 'CAT-001';
        ReportLibraryService.deleteCategory.mockRejectedValue(new Error('Cannot delete category with associated templates'));

        await reportLibraryController.deleteCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('Template Endpoints', () => {
    describe('getTemplates', () => {
      it('should return all templates with 200 status', async () => {
        const templates = [{ templateId: 'TPL-001', name: 'Balance Sheet' }];
        ReportLibraryService.getTemplates.mockResolvedValue(templates);

        await reportLibraryController.getTemplates(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: templates,
          count: 1
        });
      });

      it('should filter by categoryId when provided', async () => {
        mockReq.query.categoryId = 'CAT-001';
        ReportLibraryService.getTemplates.mockResolvedValue([]);

        await reportLibraryController.getTemplates(mockReq, mockRes);

        expect(ReportLibraryService.getTemplates).toHaveBeenCalledWith(
          { categoryId: 'CAT-001' },
          expect.any(Object)
        );
      });

      it('should handle pagination parameters', async () => {
        mockReq.query.page = '2';
        mockReq.query.limit = '10';
        ReportLibraryService.getTemplates.mockResolvedValue([]);

        await reportLibraryController.getTemplates(mockReq, mockRes);

        expect(ReportLibraryService.getTemplates).toHaveBeenCalledWith(
          {},
          { page: 2, limit: 10 }
        );
      });
    });

    describe('createTemplate', () => {
      it('should create template with 201 status', async () => {
        const newTemplate = { templateId: 'TPL-001', name: 'Balance Sheet' };
        mockReq.body = { name: 'Balance Sheet', categoryId: 'CAT-001' };
        ReportLibraryService.createTemplate.mockResolvedValue(newTemplate);

        await reportLibraryController.createTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: newTemplate,
          message: 'Template created successfully'
        });
      });

      it('should return 404 when category not found', async () => {
        mockReq.body = { name: 'Test', categoryId: 'nonexistent' };
        ReportLibraryService.createTemplate.mockRejectedValue(new Error('Category not found'));

        await reportLibraryController.createTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      it('should return 400 for invalid field definitions', async () => {
        ReportLibraryService.createTemplate.mockRejectedValue(new Error('Invalid field definition'));

        await reportLibraryController.createTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('getTemplateById', () => {
      it('should return template with 200 status', async () => {
        mockReq.params.templateId = 'TPL-001';
        const template = { templateId: 'TPL-001', name: 'Balance Sheet' };
        ReportLibraryService.getTemplateById.mockResolvedValue(template);

        await reportLibraryController.getTemplateById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: template
        });
      });

      it('should return 404 when template not found', async () => {
        mockReq.params.templateId = 'nonexistent';
        ReportLibraryService.getTemplateById.mockResolvedValue(null);

        await reportLibraryController.getTemplateById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Template not found'
        });
      });
    });

    describe('updateTemplate', () => {
      it('should update template with 200 status', async () => {
        mockReq.params.templateId = 'TPL-001';
        mockReq.body = { name: 'Updated Name' };
        const updated = { templateId: 'TPL-001', name: 'Updated Name' };
        ReportLibraryService.updateTemplate.mockResolvedValue(updated);

        await reportLibraryController.updateTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updated,
          message: 'Template updated successfully'
        });
      });

      it('should return 404 when template not found', async () => {
        mockReq.params.templateId = 'nonexistent';
        ReportLibraryService.updateTemplate.mockRejectedValue(new Error('Template not found'));

        await reportLibraryController.updateTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template with 200 status', async () => {
        mockReq.params.templateId = 'TPL-001';
        ReportLibraryService.deleteTemplate.mockResolvedValue({ templateId: 'TPL-001' });

        await reportLibraryController.deleteTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Template deleted successfully'
        });
      });

      it('should return 404 when template not found', async () => {
        mockReq.params.templateId = 'nonexistent';
        ReportLibraryService.deleteTemplate.mockRejectedValue(new Error('Template not found'));

        await reportLibraryController.deleteTemplate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('Library Endpoint', () => {
    describe('getLibrary', () => {
      it('should return library with 200 status', async () => {
        const library = {
          categories: [{ categoryId: 'CAT-001' }],
          reports: [{ templateId: 'TPL-001' }],
          totalCount: 1
        };
        ReportLibraryService.getLibrary.mockResolvedValue(library);

        await reportLibraryController.getLibrary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: library
        });
      });

      it('should pass search filter to service', async () => {
        mockReq.query.search = 'balance';
        ReportLibraryService.getLibrary.mockResolvedValue({ categories: [], reports: [], totalCount: 0 });

        await reportLibraryController.getLibrary(mockReq, mockRes);

        expect(ReportLibraryService.getLibrary).toHaveBeenCalledWith({ search: 'balance' });
      });

      it('should pass categoryId filter to service', async () => {
        mockReq.query.categoryId = 'CAT-001';
        ReportLibraryService.getLibrary.mockResolvedValue({ categories: [], reports: [], totalCount: 0 });

        await reportLibraryController.getLibrary(mockReq, mockRes);

        expect(ReportLibraryService.getLibrary).toHaveBeenCalledWith({ categoryId: 'CAT-001' });
      });
    });
  });

  describe('Share Endpoints', () => {
    describe('shareReport', () => {
      it('should share report with 201 status', async () => {
        mockReq.params.reportId = 'RPT-001';
        mockReq.body = { recipients: ['user@test.com'] };
        const share = { shareId: 'SHR-001', reportId: 'RPT-001' };
        ReportLibraryService.shareReport.mockResolvedValue(share);

        await reportLibraryController.shareReport(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: share,
          message: 'Report shared successfully'
        });
      });

      it('should include sharedBy from user context', async () => {
        mockReq.params.reportId = 'RPT-001';
        mockReq.body = { recipients: ['user@test.com'] };
        mockReq.user = { userId: 'user-123' };
        ReportLibraryService.shareReport.mockResolvedValue({});

        await reportLibraryController.shareReport(mockReq, mockRes);

        expect(ReportLibraryService.shareReport).toHaveBeenCalledWith(
          'RPT-001',
          expect.objectContaining({ sharedBy: 'user-123' })
        );
      });

      it('should return 404 when report not found', async () => {
        mockReq.params.reportId = 'nonexistent';
        mockReq.body = { recipients: ['user@test.com'] };
        ReportLibraryService.shareReport.mockRejectedValue(new Error('Report not found'));

        await reportLibraryController.shareReport(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      it('should return 400 for invalid email', async () => {
        mockReq.params.reportId = 'RPT-001';
        mockReq.body = { recipients: ['invalid-email'] };
        ReportLibraryService.shareReport.mockRejectedValue(new Error('Invalid email format'));

        await reportLibraryController.shareReport(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('getShares', () => {
      it('should return shares with 200 status', async () => {
        mockReq.params.reportId = 'RPT-001';
        const shares = [{ shareId: 'SHR-001' }];
        ReportLibraryService.getShares.mockResolvedValue(shares);

        await reportLibraryController.getShares(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: shares,
          count: 1
        });
      });
    });

    describe('revokeShare', () => {
      it('should revoke share with 200 status', async () => {
        mockReq.params.shareId = 'SHR-001';
        ReportLibraryService.revokeShare.mockResolvedValue({ shareId: 'SHR-001', status: 'revoked' });

        await reportLibraryController.revokeShare(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Share revoked successfully'
        });
      });

      it('should return 404 when share not found', async () => {
        mockReq.params.shareId = 'nonexistent';
        ReportLibraryService.revokeShare.mockRejectedValue(new Error('Share not found'));

        await reportLibraryController.revokeShare(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('validateShareAccess', () => {
      it('should return valid: true for valid access', async () => {
        mockReq.params.shareId = 'SHR-001';
        mockReq.query.email = 'user@test.com';
        ReportLibraryService.validateShareAccess.mockResolvedValue(true);

        await reportLibraryController.validateShareAccess(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          valid: true
        });
      });

      it('should return valid: false for invalid access', async () => {
        mockReq.params.shareId = 'SHR-001';
        mockReq.query.email = 'other@test.com';
        ReportLibraryService.validateShareAccess.mockResolvedValue(false);

        await reportLibraryController.validateShareAccess(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          valid: false
        });
      });

      it('should return 400 when email not provided', async () => {
        mockReq.params.shareId = 'SHR-001';
        mockReq.query = {};

        await reportLibraryController.validateShareAccess(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email is required'
        });
      });
    });
  });
});
