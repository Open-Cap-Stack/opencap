#!/usr/bin/env node

/**
 * Transaction Migration Script - MongoDB to ZeroDB
 *
 * Migrates Transaction data from MongoDB to ZeroDB lakehouse.
 * Implements batch processing, validation, and idempotent operations.
 *
 * Usage:
 *   node scripts/migrate-transactions.js [--dry-run] [--batch-size=100]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const zerodbService = require('../services/zerodbService');

const BATCH_SIZE = parseInt(process.env.MIGRATION_BATCH_SIZE) || 100;
const DRY_RUN = process.argv.includes('--dry-run');
const ZERODB_TABLE = 'transactions';

const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];
const validTransactionTypes = ['payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'];
const validTransactionStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'];

/**
 * Validate financial calculations for a transaction
 * @param {Object} transaction - Transaction document
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateFinancialCalculations(transaction) {
  const errors = [];

  // Validate amount is positive
  if (typeof transaction.amount !== 'number' || transaction.amount <= 0) {
    errors.push(`Invalid amount: ${transaction.amount}. Must be positive number.`);
  }

  // Validate currency
  if (!validCurrencyCodes.includes(transaction.currency)) {
    errors.push(`Invalid currency: ${transaction.currency}. Must be valid ISO code.`);
  }

  // Validate transaction type
  if (!validTransactionTypes.includes(transaction.type)) {
    errors.push(`Invalid type: ${transaction.type}. Must be valid transaction type.`);
  }

  // Validate status
  if (!validTransactionStatuses.includes(transaction.status)) {
    errors.push(`Invalid status: ${transaction.status}. Must be valid status.`);
  }

  // Validate fees if present
  if (transaction.fees) {
    const { processingFee = 0, platformFee = 0, taxAmount = 0, otherFees = 0 } = transaction.fees;
    const totalFees = processingFee + platformFee + taxAmount + otherFees;

    if (totalFees < 0) {
      errors.push(`Invalid fees: Total fees cannot be negative.`);
    }

    if (totalFees > transaction.amount) {
      errors.push(`Invalid fees: Total fees (${totalFees}) exceed transaction amount (${transaction.amount}).`);
    }

    // Validate net amount calculation
    const expectedNetAmount = transaction.amount - totalFees;
    if (expectedNetAmount < 0) {
      errors.push(`Invalid net amount: Would result in negative net amount.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    netAmount: transaction.fees
      ? transaction.amount - (
          (transaction.fees.processingFee || 0) +
          (transaction.fees.platformFee || 0) +
          (transaction.fees.taxAmount || 0) +
          (transaction.fees.otherFees || 0)
        )
      : transaction.amount
  };
}

/**
 * Transform MongoDB transaction to ZeroDB format
 * @param {Object} mongoDoc - MongoDB document
 * @returns {Object} ZeroDB formatted document
 */
function transformForZeroDB(mongoDoc) {
  const validation = validateFinancialCalculations(mongoDoc);

  return {
    // Primary identifiers - preserve references
    transactionId: mongoDoc.transactionId,
    userId: mongoDoc.userId,
    companyId: mongoDoc.companyId || null,
    accountId: mongoDoc.accountId || null,

    // Financial data
    amount: mongoDoc.amount,
    currency: mongoDoc.currency,
    netAmount: validation.netAmount,

    // Transaction details
    type: mongoDoc.type,
    status: mongoDoc.status,
    description: mongoDoc.description || '',
    paymentMethod: mongoDoc.paymentMethod || 'other',
    failureReason: mongoDoc.failureReason || null,

    // Fees - flattened for ZeroDB
    processingFee: mongoDoc.fees?.processingFee || 0,
    platformFee: mongoDoc.fees?.platformFee || 0,
    taxAmount: mongoDoc.fees?.taxAmount || 0,
    otherFees: mongoDoc.fees?.otherFees || 0,
    totalFees: (mongoDoc.fees?.processingFee || 0) +
               (mongoDoc.fees?.platformFee || 0) +
               (mongoDoc.fees?.taxAmount || 0) +
               (mongoDoc.fees?.otherFees || 0),

    // Related data
    relatedTransactions: JSON.stringify(mongoDoc.relatedTransactions || []),
    metadata: JSON.stringify(mongoDoc.metadata || {}),

    // Timestamps
    processedAt: mongoDoc.processedAt ? mongoDoc.processedAt.toISOString() : null,
    createdAt: mongoDoc.createdAt ? mongoDoc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: mongoDoc.updatedAt ? mongoDoc.updatedAt.toISOString() : new Date().toISOString(),

    // Migration metadata
    _mongoId: mongoDoc._id.toString(),
    _migrationVersion: '1.0',
    _migratedAt: new Date().toISOString()
  };
}

