const express = require('express');
const router = express.Router();
const documentAccessController = require('../../controllers/documentAccessController');

// Routes are mounted at /api/v1/document-accesses in app.js
router.post('/', documentAccessController.createDocumentAccess);
router.get('/', documentAccessController.getDocumentAccesses);
router.get('/:id', documentAccessController.getDocumentAccessById);
router.put('/:id', documentAccessController.updateDocumentAccess);
router.delete('/:id', documentAccessController.deleteDocumentAccess);

module.exports = router;
