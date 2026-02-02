#!/usr/bin/env node

/**
 * ZeroDB Performance Optimization Script
 *
 * Analyzes ZeroDB performance and provides actionable optimization recommendations
 * Can be run manually or scheduled as a cron job
 */

const MonitoringDashboard = require('../services/monitoringDashboard');
const PerformanceOptimizer = require('../services/performanceOptimizer');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  reportOutputDir: path.join(__dirname, '../reports'),
  slowQueryThreshold: 1000, // 1 second
  minRecommendationPriority: 10
};

/**
 * Main optimization analysis function
 */
async function runOptimization() {
  console.log('='.repeat(80));
  console.log('ZeroDB Performance Optimization Analysis');
  console.log('='.repeat(80));
  console.log();

  try {
    // Initialize services
    const monitoringDashboard = new MonitoringDashboard();
    const performanceOptimizer = new PerformanceOptimizer(monitoringDashboard);

    console.log('Generating comprehensive optimization report...\n');

    // Generate report
    const report = performanceOptimizer.generateOptimizationReport();

    // Display summary
    displaySummary(report);

    // Display prioritized recommendations
    displayRecommendations(report);

    // Display slow queries
    displaySlowQueries(report);

    // Display index recommendations
    displayIndexRecommendations(report);

    // Display batch optimization
    displayBatchOptimization(report);

    // Display caching strategy
    displayCachingStrategy(report);

    // Save report to file
    saveReport(report);

    console.log('\n' + '='.repeat(80));
    console.log('Optimization analysis complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error running optimization analysis:', error);
    process.exit(1);
  }
}

/**
 * Display optimization summary
 */
function displaySummary(report) {
  console.log('SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Recommendations: ${report.summary.totalRecommendations}`);
  console.log(`Estimated Latency Reduction: ${report.summary.estimatedTotalImpact.latencyReduction.toFixed(0)}ms`);
  console.log(`Estimated Throughput Increase: ${report.summary.estimatedTotalImpact.throughputIncrease.toFixed(0)}%`);
  console.log();
}

/**
 * Display prioritized recommendations
 */
function displayRecommendations(report) {
  console.log('TOP RECOMMENDATIONS (by priority)');
  console.log('-'.repeat(80));

  const topRecommendations = report.prioritizedRecommendations
    .filter(r => r.priority >= config.minRecommendationPriority)
    .slice(0, 10);

  if (topRecommendations.length === 0) {
    console.log('No high-priority recommendations at this time.');
  } else {
    topRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.type}] Priority: ${rec.priority.toFixed(0)} | Complexity: ${rec.complexity}`);

      if (rec.type === 'INDEX') {
        console.log(`   Table: ${rec.tableName}, Field: ${rec.field || rec.fields?.join(', ')}`);
        console.log(`   Reason: ${rec.reason}`);
      } else if (rec.type === 'BATCH_SIZE') {
        console.log(`   ${rec.recommendation}`);
      } else if (rec.type === 'CACHING') {
        console.log(`   Table: ${rec.tableName}, TTL: ${rec.recommendedTTL}s`);
        console.log(`   Hit Ratio: ${rec.estimatedHitRatio.toFixed(1)}%`);
      } else if (rec.type === 'CONNECTION_POOL') {
        console.log(`   Status: ${rec.status}`);
        rec.recommendations.forEach(r => console.log(`   - ${r}`));
      }
      console.log();
    });
  }
}

/**
 * Display slow queries analysis
 */
function displaySlowQueries(report) {
  const slowQueries = report.slowQueries;

  console.log('SLOW QUERIES ANALYSIS');
  console.log('-'.repeat(80));
  console.log(`Total Slow Queries: ${slowQueries.summary.totalSlowQueries}`);
  console.log(`Affected Tables: ${slowQueries.summary.affectedTables}`);
  console.log(`Average Duration: ${slowQueries.summary.averageDuration.toFixed(0)}ms`);
  console.log();

  if (Object.keys(slowQueries.byTable).length > 0) {
    console.log('Slow Queries by Table:');
    Object.entries(slowQueries.byTable).forEach(([tableName, stats]) => {
      console.log(`  ${tableName}: ${stats.count} queries, avg ${stats.averageDuration.toFixed(0)}ms`);
    });
    console.log();
  }
}

/**
 * Display index recommendations
 */
function displayIndexRecommendations(report) {
  const recommendations = report.indexRecommendations.slice(0, 5);

  console.log('INDEX RECOMMENDATIONS (Top 5)');
  console.log('-'.repeat(80));

  if (recommendations.length === 0) {
    console.log('No index recommendations at this time.');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. Table: ${rec.tableName}`);
      console.log(`   Field(s): ${rec.field || rec.fields?.join(', ')}`);
      console.log(`   Type: ${rec.indexType}`);
      console.log(`   Frequency: ${rec.frequency} queries`);
      console.log(`   Avg Duration: ${rec.averageDuration.toFixed(0)}ms`);
      console.log(`   Est. Latency Reduction: ${rec.estimatedImprovement.latencyReduction.toFixed(0)}ms`);
      console.log();
    });
  }
}

