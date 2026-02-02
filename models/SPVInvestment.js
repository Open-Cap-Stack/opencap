/**
 * SPV Investment Model
 * Issue #123: Add SPV Nested Endpoints
 *
 * Tracks investments made by investors in Special Purpose Vehicles (SPVs).
 */
const mongoose = require('mongoose');

const SPVInvestmentSchema = new mongoose.Schema({
  spvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SPV',
    required: true,
    index: true
  },
  investorId: {
    type: String,
    required: true,
    index: true
  },
  investorName: {
    type: String,
    required: true
  },
  investorType: {
    type: String,
    enum: ['individual', 'institutional', 'accredited', 'qualified'],
    default: 'individual'
  },
  investmentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  equityPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  investmentDate: {
    type: Date,
    required: true,
    index: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'redeemed', 'cancelled'],
    default: 'pending',
    index: true
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
SPVInvestmentSchema.index({ spvId: 1, status: 1 });
SPVInvestmentSchema.index({ spvId: 1, investmentDate: -1 });

module.exports = mongoose.model('SPVInvestment', SPVInvestmentSchema);
