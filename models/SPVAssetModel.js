/**
 * SPV Asset Management API Model (New)
 * Created to resolve model compilation issues
 */
const mongoose = require('mongoose');

// Define the schema
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
    enum: ['Real Estate', 'Financial Instrument'],
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Create the model
const SPVAsset = mongoose.model('SPVAsset', SPVAssetSchema);

module.exports = SPVAsset;