/**
 * Display batch optimization recommendations
 */
function displayBatchOptimization(report) {
  const batchOpt = report.batchSizeOptimization;

  console.log('BATCH SIZE OPTIMIZATION');
  console.log('-'.repeat(80));

  if (batchOpt.currentPerformance) {
    console.log('Current Performance:');
    console.log(`  Total Batches: ${batchOpt.currentPerformance.totalBatches}`);
    console.log(`  Success Rate: ${batchOpt.currentPerformance.successRate.toFixed(1)}%`);
    console.log(`  Avg Duration: ${batchOpt.currentPerformance.averageDuration.toFixed(0)}ms`);
    console.log();

    console.log(`Recommended Batch Size: ${batchOpt.recommendedBatchSize}`);
    console.log(`Reason: ${batchOpt.reason}`);

    if (batchOpt.expectedPerformance.estimatedLatency) {
      console.log();
      console.log('Expected Performance:');
      console.log(`  Est. Latency: ${batchOpt.expectedPerformance.estimatedLatency.toFixed(0)}ms`);
      console.log(`  Est. Throughput: ${batchOpt.expectedPerformance.estimatedThroughput.toFixed(0)} items/sec`);
    }
  } else {
    console.log('Insufficient data for batch optimization analysis.');
  }
  console.log();
}

/**
 * Display caching strategy
 */
function displayCachingStrategy(report) {
  const caching = report.cachingStrategy;

  console.log('CACHING STRATEGY RECOMMENDATIONS');
  console.log('-'.repeat(80));

  if (caching.cacheableQueries.length === 0) {
    console.log('No caching recommendations at this time.');
  } else {
    console.log(`Cacheable Queries: ${caching.cacheableQueries.length}`);
    console.log(`Est. Cache Hit Ratio: ${caching.summary.estimatedCacheHitRatio.toFixed(1)}%`);
    console.log();

    console.log('Top Caching Opportunities:');
    caching.cacheableQueries.slice(0, 5).forEach((cq, index) => {
      console.log(`${index + 1}. Table: ${cq.tableName}`);
      console.log(`   Frequency: ${cq.frequency} queries`);
      console.log(`   Recommended TTL: ${cq.recommendedTTL}s`);
      console.log(`   Est. Latency Reduction: ${cq.estimatedLatencyReduction.toFixed(0)}ms`);
      console.log();
    });
  }
}

/**
 * Save report to file
 */
function saveReport(report) {
  try {
    // Ensure reports directory exists
    if (!fs.existsSync(config.reportOutputDir)) {
      fs.mkdirSync(config.reportOutputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `zerodb-optimization-${timestamp}.json`;
    const filepath = path.join(config.reportOutputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.log(`\nReport saved to: ${filepath}`);
  } catch (error) {
    console.error('Error saving report:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  runOptimization().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runOptimization };
