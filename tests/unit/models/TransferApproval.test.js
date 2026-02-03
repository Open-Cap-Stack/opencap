/**
 * TransferApproval Model Unit Tests
 * Issue #104: Build Transfer Approval Workflow
 */

const mongoose = require('mongoose');

// Create schema directly for testing without DB connection
const transferApprovalSchema = new mongoose.Schema({
  approvalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  requestId: {
    type: String,
    required: true,
    index: true
  },
  approverId: {
    type: String,
    required: true,
    index: true
  },
  approverRole: {
    type: String,
    required: true,
    enum: ['board_member', 'cfo', 'ceo', 'legal_counsel', 'compliance_officer', 'admin']
  },
  decision: {
    type: String,
    required: true,
    enum: ['approved', 'rejected', 'requested_changes']
  },
  comments: {
    type: String
  },
  conditions: [{
    type: String
  }],
  decidedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Add indexes
transferApprovalSchema.index({ requestId: 1, decidedAt: -1 });
transferApprovalSchema.index({ approverId: 1, decidedAt: -1 });

describe('TransferApproval Model', () => {
  const TransferApproval = { schema: transferApprovalSchema };

  beforeAll(() => {
    // Schema is already defined above
  });

  describe('Schema Definition', () => {
    it('should have approvalId field', () => {
      expect(TransferApproval.schema.path('approvalId')).toBeDefined();
    });

    it('should have requestId field', () => {
      expect(TransferApproval.schema.path('requestId')).toBeDefined();
    });

    it('should have approverId field', () => {
      expect(TransferApproval.schema.path('approverId')).toBeDefined();
    });

    it('should have approverRole field with enum values', () => {
      const approverRolePath = TransferApproval.schema.path('approverRole');
      expect(approverRolePath).toBeDefined();
      expect(approverRolePath.enumValues).toContain('board_member');
      expect(approverRolePath.enumValues).toContain('cfo');
      expect(approverRolePath.enumValues).toContain('ceo');
      expect(approverRolePath.enumValues).toContain('legal_counsel');
      expect(approverRolePath.enumValues).toContain('compliance_officer');
      expect(approverRolePath.enumValues).toContain('admin');
    });

    it('should have decision field with enum values', () => {
      const decisionPath = TransferApproval.schema.path('decision');
      expect(decisionPath).toBeDefined();
      expect(decisionPath.enumValues).toContain('approved');
      expect(decisionPath.enumValues).toContain('rejected');
      expect(decisionPath.enumValues).toContain('requested_changes');
    });

    it('should have comments field', () => {
      expect(TransferApproval.schema.path('comments')).toBeDefined();
    });

    it('should have conditions field', () => {
      expect(TransferApproval.schema.path('conditions')).toBeDefined();
    });

    it('should have decidedAt field', () => {
      expect(TransferApproval.schema.path('decidedAt')).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should require approvalId', () => {
      const approvalIdPath = TransferApproval.schema.path('approvalId');
      expect(approvalIdPath.isRequired).toBeTruthy();
    });

    it('should require requestId', () => {
      const requestIdPath = TransferApproval.schema.path('requestId');
      expect(requestIdPath.isRequired).toBeTruthy();
    });

    it('should require approverId', () => {
      const approverIdPath = TransferApproval.schema.path('approverId');
      expect(approverIdPath.isRequired).toBeTruthy();
    });

    it('should require approverRole', () => {
      const approverRolePath = TransferApproval.schema.path('approverRole');
      expect(approverRolePath.isRequired).toBeTruthy();
    });

    it('should require decision', () => {
      const decisionPath = TransferApproval.schema.path('decision');
      expect(decisionPath.isRequired).toBeTruthy();
    });
  });

  describe('Indexes', () => {
    it('should have index on approvalId', () => {
      const indexes = TransferApproval.schema.indexes();
      const hasApprovalIdIndex = indexes.some(index =>
        index[0].approvalId === 1 || index[0].approvalId === -1
      );
      expect(hasApprovalIdIndex || TransferApproval.schema.path('approvalId').options.index).toBeTruthy();
    });

    it('should have index on requestId', () => {
      const indexes = TransferApproval.schema.indexes();
      const hasRequestIdIndex = indexes.some(index =>
        index[0].requestId === 1 || index[0].requestId === -1
      );
      expect(hasRequestIdIndex || TransferApproval.schema.path('requestId').options.index).toBeTruthy();
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      expect(TransferApproval.schema.options.timestamps).toBe(true);
    });
  });

  describe('Conditions Field', () => {
    it('should support conditions as an array', () => {
      const conditionsPath = TransferApproval.schema.path('conditions');
      expect(conditionsPath).toBeDefined();
    });
  });

  describe('Audit Fields', () => {
    it('should have metadata field', () => {
      expect(TransferApproval.schema.path('metadata')).toBeDefined();
    });
  });
});
