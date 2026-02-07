// routes/Company.js
/**
 * Company Routes
 * [Feature] OCAE-302: Implement role-based access control
 * [Feature] Issue #189: Add Settings Management Endpoints
 */

const express = require('express');
const companyController = require('../../controllers/Company');
const settingsController = require('../../controllers/settingsController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole, hasPermission } = require('../../middleware/rbacMiddleware');

const router = express.Router();

// POST /api/companies - Create a new company
// Requires: write:companies permission
router.post('/',
  authenticateToken,
  hasPermission('write:companies'),
  companyController.createCompany
);

// GET /api/companies - Get all companies
// Requires: read:companies permission
router.get('/',
  authenticateToken,
  hasPermission('read:companies'),
  companyController.getAllCompanies
);

// GET /api/companies/by-company-id/:companyId - Get company by companyId (business identifier)
// Requires: read:companies permission
router.get('/by-company-id/:companyId',
  authenticateToken,
  hasPermission('read:companies'),
  companyController.getCompanyByCompanyId
);

// GET /api/companies/:id - Get company by ID
// Requires: read:companies permission
router.get('/:id',
  authenticateToken,
  hasPermission('read:companies'),
  companyController.getCompanyById
);

// GET /api/companies/:id/settings - Get company settings
// Requires: read:companies permission
router.get('/:id/settings',
  authenticateToken,
  hasPermission('read:companies'),
  settingsController.getCompanySettings
);

// PUT /api/companies/:id - Update company by ID
// Requires: write:companies permission
router.put('/:id',
  authenticateToken,
  hasPermission('write:companies'),
  companyController.updateCompanyById
);

// PUT /api/companies/:id/settings - Update company settings
// Requires: write:companies permission
router.put('/:id/settings',
  authenticateToken,
  hasPermission('write:companies'),
  settingsController.updateCompanySettings
);

// POST /api/companies/:id/settings/reset - Reset company settings
// Requires: admin:all permission or company admin role
router.post('/:id/settings/reset',
  authenticateToken,
  hasPermission(['admin:all', 'write:companies']),
  settingsController.resetCompanySettings
);

// DELETE /api/companies/:id - Delete company by ID
// Requires: delete:companies permission or admin role
router.delete('/:id',
  authenticateToken,
  hasPermission(['delete:companies', 'admin:all']),
  companyController.deleteCompanyById
);

module.exports = router;
