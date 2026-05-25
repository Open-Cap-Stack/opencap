/**
 * User Model Enum Validation Tests
 * Tests for Issue #125: Fix Data Model Enum Mismatches with Frontend
 */
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(), queryTable: jest.fn(), updateRows: jest.fn(),
  deleteRows: jest.fn(), initialize: jest.fn(), projectId: 'mock-project-id'
}));

describe('User Model Role Enum Validation', () => {
  let User;

  beforeAll(() => {
    jest.resetModules();
    User = require('../../../models/User');
  });

  describe('Role Enum Values', () => {
    const expectedRoles = ['admin', 'founder', 'investor', 'manager', 'employee', 'client', 'service_provider'];

    it('should have role field defined in schema', () => {
      expect(User.schema.role).toBeDefined();
    });

    it('should have role enum with all required values', () => {
      const enumValues = User.schema.role.enum;
      expect(enumValues).toBeDefined();
      expect(Array.isArray(enumValues)).toBe(true);
      expectedRoles.forEach(role => {
        expect(enumValues).toContain(role);
      });
    });

    it('should include founder role for company founders', () => {
      expect(User.schema.role.enum).toContain('founder');
    });

    it('should include investor role for investors', () => {
      expect(User.schema.role.enum).toContain('investor');
    });

    it('should maintain backward compatibility with existing roles', () => {
      const existingRoles = ['admin', 'manager', 'employee', 'client'];
      existingRoles.forEach(role => {
        expect(User.schema.role.enum).toContain(role);
      });
    });

    it('should have exactly 9 role values', () => {
      expect(User.schema.role.enum.length).toBe(9);
    });

    it('should include super_admin role for platform-wide administrators', () => {
      expect(User.schema.role.enum).toContain('super_admin');
    });
  });

  describe('Role Enum Validation Behavior', () => {
    it('should accept valid founder role', () => {
      const validRoles = User.schema.role.enum;
      expect(validRoles).toContain('founder');
    });

    it('should accept valid investor role', () => {
      const validRoles = User.schema.role.enum;
      expect(validRoles).toContain('investor');
    });

    it('should reject invalid role value', () => {
      const validRoles = User.schema.role.enum;
      expect(validRoles).not.toContain('superadmin');
    });
  });

  describe('Role Field Properties', () => {
    it('should have role as required', () => {
      expect(User.schema.role.required).toBe(true);
    });

    it('should have role as string type', () => {
      expect(User.schema.role.type).toBe('string');
    });
  });

  describe('Status Enum Values', () => {
    it('should have status field defined', () => {
      expect(User.schema.status).toBeDefined();
    });

    it('should have valid status enum values', () => {
      ['active', 'pending', 'inactive', 'suspended'].forEach(s => {
        expect(User.schema.status.enum).toContain(s);
      });
    });

    it('should default status to pending', () => {
      expect(User.schema.status.default).toBe('pending');
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => { expect(typeof User.create).toBe('function'); });
    it('should have find method', () => { expect(typeof User.find).toBe('function'); });
    it('should have findOne method', () => { expect(typeof User.findOne).toBe('function'); });
    it('should have updateOne method', () => { expect(typeof User.updateOne).toBe('function'); });
    it('should have deleteOne method', () => { expect(typeof User.deleteOne).toBe('function'); });
  });

  describe('Table Name', () => {
    it('should have correct table name', () => { expect(User.tableName).toBe('users'); });
  });
});