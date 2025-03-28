/**
 * User Model Permissions Coverage Tests
 * [Feature] OCAE-302: Implement role-based access control
 */

const mongoose = require('mongoose');
const User = require('../../models/User');

// Define test helper to evaluate default permissions
const getUserWithDefaultPermissions = (role) => {
  // Create a test user with the specified role
  const user = new User({
    userId: `test-${role}-${Date.now()}`,
    firstName: 'Test',
    lastName: 'User',
    email: `${role}-${Date.now()}@example.com`,
    password: 'password123',
    role: role,
    status: 'active'
  });
  
  // Return the user with its default permissions (without saving to DB)
  return user;
};

describe('User Model Permissions Coverage Tests', () => {
  beforeAll(async () => {
    // Connect to MongoDB test container
    const mongoUri = 'mongodb://opencap:password123@127.0.0.1:27018/opencap_test?authSource=admin';
    await mongoose.connect(mongoUri, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true
    });
    console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Default permissions schema behavior', () => {
    it('should define permissions as an array field in the schema', () => {
      const userSchema = User.schema;
      const permissionsPath = userSchema.path('permissions');
      
      expect(permissionsPath).toBeDefined();
      expect(permissionsPath.instance).toBe('Array');
    });
    
    it('should assign admin permissions to admin users', () => {
      const adminUser = getUserWithDefaultPermissions('admin');
      
      expect(adminUser.permissions).toBeInstanceOf(Array);
      expect(adminUser.permissions).toContain('read:users');
      expect(adminUser.permissions).toContain('write:users');
      expect(adminUser.permissions).toContain('delete:users');
      expect(adminUser.permissions).toContain('read:companies');
      expect(adminUser.permissions).toContain('write:companies');
      expect(adminUser.permissions).toContain('delete:companies');
      expect(adminUser.permissions).toContain('admin:all');
    });

    it('should assign manager permissions to manager users', () => {
      const managerUser = getUserWithDefaultPermissions('manager');
      
      expect(managerUser.permissions).toBeInstanceOf(Array);
      expect(managerUser.permissions).toContain('read:users');
      expect(managerUser.permissions).toContain('write:users');
      expect(managerUser.permissions).toContain('read:companies');
      expect(managerUser.permissions).toContain('write:companies');
      // Should not include delete permissions
      expect(managerUser.permissions).not.toContain('delete:companies');
      expect(managerUser.permissions).not.toContain('delete:users');
      expect(managerUser.permissions).not.toContain('admin:all');
    });

    it('should assign user permissions to regular users', () => {
      const regularUser = getUserWithDefaultPermissions('user');
      
      expect(regularUser.permissions).toBeInstanceOf(Array);
      expect(regularUser.permissions).toContain('read:users');
      expect(regularUser.permissions).toContain('read:companies');
      expect(regularUser.permissions).toContain('read:reports');
      // Should not include write/delete permissions for companies
      expect(regularUser.permissions).not.toContain('write:companies');
      expect(regularUser.permissions).not.toContain('delete:companies');
      expect(regularUser.permissions).not.toContain('delete:users');
      // But should include write compliance
      expect(regularUser.permissions).toContain('write:compliance');
    });

    it('should assign client permissions to client users', () => {
      const clientUser = getUserWithDefaultPermissions('client');
      
      expect(clientUser.permissions).toBeInstanceOf(Array);
      // Match the actual implementation
      expect(clientUser.permissions).toContain('read:users');
      expect(clientUser.permissions).toContain('read:reports');
      expect(clientUser.permissions).toContain('read:spv');
      expect(clientUser.permissions).toContain('read:assets');
      // Should have very limited permissions
      expect(clientUser.permissions).not.toContain('write:companies');
      expect(clientUser.permissions).not.toContain('delete:companies');
      expect(clientUser.permissions).not.toContain('write:users');
      expect(clientUser.permissions).not.toContain('delete:users');
    });
    
    it('should handle unknown roles by assigning empty permissions', () => {
      const unknownRoleUser = getUserWithDefaultPermissions('unknown');
      
      expect(unknownRoleUser.permissions).toBeInstanceOf(Array);
      expect(unknownRoleUser.permissions).toHaveLength(0);
    });
  });

  describe('Manual permission assignment', () => {
    it('should allow overriding default permissions', () => {
      const user = new User({
        userId: `test-custom-${Date.now()}`,
        firstName: 'Custom',
        lastName: 'User',
        email: `custom-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
        status: 'active',
        permissions: ['custom:permission']
      });
      
      expect(user.permissions).toBeInstanceOf(Array);
      expect(user.permissions).toContain('custom:permission');
      expect(user.permissions).not.toContain('read:users');
    });
  });
  
  describe('User model methods', () => {
    it('should transform JSON output to hide sensitive fields', () => {
      const user = new User({
        userId: `test-json-${Date.now()}`,
        firstName: 'JSON',
        lastName: 'Test',
        email: `json-${Date.now()}@example.com`,
        password: 'secret-password',
        role: 'user',
        status: 'active',
        passwordResetToken: 'some-token',
        passwordResetExpires: new Date()
      });
      
      const userJson = user.toJSON();
      
      // Verify sensitive fields are removed
      expect(userJson.password).toBeUndefined();
      expect(userJson.passwordResetToken).toBeUndefined();
      expect(userJson.passwordResetExpires).toBeUndefined();
      
      // Verify other fields are kept
      expect(userJson.userId).toBe(user.userId);
      expect(userJson.firstName).toBe(user.firstName);
      expect(userJson.lastName).toBe(user.lastName);
      expect(userJson.email).toBe(user.email);
      expect(userJson.role).toBe(user.role);
    });
    
    it('should generate displayName from firstName and lastName', () => {
      const user = new User({
        userId: `test-display-${Date.now()}`,
        firstName: 'John',
        lastName: 'Doe',
        email: `display-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
        status: 'active'
      });
      
      expect(user.displayName).toBe('John Doe');
    });
  });
});
