const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { requireUserNotAgent } = require('../../middleware/rbacMiddleware');
const apiKeyController = require('../../controllers/apiKeyController');

// Agents cannot create, list, or revoke API keys
router.use(authenticateToken);
router.use(requireUserNotAgent);

router.post('/', apiKeyController.createApiKey);
router.get('/', apiKeyController.listApiKeys);
router.delete('/:keyId', apiKeyController.revokeApiKey);

module.exports = router;
