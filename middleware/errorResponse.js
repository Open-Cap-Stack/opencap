/**
 * Standard error response helper
 * Provides consistent error format across all controllers
 */

// Patterns that indicate internal implementation details which must never
// be sent to the client regardless of environment.
const SENSITIVE_PATTERNS = [
  /mongo/i,
  /collection/i,
  /query/i,
  /zerodb/i,
  /postgres/i,
  /table/i,
  /column/i,
  /syntax\s+error/i,
  /ECONNREFUSED/i,
  /stack/i,
];

function sanitizeDetails(raw) {
  if (!raw) return undefined;
  const text = typeof raw === 'object' ? (raw.message || String(raw)) : String(raw);
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      // Detail string contains sensitive internals — suppress it entirely
      return undefined;
    }
  }
  return text;
}

function errorResponse(res, status, message, details = null) {
  const response = {
    success: false,
    error: {
      status,
      message
    }
  };
  if (details && process.env.NODE_ENV !== 'production') {
    const safe = sanitizeDetails(details);
    if (safe) {
      response.error.details = safe;
    }
  }
  return res.status(status).json(response);
}

/**
 * Convenience alias for errorResponse.
 *
 * Standard error format across all controllers:
 *   { success: false, error: { status, message } }
 *
 * Usage:
 *   const { sendError } = require('../middleware/errorResponse');
 *   return sendError(res, 404, 'Resource not found');
 */
const sendError = errorResponse;

module.exports = { errorResponse, sendError };
