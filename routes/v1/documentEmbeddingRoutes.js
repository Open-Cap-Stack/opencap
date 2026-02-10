const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const documentEmbeddingController = require('../../controllers/documentEmbeddingController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/document-embeddings', documentEmbeddingController.createDocumentEmbedding);
router.get('/document-embeddings', documentEmbeddingController.getDocumentEmbeddings);
router.get('/document-embeddings/:id', documentEmbeddingController.getDocumentEmbeddingById);
router.put('/document-embeddings/:id', documentEmbeddingController.updateDocumentEmbedding);
router.delete('/document-embeddings/:id', documentEmbeddingController.deleteDocumentEmbedding);

module.exports = router;
