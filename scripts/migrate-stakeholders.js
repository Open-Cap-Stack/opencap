#!/usr/bin/env node

/**
 * Stakeholder Migration Script - MongoDB to ZeroDB
 *
 * Migrates Stakeholder records from MongoDB to ZeroDB lakehouse.
 * Validates foreign key integrity against Company records.
 * Supports batch processing, idempotency, and validation.
 *
 * Usage:
 *   node scripts/migrate-stakeholders.js [options]
 *
 * Options:
 *   --dry-run           Preview migration without writing to ZeroDB
 *   --batch-size        Number of records per batch (default: 100)
 *   --skip              Number of records to skip (for resumption)
 *   --skip-fk-check     Skip foreign key validation (use with caution)
 *   --verbose           Enable detailed logging
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Stakeholder = require('../models/Stakeholder');
const Company = require('../models/Company');
const zerodbService = require('../services/zerodbService');

const BATCH_SIZE = parseInt(process.env.MIGRATION_BATCH_SIZE) || 100;
const STAKEHOLDER_TABLE = 'stakeholders';
const COMPANY_TABLE = 'companies';

const config = {
  mongoUri: process.env.MONGODB_URI,
  zerodbToken: process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY,
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  skipFkCheck: process.argv.includes('--skip-fk-check'),
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
 * Transform MongoDB Stakeholder document to ZeroDB format
 */
function transformStakeholder(stakeholder) {
  return {
    stakeholderId: stakeholder.stakeholderId,
    name: stakeholder.name,
    role: stakeholder.role,
    companyId: stakeholder.projectId, // Map projectId to companyId for consistency
    createdAt: stakeholder.createdAt ? stakeholder.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: stakeholder.updatedAt ? stakeholder.updatedAt.toISOString() : new Date().toISOString(),
    mongoId: stakeholder._id.toString()
  };
}

/**
 * Validate stakeholder data before migration
 */
