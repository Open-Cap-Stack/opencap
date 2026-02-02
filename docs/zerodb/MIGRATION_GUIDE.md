# ZeroDB Migration Guide

**Complete step-by-step guide for migrating OpenCap Stack from MongoDB to ZeroDB**

Last Updated: 2026-02-02
Status: Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Migration Process](#step-by-step-migration-process)
4. [Verification Steps](#verification-steps)
5. [Rollback Instructions](#rollback-instructions)
6. [Post-Migration Optimization](#post-migration-optimization)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through migrating your OpenCap Stack installation from MongoDB to ZeroDB, leveraging ZeroDB's lakehouse capabilities including vector search, memory management, event streaming, and file storage.

**Migration Strategy**: Phased approach with continuous sync support
**Estimated Downtime**: Zero (with sync enabled)
**Total Migration Time**: 2-4 hours

### ZeroDB Benefits

- **Unified Data Platform**: NoSQL tables, vector search, memory, events, and files in one system
- **Lakehouse Architecture**: Combines data lake flexibility with data warehouse performance
- **AI-Native Features**: Built-in support for embeddings, semantic search, and agent memory
- **Simplified Operations**: No separate database instances to manage
- **Cost Effective**: Pay only for what you use with serverless pricing

---

## Prerequisites

Before starting the migration, ensure you have:

### Required

- [ ] OpenCap Stack backend running successfully
- [ ] Node.js v14 or higher installed
- [ ] ZeroDB account created at https://api.ainative.studio/
- [ ] ZeroDB API token generated
- [ ] Git access to your OpenCap repository

### For MongoDB Migration (if applicable)

- [ ] Access to your existing MongoDB instance
- [ ] Backup of your MongoDB data
- [ ] MongoDB export tools installed

### Recommended

- [ ] Staging environment for testing
- [ ] Monitoring tools configured
- [ ] Team notification system ready
- [ ] Rollback plan documented

---

## Step-by-Step Migration Process

### Step 1: Create ZeroDB Account and Project

1. **Sign up for ZeroDB**
   ```bash
   # Visit https://api.ainative.studio/
   # Create an account or log in
   ```

2. **Generate API Token**
   - Navigate to Account Settings
   - Click "Generate API Token"
   - Copy the token securely

3. **Create OpenCap Project**
   ```bash
   curl -X POST https://api.ainative.studio/api/v1/projects/ \
     -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "OpenCap Production",
       "description": "OpenCap Stack Financial Management System"
     }'
   ```

4. **Save Project ID**
   ```bash
   # From the response, save the project ID
   export ZERODB_PROJECT_ID=<project_id_from_response>
   ```

### Step 2: Configure Environment Variables

1. **Update .env file**
   ```bash
   # Copy example environment file
   cp .env.example .env

   # Edit .env and add:
   ZERODB_API_KEY=your_api_token_here
   ZERODB_BASE_URL=https://api.ainative.studio/api/v1
   ZERODB_PROJECT_ID=your_project_id_here
   ```

2. **Verify Configuration**
   ```bash
   # Test ZeroDB connection
   curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/status" \
     -H "Authorization: Bearer $ZERODB_API_KEY"
   ```

   Expected response:
   ```json
   {
     "enabled": true,
     "tables_count": 0,
     "vectors_count": 0,
     "memory_records_count": 0,
     "events_count": 0,
     "files_count": 0
   }
   ```

### Step 3: Initialize ZeroDB Tables

1. **Run table creation script**
   ```bash
   npm run zerodb:init

   # Or manually:
   node scripts/createZeroDBTables.js
   ```

2. **Verify tables created**
   ```bash
   curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/tables" \
     -H "Authorization: Bearer $ZERODB_API_KEY"
   ```

   You should see tables for:
   - users
   - companies
   - stakeholders
   - transactions
   - documents
   - financial_metrics
   - share_classes
   - And all other OpenCap models

### Step 4: Migrate Existing Data (if from MongoDB)

If you have existing MongoDB data to migrate:

1. **Enable Continuous Sync (Optional - for zero downtime)**
   ```bash
   # In .env:
   SYNC_ENABLED=true
   SYNC_BATCH_SIZE=50
   SYNC_BATCH_TIMEOUT_MS=5000
   ```

2. **Run data migration script**
   ```bash
   node scripts/migration/migrateMongoToZeroDB.js
   ```

3. **Monitor migration progress**
   ```bash
   # The script will output:
   # - Total records to migrate
   # - Current progress
   # - Any errors encountered
   # - Final summary
   ```

4. **Verify data integrity**
   ```bash
   node scripts/validation/validateTableCreation.js
   ```

### Step 5: Test Application Functionality

1. **Run full test suite**
   ```bash
   npm test
   ```

2. **Test critical user flows**
   - User authentication
   - Company creation
   - Stakeholder management
   - Document upload
   - Financial calculations
   - Report generation

3. **Verify API endpoints**
   ```bash
   # Test key endpoints
   curl -X GET http://localhost:3001/api/companies \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

   curl -X GET http://localhost:3001/api/stakeholders \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Step 6: Switch to ZeroDB-Only Mode

Once you're confident everything works:

1. **Disable MongoDB sync (if enabled)**
   ```bash
   # In .env:
   SYNC_ENABLED=false

   # Optional: Comment out MongoDB URI
   # MONGODB_URI=mongodb://localhost:27017/opencap
   ```

2. **Restart application**
   ```bash
   npm restart
   ```

3. **Verify ZeroDB-only operation**
   ```bash
   # Application should start without MongoDB connection
   # All operations should work with ZeroDB
   ```

---

## Verification Steps

### Data Integrity Verification

Run these checks to ensure migration success:

```bash
# 1. Count verification
node scripts/validation/verifyRecordCounts.js

# 2. Sample data comparison
node scripts/validation/compareSampleData.js

# 3. Full data validation
npm test -- __tests__/migration/dataIntegrity.test.js
```

### Performance Verification

```bash
# 1. Run performance benchmarks
npm run benchmark

# 2. Load test
npm run load-test

# 3. Check query response times
node scripts/performance/measureQueryTimes.js
```

### Feature Verification Checklist

- [ ] User authentication works
- [ ] Companies CRUD operations work
- [ ] Stakeholder management works
- [ ] Document upload and retrieval works
- [ ] Financial calculations are accurate
- [ ] Reports generate correctly
- [ ] Vector search (if used) works
- [ ] Memory management (if used) works

---

## Rollback Instructions

If you need to rollback to MongoDB:

### Immediate Rollback (< 5 minutes)

1. **Stop the application**
   ```bash
   npm stop
   # or
   pm2 stop opencap
   ```

2. **Revert environment variables**
   ```bash
   # In .env, ensure MongoDB URI is active:
   MONGODB_URI=mongodb://localhost:27017/opencap
   ```

3. **Restore from MongoDB backup (if needed)**
   ```bash
   mongorestore --uri="mongodb://localhost:27017/opencap" ./backups/pre-migration/
   ```

4. **Restart application**
   ```bash
   npm start
   ```

---

## Post-Migration Optimization

After successful migration:

### 1. Enable Advanced Features

```bash
# Vector search for documents
ENABLE_VECTOR_SEARCH=true

# Memory management for AI agents
ENABLE_MEMORY_MANAGEMENT=true

# Event streaming for real-time updates
ENABLE_EVENT_STREAMING=true
```

### 2. Configure Performance Tuning

See [Performance Tuning Guide](../performance-tuning.md) for:
- Query optimization
- Caching strategies
- Batch operations
- Index optimization

### 3. Set Up Monitoring

```bash
# Enable database monitoring
ENABLE_DB_MONITORING=true

# Configure metrics collection
METRICS_COLLECTION_INTERVAL=30000
```

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot connect to ZeroDB"

**Solution:**
```bash
# Verify API key
echo $ZERODB_API_KEY

# Test connection
curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/status" \
  -H "Authorization: Bearer $ZERODB_API_KEY"

# Check firewall/network settings
```

#### Issue: "Table not found"

**Solution:**
```bash
# Re-run table initialization
npm run zerodb:init

# Verify tables exist
curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/tables" \
  -H "Authorization: Bearer $ZERODB_API_KEY"
```

#### Issue: "Data sync lag"

**Solution:**
```bash
# Increase batch size
SYNC_BATCH_SIZE=200

# Reduce sync interval
SYNC_INTERVAL_MS=2000
```

For more troubleshooting tips, see the [Troubleshooting Guide](../troubleshooting.md).

---

## Getting Help

- **Documentation**: [ZeroDB API Reference](./API_REFERENCE.md)
- **Performance**: [Performance Tuning Guide](../performance-tuning.md)
- **Issues**: [Troubleshooting Guide](../troubleshooting.md)
- **Support**: Open an issue on GitHub or contact support@ainative.studio

---

## Migration Checklist

### Pre-Migration
- [ ] ZeroDB account created
- [ ] API token generated
- [ ] Project created
- [ ] Backup completed (if migrating from MongoDB)
- [ ] Staging environment tested

### Migration
- [ ] Environment variables configured
- [ ] ZeroDB tables created
- [ ] Data migrated (if applicable)
- [ ] Data integrity verified
- [ ] Application tested

### Post-Migration
- [ ] All tests passing
- [ ] Performance verified
- [ ] Monitoring enabled
- [ ] Team trained
- [ ] Documentation updated

---

**Migration Complete!** Your OpenCap Stack is now running on ZeroDB with enhanced capabilities including vector search, memory management, and event streaming.
