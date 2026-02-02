# MongoDB Dependency Explanation

**Issue #32: Remove MongoDB dependencies from codebase**

## Summary

MongoDB and Mongoose dependencies have been retained in `package.json` but their usage is **completely optional**. They are only required if you enable the continuous sync feature (GitHub Issue #14).

## Key Points

### ZeroDB is the Primary Database
- **ZeroDB** is the primary and recommended database for OpenCap Stack
- All application data is stored in ZeroDB
- The application can run entirely without MongoDB

### MongoDB is Optional
MongoDB is **only** needed if you:
1. Have an existing MongoDB database
2. Want to enable real-time synchronization from MongoDB to ZeroDB
3. Set `SYNC_ENABLED=true` in your environment variables

### Why MongoDB Dependencies Are Kept

The `mongodb` and `mongoose` npm packages remain in `package.json` for the following reasons:

1. **Continuous Sync Feature (Issue #14)**
   - Enables real-time data synchronization from MongoDB to ZeroDB
   - Uses MongoDB Change Streams for event-driven sync
   - Required for migration scenarios

2. **Migration Support**
   - Helps users transition from MongoDB to ZeroDB
   - Maintains backward compatibility
   - Allows gradual migration strategies

3. **Database Adapter**
   - Supports multiple database modes (zerodb-only, mongodb-only, parallel)
   - Provides flexibility for different deployment scenarios

## Dependencies Breakdown

### Required Dependencies
```json
{
  "mongodb": "4.17.0",     // Only for sync feature
  "mongoose": "6.13.8"      // Only for sync feature
}
```

### When MongoDB is NOT Used
When you run with `SYNC_ENABLED=false` (or omit it):
- MongoDB connection is never established
- Mongoose models are not initialized
- No MongoDB queries are executed
- Application runs entirely on ZeroDB

### When MongoDB IS Used
When you run with `SYNC_ENABLED=true`:
- MongoDB connection is established
- Change stream listener monitors MongoDB collections
- Real-time sync to ZeroDB occurs
- Both databases can coexist

## Files That Use MongoDB

MongoDB/Mongoose are ONLY used in these files:

1. **Sync-Related Services** (optional functionality)
   - `services/mongoChangeStreamListener.js` - Change stream monitoring
   - `services/syncOrchestrator.js` - Sync coordination
   - `services/databaseAdapter.js` - Database abstraction
   - `db/mongoConnection.js` - Connection management

2. **Mongoose Models** (for sync schema compatibility)
   - `models/*.js` - Define MongoDB schema for sync feature
   - These models are only active when sync is enabled

3. **Monitoring** (optional)
   - `middleware/databaseMonitor.js` - Optional DB monitoring

## Running Without MongoDB

### Configuration
```bash
# .env file
ENABLE_ZERODB=true
AINATIVE_API_TOKEN=your_token_here
# SYNC_ENABLED=false  # Or omit this line entirely
# MONGODB_URI can be omitted
```

### What Happens
1. Application starts normally
2. MongoDB connection is skipped
3. Log message: "Running in ZeroDB-only mode"
4. All operations use ZeroDB
5. Sync features are disabled

## Running With MongoDB (Continuous Sync)

### Configuration
```bash
# .env file
ENABLE_ZERODB=true
AINATIVE_API_TOKEN=your_token_here
SYNC_ENABLED=true
MONGODB_URI=mongodb://localhost:27017/opencap
```

### What Happens
1. Application starts normally
2. MongoDB connection is established
3. Log message: "Continuous sync enabled - connecting to MongoDB..."
4. Change stream listener starts
5. Real-time sync from MongoDB to ZeroDB is active
6. Both databases are operational

## Future Considerations

### Potential for Removal
MongoDB dependencies could be moved to `optionalDependencies` or `peerDependencies` in a future release if:
1. Most users don't need the sync feature
2. Package size becomes a concern
3. Security updates become burdensome

### Current Decision
We keep them as regular dependencies because:
1. Small package size impact
2. Simplifies installation for users who need sync
3. Maintains clear documentation of all features
4. Easier to maintain and test

## Testing

Tests have been created to verify:
- Application can start without MongoDB
- MongoDB connection is conditional on `SYNC_ENABLED`
- Documentation is clear about optional nature
- No direct MongoDB usage outside sync components

See: `tests/unit/mongodb-removal.test.js`

## Documentation References

- Main documentation: `README.md`
- Sync feature docs: `docs/mongodb-zerodb-sync.md`
- Environment config: `.env.example`
- Migration guide: `docs/ZERODB_MIGRATION_PLAN.md`

## Conclusion

MongoDB is a **supported but optional** dependency that enables advanced sync features for users migrating from MongoDB to ZeroDB. The default and recommended configuration is to use ZeroDB exclusively without MongoDB.
