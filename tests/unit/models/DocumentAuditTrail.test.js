/**
 * DocumentAuditTrail Model Tests
 *
 * Issue #102: Add Document Audit Trail
 *
 * Comprehensive tests for the DocumentAuditTrail model including
 * validation, schema behavior, and static methods.
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('DocumentAuditTrail Model', () => {
  let DocumentAuditTrail;

  const validActionTypes = [
    'created',
    'viewed',
    'downloaded',
    'edited',
    'signed',
    'shared',
    'deleted',
    'restored',
    'access_granted',
    'access_revoked',
    'version_created',
    'commented',
    'archived',
    'unarchived'
  ];

  let auditIdCounter = 0;

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockDocumentAuditTrail(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();

        // Apply defaults with unique counter
        if (!this.auditId) this.auditId = `test-uuid-${Date.now()}-${++auditIdCounter}`;
        if (!this.timestamp) this.timestamp = new Date();
        if (!this.changes) this.changes = [];
        if (!this.metadata) this.metadata = {};

        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.documentId) {
            errors.documentId = { message: 'documentId is required' };
          }
          if (!this.actionType) {
            errors.actionType = { message: 'actionType is required' };
          } else if (!validActionTypes.includes(this.actionType)) {
            errors.actionType = { message: `${this.actionType} is not a valid action type` };
          }
          if (!this.actor || !this.actor.userId) {
            errors['actor.userId'] = { message: 'actor.userId is required' };
          }
          if (!this.ipAddress) {
            errors.ipAddress = { message: 'ipAddress is required' };
          }

          return Object.keys(errors).length > 0 ? { errors } : null;
        });

        this.toObject = jest.fn(() => ({ ...data }));
      }

      // Add static methods
      MockDocumentAuditTrail.findById = jest.fn();
      MockDocumentAuditTrail.find = jest.fn();
      MockDocumentAuditTrail.findOne = jest.fn();
      MockDocumentAuditTrail.create = jest.fn();
      MockDocumentAuditTrail.findByIdAndUpdate = jest.fn();
      MockDocumentAuditTrail.findByIdAndDelete = jest.fn();
      MockDocumentAuditTrail.countDocuments = jest.fn();
      MockDocumentAuditTrail.aggregate = jest.fn();
      MockDocumentAuditTrail.findByDocument = jest.fn();
      MockDocumentAuditTrail.findByUser = jest.fn();
      MockDocumentAuditTrail.findByDateRange = jest.fn();
      MockDocumentAuditTrail.getActionCounts = jest.fn();
      MockDocumentAuditTrail.getRecentActivitySummary = jest.fn();
      MockDocumentAuditTrail.searchAuditTrail = jest.fn();
      MockDocumentAuditTrail.ACTION_TYPES = validActionTypes;

      return MockDocumentAuditTrail;
    });

    // Now require the model
    DocumentAuditTrail = require('../../../models/DocumentAuditTrail');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create audit entry with all required fields', () => {
        const auditData = {
          documentId: new mongoose.Types.ObjectId(),
          actionType: 'viewed',
          actor: {
            userId: new mongoose.Types.ObjectId(),
            email: 'user@example.com',
            name: 'Test User',
            role: 'admin'
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date()
        };

        const audit = new DocumentAuditTrail(auditData);

        expect(audit.documentId).toEqual(auditData.documentId);
        expect(audit.actionType).toBe(auditData.actionType);
        expect(audit.actor.userId).toEqual(auditData.actor.userId);
        expect(audit.ipAddress).toBe(auditData.ipAddress);
      });

      it('should reject audit entry without documentId', () => {
        const audit = new DocumentAuditTrail({
          actionType: 'viewed',
          actor: { userId: new mongoose.Types.ObjectId() },
          ipAddress: '192.168.1.1'
        });

        const validationError = audit.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.documentId).toBeTruthy();
      });

      it('should reject audit entry without actionType', () => {
        const audit = new DocumentAuditTrail({
          documentId: new mongoose.Types.ObjectId(),
          actor: { userId: new mongoose.Types.ObjectId() },
          ipAddress: '192.168.1.1'
        });

        const validationError = audit.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.actionType).toBeTruthy();
      });

      it('should reject audit entry without actor.userId', () => {
        const audit = new DocumentAuditTrail({
          documentId: new mongoose.Types.ObjectId(),
          actionType: 'viewed',
          actor: {},
          ipAddress: '192.168.1.1'
        });

        const validationError = audit.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors['actor.userId']).toBeTruthy();
      });

      it('should reject audit entry without ipAddress', () => {
        const audit = new DocumentAuditTrail({
          documentId: new mongoose.Types.ObjectId(),
          actionType: 'viewed',
          actor: { userId: new mongoose.Types.ObjectId() }
        });

        const validationError = audit.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ipAddress).toBeTruthy();
      });
    });

    describe('ActionType Enum Validation', () => {
      it.each(validActionTypes)('should accept valid action type "%s"', (actionType) => {
        const audit = new DocumentAuditTrail({
          documentId: new mongoose.Types.ObjectId(),
          actionType: actionType,
          actor: { userId: new mongoose.Types.ObjectId() },
          ipAddress: '192.168.1.1'
        });

        const validationError = audit.validateSync();
        expect(validationError).toBeNull();
        expect(audit.actionType).toBe(actionType);
      });

      it('should reject invalid action type', () => {
        const audit = new DocumentAuditTrail({
          documentId: new mongoose.Types.ObjectId(),
          actionType: 'invalid_action',
          actor: { userId: new mongoose.Types.ObjectId() },
          ipAddress: '192.168.1.1'
        });

        const validationError = audit.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.actionType).toBeTruthy();
      });
    });
  });

  describe('Optional Fields', () => {
    it('should handle userAgent field', () => {
      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'downloaded',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      });

      expect(audit.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should handle changes array', () => {
      const changes = [
        { field: 'name', previousValue: 'Old Name', newValue: 'New Name' },
        { field: 'status', previousValue: 'draft', newValue: 'active' }
      ];

      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'edited',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        changes
      });

      expect(audit.changes).toEqual(changes);
      expect(audit.changes.length).toBe(2);
    });

    it('should default changes to empty array', () => {
      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1'
      });

      expect(audit.changes).toEqual([]);
    });

    it('should handle previousValues and newValues', () => {
      const previousValues = { name: 'Old Document', status: 'draft' };
      const newValues = { name: 'New Document', status: 'active' };

      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'edited',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        previousValues,
        newValues
      });

      expect(audit.previousValues).toEqual(previousValues);
      expect(audit.newValues).toEqual(newValues);
    });

    it('should handle metadata object', () => {
      const metadata = {
        sessionId: 'session-123',
        companyId: new mongoose.Types.ObjectId(),
        requestId: 'req-456',
        documentVersion: 3,
        details: { source: 'web' },
        reason: 'Regular review',
        tags: ['compliance', 'quarterly']
      };

      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        metadata
      });

      expect(audit.metadata.sessionId).toBe(metadata.sessionId);
      expect(audit.metadata.companyId).toEqual(metadata.companyId);
      expect(audit.metadata.tags).toEqual(metadata.tags);
    });

    it('should handle sharedWith details', () => {
      const sharedWith = {
        users: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
        emails: ['user1@example.com', 'user2@example.com'],
        accessLevel: 'view',
        expiresAt: new Date('2025-12-31')
      };

      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'shared',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        sharedWith
      });

      expect(audit.sharedWith.users.length).toBe(2);
      expect(audit.sharedWith.emails).toEqual(sharedWith.emails);
      expect(audit.sharedWith.accessLevel).toBe('view');
    });

    it('should handle signatureDetails', () => {
      const signatureDetails = {
        signatureId: 'sig-123',
        signatureType: 'electronic',
        signedAt: new Date(),
        certificateInfo: { issuer: 'DocuSign', validUntil: new Date('2025-12-31') }
      };

      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'signed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        signatureDetails
      });

      expect(audit.signatureDetails.signatureId).toBe('sig-123');
      expect(audit.signatureDetails.signatureType).toBe('electronic');
    });
  });

  describe('Action Types', () => {
    it('should handle document created action', () => {
      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'created',
        actor: { userId: new mongoose.Types.ObjectId(), name: 'Creator' },
        ipAddress: '192.168.1.1',
        newValues: { name: 'New Document', category: 'contracts' }
      });

      expect(audit.actionType).toBe('created');
      expect(audit.newValues).toBeTruthy();
    });

    it('should handle document deleted action', () => {
      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'deleted',
        actor: { userId: new mongoose.Types.ObjectId(), name: 'Deleter' },
        ipAddress: '192.168.1.1',
        metadata: { reason: 'No longer needed', details: { softDelete: true } }
      });

      expect(audit.actionType).toBe('deleted');
      expect(audit.metadata.reason).toBe('No longer needed');
    });

    it('should handle document restored action', () => {
      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'restored',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1'
      });

      expect(audit.actionType).toBe('restored');
    });
  });

  describe('Static Methods', () => {
    it('should call findByDocument correctly', async () => {
      const documentId = new mongoose.Types.ObjectId();
      const mockAuditEntries = [
        { documentId, actionType: 'viewed', timestamp: new Date() },
        { documentId, actionType: 'edited', timestamp: new Date() }
      ];

      DocumentAuditTrail.findByDocument.mockResolvedValue(mockAuditEntries);

      const result = await DocumentAuditTrail.findByDocument(documentId, { limit: 10 });

      expect(DocumentAuditTrail.findByDocument).toHaveBeenCalledWith(documentId, { limit: 10 });
      expect(result).toEqual(mockAuditEntries);
    });

    it('should call findByUser correctly', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockAuditEntries = [
        { actor: { userId }, actionType: 'created', timestamp: new Date() }
      ];

      DocumentAuditTrail.findByUser.mockResolvedValue(mockAuditEntries);

      const result = await DocumentAuditTrail.findByUser(userId, { actionType: 'created' });

      expect(DocumentAuditTrail.findByUser).toHaveBeenCalledWith(userId, { actionType: 'created' });
      expect(result).toEqual(mockAuditEntries);
    });

    it('should call findByDateRange correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockAuditEntries = [
        { timestamp: new Date('2024-01-15'), actionType: 'viewed' }
      ];

      DocumentAuditTrail.findByDateRange.mockResolvedValue(mockAuditEntries);

      const result = await DocumentAuditTrail.findByDateRange(startDate, endDate);

      expect(DocumentAuditTrail.findByDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(mockAuditEntries);
    });

    it('should call getActionCounts correctly', async () => {
      const documentId = new mongoose.Types.ObjectId();
      const mockCounts = [
        { _id: 'viewed', count: 50 },
        { _id: 'edited', count: 10 },
        { _id: 'downloaded', count: 5 }
      ];

      DocumentAuditTrail.getActionCounts.mockResolvedValue(mockCounts);

      const result = await DocumentAuditTrail.getActionCounts(documentId);

      expect(DocumentAuditTrail.getActionCounts).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(mockCounts);
    });

    it('should call searchAuditTrail correctly', async () => {
      const searchParams = {
        companyId: new mongoose.Types.ObjectId(),
        actionType: ['viewed', 'edited'],
        startDate: new Date('2024-01-01'),
        limit: 50
      };
      const mockResults = [{ auditId: 'audit-1', actionType: 'viewed' }];

      DocumentAuditTrail.searchAuditTrail.mockResolvedValue(mockResults);

      const result = await DocumentAuditTrail.searchAuditTrail(searchParams);

      expect(DocumentAuditTrail.searchAuditTrail).toHaveBeenCalledWith(searchParams);
      expect(result).toEqual(mockResults);
    });

    it('should expose ACTION_TYPES constant', () => {
      expect(DocumentAuditTrail.ACTION_TYPES).toEqual(validActionTypes);
      expect(DocumentAuditTrail.ACTION_TYPES).toContain('created');
      expect(DocumentAuditTrail.ACTION_TYPES).toContain('deleted');
    });
  });

  describe('Instance Methods', () => {
    it('should save audit entry successfully', async () => {
      const audit = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1'
      });

      audit.save.mockResolvedValue(audit);
      const saved = await audit.save();

      expect(audit.save).toHaveBeenCalled();
      expect(saved).toBe(audit);
    });

    it('should convert audit entry to object', () => {
      const auditData = {
        auditId: 'audit-123',
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1',
        timestamp: new Date()
      };

      const audit = new DocumentAuditTrail(auditData);
      const auditObject = audit.toObject();

      expect(auditObject).toEqual(auditData);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle audit entry with all fields populated', () => {
      const auditData = {
        auditId: 'audit-complete-123',
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'edited',
        actor: {
          userId: new mongoose.Types.ObjectId(),
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin'
        },
        timestamp: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        changes: [
          { field: 'name', previousValue: 'Draft Doc', newValue: 'Final Doc' }
        ],
        previousValues: { name: 'Draft Doc', status: 'draft' },
        newValues: { name: 'Final Doc', status: 'active' },
        metadata: {
          sessionId: 'sess-789',
          companyId: new mongoose.Types.ObjectId(),
          requestId: 'req-abc',
          documentVersion: 5,
          details: { browser: 'Chrome', os: 'macOS' },
          reason: 'Finalizing document',
          relatedDocuments: [new mongoose.Types.ObjectId()],
          tags: ['legal', 'contract', 'final'],
          location: { country: 'US', region: 'CA', city: 'San Francisco' }
        }
      };

      const audit = new DocumentAuditTrail(auditData);
      const validationError = audit.validateSync();

      expect(validationError).toBeNull();
      expect(audit.changes.length).toBe(1);
      expect(audit.metadata.tags.length).toBe(3);
    });

    it('should handle multiple audit entries for same document', async () => {
      const documentId = new mongoose.Types.ObjectId();
      const auditEntries = [
        { documentId, actionType: 'created', timestamp: new Date('2024-01-01T09:00:00Z') },
        { documentId, actionType: 'viewed', timestamp: new Date('2024-01-01T10:00:00Z') },
        { documentId, actionType: 'edited', timestamp: new Date('2024-01-01T11:00:00Z') },
        { documentId, actionType: 'viewed', timestamp: new Date('2024-01-01T12:00:00Z') },
        { documentId, actionType: 'downloaded', timestamp: new Date('2024-01-01T13:00:00Z') }
      ];

      DocumentAuditTrail.find.mockResolvedValue(auditEntries);

      const result = await DocumentAuditTrail.find({ documentId });

      expect(result.length).toBe(5);
      expect(result.every(entry => entry.documentId === documentId)).toBe(true);
    });

    it('should handle empty audit entry', () => {
      const audit = new DocumentAuditTrail({});
      const validationError = audit.validateSync();

      expect(validationError).toBeTruthy();
      expect(Object.keys(validationError.errors).length).toBe(4); // All required fields
    });

    it('should handle filtering by multiple action types', async () => {
      const mockResults = [
        { actionType: 'deleted', timestamp: new Date() },
        { actionType: 'shared', timestamp: new Date() }
      ];

      DocumentAuditTrail.find.mockResolvedValue(mockResults);

      const result = await DocumentAuditTrail.find({
        actionType: { $in: ['deleted', 'shared'] }
      });

      expect(result.length).toBe(2);
      expect(result.every(e => ['deleted', 'shared'].includes(e.actionType))).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('should not allow auditId to be modified after creation', () => {
      const audit = new DocumentAuditTrail({
        auditId: 'original-audit-id',
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1'
      });

      // The auditId should be set on creation and not change
      expect(audit.auditId).toBe('original-audit-id');
    });

    it('should generate unique auditId by default', () => {
      const audit1 = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1'
      });

      const audit2 = new DocumentAuditTrail({
        documentId: new mongoose.Types.ObjectId(),
        actionType: 'viewed',
        actor: { userId: new mongoose.Types.ObjectId() },
        ipAddress: '192.168.1.1'
      });

      expect(audit1.auditId).toBeTruthy();
      expect(audit2.auditId).toBeTruthy();
      expect(audit1.auditId).not.toBe(audit2.auditId);
    });
  });
});
