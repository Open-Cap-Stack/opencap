const mongoose = require('mongoose');

const shareClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Share class name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  amountRaised: {
    type: Number,
    required: [true, 'Amount raised is required'],
    min: [0, 'Amount raised cannot be negative']
  },
  ownershipPercentage: {
    type: Number,
    required: [true, 'Ownership percentage is required'],
    min: [0, 'Ownership percentage must be between 0 and 100'],
    max: [100, 'Ownership percentage must be between 0 and 100']
  },
  dilutedShares: {
    type: Number,
    required: [true, 'Diluted shares is required'],
    min: [0, 'Diluted shares cannot be negative']
  },
  authorizedShares: {
    type: Number,
    required: [true, 'Authorized shares is required'],
    min: [0, 'Authorized shares cannot be negative']
  },
  shareClassId: {
    type: String,
    required: [true, 'Share class ID is required'],
    unique: true,
    trim: true
  },
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

// Virtual for conversion rate
shareClassSchema.virtual('conversionRate').get(function() {
  return this.dilutedShares > 0 ? (this.authorizedShares / this.dilutedShares).toFixed(2) : 0;
});

// Index for efficient searching and filtering
shareClassSchema.index({ name: 'text', description: 'text', shareClassId: 1 });

// Pre-save middleware to update timestamps
shareClassSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Custom validation method
shareClassSchema.methods.validateShares = function() {
  return this.dilutedShares <= this.authorizedShares;
};

const ShareClass = mongoose.model('ShareClass', shareClassSchema);

module.exports = ShareClass;
