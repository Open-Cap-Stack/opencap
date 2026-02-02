# ZeroDB Troubleshooting Guide

**Common issues and solutions for OpenCap Stack with ZeroDB**

Last Updated: 2026-02-02

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Authentication Errors](#authentication-errors)
3. [Data Sync Problems](#data-sync-problems)
4. [Performance Issues](#performance-issues)
5. [Error Codes](#error-codes)
6. [Debugging Tips](#debugging-tips)

---

## Connection Issues

### Error: "Cannot connect to ZeroDB"

**Symptoms:**
- Application fails to start
- Error message: `ECONNREFUSED` or `Connection timeout`
- Logs show `ZeroDB connection failed`

**Solutions:**

1. **Verify API Key**
   ```bash
   # Check your .env file
   echo $ZERODB_API_KEY

   # Test connection manually
   curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/status" \
     -H "Authorization: Bearer $ZERODB_API_KEY"
   ```

2. **Check Network/Firewall**
   ```bash
   # Test connectivity
   ping api.ainative.studio

   # Check if port 443 is open
   telnet api.ainative.studio 443
   ```

3. **Verify Base URL**
   ```bash
   # Ensure this is in your .env:
   ZERODB_BASE_URL=https://api.ainative.studio/api/v1

   # Not:
   # ZERODB_BASE_URL=https://api.ainative.studio  (missing /api/v1)
   ```

4. **Check Project ID**
   ```bash
   # List your projects
   curl -X GET "https://api.ainative.studio/api/v1/projects/" \
     -H "Authorization: Bearer $ZERODB_API_KEY"

   # Verify PROJECT_ID matches one of the returned projects
   ```

### Error: "ZeroDB initialization failed"

**Solution:**
```bash
# 1. Check service initialization
node -e "const service = require('./services/zerodbService'); service.initialize().then(() => console.log('OK')).catch(err => console.error(err));"

# 2. Enable debug logging
LOG_LEVEL=debug npm start

# 3. Check for missing dependencies
npm install
```

---

## Authentication Errors

### Error: 401 Unauthorized

**Symptoms:**
- API requests fail with 401 status
- Error message: `Unauthorized` or `Invalid token`

**Solutions:**

1. **Verify Token Format**
   ```bash
   # Token should be a JWT-like string
   # Format: Bearer <long-string-of-characters>

   # Check token length (should be > 100 characters)
   echo $ZERODB_API_KEY | wc -c
   ```

2. **Generate New Token**
   - Visit https://api.ainative.studio/
   - Go to Account Settings
   - Click "Generate New API Token"
   - Update your `.env` file

3. **Check Token Expiration**
   ```bash
   # If using JWT, decode to check expiration
   node -e "const jwt = require('jsonwebtoken'); console.log(jwt.decode('$ZERODB_API_KEY'));"
   ```

4. **Verify Environment Variables Loaded**
   ```javascript
   // Add to your startup code temporarily
   console.log('ZERODB_API_KEY loaded:', !!process.env.ZERODB_API_KEY);
   console.log('ZERODB_PROJECT_ID loaded:', !!process.env.ZERODB_PROJECT_ID);
   ```

### Error: 403 Forbidden

**Symptoms:**
- Request returns 403 status
- Error message: `Insufficient permissions`

**Solutions:**

1. **Verify Project Ownership**
   ```bash
   # Check if your token has access to the project
   curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID" \
     -H "Authorization: Bearer $ZERODB_API_KEY"
   ```

2. **Check API Permissions**
   - Ensure your API token has full database permissions
   - Regenerate token if needed with proper permissions

---

## Data Sync Problems

### Error: "Sync lag increasing"

**Symptoms:**
- Events taking longer to sync
- Metrics show `sync_lag_ms` increasing
- Application logs show "Sync backlog growing"

**Solutions:**

1. **Increase Batch Size**
   ```bash
   # In .env:
   SYNC_BATCH_SIZE=200  # Increase from 100
   SYNC_INTERVAL_MS=2000  # Decrease from 5000
   ```

2. **Check Network Latency**
   ```bash
   # Measure latency to ZeroDB
   curl -w "@curl-format.txt" -o /dev/null -s "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/status" \
     -H "Authorization: Bearer $ZERODB_API_KEY"
   ```

3. **Monitor System Resources**
   ```bash
   # Check CPU and memory
   top

   # Check if Node.js process is throttled
   htop -p $(pgrep -f "node.*app.js")
   ```

4. **Review Sync Metrics**
   ```bash
   # Get sync health status
   curl http://localhost:3001/api/admin/sync/metrics \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Error: "Data inconsistency detected"

**Symptoms:**
- Records in MongoDB don't match ZeroDB
- Missing or duplicate records
- Validation checks fail

**Solutions:**

1. **Run Data Reconciliation**
   ```bash
   # Full reconciliation
   node scripts/migration/reconcileData.js

   # Check specific table
   node scripts/validation/validateTable.js companies
   ```

2. **Check Sync Status**
   ```bash
   # Review sync logs
   tail -f logs/sync.log

   # Check for failed operations
   grep "FAILED" logs/sync.log | tail -20
   ```

3. **Resync Specific Collection**
   ```bash
   # Stop sync
   npm stop

   # Clear sync state
   rm -f ./data/change-stream-tokens.json

   # Restart with fresh sync
   npm start
   ```

4. **Force Full Resync**
   ```bash
   # Backup current state
   mongodump --uri="$MONGODB_URI" --out=./backups/before-resync/

   # Re-run migration
   node scripts/migration/migrateMongoToZeroDB.js --force
   ```

### Error: "Conflict resolution failed"

**Symptoms:**
- Sync logs show `ConflictResolutionError`
- Updates fail to apply
- Data version mismatches

**Solutions:**

1. **Change Conflict Strategy**
   ```bash
   # In .env:
   SYNC_CONFLICT_STRATEGY=last-write-wins  # Default
   # OR
   SYNC_CONFLICT_STRATEGY=mongodb-priority  # MongoDB is source of truth
   # OR
   SYNC_CONFLICT_STRATEGY=zerodb-priority   # ZeroDB is source of truth
   ```

2. **Implement Custom Resolution**
   ```javascript
   // In your application code
   const syncService = require('./services/zerodbSyncService');

   syncService.registerCustomMergeStrategy('Company', async (mongoData, zerodbData) => {
     // Custom merge logic
     return {
       ...mongoData,
       ...zerodbData,
       // Your conflict resolution logic
     };
   });
   ```

---

## Performance Issues

### Issue: "Slow query response times"

**Symptoms:**
- API requests taking > 1 second
- Database queries timing out
- Application feels sluggish

**Solutions:**

1. **Add Indexes**
   ```javascript
   // Ensure frequently queried fields have indexes
   await zerodbService.createTable('companies', {
     ...schema,
     indexes: [
       { fields: ['name'], unique: false },
       { fields: ['type'], unique: false },
       { fields: ['created_at'], unique: false }
     ]
   });
   ```

2. **Use Pagination**
   ```javascript
   // Always paginate large result sets
   const results = await zerodbService.queryTable('companies', {
     filter: { type: 'C-Corp' },
     limit: 50,  // Don't fetch all at once
     offset: 0
   });
   ```

3. **Implement Caching**
   ```javascript
   const NodeCache = require('node-cache');
   const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

   async function getCompany(id) {
     const cached = cache.get(`company_${id}`);
     if (cached) return cached;

     const company = await zerodbService.queryTable('companies', { id });
     cache.set(`company_${id}`, company);
     return company;
   }
   ```

4. **Enable Connection Pooling**
   ```bash
   # In .env:
   ZERODB_MAX_CONNECTIONS=50
   ZERODB_CONNECTION_TIMEOUT=10000
   ```

### Issue: "High memory usage"

**Solutions:**

1. **Stream Large Datasets**
   ```javascript
   // Don't load everything into memory
   async function* streamRecords(tableName) {
     let offset = 0;
     const limit = 100;

     while (true) {
       const batch = await zerodbService.queryTable(tableName, { limit, offset });
       if (batch.length === 0) break;

       for (const record of batch) {
         yield record;
       }

       offset += limit;
     }
   }

   // Usage
   for await (const record of streamRecords('companies')) {
     // Process one at a time
     processRecord(record);
   }
   ```

2. **Limit Result Sizes**
   ```javascript
   // Set maximum limits
   const MAX_RESULTS = 1000;
   const results = await zerodbService.queryTable('companies', {
     limit: Math.min(requestedLimit, MAX_RESULTS)
   });
   ```

---

## Error Codes

### HTTP 400 - Bad Request

**Common Causes:**
- Invalid JSON in request body
- Missing required fields
- Invalid data types

**Solution:**
```javascript
// Validate request before sending
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('C-Corp', 'LLC', 'S-Corp').required(),
  founded_date: Joi.date().optional()
});

const { error, value } = schema.validate(requestData);
if (error) {
  console.error('Validation error:', error.details);
}
```

### HTTP 404 - Not Found

**Common Causes:**
- Wrong project ID
- Table doesn't exist
- Row/record not found

**Solution:**
```bash
# 1. Verify project exists
curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID" \
  -H "Authorization: Bearer $ZERODB_API_KEY"

# 2. List tables in project
curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/tables" \
  -H "Authorization: Bearer $ZERODB_API_KEY"

# 3. Verify row exists
curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/tables/companies/rows" \
  -H "Authorization: Bearer $ZERODB_API_KEY"
```

### HTTP 422 - Unprocessable Entity

**Common Causes:**
- Schema validation failed
- Data type mismatch
- Constraint violation

**Solution:**
```javascript
// Check exact field names and types
const correctFormat = {
  vector_embedding: [0.1, 0.2, 0.3],  // NOT vector_data
  event_payload: {...},                 // NOT event_data
  table_name: "companies",              // NOT tableName
};
```

### HTTP 429 - Rate Limit Exceeded

**Common Causes:**
- Too many requests per second
- Burst of operations
- No rate limiting on client side

**Solution:**
```javascript
// Implement exponential backoff
const retry = require('async-retry');

await retry(async bail => {
  try {
    return await zerodbService.insertRow('companies', data);
  } catch (err) {
    if (err.status === 429) {
      const retryAfter = err.headers['retry-after'] || 1;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      throw err; // Retry
    }
    bail(err); // Don't retry other errors
  }
}, {
  retries: 5,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 30000
});
```

### HTTP 500 - Internal Server Error

**Common Causes:**
- Server-side issue
- Unexpected data format
- Service temporarily down

**Solution:**
```bash
# 1. Check API status
curl https://status.ainative.studio/

# 2. Review request payload
# Make sure it's valid JSON and follows schema

# 3. Try again after a delay
sleep 5 && <retry-command>

# 4. Contact support if persistent
# support@ainative.studio
```

---

## Debugging Tips

### Enable Debug Logging

```bash
# In .env:
LOG_LEVEL=debug
DEBUG=zerodb:*

# Or for specific module:
DEBUG=zerodb:service npm start
```

### Capture Network Traffic

```bash
# Use tcpdump to capture API calls
sudo tcpdump -i any -w zerodb-traffic.pcap host api.ainative.studio

# Analyze with Wireshark or:
tcpdump -r zerodb-traffic.pcap -A
```

### Test API Directly

```bash
# Bypass application and test API directly
curl -X POST "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/tables/test_table/rows" \
  -H "Authorization: Bearer $ZERODB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data": {"test": "value"}}' \
  -v  # Verbose output
```

### Check Service Health

```bash
# Application health endpoint
curl http://localhost:3001/health

# ZeroDB service health
curl http://localhost:3001/api/admin/zerodb/health

# Sync service health
curl http://localhost:3001/api/admin/sync/health
```

### Review Application Logs

```bash
# Real-time logs
tail -f logs/application.log

# Error logs only
grep ERROR logs/application.log

# Specific time range
grep "2026-02-02 10:" logs/application.log

# Sync-specific logs
tail -f logs/sync.log
```

### Use Node.js REPL for Testing

```javascript
// Start Node REPL with your application loaded
$ node
> const zerodbService = require('./services/zerodbService');
> await zerodbService.initialize();
> const result = await zerodbService.queryTable('companies');
> console.log(result);
```

---

## Getting Help

If you're still experiencing issues:

1. **Check Documentation**
   - [ZeroDB API Reference](./zerodb-api-reference.md)
   - [Migration Guide](./zerodb-migration-guide.md)
   - [Performance Tuning](./performance-tuning.md)

2. **Search GitHub Issues**
   - https://github.com/Open-Cap-Stack/opencap/issues

3. **Contact Support**
   - Email: support@ainative.studio
   - Include:
     - Error message
     - Request/response logs
     - Environment details (Node version, OS, etc.)
     - Steps to reproduce

4. **Community**
   - Stack Overflow: tag `zerodb` + `opencap`
   - Discord: [OpenCap Community](https://discord.gg/opencap)

---

## Preventive Measures

### Before Going to Production

- [ ] Run full test suite: `npm test`
- [ ] Load test with realistic data volume
- [ ] Test failure scenarios (network issues, API downtime)
- [ ] Document disaster recovery procedures
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Review security settings
- [ ] Verify rate limits are appropriate

### Ongoing Maintenance

- [ ] Monitor error logs daily
- [ ] Review performance metrics weekly
- [ ] Update dependencies monthly
- [ ] Rotate API tokens quarterly
- [ ] Test backup restoration quarterly
- [ ] Review and update documentation as needed

---

**Last Updated**: 2026-02-02
**Version**: 1.0
