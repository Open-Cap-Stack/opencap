/**
 * Email Template Controller
 *
 * CRUD operations for custom email templates.
 * Templates are stored in the 'notifications' ZeroDB table with type='email_template'.
 * Scoped per company via req.user.companyId.
 */

const zerodbService = require('../services/zerodbService');

const TABLE = 'notifications';
const TYPE_FILTER = 'email_template';

// Helper: extract flat record from ZeroDB row
function flattenRow(row) {
  if (!row) return null;
  if (row.row_data) {
    return { ...row.row_data, id: row.row_id, row_id: row.row_id };
  }
  return { ...row, id: row.row_id || row._id || row.id };
}

/**
 * List all email templates for the authenticated user's company.
 */
exports.listTemplates = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const result = await zerodbService.queryRows(TABLE, {
      filters: { companyId, type: TYPE_FILTER }
    });

    const rows = result?.data || result?.rows || [];
    const templates = rows.map(flattenRow).filter(Boolean);
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error listing email templates:', error);
    res.status(500).json({ error: 'Failed to list email templates' });
  }
};

/**
 * Create a new email template.
 */
exports.createTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const { name, subject, body } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Template name is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Template subject is required' });
    if (!body || !body.trim()) return res.status(400).json({ error: 'Template body is required' });

    const now = new Date().toISOString();
    const result = await zerodbService.insertRow(TABLE, {
      companyId,
      type: TYPE_FILTER,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      createdAt: now,
      updatedAt: now,
    });

    const rows = result?.data || [];
    const template = flattenRow(rows[0]);
    res.status(201).json(template || { name, subject, body, companyId });
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
};

/**
 * Get a single email template by ID.
 */
exports.getTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const result = await zerodbService.getRow(TABLE, req.params.id);
    const template = flattenRow(result?.data || result);
    if (!template) return res.status(404).json({ error: 'Email template not found' });
    if (template.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    res.status(200).json({ template });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
};

/**
 * Update an email template by ID.
 */
exports.updateTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    // Verify ownership
    const existing = await zerodbService.getRow(TABLE, req.params.id);
    const tpl = flattenRow(existing?.data || existing);
    if (!tpl) return res.status(404).json({ error: 'Email template not found' });
    if (tpl.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    const { name, subject, body } = req.body;
    const updates = { ...tpl, updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (subject !== undefined) updates.subject = subject.trim();
    if (body !== undefined) updates.body = body.trim();

    await zerodbService.updateRow(TABLE, req.params.id, updates);
    res.status(200).json({ template: updates });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
};

/**
 * Delete an email template by ID.
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const existing = await zerodbService.getRow(TABLE, req.params.id);
    const tpl = flattenRow(existing?.data || existing);
    if (!tpl) return res.status(404).json({ error: 'Email template not found' });
    if (tpl.companyId !== companyId) return res.status(403).json({ error: 'Access denied' });

    await zerodbService.deleteRow(TABLE, req.params.id);
    res.status(200).json({ message: 'Email template deleted' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
};
