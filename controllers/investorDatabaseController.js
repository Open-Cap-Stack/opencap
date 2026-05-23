/**
 * Investor Database Controller
 *
 * Serves system-wide VC investor records stored in the `stakeholders` table
 * with email domain @vc-import.local. No company scoping — platform-wide directory.
 * Access is gated to paid roles: admin, founder, accountant.
 *
 * Architecture note: VC investor records live in the stakeholders table identified
 * by their @vc-import.local email. The stakeholderController excludes these rows
 * so they never appear on a company cap table. This avoids a costly data migration
 * given ZeroDB's per-row API rate limits.
 */

'use strict';

const zerodbService = require('../services/zerodbService');
const logger = require('../utils/logger');

const ALLOWED_ROLES = ['admin', 'founder', 'accountant'];

function checkRole(req, res) {
  const role = req.user?.role;
  if (!role || !ALLOWED_ROLES.includes(role)) {
    res.status(403).json({
      error: 'Access denied',
      message: 'The investor database requires a paid account (founder, accountant, or admin).',
    });
    return false;
  }
  return true;
}

/**
 * GET /api/v1/investor-database
 * List investors with optional filtering and pagination.
 * Query params: search, type, sector, stage, limit, skip
 */
exports.listInvestors = async (req, res) => {
  if (!checkRole(req, res)) return;

  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const skip = Math.max(0, parseInt(req.query.skip) || 0);
    const search = (req.query.search || '').trim().toLowerCase();
    const typeFilter = (req.query.type || '').trim().toLowerCase();
    const sectorFilter = (req.query.sector || '').trim().toLowerCase();
    const stageFilter = (req.query.stage || '').trim().toLowerCase();

    // Only fetch VC import rows — identified by @vc-import.local email domain
    const queryOptions = { filter: { email: '@vc-import.local' }, limit, skip };

    const result = await zerodbService.queryTable('stakeholders', queryOptions);
    let rows = Array.isArray(result) ? result : (result.data || []);

    // Extract row_data from ZeroDB envelope if present
    rows = rows.map((r) => (r.row_data ? { ...r.row_data, _rowId: r.row_id } : r));

    // Ensure only vc-import rows are returned (guard against filter falling back to full scan)
    rows = rows.filter((r) => (r.email || '').toLowerCase().endsWith('@vc-import.local'));

    // Apply text search across name, email, firm, notes
    if (search) {
      rows = rows.filter((inv) => {
        const name = (inv.name || `${inv.firstName || ''} ${inv.lastName || ''}`).toLowerCase();
        const email = (inv.email || '').toLowerCase();
        const firm = (inv.firm || inv.company || inv.organization || '').toLowerCase();
        const notes = (inv.notes || '').toLowerCase();
        return name.includes(search) || email.includes(search) || firm.includes(search) || notes.includes(search);
      });
    }

    // Apply type filter
    if (typeFilter) {
      rows = rows.filter((inv) => {
        const t = (inv.investorType || inv.type || '').toLowerCase();
        return t === typeFilter;
      });
    }

    // Apply sector filter
    if (sectorFilter) {
      rows = rows.filter((inv) => {
        const s = (inv.sector || inv.industry || '').toLowerCase();
        return s.includes(sectorFilter);
      });
    }

    // Apply stage filter
    if (stageFilter) {
      rows = rows.filter((inv) => {
        const s = (inv.stage || inv.investorStage || inv.investmentStage || '').toLowerCase();
        return s.includes(stageFilter);
      });
    }

    const total = result.total ?? rows.length;

    return res.status(200).json({ data: rows, total, skip, limit });
  } catch (error) {
    logger.error('Error listing investors', { error: error.message });
    return res.status(500).json({ error: 'Error fetching investor database' });
  }
};

/**
 * GET /api/v1/investor-database/count
 * Return total count of investors in the table.
 */
exports.countInvestors = async (req, res) => {
  if (!checkRole(req, res)) return;

  try {
    const result = await zerodbService.queryTable('stakeholders', { filter: { email: '@vc-import.local' }, limit: 1 });
    const total = result.total ?? (Array.isArray(result) ? result.length : (result.data?.length ?? 0));
    return res.status(200).json({ count: total });
  } catch (error) {
    logger.error('Error counting investors', { error: error.message });
    return res.status(500).json({ error: 'Error counting investors' });
  }
};

/**
 * GET /api/v1/investor-database/:id
 * Get a single investor by investorId or row id.
 */
exports.getInvestorById = async (req, res) => {
  if (!checkRole(req, res)) return;

  try {
    const { id } = req.params;

    const result = await zerodbService.queryTable('stakeholders', {
      filter: { investorId: id },
      limit: 1,
    });

    let rows = Array.isArray(result) ? result : (result.data || []);
    rows = rows.map((r) => (r.row_data ? { ...r.row_data, _rowId: r.row_id } : r));

    if (rows.length === 0) {
      // Try by stakeholderId field as fallback
      const result2 = await zerodbService.queryTable('stakeholders', {
        filter: { stakeholderId: id },
        limit: 1,
      });
      let rows2 = Array.isArray(result2) ? result2 : (result2.data || []);
      rows2 = rows2.map((r) => (r.row_data ? { ...r.row_data, _rowId: r.row_id } : r));

      if (rows2.length === 0) {
        return res.status(404).json({ error: 'Investor not found' });
      }
      return res.status(200).json({ investor: rows2[0] });
    }

    return res.status(200).json({ investor: rows[0] });
  } catch (error) {
    logger.error('Error fetching investor by id', { error: error.message });
    return res.status(500).json({ error: 'Error fetching investor' });
  }
};
