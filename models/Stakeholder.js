const mongoose = require('mongoose');

const stakeholderSchema = new mongoose.Schema({
  stakeholderId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  projectId: {
    type: String,  // Ensure this is defined as a String
    required: true,
  },
});

const Stakeholder = mongoose.model('Stakeholder', stakeholderSchema);

module.exports = Stakeholder;
