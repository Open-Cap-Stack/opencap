/**
 * Investor Portal Controller
 *
 * Provides endpoints for the investor portal:
 *   - GET  /summary  — aggregate metrics (total raised, SAFE count, investor count, avg valuation cap)
 *   - POST /invite   — invite an investor to view the portal
 *   - GET  /access   — list who has portal access
 *
 * Data is stored in ZeroDB. The invite table (investor_portal_invites) is
 * auto-created on first write using the ensureTables pattern.
 */

const zerodbService = require('../services/zerodbService');
const crypto = require('crypto');

const INVITE_TABLE = 'investor_portal_invites';

let tablesEnsured = false;

/**
 * Ensure the invites table exists in ZeroDB.
 * Uses the same pattern as messageController — try createTable, ignore
 * "already exists" errors, and only attempt once per process lifecycle.
 */
async function ensureTables() {
  if (tablesEnsured) return;
  try {
    await zerodbService.createTable(INVITE_TABLE, {
      id: 'string',
      email: 'string',
      name: 'string',
      invitedBy: 'string',
      invitedByName: 'string',
      companyId: 'string',
      status: 'string',
      accessLevel: 'string',
      invitedAt: 'string',
      acceptedAt: 'string',
    });
  } catch { /* table already exists */ }
  tablesEnsured = true;
}

/**
 * Unwrap ZeroDB query results into a flat array of objects.
 */
function unwrap(result) {
  const rawData = result.data || result.rows || result || [];
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item) => {
    if (item.row_data) {
      return { ...item.row_data, id: item.row_data.id || item.row_id, row_id: item.row_id };
    }
    return item;
  });
}

// ─── GET /summary ────────────────────────────────────────────────────────────

/**
 * Aggregate investor portal metrics:
 *   - totalRaised: sum of investmentAmount across all funded/converted SAFEs
 *   - safeCount: total number of SAFEs (all statuses)
 *   - investorCount: number of unique stakeholders with role=investor
 *   - avgValuationCap: average valuationCap across SAFEs that have one
 */
exports.getSummary = async (req, res) => {
  try {
    // Fetch SAFEs from the securities table (SAFE model stores there)
    let safes = [];
    try {
      const safeResult = await zerodbService.queryRows('securities', {}, { limit: 1000 });
      safes = unwrap(safeResult);
    } catch {
      // Table may not exist yet — return zeros
    }

    // Filter to only SAFE records (they have safeId or safeType)
    const safeRecords = safes.filter(r => r.safeId || r.safeType);

    // totalRaised — sum investmentAmount for funded/converted SAFEs
    const fundedStatuses = new Set(['funded', 'converted']);
    const totalRaised = safeRecords
      .filter(s => fundedStatuses.has(s.status))
      .reduce((sum, s) => sum + (Number(s.investmentAmount) || 0), 0);

    // safeCount — all SAFE records
    const safeCount = safeRecords.length;

    // avgValuationCap — average of valuationCap where present and > 0
    const capsPresent = safeRecords
      .map(s => Number(s.valuationCap))
      .filter(v => v > 0);
    const avgValuationCap = capsPresent.length > 0
      ? Math.round(capsPresent.reduce((a, b) => a + b, 0) / capsPresent.length)
      : 0;

    // investorCount — unique stakeholders with role = investor
    let investorCount = 0;
    try {
      const stakeholderResult = await zerodbService.queryRows('stakeholders', {}, { limit: 5000 });
      const stakeholders = unwrap(stakeholderResult);
      const investorRoles = new Set(['investor']);
      const uniqueInvestors = new Set();
      stakeholders.forEach(s => {
        const role = (s.role || s.stakeholderType || '').toLowerCase();
        if (investorRoles.has(role)) {
          uniqueInvestors.add(s.stakeholderId || s._id || s.row_id);
        }
      });
      investorCount = uniqueInvestors.size;
    } catch {
      // stakeholders table may not exist
    }

    res.json({
      success: true,
      data: {
        totalRaised,
        safeCount,
        investorCount,
        avgValuationCap,
      },
    });
  } catch (error) {
    console.error('Investor portal summary error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── POST /invite ────────────────────────────────────────────────────────────

/**
 * Invite an investor to view the portal.
 * Body: { email, name?, accessLevel? }
 */
exports.inviteInvestor = async (req, res) => {
  try {
    const { email, name, accessLevel } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    await ensureTables();

    // Check for existing invite with the same email + company
    const companyId = req.user.companyId || req.user.company_id || 'default';
    let existing = [];
    try {
      const existingResult = await zerodbService.queryRows(INVITE_TABLE, { email, companyId }, { limit: 1 });
      existing = unwrap(existingResult);
    } catch { /* table may be empty */ }

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An invite for this email already exists',
        data: existing[0],
      });
    }

    const invite = {
      id: crypto.randomUUID(),
      email,
      name: name || '',
      invitedBy: req.user.userId || req.user.id,
      invitedByName: req.user.name || req.user.email || '',
      companyId,
      status: 'pending',
      accessLevel: accessLevel || 'view',
      invitedAt: new Date().toISOString(),
      acceptedAt: null,
    };

    await zerodbService.insertRow(INVITE_TABLE, invite);

    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    console.error('Investor portal invite error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET /access ─────────────────────────────────────────────────────────────

/**
 * List all users/invites that have portal access for the current company.
 */
exports.getAccessList = async (req, res) => {
  try {
    await ensureTables();

    const companyId = req.user.companyId || req.user.company_id || 'default';

    let invites = [];
    try {
      const inviteResult = await zerodbService.queryRows(INVITE_TABLE, { companyId }, { limit: 500 });
      invites = unwrap(inviteResult);
    } catch { /* table may be empty */ }

    res.json({
      success: true,
      data: invites,
      total: invites.length,
    });
  } catch (error) {
    console.error('Investor portal access list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
