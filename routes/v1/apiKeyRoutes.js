const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const apiKeyController = require('../../controllers/apiKeyController');

router.use(authenticateToken);

router.post('/', apiKeyController.createApiKey);
router.get('/', apiKeyController.listApiKeys);
router.delete('/:keyId', apiKeyController.revokeApiKey);

module.exports = router;
