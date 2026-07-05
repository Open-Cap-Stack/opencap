/**
 * Company-Scope Authorization Middleware
 * T0-4: Ensures users can only access data belonging to their own company.
 *
 * Extracts companyId from request (body, params, or query) and verifies it
 * matches the authenticated user's companyId from the JWT token.
 */

const logger = require('../utils/logger');

/**
 * Extract companyId from various request locations
 * @param {Object} req - Express request
 * @returns {string|null} The companyId found in the request
 */
function extractRequestCompanyId(req) {
    return (
        req.body?.companyId ||
        req.params?.companyId ||
        req.query?.companyId ||
        null
    );
}

/**
 * Middleware to verify the requesting user belongs to the company they're accessing.
 *
 * Behavior:
 * - If no companyId in request, auto-inject user's companyId into req.query
 * - If companyId in request doesn't match user's companyId, return 403
 * - Admin users bypass the check
 * - If user has no companyId (new user), allow read-only (GET) but block mutations
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowMissing - If true, don't block when no companyId in request
 * @param {boolean} options.injectCompanyId - If true, auto-inject user's companyId into req.query
 * @returns {Function} Express middleware function
 */
function verifyCompanyAccess(options = {}) {
    const { allowMissing = false, injectCompanyId = true } = options;

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin users bypass company scope check
        if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin') {
            return next();
        }

        const userCompanyId = req.user.companyId;
        const requestCompanyId = extractRequestCompanyId(req);

        // If request specifies a companyId, verify it matches the user's
        if (requestCompanyId && userCompanyId) {
            if (requestCompanyId !== userCompanyId) {
                logger.warn(`[CompanyAuth] Access denied: user ${req.user.userId} (company: ${userCompanyId}) attempted to access company ${requestCompanyId}`);
                return res.status(403).json({
                    error: 'Access denied: you do not have permission to access this company\'s data'
                });
            }
        }

        // If no companyId in request and user has one, auto-inject it
        if (!requestCompanyId && userCompanyId && injectCompanyId) {
            if (!req.query) req.query = {};
            req.query.companyId = userCompanyId;
        }

        // If user has no companyId and request has none, allow if configured
        if (!requestCompanyId && !userCompanyId && !allowMissing) {
            // Allow GET requests (read) but block mutations for users without company
            if (req.method !== 'GET') {
                return res.status(403).json({
                    error: 'Company association required to perform this action'
                });
            }
        }

        next();
    };
}

module.exports = {
    verifyCompanyAccess,
    extractRequestCompanyId
};
