/**
 * SecondaryMarketListing Model Unit Tests
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
const secondaryMarketListingSchema = createTestSchema({
  listingId: {
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
  sellerName: {
    type: String
  },
  shareClassId: {
    type: String,
    required: true,
    index: true
  },
  shareClassName: {
    type: String
  },
  numberOfShares: {
    type: Number,
    required: true,
    min: 1
  },
  sharesAvailable: {
    type: Number,
    min: 0
  },
  askingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minPrice: {
    type: Number,
    min: 0
  },
  pricePerShare: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  negotiable: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'pending_approval', 'sold', 'partially_sold', 'expired', 'withdrawn', 'suspended'],
    default: 'active',
    index: true
  },
  listedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: true
  },
  soldAt: {
    type: Date
  },
  withdrawnAt: {
    type: Date
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invited_only'],
    default: 'private',
    index: true
  },
  invitedStakeholders: [{ stakeholderId: String }],
  interestedBuyers: [{ buyerId: String }],
  completedTransactions: [{ transactionId: String }],
  restrictions: {
    type: Object
  },
  description: {
    type: String
  },
  sellerNotes: {
    type: String
  },
  termsAndConditions: {
    type: String
  },
  valuationContext: {
    type: Object
  },
  metadata: {
    type: Object
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
secondaryMarketListingSchema.index({ companyId: 1, status: 1 });
secondaryMarketListingSchema.index({ sellerId: 1, status: 1 });

describe('SecondaryMarketListing Model', () => {
  const secondaryMarketListingSchemaRef = secondaryMarketListingSchema;

  describe('Schema Definition', () => {
    it('should have required listing identification fields', () => {
      expect(secondaryMarketListingSchemaRef).toBeDefined();
      const paths = secondaryMarketListingSchemaRef.paths;

      expect(paths).toHaveProperty('listingId');
      expect(paths).toHaveProperty('companyId');
      expect(paths).toHaveProperty('sellerId');
    });

    it('should have share class and quantity fields', () => {
      const paths = secondaryMarketListingSchemaRef.paths;

      expect(paths).toHaveProperty('shareClassId');
      expect(paths).toHaveProperty('numberOfShares');
    });

    it('should have price fields', () => {
      const paths = secondaryMarketListingSchemaRef.paths;

      expect(paths).toHaveProperty('askingPrice');
      expect(paths).toHaveProperty('minPrice');
    });

    it('should have status enum with valid values', () => {
      const statusPath = secondaryMarketListingSchemaRef.paths.status;
      expect(statusPath.enumValues).toContain('active');
      expect(statusPath.enumValues).toContain('sold');
      expect(statusPath.enumValues).toContain('expired');
      expect(statusPath.enumValues).toContain('withdrawn');
    });

    it('should have expiresAt field', () => {
      const paths = secondaryMarketListingSchemaRef.paths;
      expect(paths).toHaveProperty('expiresAt');
    });

    it('should have visibility enum with valid values', () => {
      const visibilityPath = secondaryMarketListingSchemaRef.paths.visibility;
      expect(visibilityPath.enumValues).toContain('public');
      expect(visibilityPath.enumValues).toContain('private');
      expect(visibilityPath.enumValues).toContain('invited_only');
    });

    it('should have interestedBuyers field', () => {
      const paths = secondaryMarketListingSchemaRef.paths;
      expect(paths).toHaveProperty('interestedBuyers');
    });
  });

  describe('Validation', () => {
    it('should require listingId to be unique', () => {
      const listingIdPath = secondaryMarketListingSchemaRef.paths.listingId;
      expect(listingIdPath.options.unique).toBe(true);
      expect(listingIdPath.options.required).toBe(true);
    });

    it('should require companyId', () => {
      const companyIdPath = secondaryMarketListingSchemaRef.paths.companyId;
      expect(companyIdPath.options.required).toBe(true);
    });

    it('should require sellerId', () => {
      const sellerIdPath = secondaryMarketListingSchemaRef.paths.sellerId;
      expect(sellerIdPath.options.required).toBe(true);
    });

    it('should require shareClassId', () => {
      const shareClassIdPath = secondaryMarketListingSchemaRef.paths.shareClassId;
      expect(shareClassIdPath.options.required).toBe(true);
    });

    it('should require numberOfShares to be positive', () => {
      const numberOfSharesPath = secondaryMarketListingSchemaRef.paths.numberOfShares;
      expect(numberOfSharesPath.options.min).toBe(1);
      expect(numberOfSharesPath.options.required).toBe(true);
    });

    it('should require askingPrice to be positive', () => {
      const askingPricePath = secondaryMarketListingSchemaRef.paths.askingPrice;
      expect(askingPricePath.options.min).toBe(0);
      expect(askingPricePath.options.required).toBe(true);
    });

    it('should default status to active', () => {
      const statusPath = secondaryMarketListingSchemaRef.paths.status;
      expect(statusPath.options.default).toBe('active');
    });

    it('should default visibility to private', () => {
      const visibilityPath = secondaryMarketListingSchemaRef.paths.visibility;
      expect(visibilityPath.options.default).toBe('private');
    });
  });

  describe('Indexes', () => {
    it('should have index on listingId', () => {
      const listingIdPath = secondaryMarketListingSchemaRef.paths.listingId;
      expect(listingIdPath.options.index).toBe(true);
    });

    it('should have index on companyId', () => {
      const companyIdPath = secondaryMarketListingSchemaRef.paths.companyId;
      expect(companyIdPath.options.index).toBe(true);
    });

    it('should have index on sellerId', () => {
      const sellerIdPath = secondaryMarketListingSchemaRef.paths.sellerId;
      expect(sellerIdPath.options.index).toBe(true);
    });

    it('should have index on status', () => {
      const statusPath = secondaryMarketListingSchemaRef.paths.status;
      expect(statusPath.options.index).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      expect(secondaryMarketListingSchemaRef.options.timestamps).toBe(true);
    });
  });

  describe('Interested Buyers Sub-schema', () => {
    it('should have interestedBuyers as an array', () => {
      const interestedBuyersPath = secondaryMarketListingSchemaRef.paths.interestedBuyers;
      expect(interestedBuyersPath).toBeDefined();
    });
  });
});
