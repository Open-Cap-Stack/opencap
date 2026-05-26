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
    const { userId, companyId } = req.user;

    const query = { userId };
    if (companyId) query.companyId = companyId;

    const grants = await databaseAdapter.find('EquityGrant', query);

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
    const { userId } = req.user;

    const documents = await databaseAdapter.find('Document', { userId });

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
    const grants = await databaseAdapter.find('EquityGrant', { userId, companyId });
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
