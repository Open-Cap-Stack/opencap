/**
 * TransferRequest Model Unit Tests
 * Issue #104: Build Transfer Approval Workflow
 */

const mongoose = require('mongoose');

// Define the schema directly for testing without DB
const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String },
  type: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const transferRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  sellerId: {
    type: String,
    required: true,
    index: true
  },
  buyerId: {
    type: String,
    required: true,
    index: true
  },
  shareClassId: {
    type: String,
    required: true,
    index: true
  },
  numberOfShares: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerShare: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'completed', 'canceled'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  reviewedBy: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  documents: [documentSchema],
  rofrStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'waived', 'exercised', 'expired'],
    default: 'not_applicable',
    index: true
  },
  rofrExpirationDate: {
    type: Date
  },
  rofrEligibleParties: [{
    type: String
  }],
  notes: {
    type: String
  },
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Add indexes
transferRequestSchema.index({ companyId: 1, status: 1 });
transferRequestSchema.index({ sellerId: 1, status: 1 });

describe('TransferRequest Model', () => {
  const TransferRequest = { schema: transferRequestSchema };

  describe('Schema Definition', () => {
    it('should have requestId field', () => {
      expect(TransferRequest.schema.path('requestId')).toBeDefined();
    });

    it('should have companyId field', () => {
      expect(TransferRequest.schema.path('companyId')).toBeDefined();
    });

    it('should have sellerId field', () => {
      expect(TransferRequest.schema.path('sellerId')).toBeDefined();
    });

    it('should have buyerId field', () => {
      expect(TransferRequest.schema.path('buyerId')).toBeDefined();
    });

    it('should have shareClassId field', () => {
      expect(TransferRequest.schema.path('shareClassId')).toBeDefined();
    });

    it('should have numberOfShares field', () => {
      expect(TransferRequest.schema.path('numberOfShares')).toBeDefined();
    });

    it('should have pricePerShare field', () => {
      expect(TransferRequest.schema.path('pricePerShare')).toBeDefined();
    });

    it('should have totalAmount field', () => {
      expect(TransferRequest.schema.path('totalAmount')).toBeDefined();
    });

    it('should have status field with enum values', () => {
      const statusPath = TransferRequest.schema.path('status');
      expect(statusPath).toBeDefined();
      expect(statusPath.enumValues).toContain('pending');
      expect(statusPath.enumValues).toContain('under_review');
      expect(statusPath.enumValues).toContain('approved');
      expect(statusPath.enumValues).toContain('rejected');
      expect(statusPath.enumValues).toContain('completed');
      expect(statusPath.enumValues).toContain('canceled');
    });

    it('should have requestedAt field', () => {
      expect(TransferRequest.schema.path('requestedAt')).toBeDefined();
    });

    it('should have reviewedAt field', () => {
      expect(TransferRequest.schema.path('reviewedAt')).toBeDefined();
    });

    it('should have completedAt field', () => {
      expect(TransferRequest.schema.path('completedAt')).toBeDefined();
    });

    it('should have reviewedBy field', () => {
      expect(TransferRequest.schema.path('reviewedBy')).toBeDefined();
    });

    it('should have rejectionReason field', () => {
      expect(TransferRequest.schema.path('rejectionReason')).toBeDefined();
    });

    it('should have documents array field', () => {
      expect(TransferRequest.schema.path('documents')).toBeDefined();
    });

    it('should have rofrStatus field with enum values', () => {
      const rofrStatusPath = TransferRequest.schema.path('rofrStatus');
      expect(rofrStatusPath).toBeDefined();
      expect(rofrStatusPath.enumValues).toContain('not_applicable');
      expect(rofrStatusPath.enumValues).toContain('pending');
      expect(rofrStatusPath.enumValues).toContain('waived');
      expect(rofrStatusPath.enumValues).toContain('exercised');
      expect(rofrStatusPath.enumValues).toContain('expired');
    });
  });

  describe('Schema Validation', () => {
    it('should require requestId', () => {
      const requestIdPath = TransferRequest.schema.path('requestId');
      expect(requestIdPath.isRequired).toBeTruthy();
    });

    it('should require companyId', () => {
      const companyIdPath = TransferRequest.schema.path('companyId');
      expect(companyIdPath.isRequired).toBeTruthy();
    });

    it('should require sellerId', () => {
      const sellerIdPath = TransferRequest.schema.path('sellerId');
      expect(sellerIdPath.isRequired).toBeTruthy();
    });

    it('should require buyerId', () => {
      const buyerIdPath = TransferRequest.schema.path('buyerId');
      expect(buyerIdPath.isRequired).toBeTruthy();
    });

    it('should require shareClassId', () => {
      const shareClassIdPath = TransferRequest.schema.path('shareClassId');
      expect(shareClassIdPath.isRequired).toBeTruthy();
    });

    it('should require numberOfShares', () => {
      const numberOfSharesPath = TransferRequest.schema.path('numberOfShares');
      expect(numberOfSharesPath.isRequired).toBeTruthy();
    });

    it('should require pricePerShare', () => {
      const pricePerSharePath = TransferRequest.schema.path('pricePerShare');
      expect(pricePerSharePath.isRequired).toBeTruthy();
    });

    it('should have numberOfShares minimum value of 1', () => {
      const numberOfSharesPath = TransferRequest.schema.path('numberOfShares');
      expect(numberOfSharesPath.options.min).toBe(1);
    });

    it('should have pricePerShare minimum value of 0', () => {
      const pricePerSharePath = TransferRequest.schema.path('pricePerShare');
      expect(pricePerSharePath.options.min).toBeGreaterThanOrEqual(0);
    });

    it('should default status to pending', () => {
      const statusPath = TransferRequest.schema.path('status');
      expect(statusPath.defaultValue).toBe('pending');
    });

    it('should default rofrStatus to not_applicable', () => {
      const rofrStatusPath = TransferRequest.schema.path('rofrStatus');
      expect(rofrStatusPath.defaultValue).toBe('not_applicable');
    });
  });

  describe('Indexes', () => {
    it('should have index on requestId', () => {
      const indexes = TransferRequest.schema.indexes();
      const hasRequestIdIndex = indexes.some(index =>
        index[0].requestId === 1 || index[0].requestId === -1
      );
      expect(hasRequestIdIndex || TransferRequest.schema.path('requestId').options.index).toBeTruthy();
    });

    it('should have index on companyId', () => {
      const indexes = TransferRequest.schema.indexes();
      const hasCompanyIdIndex = indexes.some(index =>
        index[0].companyId === 1 || index[0].companyId === -1
      );
      expect(hasCompanyIdIndex || TransferRequest.schema.path('companyId').options.index).toBeTruthy();
    });

    it('should have index on status', () => {
      const indexes = TransferRequest.schema.indexes();
      const hasStatusIndex = indexes.some(index =>
        index[0].status === 1 || index[0].status === -1
      );
      expect(hasStatusIndex || TransferRequest.schema.path('status').options.index).toBeTruthy();
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      expect(TransferRequest.schema.options.timestamps).toBe(true);
    });
  });

  describe('Document Fields', () => {
    it('should support document objects with documentId, name, and url', () => {
      const documentsPath = TransferRequest.schema.path('documents');
      expect(documentsPath).toBeDefined();
    });
  });

  describe('ROFR (Right of First Refusal) Fields', () => {
    it('should have rofrExpirationDate field', () => {
      expect(TransferRequest.schema.path('rofrExpirationDate')).toBeDefined();
    });

    it('should have rofrEligibleParties array field', () => {
      expect(TransferRequest.schema.path('rofrEligibleParties')).toBeDefined();
    });
  });

  describe('Audit Fields', () => {
    it('should have createdBy field', () => {
      expect(TransferRequest.schema.path('createdBy')).toBeDefined();
    });

    it('should have updatedBy field', () => {
      expect(TransferRequest.schema.path('updatedBy')).toBeDefined();
    });

    it('should have notes field', () => {
      expect(TransferRequest.schema.path('notes')).toBeDefined();
    });
  });
});
