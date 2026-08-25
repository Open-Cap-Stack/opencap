/**
 * Create Production Users Script
 * 
 * Creates admin and test user accounts for production database
 * Requires production MongoDB connection string
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Generate secure passwords if not provided via environment
const crypto = require('crypto');
const generateSecurePassword = () => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
};

const productionUsers = [
  {
    userId: 'admin-001',
    firstName: 'Sanket',
    lastName: 'Admin',
    email: 'sanket@opencapstack.com',
    role: 'admin',
    status: 'active',
    companyId: 'opencap-main-001',
    password: process.env.ADMIN_PASSWORD || generateSecurePassword()
  },
  {
    userId: 'test-user-001',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@opencapstack.com',
    role: 'employee',
    status: 'active',
    companyId: 'opencap-test-001',
    password: process.env.TEST_USER_PASSWORD || generateSecurePassword()
  }
];

// User schema definition (for direct mongoose connection)
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
  permissions: {
    type: [String],
    default: function() {
      const rolePermissions = {
        admin: [
          'read:users', 'write:users', 'delete:users',
          'read:companies', 'write:companies', 'delete:companies',
          'read:reports', 'write:reports', 'delete:reports',
          'read:spv', 'write:spv', 'delete:spv',
          'read:assets', 'write:assets', 'delete:assets',
          'read:compliance', 'write:compliance', 'delete:compliance',
          'admin:all'
        ],
        manager: [
          'read:users', 'write:users',
          'read:companies', 'write:companies',
          'read:reports', 'write:reports',
          'read:spv', 'write:spv',
          'read:assets', 'write:assets',
          'read:compliance', 'write:compliance'
        ],
        user: [
          'read:users',
          'read:companies',
          'read:reports',
          'read:spv',
          'read:assets',
          'read:compliance',
          'write:compliance'
        ],
        client: [
          'read:users',
          'read:reports',
          'read:spv',
          'read:assets'
        ]
      };
      return rolePermissions[this.role] || [];
    }
  },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['active', 'pending', 'inactive', 'suspended'] 
  },
  companyId: { type: String, default: null },
  profile: { type: Object, default: () => ({}) },
  lastLogin: { type: Date, default: null },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  emailVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Hide sensitive fields in JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

async function createProductionUsers() {
  try {
    // Get production MongoDB URI from environment or command line
    const productionMongoUri = process.env.PRODUCTION_MONGODB_URI || 
                               process.env.MONGODB_URI ||
                               process.argv[2];

    if (!productionMongoUri) {
      console.error('❌ Production MongoDB URI is required');
      console.log('Usage options:');
      console.log('1. Set PRODUCTION_MONGODB_URI environment variable');
      console.log('2. Pass URI as command line argument: node createProductionUsers.js "mongodb://..."');
      console.log('3. Set MONGODB_URI in production environment');
      process.exit(1);
    }

    console.log('🚀 Creating production users...');
    console.log('⚠️  WARNING: This will connect to production database!');
    console.log(`Database: ${productionMongoUri.split('@')[1] || 'localhost'}`);
    
    // Connect to production MongoDB
    await mongoose.connect(productionMongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to production MongoDB');

    // Create User model
    const User = mongoose.model('User', userSchema);

    const createdUsers = [];

    for (const userData of productionUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, updating password...`);
          
          // Update password for existing user
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await User.findOneAndUpdate(
            { email: userData.email },
            { 
              password: hashedPassword,
              status: 'active',
              role: userData.role,
              emailVerified: true
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

        // Create new user
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
    console.log('\n📋 PRODUCTION USER CREATION SUMMARY');
    console.log('====================================');
    
    createdUsers.forEach(user => {
      console.log(`\n👤 ${user.role.toUpperCase()} ACCOUNT:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Role: ${user.role}`);
    });

    console.log('\n🔐 PRODUCTION SECURITY NOTES:');
    console.log('- These credentials are for testing purposes');
    console.log('- Change passwords after initial testing');
    console.log('- Monitor login activity in production logs');
    console.log('- Consider implementing 2FA for admin accounts');

    return createdUsers;

  } catch (error) {
    console.error('❌ Failed to create production users:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// CLI execution
if (require.main === module) {
  createProductionUsers()
    .then((users) => {
      console.log('\n🎉 Production user creation completed successfully!');
      console.log(`📊 Created/Updated ${users.length} users`);
      console.log('\n🚀 Ready for production testing!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createProductionUsers, productionUsers };