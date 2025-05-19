/**
 * SPV Asset Model
 * 
 * [Feature] OCAE-212: Implement SPV Asset Management API
 * [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Defines the schema for SPV Assets with proper indexing and validation
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the SPV Asset Schema
const SPVAssetSchema = new Schema({
  // Reference to the SPV this asset belongs to
  spvId: {
    type: Schema.Types.ObjectId,
    ref: 'SPV',
    required: [true, 'SPV ID is required'],
    index: true
  },
  
  // Asset identification
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
    maxlength: [100, 'Asset name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Asset classification
  type: {
    type: String,
    required: [true, 'Asset type is required'],
    enum: {
      values: ['real_estate', 'private_equity', 'venture_capital', 'debt', 'other'],
      message: 'Invalid asset type'
    },
    index: true
  },
  
  // Financial details
  acquisitionDate: {
    type: Date,
    required: [true, 'Acquisition date is required']
  },
  
  acquisitionCost: {
    type: Number,
    required: [true, 'Acquisition cost is required'],
    min: [0, 'Acquisition cost cannot be negative']
  },
  
  currentValue: {
    type: Number,
    required: [true, 'Current value is required'],
    min: [0, 'Current value cannot be negative']
  },
  
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true,
    enum: {
      values: ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
      message: 'Unsupported currency'
    }
  },
  
  // Status tracking
  status: {
    type: String,
    required: true,
    enum: ['active', 'sold', 'written_off', 'in_litigation'],
    default: 'active'
  },
  
  // Performance metrics
  annualReturn: Number,
  irr: Number,
  multiple: Number,
  
  // Metadata
  documents: [{
    name: String,
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  notes: [{
    content: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // System fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
SPVAssetSchema.index({ spvId: 1, type: 1 });
SPVAssetSchema.index({ status: 1 });
SPVAssetSchema.index({ acquisitionDate: -1 });

// Virtual for formatted currency
SPVAssetSchema.virtual('formattedValue').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.currentValue);
});

// Pre-save hook to update timestamps
SPVAssetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Export the model
const SPVAsset = mongoose.model('SPVAsset', SPVAssetSchema);
module.exports = SPVAsset;
