/**
 * TaxDocument Model Unit Tests
 * Issue #246: Tax Document Download Endpoint
 *
 * Tests the actual model file for creation, validation, status management,
 * query methods, and document lifecycle.
 */

// Mock the ZeroDB base model before importing the model
jest.mock('../../../models/base/ZeroDBModel', () => {
  let mockData = [];

  const mockBaseModel = {
    create: jest.fn(async (data) => {
      const doc = { _id: data._id || `id_${Date.now()}_${Math.random()}`, ...data };
      mockData.push(doc);
      return doc;
    }),
    find: jest.fn(async (query = {}) => {
      return mockData.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }),
    findOne: jest.fn(async (query = {}) => {
      return mockData.find(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      }) || null;
    }),
    findById: jest.fn(async (id) => {
      return mockData.find(doc => doc._id === id) || null;
    }),
    updateOne: jest.fn(async (query, update) => {
      const doc = mockData.find(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (doc) {
        if (update.$set) {
          Object.assign(doc, update.$set);
        } else {
          Object.assign(doc, update);
        }
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }),
    findOneAndUpdate: jest.fn(async (query, update, options) => {
      const doc = mockData.find(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (doc) {
        const updateData = update.$set || update;
        Object.assign(doc, updateData);
        return doc;
      }
      return null;
    }),
    findByIdAndUpdate: jest.fn(async (id, update, options) => {
      const doc = mockData.find(d => d._id === id);
      if (doc) {
        const updateData = update.$set || update;
        Object.assign(doc, updateData);
        return doc;
      }
      return null;
    }),
    updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
    deleteOne: jest.fn(async (query) => {
      const index = mockData.findIndex(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (index >= 0) {
        mockData.splice(index, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }),
    deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
    findOneAndDelete: jest.fn(async () => null),
    findByIdAndDelete: jest.fn(async () => null),
    countDocuments: jest.fn(async () => mockData.length),
    exists: jest.fn(async () => mockData.length > 0),
    distinct: jest.fn(async () => []),
    aggregate: jest.fn(async () => []),
    tableName: 'tax_documents'
  };

  return {
    createModel: jest.fn(() => mockBaseModel),
    __mockData: mockData,
    __resetMockData: () => { mockData.length = 0; },
    __getMockBaseModel: () => mockBaseModel
  };
});

const TaxDocument = require('../../../models/TaxDocument');
const zeroDBModelMock = require('../../../models/base/ZeroDBModel');

describe('TaxDocument Model', () => {
  beforeEach(() => {
    zeroDBModelMock.__resetMockData();
    jest.clearAllMocks();
  });

  const validData = {
    name: 'Form 1099 - 2025',
    fileName: '1099_2025.pdf',
    type: '1099',
    taxYear: 2025,
    stakeholderId: 'stakeholder_001',
    companyId: 'company_123'
  };

  describe('validateTaxDocument()', () => {
    it('should validate correct data', () => {
      const result = TaxDocument.validateTaxDocument(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing name', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required and must be a string');
    });

    it('should reject non-string name', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, name: 123 });
      expect(result.valid).toBe(false);
    });

    it('should reject missing fileName', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, fileName: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fileName is required and must be a string');
    });

    it('should reject invalid type', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, type: 'InvalidType' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/type must be one of/);
    });

    it('should accept all valid document types', () => {
      const validTypes = ['1099', '1099-DIV', '1099-INT', '1099-MISC', 'W-2', 'W-9', 'K-1', '3921', 'Tax Summary', 'Quarterly Report', 'Other'];
      for (const type of validTypes) {
        const result = TaxDocument.validateTaxDocument({ ...validData, type });
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, status: 'Unknown' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/status must be one of/);
    });

    it('should accept valid statuses', () => {
      for (const status of ['Pending', 'Processing', 'Ready', 'Failed']) {
        const result = TaxDocument.validateTaxDocument({ ...validData, status });
        expect(result.valid).toBe(true);
      }
    });

    it('should reject missing taxYear', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, taxYear: undefined });
      expect(result.valid).toBe(false);
    });

    it('should reject taxYear out of range (too low)', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, taxYear: 1800 });
      expect(result.valid).toBe(false);
    });

    it('should reject taxYear out of range (too high)', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, taxYear: 2200 });
      expect(result.valid).toBe(false);
    });

    it('should reject missing stakeholderId', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, stakeholderId: '' });
      expect(result.valid).toBe(false);
    });

    it('should reject missing companyId', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, companyId: '' });
      expect(result.valid).toBe(false);
    });

    it('should reject negative size', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, size: -100 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('size must be a non-negative number');
    });

    it('should accept valid size', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData, size: 1024 });
      expect(result.valid).toBe(true);
    });

    it('should accept data without size', () => {
      const result = TaxDocument.validateTaxDocument({ ...validData });
      expect(result.valid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const result = TaxDocument.validateTaxDocument({
        name: '',
        fileName: '',
        type: 'Invalid',
        taxYear: 1800,
        stakeholderId: '',
        companyId: ''
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('create()', () => {
    it('should create a tax document with valid data', async () => {
      const result = await TaxDocument.create({ ...validData });
      expect(result).toBeDefined();
      expect(result.name).toBe('Form 1099 - 2025');
      expect(result.fileName).toBe('1099_2025.pdf');
      expect(result.type).toBe('1099');
      expect(result.taxYear).toBe(2025);
    });

    it('should auto-generate an id if not provided', async () => {
      const result = await TaxDocument.create({ ...validData });
      expect(result._id).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should use provided _id', async () => {
      const result = await TaxDocument.create({ ...validData, _id: 'custom_id_123' });
      expect(result._id).toBe('custom_id_123');
    });

    it('should use provided id field', async () => {
      const result = await TaxDocument.create({ ...validData, id: 'custom_id_456' });
      expect(result.id).toBe('custom_id_456');
    });

    it('should default status to Pending', async () => {
      const result = await TaxDocument.create({ ...validData });
      expect(result.status).toBe('Pending');
    });

    it('should default contentType to application/pdf', async () => {
      const result = await TaxDocument.create({ ...validData });
      expect(result.contentType).toBe('application/pdf');
    });

    it('should set createdAt and updatedAt', async () => {
      const result = await TaxDocument.create({ ...validData });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should normalize dueDate if provided as Date object', async () => {
      const dueDate = new Date('2026-04-15');
      const result = await TaxDocument.create({ ...validData, dueDate });
      expect(result.dueDate).toBe(dueDate.toISOString());
    });

    it('should normalize dueDate if provided as string', async () => {
      const result = await TaxDocument.create({ ...validData, dueDate: '2026-04-15' });
      expect(result.dueDate).toBeDefined();
    });

    it('should normalize generatedDate if provided', async () => {
      const genDate = new Date('2026-03-01');
      const result = await TaxDocument.create({ ...validData, generatedDate: genDate });
      expect(result.generatedDate).toBe(genDate.toISOString());
    });

    it('should throw ValidationError for invalid data', async () => {
      await expect(
        TaxDocument.create({ name: '', fileName: '', type: 'Invalid', taxYear: 0, stakeholderId: '', companyId: '' })
      ).rejects.toThrow();
    });

    it('should throw error with name ValidationError', async () => {
      try {
        await TaxDocument.create({ name: '', fileName: '', type: 'Invalid', taxYear: 0, stakeholderId: '', companyId: '' });
      } catch (e) {
        expect(e.name).toBe('ValidationError');
      }
    });
  });

  describe('findByStakeholder()', () => {
    it('should find documents by stakeholderId', async () => {
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_A' });
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_A' });
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_B' });

      const results = await TaxDocument.findByStakeholder('sh_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by taxYear', async () => {
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_C', taxYear: 2024 });
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_C', taxYear: 2025 });

      const results = await TaxDocument.findByStakeholder('sh_C', { taxYear: '2024' });
      expect(results).toHaveLength(1);
    });

    it('should filter by type', async () => {
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_D', type: '1099' });
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_D', type: 'W-2' });

      const results = await TaxDocument.findByStakeholder('sh_D', { type: '1099' });
      expect(results).toHaveLength(1);
    });

    it('should filter by status', async () => {
      await TaxDocument.create({ ...validData, stakeholderId: 'sh_E' });
      const results = await TaxDocument.findByStakeholder('sh_E', { status: 'Pending' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findByCompany()', () => {
    it('should find documents by companyId', async () => {
      await TaxDocument.create({ ...validData, companyId: 'comp_A' });
      await TaxDocument.create({ ...validData, companyId: 'comp_A' });

      const results = await TaxDocument.findByCompany('comp_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by taxYear', async () => {
      await TaxDocument.create({ ...validData, companyId: 'comp_B', taxYear: 2024 });
      const results = await TaxDocument.findByCompany('comp_B', { taxYear: '2024' });
      expect(results).toHaveLength(1);
    });

    it('should filter by type', async () => {
      await TaxDocument.create({ ...validData, companyId: 'comp_C', type: 'K-1' });
      const results = await TaxDocument.findByCompany('comp_C', { type: 'K-1' });
      expect(results).toHaveLength(1);
    });

    it('should filter by status', async () => {
      await TaxDocument.create({ ...validData, companyId: 'comp_D', status: 'Ready' });
      const results = await TaxDocument.findByCompany('comp_D', { status: 'Ready' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findByTaxYear()', () => {
    it('should find documents by tax year', async () => {
      await TaxDocument.create({ ...validData, taxYear: 2024 });
      await TaxDocument.create({ ...validData, taxYear: 2024 });
      await TaxDocument.create({ ...validData, taxYear: 2025 });

      const results = await TaxDocument.findByTaxYear(2024);
      expect(results).toHaveLength(2);
    });

    it('should filter by companyId when provided', async () => {
      await TaxDocument.create({ ...validData, taxYear: 2023, companyId: 'comp_X' });
      await TaxDocument.create({ ...validData, taxYear: 2023, companyId: 'comp_Y' });

      const results = await TaxDocument.findByTaxYear(2023, 'comp_X');
      expect(results).toHaveLength(1);
    });

    it('should handle string taxYear by parsing to int', async () => {
      await TaxDocument.create({ ...validData, taxYear: 2022 });
      const results = await TaxDocument.findByTaxYear('2022');
      expect(results).toHaveLength(1);
    });
  });

  describe('updateStatus()', () => {
    it('should update document status', async () => {
      const created = await TaxDocument.create({ ...validData, _id: 'doc_status_test' });

      await TaxDocument.updateStatus('doc_status_test', 'Processing');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'doc_status_test',
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'Processing'
          })
        }),
        { new: true }
      );
    });

    it('should throw error for invalid status', async () => {
      await expect(
        TaxDocument.updateStatus('doc_123', 'InvalidStatus')
      ).rejects.toThrow('Invalid status');
    });

    it('should include additional data in update', async () => {
      await TaxDocument.create({ ...validData, _id: 'doc_extra_data' });
      await TaxDocument.updateStatus('doc_extra_data', 'Ready', { fileId: 'file_001' });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].$set.fileId).toBe('file_001');
      expect(updateCall[1].$set.updatedAt).toBeDefined();
    });
  });

  describe('markAsReady()', () => {
    it('should mark document as ready with fileId', async () => {
      await TaxDocument.create({ ...validData, _id: 'doc_ready_test' });
      await TaxDocument.markAsReady('doc_ready_test', 'file_ready_001');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].$set.status).toBe('Ready');
      expect(updateCall[1].$set.fileId).toBe('file_ready_001');
      expect(updateCall[1].$set.generatedDate).toBeDefined();
    });

    it('should include file metadata when provided', async () => {
      await TaxDocument.create({ ...validData, _id: 'doc_ready_meta' });
      await TaxDocument.markAsReady('doc_ready_meta', 'file_002', {
        size: 2048,
        contentType: 'application/pdf'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].$set.size).toBe(2048);
      expect(updateCall[1].$set.contentType).toBe('application/pdf');
    });

    it('should not include size or contentType if not in metadata', async () => {
      await TaxDocument.create({ ...validData, _id: 'doc_ready_no_meta' });
      await TaxDocument.markAsReady('doc_ready_no_meta', 'file_003', {});

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].$set.size).toBeUndefined();
    });
  });

  describe('getReadyDocuments()', () => {
    it('should find all ready documents', async () => {
      await TaxDocument.create({ ...validData, status: 'Ready' });
      await TaxDocument.create({ ...validData, status: 'Ready' });
      await TaxDocument.create({ ...validData, status: 'Pending' });

      const results = await TaxDocument.getReadyDocuments();
      expect(results).toHaveLength(2);
    });

    it('should filter by stakeholderId when provided', async () => {
      await TaxDocument.create({ ...validData, status: 'Ready', stakeholderId: 'sh_ready_A' });
      await TaxDocument.create({ ...validData, status: 'Ready', stakeholderId: 'sh_ready_B' });

      const results = await TaxDocument.getReadyDocuments('sh_ready_A');
      expect(results).toHaveLength(1);
    });

    it('should filter by companyId when provided', async () => {
      await TaxDocument.create({ ...validData, status: 'Ready', companyId: 'comp_ready_A' });
      const results = await TaxDocument.getReadyDocuments(null, 'comp_ready_A');
      expect(results).toHaveLength(1);
    });

    it('should filter by both stakeholder and company', async () => {
      await TaxDocument.create({
        ...validData,
        status: 'Ready',
        stakeholderId: 'sh_both',
        companyId: 'comp_both'
      });

      const results = await TaxDocument.getReadyDocuments('sh_both', 'comp_both');
      expect(results).toHaveLength(1);
    });
  });

  describe('findByType()', () => {
    it('should find documents by type', async () => {
      await TaxDocument.create({ ...validData, type: 'W-2' });
      await TaxDocument.create({ ...validData, type: 'W-2' });
      await TaxDocument.create({ ...validData, type: '1099' });

      const results = await TaxDocument.findByType('W-2');
      expect(results).toHaveLength(2);
    });

    it('should filter by taxYear when provided', async () => {
      await TaxDocument.create({ ...validData, type: 'K-1', taxYear: 2024 });
      await TaxDocument.create({ ...validData, type: 'K-1', taxYear: 2025 });

      const results = await TaxDocument.findByType('K-1', 2024);
      expect(results).toHaveLength(1);
    });
  });

  describe('deleteDocument()', () => {
    it('should delete a document by id', async () => {
      await TaxDocument.create({ ...validData, _id: 'doc_delete_test' });
      const result = await TaxDocument.deleteDocument('doc_delete_test');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.deleteOne).toHaveBeenCalledWith({ _id: 'doc_delete_test' });
    });
  });
});