function validateStakeholder(stakeholder) {
  const errors = [];

  if (!stakeholder.stakeholderId) {
    errors.push('Missing required field: stakeholderId');
  }
  if (!stakeholder.name) {
    errors.push('Missing required field: name');
  }
  if (!stakeholder.role) {
    errors.push('Missing required field: role');
  }
  if (!stakeholder.companyId) {
    errors.push('Missing required field: companyId (projectId)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cache for validated company IDs to avoid repeated lookups
 */
const validCompanyIds = new Set();
const invalidCompanyIds = new Set();

/**
 * Validate that a company exists (foreign key check)
 * Checks both MongoDB and ZeroDB for the company
 */
async function validateCompanyExists(companyId) {
  if (config.skipFkCheck) {
    return true;
  }

  // Check cache first
  if (validCompanyIds.has(companyId)) {
    return true;
  }
  if (invalidCompanyIds.has(companyId)) {
    return false;
  }

  // Check MongoDB first
  const mongoCompany = await Company.findOne({ companyId }).lean();
  if (mongoCompany) {
    validCompanyIds.add(companyId);
    return true;
  }

  // Check ZeroDB if not in MongoDB
  if (!config.dryRun) {
    try {
      const zerodbResult = await zerodbService.queryTable(COMPANY_TABLE, {
        filter: { companyId },
        limit: 1
      });
      if (zerodbResult && zerodbResult.length > 0) {
        validCompanyIds.add(companyId);
        return true;
      }
    } catch (error) {
      // Table might not exist yet - treat as not found
      if (error.response?.status !== 404) {
        logError(`Error checking company in ZeroDB: ${companyId}`, error);
      }
    }
  }

  invalidCompanyIds.add(companyId);
  return false;
}

/**
 * Check if a stakeholder already exists in ZeroDB (for idempotency)
 */
async function stakeholderExistsInZeroDB(stakeholderId) {
  try {
    const result = await zerodbService.queryTable(STAKEHOLDER_TABLE, {
      filter: { stakeholderId },
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
 * Create stakeholders table if it doesn't exist
 */
async function ensureTableExists() {
  try {
    const tables = await zerodbService.listTables();
    const tableExists = tables.some(t => t.table_name === STAKEHOLDER_TABLE || t.name === STAKEHOLDER_TABLE);

    if (!tableExists) {
      log(`Creating table: ${STAKEHOLDER_TABLE}`);
      await zerodbService.createTable(STAKEHOLDER_TABLE, {
        stakeholderId: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        role: { type: 'string', required: true },
        companyId: { type: 'string', required: true, indexed: true },
        createdAt: { type: 'date', default: 'now' },
        updatedAt: { type: 'date', default: 'now' },
        mongoId: { type: 'string', indexed: true }
      });
      log(`Table ${STAKEHOLDER_TABLE} created successfully`);
    } else {
      log(`Table ${STAKEHOLDER_TABLE} already exists`);
    }
  } catch (error) {
    if (error.message?.includes('already exists')) {
      log(`Table ${STAKEHOLDER_TABLE} already exists`);
    } else {
      throw error;
    }
  }
}

/**
 * Migrate a batch of stakeholders
 */
async function migrateBatch(stakeholders, batchNumber) {
  const results = {
    migrated: 0,
    skipped: 0,
    failed: 0,
    fkViolations: 0,
    errors: []
  };

  const toInsert = [];

  for (const stakeholder of stakeholders) {
    const transformed = transformStakeholder(stakeholder);
    const validation = validateStakeholder(transformed);

    if (!validation.valid) {
      results.failed++;
      results.errors.push({
        stakeholderId: stakeholder.stakeholderId,
        errors: validation.errors
      });
      continue;
    }

    // Validate foreign key (companyId)
    const companyExists = await validateCompanyExists(transformed.companyId);
    if (!companyExists) {
      results.fkViolations++;
      results.errors.push({
        stakeholderId: transformed.stakeholderId,
        errors: [`Foreign key violation: Company not found with companyId=${transformed.companyId}`]
      });
      log(`FK violation: Stakeholder ${transformed.stakeholderId} references non-existent company ${transformed.companyId}`);
      continue;
    }

    // Check for idempotency
    if (!config.dryRun) {
      const exists = await stakeholderExistsInZeroDB(transformed.stakeholderId);
      if (exists) {
        log(`Skipping existing stakeholder: ${transformed.stakeholderId}`, config.verbose ? transformed : null);
        results.skipped++;
        continue;
      }
    }

    toInsert.push(transformed);
  }

  if (toInsert.length > 0) {
    if (config.dryRun) {
      log(`[DRY RUN] Would insert ${toInsert.length} stakeholders`);
      if (config.verbose) {
        toInsert.forEach(s => log(`  - ${s.stakeholderId}: ${s.name} (${s.role})`));
      }
      results.migrated = toInsert.length;
    } else {
      try {
        await zerodbService.insertRows(STAKEHOLDER_TABLE, toInsert);
        results.migrated = toInsert.length;
        log(`Batch ${batchNumber}: Inserted ${toInsert.length} stakeholders`);
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
async function migrateStakeholders() {
  const startTime = Date.now();
  const stats = {
    totalProcessed: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    fkViolations: 0,
    errors: []
  };

  log('Starting Stakeholder migration to ZeroDB');
  log(`Configuration: batchSize=${config.batchSize}, skip=${config.skip}, dryRun=${config.dryRun}, skipFkCheck=${config.skipFkCheck}`);

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
    const totalCount = await Stakeholder.countDocuments();
    log(`Total stakeholders in MongoDB: ${totalCount}`);

    if (totalCount === 0) {
      log('No stakeholders to migrate');
      return stats;
    }

    // Pre-load company IDs from MongoDB for faster FK validation
    log('Loading company IDs for foreign key validation...');
    const companies = await Company.find({}, { companyId: 1 }).lean();
    companies.forEach(c => validCompanyIds.add(c.companyId));
    log(`Loaded ${validCompanyIds.size} company IDs`);

    // Process in batches
    let skip = config.skip;
    let batchNumber = Math.floor(skip / config.batchSize) + 1;

    while (skip < totalCount) {
      log(`Processing batch ${batchNumber} (records ${skip + 1} - ${Math.min(skip + config.batchSize, totalCount)})`);

      const stakeholders = await Stakeholder.find()
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(config.batchSize)
        .lean();

      if (stakeholders.length === 0) {
        break;
      }

      const batchResults = await migrateBatch(stakeholders, batchNumber);

      stats.totalProcessed += stakeholders.length;
      stats.migrated += batchResults.migrated;
      stats.skipped += batchResults.skipped;
      stats.failed += batchResults.failed;
      stats.fkViolations += batchResults.fkViolations;
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
      fkViolations: stats.fkViolations,
      durationSeconds: duration.toFixed(2),
      dryRun: config.dryRun
    });

    if (stats.fkViolations > 0) {
      log(`WARNING: ${stats.fkViolations} stakeholders skipped due to foreign key violations`);
    }

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

  migrateStakeholders()
    .then(stats => {
      if (stats.failed > 0 || stats.fkViolations > 0) {
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
  migrateStakeholders,
  transformStakeholder,
  validateStakeholder,
  validateCompanyExists,
  stakeholderExistsInZeroDB
};
