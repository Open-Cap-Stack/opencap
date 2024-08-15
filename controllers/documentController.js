const Document = require('../models/documentModel');

// Create a new document
exports.createDocument = async (req, res) => {
    try {
        const document = new Document(req.body);
        const savedDocument = await document.save();
        res.status(201).json(savedDocument);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all documents
exports.getDocuments = async (req, res) => {
    try {
        const documents = await Document.find();
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a document by ID
exports.getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        res.status(200).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a document by ID
exports.updateDocumentById = async (req, res) => {
    try {
        const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!document) return res.status(404).json({ message: 'Document not found' });
        res.status(200).json(document);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a document by ID
exports.deleteDocumentById = async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        res.status(200).json({ message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
