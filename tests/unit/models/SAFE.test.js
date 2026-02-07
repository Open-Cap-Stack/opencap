/**
 * SAFE Model Tests
 * Feature: Issue #40 - Model Test Coverage
 * Adapted for ZeroDB model interface
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const SAFE = require('../../../models/SAFE');
const zerodbService = require('../../../services/zerodbService');

describe('SAFE Model', () => {
  // In-memory store for mocking ZeroDB
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow to simulate creating a document
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable to simulate querying documents
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];

      // Apply filters
      for (const [key, value] of Object.entries(filter)) {
        if (typeof value === 'object' && value !== null && value.$in) {
          results = results.filter(doc => value.$in.includes(doc[key]));
        } else {
          results = results.filter(doc => doc[key] === value);
        }
      }

      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid SAFE document', async () => {
      const safeData = {
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'John Investor',
        investorEmail: 'john@investor.com',
        investmentAmount: 100000,
        safeType: 'post-money',
        valuationCap: 5000000,
        createdBy: 'user-789'
      };

      const savedSafe = await SAFE.create(safeData);

      expect(savedSafe._id).toBeDefined();
      expect(savedSafe.safeId).toMatch(/^safe_/);
      expect(savedSafe.status).toBe('draft');
      expect(savedSafe.investorName).toBe('John Investor');
    });

    it('should have companyId as required in schema', () => {
      expect(SAFE.schema).toBeDefined();
      expect(SAFE.schema.companyId.required).toBe(true);
    });

    it('should have investorId as required in schema', () => {
      expect(SAFE.schema.investorId.required).toBe(true);
    });

    it('should have investmentAmount as required in schema with min 0', () => {
      expect(SAFE.schema.investmentAmount.required).toBe(true);
      expect(SAFE.schema.investmentAmount.min).toBe(0);
    });

    it('should validate safeType enum', () => {
      const validTypes = SAFE.schema.safeType.enum;
      expect(validTypes).toContain('post-money');
      expect(validTypes).toContain('pre-money');
      expect(validTypes).toContain('mfn');
      expect(validTypes).not.toContain('invalid-type');
    });

    it('should validate discountRate range in schema', () => {
      expect(SAFE.schema.discountRate.min).toBe(0);
      expect(SAFE.schema.discountRate.max).toBe(1);
    });

    it('should default status to draft', async () => {
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: 'user-789'
      });

      expect(safe.status).toBe('draft');
    });

    it('should default currency to USD in schema', () => {
      expect(SAFE.schema.currency.default).toBe('USD');
    });
  });

  describe('Computed Properties', () => {
    it('should check isFullySigned when both signatures present', () => {
      const safeDoc = {
        investorSignature: { signedAt: new Date().toISOString() },
        companySignature: { signedAt: new Date().toISOString() }
      };
      expect(SAFE.isFullySigned(safeDoc)).toBe(true);
    });

    it('should return false for isFullySigned when signature missing', () => {
      const safeDoc = {
        investorSignature: { signedAt: new Date().toISOString() }
      };
      expect(SAFE.isFullySigned(safeDoc)).toBe(false);
    });

    it('should check isExpired correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const safeDoc = {
        expiresAt: pastDate.toISOString(),
        status: 'sent'
      };
      expect(SAFE.isExpired(safeDoc)).toBe(true);
    });

    it('should not consider converted SAFEs as expired', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const safeDoc = {
        expiresAt: pastDate.toISOString(),
        status: 'converted'
      };
      expect(SAFE.isExpired(safeDoc)).toBe(false);
    });
  });

  describe('Status Transitions', () => {
    it('should allow valid transition from draft to sent', () => {
      expect(SAFE.canTransitionTo('draft', 'sent')).toBe(true);
    });

    it('should disallow invalid transition from draft to funded', () => {
      expect(SAFE.canTransitionTo('draft', 'funded')).toBe(false);
    });

    it('should allow transition from draft to cancelled', () => {
      expect(SAFE.canTransitionTo('draft', 'cancelled')).toBe(true);
    });

    it('should allow transition from sent to fully_signed', () => {
      expect(SAFE.canTransitionTo('sent', 'fully_signed')).toBe(true);
    });

    it('should disallow transition from converted to any status', () => {
      expect(SAFE.canTransitionTo('converted', 'draft')).toBe(false);
      expect(SAFE.canTransitionTo('converted', 'funded')).toBe(false);
    });

    it('should transition status via transitionTo', async () => {
      // Create a SAFE in draft status
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: 'user-789'
      });

      const updatedSafe = await SAFE.transitionTo(safe.safeId, 'sent', 'user-789', 'Sending for signature');

      expect(updatedSafe.status).toBe('sent');
      expect(updatedSafe.sentAt).toBeDefined();
    });

    it('should throw error for invalid transition via transitionTo', async () => {
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: 'user-789'
      });

      await expect(
        SAFE.transitionTo(safe.safeId, 'converted', 'user-789')
      ).rejects.toThrow('Cannot transition from draft to converted');
    });
  });

  describe('Signature Methods', () => {
    it('should add investor signature', async () => {
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        status: 'sent',
        createdBy: 'user-789'
      });

      const updatedSafe = await SAFE.addInvestorSignature(safe.safeId, {
        signerName: 'John Investor',
        signerEmail: 'john@test.com',
        signerTitle: 'Individual',
        signatureData: 'base64signature'
      }, 'user-789');

      expect(updatedSafe.investorSignature.signerName).toBe('John Investor');
      expect(updatedSafe.investorSignature.signedAt).toBeDefined();
    });

    it('should transition to fully_signed when both sign', async () => {
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        status: 'sent',
        createdBy: 'user-789',
        investorSignature: {
          signerName: 'Investor',
          signerEmail: 'inv@test.com',
          signedAt: new Date().toISOString()
        }
      });

      const updatedSafe = await SAFE.addCompanySignature(safe.safeId, {
        signerName: 'Company Rep',
        signerEmail: 'rep@test.com',
        signatureData: 'signature'
      }, 'user-789');

      expect(updatedSafe.status).toBe('fully_signed');
      expect(updatedSafe.signedAt).toBeDefined();
    });
  });

  describe('Conversion Methods', () => {
    it('should record conversion details', async () => {
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        valuationCap: 5000000,
        status: 'funded',
        createdBy: 'user-789'
      });

      const updatedSafe = await SAFE.recordConversion(safe.safeId, {
        fundingRoundId: 'round-123',
        shareClassId: 'class-456',
        shares: 50000,
        pricePerShare: 2.00,
        methodUsed: 'cap',
        effectivePrice: 2.00,
        calculationDetails: { valuationCap: 5000000 }
      }, 'user-789');

      expect(updatedSafe.status).toBe('converted');
      expect(updatedSafe.conversionShares).toBe(50000);
      expect(updatedSafe.conversionPrice).toBe(2.00);
      expect(updatedSafe.conversionDetails.methodUsed).toBe('cap');
    });

    it('should reject conversion if not funded', async () => {
      const safe = await SAFE.create({
        companyId: 'company-123',
        investorId: 'investor-456',
        investorName: 'Test',
        investmentAmount: 100000,
        status: 'draft',
        createdBy: 'user-789'
      });

      await expect(
        SAFE.recordConversion(safe.safeId, {
          fundingRoundId: 'round-123',
          shareClassId: 'class-456',
          shares: 50000,
          pricePerShare: 2.00
        }, 'user-789')
      ).rejects.toThrow('SAFE must be funded before conversion');
    });
  });

  describe('Static Methods', () => {
    it('should find SAFEs by company', async () => {
      const companyId = 'company-abc';

      await SAFE.create({ companyId, investorId: 'inv-1', investorName: 'Inv1', investmentAmount: 100000, createdBy: 'user-1' });
      await SAFE.create({ companyId, investorId: 'inv-2', investorName: 'Inv2', investmentAmount: 50000, createdBy: 'user-1' });
      await SAFE.create({ companyId: 'other-company', investorId: 'inv-3', investorName: 'Inv3', investmentAmount: 75000, createdBy: 'user-1' });

      const safes = await SAFE.findByCompany(companyId);
      expect(safes).toHaveLength(2);
    });

    it('should find SAFEs by investor', async () => {
      const investorId = 'investor-xyz';

      await SAFE.create({ companyId: 'c1', investorId, investorName: 'Inv1', investmentAmount: 100000, createdBy: 'user-1' });
      await SAFE.create({ companyId: 'c2', investorId, investorName: 'Inv1', investmentAmount: 50000, createdBy: 'user-1' });

      const safes = await SAFE.findByInvestor(investorId);
      expect(safes).toHaveLength(2);
    });

    it('should calculate total funded amount', async () => {
      const companyId = 'company-funded';

      await SAFE.create({ companyId, investorId: 'inv-1', investorName: 'Inv1', investmentAmount: 100000, status: 'funded', createdBy: 'user-1' });
      await SAFE.create({ companyId, investorId: 'inv-2', investorName: 'Inv2', investmentAmount: 50000, status: 'funded', createdBy: 'user-1' });
      await SAFE.create({ companyId, investorId: 'inv-3', investorName: 'Inv3', investmentAmount: 75000, status: 'draft', createdBy: 'user-1' });

      const total = await SAFE.getTotalFundedAmount(companyId);
      expect(total).toBe(150000);
    });

    it('should get pending conversion SAFEs', async () => {
      const companyId = 'company-pending';

      await SAFE.create({ companyId, investorId: 'inv-1', investorName: 'Inv1', investmentAmount: 100000, status: 'funded', createdBy: 'user-1' });
      await SAFE.create({ companyId, investorId: 'inv-2', investorName: 'Inv2', investmentAmount: 50000, status: 'converted', createdBy: 'user-1' });

      const pending = await SAFE.getPendingConversion(companyId);
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('funded');
    });
  });

  describe('Schema Structure', () => {
    it('should have unique safeId in schema', () => {
      expect(SAFE.schema).toBeDefined();
      expect(SAFE.schema.safeId.unique).toBe(true);
    });

    it('should have status enum values', () => {
      const validStatuses = SAFE.schema.status.enum;
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('sent');
      expect(validStatuses).toContain('fully_signed');
      expect(validStatuses).toContain('funded');
      expect(validStatuses).toContain('converted');
      expect(validStatuses).toContain('cancelled');
      expect(validStatuses).toContain('expired');
    });
  });
});
