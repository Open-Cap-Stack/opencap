/**
 * Plugin Routes
 * Issue #506: Plugin tool handlers
 *
 * Provides plugin-optimized endpoints for AI chat interfaces.
 */
const express = require('express');
const router = express.Router();
const pluginController = require('../../controllers/pluginController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// All plugin routes require authentication
router.use(authenticateToken);

// Cap table summary endpoint
router.get('/summary', hasRole(['super_admin', 'admin']), pluginController.getSummary);

module.exports = router;
