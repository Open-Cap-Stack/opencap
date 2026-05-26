'use strict';

/**
 * Investor Readiness Score Controller
 * Issue #651: Public API + lead magnet
 *
 * Endpoints:
 *   POST /api/v1/readiness/score       — public, rate-limited (3/day per IP)
 *   POST /api/v1/readiness/score/full  — authenticated, full gap report
 *   GET  /api/v1/readiness/score/:companyId — admin/founder, scores from ZeroDB
 */

const readinessScoreService = require('../services/readinessScoreService');
const zerodbService = require('../services/zerodbService');

/**
 * POST /api/v1/readiness/score
 * Public endpoint: accepts documents array, returns limited score.
 */
async function scorePublic(req, res) {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents)) {
      return res.status(400).json({ message: 'documents array is required' });
    }

    const result = readinessScoreService.scoreDocuments(documents);

    // Public response: limited gaps, no allGaps or full breakdown details
    return res.status(200).json({
      score: result.score,
      criticalGaps: result.criticalGaps,
      upgradePrompt: result.upgradePrompt,
    });
  } catch (err) {
    console.error('[ReadinessController] scorePublic error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * POST /api/v1/readiness/score/full
 * Authenticated endpoint: returns full gap analysis + recommendations.
 */
async function scoreFull(req, res) {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents)) {
      return res.status(400).json({ message: 'documents array is required' });
    }

    const result = readinessScoreService.scoreDocuments(documents);

    return res.status(200).json({
      score: result.score,
      criticalGaps: result.criticalGaps,
      allGaps: result.allGaps,
      topRecommendations: result.topRecommendations,
      upgradePrompt: result.upgradePrompt,
      breakdown: result.breakdown,
    });
  } catch (err) {
    console.error('[ReadinessController] scoreFull error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * GET /api/v1/readiness/score/:companyId
 * Admin/founder: scores existing company documents from ZeroDB.
 */
async function scoreCompany(req, res) {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }

    // Fetch company data from ZeroDB in parallel
    const [documentsRes, shareClassesRes, equityGrantsRes, safesRes] = await Promise.all([
      zerodbService.query('documents', { filter: { companyId } }).catch(() => ({ results: [] })),
      zerodbService.query('share_classes', { filter: { companyId } }).catch(() => ({ results: [] })),
      zerodbService.query('equity_grants', { filter: { companyId } }).catch(() => ({ results: [] })),
      zerodbService.query('safes', { filter: { companyId } }).catch(() => ({ results: [] })),
    ]);

    const companyData = {
      documents: documentsRes.results || [],
      shareClasses: shareClassesRes.results || [],
      equityGrants: equityGrantsRes.results || [],
      safes: safesRes.results || [],
    };

    const result = readinessScoreService.scoreFromCompanyData(companyData);

    return res.status(200).json({
      score: result.score,
      criticalGaps: result.criticalGaps,
      allGaps: result.allGaps,
      topRecommendations: result.topRecommendations,
      upgradePrompt: result.upgradePrompt,
      breakdown: result.breakdown,
    });
  } catch (err) {
    console.error('[ReadinessController] scoreCompany error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  scorePublic,
  scoreFull,
  scoreCompany,
};
