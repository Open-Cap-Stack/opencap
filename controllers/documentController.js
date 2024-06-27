const Document = require('../models/Document');

exports.createDocument = async (req, res) => {
  const { documentId, name, path, uploadedBy, uploadedAt, metadata } = req.body;

  if (!documentId || !name || !path || !uploadedBy || !metadata) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const document = new Document({ documentId, name, path, uploadedBy, uploadedAt, metadata });
    await document.save();
    res.status(201).json({ document });
  } catch (error) {
    res.status(500).json({ error: 'Error creating document' });
  }
};

exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find();
    res.status(200).json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json({ document });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching document' });
  }
};

exports.updateDocumentById = async (req, res) => {
  try {
    const updatedDocument = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json({ document: updatedDocument });
  } catch (error) {
    res.status(500).json({ error: 'Error updating document' });
  }
};

exports.deleteDocumentById = async (req, res) => {
  try {
    const deletedDocument = await Document.findByIdAndDelete(req.params.id);
    if (!deletedDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting document' });
  }
};
