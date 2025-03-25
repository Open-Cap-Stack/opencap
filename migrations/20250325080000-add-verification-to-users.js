/**
 * Migration: Add verification fields to users
 * Created: 2025-03-25T08:00:00.000Z
 * 
 * [Chore] OCDI-107: Example migration file
 * 
 * This sample migration adds email verification fields to the User model
 */

module.exports = {
  name: 'add-verification-to-users',
  description: 'Add email verification fields to the User model',
  
  /**
   * Apply the migration
   * @returns {Promise<void>}
   */
  up: async function() {
    const User = require('../models/User');
    console.log('Adding email verification fields to User model...');
    
    // Update all user documents to add isVerified field
    await User.updateMany(
      { isVerified: { $exists: false } }, 
      { $set: { isVerified: false } }
    );
    
    // Add verification token and expiry fields for any users without them
    await User.updateMany(
      { verificationToken: { $exists: false } }, 
      { 
        $set: { 
          verificationToken: null,
          verificationTokenExpiry: null
        } 
      }
    );
    
    console.log('Successfully added verification fields to User model');
  },
  
  /**
   * Rollback the migration
   * @returns {Promise<void>}
   */
  down: async function() {
    const User = require('../models/User');
    console.log('Removing email verification fields from User model...');
    
    // Remove verification fields from all users
    await User.updateMany(
      {}, 
      { 
        $unset: { 
          isVerified: "",
          verificationToken: "",
          verificationTokenExpiry: ""
        } 
      }
    );
    
    console.log('Successfully removed verification fields from User model');
  }
};
