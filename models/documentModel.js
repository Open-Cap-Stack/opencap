// models/documentModel.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    documentId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    metadata: { type: Object },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    path: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    DocumentType: { type: String, enum: ['Legal', 'Financial', 'Other'], required: true },
    FileType: { type: String, enum: ['PDF', 'DOCX', 'TXT'], required: true },
    Versioning: { type: String },
    AccessControl: { type: Object },
    LegalSignificance: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
