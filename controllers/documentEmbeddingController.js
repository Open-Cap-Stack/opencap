const DocumentEmbedding = require('../models/DocumentEmbeddingModel');

exports.createDocumentEmbedding = async (req, res) => {
    try {
        const newEmbedding = new DocumentEmbedding(req.body);
        const savedEmbedding = await newEmbedding.save();
        res.status(201).json(savedEmbedding);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getDocumentEmbeddings = async (req, res) => {
    try {
        const embeddings = await DocumentEmbedding.find();
        res.status(200).json(embeddings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDocumentEmbeddingById = async (req, res) => {
    try {
        const embedding = await DocumentEmbedding.findById(req.params.id);
        if (!embedding) {
            return res.status(404).json({ message: 'Document embedding not found' });
        }
        res.status(200).json(embedding);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDocumentEmbedding = async (req, res) => {
    try {
        const embedding = await DocumentEmbedding.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!embedding) {
            return res.status(404).json({ message: 'Document embedding not found' });
        }
        res.status(200).json(embedding);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteDocumentEmbedding = async (req, res) => {
    try {
        const embedding = await DocumentEmbedding.findByIdAndDelete(req.params.id);
        if (!embedding) {
            return res.status(404).json({ message: 'Document embedding not found' });
        }
        res.status(200).json({ message: 'Document embedding deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
