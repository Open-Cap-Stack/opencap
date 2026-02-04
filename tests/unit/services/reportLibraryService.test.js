/**
 * Report Library Service Unit Tests
 * Issue #199: Add Report Library Categorization
 */
process.env.SKIP_DB_SETUP = 'true';

const ReportLibraryService = require('../../../services/reportLibraryService');

jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');

describe('ReportLibraryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Category Management', () => {
    describe('getCategories', () => {
      it('should return all report categories', async () => {
        const categories = [
          { categoryId: 'CAT-001', name: 'Financial Reports', slug: 'financial' }
        ];
        databaseAdapter.find.mockResolvedValue(categories);
        const result = await ReportLibraryService.getCategories();
        expect(databaseAdapter.find).toHaveBeenCalledWith('ReportCategory', {});
        expect(result).toHaveLength(1);
      });

      it('should filter categories by status', async () => {
        databaseAdapter.find.mockResolvedValue([]);
        await ReportLibraryService.getCategories({ status: 'active' });
        expect(databaseAdapter.find).toHaveBeenCalledWith('ReportCategory', { status: 'active' });
      });
    });

    describe('createCategory', () => {
      it('should create a new category with valid data', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        databaseAdapter.create.mockResolvedValue({ categoryId: 'CAT-12345678', name: 'Tax', slug: 'tax' });
        const result = await ReportLibraryService.createCategory({ name: 'Tax', slug: 'tax' });
        expect(result).toHaveProperty('categoryId');
      });

      it('should throw error for missing required fields', async () => {
        await expect(ReportLibraryService.createCategory({ description: 'test' }))
          .rejects.toThrow('Missing required fields');
      });

      it('should throw error for duplicate slug', async () => {
        databaseAdapter.findOne.mockResolvedValue({ slug: 'tax' });
        await expect(ReportLibraryService.createCategory({ name: 'Tax', slug: 'tax' }))
          .rejects.toThrow('Category with this slug already exists');
      });
    });

    describe('updateCategory', () => {
      it('should update an existing category', async () => {
        databaseAdapter.findOne.mockResolvedValue({ categoryId: 'CAT-001' });
        databaseAdapter.findByIdAndUpdate.mockResolvedValue({ categoryId: 'CAT-001', name: 'New Name' });
        const result = await ReportLibraryService.updateCategory('CAT-001', { name: 'New Name' });
        expect(result.name).toBe('New Name');
      });

      it('should throw error when category not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        await expect(ReportLibraryService.updateCategory('nonexistent', {}))
          .rejects.toThrow('Category not found');
      });
    });

    describe('deleteCategory', () => {
      it('should delete a category without templates', async () => {
        databaseAdapter.findOne.mockResolvedValue({ categoryId: 'CAT-001' });
        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.findByIdAndDelete.mockResolvedValue({ categoryId: 'CAT-001' });
        const result = await ReportLibraryService.deleteCategory('CAT-001');
        expect(result).toHaveProperty('categoryId');
      });

      it('should throw error when category has templates', async () => {
        databaseAdapter.findOne.mockResolvedValue({ categoryId: 'CAT-001' });
        databaseAdapter.find.mockResolvedValue([{ templateId: 'TPL-001' }]);
        await expect(ReportLibraryService.deleteCategory('CAT-001'))
          .rejects.toThrow('Cannot delete category with associated templates');
      });
    });
  });

  describe('Template Management', () => {
    describe('getTemplates', () => {
      it('should return all report templates', async () => {
        databaseAdapter.find.mockResolvedValue([{ templateId: 'TPL-001' }]);
        const result = await ReportLibraryService.getTemplates();
        expect(result).toHaveLength(1);
      });

      it('should support pagination', async () => {
        databaseAdapter.find.mockResolvedValue([]);
        await ReportLibraryService.getTemplates({}, { page: 2, limit: 10 });
        expect(databaseAdapter.find).toHaveBeenCalledWith('ReportTemplate', {}, expect.objectContaining({ limit: 10, skip: 10 }));
      });
    });

    describe('createTemplate', () => {
      it('should create a new template', async () => {
        databaseAdapter.findOne.mockResolvedValue({ categoryId: 'CAT-001' });
        databaseAdapter.create.mockResolvedValue({ templateId: 'TPL-12345678' });
        const result = await ReportLibraryService.createTemplate({
          name: 'Test',
          categoryId: 'CAT-001',
          fields: [{ name: 'revenue', label: 'Revenue', type: 'currency' }]
        });
        expect(result).toHaveProperty('templateId');
      });

      it('should throw error for missing required fields', async () => {
        await expect(ReportLibraryService.createTemplate({ description: 'test' }))
          .rejects.toThrow('Missing required fields');
      });

      it('should throw error for invalid category', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        await expect(ReportLibraryService.createTemplate({ name: 'Test', categoryId: 'CAT-001' }))
          .rejects.toThrow('Category not found');
      });

      it('should validate field definitions', async () => {
        databaseAdapter.findOne.mockResolvedValue({ categoryId: 'CAT-001' });
        await expect(ReportLibraryService.createTemplate({
          name: 'Test',
          categoryId: 'CAT-001',
          fields: [{ invalid: 'field' }]
        })).rejects.toThrow('Invalid field definition');
      });
    });

    describe('getTemplateById', () => {
      it('should return template by ID', async () => {
        databaseAdapter.findOne.mockResolvedValue({ templateId: 'TPL-001' });
        const result = await ReportLibraryService.getTemplateById('TPL-001');
        expect(result).toHaveProperty('templateId');
      });

      it('should return null when not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        const result = await ReportLibraryService.getTemplateById('nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('updateTemplate', () => {
      it('should update an existing template', async () => {
        databaseAdapter.findOne.mockResolvedValue({ templateId: 'TPL-001', version: 1 });
        databaseAdapter.findByIdAndUpdate.mockResolvedValue({ templateId: 'TPL-001', name: 'Updated' });
        const result = await ReportLibraryService.updateTemplate('TPL-001', { name: 'Updated' });
        expect(result.name).toBe('Updated');
      });

      it('should throw error when template not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        await expect(ReportLibraryService.updateTemplate('nonexistent', {}))
          .rejects.toThrow('Template not found');
      });
    });

    describe('deleteTemplate', () => {
      it('should delete an existing template', async () => {
        databaseAdapter.findOne.mockResolvedValue({ templateId: 'TPL-001' });
        databaseAdapter.findByIdAndDelete.mockResolvedValue({ templateId: 'TPL-001' });
        const result = await ReportLibraryService.deleteTemplate('TPL-001');
        expect(result).toHaveProperty('templateId');
      });

      it('should throw error when template not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        await expect(ReportLibraryService.deleteTemplate('nonexistent'))
          .rejects.toThrow('Template not found');
      });
    });
  });

  describe('Report Library', () => {
    describe('getLibrary', () => {
      it('should return library with categories and reports', async () => {
        databaseAdapter.find
          .mockResolvedValueOnce([{ categoryId: 'CAT-001' }])
          .mockResolvedValueOnce([{ templateId: 'TPL-001', categoryId: 'CAT-001' }]);
        const result = await ReportLibraryService.getLibrary();
        expect(result).toHaveProperty('categories');
        expect(result).toHaveProperty('reports');
      });

      it('should filter by search term', async () => {
        databaseAdapter.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        await ReportLibraryService.getLibrary({ search: 'balance' });
        expect(databaseAdapter.find).toHaveBeenCalledWith('ReportTemplate', expect.objectContaining({ $or: expect.any(Array) }), expect.any(Object));
      });
    });
  });

  describe('Report Sharing', () => {
    describe('shareReport', () => {
      it('should create a share for a report', async () => {
        databaseAdapter.findOne.mockResolvedValue({ reportId: 'RPT-001' });
        databaseAdapter.create.mockResolvedValue({ shareId: 'SHR-001' });
        const result = await ReportLibraryService.shareReport('RPT-001', { recipients: ['user@test.com'] });
        expect(result).toHaveProperty('shareId');
      });

      it('should throw error when report not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        await expect(ReportLibraryService.shareReport('nonexistent', { recipients: ['user@test.com'] }))
          .rejects.toThrow('Report not found');
      });

      it('should validate email format', async () => {
        databaseAdapter.findOne.mockResolvedValue({ reportId: 'RPT-001' });
        await expect(ReportLibraryService.shareReport('RPT-001', { recipients: ['invalid-email'] }))
          .rejects.toThrow('Invalid email format');
      });
    });

    describe('getShares', () => {
      it('should return all shares for a report', async () => {
        databaseAdapter.find.mockResolvedValue([{ shareId: 'SHR-001' }]);
        const result = await ReportLibraryService.getShares('RPT-001');
        expect(result).toHaveLength(1);
      });
    });

    describe('revokeShare', () => {
      it('should revoke a share', async () => {
        databaseAdapter.findOne.mockResolvedValue({ shareId: 'SHR-001' });
        databaseAdapter.findByIdAndUpdate.mockResolvedValue({ shareId: 'SHR-001', status: 'revoked' });
        const result = await ReportLibraryService.revokeShare('SHR-001');
        expect(result.status).toBe('revoked');
      });

      it('should throw error when share not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        await expect(ReportLibraryService.revokeShare('nonexistent')).rejects.toThrow('Share not found');
      });
    });

    describe('validateShareAccess', () => {
      it('should return true for valid access', async () => {
        databaseAdapter.findOne.mockResolvedValue({
          shareId: 'SHR-001', status: 'active', recipients: ['user@test.com'], expiresAt: new Date(Date.now() + 86400000)
        });
        const result = await ReportLibraryService.validateShareAccess('SHR-001', 'user@test.com');
        expect(result).toBe(true);
      });

      it('should return false for expired share', async () => {
        databaseAdapter.findOne.mockResolvedValue({
          shareId: 'SHR-001', status: 'active', recipients: ['user@test.com'], expiresAt: new Date(Date.now() - 86400000)
        });
        const result = await ReportLibraryService.validateShareAccess('SHR-001', 'user@test.com');
        expect(result).toBe(false);
      });

      it('should return false for revoked share', async () => {
        databaseAdapter.findOne.mockResolvedValue({ shareId: 'SHR-001', status: 'revoked', recipients: ['user@test.com'] });
        const result = await ReportLibraryService.validateShareAccess('SHR-001', 'user@test.com');
        expect(result).toBe(false);
      });

      it('should return false if email not in recipients', async () => {
        databaseAdapter.findOne.mockResolvedValue({
          shareId: 'SHR-001', status: 'active', recipients: ['other@test.com'], expiresAt: new Date(Date.now() + 86400000)
        });
        const result = await ReportLibraryService.validateShareAccess('SHR-001', 'user@test.com');
        expect(result).toBe(false);
      });

      it('should return false if share not found', async () => {
        databaseAdapter.findOne.mockResolvedValue(null);
        const result = await ReportLibraryService.validateShareAccess('nonexistent', 'user@test.com');
        expect(result).toBe(false);
      });
    });
  });

  describe('Default Categories', () => {
    it('should return predefined default categories', () => {
      const defaults = ReportLibraryService.getDefaultCategories();
      expect(defaults).toContainEqual(expect.objectContaining({ slug: 'financial' }));
      expect(defaults).toContainEqual(expect.objectContaining({ slug: 'compliance' }));
    });

    it('should initialize default categories', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({});
      await ReportLibraryService.initializeDefaultCategories();
      expect(databaseAdapter.create).toHaveBeenCalled();
    });

    it('should not duplicate existing categories', async () => {
      databaseAdapter.findOne.mockResolvedValue({ slug: 'financial' });
      await ReportLibraryService.initializeDefaultCategories();
      expect(databaseAdapter.create).not.toHaveBeenCalled();
    });
  });
});
