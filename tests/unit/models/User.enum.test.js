/**
 * User Model Enum Validation Tests
 *
 * Tests for Issue #125: Fix Data Model Enum Mismatches with Frontend
 * Validates that User role enum includes: 'admin', 'founder', 'investor', 'manager', 'user', 'client'
 */

const mongoose = require('mongoose');

describe('User Model Role Enum Validation', () => {
  let User;
  let userSchema;

  beforeAll(() => {
    // Clear any cached model
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }

    // Get fresh model
    jest.resetModules();
    User = require('../../../models/User');

    // Access the schema to validate enum values
    userSchema = User.schema;
  });

  describe('Role Enum Values', () => {
    const expectedRoles = ['admin', 'founder', 'investor', 'manager', 'user', 'client'];

    it('should have role field defined in schema', () => {
      const roleField = userSchema.path('role');
      expect(roleField).toBeDefined();
    });

    it('should have role enum with all required values', () => {
      const roleField = userSchema.path('role');
      const enumValues = roleField.enumValues;

      expect(enumValues).toBeDefined();
      expect(Array.isArray(enumValues)).toBe(true);

      expectedRoles.forEach(role => {
        expect(enumValues).toContain(role);
      });
    });

    it('should include "founder" role for company founders', () => {
      const roleField = userSchema.path('role');
      expect(roleField.enumValues).toContain('founder');
    });

    it('should include "investor" role for investors', () => {
      const roleField = userSchema.path('role');
      expect(roleField.enumValues).toContain('investor');
    });

    it('should maintain backward compatibility with existing roles', () => {
      const roleField = userSchema.path('role');
      const existingRoles = ['admin', 'manager', 'user', 'client'];

      existingRoles.forEach(role => {
        expect(roleField.enumValues).toContain(role);
      });
    });

    it('should have exactly 6 role values', () => {
      const roleField = userSchema.path('role');
      expect(roleField.enumValues.length).toBe(6);
    });
  });

  describe('Role Enum Validation Behavior', () => {
    it('should accept valid "founder" role', async () => {
      const userData = {
        userId: 'founder-test-123',
        firstName: 'Founder',
        lastName: 'Test',
        email: 'founder@example.com',
        password: 'password123',
        role: 'founder'
      };

      const user = new User(userData);
      const validationError = user.validateSync();

      // Should not have role validation error
      if (validationError) {
        expect(validationError.errors.role).toBeUndefined();
      }
      expect(user.role).toBe('founder');
    });

    it('should accept valid "investor" role', async () => {
      const userData = {
        userId: 'investor-test-123',
        firstName: 'Investor',
        lastName: 'Test',
        email: 'investor@example.com',
        password: 'password123',
        role: 'investor'
      };

      const user = new User(userData);
      const validationError = user.validateSync();

      // Should not have role validation error
      if (validationError) {
        expect(validationError.errors.role).toBeUndefined();
      }
      expect(user.role).toBe('investor');
    });

    it('should reject invalid role value', async () => {
      const userData = {
        userId: 'invalid-role-123',
        firstName: 'Invalid',
        lastName: 'Role',
        email: 'invalid@example.com',
        password: 'password123',
        role: 'superadmin'
      };

      const user = new User(userData);
      const validationError = user.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.role).toBeDefined();
    });
  });
});
