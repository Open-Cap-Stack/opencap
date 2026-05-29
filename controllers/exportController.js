/**
 * Export Controller
 *
 * Generates CSV/XLSX downloads for cap table, stakeholders, and documents.
 * Queries ZeroDB via the databaseAdapter abstraction layer.
 */

const databaseAdapter = require('../services/databaseAdapter');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a value for safe inclusion in a CSV cell.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 */
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of row objects into a CSV string.
 * @param {string[]} columns - Header names (display labels).
 * @param {string[]} keys    - Property keys matching each column.
 * @param {Object[]} rows    - Data rows.
 * @returns {string} CSV content including header row.
 */
function buildCsv(columns, keys, rows) {
  const header = columns.map(csvEscape).join(',');
  const body = rows.map(row =>
    keys.map(k => csvEscape(row[k])).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

/**
 * Send a CSV (or simple CSV-as-xlsx) file response.
 */
function sendCsvResponse(res, filename, csvContent, format) {
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
  // For true XLSX generation a library such as exceljs would be required.
  // As specified, XLSX currently returns the same CSV payload.
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
  return res.status(200).send(csvContent);
}

/**
 * Validate the format query parameter. Returns 'csv' or 'xlsx'.
 */
function resolveFormat(query) {
  const fmt = (query.format || 'csv').toLowerCase();
  if (fmt !== 'csv' && fmt !== 'xlsx') return 'csv';
  return fmt;
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/exports/cap-table?format=csv|xlsx
 *
 * Columns: Stakeholder, Email, Role, Type, Share Class, Shares Held,
 *          Ownership %, Fully Diluted %
 */
async function exportCapTable(req, res) {
  try {
    const companyId = req.user?.companyId;
    const format = resolveFormat(req.query);

    // Fetch stakeholders and share classes in parallel
    const stakeholderQuery = companyId ? { companyId } : {};
    const shareClassQuery = companyId ? { companyId } : {};

    const [stakeholders, shareClasses] = await Promise.all([
      databaseAdapter.find('Stakeholder', stakeholderQuery),
      databaseAdapter.find('ShareClass', shareClassQuery),
    ]);

    // Build a quick lookup of share class id -> name
    const scMap = {};
    (shareClasses || []).forEach(sc => {
      const id = sc._id || sc.row_id || sc.id;
      scMap[id] = sc.name || sc.className || id;
    });

    // Compute total shares for ownership percentages
    const totalShares = (stakeholders || []).reduce(
      (sum, s) => sum + (Number(s.sharesHeld) || Number(s.currentSharesHeld) || 0), 0
    );

    // Compute fully diluted total (includes options, warrants, etc.)
    const fullyDilutedTotal = (stakeholders || []).reduce(
      (sum, s) => sum + (Number(s.fullyDilutedShares) || Number(s.sharesHeld) || Number(s.currentSharesHeld) || 0), 0
    );

    const rows = (stakeholders || []).map(s => {
      const shares = Number(s.sharesHeld) || Number(s.currentSharesHeld) || 0;
      const fdShares = Number(s.fullyDilutedShares) || shares;
      return {
        stakeholder: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
        email: s.email || '',
        role: s.role || '',
        type: s.type || s.stakeholderType || '',
        shareClass: scMap[s.shareClassId] || s.shareClassName || '',
        sharesHeld: shares,
        ownershipPct: totalShares > 0 ? ((shares / totalShares) * 100).toFixed(2) : '0.00',
        fullyDilutedPct: fullyDilutedTotal > 0 ? ((fdShares / fullyDilutedTotal) * 100).toFixed(2) : '0.00',
      };
    });

    const columns = ['Stakeholder', 'Email', 'Role', 'Type', 'Share Class', 'Shares Held', 'Ownership %', 'Fully Diluted %'];
    const keys = ['stakeholder', 'email', 'role', 'type', 'shareClass', 'sharesHeld', 'ownershipPct', 'fullyDilutedPct'];

    const csv = buildCsv(columns, keys, rows);
    return sendCsvResponse(res, 'cap-table', csv, format);
  } catch (error) {
    console.error('exportCapTable error:', error);
    return res.status(500).json({ error: 'Failed to export cap table', details: error.message });
  }
}

/**
 * GET /api/v1/exports/stakeholders?format=csv|xlsx
 *
 * Columns: Name, Email, Role, Type, Status, Shares Held,
 *          Ownership %, Vested, Unvested, Equity Value
 */
async function exportStakeholders(req, res) {
  try {
    const companyId = req.user?.companyId;
    const format = resolveFormat(req.query);

    const query = companyId ? { companyId } : {};
    const stakeholders = await databaseAdapter.find('Stakeholder', query);

    const totalShares = (stakeholders || []).reduce(
      (sum, s) => sum + (Number(s.sharesHeld) || Number(s.currentSharesHeld) || 0), 0
    );

    const rows = (stakeholders || []).map(s => {
      const shares = Number(s.sharesHeld) || Number(s.currentSharesHeld) || 0;
      const vested = Number(s.vestedShares) || Number(s.vested) || 0;
      const unvested = Number(s.unvestedShares) || Number(s.unvested) || 0;
      return {
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
        email: s.email || '',
        role: s.role || '',
        type: s.type || s.stakeholderType || '',
        status: s.status || '',
        sharesHeld: shares,
        ownershipPct: totalShares > 0 ? ((shares / totalShares) * 100).toFixed(2) : '0.00',
        vested,
        unvested,
        equityValue: Number(s.equityValue) || 0,
      };
    });

    const columns = ['Name', 'Email', 'Role', 'Type', 'Status', 'Shares Held', 'Ownership %', 'Vested', 'Unvested', 'Equity Value'];
    const keys = ['name', 'email', 'role', 'type', 'status', 'sharesHeld', 'ownershipPct', 'vested', 'unvested', 'equityValue'];

    const csv = buildCsv(columns, keys, rows);
    return sendCsvResponse(res, 'stakeholders', csv, format);
  } catch (error) {
    console.error('exportStakeholders error:', error);
    return res.status(500).json({ error: 'Failed to export stakeholders', details: error.message });
  }
}

/**
 * GET /api/v1/exports/documents?format=csv|xlsx
 *
 * Columns: Title, Type, Category, Uploaded Date, Size, Status
 */
async function exportDocuments(req, res) {
  try {
    const companyId = req.user?.companyId;
    const format = resolveFormat(req.query);

    const query = companyId ? { companyId } : {};
    const documents = await databaseAdapter.find('Document', query);

    const rows = (documents || []).map(d => ({
      title: d.title || d.name || '',
      type: d.type || d.documentType || '',
      category: d.category || '',
      uploadedDate: d.uploadedDate || d.createdAt || d.uploadDate || '',
      size: d.size || d.fileSize || '',
      status: d.status || '',
    }));

    const columns = ['Title', 'Type', 'Category', 'Uploaded Date', 'Size', 'Status'];
    const keys = ['title', 'type', 'category', 'uploadedDate', 'size', 'status'];

    const csv = buildCsv(columns, keys, rows);
    return sendCsvResponse(res, 'documents', csv, format);
  } catch (error) {
    console.error('exportDocuments error:', error);
    return res.status(500).json({ error: 'Failed to export documents', details: error.message });
  }
}

module.exports = {
  exportCapTable,
  exportStakeholders,
  exportDocuments,
};
