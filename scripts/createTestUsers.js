/**
 * Create Test Users Script
 * 
 * Creates admin and test user accounts for local and production testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { connectToMongoDB } = require('../db/mongoConnection');

// Generate secure random passwords
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '@#$%'[Math.floor(Math.random() * 4)]; // Special char
  
  // Fill remaining length with random chars
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Test user configurations
const testUsers = [
  {
    userId: 'admin-001',
    firstName: 'Sanket',
    lastName: 'Admin',
    email: 'sanket@opencapstack.com',
    role: 'admin',
    status: 'active',
    companyId: 'opencap-main-001',
    password: generatePassword()
  },
  {
    userId: 'test-user-001', 
    firstName: 'Test',
    lastName: 'User',
    email: 'test@opencapstack.com',
    role: 'user',
    status: 'active',
    companyId: 'opencap-test-001',
    password: generatePassword()
  }
];

async function createTestUsers() {
  try {
    console.log('🚀 Starting test user creation process...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to MongoDB
    await connectToMongoDB();
    console.log('✅ Connected to MongoDB');

    const createdUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          
          // Update password for existing user
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await User.findOneAndUpdate(
            { email: userData.email },
            { 
              password: hashedPassword,
              status: 'active',
              role: userData.role
            }
          );
          
          createdUsers.push({
            email: userData.email,
            password: userData.password,
            role: userData.role,
            status: 'updated'
          });
          
          console.log(`✅ Updated existing user: ${userData.email}`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user object
        const newUser = new User({
          userId: userData.userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          status: userData.status,
          companyId: userData.companyId,
          emailVerified: true // Auto-verify for test accounts
        });

        // Save user
        await newUser.save();
        
        createdUsers.push({
          email: userData.email,
          password: userData.password,
          role: userData.role,
          status: 'created'
        });

        console.log(`✅ Created user: ${userData.email} (${userData.role})`);

      } catch (userError) {
        console.error(`❌ Error creating user ${userData.email}:`, userError.message);
      }
    }

    // Display summary
    console.log('\n📋 USER CREATION SUMMARY');
    console.log('========================');
    
    createdUsers.forEach(user => {
      console.log(`\n👤 ${user.role.toUpperCase()} ACCOUNT:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Role: ${user.role}`);
    });

    console.log('\n🔐 IMPORTANT SECURITY NOTES:');
    console.log('- These are randomly generated secure passwords');
    console.log('- Passwords meet all complexity requirements');
    console.log('- Store these credentials securely');
    console.log('- Change passwords in production if needed');

    // Save credentials to file for reference
    const credentialsFile = `./test-credentials-${Date.now()}.json`;
    const fs = require('fs');
    
    fs.writeFileSync(credentialsFile, JSON.stringify({
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      users: createdUsers
    }, null, 2));
    
    console.log(`\n💾 Credentials saved to: ${credentialsFile}`);
    console.log('📝 This file contains sensitive information - handle securely!');

    return createdUsers;

  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    throw error;
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// CLI execution
if (require.main === module) {
  createTestUsers()
    .then((users) => {
      console.log('\n🎉 Test user creation completed successfully!');
      console.log(`📊 Created/Updated ${users.length} users`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestUsers, testUsers };