const mongoose = require('mongoose');
const { connectToMongoDB } = require('../db/mongoConnection');

async function activateUser(email) {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Import the User model
    const User = require('../models/User');
    
    // Update the user's status to 'active'
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { status: 'active' } },
      { new: true }
    );
    
    if (!updatedUser) {
      console.error('User not found');
      process.exit(1);
    }
    
    console.log('User activated successfully:', {
      email: updatedUser.email,
      status: updatedUser.status,
      role: updatedUser.role
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error activating user:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

activateUser(email);
