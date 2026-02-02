#!/usr/bin/env node

/**
 * ShareClass Migration Script - MongoDB to ZeroDB
 *
 * Migrates ShareClass data from MongoDB to ZeroDB lakehouse.
 * Implements batch processing, validation, and idempotent operations.
 *
 * Usage:
 *   node scripts/migrate-share-classes.js [--dry-run] [--batch-size=100]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ShareClass = require('../models/ShareClass');
const zerodbService = require('../services/zerodbService');

const BATCH_SIZE = parseInt(process.env.MIGRATION_BATCH_SIZE) || 100;
const DRY_RUN = process.argv.includes('--dry-run');
const ZERODB_TABLE = 'share_classes';

/**
 * Validate financial calculations for a share class
 * @param {Object} shareClass - ShareClass document
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateFinancialCalculations(shareClass) {
  const errors = [];
  const warnings = [];

  // Validate amountRaised is non-negative
  if (typeof shareClass.amountRaised !== 'number' || shareClass.amountRaised < 0) {
    errors.push(`Invalid amountRaised: ${shareClass.amountRaised}. Must be non-negative number.`);
  }

  // Validate ownershipPercentage is between 0 and 100
  if (typeof shareClass.ownershipPercentage !== 'number' ||
      shareClass.ownershipPercentage < 0 ||
      shareClass.ownershipPercentage > 100) {
    errors.push(`Invalid ownershipPercentage: ${shareClass.ownershipPercentage}. Must be between 0 and 100.`);
  }

  // Validate dilutedShares is non-negative
  if (typeof shareClass.dilutedShares !== 'number' || shareClass.dilutedShares < 0) {
    errors.push(`Invalid dilutedShares: ${shareClass.dilutedShares}. Must be non-negative number.`);
  }

  // Validate authorizedShares is non-negative
  if (typeof shareClass.authorizedShares !== 'number' || shareClass.authorizedShares < 0) {
    errors.push(`Invalid authorizedShares: ${shareClass.authorizedShares}. Must be non-negative number.`);
  }

  // Business logic validation: dilutedShares should not exceed authorizedShares
  if (shareClass.dilutedShares > shareClass.authorizedShares) {
    warnings.push(`dilutedShares (${shareClass.dilutedShares}) exceeds authorizedShares (${shareClass.authorizedShares}).`);
  }

  // Calculate conversion rate
  let conversionRate = 0;
  if (shareClass.dilutedShares > 0) {
    conversionRate = parseFloat((shareClass.authorizedShares / shareClass.dilutedShares).toFixed(4));
  }

  // Calculate price per share if amountRaised and dilutedShares are valid
  let pricePerShare = 0;
  if (shareClass.dilutedShares > 0 && shareClass.amountRaised > 0) {
    pricePerShare = parseFloat((shareClass.amountRaised / shareClass.dilutedShares).toFixed(6));
  }

  // Validate that share class ID is present
  if (!shareClass.shareClassId || typeof shareClass.shareClassId !== 'string') {
    errors.push('shareClassId is required and must be a string.');
  }

  // Validate name is present
  if (!shareClass.name || typeof shareClass.name !== 'string') {
    errors.push('name is required and must be a string.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedValues: {
      conversionRate,
      pricePerShare,
      sharesValid: shareClass.dilutedShares <= shareClass.authorizedShares
    }
  };
}

/**
 * Transform MongoDB share class to ZeroDB format
 * @param {Object} mongoDoc - MongoDB document
 * @returns {Object} ZeroDB formatted document
 */
function transformForZeroDB(mongoDoc) {
  const validation = validateFinancialCalculations(mongoDoc);

  return {
    // Primary identifiers
    shareClassId: mongoDoc.shareClassId,
    name: mongoDoc.name,
    description: mongoDoc.description || '',

    // Financial data
    amountRaised: mongoDoc.amountRaised,
    ownershipPercentage: mongoDoc.ownershipPercentage,
    dilutedShares: mongoDoc.dilutedShares,
    authorizedShares: mongoDoc.authorizedShares,

    // Calculated fields
    conversionRate: validation.calculatedValues.conversionRate,
    pricePerShare: validation.calculatedValues.pricePerShare,
    sharesValid: validation.calculatedValues.sharesValid,

    // Timestamps
    createdAt: mongoDoc.createdAt ? mongoDoc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: mongoDoc.updatedAt ? mongoDoc.updatedAt.toISOString() : new Date().toISOString(),

    // Migration metadata
    _mongoId: mongoDoc._id.toString(),
    _migrationVersion: '1.0',
    _migratedAt: new Date().toISOString()
  };
}

/**
 * Check if a share class already exists in ZeroDB
 * @param {string} shareClassId - ShareClass ID to check
 * @returns {Promise<boolean>} True if exists
 */
