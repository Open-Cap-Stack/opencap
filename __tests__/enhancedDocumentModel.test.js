/**
 * Test file for Enhanced Document Data Model
 * 
 * [Feature] OCDI-108: Create Document data model
 * 
 * Tests the comprehensive document model with enhanced features:
 * - Document versioning and history
 * - Advanced metadata
 * - Access controls
 * - Category and tagging
 * - Document relationships
 */

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db');
// We'll implement this enhanced Document model
const Document = require('../models/Document');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await disconnectDB();
});

beforeEach(async () => {
  // Clean up before each test
  await Document.deleteMany({});
});

describe('Enhanced Document Model', () => {
  // Test data
  const userId = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();
  
  describe('Basic Document Operations', () => {
    it('should create a document with required fields', async () => {
      const doc = new Document({
        name: 'Financial Report Q1 2025',
        originalFilename: 'financial_report_q1_2025.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        category: 'financial',
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'active'
      });
      
      const savedDoc = await doc.save();
      expect(savedDoc._id).toBeDefined();
      expect(savedDoc.name).toBe('Financial Report Q1 2025');
      expect(savedDoc.documentId).toBeDefined(); // Auto-generated
      expect(savedDoc.createdAt).toBeDefined();
      expect(savedDoc.updatedAt).toBeDefined();
      expect(savedDoc.version).toBe(1); // Initial version
    });
    
    it('should fail validation if required fields are missing', async () => {
      const doc = new Document({
        name: 'Incomplete Document'
      });
      
      await expect(doc.save()).rejects.toThrow();
    });
    
    it('should update document metadata', async () => {
      // Create document
      const doc = new Document({
        name: 'Quarterly Report',
        originalFilename: 'quarterly_report.pdf',
        mimeType: 'application/pdf',
        size: 512000,
        category: 'financial',
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'active',
        metadata: {
          quarter: 'Q1',
          year: 2025,
          department: 'Finance'
        }
      });
      
      await doc.save();
      
      // Update document
      doc.metadata.quarter = 'Q2';
      doc.name = 'Updated Quarterly Report';
      const updatedDoc = await doc.save();
      
      expect(updatedDoc.metadata.quarter).toBe('Q2');
      expect(updatedDoc.name).toBe('Updated Quarterly Report');
      expect(updatedDoc.updatedAt).not.toEqual(updatedDoc.createdAt);
    });
  });
  
  describe('Document Versioning', () => {
    it('should increment version when content changes', async () => {
      // Create initial document
      const doc = new Document({
        name: 'Contract Draft',
        originalFilename: 'contract.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 250000,
        category: 'legal',
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'draft',
        content: 'Initial contract draft text'
      });
      
      await doc.save();
      expect(doc.version).toBe(1);
      
      // Update content
      doc.content = 'Updated contract text with new terms';
      await doc.save();
      
      expect(doc.version).toBe(2);
      expect(doc.versionHistory).toHaveLength(1);
      expect(doc.versionHistory[0].version).toBe(1);
      expect(doc.versionHistory[0].changedBy).toEqual(doc.uploadedBy);
    });
    
    it('should store version history with change information', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      
      // Create initial document
      const doc = new Document({
        name: 'Terms of Service',
        originalFilename: 'tos.pdf',
        mimeType: 'application/pdf',
        size: 150000,
        category: 'legal',
        uploadedBy: user1Id,
        ownerCompany: companyId,
        status: 'active',
        content: 'Original terms'
      });
      
      await doc.save();
      
      // First update by original user
      doc.content = 'Terms with first revision';
      doc.metadata = { revisionReason: 'Fixed typos' };
      await doc.save();
      
      // Second update by different user
      doc.content = 'Terms with second revision';
      doc.changedBy = user2Id; // Track who made this change
      doc.metadata = { revisionReason: 'Legal review changes' };
      await doc.save();
      
      expect(doc.version).toBe(3);
      expect(doc.versionHistory).toHaveLength(2);
      
      // Check first history entry
      expect(doc.versionHistory[0].version).toBe(1);
      expect(doc.versionHistory[0].changedBy).toEqual(user1Id);
      expect(doc.versionHistory[0].metadata).toBeUndefined();
      
      // Check second history entry 
      expect(doc.versionHistory[1].version).toBe(2);
      expect(doc.versionHistory[1].changedBy).toEqual(user2Id);
      expect(doc.versionHistory[1].metadata.revisionReason).toBe('Legal review changes');
    });
  });
  
  describe('Document Access Control', () => {
    it('should define access control lists', async () => {
      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();
      const team1 = new mongoose.Types.ObjectId();
      
      const doc = new Document({
        name: 'Confidential Report',
        originalFilename: 'confidential.pdf',
        mimeType: 'application/pdf',
        size: 500000,
        category: 'financial',
        uploadedBy: user1,
        ownerCompany: companyId,
        status: 'active',
        accessControl: {
          viewAccess: ['public'],
          editAccess: [
            { entityType: 'user', entityId: user1.toString() },
            { entityType: 'user', entityId: user2.toString() }
          ],
          deleteAccess: [
            { entityType: 'user', entityId: user1.toString() }
          ],
          adminAccess: [
            { entityType: 'team', entityId: team1.toString() }
          ]
        }
      });
      
      await doc.save();
      
      // Test hasAccess method
      expect(await doc.hasAccess(user1, 'view')).toBe(true); // Public access
      expect(await doc.hasAccess(user1, 'edit')).toBe(true);
      expect(await doc.hasAccess(user1, 'delete')).toBe(true);
      
      expect(await doc.hasAccess(user2, 'view')).toBe(true); // Public access
      expect(await doc.hasAccess(user2, 'edit')).toBe(true); 
      expect(await doc.hasAccess(user2, 'delete')).toBe(false);
      
      // Test team access
      const randomUser = new mongoose.Types.ObjectId();
      expect(await doc.hasAccess(randomUser, 'admin', [team1])).toBe(true);
      expect(await doc.hasAccess(randomUser, 'admin')).toBe(false);
    });
    
    it('should respect hierarchical access rights', async () => {
      const adminUser = new mongoose.Types.ObjectId();
      
      const doc = new Document({
        name: 'Hierarchical Access Test',
        originalFilename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100000,
        category: 'administrative',
        uploadedBy: adminUser,
        ownerCompany: companyId,
        status: 'active',
        accessControl: {
          viewAccess: ['authenticated'],
          editAccess: [{ entityType: 'role', entityId: 'editor' }],
          deleteAccess: [{ entityType: 'role', entityId: 'manager' }],
          adminAccess: [{ entityType: 'role', entityId: 'admin' }]
        }
      });
      
      await doc.save();
      
      // Admin role should have all permissions (hierarchical)
      expect(await doc.hasAccess(adminUser, 'view', [], ['admin'])).toBe(true);
      expect(await doc.hasAccess(adminUser, 'edit', [], ['admin'])).toBe(true);
      expect(await doc.hasAccess(adminUser, 'delete', [], ['admin'])).toBe(true);
      
      // Editor role should have view and edit but not delete
      const editorUser = new mongoose.Types.ObjectId();
      expect(await doc.hasAccess(editorUser, 'view', [], ['editor'])).toBe(true);
      expect(await doc.hasAccess(editorUser, 'edit', [], ['editor'])).toBe(true);
      expect(await doc.hasAccess(editorUser, 'delete', [], ['editor'])).toBe(false);
    });
  });
  
  describe('Document Relationships', () => {
    it('should create and maintain relationships between documents', async () => {
      // Create parent document
      const parentDoc = new Document({
        name: 'Main Agreement',
        originalFilename: 'agreement.pdf',
        mimeType: 'application/pdf',
        size: 300000,
        category: 'legal',
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'active'
      });
      
      await parentDoc.save();
      
      // Create related documents
      const appendixDoc = new Document({
        name: 'Appendix A',
        originalFilename: 'appendix_a.pdf',
        mimeType: 'application/pdf',
        size: 150000,
        category: 'legal',
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'active',
        relationships: [{
          relatedDocument: parentDoc._id,
          relationType: 'appendix-of',
          description: 'Appendix to main agreement'
        }]
      });
      
      await appendixDoc.save();
      
      const amendmentDoc = new Document({
        name: 'Amendment 1',
        originalFilename: 'amendment1.pdf',
        mimeType: 'application/pdf',
        size: 100000,
        category: 'legal',
        uploadedBy: userId,
        ownerCompany: companyId,
        status: 'active',
        relationships: [{
          relatedDocument: parentDoc._id,
          relationType: 'amends',
          description: 'Amendment to section 3.2'
        }]
      });
      
      await amendmentDoc.save();
      
      // Update parent document to recognize relationships
      parentDoc.relationships = [
        {
          relatedDocument: appendixDoc._id,
          relationType: 'has-appendix',
          description: 'Main appendix'
        },
        {
          relatedDocument: amendmentDoc._id, 
          relationType: 'amended-by',
          description: 'First amendment'
        }
      ];
      
      await parentDoc.save();
      
      // Test fetching related documents
      const relatedDocs = await Document.findRelatedDocuments(parentDoc._id);
      expect(relatedDocs).toHaveLength(2);
      
      // Test specific relationship query
      const appendices = await Document.findRelatedDocumentsByType(parentDoc._id, 'has-appendix');
      expect(appendices).toHaveLength(1);
      expect(appendices[0]._id.toString()).toBe(appendixDoc._id.toString());
    });
  });
  
  describe('Document Search and Filtering', () => {
    beforeEach(async () => {
      // Create test documents for search tests
      const docs = [
        {
          name: 'Annual Report 2024',
          originalFilename: 'annual_2024.pdf',
          mimeType: 'application/pdf',
          size: 5000000,
          category: 'financial',
          tags: ['annual', 'report', '2024', 'finances'],
          uploadedBy: userId,
          ownerCompany: companyId,
          status: 'active',
          metadata: {
            year: 2024,
            quarter: 'full-year',
            department: 'finance'
          }
        },
        {
          name: 'Q1 Financial Statement',
          originalFilename: 'q1_2025.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1500000,
          category: 'financial',
          tags: ['quarterly', 'statement', 'Q1', '2025'],
          uploadedBy: userId,
          ownerCompany: companyId,
          status: 'active',
          metadata: {
            year: 2025,
            quarter: 'Q1',
            department: 'finance'
          }
        },
        {
          name: 'Employee Handbook',
          originalFilename: 'handbook.pdf',
          mimeType: 'application/pdf',
          size: 2500000,
          category: 'hr',
          tags: ['handbook', 'employees', 'policies'],
          uploadedBy: userId,
          ownerCompany: companyId,
          status: 'active',
          metadata: {
            year: 2025,
            department: 'hr',
            version: '3.2'
          }
        }
      ];
      
      await Document.insertMany(docs);
    });
    
    it('should support filtering by tags', async () => {
      const results = await Document.findByTags(['quarterly', 'statement']);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Q1 Financial Statement');
    });
    
    it('should support filtering by category', async () => {
      const results = await Document.findByCategory('financial');
      expect(results).toHaveLength(2);
    });
    
    it('should support filtering by metadata', async () => {
      const results = await Document.findByMetadata({ 'year': 2025 });
      expect(results).toHaveLength(2);
      
      const q1Results = await Document.findByMetadata({ 'quarter': 'Q1' });
      expect(q1Results).toHaveLength(1);
      expect(q1Results[0].name).toBe('Q1 Financial Statement');
    });
    
    it('should support full-text search', async () => {
      const results = await Document.search('financial');
      expect(results).toHaveLength(2);
      
      const employeeResults = await Document.search('employee');
      expect(employeeResults).toHaveLength(1);
      expect(employeeResults[0].name).toBe('Employee Handbook');
    });
  });
});
