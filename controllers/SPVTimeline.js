/**
 * SPV Timeline Controller
 * Issue #269: SPV Document & Timeline Backend Endpoints
 *
 * Endpoint for listing timeline events for a specific SPV.
 */

const SPVTimeline = require('../models/SPVTimeline');
const SPV = require('../models/SPV');

/**
 * Verify that the SPV exists and belongs to the requesting user's company.
 * Returns { spv, error } -- if error is truthy the handler should return early.
 */
async function verifySPVOwnership(req, res, spvId) {
  let spv = await SPV.findOne({ SPVID: spvId });
  if (!spv) {
    spv = await SPV.findById(spvId).catch(() => null);
  }
  if (!spv) {
    res.status(404).json({ message: 'SPV not found' });
    return { spv: null, error: true };
  }

  // Enforce company-level tenancy for non-admin roles
  if (req.user && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    const userCompany = req.user.companyId;
    const spvCompany = spv.ParentCompanyID || spv.companyId;
    if (!userCompany || spvCompany !== userCompany) {
      res.status(403).json({ message: 'Access denied' });
      return { spv: null, error: true };
    }
  }

  return { spv, error: false };
}

/**
 * GET /api/v1/spv/:id/timeline
 * List timeline events for a given SPV, sorted by createdAt desc.
 * Supports ?limit=N query param (default 50, max 200).
 */
exports.listEvents = async (req, res) => {
  try {
    const { id: spvId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

    // Parse and clamp limit
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200;

    const companyId = req.user?.companyId;
    const filter = companyId ? { companyId } : {};

    const events = await SPVTimeline.findBySPV(spvId, { limit });

    // Apply companyId filter if present
    const filtered = companyId
      ? events.filter(e => e.companyId === companyId)
      : events;

    res.status(200).json({ events: filtered });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list timeline events', error: error.message });
  }
};
