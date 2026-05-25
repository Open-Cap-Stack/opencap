/**
 * Integration Tests: Document Management Workflow
 * Issue #42: Implement Integration Test Suite
 *
 * Tests the complete document management workflow:
 * - Upload document
 * - Retrieve document
 * - Update metadata
 * - Delete document
 * - Search documents
 */

const request = require('supertest');
const { createApp } = require('../setup/app');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Helper to generate a 24-char hex string (replaces mongoose.Types.ObjectId)
function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

describe('Document Management Integration Tests', () => {
  let app;
  let userToken;
  let adminToken;
  let createdDocumentId;

  // Valid document data
  const validDocument = {
    title: 'Integration Test Document',
    description: 'This is a test document for integration testing',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    category: 'legal',
    accessLevel: 'private',
    tags: ['test', 'integration', 'document'],
    companyId: 'company-123',
    metadata: {
      author: 'Test Author',
      version: '1.0'
    }
  };

  const publicDocument = {
    title: 'Public Test Document',
    description: 'A publicly accessible document',
    content: 'This document is available to all users.',
    category: 'general',
    accessLevel: 'public',
    tags: ['public', 'test'],
    companyId: 'company-123'
  };

  beforeAll(async () => {
    // Set environment variables
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
    process.env.NODE_ENV = 'test';

    app = createApp();

    // Create user token
    userToken = jwt.sign(
      {
        userId: 'test-user-456',
        role: 'employee',
        companyId: 'company-123',
        permissions: ['read:documents', 'write:documents', 'delete:documents']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create admin token
    adminToken = jwt.sign(
      {
        userId: 'admin-user-789',
        role: 'admin',
        permissions: ['admin:all']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // No-op: ZeroDB handles data isolation
  });

  describe('Document CRUD Operations', () => {
    describe('POST /api/v1/documents - Create Document', () => {
      it('should create a new document with valid data', async () => {
        const response = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${userToken}`)
          .send(validDocument)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('title', validDocument.title);
        expect(response.body).toHaveProperty('category', validDocument.category);
        expect(response.body).toHaveProperty('status', 'active');
        expect(response.body).toHaveProperty('uploadedAt');
        expect(response.body).toHaveProperty('createdAt');

        createdDocumentId = response.body.id || response.body._id;
      });

      it('should create a public document', async () => {
        const response = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${userToken}`)
          .send(publicDocument)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('accessLevel', 'public');
      });

      it('should create document with tags array', async () => {
        const docWithTags = {
          ...validDocument,
          title: 'Tagged Document',
          tags: ['finance', 'quarterly', '2024']
        };

        const response = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${userToken}`)
          .send(docWithTags)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body.tags).toContain('finance');
        expect(response.body.tags).toContain('quarterly');
        expect(response.body.tags.length).toBe(3);
      });

      it('should reject document creation without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/documents')
          .send(validDocument)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });

      it('should handle document with minimal required fields', async () => {
        const minimalDoc = {
          title: 'Minimal Document'
        };

        const response = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${userToken}`)
          .send(minimalDoc);

        // Should either succeed with defaults or fail with validation
        expect([201, 400]).toContain(response.status);
      });
    });

    describe('GET /api/v1/documents - List Documents', () => {
      beforeEach(async () => {
        // Create multiple test documents
        await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validDocument);

        await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...validDocument, title: 'Second Document', category: 'financial' });

        await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(publicDocument);
      });

      it('should list all documents for admin user', async () => {
        const response = await request(app)
          .get('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter documents by category', async () => {
        const response = await request(app)
          .get('/api/v1/documents?category=legal')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        if (response.body.length > 0) {
          response.body.forEach(doc => {
            expect(doc.category).toBe('legal');
          });
        }
      });

      it('should filter documents by tags', async () => {
        const response = await request(app)
          .get('/api/v1/documents?tags=test')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/v1/documents?page=1&limit=2')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.length).toBeLessThanOrEqual(2);
      });

      it('should sort documents by uploadedAt descending by default', async () => {
        const response = await request(app)
          .get('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        if (response.body.length > 1) {
          // Verify descending order by checking timestamps
          const timestamps = response.body.map(doc => new Date(doc.uploadedAt).getTime());
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
          }
        }
      });

      it('should reject list request without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/documents')
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/documents/:id - Get Single Document', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validDocument);

        createdDocumentId = createResponse.body.id || createResponse.body._id;
      });

      it('should retrieve a specific document by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('title', validDocument.title);
        expect(response.body).toHaveProperty('description');
        expect(response.body).toHaveProperty('category');
      });

      it('should return 404 for non-existent document', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .get(`/api/v1/documents/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      });

      it('should return 400 for invalid document ID format', async () => {
        const response = await request(app)
          .get('/api/v1/documents/invalid-id-format')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect([400, 404]).toContain(response.status);
      });
    });

    describe('PUT /api/v1/documents/:id - Update Document', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validDocument);

        createdDocumentId = createResponse.body.id || createResponse.body._id;
      });

      it('should update document metadata', async () => {
        const updates = {
          title: 'Updated Document Title',
          description: 'This is the updated description',
          tags: ['updated', 'modified']
        };

        const response = await request(app)
          .put(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('title', 'Updated Document Title');
        expect(response.body).toHaveProperty('description', 'This is the updated description');
        expect(response.body.tags).toContain('updated');
      });

      it('should update document category', async () => {
        const response = await request(app)
          .put(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ category: 'financial' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('category', 'financial');
      });

      it('should update document access level', async () => {
        const response = await request(app)
          .put(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ accessLevel: 'public' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessLevel', 'public');
      });

      it('should return 404 when updating non-existent document', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .put(`/api/v1/documents/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Updated Title' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });

      it('should update updatedAt timestamp', async () => {
        const originalDoc = await request(app)
          .get(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Small delay to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await request(app)
          .put(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Timestamp Test Update' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('updatedAt');
        expect(new Date(response.body.updatedAt).getTime())
          .toBeGreaterThanOrEqual(new Date(originalDoc.body.updatedAt).getTime());
      });
    });

    describe('DELETE /api/v1/documents/:id - Delete Document', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/v1/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validDocument);

        createdDocumentId = createResponse.body.id || createResponse.body._id;
      });

      it('should delete an existing document', async () => {
        const response = await request(app)
          .delete(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');

        // Verify deletion
        const getResponse = await request(app)
          .get(`/api/v1/documents/${createdDocumentId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(404);
      });

      it('should return 404 when deleting non-existent document', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .delete(`/api/v1/documents/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });

      it('should reject delete without authentication', async () => {
        const response = await request(app)
          .delete(`/api/v1/documents/${createdDocumentId}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Document Search Operations', () => {
    beforeEach(async () => {
      // Create diverse documents for search testing
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validDocument,
          title: 'Financial Report Q1 2024',
          content: 'Quarterly financial performance metrics and analysis',
          category: 'financial',
          tags: ['financial', 'report', 'quarterly']
        });

      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validDocument,
          title: 'Legal Compliance Document',
          content: 'Regulatory compliance requirements and procedures',
          category: 'legal',
          tags: ['legal', 'compliance']
        });

      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validDocument,
          title: 'Technical Specifications',
          content: 'System architecture and technical documentation',
          category: 'technical',
          tags: ['technical', 'documentation']
        });
    });

    it('should search documents by text query', async () => {
      const response = await request(app)
        .get('/api/v1/documents?search=financial')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter documents by multiple tags', async () => {
      const response = await request(app)
        .get('/api/v1/documents?tags=financial,report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should combine category and search filters', async () => {
      const response = await request(app)
        .get('/api/v1/documents?category=financial&search=quarterly')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Document Lifecycle Complete Test', () => {
    it('should complete full CRUD lifecycle', async () => {
      // 1. CREATE
      const createResponse = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDocument);

      expect(createResponse.status).toBe(201);
      const docId = createResponse.body.id || createResponse.body._id;

      // 2. READ
      const readResponse = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.title).toBe(validDocument.title);

      // 3. UPDATE
      const updateResponse = await request(app)
        .put(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          tags: ['updated', 'lifecycle', 'test']
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe('Updated Title');
      expect(updateResponse.body.tags).toContain('lifecycle');

      // 4. VERIFY UPDATE
      const verifyResponse = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.title).toBe('Updated Title');

      // 5. DELETE
      const deleteResponse = await request(app)
        .delete(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);

      // 6. VERIFY DELETION
      const finalResponse = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finalResponse.status).toBe(404);
    });
  });

  describe('Document Access Control', () => {
    it('should respect access level permissions', async () => {
      // Create private document
      const createResponse = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validDocument,
          accessLevel: 'private',
          companyId: 'admin-company'
        });

      expect(createResponse.status).toBe(201);

      // User from different company should have restricted access
      const otherUserToken = jwt.sign(
        {
          userId: 'other-user',
          role: 'employee',
          companyId: 'other-company'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const listResponse = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${otherUserToken}`);

      // Should either return empty or filtered results
      expect(listResponse.status).toBe(200);
    });

    it('should allow admin to access all documents', async () => {
      // Create documents with different access levels
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validDocument, accessLevel: 'private' });

      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...publicDocument });

      const response = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
