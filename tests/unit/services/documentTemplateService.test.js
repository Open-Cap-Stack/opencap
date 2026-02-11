/**
 * DocumentTemplate Service Unit Tests
 * Issue #193: Implement Document Template System
 */
process.env.SKIP_DB_SETUP = 'true';

const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };

// Mock the database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

describe('DocumentTemplateService', () => {
  let documentTemplateService;
  let databaseAdapter;

  beforeAll(() => {
    documentTemplateService = require('../../../services/documentTemplateService');
    databaseAdapter = require('../../../services/databaseAdapter');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const templateData = {
        companyId: generateObjectId(),
        name: 'Stock Option Agreement',
        category: 'Legal',
        content: 'This agreement is between {{companyName}} and {{employeeName}}.',
        createdBy: generateObjectId()
      };

      const expectedResult = {
        _id: generateObjectId(),
        templateId: 'TMPL-ABC123',
        ...templateData,
        isActive: true,
        version: 1
      };

      databaseAdapter.create.mockResolvedValue(expectedResult);

      const result = await documentTemplateService.createTemplate(templateData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.objectContaining({
          companyId: templateData.companyId,
          name: templateData.name,
          category: templateData.category,
          content: templateData.content
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it('should auto-generate templateId if not provided', async () => {
      const templateData = {
        companyId: generateObjectId(),
        name: 'Test Template',
        category: 'General',
        content: 'Content here',
        createdBy: generateObjectId()
      };

      databaseAdapter.create.mockImplementation((model, data) => {
        return Promise.resolve({
          ...data,
          _id: generateObjectId(),
          templateId: data.templateId || 'TMPL-AUTO123'
        });
      });

      const result = await documentTemplateService.createTemplate(templateData);

      expect(result.templateId).toBeDefined();
      expect(result.templateId).toMatch(/^TMPL-/);
    });

    it('should throw error if required fields are missing', async () => {
      const incompleteData = {
        name: 'Test Template'
      };

      await expect(documentTemplateService.createTemplate(incompleteData))
        .rejects.toThrow();
    });
  });

  describe('getTemplates', () => {
    it('should return all templates for a company', async () => {
      const companyId = generateObjectId();
      const templates = [
        { _id: '1', name: 'Template 1', companyId },
        { _id: '2', name: 'Template 2', companyId }
      ];

      databaseAdapter.find.mockResolvedValue(templates);

      const result = await documentTemplateService.getTemplates({ companyId });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.objectContaining({ companyId }),
        expect.any(Object)
      );
      expect(result.templates).toEqual(templates);
    });

    it('should filter templates by category', async () => {
      const companyId = generateObjectId();
      const templates = [
        { _id: '1', name: 'Legal Template', companyId, category: 'Legal' }
      ];

      databaseAdapter.find.mockResolvedValue(templates);

      const result = await documentTemplateService.getTemplates({
        companyId,
        category: 'Legal'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.objectContaining({ companyId, category: 'Legal' }),
        expect.any(Object)
      );
      expect(result.templates).toEqual(templates);
    });

    it('should support pagination', async () => {
      const companyId = generateObjectId();
      const templates = [
        { _id: '1', name: 'Template 1' }
      ];

      databaseAdapter.find.mockResolvedValue(templates);

      await documentTemplateService.getTemplates({
        companyId,
        skip: 10,
        limit: 5
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.any(Object),
        expect.objectContaining({ skip: 10, limit: 5 })
      );
    });

    it('should filter by tags', async () => {
      const companyId = generateObjectId();
      const templates = [
        { _id: '1', name: 'Template with tag', tags: ['equity'] }
      ];

      databaseAdapter.find.mockResolvedValue(templates);

      await documentTemplateService.getTemplates({
        companyId,
        tags: ['equity']
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.objectContaining({ tags: { $in: ['equity'] } }),
        expect.any(Object)
      );
    });

    it('should filter by isActive status', async () => {
      const companyId = generateObjectId();

      databaseAdapter.find.mockResolvedValue([]);

      await documentTemplateService.getTemplates({
        companyId,
        isActive: true
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.objectContaining({ isActive: true }),
        expect.any(Object)
      );
    });
  });

  describe('getTemplateById', () => {
    it('should return a template by ID', async () => {
      const templateId = generateObjectId();
      const template = {
        _id: templateId,
        name: 'Test Template',
        category: 'Legal'
      };

      databaseAdapter.findById.mockResolvedValue(template);

      const result = await documentTemplateService.getTemplateById(templateId);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('DocumentTemplate', templateId);
      expect(result).toEqual(template);
    });

    it('should return null if template not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      const result = await documentTemplateService.getTemplateById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      const templateId = generateObjectId();
      const updateData = {
        name: 'Updated Template Name',
        content: 'Updated content',
        updatedBy: generateObjectId()
      };

      const updatedTemplate = {
        _id: templateId,
        ...updateData
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedTemplate);

      const result = await documentTemplateService.updateTemplate(templateId, updateData);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentTemplate',
        templateId,
        expect.objectContaining(updateData),
        { new: true }
      );
      expect(result).toEqual(updatedTemplate);
    });

    it('should increment version on update', async () => {
      const templateId = generateObjectId();
      const updateData = {
        content: 'New content'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: templateId,
        version: 2
      });

      await documentTemplateService.updateTemplate(templateId, updateData);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentTemplate',
        templateId,
        expect.objectContaining({ $inc: { version: 1 } }),
        { new: true }
      );
    });

    it('should throw error if template not found', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await expect(documentTemplateService.updateTemplate('nonexistent', { name: 'New' }))
        .rejects.toThrow('Template not found');
    });
  });

  describe('deleteTemplate', () => {
    it('should soft delete a template by default', async () => {
      const templateId = generateObjectId();

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: templateId,
        isActive: false
      });

      const result = await documentTemplateService.deleteTemplate(templateId);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'DocumentTemplate',
        templateId,
        { isActive: false },
        { new: true }
      );
      expect(result.isActive).toBe(false);
    });

    it('should hard delete a template when specified', async () => {
      const templateId = generateObjectId();

      databaseAdapter.findByIdAndDelete.mockResolvedValue({
        _id: templateId,
        deleted: true
      });

      const result = await documentTemplateService.deleteTemplate(templateId, { hard: true });

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith(
        'DocumentTemplate',
        templateId
      );
      expect(result).toBeDefined();
    });

    it('should throw error if template not found', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await expect(documentTemplateService.deleteTemplate('nonexistent'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('generateDocument', () => {
    it('should generate a document from a template with variables', async () => {
      const templateId = generateObjectId();
      const template = {
        _id: templateId,
        name: 'Test Template',
        content: 'Hello {{name}}, your amount is {{amount}}.',
        htmlContent: '<p>Hello <b>{{name}}</b></p>',
        variables: [
          { name: 'name', required: true },
          { name: 'amount', required: true }
        ],
        generate: jest.fn().mockReturnValue({
          content: 'Hello John, your amount is $1000.',
          htmlContent: '<p>Hello <b>John</b></p>'
        }),
        validateVariables: jest.fn().mockReturnValue({ isValid: true, missingVariables: [] })
      };

      databaseAdapter.findById.mockResolvedValue(template);

      const result = await documentTemplateService.generateDocument(templateId, {
        name: 'John',
        amount: '$1000'
      });

      expect(result.content).toBe('Hello John, your amount is $1000.');
      expect(result.htmlContent).toBe('<p>Hello <b>John</b></p>');
    });

    it('should throw error if template not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(documentTemplateService.generateDocument('nonexistent', {}))
        .rejects.toThrow('Template not found');
    });

    it('should throw error if required variables are missing', async () => {
      const templateId = generateObjectId();
      const template = {
        _id: templateId,
        content: '{{requiredVar}}',
        variables: [{ name: 'requiredVar', required: true }],
        validateVariables: jest.fn().mockReturnValue({
          isValid: false,
          missingVariables: ['requiredVar']
        })
      };

      databaseAdapter.findById.mockResolvedValue(template);

      await expect(documentTemplateService.generateDocument(templateId, {}))
        .rejects.toThrow(/missing required variables/i);
    });
  });

  describe('getCategories', () => {
    it('should return all template categories', async () => {
      const result = await documentTemplateService.getCategories();

      expect(result).toContain('Legal');
      expect(result).toContain('Financial');
      expect(result).toContain('HR');
      expect(result).toContain('Corporate');
      expect(result).toContain('Compliance');
      expect(result).toContain('Investment');
      expect(result).toContain('General');
    });
  });

  describe('getCategoriesWithCounts', () => {
    it('should return categories with template counts', async () => {
      const companyId = generateObjectId();

      databaseAdapter.find.mockResolvedValue([
        { category: 'Legal' },
        { category: 'Legal' },
        { category: 'Financial' }
      ]);

      const result = await documentTemplateService.getCategoriesWithCounts(companyId);

      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ category: 'Legal', count: expect.any(Number) }),
        expect.objectContaining({ category: 'Financial', count: expect.any(Number) })
      ]));
    });
  });

  describe('previewTemplate', () => {
    it('should generate a preview with sample values', async () => {
      const templateId = generateObjectId();
      const template = {
        _id: templateId,
        content: 'Amount: {{amount}}',
        variables: [
          { name: 'amount', sampleValue: '$10,000' }
        ],
        preview: jest.fn().mockReturnValue({
          content: 'Amount: $10,000'
        })
      };

      databaseAdapter.findById.mockResolvedValue(template);

      const result = await documentTemplateService.previewTemplate(templateId);

      expect(result.content).toBe('Amount: $10,000');
    });

    it('should throw error if template not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(documentTemplateService.previewTemplate('nonexistent'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('cloneTemplate', () => {
    it('should clone a template with a new name', async () => {
      const sourceTemplateId = generateObjectId();
      const sourceTemplate = {
        _id: sourceTemplateId,
        templateId: 'TMPL-SOURCE',
        companyId: generateObjectId(),
        name: 'Original Template',
        category: 'Legal',
        content: 'Original content',
        variables: [],
        tags: ['original']
      };

      const clonedTemplate = {
        _id: generateObjectId(),
        templateId: 'TMPL-CLONE123',
        name: 'Copy of Original Template',
        category: 'Legal',
        content: 'Original content',
        version: 1
      };

      databaseAdapter.findById.mockResolvedValue(sourceTemplate);
      databaseAdapter.create.mockResolvedValue(clonedTemplate);

      const result = await documentTemplateService.cloneTemplate(sourceTemplateId, {
        name: 'Copy of Original Template',
        createdBy: generateObjectId()
      });

      expect(databaseAdapter.create).toHaveBeenCalled();
      expect(result.version).toBe(1);
    });
  });

  describe('searchTemplates', () => {
    it('should search templates by name', async () => {
      const companyId = generateObjectId();
      const searchTerm = 'option';

      databaseAdapter.find.mockResolvedValue([
        { _id: '1', name: 'Stock Option Agreement' }
      ]);

      const result = await documentTemplateService.searchTemplates(companyId, searchTerm);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentTemplate',
        expect.objectContaining({
          companyId,
          $or: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) })
          ])
        }),
        expect.any(Object)
      );
      expect(result.templates).toHaveLength(1);
    });
  });
});
