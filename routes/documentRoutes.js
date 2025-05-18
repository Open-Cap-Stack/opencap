const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

router.post('/', documentController.createDocument);
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);
router.put('/:id', documentController.updateDocumentById);
router.delete('/:id', documentController.deleteDocumentById);

module.exports = router;
