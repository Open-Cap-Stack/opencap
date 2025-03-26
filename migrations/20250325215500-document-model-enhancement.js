/**
 * Migration: Document Model Enhancement
 * Created: 2025-03-25T21:55:00.000Z
 * 
 * [Feature] OCDI-108: Enhance Document data model
 * 
 * This migration transforms existing documents from the old documentModel
 * structure to the new enhanced Document model with versioning, access control,
 * and relationship features.
 */

const mongoose = require('mongoose');
const { connectDB } = require('../db');

module.exports = {
  name: 'document-model-enhancement',
  description: 'Migrate documents from old model to enhanced Document model',
  
  /**
   * Apply the migration - transform old documents to new format
   * @returns {Promise<void>}
   */
  up: async function() {
    await connectDB();
    
    console.log('Migrating documents to enhanced Document model...');
    
    // Get references to both models
    // The old model
    const OldDocument = mongoose.model('Document', new mongoose.Schema({
      documentId: String,
      name: String,
      metadata: Object,
      uploadedBy: mongoose.Schema.Types.ObjectId,
      path: String,
      title: String,
      content: String,
      DocumentType: String,
      FileType: String,
      Versioning: String,
      AccessControl: Object,
      LegalSignificance: String
    }, { timestamps: true }), 'documents');
    
    // The new model (imported dynamically to avoid schema conflicts)
    const NewDocument = require('../models/Document');
    
    // Count documents to migrate
    const count = await OldDocument.countDocuments();
    console.log(`Found ${count} documents to migrate`);
    
    if (count === 0) {
      console.log('No documents to migrate, skipping');
      return;
    }
    
    // Get all old documents
    const oldDocuments = await OldDocument.find();
    
    // Track migration statistics
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each document
    for (const oldDoc of oldDocuments) {
      try {
        // Map old fields to new structure
        const newDoc = new NewDocument({
          // Basic identification (preserve original ID if possible)
          documentId: oldDoc.documentId || undefined,
          name: oldDoc.name || oldDoc.title || 'Untitled Document',
          
          // File information (derive from old data)
          originalFilename: oldDoc.path ? oldDoc.path.split('/').pop() : 'unknown.file',
          mimeType: mapFileTypeToMimeType(oldDoc.FileType || 'TXT'),
          size: calculateApproximateSize(oldDoc.content),
          
          // Document organization
          category: mapDocumentTypeToCategory(oldDoc.DocumentType || 'Other'),
          tags: generateTagsFromOldDocument(oldDoc),
          
          // Ownership and content
          uploadedBy: oldDoc.uploadedBy,
          ownerCompany: oldDoc.uploadedBy, // Use uploadedBy as ownerCompany for now
          content: oldDoc.content || '',
          
          // Status
          status: 'active',
          
          // Metadata - preserve any existing metadata
          metadata: {
            ...oldDoc.metadata,
            migratedFrom: 'legacy-document-model',
            migrationDate: new Date(),
            legacyFields: {
              path: oldDoc.path,
              title: oldDoc.title,
              documentType: oldDoc.DocumentType,
              fileType: oldDoc.FileType,
              versioning: oldDoc.Versioning,
              legalSignificance: oldDoc.LegalSignificance
            }
          }
        });
        
        // If old document had access control, map it to new structure
        if (oldDoc.AccessControl) {
          try {
            newDoc.accessControl = mapAccessControl(oldDoc.AccessControl);
          } catch (accessError) {
            console.warn(`Warning: Could not map access control for document ${oldDoc._id}: ${accessError.message}`);
          }
        }
        
        // Save the new document
        await newDoc.save();
        migrated++;
        
        console.log(`Migrated document ${oldDoc._id} to new ID ${newDoc._id}`);
      } catch (error) {
        console.error(`Error migrating document ${oldDoc._id}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  },
  
  /**
   * Rollback the migration - this is more complex as we need to preserve data
   * @returns {Promise<void>}
   */
  down: async function() {
    await connectDB();
    
    console.log('Rolling back document model enhancement migration...');
    
    // Get models
    const NewDocument = require('../models/Document');
    const OldDocument = mongoose.model('Document', new mongoose.Schema({
      documentId: String,
      name: String,
      metadata: Object,
      uploadedBy: mongoose.Schema.Types.ObjectId,
      path: String,
      title: String,
      content: String,
      DocumentType: String,
      FileType: String,
      Versioning: String,
      AccessControl: Object,
      LegalSignificance: String
    }, { timestamps: true }), 'documents');
    
    // Find all documents that were migrated from the old format
    const migratedDocs = await NewDocument.find({
      'metadata.migratedFrom': 'legacy-document-model'
    });
    
    console.log(`Found ${migratedDocs.length} documents to roll back`);
    
    let reverted = 0;
    let errors = 0;
    
    for (const newDoc of migratedDocs) {
      try {
        // Extract original legacy fields from metadata
        const legacyFields = newDoc.metadata?.legacyFields || {};
        
        // Create old-format document
        const oldDoc = new OldDocument({
          documentId: newDoc.documentId,
          name: newDoc.name,
          uploadedBy: newDoc.uploadedBy,
          path: legacyFields.path || '',
          title: legacyFields.title || newDoc.name,
          content: newDoc.content,
          DocumentType: legacyFields.documentType || mapCategoryToDocumentType(newDoc.category),
          FileType: legacyFields.fileType || mapMimeTypeToFileType(newDoc.mimeType),
          Versioning: legacyFields.versioning || `${newDoc.version}.0`,
          AccessControl: legacyFields.accessControl || mapNewAccessControlToOld(newDoc.accessControl),
          LegalSignificance: legacyFields.legalSignificance || ''
        });
        
        // Preserve any metadata that wasn't related to migration
        const filteredMetadata = { ...newDoc.metadata };
        delete filteredMetadata.migratedFrom;
        delete filteredMetadata.migrationDate;
        delete filteredMetadata.legacyFields;
        
        if (Object.keys(filteredMetadata).length > 0) {
          oldDoc.metadata = filteredMetadata;
        }
        
        await oldDoc.save();
        reverted++;
        
        // Remove the new document
        await NewDocument.findByIdAndDelete(newDoc._id);
        
        console.log(`Reverted document ${newDoc._id} to old format ${oldDoc._id}`);
      } catch (error) {
        console.error(`Error reverting document ${newDoc._id}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`Rollback complete: ${reverted} reverted, ${errors} errors`);
  }
};

/**
 * Helper function to map old FileType to MIME type
 */
function mapFileTypeToMimeType(fileType) {
  const mimeTypeMap = {
    'PDF': 'application/pdf',
    'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'TXT': 'text/plain'
  };
  
  return mimeTypeMap[fileType] || 'application/octet-stream';
}

/**
 * Helper function to map MIME type back to FileType
 */
function mapMimeTypeToFileType(mimeType) {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('docx')) return 'DOCX';
  if (mimeType.includes('text')) return 'TXT';
  return 'TXT';
}

/**
 * Helper function to map old DocumentType to category
 */
function mapDocumentTypeToCategory(documentType) {
  const categoryMap = {
    'Legal': 'legal',
    'Financial': 'financial',
    'Other': 'general'
  };
  
  return categoryMap[documentType] || 'general';
}

/**
 * Helper function to map category back to DocumentType
 */
function mapCategoryToDocumentType(category) {
  const documentTypeMap = {
    'legal': 'Legal',
    'financial': 'Financial',
    'hr': 'Other',
    'general': 'Other'
  };
  
  return documentTypeMap[category] || 'Other';
}

/**
 * Helper function to generate tags from old document
 */
function generateTagsFromOldDocument(oldDoc) {
  const tags = [];
  
  // Add document type as tag
  if (oldDoc.DocumentType) {
    tags.push(oldDoc.DocumentType.toLowerCase());
  }
  
  // Add file type as tag
  if (oldDoc.FileType) {
    tags.push(oldDoc.FileType.toLowerCase());
  }
  
  // Extract potential tags from title
  if (oldDoc.title) {
    const titleWords = oldDoc.title.split(/\s+/).filter(word => word.length > 3);
    tags.push(...titleWords.slice(0, 3)); // Add up to 3 words from title
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Helper function to estimate document size
 */
function calculateApproximateSize(content) {
  if (!content) return 1024; // Default 1KB
  return Buffer.from(content).length;
}

/**
 * Helper function to map old access control to new format
 */
function mapAccessControl(oldAccessControl) {
  // Default to empty access control
  const newAccessControl = {
    viewAccess: ['authenticated'],
    editAccess: [],
    deleteAccess: [],
    adminAccess: []
  };
  
  try {
    if (typeof oldAccessControl !== 'object') {
      return newAccessControl;
    }
    
    // Map public/private setting
    if (oldAccessControl.isPublic === true) {
      newAccessControl.viewAccess = ['public'];
    }
    
    // Map user permissions
    if (Array.isArray(oldAccessControl.users)) {
      oldAccessControl.users.forEach(user => {
        if (!user.userId) return;
        
        if (user.canView) {
          newAccessControl.viewAccess.push({
            entityType: 'user',
            entityId: user.userId.toString()
          });
        }
        
        if (user.canEdit) {
          newAccessControl.editAccess.push({
            entityType: 'user',
            entityId: user.userId.toString()
          });
        }
        
        if (user.canDelete) {
          newAccessControl.deleteAccess.push({
            entityType: 'user',
            entityId: user.userId.toString()
          });
        }
        
        if (user.isAdmin) {
          newAccessControl.adminAccess.push({
            entityType: 'user',
            entityId: user.userId.toString()
          });
        }
      });
    }
  } catch (error) {
    console.warn(`Warning in mapAccessControl: ${error.message}`);
  }
  
  return newAccessControl;
}

/**
 * Helper function to map new access control format back to old
 */
function mapNewAccessControlToOld(newAccessControl) {
  const oldFormat = {
    isPublic: false,
    users: []
  };
  
  try {
    // Check for public access
    if (newAccessControl?.viewAccess?.includes('public')) {
      oldFormat.isPublic = true;
    }
    
    // Map user permissions from all access control lists
    const userMap = new Map();
    
    // Process each user in viewAccess
    if (Array.isArray(newAccessControl?.viewAccess)) {
      newAccessControl.viewAccess.forEach(item => {
        if (typeof item === 'object' && item.entityType === 'user') {
          const userId = item.entityId;
          if (!userMap.has(userId)) {
            userMap.set(userId, { userId, canView: true });
          } else {
            userMap.get(userId).canView = true;
          }
        }
      });
    }
    
    // Process each user in editAccess
    if (Array.isArray(newAccessControl?.editAccess)) {
      newAccessControl.editAccess.forEach(item => {
        if (item.entityType === 'user') {
          const userId = item.entityId;
          if (!userMap.has(userId)) {
            userMap.set(userId, { userId, canEdit: true });
          } else {
            userMap.get(userId).canEdit = true;
          }
        }
      });
    }
    
    // Process each user in deleteAccess
    if (Array.isArray(newAccessControl?.deleteAccess)) {
      newAccessControl.deleteAccess.forEach(item => {
        if (item.entityType === 'user') {
          const userId = item.entityId;
          if (!userMap.has(userId)) {
            userMap.set(userId, { userId, canDelete: true });
          } else {
            userMap.get(userId).canDelete = true;
          }
        }
      });
    }
    
    // Process each user in adminAccess
    if (Array.isArray(newAccessControl?.adminAccess)) {
      newAccessControl.adminAccess.forEach(item => {
        if (item.entityType === 'user') {
          const userId = item.entityId;
          if (!userMap.has(userId)) {
            userMap.set(userId, { userId, isAdmin: true });
          } else {
            userMap.get(userId).isAdmin = true;
          }
        }
      });
    }
    
    // Convert map to array
    oldFormat.users = Array.from(userMap.values());
  } catch (error) {
    console.warn(`Warning in mapNewAccessControlToOld: ${error.message}`);
  }
  
  return oldFormat;
}
