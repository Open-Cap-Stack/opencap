/**
 * User Model
 * Feature: OCDI-102: Create User data model
 */

const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  bio: { type: String, default: '' },
  avatar: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  address: {
    street: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    zipCode: { type: String, default: null },
    country: { type: String, default: null }
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  displayName: { 
    type: String,
    default: function() {
      return `${this.firstName} ${this.lastName}`;
    }
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['admin', 'manager', 'user', 'client'] 
  },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['active', 'pending', 'inactive', 'suspended'] 
  },
  companyId: { type: String, default: null },
  profile: { type: userProfileSchema, default: () => ({}) },
  lastLogin: { type: Date, default: null },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null }
}, {
  timestamps: true
});

// Indexes for performance optimization
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ companyId: 1 });

// Transform JSON output to hide sensitive fields
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

// Create a unique compound index
userSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
