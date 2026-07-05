/**
 * Email Template Controller Tests
 *
 * Tests for email template CRUD operations.
 */

const httpMocks = require('node-mocks-http');
const emailTemplateController = require('../../../controllers/emailTemplateController');
const zerodbService = require('../../../services/zerodbService');

jest.mock('../../../services/zerodbService', () => ({
  queryRows: jest.fn(),
  insertRow: jest.fn(),
  updateRows: jest.fn(),
  deleteRowById: jest.fn()
}));

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
      const mockRows = [
        { row_id: 't1', row_data: { companyId: 'company-001', name: 'Welcome', subject: 'Hi', body: 'Hello' } },
        { row_id: 't2', row_data: { companyId: 'company-001', name: 'Invite', subject: 'Join', body: 'Please join' } }
      ];
      zerodbService.queryRows.mockResolvedValue({ data: mockRows });

      await emailTemplateController.listTemplates(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Welcome');
      expect(data[1].name).toBe('Invite');
    });

    it('should return empty array when no templates exist', async () => {
      zerodbService.queryRows.mockResolvedValue({ data: [] });

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
      zerodbService.queryRows.mockRejectedValue(new Error('DB error'));

      await emailTemplateController.listTemplates(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ---- createTemplate ----

  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
      req.body = { name: 'Welcome', subject: 'Welcome aboard', body: 'Hello there' };
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'new-1', row_data: { name: 'Welcome', subject: 'Welcome aboard', body: 'Hello there', companyId: 'company-001' } }]
      });

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(201);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          companyId: 'company-001',
          name: 'Welcome',
          subject: 'Welcome aboard',
          body: 'Hello there',
          type: 'email_template'
        })
      );
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
      zerodbService.insertRow.mockRejectedValue(new Error('DB error'));

      await emailTemplateController.createTemplate(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ---- getTemplate ----

  describe('getTemplate', () => {
    it('should return a template by ID', async () => {
      req.params = { id: 't1' };
      zerodbService.queryRows.mockResolvedValue({
        data: [{ row_id: 't1', row_data: { companyId: 'company-001', name: 'Welcome' } }]
      });

      await emailTemplateController.getTemplate(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.template.name).toBe('Welcome');
    });

    it('should return 404 when template not found', async () => {
      req.params = { id: 'nonexistent' };
      zerodbService.queryRows.mockResolvedValue({ data: [] });

      await emailTemplateController.getTemplate(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when template belongs to another company', async () => {
      req.params = { id: 't1' };
      zerodbService.queryRows.mockResolvedValue({ data: [] });

      await emailTemplateController.getTemplate(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ---- updateTemplate ----

  describe('updateTemplate', () => {
    it('should update a template successfully', async () => {
      req.params = { id: 't1' };
      req.body = { name: 'Updated', subject: 'New subject' };
      zerodbService.updateRows.mockResolvedValue({});

      await emailTemplateController.updateTemplate(req, res);

      expect(res.statusCode).toBe(200);
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          filter: { row_id: 't1' },
          update: expect.objectContaining({ name: 'Updated', subject: 'New subject' })
        })
      );
    });

    it('should return 200 even when template does not exist (no pre-check)', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { name: 'Updated' };
      zerodbService.updateRows.mockResolvedValue({});

      await emailTemplateController.updateTemplate(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 't1' };
      req.body = { name: 'Updated' };
      zerodbService.updateRows.mockRejectedValue(new Error('DB error'));

      await emailTemplateController.updateTemplate(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ---- deleteTemplate ----

  describe('deleteTemplate', () => {
    it('should delete a template successfully', async () => {
      req.params = { id: 't1' };
      zerodbService.deleteRowById.mockResolvedValue({});

      await emailTemplateController.deleteTemplate(req, res);

      expect(res.statusCode).toBe(200);
      expect(zerodbService.deleteRowById).toHaveBeenCalledWith('notifications', 't1');
    });

    it('should return 200 even when template does not exist (no pre-check)', async () => {
      req.params = { id: 'nonexistent' };
      zerodbService.deleteRowById.mockResolvedValue({});

      await emailTemplateController.deleteTemplate(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 't1' };
      zerodbService.deleteRowById.mockRejectedValue(new Error('DB error'));

      await emailTemplateController.deleteTemplate(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
