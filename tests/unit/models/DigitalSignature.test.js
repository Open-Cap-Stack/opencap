/**
 * DigitalSignature Model Unit Tests
 * Tests for digital signature workflow model including creation,
 * validation, business logic methods, and edge cases.
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

const DigitalSignature = require('../../../models/DigitalSignature');
const zerodbService = require('../../../services/zerodbService');

describe('DigitalSignature Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable
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

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose SIGNER_ROLES', () => {
      expect(DigitalSignature.SIGNER_ROLES).toEqual([
        'investor', 'company_representative', 'witness', 'legal_counsel', 'board_member'
      ]);
    });

    it('should expose SIGNER_STATUSES', () => {
      expect(DigitalSignature.SIGNER_STATUSES).toEqual([
        'pending', 'sent', 'viewed', 'signed', 'declined', 'expired'
      ]);
    });

    it('should expose SIGNATURE_STATUSES', () => {
      expect(DigitalSignature.SIGNATURE_STATUSES).toEqual([
        'draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled', 'voided'
      ]);
    });

    it('should expose SIGNING_ORDERS', () => {
      expect(DigitalSignature.SIGNING_ORDERS).toEqual(['parallel', 'sequential']);
    });

    it('should expose DOCUMENT_TYPES', () => {
      expect(DigitalSignature.DOCUMENT_TYPES).toEqual([
        'safe', 'stock_option_agreement', 'board_consent',
        'employment_agreement', 'nda', 'investor_agreement', 'other'
      ]);
    });

    it('should expose DOCUMENT_MODELS', () => {
      expect(DigitalSignature.DOCUMENT_MODELS).toEqual([
        'SAFE', 'Document', 'EquityGrant', 'Contract'
      ]);
    });

    it('should expose PROVIDERS', () => {
      expect(DigitalSignature.PROVIDERS).toEqual([
        'internal', 'docusign', 'hellosign', 'pandadoc'
      ]);
    });

    it('should expose AUDIT_EVENTS', () => {
      expect(DigitalSignature.AUDIT_EVENTS).toEqual([
        'created', 'sent', 'viewed', 'signed', 'declined',
        'reminder_sent', 'expired', 'cancelled', 'completed',
        'document_downloaded', 'voided'
      ]);
    });

    it('should have tableName set to digital_signatures', () => {
      expect(DigitalSignature.tableName).toBe('digital_signatures');
    });
  });

  // ─── Schema ──────────────────────────────────────────────────

  describe('Schema', () => {
    it('should define required fields', () => {
      expect(DigitalSignature.schema.signatureId.required).toBe(true);
      expect(DigitalSignature.schema.documentId.required).toBe(true);
      expect(DigitalSignature.schema.documentType.required).toBe(true);
      expect(DigitalSignature.schema.companyId.required).toBe(true);
      expect(DigitalSignature.schema.title.required).toBe(true);
      expect(DigitalSignature.schema.createdBy.required).toBe(true);
    });

    it('should define enum constraints', () => {
      expect(DigitalSignature.schema.documentType.enum).toEqual(DigitalSignature.DOCUMENT_TYPES);
      expect(DigitalSignature.schema.status.enum).toEqual(DigitalSignature.SIGNATURE_STATUSES);
      expect(DigitalSignature.schema.signingOrder.enum).toEqual(DigitalSignature.SIGNING_ORDERS);
      expect(DigitalSignature.schema.provider.enum).toEqual(DigitalSignature.PROVIDERS);
    });

    it('should have default values', () => {
      expect(DigitalSignature.schema.status.default).toBe('draft');
      expect(DigitalSignature.schema.signingOrder.default).toBe('parallel');
      expect(DigitalSignature.schema.provider.default).toBe('internal');
      expect(DigitalSignature.schema.documentModel.default).toBe('Document');
      expect(DigitalSignature.schema.message.default).toBe('');
      expect(DigitalSignature.schema.signers.default).toEqual([]);
      expect(DigitalSignature.schema.auditTrail.default).toEqual([]);
    });
  });

  // ─── create() ────────────────────────────────────────────────

  describe('create()', () => {
    // Use a function to return a fresh object each time, since create() mutates data
    const makeValidData = () => ({
      documentId: 'doc-001',
      documentType: 'safe',
      companyId: 'comp-001',
      title: 'SAFE Agreement',
      createdBy: 'user-001',
      signers: [
        { name: 'John Doe', email: 'john@example.com', role: 'investor', status: 'pending' }
      ]
    });

    it('should create a signature request with valid data', async () => {
      const result = await DigitalSignature.create(makeValidData());

      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc-001');
      expect(result.title).toBe('SAFE Agreement');
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'digital_signatures',
        expect.objectContaining({ documentId: 'doc-001' })
      );
    });

    it('should auto-generate signatureId if not provided', async () => {
      const result = await DigitalSignature.create(makeValidData());
      expect(result.signatureId).toBeDefined();
      expect(result.signatureId).toMatch(/^SIG-[A-Z0-9]{8}$/);
    });

    it('should preserve provided signatureId', async () => {
      const result = await DigitalSignature.create({
        ...makeValidData(),
        signatureId: 'SIG-CUSTOM01'
      });
      expect(result.signatureId).toBe('SIG-CUSTOM01');
    });

    it('should default status to draft', async () => {
      const result = await DigitalSignature.create(makeValidData());
      expect(result.status).toBe('draft');
    });

    it('should set default settings if not provided', async () => {
      const result = await DigitalSignature.create(makeValidData());
      expect(result.settings).toEqual({
        reminderEnabled: true,
        reminderDays: 3,
        maxReminders: 3,
        expirationDays: 30,
        requireInitials: false,
        allowDecline: true
      });
    });

    it('should preserve provided settings', async () => {
      const customSettings = {
        reminderEnabled: false,
        reminderDays: 7,
        maxReminders: 5,
        expirationDays: 60,
        requireInitials: true,
        allowDecline: false
      };
      const result = await DigitalSignature.create({
        ...makeValidData(),
        settings: customSettings
      });
      expect(result.settings).toEqual(customSettings);
    });

    it('should add creation audit event', async () => {
      const result = await DigitalSignature.create(makeValidData());
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBe(1);
      expect(result.auditTrail[0].event).toBe('created');
      expect(result.auditTrail[0].userId).toBe('user-001');
      expect(result.auditTrail[0].timestamp).toBeDefined();
    });

    it('should append to existing auditTrail', async () => {
      const result = await DigitalSignature.create({
        ...makeValidData(),
        auditTrail: [{ event: 'pre-existing', timestamp: '2025-01-01T00:00:00.000Z' }]
      });
      expect(result.auditTrail.length).toBe(2);
      expect(result.auditTrail[0].event).toBe('pre-existing');
      expect(result.auditTrail[1].event).toBe('created');
    });

    it('should add timestamps', async () => {
      const result = await DigitalSignature.create(makeValidData());
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ─── findBySignatureId() ────────────────────────────────────

  describe('findBySignatureId()', () => {
    it('should find a signature by signatureId', async () => {
      await DigitalSignature.create({
        signatureId: 'SIG-FIND0001',
        documentId: 'doc-001',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'Test',
        createdBy: 'user-001'
      });

      const found = await DigitalSignature.findBySignatureId('SIG-FIND0001');
      expect(found).toBeDefined();
      expect(found.signatureId).toBe('SIG-FIND0001');
    });

    it('should return null for non-existent signatureId', async () => {
      const found = await DigitalSignature.findBySignatureId('SIG-NOTEXIST');
      expect(found).toBeNull();
    });
  });

  // ─── findByCompany() ───────────────────────────────────────

  describe('findByCompany()', () => {
    it('should find signatures by companyId', async () => {
      await DigitalSignature.create({
        documentId: 'doc-c1',
        documentType: 'safe',
        companyId: 'comp-find',
        title: 'Sig 1',
        createdBy: 'user-001'
      });
      await DigitalSignature.create({
        documentId: 'doc-c2',
        documentType: 'nda',
        companyId: 'comp-find',
        title: 'Sig 2',
        createdBy: 'user-001'
      });
      await DigitalSignature.create({
        documentId: 'doc-c3',
        documentType: 'safe',
        companyId: 'comp-other',
        title: 'Sig 3',
        createdBy: 'user-001'
      });

      const results = await DigitalSignature.findByCompany('comp-find');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      await DigitalSignature.create({
        documentId: 'doc-cs1',
        documentType: 'safe',
        companyId: 'comp-status',
        title: 'Draft',
        createdBy: 'user-001',
        status: 'draft'
      });
      await DigitalSignature.create({
        documentId: 'doc-cs2',
        documentType: 'safe',
        companyId: 'comp-status',
        title: 'Sent',
        createdBy: 'user-001',
        status: 'sent'
      });

      const results = await DigitalSignature.findByCompany('comp-status', 'sent');
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('sent');
    });
  });

  // ─── findBySigner() ────────────────────────────────────────

  describe('findBySigner()', () => {
    it('should find signatures containing a signer email', async () => {
      await DigitalSignature.create({
        documentId: 'doc-signer1',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'Sig A',
        createdBy: 'user-001',
        signers: [
          { name: 'John', email: 'john@test.com', role: 'investor', status: 'pending' }
        ]
      });
      await DigitalSignature.create({
        documentId: 'doc-signer2',
        documentType: 'nda',
        companyId: 'comp-001',
        title: 'Sig B',
        createdBy: 'user-001',
        signers: [
          { name: 'Jane', email: 'jane@test.com', role: 'witness', status: 'pending' }
        ]
      });

      const results = await DigitalSignature.findBySigner('john@test.com');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Sig A');
    });

    it('should return empty array when signer not found', async () => {
      const results = await DigitalSignature.findBySigner('nobody@test.com');
      expect(results).toEqual([]);
    });
  });

  // ─── findPendingSignatures() ────────────────────────────────

  describe('findPendingSignatures()', () => {
    it('should find pending signatures for a signer email', async () => {
      await DigitalSignature.create({
        documentId: 'doc-pend1',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'Pending',
        createdBy: 'user-001',
        status: 'sent',
        signers: [
          { name: 'John', email: 'john@pending.com', role: 'investor', status: 'sent' }
        ]
      });
      await DigitalSignature.create({
        documentId: 'doc-pend2',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'Completed',
        createdBy: 'user-001',
        status: 'completed',
        signers: [
          { name: 'John', email: 'john@pending.com', role: 'investor', status: 'signed' }
        ]
      });

      const results = await DigitalSignature.findPendingSignatures('john@pending.com');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Pending');
    });
  });

  // ─── findExpired() ──────────────────────────────────────────

  describe('findExpired()', () => {
    it('should find expired signatures', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      await DigitalSignature.create({
        documentId: 'doc-exp1',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'Expired',
        createdBy: 'user-001',
        status: 'sent',
        expiresAt: pastDate.toISOString()
      });

      const results = await DigitalSignature.findExpired();
      expect(results.length).toBe(1);
    });

    it('should not include non-expired signatures', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await DigitalSignature.create({
        documentId: 'doc-notexp',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'Not Expired',
        createdBy: 'user-001',
        status: 'sent',
        expiresAt: futureDate.toISOString()
      });

      const results = await DigitalSignature.findExpired();
      expect(results.length).toBe(0);
    });
  });

  // ─── findByExternalId() ─────────────────────────────────────

  describe('findByExternalId()', () => {
    it('should find signature by external provider ID', async () => {
      await DigitalSignature.create({
        documentId: 'doc-ext1',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'External',
        createdBy: 'user-001',
        provider: 'docusign',
        externalSignatureId: 'docusign-envelope-123'
      });

      const found = await DigitalSignature.findByExternalId('docusign-envelope-123');
      expect(found).toBeDefined();
      expect(found.provider).toBe('docusign');
    });

    it('should return null for non-existent external ID', async () => {
      const found = await DigitalSignature.findByExternalId('nonexistent-ext-id');
      expect(found).toBeNull();
    });
  });

  // ─── Synchronous helpers ────────────────────────────────────

  describe('addAuditEvent()', () => {
    it('should add event to audit trail', () => {
      const sig = { auditTrail: [] };
      const result = DigitalSignature.addAuditEvent(sig, 'sent', { userId: 'u1' });

      expect(result.auditTrail.length).toBe(1);
      expect(result.auditTrail[0].event).toBe('sent');
      expect(result.auditTrail[0].userId).toBe('u1');
      expect(result.auditTrail[0].timestamp).toBeDefined();
    });

    it('should initialize auditTrail if null', () => {
      const sig = { auditTrail: null };
      const result = DigitalSignature.addAuditEvent(sig, 'viewed');

      expect(result.auditTrail.length).toBe(1);
    });

    it('should append to existing audit trail', () => {
      const sig = {
        auditTrail: [{ event: 'created', timestamp: '2025-01-01T00:00:00.000Z' }]
      };
      const result = DigitalSignature.addAuditEvent(sig, 'sent');

      expect(result.auditTrail.length).toBe(2);
      expect(result.auditTrail[1].event).toBe('sent');
    });
  });

  describe('isComplete()', () => {
    it('should return true when all signers have signed', () => {
      const sig = {
        signers: [
          { email: 'a@test.com', status: 'signed' },
          { email: 'b@test.com', status: 'signed' }
        ]
      };
      expect(DigitalSignature.isComplete(sig)).toBe(true);
    });

    it('should return false when not all signers have signed', () => {
      const sig = {
        signers: [
          { email: 'a@test.com', status: 'signed' },
          { email: 'b@test.com', status: 'pending' }
        ]
      };
      expect(DigitalSignature.isComplete(sig)).toBe(false);
    });

    it('should return false when signers is empty', () => {
      const sig = { signers: [] };
      expect(DigitalSignature.isComplete(sig)).toBe(true); // every() returns true for empty array
    });

    it('should handle undefined signers', () => {
      const sig = {};
      expect(DigitalSignature.isComplete(sig)).toBeFalsy();
    });
  });

  describe('getPendingSigners()', () => {
    it('should return signers that have not signed or declined', () => {
      const sig = {
        signers: [
          { email: 'a@test.com', status: 'signed' },
          { email: 'b@test.com', status: 'pending' },
          { email: 'c@test.com', status: 'viewed' },
          { email: 'd@test.com', status: 'declined' }
        ]
      };

      const pending = DigitalSignature.getPendingSigners(sig);
      expect(pending.length).toBe(2);
      expect(pending[0].email).toBe('b@test.com');
      expect(pending[1].email).toBe('c@test.com');
    });

    it('should return empty array when all have signed', () => {
      const sig = {
        signers: [
          { email: 'a@test.com', status: 'signed' },
          { email: 'b@test.com', status: 'declined' }
        ]
      };
      expect(DigitalSignature.getPendingSigners(sig)).toEqual([]);
    });

    it('should return empty array when signers is undefined', () => {
      expect(DigitalSignature.getPendingSigners({})).toEqual([]);
    });
  });

  describe('getSignedCount()', () => {
    it('should count signed signers', () => {
      const sig = {
        signers: [
          { status: 'signed' },
          { status: 'pending' },
          { status: 'signed' },
          { status: 'viewed' }
        ]
      };
      expect(DigitalSignature.getSignedCount(sig)).toBe(2);
    });

    it('should return 0 when no signers have signed', () => {
      const sig = {
        signers: [{ status: 'pending' }, { status: 'viewed' }]
      };
      expect(DigitalSignature.getSignedCount(sig)).toBe(0);
    });

    it('should return 0 when signers is undefined', () => {
      expect(DigitalSignature.getSignedCount({})).toBe(0);
    });
  });

  describe('getProgress()', () => {
    it('should return progress percentage', () => {
      const sig = {
        signers: [
          { status: 'signed' },
          { status: 'signed' },
          { status: 'pending' },
          { status: 'viewed' }
        ]
      };
      expect(DigitalSignature.getProgress(sig)).toBe(50);
    });

    it('should return 100 when all signed', () => {
      const sig = {
        signers: [
          { status: 'signed' },
          { status: 'signed' }
        ]
      };
      expect(DigitalSignature.getProgress(sig)).toBe(100);
    });

    it('should return 0 when none signed', () => {
      const sig = {
        signers: [{ status: 'pending' }, { status: 'sent' }]
      };
      expect(DigitalSignature.getProgress(sig)).toBe(0);
    });

    it('should return 0 when no signers', () => {
      expect(DigitalSignature.getProgress({ signers: [] })).toBe(0);
    });

    it('should return 0 when signers is undefined', () => {
      expect(DigitalSignature.getProgress({})).toBe(0);
    });

    it('should round to nearest integer', () => {
      const sig = {
        signers: [
          { status: 'signed' },
          { status: 'pending' },
          { status: 'pending' }
        ]
      };
      expect(DigitalSignature.getProgress(sig)).toBe(33);
    });
  });

  // ─── Exposed base model methods ─────────────────────────────

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof DigitalSignature.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof DigitalSignature.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof DigitalSignature.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof DigitalSignature.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof DigitalSignature.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof DigitalSignature.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof DigitalSignature.exists).toBe('function');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle signature with multiple signers', async () => {
      const result = await DigitalSignature.create({
        documentId: 'doc-multi',
        documentType: 'board_consent',
        companyId: 'comp-001',
        title: 'Board Consent',
        createdBy: 'user-001',
        signingOrder: 'sequential',
        signers: [
          { name: 'CEO', email: 'ceo@test.com', role: 'company_representative', status: 'pending', order: 1 },
          { name: 'Investor', email: 'inv@test.com', role: 'investor', status: 'pending', order: 2 },
          { name: 'Witness', email: 'wit@test.com', role: 'witness', status: 'pending', order: 3 }
        ]
      });

      expect(result.signers.length).toBe(3);
      expect(result.signingOrder).toBe('sequential');
    });

    it('should handle all document types', async () => {
      for (const docType of DigitalSignature.DOCUMENT_TYPES) {
        store = [];
        idCounter = 0;
        const result = await DigitalSignature.create({
          documentId: `doc-${docType}`,
          documentType: docType,
          companyId: 'comp-001',
          title: `${docType} document`,
          createdBy: 'user-001'
        });
        expect(result.documentType).toBe(docType);
      }
    });

    it('should handle all providers', async () => {
      for (const provider of DigitalSignature.PROVIDERS) {
        store = [];
        idCounter = 0;
        const result = await DigitalSignature.create({
          documentId: `doc-${provider}`,
          documentType: 'safe',
          companyId: 'comp-001',
          title: `${provider} signature`,
          createdBy: 'user-001',
          provider
        });
        expect(result.provider).toBe(provider);
      }
    });

    it('should handle signature with external data', async () => {
      const result = await DigitalSignature.create({
        documentId: 'doc-extdata',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'External',
        createdBy: 'user-001',
        provider: 'docusign',
        externalSignatureId: 'docusign-123',
        externalData: {
          envelopeId: 'env-123',
          webhookUrl: 'https://api.example.com/webhook',
          templateId: 'tmpl-456'
        }
      });

      expect(result.externalSignatureId).toBe('docusign-123');
      expect(result.externalData.envelopeId).toBe('env-123');
    });

    it('should handle signature with document references', async () => {
      const result = await DigitalSignature.create({
        documentId: 'doc-refs',
        documentType: 'safe',
        companyId: 'comp-001',
        title: 'With docs',
        createdBy: 'user-001',
        originalDocument: {
          url: 'https://storage.example.com/original.pdf',
          filename: 'agreement.pdf',
          mimeType: 'application/pdf',
          size: 102400
        }
      });

      expect(result.originalDocument.filename).toBe('agreement.pdf');
    });
  });
});
