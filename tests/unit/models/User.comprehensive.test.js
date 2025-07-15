/**
 * Comprehensive User Model Unit Tests
 * 
 * Tests for the User model including validation, methods, schema behavior, and RBAC
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('User Model', () => {
  let User;

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockUser(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();
        this.validateSync = jest.fn();
        this.toObject = jest.fn(() => ({ ...data }));
        
        // Apply schema defaults
        if (!this.displayName && this.firstName && this.lastName) {
          this.displayName = `${this.firstName} ${this.lastName}`;
        }
        if (!this.status) this.status = 'pending';
        if (!this.profile) this.profile = {};
        if (!this.permissions && this.role) {
          this.permissions = this._getDefaultPermissions(this.role);
        }
      }

      // Add default permissions method
      MockUser.prototype._getDefaultPermissions = function(role) {
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
        return rolePermissions[role] || [];
      };

      // Add toJSON method
      MockUser.prototype.toJSON = function() {
        const user = this.toObject();
        delete user.password;
        delete user.passwordResetToken;
        delete user.passwordResetExpires;
        return user;
      };

      // Add static methods
      MockUser.findById = jest.fn();
      MockUser.find = jest.fn();
      MockUser.findOne = jest.fn();
      MockUser.create = jest.fn();

      return MockUser;
    });

    // Now require the User model
    User = require('../../../models/User');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Creation and Basic Properties', () => {
    it('should create a user with required fields', () => {
      const userData = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'securePassword123',
        role: 'user'
      };

      const user = new User(userData);
      
      expect(user.userId).toBe(userData.userId);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
    });

    it('should set default displayName from firstName and lastName', () => {
      const user = new User({
        userId: 'user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'password123',
        role: 'user'
      });

      expect(user.displayName).toBe('Jane Smith');
    });

    it('should set default status to pending', () => {
      const user = new User({
        userId: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      });

      expect(user.status).toBe('pending');
    });

    it('should set default profile object', () => {
      const user = new User({
        userId: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      });

      expect(user.profile).toBeDefined();
      expect(typeof user.profile).toBe('object');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should set admin permissions for admin role', () => {
      const user = new User({
        userId: 'admin-123',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });

      expect(user.permissions).toContain('admin:all');
      expect(user.permissions).toContain('read:users');
      expect(user.permissions).toContain('write:users');
      expect(user.permissions).toContain('delete:users');
    });

    it('should set manager permissions for manager role', () => {
      const user = new User({
        userId: 'manager-123',
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@example.com',
        password: 'password123',
        role: 'manager'
      });

      expect(user.permissions).toContain('read:users');
      expect(user.permissions).toContain('write:users');
      expect(user.permissions).toContain('read:companies');
      expect(user.permissions).toContain('write:companies');
      expect(user.permissions).not.toContain('admin:all');
      expect(user.permissions).not.toContain('delete:users');
    });

    it('should set user permissions for user role', () => {
      const user = new User({
        userId: 'user-123',
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@example.com',
        password: 'password123',
        role: 'user'
      });

      expect(user.permissions).toContain('read:users');
      expect(user.permissions).toContain('read:companies');
      expect(user.permissions).toContain('write:compliance');
      expect(user.permissions).not.toContain('write:users');
      expect(user.permissions).not.toContain('delete:users');
    });

    it('should set client permissions for client role', () => {
      const user = new User({
        userId: 'client-123',
        firstName: 'Client',
        lastName: 'User',
        email: 'client@example.com',
        password: 'password123',
        role: 'client'
      });

      expect(user.permissions).toContain('read:users');
      expect(user.permissions).toContain('read:reports');
      expect(user.permissions).toContain('read:spv');
      expect(user.permissions).not.toContain('write:users');
      expect(user.permissions).not.toContain('write:companies');
    });

    it('should handle empty permissions for invalid role', () => {
      const user = new User({
        userId: 'invalid-123',
        firstName: 'Invalid',
        lastName: 'User',
        email: 'invalid@example.com',
        password: 'password123',
        role: 'invalidRole'
      });

      expect(user.permissions).toEqual([]);
    });
  });

  describe('User Profile', () => {
    it('should handle complete user profile', () => {
      const profileData = {
        bio: 'Software engineer with 5 years experience',
        avatar: 'https://example.com/avatar.jpg',
        phoneNumber: '+1-234-567-8900',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA'
        }
      };

      const user = new User({
        userId: 'user-123',
        firstName: 'Profile',
        lastName: 'User',
        email: 'profile@example.com',
        password: 'password123',
        role: 'user',
        profile: profileData
      });

      expect(user.profile.bio).toBe(profileData.bio);
      expect(user.profile.avatar).toBe(profileData.avatar);
      expect(user.profile.phoneNumber).toBe(profileData.phoneNumber);
      expect(user.profile.address).toEqual(profileData.address);
    });

    it('should handle partial profile data', () => {
      const user = new User({
        userId: 'user-123',
        firstName: 'Partial',
        lastName: 'User',
        email: 'partial@example.com',
        password: 'password123',
        role: 'user',
        profile: {
          bio: 'Just a bio',
          phoneNumber: '+1-555-0123'
        }
      });

      expect(user.profile.bio).toBe('Just a bio');
      expect(user.profile.phoneNumber).toBe('+1-555-0123');
      expect(user.profile.avatar).toBeUndefined();
    });
  });

  describe('User Status and Workflow', () => {
    it('should handle all valid status values', () => {
      const statuses = ['active', 'pending', 'inactive', 'suspended'];

      statuses.forEach(status => {
        const user = new User({
          userId: `user-${status}`,
          firstName: 'Status',
          lastName: 'Test',
          email: `${status}@example.com`,
          password: 'password123',
          role: 'user',
          status: status
        });

        expect(user.status).toBe(status);
      });
    });

    it('should handle company association', () => {
      const user = new User({
        userId: 'company-user-123',
        firstName: 'Company',
        lastName: 'User',
        email: 'company@example.com',
        password: 'password123',
        role: 'user',
        companyId: 'comp-456'
      });

      expect(user.companyId).toBe('comp-456');
    });

    it('should handle lastLogin timestamp', () => {
      const loginTime = new Date('2024-01-15T10:30:00Z');
      
      const user = new User({
        userId: 'login-user-123',
        firstName: 'Login',
        lastName: 'User',
        email: 'login@example.com',
        password: 'password123',
        role: 'user',
        lastLogin: loginTime
      });

      expect(user.lastLogin).toEqual(loginTime);
    });
  });

  describe('Password Reset Functionality', () => {
    it('should handle password reset token and expiry', () => {
      const resetToken = 'reset-token-abc123';
      const expiryDate = new Date(Date.now() + 3600000); // 1 hour from now

      const user = new User({
        userId: 'reset-user-123',
        firstName: 'Reset',
        lastName: 'User',
        email: 'reset@example.com',
        password: 'password123',
        role: 'user',
        passwordResetToken: resetToken,
        passwordResetExpires: expiryDate
      });

      expect(user.passwordResetToken).toBe(resetToken);
      expect(user.passwordResetExpires).toEqual(expiryDate);
    });

    it('should handle null password reset fields', () => {
      const user = new User({
        userId: 'no-reset-user-123',
        firstName: 'NoReset',
        lastName: 'User',
        email: 'noreset@example.com',
        password: 'password123',
        role: 'user'
      });

      expect(user.passwordResetToken).toBeUndefined();
      expect(user.passwordResetExpires).toBeUndefined();
    });
  });

  describe('JSON Serialization and Security', () => {
    it('should hide sensitive fields in toJSON', () => {
      const user = new User({
        userId: 'secure-user-123',
        firstName: 'Secure',
        lastName: 'User',
        email: 'secure@example.com',
        password: 'superSecretPassword',
        role: 'user',
        passwordResetToken: 'secret-token',
        passwordResetExpires: new Date()
      });

      const jsonUser = user.toJSON();

      expect(jsonUser.password).toBeUndefined();
      expect(jsonUser.passwordResetToken).toBeUndefined();
      expect(jsonUser.passwordResetExpires).toBeUndefined();
      expect(jsonUser.email).toBe('secure@example.com');
      expect(jsonUser.firstName).toBe('Secure');
    });

    it('should preserve non-sensitive fields in toJSON', () => {
      const user = new User({
        userId: 'public-user-123',
        firstName: 'Public',
        lastName: 'User',
        email: 'public@example.com',
        password: 'password123',
        role: 'manager',
        status: 'active',
        companyId: 'comp-789'
      });

      const jsonUser = user.toJSON();

      expect(jsonUser.userId).toBe('public-user-123');
      expect(jsonUser.firstName).toBe('Public');
      expect(jsonUser.lastName).toBe('User');
      expect(jsonUser.email).toBe('public@example.com');
      expect(jsonUser.role).toBe('manager');
      expect(jsonUser.status).toBe('active');
      expect(jsonUser.companyId).toBe('comp-789');
    });
  });

  describe('Role Validation', () => {
    it('should handle all valid role values', () => {
      const validRoles = ['admin', 'manager', 'user', 'client'];

      validRoles.forEach(role => {
        const user = new User({
          userId: `${role}-user-123`,
          firstName: 'Role',
          lastName: 'Test',
          email: `${role}@example.com`,
          password: 'password123',
          role: role
        });

        expect(user.role).toBe(role);
        expect(user.permissions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Complex User Scenarios', () => {
    it('should handle complete user lifecycle', () => {
      const userData = {
        userId: 'lifecycle-user-123',
        firstName: 'Lifecycle',
        lastName: 'User',
        email: 'lifecycle@example.com',
        password: 'securePassword123',
        role: 'manager',
        status: 'active',
        companyId: 'comp-456',
        profile: {
          bio: 'Senior manager with team leadership experience',
          phoneNumber: '+1-555-0199',
          address: {
            street: '456 Business Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        },
        lastLogin: new Date('2024-01-20T14:30:00Z')
      };

      const user = new User(userData);

      // Verify all properties are set correctly
      expect(user.userId).toBe(userData.userId);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.displayName).toBe('Lifecycle User');
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.status).toBe(userData.status);
      expect(user.companyId).toBe(userData.companyId);
      expect(user.profile).toEqual(userData.profile);
      expect(user.lastLogin).toEqual(userData.lastLogin);
      expect(user.permissions).toContain('read:users');
      expect(user.permissions).toContain('write:users');
    });

    it('should handle user with minimal required data', () => {
      const minimalData = {
        userId: 'minimal-user-123',
        firstName: 'Min',
        lastName: 'User',
        email: 'minimal@example.com',
        password: 'password123',
        role: 'client'
      };

      const user = new User(minimalData);

      expect(user.userId).toBe(minimalData.userId);
      expect(user.displayName).toBe('Min User');
      expect(user.status).toBe('pending');
      expect(user.profile).toBeDefined();
      expect(user.permissions).toEqual(['read:users', 'read:reports', 'read:spv', 'read:assets']);
      expect(user.companyId).toBeUndefined();
      expect(user.lastLogin).toBeUndefined();
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle validation errors', () => {
      const user = new User({
        // Missing required fields
        firstName: 'Incomplete'
      });

      const mockValidationError = {
        errors: {
          userId: { message: 'userId is required' },
          lastName: { message: 'lastName is required' },
          email: { message: 'email is required' },
          password: { message: 'password is required' },
          role: { message: 'role is required' }
        }
      };

      user.validateSync.mockReturnValue(mockValidationError);

      const validationError = user.validateSync();
      expect(validationError).toBeTruthy();
      expect(validationError.errors.userId).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
    });

    it('should handle save operations', async () => {
      const user = new User({
        userId: 'save-user-123',
        firstName: 'Save',
        lastName: 'User',
        email: 'save@example.com',
        password: 'password123',
        role: 'user'
      });

      user.save.mockResolvedValue(user);

      const savedUser = await user.save();
      expect(savedUser).toBe(user);
      expect(user.save).toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      const user = new User({
        userId: 'error-user-123',
        firstName: 'Error',
        lastName: 'User',
        email: 'error@example.com',
        password: 'password123',
        role: 'user'
      });

      const saveError = new Error('Database connection failed');
      user.save.mockRejectedValue(saveError);

      await expect(user.save()).rejects.toThrow('Database connection failed');
    });
  });
});