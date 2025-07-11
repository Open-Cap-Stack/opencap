const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../../tests/setup/app');
const Document = require('../../models/Document');
const User = require('../../models/User');
const Company = require('../../models/Company');
const { createTestUser, createTestCompany } = require('../../tests/utils/testHelpers');
const path = require('path');
const fs = require('fs');

describe('Document Controller - Real Database Integration', () => {
  let mongoServer;
  let testUser;
  let testCompany;
  let authToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean database completely
    await User.deleteMany({});
    await Company.deleteMany({});
    await Document.deleteMany({});
    
    // Create real test data
    testUser = await createTestUser();
    testCompany = await createTestCompany();
    
    // Generate real auth token
    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/v1/documents - Real API Calls', () => {
    it('should return all documents from database', async () => {
      // Create real documents in database
      await Document.create([
        {
          title: 'Financial Report Q1 2024',
          filename: 'financial-report-q1-2024.pdf',
          filePath: '/uploads/documents/financial-report-q1-2024.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id,
          tags: ['financial', 'quarterly', 'report'],
          metadata: {
            quarter: 'Q1',
            year: 2024,
            department: 'Finance'
          }
        },
        {
          title: 'Legal Contract - Service Agreement',
          filename: 'service-agreement-2024.pdf',
          filePath: '/uploads/documents/service-agreement-2024.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'legal',
          status: 'pending',
          uploadedBy: testUser._id,
          companyId: testCompany._id,
          tags: ['legal', 'contract', 'service'],
          metadata: {
            contractType: 'Service Agreement',
            effectiveDate: new Date('2024-01-01'),
            expirationDate: new Date('2024-12-31')
          }
        }
      ]);

      // Make real API call
      const response = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('filename');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('fileSize');
      expect(response.body[0]).toHaveProperty('tags');
      expect(response.body[0]).toHaveProperty('metadata');
      
      // Verify database contains the documents
      const dbDocuments = await Document.find();
      expect(dbDocuments).toHaveLength(2);
      expect(dbDocuments[0].title).toBe('Financial Report Q1 2024');
      expect(dbDocuments[1].title).toBe('Legal Contract - Service Agreement');
    });

    it('should filter documents by type from database', async () => {
      // Create documents with different types
      await Document.create([
        {
          title: 'Financial Report',
          filename: 'financial.pdf',
          filePath: '/uploads/financial.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Legal Document',
          filename: 'legal.pdf',
          filePath: '/uploads/legal.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          type: 'legal',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'HR Policy',
          filename: 'hr-policy.pdf',
          filePath: '/uploads/hr-policy.pdf',
          fileSize: 512000,
          mimeType: 'application/pdf',
          type: 'hr',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        }
      ]);

      // Real API call with type filter
      const response = await request(app)
        .get('/api/v1/documents?type=financial')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].type).toBe('financial');
      
      // Verify database query worked correctly
      const dbFinancialDocs = await Document.find({ type: 'financial' });
      expect(dbFinancialDocs).toHaveLength(1);
    });

    it('should filter documents by status from database', async () => {
      // Create documents with different statuses
      await Document.create([
        {
          title: 'Approved Document 1',
          filename: 'approved1.pdf',
          filePath: '/uploads/approved1.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Pending Document',
          filename: 'pending.pdf',
          filePath: '/uploads/pending.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'pending',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Rejected Document',
          filename: 'rejected.pdf',
          filePath: '/uploads/rejected.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'rejected',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        }
      ]);

      // Real API call with status filter
      const response = await request(app)
        .get('/api/v1/documents?status=approved')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('approved');
      
      // Verify database query
      const dbApprovedDocs = await Document.find({ status: 'approved' });
      expect(dbApprovedDocs).toHaveLength(1);
    });

    it('should support pagination with real database queries', async () => {
      // Create multiple documents in database
      const documents = [];
      for (let i = 0; i < 20; i++) {
        documents.push({
          title: `Document ${i}`,
          filename: `document-${i}.pdf`,
          filePath: `/uploads/document-${i}.pdf`,
          fileSize: 1024000 + i * 1000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        });
      }
      await Document.create(documents);

      // Real API call with pagination
      const response = await request(app)
        .get('/api/v1/documents?page=3&limit=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(6); // 20 - (2 * 7) = 6 remaining
      
      // Verify total count in database
      const totalCount = await Document.countDocuments();
      expect(totalCount).toBe(20);
    });

    it('should search documents by title with real database queries', async () => {
      // Create documents with searchable titles
      await Document.create([
        {
          title: 'Annual Financial Report 2024',
          filename: 'annual-financial-2024.pdf',
          filePath: '/uploads/annual-financial-2024.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Monthly Financial Summary',
          filename: 'monthly-summary.pdf',
          filePath: '/uploads/monthly-summary.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Legal Contract Review',
          filename: 'contract-review.pdf',
          filePath: '/uploads/contract-review.pdf',
          fileSize: 1536000,
          mimeType: 'application/pdf',
          type: 'legal',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        }
      ]);

      // Real API call with search
      const response = await request(app)
        .get('/api/v1/documents?search=Financial')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every(doc => doc.title.includes('Financial'))).toBe(true);
      
      // Verify database search worked
      const dbSearchResults = await Document.find({ 
        title: { $regex: 'Financial', $options: 'i' } 
      });
      expect(dbSearchResults).toHaveLength(2);
    });
  });

  describe('POST /api/v1/documents - Real Database Operations', () => {
    it('should create document in database', async () => {
      const documentData = {
        title: 'New Test Document',
        filename: 'new-test-document.pdf',
        filePath: '/uploads/new-test-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'pending',
        uploadedBy: testUser._id,
        companyId: testCompany._id,
        tags: ['test', 'financial', 'new'],
        metadata: {
          department: 'Finance',
          confidentiality: 'Internal',
          retention: '7 years'
        },
        description: 'This is a comprehensive test document for database operations'
      };

      // Real API call
      const response = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(documentData.title);
      expect(response.body.filename).toBe(documentData.filename);
      expect(response.body.type).toBe(documentData.type);
      expect(response.body.status).toBe(documentData.status);
      expect(response.body.fileSize).toBe(documentData.fileSize);
      expect(response.body.tags).toEqual(documentData.tags);
      expect(response.body.metadata).toEqual(documentData.metadata);
      
      // Verify document was actually created in database
      const dbDocument = await Document.findById(response.body._id);
      expect(dbDocument).toBeTruthy();
      expect(dbDocument.title).toBe(documentData.title);
      expect(dbDocument.filename).toBe(documentData.filename);
      expect(dbDocument.description).toBe(documentData.description);
      expect(dbDocument.tags).toEqual(documentData.tags);
    });

    it('should return 400 for invalid data with real validation', async () => {
      const invalidData = {
        title: 'Test Document',
        // Missing required fields
        filename: '', // Empty filename
        fileSize: -1024, // Invalid negative size
        mimeType: 'invalid/type' // Invalid MIME type
      };

      // Real API call
      const response = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      
      // Verify no document was created in database
      const dbDocuments = await Document.find();
      expect(dbDocuments).toHaveLength(0);
    });

    it('should handle database constraint violations', async () => {
      const documentData = {
        title: 'Duplicate Document',
        filename: 'duplicate-document.pdf',
        filePath: '/uploads/duplicate-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'approved',
        uploadedBy: testUser._id,
        companyId: testCompany._id
      };

      // Create first document in database
      await Document.create(documentData);

      // Try to create duplicate via API (assuming filename uniqueness)
      const response = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentData);

      expect(response.status).toBe(409);
      
      // Verify only one document exists in database
      const dbDocuments = await Document.find({ filename: 'duplicate-document.pdf' });
      expect(dbDocuments).toHaveLength(1);
    });
  });

  describe('GET /api/v1/documents/:id - Real Database Lookups', () => {
    it('should return document by ID from database', async () => {
      // Create document in database
      const document = await Document.create({
        title: 'Test Document Lookup',
        filename: 'test-lookup.pdf',
        filePath: '/uploads/test-lookup.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'approved',
        uploadedBy: testUser._id,
        companyId: testCompany._id,
        tags: ['test', 'lookup'],
        metadata: {
          version: '1.0',
          lastModified: new Date()
        }
      });

      // Real API call
      const response = await request(app)
        .get(`/api/v1/documents/${document._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(document._id.toString());
      expect(response.body.title).toBe(document.title);
      expect(response.body.filename).toBe(document.filename);
      expect(response.body.type).toBe(document.type);
      expect(response.body.status).toBe(document.status);
      expect(response.body.tags).toEqual(document.tags);
      
      // Verify database lookup worked
      const dbDocument = await Document.findById(document._id);
      expect(dbDocument).toBeTruthy();
      expect(dbDocument.title).toBe(document.title);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .get(`/api/v1/documents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      
      // Verify no document exists with that ID
      const dbDocument = await Document.findById(fakeId);
      expect(dbDocument).toBeNull();
    });

    it('should return 400 for invalid ID format', async () => {
      // Real API call with invalid ID
      const response = await request(app)
        .get('/api/v1/documents/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v1/documents/:id - Real Database Updates', () => {
    it('should update document in database', async () => {
      // Create document in database
      const document = await Document.create({
        title: 'Original Document Title',
        filename: 'original-document.pdf',
        filePath: '/uploads/original-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'pending',
        uploadedBy: testUser._id,
        companyId: testCompany._id,
        tags: ['original', 'test'],
        metadata: {
          version: '1.0'
        }
      });

      const updateData = {
        title: 'Updated Document Title',
        type: 'legal',
        status: 'approved',
        tags: ['updated', 'legal', 'approved'],
        metadata: {
          version: '2.0',
          approvedBy: testUser._id,
          approvalDate: new Date()
        },
        description: 'Updated document with new information'
      };

      // Real API call
      const response = await request(app)
        .put(`/api/v1/documents/${document._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.type).toBe(updateData.type);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.tags).toEqual(updateData.tags);
      expect(response.body.metadata.version).toBe(updateData.metadata.version);
      
      // Verify database was actually updated
      const dbDocument = await Document.findById(document._id);
      expect(dbDocument.title).toBe(updateData.title);
      expect(dbDocument.type).toBe(updateData.type);
      expect(dbDocument.status).toBe(updateData.status);
      expect(dbDocument.tags).toEqual(updateData.tags);
      expect(dbDocument.metadata.version).toBe(updateData.metadata.version);
      expect(dbDocument.description).toBe(updateData.description);
    });

    it('should validate update data against database constraints', async () => {
      // Create document in database
      const document = await Document.create({
        title: 'Test Document Update',
        filename: 'test-update.pdf',
        filePath: '/uploads/test-update.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'pending',
        uploadedBy: testUser._id,
        companyId: testCompany._id
      });

      const invalidUpdateData = {
        fileSize: -2048000, // Invalid negative size
        type: 'invalid-type', // Invalid type
        status: 'invalid-status' // Invalid status
      };

      // Real API call
      const response = await request(app)
        .put(`/api/v1/documents/${document._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
      
      // Verify database was not updated
      const dbDocument = await Document.findById(document._id);
      expect(dbDocument.fileSize).toBe(1024000); // Original value
      expect(dbDocument.type).toBe('financial'); // Original value
      expect(dbDocument.status).toBe('pending'); // Original value
    });

    it('should return 404 for non-existent document update', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .put(`/api/v1/documents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Document' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/documents/:id - Real Database Deletions', () => {
    it('should delete document from database', async () => {
      // Create document in database
      const document = await Document.create({
        title: 'Document To Delete',
        filename: 'delete-me.pdf',
        filePath: '/uploads/delete-me.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'pending',
        uploadedBy: testUser._id,
        companyId: testCompany._id
      });

      // Real API call
      const response = await request(app)
        .delete(`/api/v1/documents/${document._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify document was actually deleted from database
      const dbDocument = await Document.findById(document._id);
      expect(dbDocument).toBeNull();
      
      // Verify database count
      const totalCount = await Document.countDocuments();
      expect(totalCount).toBe(0);
    });

    it('should return 404 for non-existent document deletion', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .delete(`/api/v1/documents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      
      // Verify no changes in database
      const totalCount = await Document.countDocuments();
      expect(totalCount).toBe(0);
    });
  });

  describe('GET /api/v1/documents/analytics - Real Database Aggregations', () => {
    it('should return analytics from real database aggregations', async () => {
      // Create documents with different types, statuses, and sizes
      await Document.create([
        {
          title: 'Financial Document 1',
          filename: 'financial-1.pdf',
          filePath: '/uploads/financial-1.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Financial Document 2',
          filename: 'financial-2.pdf',
          filePath: '/uploads/financial-2.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          type: 'financial',
          status: 'pending',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'Legal Document',
          filename: 'legal-1.pdf',
          filePath: '/uploads/legal-1.pdf',
          fileSize: 3072000,
          mimeType: 'application/pdf',
          type: 'legal',
          status: 'approved',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        },
        {
          title: 'HR Document',
          filename: 'hr-1.pdf',
          filePath: '/uploads/hr-1.pdf',
          fileSize: 512000,
          mimeType: 'application/pdf',
          type: 'hr',
          status: 'rejected',
          uploadedBy: testUser._id,
          companyId: testCompany._id
        }
      ]);

      // Real API call
      const response = await request(app)
        .get('/api/v1/documents/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalDocuments');
      expect(response.body).toHaveProperty('totalFileSize');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('averageFileSize');
      expect(response.body).toHaveProperty('byMimeType');
      
      // Verify calculations match database
      expect(response.body.totalDocuments).toBe(4);
      expect(response.body.totalFileSize).toBe(6656000); // Sum of all file sizes
      expect(response.body.byType.financial).toBe(2);
      expect(response.body.byType.legal).toBe(1);
      expect(response.body.byType.hr).toBe(1);
      expect(response.body.byStatus.approved).toBe(2);
      expect(response.body.byStatus.pending).toBe(1);
      expect(response.body.byStatus.rejected).toBe(1);
      expect(response.body.averageFileSize).toBe(1664000); // Total / count
      
      // Verify with direct database queries
      const totalDocuments = await Document.countDocuments();
      const aggregationResult = await Document.aggregate([
        {
          $group: {
            _id: null,
            totalFileSize: { $sum: '$fileSize' },
            avgFileSize: { $avg: '$fileSize' }
          }
        }
      ]);
      
      expect(totalDocuments).toBe(4);
      expect(aggregationResult[0].totalFileSize).toBe(6656000);
      expect(aggregationResult[0].avgFileSize).toBe(1664000);
    });
  });

  describe('POST /api/v1/documents/:id/approve - Real Database Status Updates', () => {
    it('should approve document in database', async () => {
      // Create pending document in database
      const document = await Document.create({
        title: 'Document To Approve',
        filename: 'approve-me.pdf',
        filePath: '/uploads/approve-me.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'pending',
        uploadedBy: testUser._id,
        companyId: testCompany._id
      });

      // Real API call
      const response = await request(app)
        .post(`/api/v1/documents/${document._id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          approvalNotes: 'Document approved after review',
          approvedBy: testUser._id
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('approved');
      expect(response.body.approvalNotes).toBe('Document approved after review');
      
      // Verify database was updated
      const dbDocument = await Document.findById(document._id);
      expect(dbDocument.status).toBe('approved');
      expect(dbDocument.approvalNotes).toBe('Document approved after review');
      expect(dbDocument.approvedBy).toEqual(testUser._id);
      expect(dbDocument.approvalDate).toBeTruthy();
    });
  });

  describe('POST /api/v1/documents/:id/reject - Real Database Status Updates', () => {
    it('should reject document in database', async () => {
      // Create pending document in database
      const document = await Document.create({
        title: 'Document To Reject',
        filename: 'reject-me.pdf',
        filePath: '/uploads/reject-me.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        type: 'financial',
        status: 'pending',
        uploadedBy: testUser._id,
        companyId: testCompany._id
      });

      // Real API call
      const response = await request(app)
        .post(`/api/v1/documents/${document._id}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          rejectionReason: 'Document does not meet compliance requirements',
          rejectedBy: testUser._id
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('rejected');
      expect(response.body.rejectionReason).toBe('Document does not meet compliance requirements');
      
      // Verify database was updated
      const dbDocument = await Document.findById(document._id);
      expect(dbDocument.status).toBe('rejected');
      expect(dbDocument.rejectionReason).toBe('Document does not meet compliance requirements');
      expect(dbDocument.rejectedBy).toEqual(testUser._id);
      expect(dbDocument.rejectionDate).toBeTruthy();
    });
  });
});