const mongoose = require('mongoose');

const shareClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  amountRaised: {
    type: Number,
    required: true,
  },
  ownershipPercentage: {
    type: Number,
    required: true,
  },
  dilutedShares: {
    type: Number,
    required: true,
  },
  authorizedShares: {
    type: Number,
    required: true,
  },
  shareClassId: {
    type: String,
    required: true,
  }
});

const ShareClass = mongoose.model('ShareClass', shareClassSchema);

module.exports = ShareClass;
