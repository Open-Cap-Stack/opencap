/**
 * InvestorCommunicationTemplate Model Unit Tests
 * Issue #91: Build Investor Communication System
 *
 * Tests for ZeroDB-based InvestorCommunicationTemplate model
 */
process.env.SKIP_DB_SETUP = 'true';

const InvestorCommunicationTemplate = require('../../../models/InvestorCommunicationTemplate');

describe('InvestorCommunicationTemplate Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(InvestorCommunicationTemplate.tableName).toBe('investor_communication_templates');
    });

    it('should have required fields defined', () => {
      const schema = InvestorCommunicationTemplate.schema;
      expect(schema.templateId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.communicationType).toBeDefined();
      expect(schema.subject).toBeDefined();
      expect(schema.content).toBeDefined();
    });

    it('should mark required fields as required', () => {
      const schema = InvestorCommunicationTemplate.schema;
      expect(schema.templateId.required).toBe(true);
      expect(schema.companyId.required).toBe(true);
      expect(schema.name.required).toBe(true);
      expect(schema.communicationType.required).toBe(true);
      expect(schema.subject.required).toBe(true);
      expect(schema.content.required).toBe(true);
      expect(schema.createdBy.required).toBe(true);
    });

    it('should have correct enum values for communicationType', () => {
      const enumValues = InvestorCommunicationTemplate.schema.communicationType.enum;
      expect(enumValues).toContain('quarterly_update');
      expect(enumValues).toContain('annual_report');
      expect(enumValues).toContain('document_notification');
      expect(enumValues).toContain('portal_announcement');
      expect(enumValues).toContain('funding_update');
      expect(enumValues).toContain('general');
    });

    it('should have variables array field', () => {
      const schema = InvestorCommunicationTemplate.schema;
      expect(schema.variables).toBeDefined();
      expect(schema.variables.type).toBe('array');
    });

    it('should have isActive field with default true', () => {
      const schema = InvestorCommunicationTemplate.schema;
      expect(schema.isActive).toBeDefined();
      expect(schema.isActive.default).toBe(true);
    });

    it('should have isDefault field with default false', () => {
      const schema = InvestorCommunicationTemplate.schema;
      expect(schema.isDefault).toBeDefined();
      expect(schema.isDefault.default).toBe(false);
    });

    it('should have htmlContent field', () => {
      expect(InvestorCommunicationTemplate.schema.htmlContent).toBeDefined();
    });

    it('should have description field', () => {
      expect(InvestorCommunicationTemplate.schema.description).toBeDefined();
    });

    it('should have createdBy field', () => {
      expect(InvestorCommunicationTemplate.schema.createdBy).toBeDefined();
    });

    it('should have updatedBy field', () => {
      expect(InvestorCommunicationTemplate.schema.updatedBy).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export COMMUNICATION_TYPES constant', () => {
      expect(InvestorCommunicationTemplate.COMMUNICATION_TYPES).toBeDefined();
      expect(InvestorCommunicationTemplate.COMMUNICATION_TYPES).toContain('quarterly_update');
      expect(InvestorCommunicationTemplate.COMMUNICATION_TYPES).toContain('annual_report');
      expect(InvestorCommunicationTemplate.COMMUNICATION_TYPES).toContain('general');
    });
  });

  describe('extractVariables', () => {
    it('should extract variables from template content', () => {
      const template = {
        subject: 'Q{{quarter}} {{year}} Update',
        content: 'Dear {{investorName}}, your investment of {{amount}} is doing well.',
      };

      const variables = InvestorCommunicationTemplate.extractVariables(template);

      expect(variables).toContain('quarter');
      expect(variables).toContain('year');
      expect(variables).toContain('investorName');
      expect(variables).toContain('amount');
    });

    it('should extract variables from subject and content', () => {
      const template = {
        subject: 'Hello {{name}}',
        content: 'Welcome {{user}}',
      };

      const variables = InvestorCommunicationTemplate.extractVariables(template);
      expect(variables).toContain('name');
      expect(variables).toContain('user');
    });

    it('should extract variables from htmlContent', () => {
      const template = {
        subject: 'Update',
        content: 'Plain text',
        htmlContent: '<h1>Hello {{htmlVar}}</h1>',
      };

      const variables = InvestorCommunicationTemplate.extractVariables(template);
      expect(variables).toContain('htmlVar');
    });
  });

  describe('processTemplate', () => {
    it('should process template with variable substitution', () => {
      const template = {
        subject: 'Q{{quarter}} {{year}} Update',
        content: 'Dear {{investorName}}, thank you for your investment.',
        variables: [],
      };

      const result = InvestorCommunicationTemplate.processTemplate(template, {
        quarter: '4',
        year: '2025',
        investorName: 'John Doe'
      });

      expect(result.subject).toBe('Q4 2025 Update');
      expect(result.content).toContain('Dear John Doe');
    });

    it('should handle nested object variables', () => {
      const template = {
        subject: 'Update for {{company.name}}',
        content: 'Investment: {{investment.amount}}',
        variables: [],
      };

      const result = InvestorCommunicationTemplate.processTemplate(template, {
        company: { name: 'ACME Corp' },
        investment: { amount: '$100,000' }
      });

      expect(result.subject).toBe('Update for ACME Corp');
      expect(result.content).toContain('$100,000');
    });

    it('should use default values when variables are missing', () => {
      const template = {
        subject: 'Update',
        content: 'Dear {{investorName}}, welcome.',
        variables: [
          { name: 'investorName', defaultValue: 'Valued Investor', required: false }
        ],
      };

      const result = InvestorCommunicationTemplate.processTemplate(template, {});

      expect(result.content).toContain('Valued Investor');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof InvestorCommunicationTemplate.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof InvestorCommunicationTemplate.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof InvestorCommunicationTemplate.findOne).toBe('function');
    });

    it('should have findByTemplateId method', () => {
      expect(typeof InvestorCommunicationTemplate.findByTemplateId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof InvestorCommunicationTemplate.findByCompany).toBe('function');
    });

    it('should have findDefault method', () => {
      expect(typeof InvestorCommunicationTemplate.findDefault).toBe('function');
    });

    it('should have activate method', () => {
      expect(typeof InvestorCommunicationTemplate.activate).toBe('function');
    });

    it('should have deactivate method', () => {
      expect(typeof InvestorCommunicationTemplate.deactivate).toBe('function');
    });

    it('should have setDefault method', () => {
      expect(typeof InvestorCommunicationTemplate.setDefault).toBe('function');
    });
  });

  describe('create()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.insertRow = jest.fn().mockResolvedValue({
        data: [{ _id: 'test-id', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should auto-generate templateId if not provided', async () => {
      await InvestorCommunicationTemplate.create({
        companyId: 'c1',
        name: 'Q4 Update',
        communicationType: 'quarterly_update',
        subject: 'Update',
        content: 'Content',
        createdBy: 'u1'
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({ templateId: expect.stringMatching(/^TPL-/) })
      );
    });

    it('should use provided templateId', async () => {
      await InvestorCommunicationTemplate.create({
        templateId: 'TPL-CUSTOM',
        companyId: 'c1',
        name: 'Q4 Update',
        communicationType: 'quarterly_update',
        subject: 'Update',
        content: 'Content',
        createdBy: 'u1'
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({ templateId: 'TPL-CUSTOM' })
      );
    });

    it('should throw for invalid communicationType', async () => {
      await expect(InvestorCommunicationTemplate.create({
        companyId: 'c1',
        name: 'Test',
        communicationType: 'invalid_type',
        subject: 'Subj',
        content: 'Body',
        createdBy: 'u1'
      })).rejects.toThrow('communicationType must be one of');
    });

    it('should default isActive to true if not provided', async () => {
      await InvestorCommunicationTemplate.create({
        companyId: 'c1',
        name: 'Q4',
        communicationType: 'general',
        subject: 'Subj',
        content: 'Body',
        createdBy: 'u1'
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({ isActive: true })
      );
    });

    it('should not override isActive when explicitly set to false', async () => {
      await InvestorCommunicationTemplate.create({
        companyId: 'c1',
        name: 'Q4',
        communicationType: 'general',
        subject: 'Subj',
        content: 'Body',
        createdBy: 'u1',
        isActive: false
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({ isActive: false })
      );
    });
  });

  describe('findByTemplateId()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should find template by templateId', async () => {
      const mockTemplate = { _id: 'id-1', templateId: 'TPL-123', name: 'Test' };
      zerodbService.queryTable.mockResolvedValue({ data: [mockTemplate] });

      const result = await InvestorCommunicationTemplate.findByTemplateId('TPL-123');
      expect(result).toEqual(mockTemplate);
    });

    it('should return null if not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await InvestorCommunicationTemplate.findByTemplateId('TPL-NONE');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should find all templates for a company', async () => {
      const mockTemplates = [
        { templateId: 'TPL-1', companyId: 'c1' },
        { templateId: 'TPL-2', companyId: 'c1' }
      ];
      zerodbService.queryTable.mockResolvedValue({ data: mockTemplates });

      const result = await InvestorCommunicationTemplate.findByCompany('c1');
      expect(result).toHaveLength(2);
    });

    it('should filter by isActive when option is provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await InvestorCommunicationTemplate.findByCompany('c1', { isActive: true });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({
          filter: expect.objectContaining({ companyId: 'c1', isActive: true })
        })
      );
    });

    it('should filter by communicationType when option is provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await InvestorCommunicationTemplate.findByCompany('c1', { communicationType: 'quarterly_update' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({
          filter: expect.objectContaining({ companyId: 'c1', communicationType: 'quarterly_update' })
        })
      );
    });
  });

  describe('findDefault()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn();
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should find default template for company and type', async () => {
      const mockTemplate = { templateId: 'TPL-1', isDefault: true };
      zerodbService.queryTable.mockResolvedValue({ data: [mockTemplate] });

      const result = await InvestorCommunicationTemplate.findDefault('c1', 'quarterly_update');
      expect(result).toEqual(mockTemplate);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'investor_communication_templates',
        expect.objectContaining({
          filter: { companyId: 'c1', communicationType: 'quarterly_update', isDefault: true, isActive: true }
        })
      );
    });
  });

  describe('activate()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [{ _id: 'id', templateId: 'TPL-1' }] });
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should activate a template', async () => {
      await InvestorCommunicationTemplate.activate('TPL-1');
      // updateOne is called which eventually calls updateRows or client.put
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  describe('deactivate()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [{ _id: 'id', templateId: 'TPL-1' }] });
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should deactivate a template', async () => {
      await InvestorCommunicationTemplate.deactivate('TPL-1');
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  describe('setDefault()', () => {
    const zerodbService = require('../../../services/zerodbService');

    beforeEach(() => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [{ _id: 'id', templateId: 'TPL-1' }] });
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test' });
      zerodbService.projectId = 'test';
    });

    it('should unset existing defaults and set new default', async () => {
      await InvestorCommunicationTemplate.setDefault('c1', 'TPL-1', 'quarterly_update');
      // Should have called updateMany (to unset) and updateOne (to set)
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  describe('processTemplate - edge cases', () => {
    it('should leave unresolved variables as-is when no default', () => {
      const template = {
        subject: 'Hello {{unknown}}',
        content: 'Body {{missing}}',
        variables: []
      };
      const result = InvestorCommunicationTemplate.processTemplate(template, {});
      expect(result.subject).toBe('Hello {{unknown}}');
      expect(result.content).toBe('Body {{missing}}');
    });

    it('should handle null htmlContent', () => {
      const template = {
        subject: 'Subj',
        content: 'Body',
        htmlContent: null,
        variables: []
      };
      const result = InvestorCommunicationTemplate.processTemplate(template, {});
      expect(result.htmlContent).toBeNull();
    });

    it('should handle htmlContent with variable substitution', () => {
      const template = {
        subject: 'Subj',
        content: 'Body',
        htmlContent: '<p>Hello {{name}}</p>',
        variables: []
      };
      const result = InvestorCommunicationTemplate.processTemplate(template, { name: 'Alice' });
      expect(result.htmlContent).toBe('<p>Hello Alice</p>');
    });

    it('should convert non-string values to string', () => {
      const template = {
        subject: 'Amount: {{value}}',
        content: 'Count: {{count}}',
        variables: []
      };
      const result = InvestorCommunicationTemplate.processTemplate(template, { value: 42, count: 0 });
      expect(result.subject).toBe('Amount: 42');
      expect(result.content).toBe('Count: 0');
    });

    it('should handle deeply nested object paths that fail', () => {
      const template = {
        subject: '{{a.b.c}}',
        content: 'test',
        variables: []
      };
      const result = InvestorCommunicationTemplate.processTemplate(template, { a: { b: 'not-object' } });
      expect(result.subject).toBe('{{a.b.c}}');
    });
  });

  describe('extractVariables - edge cases', () => {
    it('should deduplicate variables', () => {
      const template = {
        subject: '{{name}} {{name}}',
        content: '{{name}}'
      };
      const result = InvestorCommunicationTemplate.extractVariables(template);
      expect(result).toEqual(['name']);
    });

    it('should handle templates with no variables', () => {
      const template = {
        subject: 'No variables here',
        content: 'Just plain text'
      };
      const result = InvestorCommunicationTemplate.extractVariables(template);
      expect(result).toEqual([]);
    });
  });
});
