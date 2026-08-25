/**
 * KYC Controller Tests
 *
 * Unit tests for KYC/Accredited Investor Verification endpoints:
 * self-certification, document submission, status checks, reviews,
 * pending lists, and audit log retrieval.
 */

const httpMocks = require('node-mocks-http');
const kycController = require('../../../controllers/kycController');

jest.mock('../../../services/kycVerificationService');
jest.mock('../../../models/KYCVerification');
jest.mock('../../../models/KYCAuditLog');

const kycService = require('../../../services/kycVerificationService');
const KYCVerification = require('../../../models/KYCVerification');
const KYCAuditLog = require('../../../models/KYCAuditLog');

describe('KYCController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user-1', id: 'user-1', companyId: 'comp-1' };
    req.body = {};
    req.params = {};
    req.query = {};
  });

  // ─── submitSelfCertification ──────────────────────────────────────────

  describe('submitSelfCertification', () => {
    it('should submit self-certification successfully', async () => {
      req.body = {
        investorId: 'inv-1',
        companyId: 'comp-1',
        investorType: 'accredited_individual',
        attestations: ['income_threshold'],
        legalName: 'John Doe',
        attestationAgreed: true
      };
      const mockResult = { verificationId: 'ver-1', status: 'approved' };
      kycService.submitSelfCertification.mockResolvedValue(mockResult);

      await kycController.submitSelfCertification(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.verificationId).toBe('ver-1');
    });

    it('should use userId from user when investorId not in body', async () => {
      req.body = {
        companyId: 'comp-1',
        investorType: 'accredited_individual'
      };
      kycService.submitSelfCertification.mockResolvedValue({ verificationId: 'ver-1' });

      await kycController.submitSelfCertification(req, res);

      expect(kycService.submitSelfCertification).toHaveBeenCalledWith(
        'user-1',
        'comp-1',
        expect.any(Object)
      );
    });

    it('should use user.id when userId is not available', async () => {
      req.user = { id: 'alt-user' };
      req.body = {
        companyId: 'comp-1',
        investorType: 'accredited_individual'
      };
      kycService.submitSelfCertification.mockResolvedValue({ verificationId: 'ver-1' });

      await kycController.submitSelfCertification(req, res);

      expect(kycService.submitSelfCertification).toHaveBeenCalledWith(
        'alt-user',
        'comp-1',
        expect.any(Object)
      );
    });

    it('should return 400 when investorId cannot be determined', async () => {
      req.user = {};
      req.body = { companyId: 'comp-1' };

      await kycController.submitSelfCertification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('investorId is required');
    });

    it('should return 400 when companyId missing', async () => {
      req.user = { userId: 'user-1' };
      req.body = { investorId: 'inv-1' };

      await kycController.submitSelfCertification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('companyId is required');
    });

    it('should use companyId from user when not in body', async () => {
      req.body = {
        investorId: 'inv-1',
        investorType: 'accredited_individual'
      };
      kycService.submitSelfCertification.mockResolvedValue({ verificationId: 'ver-1' });

      await kycController.submitSelfCertification(req, res);

      expect(kycService.submitSelfCertification).toHaveBeenCalledWith(
        'inv-1',
        'comp-1',
        expect.any(Object)
      );
    });

    it('should return 400 on service error', async () => {
      req.body = { investorId: 'inv-1', companyId: 'comp-1' };
      kycService.submitSelfCertification.mockRejectedValue(new Error('Missing attestations'));

      await kycController.submitSelfCertification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Missing attestations');
    });
  });

  // ─── submitDocuments ──────────────────────────────────────────────────

  describe('submitDocuments', () => {
    it('should submit documents for verification', async () => {
      req.body = {
        investorId: 'inv-1',
        companyId: 'comp-1',
        documents: [{ type: 'tax_return', url: 'https://example.com/doc.pdf' }],
        offeringType: '506c'
      };
      const mockResult = { verificationId: 'ver-2', status: 'submitted' };
      kycService.submitDocumentVerification.mockResolvedValue(mockResult);

      await kycController.submitDocuments(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.data.verificationId).toBe('ver-2');
    });

    it('should use userId when investorId not in body', async () => {
      req.body = {
        companyId: 'comp-1',
        documents: [{ type: 'tax_return' }]
      };
      kycService.submitDocumentVerification.mockResolvedValue({ verificationId: 'ver-2' });

      await kycController.submitDocuments(req, res);

      expect(kycService.submitDocumentVerification).toHaveBeenCalledWith(
        'user-1',
        'comp-1',
        expect.any(Array),
        undefined
      );
    });

    it('should return 400 when investorId cannot be determined', async () => {
      req.user = {};
      req.body = { companyId: 'comp-1', documents: [] };

      await kycController.submitDocuments(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('investorId is required');
    });

    it('should return 400 when companyId missing', async () => {
      req.user = { userId: 'user-1' };
      req.body = { investorId: 'inv-1', documents: [] };

      await kycController.submitDocuments(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 on service error', async () => {
      req.body = {
        investorId: 'inv-1',
        companyId: 'comp-1',
        documents: []
      };
      kycService.submitDocumentVerification.mockRejectedValue(new Error('Invalid documents'));

      await kycController.submitDocuments(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── getVerificationStatus ────────────────────────────────────────────

  describe('getVerificationStatus', () => {
    it('should return verification status', async () => {
      req.params = { investorId: 'inv-1' };
      const mockStatus = { accredited: true, expiresAt: '2027-01-01' };
      kycService.checkAccreditationStatus.mockResolvedValue(mockStatus);

      await kycController.getVerificationStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.accredited).toBe(true);
    });

    it('should return 400 when investorId missing', async () => {
      req.params = {};

      await kycController.getVerificationStatus(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('investorId is required');
    });

    it('should return 500 on service error', async () => {
      req.params = { investorId: 'inv-1' };
      kycService.checkAccreditationStatus.mockRejectedValue(new Error('DB error'));

      await kycController.getVerificationStatus(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getVerificationHistory ───────────────────────────────────────────

  describe('getVerificationHistory', () => {
    it('should return verification history', async () => {
      req.params = { investorId: 'inv-1' };
      KYCVerification.find.mockResolvedValue([
        { verificationId: 'v1', status: 'approved' },
        { verificationId: 'v2', status: 'expired' }
      ]);

      await kycController.getVerificationHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(2);
    });

    it('should return 400 when investorId missing', async () => {
      req.params = {};

      await kycController.getVerificationHistory(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on error', async () => {
      req.params = { investorId: 'inv-1' };
      KYCVerification.find.mockRejectedValue(new Error('DB error'));

      await kycController.getVerificationHistory(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── reviewVerification ───────────────────────────────────────────────

  describe('reviewVerification', () => {
    it('should approve a verification', async () => {
      req.params = { verificationId: 'ver-1' };
      req.body = { action: 'approve', note: 'All docs verified' };
      const mockResult = { verificationId: 'ver-1', status: 'approved' };
      kycService.approveVerification.mockResolvedValue(mockResult);

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.status).toBe('approved');
      expect(kycService.approveVerification).toHaveBeenCalledWith('ver-1', 'user-1', 'All docs verified');
    });

    it('should reject a verification with reason', async () => {
      req.params = { verificationId: 'ver-1' };
      req.body = { action: 'reject', reason: 'Docs expired' };
      const mockResult = { verificationId: 'ver-1', status: 'rejected' };
      kycService.rejectVerification.mockResolvedValue(mockResult);

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(200);
      expect(kycService.rejectVerification).toHaveBeenCalledWith('ver-1', 'user-1', 'Docs expired');
    });

    it('should return 400 when verificationId missing', async () => {
      req.params = {};
      req.body = { action: 'approve' };

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('verificationId is required');
    });

    it('should return 400 for invalid action', async () => {
      req.params = { verificationId: 'ver-1' };
      req.body = { action: 'delete' };

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('action must be');
    });

    it('should return 400 when action is missing', async () => {
      req.params = { verificationId: 'ver-1' };
      req.body = {};

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when rejecting without reason', async () => {
      req.params = { verificationId: 'ver-1' };
      req.body = { action: 'reject' };

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('reason is required for rejection');
    });

    it('should return 404 when verification not found', async () => {
      req.params = { verificationId: 'nonexistent' };
      req.body = { action: 'approve' };
      kycService.approveVerification.mockRejectedValue(new Error('Verification not found'));

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for other service errors', async () => {
      req.params = { verificationId: 'ver-1' };
      req.body = { action: 'approve' };
      kycService.approveVerification.mockRejectedValue(new Error('Invalid state'));

      await kycController.reviewVerification(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should use user.id as fallback for reviewerId', async () => {
      req.user = { id: 'alt-reviewer' };
      req.params = { verificationId: 'ver-1' };
      req.body = { action: 'approve', note: 'OK' };
      kycService.approveVerification.mockResolvedValue({ status: 'approved' });

      await kycController.reviewVerification(req, res);

      expect(kycService.approveVerification).toHaveBeenCalledWith('ver-1', 'alt-reviewer', 'OK');
    });
  });

  // ─── listPendingVerifications ─────────────────────────────────────────

  describe('listPendingVerifications', () => {
    it('should return all pending verifications', async () => {
      KYCVerification.find.mockResolvedValue([
        { verificationId: 'v1', status: 'submitted' },
        { verificationId: 'v2', status: 'under_review' },
        { verificationId: 'v3', status: 'approved' }
      ]);

      await kycController.listPendingVerifications(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(2); // Only submitted and under_review
    });

    it('should filter by companyId when provided', async () => {
      req.query = { companyId: 'comp-1' };
      KYCVerification.find.mockResolvedValue([
        { verificationId: 'v1', status: 'submitted', companyId: 'comp-1' }
      ]);

      await kycController.listPendingVerifications(req, res);

      expect(KYCVerification.find).toHaveBeenCalledWith({ companyId: 'comp-1' });
    });

    it('should query without filter when companyId not provided', async () => {
      req.query = {};
      KYCVerification.find.mockResolvedValue([]);

      await kycController.listPendingVerifications(req, res);

      expect(KYCVerification.find).toHaveBeenCalledWith({});
    });

    it('should return empty array when none pending', async () => {
      KYCVerification.find.mockResolvedValue([
        { verificationId: 'v1', status: 'approved' }
      ]);

      await kycController.listPendingVerifications(req, res);

      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(0);
    });

    it('should return 500 on error', async () => {
      KYCVerification.find.mockRejectedValue(new Error('DB error'));

      await kycController.listPendingVerifications(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getAuditLog ──────────────────────────────────────────────────────

  describe('getAuditLog', () => {
    it('should return audit logs without filters', async () => {
      KYCAuditLog.find.mockResolvedValue([
        { action: 'verification_submitted', investorId: 'inv-1' },
        { action: 'verification_approved', investorId: 'inv-1' }
      ]);

      await kycController.getAuditLog(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(2);
      expect(KYCAuditLog.find).toHaveBeenCalledWith({});
    });

    it('should filter by investorId', async () => {
      req.query = { investorId: 'inv-1' };
      KYCAuditLog.find.mockResolvedValue([]);

      await kycController.getAuditLog(req, res);

      expect(KYCAuditLog.find).toHaveBeenCalledWith({ investorId: 'inv-1' });
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'comp-1' };
      KYCAuditLog.find.mockResolvedValue([]);

      await kycController.getAuditLog(req, res);

      expect(KYCAuditLog.find).toHaveBeenCalledWith({ companyId: 'comp-1' });
    });

    it('should filter by both investorId and companyId', async () => {
      req.query = { investorId: 'inv-1', companyId: 'comp-1' };
      KYCAuditLog.find.mockResolvedValue([]);

      await kycController.getAuditLog(req, res);

      expect(KYCAuditLog.find).toHaveBeenCalledWith({
        investorId: 'inv-1',
        companyId: 'comp-1'
      });
    });

    it('should return 500 on error', async () => {
      KYCAuditLog.find.mockRejectedValue(new Error('DB error'));

      await kycController.getAuditLog(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
