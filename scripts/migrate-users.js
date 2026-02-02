#!/usr/bin/env node

/**
 * User Data Migration Script: MongoDB to ZeroDB
 *
 * Issue #9: Migrate User model data to ZeroDB
 *
 * This script migrates user data from MongoDB to ZeroDB in batches.
 * It is idempotent and safe to run multiple times.
 *
 * Usage:
 *   node scripts/migrate-users.js [--dry-run] [--batch-size=100]
 *
 * Options:
 *   --dry-run      Preview migration without writing to ZeroDB
 *   --batch-size   Number of users to process per batch (default: 100)
 */

require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const zerodbService = require('../services/zerodbService');

// Parse command line arguments
const BATCH_SIZE = parseInt(
  process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] ||
  process.env.MIGRATION_BATCH_SIZE ||
  '100',
  10
);
const DRY_RUN = process.argv.includes('--dry-run');
const TABLE_NAME = 'users';

/**
 * Transform MongoDB user document to ZeroDB format
 * Removes MongoDB-specific fields (_id, __v) and sensitive reset tokens
 * @param {Object} mongoUser - MongoDB user document
 * @returns {Object} ZeroDB-compatible user object
 */
function transformUserForZeroDB(mongoUser) {
  const user = mongoUser.toObject ? mongoUser.toObject() : mongoUser;

  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName || `${user.firstName} ${user.lastName}`,
    email: user.email,
    password: user.password,
    role: user.role,
    permissions: user.permissions || [],
    status: user.status || 'pending',
    companyId: user.companyId || null,
    profile: user.profile || {},
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString()
  };
}

/**
 * Check if user already exists in ZeroDB by userId
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user exists
 */
