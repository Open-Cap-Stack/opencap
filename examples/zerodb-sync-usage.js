/**
 * ZeroDB Bidirectional Sync - Usage Examples
 *
 * This file demonstrates how to use the ZeroDB sync service
 * for bidirectional data synchronization between MongoDB and ZeroDB
 */

const mongoose = require('mongoose');
const zerodbSyncService = require('../services/zerodbSyncService');
const zerodbService = require('../services/zerodbService');

/**
 * Example 1: Basic Sync Setup
 */
async function example1_BasicSetup() {
  console.log('Example 1: Basic Sync Setup\n');

  // Step 1: Initialize the sync service
  await zerodbSyncService.initialize();
  console.log('Sync service initialized');

  // Step 2: Start syncing a table with default settings
  await zerodbSyncService.startSync('users', 'User');
  console.log('Started syncing users table');

  // The sync will now automatically:
  // - Poll ZeroDB event stream every 5 seconds (default)
  // - Process insert/update/delete events
  // - Apply changes to MongoDB
  // - Handle conflicts using last-write-wins strategy
  // - Retry failed operations with exponential backoff
  // - Log all operations to audit trail

  // Step 3: Check health status
  const health = await zerodbSyncService.getHealthStatus();
  console.log('Health status:', JSON.stringify(health, null, 2));

  // Step 4: Stop sync when done
  // await zerodbSyncService.stopSync('users');
}

/**
 * Example 2: Custom Conflict Resolution
 */
async function example2_CustomConflictResolution() {
  console.log('\nExample 2: Custom Conflict Resolution\n');

  await zerodbSyncService.initialize();

  // Register a custom merge strategy for User model
  zerodbSyncService.registerCustomMergeStrategy('User', async (mongoData, zerodbData) => {
    console.log('Resolving conflict for user:', mongoData._id);

    // Custom logic: Merge user data intelligently
    return {
      // Keep MongoDB internal fields
      _id: mongoData._id,
      createdAt: mongoData.createdAt,

      // Use ZeroDB data for user info
      name: zerodbData.name,
      email: zerodbData.email,

      // Merge arrays (e.g., tags, roles)
      roles: [...new Set([...mongoData.roles, ...zerodbData.roles])],

      // Field-level timestamp comparison
      status: zerodbData.statusUpdatedAt > (mongoData.statusUpdatedAt || 0)
        ? zerodbData.status
        : mongoData.status,

      // Use most recent timestamp
      updatedAt: Math.max(
        new Date(mongoData.updatedAt).getTime(),
        zerodbData.updatedAt || 0
      )
    };
  });

  // Start sync with custom strategy
  await zerodbSyncService.startSync('users', 'User', {
    conflictStrategy: 'custom'
  });

  console.log('Custom conflict resolution registered and sync started');
}

/**
 * Example 3: Multiple Tables with Different Strategies
 */
async function example3_MultipleTablesWithStrategies() {
  console.log('\nExample 3: Multiple Tables with Different Strategies\n');

  await zerodbSyncService.initialize();

  // Users: Last-write-wins (default)
  await zerodbSyncService.startSync('users', 'User', {
    conflictStrategy: 'last-write-wins'
  });
  console.log('Users sync: last-write-wins');

  // Companies: MongoDB priority (MongoDB is source of truth)
  await zerodbSyncService.startSync('companies', 'Company', {
    conflictStrategy: 'mongodb-priority'
  });
  console.log('Companies sync: mongodb-priority');

  // Analytics: ZeroDB priority (ZeroDB is source of truth)
  await zerodbSyncService.startSync('analytics_events', 'AnalyticsEvent', {
    conflictStrategy: 'zerodb-priority'
  });
  console.log('Analytics sync: zerodb-priority');

  // Documents: Custom merge with versioning
  zerodbSyncService.registerCustomMergeStrategy('Document', async (mongoData, zerodbData) => {
    // Keep version history from MongoDB
    const versions = mongoData.versions || [];

    // Add new version from ZeroDB
    if (zerodbData.content !== mongoData.content) {
      versions.push({
        content: zerodbData.content,
        updatedAt: zerodbData.updatedAt,
        updatedBy: zerodbData.updatedBy
      });
    }

    return {
      ...mongoData,
      ...zerodbData,
      versions,
      versionCount: versions.length
    };
  });

  await zerodbSyncService.startSync('documents', 'Document', {
    conflictStrategy: 'custom'
  });
  console.log('Documents sync: custom (with versioning)');
}

