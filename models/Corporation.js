const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const CorporationSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  legalName: {
    type: String,
    required: true,
  },
  doingBusinessAsName: {
    type: String,
  },
  website: {
    type: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Corporation', CorporationSchema);
