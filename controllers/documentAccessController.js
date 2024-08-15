const DocumentAccessModel = require('../models/DocumentAccessModel');

exports.createDocumentAccess = async (req, res) => {
    try {
        const newAccess = new DocumentAccessModel(req.body);
        const savedAccess = await newAccess.save();
        res.status(201).json(savedAccess);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getDocumentAccesses = async (req, res) => {
    try {
        const accesses = await DocumentAccessModel.find();
        res.status(200).json(accesses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDocumentAccessById = async (req, res) => {
    try {
        const access = await DocumentAccessModel.findById(req.params.id);
        if (!access) {
            return res.status(404).json({ message: 'Document access not found' });
        }
        res.status(200).json(access);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDocumentAccess = async (req, res) => {
    try {
        const access = await DocumentAccessModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!access) {
            return res.status(404).json({ message: 'Document access not found' });
        }
        res.status(200).json(access);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteDocumentAccess = async (req, res) => {
    try {
        const access = await DocumentAccessModel.findByIdAndDelete(req.params.id);
        if (!access) {
            return res.status(404).json({ message: 'Document access not found' });
        }
        res.status(200).json({ message: 'Document access deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
