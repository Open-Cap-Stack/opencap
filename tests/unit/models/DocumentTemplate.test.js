/**
 * DocumentTemplate Model Unit Tests
 * Issue #193: Implement Document Template System
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

describe('DocumentTemplate Model', () => {
  let DocumentTemplate;

  beforeAll(() => {
    DocumentTemplate = require('../../../models/DocumentTemplate');
  });

  describe('Schema Validation', () => {
    it('should have required fields defined', () => {
      const schema = DocumentTemplate.schema;

      expect(schema.paths.templateId).toBeDefined();
      expect(schema.paths.companyId).toBeDefined();
      expect(schema.paths.name).toBeDefined();
      expect(schema.paths.category).toBeDefined();
      expect(schema.paths.content).toBeDefined();
    });

    it('should have correct enum values for category', () => {
      const schema = DocumentTemplate.schema;
      const enumValues = schema.paths.category.enumValues;

      expect(enumValues).toContain('Legal');
      expect(enumValues).toContain('Financial');
      expect(enumValues).toContain('HR');
      expect(enumValues).toContain('Corporate');
      expect(enumValues).toContain('Compliance');
      expect(enumValues).toContain('Investment');
      expect(enumValues).toContain('General');
    });

    it('should have variables array for template placeholders', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.variables).toBeDefined();
    });

    it('should have isActive field with default value true', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.isActive).toBeDefined();
    });

    it('should have htmlContent field for rich content', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.htmlContent).toBeDefined();
    });

    it('should have description field', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.description).toBeDefined();
    });

    it('should have createdBy and updatedBy fields', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.createdBy).toBeDefined();
      expect(schema.paths.updatedBy).toBeDefined();
    });

    it('should have version field for template versioning', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.version).toBeDefined();
    });

    it('should have tags array for categorization', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.tags).toBeDefined();
    });

    it('should have metadata field for additional properties', () => {
      const schema = DocumentTemplate.schema;
      expect(schema.paths.metadata).toBeDefined();
    });
  });

  describe('Document Creation', () => {
    it('should create a valid template document', () => {
      const templateData = {
        templateId: 'TMPL-001',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Stock Option Agreement',
        category: 'Legal',
        content: 'This Stock Option Agreement is entered into by {{companyName}} and {{employeeName}}...',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);

      expect(template.templateId).toBe('TMPL-001');
      expect(template.name).toBe('Stock Option Agreement');
      expect(template.category).toBe('Legal');
    });

    it('should have default isActive of true', () => {
      const templateData = {
        templateId: 'TMPL-002',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Test Template',
        category: 'General',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      expect(template.isActive).toBe(true);
    });

    it('should have default version of 1', () => {
      const templateData = {
        templateId: 'TMPL-003',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Test Template',
        category: 'General',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      expect(template.version).toBe(1);
    });

    it('should allow HTML content', () => {
      const templateData = {
        templateId: 'TMPL-004',
        companyId: new mongoose.Types.ObjectId(),
        name: 'HTML Template',
        category: 'Corporate',
        content: 'Plain text version',
        htmlContent: '<h1>{{documentTitle}}</h1><p>Hello {{recipientName}}</p>',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      expect(template.htmlContent).toContain('<h1>');
    });

    it('should allow variable definitions', () => {
      const templateData = {
        templateId: 'TMPL-005',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Template with Variables',
        category: 'Financial',
        content: 'Investment of {{amount}} from {{investorName}}...',
        variables: [
          { name: 'amount', description: 'Investment amount', type: 'currency', required: true },
          { name: 'investorName', description: 'Investor full name', type: 'text', defaultValue: 'Valued Investor' }
        ],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);

      expect(template.variables).toHaveLength(2);
      expect(template.variables[0].name).toBe('amount');
      expect(template.variables[0].type).toBe('currency');
      expect(template.variables[1].defaultValue).toBe('Valued Investor');
    });

    it('should allow tags for categorization', () => {
      const templateData = {
        templateId: 'TMPL-006',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Tagged Template',
        category: 'Legal',
        content: 'Template content',
        tags: ['equity', 'option', 'employee'],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);

      expect(template.tags).toHaveLength(3);
      expect(template.tags).toContain('equity');
    });
  });

  describe('Template Methods', () => {
    it('should extract variables from content using extractVariables method', () => {
      const templateData = {
        templateId: 'TMPL-007',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Variable Template',
        category: 'Financial',
        content: 'Company: {{companyName}}, Amount: {{investmentAmount}}, Date: {{signatureDate}}',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const variables = template.extractVariables();

      expect(variables).toContain('companyName');
      expect(variables).toContain('investmentAmount');
      expect(variables).toContain('signatureDate');
    });

    it('should extract variables from both content and htmlContent', () => {
      const templateData = {
        templateId: 'TMPL-008',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Full Variable Template',
        category: 'Legal',
        content: 'Plain: {{plainVar}}',
        htmlContent: '<p>HTML: {{htmlVar}}</p>',
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const variables = template.extractVariables();

      expect(variables).toContain('plainVar');
      expect(variables).toContain('htmlVar');
    });

    it('should generate document with variable substitution using generate method', () => {
      const templateData = {
        templateId: 'TMPL-009',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Generatable Template',
        category: 'Corporate',
        content: 'Dear {{recipientName}}, this is a document from {{companyName}}.',
        variables: [],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const result = template.generate({
        recipientName: 'John Doe',
        companyName: 'ACME Corp'
      });

      expect(result.content).toBe('Dear John Doe, this is a document from ACME Corp.');
    });

    it('should handle nested object variables in generate method', () => {
      const templateData = {
        templateId: 'TMPL-010',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Nested Variable Template',
        category: 'Investment',
        content: 'Company: {{company.name}}, Investment: {{investment.amount}}',
        variables: [],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const result = template.generate({
        company: { name: 'TechStart Inc' },
        investment: { amount: '$500,000' }
      });

      expect(result.content).toContain('TechStart Inc');
      expect(result.content).toContain('$500,000');
    });

    it('should use default values when variables are missing', () => {
      const templateData = {
        templateId: 'TMPL-011',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Default Value Template',
        category: 'HR',
        content: 'Dear {{employeeName}}, welcome to our team.',
        variables: [
          { name: 'employeeName', defaultValue: 'Team Member', required: false }
        ],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const result = template.generate({});

      expect(result.content).toContain('Team Member');
    });

    it('should generate both content and htmlContent', () => {
      const templateData = {
        templateId: 'TMPL-012',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Dual Content Template',
        category: 'Corporate',
        content: 'Hello {{name}}',
        htmlContent: '<p>Hello <strong>{{name}}</strong></p>',
        variables: [],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const result = template.generate({ name: 'Jane Doe' });

      expect(result.content).toBe('Hello Jane Doe');
      expect(result.htmlContent).toBe('<p>Hello <strong>Jane Doe</strong></p>');
    });

    it('should validate required variables using validateVariables method', () => {
      const templateData = {
        templateId: 'TMPL-013',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Required Variables Template',
        category: 'Legal',
        content: '{{companyName}} agreement with {{employeeName}}',
        variables: [
          { name: 'companyName', required: true },
          { name: 'employeeName', required: true }
        ],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);

      const validResult = template.validateVariables({
        companyName: 'ACME',
        employeeName: 'John'
      });
      expect(validResult.isValid).toBe(true);

      const invalidResult = template.validateVariables({
        companyName: 'ACME'
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.missingVariables).toContain('employeeName');
    });

    it('should create a preview with sample values using preview method', () => {
      const templateData = {
        templateId: 'TMPL-014',
        companyId: new mongoose.Types.ObjectId(),
        name: 'Preview Template',
        category: 'Financial',
        content: 'Amount: {{amount}}, Date: {{date}}',
        variables: [
          { name: 'amount', type: 'currency', sampleValue: '$10,000' },
          { name: 'date', type: 'date', sampleValue: '2026-01-01' }
        ],
        createdBy: new mongoose.Types.ObjectId()
      };

      const template = new DocumentTemplate(templateData);
      const preview = template.preview();

      expect(preview.content).toContain('$10,000');
      expect(preview.content).toContain('2026-01-01');
    });
  });

  describe('Model Exports', () => {
    it('should export TEMPLATE_CATEGORIES constant', () => {
      expect(DocumentTemplate.TEMPLATE_CATEGORIES).toBeDefined();
      expect(DocumentTemplate.TEMPLATE_CATEGORIES).toContain('Legal');
      expect(DocumentTemplate.TEMPLATE_CATEGORIES).toContain('Financial');
    });

    it('should export VARIABLE_TYPES constant', () => {
      expect(DocumentTemplate.VARIABLE_TYPES).toBeDefined();
      expect(DocumentTemplate.VARIABLE_TYPES).toContain('text');
      expect(DocumentTemplate.VARIABLE_TYPES).toContain('number');
      expect(DocumentTemplate.VARIABLE_TYPES).toContain('currency');
      expect(DocumentTemplate.VARIABLE_TYPES).toContain('date');
    });
  });

  describe('Indexes', () => {
    it('should have unique index on templateId', () => {
      const schema = DocumentTemplate.schema;
      const indexes = schema.indexes();

      const templateIdIndex = indexes.find(idx =>
        idx[0] && idx[0].templateId !== undefined
      );

      expect(templateIdIndex).toBeDefined();
    });

    it('should have index on companyId and category', () => {
      const schema = DocumentTemplate.schema;
      const indexes = schema.indexes();

      const companyIndex = indexes.find(idx =>
        idx[0] && idx[0].companyId !== undefined && idx[0].category !== undefined
      );

      expect(companyIndex).toBeDefined();
    });
  });
});
