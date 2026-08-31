/**
 * Investor KYC Self-Service Tests
 * Issue #750: Investor KYC/accreditation self-service endpoints
 *
 * Tests investor-facing KYC flows: self-certification, document upload,
 * status check, and the requireAccreditation middleware gating SPV commit.
 */

const httpMocks = require('node-mocks-http');
const kycController = require('../../../controllers/kycController');
const { requireAccreditation } = require('../../../middleware/kycVerification');

jest.mock('../../../services/kycVerificationService');
jest.mock('../../../models/KYCVerification');
jest.mock('../../../models/KYCAuditLog');

const kycService = require('../../../services/kycVerificationService');
const KYCVerification = require('../../../models/KYCVerification');
const KYCAuditLog = require('../../../models/KYCAuditLog');

describe('Investor KYC Self-Service (Issue #750)', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    // Default: investor role user
    req.user = { userId: 'inv-100', id: 'inv-100', role: 'investor', companyId: 'comp-1' };
    req.body = {};
    req.params = {};
    req.query = {};
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  // ─── Self-Certification by Investor ─────────────────────────────────

  describe('POST /kyc/self-certify (investor role)', () => {
    it('should allow an investor to self-certify their accreditation', async () => {
      req.body = {
        investorType: 'accredited_individual',
        attestations: ['income_threshold', 'net_worth'],
        legalName: 'Jane Investor',
        attestationAgreed: true
      };
      const mockResult = {
        verificationId: 'kyc_abc123',
        status: 'approved',
        verificationType: 'self_certification',
        expiresAt: '2027-08-29T00:00:00.000Z'
      };
      kycService.submitSelfCertification.mockResolvedValue(mockResult);

      await kycController.submitSelfCertification(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.verificationId).toBe('kyc_abc123');
      expect(data.data.status).toBe('approved');
      // Verify the investorId was derived from user context
      expect(kycService.submitSelfCertification).toHaveBeenCalledWith(
        'inv-100',
        'comp-1',
        expect.objectContaining({
          investorType: 'accredited_individual',
          legalName: 'Jane Investor',
          attestationAgreed: true
        })
      );
    });

    it('should reject self-certification when attestationAgreed is missing', async () => {
      req.body = {
        investorType: 'accredited_individual',
        legalName: 'Jane Investor'
        // attestationAgreed omitted
      };
      kycService.submitSelfCertification.mockRejectedValue(
        new Error('attestationAgreed must be true to self-certify')
      );

      await kycController.submitSelfCertification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('attestationAgreed');
    });

    it('should use companyId from user context when not in body', async () => {
      req.body = {
        investorType: 'accredited_individual',
        legalName: 'Jane Investor',
        attestationAgreed: true
      };
      kycService.submitSelfCertification.mockResolvedValue({ verificationId: 'kyc_xyz' });

      await kycController.submitSelfCertification(req, res);

      expect(kycService.submitSelfCertification).toHaveBeenCalledWith(
        'inv-100',
        'comp-1', // from req.user.companyId
        expect.any(Object)
      );
    });
  });

  // ─── Document Upload by Investor ────────────────────────────────────

  describe('POST /kyc/documents (investor role)', () => {
    it('should allow an investor to upload accreditation documents', async () => {
      req.body = {
        documents: [
          { type: 'tax_return', url: 'https://storage.example.com/2025-tax.pdf' },
          { type: 'brokerage_statement', url: 'https://storage.example.com/brokerage.pdf' }
        ],
        offeringType: '506c'
      };
      const mockResult = {
        verificationId: 'kyc_doc456',
        status: 'submitted',
        verificationType: 'document_review'
      };
      kycService.submitDocumentVerification.mockResolvedValue(mockResult);

      await kycController.submitDocuments(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('submitted');
      expect(kycService.submitDocumentVerification).toHaveBeenCalledWith(
        'inv-100',
        'comp-1',
        expect.arrayContaining([
          expect.objectContaining({ type: 'tax_return' })
        ]),
        '506c'
      );
    });

    it('should reject document submission with empty documents array', async () => {
      req.body = {
        documents: [],
        offeringType: '506c'
      };
      kycService.submitDocumentVerification.mockRejectedValue(
        new Error('At least one document is required for document verification')
      );

      await kycController.submitDocuments(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('document');
    });
  });

  // ─── Status Check by Investor ───────────────────────────────────────

  describe('GET /kyc/status (investor role)', () => {
    it('should return the investor own accreditation status', async () => {
      req.params = { investorId: 'inv-100' };
      const mockStatus = {
        isAccredited: true,
        status: 'verified',
        expiresAt: '2027-08-29T00:00:00.000Z',
        daysUntilExpiry: 365,
        verificationId: 'kyc_abc123'
      };
      kycService.checkAccreditationStatus.mockResolvedValue(mockStatus);

      await kycController.getVerificationStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.isAccredited).toBe(true);
      expect(data.data.status).toBe('verified');
      expect(data.data.daysUntilExpiry).toBe(365);
    });

    it('should return not_verified status for new investor', async () => {
      req.params = { investorId: 'inv-100' };
      const mockStatus = {
        isAccredited: false,
        status: 'not_verified',
        expiresAt: null,
        daysUntilExpiry: null,
        verificationId: null
      };
      kycService.checkAccreditationStatus.mockResolvedValue(mockStatus);

      await kycController.getVerificationStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.isAccredited).toBe(false);
      expect(data.data.status).toBe('not_verified');
    });
  });

  // ─── requireAccreditation Middleware ─────────────────────────────────

  describe('requireAccreditation middleware (SPV gating)', () => {
    let next;

    beforeEach(() => {
      next = jest.fn();
      KYCAuditLog.create.mockResolvedValue({});
    });

    it('should block investor without accreditation from SPV commit', async () => {
      req.user = { userId: 'inv-200', role: 'investor', companyId: 'comp-1' };
      kycService.checkAccreditationStatus.mockResolvedValue({
        isAccredited: false,
        status: 'not_verified'
      });

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Accredited investor verification required');
      expect(data.accreditationStatus).toBe('not_verified');
    });

    it('should allow accredited investor through to SPV commit', async () => {
      req.user = { userId: 'inv-200', role: 'investor', companyId: 'comp-1' };
      kycService.checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        expiresAt: '2027-08-29T00:00:00.000Z',
        verificationId: 'kyc_abc123'
      });

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.accreditationStatus.isAccredited).toBe(true);
    });

    it('should bypass accreditation check for admin role', async () => {
      req.user = { userId: 'admin-1', role: 'admin', companyId: 'comp-1' };

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      // checkAccreditationStatus should NOT have been called for admin
      expect(kycService.checkAccreditationStatus).not.toHaveBeenCalled();
    });

    it('should bypass accreditation check for founder role', async () => {
      req.user = { userId: 'founder-1', role: 'founder', companyId: 'comp-1' };

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(kycService.checkAccreditationStatus).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = null;

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    it('should log blocked attempt to audit trail', async () => {
      req.user = { userId: 'inv-300', role: 'investor', companyId: 'comp-2' };
      kycService.checkAccreditationStatus.mockResolvedValue({
        isAccredited: false,
        status: 'expired'
      });

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investorId: 'inv-300',
          companyId: 'comp-2',
          action: 'investment_blocked',
          offeringType: 'spv',
          outcome: 'blocked'
        })
      );
    });

    it('should log allowed access to audit trail', async () => {
      req.user = { userId: 'inv-400', role: 'investor', companyId: 'comp-3' };
      kycService.checkAccreditationStatus.mockResolvedValue({
        isAccredited: true,
        status: 'verified',
        expiresAt: '2027-12-31T00:00:00.000Z',
        verificationId: 'kyc_xyz'
      });

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investorId: 'inv-400',
          companyId: 'comp-3',
          action: 'investment_allowed',
          offeringType: 'spv',
          outcome: 'passed'
        })
      );
    });

    it('should return 500 when accreditation check throws', async () => {
      req.user = { userId: 'inv-500', role: 'investor', companyId: 'comp-4' };
      kycService.checkAccreditationStatus.mockRejectedValue(
        new Error('Database connection lost')
      );

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Accreditation check failed');
    });

    it('should block investor with expired accreditation', async () => {
      req.user = { userId: 'inv-600', role: 'investor', companyId: 'comp-5' };
      kycService.checkAccreditationStatus.mockResolvedValue({
        isAccredited: false,
        status: 'expired',
        expiresAt: '2025-01-01T00:00:00.000Z',
        verificationId: 'kyc_old'
      });

      const middleware = requireAccreditation('spv');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.accreditationStatus).toBe('expired');
      expect(data.verificationId).toBe('kyc_old');
    });
  });
});