async function existsInZeroDB(shareClassId) {
  try {
    const result = await zerodbService.queryTable(ZERODB_TABLE, {
      filter: { shareClassId },
      limit: 1,
      projection: { shareClassId: 1 }
    });
    return result && result.length > 0;
  } catch (error) {
    // Table might not exist yet
    if (error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Create share_classes table in ZeroDB if it doesn't exist
 */
async function ensureTableExists() {
  try {
    const tables = await zerodbService.listTables();
    const tableExists = tables.some(t => t.table_name === ZERODB_TABLE || t.name === ZERODB_TABLE);

    if (!tableExists) {
      console.log(`Creating ${ZERODB_TABLE} table in ZeroDB...`);
      await zerodbService.createTable(ZERODB_TABLE, {
        shareClassId: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true, indexed: true },
        description: { type: 'string' },
        amountRaised: { type: 'number', required: true },
        ownershipPercentage: { type: 'number', required: true },
        dilutedShares: { type: 'number', required: true },
        authorizedShares: { type: 'number', required: true },
        conversionRate: { type: 'number' },
        pricePerShare: { type: 'number' },
        sharesValid: { type: 'boolean', default: true },
        createdAt: { type: 'date', indexed: true },
        updatedAt: { type: 'date' },
        _mongoId: { type: 'string' },
        _migrationVersion: { type: 'string' },
        _migratedAt: { type: 'date' }
      });
      console.log(`Table ${ZERODB_TABLE} created successfully.`);
    } else {
      console.log(`Table ${ZERODB_TABLE} already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring table exists:', error.message);
    throw error;
  }
}

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');
}

/**
 * Initialize ZeroDB service
 */
async function initializeZeroDB() {
  const token = process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY;
  if (!token) {
    throw new Error('AINATIVE_API_TOKEN or ZERODB_API_KEY environment variable is not set');
  }

  console.log('Initializing ZeroDB service...');
  await zerodbService.initialize(token);
  console.log('ZeroDB service initialized.');
}

/**
 * Main migration function
 */
async function migrateShareClasses() {
  console.log('='.repeat(60));
  console.log('ShareClass Migration: MongoDB to ZeroDB');
  console.log('='.repeat(60));
  console.log(`Batch Size: ${BATCH_SIZE}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  console.log('');

  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    validationErrors: [],
    validationWarnings: [],
    startTime: Date.now()
  };

  try {
    // Connect to databases
    await connectMongoDB();
    await initializeZeroDB();

    // Ensure table exists
    if (!DRY_RUN) {
      await ensureTableExists();
    }

    // Get total count
    stats.total = await ShareClass.countDocuments();
    console.log(`Total share classes to migrate: ${stats.total}`);
    console.log('');

    if (stats.total === 0) {
      console.log('No share classes found in MongoDB. Nothing to migrate.');
      return stats;
    }

    // Process in batches
    let skip = 0;
    let batchNumber = 1;

    while (skip < stats.total) {
      console.log(`Processing batch ${batchNumber} (${skip + 1}-${Math.min(skip + BATCH_SIZE, stats.total)} of ${stats.total})...`);

      // Fetch batch from MongoDB
      const batch = await ShareClass.find()
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (batch.length === 0) break;

      const toInsert = [];

      for (const shareClass of batch) {
        // Validate financial calculations
        const validation = validateFinancialCalculations(shareClass);

        if (!validation.isValid) {
          stats.validationErrors.push({
            shareClassId: shareClass.shareClassId,
            errors: validation.errors
          });
          console.warn(`  Validation error for ${shareClass.shareClassId}: ${validation.errors.join(', ')}`);
          stats.failed++;
          continue; // Skip records with validation errors
        }

        if (validation.warnings.length > 0) {
          stats.validationWarnings.push({
            shareClassId: shareClass.shareClassId,
            warnings: validation.warnings
          });
          console.warn(`  Validation warning for ${shareClass.shareClassId}: ${validation.warnings.join(', ')}`);
        }

        // Check for idempotency - skip if already migrated
        if (!DRY_RUN) {
          const exists = await existsInZeroDB(shareClass.shareClassId);
          if (exists) {
            stats.skipped++;
            continue;
          }
        }

        // Transform for ZeroDB
        const transformed = transformForZeroDB(shareClass);
        toInsert.push(transformed);
      }

      // Insert batch into ZeroDB
      if (toInsert.length > 0) {
        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would insert ${toInsert.length} share classes`);
          stats.migrated += toInsert.length;
        } else {
          try {
            await zerodbService.insertRows(ZERODB_TABLE, toInsert);
            stats.migrated += toInsert.length;
            console.log(`  Inserted ${toInsert.length} share classes`);
          } catch (error) {
            console.error(`  Error inserting batch: ${error.message}`);
            stats.failed += toInsert.length;
          }
        }
      }

      skip += BATCH_SIZE;
      batchNumber++;
    }

    // Calculate duration
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total in MongoDB:     ${stats.total}`);
    console.log(`Migrated:             ${stats.migrated}`);
    console.log(`Skipped (existing):   ${stats.skipped}`);
    console.log(`Failed:               ${stats.failed}`);
    console.log(`Validation errors:    ${stats.validationErrors.length}`);
    console.log(`Validation warnings:  ${stats.validationWarnings.length}`);
    console.log(`Duration:             ${duration}s`);
    console.log('='.repeat(60));

    if (stats.validationErrors.length > 0) {
      console.log('');
      console.log('Validation Errors (records skipped):');
      stats.validationErrors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.shareClassId}: ${err.errors.join(', ')}`);
      });
      if (stats.validationErrors.length > 10) {
        console.log(`  ... and ${stats.validationErrors.length - 10} more`);
      }
    }

    if (stats.validationWarnings.length > 0) {
      console.log('');
      console.log('Validation Warnings (records still migrated):');
      stats.validationWarnings.slice(0, 10).forEach(warn => {
        console.log(`  - ${warn.shareClassId}: ${warn.warnings.join(', ')}`);
      });
      if (stats.validationWarnings.length > 10) {
        console.log(`  ... and ${stats.validationWarnings.length - 10} more`);
      }
    }

    return stats;

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
}

// CLI execution
if (require.main === module) {
  migrateShareClasses()
    .then(stats => {
      if (stats.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateShareClasses,
  validateFinancialCalculations,
  transformForZeroDB,
  existsInZeroDB,
  ensureTableExists
};
