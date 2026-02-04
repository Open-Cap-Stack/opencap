/**
 * Report Library Service
 * Issue #199: Add Report Library Categorization
 *
 * Service for managing report library including:
 * - Category management (CRUD operations)
 * - Template management (CRUD operations)
 * - Library listing with search and filtering
 * - Report sharing functionality
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

/**
 * Default report categories
 */
const DEFAULT_CATEGORIES = [
  {
    slug: 'financial',
    name: 'Financial Reports',
    description: 'Financial statements, metrics, and analysis reports',
    icon: 'chart-line',
    order: 1
  },
  {
    slug: 'compliance',
    name: 'Compliance Reports',
    description: 'Regulatory compliance and audit reports',
    icon: 'shield-check',
    order: 2
  },
  {
    slug: 'operational',
    name: 'Operational Reports',
    description: 'Operational metrics, KPIs, and performance reports',
    icon: 'cog',
    order: 3
  },
  {
    slug: 'equity',
    name: 'Equity Reports',
    description: 'Cap table, vesting, and equity-related reports',
    icon: 'pie-chart',
    order: 4
  },
  {
    slug: 'investor',
    name: 'Investor Reports',
    description: 'Investor communications and updates',
    icon: 'users',
    order: 5
  },
  {
    slug: 'custom',
    name: 'Custom Reports',
    description: 'User-defined custom reports',
    icon: 'file-plus',
    order: 99
  }
];

class ReportLibraryService {
  /**
   * Validate email format
   * @private
   */
  static _validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate field definition
   * @private
   */
  static _validateFieldDefinition(field) {
    if (!field.name || !field.label || !field.type) {
      return false;
    }
    const validTypes = ['string', 'number', 'currency', 'percentage', 'date', 'datetime', 'boolean', 'array', 'object'];
    return validTypes.includes(field.type);
  }

  // ============================================================================
  // Category Management
  // ============================================================================

  /**
   * Get all report categories
   * @param {Object} filters - Optional filters (status, etc.)
   * @returns {Array} Categories
   */
  static async getCategories(filters = {}) {
    const query = { ...filters };
    return await databaseAdapter.find('ReportCategory', query);
  }

