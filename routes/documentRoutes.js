const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

router.post('/documents', documentController.createDocument);
router.get('/documents', documentController.getDocuments);
router.get('/documents/:id', documentController.getDocumentById);
router.put('/documents/:id', documentController.updateDocumentById);
router.delete('/documents/:id', documentController.deleteDocumentById);

module.exports = router;
