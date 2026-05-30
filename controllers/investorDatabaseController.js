/**
 * Investor Database Controller
 *
 * Platform-wide VC/angel investor directory accessible to all authenticated users.
 * Investor records live in the stakeholders table with role=Investor and
 * companyId=ainative-studio. The stakeholderController excludes these from
 * per-company cap tables automatically.
 */

'use strict';

const zerodbService = require('../services/zerodbService');
const logger = require('../utils/logger');

/**
 * Parse structured fields from the notes string.
 * Notes format: "Firm Name — Type | Stage1, Stage2 | Sector1, Sector2"
 * or simpler: "Firm Name — VC/Investor"
 */
function enrichInvestorRecord(inv) {
  const enriched = { ...inv };
  const notes = (inv.notes || '').trim();

  // Parse firm from notes if not already set
  if (!enriched.firm && notes) {
    const dashIdx = notes.indexOf('—');
    const hyphenIdx = notes.indexOf(' - ');
    if (dashIdx > 0) {
      enriched.firm = notes.substring(0, dashIdx).trim();
    } else if (hyphenIdx > 0) {
      enriched.firm = notes.substring(0, hyphenIdx).trim();
    }
  }

  // Parse investor type from notes if not already set
  if (!enriched.investorType && notes) {
    const lower = notes.toLowerCase();
    if (lower.includes('angel')) enriched.investorType = 'Angel';
    else if (lower.includes('vc') || lower.includes('venture')) enriched.investorType = 'VC';
    else if (lower.includes('pe') || lower.includes('private equity')) enriched.investorType = 'PE';
    else if (lower.includes('family office')) enriched.investorType = 'Family Office';
    else if (lower.includes('corporate') || lower.includes('cvc')) enriched.investorType = 'Corporate';
    else if (lower.includes('accelerator') || lower.includes('incubator')) enriched.investorType = 'Accelerator';
    else enriched.investorType = 'Investor';
  }

  // Parse stages from notes (Pre-Seed, Seed, Series A, etc.)
  if (!enriched.stages && notes) {
    const stagePatterns = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Growth', 'Late Stage'];
    const found = stagePatterns.filter(s => notes.includes(s));
    if (found.length > 0) enriched.stages = found;
  }

  // Parse sectors from notes
  if (!enriched.sectors && notes) {
    const sectorPatterns = ['AI', 'Fintech', 'Enterprise', 'SaaS', 'Consumer', 'Health', 'Biotech',
      'Climate', 'Hardware', 'Web3', 'Crypto', 'Deeptech', 'CPG', 'D2C', 'Future of Work',
      'Generalist', 'Developer Tools', 'Security', 'Infrastructure', 'Marketplace', 'EdTech'];
    const found = sectorPatterns.filter(s => notes.toLowerCase().includes(s.toLowerCase()));
    if (found.length > 0) enriched.sectors = found;
  }

  // Extract name parts for display
  if (enriched.name && enriched.name.startsWith('/fund/')) {
    enriched.displayName = enriched.name.replace('/fund/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else if (enriched.name && enriched.name.startsWith('/angel/')) {
    enriched.displayName = enriched.name.replace('/angel/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else {
    enriched.displayName = enriched.name;
  }

  return enriched;
}

/**
 * GET /api/v1/investor-database
 * List investors with optional filtering and pagination.
 * Query params: search, type, sector, stage, limit, skip
 */
exports.listInvestors = async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const skip = Math.max(0, parseInt(req.query.skip) || 0);
    const search = (req.query.search || '').trim().toLowerCase();
    const typeFilter = (req.query.type || '').trim().toLowerCase();
    const sectorFilter = (req.query.sector || '').trim().toLowerCase();
    const stageFilter = (req.query.stage || '').trim().toLowerCase();

    // Investor directory rows are in the stakeholders table. Query by companyId
    // and role (lowercase — ZeroDB query is case-sensitive).
    const queryOptions = { filter: { companyId: 'ainative-studio', role: 'investor' }, limit, skip };

    const result = await zerodbService.queryTable('stakeholders', queryOptions);
    let rows = Array.isArray(result) ? result : (result.data || []);

    // Extract row_data from ZeroDB envelope if present
    rows = rows.map((r) => (r.row_data ? { ...r.row_data, _rowId: r.row_id } : r));

    // Only return investor-role rows (guard against filter fallback)
    rows = rows.filter((r) => {
      const role = (r.role || '').toLowerCase();
      return role === 'investor';
    });

    // Enrich each record with parsed firm, type, stages, sectors
    rows = rows.map(enrichInvestorRecord);

    // Apply text search across name, email, firm, notes, displayName
    if (search) {
      rows = rows.filter((inv) => {
        const name = (inv.displayName || inv.name || '').toLowerCase();
        const email = (inv.email || '').toLowerCase();
        const firm = (inv.firm || '').toLowerCase();
        const notes = (inv.notes || '').toLowerCase();
        return name.includes(search) || email.includes(search) || firm.includes(search) || notes.includes(search);
      });
    }

    // Apply type filter
    if (typeFilter) {
      rows = rows.filter((inv) => {
        const t = (inv.investorType || '').toLowerCase();
        return t === typeFilter;
      });
    }

    // Apply sector filter
    if (sectorFilter) {
      rows = rows.filter((inv) => {
        const sectors = (inv.sectors || []).map(s => s.toLowerCase());
        return sectors.some(s => s.includes(sectorFilter));
      });
    }

    // Apply stage filter
    if (stageFilter) {
      rows = rows.filter((inv) => {
        const stages = (inv.stages || []).map(s => s.toLowerCase());
        return stages.some(s => s.includes(stageFilter));
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
 * Return total count of investors in the directory.
 */
exports.countInvestors = async (req, res) => {
  try {
    const result = await zerodbService.queryTable('stakeholders', { filter: { companyId: 'ainative-studio', role: 'investor' }, limit: 1 });
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
      return res.status(200).json({ investor: enrichInvestorRecord(rows2[0]) });
    }

    return res.status(200).json({ investor: enrichInvestorRecord(rows[0]) });
  } catch (error) {
    logger.error('Error fetching investor by id', { error: error.message });
    return res.status(500).json({ error: 'Error fetching investor' });
  }
};
