/**
 * Email Template Controller
 *
 * CRUD operations for custom email templates.
 * Templates are scoped per company via req.user.companyId.
 */

const databaseAdapter = require('../services/databaseAdapter');
const { v4: uuidv4 } = require('uuid');

const MODEL_NAME = 'EmailTemplate';

/**
 * List all email templates for the authenticated user's company.
 * GET /api/v1/email-templates
 */
exports.listTemplates = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const templates = await databaseAdapter.find(MODEL_NAME, { companyId });
    res.status(200).json(templates || []);
  } catch (error) {
    console.error('Error listing email templates:', error);
    res.status(500).json({ error: 'Failed to list email templates' });
  }
};

/**
 * Create a new email template.
 * POST /api/v1/email-templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const { name, subject, body } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Template subject is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Template body is required' });
    }

    const now = new Date().toISOString();
    const template = await databaseAdapter.create(MODEL_NAME, {
      companyId,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
};

/**
 * Get a single email template by ID.
 * GET /api/v1/email-templates/:id
 */
exports.getTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const template = await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    if (template.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
};

/**
 * Update an email template by ID.
 * PUT /api/v1/email-templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Verify template exists and belongs to the user's company
    const existing = await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    if (existing.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, subject, body } = req.body;
    const updates = { updatedAt: new Date().toISOString() };

    if (name !== undefined) updates.name = name.trim();
    if (subject !== undefined) updates.subject = subject.trim();
    if (body !== undefined) updates.body = body.trim();

    const result = await databaseAdapter.findByIdAndUpdate(MODEL_NAME, req.params.id, updates);
    res.status(200).json(result || { ...existing, ...updates });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
};

/**
 * Delete an email template by ID.
 * DELETE /api/v1/email-templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Verify template exists and belongs to the user's company
    const existing = await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    if (existing.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await databaseAdapter.findByIdAndDelete(MODEL_NAME, req.params.id);
    res.status(200).json({ message: 'Email template deleted' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
};
