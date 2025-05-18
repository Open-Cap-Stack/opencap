const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { connectToMongoDB } = require('../db/mongoConnection');

async function updateAdminPassword() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Import the User model
    const User = require('../models/User');
    
    // New password to set
    const newPassword = 'NewSecurePassword123!';
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Find and update the admin user
    const adminEmail = 'admin@opencap.org';
    const updatedUser = await User.findOneAndUpdate(
      { email: adminEmail },
      { 
        password: hashedPassword,
        status: 'active' // Ensure the account is active
      },
      { new: true }
    );
    
    if (!updatedUser) {
      console.error('Admin user not found');
      process.exit(1);
    }
    
    console.log('Admin password updated successfully!');
    console.log('Email:', updatedUser.email);
    console.log('New Password:', newPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  }
}

updateAdminPassword();
