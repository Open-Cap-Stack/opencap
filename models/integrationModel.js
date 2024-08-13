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
    required: false,
  },
  Link: { // Updated field name
    type: String,
    required: false,
  },
});

const IntegrationModule = mongoose.model('IntegrationModule', integrationSchema);

module.exports = IntegrationModule;
