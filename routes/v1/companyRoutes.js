// routes/Company.js
/**
 * Company Routes
 * [Feature] OCAE-302: Implement role-based access control
 */

const express = require('express');
const companyController = require('../../controllers/Company');
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

// GET /api/companies/:id - Get company by ID
// Requires: read:companies permission
router.get('/:id', 
  authenticateToken,
  hasPermission('read:companies'),
  companyController.getCompanyById
);

// PUT /api/companies/:id - Update company by ID
// Requires: write:companies permission
router.put('/:id', 
  authenticateToken,
  hasPermission('write:companies'),
  companyController.updateCompanyById
);

// DELETE /api/companies/:id - Delete company by ID
// Requires: delete:companies permission or admin role
router.delete('/:id', 
  authenticateToken,
  hasPermission(['delete:companies', 'admin:all']),
  companyController.deleteCompanyById
);

module.exports = router;
