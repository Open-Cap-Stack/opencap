'use strict';

/**
 * Service Provider Routes
 *
 * Phase 4: Service provider invite flow and engagement-scoped access
 *
 * Mounted at /api/v1/service-providers by app.js
 */

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const { auditAction } = require('../../middleware/auditLog');
const {
  inviteServiceProvider,
  acceptServiceProviderInvite,
  listServiceProviders,
  getServiceProvider,
  updateServiceProviderScopes,
  revokeServiceProvider,
} = require('../../controllers/serviceProviderController');

// Only admin and founder can manage service providers
const MANAGE_ROLES = ['super_admin', 'admin', 'founder'];

// POST /api/v1/service-providers/invite — must be before /:userId to avoid collision
router.post('/invite', authenticateToken, hasRole(MANAGE_ROLES), auditAction('invite_service_provider', 'service_provider'), inviteServiceProvider);

// POST /api/v1/service-providers/accept-invite — public (invite token is the credential)
router.post('/accept-invite', acceptServiceProviderInvite);

// GET /api/v1/service-providers — list all service providers for the company
router.get('/', authenticateToken, hasRole(MANAGE_ROLES), listServiceProviders);

// GET /api/v1/service-providers/:userId — get single service provider
router.get('/:userId', authenticateToken, hasRole(MANAGE_ROLES), getServiceProvider);

// PATCH /api/v1/service-providers/:userId/scopes — update access scopes (must be before /:userId)
router.patch('/:userId/scopes', authenticateToken, hasRole(MANAGE_ROLES), auditAction('update_service_provider_scopes', 'service_provider'), updateServiceProviderScopes);

// DELETE /api/v1/service-providers/:userId — revoke access
router.delete('/:userId', authenticateToken, hasRole(MANAGE_ROLES), auditAction('revoke_service_provider', 'service_provider'), revokeServiceProvider);

module.exports = router;
