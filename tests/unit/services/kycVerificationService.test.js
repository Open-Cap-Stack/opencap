/**
 * KYC Verification Service Test Suite
 *
 * Comprehensive tests for accredited investor verification,
 * self-certification, document review, and accreditation lifecycle.
 */

jest.mock('../../../models/KYCVerification');
jest.mock('../../../models/KYCAuditLog');
jest.mock('../../../models/Investor');

const KYCVerification = require('../../../models/KYCVerification');
const KYCAuditLog = require('../../../models/KYCAuditLog');
const Investor = require('../../../models/Investor');

const {
  checkAccreditationStatus,
  submitSelfCertification,
  submitDocumentVerification,
  approveVerification,
  rejectVerification,
  ACCREDITATION_VALIDITY_DAYS
} = require('../../../services/kycVerificationService');

describe('KYC Verification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    KYCAuditLog.create = jest.fn().mockResolvedValue({});
    Investor.updateByInvestorId = jest.fn().mockResolvedValue({});
  });

  // ── ACCREDITATION_VALIDITY_DAYS constant ──
  describe('ACCREDITATION_VALIDITY_DAYS', () => {
    it('should export a 365-day validity window', () => {
      expect(ACCREDITATION_VALIDITY_DAYS).toBe(365);
    });
  });

  // ── checkAccreditationStatus ──
  describe('checkAccreditationStatus', () => {
    it('should return not_found when investor does not exist', async () => {
      Investor.findOne = jest.fn().mockResolvedValue(null);

      const result = await checkAccreditationStatus('inv_999');

      expect(result).toEqual({
        isAccredited: false,
        status: 'not_found',
        expiresAt: null,
        daysUntilExpiry: null,
        verificationId: null
      });
      expect(Investor.findOne).toHaveBeenCalledWith({ investorId: 'inv_999' });
    });

    it('should return not_verified when investor is not accredited', async () => {
      Investor.findOne = jest.fn().mockResolvedValue({
        investorId: 'inv_1',
        accreditedInvestor: false,
        kycVerificationId: 'kyc_abc'
      });

      const result = await checkAccreditationStatus('inv_1');

      expect(result.isAccredited).toBe(false);
      expect(result.status).toBe('not_verified');
      expect(result.verificationId).toBe('kyc_abc');
    });

    it('should return not_verified when accreditedInvestor is undefined', async () => {
      Investor.findOne = jest.fn().mockResolvedValue({
        investorId: 'inv_1'
      });

      const result = await checkAccreditationStatus('inv_1');

      expect(result.isAccredited).toBe(false);
      expect(result.status).toBe('not_verified');
      expect(result.verificationId).toBeNull();
    });

    it('should return expired when accreditation date has passed', async () => {
      const expired = new Date(Date.now() - 86400000); // yesterday
      Investor.findOne = jest.fn().mockResolvedValue({
        investorId: 'inv_1',
        companyId: 'comp_1',
        accreditedInvestor: true,
        accreditationExpiryDate: expired.toISOString(),
        kycVerificationId: 'kyc_old'
      });

      const result = await checkAccreditationStatus('inv_1');

      expect(result.isAccredited).toBe(false);
      expect(result.status).toBe('expired');
      expect(result.daysUntilExpiry).toBe(0);
      expect(result.verificationId).toBe('kyc_old');
      expect(Investor.updateByInvestorId).toHaveBeenCalledWith('inv_1', { accreditedInvestor: false });
      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investorId: 'inv_1',
          action: 'accreditation_expired',
          outcome: 'blocked'
        })
      );
    });

    it('should return verified with daysUntilExpiry when accreditation is valid', async () => {
      const futureDate = new Date(Date.now() + 30 * 86400000); // 30 days from now
      Investor.findOne = jest.fn().mockResolvedValue({
        investorId: 'inv_1',
        accreditedInvestor: true,
        accreditationExpiryDate: futureDate.toISOString(),
        kycVerificationId: 'kyc_valid'
      });

      const result = await checkAccreditationStatus('inv_1');

      expect(result.isAccredited).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.daysUntilExpiry).toBeGreaterThanOrEqual(29);
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(31);
      expect(result.verificationId).toBe('kyc_valid');
    });

    it('should return verified with null daysUntilExpiry when no expiry date is set', async () => {
      Investor.findOne = jest.fn().mockResolvedValue({
        investorId: 'inv_1',
        accreditedInvestor: true,
        accreditationExpiryDate: null,
        kycVerificationId: 'kyc_nox'
      });

      const result = await checkAccreditationStatus('inv_1');

      expect(result.isAccredited).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.daysUntilExpiry).toBeNull();
      expect(result.expiresAt).toBeNull();
    });

    it('should not expire if accreditedInvestor is false even with past expiry', async () => {
      const expired = new Date(Date.now() - 86400000);
      Investor.findOne = jest.fn().mockResolvedValue({
        investorId: 'inv_1',
        accreditedInvestor: false,
        accreditationExpiryDate: expired.toISOString()
      });

      const result = await checkAccreditationStatus('inv_1');

      expect(result.isAccredited).toBe(false);
      expect(result.status).toBe('not_verified');
      // Should NOT call updateByInvestorId since already not accredited
      expect(Investor.updateByInvestorId).not.toHaveBeenCalled();
    });
  });

  // ── submitSelfCertification ──
  describe('submitSelfCertification', () => {
    it('should throw when certData is null', async () => {
      await expect(submitSelfCertification('inv_1', 'comp_1', null))
        .rejects.toThrow('Self-certification requires investorType');
    });

    it('should throw when investorType is missing', async () => {
      await expect(submitSelfCertification('inv_1', 'comp_1', {}))
        .rejects.toThrow('Self-certification requires investorType');
    });

    it('should throw when legalName is missing', async () => {
      await expect(submitSelfCertification('inv_1', 'comp_1', { investorType: 'income' }))
        .rejects.toThrow('legalName is required for self-certification');
    });

    it('should throw when attestationAgreed is not true', async () => {
      await expect(submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'income',
        legalName: 'John Doe',
        attestationAgreed: false
      })).rejects.toThrow('attestationAgreed must be true to self-certify');
    });

    it('should throw when attestationAgreed is missing', async () => {
      await expect(submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'income',
        legalName: 'John Doe'
      })).rejects.toThrow('attestationAgreed must be true to self-certify');
    });

    it('should create verification with auto-approved status for 506b', async () => {
      const mockVerification = {
        verificationId: 'kyc_mock',
        status: 'approved',
        verificationType: 'self_certification',
        offeringType: '506b'
      };
      KYCVerification.create = jest.fn().mockResolvedValue(mockVerification);

      const result = await submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'income',
        legalName: 'John Doe',
        attestationAgreed: true,
        attestations: ['att1']
      });

      expect(result).toEqual(mockVerification);
      expect(KYCVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investorId: 'inv_1',
          companyId: 'comp_1',
          verificationType: 'self_certification',
          offeringType: '506b',
          status: 'approved',
          reviewedBy: 'system_auto_approve'
        })
      );
    });

    it('should update investor record with accredited status', async () => {
      KYCVerification.create = jest.fn().mockResolvedValue({
        verificationId: 'kyc_new'
      });

      await submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'net_worth',
        legalName: 'Jane Smith',
        attestationAgreed: true
      });

      expect(Investor.updateByInvestorId).toHaveBeenCalledWith('inv_1',
        expect.objectContaining({
          accreditedInvestor: true,
          accreditationMethod: 'net_worth',
          kycVerificationId: 'kyc_new'
        })
      );
    });

    it('should write an audit log entry on self-certification', async () => {
      KYCVerification.create = jest.fn().mockResolvedValue({
        verificationId: 'kyc_audit_test'
      });

      await submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'income',
        legalName: 'Test User',
        attestationAgreed: true
      });

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investorId: 'inv_1',
          companyId: 'comp_1',
          action: 'verification_submitted',
          outcome: 'passed'
        })
      );
    });

    it('should set expiresAt to 365 days from now', async () => {
      KYCVerification.create = jest.fn().mockImplementation(data => data);

      const result = await submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'income',
        legalName: 'Test',
        attestationAgreed: true
      });

      const expires = new Date(result.expiresAt);
      const submitted = new Date(result.submittedAt);
      const diffDays = Math.round((expires - submitted) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(365);
    });

    it('should default attestations to empty array when not provided', async () => {
      KYCVerification.create = jest.fn().mockImplementation(data => data);

      const result = await submitSelfCertification('inv_1', 'comp_1', {
        investorType: 'income',
        legalName: 'Test',
        attestationAgreed: true
      });

      expect(result.selfCertification.attestations).toEqual([]);
    });
  });

  // ── submitDocumentVerification ──
  describe('submitDocumentVerification', () => {
    it('should throw when documents array is empty', async () => {
      await expect(submitDocumentVerification('inv_1', 'comp_1', []))
        .rejects.toThrow('At least one document is required');
    });

    it('should throw when documents is null', async () => {
      await expect(submitDocumentVerification('inv_1', 'comp_1', null))
        .rejects.toThrow('At least one document is required');
    });

    it('should throw when documents is undefined', async () => {
      await expect(submitDocumentVerification('inv_1', 'comp_1'))
        .rejects.toThrow('At least one document is required');
    });

    it('should create verification with submitted status', async () => {
      const docs = [{ name: 'tax_return.pdf', url: 'https://s3/file', type: 'tax_return' }];
      KYCVerification.create = jest.fn().mockImplementation(data => data);

      const result = await submitDocumentVerification('inv_1', 'comp_1', docs);

      expect(result.status).toBe('submitted');
      expect(result.verificationType).toBe('document_review');
      expect(result.documents).toEqual(docs);
    });

    it('should default offering type to 506c', async () => {
      const docs = [{ name: 'doc.pdf', url: 'https://example.com', type: 'other' }];
      KYCVerification.create = jest.fn().mockImplementation(data => data);

      const result = await submitDocumentVerification('inv_1', 'comp_1', docs);
      expect(result.offeringType).toBe('506c');
    });

    it('should accept custom offering type', async () => {
      const docs = [{ name: 'doc.pdf', url: 'https://example.com', type: 'other' }];
      KYCVerification.create = jest.fn().mockImplementation(data => data);

      const result = await submitDocumentVerification('inv_1', 'comp_1', docs, 'general');
      expect(result.offeringType).toBe('general');
    });

    it('should write audit log with warning outcome', async () => {
      const docs = [{ name: 'doc.pdf', url: 'https://example.com', type: 'other' }];
      KYCVerification.create = jest.fn().mockImplementation(data => data);

      await submitDocumentVerification('inv_1', 'comp_1', docs);

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'verification_submitted',
          outcome: 'warning',
          reason: 'Document verification submitted, awaiting review'
        })
      );
    });
  });

  // ── approveVerification ──
  describe('approveVerification', () => {
    it('should throw when verification not found', async () => {
      KYCVerification.findOne = jest.fn().mockResolvedValue(null);

      await expect(approveVerification('kyc_notfound', 'admin_1', 'Looks good'))
        .rejects.toThrow('Verification not found');
    });

    it('should throw when verification is already approved', async () => {
      KYCVerification.findOne = jest.fn().mockResolvedValue({
        verificationId: 'kyc_1',
        status: 'approved'
      });

      await expect(approveVerification('kyc_1', 'admin_1', 'Again'))
        .rejects.toThrow('Verification is already approved');
    });

    it('should approve a submitted verification', async () => {
      const verification = {
        verificationId: 'kyc_1',
        investorId: 'inv_1',
        companyId: 'comp_1',
        status: 'submitted',
        reviewNotes: []
      };
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce(verification) // first call in approve
        .mockResolvedValueOnce({ ...verification, status: 'approved' }); // return after update
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      const result = await approveVerification('kyc_1', 'admin_1', 'All clear');

      expect(KYCVerification.updateOne).toHaveBeenCalledWith(
        { verificationId: 'kyc_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'approved',
            reviewedBy: 'admin_1'
          })
        })
      );
      expect(result.status).toBe('approved');
    });

    it('should update investor accreditation on approval', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted',
          reviewNotes: []
        })
        .mockResolvedValueOnce({ status: 'approved' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await approveVerification('kyc_1', 'admin_1');

      expect(Investor.updateByInvestorId).toHaveBeenCalledWith('inv_1',
        expect.objectContaining({
          accreditedInvestor: true,
          kycVerificationId: 'kyc_1'
        })
      );
    });

    it('should append reviewer note when provided', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted',
          reviewNotes: [{ reviewerId: 'admin_0', note: 'first note', createdAt: '2024-01-01' }]
        })
        .mockResolvedValueOnce({ status: 'approved' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await approveVerification('kyc_1', 'admin_1', 'second note');

      const updateCall = KYCVerification.updateOne.mock.calls[0];
      const setData = updateCall[1].$set;
      expect(setData.reviewNotes).toHaveLength(2);
      expect(setData.reviewNotes[1].note).toBe('second note');
      expect(setData.reviewNotes[1].reviewerId).toBe('admin_1');
    });

    it('should not append note when note is not provided', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted',
          reviewNotes: []
        })
        .mockResolvedValueOnce({ status: 'approved' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await approveVerification('kyc_1', 'admin_1');

      const setData = KYCVerification.updateOne.mock.calls[0][1].$set;
      expect(setData.reviewNotes).toHaveLength(0);
    });

    it('should log audit entry on approval', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted',
          reviewNotes: []
        })
        .mockResolvedValueOnce({ status: 'approved' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await approveVerification('kyc_1', 'admin_1', 'Approved');

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'verification_approved',
          outcome: 'passed',
          reason: 'Approved'
        })
      );
    });

    it('should use default reason when note is not provided', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted',
          reviewNotes: []
        })
        .mockResolvedValueOnce({ status: 'approved' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await approveVerification('kyc_1', 'admin_1');

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Verification approved by reviewer'
        })
      );
    });

    it('should handle null reviewNotes in verification', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted',
          reviewNotes: null
        })
        .mockResolvedValueOnce({ status: 'approved' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await approveVerification('kyc_1', 'admin_1', 'note');

      const setData = KYCVerification.updateOne.mock.calls[0][1].$set;
      expect(setData.reviewNotes).toHaveLength(1);
    });
  });

  // ── rejectVerification ──
  describe('rejectVerification', () => {
    it('should throw when verification not found', async () => {
      KYCVerification.findOne = jest.fn().mockResolvedValue(null);

      await expect(rejectVerification('kyc_notfound', 'admin_1', 'Invalid'))
        .rejects.toThrow('Verification not found');
    });

    it('should reject a submitted verification', async () => {
      const verification = {
        verificationId: 'kyc_1',
        investorId: 'inv_1',
        companyId: 'comp_1',
        status: 'submitted'
      };
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce(verification)
        .mockResolvedValueOnce({ ...verification, status: 'rejected' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      const result = await rejectVerification('kyc_1', 'admin_1', 'Docs incomplete');

      expect(KYCVerification.updateOne).toHaveBeenCalledWith(
        { verificationId: 'kyc_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'rejected',
            reviewedBy: 'admin_1',
            rejectionReason: 'Docs incomplete'
          })
        })
      );
      expect(result.status).toBe('rejected');
    });

    it('should mark investor as not accredited on rejection', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted'
        })
        .mockResolvedValueOnce({ status: 'rejected' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await rejectVerification('kyc_1', 'admin_1', 'Bad docs');

      expect(Investor.updateByInvestorId).toHaveBeenCalledWith('inv_1', {
        accreditedInvestor: false
      });
    });

    it('should use default reason when no reason is provided', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted'
        })
        .mockResolvedValueOnce({ status: 'rejected' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await rejectVerification('kyc_1', 'admin_1');

      const setData = KYCVerification.updateOne.mock.calls[0][1].$set;
      expect(setData.rejectionReason).toBe('No reason provided');
    });

    it('should log audit entry for rejection', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted'
        })
        .mockResolvedValueOnce({ status: 'rejected' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await rejectVerification('kyc_1', 'admin_1', 'Fraudulent');

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'verification_rejected',
          outcome: 'blocked',
          reason: 'Fraudulent'
        })
      );
    });

    it('should use default audit reason when reason is falsy', async () => {
      KYCVerification.findOne = jest.fn()
        .mockResolvedValueOnce({
          verificationId: 'kyc_1',
          investorId: 'inv_1',
          companyId: 'comp_1',
          status: 'submitted'
        })
        .mockResolvedValueOnce({ status: 'rejected' });
      KYCVerification.updateOne = jest.fn().mockResolvedValue({});

      await rejectVerification('kyc_1', 'admin_1', '');

      expect(KYCAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Verification rejected'
        })
      );
    });
  });
});
