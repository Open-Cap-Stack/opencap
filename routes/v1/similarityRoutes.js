/**
 * Similarity Routes
 *
 * API routes for stakeholder and company similarity search.
 *
 * [Feature] Issue #25: Implement stakeholder/company similarity search
 */

const express = require('express');
const similarityController = require('../../controllers/similarityController');
const { authenticateToken } = require('../../middleware/authMiddleware');

const router = express.Router();

// =====================
// Stakeholder Endpoints
// =====================

/**
 * POST /api/similarity/stakeholders/search
 * Find similar stakeholders to a given stakeholder profile
 */
router.post('/stakeholders/search',
  authenticateToken,
  similarityController.findSimilarStakeholders
);

/**
 * GET /api/similarity/stakeholders/:id/similar
 * Find similar stakeholders by stakeholder ID
 */
router.get('/stakeholders/:id/similar',
  authenticateToken,
  similarityController.findSimilarStakeholdersById
);

/**
 * GET /api/similarity/stakeholders/search/role
 * Search stakeholders by role-based query
 */
router.get('/stakeholders/search/role',
  authenticateToken,
  similarityController.searchStakeholdersByRole
);

/**
 * POST /api/similarity/stakeholders/index
 * Index a stakeholder for similarity search
 */
router.post('/stakeholders/index',
  authenticateToken,
  similarityController.indexStakeholder
);

/**
 * POST /api/similarity/stakeholders/index-all
 * Index all stakeholders from database
 */
router.post('/stakeholders/index-all',
  authenticateToken,
  similarityController.indexAllStakeholders
);

// =================
// Company Endpoints
// =================

/**
 * POST /api/similarity/companies/search
 * Find similar companies to a given company profile
 */
router.post('/companies/search',
  authenticateToken,
  similarityController.findSimilarCompanies
);

/**
 * GET /api/similarity/companies/:id/similar
 * Find similar companies by company ID
 */
router.get('/companies/:id/similar',
  authenticateToken,
  similarityController.findSimilarCompaniesById
);

/**
 * GET /api/similarity/companies/search/type
 * Search companies by type-based query
 */
router.get('/companies/search/type',
  authenticateToken,
  similarityController.searchCompaniesByType
);

/**
 * POST /api/similarity/companies/index
 * Index a company for similarity search
 */
router.post('/companies/index',
  authenticateToken,
  similarityController.indexCompany
);

/**
 * POST /api/similarity/companies/index-all
 * Index all companies from database
 */
router.post('/companies/index-all',
  authenticateToken,
  similarityController.indexAllCompanies
);

// ==========================
// Cross-Entity & Networking
// ==========================

/**
 * POST /api/similarity/network/connections
 * Find network connections for a stakeholder
 */
router.post('/network/connections',
  authenticateToken,
  similarityController.findNetworkConnections
);

/**
 * POST /api/similarity/match/companies
 * Find companies matching stakeholder investment criteria
 */
router.post('/match/companies',
  authenticateToken,
  similarityController.findCompaniesForStakeholder
);

// =========
// Analytics
// =========

/**
 * GET /api/similarity/analytics
 * Get similarity search analytics
 */
router.get('/analytics',
  authenticateToken,
  similarityController.getAnalytics
);

module.exports = router;
