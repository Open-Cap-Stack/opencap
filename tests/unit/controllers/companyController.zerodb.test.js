/**
 * Unit Tests for Company Controller with ZeroDB
 * Tests all CRUD operations using ZeroDB service instead of MongoDB
 *
 * Issue #16: Migrate Company controller to ZeroDB
 */

// Mock ZeroDB service before requiring controller
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  projectId: 'test-project-123'
}));

const zerodbService = require('../../../services/zerodbService');
const companyController = require('../../../controllers/Company');

describe('Company Controller - ZeroDB Migration', () => {
  let mockReq;
  let mockRes;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console.error during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Setup mock request and response
    mockReq = {
      body: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createCompany', () => {
    const validCompanyData = {
      companyId: 'COMP-001',
      CompanyName: 'Test Corporation',
      CompanyType: 'corporation',
      RegisteredAddress: '123 Main St, City, State 12345',
      TaxID: '12-3456789',
      corporationDate: '2024-01-15'
    };

    it('should create a company successfully with valid data', async () => {
      mockReq.body = { ...validCompanyData };

      const expectedResult = {
        _id: 'zerodb-id-123',
        ...validCompanyData,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      zerodbService.insertRow.mockResolvedValue({ rows: [expectedResult] });

      await companyController.createCompany(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'companies',
        expect.objectContaining({
          companyId: validCompanyData.companyId,
          CompanyName: validCompanyData.CompanyName,
          CompanyType: validCompanyData.CompanyType,
          RegisteredAddress: validCompanyData.RegisteredAddress,
          TaxID: validCompanyData.TaxID,
          corporationDate: validCompanyData.corporationDate
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        companyId: validCompanyData.companyId
      }));
    });

    it('should return 400 when companyId is missing', async () => {
      const { companyId, ...incompleteData } = validCompanyData;
      mockReq.body = incompleteData;

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid company data' });
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    });

    it('should return 400 when CompanyName is missing', async () => {
      const { CompanyName, ...incompleteData } = validCompanyData;
      mockReq.body = incompleteData;

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid company data' });
    });

    it('should return 400 when CompanyType is missing', async () => {
      const { CompanyType, ...incompleteData } = validCompanyData;
      mockReq.body = incompleteData;

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid company data' });
    });

    it('should return 400 when RegisteredAddress is missing', async () => {
      const { RegisteredAddress, ...incompleteData } = validCompanyData;
      mockReq.body = incompleteData;

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid company data' });
    });

    it('should return 400 when TaxID is missing', async () => {
      const { TaxID, ...incompleteData } = validCompanyData;
      mockReq.body = incompleteData;

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid company data' });
    });

    it('should return 400 when corporationDate is missing', async () => {
      const { corporationDate, ...incompleteData } = validCompanyData;
      mockReq.body = incompleteData;

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid company data' });
    });

    it('should return 500 when ZeroDB service fails', async () => {
      mockReq.body = { ...validCompanyData };
      zerodbService.insertRow.mockRejectedValue(new Error('ZeroDB connection failed'));

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should return 400 for invalid CompanyType', async () => {
      mockReq.body = { ...validCompanyData, CompanyType: 'invalid-type' };

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    });

    it('should accept all valid CompanyType values', async () => {
      const validTypes = ['startup', 'corporation', 'non-profit', 'government'];

      for (const type of validTypes) {
        jest.clearAllMocks();
        mockReq.body = { ...validCompanyData, CompanyType: type };
        zerodbService.insertRow.mockResolvedValue({
          rows: [{ _id: 'id-' + type, ...validCompanyData, CompanyType: type }]
        });

        await companyController.createCompany(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      }
    });

    it('should add createdAt and updatedAt timestamps', async () => {
      mockReq.body = { ...validCompanyData };
      zerodbService.insertRow.mockResolvedValue({
        rows: [{ _id: 'id-1', ...validCompanyData }]
      });

      await companyController.createCompany(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'companies',
        expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      );
    });
  });

  describe('getAllCompanies', () => {
    it('should return all companies successfully', async () => {
      const mockCompanies = [
        {
          _id: 'id-1',
          companyId: 'COMP-001',
          CompanyName: 'Company One',
          CompanyType: 'startup',
          RegisteredAddress: '123 Main St',
          TaxID: '12-3456789',
          corporationDate: '2024-01-01'
        },
        {
          _id: 'id-2',
          companyId: 'COMP-002',
          CompanyName: 'Company Two',
          CompanyType: 'corporation',
          RegisteredAddress: '456 Oak Ave',
          TaxID: '98-7654321',
          corporationDate: '2024-02-01'
        }
      ];

      zerodbService.queryTable.mockResolvedValue(mockCompanies);

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCompanies);
    });

    it('should return 404 when no companies exist', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'No companies found' });
    });

    it('should return 500 when ZeroDB query fails', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Query failed'));

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle null response correctly', async () => {
      zerodbService.queryTable.mockResolvedValue(null);

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle large dataset', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        _id: `id-${i}`,
        companyId: `COMP-${i.toString().padStart(3, '0')}`,
        CompanyName: `Company ${i}`,
        CompanyType: 'startup',
        RegisteredAddress: `${i} Main St`,
        TaxID: `12-${i.toString().padStart(7, '0')}`,
        corporationDate: '2024-01-01'
      }));

      zerodbService.queryTable.mockResolvedValue(largeDataset);

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(largeDataset);
    });
  });

  describe('getCompanyById', () => {
    it('should return a company by ID successfully', async () => {
      const mockCompany = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'Test Company',
        CompanyType: 'corporation',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: '2024-01-15'
      };

      mockReq.params.id = 'zerodb-id-123';
      zerodbService.queryTable.mockResolvedValue([mockCompany]);

      await companyController.getCompanyById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {
        filter: { _id: 'zerodb-id-123' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCompany);
    });

    it('should return 404 when company not found', async () => {
      mockReq.params.id = 'non-existent-id';
      zerodbService.queryTable.mockResolvedValue([]);

      await companyController.getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
    });

    it('should return 500 when ZeroDB query fails', async () => {
      mockReq.params.id = 'some-id';
      zerodbService.queryTable.mockRejectedValue(new Error('Database error'));

      await companyController.getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle null response from queryTable', async () => {
      mockReq.params.id = 'some-id';
      zerodbService.queryTable.mockResolvedValue(null);

      await companyController.getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
    });

    it('should handle undefined response from queryTable', async () => {
      mockReq.params.id = 'some-id';
      zerodbService.queryTable.mockResolvedValue(undefined);

      await companyController.getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
    });
  });

  describe('updateCompanyById', () => {
    const updateData = {
      CompanyName: 'Updated Company Name',
      RegisteredAddress: '789 New Address'
    };

    it('should update a company successfully', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = updateData;

      const updatedCompany = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'Updated Company Name',
        CompanyType: 'corporation',
        RegisteredAddress: '789 New Address',
        TaxID: '12-3456789',
        corporationDate: '2024-01-15',
        updatedAt: new Date().toISOString()
      };

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable.mockResolvedValue([updatedCompany]);

      await companyController.updateCompanyById(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'companies',
        { _id: 'zerodb-id-123' },
        expect.objectContaining({
          CompanyName: updateData.CompanyName,
          RegisteredAddress: updateData.RegisteredAddress,
          updatedAt: expect.any(String)
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedCompany);
    });

    it('should return 404 when company to update not found', async () => {
      mockReq.params.id = 'non-existent-id';
      mockReq.body = updateData;

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 0 });
      zerodbService.queryTable.mockResolvedValue([]);

      await companyController.updateCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
    });

    it('should return 500 when ZeroDB update fails', async () => {
      mockReq.params.id = 'some-id';
      mockReq.body = updateData;

      zerodbService.updateRows.mockRejectedValue(new Error('Update failed'));

      await companyController.updateCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should update single field successfully', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { CompanyName: 'New Name Only' };

      const updatedCompany = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'New Name Only',
        CompanyType: 'corporation',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: '2024-01-15'
      };

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable.mockResolvedValue([updatedCompany]);

      await companyController.updateCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle empty update body', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = {};

      const existingCompany = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'Original Name',
        CompanyType: 'corporation',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: '2024-01-15'
      };

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable.mockResolvedValue([existingCompany]);

      await companyController.updateCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid CompanyType in update', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { CompanyType: 'invalid-type' };

      await companyController.updateCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(zerodbService.updateRows).not.toHaveBeenCalled();
    });
  });

  describe('deleteCompanyById', () => {
    it('should delete a company successfully', async () => {
      mockReq.params.id = 'zerodb-id-123';

      const existingCompany = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'Company To Delete'
      };

      zerodbService.queryTable.mockResolvedValue([existingCompany]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      await companyController.deleteCompanyById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {
        filter: { _id: 'zerodb-id-123' }
      });
      expect(zerodbService.deleteRows).toHaveBeenCalledWith('companies', {
        _id: 'zerodb-id-123'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company deleted' });
    });

    it('should return 404 when company to delete not found', async () => {
      mockReq.params.id = 'non-existent-id';

      zerodbService.queryTable.mockResolvedValue([]);

      await companyController.deleteCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
      expect(zerodbService.deleteRows).not.toHaveBeenCalled();
    });

    it('should return 500 when ZeroDB delete fails', async () => {
      mockReq.params.id = 'some-id';

      zerodbService.queryTable.mockResolvedValue([{ _id: 'some-id' }]);
      zerodbService.deleteRows.mockRejectedValue(new Error('Delete failed'));

      await companyController.deleteCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle cascading delete for company relationships', async () => {
      mockReq.params.id = 'zerodb-id-123';

      const companyWithRelationships = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'Company With Stakeholders',
        stakeholders: ['stakeholder-1', 'stakeholder-2'],
        documents: ['doc-1', 'doc-2']
      };

      zerodbService.queryTable.mockResolvedValue([companyWithRelationships]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      await companyController.deleteCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company deleted' });
    });
  });

  describe('getCompanyByCompanyId', () => {
    it('should return a company by companyId successfully', async () => {
      const mockCompany = {
        _id: 'zerodb-id-123',
        companyId: 'COMP-001',
        CompanyName: 'Test Company',
        CompanyType: 'corporation'
      };

      mockReq.params.companyId = 'COMP-001';
      zerodbService.queryTable.mockResolvedValue([mockCompany]);

      await companyController.getCompanyByCompanyId(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {
        filter: { companyId: 'COMP-001' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCompany);
    });

    it('should return 404 when company not found by companyId', async () => {
      mockReq.params.companyId = 'NON-EXISTENT';
      zerodbService.queryTable.mockResolvedValue([]);

      await companyController.getCompanyByCompanyId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
    });
  });

  describe('getCompaniesByType', () => {
    it('should return companies by type successfully', async () => {
      const mockCompanies = [
        { _id: 'id-1', companyId: 'COMP-001', CompanyType: 'startup' },
        { _id: 'id-2', companyId: 'COMP-002', CompanyType: 'startup' }
      ];

      mockReq.params.type = 'startup';
      zerodbService.queryTable.mockResolvedValue(mockCompanies);

      await companyController.getCompaniesByType(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {
        filter: { CompanyType: 'startup' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCompanies);
    });

    it('should return 400 for invalid company type', async () => {
      mockReq.params.type = 'invalid-type';

      await companyController.getCompaniesByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(zerodbService.queryTable).not.toHaveBeenCalled();
    });

    it('should return 404 when no companies found for type', async () => {
      mockReq.params.type = 'government';
      zerodbService.queryTable.mockResolvedValue([]);

      await companyController.getCompaniesByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'No companies found for this type' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout errors', async () => {
      mockReq.body = {
        companyId: 'COMP-001',
        CompanyName: 'Test',
        CompanyType: 'startup',
        RegisteredAddress: '123 Main',
        TaxID: '12-3456789',
        corporationDate: '2024-01-01'
      };

      const timeoutError = new Error('ETIMEDOUT');
      timeoutError.code = 'ETIMEDOUT';
      zerodbService.insertRow.mockRejectedValue(timeoutError);

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle ZeroDB connection refused errors', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('ECONNREFUSED'));

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle authentication errors gracefully', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      zerodbService.queryTable.mockRejectedValue(authError);

      await companyController.getAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('Data Validation', () => {
    it('should handle special characters in company name', async () => {
      mockReq.body = {
        companyId: 'COMP-001',
        CompanyName: "Test & Company's \"Name\" <LLC>",
        CompanyType: 'startup',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: '2024-01-01'
      };

      zerodbService.insertRow.mockResolvedValue({
        rows: [{ _id: 'id-1', ...mockReq.body }]
      });

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle unicode characters in company data', async () => {
      mockReq.body = {
        companyId: 'COMP-001',
        CompanyName: 'Empresa Teste SA',
        CompanyType: 'corporation',
        RegisteredAddress: '123 Rua Principal',
        TaxID: '12-3456789',
        corporationDate: '2024-01-01'
      };

      zerodbService.insertRow.mockResolvedValue({
        rows: [{ _id: 'id-1', ...mockReq.body }]
      });

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle very long company names', async () => {
      const longName = 'A'.repeat(500);
      mockReq.body = {
        companyId: 'COMP-001',
        CompanyName: longName,
        CompanyType: 'startup',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: '2024-01-01'
      };

      zerodbService.insertRow.mockResolvedValue({
        rows: [{ _id: 'id-1', ...mockReq.body }]
      });

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent create requests', async () => {
      const companyData = {
        companyId: 'COMP-001',
        CompanyName: 'Test Company',
        CompanyType: 'startup',
        RegisteredAddress: '123 Main St',
        TaxID: '12-3456789',
        corporationDate: '2024-01-01'
      };

      zerodbService.insertRow
        .mockResolvedValueOnce({ rows: [{ _id: 'id-1', ...companyData }] })
        .mockResolvedValueOnce({ rows: [{ _id: 'id-2', ...companyData, companyId: 'COMP-002' }] });

      const req1 = { body: { ...companyData, companyId: 'COMP-001' } };
      const req2 = { body: { ...companyData, companyId: 'COMP-002' } };
      const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await Promise.all([
        companyController.createCompany(req1, res1),
        companyController.createCompany(req2, res2)
      ]);

      expect(res1.status).toHaveBeenCalledWith(201);
      expect(res2.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getCompanyByCompanyId - Additional Coverage', () => {
    it('should return 500 when ZeroDB query fails', async () => {
      mockReq.params.companyId = 'COMP-001';
      zerodbService.queryTable.mockRejectedValue(new Error('Database error'));

      await companyController.getCompanyByCompanyId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle null response from queryTable', async () => {
      mockReq.params.companyId = 'COMP-001';
      zerodbService.queryTable.mockResolvedValue(null);

      await companyController.getCompanyByCompanyId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Company not found' });
    });
  });

  describe('getCompaniesByType - Additional Coverage', () => {
    it('should return 500 when ZeroDB query fails', async () => {
      mockReq.params.type = 'startup';
      zerodbService.queryTable.mockRejectedValue(new Error('Database error'));

      await companyController.getCompaniesByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should handle null response from queryTable', async () => {
      mockReq.params.type = 'corporation';
      zerodbService.queryTable.mockResolvedValue(null);

      await companyController.getCompaniesByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle all valid company types', async () => {
      const validTypes = ['startup', 'corporation', 'non-profit', 'government'];

      for (const type of validTypes) {
        jest.clearAllMocks();
        mockReq.params.type = type;
        zerodbService.queryTable.mockResolvedValue([{ _id: 'id-1', CompanyType: type }]);

        await companyController.getCompaniesByType(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {
          filter: { CompanyType: type }
        });
      }
    });
  });

  describe('createCompany - Legal Structure Fields', () => {
    const baseCompanyData = {
      companyId: 'COMP-001',
      CompanyName: 'Test Corporation',
      CompanyType: 'corporation',
      RegisteredAddress: '123 Main St',
      TaxID: '12-3456789',
      corporationDate: '2024-01-15'
    };

    it('should create company with legal structure fields', async () => {
      const legalData = {
        ...baseCompanyData,
        entityType: 'DELAWARE_C_CORP',
        stateOfIncorporation: 'DE',
        qualifiedSmallBusiness: true,
        section1202Eligible: true,
        taxStatus: 'ACTIVE',
        fiscalYearEnd: 'DECEMBER',
        authorizedShares: 10000000
      };

      mockReq.body = legalData;
      zerodbService.insertRow.mockResolvedValue({ rows: [{ _id: 'id-1', ...legalData }] });

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'companies',
        expect.objectContaining({
          entityType: 'DELAWARE_C_CORP',
          stateOfIncorporation: 'DE',
          qualifiedSmallBusiness: true,
          section1202Eligible: true,
          taxStatus: 'ACTIVE',
          fiscalYearEnd: 'DECEMBER',
          authorizedShares: 10000000
        })
      );
    });

    it('should create company without legal structure fields (backward compat)', async () => {
      mockReq.body = { ...baseCompanyData };
      zerodbService.insertRow.mockResolvedValue({ rows: [{ _id: 'id-1', ...baseCompanyData }] });

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const insertedData = zerodbService.insertRow.mock.calls[0][1];
      expect(insertedData.entityType).toBeUndefined();
      expect(insertedData.stateOfIncorporation).toBeUndefined();
    });

    it('should return 400 for invalid entityType', async () => {
      mockReq.body = { ...baseCompanyData, entityType: 'INVALID_TYPE' };

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('entityType') })
      );
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    });

    it('should accept all valid entityType values', async () => {
      const validTypes = ['C_CORP', 'S_CORP', 'LLC', 'LP', 'DELAWARE_C_CORP', 'DELAWARE_LLC'];

      for (const entityType of validTypes) {
        jest.clearAllMocks();
        mockReq.body = { ...baseCompanyData, entityType };
        zerodbService.insertRow.mockResolvedValue({
          rows: [{ _id: `id-${entityType}`, ...baseCompanyData, entityType }]
        });

        await companyController.createCompany(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(201);
      }
    });

    it('should include EIN and registered agent fields', async () => {
      mockReq.body = {
        ...baseCompanyData,
        ein: '94-1234567',
        registeredAgentName: 'Delaware Agents LLC',
        registeredAgentAddress: {
          street: '100 Corporate Blvd',
          city: 'Wilmington',
          state: 'DE',
          zip: '19801'
        }
      };

      zerodbService.insertRow.mockResolvedValue({ rows: [{ _id: 'id-1', ...mockReq.body }] });

      await companyController.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'companies',
        expect.objectContaining({
          ein: '94-1234567',
          registeredAgentName: 'Delaware Agents LLC',
          registeredAgentAddress: expect.objectContaining({ state: 'DE' })
        })
      );
    });
  });

  describe('ZeroDB Service Integration', () => {
    it('should use correct table name for all operations', async () => {
      // Test create
      mockReq.body = {
        companyId: 'COMP-001',
        CompanyName: 'Test',
        CompanyType: 'startup',
        RegisteredAddress: '123 Main',
        TaxID: '12-3456789',
        corporationDate: '2024-01-01'
      };
      zerodbService.insertRow.mockResolvedValue({ rows: [{ _id: 'id-1' }] });
      await companyController.createCompany(mockReq, mockRes);
      expect(zerodbService.insertRow).toHaveBeenCalledWith('companies', expect.any(Object));

      // Test read all
      jest.clearAllMocks();
      zerodbService.queryTable.mockResolvedValue([{ _id: 'id-1' }]);
      await companyController.getAllCompanies(mockReq, mockRes);
      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {});

      // Test read by ID
      jest.clearAllMocks();
      mockReq.params.id = 'id-1';
      zerodbService.queryTable.mockResolvedValue([{ _id: 'id-1' }]);
      await companyController.getCompanyById(mockReq, mockRes);
      expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', { filter: { _id: 'id-1' } });

      // Test update
      jest.clearAllMocks();
      mockReq.params.id = 'id-1';
      mockReq.body = { CompanyName: 'Updated' };
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable.mockResolvedValue([{ _id: 'id-1' }]);
      await companyController.updateCompanyById(mockReq, mockRes);
      expect(zerodbService.updateRows).toHaveBeenCalledWith('companies', expect.any(Object), expect.any(Object));

      // Test delete
      jest.clearAllMocks();
      mockReq.params.id = 'id-1';
      zerodbService.queryTable.mockResolvedValue([{ _id: 'id-1' }]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });
      await companyController.deleteCompanyById(mockReq, mockRes);
      expect(zerodbService.deleteRows).toHaveBeenCalledWith('companies', expect.any(Object));
    });
  });
});
