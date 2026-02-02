#!/usr/bin/env node

/**
 * Company Migration Script - MongoDB to ZeroDB
 *
 * Migrates Company records from MongoDB to ZeroDB lakehouse.
 * Supports batch processing, idempotency, and validation.
 *
 * Usage:
 *   node scripts/migrate-companies.js [options]
 *
 * Options:
 *   --dry-run     Preview migration without writing to ZeroDB
 *   --batch-size  Number of records per batch (default: 100)
 *   --skip        Number of records to skip (for resumption)
 *   --verbose     Enable detailed logging
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/Company');
const zerodbService = require('../services/zerodbService');

const BATCH_SIZE = parseInt(process.env.MIGRATION_BATCH_SIZE) || 100;
const TABLE_NAME = 'companies';

const config = {
  mongoUri: process.env.MONGODB_URI,
  zerodbToken: process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY,
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  batchSize: getBatchSize(),
  skip: getSkipCount()
};

function getBatchSize() {
  const index = process.argv.indexOf('--batch-size');
  if (index !== -1 && process.argv[index + 1]) {
    return parseInt(process.argv[index + 1]);
  }
  return BATCH_SIZE;
}

function getSkipCount() {
  const index = process.argv.indexOf('--skip');
  if (index !== -1 && process.argv[index + 1]) {
    return parseInt(process.argv[index + 1]);
  }
  return 0;
}

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data && config.verbose) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error.message);
  if (config.verbose && error.stack) {
    console.error(error.stack);
  }
}

/**
 * Transform MongoDB Company document to ZeroDB format
 */
function transformCompany(company) {
  return {
    companyId: company.companyId,
    companyName: company.CompanyName,
    companyType: company.CompanyType,
    registeredAddress: company.RegisteredAddress,
    taxId: company.TaxID,
    corporationDate: company.corporationDate ? company.corporationDate.toISOString() : null,
    createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
    mongoId: company._id.toString()
  };
}

/**
 * Validate company data before migration
 */
function validateCompany(company) {
  const errors = [];

  if (!company.companyId) {
    errors.push('Missing required field: companyId');
  }
  if (!company.companyName) {
    errors.push('Missing required field: companyName');
  }
  if (!company.companyType) {
    errors.push('Missing required field: companyType');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a company already exists in ZeroDB (for idempotency)
 */
async function companyExistsInZeroDB(companyId) {
  try {
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { companyId },
      limit: 1
    });
    return result && result.length > 0;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Create companies table if it doesn't exist
 */
async function ensureTableExists() {
  try {
    const tables = await zerodbService.listTables();
    const tableExists = tables.some(t => t.table_name === TABLE_NAME || t.name === TABLE_NAME);

    if (!tableExists) {
      log(`Creating table: ${TABLE_NAME}`);
      await zerodbService.createTable(TABLE_NAME, {
        companyId: { type: 'string', required: true, unique: true },
        companyName: { type: 'string', required: true },
        companyType: { type: 'string', required: true },
        registeredAddress: { type: 'string', required: true },
        taxId: { type: 'string', required: true },
        corporationDate: { type: 'date' },
        createdAt: { type: 'date', default: 'now' },
        updatedAt: { type: 'date', default: 'now' },
        mongoId: { type: 'string', indexed: true }
      });
      log(`Table ${TABLE_NAME} created successfully`);
    } else {
      log(`Table ${TABLE_NAME} already exists`);
    }
  } catch (error) {
    if (error.message?.includes('already exists')) {
      log(`Table ${TABLE_NAME} already exists`);
    } else {
      throw error;
    }
  }
}

/**
 * Migrate a batch of companies
 */
async function migrateBatch(companies, batchNumber) {
  const results = {
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  const toInsert = [];

  for (const company of companies) {
    const transformed = transformCompany(company);
    const validation = validateCompany(transformed);

    if (!validation.valid) {
      results.failed++;
      results.errors.push({
        companyId: company.companyId,
        errors: validation.errors
      });
      continue;
    }

    // Check for idempotency
    const exists = await companyExistsInZeroDB(transformed.companyId);
    if (exists) {
      log(`Skipping existing company: ${transformed.companyId}`, config.verbose ? transformed : null);
      results.skipped++;
      continue;
    }

    toInsert.push(transformed);
  }

  if (toInsert.length > 0) {
    if (config.dryRun) {
      log(`[DRY RUN] Would insert ${toInsert.length} companies`);
      if (config.verbose) {
        toInsert.forEach(c => log(`  - ${c.companyId}: ${c.companyName}`));
      }
      results.migrated = toInsert.length;
    } else {
      try {
        await zerodbService.insertRows(TABLE_NAME, toInsert);
        results.migrated = toInsert.length;
        log(`Batch ${batchNumber}: Inserted ${toInsert.length} companies`);
      } catch (error) {
        logError(`Batch ${batchNumber} insert failed`, error);
        results.failed += toInsert.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message
        });
      }
    }
  }

  return results;
}

/**
 * Main migration function
 */
async function migrateCompanies() {
  const startTime = Date.now();
  const stats = {
    totalProcessed: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  log('Starting Company migration to ZeroDB');
  log(`Configuration: batchSize=${config.batchSize}, skip=${config.skip}, dryRun=${config.dryRun}`);

  try {
    // Connect to MongoDB
    log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    log('Connected to MongoDB');

    // Initialize ZeroDB
    if (!config.dryRun) {
      log('Initializing ZeroDB...');
      await zerodbService.initialize(config.zerodbToken);
      log('ZeroDB initialized');

      // Ensure table exists
      await ensureTableExists();
    }

    // Get total count
    const totalCount = await Company.countDocuments();
    log(`Total companies in MongoDB: ${totalCount}`);

    if (totalCount === 0) {
      log('No companies to migrate');
      return stats;
    }

    // Process in batches
    let skip = config.skip;
    let batchNumber = Math.floor(skip / config.batchSize) + 1;

    while (skip < totalCount) {
      log(`Processing batch ${batchNumber} (records ${skip + 1} - ${Math.min(skip + config.batchSize, totalCount)})`);

      const companies = await Company.find()
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(config.batchSize)
        .lean();

      if (companies.length === 0) {
        break;
      }

      const batchResults = await migrateBatch(companies, batchNumber);

      stats.totalProcessed += companies.length;
      stats.migrated += batchResults.migrated;
      stats.skipped += batchResults.skipped;
      stats.failed += batchResults.failed;
      stats.errors.push(...batchResults.errors);

      skip += config.batchSize;
      batchNumber++;
    }

    const duration = (Date.now() - startTime) / 1000;

    log('Migration completed');
    log('Summary:', {
      totalProcessed: stats.totalProcessed,
      migrated: stats.migrated,
      skipped: stats.skipped,
      failed: stats.failed,
      durationSeconds: duration.toFixed(2),
      dryRun: config.dryRun
    });

    if (stats.errors.length > 0 && config.verbose) {
      log('Errors:', stats.errors);
    }

    return stats;

  } catch (error) {
    logError('Migration failed', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB');
  }
}

// CLI execution
if (require.main === module) {
  // Validate configuration
  if (!config.mongoUri) {
    console.error('ERROR: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  if (!config.dryRun && !config.zerodbToken) {
    console.error('ERROR: AINATIVE_API_TOKEN or ZERODB_API_KEY environment variable is not set');
    process.exit(1);
  }

  migrateCompanies()
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
  migrateCompanies,
  transformCompany,
  validateCompany,
  companyExistsInZeroDB
};
