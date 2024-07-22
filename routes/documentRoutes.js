const express = require('express');
const router = express.Router();
const Document = require('../models/Document');

router.get('/', async (req, res) => {
  const documents = await Document.find();
  res.status(200).json(documents);
});

router.post('/', async (req, res) => {
  const newDocument = new Document(req.body);
  await newDocument.save();
  res.status(201).json(newDocument);
});

module.exports = router;