/**
 * Example 4: Monitoring and Alerting
 */
async function example4_MonitoringAndAlerting() {
  console.log('\nExample 4: Monitoring and Alerting\n');

  await zerodbSyncService.initialize();
  await zerodbSyncService.startSync('users', 'User');

  // Set up periodic health checks
  const monitoringInterval = setInterval(async () => {
    const health = await zerodbSyncService.getHealthStatus();

    // Check overall health
    const unhealthyTables = health.tables.filter(t => !t.isHealthy);

    if (unhealthyTables.length > 0) {
      console.error('ALERT: Unhealthy sync detected!');
      unhealthyTables.forEach(table => {
        console.error(`Table: ${table.tableName}`);
        console.error(`Consecutive failures: ${table.consecutiveFailures}`);
        console.error(`Recent errors: ${table.recentErrors}`);
        console.error(`Last error: ${table.lastError?.message}`);
      });

      // In production, send alert to monitoring system
      // sendAlert('sync_unhealthy', { tables: unhealthyTables });
    }

    // Check metrics
    const metrics = health.overall.metrics;
    const errorRate = metrics.eventsFailed / metrics.eventsProcessed;

    if (errorRate > 0.05) { // 5% error rate
      console.warn(`WARNING: High error rate detected: ${(errorRate * 100).toFixed(2)}%`);
    }

    if (metrics.avgProcessingTimeMs > 1000) {
      console.warn(`WARNING: High processing latency: ${metrics.avgProcessingTimeMs}ms`);
    }
  }, 30000); // Every 30 seconds

  // Clean up
  // clearInterval(monitoringInterval);
}

/**
 * Example 5: Retrieving and Analyzing Audit Logs
 */
async function example5_AuditLogAnalysis() {
  console.log('\nExample 5: Audit Log Analysis\n');

  await zerodbSyncService.initialize();

  // Get failed operations from last 24 hours
  const oneDayAgo = new Date(Date.now() - 86400000);

  const failedLogs = await zerodbSyncService.getAuditLogs('users', {
    status: 'failed',
    startDate: oneDayAgo,
    limit: 1000
  });

  console.log(`Total failed operations: ${failedLogs.total}`);

  // Analyze error patterns
  const errorPatterns = failedLogs.logs.reduce((acc, log) => {
    const errorType = log.errorMessage?.split(':')[0] || 'Unknown';
    acc[errorType] = (acc[errorType] || 0) + 1;
    return acc;
  }, {});

  console.log('Error patterns:', errorPatterns);

  // Get conflict resolutions
  const conflicts = await zerodbSyncService.getAuditLogs('users', {
    startDate: oneDayAgo,
    limit: 1000
  });

  const conflictStats = conflicts.logs
    .filter(log => log.conflictResolution)
    .reduce((acc, log) => {
      acc[log.conflictResolution] = (acc[log.conflictResolution] || 0) + 1;
      return acc;
    }, {});

  console.log('Conflict resolution stats:', conflictStats);

  // Find documents with multiple sync attempts
  const multipleAttempts = failedLogs.logs
    .filter(log => log.attemptCount > 1)
    .map(log => ({
      documentId: log.documentId,
      attempts: log.attemptCount,
      error: log.errorMessage
    }));

  console.log('Documents with retry attempts:', multipleAttempts);
}

/**
 * Example 6: Manual Event Processing
 */
