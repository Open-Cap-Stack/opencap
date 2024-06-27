const express = require('express');
const router = express.Router();
const {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocumentById,
  deleteDocumentById
} = require('../controllers/documentController');

router.post('/', createDocument);
router.get('/', getAllDocuments);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocumentById);
router.delete('/:id', deleteDocumentById);

module.exports = router;
