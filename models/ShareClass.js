const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShareClassSchema = new Schema({
  shareClassId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  authorizedShares: { type: Number, required: true },
  dilutedShares: { type: Number, required: true },
  ownershipPercentage: { type: Number, required: true },
  amountRaised: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShareClass', ShareClassSchema);
