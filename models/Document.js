const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  name: { type: String, required: true },
  metadata: { type: Object, default: {} },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  path: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
});

module.exports = mongoose.model('Document', DocumentSchema);
