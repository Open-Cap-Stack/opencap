/**
 * Stakeholder Controller
 *
 * Migrated to use ZeroDB instead of MongoDB
 * Uses Stakeholder model for database operations
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const Stakeholder = require('../models/Stakeholder');
const { parsePagination } = require('../middleware/pagination');
const logger = require('../utils/logger');

/**
 * Capitalize the first letter of a string
 */
function capitalize(str) {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert underscore_case to Title Case (e.g., 'co_founder' -> 'Co Founder')
 */
function toTitleCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.split('_').map(word => capitalize(word)).join(' ');
}

/**
 * Normalize stakeholder display fields (capitalize type, role, status)
 */
function normalizeForDisplay(stakeholder) {
  if (!stakeholder) return stakeholder;
  const obj = typeof stakeholder.toObject === 'function' ? stakeholder.toObject() : { ...stakeholder };
  if (obj.type) obj.type = capitalize(obj.type);
  if (obj.role) obj.role = toTitleCase(obj.role);
  if (obj.status) obj.status = capitalize(obj.status);
  // Cap-table page compatibility: expose share count under legacy field names used by
  // the frontend (sharesHeld, shares, sharesOwned) alongside the canonical names.
  const issuedShares = obj.totalGrantedShares || 0;
  obj.sharesHeld = issuedShares;
  obj.sharesOwned = issuedShares;
  obj.shares = issuedShares;
  obj.issuedShares = issuedShares;
  return obj;
}

/**
 * Create a new stakeholder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createStakeholder = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!role || typeof role !== 'string' || !role.trim()) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Normalize enum fields to lowercase for backend model validation
    const data = { ...req.body };
    if (data.type) data.type = data.type.toLowerCase();
    if (data.role) data.role = data.role.toLowerCase().replace(/[\s-]+/g, '_');
    if (data.status) data.status = data.status.toLowerCase();

    // Use authenticated user's companyId (prevents spoofing)
    data.companyId = req.user?.companyId || data.companyId;
    if (!data.companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const stakeholder = await Stakeholder.create(data);
    res.status(201).json(normalizeForDisplay(stakeholder));
  } catch (error) {
    logger.error('Error creating stakeholder', { error: error.message });
    const isValidation = error.message && (
      error.message.includes('Invalid') ||
      error.message.includes('required') ||
      error.message.includes('must be')
    );
    return res.status(isValidation ? 400 : 500).json({
      message: error.message || 'Error creating stakeholder',
      error: error.message
    });
  }
};

/**
 * Get all stakeholders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllStakeholders = async (req, res) => {
  try {
    // Build filter from query params
    const filter = {};

    // Scope by companyId: prefer explicit query param, fall back to the
    // authenticated user's companyId so users only see their own data.
    // If no companyId is resolvable, return empty — never leak cross-company data.
    const companyId = req.query.companyId || req.user?.companyId;
    if (!companyId) return res.status(200).json([]);
    filter.companyId = companyId;

    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }
    if (req.query.role) {
      filter.role = req.query.role.toLowerCase().replace(/[\s-]+/g, '_');
    }
    if (req.query.status) {
      filter.status = req.query.status.toLowerCase();
    }

    const { limit, skip } = parsePagination(req.query);

    // By default, exclude bulk-imported VC investor records from the cap table.
    // These are served via /investor-database instead. Use ?includeInvestors=true
    // to override (e.g. for admin views that need the full list).
    // We over-fetch (10x limit) because ZeroDB doesn't support $ne and most rows
    // may be investors, then trim back to the requested limit after filtering.
    const excludeInvestors = req.query.includeInvestors !== 'true';
    const fetchLimit = excludeInvestors ? Math.max(limit * 10, 500) : limit;
    let stakeholders = await Stakeholder.find(filter, { limit: fetchLimit, skip });

    if (excludeInvestors) {
      stakeholders = stakeholders.filter(sh => {
        const role = (sh.role || '').toLowerCase();
        return role !== 'investor';
      });
    }

    // Support ?excludeRole= (comma-separated) for additional filtering.
    // Filtering is done in JS because ZeroDB's $nin support is unreliable.
    if (req.query.excludeRole) {
      const excludedRoles = req.query.excludeRole
        .toLowerCase()
        .split(',')
        .map(r => r.trim().replace(/[\s-]+/g, '_'));
      stakeholders = stakeholders.filter(sh => !excludedRoles.includes(sh.role));
    }

    // Support ?search= for client-side text search across name, email, and notes.
    // Done in JS after DB fetch since ZeroDB may not support native text search.
    const search = req.query.search;
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim().toLowerCase();
      stakeholders = stakeholders.filter(sh => {
        const name = (sh.name || '').toLowerCase();
        const email = (sh.email || '').toLowerCase();
        const notes = (sh.notes || '').toLowerCase();
        return name.includes(term) || email.includes(term) || notes.includes(term);
      });
    }

    res.status(200).json(stakeholders.map(normalizeForDisplay));
  } catch (error) {
    logger.error('Error fetching stakeholders', { error: error.message });
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
};

/**
 * Get stakeholder by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStakeholderById = async (req, res) => {
  try {
    let stakeholder = await Stakeholder.findById(req.params.id);
    if (!stakeholder) {
      stakeholder = await Stakeholder.findOne({ stakeholderId: req.params.id });
    }

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    if (stakeholder.companyId && req.user?.companyId && stakeholder.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Access denied: stakeholder belongs to another company' });
    }

    res.status(200).json({ stakeholder: normalizeForDisplay(stakeholder) });
  } catch (error) {
    logger.error('Error fetching stakeholder', { error: error.message });
    res.status(500).json({ error: 'Error fetching stakeholder' });
  }
};

/**
 * Update stakeholder by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateStakeholderById = async (req, res) => {
  try {
    // Normalize enum fields to match create path
    if (req.body.type) req.body.type = req.body.type.toLowerCase();
    if (req.body.role) req.body.role = req.body.role.toLowerCase().replace(/[\s-]+/g, '_');
    if (req.body.status) req.body.status = req.body.status.toLowerCase();

    // Verify ownership before update
    let existing = await Stakeholder.findById(req.params.id);
    if (!existing) {
      existing = await Stakeholder.findOne({ stakeholderId: req.params.id });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    if (existing.companyId && req.user?.companyId && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Access denied: stakeholder belongs to another company' });
    }

    let stakeholder = await Stakeholder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!stakeholder) {
      stakeholder = await Stakeholder.findOneAndUpdate(
        { stakeholderId: req.params.id },
        req.body,
        { new: true }
      );
    }

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ stakeholder: normalizeForDisplay(stakeholder) });
  } catch (error) {
    logger.error('Error updating stakeholder', { error: error.message });
    res.status(500).json({ error: 'Error updating stakeholder' });
  }
};

/**
 * Delete stakeholder by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteStakeholderById = async (req, res) => {
  try {
    // Verify ownership before delete
    let existing = await Stakeholder.findById(req.params.id);
    if (!existing) {
      existing = await Stakeholder.findOne({ stakeholderId: req.params.id });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    if (existing.companyId && req.user?.companyId && existing.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Access denied: stakeholder belongs to another company' });
    }

    let stakeholder = await Stakeholder.findByIdAndDelete(req.params.id);
    if (!stakeholder) {
      stakeholder = await Stakeholder.findOneAndDelete({ stakeholderId: req.params.id });
    }

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.status(200).json({ message: 'Stakeholder deleted' });
  } catch (error) {
    logger.error('Error deleting stakeholder', { error: error.message });
    res.status(500).json({ error: 'Error deleting stakeholder' });
  }
};
