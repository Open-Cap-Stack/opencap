const mongoose = require('mongoose');

const ComplianceCheckSchema = new mongoose.Schema({
  CheckID: {
    type: String,
    required: true,
    unique: true,
  },
  SPVID: {
    type: String,
    required: true,
  },
  RegulationType: {
    type: String,
    enum: ['GDPR', 'HIPAA', 'SOX', 'CCPA'],
    required: true,
  },
  Status: {
    type: String,
    enum: ['Compliant', 'Non-Compliant'],
    required: true,
  },
  Details: {
    type: String,
  },
  Timestamp: {
    type: Date,
    required: true,
  },
});

// Pre-validate hook to enforce Timestamp is present
ComplianceCheckSchema.pre('validate', function (next) {
  if (!this.Timestamp) {
    this.invalidate('Timestamp', 'Timestamp is required');
  }
  next();
});

module.exports = mongoose.model('ComplianceCheck', ComplianceCheckSchema);
