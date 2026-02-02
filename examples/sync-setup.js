/**
 * MongoDB to ZeroDB Sync Setup Example
 *
 * This file demonstrates how to set up bidirectional synchronization
 * between MongoDB and ZeroDB using the continuous sync feature.
 *
 * Features demonstrated:
 * - Starting sync for specific collections
 * - Configuring conflict resolution strategies
 * - Monitoring sync health
 * - Handling sync errors
 * - Graceful shutdown
 *
 * Usage:
 * 1. Ensure MongoDB is running and connected
 * 2. Ensure ZERODB credentials are configured
 * 3. Run: node examples/sync-setup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const zerodbSyncService = require('../services/zerodbSyncService');
const syncOrchestrator = require('../services/syncOrchestrator');

/**
 * Example 1: Basic Sync Setup
 */
async function basicSyncSetup() {
  console.log('\n========================================');
  console.log('Example 1: Basic Sync Setup');
  console.log('========================================\n');

  // Initialize sync service
  await zerodbSyncService.initialize();
  console.log('✓ Sync service initialized');

  // Start syncing users table
  await zerodbSyncService.startSync('users', 'User');
  console.log('✓ Started syncing users table');

  // Check health
  const health = await zerodbSyncService.getHealthStatus();
  console.log('✓ Health status:', JSON.stringify(health, null, 2));
}

/**
 * Example 2: Multiple Collections with Different Strategies
 */
async function multipleCollectionsSync() {
  console.log('\n========================================');
  console.log('Example 2: Multiple Collections');
  console.log('========================================\n');

  await zerodbSyncService.initialize();

  // Users: Last-write-wins
  await zerodbSyncService.startSync('users', 'User', {
    conflictStrategy: 'last-write-wins'
  });
  console.log('✓ Users sync: last-write-wins');

  // Companies: MongoDB priority
  await zerodbSyncService.startSync('companies', 'Company', {
    conflictStrategy: 'mongodb-priority'
  });
  console.log('✓ Companies sync: mongodb-priority');

  // Documents: ZeroDB priority
  await zerodbSyncService.startSync('documents', 'Document', {
    conflictStrategy: 'zerodb-priority'
  });
  console.log('✓ Documents sync: zerodb-priority');
}

/**
 * Example 3: Monitoring Sync Performance
 */
async function monitorSyncPerformance() {
  console.log('\n========================================');
  console.log('Example 3: Monitoring Sync Performance');
  console.log('========================================\n');

  await zerodbSyncService.initialize();
  await zerodbSyncService.startSync('users', 'User');

  // Monitor every 10 seconds
  const monitorInterval = setInterval(async () => {
    const health = await zerodbSyncService.getHealthStatus();

    console.log('\n--- Sync Metrics ---');
    console.log(`Events processed: ${health.overall.metrics.eventsProcessed}`);
    console.log(`Events succeeded: ${health.overall.metrics.eventsSucceeded}`);
    console.log(`Events failed: ${health.overall.metrics.eventsFailed}`);
    console.log(`Avg processing time: ${health.overall.metrics.avgProcessingTimeMs}ms`);

    // Alert on high error rate
    const errorRate = health.overall.metrics.eventsFailed / health.overall.metrics.eventsProcessed;
    if (errorRate > 0.05) {
      console.warn(`⚠️  High error rate: ${(errorRate * 100).toFixed(2)}%`);
    }
  }, 10000);

  // Clean up after 60 seconds
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log('\n✓ Monitoring stopped');
  }, 60000);
}

/**
 * Example 4: Using Sync Orchestrator (Full Bidirectional Sync)
 */
async function bidirectionalSyncSetup() {
  console.log('\n========================================');
  console.log('Example 4: Bidirectional Sync');
  console.log('========================================\n');

  // Connect to MongoDB
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap');
    console.log('✓ Connected to MongoDB');
  }

  // Initialize sync orchestrator
  await syncOrchestrator.initialize({
    direction: 'bidirectional',
    collections: ['users', 'companies', 'stakeholders'],
    batchSize: 100,
    syncInterval: 5000
  });
  console.log('✓ Sync orchestrator initialized');

  // Start sync
  await syncOrchestrator.startSync();
  console.log('✓ Bidirectional sync started');

  // Monitor health
  const healthInterval = setInterval(async () => {
    const metrics = syncOrchestrator.getMetrics();

    console.log('\n--- Orchestrator Metrics ---');
    console.log(`Mongo → ZeroDB: ${metrics.mongoToZerodb.synced} synced`);
    console.log(`ZeroDB → Mongo: ${metrics.zerodbToMongo.synced} synced`);
    console.log(`Conflicts: ${metrics.conflicts}`);
  }, 15000);

  // Clean up after 90 seconds
  setTimeout(async () => {
    clearInterval(healthInterval);
    await syncOrchestrator.stopSync();
    console.log('\n✓ Bidirectional sync stopped');
  }, 90000);
}

