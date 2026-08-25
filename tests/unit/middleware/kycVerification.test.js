/**
 * KYC Verification Middleware Tests
 * Issue #41: Middleware Test Suite
 *
 * Tests for: requireAccreditation, require506cVerification,
 * requireSPVRoleEligibility
 */

jest.mock('../../../services/kycVerificationService');
jest.mock('../../../models/KYCVerification');
jest.mock('../../../models/KYCAuditLog');

const { checkAccreditationStatus } = require('../../../services/kycVerificationService');
const KYCVerification = require('../../../models/KYCVerification');
const KYCAuditLog = require('../../../models/KYCAuditLog');

const {
  requireAccreditation,
  require506cVerification,
  requireSPVRoleEligibility
} = require('../../../middleware/kycVerification');

describe('KYC Verification Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: {
        userId: 'investor-1',
        role: 'investor',
        companyId: 'comp-1'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    KYCAuditLog.create = jest.fn().mockResolvedValue({});
  });

  // ---------------------------------------------------------------
  // requireAccreditation
  // ---------------------------------------------------------------
  describe('requireAccreditation', () => {
    it('should return 401 when no user on request', async () => {
      req.user = null;
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Authentication required' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should bypass check for admin role', async () => {
      req.user.role = 'admin';
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(checkAccreditationStatus).not.toHaveBeenCalled();
    });

    it('should bypass check for founder role', async () => {
      req.user.role = 'founder';
      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass check for super_admin role', async () => {
      req.user.role = 'super_admin';
      const middleware = requireAccreditation('securities');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass check for manager role', async () => {
      req.user.role = 'manager';
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass check for accountant role', async () => {
      req.user.role = 'accountant';
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass check for employee role', async () => {
      req.user.role = 'employee';
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass check for service_provider role', async () => {
      req.user.role = 'service_provider';
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when investor identity not found', async () => {
      req.user = { role: 'investor' }; // no userId/investorId
      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Investor identity not found on request' })
      );
    });

    it('should return 403 when investor is not accredited', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: false,
        status: 'pending',
        verificationId: 'ver-1'
      });

      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Accredited investor verification required',
          accreditationStatus: 'pending'
        })
      );
      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'investment_blocked',
          offeringType: 'safe',
          outcome: 'blocked'
        })
      );
    });

    it('should allow accredited investor and log access', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        expiresAt: '2027-01-01',
        verificationId: 'ver-2'
      });

      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.accreditationStatus.isAccredited).toBe(true);
      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'investment_allowed',
          outcome: 'passed'
        })
      );
    });

    it('should use investorId field when available', async () => {
      req.user.investorId = 'inv-specific';
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified'
      });

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(checkAccreditationStatus).toHaveBeenCalledWith('inv-specific');
    });

    it('should return 500 on service error', async () => {
      checkAccreditationStatus.mockRejectedValue(new Error('Service down'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const middleware = requireAccreditation('safe');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Accreditation check failed' })
      );

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // require506cVerification
  // ---------------------------------------------------------------
  describe('require506cVerification', () => {
    it('should return 401 when no user on request', async () => {
      req.user = null;
      await require506cVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should bypass for admin role', async () => {
      req.user.role = 'admin';
      await require506cVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass for founder role', async () => {
      req.user.role = 'founder';
      await require506cVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when investor identity not found', async () => {
      req.user = { role: 'investor' }; // no userId
      await require506cVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Investor identity not found' })
      );
    });

    it('should return 403 when investor is not accredited', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: false,
        status: 'pending'
      });

      await require506cVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Accredited investor verification required for 506(c) offering'
        })
      );
    });

    it('should deny when verification type is self_certification for 506(c)', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        verificationId: 'ver-506c'
      });
      KYCVerification.findOne = jest.fn().mockResolvedValue({
        verificationId: 'ver-506c',
        verificationType: 'self_certification'
      });

      await require506cVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '506(c) offerings require document review or third-party letter verification',
          currentVerificationType: 'self_certification'
        })
      );
    });

    it('should allow when verification type is document_review', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        verificationId: 'ver-doc'
      });
      KYCVerification.findOne = jest.fn().mockResolvedValue({
        verificationId: 'ver-doc',
        verificationType: 'document_review'
      });

      await require506cVerification(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.accreditationStatus.isAccredited).toBe(true);
    });

    it('should allow when verification type is third_party_letter', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        verificationId: 'ver-letter'
      });
      KYCVerification.findOne = jest.fn().mockResolvedValue({
        verificationId: 'ver-letter',
        verificationType: 'third_party_letter'
      });

      await require506cVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow when no verification record found (no verificationId)', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified'
        // no verificationId
      });

      await require506cVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow when verification record not found in DB', async () => {
      checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        verificationId: 'ver-missing'
      });
      KYCVerification.findOne = jest.fn().mockResolvedValue(null);

      await require506cVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      checkAccreditationStatus.mockRejectedValue(new Error('Service error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await require506cVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Verification check failed' })
      );

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // requireSPVRoleEligibility
  // ---------------------------------------------------------------
  describe('requireSPVRoleEligibility', () => {
    it('should return 401 when no user on request', () => {
      req.user = null;
      requireSPVRoleEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Authentication required' })
      );
    });

    it('should allow investor role', () => {
      req.user.role = 'investor';
      requireSPVRoleEligibility(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow founder role', () => {
      req.user.role = 'founder';
      requireSPVRoleEligibility(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin role', () => {
      req.user.role = 'admin';
      requireSPVRoleEligibility(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow super_admin role', () => {
      req.user.role = 'super_admin';
      requireSPVRoleEligibility(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny employee role', () => {
      req.user.role = 'employee';
      requireSPVRoleEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'SPV access restricted to investors and founders' })
      );
    });

    it('should deny manager role', () => {
      req.user.role = 'manager';
      requireSPVRoleEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should deny user with null role', () => {
      req.user.role = null;
      requireSPVRoleEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should deny user with undefined role', () => {
      req.user = { userId: 'u1' }; // no role
      requireSPVRoleEligibility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
