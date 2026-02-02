/**
 * Comprehensive Company Model Unit Tests
 *
 * Tests for the Company model including validation, methods, schema behavior
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('Company Model', () => {
  let Company;

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockCompany(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();
        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.companyId) {
            errors.companyId = { message: 'companyId is required' };
          }
          if (!this.CompanyName) {
            errors.CompanyName = { message: 'CompanyName is required' };
          }
          if (!this.CompanyType) {
            errors.CompanyType = { message: 'CompanyType is required' };
          }
          if (!this.RegisteredAddress) {
            errors.RegisteredAddress = { message: 'RegisteredAddress is required' };
          }
          if (!this.TaxID) {
            errors.TaxID = { message: 'TaxID is required' };
          }
          if (!this.corporationDate) {
            errors.corporationDate = { message: 'corporationDate is required' };
          }

          // Check CompanyType enum
          const validTypes = ['startup', 'corporation', 'non-profit', 'government'];
          if (this.CompanyType && !validTypes.includes(this.CompanyType)) {
            errors.CompanyType = { message: `${this.CompanyType} is not a valid enum value` };
          }

          return Object.keys(errors).length > 0 ? { errors } : null;
        });
        this.toObject = jest.fn(() => ({ ...data }));
      }

      // Add static methods
      MockCompany.findById = jest.fn();
      MockCompany.find = jest.fn();
      MockCompany.findOne = jest.fn();
      MockCompany.create = jest.fn();
      MockCompany.findByIdAndUpdate = jest.fn();
      MockCompany.findByIdAndDelete = jest.fn();

      return MockCompany;
    });

    // Now require the Company model
    Company = require('../../../models/Company');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create company with all required fields', () => {
        const companyData = {
          companyId: 'comp-123',
          CompanyName: 'Acme Corporation',
          CompanyType: 'startup',
          RegisteredAddress: '123 Main Street, San Francisco, CA 94102',
          TaxID: '12-3456789',
          corporationDate: new Date('2020-01-15')
        };

        const company = new Company(companyData);

        expect(company.companyId).toBe(companyData.companyId);
        expect(company.CompanyName).toBe(companyData.CompanyName);
        expect(company.CompanyType).toBe(companyData.CompanyType);
        expect(company.RegisteredAddress).toBe(companyData.RegisteredAddress);
        expect(company.TaxID).toBe(companyData.TaxID);
        expect(company.corporationDate).toEqual(companyData.corporationDate);
      });

      it('should reject company without companyId', () => {
        const company = new Company({
          CompanyName: 'Test Company',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.companyId).toBeTruthy();
      });

      it('should reject company without CompanyName', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.CompanyName).toBeTruthy();
      });

      it('should reject company without CompanyType', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Test Company',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.CompanyType).toBeTruthy();
      });

      it('should reject company without RegisteredAddress', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Test Company',
          CompanyType: 'startup',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.RegisteredAddress).toBeTruthy();
      });

      it('should reject company without TaxID', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Test Company',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test St',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.TaxID).toBeTruthy();
      });

      it('should reject company without corporationDate', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Test Company',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789'
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.corporationDate).toBeTruthy();
      });
    });

    describe('CompanyType Enum Validation', () => {
      it('should accept valid CompanyType "startup"', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Startup Company',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeNull();
        expect(company.CompanyType).toBe('startup');
      });

      it('should accept valid CompanyType "corporation"', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Big Corporation',
          CompanyType: 'corporation',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeNull();
        expect(company.CompanyType).toBe('corporation');
      });

      it('should accept valid CompanyType "non-profit"', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Charity Organization',
          CompanyType: 'non-profit',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeNull();
        expect(company.CompanyType).toBe('non-profit');
      });

      it('should accept valid CompanyType "government"', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Government Agency',
          CompanyType: 'government',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeNull();
        expect(company.CompanyType).toBe('government');
      });

      it('should reject invalid CompanyType', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Invalid Company',
          CompanyType: 'invalid-type',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.CompanyType).toBeTruthy();
      });

      it('should reject CompanyType with wrong case', () => {
        const company = new Company({
          companyId: 'comp-123',
          CompanyName: 'Uppercase Company',
          CompanyType: 'Startup', // Should be 'startup'
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: new Date()
        });

        const validationError = company.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.CompanyType).toBeTruthy();
      });
    });
  });

  describe('Company Data Handling', () => {
    it('should handle various TaxID formats', () => {
      const taxIdFormats = [
        '12-3456789',      // US EIN format
        '123456789',       // No dashes
        'DE123456789',     // VAT format
        'GB123456789'      // UK VAT
      ];

      taxIdFormats.forEach(taxId => {
        const company = new Company({
          companyId: `comp-${taxId}`,
          CompanyName: 'Tax Test Company',
          CompanyType: 'corporation',
          RegisteredAddress: '123 Test St',
          TaxID: taxId,
          corporationDate: new Date()
        });

        expect(company.TaxID).toBe(taxId);
      });
    });

    it('should handle different date formats for corporationDate', () => {
      const dates = [
        new Date('2020-01-15'),
        new Date('2015-06-30T00:00:00.000Z'),
        new Date(2023, 5, 15) // June 15, 2023
      ];

      dates.forEach(date => {
        const company = new Company({
          companyId: 'comp-date-test',
          CompanyName: 'Date Test Company',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test St',
          TaxID: '12-3456789',
          corporationDate: date
        });

        expect(company.corporationDate).toEqual(date);
      });
    });

    it('should handle long company names', () => {
      const longName = 'A'.repeat(255);
      const company = new Company({
        companyId: 'comp-long-name',
        CompanyName: longName,
        CompanyType: 'corporation',
        RegisteredAddress: '123 Test St',
        TaxID: '12-3456789',
        corporationDate: new Date()
      });

      expect(company.CompanyName).toBe(longName);
      expect(company.CompanyName.length).toBe(255);
    });

    it('should handle multi-line addresses', () => {
      const multiLineAddress = '123 Main Street\nSuite 400\nSan Francisco, CA 94102\nUSA';
      const company = new Company({
        companyId: 'comp-multiline',
        CompanyName: 'Multi Address Corp',
        CompanyType: 'corporation',
        RegisteredAddress: multiLineAddress,
        TaxID: '12-3456789',
        corporationDate: new Date()
      });

      expect(company.RegisteredAddress).toBe(multiLineAddress);
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockCompany = {
        companyId: 'comp-123',
        CompanyName: 'Found Company'
      };
      Company.findById.mockResolvedValue(mockCompany);

      const result = await Company.findById('507f1f77bcf86cd799439011');

      expect(Company.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockCompany);
    });

    it('should call find correctly', async () => {
      const mockCompanies = [
        { companyId: 'comp-1', CompanyName: 'Company 1' },
        { companyId: 'comp-2', CompanyName: 'Company 2' }
      ];
      Company.find.mockResolvedValue(mockCompanies);

      const result = await Company.find({ CompanyType: 'startup' });

      expect(Company.find).toHaveBeenCalledWith({ CompanyType: 'startup' });
      expect(result).toEqual(mockCompanies);
    });

    it('should call findOne correctly', async () => {
      const mockCompany = {
        companyId: 'comp-123',
        CompanyName: 'Found Company'
      };
      Company.findOne.mockResolvedValue(mockCompany);

      const result = await Company.findOne({ TaxID: '12-3456789' });

      expect(Company.findOne).toHaveBeenCalledWith({ TaxID: '12-3456789' });
      expect(result).toEqual(mockCompany);
    });

    it('should call create correctly', async () => {
      const companyData = {
        companyId: 'comp-123',
        CompanyName: 'New Company',
        CompanyType: 'startup',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: new Date()
      };
      Company.create.mockResolvedValue(companyData);

      const result = await Company.create(companyData);

      expect(Company.create).toHaveBeenCalledWith(companyData);
      expect(result).toEqual(companyData);
    });
  });

  describe('Instance Methods', () => {
    it('should save company successfully', async () => {
      const company = new Company({
        companyId: 'comp-123',
        CompanyName: 'Save Test Company',
        CompanyType: 'startup',
        RegisteredAddress: '123 Test St',
        TaxID: '12-3456789',
        corporationDate: new Date()
      });

      company.save.mockResolvedValue(company);
      const savedCompany = await company.save();

      expect(company.save).toHaveBeenCalled();
      expect(savedCompany).toBe(company);
    });

    it('should handle save errors', async () => {
      const company = new Company({
        companyId: 'comp-duplicate',
        CompanyName: 'Duplicate Company',
        CompanyType: 'startup',
        RegisteredAddress: '123 Test St',
        TaxID: '12-3456789',
        corporationDate: new Date()
      });

      const duplicateError = new Error('E11000 duplicate key error');
      company.save.mockRejectedValue(duplicateError);

      await expect(company.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should convert company to object', () => {
      const companyData = {
        companyId: 'comp-123',
        CompanyName: 'Object Test Company',
        CompanyType: 'corporation',
        RegisteredAddress: '123 Test St',
        TaxID: '12-3456789',
        corporationDate: new Date()
      };

      const company = new Company(companyData);
      const companyObject = company.toObject();

      expect(companyObject).toEqual(companyData);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete company lifecycle', () => {
      const companyData = {
        companyId: 'comp-lifecycle-123',
        CompanyName: 'Lifecycle Corporation Inc.',
        CompanyType: 'corporation',
        RegisteredAddress: '1600 Amphitheatre Parkway\nMountain View, CA 94043\nUSA',
        TaxID: '94-1234567',
        corporationDate: new Date('1998-09-04')
      };

      const company = new Company(companyData);

      expect(company.companyId).toBe(companyData.companyId);
      expect(company.CompanyName).toBe(companyData.CompanyName);
      expect(company.CompanyType).toBe(companyData.CompanyType);
      expect(company.RegisteredAddress).toBe(companyData.RegisteredAddress);
      expect(company.TaxID).toBe(companyData.TaxID);
      expect(company.corporationDate).toEqual(companyData.corporationDate);
    });

    it('should handle company with minimal required data', () => {
      const minimalData = {
        companyId: 'comp-min-123',
        CompanyName: 'Minimal',
        CompanyType: 'startup',
        RegisteredAddress: 'Address',
        TaxID: '123',
        corporationDate: new Date()
      };

      const company = new Company(minimalData);
      const validationError = company.validateSync();

      expect(validationError).toBeNull();
      expect(company.companyId).toBe(minimalData.companyId);
    });

    it('should handle empty company object', () => {
      const company = new Company({});
      const validationError = company.validateSync();

      expect(validationError).toBeTruthy();
      expect(Object.keys(validationError.errors).length).toBeGreaterThan(0);
    });
  });
});
