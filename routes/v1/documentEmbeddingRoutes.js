const express = require('express');
const router = express.Router();
const documentEmbeddingController = require('../../controllers/documentEmbeddingController');

router.post('/document-embeddings', documentEmbeddingController.createDocumentEmbedding);
router.get('/document-embeddings', documentEmbeddingController.getDocumentEmbeddings);
router.get('/document-embeddings/:id', documentEmbeddingController.getDocumentEmbeddingById);
router.put('/document-embeddings/:id', documentEmbeddingController.updateDocumentEmbedding);
router.delete('/document-embeddings/:id', documentEmbeddingController.deleteDocumentEmbedding);

module.exports = router;
