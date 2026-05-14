const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const messageController = require('../../controllers/messageController');

// GET /api/v1/messages — list conversations for current user
router.get('/', authenticateToken, messageController.getConversations);

// POST /api/v1/messages — send a message (new or existing conversation)
router.post('/', authenticateToken, messageController.sendMessage);

module.exports = router;
