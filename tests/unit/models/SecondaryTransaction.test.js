/**
 * SecondaryTransaction Model Unit Tests
 * Issue #103: Create Secondary Transaction Model
 *
 * Tests the actual model file for creation, validation, query methods,
 * fee calculations, approval workflow, and status transitions.
 */

// Mock the ZeroDB base model before importing the model
jest.mock('../../../models/base/ZeroDBModel', () => {
  let mockData = [];

  const mockBaseModel = {
    create: jest.fn(async (data) => {
      const doc = { _id: `id_${Date.now()}_${Math.random()}`, ...data };
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
    tableName: 'secondary_transactions'
  };

  return {
    createModel: jest.fn(() => mockBaseModel),
    __mockData: mockData,
    __resetMockData: () => { mockData.length = 0; },
    __getMockBaseModel: () => mockBaseModel
  };
});

const SecondaryTransaction = require('../../../models/SecondaryTransaction');
const zeroDBModelMock = require('../../../models/base/ZeroDBModel');

describe('SecondaryTransaction Model', () => {
  beforeEach(() => {
    zeroDBModelMock.__resetMockData();
    jest.clearAllMocks();
  });

  // Valid transaction data
  const validData = {
    companyId: 'company_123',
    sellerId: 'seller_456',
    buyerId: 'buyer_789',
    shareClassId: 'sc_001',
    numberOfShares: 1000,
    pricePerShare: 10.50,
    totalAmount: 10500,
    transactionDate: '2026-01-15',
    transactionType: 'private_sale'
  };

  describe('Constants', () => {
    it('should export valid statuses', () => {
      expect(SecondaryTransaction.VALID_STATUSES).toEqual(
        ['pending', 'approved', 'in_escrow', 'completed', 'canceled', 'failed', 'rejected']
      );
    });

    it('should export transaction types', () => {
      expect(SecondaryTransaction.TRANSACTION_TYPES).toEqual(
        ['private_sale', 'tender_offer', 'rofr_exercise', 'gift', 'estate_transfer', 'company_buyback']
      );
    });

    it('should export document types', () => {
      expect(SecondaryTransaction.DOCUMENT_TYPES).toEqual(
        ['purchase_agreement', 'board_consent', 'rofr_waiver', 'transfer_notice', 'tax_form', 'other']
      );
    });

    it('should export fee payers', () => {
      expect(SecondaryTransaction.FEE_PAYERS).toEqual(
        ['seller', 'buyer', 'split', 'company']
      );
    });

    it('should export approver types', () => {
      expect(SecondaryTransaction.APPROVER_TYPES).toEqual(
        ['board', 'company_admin', 'legal', 'transfer_agent']
      );
    });
  });

  describe('Schema', () => {
    it('should have a schema definition', () => {
      expect(SecondaryTransaction.schema).toBeDefined();
      expect(SecondaryTransaction.schema.transactionId).toBeDefined();
      expect(SecondaryTransaction.schema.companyId).toBeDefined();
      expect(SecondaryTransaction.schema.sellerId).toBeDefined();
      expect(SecondaryTransaction.schema.buyerId).toBeDefined();
    });

    it('should define the table name as secondary_transactions', () => {
      expect(SecondaryTransaction.tableName).toBe('secondary_transactions');
    });
  });

  describe('create()', () => {
    it('should create a transaction with valid data', async () => {
      const result = await SecondaryTransaction.create({ ...validData });
      expect(result).toBeDefined();
      expect(result.companyId).toBe('company_123');
      expect(result.sellerId).toBe('seller_456');
      expect(result.buyerId).toBe('buyer_789');
      expect(result.numberOfShares).toBe(1000);
      expect(result.pricePerShare).toBe(10.50);
      expect(result.transactionType).toBe('private_sale');
    });

    it('should auto-generate transactionId if not provided', async () => {
      const result = await SecondaryTransaction.create({ ...validData });
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^stx_/);
    });

    it('should use provided transactionId if given', async () => {
      const result = await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_custom_123'
      });
      expect(result.transactionId).toBe('stx_custom_123');
    });

    it('should default status to pending', async () => {
      const result = await SecondaryTransaction.create({ ...validData });
      expect(result.status).toBe('pending');
    });

    it('should set initiatedAt if not provided', async () => {
      const result = await SecondaryTransaction.create({ ...validData });
      expect(result.initiatedAt).toBeDefined();
    });

    it('should calculate totalAmount if not set', async () => {
      const data = { ...validData };
      delete data.totalAmount;
      const result = await SecondaryTransaction.create(data);
      expect(result.totalAmount).toBe(1000 * 10.50);
    });

    it('should throw error if numberOfShares is less than 1', async () => {
      await expect(
        SecondaryTransaction.create({ ...validData, numberOfShares: 0 })
      ).rejects.toThrow('numberOfShares must be at least 1');
    });

    it('should throw error if pricePerShare is negative', async () => {
      await expect(
        SecondaryTransaction.create({ ...validData, pricePerShare: -5 })
      ).rejects.toThrow('pricePerShare cannot be negative');
    });

    it('should throw error for invalid transactionType', async () => {
      await expect(
        SecondaryTransaction.create({ ...validData, transactionType: 'invalid_type' })
      ).rejects.toThrow('transactionType must be one of');
    });

    it('should accept all valid transaction types', async () => {
      for (const type of SecondaryTransaction.TRANSACTION_TYPES) {
        zeroDBModelMock.__resetMockData();
        const result = await SecondaryTransaction.create({
          ...validData,
          transactionType: type
        });
        expect(result.transactionType).toBe(type);
      }
    });
  });

  describe('findByTransactionId()', () => {
    it('should find a transaction by its transactionId', async () => {
      await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_find_me'
      });
      const found = await SecondaryTransaction.findByTransactionId('stx_find_me');
      expect(found).toBeDefined();
      expect(found.transactionId).toBe('stx_find_me');
    });

    it('should return null for non-existent transactionId', async () => {
      const found = await SecondaryTransaction.findByTransactionId('stx_nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find transactions by companyId', async () => {
      await SecondaryTransaction.create({ ...validData, companyId: 'comp_A' });
      await SecondaryTransaction.create({ ...validData, companyId: 'comp_A' });
      await SecondaryTransaction.create({ ...validData, companyId: 'comp_B' });

      const results = await SecondaryTransaction.findByCompany('comp_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      await SecondaryTransaction.create({ ...validData, companyId: 'comp_C' });
      const results = await SecondaryTransaction.findByCompany('comp_C', { status: 'pending' });
      expect(results).toHaveLength(1);
    });

    it('should filter by transactionType when provided', async () => {
      await SecondaryTransaction.create({ ...validData, companyId: 'comp_D' });
      const results = await SecondaryTransaction.findByCompany('comp_D', { transactionType: 'private_sale' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findBySeller()', () => {
    it('should find transactions by sellerId', async () => {
      await SecondaryTransaction.create({ ...validData, sellerId: 'seller_A' });
      await SecondaryTransaction.create({ ...validData, sellerId: 'seller_A' });

      const results = await SecondaryTransaction.findBySeller('seller_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      await SecondaryTransaction.create({ ...validData, sellerId: 'seller_B' });
      const results = await SecondaryTransaction.findBySeller('seller_B', { status: 'pending' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findByBuyer()', () => {
    it('should find transactions by buyerId', async () => {
      await SecondaryTransaction.create({ ...validData, buyerId: 'buyer_A' });
      const results = await SecondaryTransaction.findByBuyer('buyer_A');
      expect(results).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      await SecondaryTransaction.create({ ...validData, buyerId: 'buyer_B' });
      const results = await SecondaryTransaction.findByBuyer('buyer_B', { status: 'completed' });
      expect(results).toHaveLength(0);
    });
  });

  describe('getTotalFees()', () => {
    it('should sum all fee components', () => {
      const transaction = {
        fees: {
          platformFee: 100,
          legalFees: 200,
          transferAgentFee: 50,
          escrowFee: 75,
          otherFees: 25
        }
      };
      expect(SecondaryTransaction.getTotalFees(transaction)).toBe(450);
    });

    it('should handle missing fee components', () => {
      const transaction = {
        fees: { platformFee: 100 }
      };
      expect(SecondaryTransaction.getTotalFees(transaction)).toBe(100);
    });

    it('should return 0 when fees object is empty', () => {
      const transaction = { fees: {} };
      expect(SecondaryTransaction.getTotalFees(transaction)).toBe(0);
    });

    it('should return 0 when fees is undefined', () => {
      const transaction = {};
      expect(SecondaryTransaction.getTotalFees(transaction)).toBe(0);
    });
  });

  describe('getNetAmount()', () => {
    it('should return totalAmount minus total fees', () => {
      const transaction = {
        totalAmount: 10000,
        fees: {
          platformFee: 100,
          legalFees: 200,
          transferAgentFee: 50,
          escrowFee: 0,
          otherFees: 0
        }
      };
      expect(SecondaryTransaction.getNetAmount(transaction)).toBe(9650);
    });

    it('should return totalAmount when no fees', () => {
      const transaction = { totalAmount: 5000, fees: {} };
      expect(SecondaryTransaction.getNetAmount(transaction)).toBe(5000);
    });
  });

  describe('hasAllApprovals()', () => {
    it('should return true when all approvals are approved', () => {
      const transaction = {
        approvals: [
          { approverType: 'board', status: 'approved' },
          { approverType: 'legal', status: 'approved' }
        ]
      };
      expect(SecondaryTransaction.hasAllApprovals(transaction)).toBe(true);
    });

    it('should return false when any approval is not approved', () => {
      const transaction = {
        approvals: [
          { approverType: 'board', status: 'approved' },
          { approverType: 'legal', status: 'pending' }
        ]
      };
      expect(SecondaryTransaction.hasAllApprovals(transaction)).toBe(false);
    });

    it('should return false when approvals array is empty', () => {
      const transaction = { approvals: [] };
      expect(SecondaryTransaction.hasAllApprovals(transaction)).toBe(false);
    });

    it('should return false when approvals is undefined', () => {
      const transaction = {};
      expect(SecondaryTransaction.hasAllApprovals(transaction)).toBe(false);
    });
  });

  describe('addApproval()', () => {
    it('should add an approval to a transaction', async () => {
      const created = await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_approval_test'
      });

      await SecondaryTransaction.addApproval('stx_approval_test', {
        approverType: 'board',
        approverId: 'approver_001',
        status: 'approved',
        notes: 'Looks good'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalled();
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(
        SecondaryTransaction.addApproval('stx_nonexistent', {
          approverType: 'board',
          approverId: 'approver_001',
          status: 'approved'
        })
      ).rejects.toThrow('Transaction not found');
    });

    it('should set approvedAt when status is approved', async () => {
      await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_approval_date'
      });

      await SecondaryTransaction.addApproval('stx_approval_date', {
        approverType: 'board',
        approverId: 'approver_002',
        status: 'approved',
        notes: 'Approved'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const approvals = updateCall[1].$set.approvals;
      expect(approvals[0].approvedAt).toBeDefined();
    });

    it('should set approvedAt to null when status is not approved', async () => {
      await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_approval_null'
      });

      await SecondaryTransaction.addApproval('stx_approval_null', {
        approverType: 'legal',
        approverId: 'approver_003',
        status: 'pending',
        notes: 'Pending review'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const approvals = updateCall[1].$set.approvals;
      expect(approvals[0].approvedAt).toBeNull();
    });
  });

  describe('addDocument()', () => {
    it('should add a document to a transaction', async () => {
      await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_doc_test'
      });

      await SecondaryTransaction.addDocument('stx_doc_test', {
        documentId: 'doc_001',
        documentType: 'purchase_agreement',
        uploadedBy: 'user_001'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalled();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const documents = updateCall[1].$set.documents;
      expect(documents[0].documentId).toBe('doc_001');
      expect(documents[0].documentType).toBe('purchase_agreement');
      expect(documents[0].uploadedBy).toBe('user_001');
      expect(documents[0].uploadedAt).toBeDefined();
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(
        SecondaryTransaction.addDocument('stx_nonexistent', {
          documentId: 'doc_002',
          documentType: 'board_consent',
          uploadedBy: 'user_002'
        })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('complete()', () => {
    it('should mark a transaction as completed', async () => {
      await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_complete_test'
      });

      await SecondaryTransaction.complete('stx_complete_test');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalledWith(
        { transactionId: 'stx_complete_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed'
          })
        })
      );
    });
  });

  describe('cancel()', () => {
    it('should cancel a transaction with reason', async () => {
      await SecondaryTransaction.create({
        ...validData,
        transactionId: 'stx_cancel_test'
      });

      await SecondaryTransaction.cancel('stx_cancel_test', 'Buyer backed out', 'user_cancel_001');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalledWith(
        { transactionId: 'stx_cancel_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'canceled',
            cancellationReason: 'Buyer backed out',
            canceledBy: 'user_cancel_001'
          })
        })
      );
    });
  });

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof SecondaryTransaction.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof SecondaryTransaction.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof SecondaryTransaction.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof SecondaryTransaction.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof SecondaryTransaction.deleteOne).toBe('function');
    });

    it('should expose deleteMany method', () => {
      expect(typeof SecondaryTransaction.deleteMany).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof SecondaryTransaction.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof SecondaryTransaction.exists).toBe('function');
    });

    it('should expose distinct method', () => {
      expect(typeof SecondaryTransaction.distinct).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof SecondaryTransaction.aggregate).toBe('function');
    });
  });
});