/**
 * Check if a transaction already exists in ZeroDB
 * @param {string} transactionId - Transaction ID to check
 * @returns {Promise<boolean>} True if exists
 */
async function existsInZeroDB(transactionId) {
  try {
    const result = await zerodbService.queryTable(ZERODB_TABLE, {
      filter: { transactionId },
      limit: 1,
      projection: { transactionId: 1 }
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
 * Create transactions table in ZeroDB if it doesn't exist
 */
async function ensureTableExists() {
  try {
    const tables = await zerodbService.listTables();
    const tableExists = tables.some(t => t.table_name === ZERODB_TABLE || t.name === ZERODB_TABLE);

    if (!tableExists) {
      console.log(`Creating ${ZERODB_TABLE} table in ZeroDB...`);
      await zerodbService.createTable(ZERODB_TABLE, {
        transactionId: { type: 'string', required: true, unique: true },
        userId: { type: 'string', required: true, indexed: true },
        companyId: { type: 'string', indexed: true },
        accountId: { type: 'string', indexed: true },
        amount: { type: 'number', required: true },
        currency: { type: 'string', required: true },
        netAmount: { type: 'number' },
        type: { type: 'string', required: true },
        status: { type: 'string', required: true, indexed: true },
        description: { type: 'string' },
        paymentMethod: { type: 'string' },
        failureReason: { type: 'string' },
        processingFee: { type: 'number', default: 0 },
        platformFee: { type: 'number', default: 0 },
        taxAmount: { type: 'number', default: 0 },
        otherFees: { type: 'number', default: 0 },
        totalFees: { type: 'number', default: 0 },
        relatedTransactions: { type: 'string' },
        metadata: { type: 'string' },
        processedAt: { type: 'date' },
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
async function migrateTransactions() {
  console.log('='.repeat(60));
  console.log('Transaction Migration: MongoDB to ZeroDB');
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
    stats.total = await Transaction.countDocuments();
    console.log(`Total transactions to migrate: ${stats.total}`);
    console.log('');

    if (stats.total === 0) {
      console.log('No transactions found in MongoDB. Nothing to migrate.');
      return stats;
    }

    // Process in batches
    let skip = 0;
    let batchNumber = 1;

    while (skip < stats.total) {
      console.log(`Processing batch ${batchNumber} (${skip + 1}-${Math.min(skip + BATCH_SIZE, stats.total)} of ${stats.total})...`);

      // Fetch batch from MongoDB
      const batch = await Transaction.find()
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (batch.length === 0) break;

      const toInsert = [];

      for (const transaction of batch) {
        // Validate financial calculations
        const validation = validateFinancialCalculations(transaction);

        if (!validation.isValid) {
          stats.validationErrors.push({
            transactionId: transaction.transactionId,
            errors: validation.errors
          });
          console.warn(`  Validation warning for ${transaction.transactionId}: ${validation.errors.join(', ')}`);
          // Continue with migration but log the warnings
        }

        // Check for idempotency - skip if already migrated
        if (!DRY_RUN) {
          const exists = await existsInZeroDB(transaction.transactionId);
          if (exists) {
            stats.skipped++;
            continue;
          }
        }

        // Transform for ZeroDB
        const transformed = transformForZeroDB(transaction);
        toInsert.push(transformed);
      }

      // Insert batch into ZeroDB
      if (toInsert.length > 0) {
        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would insert ${toInsert.length} transactions`);
          stats.migrated += toInsert.length;
        } else {
          try {
            await zerodbService.insertRows(ZERODB_TABLE, toInsert);
            stats.migrated += toInsert.length;
            console.log(`  Inserted ${toInsert.length} transactions`);
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
    console.log(`Validation warnings:  ${stats.validationErrors.length}`);
    console.log(`Duration:             ${duration}s`);
    console.log('='.repeat(60));

    if (stats.validationErrors.length > 0) {
      console.log('');
      console.log('Validation Warnings (transactions still migrated):');
      stats.validationErrors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.transactionId}: ${err.errors.join(', ')}`);
      });
      if (stats.validationErrors.length > 10) {
        console.log(`  ... and ${stats.validationErrors.length - 10} more`);
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
  migrateTransactions()
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
  migrateTransactions,
  validateFinancialCalculations,
  transformForZeroDB,
  existsInZeroDB,
  ensureTableExists
};
