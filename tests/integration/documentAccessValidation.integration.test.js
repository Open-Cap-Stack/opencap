/**
 * Document Access Validation Integration Test
 *
 * Integration tests to verify the validation middleware works correctly
 * with the routes and controller for Issue #249
 */

const request = require('supertest');
const express = require('express');
const documentAccessRoutes = require('../../routes/v1/documentAccessRoutes');
const zerodbService = require('../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../services/zerodbService');

describe('Document Access Validation Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', documentAccessRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/document-accesses - Issue #249 Fix', () => {
    it('should return 400 when User field is missing', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          RelatedDocument: 'doc-123',
          AccessLevel: 'Read'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User is required',
        field: 'User'
      });
    });

    it('should return 400 when RelatedDocument field is missing', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: 'user-123',
          AccessLevel: 'Read'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'RelatedDocument is required',
        field: 'RelatedDocument'
      });
    });

    it('should return 400 when AccessLevel field is missing', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: 'user-123',
          RelatedDocument: 'doc-456'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'AccessLevel is required',
        field: 'AccessLevel'
      });
    });

    it('should return 400 when AccessLevel has invalid value', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'SuperAdmin'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'AccessLevel must be one of: Read, Write, Admin',
        field: 'AccessLevel'
      });
    });

    it('should return 400 when User contains XSS attempt', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: '<script>alert("xss")</script>',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        });

      // Validation or sanitization should catch this and return 400
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      // The error could come from validation middleware or sanitization middleware
      expect(typeof response.body.error).toBe('string');
    });

    it('should return 400 when attempting NoSQL injection', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: { $ne: null },
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User must be a valid string',
        field: 'User'
      });
    });

    it('should successfully create document access with valid data', async () => {
      const mockAccess = {
        id: 'access-id-123',
        accessId: 'access_uuid',
        User: 'user-123',
        RelatedDocument: 'doc-456',
        AccessLevel: 'Read',
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [mockAccess] });

      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Document access created successfully');
      expect(response.body.data).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should trim whitespace from string fields', async () => {
      const mockAccess = {
        id: 'access-id-123',
        accessId: 'access_uuid',
        User: 'user-123',
        RelatedDocument: 'doc-456',
        AccessLevel: 'Read',
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [mockAccess] });

      await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: '  user-123  ',
          RelatedDocument: '  doc-456  ',
          AccessLevel: 'Read'
        })
        .expect(201);

      // Check that the service was called with trimmed values
      const callArgs = zerodbService.insertRow.mock.calls[0][1];
      expect(callArgs.User).toBe('user-123');
      expect(callArgs.RelatedDocument).toBe('doc-456');
    });
  });

  describe('PUT /api/v1/document-accesses/:id - Issue #249 Fix', () => {
    it('should return 400 when trying to update User field', async () => {
      const response = await request(app)
        .put('/api/v1/document-accesses/access-123')
        .send({
          User: 'different-user',
          AccessLevel: 'Write'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User field cannot be updated'
      });
    });

    it('should return 400 when trying to update RelatedDocument field', async () => {
      const response = await request(app)
        .put('/api/v1/document-accesses/access-123')
        .send({
          RelatedDocument: 'different-doc',
          AccessLevel: 'Write'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'RelatedDocument field cannot be updated'
      });
    });

    it('should return 400 with invalid AccessLevel during update', async () => {
      const response = await request(app)
        .put('/api/v1/document-accesses/access-123')
        .send({
          AccessLevel: 'InvalidLevel'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'AccessLevel must be one of: Read, Write, Admin',
        field: 'AccessLevel'
      });
    });

    it('should successfully update with valid AccessLevel', async () => {
      const mockUpdatedAccess = {
        id: 'access-123',
        accessId: 'access_uuid',
        User: 'user-123',
        RelatedDocument: 'doc-456',
        AccessLevel: 'Write',
        updatedAt: new Date().toISOString()
      };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockUpdatedAccess] });

      const response = await request(app)
        .put('/api/v1/document-accesses/access-123')
        .send({
          AccessLevel: 'Write'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Document access updated successfully');
      expect(response.body.data.AccessLevel).toBe('Write');
    });
  });

  describe('Error Message Quality - Issue #249', () => {
    it('should provide clear, actionable error messages', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.field).toBeDefined();
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('should include field name in validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/document-accesses')
        .send({
          User: '',
          RelatedDocument: 'doc-123',
          AccessLevel: 'Read'
        })
        .expect(400);

      expect(response.body.field).toBe('User');
    });
  });
});
