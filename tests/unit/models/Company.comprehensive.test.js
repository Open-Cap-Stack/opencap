/**
 * Comprehensive Company Model Unit Tests (ZeroDB)
 *
 * Tests for the Company model including creation, queries, validation helpers,
 * and business logic methods using ZeroDB patterns.
 */

// Mock zerodbService before requiring the model
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  initialize: jest.fn(),
  projectId: 'test-project-123'
}));

// Mock Settings model to prevent side effects during company creation
jest.mock('../../../models/Settings', () => ({
  createCompanySettings: jest.fn().mockResolvedValue({})
}));

const zerodbService = require('../../../services/zerodbService');
const Company = require('../../../models/Company');

describe('Company Model - ZeroDB Comprehensive Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have required base fields in schema', () => {
      expect(Company.schema.companyId).toBeDefined();
      expect(Company.schema.companyId.required).toBe(true);
      expect(Company.schema.CompanyName).toBeDefined();
      expect(Company.schema.CompanyName.required).toBe(true);
      expect(Company.schema.CompanyType).toBeDefined();
      expect(Company.schema.CompanyType.required).toBe(true);
      expect(Company.schema.RegisteredAddress).toBeDefined();
      expect(Company.schema.RegisteredAddress.required).toBe(true);
      expect(Company.schema.TaxID).toBeDefined();
      expect(Company.schema.TaxID.required).toBe(true);
      expect(Company.schema.corporationDate).toBeDefined();
      expect(Company.schema.corporationDate.required).toBe(true);
    });

    it('should have CompanyType enum values', () => {
      expect(Company.schema.CompanyType.enum).toEqual(
        ['startup', 'corporation', 'non-profit', 'government']
      );
    });

    it('should have legal structure fields in schema', () => {
      expect(Company.schema.entityType).toBeDefined();
      expect(Company.schema.stateOfIncorporation).toBeDefined();
      expect(Company.schema.dateOfIncorporation).toBeDefined();
      expect(Company.schema.qualifiedSmallBusiness).toBeDefined();
      expect(Company.schema.section1202Eligible).toBeDefined();
      expect(Company.schema.taxStatus).toBeDefined();
      expect(Company.schema.ein).toBeDefined();
      expect(Company.schema.fiscalYearEnd).toBeDefined();
      expect(Company.schema.authorizedShares).toBeDefined();
    });

    it('should have correct table name', () => {
      expect(Company.tableName).toBe('companies');
    });
  });

  describe('Company.create()', () => {
    const validCompanyData = {
      companyId: 'comp-123',
      CompanyName: 'Acme Corporation',
      CompanyType: 'startup',
      RegisteredAddress: '123 Main Street, San Francisco, CA 94102',
      TaxID: '12-3456789',
      corporationDate: new Date('2020-01-15').toISOString()
    };

    it('should create company with all required fields', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'zerodb-id-1',
          row_data: { ...validCompanyData }
        }]
      });

      const result = await Company.create(validCompanyData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'companies',
        expect.objectContaining({
          companyId: 'comp-123',
          CompanyName: 'Acme Corporation',
          CompanyType: 'startup'
        })
      );
      expect(result.companyId).toBe('comp-123');
    });

    it('should generate companyId if not provided', async () => {
      const dataWithoutId = { ...validCompanyData };
      delete dataWithoutId.companyId;

      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'zerodb-id-2',
          row_data: { companyId: 'company_generated-uuid', ...dataWithoutId }
        }]
      });

      const result = await Company.create(dataWithoutId);

      const insertCall = zerodbService.insertRow.mock.calls[0][1];
      expect(insertCall.companyId).toMatch(/^company_/);
    });

    it('should add timestamps on creation', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'zerodb-id-3',
          row_data: validCompanyData
        }]
      });

      await Company.create(validCompanyData);

      const insertCall = zerodbService.insertRow.mock.calls[0][1];
      expect(insertCall.createdAt).toBeDefined();
      expect(insertCall.updatedAt).toBeDefined();
    });

    it('should create company with legal structure fields', async () => {
      const dataWithLegal = {
        ...validCompanyData,
        entityType: 'DELAWARE_C_CORP',
        stateOfIncorporation: 'DE',
        qualifiedSmallBusiness: true
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'zerodb-id-4',
          row_data: dataWithLegal
        }]
      });

      const result = await Company.create(dataWithLegal);

      const insertCall = zerodbService.insertRow.mock.calls[0][1];
      expect(insertCall.entityType).toBe('DELAWARE_C_CORP');
      expect(insertCall.stateOfIncorporation).toBe('DE');
    });

    it('should handle ZeroDB insert failure', async () => {
      zerodbService.insertRow.mockRejectedValue(new Error('Insert failed'));

      await expect(Company.create(validCompanyData)).rejects.toThrow('Insert failed');
    });
  });

  describe('Company.find()', () => {
    it('should find all companies', async () => {
      const mockCompanies = [
        { row_data: { companyId: 'comp-1', CompanyName: 'Company One' } },
        { row_data: { companyId: 'comp-2', CompanyName: 'Company Two' } }
      ];

      zerodbService.queryTable.mockResolvedValue({ data: mockCompanies });

      const results = await Company.find({});

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', expect.objectContaining({
        filter: {}
      }));
      expect(results).toHaveLength(2);
      expect(results[0].companyId).toBe('comp-1');
    });

    it('should find companies by CompanyType', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-1', CompanyType: 'startup' } }]
      });

      const results = await Company.find({ CompanyType: 'startup' });

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', expect.objectContaining({
        filter: { CompanyType: 'startup' }
      }));
      expect(results).toHaveLength(1);
    });

    it('should return empty array when no matches', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const results = await Company.find({ CompanyType: 'government' });
      expect(results).toEqual([]);
    });
  });

  describe('Company.findOne()', () => {
    it('should find a single company by TaxID', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-1', TaxID: '12-3456789' } }]
      });

      const result = await Company.findOne({ TaxID: '12-3456789' });

      expect(result).toBeDefined();
      expect(result.TaxID).toBe('12-3456789');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await Company.findOne({ companyId: 'non-existent' });
      expect(result).toBeNull();
    });
  });

  describe('Company.findById()', () => {
    it('should find company by _id', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { _id: 'zerodb-id-1', companyId: 'comp-1' } }]
      });

      const result = await Company.findById('zerodb-id-1');

      expect(result).toBeDefined();
      expect(result._id).toBe('zerodb-id-1');
    });

    it('should return null for non-existent id', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await Company.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('Company.findByCompanyId()', () => {
    it('should find company by business identifier', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-123', CompanyName: 'Test Corp' } }]
      });

      const result = await Company.findByCompanyId('comp-123');

      expect(result).toBeDefined();
      expect(result.companyId).toBe('comp-123');
    });

    it('should return null when companyId not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await Company.findByCompanyId('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Company.findByType()', () => {
    it('should find companies by CompanyType', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'comp-1', CompanyType: 'startup' } },
          { row_data: { companyId: 'comp-2', CompanyType: 'startup' } }
        ]
      });

      const results = await Company.findByType('startup');
      expect(results).toHaveLength(2);
    });
  });

  describe('Company.findByEntityType()', () => {
    it('should find companies by entity type', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'comp-1', entityType: 'C_CORP' } }
        ]
      });

      const results = await Company.findByEntityType('C_CORP');

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', expect.objectContaining({
        filter: { entityType: 'C_CORP' }
      }));
      expect(results).toHaveLength(1);
    });
  });

  describe('Company.findByStateOfIncorporation()', () => {
    it('should find companies by state', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'comp-1', stateOfIncorporation: 'DE' } }
        ]
      });

      const results = await Company.findByStateOfIncorporation('DE');
      expect(results).toHaveLength(1);
    });
  });

  describe('Company.findQSBSEligible()', () => {
    it('should find QSBS-eligible companies', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'comp-1', qualifiedSmallBusiness: true } }
        ]
      });

      const results = await Company.findQSBSEligible();
      expect(results).toHaveLength(1);
    });
  });

  describe('Company.findSection1202Eligible()', () => {
    it('should find Section 1202-eligible companies', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'comp-1', section1202Eligible: true } }
        ]
      });

      const results = await Company.findSection1202Eligible();
      expect(results).toHaveLength(1);
    });
  });

  describe('Company.findByTaxStatus()', () => {
    it('should find companies by tax status', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'comp-1', taxStatus: 'ACTIVE' } }
        ]
      });

      const results = await Company.findByTaxStatus('ACTIVE');
      expect(results).toHaveLength(1);
    });
  });

  describe('Company.updateLegalStructure()', () => {
    it('should update legal structure fields', async () => {
      // findOne returns existing company
      zerodbService.queryTable
        .mockResolvedValueOnce({
          data: [{ row_data: { companyId: 'comp-1', entityType: 'C_CORP' } }]
        })
        // updateOne calls queryTable internally
        .mockResolvedValueOnce({ modifiedCount: 1 })
        // findOne after update (returnNew)
        .mockResolvedValueOnce({
          data: [{ row_data: { companyId: 'comp-1', entityType: 'S_CORP' } }]
        });

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await Company.updateLegalStructure('comp-1', {
        entityType: 'S_CORP',
        taxStatus: 'ACTIVE'
      });

      expect(result).toBeDefined();
    });

    it('should filter out non-allowed fields', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce({
          data: [{ row_data: { companyId: 'comp-1' } }]
        })
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({
          data: [{ row_data: { companyId: 'comp-1' } }]
        });

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await Company.updateLegalStructure('comp-1', {
        entityType: 'LLC',
        CompanyName: 'SHOULD_NOT_UPDATE',
        hackerField: 'malicious'
      });

      const updateCall = zerodbService.updateRows.mock.calls[0];
      // The update should only include entityType, not CompanyName or hackerField
      const updatePayload = updateCall[1]?.update?.$set || {};
      expect(updatePayload.CompanyName).toBeUndefined();
      expect(updatePayload.hackerField).toBeUndefined();
    });
  });

  describe('Company.isDelawareIncorporated()', () => {
    it('should return true for DE state of incorporation', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-1', stateOfIncorporation: 'DE' } }]
      });

      const result = await Company.isDelawareIncorporated('comp-1');
      expect(result).toBe(true);
    });

    it('should return true for DELAWARE_C_CORP entity type', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-1', entityType: 'DELAWARE_C_CORP' } }]
      });

      const result = await Company.isDelawareIncorporated('comp-1');
      expect(result).toBe(true);
    });

    it('should return true for DELAWARE_LLC entity type', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-1', entityType: 'DELAWARE_LLC' } }]
      });

      const result = await Company.isDelawareIncorporated('comp-1');
      expect(result).toBe(true);
    });

    it('should return false for non-Delaware company', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'comp-1', stateOfIncorporation: 'CA', entityType: 'C_CORP' } }]
      });

      const result = await Company.isDelawareIncorporated('comp-1');
      expect(result).toBe(false);
    });

    it('should return false for non-existent company', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await Company.isDelawareIncorporated('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Validation Helper Methods', () => {
    describe('isValidEntityType()', () => {
      it('should return true for valid entity types', () => {
        expect(Company.isValidEntityType('C_CORP')).toBe(true);
        expect(Company.isValidEntityType('S_CORP')).toBe(true);
        expect(Company.isValidEntityType('LLC')).toBe(true);
        expect(Company.isValidEntityType('LP')).toBe(true);
        expect(Company.isValidEntityType('DELAWARE_C_CORP')).toBe(true);
        expect(Company.isValidEntityType('DELAWARE_LLC')).toBe(true);
      });

      it('should return false for invalid entity types', () => {
        expect(Company.isValidEntityType('INVALID')).toBe(false);
        expect(Company.isValidEntityType('')).toBe(false);
        expect(Company.isValidEntityType('c_corp')).toBe(false);
      });
    });

    describe('isValidState()', () => {
      it('should return true for valid US state codes', () => {
        expect(Company.isValidState('CA')).toBe(true);
        expect(Company.isValidState('DE')).toBe(true);
        expect(Company.isValidState('NY')).toBe(true);
        expect(Company.isValidState('TX')).toBe(true);
        expect(Company.isValidState('DC')).toBe(true);
      });

      it('should return false for invalid state codes', () => {
        expect(Company.isValidState('XX')).toBe(false);
        expect(Company.isValidState('California')).toBe(false);
        expect(Company.isValidState('')).toBe(false);
      });
    });

    describe('isValidTaxStatus()', () => {
      it('should return true for valid tax statuses', () => {
        expect(Company.isValidTaxStatus('ACTIVE')).toBe(true);
        expect(Company.isValidTaxStatus('SUSPENDED')).toBe(true);
        expect(Company.isValidTaxStatus('DISSOLVED')).toBe(true);
      });

      it('should return false for invalid tax statuses', () => {
        expect(Company.isValidTaxStatus('INACTIVE')).toBe(false);
        expect(Company.isValidTaxStatus('active')).toBe(false);
      });
    });

    describe('isValidFiscalYearEnd()', () => {
      it('should return true for valid months', () => {
        expect(Company.isValidFiscalYearEnd('JANUARY')).toBe(true);
        expect(Company.isValidFiscalYearEnd('JUNE')).toBe(true);
        expect(Company.isValidFiscalYearEnd('DECEMBER')).toBe(true);
      });

      it('should return false for invalid months', () => {
        expect(Company.isValidFiscalYearEnd('Jan')).toBe(false);
        expect(Company.isValidFiscalYearEnd('THIRTEENTH')).toBe(false);
      });
    });
  });

  describe('Enum Exports', () => {
    it('should export ENTITY_TYPES array', () => {
      expect(Company.ENTITY_TYPES).toEqual([
        'C_CORP', 'S_CORP', 'LLC', 'LP', 'DELAWARE_C_CORP', 'DELAWARE_LLC'
      ]);
    });

    it('should export US_STATES with all 50 states and territories', () => {
      expect(Company.US_STATES).toContain('CA');
      expect(Company.US_STATES).toContain('DE');
      expect(Company.US_STATES).toContain('DC');
      expect(Company.US_STATES.length).toBe(56);
    });

    it('should export TAX_STATUS_TYPES', () => {
      expect(Company.TAX_STATUS_TYPES).toEqual(['ACTIVE', 'SUSPENDED', 'DISSOLVED']);
    });

    it('should export FISCAL_YEAR_END_MONTHS', () => {
      expect(Company.FISCAL_YEAR_END_MONTHS).toHaveLength(12);
      expect(Company.FISCAL_YEAR_END_MONTHS[0]).toBe('JANUARY');
      expect(Company.FISCAL_YEAR_END_MONTHS[11]).toBe('DECEMBER');
    });
  });

  describe('Exposed Base Model Methods', () => {
    it('should expose find method', () => {
      expect(typeof Company.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof Company.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof Company.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof Company.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof Company.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof Company.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof Company.exists).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof Company.aggregate).toBe('function');
    });
  });

  describe('Data Handling', () => {
    it('should handle various TaxID formats', async () => {
      const taxIds = ['12-3456789', '123456789', 'DE123456789'];

      for (const taxId of taxIds) {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue({
          data: [{ row_id: `id-${taxId}`, row_data: { TaxID: taxId } }]
        });

        const result = await Company.create({
          companyId: `comp-${taxId}`,
          CompanyName: 'Tax Test',
          CompanyType: 'corporation',
          RegisteredAddress: '123 St',
          TaxID: taxId,
          corporationDate: new Date().toISOString()
        });

        expect(result).toBeDefined();
      }
    });

    it('should handle long company names', async () => {
      const longName = 'A'.repeat(255);
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'id-long', row_data: { CompanyName: longName } }]
      });

      const result = await Company.create({
        companyId: 'comp-long',
        CompanyName: longName,
        CompanyType: 'corporation',
        RegisteredAddress: '123 St',
        TaxID: '12-3456789',
        corporationDate: new Date().toISOString()
      });

      expect(result).toBeDefined();
    });

    it('should handle special characters in company name', async () => {
      const specialName = "Test & Company's \"Name\" <LLC>";
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'id-special', row_data: { CompanyName: specialName } }]
      });

      const result = await Company.create({
        companyId: 'comp-special',
        CompanyName: specialName,
        CompanyType: 'startup',
        RegisteredAddress: '123 St',
        TaxID: '12-3456789',
        corporationDate: new Date().toISOString()
      });

      expect(result).toBeDefined();
    });
  });

  describe('Delete Operations', () => {
    it('should delete company by id', async () => {
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      const result = await Company.deleteOne({ _id: 'zerodb-id-1' });

      expect(result.acknowledged).toBe(true);
      expect(result.deletedCount).toBe(1);
    });

    it('should find and delete a company', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_data: { _id: 'zerodb-id-1', companyId: 'comp-1' } }]
      });
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      const result = await Company.findOneAndDelete({ companyId: 'comp-1' });

      expect(result).toBeDefined();
      expect(result.companyId).toBe('comp-1');
    });
  });

  describe('Update Operations', () => {
    it('should update company fields', async () => {
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await Company.updateOne(
        { companyId: 'comp-1' },
        { $set: { CompanyName: 'Updated Name' } }
      );

      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBe(1);
    });

    it('should find and update a company', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce({
          data: [{ row_data: { companyId: 'comp-1', CompanyName: 'Old Name' } }]
        })
        .mockResolvedValueOnce({
          data: [{ row_data: { companyId: 'comp-1', CompanyName: 'New Name' } }]
        });

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await Company.findOneAndUpdate(
        { companyId: 'comp-1' },
        { $set: { CompanyName: 'New Name' } },
        { new: true }
      );

      expect(result.CompanyName).toBe('New Name');
    });
  });
});
