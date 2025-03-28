/**
 * User Model Permissions Tests
 * [Feature] OCAE-302: Implement role-based access control
 */

const mongoose = require('mongoose');
const User = require('../../models/User');

describe('User Model Permissions', () => {
  beforeAll(async () => {
    // The docker-test-env.js setup should have already connected to the test MongoDB
    console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({
      email: /^test.*@example\.com$/
    });
  });

  describe('Default permissions based on role', () => {
    it('should assign admin permissions to admin users', async () => {
      const adminUser = new User({
        userId: 'test-admin-' + Date.now(),
        firstName: 'Admin',
        lastName: 'User',
        email: `admin-${Date.now()}@example.com`,
        password: 'password123',
        role: 'admin',
        status: 'active'
      });

      await adminUser.save();
      
      const savedUser = await User.findOne({ userId: adminUser.userId });
      
      expect(savedUser.permissions).toBeInstanceOf(Array);
      expect(savedUser.permissions).toContain('read:users');
      expect(savedUser.permissions).toContain('write:users');
      expect(savedUser.permissions).toContain('delete:users');
      expect(savedUser.permissions).toContain('read:companies');
      expect(savedUser.permissions).toContain('write:companies');
      expect(savedUser.permissions).toContain('delete:companies');
      // Should include all possible permissions
    });

    it('should assign manager permissions to manager users', async () => {
      const managerUser = new User({
        userId: 'test-manager-' + Date.now(),
        firstName: 'Manager',
        lastName: 'User',
        email: `manager-${Date.now()}@example.com`,
        password: 'password123',
        role: 'manager',
        status: 'active'
      });

      await managerUser.save();
      
      const savedUser = await User.findOne({ userId: managerUser.userId });
      
      expect(savedUser.permissions).toBeInstanceOf(Array);
      expect(savedUser.permissions).toContain('read:users');
      expect(savedUser.permissions).toContain('write:users');
      expect(savedUser.permissions).toContain('read:companies');
      expect(savedUser.permissions).toContain('write:companies');
      // Should not include delete permissions
      expect(savedUser.permissions).not.toContain('delete:companies');
      expect(savedUser.permissions).not.toContain('delete:users');
    });

    it('should assign user permissions to regular users', async () => {
      const regularUser = new User({
        userId: 'test-user-' + Date.now(),
        firstName: 'Regular',
        lastName: 'User',
        email: `user-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
        status: 'active'
      });

      await regularUser.save();
      
      const savedUser = await User.findOne({ userId: regularUser.userId });
      
      expect(savedUser.permissions).toBeInstanceOf(Array);
      expect(savedUser.permissions).toContain('read:users');
      expect(savedUser.permissions).toContain('read:companies');
      // Should not include write/delete permissions
      expect(savedUser.permissions).not.toContain('write:companies');
      expect(savedUser.permissions).not.toContain('delete:companies');
      expect(savedUser.permissions).not.toContain('write:users');
      expect(savedUser.permissions).not.toContain('delete:users');
    });

    it('should assign client permissions to client users', async () => {
      const clientUser = new User({
        userId: 'test-client-' + Date.now(),
        firstName: 'Client',
        lastName: 'User',
        email: `client-${Date.now()}@example.com`,
        password: 'password123',
        role: 'client',
        status: 'active'
      });

      await clientUser.save();
      
      const savedUser = await User.findOne({ userId: clientUser.userId });
      
      expect(savedUser.permissions).toBeInstanceOf(Array);
      expect(savedUser.permissions).toContain('read:companies');
      // Should have very limited permissions
      expect(savedUser.permissions).not.toContain('write:companies');
      expect(savedUser.permissions).not.toContain('delete:companies');
      expect(savedUser.permissions).not.toContain('read:users');
      expect(savedUser.permissions).not.toContain('write:users');
      expect(savedUser.permissions).not.toContain('delete:users');
    });
  });

  describe('Manual permission assignment', () => {
    it('should allow manual assignment of permissions', async () => {
      const customUser = new User({
        userId: 'test-custom-' + Date.now(),
        firstName: 'Custom',
        lastName: 'User',
        email: `custom-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
        status: 'active',
        permissions: ['read:users', 'read:companies', 'custom:permission']
      });

      await customUser.save();
      
      const savedUser = await User.findOne({ userId: customUser.userId });
      
      expect(savedUser.permissions).toBeInstanceOf(Array);
      expect(savedUser.permissions).toContain('read:users');
      expect(savedUser.permissions).toContain('read:companies');
      expect(savedUser.permissions).toContain('custom:permission');
      expect(savedUser.permissions).not.toContain('write:companies');
    });

    it('should allow updating permissions after creation', async () => {
      const user = new User({
        userId: 'test-update-' + Date.now(),
        firstName: 'Update',
        lastName: 'User',
        email: `update-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
        status: 'active'
      });

      await user.save();
      
      // Update permissions
      user.permissions = ['read:users', 'read:companies', 'special:permission'];
      await user.save();
      
      const updatedUser = await User.findOne({ userId: user.userId });
      
      expect(updatedUser.permissions).toBeInstanceOf(Array);
      expect(updatedUser.permissions).toContain('read:users');
      expect(updatedUser.permissions).toContain('read:companies');
      expect(updatedUser.permissions).toContain('special:permission');
    });
  });
});
