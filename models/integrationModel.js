const mongoose = require('mongoose');

const IntegrationModuleSchema = new mongoose.Schema({
  IntegrationID: {
    type: String,
    required: true,
    unique: true,  // Ensure this is unique to trigger the duplicate key error
  },
  ToolName: {
    type: String,
    required: true,
  },
  Description: {
    type: String,
  },
  Link: {
    type: String,
  },
});

// This ensures that the unique index is created
IntegrationModuleSchema.index({ IntegrationID: 1 }, { unique: true });

module.exports = mongoose.model('IntegrationModule', IntegrationModuleSchema);
