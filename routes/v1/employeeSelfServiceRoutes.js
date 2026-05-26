'use strict';

/**
 * Employee Self-Service Routes
 *
 * Phase 3: Employee self-service equity API
 *
 * Mounted at /api/v1/me by app.js
 * Admins and founders are allowed so they can preview the employee view.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const {
  getMyEquity,
  getMyDocuments,
  getMyValuation,
  getMyProfile
} = require('../../controllers/employeeSelfServiceController');

// Roles that may access the /me/* endpoints:
// employee (primary audience) + admin/founder/manager (can preview their own data)
const SELF_SERVICE_ROLES = ['super_admin', 'admin', 'founder', 'manager', 'employee', 'accountant'];

router.use(authenticateToken);

router.get('/equity',    hasRole(SELF_SERVICE_ROLES), getMyEquity);
router.get('/documents', hasRole(SELF_SERVICE_ROLES), getMyDocuments);
router.get('/valuation', hasRole(SELF_SERVICE_ROLES), getMyValuation);
router.get('/profile',   hasRole(SELF_SERVICE_ROLES), getMyProfile);

module.exports = router;
