/**
 * TransferApproval Model Unit Tests
 * Issue #104: Build Transfer Approval Workflow
 *
 * Tests the actual model file for creation, validation, query methods,
 * decision helpers, and approval workflow logic.
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
    findOneAndUpdate: jest.fn(async () => null),
    findByIdAndUpdate: jest.fn(async () => null),
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
    tableName: 'transfer_approvals'
  };

  return {
    createModel: jest.fn(() => mockBaseModel),
    __mockData: mockData,
    __resetMockData: () => { mockData.length = 0; },
    __getMockBaseModel: () => mockBaseModel
  };
});

const TransferApproval = require('../../../models/TransferApproval');
const zeroDBModelMock = require('../../../models/base/ZeroDBModel');

describe('TransferApproval Model', () => {
  beforeEach(() => {
    zeroDBModelMock.__resetMockData();
    jest.clearAllMocks();
  });

  const validData = {
    requestId: 'req_001',
    approverId: 'approver_001',
    approverRole: 'board_member',
    decision: 'approved',
    comments: 'Looks good'
  };

  describe('Constants', () => {
    it('should export approver roles', () => {
      expect(TransferApproval.APPROVER_ROLES).toEqual(
        ['board_member', 'cfo', 'ceo', 'legal_counsel', 'compliance_officer', 'admin']
      );
    });

    it('should export decisions', () => {
      expect(TransferApproval.DECISIONS).toEqual(
        ['approved', 'rejected', 'requested_changes']
      );
    });
  });

  describe('Schema', () => {
    it('should have a schema definition', () => {
      expect(TransferApproval.schema).toBeDefined();
      expect(TransferApproval.schema.approvalId).toBeDefined();
      expect(TransferApproval.schema.requestId).toBeDefined();
      expect(TransferApproval.schema.approverId).toBeDefined();
      expect(TransferApproval.schema.approverRole).toBeDefined();
      expect(TransferApproval.schema.decision).toBeDefined();
    });

    it('should define the table name as transfer_approvals', () => {
      expect(TransferApproval.tableName).toBe('transfer_approvals');
    });
  });

  describe('create()', () => {
    it('should create an approval with valid data', async () => {
      const result = await TransferApproval.create({ ...validData });
      expect(result).toBeDefined();
      expect(result.requestId).toBe('req_001');
      expect(result.approverId).toBe('approver_001');
      expect(result.approverRole).toBe('board_member');
      expect(result.decision).toBe('approved');
    });

    it('should auto-generate approvalId if not provided', async () => {
      const result = await TransferApproval.create({ ...validData });
      expect(result.approvalId).toBeDefined();
      expect(result.approvalId).toMatch(/^appr_/);
    });

    it('should use provided approvalId if given', async () => {
      const result = await TransferApproval.create({
        ...validData,
        approvalId: 'appr_custom_123'
      });
      expect(result.approvalId).toBe('appr_custom_123');
    });

    it('should set decidedAt if not provided', async () => {
      const result = await TransferApproval.create({ ...validData });
      expect(result.decidedAt).toBeDefined();
    });

    it('should throw error for invalid approver role', async () => {
      await expect(
        TransferApproval.create({ ...validData, approverRole: 'invalid_role' })
      ).rejects.toThrow('approverRole must be one of');
    });

    it('should throw error for invalid decision', async () => {
      await expect(
        TransferApproval.create({ ...validData, decision: 'invalid_decision' })
      ).rejects.toThrow('decision must be one of');
    });

    it('should accept all valid approver roles', async () => {
      for (const role of TransferApproval.APPROVER_ROLES) {
        zeroDBModelMock.__resetMockData();
        const result = await TransferApproval.create({
          ...validData,
          approverRole: role
        });
        expect(result.approverRole).toBe(role);
      }
    });

    it('should accept all valid decisions', async () => {
      for (const decision of TransferApproval.DECISIONS) {
        zeroDBModelMock.__resetMockData();
        const result = await TransferApproval.create({
          ...validData,
          decision
        });
        expect(result.decision).toBe(decision);
      }
    });
  });

  describe('findByApprovalId()', () => {
    it('should find an approval by approvalId', async () => {
      await TransferApproval.create({
        ...validData,
        approvalId: 'appr_find_me'
      });
      const found = await TransferApproval.findByApprovalId('appr_find_me');
      expect(found).toBeDefined();
      expect(found.approvalId).toBe('appr_find_me');
    });

    it('should return null for non-existent approvalId', async () => {
      const found = await TransferApproval.findByApprovalId('appr_nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByRequest()', () => {
    it('should find approvals by requestId', async () => {
      await TransferApproval.create({ ...validData, requestId: 'req_A' });
      await TransferApproval.create({ ...validData, requestId: 'req_A' });
      await TransferApproval.create({ ...validData, requestId: 'req_B' });

      const results = await TransferApproval.findByRequest('req_A');
      expect(results).toHaveLength(2);
    });
  });

  describe('findByApprover()', () => {
    it('should find approvals by approverId', async () => {
      await TransferApproval.create({ ...validData, approverId: 'apr_A' });
      await TransferApproval.create({ ...validData, approverId: 'apr_A' });
      await TransferApproval.create({ ...validData, approverId: 'apr_B' });

      const results = await TransferApproval.findByApprover('apr_A');
      expect(results).toHaveLength(2);
    });
  });

  describe('isApproval()', () => {
    it('should return true when decision is approved', () => {
      expect(TransferApproval.isApproval({ decision: 'approved' })).toBe(true);
    });

    it('should return false when decision is not approved', () => {
      expect(TransferApproval.isApproval({ decision: 'rejected' })).toBe(false);
      expect(TransferApproval.isApproval({ decision: 'requested_changes' })).toBe(false);
    });
  });

  describe('isRejection()', () => {
    it('should return true when decision is rejected', () => {
      expect(TransferApproval.isRejection({ decision: 'rejected' })).toBe(true);
    });

    it('should return false when decision is not rejected', () => {
      expect(TransferApproval.isRejection({ decision: 'approved' })).toBe(false);
      expect(TransferApproval.isRejection({ decision: 'requested_changes' })).toBe(false);
    });
  });

  describe('requiresChanges()', () => {
    it('should return true when decision is requested_changes', () => {
      expect(TransferApproval.requiresChanges({ decision: 'requested_changes' })).toBe(true);
    });

    it('should return false when decision is not requested_changes', () => {
      expect(TransferApproval.requiresChanges({ decision: 'approved' })).toBe(false);
      expect(TransferApproval.requiresChanges({ decision: 'rejected' })).toBe(false);
    });
  });

  describe('getLatestForRequest()', () => {
    it('should return the latest approval for a request', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_latest',
        approvalId: 'appr_old',
        decidedAt: '2026-01-01T00:00:00Z'
      });
      await TransferApproval.create({
        ...validData,
        requestId: 'req_latest',
        approvalId: 'appr_new',
        decidedAt: '2026-06-01T00:00:00Z'
      });

      const latest = await TransferApproval.getLatestForRequest('req_latest');
      expect(latest).toBeDefined();
      expect(latest.approvalId).toBe('appr_new');
    });

    it('should return null when no approvals exist', async () => {
      const latest = await TransferApproval.getLatestForRequest('req_nonexistent');
      expect(latest).toBeNull();
    });

    it('should return the single approval when only one exists', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_single',
        approvalId: 'appr_only',
        decidedAt: '2026-03-15T00:00:00Z'
      });

      const latest = await TransferApproval.getLatestForRequest('req_single');
      expect(latest).toBeDefined();
      expect(latest.approvalId).toBe('appr_only');
    });
  });

  describe('hasAllApprovals()', () => {
    it('should return true when all required roles have approved', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_all_approved',
        approverRole: 'board_member',
        decision: 'approved'
      });

      const result = await TransferApproval.hasAllApprovals('req_all_approved', ['board_member']);
      expect(result).toBe(true);
    });

    it('should return false when required role has not approved', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_missing_role',
        approverRole: 'board_member',
        decision: 'approved'
      });

      const result = await TransferApproval.hasAllApprovals('req_missing_role', ['board_member', 'cfo']);
      expect(result).toBe(false);
    });

    it('should return false when approval is rejected', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_rejected',
        approverRole: 'board_member',
        decision: 'rejected'
      });

      const result = await TransferApproval.hasAllApprovals('req_rejected', ['board_member']);
      expect(result).toBe(false);
    });

    it('should default required roles to board_member', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_default_role',
        approverRole: 'board_member',
        decision: 'approved'
      });

      const result = await TransferApproval.hasAllApprovals('req_default_role');
      expect(result).toBe(true);
    });

    it('should handle multiple required roles', async () => {
      await TransferApproval.create({
        ...validData,
        requestId: 'req_multi_role',
        approverRole: 'board_member',
        decision: 'approved'
      });
      await TransferApproval.create({
        ...validData,
        requestId: 'req_multi_role',
        approverRole: 'cfo',
        decision: 'approved'
      });
      await TransferApproval.create({
        ...validData,
        requestId: 'req_multi_role',
        approverRole: 'legal_counsel',
        decision: 'approved'
      });

      const result = await TransferApproval.hasAllApprovals(
        'req_multi_role',
        ['board_member', 'cfo', 'legal_counsel']
      );
      expect(result).toBe(true);
    });
  });

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof TransferApproval.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof TransferApproval.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof TransferApproval.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof TransferApproval.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof TransferApproval.deleteOne).toBe('function');
    });

    it('should expose deleteMany method', () => {
      expect(typeof TransferApproval.deleteMany).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof TransferApproval.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof TransferApproval.exists).toBe('function');
    });

    it('should expose distinct method', () => {
      expect(typeof TransferApproval.distinct).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof TransferApproval.aggregate).toBe('function');
    });
  });
});
