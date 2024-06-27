const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StakeholderSchema = new Schema({
  stakeholderId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  ownershipPercentage: { type: Number, required: true },
  sharesOwned: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stakeholder', StakeholderSchema);
