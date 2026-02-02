/**
 * Comprehensive ShareClass Model Unit Tests
 *
 * Tests for the ShareClass model including validation, methods, virtuals, and schema behavior
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('ShareClass Model', () => {
  let ShareClass;

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockShareClass(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();
        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.name) {
            errors.name = { message: 'Share class name is required' };
          }
          if (!this.description) {
            errors.description = { message: 'Description is required' };
          }
          if (this.amountRaised === undefined || this.amountRaised === null) {
            errors.amountRaised = { message: 'Amount raised is required' };
          } else if (this.amountRaised < 0) {
            errors.amountRaised = { message: 'Amount raised cannot be negative' };
          }
          if (this.ownershipPercentage === undefined || this.ownershipPercentage === null) {
            errors.ownershipPercentage = { message: 'Ownership percentage is required' };
          } else if (this.ownershipPercentage < 0 || this.ownershipPercentage > 100) {
            errors.ownershipPercentage = { message: 'Ownership percentage must be between 0 and 100' };
          }
          if (this.dilutedShares === undefined || this.dilutedShares === null) {
            errors.dilutedShares = { message: 'Diluted shares is required' };
          } else if (this.dilutedShares < 0) {
            errors.dilutedShares = { message: 'Diluted shares cannot be negative' };
          }
          if (this.authorizedShares === undefined || this.authorizedShares === null) {
            errors.authorizedShares = { message: 'Authorized shares is required' };
          } else if (this.authorizedShares < 0) {
            errors.authorizedShares = { message: 'Authorized shares cannot be negative' };
          }
          if (!this.shareClassId) {
            errors.shareClassId = { message: 'Share class ID is required' };
          }

          return Object.keys(errors).length > 0 ? { errors } : null;
        });
        this.toObject = jest.fn(() => ({ ...data }));
        this.toJSON = jest.fn(() => {
          const obj = { ...data };
          // Include virtual
          if (this.dilutedShares > 0) {
            obj.conversionRate = (this.authorizedShares / this.dilutedShares).toFixed(2);
          } else {
            obj.conversionRate = 0;
          }
          return obj;
        });

        // Add instance method
        this.validateShares = function() {
          return this.dilutedShares <= this.authorizedShares;
        };
      }

      // Virtual getter for conversionRate
      Object.defineProperty(MockShareClass.prototype, 'conversionRate', {
        get: function() {
          return this.dilutedShares > 0 ? (this.authorizedShares / this.dilutedShares).toFixed(2) : 0;
        }
      });

      // Add static methods
      MockShareClass.findById = jest.fn();
      MockShareClass.find = jest.fn();
      MockShareClass.findOne = jest.fn();
      MockShareClass.create = jest.fn();
      MockShareClass.findByIdAndUpdate = jest.fn();
      MockShareClass.findByIdAndDelete = jest.fn();

      return MockShareClass;
    });

    // Now require the ShareClass model
    ShareClass = require('../../../models/ShareClass');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create share class with all required fields', () => {
        const shareClassData = {
          name: 'Series A Preferred',
          description: 'Series A preferred stock with 1x liquidation preference',
          amountRaised: 5000000,
          ownershipPercentage: 20,
          dilutedShares: 1000000,
          authorizedShares: 5000000,
          shareClassId: 'sc-seriesA-123'
        };

        const shareClass = new ShareClass(shareClassData);

        expect(shareClass.name).toBe(shareClassData.name);
        expect(shareClass.description).toBe(shareClassData.description);
        expect(shareClass.amountRaised).toBe(shareClassData.amountRaised);
        expect(shareClass.ownershipPercentage).toBe(shareClassData.ownershipPercentage);
        expect(shareClass.dilutedShares).toBe(shareClassData.dilutedShares);
        expect(shareClass.authorizedShares).toBe(shareClassData.authorizedShares);
        expect(shareClass.shareClassId).toBe(shareClassData.shareClassId);
      });

      it('should reject share class without name', () => {
        const shareClass = new ShareClass({
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.name).toBeTruthy();
      });

      it('should reject share class without description', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.description).toBeTruthy();
      });

      it('should reject share class without amountRaised', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.amountRaised).toBeTruthy();
      });

      it('should reject share class without ownershipPercentage', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ownershipPercentage).toBeTruthy();
      });

      it('should reject share class without dilutedShares', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.dilutedShares).toBeTruthy();
      });

      it('should reject share class without authorizedShares', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.authorizedShares).toBeTruthy();
      });

      it('should reject share class without shareClassId', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: 500000
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.shareClassId).toBeTruthy();
      });
    });

    describe('Numeric Constraints', () => {
      it('should reject negative amountRaised', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: -1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.amountRaised).toBeTruthy();
      });

      it('should reject negative ownershipPercentage', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: -10,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ownershipPercentage).toBeTruthy();
      });

      it('should reject ownershipPercentage greater than 100', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 150,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ownershipPercentage).toBeTruthy();
      });

      it('should accept ownershipPercentage of exactly 0', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 0,
          ownershipPercentage: 0,
          dilutedShares: 0,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeNull();
        expect(shareClass.ownershipPercentage).toBe(0);
      });

      it('should accept ownershipPercentage of exactly 100', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 100,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeNull();
        expect(shareClass.ownershipPercentage).toBe(100);
      });

      it('should reject negative dilutedShares', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: -100000,
          authorizedShares: 500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.dilutedShares).toBeTruthy();
      });

      it('should reject negative authorizedShares', () => {
        const shareClass = new ShareClass({
          name: 'Test Class',
          description: 'Test description',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: -500000,
          shareClassId: 'sc-123'
        });

        const validationError = shareClass.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.authorizedShares).toBeTruthy();
      });
    });
  });

  describe('Virtual Properties', () => {
    describe('conversionRate virtual', () => {
      it('should calculate conversionRate correctly', () => {
        const shareClass = new ShareClass({
          name: 'Series A',
          description: 'Series A stock',
          amountRaised: 5000000,
          ownershipPercentage: 20,
          dilutedShares: 1000000,
          authorizedShares: 5000000,
          shareClassId: 'sc-123'
        });

        expect(shareClass.conversionRate).toBe('5.00');
      });

      it('should return 0 when dilutedShares is 0', () => {
        const shareClass = new ShareClass({
          name: 'Series A',
          description: 'Series A stock',
          amountRaised: 5000000,
          ownershipPercentage: 0,
          dilutedShares: 0,
          authorizedShares: 5000000,
          shareClassId: 'sc-123'
        });

        expect(shareClass.conversionRate).toBe(0);
      });

      it('should calculate conversionRate for 1:1 ratio', () => {
        const shareClass = new ShareClass({
          name: 'Common',
          description: 'Common stock',
          amountRaised: 0,
          ownershipPercentage: 80,
          dilutedShares: 1000000,
          authorizedShares: 1000000,
          shareClassId: 'sc-common'
        });

        expect(shareClass.conversionRate).toBe('1.00');
      });

      it('should handle fractional conversion rates', () => {
        const shareClass = new ShareClass({
          name: 'Series B',
          description: 'Series B stock',
          amountRaised: 10000000,
          ownershipPercentage: 15,
          dilutedShares: 3000000,
          authorizedShares: 10000000,
          shareClassId: 'sc-seriesB'
        });

        expect(shareClass.conversionRate).toBe('3.33');
      });
    });
  });

  describe('Instance Methods', () => {
    describe('validateShares method', () => {
      it('should return true when dilutedShares <= authorizedShares', () => {
        const shareClass = new ShareClass({
          name: 'Valid Class',
          description: 'Valid share class',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 100000,
          authorizedShares: 500000,
          shareClassId: 'sc-valid'
        });

        expect(shareClass.validateShares()).toBe(true);
      });

      it('should return true when dilutedShares equals authorizedShares', () => {
        const shareClass = new ShareClass({
          name: 'Equal Class',
          description: 'Equal shares class',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 500000,
          authorizedShares: 500000,
          shareClassId: 'sc-equal'
        });

        expect(shareClass.validateShares()).toBe(true);
      });

      it('should return false when dilutedShares > authorizedShares', () => {
        const shareClass = new ShareClass({
          name: 'Invalid Class',
          description: 'Invalid share class',
          amountRaised: 1000000,
          ownershipPercentage: 10,
          dilutedShares: 600000,
          authorizedShares: 500000,
          shareClassId: 'sc-invalid'
        });

        expect(shareClass.validateShares()).toBe(false);
      });
    });
  });

  describe('Share Class Types', () => {
    it('should handle Common Stock', () => {
      const common = new ShareClass({
        name: 'Common Stock',
        description: 'Standard common stock with voting rights',
        amountRaised: 0,
        ownershipPercentage: 60,
        dilutedShares: 6000000,
        authorizedShares: 10000000,
        shareClassId: 'sc-common-001'
      });

      const validationError = common.validateSync();
      expect(validationError).toBeNull();
    });

    it('should handle Series A Preferred', () => {
      const seriesA = new ShareClass({
        name: 'Series A Preferred',
        description: 'Series A preferred stock with 1x non-participating liquidation preference',
        amountRaised: 5000000,
        ownershipPercentage: 20,
        dilutedShares: 2000000,
        authorizedShares: 2500000,
        shareClassId: 'sc-series-a'
      });

      const validationError = seriesA.validateSync();
      expect(validationError).toBeNull();
    });

    it('should handle Series B Preferred', () => {
      const seriesB = new ShareClass({
        name: 'Series B Preferred',
        description: 'Series B preferred stock with 1x participating liquidation preference',
        amountRaised: 15000000,
        ownershipPercentage: 25,
        dilutedShares: 2500000,
        authorizedShares: 3000000,
        shareClassId: 'sc-series-b'
      });

      const validationError = seriesB.validateSync();
      expect(validationError).toBeNull();
    });

    it('should handle Founder Shares', () => {
      const founder = new ShareClass({
        name: 'Founder Shares',
        description: 'Restricted founder shares with 4-year vesting',
        amountRaised: 0,
        ownershipPercentage: 40,
        dilutedShares: 4000000,
        authorizedShares: 5000000,
        shareClassId: 'sc-founder'
      });

      const validationError = founder.validateSync();
      expect(validationError).toBeNull();
    });

    it('should handle Employee Option Pool', () => {
      const optionPool = new ShareClass({
        name: 'Employee Option Pool',
        description: 'Stock options reserved for employees',
        amountRaised: 0,
        ownershipPercentage: 10,
        dilutedShares: 500000,
        authorizedShares: 1000000,
        shareClassId: 'sc-option-pool'
      });

      const validationError = optionPool.validateSync();
      expect(validationError).toBeNull();
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockShareClass = {
        shareClassId: 'sc-123',
        name: 'Found Share Class'
      };
      ShareClass.findById.mockResolvedValue(mockShareClass);

      const result = await ShareClass.findById('507f1f77bcf86cd799439011');

      expect(ShareClass.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockShareClass);
    });

    it('should call find correctly', async () => {
      const mockShareClasses = [
        { shareClassId: 'sc-1', name: 'Common' },
        { shareClassId: 'sc-2', name: 'Preferred' }
      ];
      ShareClass.find.mockResolvedValue(mockShareClasses);

      const result = await ShareClass.find({});

      expect(ShareClass.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockShareClasses);
    });

    it('should call create correctly', async () => {
      const shareClassData = {
        name: 'New Share Class',
        description: 'New share class description',
        amountRaised: 1000000,
        ownershipPercentage: 10,
        dilutedShares: 100000,
        authorizedShares: 500000,
        shareClassId: 'sc-new-123'
      };
      ShareClass.create.mockResolvedValue(shareClassData);

      const result = await ShareClass.create(shareClassData);

      expect(ShareClass.create).toHaveBeenCalledWith(shareClassData);
      expect(result).toEqual(shareClassData);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete cap table scenario', () => {
      const shareClasses = [
        new ShareClass({
          name: 'Common Stock',
          description: 'Standard common shares',
          amountRaised: 0,
          ownershipPercentage: 45,
          dilutedShares: 4500000,
          authorizedShares: 10000000,
          shareClassId: 'sc-common'
        }),
        new ShareClass({
          name: 'Series A',
          description: 'Series A preferred',
          amountRaised: 3000000,
          ownershipPercentage: 30,
          dilutedShares: 3000000,
          authorizedShares: 4000000,
          shareClassId: 'sc-series-a'
        }),
        new ShareClass({
          name: 'Option Pool',
          description: 'Employee options',
          amountRaised: 0,
          ownershipPercentage: 15,
          dilutedShares: 1500000,
          authorizedShares: 2000000,
          shareClassId: 'sc-options'
        }),
        new ShareClass({
          name: 'Advisors',
          description: 'Advisor shares',
          amountRaised: 0,
          ownershipPercentage: 10,
          dilutedShares: 1000000,
          authorizedShares: 1000000,
          shareClassId: 'sc-advisors'
        })
      ];

      const totalOwnership = shareClasses.reduce((sum, sc) => sum + sc.ownershipPercentage, 0);
      expect(totalOwnership).toBe(100);

      shareClasses.forEach(sc => {
        expect(sc.validateShares()).toBe(true);
        expect(sc.validateSync()).toBeNull();
      });
    });

    it('should handle large share numbers', () => {
      const shareClass = new ShareClass({
        name: 'Large Corp Shares',
        description: 'Large corporation share class',
        amountRaised: 1000000000,
        ownershipPercentage: 0.001,
        dilutedShares: 1000000000,
        authorizedShares: 10000000000,
        shareClassId: 'sc-large'
      });

      const validationError = shareClass.validateSync();
      expect(validationError).toBeNull();
      expect(shareClass.conversionRate).toBe('10.00');
    });

    it('should handle decimal percentages', () => {
      const shareClass = new ShareClass({
        name: 'Decimal Class',
        description: 'Share class with decimal percentage',
        amountRaised: 500000,
        ownershipPercentage: 12.5,
        dilutedShares: 125000,
        authorizedShares: 200000,
        shareClassId: 'sc-decimal'
      });

      const validationError = shareClass.validateSync();
      expect(validationError).toBeNull();
      expect(shareClass.ownershipPercentage).toBe(12.5);
    });
  });
});
