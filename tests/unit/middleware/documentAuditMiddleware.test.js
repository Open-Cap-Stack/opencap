/**
 * DocumentAuditMiddleware Tests
 *
 * Issue #102: Add Document Audit Trail
 *
 * Comprehensive tests for the document audit middleware.
 */

const httpMocks = require('node-mocks-http');
const documentAuditMiddleware = require('../../../middleware/documentAuditMiddleware');
const DocumentAuditService = require('../../../services/documentAuditService');

// Mock the service
jest.mock('../../../services/documentAuditService', () => ({
  logAction: jest.fn()
}));

describe('DocumentAuditMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/v1/documents/doc-123',
      params: { id: 'doc-123' },
      user: {
        id: 'user-456',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin'
      },
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '192.168.1.1',
        'x-session-id': 'session-abc'
      }
    });
    req.ip = '192.168.1.1';
    req.originalUrl = '/api/v1/documents/doc-123';

    res = httpMocks.createResponse();
    next = jest.fn();

    DocumentAuditService.logAction.mockResolvedValue({ auditId: 'audit-123' });
  });

  describe('Helper Functions', () => {
    describe('getIpAddress', () => {
      it('should extract IP from x-forwarded-for header', () => {
        req.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';
        const ip = documentAuditMiddleware.getIpAddress(req);
        expect(ip).toBe('10.0.0.1');
      });

      it('should extract IP from x-real-ip header', () => {
        delete req.headers['x-forwarded-for'];
        req.headers['x-real-ip'] = '10.0.0.2';
        const ip = documentAuditMiddleware.getIpAddress(req);
        expect(ip).toBe('10.0.0.2');
      });

      it('should fall back to req.ip', () => {
        delete req.headers['x-forwarded-for'];
        delete req.headers['x-real-ip'];
        const ip = documentAuditMiddleware.getIpAddress(req);
        expect(ip).toBe('192.168.1.1');
      });

      it('should return unknown when no IP available', () => {
        delete req.headers['x-forwarded-for'];
        delete req.headers['x-real-ip'];
        delete req.ip;
        delete req.connection;
        const ip = documentAuditMiddleware.getIpAddress(req);
        expect(ip).toBe('unknown');
      });
    });

    describe('getUserAgent', () => {
      it('should extract user agent from headers', () => {
        const userAgent = documentAuditMiddleware.getUserAgent(req);
        expect(userAgent).toBe('Mozilla/5.0');
      });

      it('should return unknown when no user agent', () => {
        delete req.headers['user-agent'];
        const userAgent = documentAuditMiddleware.getUserAgent(req);
        expect(userAgent).toBe('unknown');
      });
    });

    describe('getActor', () => {
      it('should extract actor from authenticated user', () => {
        const actor = documentAuditMiddleware.getActor(req);
        expect(actor).toEqual({
          userId: 'user-456',
          email: 'user@example.com',
          name: 'Test User',
          role: 'admin'
        });
      });

      it('should handle user with combined name field', () => {
        req.user = {
          id: 'user-789',
          email: 'another@example.com',
          name: 'Another User'
        };
        const actor = documentAuditMiddleware.getActor(req);
        expect(actor.name).toBe('Another User');
      });

      it('should return anonymous for unauthenticated requests', () => {
        req.user = undefined;
        const actor = documentAuditMiddleware.getActor(req);
        expect(actor.userId).toBe('anonymous');
      });
    });

    describe('buildMetadata', () => {
      it('should build metadata from request context', () => {
        req.body = { companyId: 'company-789' };
        req.headers['x-request-id'] = 'req-123';

        const metadata = documentAuditMiddleware.buildMetadata(req);

        expect(metadata.sessionId).toBe('session-abc');
        expect(metadata.companyId).toBe('company-789');
        expect(metadata.requestId).toBe('req-123');
      });

      it('should merge additional metadata', () => {
        const additionalMetadata = {
          documentVersion: 5,
          reason: 'Review needed',
          tags: ['important']
        };

        const metadata = documentAuditMiddleware.buildMetadata(req, additionalMetadata);

        expect(metadata.documentVersion).toBe(5);
        expect(metadata.reason).toBe('Review needed');
        expect(metadata.tags).toEqual(['important']);
      });
    });
  });

  describe('createCustom', () => {
    it('should create middleware that logs on success', async () => {
      const middleware = documentAuditMiddleware.createCustom('viewed');

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();

      // Simulate successful response
      res.statusCode = 200;
      res.send({ success: true });

      // Wait for async logging
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-123',
          actionType: 'viewed',
          actor: expect.objectContaining({ userId: 'user-456' }),
          ipAddress: '192.168.1.1'
        })
      );
    });

    it('should not log on failed responses', async () => {
      const middleware = documentAuditMiddleware.createCustom('viewed');

      await middleware(req, res, next);

      // Simulate failed response
      res.statusCode = 400;
      res.send({ error: 'Bad Request' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(DocumentAuditService.logAction).not.toHaveBeenCalled();
    });

    it('should support custom document ID extraction', async () => {
      req.params = { docId: 'custom-doc-id' };
      const middleware = documentAuditMiddleware.createCustom('viewed', {
        getDocumentId: (req) => req.params.docId
      });

      await middleware(req, res, next);

      res.statusCode = 200;
      res.send({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'custom-doc-id'
        })
      );
    });

    it('should skip logging when no document ID', async () => {
      req.params = {};
      req.body = {};
      const middleware = documentAuditMiddleware.createCustom('viewed');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await middleware(req, res, next);

      res.statusCode = 200;
      res.send({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(DocumentAuditService.logAction).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No document ID found')
      );

      consoleSpy.mockRestore();
    });

    it('should skip logging when no authenticated user', async () => {
      req.user = undefined;
      const middleware = documentAuditMiddleware.createCustom('viewed');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await middleware(req, res, next);

      res.statusCode = 200;
      res.send({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(DocumentAuditService.logAction).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No authenticated user')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Pre-built Middleware', () => {
    describe('logViewed', () => {
      it('should log document view action', async () => {
        await documentAuditMiddleware.logViewed(req, res, next);

        expect(next).toHaveBeenCalled();

        res.statusCode = 200;
        res.send({ document: { id: 'doc-123' } });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'viewed'
          })
        );
      });
    });

    describe('logCreated', () => {
      it('should log document creation with new values', async () => {
        req.method = 'POST';
        req.body = { name: 'New Document', category: 'contracts' };

        await documentAuditMiddleware.logCreated(req, res, next);

        res.statusCode = 201;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'created',
            newValues: req.body
          })
        );
      });
    });

    describe('logEdited', () => {
      it('should log document edit with updated fields', async () => {
        req.method = 'PUT';
        req.body = { name: 'Updated Name', status: 'active' };

        await documentAuditMiddleware.logEdited(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'edited',
            newValues: req.body
          })
        );
      });
    });

    describe('logDeleted', () => {
      it('should log document deletion with reason', async () => {
        req.method = 'DELETE';
        req.body = { reason: 'No longer needed' };

        await documentAuditMiddleware.logDeleted(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'deleted',
            metadata: expect.objectContaining({
              reason: 'No longer needed'
            })
          })
        );
      });
    });

    describe('logDownloaded', () => {
      it('should log document download with format', async () => {
        req.query = { format: 'pdf' };

        await documentAuditMiddleware.logDownloaded(req, res, next);

        res.statusCode = 200;
        res.send(Buffer.from('file content'));

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'downloaded'
          })
        );
      });
    });

    describe('logShared', () => {
      it('should log document sharing with recipients', async () => {
        req.method = 'POST';
        req.body = {
          users: ['user-1', 'user-2'],
          emails: ['external@example.com'],
          accessLevel: 'view'
        };

        await documentAuditMiddleware.logShared(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'shared',
            sharedWith: expect.objectContaining({
              users: ['user-1', 'user-2'],
              emails: ['external@example.com'],
              accessLevel: 'view'
            })
          })
        );
      });
    });

    describe('logSigned', () => {
      it('should log document signing with signature details', async () => {
        req.method = 'POST';
        req.body = {
          signatureType: 'electronic',
          signatureDetails: {
            signatureId: 'sig-123',
            signatureType: 'electronic'
          }
        };

        await documentAuditMiddleware.logSigned(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'signed',
            signatureDetails: expect.objectContaining({
              signatureId: 'sig-123'
            })
          })
        );
      });
    });

    describe('logRestored', () => {
      it('should log document restoration', async () => {
        req.method = 'POST';

        await documentAuditMiddleware.logRestored(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'restored'
          })
        );
      });
    });

    describe('logAccessGranted', () => {
      it('should log access grant', async () => {
        req.method = 'POST';
        req.body = {
          users: ['user-789'],
          accessLevel: 'edit'
        };

        await documentAuditMiddleware.logAccessGranted(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'access_granted',
            sharedWith: expect.objectContaining({
              users: ['user-789'],
              accessLevel: 'edit'
            })
          })
        );
      });
    });

    describe('logAccessRevoked', () => {
      it('should log access revocation', async () => {
        req.method = 'DELETE';
        req.body = {
          userId: 'user-789',
          email: 'revoked@example.com'
        };

        await documentAuditMiddleware.logAccessRevoked(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'access_revoked'
          })
        );
      });
    });

    describe('logVersionCreated', () => {
      it('should log version creation', async () => {
        req.method = 'POST';
        req.body = { version: 3 };

        await documentAuditMiddleware.logVersionCreated(req, res, next);

        res.statusCode = 201;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'version_created',
            metadata: expect.objectContaining({
              documentVersion: 3
            })
          })
        );
      });
    });

    describe('logCommented', () => {
      it('should log comment with truncated text', async () => {
        req.method = 'POST';
        req.body = {
          comment: 'This is a test comment for the document review process.'
        };

        await documentAuditMiddleware.logCommented(req, res, next);

        res.statusCode = 201;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'commented'
          })
        );
      });
    });

    describe('logArchived', () => {
      it('should log archiving with reason', async () => {
        req.method = 'POST';
        req.body = { reason: 'Project completed' };

        await documentAuditMiddleware.logArchived(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'archived',
            metadata: expect.objectContaining({
              reason: 'Project completed'
            })
          })
        );
      });
    });

    describe('logUnarchived', () => {
      it('should log unarchiving', async () => {
        req.method = 'POST';

        await documentAuditMiddleware.logUnarchived(req, res, next);

        res.statusCode = 200;
        res.send({ success: true });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(DocumentAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: 'unarchived'
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should not fail request when logging fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      DocumentAuditService.logAction.mockRejectedValue(new Error('Logging failed'));

      await documentAuditMiddleware.logViewed(req, res, next);

      expect(next).toHaveBeenCalled();

      res.statusCode = 200;
      res.send({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Document audit middleware error'),
        'Logging failed'
      );

      consoleSpy.mockRestore();
    });

    it('should continue middleware chain even on error', async () => {
      DocumentAuditService.logAction.mockRejectedValue(new Error('Logging failed'));
      jest.spyOn(console, 'error').mockImplementation();

      await documentAuditMiddleware.logViewed(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
