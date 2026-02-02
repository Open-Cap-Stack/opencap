#!/usr/bin/env node

/**
 * Document Migration Script - MongoDB to ZeroDB
 *
 * Issue #12: Migrate Documents and File metadata to ZeroDB
 *
 * This script migrates document metadata from MongoDB to ZeroDB while:
 * - Processing documents in batches of 100
 * - Preserving file references and URLs
 * - Migrating categories and tags
 * - Validating document-company relationships
 * - Supporting idempotent operations
 * - Preparing data structure for vector embedding in Phase 4
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Document = require('../models/Document');
const Company = require('../models/Company');
const zerodbService = require('../services/zerodbService');

// Configuration
const BATCH_SIZE = 100;
const MIGRATION_TABLE = 'documents';
const MIGRATION_TRACKING_TABLE = 'migration_tracking';

// Statistics tracking
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  failed: 0,
  invalidCompany: 0,
  startTime: null,
  endTime: null
};

// Cache for validated companies
const validCompanyIds = new Set();

/**
 * Load environment variables and validate required configuration
 */
function validateEnvironment() {
  const required = [
    'MONGODB_URI',
    'AINATIVE_API_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please ensure your .env file contains:');
    missing.forEach(key => console.error(`  ${key}=<value>`));
    process.exit(1);
  }

  console.log('Environment validation passed');
}

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Initialize ZeroDB service and create necessary tables
 */
