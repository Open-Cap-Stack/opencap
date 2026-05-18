/**
 * SPV Controller Expanded Fields Tests
 * Issue #579: Expand SPV data model with terms, adviser, memo, carry, LP fields
 *
 * Tests that the controller's create and update handlers properly accept,
 * validate, and pass through the new extended fields via whitelist pattern.
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../models/SPV', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  findByIdAndDelete: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview'],
  VALID_COMPANY_STAGES: ['pre-seed', 'seed', 'series-a', 'series-b', 'post-revenue', 'other'],
  VALID_INCORPORATION_TYPES: ['c-corp', 'llc', 's-corp', 'other'],
  VALID_MONTHS_OF_RUNWAY: ['less-than-12', '12-or-more'],
  VALID_TRANSACTION_TYPES: ['primary', 'secondary'],
  VALID_INSTRUMENTS: ['safe', 'convertible-note', 'preferred-equity', 'common-equity', 'other'],
  VALID_VALUATIONS: ['capped', 'uncapped'],
  VALID_ADVISER_TYPES: ['platform-advisor', 'self-advised'],
  LEGACY_STATUS_MAP: { active: 'raising', inactive: 'draft', dissolved: 'canceled', pending: 'in_review', closed: 'wired', liquidated: 'canceled' },
  TRANSITION_RULES: { draft: ['in_review', 'canceled'], in_review: ['raising', 'draft', 'canceled'], raising: ['closing', 'canceled'], closing: ['wired', 'canceled'], wired: ['canceled'], canceled: [] },
  REQUIRED_STEPS_FOR_REVIEW: ['terms', 'adviser', 'dataRoom', 'carry'],
  normalizeStatus: jest.fn((status) => {
    if (!status) return 'draft';
    const lower = status.toLowerCase();
    const valid = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];
    if (valid.includes(lower)) return lower;
    const map = { active: 'raising', inactive: 'draft', dissolved: 'canceled', pending: 'in_review', closed: 'wired', liquidated: 'canceled' };
    return map[lower] || lower;
  }),
  validateTransition: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const spvController = require('../../../controllers/SPV');
const SPV = require('../../../models/SPV');

describe('SPV Controller - Expanded Fields (Issue #579)', () => {
  let req, res;

  const baseData = {
    SPVID: 'SPV001',
    Name: 'Test SPV',
    Purpose: 'Investment vehicle',
    CreationDate: '2024-01-15',
    Status: 'draft',
    ParentCompanyID: 'COMPANY001',
    ComplianceStatus: 'Compliant'
  };

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createSPV with extended fields
  // -------------------------------------------------------------------------
  describe('createSPV with extended fields', () => {
    it('should pass through all basic info additions', async () => {
      const extFields = {
        companyId: 'comp_123',
        companyLegalName: 'Acme Inc.',
        companyStage: 'seed',
        countryOfIncorporation: 'United States',
        incorporationType: 'c-corp',
        founderEmails: ['alice@example.com', 'bob@example.com'],
        monthsOfRunway: '12-or-more',
        proRataRights: true,
        targetClosingDate: '2025-06-30',
        lpMinimumInvestment: 25000
      };

      req.body = { ...baseData, ...extFields };
      SPV.findOne.mockResolvedValue(null);
      const mockSaved = { _id: 'spv123', ...baseData, Status: 'draft', ...extFields };
      SPV.create.mockResolvedValue(mockSaved);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(201);
      expect(SPV.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp_123',
          companyLegalName: 'Acme Inc.',
          companyStage: 'seed',
          founderEmails: ['alice@example.com', 'bob@example.com'],
          lpMinimumInvestment: 25000
        })
      );
    });

    it('should pass through terms fields', async () => {
      const termsFields = {
        transactionType: 'primary',
        instrument: 'safe',
        includesTokenWarrant: false,
        valuation: 'capped',
        valuationCap: 10000000,
        discount: 20,
        round: 'Seed',
        roundSize: 5000000,
        allocation: 500000,
        otherTerms: 'MFN clause included',
        termDocuments: ['https://example.com/doc1.pdf']
      };

      req.body = { ...baseData, ...termsFields };
      SPV.findOne.mockResolvedValue(null);
      SPV.create.mockResolvedValue({ _id: 'spv123', ...baseData, Status: 'draft', ...termsFields });

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(201);
      expect(SPV.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'primary',
          instrument: 'safe',
          valuationCap: 10000000,
          discount: 20
        })
      );
    });

    it('should pass through adviser, memo, carry, and service fields', async () => {
      const extFields = {
        adviserType: 'platform-advisor',
        masterPartnershipEntity: 'Master LP Entity',
        fundLead: 'Jane Doe',
        memo: 'Investment thesis text',
        pitchDeckUrl: 'https://example.com/deck.pdf',
        coInvestors: [{ name: 'Fund A', amount: 100000 }],
        pastFinancing: true,
        risks: ['Market risk', 'Regulatory risk'],
        disclosures: { investedPreviously: true, noConflicts: false },
        carryPercentage: 20,
        carryRecipientEntity: 'GP Entity LLC',
        gpCommitmentAmount: 50000,
        gpCommitmentFromFund: false,
        investingOnDifferentTerms: false,
        dealPartners: [{ userId: 'user_1', carryPercentage: 10 }],
        has3c7ParallelFunds: false,
        hasFinancialStatements: true,
        totalRaised: 250000,
        lpCount: 5,
        wizardStep: 3,
        wizardCompletedSteps: ['basic-info', 'terms', 'adviser']
      };

      req.body = { ...baseData, ...extFields };
      SPV.findOne.mockResolvedValue(null);
      SPV.create.mockResolvedValue({ _id: 'spv123', ...baseData, Status: 'draft', ...extFields });

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(201);
      expect(SPV.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adviserType: 'platform-advisor',
          memo: 'Investment thesis text',
          carryPercentage: 20,
          totalRaised: 250000,
          lpCount: 5,
          wizardStep: 3
        })
      );
    });

    it('should reject invalid companyStage enum value', async () => {
      req.body = { ...baseData, companyStage: 'series-z' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('company stage');
    });

    it('should reject invalid instrument enum value', async () => {
      req.body = { ...baseData, instrument: 'warrant' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('instrument');
    });

    it('should reject invalid transactionType enum value', async () => {
      req.body = { ...baseData, transactionType: 'tertiary' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('transaction type');
    });

    it('should reject invalid valuation enum value', async () => {
      req.body = { ...baseData, valuation: 'flat' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('valuation');
    });

    it('should reject invalid adviserType enum value', async () => {
      req.body = { ...baseData, adviserType: 'external' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('adviser type');
    });

    it('should reject invalid incorporationType enum value', async () => {
      req.body = { ...baseData, incorporationType: 'partnership' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('incorporation type');
    });

    it('should reject invalid monthsOfRunway enum value', async () => {
      req.body = { ...baseData, monthsOfRunway: '6-months' };
      SPV.findOne.mockResolvedValue(null);

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('months of runway');
    });

    it('should ignore non-whitelisted fields', async () => {
      req.body = { ...baseData, hackerField: 'malicious', __proto__: 'bad' };
      SPV.findOne.mockResolvedValue(null);
      SPV.create.mockResolvedValue({ _id: 'spv123', ...baseData, Status: 'draft' });

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(201);
      expect(SPV.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ hackerField: 'malicious' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateSPV with extended fields (whitelist PATCH pattern)
  // -------------------------------------------------------------------------
  describe('updateSPV with extended fields', () => {
    it('should update only the subset of extended fields provided', async () => {
      req.params = { id: 'SPV001' };
      req.body = {
        valuationCap: 8000000,
        instrument: 'convertible-note',
        wizardStep: 4
      };

      const mockUpdated = { _id: 'spv123', SPVID: 'SPV001', valuationCap: 8000000, instrument: 'convertible-note', wizardStep: 4 };
      SPV.findOneAndUpdate.mockResolvedValue(mockUpdated);

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(200);
      expect(SPV.findOneAndUpdate).toHaveBeenCalledWith(
        { SPVID: 'SPV001' },
        {
          $set: expect.objectContaining({
            valuationCap: 8000000,
            instrument: 'convertible-note',
            wizardStep: 4
          })
        },
        { new: true }
      );
    });

    it('should reject invalid enum on update', async () => {
      req.params = { id: 'SPV001' };
      req.body = { companyStage: 'invalid-stage' };

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('company stage');
    });

    it('should allow updating carry and GP fields', async () => {
      req.params = { id: 'SPV001' };
      req.body = {
        carryPercentage: 25,
        gpCommitmentAmount: 100000,
        dealPartners: [{ userId: 'user_3', carryPercentage: 15 }]
      };

      const mockUpdated = { _id: 'spv123', SPVID: 'SPV001', ...req.body };
      SPV.findOneAndUpdate.mockResolvedValue(mockUpdated);

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(200);
      expect(SPV.findOneAndUpdate).toHaveBeenCalledWith(
        { SPVID: 'SPV001' },
        {
          $set: expect.objectContaining({
            carryPercentage: 25,
            gpCommitmentAmount: 100000,
            dealPartners: [{ userId: 'user_3', carryPercentage: 15 }]
          })
        },
        { new: true }
      );
    });

    it('should allow updating memo and data room fields', async () => {
      req.params = { id: 'SPV001' };
      req.body = {
        memo: 'Updated investment memo',
        pitchDeckUrl: 'https://new-url.com/deck.pdf',
        risks: ['Liquidity risk'],
        disclosures: { noConflicts: true }
      };

      const mockUpdated = { _id: 'spv123', SPVID: 'SPV001', ...req.body };
      SPV.findOneAndUpdate.mockResolvedValue(mockUpdated);

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(200);
      expect(SPV.findOneAndUpdate).toHaveBeenCalledWith(
        { SPVID: 'SPV001' },
        {
          $set: expect.objectContaining({
            memo: 'Updated investment memo',
            pitchDeckUrl: 'https://new-url.com/deck.pdf'
          })
        },
        { new: true }
      );
    });

    it('should allow mixing original and extended fields in update', async () => {
      req.params = { id: 'SPV001' };
      req.body = {
        Name: 'Renamed SPV',
        Status: 'closing',
        totalRaised: 500000,
        lpCount: 12
      };

      const mockUpdated = { _id: 'spv123', SPVID: 'SPV001', Name: 'Renamed SPV', Status: 'closing', totalRaised: 500000, lpCount: 12 };
      SPV.findOneAndUpdate.mockResolvedValue(mockUpdated);

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(200);
      expect(SPV.findOneAndUpdate).toHaveBeenCalledWith(
        { SPVID: 'SPV001' },
        {
          $set: expect.objectContaining({
            Name: 'Renamed SPV',
            Status: 'closing',
            totalRaised: 500000,
            lpCount: 12
          })
        },
        { new: true }
      );
    });

    it('should not allow non-whitelisted fields through update', async () => {
      req.params = { id: 'SPV001' };
      req.body = {
        Name: 'Safe Update',
        dangerousField: 'should be ignored'
      };

      const mockUpdated = { _id: 'spv123', SPVID: 'SPV001', Name: 'Safe Update' };
      SPV.findOneAndUpdate.mockResolvedValue(mockUpdated);

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(200);
      const updateArg = SPV.findOneAndUpdate.mock.calls[0][1].$set;
      expect(updateArg).not.toHaveProperty('dangerousField');
    });
  });
});
