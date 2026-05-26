'use strict';

/**
 * Audit Log Service
 * Phase 5: Audit logging for all role-gated actions
 *
 * Logs every significant action with: who, what, when, resource, outcome.
 * Writes to ZeroDB 'audit_logs' table. Designed to be fire-and-forget safe
 * so audit failures never break primary request flows.
 */

const { v4: uuidv4 } = require('uuid');
const zerodbService = require('./zerodbService');

const TABLE_NAME = 'audit_logs';
const DEFAULT_LIMIT = 50;

/**
 * Log a significant action to the audit_logs table.
 *
 * @param {Object} params
 * @param {string}  params.userId     - ID of the acting user
 * @param {string}  params.userRole   - Role of the acting user
 * @param {string}  [params.companyId]  - Company context
 * @param {string}  params.action     - e.g. 'login', 'view_investor_db', 'create_equity_grant'
 * @param {string}  params.resource   - e.g. 'auth', 'equity_grant', 'document'
 * @param {string}  [params.resourceId] - ID of the specific resource acted on
 * @param {string}  params.outcome    - 'success' | 'denied' | 'error'
 * @param {Object}  [params.metadata] - Any additional context
 * @param {Object}  [params.req]      - Express request object (for IP / user-agent)
 * @returns {Promise<void>}
 */
async function logAction({
  userId,
  userRole,
  companyId,
  action,
  resource,
  resourceId,
  outcome,
  metadata,
  req
} = {}) {
  try {
    const ipAddress = req ? (req.ip || null) : null;
    const userAgent = req ? (req.headers && req.headers['user-agent']) || null : null;

    const rowData = {
      logId: uuidv4(),
      timestamp: new Date().toISOString(),
      userId: userId || null,
      userRole: userRole || null,
      companyId: companyId || null,
      action: action || null,
      resource: resource || null,
      resourceId: resourceId || null,
      outcome: outcome || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress,
      userAgent
    };

    await zerodbService.insertRow(TABLE_NAME, rowData);
  } catch (err) {
    // Never let audit logging break the primary flow
    console.warn('[auditLogService] Failed to write audit log:', err.message);
  }
}

/**
 * Query audit logs with optional filters.
 *
 * @param {Object} params
 * @param {string}  [params.companyId]
 * @param {string}  [params.userId]
 * @param {string}  [params.action]
 * @param {string}  [params.startDate]
 * @param {string}  [params.endDate]
 * @param {number}  [params.limit=50]
 * @param {number}  [params.skip=0]
 * @returns {Promise<Array>}
 */
async function getAuditLogs({
  companyId,
  userId,
  action,
  startDate,
  endDate,
  limit,
  skip
} = {}) {
  const filter = {};
  if (companyId) filter.companyId = companyId;
  if (userId) filter.userId = userId;
  if (action) filter.action = action;

  const queryOptions = {
    filter,
    limit: limit !== undefined ? parseInt(limit) : DEFAULT_LIMIT,
    skip: skip !== undefined ? parseInt(skip) : 0,
    sort: { timestamp: -1 }
  };

  const result = await zerodbService.queryTable(TABLE_NAME, queryOptions);

  // ZeroDB returns { data: [...] } or an array directly
  const rows = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);

  return rows.map(row => row.row_data || row);
}

/**
 * Retrieve a single audit log entry by its logId.
 *
 * @param {string} logId
 * @returns {Promise<Object|null>}
 */
async function getAuditLogById(logId) {
  const result = await zerodbService.queryTable(TABLE_NAME, {
    filter: { logId },
    limit: 1
  });

  const rows = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
  if (!rows.length) return null;

  const row = rows[0];
  return row.row_data || row;
}

module.exports = {
  logAction,
  getAuditLogs,
  getAuditLogById
};
