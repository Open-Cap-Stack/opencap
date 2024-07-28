const express = require('express');
const router = express.Router();
const Document = require('../models/Document');

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await Document.find().populate('uploadedBy', 'username');
    res.status(200).json(documents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new document
router.post('/documents', async (req, res) => {
  const document = new Document({
    documentId: req.body.documentId,
    name: req.body.name,
    metadata: req.body.metadata,
    uploadedBy: req.body.uploadedBy,
    path: req.body.path,
    title: req.body.title,
    content: req.body.content,
  });

  try {
    const newDocument = await document.save();
    res.status(201).json(newDocument);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
