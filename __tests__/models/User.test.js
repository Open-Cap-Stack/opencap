/**
 * Tests for User Model
 * Feature: OCDI-102: Create User data model
 * Bug: OCDI-303: Fix User Authentication Test Failures
 * 
 * OpenCap Coverage Requirements:
 * - Models: 90% statements, 80% branches, 90% lines, 90% functions
 */

const mongoose = require('mongoose');
const User = require('../../models/User');
const { connectToMongoDB, closeMongoDBConnection } = require('../../db/mongoConnection');

// Use a separate test database
process.env.NODE_ENV = 'test';

describe('User Model (OCDI-102)', () => {
  // Connect to test database before all tests
  beforeAll(async () => {
    await connectToMongoDB();
  });

  // Clean up database after each test
  afterEach(async () => {
    await User.deleteMany({});
  });

  // Disconnect from database after all tests
  afterAll(async () => {
    await closeMongoDBConnection();
  });

  describe('Fields validation', () => {
    it('should create a user with all required fields', async () => {
      const userData = {
        userId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword123',
        role: 'user',
        status: 'active',
        companyId: 'company123'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.displayName).toBe(userData.displayName);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.status).toBe(userData.status);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should require email, password, and role', async () => {
      const userData = {
        userId: 'user123',
        firstName: 'John',
        lastName: 'Doe'
      };

      let validationError;
      try {
        const user = new User(userData);
        await user.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
      expect(validationError.errors.role).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      // Create first user with unique userId and email
      const userData1 = {
        userId: new mongoose.Types.ObjectId().toString(), // Generate unique userId
        firstName: 'John',
        lastName: 'Doe',
        email: `duplicate-test-${Date.now()}@example.com`, // Ensure unique email
        password: 'hashedPassword123',
        role: 'user',
        status: 'active'
      };
      
      // Save the first user
      const user1 = await new User(userData1).save();
      expect(user1._id).toBeDefined();
      
      // Attempt to create second user with same email but different userId
      const userData2 = {
        userId: new mongoose.Types.ObjectId().toString(), // Generate unique userId
        firstName: 'Jane',
        lastName: 'Smith',
        email: userData1.email, // Use the same email as the first user
        password: 'hashedPassword456',
        role: 'user',
        status: 'active'
      };
      
      // Try to save and catch the duplicate key error
      let duplicateError;
      try {
        const duplicateUser = new User(userData2);
        await duplicateUser.save();
      } catch (error) {
        duplicateError = error;
      }
      
      // Check that we got an error and it's the right type
      expect(duplicateError).toBeDefined();
      expect(duplicateError.name).toBe('MongoServerError');
      expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
    });
  });
  
  describe('Default values', () => {
    it('should set default values correctly', async () => {
      const userData = {
        userId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashedPassword123',
        role: 'user'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.status).toBe('pending'); // Default status
      expect(savedUser.displayName).toBe('John Doe'); // Generated from firstName + lastName
      expect(savedUser.profile).toBeDefined(); // Default empty profile object
      expect(savedUser.profile.bio).toBe('');
      expect(savedUser.lastLogin).toBe(null);
    });
  });

  describe('Instance methods', () => {
    it('should have a toJSON method that excludes password and sensitive fields', async () => {
      const userData = {
        userId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword123',
        role: 'user',
        status: 'active'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      const userJson = savedUser.toJSON();
      
      expect(userJson).not.toHaveProperty('password');
      expect(userJson).toHaveProperty('firstName');
      expect(userJson).toHaveProperty('email');
      expect(userJson).toHaveProperty('userId');
      expect(userJson).toHaveProperty('role');
    });
    
    it('should generate a display name when not provided', async () => {
      const userData = {
        userId: 'user456',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'hashedPassword456',
        role: 'user'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.displayName).toBe('Jane Smith');
    });
    
    it('should use provided display name when available', async () => {
      const userData = {
        userId: 'user789',
        firstName: 'Robert',
        lastName: 'Johnson',
        displayName: 'Bob J',
        email: 'robert@example.com',
        password: 'hashedPassword789',
        role: 'user'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.displayName).toBe('Bob J');
    });
  });
  
  describe('Validation and edge cases', () => {
    it('should validate role enum values', async () => {
      const userData = {
        userId: 'user111',
        firstName: 'Valid',
        lastName: 'User',
        email: 'valid@example.com',
        password: 'validPassword123',
        role: 'invalid-role' // Invalid role
      };
      
      let validationError;
      try {
        const user = new User(userData);
        await user.save();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.errors.role).toBeDefined();
    });
    
    it('should validate status enum values', async () => {
      const userData = {
        userId: 'user222',
        firstName: 'Status',
        lastName: 'Test',
        email: 'status@example.com',
        password: 'statusPassword123',
        role: 'user',
        status: 'invalid-status' // Invalid status
      };
      
      let validationError;
      try {
        const user = new User(userData);
        await user.save();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.errors.status).toBeDefined();
    });
    
    it('should allow profile data to be updated', async () => {
      const userData = {
        userId: 'user333',
        firstName: 'Profile',
        lastName: 'User',
        email: 'profile@example.com',
        password: 'profilePassword123',
        role: 'user',
        profile: {
          bio: 'Initial bio',
          location: 'Initial location'
        }
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      // Update profile
      savedUser.profile.bio = 'Updated bio';
      savedUser.profile.location = 'Updated location';
      savedUser.profile.website = 'https://example.com';
      
      const updatedUser = await savedUser.save();
      
      expect(updatedUser.profile.bio).toBe('Updated bio');
      expect(updatedUser.profile.location).toBe('Updated location');
      expect(updatedUser.profile.website).toBe('https://example.com');
    });
    
    it('should track email verification status', async () => {
      const userData = {
        userId: 'user444',
        firstName: 'Verify',
        lastName: 'Email',
        email: 'verify@example.com',
        password: 'verifyPassword123',
        role: 'user'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      // Default should be false
      expect(savedUser.emailVerified).toBe(false);
      
      // Update verification status
      savedUser.emailVerified = true;
      savedUser.verificationDate = new Date();
      
      const verifiedUser = await savedUser.save();
      
      expect(verifiedUser.emailVerified).toBe(true);
      expect(verifiedUser.verificationDate).toBeDefined();
    });
  });
  
  describe('Admin and special roles', () => {
    it('should allow creation of admin users', async () => {
      const adminUserData = {
        userId: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'adminPassword123',
        role: 'admin',
        status: 'active'
      };
      
      const adminUser = new User(adminUserData);
      const savedAdmin = await adminUser.save();
      
      expect(savedAdmin.role).toBe('admin');
    });
    
    it('should allow creation of manager users', async () => {
      const managerUserData = {
        userId: 'manager123',
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@example.com',
        password: 'managerPassword123',
        role: 'manager',
        status: 'active'
      };
      
      const managerUser = new User(managerUserData);
      const savedManager = await managerUser.save();
      
      expect(savedManager.role).toBe('manager');
    });
  });
  
  describe('Account management', () => {
    it('should update last login date', async () => {
      const userData = {
        userId: 'login123',
        firstName: 'Login',
        lastName: 'User',
        email: 'login@example.com',
        password: 'loginPassword123',
        role: 'user',
        status: 'active'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      // Initially null
      expect(savedUser.lastLogin).toBe(null);
      
      // Update last login
      const loginDate = new Date();
      savedUser.lastLogin = loginDate;
      const updatedUser = await savedUser.save();
      
      expect(updatedUser.lastLogin).toEqual(loginDate);
    });
    
    it('should update account status', async () => {
      const userData = {
        userId: 'status123',
        firstName: 'Status',
        lastName: 'Update',
        email: 'status-update@example.com',
        password: 'statusPassword123',
        role: 'user',
        status: 'pending'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      // Initial status
      expect(savedUser.status).toBe('pending');
      
      // Update to active
      savedUser.status = 'active';
      let updatedUser = await savedUser.save();
      expect(updatedUser.status).toBe('active');
      
      // Update to suspended
      updatedUser.status = 'suspended';
      let suspendedUser = await updatedUser.save();
      expect(suspendedUser.status).toBe('suspended');
      
      // Update to inactive
      suspendedUser.status = 'inactive';
      let inactiveUser = await suspendedUser.save();
      expect(inactiveUser.status).toBe('inactive');
    });
  });
});
