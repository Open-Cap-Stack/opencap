'use strict';

/**
 * Employee Self-Service Controller
 *
 * Phase 3: Employee self-service equity API
 *
 * All endpoints filter by req.user.userId — never return other users' data.
 *
 * Endpoints:
 *   GET /api/v1/me/equity      — own equity grants with vesting schedule
 *   GET /api/v1/me/documents   — own documents (offer letter, grant agreements)
 *   GET /api/v1/me/valuation   — current 409A price per share + employee share value
 *   GET /api/v1/me/profile     — own user profile
 */

const databaseAdapter = require('../services/databaseAdapter');
const Valuation409A = require('../models/Valuation409A');
const equityGrantService = require('../services/equityGrantService');
const User = require('../models/User');

// ---------------------------------------------------------------------------
// GET /api/v1/me/equity
// ---------------------------------------------------------------------------
exports.getMyEquity = async (req, res) => {
  try {
    const { userId, companyId, email } = req.user;

    // Try multiple lookup strategies to find the employee's grants:
    // 1. By userId directly (ideal case)
    // 2. By email → stakeholderId → employeeId (common case when grant uses stakeholder ID)
    let grants = [];

    const query = { userId };
    if (companyId) query.companyId = companyId;
    grants = await databaseAdapter.find('EquityGrant', query);

    // If no grants found by userId, try matching via stakeholder email
    if (grants.length === 0 && email) {
      const stakeholders = await databaseAdapter.find('Stakeholder', { email });
      for (const stk of stakeholders) {
        const stkId = stk._id || stk.row_id || stk.stakeholderId;
        if (stkId) {
          const stkGrants = await databaseAdapter.find('EquityGrant', { employeeId: stkId });
          grants.push(...stkGrants);
        }
      }
    }

    // Deduplicate by grantId
    const seen = new Set();
    grants = grants.filter(g => {
      const id = g.grantId || g._id || g.row_id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Attach vesting schedule computation to each grant
    const enrichedGrants = grants.map(grant => {
      try {
        const vestingInfo = equityGrantService.calculateVestedShares(grant, new Date());
        return { ...grant, ...vestingInfo };
      } catch {
        return grant;
      }
    });

    return res.status(200).json(enrichedGrants);
  } catch (error) {
    console.error('[employeeSelfServiceController.getMyEquity]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/me/documents
// ---------------------------------------------------------------------------
exports.getMyDocuments = async (req, res) => {
  try {
    const { userId, email } = req.user;

    // Try by userId first, then by stakeholderId (resolved from email), then by uploadedBy
    let documents = await databaseAdapter.find('Document', { userId });

    if (documents.length === 0 && email) {
      // Find stakeholder by email and look for docs by stakeholderId
      const stakeholders = await databaseAdapter.find('Stakeholder', { email });
      for (const stk of stakeholders) {
        const stkId = stk._id || stk.row_id || stk.stakeholderId;
        if (stkId) {
          const stkDocs = await databaseAdapter.find('Document', { stakeholderId: stkId });
          documents.push(...stkDocs);
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    documents = documents.filter(d => {
      const id = d._id || d.row_id || d.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return res.status(200).json(documents);
  } catch (error) {
    console.error('[employeeSelfServiceController.getMyDocuments]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/me/valuation
// ---------------------------------------------------------------------------
exports.getMyValuation = async (req, res) => {
  try {
    const { userId, companyId } = req.user;

    // Fetch the latest 409A valuation for the company
    const latestValuation = await Valuation409A.findOne(
      { companyId },
      { sort: { effectiveDate: -1 } }
    );

    if (!latestValuation) {
      return res.status(404).json({ error: 'No valuation found for this company' });
    }

    const pricePerShare = latestValuation.pricePerShare ||
      (latestValuation.fairMarketValue && latestValuation.totalShares
        ? latestValuation.fairMarketValue / latestValuation.totalShares
        : 0);

    // Calculate the employee's vested share value
    // Find grants using same multi-strategy lookup as getMyEquity
    let grants = await databaseAdapter.find('EquityGrant', { userId, companyId });
    if (grants.length === 0 && req.user.email) {
      const stakeholders = await databaseAdapter.find('Stakeholder', { email: req.user.email });
      for (const stk of stakeholders) {
        const stkId = stk._id || stk.row_id || stk.stakeholderId;
        if (stkId) {
          const stkGrants = await databaseAdapter.find('EquityGrant', { employeeId: stkId });
          grants.push(...stkGrants);
        }
      }
    }
    let totalVestedShares = 0;
    for (const grant of grants) {
      try {
        const { vestedShares } = equityGrantService.calculateVestedShares(grant, new Date());
        totalVestedShares += vestedShares || 0;
      } catch {
        // ignore individual grant computation failures
      }
    }

    const employeeShareValue = totalVestedShares * pricePerShare;

    return res.status(200).json({
      pricePerShare,
      valuationDate: latestValuation.effectiveDate,
      totalShares: latestValuation.totalShares || null,
      employeeShareValue
    });
  } catch (error) {
    console.error('[employeeSelfServiceController.getMyValuation]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/me/profile
// ---------------------------------------------------------------------------
exports.getMyProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await databaseAdapter.findOne('User', { userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strip sensitive fields
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordResetToken;
    delete safeUser.passwordResetExpires;
    delete safeUser.inviteToken;
    delete safeUser.inviteTokenExpires;

    return res.status(200).json(safeUser);
  } catch (error) {
    console.error('[employeeSelfServiceController.getMyProfile]', error.message);
    return res.status(500).json({ error: error.message });
  }
};
