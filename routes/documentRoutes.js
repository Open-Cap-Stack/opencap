const express = require('express');
const router = express.Router();
const { createDocument, getAllDocuments, getDocumentById, updateDocumentById, deleteDocumentById } = require('../controllers/documentController');

// Existing routes
router.get('/', getAllDocuments);
router.post('/', createDocument);

// Add these routes for update and delete
router.get('/:id', getDocumentById);           // Retrieve a document by ID
router.put('/:id', updateDocumentById);        // Update a document by ID
router.delete('/:id', deleteDocumentById);     // Delete a document by ID

module.exports = router;