async function userExistsInZeroDB(userId) {
  try {
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { userId },
      limit: 1,
      projection: { userId: 1 }
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
 * Create users table in ZeroDB if it doesn't exist
 * @returns {Promise<void>}
 */
async function ensureUsersTable() {
  try {
    const tables = await zerodbService.listTables();
    const tableExists = tables.some(t =>
      t.table_name === TABLE_NAME || t.name === TABLE_NAME
    );

    if (!tableExists) {
      console.log(`Creating '${TABLE_NAME}' table in ZeroDB...`);
      await zerodbService.createTable(TABLE_NAME, {
        userId: { type: 'string', required: true, unique: true },
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        displayName: { type: 'string' },
        email: { type: 'string', required: true, unique: true },
        password: { type: 'string', required: true },
        role: { type: 'string', required: true, enum: ['admin', 'manager', 'user', 'client'] },
        permissions: { type: 'array' },
        status: { type: 'string', enum: ['active', 'pending', 'inactive', 'suspended'], default: 'pending' },
        companyId: { type: 'string', indexed: true },
        profile: { type: 'object' },
        lastLogin: { type: 'date' },
        createdAt: { type: 'date', default: 'now' },
        updatedAt: { type: 'date', default: 'now' }
      });
      console.log(`Table '${TABLE_NAME}' created successfully`);
    } else {
      console.log(`Table '${TABLE_NAME}' already exists`);
    }
  } catch (error) {
    if (error.response?.status === 409 || error.message?.includes('already exists')) {
      console.log(`Table '${TABLE_NAME}' already exists`);
    } else {
      throw error;
    }
  }
}

/**
 * Get count of users in MongoDB
 * @returns {Promise<number>}
 */
async function getMongoDBUserCount() {
  return await User.countDocuments();
}

/**
 * Get count of users in ZeroDB
 * @returns {Promise<number>}
 */
async function getZeroDBUserCount() {
  try {
    return await zerodbService.countRows(TABLE_NAME, {});
  } catch (error) {
    if (error.response?.status === 404) {
      return 0;
    }
    throw error;
  }
}

/**
 * Migrate users from MongoDB to ZeroDB in batches
 * @returns {Promise<Object>} Migration statistics
 */
async function migrateUsers() {
  const stats = {
    totalInMongoDB: 0,
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now()
  };

  console.log('\n========================================');
  console.log('User Migration: MongoDB to ZeroDB');
  console.log('========================================\n');

  if (DRY_RUN) {
    console.log('[DRY RUN MODE] No data will be written to ZeroDB\n');
  }

  console.log(`Batch size: ${BATCH_SIZE}`);

  // Connect to MongoDB
  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully');

  // Initialize ZeroDB
  console.log('\nInitializing ZeroDB...');
  const token = process.env.ZERODB_API_KEY || process.env.AINATIVE_API_TOKEN;
  if (!token) {
    throw new Error('ZERODB_API_KEY or AINATIVE_API_TOKEN environment variable is required');
  }
  await zerodbService.initialize(token);
  console.log('ZeroDB initialized successfully');

  // Ensure users table exists
  if (!DRY_RUN) {
    await ensureUsersTable();
  }

  // Get total count from MongoDB
  stats.totalInMongoDB = await getMongoDBUserCount();
  console.log(`\nTotal users in MongoDB: ${stats.totalInMongoDB}`);

  if (stats.totalInMongoDB === 0) {
    console.log('No users to migrate');
    return stats;
  }

  // Process users in batches
  let skip = 0;
  let hasMore = true;

  console.log('\nStarting migration...\n');

  while (hasMore) {
    const users = await User.find()
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (users.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch: ${skip + 1} - ${skip + users.length} of ${stats.totalInMongoDB}`);

    const usersToInsert = [];

    for (const user of users) {
      stats.processed++;

      try {
        if (!DRY_RUN) {
          const exists = await userExistsInZeroDB(user.userId);
          if (exists) {
            console.log(`  [SKIP] User ${user.userId} already exists in ZeroDB`);
            stats.skipped++;
            continue;
          }
        }

        const transformedUser = transformUserForZeroDB(user);
        usersToInsert.push(transformedUser);

      } catch (error) {
        console.error(`  [ERROR] Failed to process user ${user.userId}: ${error.message}`);
        stats.errors++;
      }
    }

    if (usersToInsert.length > 0) {
      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would insert ${usersToInsert.length} users`);
        stats.migrated += usersToInsert.length;
      } else {
        try {
          await zerodbService.insertRows(TABLE_NAME, usersToInsert);
          console.log(`  [SUCCESS] Inserted ${usersToInsert.length} users`);
          stats.migrated += usersToInsert.length;
        } catch (error) {
          console.error(`  [ERROR] Batch insert failed: ${error.message}`);
          stats.errors += usersToInsert.length;
        }
      }
    }

    skip += BATCH_SIZE;

    if (users.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  return stats;
}

/**
 * Validate migration by comparing record counts
 * @param {Object} stats - Migration statistics
 * @returns {Promise<boolean>} True if validation passes
 */
async function validateMigration(stats) {
  console.log('\n========================================');
  console.log('Validation');
  console.log('========================================\n');

  if (DRY_RUN) {
    console.log('[DRY RUN] Skipping validation\n');
    return true;
  }

  const mongoCount = await getMongoDBUserCount();
  const zerodbCount = await getZeroDBUserCount();

  console.log(`MongoDB user count:  ${mongoCount}`);
  console.log(`ZeroDB user count:   ${zerodbCount}`);

  const isValid = mongoCount === zerodbCount;

  if (isValid) {
    console.log('\n[PASS] Record counts match');
  } else {
    console.log(`\n[WARN] Record counts do not match (difference: ${Math.abs(mongoCount - zerodbCount)})`);
    console.log('       This may be expected if some records were already migrated');
  }

  return isValid;
}

/**
 * Print migration summary
 * @param {Object} stats - Migration statistics
 */
function printSummary(stats) {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  console.log('\n========================================');
  console.log('Migration Summary');
  console.log('========================================\n');

  console.log(`Total users in MongoDB: ${stats.totalInMongoDB}`);
  console.log(`Processed:              ${stats.processed}`);
  console.log(`Migrated:               ${stats.migrated}`);
  console.log(`Skipped (duplicates):   ${stats.skipped}`);
  console.log(`Errors:                 ${stats.errors}`);
  console.log(`Duration:               ${duration}s`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No data was written to ZeroDB');
  }

  if (stats.errors > 0) {
    console.log('\n[WARNING] Some records failed to migrate. Review errors above.');
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const stats = await migrateUsers();
    await validateMigration(stats);
    printSummary(stats);

    await mongoose.disconnect();
    console.log('\nMongoDB disconnected');

    process.exit(stats.errors > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n[FATAL ERROR]', error.message);
    console.error(error.stack);

    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  migrateUsers,
  transformUserForZeroDB,
  validateMigration,
  userExistsInZeroDB,
  ensureUsersTable,
  BATCH_SIZE,
  TABLE_NAME
};
