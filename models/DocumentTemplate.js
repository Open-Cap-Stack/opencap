/**
 * DocumentTemplate Model
 * Issue #193: Implement Document Template System
 *
 * Stores reusable document templates with variable placeholders.
 * Supports variable substitution using {{variable}} syntax.
 */
const mongoose = require('mongoose');

const TEMPLATE_CATEGORIES = [
  'Legal',
  'Financial',
  'HR',
  'Corporate',
  'Compliance',
  'Investment',
  'General'
];

const VARIABLE_TYPES = [
  'text',
  'number',
  'currency',
  'date',
  'boolean',
  'email',
  'phone',
  'address',
  'percentage',
  'signature'
];

const VariableDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: {
      values: VARIABLE_TYPES,
      message: `Variable type must be one of: ${VARIABLE_TYPES.join(', ')}`
    },
    default: 'text'
  },
  defaultValue: {
    type: String
  },
  sampleValue: {
    type: String
  },
  required: {
    type: Boolean,
    default: false
  },
  validation: {
    type: String
  }
}, { _id: false });

const DocumentTemplateSchema = new mongoose.Schema({
  templateId: {
    type: String,
    required: [true, 'templateId is required'],
    unique: true,
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'companyId is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'category is required'],
    enum: {
      values: TEMPLATE_CATEGORIES,
      message: `category must be one of: ${TEMPLATE_CATEGORIES.join(', ')}`
    }
  },
  content: {
    type: String,
    required: [true, 'content is required'],
    maxlength: [500000, 'Content cannot exceed 500000 characters']
  },
  htmlContent: {
    type: String,
    maxlength: [1000000, 'HTML content cannot exceed 1000000 characters']
  },
  variables: [VariableDefinitionSchema],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'createdBy is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
DocumentTemplateSchema.index({ templateId: 1 }, { unique: true });
DocumentTemplateSchema.index({ companyId: 1, category: 1, isActive: 1 });
DocumentTemplateSchema.index({ companyId: 1, isActive: 1 });
DocumentTemplateSchema.index({ tags: 1 });

// Pre-save middleware to generate templateId if not provided
DocumentTemplateSchema.pre('save', function(next) {
  if (!this.templateId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.templateId = `TMPL-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

/**
 * Extract all variable placeholders from content
 * @returns {Array<string>} Array of unique variable names
 */
DocumentTemplateSchema.methods.extractVariables = function() {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set();
  let match;

  // Extract from content
  while ((match = regex.exec(this.content)) !== null) {
    variables.add(match[1].trim());
  }

  // Reset regex lastIndex for next exec
  regex.lastIndex = 0;

  // Extract from htmlContent if present
  if (this.htmlContent) {
    while ((match = regex.exec(this.htmlContent)) !== null) {
      variables.add(match[1].trim());
    }
  }

  return Array.from(variables);
};

/**
 * Generate document with variable substitution
 * @param {Object} variables - Object with variable values
 * @returns {Object} Generated content and htmlContent
 */
DocumentTemplateSchema.methods.generate = function(variables) {
  const processText = (text) => {
    if (!text) return text;
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim();
      // Support nested object access (e.g., company.name)
      const parts = trimmedName.split('.');
      let value = variables;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          // Check variable definitions for default value
          const varDef = this.variables.find(v => v.name === trimmedName);
          return varDef && varDef.defaultValue ? varDef.defaultValue : match;
        }
      }
      return value !== undefined ? String(value) : match;
    });
  };

  return {
    content: processText(this.content),
    htmlContent: processText(this.htmlContent)
  };
};

/**
 * Validate that all required variables are provided
 * @param {Object} variables - Object with variable values
 * @returns {Object} Validation result with isValid and missingVariables
 */
DocumentTemplateSchema.methods.validateVariables = function(variables) {
  const missingVariables = [];

  for (const varDef of this.variables) {
    if (varDef.required) {
      const value = variables[varDef.name];
      if (value === undefined || value === null || value === '') {
        missingVariables.push(varDef.name);
      }
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
};

/**
 * Generate a preview with sample values
 * @returns {Object} Preview content with sample values
 */
DocumentTemplateSchema.methods.preview = function() {
  const sampleVariables = {};

  // Build sample variables object from variable definitions
  for (const varDef of this.variables) {
    if (varDef.sampleValue) {
      sampleVariables[varDef.name] = varDef.sampleValue;
    } else if (varDef.defaultValue) {
      sampleVariables[varDef.name] = varDef.defaultValue;
    } else {
      // Generate placeholder based on type
      switch (varDef.type) {
        case 'currency':
          sampleVariables[varDef.name] = '$0.00';
          break;
        case 'number':
          sampleVariables[varDef.name] = '0';
          break;
        case 'date':
          sampleVariables[varDef.name] = new Date().toISOString().split('T')[0];
          break;
        case 'percentage':
          sampleVariables[varDef.name] = '0%';
          break;
        case 'boolean':
          sampleVariables[varDef.name] = 'false';
          break;
        case 'email':
          sampleVariables[varDef.name] = 'example@email.com';
          break;
        case 'phone':
          sampleVariables[varDef.name] = '(000) 000-0000';
          break;
        default:
          sampleVariables[varDef.name] = `[${varDef.name}]`;
      }
    }
  }

  return this.generate(sampleVariables);
};

const DocumentTemplate = mongoose.model('DocumentTemplate', DocumentTemplateSchema);

module.exports = DocumentTemplate;
module.exports.TEMPLATE_CATEGORIES = TEMPLATE_CATEGORIES;
module.exports.VARIABLE_TYPES = VARIABLE_TYPES;
