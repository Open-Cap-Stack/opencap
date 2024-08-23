const mongoose = require('mongoose');
const { Schema } = mongoose;

const CorporationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  legalName: { type: String, required: true },
  doingBusinessAsName: { type: String },
  website: { type: String }
}, {
  timestamps: true
});

const Corporation = mongoose.model('Corporation', CorporationSchema);

module.exports = Corporation;
