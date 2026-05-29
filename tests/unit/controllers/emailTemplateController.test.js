/**
 * Email Template Controller Tests
 *
 * Tests for email template CRUD operations.
 */

const httpMocks = require('node-mocks-http');
const emailTemplateController = require('../../../controllers/emailTemplateController');
const databaseAdapter = require('../../../services/databaseAdapter');

jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

describe('EmailTemplateController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { companyId: 'company-001' };
  });

  // ---- listTemplates ----

  describe('listTemplates', () => {
    it('should return all templates for the company', async () => {
      const mockTemplates = [
        { _id: 't1', companyId: 'company-001', name: 'Welcome', subject: 'Hi', body: 'Hello' },
        { _id: 't2', companyId: 'company-001', name: 'Invite', subject: 'Join', body: 'Please join' }
      ];
      databaseAdapter.find.mockResolvedValue(mockTemplates);

      await emailTemplateController.listTemplates(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockTemplates);
      expect(databaseAdapter.find).toHaveBeenCalledWith('EmailTemplate', { companyId: 'company-001' });
    });

    it('should return empty array when no templates exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await emailTemplateController.listTemplates(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual([]);
    });

    it('should return 400 when companyId is missing', async () => {
      req.user = {};

      await emailTemplateController.listTemplates(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('DB error'));

      await emailTemplateController.listTemplates(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ---- createTemplate ----

  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
      req.body = { name: 'Welcome', subject: 'Welcome aboard', body: 'Hello there' };
      const mockResult = {
        _id: 'test-uuid-1234',
        companyId: 'company-001',
        name: 'Welcome',
        subject: 'Welcome aboard',
        body: 'Hello there'
      };
      databaseAdapter.create.mockResolvedValue(mockResult);

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('EmailTemplate', expect.objectContaining({
        _id: 'test-uuid-1234',
        companyId: 'company-001',
        name: 'Welcome',
        subject: 'Welcome aboard',
        body: 'Hello there'
      }));
    });

    it('should return 400 when name is missing', async () => {
      req.body = { subject: 'Sub', body: 'Body' };

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).error).toMatch(/name/i);
    });

    it('should return 400 when subject is missing', async () => {
      req.body = { name: 'Test', body: 'Body' };

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).error).toMatch(/subject/i);
    });

    it('should return 400 when body is missing', async () => {
      req.body = { name: 'Test', subject: 'Sub' };

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).error).toMatch(/body/i);
    });

    it('should return 400 when companyId is missing', async () => {
      req.user = {};
      req.body = { name: 'Test', subject: 'Sub', body: 'Body' };

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on database error', async () => {
      req.body = { name: 'Test', subject: 'Sub', body: 'Body' };
      databaseAdapter.create.mockRejectedValue(new Error('DB error'));

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ---- getTemplate ----

  describe('getTemplate', () => {
    it('should return a template by ID', async () => {
      req.params = { id: 't1' };
      const mockTemplate = { _id: 't1', companyId: 'company-001', name: 'Welcome' };
      databaseAdapter.findById.mockResolvedValue(mockTemplate);

      await emailTemplateController.getTemplate(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockTemplate);
    });

    it('should return 404 when template not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await emailTemplateController.getTemplate(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when template belongs to another company', async () => {
      req.params = { id: 't1' };
      databaseAdapter.findById.mockResolvedValue({ _id: 't1', companyId: 'other-company' });

      await emailTemplateController.getTemplate(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ---- updateTemplate ----

  describe('updateTemplate', () => {
    it('should update a template successfully', async () => {
      req.params = { id: 't1' };
      req.body = { name: 'Updated', subject: 'New subject' };
      const existing = { _id: 't1', companyId: 'company-001', name: 'Old', subject: 'Old sub', body: 'Body' };
      databaseAdapter.findById.mockResolvedValue(existing);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...existing, ...req.body });

      await emailTemplateController.updateTemplate(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'EmailTemplate',
        't1',
        expect.objectContaining({ name: 'Updated', subject: 'New subject' })
      );
    });

    it('should return 404 when template not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { name: 'Updated' };
      databaseAdapter.findById.mockResolvedValue(null);

      await emailTemplateController.updateTemplate(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when template belongs to another company', async () => {
      req.params = { id: 't1' };
      req.body = { name: 'Updated' };
      databaseAdapter.findById.mockResolvedValue({ _id: 't1', companyId: 'other-company' });

      await emailTemplateController.updateTemplate(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ---- deleteTemplate ----

  describe('deleteTemplate', () => {
    it('should delete a template successfully', async () => {
      req.params = { id: 't1' };
      const existing = { _id: 't1', companyId: 'company-001', name: 'Welcome' };
      databaseAdapter.findById.mockResolvedValue(existing);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(existing);

      await emailTemplateController.deleteTemplate(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('EmailTemplate', 't1');
    });

    it('should return 404 when template not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await emailTemplateController.deleteTemplate(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when template belongs to another company', async () => {
      req.params = { id: 't1' };
      databaseAdapter.findById.mockResolvedValue({ _id: 't1', companyId: 'other-company' });

      await emailTemplateController.deleteTemplate(req, res);

      expect(res.statusCode).toBe(403);
    });
  });
});
