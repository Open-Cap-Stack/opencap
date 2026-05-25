/**
 * Plugin Auth Routes
 * Issue #505: OAuth 2.0 authorization server for plugin auth
 *
 * Implements the OAuth endpoints required by the AI plugin protocol.
 */
const express = require('express');
const router = express.Router();
const pluginAuthController = require('../../controllers/pluginAuthController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Authorization endpoint — requires user to be logged in
router.get('/authorize', authenticateToken, hasRole(['super_admin', 'admin']), pluginAuthController.authorize);

// Token exchange endpoint — public (authenticates via client_id/secret + code)
router.post('/token', pluginAuthController.token);

// User info endpoint — requires valid Bearer token
router.get('/userinfo', authenticateToken, hasRole(['super_admin', 'admin']), pluginAuthController.userinfo);

module.exports = router;
