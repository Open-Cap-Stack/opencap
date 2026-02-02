/**
 * SPV Model Enum Validation Tests
 *
 * Tests for Issue #125: Fix Data Model Enum Mismatches with Frontend
 * Validates that SPV status enum includes: 'active', 'draft', 'pending', 'closed', 'liquidated' (lowercase)
 */

const mongoose = require('mongoose');

describe('SPV Model Status Enum Validation', () => {
  let SPV;
  let spvSchema;

  beforeAll(() => {
    // Clear any cached model
    if (mongoose.models.SPV) {
      delete mongoose.models.SPV;
    }

    // Get fresh model
    jest.resetModules();
    SPV = require('../../../models/SPV');

    // Access the schema to validate enum values
    spvSchema = SPV.schema;
  });

  describe('Status Enum Values', () => {
    const expectedStatuses = ['active', 'draft', 'pending', 'closed', 'liquidated'];

    it('should have Status field defined in schema', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField).toBeDefined();
    });

    it('should have status enum with all required values', () => {
      const statusField = spvSchema.path('Status');
      const enumValues = statusField.enumValues;

      expect(enumValues).toBeDefined();
      expect(Array.isArray(enumValues)).toBe(true);

      expectedStatuses.forEach(status => {
        expect(enumValues).toContain(status);
      });
    });

    it('should use lowercase values for all statuses', () => {
      const statusField = spvSchema.path('Status');
      const enumValues = statusField.enumValues;

      enumValues.forEach(status => {
        expect(status).toBe(status.toLowerCase());
      });
    });

    it('should include "draft" status for SPVs in draft state', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField.enumValues).toContain('draft');
    });

    it('should include "liquidated" status for liquidated SPVs', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField.enumValues).toContain('liquidated');
    });

    it('should have lowercase "active" instead of "Active"', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField.enumValues).toContain('active');
      expect(statusField.enumValues).not.toContain('Active');
    });

    it('should have lowercase "pending" instead of "Pending"', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField.enumValues).toContain('pending');
      expect(statusField.enumValues).not.toContain('Pending');
    });

    it('should have lowercase "closed" instead of "Closed"', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField.enumValues).toContain('closed');
      expect(statusField.enumValues).not.toContain('Closed');
    });

    it('should have exactly 5 status values', () => {
      const statusField = spvSchema.path('Status');
      expect(statusField.enumValues.length).toBe(5);
    });
  });

  describe('Status Enum Validation Behavior', () => {
    it('should accept valid "draft" status', async () => {
      const spvData = {
        SPVID: 'spv-draft-123',
        Name: 'Draft SPV',
        Purpose: 'Testing draft status',
        CreationDate: new Date(),
        Status: 'draft',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      };

      const spv = new SPV(spvData);
      const validationError = spv.validateSync();

      // Should not have Status validation error
      if (validationError) {
        expect(validationError.errors.Status).toBeUndefined();
      }
      expect(spv.Status).toBe('draft');
    });

    it('should accept valid "liquidated" status', async () => {
      const spvData = {
        SPVID: 'spv-liquidated-123',
        Name: 'Liquidated SPV',
        Purpose: 'Testing liquidated status',
        CreationDate: new Date(),
        Status: 'liquidated',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      };

      const spv = new SPV(spvData);
      const validationError = spv.validateSync();

      // Should not have Status validation error
      if (validationError) {
        expect(validationError.errors.Status).toBeUndefined();
      }
      expect(spv.Status).toBe('liquidated');
    });

    it('should accept valid "active" status (lowercase)', async () => {
      const spvData = {
        SPVID: 'spv-active-123',
        Name: 'Active SPV',
        Purpose: 'Testing active status',
        CreationDate: new Date(),
        Status: 'active',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      };

      const spv = new SPV(spvData);
      const validationError = spv.validateSync();

      // Should not have Status validation error
      if (validationError) {
        expect(validationError.errors.Status).toBeUndefined();
      }
      expect(spv.Status).toBe('active');
    });

    it('should reject uppercase "Active" status', async () => {
      const spvData = {
        SPVID: 'spv-uppercase-123',
        Name: 'Uppercase SPV',
        Purpose: 'Testing uppercase status',
        CreationDate: new Date(),
        Status: 'Active',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      };

      const spv = new SPV(spvData);
      const validationError = spv.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.Status).toBeDefined();
    });

    it('should reject invalid status value', async () => {
      const spvData = {
        SPVID: 'spv-invalid-123',
        Name: 'Invalid SPV',
        Purpose: 'Testing invalid status',
        CreationDate: new Date(),
        Status: 'archived',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      };

      const spv = new SPV(spvData);
      const validationError = spv.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.Status).toBeDefined();
    });
  });
});
