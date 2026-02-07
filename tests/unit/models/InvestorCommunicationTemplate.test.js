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
});
