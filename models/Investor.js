const mongoose = require('mongoose');

const InvestorSchema = new mongoose.Schema({
  investorId: {
    type: String,
    unique: true,
    required: true,
  },
  investmentAmount: {
    type: Number,
    required: true,
  },
  equityPercentage: {
    type: Number,
    required: true,
  },
  investorType: {
    type: String,
    enum: ['Angel', 'Venture Capital'],
    required: true,
  },
  relatedFundraisingRound: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FundraisingRound',
    required: true,
  },
});

module.exports = mongoose.model('Investor', InvestorSchema);
