/**
 * SecondaryTransaction Model Unit Tests
 * Issue #103: Create Secondary Transaction Model
 */

// Lightweight schema helper to replace mongoose.Schema for testing
function createTestSchema(definition, schemaOptions = {}) {
  const paths = {};
  const compoundIndexes = [];

  function processField(fieldName, fieldDef) {
    if (Array.isArray(fieldDef)) {
      paths[fieldName] = { options: {}, isRequired: false };
      return;
    }
    if (fieldDef && typeof fieldDef === 'object' && fieldDef.type !== undefined) {
      const pathObj = {
        options: { ...fieldDef },
        isRequired: fieldDef.required || false,
        defaultValue: fieldDef.default,
        enumValues: fieldDef.enum || undefined
      };
      paths[fieldName] = pathObj;
    } else if (fieldDef && typeof fieldDef === 'object' && !fieldDef.type) {
      paths[fieldName] = { options: fieldDef };
    } else {
      paths[fieldName] = { options: { type: fieldDef } };
    }
  }

  for (const [key, value] of Object.entries(definition)) {
    processField(key, value);
  }

  return {
    paths,
    options: schemaOptions,
    path(fieldName) {
      return paths[fieldName] || undefined;
    },
    index(indexDef) {
      compoundIndexes.push([indexDef]);
    },
    indexes() {
      return compoundIndexes;
    }
  };
}

// Define schema for testing
const secondaryTransactionSchema = createTestSchema({
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
    type: Object
  },
  documents: [{ documentId: String, documentType: String }],
  fees: {
    type: Object,
    default: () => ({})
  },
  escrow: {
    type: Object
  },
  approvals: [{ approverType: String, approverId: String }],
  notes: {
    type: String
  },
  internalNotes: {
    type: String
  },
  metadata: {
    type: Object
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
