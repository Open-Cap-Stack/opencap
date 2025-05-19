const express = require('express');
const router = express.Router();
const documentAccessController = require('../../controllers/documentAccessController');

router.post('/document-accesses', documentAccessController.createDocumentAccess);
router.get('/document-accesses', documentAccessController.getDocumentAccesses);
router.get('/document-accesses/:id', documentAccessController.getDocumentAccessById);
router.put('/document-accesses/:id', documentAccessController.updateDocumentAccess);
router.delete('/document-accesses/:id', documentAccessController.deleteDocumentAccess);

module.exports = router;
