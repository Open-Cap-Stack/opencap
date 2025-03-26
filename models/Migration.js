/**
 * Migration Model
 * 
 * [Chore] OCDI-107: Implement database migration system
 * 
 * This model is used to track database migrations for schema evolution.
 * Each migration is recorded with its application status and timestamp.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Migration Schema
 * Tracks database migrations and their status
 */
const MigrationSchema = new Schema({
  // Unique identifier for the migration
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    trim: true
  },
  
  // Description of what the migration does
  description: { 
    type: String, 
    trim: true 
  },
  
  // Whether the migration has been applied
  applied: { 
    type: Boolean, 
    default: false 
  },
  
  // When the migration was registered
  registered: { 
    type: Date, 
    default: Date.now 
  },
  
  // When the migration was applied
  appliedAt: { 
    type: Date, 
    default: null 
  },
  
  // Optional: version or sequence number for ordering
  version: { 
    type: Number 
  },
  
  // For tracking migration errors
  error: {
    message: { type: String },
    stack: { type: String },
    occurredAt: { type: Date }
  }
});

// Add indexes to improve query performance
MigrationSchema.index({ applied: 1 });
MigrationSchema.index({ registered: 1 });

/**
 * Pre-save middleware
 * Ensures consistent data before saving
 */
MigrationSchema.pre('save', function(next) {
  // Set the appliedAt date if applied is true and appliedAt is null
  if (this.applied === true && !this.appliedAt) {
    this.appliedAt = new Date();
  }
  
  // Clear appliedAt if applied is false
  if (this.applied === false) {
    this.appliedAt = null;
  }
  
  next();
});

/**
 * Get pending migrations
 */
MigrationSchema.statics.getPending = function() {
  return this.find({ applied: false }).sort({ registered: 1 });
};

/**
 * Get applied migrations
 */
MigrationSchema.statics.getApplied = function() {
  return this.find({ applied: true }).sort({ appliedAt: 1 });
};

/**
 * Mark a migration as applied
 */
MigrationSchema.statics.markApplied = function(name) {
  return this.findOneAndUpdate(
    { name },
    { $set: { applied: true, appliedAt: new Date() } },
    { new: true }
  );
};

/**
 * Mark a migration as rolled back
 */
MigrationSchema.statics.markRolledBack = function(name) {
  return this.findOneAndUpdate(
    { name },
    { $set: { applied: false, appliedAt: null } },
    { new: true }
  );
};

const Migration = mongoose.model('Migration', MigrationSchema);

module.exports = Migration;
