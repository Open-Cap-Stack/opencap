/**
 * PreferredTerms Model - Comprehensive Unit Tests
 *
 * Tests all async methods (create, findByPreferredTermsId, findByShareClass,
 * findByCompany, getPreferenceStack, validateSeniorityRank, addAuditEntry,
 * reorderSeniority, markConverted, markRedeemed) by mocking ZeroDB.
 */

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const PreferredTerms = require('../../../models/PreferredTerms');

describe('PreferredTerms Model - Comprehensive', () => {
  const validData = () => ({
    shareClassId: 'sc_001',
    companyId: 'comp_001',
    seniorityRank: 1,
    liquidationPreferenceMultiple: 1.0
  });

  const makeInsertResponse = (overrides = {}) => ({
    data: [{
      row_id: 'row-1',
      row_data: {
        _id: 'uuid-1',
        preferredTermsId: 'pt_uuid',
        shareClassId: 'sc_001',
        companyId: 'comp_001',
        seniorityRank: 1,
        ...overrides
      }
    }]
  });

  const makeQueryResponse = (items = []) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    zerodbService.client.put.mockResolvedValue({});
  });

  // =========================================================================
  // create()
  // =========================================================================
  describe('create()', () => {
    it('should generate preferredTermsId when not provided', async () => {
      await PreferredTerms.create(validData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.preferredTermsId).toBeDefined();
      expect(inserted.preferredTermsId.startsWith('pt_')).toBe(true);
    });

    it('should preserve provided preferredTermsId', async () => {
      await PreferredTerms.create({ ...validData(), preferredTermsId: 'pt_custom' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.preferredTermsId).toBe('pt_custom');
    });

    it('should throw when shareClassId is missing', async () => {
      const data = validData();
      delete data.shareClassId;
      await expect(PreferredTerms.create(data)).rejects.toThrow('shareClassId is required');
    });

    it('should throw when companyId is missing', async () => {
      const data = validData();
      delete data.companyId;
      await expect(PreferredTerms.create(data)).rejects.toThrow('companyId is required');
    });

    it('should throw when seniorityRank is undefined', async () => {
      const data = validData();
      delete data.seniorityRank;
      await expect(PreferredTerms.create(data)).rejects.toThrow('seniorityRank is required and must be >= 1');
    });

    it('should throw when seniorityRank is 0', async () => {
      await expect(PreferredTerms.create({ ...validData(), seniorityRank: 0 }))
        .rejects.toThrow('seniorityRank is required and must be >= 1');
    });

    it('should throw when seniorityRank is negative', async () => {
      await expect(PreferredTerms.create({ ...validData(), seniorityRank: -1 }))
        .rejects.toThrow('seniorityRank is required and must be >= 1');
    });

    it('should throw when liquidationPreferenceMultiple is negative', async () => {
      await expect(PreferredTerms.create({ ...validData(), liquidationPreferenceMultiple: -1 }))
        .rejects.toThrow('liquidationPreferenceMultiple cannot be negative');
    });

    it('should default liquidationPreferenceMultiple to 1.0 when undefined', async () => {
      const data = validData();
      delete data.liquidationPreferenceMultiple;
      await PreferredTerms.create(data);
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.liquidationPreferenceMultiple).toBe(1.0);
    });

    it('should throw when participationCapMultiple set but isParticipating is false', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        isParticipating: false,
        participationCapMultiple: 3.0
      })).rejects.toThrow('participationCapMultiple is only valid if isParticipating is true');
    });

    it('should allow participationCapMultiple when isParticipating is true', async () => {
      await PreferredTerms.create({
        ...validData(),
        isParticipating: true,
        participationCapMultiple: 3.0
      });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.participationCapMultiple).toBe(3.0);
    });

    it('should allow null participationCapMultiple when isParticipating is false', async () => {
      await PreferredTerms.create({
        ...validData(),
        isParticipating: false,
        participationCapMultiple: null
      });
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should throw when dividendType is non-NONE and dividendRate is null', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        dividendType: 'CUMULATIVE',
        dividendRate: null
      })).rejects.toThrow('dividendRate is required when dividendType is not NONE');
    });

    it('should throw when dividendType is non-NONE and dividendRate is undefined', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        dividendType: 'NON_CUMULATIVE'
      })).rejects.toThrow('dividendRate is required when dividendType is not NONE');
    });

    it('should throw when dividendRate is negative', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        dividendType: 'CUMULATIVE',
        dividendRate: -0.05
      })).rejects.toThrow('dividendRate must be between 0 and 1');
    });

    it('should throw when dividendRate exceeds 1', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        dividendType: 'CUMULATIVE',
        dividendRate: 1.5
      })).rejects.toThrow('dividendRate must be between 0 and 1');
    });

    it('should accept valid dividendRate', async () => {
      await PreferredTerms.create({
        ...validData(),
        dividendType: 'CUMULATIVE',
        dividendRate: 0.08
      });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.dividendRate).toBe(0.08);
    });

    it('should throw for invalid dividendType enum', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        dividendType: 'INVALID',
        dividendRate: 0.05
      })).rejects.toThrow('dividendType must be one of');
    });

    it('should throw for invalid antiDilutionType enum', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        antiDilutionType: 'INVALID'
      })).rejects.toThrow('antiDilutionType must be one of');
    });

    it('should throw for invalid votingRightsType enum', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        votingRightsType: 'INVALID'
      })).rejects.toThrow('votingRightsType must be one of');
    });

    it('should throw when conversionRatio is negative', async () => {
      await expect(PreferredTerms.create({
        ...validData(),
        conversionRatio: -1
      })).rejects.toThrow('conversionRatio cannot be negative');
    });

    it('should default status to ACTIVE', async () => {
      await PreferredTerms.create(validData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('ACTIVE');
    });

    it('should preserve provided status', async () => {
      await PreferredTerms.create({ ...validData(), status: 'MODIFIED' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('MODIFIED');
    });

    it('should set effectiveDate if not provided', async () => {
      await PreferredTerms.create(validData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.effectiveDate).toBeDefined();
    });

    it('should preserve provided effectiveDate', async () => {
      const dateStr = '2025-01-01T00:00:00.000Z';
      await PreferredTerms.create({ ...validData(), effectiveDate: dateStr });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.effectiveDate).toBe(dateStr);
    });

    it('should initialize auditLog with CREATED entry', async () => {
      await PreferredTerms.create(validData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.auditLog).toHaveLength(1);
      expect(inserted.auditLog[0].action).toBe('CREATED');
    });

    it('should append CREATED to existing auditLog', async () => {
      const existing = [{ action: 'IMPORTED', userId: 'sys' }];
      await PreferredTerms.create({ ...validData(), auditLog: existing });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.auditLog).toHaveLength(2);
      expect(inserted.auditLog[0].action).toBe('IMPORTED');
      expect(inserted.auditLog[1].action).toBe('CREATED');
    });

    it('should use createdBy in audit entry if provided', async () => {
      await PreferredTerms.create({ ...validData(), createdBy: 'user_42' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.auditLog[0].userId).toBe('user_42');
    });

    it('should default audit entry userId to system', async () => {
      await PreferredTerms.create(validData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.auditLog[0].userId).toBe('system');
    });

    it('should call baseModel.create', async () => {
      await PreferredTerms.create(validData());
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'preferred_terms',
        expect.objectContaining({ shareClassId: 'sc_001' })
      );
    });
  });

  // =========================================================================
  // findByPreferredTermsId()
  // =========================================================================
  describe('findByPreferredTermsId()', () => {
    it('should call findOne with preferredTermsId filter', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ preferredTermsId: 'pt_001' }])
      );
      const result = await PreferredTerms.findByPreferredTermsId('pt_001');
      expect(result).toBeDefined();
      expect(result.preferredTermsId).toBe('pt_001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await PreferredTerms.findByPreferredTermsId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // findByShareClass()
  // =========================================================================
  describe('findByShareClass()', () => {
    it('should call findOne with shareClassId filter', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ shareClassId: 'sc_001' }])
      );
      const result = await PreferredTerms.findByShareClass('sc_001');
      expect(result.shareClassId).toBe('sc_001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await PreferredTerms.findByShareClass('nonexistent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // findByCompany()
  // =========================================================================
  describe('findByCompany()', () => {
    it('should return records sorted by seniorityRank', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { companyId: 'comp_001', seniorityRank: 3 },
          { companyId: 'comp_001', seniorityRank: 1 },
          { companyId: 'comp_001', seniorityRank: 2 }
        ])
      );
      const results = await PreferredTerms.findByCompany('comp_001');
      expect(results).toHaveLength(3);
      expect(results[0].seniorityRank).toBe(1);
      expect(results[1].seniorityRank).toBe(2);
      expect(results[2].seniorityRank).toBe(3);
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await PreferredTerms.findByCompany('comp_001', { status: 'ACTIVE' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'preferred_terms',
        expect.objectContaining({
          filter: { companyId: 'comp_001', status: 'ACTIVE' }
        })
      );
    });

    it('should not filter by status when not provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await PreferredTerms.findByCompany('comp_001');
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'preferred_terms',
        expect.objectContaining({
          filter: { companyId: 'comp_001' }
        })
      );
    });
  });

  // =========================================================================
  // getPreferenceStack()
  // =========================================================================
  describe('getPreferenceStack()', () => {
    it('should return active records sorted by seniority', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { companyId: 'comp_001', seniorityRank: 2, status: 'ACTIVE' },
          { companyId: 'comp_001', seniorityRank: 1, status: 'ACTIVE' }
        ])
      );
      const stack = await PreferredTerms.getPreferenceStack('comp_001');
      expect(stack[0].seniorityRank).toBe(1);
      expect(stack[1].seniorityRank).toBe(2);
    });
  });

  // =========================================================================
  // validateSeniorityRank()
  // =========================================================================
  describe('validateSeniorityRank()', () => {
    it('should return true when rank is unique', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { preferredTermsId: 'pt_001', seniorityRank: 1, status: 'ACTIVE' }
        ])
      );
      const result = await PreferredTerms.validateSeniorityRank('comp_001', 2);
      expect(result).toBe(true);
    });

    it('should return false when rank is taken', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { preferredTermsId: 'pt_001', seniorityRank: 1, status: 'ACTIVE' }
        ])
      );
      const result = await PreferredTerms.validateSeniorityRank('comp_001', 1);
      expect(result).toBe(false);
    });

    it('should exclude specified ID from check (by preferredTermsId)', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { preferredTermsId: 'pt_001', seniorityRank: 1, status: 'ACTIVE' }
        ])
      );
      const result = await PreferredTerms.validateSeniorityRank('comp_001', 1, 'pt_001');
      expect(result).toBe(true);
    });

    it('should exclude specified ID from check (by _id)', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { _id: 'id_001', preferredTermsId: 'pt_001', seniorityRank: 1, status: 'ACTIVE' }
        ])
      );
      const result = await PreferredTerms.validateSeniorityRank('comp_001', 1, 'id_001');
      expect(result).toBe(true);
    });

    it('should return true when no existing records', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await PreferredTerms.validateSeniorityRank('comp_001', 1);
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // addAuditEntry()
  // =========================================================================
  describe('addAuditEntry()', () => {
    it('should throw when record not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(PreferredTerms.addAuditEntry('nonexistent', 'UPDATED', 'user_1'))
        .rejects.toThrow('PreferredTerms not found');
    });

    it('should append audit entry to existing log', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          auditLog: [{ action: 'CREATED' }]
        }])
      );
      await PreferredTerms.addAuditEntry('pt_001', 'UPDATED', 'user_1', {
        reason: 'Fixed rate',
        previousValues: { dividendRate: 0.05 },
        newValues: { dividendRate: 0.08 },
        changes: { dividendRate: 'updated' }
      });
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle missing auditLog array', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001'
          // no auditLog field
        }])
      );
      await PreferredTerms.addAuditEntry('pt_001', 'UPDATED', 'user_1');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // reorderSeniority()
  // =========================================================================
  describe('reorderSeniority()', () => {
    it('should update each record with new rank', async () => {
      // Mock findOne to return a record for updateOne
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ preferredTermsId: 'pt_001', companyId: 'comp_001' }])
      );
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const newOrder = [
        { preferredTermsId: 'pt_001', newRank: 2 },
        { preferredTermsId: 'pt_002', newRank: 1 }
      ];
      const results = await PreferredTerms.reorderSeniority('comp_001', newOrder);
      expect(results).toHaveLength(2);
    });
  });

  // =========================================================================
  // markConverted()
  // =========================================================================
  describe('markConverted()', () => {
    it('should throw when record not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(PreferredTerms.markConverted('nonexistent'))
        .rejects.toThrow('PreferredTerms not found');
    });

    it('should set status to CONVERTED and add audit entry', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          auditLog: [],
          metadata: { existing: true }
        }])
      );

      await PreferredTerms.markConverted('pt_001', {
        convertedBy: 'user_1',
        reason: 'IPO conversion'
      });
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle missing auditLog', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          metadata: {}
        }])
      );
      await PreferredTerms.markConverted('pt_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should use default convertedBy=system when not provided', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          auditLog: [],
          metadata: {}
        }])
      );
      await PreferredTerms.markConverted('pt_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // markRedeemed()
  // =========================================================================
  describe('markRedeemed()', () => {
    it('should throw when record not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(PreferredTerms.markRedeemed('nonexistent'))
        .rejects.toThrow('PreferredTerms not found');
    });

    it('should set status to REDEEMED and add audit entry', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          auditLog: [],
          metadata: {}
        }])
      );

      await PreferredTerms.markRedeemed('pt_001', {
        redeemedBy: 'user_1',
        reason: 'Investor request'
      });
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle empty redemptionDetails', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          auditLog: [],
          metadata: {}
        }])
      );
      await PreferredTerms.markRedeemed('pt_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle missing auditLog', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          preferredTermsId: 'pt_001',
          metadata: {}
        }])
      );
      await PreferredTerms.markRedeemed('pt_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // calculateParticipation - edge cases with cap
  // =========================================================================
  describe('calculateParticipation - cap edge cases', () => {
    it('should return 0 maxParticipation when cap equals preference', async () => {
      const terms = {
        isParticipating: true,
        totalShares: 1000000,
        conversionRatio: 1.0,
        participationCapMultiple: 1.0,
        originalInvestment: 1000000,
        liquidationPreferenceMultiple: 1.0,
        dividendType: 'NONE'
      };
      // cap = 1x = 1M, preference = 1M, maxParticipation = 0
      const result = PreferredTerms.calculateParticipation(terms, 5000000, 10000000);
      expect(result).toBe(0);
    });

    it('should use totalShares*pricePerShare when originalInvestment missing and cap set', async () => {
      const terms = {
        isParticipating: true,
        totalShares: 100000,
        pricePerShare: 10,
        conversionRatio: 1.0,
        participationCapMultiple: 2.0,
        liquidationPreferenceMultiple: 1.0,
        dividendType: 'NONE'
      };
      // investment = 100K*10 = 1M, cap = 2M, pref = 1M, maxPart = 1M
      // proRata = 100K/10M * 5M = 50K
      const result = PreferredTerms.calculateParticipation(terms, 5000000, 10000000);
      expect(result).toBe(50000);
    });
  });

  // =========================================================================
  // shouldConvert - additional edge cases
  // =========================================================================
  describe('shouldConvert - additional cases', () => {
    it('should handle case where values are exactly equal', () => {
      const terms = {
        totalShares: 1000000,
        conversionRatio: 1.0,
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        isParticipating: false,
        dividendType: 'NONE'
      };
      // Exit = 10M, asConverted = 1M/10M * 10M = 1M, preference = 1M
      const result = PreferredTerms.shouldConvert(terms, 10000000, 10000000);
      expect(result.shouldConvert).toBe(false);
      expect(result.valueDifference).toBe(0);
    });

    it('should handle undefined conversionRatio (defaults to 1)', () => {
      const terms = {
        totalShares: 1000000,
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 500000,
        isParticipating: false,
        dividendType: 'NONE'
      };
      const result = PreferredTerms.shouldConvert(terms, 10000000, 10000000);
      expect(result.asConvertedValue).toBe(1000000);
    });

    it('should handle undefined totalShares', () => {
      const terms = {
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        isParticipating: false,
        dividendType: 'NONE'
      };
      const result = PreferredTerms.shouldConvert(terms, 10000000, 10000000);
      expect(result.asConvertedValue).toBe(0);
    });
  });

  // =========================================================================
  // getActiveProtectiveProvisions - additional cases
  // =========================================================================
  describe('getActiveProtectiveProvisions - additional coverage', () => {
    it('should handle all 14 standard provisions being active', () => {
      const terms = {
        protectiveProvisions: {
          amendCharterOrBylaws: true,
          createSeniorSecurity: true,
          authorizeAdditionalShares: true,
          declareOrPayDividends: true,
          redeemOrRepurchaseStock: true,
          mergerOrAcquisition: true,
          sellAllAssets: true,
          incurIndebtedness: true,
          issueNewSecurities: true,
          changeCapitalization: true,
          enterNewBusinessLine: true,
          hireOrFireExecutives: true,
          changeBoardSize: true,
          approveAnnualBudget: true,
          customProvisions: []
        }
      };
      const result = PreferredTerms.getActiveProtectiveProvisions(terms);
      expect(result).toHaveLength(14);
    });

    it('should handle missing customProvisions array', () => {
      const terms = {
        protectiveProvisions: {
          amendCharterOrBylaws: true
          // no customProvisions
        }
      };
      const result = PreferredTerms.getActiveProtectiveProvisions(terms);
      expect(result).toHaveLength(1);
    });

    it('should handle customProvisions with string entries', () => {
      const terms = {
        protectiveProvisions: {
          customProvisions: ['Custom Rule 1', 'Custom Rule 2']
        }
      };
      const result = PreferredTerms.getActiveProtectiveProvisions(terms);
      expect(result).toHaveLength(2);
      expect(result[0].custom).toBe(true);
      expect(result[0].label).toBe('Custom Rule 1');
    });

    it('should handle customProvisions with object entries', () => {
      const terms = {
        protectiveProvisions: {
          customProvisions: [{ name: 'Named Rule' }]
        }
      };
      const result = PreferredTerms.getActiveProtectiveProvisions(terms);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Named Rule');
    });
  });

  // =========================================================================
  // isRedemptionAvailable - additional
  // =========================================================================
  describe('isRedemptionAvailable - edge cases', () => {
    it('should return available with null redemptionPrice', () => {
      const terms = {
        hasRedemptionRights: true,
        redemptionStartDate: null,
        redemptionPrice: null,
        redemptionTerms: null
      };
      const result = PreferredTerms.isRedemptionAvailable(terms);
      expect(result.available).toBe(true);
      expect(result.redemptionPrice).toBeNull();
      expect(result.terms).toBeNull();
    });
  });

  // =========================================================================
  // calculateLiquidationPreference - cumulative with no accrued
  // =========================================================================
  describe('calculateLiquidationPreference - edge cases', () => {
    it('should handle CUMULATIVE with no accruedDividends', () => {
      const terms = {
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        dividendType: 'CUMULATIVE'
        // no accruedDividends
      };
      const result = PreferredTerms.calculateLiquidationPreference(terms);
      expect(result).toBe(1000000);
    });
  });
});
