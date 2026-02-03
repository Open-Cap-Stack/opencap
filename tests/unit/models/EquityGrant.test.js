/**
 * EquityGrant Model Unit Tests
 * Issue #77: Create Equity Grant Model and Workflow
 * TDD Red Phase: Tests written before implementation
 */

const mongoose = require('mongoose');

// We'll import the model after creating it
let EquityGrant;

describe('EquityGrant Model', () => {
  beforeAll(() => {
    // Import model after it's created
    EquityGrant = require('../../../models/EquityGrant');
  });

  describe('Schema Validation', () => {
    it('should create a valid equity grant with all required fields', () => {
      const validGrant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        },
        status: 'pending'
      });

      const error = validGrant.validateSync();
      expect(error).toBeUndefined();
    });

    it('should require grantId', () => {
      const grant = new EquityGrant({
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.grantId).toBeDefined();
    });

    it('should require employeeId', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.employeeId).toBeDefined();
    });

    it('should require companyId', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.companyId).toBeDefined();
    });

    it('should require grantType', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.grantType).toBeDefined();
    });

    it('should require numberOfShares', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.numberOfShares).toBeDefined();
    });

    it('should require strikePrice', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.strikePrice).toBeDefined();
    });

    it('should require grantDate', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50
      });

      const error = grant.validateSync();
      expect(error.errors.grantDate).toBeDefined();
    });

    it('should validate grantType enum values', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'INVALID_TYPE',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.grantType).toBeDefined();
    });

    it('should accept valid grantType values: ISO', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error).toBeUndefined();
    });

    it('should accept valid grantType values: NSO', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'NSO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error).toBeUndefined();
    });

    it('should accept valid grantType values: RSU', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'RSU',
        numberOfShares: 10000,
        strikePrice: 0,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error).toBeUndefined();
    });

    it('should accept valid grantType values: RSA', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'RSA',
        numberOfShares: 10000,
        strikePrice: 0.01,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error).toBeUndefined();
    });

    it('should validate status enum values', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date(),
        status: 'INVALID_STATUS'
      });

      const error = grant.validateSync();
      expect(error.errors.status).toBeDefined();
    });

    it('should accept valid status values', () => {
      const statuses = ['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'];

      statuses.forEach(status => {
        const grant = new EquityGrant({
          grantId: `GRANT-${status}`,
          employeeId: 'EMP-001',
          companyId: 'COMP-001',
          grantType: 'ISO',
          numberOfShares: 10000,
          strikePrice: 1.50,
          grantDate: new Date(),
          status
        });

        const error = grant.validateSync();
        expect(error).toBeUndefined();
      });
    });

    it('should default status to pending', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      expect(grant.status).toBe('pending');
    });

    it('should validate numberOfShares is positive', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: -100,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.numberOfShares).toBeDefined();
    });

    it('should validate strikePrice is non-negative', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: -1.50,
        grantDate: new Date()
      });

      const error = grant.validateSync();
      expect(error.errors.strikePrice).toBeDefined();
    });
  });

  describe('Vesting Schedule', () => {
    it('should accept valid vesting schedule', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date(),
        vestingSchedule: {
          vestingStartDate: new Date(),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      });

      const error = grant.validateSync();
      expect(error).toBeUndefined();
    });

    it('should validate vestingFrequency enum', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date(),
        vestingSchedule: {
          vestingStartDate: new Date(),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'invalid'
        }
      });

      const error = grant.validateSync();
      expect(error.errors['vestingSchedule.vestingFrequency']).toBeDefined();
    });
  });

  describe('Exercise Tracking', () => {
    it('should track exercised shares', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date(),
        exercisedShares: 2500
      });

      expect(grant.exercisedShares).toBe(2500);
    });

    it('should default exercisedShares to 0', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      expect(grant.exercisedShares).toBe(0);
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      const grant = new EquityGrant({
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date()
      });

      expect(grant.schema.options.timestamps).toBe(true);
    });
  });
});
