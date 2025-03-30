/**
 * SPV Asset Management API Model
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 * Updated as part of OCDI-304: Fix SPV Asset Model Validation issues
 */
const mongoose = require('mongoose');

// Valid asset types
const VALID_ASSET_TYPES = ['Real Estate', 'Financial Instrument'];

// Validation functions - exposed separately for better testability
const validators = {
  isValidAssetID: (id) => {
    if (!id) return false;
    return /^[A-Za-z0-9\-]+$/.test(id);
  },
  
  isValidNumber: (value) => {
    return typeof value === 'number' && Number.isFinite(value);
  },
  
  isValidPositiveNumber: (value) => {
    return validators.isValidNumber(value) && value >= 0;
  },
  
  isValidDate: (date) => {
    return date instanceof Date && !isNaN(date);
  },
  
  isValidType: (type) => {
    return VALID_ASSET_TYPES.includes(type);
  }
};

const SPVAssetSchema = new mongoose.Schema({
  AssetID: {
    type: String,
    required: [true, 'Asset ID is required'],
    unique: true,
    validate: {
      validator: validators.isValidAssetID,
      message: 'Asset ID must contain only alphanumeric characters and hyphens'
    },
    trim: true,
    index: true // Index for better query performance
  },
  SPVID: {
    type: String,
    required: [true, 'SPV ID is required'],
    trim: true,
    index: true // Index for better query performance
  },
  Type: {
    type: String,
    required: [true, 'Asset type is required'],
    validate: {
      validator: validators.isValidType,
      message: props => `${props.value} is not a supported asset type. Valid types are: ${VALID_ASSET_TYPES.join(', ')}`
    },
    index: true // Index for better query performance
  },
  Value: {
    type: Number,
    required: [true, 'Asset value is required'],
    validate: {
      validator: validators.isValidPositiveNumber,
      message: props => `${props.value} is not a valid positive number`
    }
  },
  Description: {
    type: String,
    required: [true, 'Asset description is required'],
    trim: true,
    validate: {
      validator: function(desc) {
        return desc && desc.length <= 500;
      },
      message: 'Description cannot exceed 500 characters'
    }
  },
  AcquisitionDate: {
    type: Date,
    required: [true, 'Acquisition date is required'],
    validate: {
      validator: validators.isValidDate,
      message: 'Invalid acquisition date'
    }
  },
}, {
  // Add timestamps for better auditing
  timestamps: true,
  
  // Add method options
  methods: {
    // Format asset for API response
    toApiResponse() {
      return {
        id: this._id,
        assetId: this.AssetID,
        spvId: this.SPVID,
        type: this.Type,
        value: this.Value,
        description: this.Description,
        acquisitionDate: this.AcquisitionDate
      };
    },
    
    // Calculate current value (extensibility point)
    calculateCurrentValue() {
      // For now, just return the stored value
      // This can be extended later with appreciation/depreciation logic
      return this.Value;
    }
  },
  
  // Add statics for common queries
  statics: {
    // Find assets by SPV ID
    findBySPVID(spvId) {
      if (!spvId) return Promise.resolve([]);
      return this.find({ SPVID: spvId.trim().toUpperCase() });
    },
    
    // Find assets by type
    findByType(type) {
      if (!validators.isValidType(type)) return Promise.resolve([]);
      return this.find({ Type: type });
    },
    
    // Find assets that match criteria
    findByFilters(filters = {}) {
      const query = {};
      
      if (filters.spvId) {
        query.SPVID = filters.spvId.trim().toUpperCase();
      }
      
      // Check type first and return empty array if invalid
      if (filters.type && !validators.isValidType(filters.type)) {
        return Promise.resolve([]);
      } else if (filters.type) {
        query.Type = filters.type;
      }
      
      if (filters.minValue && validators.isValidPositiveNumber(filters.minValue)) {
        query.Value = { $gte: filters.minValue };
      }
      
      if (filters.maxValue && validators.isValidPositiveNumber(filters.maxValue)) {
        query.Value = { ...query.Value, $lte: filters.maxValue };
      }
      
      return this.find(query);
    },
    
    // Total value of assets by SPV ID
    async getTotalValueBySPVID(spvId) {
      if (!spvId) return 0;
      const assets = await this.find({ SPVID: spvId.trim().toUpperCase() });
      return assets.reduce((total, asset) => total + asset.Value, 0);
    },
    
    // Valid asset types
    getValidTypes() {
      return [...VALID_ASSET_TYPES];
    }
  }
});

// Create compound index for efficient querying by Type and SPVID
SPVAssetSchema.index({ SPVID: 1, Type: 1 });

// Pre-save hook to ensure asset IDs are uppercase for consistency
SPVAssetSchema.pre('save', function(next) {
  if (this.AssetID) {
    this.AssetID = this.AssetID.trim().toUpperCase();
  }
  if (this.SPVID) {
    this.SPVID = this.SPVID.trim().toUpperCase();
  }
  next();
});

// Export the validators for testing
SPVAssetSchema.statics.validators = validators;

module.exports = mongoose.model('SPVAsset', SPVAssetSchema);
