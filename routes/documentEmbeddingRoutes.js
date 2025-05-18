const express = require('express');
const router = express.Router();
const documentEmbeddingController = require('../controllers/documentEmbeddingController');

router.post('/', documentEmbeddingController.createDocumentEmbedding);
router.get('/', documentEmbeddingController.getDocumentEmbeddings);
router.get('/:id', documentEmbeddingController.getDocumentEmbeddingById);
router.put('/:id', documentEmbeddingController.updateDocumentEmbedding);
router.delete('/:id', documentEmbeddingController.deleteDocumentEmbedding);

module.exports = router;