  /**
   * Create a new category
   * @param {Object} data - Category data
   * @returns {Object} Created category
   */
  static async createCategory(data) {
    // Validate required fields
    if (!data.name || !data.slug) {
      throw new Error('Missing required fields: name and slug are required');
    }

    // Check for duplicate slug
    const existing = await databaseAdapter.findOne('ReportCategory', { slug: data.slug });
    if (existing) {
      throw new Error('Category with this slug already exists');
    }

    const categoryData = {
      ...data,
      categoryId: `CAT-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await databaseAdapter.create('ReportCategory', categoryData);
  }

  /**
   * Update an existing category
   * @param {string} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated category
   */
  static async updateCategory(categoryId, updateData) {
    const existing = await databaseAdapter.findOne('ReportCategory', { categoryId });
    if (!existing) {
      throw new Error('Category not found');
    }

    // Don't allow updating categoryId
    delete updateData.categoryId;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    return await databaseAdapter.findByIdAndUpdate(
      'ReportCategory',
      categoryId,
      updateData,
      { new: true }
    );
  }

  /**
   * Delete a category
   * @param {string} categoryId - Category ID
   * @returns {Object} Deleted category
   */
  static async deleteCategory(categoryId) {
    const existing = await databaseAdapter.findOne('ReportCategory', { categoryId });
    if (!existing) {
      throw new Error('Category not found');
    }

    // Check for associated templates
    const templates = await databaseAdapter.find('ReportTemplate', { categoryId });
    if (templates && templates.length > 0) {
      throw new Error('Cannot delete category with associated templates');
    }

    return await databaseAdapter.findByIdAndDelete('ReportCategory', categoryId);
  }

  /**
   * Get default categories
   * @returns {Array} Default categories configuration
   */
  static getDefaultCategories() {
    return DEFAULT_CATEGORIES;
  }

  /**
   * Initialize default categories if they don't exist
   * @returns {Object} Initialization result
   */
  static async initializeDefaultCategories() {
    const results = {
      created: 0,
      skipped: 0,
      categories: []
    };

    for (const defaultCat of DEFAULT_CATEGORIES) {
      const existing = await databaseAdapter.findOne('ReportCategory', { slug: defaultCat.slug });
      if (!existing) {
        const created = await this.createCategory(defaultCat);
        results.created++;
        results.categories.push(created);
      } else {
        results.skipped++;
      }
    }

    return results;
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  /**
   * Get all report templates
   * @param {Object} filters - Optional filters (categoryId, status, etc.)
   * @param {Object} options - Query options (page, limit, sort)
   * @returns {Array} Templates
   */
  static async getTemplates(filters = {}, options = {}) {
    const query = { ...filters };
    const queryOptions = {
      limit: options.limit || 50,
      skip: options.page ? (options.page - 1) * (options.limit || 50) : 0,
      sort: options.sort || { name: 1 }
    };

    return await databaseAdapter.find('ReportTemplate', query, queryOptions);
  }

  /**
   * Create a new template
   * @param {Object} data - Template data
   * @returns {Object} Created template
   */
  static async createTemplate(data) {
    // Validate required fields
    if (!data.name || !data.categoryId) {
      throw new Error('Missing required fields: name and categoryId are required');
    }

    // Verify category exists
    const category = await databaseAdapter.findOne('ReportCategory', { categoryId: data.categoryId });
    if (!category) {
      throw new Error('Category not found');
    }

    // Validate field definitions if provided
    if (data.fields && data.fields.length > 0) {
      for (const field of data.fields) {
        if (!this._validateFieldDefinition(field)) {
          throw new Error('Invalid field definition: fields must have name, label, and valid type');
        }
      }
    }

    const templateData = {
      ...data,
      templateId: `TPL-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'active',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await databaseAdapter.create('ReportTemplate', templateData);
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} Template or null
   */
  static async getTemplateById(templateId) {
    return await databaseAdapter.findOne('ReportTemplate', { templateId });
  }

  /**
   * Update an existing template
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated template
   */
  static async updateTemplate(templateId, updateData) {
    const existing = await databaseAdapter.findOne('ReportTemplate', { templateId });
    if (!existing) {
      throw new Error('Template not found');
    }

    // Don't allow updating templateId
    delete updateData.templateId;

    // Validate field definitions if being updated
    if (updateData.fields && updateData.fields.length > 0) {
      for (const field of updateData.fields) {
        if (!this._validateFieldDefinition(field)) {
          throw new Error('Invalid field definition: fields must have name, label, and valid type');
        }
      }
    }

    // Add updatedAt timestamp and increment version
    updateData.updatedAt = new Date();
    updateData.version = (existing.version || 1) + 1;

    return await databaseAdapter.findByIdAndUpdate(
      'ReportTemplate',
      templateId,
      updateData,
      { new: true }
    );
  }

  /**
   * Delete a template
   * @param {string} templateId - Template ID
   * @returns {Object} Deleted template
   */
  static async deleteTemplate(templateId) {
    const existing = await databaseAdapter.findOne('ReportTemplate', { templateId });
    if (!existing) {
      throw new Error('Template not found');
    }

    return await databaseAdapter.findByIdAndDelete('ReportTemplate', templateId);
  }

  // ============================================================================
  // Report Library
  // ============================================================================

  /**
   * Get report library with categories and templates
   * @param {Object} filters - Optional filters (search, categoryId)
   * @returns {Object} Library with categories and reports
   */
  static async getLibrary(filters = {}) {
    // Get categories
    const categories = await databaseAdapter.find('ReportCategory', { status: 'active' });

    // Build template query
    const templateQuery = { status: 'active' };

    if (filters.categoryId) {
      templateQuery.categoryId = filters.categoryId;
    }

    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' };
      templateQuery.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    const templates = await databaseAdapter.find('ReportTemplate', templateQuery, {
      sort: { name: 1 }
    });

    // Group templates by category
    const templatesByCategory = {};
    for (const template of templates) {
      if (!templatesByCategory[template.categoryId]) {
        templatesByCategory[template.categoryId] = [];
      }
      templatesByCategory[template.categoryId].push(template);
    }

    return {
      categories: categories.map(cat => ({
        ...cat,
        reportCount: (templatesByCategory[cat.categoryId] || []).length
      })),
      reports: templates,
      totalCount: templates.length
    };
  }

  // ============================================================================
  // Report Sharing
  // ============================================================================

  /**
   * Share a report with recipients
   * @param {string} reportId - Report ID
   * @param {Object} shareData - Share data (recipients, permissions, expiresAt, message)
   * @returns {Object} Created share
   */
  static async shareReport(reportId, shareData) {
    // Verify report exists (check both generated reports and templates)
    const report = await databaseAdapter.findOne('GeneratedReport', { reportId }) ||
                   await databaseAdapter.findOne('ReportTemplate', { templateId: reportId });

    if (!report) {
      throw new Error('Report not found');
    }

    // Validate required fields
    if (!shareData.recipients || shareData.recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    // Validate email formats
    for (const email of shareData.recipients) {
      if (!this._validateEmail(email)) {
        throw new Error(`Invalid email format: ${email}`);
      }
    }

    const shareRecord = {
      shareId: `SHR-${uuidv4().slice(0, 8).toUpperCase()}`,
      reportId,
      recipients: shareData.recipients,
      permissions: shareData.permissions || ['view'],
      message: shareData.message || null,
      expiresAt: shareData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      status: 'active',
      sharedBy: shareData.sharedBy || null,
      createdAt: new Date()
    };

    return await databaseAdapter.create('ReportShare', shareRecord);
  }

  /**
   * Get all shares for a report
   * @param {string} reportId - Report ID
   * @returns {Array} Shares
   */
  static async getShares(reportId) {
    return await databaseAdapter.find('ReportShare', { reportId });
  }

  /**
   * Revoke a share
   * @param {string} shareId - Share ID
   * @returns {Object} Revoked share
   */
  static async revokeShare(shareId) {
    const existing = await databaseAdapter.findOne('ReportShare', { shareId });
    if (!existing) {
      throw new Error('Share not found');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'ReportShare',
      shareId,
      { status: 'revoked', revokedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Validate share access for a user
   * @param {string} shareId - Share ID
   * @param {string} email - User email
   * @returns {boolean} Whether access is valid
   */
  static async validateShareAccess(shareId, email) {
    const share = await databaseAdapter.findOne('ReportShare', { shareId });

    if (!share) {
      return false;
    }

    // Check if share is active
    if (share.status !== 'active') {
      return false;
    }

    // Check if share has expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return false;
    }

    // Check if email is in recipients
    if (!share.recipients.includes(email)) {
      return false;
    }

    return true;
  }
}

module.exports = ReportLibraryService;