async function example6_ManualEventProcessing() {
  console.log('\nExample 6: Manual Event Processing\n');

  await zerodbSyncService.initialize();

  // Manually process a single event (for testing/debugging)
  const testEvent = {
    event_id: 'manual_test_1',
    timestamp: Date.now(),
    topic: 'table:users',
    event_payload: {
      operation: 'update',
      document_id: 'user_12345',
      data: {
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
        updatedAt: Date.now()
      }
    }
  };

  try {
    // Process event directly (bypassing polling)
    await zerodbSyncService._processEvent(
      testEvent,
      'users',
      'User',
      'last-write-wins'
    );

    console.log('Manual event processed successfully');

    // Check audit log
    const auditLogs = await zerodbSyncService.getAuditLogs('users', {
      limit: 1
    });

    console.log('Latest audit entry:', auditLogs.logs[0]);
  } catch (error) {
    console.error('Error processing manual event:', error);
  }
}

/**
 * Example 7: Graceful Shutdown
 */
async function example7_GracefulShutdown() {
  console.log('\nExample 7: Graceful Shutdown\n');

  await zerodbSyncService.initialize();

  // Start multiple syncs
  await zerodbSyncService.startSync('users', 'User');
  await zerodbSyncService.startSync('companies', 'Company');
  await zerodbSyncService.startSync('documents', 'Document');

  console.log('Started 3 sync processes');

  // Set up graceful shutdown handlers
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    // Stop all syncs
    await zerodbSyncService.stopAllSyncs();
    console.log('All syncs stopped');

    // Get final metrics
    const finalMetrics = zerodbSyncService.getMetrics();
    console.log('Final metrics:', finalMetrics);

    // Close database connections
    await mongoose.connection.close();
    console.log('Database connections closed');

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  console.log('Graceful shutdown handlers registered');
}

/**
 * Example 8: Performance Tuning
 */
async function example8_PerformanceTuning() {
  console.log('\nExample 8: Performance Tuning\n');

  // Adjust environment variables for high-throughput scenarios
  process.env.SYNC_POLL_INTERVAL_MS = '1000'; // Poll every second
  process.env.SYNC_MAX_RETRIES = '5'; // More retries
  process.env.SYNC_BASE_BACKOFF_MS = '500'; // Faster initial retry
  process.env.SYNC_MAX_BACKOFF_MS = '10000'; // Lower max backoff

  await zerodbSyncService.initialize();

  console.log('Sync configuration:');
  console.log(`Poll interval: ${zerodbSyncService.pollInterval}ms`);
  console.log(`Max retries: ${zerodbSyncService.maxRetries}`);
  console.log(`Base backoff: ${zerodbSyncService.baseBackoffMs}ms`);
  console.log(`Max backoff: ${zerodbSyncService.maxBackoffMs}ms`);

  // Monitor performance metrics
  setInterval(() => {
    const metrics = zerodbSyncService.getMetrics();
    const throughput = metrics.eventsProcessed / (Date.now() - metrics.lastProcessedTime?.getTime() || 1) * 1000;

    console.log(`Throughput: ${throughput.toFixed(2)} events/sec`);
    console.log(`Avg processing time: ${metrics.avgProcessingTimeMs}ms`);
    console.log(`Success rate: ${((metrics.eventsSucceeded / metrics.eventsProcessed) * 100).toFixed(2)}%`);
  }, 10000); // Every 10 seconds
}

/**
 * Main execution
 */
async function main() {
  console.log('=== ZeroDB Sync Service Usage Examples ===\n');

  // Uncomment the example you want to run:

  // await example1_BasicSetup();
  // await example2_CustomConflictResolution();
  // await example3_MultipleTablesWithStrategies();
  // await example4_MonitoringAndAlerting();
  // await example5_AuditLogAnalysis();
  // await example6_ManualEventProcessing();
  // await example7_GracefulShutdown();
  // await example8_PerformanceTuning();

  console.log('\n=== Examples Complete ===');
}

// Run examples if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error running examples:', error);
    process.exit(1);
  });
}

module.exports = {
  example1_BasicSetup,
  example2_CustomConflictResolution,
  example3_MultipleTablesWithStrategies,
  example4_MonitoringAndAlerting,
  example5_AuditLogAnalysis,
  example6_ManualEventProcessing,
  example7_GracefulShutdown,
  example8_PerformanceTuning
};
