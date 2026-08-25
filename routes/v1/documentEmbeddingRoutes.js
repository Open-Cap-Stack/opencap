const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const documentEmbeddingController = require('../../controllers/documentEmbeddingController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentEmbeddingController.createDocumentEmbedding);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentEmbeddingController.getDocumentEmbeddings);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentEmbeddingController.getDocumentEmbeddingById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentEmbeddingController.updateDocumentEmbedding);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentEmbeddingController.deleteDocumentEmbedding);

module.exports = router;
