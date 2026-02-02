#!/usr/bin/env node

/**
 * FinancialMetrics Migration Script - MongoDB to ZeroDB
 *
 * Migrates FinancialMetrics data from MongoDB to ZeroDB lakehouse.
 * Implements batch processing, validation, and idempotent operations.
 *
 * Usage:
 *   node scripts/migrate-financial-metrics.js [--dry-run] [--batch-size=100]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const FinancialMetrics = require('../models/FinancialMetrics');
const zerodbService = require('../services/zerodbService');

const BATCH_SIZE = parseInt(process.env.MIGRATION_BATCH_SIZE) || 100;
const DRY_RUN = process.argv.includes('--dry-run');
const ZERODB_TABLE = 'financial_metrics';

const validStatuses = ['draft', 'calculated', 'reviewed', 'approved', 'published'];
const validCalculationMethods = ['automatic', 'manual', 'hybrid'];

/**
 * Validate financial calculations for financial metrics
 * @param {Object} metrics - FinancialMetrics document
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateFinancialCalculations(metrics) {
  const errors = [];
  const warnings = [];

  // Validate companyId reference
  if (!metrics.companyId) {
    errors.push('companyId is required.');
  }

  // Validate reportingPeriod
  if (!metrics.reportingPeriod || typeof metrics.reportingPeriod !== 'string') {
    errors.push('reportingPeriod is required and must be a string.');
  }

  // Validate reportingDate
  if (!metrics.reportingDate) {
    errors.push('reportingDate is required.');
  }

  // Validate status
  if (metrics.status && !validStatuses.includes(metrics.status)) {
    errors.push(`Invalid status: ${metrics.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate calculationMethod
  if (metrics.calculationMethod && !validCalculationMethods.includes(metrics.calculationMethod)) {
    errors.push(`Invalid calculationMethod: ${metrics.calculationMethod}. Must be one of: ${validCalculationMethods.join(', ')}`);
  }

  // Validate scores are within range (0-100)
  const scoreFields = ['financialStrengthScore', 'liquidityScore', 'profitabilityScore', 'leverageScore'];
  scoreFields.forEach(field => {
    const value = metrics[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        warnings.push(`${field} (${value}) should be between 0 and 100.`);
      }
    }
  });

  // Validate liquidity ratios
  if (metrics.liquidityRatios) {
    const { currentRatio, quickRatio, cashRatio } = metrics.liquidityRatios;
    if (currentRatio !== undefined && currentRatio < 0) {
      warnings.push(`Negative currentRatio (${currentRatio}) is unusual.`);
    }
    if (quickRatio !== undefined && quickRatio < 0) {
      warnings.push(`Negative quickRatio (${quickRatio}) is unusual.`);
    }
    if (cashRatio !== undefined && cashRatio < 0) {
      warnings.push(`Negative cashRatio (${cashRatio}) is unusual.`);
    }
  }

  // Validate profitability ratios
  if (metrics.profitabilityRatios) {
    const { grossProfitMargin, netProfitMargin, returnOnAssets, returnOnEquity } = metrics.profitabilityRatios;
    // Margins should typically be between -1 and 1 (or -100% to 100%)
    if (grossProfitMargin !== undefined && (grossProfitMargin < -10 || grossProfitMargin > 10)) {
      warnings.push(`grossProfitMargin (${grossProfitMargin}) is outside typical range.`);
    }
    if (netProfitMargin !== undefined && (netProfitMargin < -10 || netProfitMargin > 10)) {
      warnings.push(`netProfitMargin (${netProfitMargin}) is outside typical range.`);
    }
  }

  // Validate leverage ratios
  if (metrics.leverageRatios) {
    const { debtToAssets, debtToEquity } = metrics.leverageRatios;
    if (debtToAssets !== undefined && (debtToAssets < 0 || debtToAssets > 10)) {
      warnings.push(`debtToAssets (${debtToAssets}) is outside typical range.`);
    }
  }

  // Validate calculatedBy reference
  if (!metrics.calculatedBy) {
    warnings.push('calculatedBy is not set.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Flatten nested ratio objects for ZeroDB storage
 * @param {Object} ratios - Nested ratio object
 * @param {string} prefix - Prefix for flattened keys
 * @returns {Object} Flattened object
 */
function flattenRatios(ratios, prefix) {
  if (!ratios) return {};

  const flattened = {};
  Object.keys(ratios).forEach(key => {
    if (ratios[key] !== undefined && ratios[key] !== null) {
      flattened[`${prefix}_${key}`] = ratios[key];
    }
  });
  return flattened;
}

/**
 * Transform MongoDB financial metrics to ZeroDB format
 * @param {Object} mongoDoc - MongoDB document
 * @returns {Object} ZeroDB formatted document
 */
