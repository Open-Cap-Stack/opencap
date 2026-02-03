/**
 * InvestorCommunicationTemplate Model
 * Issue #91: Build Investor Communication System
 *
 * Stores reusable templates for investor communications.
 * Supports variable substitution using {{variable}} syntax.
 */
const mongoose = require('mongoose');

const COMMUNICATION_TYPES = [
  'quarterly_update',
  'annual_report',
  'document_notification',
  'portal_announcement',
  'funding_update',
  'general'
];

const VariableDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  defaultValue: {
    type: String
  },
  required: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const InvestorCommunicationTemplateSchema = new mongoose.Schema({
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
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  communicationType: {
    type: String,
    required: [true, 'communicationType is required'],
    enum: {
      values: COMMUNICATION_TYPES,
      message: `communicationType must be one of: ${COMMUNICATION_TYPES.join(', ')}`
    }
  },
  subject: {
    type: String,
    required: [true, 'subject is required'],
    trim: true,
    maxlength: [500, 'Subject cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'content is required'],
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  htmlContent: {
    type: String,
    maxlength: [100000, 'HTML content cannot exceed 100000 characters']
  },
  variables: [VariableDefinitionSchema],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
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
InvestorCommunicationTemplateSchema.index({ templateId: 1 }, { unique: true });
InvestorCommunicationTemplateSchema.index({ companyId: 1, communicationType: 1, isActive: 1 });
InvestorCommunicationTemplateSchema.index({ companyId: 1, isDefault: 1 });

// Pre-save middleware to generate templateId if not provided
InvestorCommunicationTemplateSchema.pre('save', function(next) {
  if (!this.templateId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.templateId = `TPL-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Method to extract variables from content
InvestorCommunicationTemplateSchema.methods.extractVariables = function() {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set();
  let match;

  while ((match = regex.exec(this.subject)) !== null) {
    variables.add(match[1].trim());
  }

  while ((match = regex.exec(this.content)) !== null) {
    variables.add(match[1].trim());
  }

  if (this.htmlContent) {
    while ((match = regex.exec(this.htmlContent)) !== null) {
      variables.add(match[1].trim());
    }
  }

  return Array.from(variables);
};

// Method to process template with variables
InvestorCommunicationTemplateSchema.methods.process = function(variables) {
  const processText = (text) => {
    if (!text) return text;
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim();
      // Support nested object access (e.g., quarter.number)
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
    subject: processText(this.subject),
    content: processText(this.content),
    htmlContent: processText(this.htmlContent)
  };
};

const InvestorCommunicationTemplate = mongoose.model('InvestorCommunicationTemplate', InvestorCommunicationTemplateSchema);

module.exports = InvestorCommunicationTemplate;
module.exports.COMMUNICATION_TYPES = COMMUNICATION_TYPES;
