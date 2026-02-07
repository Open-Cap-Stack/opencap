/**
 * TenderOffer Model Unit Tests
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * Rewritten for ZeroDB compatibility
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService before importing model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  client: { put: jest.fn() }
}));

describe('TenderOffer Model', () => {
  let TenderOffer;
  let schema;

  beforeAll(() => {
    TenderOffer = require('../../../models/TenderOffer');
    schema = TenderOffer.schema;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have required identifier fields', () => {
      expect(schema).toBeDefined();
      expect(schema.offerId).toBeDefined();
      expect(schema.companyId).toBeDefined();
    });

    it('should have offer details fields', () => {
      expect(schema.name).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.pricePerShare).toBeDefined();
      expect(schema.totalBudget).toBeDefined();
    });

    it('should have share class eligibility', () => {
      expect(schema.shareClasses).toBeDefined();
    });

    it('should have date range fields', () => {
      expect(schema.startDate).toBeDefined();
      expect(schema.endDate).toBeDefined();
    });

    it('should have status field with proper enum', () => {
      expect(schema.status).toBeDefined();
      expect(schema.status.enum).toContain('draft');
      expect(schema.status.enum).toContain('open');
      expect(schema.status.enum).toContain('closed');
      expect(schema.status.enum).toContain('canceled');
      expect(schema.status.enum).toContain('settled');
    });

    it('should have participation limits', () => {
      expect(schema.minShares).toBeDefined();
      expect(schema.maxShares).toBeDefined();
    });

    it('should have eligibility criteria', () => {
      expect(schema.eligibilityCriteria).toBeDefined();
    });

    it('should have submission tracking fields', () => {
      expect(schema.totalSharesTendered).toBeDefined();
      expect(schema.totalSharesAccepted).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should require offerId to be unique', () => {
      expect(schema.offerId.unique).toBe(true);
      expect(schema.offerId.required).toBe(true);
    });

    it('should require companyId', () => {
      expect(schema.companyId.required).toBe(true);
    });

    it('should require name', () => {
      expect(schema.name.required).toBe(true);
    });

    it('should require pricePerShare', () => {
      expect(schema.pricePerShare.required).toBe(true);
    });

    it('should require totalBudget', () => {
      expect(schema.totalBudget.required).toBe(true);
    });

    it('should default status to draft', () => {
      expect(schema.status.default).toBe('draft');
    });

    it('should default totalSharesTendered to 0', () => {
      expect(schema.totalSharesTendered.default).toBe(0);
    });

    it('should default totalSharesAccepted to 0', () => {
      expect(schema.totalSharesAccepted.default).toBe(0);
    });
  });

  describe('Timestamps', () => {
    it('should have timestamp fields in schema', () => {
      expect(schema.createdAt).toBeDefined();
      expect(schema.updatedAt).toBeDefined();
    });
  });

  describe('Schema Field Types', () => {
    it('should have companyId as string type', () => {
      expect(schema.companyId.type).toBe('string');
    });

    it('should have status as string type', () => {
      expect(schema.status.type).toBe('string');
    });

    it('should have offerId as string type', () => {
      expect(schema.offerId.type).toBe('string');
    });
  });

  describe('Business Logic Methods', () => {
    it('should have getMaxPurchasableShares method', () => {
      expect(typeof TenderOffer.getMaxPurchasableShares).toBe('function');
    });

    it('should calculate maxPurchasableShares correctly', () => {
      const offer = { totalBudget: 10000, pricePerShare: 10 };
      expect(TenderOffer.getMaxPurchasableShares(offer)).toBe(1000);
    });

    it('should have getRemainingBudget method', () => {
      expect(typeof TenderOffer.getRemainingBudget).toBe('function');
    });

    it('should calculate remainingBudget correctly', () => {
      const offer = { totalBudget: 10000, totalPayoutAmount: 3000 };
      expect(TenderOffer.getRemainingBudget(offer)).toBe(7000);
    });

    it('should have getSubscriptionRatio method', () => {
      expect(typeof TenderOffer.getSubscriptionRatio).toBe('function');
    });

    it('should have isActive method', () => {
      expect(typeof TenderOffer.isActive).toBe('function');
    });

    it('should return false for non-open offers', () => {
      expect(TenderOffer.isActive({ status: 'draft' })).toBe(false);
    });
  });

  describe('Audit Fields', () => {
    it('should have createdBy field', () => {
      expect(schema.createdBy).toBeDefined();
    });

    it('should have updatedBy field', () => {
      expect(schema.updatedBy).toBeDefined();
    });
  });

  describe('Additional Fields', () => {
    it('should have publishedAt field', () => {
      expect(schema.publishedAt).toBeDefined();
    });

    it('should have closedAt field', () => {
      expect(schema.closedAt).toBeDefined();
    });

    it('should have settledAt field', () => {
      expect(schema.settledAt).toBeDefined();
    });

    it('should have canceledAt field', () => {
      expect(schema.canceledAt).toBeDefined();
    });

    it('should have notes field', () => {
      expect(schema.notes).toBeDefined();
    });

    it('should have metadata field', () => {
      expect(schema.metadata).toBeDefined();
    });

    it('should have prorataPercentage field', () => {
      expect(schema.prorataPercentage).toBeDefined();
    });

    it('should have isOversubscribed field', () => {
      expect(schema.isOversubscribed).toBeDefined();
    });

    it('should have totalPayoutAmount field', () => {
      expect(schema.totalPayoutAmount).toBeDefined();
    });
  });

  describe('Exported Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(TenderOffer.VALID_STATUSES).toBeDefined();
      expect(TenderOffer.VALID_STATUSES).toContain('draft');
      expect(TenderOffer.VALID_STATUSES).toContain('open');
      expect(TenderOffer.VALID_STATUSES).toContain('closed');
      expect(TenderOffer.VALID_STATUSES).toContain('canceled');
      expect(TenderOffer.VALID_STATUSES).toContain('settled');
    });

    it('should export EMPLOYEE_STATUSES', () => {
      expect(TenderOffer.EMPLOYEE_STATUSES).toBeDefined();
      expect(TenderOffer.EMPLOYEE_STATUSES).toContain('active');
      expect(TenderOffer.EMPLOYEE_STATUSES).toContain('former');
    });
  });
});