function transformForZeroDB(mongoDoc) {
  // Flatten all nested ratio objects
  const flatLiquidity = flattenRatios(mongoDoc.liquidityRatios, 'liquidity');
  const flatActivity = flattenRatios(mongoDoc.activityRatios, 'activity');
  const flatLeverage = flattenRatios(mongoDoc.leverageRatios, 'leverage');
  const flatProfitability = flattenRatios(mongoDoc.profitabilityRatios, 'profitability');
  const flatMarket = flattenRatios(mongoDoc.marketRatios, 'market');
  const flatCashFlow = flattenRatios(mongoDoc.cashFlowMetrics, 'cashFlow');
  const flatGrowth = flattenRatios(mongoDoc.growthMetrics, 'growth');

  return {
    // Primary identifiers - preserve references
    metricsId: mongoDoc._id.toString(),
    companyId: mongoDoc.companyId ? mongoDoc.companyId.toString() : null,

    // Reporting information
    reportingPeriod: mongoDoc.reportingPeriod,
    reportingDate: mongoDoc.reportingDate ? mongoDoc.reportingDate.toISOString() : null,

    // Source references - preserve stakeholderId/companyId references
    sourceBalanceSheetId: mongoDoc.sourceBalanceSheetId ? mongoDoc.sourceBalanceSheetId.toString() : null,
    sourceIncomeStatementId: mongoDoc.sourceIncomeStatementId ? mongoDoc.sourceIncomeStatementId.toString() : null,
    sourceCashFlowId: mongoDoc.sourceCashFlowId ? mongoDoc.sourceCashFlowId.toString() : null,

    // Flattened ratios (for queryability)
    ...flatLiquidity,
    ...flatActivity,
    ...flatLeverage,
    ...flatProfitability,
    ...flatMarket,
    ...flatCashFlow,
    ...flatGrowth,

    // Store original nested structures as JSON for completeness
    liquidityRatiosJson: JSON.stringify(mongoDoc.liquidityRatios || {}),
    activityRatiosJson: JSON.stringify(mongoDoc.activityRatios || {}),
    leverageRatiosJson: JSON.stringify(mongoDoc.leverageRatios || {}),
    profitabilityRatiosJson: JSON.stringify(mongoDoc.profitabilityRatios || {}),
    marketRatiosJson: JSON.stringify(mongoDoc.marketRatios || {}),
    cashFlowMetricsJson: JSON.stringify(mongoDoc.cashFlowMetrics || {}),
    growthMetricsJson: JSON.stringify(mongoDoc.growthMetrics || {}),

    // Summary scores
    financialStrengthScore: mongoDoc.financialStrengthScore || null,
    liquidityScore: mongoDoc.liquidityScore || null,
    profitabilityScore: mongoDoc.profitabilityScore || null,
    leverageScore: mongoDoc.leverageScore || null,

    // Metadata
    calculationMethod: mongoDoc.calculationMethod || 'automatic',
    calculatedBy: mongoDoc.calculatedBy ? mongoDoc.calculatedBy.toString() : null,
    calculatedAt: mongoDoc.calculatedAt ? mongoDoc.calculatedAt.toISOString() : null,
    reviewedBy: mongoDoc.reviewedBy ? mongoDoc.reviewedBy.toString() : null,
    approvedBy: mongoDoc.approvedBy ? mongoDoc.approvedBy.toString() : null,
    status: mongoDoc.status || 'calculated',
    notes: mongoDoc.notes || '',
    warnings: JSON.stringify(mongoDoc.warnings || []),
    isComparative: mongoDoc.isComparative || false,
    basePeriod: mongoDoc.basePeriod || null,

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
 * Check if financial metrics already exist in ZeroDB
 * @param {string} metricsId - Metrics ID to check
 * @returns {Promise<boolean>} True if exists
 */
async function existsInZeroDB(metricsId) {
  try {
    const result = await zerodbService.queryTable(ZERODB_TABLE, {
      filter: { metricsId },
      limit: 1,
      projection: { metricsId: 1 }
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
 * Create financial_metrics table in ZeroDB if it doesn't exist
 */
async function ensureTableExists() {
  try {
    const tables = await zerodbService.listTables();
    const tableExists = tables.some(t => t.table_name === ZERODB_TABLE || t.name === ZERODB_TABLE);

    if (!tableExists) {
      console.log(`Creating ${ZERODB_TABLE} table in ZeroDB...`);
      await zerodbService.createTable(ZERODB_TABLE, {
        // Primary identifiers
        metricsId: { type: 'string', required: true, unique: true },
        companyId: { type: 'string', required: true, indexed: true },

        // Reporting information
        reportingPeriod: { type: 'string', required: true, indexed: true },
        reportingDate: { type: 'date', required: true, indexed: true },

        // Source references
        sourceBalanceSheetId: { type: 'string' },
        sourceIncomeStatementId: { type: 'string' },
        sourceCashFlowId: { type: 'string' },

        // Key flattened ratios for common queries
        liquidity_currentRatio: { type: 'number' },
        liquidity_quickRatio: { type: 'number' },
        liquidity_cashRatio: { type: 'number' },
        liquidity_workingCapital: { type: 'number' },
        profitability_grossProfitMargin: { type: 'number' },
        profitability_netProfitMargin: { type: 'number' },
        profitability_returnOnAssets: { type: 'number' },
        profitability_returnOnEquity: { type: 'number' },
        leverage_debtToAssets: { type: 'number' },
        leverage_debtToEquity: { type: 'number' },
        growth_revenueGrowthRate: { type: 'number' },
        cashFlow_freeCashFlow: { type: 'number' },

        // JSON storage for complete nested structures
        liquidityRatiosJson: { type: 'string' },
        activityRatiosJson: { type: 'string' },
        leverageRatiosJson: { type: 'string' },
        profitabilityRatiosJson: { type: 'string' },
        marketRatiosJson: { type: 'string' },
        cashFlowMetricsJson: { type: 'string' },
        growthMetricsJson: { type: 'string' },

        // Summary scores
        financialStrengthScore: { type: 'number', indexed: true },
        liquidityScore: { type: 'number' },
        profitabilityScore: { type: 'number' },
        leverageScore: { type: 'number' },

        // Metadata
        calculationMethod: { type: 'string' },
        calculatedBy: { type: 'string' },
        calculatedAt: { type: 'date' },
        reviewedBy: { type: 'string' },
        approvedBy: { type: 'string' },
        status: { type: 'string', indexed: true },
        notes: { type: 'string' },
        warnings: { type: 'string' },
        isComparative: { type: 'boolean' },
        basePeriod: { type: 'string' },

        // Timestamps
        createdAt: { type: 'date', indexed: true },
        updatedAt: { type: 'date' },

        // Migration metadata
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
async function migrateFinancialMetrics() {
  console.log('='.repeat(60));
  console.log('FinancialMetrics Migration: MongoDB to ZeroDB');
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
    stats.total = await FinancialMetrics.countDocuments();
    console.log(`Total financial metrics to migrate: ${stats.total}`);
    console.log('');

    if (stats.total === 0) {
      console.log('No financial metrics found in MongoDB. Nothing to migrate.');
      return stats;
    }

    // Process in batches
    let skip = 0;
    let batchNumber = 1;

    while (skip < stats.total) {
      console.log(`Processing batch ${batchNumber} (${skip + 1}-${Math.min(skip + BATCH_SIZE, stats.total)} of ${stats.total})...`);

      // Fetch batch from MongoDB
      const batch = await FinancialMetrics.find()
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (batch.length === 0) break;

      const toInsert = [];

      for (const metrics of batch) {
        const metricsId = metrics._id.toString();

        // Validate financial calculations
        const validation = validateFinancialCalculations(metrics);

        if (!validation.isValid) {
          stats.validationErrors.push({
            metricsId,
            companyId: metrics.companyId ? metrics.companyId.toString() : 'N/A',
            reportingPeriod: metrics.reportingPeriod || 'N/A',
            errors: validation.errors
          });
          console.warn(`  Validation error for ${metricsId}: ${validation.errors.join(', ')}`);
          stats.failed++;
          continue; // Skip records with validation errors
        }

        if (validation.warnings.length > 0) {
          stats.validationWarnings.push({
            metricsId,
            companyId: metrics.companyId ? metrics.companyId.toString() : 'N/A',
            warnings: validation.warnings
          });
        }

        // Check for idempotency - skip if already migrated
        if (!DRY_RUN) {
          const exists = await existsInZeroDB(metricsId);
          if (exists) {
            stats.skipped++;
            continue;
          }
        }

        // Transform for ZeroDB
        const transformed = transformForZeroDB(metrics);
        toInsert.push(transformed);
      }

      // Insert batch into ZeroDB
      if (toInsert.length > 0) {
        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would insert ${toInsert.length} financial metrics`);
          stats.migrated += toInsert.length;
        } else {
          try {
            await zerodbService.insertRows(ZERODB_TABLE, toInsert);
            stats.migrated += toInsert.length;
            console.log(`  Inserted ${toInsert.length} financial metrics`);
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
        console.log(`  - ${err.metricsId} (company: ${err.companyId}, period: ${err.reportingPeriod})`);
        console.log(`    Errors: ${err.errors.join(', ')}`);
      });
      if (stats.validationErrors.length > 10) {
        console.log(`  ... and ${stats.validationErrors.length - 10} more`);
      }
    }

    if (stats.validationWarnings.length > 0) {
      console.log('');
      console.log('Validation Warnings (records still migrated):');
      stats.validationWarnings.slice(0, 10).forEach(warn => {
        console.log(`  - ${warn.metricsId} (company: ${warn.companyId}): ${warn.warnings.join(', ')}`);
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
  migrateFinancialMetrics()
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
  migrateFinancialMetrics,
  validateFinancialCalculations,
  transformForZeroDB,
  existsInZeroDB,
  ensureTableExists,
  flattenRatios
};
