/**
 * SPV Asset Management API Model
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 */
const mongoose = require('mongoose');

const SPVAssetSchema = new mongoose.Schema({
  AssetID: {
    type: String,
    required: true,
    unique: true,
  },
  SPVID: {
    type: String,
    required: true,
  },
  Type: {
    type: String,
    enum: ['Real Estate', 'Financial Instrument'], // Add other types as needed
    required: true,
  },
  Value: {
    type: Number,
    required: true,
  },
  Description: {
    type: String,
    required: true,
  },
  AcquisitionDate: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model('SPVAsset', SPVAssetSchema);
