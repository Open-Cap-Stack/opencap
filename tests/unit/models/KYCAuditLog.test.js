/**
 * KYCAuditLog Model Unit Tests
 * Covers the create method and exported constants
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock uuid before requiring the module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234')
}));

// Mock ZeroDBModel's createModel
const mockCreate = jest.fn();
const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockCountDocuments = jest.fn();

jest.mock('../../../models/base/ZeroDBModel', () => ({
  createModel: jest.fn(() => ({
    create: mockCreate,
    find: { bind: jest.fn(() => mockFind) },
    findOne: { bind: jest.fn(() => mockFindOne) },
    countDocuments: { bind: jest.fn(() => mockCountDocuments) }
  }))
}));

const KYCAuditLog = require('../../../models/KYCAuditLog');

describe('KYCAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constants', () => {
    it('should export valid ACTIONS array', () => {
      expect(KYCAuditLog.ACTIONS).toEqual([
        'investment_blocked',
        'investment_allowed',
        'verification_submitted',
        'verification_approved',
        'verification_rejected',
        'accreditation_expired'
      ]);
    });

    it('should export valid OFFERING_TYPES array', () => {
      expect(KYCAuditLog.OFFERING_TYPES).toEqual(['safe', 'spv', 'securities']);
    });

    it('should export valid OUTCOMES array', () => {
      expect(KYCAuditLog.OUTCOMES).toEqual(['passed', 'blocked', 'warning']);
    });
  });

  describe('create', () => {
    it('should create an audit log with all fields provided', async () => {
      const inputData = {
        auditId: 'custom-audit-id',
        investorId: 'inv_001',
        companyId: 'comp_001',
        action: 'investment_blocked',
        offeringType: 'safe',
        offeringId: 'offer_001',
        verificationId: 'ver_001',
        outcome: 'blocked',
        reason: 'Accreditation expired'
      };

      const expectedRecord = {
        auditId: 'custom-audit-id',
        investorId: 'inv_001',
        companyId: 'comp_001',
        action: 'investment_blocked',
        offeringType: 'safe',
        offeringId: 'offer_001',
        verificationId: 'ver_001',
        outcome: 'blocked',
        reason: 'Accreditation expired',
        createdAt: expect.any(String)
      };

      mockCreate.mockResolvedValue(expectedRecord);

      const result = await KYCAuditLog.create(inputData);

      expect(mockCreate).toHaveBeenCalledWith(expectedRecord);
      expect(result).toEqual(expectedRecord);
    });

    it('should generate auditId when not provided', async () => {
      const inputData = {
        investorId: 'inv_002',
        action: 'verification_submitted',
        outcome: 'passed'
      };

      mockCreate.mockResolvedValue({});

      await KYCAuditLog.create(inputData);

      const calledWith = mockCreate.mock.calls[0][0];
      expect(calledWith.auditId).toBe('kyc_audit_mocked-uuid-1234');
    });

    it('should default optional fields to null', async () => {
      const inputData = {
        investorId: 'inv_003',
        action: 'investment_allowed',
        outcome: 'passed'
      };

      mockCreate.mockResolvedValue({});

      await KYCAuditLog.create(inputData);

      const calledWith = mockCreate.mock.calls[0][0];
      expect(calledWith.companyId).toBeNull();
      expect(calledWith.offeringType).toBeNull();
      expect(calledWith.offeringId).toBeNull();
      expect(calledWith.verificationId).toBeNull();
      expect(calledWith.reason).toBeNull();
    });

    it('should set createdAt to an ISO timestamp', async () => {
      mockCreate.mockResolvedValue({});

      await KYCAuditLog.create({
        investorId: 'inv_004',
        action: 'verification_approved',
        outcome: 'passed'
      });

      const calledWith = mockCreate.mock.calls[0][0];
      // Verify it's a valid ISO date string
      expect(new Date(calledWith.createdAt).toISOString()).toBe(calledWith.createdAt);
    });
  });

  describe('delegated methods', () => {
    it('should expose find as a bound method', () => {
      expect(KYCAuditLog.find).toBe(mockFind);
    });

    it('should expose findOne as a bound method', () => {
      expect(KYCAuditLog.findOne).toBe(mockFindOne);
    });

    it('should expose countDocuments as a bound method', () => {
      expect(KYCAuditLog.countDocuments).toBe(mockCountDocuments);
    });
  });
});
