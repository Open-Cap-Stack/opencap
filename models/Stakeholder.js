const mongoose = require('mongoose');

const stakeholderSchema = new mongoose.Schema({
  stakeholderId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId, // Changed to ObjectId
    required: true
  }
});

const Stakeholder = mongoose.model('Stakeholder', stakeholderSchema);

module.exports = Stakeholder;
