# ZeroDB Performance Tuning Guide

**Optimization strategies for OpenCap Stack with ZeroDB**

Last Updated: 2026-02-02

## Table of Contents

1. [Performance Benchmarks](#performance-benchmarks)
2. [Query Optimization](#query-optimization)
3. [Caching Strategies](#caching-strategies)
4. [Batch Operations](#batch-operations)
5. [Index Optimization](#index-optimization)
6. [Connection Management](#connection-management)
7. [Sync Performance](#sync-performance)
8. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Performance Benchmarks

### Baseline Performance Metrics

**Query Performance:**
- Single row read: < 10ms
- Simple query (100 rows): < 50ms
- Complex query with joins: < 200ms
- Full table scan (10K rows): < 500ms

**Write Performance:**
- Single insert: < 20ms
- Batch insert (100 rows): < 150ms
- Update operation: < 15ms
- Delete operation: < 10ms

**Vector Search Performance:**
- Vector similarity search (top 10): < 100ms
- Vector upsert: < 30ms
- Large vector operations (1M+ vectors): < 500ms

**Sync Performance:**
- Change detection latency: < 50ms
- Sync throughput: 1000+ ops/sec
- Batch processing: 5000+ events/sec

### Configuration for Benchmarking

```bash
# .env settings for benchmarking
ZERODB_API_KEY=your_api_key
ZERODB_PROJECT_ID=your_project_id

# Performance settings
ZERODB_MAX_CONNECTIONS=100
ZERODB_CONNECTION_TIMEOUT=5000
ZERODB_REQUEST_TIMEOUT=10000

# Caching
ENABLE_QUERY_CACHE=true
CACHE_TTL_SECONDS=300

# Batch settings
BATCH_SIZE=500
BATCH_TIMEOUT_MS=1000
```

### Running Benchmarks

```bash
# Run performance tests
npm run benchmark

# Or manually:
node scripts/performance/runBenchmarks.js

# Specific benchmark
node scripts/performance/queryBenchmark.js
```

---

## Query Optimization

### 1. Use Selective Queries

**Bad:**
```javascript
// Fetches all companies then filters in memory
const allCompanies = await zerodbService.queryTable('companies');
const cCorps = allCompanies.filter(c => c.type === 'C-Corp');
```

**Good:**
```javascript
// Filter at database level
const cCorps = await zerodbService.queryTable('companies', {
  filter: { type: 'C-Corp' },
  limit: 100
});
```

### 2. Project Only Needed Fields

**Bad:**
```javascript
// Fetches all fields including large JSON blobs
const companies = await zerodbService.queryTable('companies');
```

**Good:**
```javascript
// Only fetch needed fields
const companies = await zerodbService.queryTable('companies', {
  projection: ['id', 'name', 'type']  // Only essential fields
});
```

### 3. Use Pagination

**Bad:**
```javascript
// Loads 10,000 rows into memory
const allStakeholders = await zerodbService.queryTable('stakeholders');
```

**Good:**
```javascript
// Paginate for better performance
async function* paginateStakeholders(pageSize = 100) {
  let offset = 0;

  while (true) {
    const page = await zerodbService.queryTable('stakeholders', {
      limit: pageSize,
      offset: offset
    });

    if (page.length === 0) break;

    yield* page;
    offset += pageSize;
  }
}

// Usage
for await (const stakeholder of paginateStakeholders()) {
  // Process one at a time
  await processStakeholder(stakeholder);
}
```

### 4. Optimize Filter Queries

**Bad:**
```javascript
// Multiple separate queries
const newCompanies = await zerodbService.queryTable('companies', {
  filter: { status: 'active' }
});
const oldCompanies = await zerodbService.queryTable('companies', {
  filter: { status: 'inactive' }
});
```

**Good:**
```javascript
// Single query with compound filter
const companies = await zerodbService.queryTable('companies', {
  filter: {
    $or: [
      { status: 'active' },
      { status: 'inactive' }
    ]
  }
});
```

---

## Caching Strategies

### 1. In-Memory Cache for Frequently Accessed Data

```javascript
const NodeCache = require('node-cache');

// Configure cache
const cache = new NodeCache({
  stdTTL: 300,           // 5 minutes default TTL
  checkperiod: 60,       // Check for expired keys every 60s
  useClones: false       // Better performance, but be careful with mutations
});

// Cache wrapper
async function getCachedCompany(id) {
  const cacheKey = `company_${id}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const company = await zerodbService.queryTable('companies', {
    filter: { id },
    limit: 1
  });

  // Store in cache
  if (company[0]) {
    cache.set(cacheKey, company[0]);
  }

  return company[0];
}

// Invalidate cache on updates
async function updateCompany(id, data) {
  await zerodbService.updateRows('companies', { id }, data);

  // Invalidate cache
  cache.del(`company_${id}`);
}
```

### 2. Redis Cache for Distributed Systems

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  keyPrefix: 'opencap:'
});

// Cache with Redis
async function getCachedCompanyRedis(id) {
  const cacheKey = `company:${id}`;

  // Check Redis
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const company = await zerodbService.queryTable('companies', {
    filter: { id },
    limit: 1
  });

  // Store in Redis (5 minute TTL)
  if (company[0]) {
    await redis.setex(cacheKey, 300, JSON.stringify(company[0]));
  }

  return company[0];
}
```

### 3. Cache Strategies by Use Case

**Static Reference Data:**
```javascript
// Cache indefinitely (or until app restart)
const COMPANY_TYPES = cache.get('company_types') || await loadCompanyTypes();
cache.set('company_types', COMPANY_TYPES, 0); // 0 = no expiration
```

**Frequently Updated Data:**
```javascript
// Short TTL for data that changes often
cache.set('active_users_count', count, 30); // 30 seconds
```

**User-Specific Data:**
```javascript
// Cache per user with appropriate TTL
cache.set(`user_dashboard_${userId}`, dashboard, 60); // 1 minute
```

---

## Batch Operations

### 1. Batch Inserts

**Bad:**
```javascript
// Individual inserts
for (const stakeholder of stakeholders) {
  await zerodbService.insertRow('stakeholders', stakeholder);
}
```

**Good:**
```javascript
// Batch insert
async function batchInsert(tableName, records, batchSize = 100) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    await Promise.all(
      batch.map(record => zerodbService.insertRow(tableName, record))
    );

    console.log(`Inserted batch ${i / batchSize + 1}`);
  }
}

await batchInsert('stakeholders', stakeholders);
```

### 2. Batch Updates

```javascript
// Efficient batch updates
async function batchUpdate(tableName, updates, batchSize = 50) {
  const batches = [];

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    batches.push(
      Promise.all(
        batch.map(({ filter, data }) =>
          zerodbService.updateRows(tableName, filter, data)
        )
      )
    );
  }

  await Promise.all(batches);
}
```

### 3. Parallel Processing

```javascript
const pLimit = require('p-limit');

// Limit concurrency to avoid overwhelming the API
const limit = pLimit(10); // Max 10 concurrent operations

const tasks = companies.map(company =>
  limit(() => processCompany(company))
);

await Promise.all(tasks);
```

---

## Index Optimization

### 1. Create Indexes on Frequently Queried Fields

```javascript
// When creating tables, define indexes
await zerodbService.createTable('companies', {
  fields: {
    id: { type: 'uuid', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true },
    status: { type: 'string', required: true },
    founded_date: { type: 'timestamp' },
    valuation: { type: 'number' }
  },
  indexes: [
    { fields: ['id'], unique: true },           // Primary key
    { fields: ['name'], unique: false },         // Search by name
    { fields: ['type'], unique: false },         // Filter by type
    { fields: ['status'], unique: false },       // Filter by status
    { fields: ['type', 'status'], unique: false } // Compound index
  ]
});
```

### 2. Compound Indexes for Common Query Patterns

```javascript
// If you frequently query by type AND status together:
{
  indexes: [
    { fields: ['type', 'status'], unique: false }
  ]
}

// Usage:
const activeCorps = await zerodbService.queryTable('companies', {
  filter: {
    type: 'C-Corp',
    status: 'active'
  }
});
```

### 3. Index Monitoring

```bash
# Check which queries are slow
node scripts/performance/analyzeSlowQueries.js

# Review index usage
node scripts/performance/indexUsageReport.js
```

---

## Connection Management

### 1. Connection Pooling

```javascript
// Configure connection pool in zerodbService.js
class ZeroDBService {
  constructor() {
    this.maxConnections = process.env.ZERODB_MAX_CONNECTIONS || 50;
    this.connectionTimeout = process.env.ZERODB_CONNECTION_TIMEOUT || 5000;
    this.requestTimeout = process.env.ZERODB_REQUEST_TIMEOUT || 10000;

    // Initialize connection pool
    this.pool = this.createPool();
  }

  createPool() {
    // Implement connection pooling logic
    return {
      maxConnections: this.maxConnections,
      timeout: this.connectionTimeout
    };
  }
}
```

### 2. Request Timeouts

```bash
# Set appropriate timeouts in .env
ZERODB_CONNECTION_TIMEOUT=5000   # 5 seconds to establish connection
ZERODB_REQUEST_TIMEOUT=10000     # 10 seconds for request to complete
ZERODB_IDLE_TIMEOUT=60000        # Close idle connections after 60s
```

### 3. Retry Logic

```javascript
const retry = require('async-retry');

async function resilientQuery(tableName, filter) {
  return await retry(
    async bail => {
      try {
        return await zerodbService.queryTable(tableName, filter);
      } catch (err) {
        if (err.status === 429) {
          // Rate limit - retry
          throw err;
        }
        if (err.code === 'ECONNRESET') {
          // Connection reset - retry
          throw err;
        }
        // Other errors - don't retry
        bail(err);
      }
    },
    {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000
    }
  );
}
```

---

## Sync Performance

### 1. Optimize Sync Configuration

```bash
# High-throughput configuration
SYNC_BATCH_SIZE=500               # Large batches
SYNC_INTERVAL_MS=1000             # Poll frequently
SYNC_MAX_RETRIES=5                # More retries
SYNC_BASE_BACKOFF_MS=500          # Fast initial retry
SYNC_MAX_BACKOFF_MS=10000         # Lower max backoff

# Circuit breaker
SYNC_CIRCUIT_BREAKER_THRESHOLD=10
SYNC_CIRCUIT_BREAKER_RESET_MS=30000
```

### 2. Selective Collection Sync

```bash
# Only sync critical collections
SYNC_COLLECTIONS=users,companies,transactions,stakeholders

# Don't sync:
# - Log tables
# - Temporary data
# - Cache tables
```

### 3. Parallel Sync Workers

```javascript
// Multiple sync workers for different collections
async function startParallelSync() {
  const collections = ['users', 'companies', 'stakeholders'];

  await Promise.all(
    collections.map(collection =>
      syncService.startSync(collection, getModelName(collection))
    )
  );
}
```

---

## Monitoring and Metrics

### 1. Application Performance Monitoring

```javascript
// Install APM tool
const newrelic = require('newrelic');

// Or use custom metrics
const metrics = {
  queries: 0,
  totalQueryTime: 0,
  errors: 0
};

// Instrument database calls
async function instrumentedQuery(tableName, filter) {
  const start = Date.now();

  try {
    const result = await zerodbService.queryTable(tableName, filter);
    metrics.queries++;
    metrics.totalQueryTime += (Date.now() - start);
    return result;
  } catch (err) {
    metrics.errors++;
    throw err;
  }
}

// Expose metrics endpoint
app.get('/api/admin/metrics', (req, res) => {
  res.json({
    queries: metrics.queries,
    avgQueryTime: metrics.totalQueryTime / metrics.queries,
    errors: metrics.errors,
    errorRate: metrics.errors / metrics.queries
  });
});
```

### 2. Database Monitoring

```javascript
// Monitor database performance
async function monitorDatabasePerformance() {
  const stats = await zerodbService.getDatabaseStatus();

  // Log metrics
  console.log('Database Metrics:', {
    tables: stats.tables_count,
    vectors: stats.vectors_count,
    memory: stats.memory_records_count,
    events: stats.events_count
  });

  // Alert on thresholds
  if (stats.tables_count > 100) {
    console.warn('High table count:', stats.tables_count);
  }
}

// Run every 5 minutes
setInterval(monitorDatabasePerformance, 300000);
```

### 3. Query Performance Tracking

```javascript
// Track slow queries
const slowQueryThreshold = 1000; // 1 second

async function trackQuery(tableName, filter, operation) {
  const start = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - start;

    if (duration > slowQueryThreshold) {
      console.warn('Slow query detected:', {
        table: tableName,
        filter: JSON.stringify(filter),
        duration: `${duration}ms`
      });
    }

    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}
```

---

## Performance Checklist

### Before Production

- [ ] Run performance benchmarks
- [ ] Test with production-sized dataset
- [ ] Implement caching for hot data
- [ ] Add indexes for all query patterns
- [ ] Configure connection pooling
- [ ] Set up monitoring and alerting
- [ ] Test under load (1000+ concurrent users)
- [ ] Optimize slow queries (> 200ms)
- [ ] Enable query caching where appropriate
- [ ] Review and optimize batch sizes

### Ongoing Optimization

- [ ] Monitor query performance weekly
- [ ] Review slow query logs
- [ ] Analyze cache hit rates
- [ ] Optimize indexes based on usage
- [ ] Update batch sizes for changed workloads
- [ ] Review and adjust cache TTLs
- [ ] Test with increased load monthly
- [ ] Update performance baselines quarterly

---

## Advanced Configuration

### Environment Variables for Performance

```bash
# Query optimization
ENABLE_QUERY_CACHE=true
QUERY_CACHE_SIZE=1000              # Number of queries to cache
QUERY_CACHE_TTL=300                # 5 minutes

# Batch processing
BATCH_SIZE=500
BATCH_TIMEOUT_MS=1000
MAX_BATCH_CONCURRENCY=10

# Connection management
ZERODB_MAX_CONNECTIONS=100
ZERODB_CONNECTION_TIMEOUT=5000
ZERODB_REQUEST_TIMEOUT=10000
ZERODB_IDLE_TIMEOUT=60000

# Sync performance
SYNC_BATCH_SIZE=500
SYNC_INTERVAL_MS=1000
SYNC_MAX_RETRIES=5

# Resource limits
MAX_MEMORY_MB=2048
MAX_CPU_PERCENT=80

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
METRICS_COLLECTION_INTERVAL=30000  # 30 seconds
SLOW_QUERY_THRESHOLD_MS=1000       # 1 second
```

---

## Performance Testing Tools

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Get companies"
    flow:
      - get:
          url: "/api/companies"
          headers:
            Authorization: "Bearer {{token}}"
```

Run with:
```bash
artillery run artillery-config.yml
```

---

**Last Updated**: 2026-02-02
**Version**: 1.0