/**
 * Example 5: Custom Conflict Resolution
 */
async function customConflictResolution() {
  console.log('\n========================================');
  console.log('Example 5: Custom Conflict Resolution');
  console.log('========================================\n');

  await zerodbSyncService.initialize();

  // Register custom merge strategy
  zerodbSyncService.registerCustomMergeStrategy('User', async (mongoData, zerodbData) => {
    console.log('Resolving conflict for user:', mongoData._id);

    // Custom merge logic
    return {
      _id: mongoData._id,
      createdAt: mongoData.createdAt,

      // Prefer ZeroDB for user info
      name: zerodbData.name || mongoData.name,
      email: zerodbData.email || mongoData.email,

      // Merge arrays
      roles: [...new Set([...(mongoData.roles || []), ...(zerodbData.roles || [])])],

      // Use latest timestamp
      updatedAt: Math.max(
        new Date(mongoData.updatedAt || 0).getTime(),
        zerodbData.updatedAt || 0
      )
    };
  });

  // Start sync with custom strategy
  await zerodbSyncService.startSync('users', 'User', {
    conflictStrategy: 'custom'
  });

  console.log('✓ Custom conflict resolution registered and sync started');
}

/**
 * Example 6: Graceful Shutdown
 */
async function gracefulShutdownExample() {
  console.log('\n========================================');
  console.log('Example 6: Graceful Shutdown');
  console.log('========================================\n');

  await zerodbSyncService.initialize();

  // Start multiple syncs
  await zerodbSyncService.startSync('users', 'User');
  await zerodbSyncService.startSync('companies', 'Company');
  console.log('✓ Started 2 sync processes');

  // Register shutdown handlers
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    // Stop all syncs
    await zerodbSyncService.stopAllSyncs();
    console.log('✓ All syncs stopped');

    // Get final metrics
    const finalMetrics = zerodbSyncService.getMetrics();
    console.log('Final metrics:', finalMetrics);

    // Close database
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('✓ Database connections closed');
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  console.log('✓ Graceful shutdown handlers registered');
  console.log('Press Ctrl+C to test graceful shutdown');

  // Keep process alive
  await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('==========================================');
  console.log('MongoDB to ZeroDB Sync Examples');
  console.log('==========================================');

  try {
    // Uncomment the example you want to run:

    // await basicSyncSetup();
    // await multipleCollectionsSync();
    // await monitorSyncPerformance();
    // await bidirectionalSyncSetup();
    // await customConflictResolution();
    // await gracefulShutdownExample();

    console.log('\n==========================================');
    console.log('Example Instructions:');
    console.log('==========================================');
    console.log('Uncomment one of the example functions above to run it.');
    console.log('\nAvailable examples:');
    console.log('1. basicSyncSetup() - Basic sync configuration');
    console.log('2. multipleCollectionsSync() - Multiple collections with different strategies');
    console.log('3. monitorSyncPerformance() - Monitor sync health and metrics');
    console.log('4. bidirectionalSyncSetup() - Full bidirectional sync');
    console.log('5. customConflictResolution() - Custom merge strategies');
    console.log('6. gracefulShutdownExample() - Graceful shutdown handling');
    console.log('\nFor more details, see docs/mongodb-zerodb-sync.md');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);

    console.log('\nTroubleshooting:');
    console.log('1. Ensure MongoDB is running and accessible');
    console.log('2. Verify MONGODB_URI in .env');
    console.log('3. Ensure ZERODB credentials are configured');
    console.log('4. Check that models exist for the collections being synced');
    console.log('5. See docs/troubleshooting.md for more help');

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  basicSyncSetup,
  multipleCollectionsSync,
  monitorSyncPerformance,
  bidirectionalSyncSetup,
  customConflictResolution,
  gracefulShutdownExample
};
