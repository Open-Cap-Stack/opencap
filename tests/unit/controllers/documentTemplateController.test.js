/**
 * DocumentTemplate Controller Unit Tests
 * Issue #193: Implement Document Template System
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// Mock the service
jest.mock('../../../services/documentTemplateService', () => ({
  createTemplate: jest.fn(),
  getTemplates: jest.fn(),
  getTemplateById: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  generateDocument: jest.fn(),
  getCategories: jest.fn(),
  getCategoriesWithCounts: jest.fn(),
  previewTemplate: jest.fn(),
  cloneTemplate: jest.fn(),
  searchTemplates: jest.fn()
}));

describe('DocumentTemplateController', () => {
  let documentTemplateController;
  let documentTemplateService;
  let mockReq;
  let mockRes;

  beforeAll(() => {
    documentTemplateController = require('../../../controllers/documentTemplateController');
    documentTemplateService = require('../../../services/documentTemplateService');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { _id: new mongoose.Types.ObjectId().toString() }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createTemplate', () => {
    it('should create a new template and return 201', async () => {
      const templateData = {
        companyId: new mongoose.Types.ObjectId().toString(),
        name: 'Stock Option Agreement',
        category: 'Legal',
        content: 'Agreement between {{companyName}} and {{employeeName}}.'
      };

      const createdTemplate = {
        _id: new mongoose.Types.ObjectId().toString(),
        templateId: 'TMPL-ABC123',
        ...templateData,
        isActive: true,
        version: 1
      };

      mockReq.body = templateData;
      documentTemplateService.createTemplate.mockResolvedValue(createdTemplate);

      await documentTemplateController.createTemplate(mockReq, mockRes);

      expect(documentTemplateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...templateData,
          createdBy: mockReq.user._id
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdTemplate);
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { name: 'Incomplete Template' };

      documentTemplateService.createTemplate.mockRejectedValue(new Error('companyId is required'));

      await documentTemplateController.createTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });

  describe('getTemplates', () => {
    it('should return templates list with 200', async () => {
      const companyId = new mongoose.Types.ObjectId().toString();
      const templates = [
        { _id: '1', name: 'Template 1' },
        { _id: '2', name: 'Template 2' }
      ];

      mockReq.query = { companyId };
      documentTemplateService.getTemplates.mockResolvedValue({
        templates,
        count: 2,
        skip: 0,
        limit: 50
      });

      await documentTemplateController.getTemplates(mockReq, mockRes);

      expect(documentTemplateService.getTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ companyId })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        templates,
        count: 2
      }));
    });

    it('should pass filter parameters to service', async () => {
      mockReq.query = {
        companyId: new mongoose.Types.ObjectId().toString(),
        category: 'Legal',
        isActive: 'true',
        skip: '10',
        limit: '20'
      };

      documentTemplateService.getTemplates.mockResolvedValue({
        templates: [],
        count: 0
      });

      await documentTemplateController.getTemplates(mockReq, mockRes);

      expect(documentTemplateService.getTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Legal',
          isActive: true,
          skip: 10,
          limit: 20
        })
      );
    });

    it('should handle service errors with 500', async () => {
      mockReq.query = { companyId: new mongoose.Types.ObjectId().toString() };
      documentTemplateService.getTemplates.mockRejectedValue(new Error('Database error'));

      await documentTemplateController.getTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTemplateById', () => {
    it('should return a template with 200', async () => {
      const templateId = new mongoose.Types.ObjectId().toString();
      const template = {
        _id: templateId,
        name: 'Test Template'
      };

      mockReq.params.id = templateId;
      documentTemplateService.getTemplateById.mockResolvedValue(template);

      await documentTemplateController.getTemplateById(mockReq, mockRes);

      expect(documentTemplateService.getTemplateById).toHaveBeenCalledWith(templateId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(template);
    });

    it('should return 404 if template not found', async () => {
      mockReq.params.id = 'nonexistent';
      documentTemplateService.getTemplateById.mockResolvedValue(null);

      await documentTemplateController.getTemplateById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/not found/i)
      }));
    });
  });

  describe('updateTemplate', () => {
    it('should update a template and return 200', async () => {
      const templateId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        name: 'Updated Template Name',
        content: 'Updated content'
      };

      const updatedTemplate = {
        _id: templateId,
        ...updateData,
        version: 2
      };

      mockReq.params.id = templateId;
      mockReq.body = updateData;
      documentTemplateService.updateTemplate.mockResolvedValue(updatedTemplate);

      await documentTemplateController.updateTemplate(mockReq, mockRes);

      expect(documentTemplateService.updateTemplate).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({
          ...updateData,
          updatedBy: mockReq.user._id
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedTemplate);
    });

    it('should return 404 if template not found', async () => {
      mockReq.params.id = 'nonexistent';
      mockReq.body = { name: 'New Name' };
      documentTemplateService.updateTemplate.mockRejectedValue(new Error('Template not found'));

      await documentTemplateController.updateTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteTemplate', () => {
    it('should soft delete a template and return 200', async () => {
      const templateId = new mongoose.Types.ObjectId().toString();

      mockReq.params.id = templateId;
      documentTemplateService.deleteTemplate.mockResolvedValue({
        _id: templateId,
        isActive: false
      });

      await documentTemplateController.deleteTemplate(mockReq, mockRes);

      expect(documentTemplateService.deleteTemplate).toHaveBeenCalledWith(templateId, { hard: false });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should hard delete when query param is set', async () => {
      const templateId = new mongoose.Types.ObjectId().toString();

      mockReq.params.id = templateId;
      mockReq.query.hard = 'true';
      documentTemplateService.deleteTemplate.mockResolvedValue({
        deleted: true
      });

      await documentTemplateController.deleteTemplate(mockReq, mockRes);

      expect(documentTemplateService.deleteTemplate).toHaveBeenCalledWith(templateId, { hard: true });
    });

    it('should return 404 if template not found', async () => {
      mockReq.params.id = 'nonexistent';
      documentTemplateService.deleteTemplate.mockRejectedValue(new Error('Template not found'));

      await documentTemplateController.deleteTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('generateDocument', () => {
    it('should generate a document from template with 200', async () => {
      const templateId = new mongoose.Types.ObjectId().toString();
      const variables = {
        companyName: 'ACME Corp',
        employeeName: 'John Doe'
      };

      const generatedDoc = {
        content: 'Agreement between ACME Corp and John Doe.',
        htmlContent: '<p>Agreement between ACME Corp and John Doe.</p>'
      };

      mockReq.params.id = templateId;
      mockReq.body = { variables };
      documentTemplateService.generateDocument.mockResolvedValue(generatedDoc);

      await documentTemplateController.generateDocument(mockReq, mockRes);

      expect(documentTemplateService.generateDocument).toHaveBeenCalledWith(templateId, variables);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(generatedDoc);
    });

    it('should return 404 if template not found', async () => {
      mockReq.params.id = 'nonexistent';
      mockReq.body = { variables: {} };
      documentTemplateService.generateDocument.mockRejectedValue(new Error('Template not found'));

      await documentTemplateController.generateDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if required variables are missing', async () => {
      mockReq.params.id = new mongoose.Types.ObjectId().toString();
      mockReq.body = { variables: {} };
      documentTemplateService.generateDocument.mockRejectedValue(
        new Error('Missing required variables: companyName')
      );

      await documentTemplateController.generateDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCategories', () => {
    it('should return all categories with 200', async () => {
      const categories = ['Legal', 'Financial', 'HR', 'Corporate', 'Compliance', 'Investment', 'General'];

      documentTemplateService.getCategories.mockResolvedValue(categories);

      await documentTemplateController.getCategories(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ categories });
    });

    it('should return categories with counts when companyId provided', async () => {
      const companyId = new mongoose.Types.ObjectId().toString();
      mockReq.query.companyId = companyId;

      const categoriesWithCounts = [
        { category: 'Legal', count: 5 },
        { category: 'Financial', count: 3 }
      ];

      documentTemplateService.getCategoriesWithCounts.mockResolvedValue(categoriesWithCounts);

      await documentTemplateController.getCategories(mockReq, mockRes);

      expect(documentTemplateService.getCategoriesWithCounts).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('previewTemplate', () => {
    it('should return preview with 200', async () => {
      const templateId = new mongoose.Types.ObjectId().toString();
      const preview = {
        content: 'Amount: $10,000'
      };

      mockReq.params.id = templateId;
      documentTemplateService.previewTemplate.mockResolvedValue(preview);

      await documentTemplateController.previewTemplate(mockReq, mockRes);

      expect(documentTemplateService.previewTemplate).toHaveBeenCalledWith(templateId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(preview);
    });

    it('should return 404 if template not found', async () => {
      mockReq.params.id = 'nonexistent';
      documentTemplateService.previewTemplate.mockRejectedValue(new Error('Template not found'));

      await documentTemplateController.previewTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cloneTemplate', () => {
    it('should clone a template and return 201', async () => {
      const sourceTemplateId = new mongoose.Types.ObjectId().toString();
      const clonedTemplate = {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Copy of Original Template',
        version: 1
      };

      mockReq.params.id = sourceTemplateId;
      mockReq.body = { name: 'Copy of Original Template' };
      documentTemplateService.cloneTemplate.mockResolvedValue(clonedTemplate);

      await documentTemplateController.cloneTemplate(mockReq, mockRes);

      expect(documentTemplateService.cloneTemplate).toHaveBeenCalledWith(
        sourceTemplateId,
        expect.objectContaining({
          name: 'Copy of Original Template',
          createdBy: mockReq.user._id
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(clonedTemplate);
    });
  });

  describe('searchTemplates', () => {
    it('should search templates and return 200', async () => {
      const companyId = new mongoose.Types.ObjectId().toString();
      const searchResults = {
        templates: [{ _id: '1', name: 'Stock Option Agreement' }],
        count: 1,
        searchTerm: 'stock'
      };

      mockReq.query = { companyId, q: 'stock' };
      documentTemplateService.searchTemplates.mockResolvedValue(searchResults);

      await documentTemplateController.searchTemplates(mockReq, mockRes);

      expect(documentTemplateService.searchTemplates).toHaveBeenCalledWith(
        companyId,
        'stock',
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(searchResults);
    });

    it('should return 400 if search term is missing', async () => {
      mockReq.query = { companyId: new mongoose.Types.ObjectId().toString() };

      await documentTemplateController.searchTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringMatching(/search term/i)
      }));
    });
  });
});
