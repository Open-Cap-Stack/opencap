/**
 * Digital Signature Service Unit Tests
 * Issue #100: Build Digital Signature Workflow
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

const DigitalSignatureService = require('../../../services/digitalSignatureService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('DigitalSignatureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseSignatureRequest = {
    documentId: 'doc-123',
    documentType: 'safe',
    companyId: 'company-123',
    title: 'Investment Agreement',
    message: 'Please review and sign',
    signers: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'investor'
      }
    ],
    provider: 'internal',
    createdBy: 'user-123'
  };

  describe('createSignatureRequest', () => {
    it('should create a new signature request', async () => {
      const mockCreated = {
        ...baseSignatureRequest,
        _id: 'sig-123',
        signatureId: 'SIG-12345678',
        status: 'draft',
        createdAt: new Date()
      };

      databaseAdapter.create.mockResolvedValue(mockCreated);

      const result = await DigitalSignatureService.createSignatureRequest(baseSignatureRequest);

      expect(databaseAdapter.create).toHaveBeenCalledWith('DigitalSignature', expect.objectContaining({
        documentId: 'doc-123',
        documentType: 'safe',
        status: 'draft'
      }));
      expect(result).toHaveProperty('signatureId');
    });

    it('should generate unique signature ID', async () => {
      const mockCreated = {
        ...baseSignatureRequest,
        signatureId: 'SIG-12345678'
      };

      databaseAdapter.create.mockResolvedValue(mockCreated);

      const result = await DigitalSignatureService.createSignatureRequest(baseSignatureRequest);

      expect(result.signatureId).toMatch(/^SIG-/);
    });

    it('should set default status to draft', async () => {
      const mockCreated = {
        ...baseSignatureRequest,
        status: 'draft'
      };

      databaseAdapter.create.mockResolvedValue(mockCreated);

      const result = await DigitalSignatureService.createSignatureRequest(baseSignatureRequest);

      expect(result.status).toBe('draft');
    });

    it('should add audit trail event for creation', async () => {
      const mockCreated = {
        ...baseSignatureRequest,
        auditTrail: [{ event: 'created', timestamp: new Date() }]
      };

      databaseAdapter.create.mockResolvedValue(mockCreated);

      const result = await DigitalSignatureService.createSignatureRequest(baseSignatureRequest);

      expect(result.auditTrail).toContainEqual(expect.objectContaining({
        event: 'created'
      }));
    });

    it('should throw error if required fields missing', async () => {
      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await expect(DigitalSignatureService.createSignatureRequest({}))
        .rejects.toThrow();
    });
  });

  describe('sendSignatureRequest', () => {
    it('should update status from draft to sent', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'draft',
        signers: [{ email: 'john@example.com', status: 'pending' }]
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'sent',
        sentAt: new Date()
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.sendSignatureRequest('sig-123', 'user-123');

      expect(result.status).toBe('sent');
      expect(result).toHaveProperty('sentAt');
    });

    it('should update signer statuses to sent', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'draft',
        signers: [{ email: 'john@example.com', status: 'pending' }]
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'sent',
        signers: [{ email: 'john@example.com', status: 'sent', sentAt: new Date() }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.sendSignatureRequest('sig-123', 'user-123');

      expect(result.signers[0].status).toBe('sent');
    });

    it('should set expiration date based on settings', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'draft',
        settings: { expirationDays: 30 },
        signers: [{ email: 'john@example.com', status: 'pending' }]
      };

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const mockUpdated = {
        ...mockRequest,
        status: 'sent',
        expiresAt
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.sendSignatureRequest('sig-123', 'user-123');

      expect(result).toHaveProperty('expiresAt');
    });

    it('should add audit trail event for sending', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'draft',
        auditTrail: [],
        signers: [{ email: 'john@example.com', status: 'pending' }]
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'sent',
        auditTrail: [{ event: 'sent', timestamp: new Date() }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.sendSignatureRequest('sig-123', 'user-123');

      expect(result.auditTrail).toContainEqual(expect.objectContaining({
        event: 'sent'
      }));
    });

    it('should throw error if request not in draft status', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent'
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await expect(DigitalSignatureService.sendSignatureRequest('sig-123', 'user-123'))
        .rejects.toThrow('Can only send requests in draft status');
    });

    it('should throw error if request not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(DigitalSignatureService.sendSignatureRequest('sig-123', 'user-123'))
        .rejects.toThrow('Signature request not found');
    });
  });

  describe('recordView', () => {
    it('should update signer status to viewed', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        signers: [{ email: 'john@example.com', status: 'sent' }]
      };

      const mockUpdated = {
        ...mockRequest,
        signers: [{ email: 'john@example.com', status: 'viewed', viewedAt: new Date() }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.recordView('sig-123', 'john@example.com', '192.168.1.1', 'Mozilla/5.0');

      expect(result.signers[0].status).toBe('viewed');
      expect(result.signers[0]).toHaveProperty('viewedAt');
    });

    it('should add audit trail event for view', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        signers: [{ email: 'john@example.com', status: 'sent' }],
        auditTrail: []
      };

      const mockUpdated = {
        ...mockRequest,
        auditTrail: [{ event: 'viewed', signerEmail: 'john@example.com' }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.recordView('sig-123', 'john@example.com', '192.168.1.1', 'Mozilla/5.0');

      expect(result.auditTrail).toContainEqual(expect.objectContaining({
        event: 'viewed'
      }));
    });

    it('should throw error if signer not found', async () => {
      const mockRequest = {
        _id: 'sig-123',
        signers: [{ email: 'other@example.com', status: 'sent' }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await expect(DigitalSignatureService.recordView('sig-123', 'john@example.com', '192.168.1.1', 'Mozilla/5.0'))
        .rejects.toThrow('Signer not found');
    });
  });

  describe('recordSignature', () => {
    it('should update signer status to signed', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        signers: [{ email: 'john@example.com', status: 'viewed' }]
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'in_progress',
        signers: [{ email: 'john@example.com', status: 'signed', signedAt: new Date() }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const signatureData = {
        signature: 'base64_sig',
        initials: 'JD'
      };

      const result = await DigitalSignatureService.recordSignature(
        'sig-123',
        'john@example.com',
        signatureData,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.signers[0].status).toBe('signed');
    });

    it('should store signature data', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        signers: [{ email: 'john@example.com', status: 'viewed' }]
      };

      const signatureData = {
        signature: 'base64_sig',
        initials: 'JD'
      };

      const mockUpdated = {
        ...mockRequest,
        signers: [{
          email: 'john@example.com',
          status: 'signed',
          signatureData: {
            ...signatureData,
            ipAddress: '192.168.1.1',
            timestamp: new Date()
          }
        }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.recordSignature(
        'sig-123',
        'john@example.com',
        signatureData,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.signers[0].signatureData).toHaveProperty('signature');
      expect(result.signers[0].signatureData).toHaveProperty('ipAddress');
    });

    it('should mark request as completed when all signers have signed', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'in_progress',
        signers: [
          { email: 'john@example.com', status: 'signed' },
          { email: 'jane@example.com', status: 'viewed' }
        ]
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'completed',
        completedAt: new Date(),
        signers: [
          { email: 'john@example.com', status: 'signed' },
          { email: 'jane@example.com', status: 'signed' }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.recordSignature(
        'sig-123',
        'jane@example.com',
        { signature: 'base64' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.status).toBe('completed');
      expect(result).toHaveProperty('completedAt');
    });

    it('should throw error if already signed', async () => {
      const mockRequest = {
        _id: 'sig-123',
        signers: [{ email: 'john@example.com', status: 'signed' }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await expect(DigitalSignatureService.recordSignature(
        'sig-123',
        'john@example.com',
        { signature: 'base64' },
        '192.168.1.1',
        'Mozilla/5.0'
      )).rejects.toThrow('Document already signed by this signer');
    });
  });

  describe('recordDecline', () => {
    it('should update signer and request status to declined', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        signers: [{ email: 'john@example.com', status: 'viewed' }]
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'declined',
        signers: [{
          email: 'john@example.com',
          status: 'declined',
          declinedAt: new Date(),
          declineReason: 'Not authorized'
        }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.recordDecline(
        'sig-123',
        'john@example.com',
        'Not authorized',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.status).toBe('declined');
      expect(result.signers[0].status).toBe('declined');
      expect(result.signers[0]).toHaveProperty('declineReason');
    });
  });

  describe('cancelSignatureRequest', () => {
    it('should cancel a signature request', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent'
      };

      const mockUpdated = {
        ...mockRequest,
        status: 'cancelled',
        cancelledAt: new Date()
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.cancelSignatureRequest('sig-123', 'user-123', 'Changed requirements');

      expect(result.status).toBe('cancelled');
      expect(result).toHaveProperty('cancelledAt');
    });

    it('should throw error if already completed', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'completed'
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await expect(DigitalSignatureService.cancelSignatureRequest('sig-123', 'user-123', 'reason'))
        .rejects.toThrow('Cannot cancel request in completed status');
    });
  });

  describe('expireSignatureRequests', () => {
    it('should mark expired requests as expired', async () => {
      const expiredRequests = [
        {
          _id: 'sig-1',
          status: 'sent',
          expiresAt: new Date(Date.now() - 1000),
          signers: [{ email: 'john@example.com', status: 'sent' }],
          auditTrail: []
        },
        {
          _id: 'sig-2',
          status: 'in_progress',
          expiresAt: new Date(Date.now() - 1000),
          signers: [{ email: 'jane@example.com', status: 'viewed' }],
          auditTrail: []
        }
      ];

      databaseAdapter.find.mockResolvedValue(expiredRequests);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'expired' });

      const result = await DigitalSignatureService.expireSignatureRequests();

      expect(databaseAdapter.find).toHaveBeenCalled();
      expect(result.expiredCount).toBe(2);
    });
  });

  describe('sendReminder', () => {
    it('should send reminder to signer', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        settings: { maxReminders: 3 },
        signers: [{ email: 'john@example.com', status: 'sent', remindersSent: 0 }]
      };

      const mockUpdated = {
        ...mockRequest,
        signers: [{ email: 'john@example.com', status: 'sent', remindersSent: 1, lastReminderAt: new Date() }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      const result = await DigitalSignatureService.sendReminder('sig-123', 'john@example.com', 'user-123');

      expect(result.signers[0].remindersSent).toBe(1);
      expect(result.signers[0]).toHaveProperty('lastReminderAt');
    });

    it('should throw error if max reminders reached', async () => {
      const mockRequest = {
        _id: 'sig-123',
        settings: { maxReminders: 3 },
        signers: [{ email: 'john@example.com', status: 'sent', remindersSent: 3 }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await expect(DigitalSignatureService.sendReminder('sig-123', 'john@example.com', 'user-123'))
        .rejects.toThrow('Maximum reminders already sent');
    });

    it('should throw error if signer already signed', async () => {
      const mockRequest = {
        _id: 'sig-123',
        settings: { maxReminders: 3 },
        signers: [{ email: 'john@example.com', status: 'signed', remindersSent: 1 }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await expect(DigitalSignatureService.sendReminder('sig-123', 'john@example.com', 'user-123'))
        .rejects.toThrow('Signer has already signed');
    });
  });

  describe('generateSigningLink', () => {
    it('should generate unique signing link for internal provider', async () => {
      const mockRequest = {
        _id: 'sig-123',
        provider: 'internal',
        signers: [{ email: 'john@example.com', status: 'sent' }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      const result = await DigitalSignatureService.generateSigningLink('sig-123', 'john@example.com');

      expect(result).toHaveProperty('signingUrl');
      expect(result.signingUrl).toContain('/sign/');
    });

    it('should return external link for external providers', async () => {
      const mockRequest = {
        _id: 'sig-123',
        provider: 'docusign',
        externalData: {
          signingUrls: { 'john@example.com': 'https://docusign.com/sign/abc123' }
        },
        signers: [{ email: 'john@example.com', status: 'sent' }]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      const result = await DigitalSignatureService.generateSigningLink('sig-123', 'john@example.com');

      expect(result.signingUrl).toContain('docusign.com');
    });
  });

  describe('getSignatureStatus', () => {
    it('should return current status of signature request', async () => {
      const mockRequest = {
        _id: 'sig-123',
        status: 'in_progress',
        signers: [
          { email: 'john@example.com', status: 'signed' },
          { email: 'jane@example.com', status: 'viewed' }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      const result = await DigitalSignatureService.getSignatureStatus('sig-123');

      expect(result.status).toBe('in_progress');
      expect(result.signedCount).toBe(1);
      expect(result.totalSigners).toBe(2);
      expect(result.progress).toBe(50);
    });
  });

  describe('getAuditTrail', () => {
    it('should return complete audit trail', async () => {
      const mockRequest = {
        _id: 'sig-123',
        auditTrail: [
          { event: 'created', timestamp: new Date(), userId: 'user-123' },
          { event: 'sent', timestamp: new Date(), userId: 'user-123' },
          { event: 'viewed', timestamp: new Date(), signerEmail: 'john@example.com' }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      const result = await DigitalSignatureService.getAuditTrail('sig-123');

      expect(result).toHaveLength(3);
      expect(result[0].event).toBe('created');
    });
  });

  describe('Provider Abstraction', () => {
    describe('DocuSign Provider', () => {
      it('should create signature request via DocuSign API', async () => {
        const docusignRequest = {
          ...baseSignatureRequest,
          provider: 'docusign'
        };

        const mockCreated = {
          ...docusignRequest,
          externalSignatureId: 'docusign_envelope_123'
        };

        databaseAdapter.create.mockResolvedValue(mockCreated);

        const result = await DigitalSignatureService.createSignatureRequest(docusignRequest);

        expect(result.provider).toBe('docusign');
      });
    });

    describe('HelloSign Provider', () => {
      it('should create signature request via HelloSign API', async () => {
        const hellosignRequest = {
          ...baseSignatureRequest,
          provider: 'hellosign'
        };

        const mockCreated = {
          ...hellosignRequest,
          externalSignatureId: 'hellosign_request_123'
        };

        databaseAdapter.create.mockResolvedValue(mockCreated);

        const result = await DigitalSignatureService.createSignatureRequest(hellosignRequest);

        expect(result.provider).toBe('hellosign');
      });
    });
  });

  describe('Callback Handling', () => {
    it('should process webhook callback from external provider', async () => {
      const webhookPayload = {
        type: 'signature_completed',
        externalSignatureId: 'ext_123',
        signerEmail: 'john@example.com',
        timestamp: new Date().toISOString()
      };

      const mockRequest = {
        _id: 'sig-123',
        externalSignatureId: 'ext_123',
        signers: [{ email: 'john@example.com', status: 'sent' }],
        auditTrail: []
      };

      const mockUpdatedRequest = {
        ...mockRequest,
        status: 'in_progress',
        signers: [{ email: 'john@example.com', status: 'signed', signedAt: new Date() }],
        auditTrail: [{ event: 'signed', timestamp: new Date() }]
      };

      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedRequest);

      const result = await DigitalSignatureService.handleProviderCallback(webhookPayload);

      expect(databaseAdapter.findOne).toHaveBeenCalledWith('DigitalSignature', {
        externalSignatureId: 'ext_123'
      });
    });
  });
});
