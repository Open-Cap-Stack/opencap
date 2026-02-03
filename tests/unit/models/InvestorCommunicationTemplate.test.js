/**
 * InvestorCommunicationTemplate Model Unit Tests
 * Issue #91: Build Investor Communication System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

describe('InvestorCommunicationTemplate Model', () => {
  let InvestorCommunicationTemplate;

  beforeAll(() => {
    InvestorCommunicationTemplate = require('../../../models/InvestorCommunicationTemplate');
  });

  describe('Schema Validation', () => {
    it('should have required fields defined', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.templateId).toBeDefined();
      expect(schema.paths.companyId).toBeDefined();
      expect(schema.paths.name).toBeDefined();
      expect(schema.paths.communicationType).toBeDefined();
      expect(schema.paths.subject).toBeDefined();
      expect(schema.paths.content).toBeDefined();
    });

    it('should have correct enum values for communicationType', () => {
      const schema = InvestorCommunicationTemplate.schema;
      const enumValues = schema.paths.communicationType.enumValues;

      expect(enumValues).toContain('quarterly_update');
      expect(enumValues).toContain('annual_report');
      expect(enumValues).toContain('document_notification');
      expect(enumValues).toContain('portal_announcement');
      expect(enumValues).toContain('funding_update');
      expect(enumValues).toContain('general');
    });

    it('should have variables array for template placeholders', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.variables).toBeDefined();
    });

    it('should have isActive field', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.isActive).toBeDefined();
    });

    it('should have isDefault field', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.isDefault).toBeDefined();
    });

    it('should have htmlContent field for rich content', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.htmlContent).toBeDefined();
    });

    it('should have description field', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.description).toBeDefined();
    });

    it('should have createdBy field', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.createdBy).toBeDefined();
    });

    it('should have updatedBy field', () => {
      const schema = InvestorCommunicationTemplate.schema;

      expect(schema.paths.updatedBy).toBeDefined();
    });
  });

  describe('Document Creation', () => {
    it('should create a valid template document', () => {
      const templateData = {
        templateId: 'TPL-001',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Quarterly Update Template',
        communicationType: 'quarterly_update',
        subject: 'Q{{quarter}} {{year}} Quarterly Update',
        content: 'Dear {{investorName}}, here is our quarterly update...',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);

      expect(template.templateId).toBe('TPL-001');
      expect(template.name).toBe('Quarterly Update Template');
      expect(template.communicationType).toBe('quarterly_update');
    });

    it('should have default isActive of true', () => {
      const templateData = {
        templateId: 'TPL-002',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Test Template',
        communicationType: 'general',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);

      expect(template.isActive).toBe(true);
    });

    it('should have default isDefault of false', () => {
      const templateData = {
        templateId: 'TPL-003',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Test Template',
        communicationType: 'general',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);

      expect(template.isDefault).toBe(false);
    });

    it('should allow HTML content', () => {
      const templateData = {
        templateId: 'TPL-004',
        companyId: new mongoose.Types.ObjectId(),
        name: 'HTML Template',
        communicationType: 'quarterly_update',
        subject: 'Q{{quarter}} Update',
        content: 'Plain text version',
        htmlContent: '<h1>Q{{quarter}} Update</h1><p>Hello {{investorName}}</p>',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);

      expect(template.htmlContent).toContain('<h1>');
    });

    it('should allow variable definitions', () => {
      const templateData = {
        templateId: 'TPL-005',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Template with Variables',
        communicationType: 'quarterly_update',
        subject: 'Q{{quarter}} {{year}} Update',
        content: 'Dear {{investorName}}...',
        variables: [
          { name: 'quarter', description: 'Quarter number (1-4)', required: true },
          { name: 'year', description: 'Year', required: true },
          { name: 'investorName', description: 'Investor full name', defaultValue: 'Valued Investor' }
        ],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);

      expect(template.variables).toHaveLength(3);
      expect(template.variables[0].name).toBe('quarter');
      expect(template.variables[2].defaultValue).toBe('Valued Investor');
    });
  });

  describe('Template Methods', () => {
    it('should extract variables from content using extractVariables method', () => {
      const templateData = {
        templateId: 'TPL-006',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Variable Template',
        communicationType: 'quarterly_update',
        subject: 'Q{{quarter}} {{year}} Update',
        content: 'Dear {{investorName}}, your investment of {{amount}} is doing well.',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);
      const variables = template.extractVariables();

      expect(variables).toContain('quarter');
      expect(variables).toContain('year');
      expect(variables).toContain('investorName');
      expect(variables).toContain('amount');
    });

    it('should process template with variables using process method', () => {
      const templateData = {
        templateId: 'TPL-007',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Processable Template',
        communicationType: 'quarterly_update',
        subject: 'Q{{quarter}} {{year}} Update',
        content: 'Dear {{investorName}}, thank you for your investment.',
        variables: [],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);
      const result = template.process({
        quarter: '4',
        year: '2025',
        investorName: 'John Doe'
      });

      expect(result.subject).toBe('Q4 2025 Update');
      expect(result.content).toContain('Dear John Doe');
    });

    it('should handle nested object variables in process method', () => {
      const templateData = {
        templateId: 'TPL-008',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Nested Variable Template',
        communicationType: 'quarterly_update',
        subject: 'Update for {{company.name}}',
        content: 'Investment: {{investment.amount}}',
        variables: [],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);
      const result = template.process({
        company: { name: 'ACME Corp' },
        investment: { amount: '$100,000' }
      });

      expect(result.subject).toBe('Update for ACME Corp');
      expect(result.content).toContain('$100,000');
    });

    it('should use default values when variables are missing', () => {
      const templateData = {
        templateId: 'TPL-009',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Default Value Template',
        communicationType: 'quarterly_update',
        subject: 'Update',
        content: 'Dear {{investorName}}, welcome.',
        variables: [
          { name: 'investorName', defaultValue: 'Valued Investor', required: false }
        ],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new InvestorCommunicationTemplate(templateData);
      const result = template.process({});

      expect(result.content).toContain('Valued Investor');
    });
  });

  describe('Model Exports', () => {
    it('should export COMMUNICATION_TYPES constant', () => {
      expect(InvestorCommunicationTemplate.COMMUNICATION_TYPES).toBeDefined();
      expect(InvestorCommunicationTemplate.COMMUNICATION_TYPES).toContain('quarterly_update');
    });
  });
});
