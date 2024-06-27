const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  documentId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  uploadedBy: { type: String, required: true, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  metadata: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', DocumentSchema);
