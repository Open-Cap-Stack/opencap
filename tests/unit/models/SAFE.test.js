/**
 * SAFE Model Tests
 * Feature: Issue #40 - Model Test Coverage
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SAFE = require('../../../models/SAFE');

describe('SAFE Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await SAFE.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid SAFE document', async () => {
      const safeData = {
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'John Investor',
        investorEmail: 'john@investor.com',
        investmentAmount: 100000,
        safeType: 'post-money',
        valuationCap: 5000000,
        createdBy: new mongoose.Types.ObjectId()
      };

      const safe = new SAFE(safeData);
      const savedSafe = await safe.save();

      expect(savedSafe._id).toBeDefined();
      expect(savedSafe.safeId).toMatch(/^safe_/);
      expect(savedSafe.status).toBe('draft');
      expect(savedSafe.investorName).toBe('John Investor');
    });

    it('should require companyId', async () => {
      const safe = new SAFE({
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(safe.save()).rejects.toThrow(/companyId/);
    });

    it('should require investorId', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(safe.save()).rejects.toThrow(/investorId/);
    });

    it('should require positive investmentAmount', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: -100,
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(safe.save()).rejects.toThrow(/Investment amount must be positive/);
    });

    it('should validate safeType enum', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        safeType: 'invalid-type',
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(safe.save()).rejects.toThrow(/is not a valid enum value/);
    });

    it('should validate discountRate range', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        discountRate: 1.5, // Should be 0-1
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(safe.save()).rejects.toThrow(/Discount rate must be between 0 and 1/);
    });

    it('should default status to draft', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      await safe.save();
      expect(safe.status).toBe('draft');
    });

    it('should default currency to USD', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      await safe.save();
      expect(safe.currency).toBe('USD');
    });
  });

  describe('Virtuals', () => {
    it('should calculate isFullySigned when both signatures present', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId(),
        investorSignature: {
          signerName: 'Investor',
          signerEmail: 'inv@test.com',
          signedAt: new Date()
        },
        companySignature: {
          signerName: 'Company Rep',
          signerEmail: 'rep@test.com',
          signedAt: new Date()
        }
      });

      expect(safe.isFullySigned).toBe(true);
    });

    it('should return false for isFullySigned when signature missing', async () => {
      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId(),
        investorSignature: {
          signerName: 'Investor',
          signerEmail: 'inv@test.com',
          signedAt: new Date()
        }
      });

      expect(safe.isFullySigned).toBe(false);
    });

    it('should calculate isExpired correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const safe = new SAFE({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId(),
        expiresAt: pastDate
      });

      expect(safe.isExpired).toBe(true);
    });
  });

  describe('Status Transitions', () => {
    it('should allow valid transition from draft to sent', async () => {
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(safe.canTransitionTo('sent')).toBe(true);
    });

    it('should disallow invalid transition from draft to funded', async () => {
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(safe.canTransitionTo('funded')).toBe(false);
    });

    it('should transition status and record history', async () => {
      const userId = new mongoose.Types.ObjectId();
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: userId
      });

      await safe.transitionTo('sent', userId, 'Sending for signature');

      expect(safe.status).toBe('sent');
      expect(safe.sentAt).toBeDefined();
      expect(safe.statusHistory).toHaveLength(1);
      expect(safe.statusHistory[0].status).toBe('sent');
      expect(safe.statusHistory[0].reason).toBe('Sending for signature');
    });

    it('should throw error for invalid transition', async () => {
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(
        safe.transitionTo('converted', new mongoose.Types.ObjectId())
      ).rejects.toThrow('Cannot transition from draft to converted');
    });
  });

  describe('Signature Methods', () => {
    it('should add investor signature', async () => {
      const userId = new mongoose.Types.ObjectId();
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        status: 'sent',
        createdBy: userId
      });

      await safe.addInvestorSignature({
        signerName: 'John Investor',
        signerEmail: 'john@test.com',
        signerTitle: 'Individual',
        signatureData: 'base64signature'
      }, userId);

      expect(safe.investorSignature.signerName).toBe('John Investor');
      expect(safe.investorSignature.signedAt).toBeDefined();
    });

    it('should transition to fully_signed when both sign', async () => {
      const userId = new mongoose.Types.ObjectId();
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        status: 'sent',
        createdBy: userId,
        investorSignature: {
          signerName: 'Investor',
          signerEmail: 'inv@test.com',
          signedAt: new Date()
        }
      });

      await safe.addCompanySignature({
        signerName: 'Company Rep',
        signerEmail: 'rep@test.com',
        signatureData: 'signature'
      }, userId);

      expect(safe.status).toBe('fully_signed');
      expect(safe.signedAt).toBeDefined();
    });
  });

  describe('Conversion Methods', () => {
    it('should record conversion details', async () => {
      const userId = new mongoose.Types.ObjectId();
      const fundingRoundId = new mongoose.Types.ObjectId();
      const shareClassId = new mongoose.Types.ObjectId();

      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        valuationCap: 5000000,
        status: 'funded',
        createdBy: userId
      });

      await safe.recordConversion({
        fundingRoundId,
        shareClassId,
        shares: 50000,
        pricePerShare: 2.00,
        methodUsed: 'cap',
        effectivePrice: 2.00,
        calculationDetails: { valuationCap: 5000000 }
      }, userId);

      expect(safe.status).toBe('converted');
      expect(safe.conversionShares).toBe(50000);
      expect(safe.conversionPrice).toBe(2.00);
      expect(safe.conversionDetails.methodUsed).toBe('cap');
    });

    it('should reject conversion if not funded', async () => {
      const safe = await SAFE.create({
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        status: 'draft',
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(
        safe.recordConversion({
          fundingRoundId: new mongoose.Types.ObjectId(),
          shareClassId: new mongoose.Types.ObjectId(),
          shares: 50000,
          pricePerShare: 2.00
        }, new mongoose.Types.ObjectId())
      ).rejects.toThrow('SAFE must be funded before conversion');
    });
  });

  describe('Static Methods', () => {
    it('should find SAFEs by company', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      await SAFE.create([
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv1', investmentAmount: 100000, createdBy },
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv2', investmentAmount: 50000, createdBy },
        { companyId: new mongoose.Types.ObjectId(), investorId: new mongoose.Types.ObjectId(), investorName: 'Inv3', investmentAmount: 75000, createdBy }
      ]);

      const safes = await SAFE.findByCompany(companyId);
      expect(safes).toHaveLength(2);
    });

    it('should find SAFEs by investor', async () => {
      const investorId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      await SAFE.create([
        { companyId: new mongoose.Types.ObjectId(), investorId, investorName: 'Inv1', investmentAmount: 100000, createdBy },
        { companyId: new mongoose.Types.ObjectId(), investorId, investorName: 'Inv1', investmentAmount: 50000, createdBy }
      ]);

      const safes = await SAFE.findByInvestor(investorId);
      expect(safes).toHaveLength(2);
    });

    it('should calculate total funded amount', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      await SAFE.create([
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv1', investmentAmount: 100000, status: 'funded', createdBy },
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv2', investmentAmount: 50000, status: 'funded', createdBy },
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv3', investmentAmount: 75000, status: 'draft', createdBy }
      ]);

      const total = await SAFE.getTotalFundedAmount(companyId);
      expect(total).toBe(150000);
    });

    it('should get pending conversion SAFEs', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      await SAFE.create([
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv1', investmentAmount: 100000, status: 'funded', createdBy },
        { companyId, investorId: new mongoose.Types.ObjectId(), investorName: 'Inv2', investmentAmount: 50000, status: 'converted', createdBy }
      ]);

      const pending = await SAFE.getPendingConversion(companyId);
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('funded');
    });
  });

  describe('Indexes', () => {
    it('should have unique safeId index', async () => {
      const safeData = {
        companyId: new mongoose.Types.ObjectId(),
        investorId: new mongoose.Types.ObjectId(),
        investorName: 'Test',
        investmentAmount: 100000,
        createdBy: new mongoose.Types.ObjectId()
      };

      const safe1 = await SAFE.create(safeData);

      const safe2 = new SAFE({ ...safeData, safeId: safe1.safeId });

      await expect(safe2.save()).rejects.toThrow(/duplicate key/);
    });
  });
});
