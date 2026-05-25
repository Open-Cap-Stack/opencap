const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { requireUserNotAgent, hasRole } = require('../../middleware/rbacMiddleware');
const apiKeyController = require('../../controllers/apiKeyController');

// Agents cannot create, list, or revoke API keys
router.use(authenticateToken);
router.use(requireUserNotAgent);

router.post('/', hasRole(['super_admin', 'admin']), apiKeyController.createApiKey);
router.get('/', hasRole(['super_admin', 'admin']), apiKeyController.listApiKeys);
router.delete('/:keyId', hasRole(['super_admin', 'admin']), apiKeyController.revokeApiKey);

module.exports = router;
