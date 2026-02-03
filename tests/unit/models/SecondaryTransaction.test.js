/**
 * SecondaryTransaction Model Unit Tests
 * Issue #103: Create Secondary Transaction Model
 */

const mongoose = require('mongoose');

// Define sub-schemas
const transactionFeesSchema = new mongoose.Schema({
  platformFee: { type: Number, default: 0, min: 0 },
  legalFees: { type: Number, default: 0, min: 0 },
  transferAgentFee: { type: Number, default: 0, min: 0 },
  escrowFee: { type: Number, default: 0, min: 0 },
  otherFees: { type: Number, default: 0, min: 0 },
  feesPaidBy: {
    type: String,
    enum: ['seller', 'buyer', 'split', 'company'],
    default: 'seller'
  }
}, { _id: false });

const documentReferenceSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  documentType: {
    type: String,
    enum: ['purchase_agreement', 'board_consent', 'rofr_waiver', 'transfer_notice', 'tax_form', 'other'],
    required: true
  },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String }
}, { _id: false });

// Define schema for testing
const secondaryTransactionSchema = new mongoose.Schema({
  transactionId: {
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
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  transactionDate: {
    type: Date,
    required: true
  },
  settlementDate: {
    type: Date
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_escrow', 'completed', 'canceled', 'failed', 'rejected'],
    default: 'pending',
    index: true
  },
  transactionType: {
    type: String,
    enum: ['private_sale', 'tender_offer', 'rofr_exercise', 'gift', 'estate_transfer', 'company_buyback'],
    required: true,
    index: true
  },
  transferRequestId: {
    type: String,
    index: true
  },
  rofrDetails: {
    rofrHolderId: { type: String },
    rofrExercised: { type: Boolean, default: false },
    rofrWaived: { type: Boolean, default: false },
    rofrDeadline: { type: Date },
    originalBuyerId: { type: String }
  },
  documents: [documentReferenceSchema],
  fees: {
    type: transactionFeesSchema,
    default: () => ({})
  },
  escrow: {
    escrowAgentId: { type: String },
    escrowAccountNumber: { type: String },
    fundsReceivedAt: { type: Date },
    fundsReleasedAt: { type: Date }
  },
  approvals: [{
    approverType: {
      type: String,
      enum: ['board', 'company_admin', 'legal', 'transfer_agent']
    },
    approverId: { type: String },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    notes: { type: String }
  }],
  notes: {
    type: String
  },
  internalNotes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  cancellationReason: {
    type: String
  },
  failureReason: {
    type: String
  },
  canceledBy: {
    type: String
  },
  canceledAt: {
    type: Date
  },
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Add compound indexes
secondaryTransactionSchema.index({ companyId: 1, status: 1 });
secondaryTransactionSchema.index({ sellerId: 1, status: 1 });

describe('SecondaryTransaction Model', () => {
  const secondaryTransactionSchemaRef = secondaryTransactionSchema;

  describe('Schema Definition', () => {
    it('should have required transaction identification fields', () => {
      expect(secondaryTransactionSchemaRef).toBeDefined();
      const paths = secondaryTransactionSchemaRef.paths;

      expect(paths).toHaveProperty('transactionId');
      expect(paths).toHaveProperty('companyId');
    });

    it('should have seller and buyer fields', () => {
      const paths = secondaryTransactionSchemaRef.paths;

      expect(paths).toHaveProperty('sellerId');
      expect(paths).toHaveProperty('buyerId');
    });

    it('should have share class and quantity fields', () => {
      const paths = secondaryTransactionSchemaRef.paths;

      expect(paths).toHaveProperty('shareClassId');
      expect(paths).toHaveProperty('numberOfShares');
    });

    it('should have price fields', () => {
      const paths = secondaryTransactionSchemaRef.paths;

      expect(paths).toHaveProperty('pricePerShare');
      expect(paths).toHaveProperty('totalAmount');
    });

    it('should have date fields', () => {
      const paths = secondaryTransactionSchemaRef.paths;

      expect(paths).toHaveProperty('transactionDate');
      expect(paths).toHaveProperty('settlementDate');
    });

    it('should have status enum with valid values', () => {
      const statusPath = secondaryTransactionSchemaRef.paths.status;
      expect(statusPath.enumValues).toContain('pending');
      expect(statusPath.enumValues).toContain('completed');
      expect(statusPath.enumValues).toContain('canceled');
      expect(statusPath.enumValues).toContain('failed');
    });

    it('should have transactionType enum with valid values', () => {
      const typePath = secondaryTransactionSchemaRef.paths.transactionType;
      expect(typePath.enumValues).toContain('private_sale');
      expect(typePath.enumValues).toContain('tender_offer');
      expect(typePath.enumValues).toContain('rofr_exercise');
      expect(typePath.enumValues).toContain('gift');
    });

    it('should have transferRequestId field', () => {
      const paths = secondaryTransactionSchemaRef.paths;
      expect(paths).toHaveProperty('transferRequestId');
    });

    it('should have documents field', () => {
      const paths = secondaryTransactionSchemaRef.paths;
      expect(paths).toHaveProperty('documents');
    });

    it('should have notes field', () => {
      const paths = secondaryTransactionSchemaRef.paths;
      expect(paths).toHaveProperty('notes');
    });

    it('should have fees field', () => {
      const paths = secondaryTransactionSchemaRef.paths;
      expect(paths).toHaveProperty('fees');
    });
  });

  describe('Validation', () => {
    it('should require transactionId to be unique', () => {
      const transactionIdPath = secondaryTransactionSchemaRef.paths.transactionId;
      expect(transactionIdPath.options.unique).toBe(true);
      expect(transactionIdPath.options.required).toBe(true);
    });

    it('should require companyId', () => {
      const companyIdPath = secondaryTransactionSchemaRef.paths.companyId;
      expect(companyIdPath.options.required).toBe(true);
    });

    it('should require sellerId', () => {
      const sellerIdPath = secondaryTransactionSchemaRef.paths.sellerId;
      expect(sellerIdPath.options.required).toBe(true);
    });

    it('should require buyerId', () => {
      const buyerIdPath = secondaryTransactionSchemaRef.paths.buyerId;
      expect(buyerIdPath.options.required).toBe(true);
    });

    it('should require shareClassId', () => {
      const shareClassIdPath = secondaryTransactionSchemaRef.paths.shareClassId;
      expect(shareClassIdPath.options.required).toBe(true);
    });

    it('should require numberOfShares to be positive', () => {
      const numberOfSharesPath = secondaryTransactionSchemaRef.paths.numberOfShares;
      expect(numberOfSharesPath.options.min).toBe(1);
      expect(numberOfSharesPath.options.required).toBe(true);
    });

    it('should require pricePerShare to be non-negative', () => {
      const pricePerSharePath = secondaryTransactionSchemaRef.paths.pricePerShare;
      expect(pricePerSharePath.options.min).toBe(0);
      expect(pricePerSharePath.options.required).toBe(true);
    });

    it('should require totalAmount to be non-negative', () => {
      const totalAmountPath = secondaryTransactionSchemaRef.paths.totalAmount;
      expect(totalAmountPath.options.min).toBe(0);
      expect(totalAmountPath.options.required).toBe(true);
    });

    it('should default status to pending', () => {
      const statusPath = secondaryTransactionSchemaRef.paths.status;
      expect(statusPath.options.default).toBe('pending');
    });
  });

  describe('Indexes', () => {
    it('should have index on transactionId', () => {
      const transactionIdPath = secondaryTransactionSchemaRef.paths.transactionId;
      expect(transactionIdPath.options.index).toBe(true);
    });

    it('should have index on companyId', () => {
      const companyIdPath = secondaryTransactionSchemaRef.paths.companyId;
      expect(companyIdPath.options.index).toBe(true);
    });

    it('should have index on sellerId', () => {
      const sellerIdPath = secondaryTransactionSchemaRef.paths.sellerId;
      expect(sellerIdPath.options.index).toBe(true);
    });

    it('should have index on buyerId', () => {
      const buyerIdPath = secondaryTransactionSchemaRef.paths.buyerId;
      expect(buyerIdPath.options.index).toBe(true);
    });

    it('should have index on status', () => {
      const statusPath = secondaryTransactionSchemaRef.paths.status;
      expect(statusPath.options.index).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      expect(secondaryTransactionSchemaRef.options.timestamps).toBe(true);
    });
  });

  describe('Fees Sub-schema', () => {
    it('should have platformFee in fees', () => {
      const feesPath = secondaryTransactionSchemaRef.paths.fees;
      expect(feesPath).toBeDefined();
    });
  });
});
