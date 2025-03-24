/**
 * Tests for User Model
 * Feature: OCDI-102: Create User data model
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
      // Create first user
      const userData1 = {
        userId: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'duplicate@example.com',
        password: 'hashedPassword123',
        role: 'user',
        status: 'active'
      };
      
      await new User(userData1).save();
      
      // Attempt to create second user with same email
      const userData2 = {
        userId: 'user456',
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
        email: 'duplicate@example.com',
        password: 'hashedPassword456',
        role: 'user',
        status: 'active'
      };
      
      let duplicateError;
      try {
        await new User(userData2).save();
      } catch (error) {
        duplicateError = error;
      }
      
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
    });
  });
});
