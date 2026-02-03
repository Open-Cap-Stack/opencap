/**
 * Digital Signature Controller Unit Tests
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

// Mock digitalSignatureService
jest.mock('../../../services/digitalSignatureService', () => ({
  createSignatureRequest: jest.fn(),
  sendSignatureRequest: jest.fn(),
  recordView: jest.fn(),
  recordSignature: jest.fn(),
  recordDecline: jest.fn(),
  cancelSignatureRequest: jest.fn(),
  sendReminder: jest.fn(),
  generateSigningLink: jest.fn(),
  getSignatureStatus: jest.fn(),
  getAuditTrail: jest.fn(),
  handleProviderCallback: jest.fn(),
  expireSignatureRequests: jest.fn()
}));

const digitalSignatureController = require('../../../controllers/digitalSignatureController');
const DigitalSignatureService = require('../../../services/digitalSignatureService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('DigitalSignatureController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: 'user-123' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createSignatureRequest', () => {
    it('should create a new signature request and return 201', async () => {
      const requestData = {
        documentId: 'doc-123',
        documentType: 'safe',
        companyId: 'company-123',
        title: 'Investment Agreement',
        signers: [{ name: 'John Doe', email: 'john@example.com', role: 'investor' }]
      };

      req.body = requestData;

      const mockCreated = {
        ...requestData,
        _id: 'sig-123',
        signatureId: 'SIG-12345678',
        status: 'draft'
      };

      DigitalSignatureService.createSignatureRequest.mockResolvedValue(mockCreated);

      await digitalSignatureController.createSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        signatureId: 'SIG-12345678',
        status: 'draft'
      }));
    });

    it('should return 400 for validation errors', async () => {
      req.body = {};

      DigitalSignatureService.createSignatureRequest.mockRejectedValue(new Error('Validation error: Missing required fields'));

      await digitalSignatureController.createSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });

  describe('getSignatureRequests', () => {
    it('should return all signature requests', async () => {
      const mockRequests = [
        { _id: 'sig-1', title: 'Request 1', status: 'draft' },
        { _id: 'sig-2', title: 'Request 2', status: 'sent' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getSignatureRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'company-123' };

      const mockRequests = [{ _id: 'sig-1', companyId: 'company-123' }];
      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getSignatureRequests(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('DigitalSignature', expect.objectContaining({
        companyId: 'company-123'
      }));
    });

    it('should filter by status', async () => {
      req.query = { status: 'sent' };

      const mockRequests = [{ _id: 'sig-1', status: 'sent' }];
      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getSignatureRequests(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('DigitalSignature', expect.objectContaining({
        status: 'sent'
      }));
    });

    it('should filter by documentId', async () => {
      req.query = { documentId: 'doc-123' };

      const mockRequests = [{ _id: 'sig-1', documentId: 'doc-123' }];
      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getSignatureRequests(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('DigitalSignature', expect.objectContaining({
        documentId: 'doc-123'
      }));
    });

    it('should return 500 on server error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await digitalSignatureController.getSignatureRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSignatureRequestById', () => {
    it('should return signature request by ID', async () => {
      req.params.id = 'sig-123';

      const mockRequest = {
        _id: 'sig-123',
        title: 'Test Request',
        status: 'sent'
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await digitalSignatureController.getSignatureRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRequest);
    });

    it('should return 404 if not found', async () => {
      req.params.id = 'sig-nonexistent';

      databaseAdapter.findById.mockResolvedValue(null);

      await digitalSignatureController.getSignatureRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Signature request not found' });
    });
  });

  describe('updateSignatureRequest', () => {
    it('should update signature request and return 200', async () => {
      req.params.id = 'sig-123';
      req.body = { title: 'Updated Title' };

      const mockUpdated = {
        _id: 'sig-123',
        title: 'Updated Title',
        status: 'draft'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      await digitalSignatureController.updateSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdated);
    });

    it('should return 404 if not found', async () => {
      req.params.id = 'sig-nonexistent';
      req.body = { title: 'Updated' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await digitalSignatureController.updateSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for validation errors', async () => {
      req.params.id = 'sig-123';
      req.body = { status: 'invalid_status' };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Validation error'));

      await digitalSignatureController.updateSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteSignatureRequest', () => {
    it('should delete signature request and return 200', async () => {
      req.params.id = 'sig-123';

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'sig-123' });

      await digitalSignatureController.deleteSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Signature request deleted' });
    });

    it('should return 404 if not found', async () => {
      req.params.id = 'sig-nonexistent';

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await digitalSignatureController.deleteSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('sendSignatureRequest', () => {
    it('should send signature request and return 200', async () => {
      req.params.id = 'sig-123';

      const mockSent = {
        _id: 'sig-123',
        status: 'sent',
        sentAt: new Date()
      };

      DigitalSignatureService.sendSignatureRequest.mockResolvedValue(mockSent);

      await digitalSignatureController.sendSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'sent'
      }));
    });

    it('should return 400 if not in draft status', async () => {
      req.params.id = 'sig-123';

      DigitalSignatureService.sendSignatureRequest.mockRejectedValue(
        new Error('Can only send requests in draft status')
      );

      await digitalSignatureController.sendSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if not found', async () => {
      req.params.id = 'sig-nonexistent';

      DigitalSignatureService.sendSignatureRequest.mockRejectedValue(
        new Error('Signature request not found')
      );

      await digitalSignatureController.sendSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('recordView', () => {
    it('should record view and return 200', async () => {
      req.params.id = 'sig-123';
      req.body = { signerEmail: 'john@example.com' };
      req.ip = '192.168.1.1';
      req.headers = { 'user-agent': 'Mozilla/5.0' };

      const mockUpdated = {
        _id: 'sig-123',
        signers: [{ email: 'john@example.com', status: 'viewed' }]
      };

      DigitalSignatureService.recordView.mockResolvedValue(mockUpdated);

      await digitalSignatureController.recordView(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if signer not found', async () => {
      req.params.id = 'sig-123';
      req.body = { signerEmail: 'unknown@example.com' };

      DigitalSignatureService.recordView.mockRejectedValue(new Error('Signer not found'));

      await digitalSignatureController.recordView(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('recordSignature', () => {
    it('should record signature and return 200', async () => {
      req.params.id = 'sig-123';
      req.body = {
        signerEmail: 'john@example.com',
        signatureData: {
          signature: 'base64_encoded',
          initials: 'JD'
        }
      };
      req.ip = '192.168.1.1';
      req.headers = { 'user-agent': 'Mozilla/5.0' };

      const mockUpdated = {
        _id: 'sig-123',
        signers: [{ email: 'john@example.com', status: 'signed' }]
      };

      DigitalSignatureService.recordSignature.mockResolvedValue(mockUpdated);

      await digitalSignatureController.recordSignature(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if already signed', async () => {
      req.params.id = 'sig-123';
      req.body = {
        signerEmail: 'john@example.com',
        signatureData: { signature: 'base64' }
      };

      DigitalSignatureService.recordSignature.mockRejectedValue(
        new Error('Document already signed by this signer')
      );

      await digitalSignatureController.recordSignature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('recordDecline', () => {
    it('should record decline and return 200', async () => {
      req.params.id = 'sig-123';
      req.body = {
        signerEmail: 'john@example.com',
        reason: 'Not authorized to sign'
      };
      req.ip = '192.168.1.1';
      req.headers = { 'user-agent': 'Mozilla/5.0' };

      const mockUpdated = {
        _id: 'sig-123',
        status: 'declined',
        signers: [{ email: 'john@example.com', status: 'declined' }]
      };

      DigitalSignatureService.recordDecline.mockResolvedValue(mockUpdated);

      await digitalSignatureController.recordDecline(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancelSignatureRequest', () => {
    it('should cancel request and return 200', async () => {
      req.params.id = 'sig-123';
      req.body = { reason: 'Changed requirements' };

      const mockCancelled = {
        _id: 'sig-123',
        status: 'cancelled',
        cancelledAt: new Date()
      };

      DigitalSignatureService.cancelSignatureRequest.mockResolvedValue(mockCancelled);

      await digitalSignatureController.cancelSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'cancelled'
      }));
    });

    it('should return 400 if already completed', async () => {
      req.params.id = 'sig-123';
      req.body = { reason: 'test' };

      DigitalSignatureService.cancelSignatureRequest.mockRejectedValue(
        new Error('Cannot cancel request in completed status')
      );

      await digitalSignatureController.cancelSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('sendReminder', () => {
    it('should send reminder and return 200', async () => {
      req.params.id = 'sig-123';
      req.body = { signerEmail: 'john@example.com' };

      const mockUpdated = {
        _id: 'sig-123',
        signers: [{ email: 'john@example.com', remindersSent: 1 }]
      };

      DigitalSignatureService.sendReminder.mockResolvedValue(mockUpdated);

      await digitalSignatureController.sendReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if max reminders reached', async () => {
      req.params.id = 'sig-123';
      req.body = { signerEmail: 'john@example.com' };

      DigitalSignatureService.sendReminder.mockRejectedValue(
        new Error('Maximum reminders already sent')
      );

      await digitalSignatureController.sendReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSigningLink', () => {
    it('should return signing link', async () => {
      req.params.id = 'sig-123';
      req.query = { signerEmail: 'john@example.com' };

      DigitalSignatureService.generateSigningLink.mockResolvedValue({
        signingUrl: 'https://example.com/sign/abc123'
      });

      await digitalSignatureController.getSigningLink(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        signingUrl: expect.any(String)
      }));
    });
  });

  describe('getSignatureStatus', () => {
    it('should return signature status with progress', async () => {
      req.params.id = 'sig-123';

      DigitalSignatureService.getSignatureStatus.mockResolvedValue({
        status: 'in_progress',
        signedCount: 1,
        totalSigners: 2,
        progress: 50
      });

      await digitalSignatureController.getSignatureStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'in_progress',
        progress: 50
      }));
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail', async () => {
      req.params.id = 'sig-123';

      const mockAuditTrail = [
        { event: 'created', timestamp: new Date() },
        { event: 'sent', timestamp: new Date() }
      ];

      DigitalSignatureService.getAuditTrail.mockResolvedValue(mockAuditTrail);

      await digitalSignatureController.getAuditTrail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        signatureId: 'sig-123',
        auditTrail: mockAuditTrail
      });
    });
  });

  describe('handleProviderCallback', () => {
    it('should process webhook callback from external provider', async () => {
      req.body = {
        type: 'signature_completed',
        externalSignatureId: 'ext_123',
        signerEmail: 'john@example.com'
      };

      DigitalSignatureService.handleProviderCallback.mockResolvedValue({
        success: true,
        signatureId: 'sig-123'
      });

      await digitalSignatureController.handleProviderCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid webhook data', async () => {
      req.body = {};

      DigitalSignatureService.handleProviderCallback.mockRejectedValue(
        new Error('Invalid webhook payload')
      );

      await digitalSignatureController.handleProviderCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getRequestsBySignerEmail', () => {
    it('should return pending signature requests for signer', async () => {
      req.query = { email: 'john@example.com' };

      const mockRequests = [
        { _id: 'sig-1', signers: [{ email: 'john@example.com', status: 'sent' }] }
      ];

      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getRequestsBySignerEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should filter by signer status', async () => {
      req.query = { email: 'john@example.com', status: 'viewed' };

      const mockRequests = [
        { _id: 'sig-1', signers: [{ email: 'john@example.com', status: 'viewed' }] }
      ];

      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getRequestsBySignerEmail(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('DigitalSignature', {
        'signers.email': 'john@example.com',
        'signers.status': 'viewed'
      });
    });

    it('should return 500 on error', async () => {
      req.query = { email: 'john@example.com' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await digitalSignatureController.getRequestsBySignerEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('voidSignatureRequest', () => {
    it('should void a signature request', async () => {
      req.params.id = 'sig-123';
      req.body = { reason: 'Document needs revision' };

      const mockRequest = {
        _id: 'sig-123',
        status: 'sent',
        auditTrail: []
      };

      const mockVoided = {
        ...mockRequest,
        status: 'voided',
        voidedAt: new Date()
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockVoided);

      await digitalSignatureController.voidSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'voided'
      }));
    });

    it('should return 404 if request not found', async () => {
      req.params.id = 'sig-nonexistent';
      req.body = { reason: 'test' };

      databaseAdapter.findById.mockResolvedValue(null);

      await digitalSignatureController.voidSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req.params.id = 'sig-123';
      req.body = { reason: 'test' };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await digitalSignatureController.voidSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getExpiringRequests', () => {
    it('should return requests expiring within specified days', async () => {
      req.query = { days: '7' };

      const mockRequests = [
        { _id: 'sig-1', status: 'sent', expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
      ];

      databaseAdapter.find.mockResolvedValue(mockRequests);

      await digitalSignatureController.getExpiringRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should use default days when not specified', async () => {
      req.query = {};

      databaseAdapter.find.mockResolvedValue([]);

      await digitalSignatureController.getExpiringRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.query = { days: '7' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await digitalSignatureController.getExpiringRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('processExpiredRequests', () => {
    it('should process expired requests', async () => {
      DigitalSignatureService.expireSignatureRequests.mockResolvedValue({ expiredCount: 3 });

      await digitalSignatureController.processExpiredRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ expiredCount: 3 });
    });

    it('should return 500 on error', async () => {
      DigitalSignatureService.expireSignatureRequests.mockRejectedValue(new Error('Processing error'));

      await digitalSignatureController.processExpiredRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('downloadSignedDocument', () => {
    it('should return download link for completed document', async () => {
      req.params.id = 'sig-123';

      const mockRequest = {
        _id: 'sig-123',
        status: 'completed',
        signedDocument: {
          url: 'https://storage.example.com/docs/signed.pdf',
          filename: 'agreement_signed.pdf'
        },
        auditTrail: []
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockRequest);

      await digitalSignatureController.downloadSignedDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        downloadUrl: 'https://storage.example.com/docs/signed.pdf',
        filename: 'agreement_signed.pdf'
      });
    });

    it('should return 404 if request not found', async () => {
      req.params.id = 'sig-nonexistent';

      databaseAdapter.findById.mockResolvedValue(null);

      await digitalSignatureController.downloadSignedDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if document not fully signed', async () => {
      req.params.id = 'sig-123';

      const mockRequest = {
        _id: 'sig-123',
        status: 'in_progress'
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await digitalSignatureController.downloadSignedDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if signed document not available', async () => {
      req.params.id = 'sig-123';

      const mockRequest = {
        _id: 'sig-123',
        status: 'completed',
        signedDocument: null
      };

      databaseAdapter.findById.mockResolvedValue(mockRequest);

      await digitalSignatureController.downloadSignedDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req.params.id = 'sig-123';

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await digitalSignatureController.downloadSignedDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSignatureStatus - error handling', () => {
    it('should return 500 on unexpected error', async () => {
      req.params.id = 'sig-123';

      DigitalSignatureService.getSignatureStatus.mockRejectedValue(new Error('Unexpected error'));

      await digitalSignatureController.getSignatureStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAuditTrail - error handling', () => {
    it('should return 500 on unexpected error', async () => {
      req.params.id = 'sig-123';

      DigitalSignatureService.getAuditTrail.mockRejectedValue(new Error('Unexpected error'));

      await digitalSignatureController.getAuditTrail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
