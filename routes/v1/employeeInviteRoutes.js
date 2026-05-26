'use strict';

/**
 * Employee Invite Routes
 *
 * Phase 3: Employee invite flow
 *
 * Mounted at /api/v1/employees by app.js
 */

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const {
  inviteEmployee,
  acceptInvite,
  listEmployees,
  getEmployee
} = require('../../controllers/employeeInviteController');

const INVITE_ROLES = ['super_admin', 'admin', 'founder', 'manager'];
const LIST_ROLES  = ['super_admin', 'admin', 'founder', 'manager'];
// getEmployee is scoped further in the controller (employee can view only self)
const VIEW_ROLES  = ['super_admin', 'admin', 'founder', 'manager', 'employee'];

// POST /api/v1/employees/invite — must be before /:userId to avoid collision
router.post('/invite', authenticateToken, hasRole(INVITE_ROLES), inviteEmployee);

// POST /api/v1/employees/accept-invite — public, no auth required (invite token is the credential)
router.post('/accept-invite', acceptInvite);

// GET /api/v1/employees
router.get('/', authenticateToken, hasRole(LIST_ROLES), listEmployees);

// GET /api/v1/employees/:userId
router.get('/:userId', authenticateToken, hasRole(VIEW_ROLES), getEmployee);

module.exports = router;
