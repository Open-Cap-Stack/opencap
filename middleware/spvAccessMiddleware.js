/**
 * SPV Access Middleware
 * Issue #271: Add Investor Role Access to SPV Backend API Routes
 *
 * Provides LP membership verification for investor-role users accessing
 * SPV resources. Non-investor roles bypass this check — they are governed
 * by hasRole() upstream.
 */

const SPVInvestor = require('../models/SPVInvestor');

/**
 * Middleware that verifies an investor-role user is an LP in the requested SPV.
 *
 * Non-investor roles pass through immediately (they already cleared hasRole).
 * For investors, the middleware queries the spv_investors table by spvId and
 * the user's userId or email. If no matching LP record is found, 403 is returned.
 *
 * On success, attaches the LP record to `req.lpRecord` for downstream handlers.
 */
async function requireLPMembership(req, res, next) {
  try {
    const userRole = req.user?.role;

    // Non-investor roles skip this check — they access via hasRole already
    if (userRole !== 'investor') {
      return next();
    }

    const spvId = req.params.id;
    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const email = req.user?.email;

    if (!userId && !email) {
      return res.status(403).json({ message: 'Access denied: Unable to identify investor' });
    }

    // Query for LP records matching this investor in this SPV.
    // Check by userId first, then fall back to email.
    let lpRecords = [];

    if (userId) {
      lpRecords = await SPVInvestor.find({ spvId, userId });
    }

    if ((!lpRecords || lpRecords.length === 0) && email) {
      lpRecords = await SPVInvestor.find({ spvId, email });
    }

    if (!lpRecords || lpRecords.length === 0) {
      return res.status(403).json({ message: 'Access denied: You are not an LP in this SPV' });
    }

    // Attach the LP record for downstream use
    req.lpRecord = lpRecords[0];
    next();
  } catch (error) {
    console.error('LP membership check error:', error.message);
    return res.status(500).json({ message: 'Failed to verify LP membership', error: error.message });
  }
}

module.exports = { requireLPMembership };
