const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const messageController = require('../../controllers/messageController');

// GET /api/v1/messages — list conversations for current user
router.get('/', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageController.getConversations);

// POST /api/v1/messages — send a message (new or existing conversation)
router.post('/', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageController.sendMessage);

module.exports = router;