async function initializeZeroDB() {
  try {
    const token = process.env.AINATIVE_API_TOKEN;
    await zerodbService.initialize(token);
    console.log('ZeroDB service initialized');

    // Create documents table if it doesn't exist
    try {
      await zerodbService.createTable(MIGRATION_TABLE, {
        documentId: { type: 'string', required: true, unique: true },
        mongoId: { type: 'string', indexed: true },
        name: { type: 'string', required: true, indexed: true },

        // File information
        originalFilename: { type: 'string', required: true },
        mimeType: { type: 'string', required: true },
        size: { type: 'number', required: true },
        storageLocation: { type: 'string' },
        storagePath: { type: 'string' },

        // Document organization
        category: { type: 'string', required: true, indexed: true },
        tags: { type: 'array' },

        // Ownership and access
        uploadedBy: { type: 'string', required: true, indexed: true },
        ownerCompany: { type: 'string', required: true, indexed: true },
        ownerCompanyValidated: { type: 'boolean', default: false },

        // Document status
        status: { type: 'string', required: true, indexed: true },

        // Document content (for text extraction and search)
        content: { type: 'string' },
        contentHash: { type: 'string' },

        // Document versioning
        version: { type: 'number', default: 1 },
        versionHistory: { type: 'array' },

        // Access control (preserved as JSON)
        accessControl: { type: 'object' },

        // Relationships with other documents
        relationships: { type: 'array' },

        // Additional metadata
        metadata: { type: 'object' },

        // System fields
        isTemplate: { type: 'boolean', default: false },
        isLocked: { type: 'boolean', default: false },
        lockedBy: { type: 'string' },
        lockedUntil: { type: 'date' },

        // Vector embedding preparation (Phase 4)
        embeddingStatus: { type: 'string', default: 'pending' },
        embeddingNamespace: { type: 'string', default: 'documents' },
        embeddingModel: { type: 'string' },
        embeddedAt: { type: 'date' },

        // Migration tracking
        migratedAt: { type: 'date' },
        migrationVersion: { type: 'string' },
        sourceCollection: { type: 'string', default: 'documents' },

        // Timestamps
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' }
      });
      console.log('Documents table created in ZeroDB');
    } catch (error) {
      if (error.response?.status === 409 || error.message?.includes('already exists')) {
        console.log('Documents table already exists in ZeroDB');
      } else {
        throw error;
      }
    }

    // Create migration tracking table for idempotency
    try {
      await zerodbService.createTable(MIGRATION_TRACKING_TABLE, {
        sourceId: { type: 'string', required: true, unique: true },
        sourceCollection: { type: 'string', required: true },
        targetTable: { type: 'string', required: true },
        migratedAt: { type: 'date', required: true },
        status: { type: 'string', required: true },
        checksum: { type: 'string' },
        migrationVersion: { type: 'string' }
      });
      console.log('Migration tracking table created');
    } catch (error) {
      if (error.response?.status === 409 || error.message?.includes('already exists')) {
        console.log('Migration tracking table already exists');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to initialize ZeroDB:', error.message);
    throw error;
  }
}

/**
 * Check if a document has already been migrated (idempotency check)
 */
async function isAlreadyMigrated(documentId) {
  try {
    const existing = await zerodbService.listFiles(0, 1);
    // Query the tracking table to check if this document was migrated
    // For now, we'll query the documents table directly
    const response = await zerodbService.client.post(
      `/projects/${zerodbService.projectId}/database/tables/${MIGRATION_TABLE}/query`,
      {
        filter: { documentId: documentId },
        limit: 1
      }
    );

    return response.data && response.data.length > 0;
  } catch (error) {
    // If table doesn't exist or query fails, assume not migrated
    return false;
  }
}

/**
 * Validate that the ownerCompany exists in MongoDB
 */
async function validateCompanyRelationship(companyId) {
  if (!companyId) {
    return false;
  }

  const companyIdStr = companyId.toString();

  // Check cache first
  if (validCompanyIds.has(companyIdStr)) {
    return true;
  }

  try {
    const company = await Company.findById(companyId);
    if (company) {
      validCompanyIds.add(companyIdStr);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Error validating company ${companyIdStr}:`, error.message);
    return false;
  }
}

/**
 * Generate a content hash for change detection
 */
function generateContentHash(document) {
  const crypto = require('crypto');
  const content = JSON.stringify({
    name: document.name,
    content: document.content,
    version: document.version,
    updatedAt: document.updatedAt
  });
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Transform MongoDB document to ZeroDB format
 */
function transformDocument(doc, companyValidated) {
  const now = new Date().toISOString();

  return {
    // Core identifiers
    documentId: doc.documentId,
    mongoId: doc._id.toString(),
    name: doc.name,

    // File information - preserve all file references and URLs
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    size: doc.size,
    storageLocation: doc.storageLocation || 'local',
    storagePath: doc.storagePath || null,

    // Document organization - migrate categories and tags
    category: doc.category,
    tags: doc.tags || [],

    // Ownership and access
    uploadedBy: doc.uploadedBy ? doc.uploadedBy.toString() : null,
    ownerCompany: doc.ownerCompany ? doc.ownerCompany.toString() : null,
    ownerCompanyValidated: companyValidated,

    // Document status
    status: doc.status || 'draft',

    // Document content
    content: doc.content || '',
    contentHash: generateContentHash(doc),

    // Document versioning
    version: doc.version || 1,
    versionHistory: (doc.versionHistory || []).map(vh => ({
      version: vh.version,
      changedAt: vh.changedAt ? vh.changedAt.toISOString() : null,
      changedBy: vh.changedBy ? vh.changedBy.toString() : null,
      changeDescription: vh.changeDescription || null
    })),

    // Access control - preserve full structure
    accessControl: {
      viewAccess: (doc.accessControl?.viewAccess || []).map(a =>
        typeof a === 'string' ? a : { entityType: a.entityType, entityId: a.entityId }
      ),
      editAccess: (doc.accessControl?.editAccess || []).map(a => ({
        entityType: a.entityType,
        entityId: a.entityId
      })),
      deleteAccess: (doc.accessControl?.deleteAccess || []).map(a => ({
        entityType: a.entityType,
        entityId: a.entityId
      })),
      adminAccess: (doc.accessControl?.adminAccess || []).map(a => ({
        entityType: a.entityType,
        entityId: a.entityId
      }))
    },

    // Relationships - preserve document relationships
    relationships: (doc.relationships || []).map(rel => ({
      relatedDocument: rel.relatedDocument ? rel.relatedDocument.toString() : null,
      relationType: rel.relationType,
      description: rel.description || null,
      createdAt: rel.createdAt ? rel.createdAt.toISOString() : null
    })),

    // Additional metadata - preserve all custom metadata
    metadata: doc.metadata || {},

    // System fields
    isTemplate: doc.isTemplate || false,
    isLocked: doc.isLocked || false,
    lockedBy: doc.lockedBy ? doc.lockedBy.toString() : null,
    lockedUntil: doc.lockedUntil ? doc.lockedUntil.toISOString() : null,

    // Vector embedding preparation (Phase 4)
    embeddingStatus: 'pending',
    embeddingNamespace: 'documents',
    embeddingModel: null,
    embeddedAt: null,

    // Migration tracking
    migratedAt: now,
    migrationVersion: '1.0.0',
    sourceCollection: 'documents',

    // Timestamps
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : now,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : now
  };
}

/**
 * Migrate a batch of documents to ZeroDB
 */
async function migrateBatch(documents) {
  const successful = [];
  const failed = [];

  for (const doc of documents) {
    try {
      // Check if already migrated (idempotency)
      const alreadyMigrated = await isAlreadyMigrated(doc.documentId);
      if (alreadyMigrated) {
        console.log(`  Skipping ${doc.documentId} - already migrated`);
        stats.skipped++;
        continue;
      }

      // Validate company relationship
      const companyValidated = await validateCompanyRelationship(doc.ownerCompany);
      if (!companyValidated) {
        console.warn(`  Warning: Invalid company reference for document ${doc.documentId}`);
        stats.invalidCompany++;
      }

      // Transform document
      const transformed = transformDocument(doc, companyValidated);

      // Upload file metadata to ZeroDB
      await zerodbService.uploadFileMetadata(
        transformed.documentId,
        transformed.originalFilename,
        transformed.mimeType,
        transformed.size,
        {
          mongoId: transformed.mongoId,
          category: transformed.category,
          tags: transformed.tags,
          ownerCompany: transformed.ownerCompany,
          uploadedBy: transformed.uploadedBy,
          status: transformed.status,
          version: transformed.version,
          storageLocation: transformed.storageLocation,
          storagePath: transformed.storagePath,
          embeddingStatus: transformed.embeddingStatus,
          embeddingNamespace: transformed.embeddingNamespace,
          migratedAt: transformed.migratedAt,
          migrationVersion: transformed.migrationVersion
        }
      );

      // Insert full document record into documents table
      await zerodbService.client.post(
        `/projects/${zerodbService.projectId}/database/tables/${MIGRATION_TABLE}/rows`,
        [transformed]
      );

      successful.push(doc.documentId);
      stats.migrated++;

    } catch (error) {
      console.error(`  Failed to migrate ${doc.documentId}:`, error.message);
      failed.push({ documentId: doc.documentId, error: error.message });
      stats.failed++;
    }
  }

  return { successful, failed };
}

/**
 * Main migration function - processes documents in batches
 */
async function migrateDocuments() {
  console.log('\n=== Starting Document Migration to ZeroDB ===\n');
  stats.startTime = new Date();

  try {
    // Get total count
    const totalCount = await Document.countDocuments();
    stats.total = totalCount;
    console.log(`Total documents to process: ${totalCount}`);

    if (totalCount === 0) {
      console.log('No documents found in MongoDB. Migration complete.');
      return;
    }

    let skip = 0;
    let batchNumber = 1;

    // Process in batches of 100
    while (skip < totalCount) {
      console.log(`\nProcessing batch ${batchNumber} (${skip + 1} - ${Math.min(skip + BATCH_SIZE, totalCount)} of ${totalCount})...`);

      // Fetch batch from MongoDB
      const documents = await Document.find()
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (documents.length === 0) {
        break;
      }

      // Migrate batch
      const result = await migrateBatch(documents);

      console.log(`  Batch ${batchNumber} complete: ${result.successful.length} migrated, ${result.failed.length} failed`);

      skip += BATCH_SIZE;
      batchNumber++;

      // Small delay between batches to avoid rate limiting
      if (skip < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    stats.endTime = new Date();

    // Print summary
    printSummary();

  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  }
}

/**
 * Print migration summary
 */
function printSummary() {
  const duration = stats.endTime - stats.startTime;
  const durationSeconds = (duration / 1000).toFixed(2);

  console.log('\n=== Migration Summary ===');
  console.log(`Total documents: ${stats.total}`);
  console.log(`Successfully migrated: ${stats.migrated}`);
  console.log(`Skipped (already migrated): ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Invalid company references: ${stats.invalidCompany}`);
  console.log(`Duration: ${durationSeconds} seconds`);
  console.log(`Rate: ${(stats.migrated / (duration / 1000)).toFixed(2)} docs/second`);
  console.log('========================\n');

  if (stats.failed > 0) {
    console.warn('Some documents failed to migrate. Review the logs above for details.');
  }

  if (stats.invalidCompany > 0) {
    console.warn(`${stats.invalidCompany} documents have invalid company references. These were migrated but flagged.`);
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('Document Migration Script - MongoDB to ZeroDB');
  console.log('Issue #12: Migrate Documents and File metadata to ZeroDB\n');

  try {
    // Step 1: Validate environment
    validateEnvironment();

    // Step 2: Connect to MongoDB
    await connectMongoDB();

    // Step 3: Initialize ZeroDB
    await initializeZeroDB();

    // Step 4: Run migration
    await migrateDocuments();

    console.log('Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Handle CLI execution
if (require.main === module) {
  main();
}

// Export for programmatic use
module.exports = {
  migrateDocuments,
  validateEnvironment,
  connectMongoDB,
  initializeZeroDB,
  transformDocument,
  validateCompanyRelationship,
  isAlreadyMigrated,
  stats
};
