const mongoose = require('mongoose');

const SPVSchema = new mongoose.Schema({
  SPVID: {
    type: String,
    required: true,
    unique: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Purpose: {
    type: String,
    required: true,
  },
  CreationDate: {
    type: Date,
    required: true,
  },
  Status: {
    type: String,
    enum: ['Active', 'Pending', 'Closed'],
    required: true,
  },
  ParentCompanyID: {
    type: String,
    required: true,
  },
  ComplianceStatus: {
    type: String,
    enum: ['Compliant', 'NonCompliant', 'PendingReview'],
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('SPV', SPVSchema);
