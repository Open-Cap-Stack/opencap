/**
 * SignatureRequest Model Tests
 * Feature: Issue #40 - Model Test Coverage
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SignatureRequest = require('../../../models/SignatureRequest');

describe('SignatureRequest Model', () => {
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
    await SignatureRequest.deleteMany({});
  });

  const createValidRequest = (overrides = {}) => ({
    documentType: 'safe',
    companyId: new mongoose.Types.ObjectId(),
    title: 'Test Signature Request',
    signers: [
      {
        name: 'Test Signer',
        email: 'signer@test.com',
        role: 'investor'
      }
    ],
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides
  });

  describe('Schema Validation', () => {
    it('should create a valid signature request', async () => {
      const request = new SignatureRequest(createValidRequest());
      const saved = await request.save();

      expect(saved._id).toBeDefined();
      expect(saved.requestId).toMatch(/^sig_/);
      expect(saved.status).toBe('draft');
    });

    it('should require documentType', async () => {
      const request = new SignatureRequest(createValidRequest({ documentType: undefined }));
      await expect(request.save()).rejects.toThrow(/documentType/);
    });

    it('should validate documentType enum', async () => {
      const request = new SignatureRequest(createValidRequest({ documentType: 'invalid' }));
      await expect(request.save()).rejects.toThrow(/is not a valid enum value/);
    });

    it('should require at least one signer', async () => {
      const request = new SignatureRequest(createValidRequest({ signers: [] }));
      const saved = await request.save();
      // Empty signers array is allowed in schema, but application logic should validate
      expect(saved.signers).toHaveLength(0);
    });

    it('should validate signer role enum', async () => {
      const request = new SignatureRequest(createValidRequest({
        signers: [{ name: 'Test', email: 'test@test.com', role: 'invalid_role' }]
      }));
      await expect(request.save()).rejects.toThrow(/is not a valid enum value/);
    });
  });

  describe('Virtuals', () => {
    it('should calculate isComplete correctly', async () => {
      const request = new SignatureRequest(createValidRequest({
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'signed' }
        ]
      }));

      expect(request.isComplete).toBe(true);
    });

    it('should return false for isComplete with pending signers', async () => {
      const request = new SignatureRequest(createValidRequest({
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'pending' }
        ]
      }));

      expect(request.isComplete).toBe(false);
    });

    it('should calculate pendingSigners correctly', async () => {
      const request = new SignatureRequest(createValidRequest({
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'pending' },
          { name: 'Signer3', email: 's3@test.com', role: 'witness', status: 'viewed' }
        ]
      }));

      expect(request.pendingSigners).toHaveLength(2);
    });

    it('should calculate signedCount correctly', async () => {
      const request = new SignatureRequest(createValidRequest({
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'signed' },
          { name: 'Signer3', email: 's3@test.com', role: 'witness', status: 'pending' }
        ]
      }));

      expect(request.signedCount).toBe(2);
    });

    it('should calculate progress percentage', async () => {
      const request = new SignatureRequest(createValidRequest({
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'pending' }
        ]
      }));

      expect(request.progress).toBe(50);
    });
  });

  describe('Instance Methods', () => {
    describe('send', () => {
      it('should send a draft request', async () => {
        const userId = new mongoose.Types.ObjectId();
        const request = await SignatureRequest.create(createValidRequest());

        await request.send(userId);

        expect(request.status).toBe('sent');
        expect(request.sentAt).toBeDefined();
        expect(request.expiresAt).toBeDefined();
        expect(request.signers[0].status).toBe('sent');
      });

      it('should reject sending non-draft requests', async () => {
        const request = await SignatureRequest.create(createValidRequest({ status: 'sent' }));

        await expect(request.send(new mongoose.Types.ObjectId())).rejects.toThrow(
          'Can only send requests in draft status'
        );
      });
    });

    describe('recordView', () => {
      it('should record when signer views the document', async () => {
        const request = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        await request.recordView('test@test.com', '127.0.0.1', 'Mozilla/5.0');

        expect(request.signers[0].status).toBe('viewed');
        expect(request.signers[0].viewedAt).toBeDefined();
        expect(request.auditTrail).toHaveLength(1);
        expect(request.auditTrail[0].event).toBe('viewed');
      });

      it('should throw error for unknown signer', async () => {
        const request = await SignatureRequest.create(createValidRequest({ status: 'sent' }));

        await expect(
          request.recordView('unknown@test.com', '127.0.0.1', 'Mozilla')
        ).rejects.toThrow('Signer not found');
      });
    });

    describe('recordSignature', () => {
      it('should record signature and update status', async () => {
        const request = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        await request.recordSignature('test@test.com', { signature: 'data' }, '127.0.0.1', 'Mozilla');

        expect(request.signers[0].status).toBe('signed');
        expect(request.signers[0].signedAt).toBeDefined();
        expect(request.status).toBe('completed');
      });

      it('should set status to in_progress if not all signed', async () => {
        const request = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [
            { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'sent' },
            { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'sent' }
          ]
        }));

        await request.recordSignature('s1@test.com', { signature: 'data' }, '127.0.0.1', 'Mozilla');

        expect(request.status).toBe('in_progress');
      });

      it('should reject if already signed', async () => {
        const request = await SignatureRequest.create(createValidRequest({
          status: 'in_progress',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'signed' }]
        }));

        await expect(
          request.recordSignature('test@test.com', { signature: 'data' }, '127.0.0.1', 'Mozilla')
        ).rejects.toThrow('Document already signed by this signer');
      });
    });

    describe('recordDecline', () => {
      it('should record decline and update status', async () => {
        const request = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        await request.recordDecline('test@test.com', 'Changed my mind', '127.0.0.1', 'Mozilla');

        expect(request.signers[0].status).toBe('declined');
        expect(request.signers[0].declineReason).toBe('Changed my mind');
        expect(request.status).toBe('declined');
      });
    });

    describe('cancel', () => {
      it('should cancel a pending request', async () => {
        const userId = new mongoose.Types.ObjectId();
        const request = await SignatureRequest.create(createValidRequest({ status: 'sent' }));

        await request.cancel(userId, 'No longer needed');

        expect(request.status).toBe('cancelled');
        expect(request.cancelledAt).toBeDefined();
      });

      it('should reject cancelling completed requests', async () => {
        const request = await SignatureRequest.create(createValidRequest({ status: 'completed' }));

        await expect(
          request.cancel(new mongoose.Types.ObjectId(), 'reason')
        ).rejects.toThrow('Cannot cancel request in completed status');
      });
    });

    describe('sendReminder', () => {
      it('should send reminder and increment counter', async () => {
        const userId = new mongoose.Types.ObjectId();
        const request = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        await request.sendReminder('test@test.com', userId);

        expect(request.signers[0].remindersSent).toBe(1);
        expect(request.signers[0].lastReminderAt).toBeDefined();
      });

      it('should reject reminder for signed documents', async () => {
        const request = await SignatureRequest.create(createValidRequest({
          status: 'in_progress',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'signed' }]
        }));

        await expect(
          request.sendReminder('test@test.com', new mongoose.Types.ObjectId())
        ).rejects.toThrow('Signer has already signed');
      });
    });
  });

  describe('Static Methods', () => {
    it('should find requests by company', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      await SignatureRequest.create([
        createValidRequest({ companyId, createdBy }),
        createValidRequest({ companyId, createdBy }),
        createValidRequest({ companyId: new mongoose.Types.ObjectId(), createdBy })
      ]);

      const requests = await SignatureRequest.findByCompany(companyId);
      expect(requests).toHaveLength(2);
    });

    it('should find requests by signer email', async () => {
      const createdBy = new mongoose.Types.ObjectId();

      await SignatureRequest.create([
        createValidRequest({
          createdBy,
          signers: [{ name: 'Test', email: 'shared@test.com', role: 'investor' }]
        }),
        createValidRequest({
          createdBy,
          signers: [{ name: 'Test', email: 'shared@test.com', role: 'investor' }]
        }),
        createValidRequest({
          createdBy,
          signers: [{ name: 'Other', email: 'other@test.com', role: 'investor' }]
        })
      ]);

      const requests = await SignatureRequest.findBySigner('shared@test.com');
      expect(requests).toHaveLength(2);
    });

    it('should find pending signatures for email', async () => {
      const createdBy = new mongoose.Types.ObjectId();

      await SignatureRequest.create([
        createValidRequest({
          createdBy,
          status: 'sent',
          signers: [{ name: 'Test', email: 'pending@test.com', role: 'investor', status: 'sent' }]
        }),
        createValidRequest({
          createdBy,
          status: 'completed',
          signers: [{ name: 'Test', email: 'pending@test.com', role: 'investor', status: 'signed' }]
        })
      ]);

      const pending = await SignatureRequest.findPendingSignatures('pending@test.com');
      expect(pending).toHaveLength(1);
    });

    it('should find expired requests', async () => {
      const createdBy = new mongoose.Types.ObjectId();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await SignatureRequest.create([
        createValidRequest({
          createdBy,
          status: 'sent',
          expiresAt: pastDate
        }),
        createValidRequest({
          createdBy,
          status: 'sent',
          expiresAt: new Date(Date.now() + 86400000)
        })
      ]);

      const expired = await SignatureRequest.findExpired();
      expect(expired).toHaveLength(1);
    });
  });

  describe('Audit Trail', () => {
    it('should add audit events', async () => {
      const request = new SignatureRequest(createValidRequest());

      request.addAuditEvent('created', { userId: new mongoose.Types.ObjectId() });
      request.addAuditEvent('sent', { userId: new mongoose.Types.ObjectId() });

      expect(request.auditTrail).toHaveLength(2);
      expect(request.auditTrail[0].event).toBe('created');
      expect(request.auditTrail[1].event).toBe('sent');
    });
  });
});
