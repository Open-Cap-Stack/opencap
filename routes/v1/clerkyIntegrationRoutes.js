'use strict';

/**
 * Clerky Integration Routes - v1
 * Issue #662: Clerky OAuth integration
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const clerkyController = require('../../controllers/clerkyIntegrationController');

const ALLOWED_ROLES = ['super_admin', 'admin', 'founder'];

// All routes require authentication
router.use(authenticateToken);

// GET  /api/v1/integrations/clerky/status — connection status
router.get('/status', hasRole(ALLOWED_ROLES), clerkyController.getStatus);

// POST /api/v1/integrations/clerky/connect — connect Clerky account
router.post('/connect', hasRole(ALLOWED_ROLES), clerkyController.connect);

// POST /api/v1/integrations/clerky/sync — sync documents from Clerky
router.post('/sync', hasRole(ALLOWED_ROLES), clerkyController.sync);

// DELETE /api/v1/integrations/clerky/disconnect — remove connection
router.delete('/disconnect', hasRole(ALLOWED_ROLES), clerkyController.disconnect);

module.exports = router;
