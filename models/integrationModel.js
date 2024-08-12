const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  IntegrationID: {
    type: String,
    required: true,
    unique: true,
  },
  ToolName: {
    type: String,
    required: true,
  },
  Description: {
    type: String,
    required: false, // Optional field
  },
  Link: {
    type: String,
    required: false, // Optional field
  },
});

const IntegrationModule = mongoose.model('IntegrationModule', integrationSchema);

module.exports = IntegrationModule;
