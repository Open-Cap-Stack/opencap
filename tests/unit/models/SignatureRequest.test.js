/**
 * SignatureRequest Model Tests
 * Feature: Issue #40 - Model Test Coverage
 * Adapted for ZeroDB model interface
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const SignatureRequest = require('../../../models/SignatureRequest');
const zerodbService = require('../../../services/zerodbService');

describe('SignatureRequest Model', () => {
  // In-memory store for mocking ZeroDB
  let store = [];
  let idCounter = 0;

  const createValidRequest = (overrides = {}) => ({
    documentType: 'safe',
    companyId: 'company-123',
    title: 'Test Signature Request',
    signers: [
      {
        name: 'Test Signer',
        email: 'signer@test.com',
        role: 'investor'
      }
    ],
    createdBy: 'user-789',
    ...overrides
  });

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow to simulate creating a document
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable to simulate querying documents
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];

      for (const [key, value] of Object.entries(filter)) {
        if (typeof value === 'object' && value !== null && value.$in) {
          results = results.filter(doc => value.$in.includes(doc[key]));
        } else {
          results = results.filter(doc => doc[key] === value);
        }
      }

      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid signature request', async () => {
      const request = await SignatureRequest.create(createValidRequest());

      expect(request._id).toBeDefined();
      expect(request.requestId).toMatch(/^sig_/);
      expect(request.status).toBe('draft');
    });

    it('should require documentType', async () => {
      await expect(
        SignatureRequest.create(createValidRequest({ documentType: undefined }))
      ).rejects.toThrow('documentType is required');
    });

    it('should validate documentType enum', async () => {
      await expect(
        SignatureRequest.create(createValidRequest({ documentType: 'invalid' }))
      ).rejects.toThrow(/documentType must be one of/);
    });

    it('should allow empty signers array', async () => {
      const request = await SignatureRequest.create(createValidRequest({ signers: [] }));
      expect(request.signers).toHaveLength(0);
    });

    it('should validate signer role', async () => {
      await expect(
        SignatureRequest.create(createValidRequest({
          signers: [{ name: 'Test', email: 'test@test.com', role: 'invalid_role' }]
        }))
      ).rejects.toThrow(/Signer role must be one of/);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate isComplete correctly', () => {
      const request = {
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'signed' }
        ]
      };

      expect(SignatureRequest.isComplete(request)).toBe(true);
    });

    it('should return false for isComplete with pending signers', () => {
      const request = {
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'pending' }
        ]
      };

      expect(SignatureRequest.isComplete(request)).toBe(false);
    });

    it('should calculate pendingSigners correctly', () => {
      const request = {
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'pending' },
          { name: 'Signer3', email: 's3@test.com', role: 'witness', status: 'viewed' }
        ]
      };

      expect(SignatureRequest.getPendingSigners(request)).toHaveLength(2);
    });

    it('should calculate signedCount correctly', () => {
      const request = {
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'signed' },
          { name: 'Signer3', email: 's3@test.com', role: 'witness', status: 'pending' }
        ]
      };

      expect(SignatureRequest.getSignedCount(request)).toBe(2);
    });

    it('should calculate progress percentage', () => {
      const request = {
        signers: [
          { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'signed' },
          { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'pending' }
        ]
      };

      expect(SignatureRequest.getProgress(request)).toBe(50);
    });
  });

  describe('Instance Methods', () => {
    describe('send', () => {
      it('should send a draft request', async () => {
        const created = await SignatureRequest.create(createValidRequest());
        const result = await SignatureRequest.send(created.requestId, 'user-789');

        expect(result.status).toBe('sent');
        expect(result.sentAt).toBeDefined();
        expect(result.expiresAt).toBeDefined();
        expect(result.signers[0].status).toBe('sent');
      });

      it('should reject sending non-draft requests', async () => {
        const created = await SignatureRequest.create(createValidRequest({ status: 'sent' }));

        await expect(
          SignatureRequest.send(created.requestId, 'user-789')
        ).rejects.toThrow('Can only send requests in draft status');
      });
    });

    describe('recordView', () => {
      it('should record when signer views the document', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        const result = await SignatureRequest.recordView(created.requestId, 'test@test.com', '127.0.0.1', 'Mozilla/5.0');

        expect(result.signers[0].status).toBe('viewed');
        expect(result.signers[0].viewedAt).toBeDefined();
        expect(result.auditTrail.length).toBeGreaterThanOrEqual(1);
        const viewedEvent = result.auditTrail.find(e => e.event === 'viewed');
        expect(viewedEvent).toBeDefined();
      });

      it('should throw error for unknown signer', async () => {
        const created = await SignatureRequest.create(createValidRequest({ status: 'sent' }));

        await expect(
          SignatureRequest.recordView(created.requestId, 'unknown@test.com', '127.0.0.1', 'Mozilla')
        ).rejects.toThrow('Signer not found');
      });
    });

    describe('recordSignature', () => {
      it('should record signature and update status', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        const result = await SignatureRequest.recordSignature(created.requestId, 'test@test.com', { signature: 'data' }, '127.0.0.1', 'Mozilla');

        expect(result.signers[0].status).toBe('signed');
        expect(result.signers[0].signedAt).toBeDefined();
        expect(result.status).toBe('completed');
      });

      it('should set status to in_progress if not all signed', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [
            { name: 'Signer1', email: 's1@test.com', role: 'investor', status: 'sent' },
            { name: 'Signer2', email: 's2@test.com', role: 'company_representative', status: 'sent' }
          ]
        }));

        const result = await SignatureRequest.recordSignature(created.requestId, 's1@test.com', { signature: 'data' }, '127.0.0.1', 'Mozilla');

        expect(result.status).toBe('in_progress');
      });

      it('should reject if already signed', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'in_progress',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'signed' }]
        }));

        await expect(
          SignatureRequest.recordSignature(created.requestId, 'test@test.com', { signature: 'data' }, '127.0.0.1', 'Mozilla')
        ).rejects.toThrow('Document already signed by this signer');
      });
    });

    describe('recordDecline', () => {
      it('should record decline and update status', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        const result = await SignatureRequest.recordDecline(created.requestId, 'test@test.com', 'Changed my mind', '127.0.0.1', 'Mozilla');

        expect(result.signers[0].status).toBe('declined');
        expect(result.signers[0].declineReason).toBe('Changed my mind');
        expect(result.status).toBe('declined');
      });
    });

    describe('cancel', () => {
      it('should cancel a pending request', async () => {
        const created = await SignatureRequest.create(createValidRequest({ status: 'sent' }));

        const result = await SignatureRequest.cancel(created.requestId, 'user-789', 'No longer needed');

        expect(result.status).toBe('cancelled');
        expect(result.cancelledAt).toBeDefined();
      });

      it('should reject cancelling completed requests', async () => {
        const created = await SignatureRequest.create(createValidRequest({ status: 'completed' }));

        await expect(
          SignatureRequest.cancel(created.requestId, 'user-789', 'reason')
        ).rejects.toThrow('Cannot cancel request in completed status');
      });
    });

    describe('sendReminder', () => {
      it('should send reminder and increment counter', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'sent',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'sent' }]
        }));

        const result = await SignatureRequest.sendReminder(created.requestId, 'test@test.com', 'user-789');

        expect(result.signers[0].remindersSent).toBe(1);
        expect(result.signers[0].lastReminderAt).toBeDefined();
      });

      it('should reject reminder for signed documents', async () => {
        const created = await SignatureRequest.create(createValidRequest({
          status: 'in_progress',
          signers: [{ name: 'Test', email: 'test@test.com', role: 'investor', status: 'signed' }]
        }));

        await expect(
          SignatureRequest.sendReminder(created.requestId, 'test@test.com', 'user-789')
        ).rejects.toThrow('Signer has already signed');
      });
    });
  });

  describe('Static Methods', () => {
    it('should find requests by company', async () => {
      const companyId = 'company-abc';

      await SignatureRequest.create(createValidRequest({ companyId }));
      await SignatureRequest.create(createValidRequest({ companyId }));
      await SignatureRequest.create(createValidRequest({ companyId: 'other-company' }));

      const requests = await SignatureRequest.findByCompany(companyId);
      expect(requests).toHaveLength(2);
    });

    it('should find requests by signer email', async () => {
      await SignatureRequest.create(createValidRequest({
        signers: [{ name: 'Test', email: 'shared@test.com', role: 'investor' }]
      }));
      await SignatureRequest.create(createValidRequest({
        signers: [{ name: 'Test', email: 'shared@test.com', role: 'investor' }]
      }));
      await SignatureRequest.create(createValidRequest({
        signers: [{ name: 'Other', email: 'other@test.com', role: 'investor' }]
      }));

      const requests = await SignatureRequest.findBySigner('shared@test.com');
      expect(requests).toHaveLength(2);
    });

    it('should find pending signatures for email', async () => {
      await SignatureRequest.create(createValidRequest({
        status: 'sent',
        signers: [{ name: 'Test', email: 'pending@test.com', role: 'investor', status: 'sent' }]
      }));
      await SignatureRequest.create(createValidRequest({
        status: 'completed',
        signers: [{ name: 'Test', email: 'pending@test.com', role: 'investor', status: 'signed' }]
      }));

      const pending = await SignatureRequest.findPendingSignatures('pending@test.com');
      expect(pending).toHaveLength(1);
    });

    it('should find expired requests', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await SignatureRequest.create(createValidRequest({
        status: 'sent',
        expiresAt: pastDate.toISOString()
      }));
      await SignatureRequest.create(createValidRequest({
        status: 'sent',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      }));

      const expired = await SignatureRequest.findExpired();
      expect(expired).toHaveLength(1);
    });
  });

  describe('Audit Trail', () => {
    it('should add audit events', () => {
      const request = { auditTrail: [] };

      SignatureRequest.addAuditEvent(request, 'created', { userId: 'user-123' });
      SignatureRequest.addAuditEvent(request, 'sent', { userId: 'user-456' });

      expect(request.auditTrail).toHaveLength(2);
      expect(request.auditTrail[0].event).toBe('created');
      expect(request.auditTrail[1].event).toBe('sent');
    });

    it('should reject invalid audit events', () => {
      const request = { auditTrail: [] };

      expect(() => {
        SignatureRequest.addAuditEvent(request, 'invalid_event', {});
      }).toThrow('Invalid audit event');
    });
  });

  describe('Schema Structure', () => {
    it('should have documentType enum values', () => {
      const validTypes = SignatureRequest.schema.documentType.enum;
      expect(validTypes).toContain('safe');
      expect(validTypes).toContain('stock_option_agreement');
      expect(validTypes).toContain('board_consent');
      expect(validTypes).toContain('nda');
    });

    it('should have status enum values', () => {
      const validStatuses = SignatureRequest.schema.status.enum;
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('sent');
      expect(validStatuses).toContain('in_progress');
      expect(validStatuses).toContain('completed');
      expect(validStatuses).toContain('declined');
      expect(validStatuses).toContain('cancelled');
    });

    it('should require companyId', () => {
      expect(SignatureRequest.schema.companyId.required).toBe(true);
    });

    it('should require title', () => {
      expect(SignatureRequest.schema.title.required).toBe(true);
    });

    it('should require createdBy', () => {
      expect(SignatureRequest.schema.createdBy.required).toBe(true);
    });
  });
});
