/**
 * DocumentTemplate Model Unit Tests
 * Issue #193: Implement Document Template System
 * Rewritten for ZeroDB model compatibility
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  projectId: 'test-project'
}));

describe('DocumentTemplate Model', () => {
  let DocumentTemplate;

  beforeAll(() => {
    jest.resetModules();
    DocumentTemplate = require('../../../models/DocumentTemplate');
  });

  describe('Schema Validation', () => {
    it('should have required fields defined', () => {
      const schema = DocumentTemplate.schema;

      expect(schema.templateId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.category).toBeDefined();
      expect(schema.content).toBeDefined();
    });

    it('should have correct enum values for category', () => {
      const enumValues = DocumentTemplate.schema.category.enum;

      expect(enumValues).toContain('Legal');
      expect(enumValues).toContain('Financial');
      expect(enumValues).toContain('HR');
      expect(enumValues).toContain('Corporate');
      expect(enumValues).toContain('Compliance');
      expect(enumValues).toContain('Investment');
      expect(enumValues).toContain('General');
    });

    it('should have variables array for template placeholders', () => {
      expect(DocumentTemplate.schema.variables).toBeDefined();
      expect(DocumentTemplate.schema.variables.type).toBe('array');
    });

    it('should have isActive field with default value true', () => {
      expect(DocumentTemplate.schema.isActive).toBeDefined();
      expect(DocumentTemplate.schema.isActive.default).toBe(true);
    });

    it('should have htmlContent field for rich content', () => {
      expect(DocumentTemplate.schema.htmlContent).toBeDefined();
    });

    it('should have description field', () => {
      expect(DocumentTemplate.schema.description).toBeDefined();
    });

    it('should have createdBy and updatedBy fields', () => {
      expect(DocumentTemplate.schema.createdBy).toBeDefined();
      expect(DocumentTemplate.schema.updatedBy).toBeDefined();
    });

    it('should have version field for template versioning', () => {
      expect(DocumentTemplate.schema.version).toBeDefined();
      expect(DocumentTemplate.schema.version.default).toBe(1);
    });

    it('should have tags array for categorization', () => {
      expect(DocumentTemplate.schema.tags).toBeDefined();
      expect(DocumentTemplate.schema.tags.type).toBe('array');
    });

    it('should have metadata field for additional properties', () => {
      expect(DocumentTemplate.schema.metadata).toBeDefined();
    });
  });

  describe('Field Properties', () => {
    it('should require templateId', () => {
      expect(DocumentTemplate.schema.templateId.required).toBe(true);
    });

    it('should require companyId', () => {
      expect(DocumentTemplate.schema.companyId.required).toBe(true);
    });

    it('should require name', () => {
      expect(DocumentTemplate.schema.name.required).toBe(true);
    });

    it('should require category', () => {
      expect(DocumentTemplate.schema.category.required).toBe(true);
    });

    it('should require content', () => {
      expect(DocumentTemplate.schema.content.required).toBe(true);
    });

    it('should require createdBy', () => {
      expect(DocumentTemplate.schema.createdBy.required).toBe(true);
    });

    it('should have templateId marked as unique', () => {
      expect(DocumentTemplate.schema.templateId.unique).toBe(true);
    });
  });

  describe('Template Methods - extractVariables', () => {
    it('should extract variables from content', () => {
      const templateObj = {
        content: 'Company: {{companyName}}, Amount: {{investmentAmount}}, Date: {{signatureDate}}'
      };

      const variables = DocumentTemplate.extractVariables(templateObj);

      expect(variables).toContain('companyName');
      expect(variables).toContain('investmentAmount');
      expect(variables).toContain('signatureDate');
    });

    it('should extract variables from both content and htmlContent', () => {
      const templateObj = {
        content: 'Plain: {{plainVar}}',
        htmlContent: '<p>HTML: {{htmlVar}}</p>'
      };

      const variables = DocumentTemplate.extractVariables(templateObj);

      expect(variables).toContain('plainVar');
      expect(variables).toContain('htmlVar');
    });

    it('should return unique variable names', () => {
      const templateObj = {
        content: '{{name}} and {{name}} again'
      };

      const variables = DocumentTemplate.extractVariables(templateObj);
      expect(variables.filter(v => v === 'name')).toHaveLength(1);
    });
  });

  describe('Template Methods - generate', () => {
    it('should generate document with variable substitution', () => {
      const templateObj = {
        content: 'Dear {{recipientName}}, this is a document from {{companyName}}.',
        variables: []
      };

      const result = DocumentTemplate.generate(templateObj, {
        recipientName: 'John Doe',
        companyName: 'ACME Corp'
      });

      expect(result.content).toBe('Dear John Doe, this is a document from ACME Corp.');
    });

    it('should handle nested object variables', () => {
      const templateObj = {
        content: 'Company: {{company.name}}, Investment: {{investment.amount}}',
        variables: []
      };

      const result = DocumentTemplate.generate(templateObj, {
        company: { name: 'TechStart Inc' },
        investment: { amount: '$500,000' }
      });

      expect(result.content).toContain('TechStart Inc');
      expect(result.content).toContain('$500,000');
    });

    it('should use default values when variables are missing', () => {
      const templateObj = {
        content: 'Dear {{employeeName}}, welcome to our team.',
        variables: [
          { name: 'employeeName', defaultValue: 'Team Member', required: false }
        ]
      };

      const result = DocumentTemplate.generate(templateObj, {});

      expect(result.content).toContain('Team Member');
    });

    it('should generate both content and htmlContent', () => {
      const templateObj = {
        content: 'Hello {{name}}',
        htmlContent: '<p>Hello <strong>{{name}}</strong></p>',
        variables: []
      };

      const result = DocumentTemplate.generate(templateObj, { name: 'Jane Doe' });

      expect(result.content).toBe('Hello Jane Doe');
      expect(result.htmlContent).toBe('<p>Hello <strong>Jane Doe</strong></p>');
    });
  });

  describe('Template Methods - validateVariables', () => {
    it('should validate required variables are present', () => {
      const templateObj = {
        variables: [
          { name: 'companyName', required: true },
          { name: 'employeeName', required: true }
        ]
      };

      const validResult = DocumentTemplate.validateVariables(templateObj, {
        companyName: 'ACME',
        employeeName: 'John'
      });
      expect(validResult.isValid).toBe(true);

      const invalidResult = DocumentTemplate.validateVariables(templateObj, {
        companyName: 'ACME'
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.missingVariables).toContain('employeeName');
    });

    it('should pass when no required variables are missing', () => {
      const templateObj = {
        variables: [
          { name: 'optional', required: false }
        ]
      };

      const result = DocumentTemplate.validateVariables(templateObj, {});
      expect(result.isValid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
    });
  });

  describe('Template Methods - preview', () => {
    it('should create a preview with sample values', () => {
      const templateObj = {
        content: 'Amount: {{amount}}, Date: {{date}}',
        variables: [
          { name: 'amount', type: 'currency', sampleValue: '$10,000' },
          { name: 'date', type: 'date', sampleValue: '2026-01-01' }
        ]
      };

      const preview = DocumentTemplate.preview(templateObj);

      expect(preview.content).toContain('$10,000');
      expect(preview.content).toContain('2026-01-01');
    });

    it('should use default values when no sample values are provided', () => {
      const templateObj = {
        content: 'Name: {{name}}',
        variables: [
          { name: 'name', type: 'text', defaultValue: 'Default Name' }
        ]
      };

      const preview = DocumentTemplate.preview(templateObj);
      expect(preview.content).toContain('Default Name');
    });

    it('should use type-based placeholders when no sample or default values exist', () => {
      const templateObj = {
        content: 'Amount: {{amount}}',
        variables: [
          { name: 'amount', type: 'currency' }
        ]
      };

      const preview = DocumentTemplate.preview(templateObj);
      expect(preview.content).toContain('$0.00');
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

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof DocumentTemplate.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof DocumentTemplate.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof DocumentTemplate.findOne).toBe('function');
    });

    it('should have findByTemplateId method', () => {
      expect(typeof DocumentTemplate.findByTemplateId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof DocumentTemplate.findByCompany).toBe('function');
    });

    it('should have findByTags method', () => {
      expect(typeof DocumentTemplate.findByTags).toBe('function');
    });

    it('should have extractVariables method', () => {
      expect(typeof DocumentTemplate.extractVariables).toBe('function');
    });

    it('should have generate method', () => {
      expect(typeof DocumentTemplate.generate).toBe('function');
    });

    it('should have validateVariables method', () => {
      expect(typeof DocumentTemplate.validateVariables).toBe('function');
    });

    it('should have preview method', () => {
      expect(typeof DocumentTemplate.preview).toBe('function');
    });
  });
});
