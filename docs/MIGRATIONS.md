# OpenCap Database Migration System

This document explains how to use the database migration system implemented in [Chore] OCDI-107.

## Overview

The migration system allows for tracking and applying database schema changes across environments in a controlled, versioned manner. It provides functionality to:

- Create new migrations
- Check migration status
- Apply pending migrations
- Rollback specific migrations

## Usage

### CLI Commands

The migration system can be used via command line:

```bash
# Create a new migration
node scripts/databaseMigration.js create "add new field to users"

# Check status of all migrations
node scripts/databaseMigration.js status

# Apply all pending migrations
node scripts/databaseMigration.js apply

# Rollback a specific migration
node scripts/databaseMigration.js rollback "migration-name"
```

### Programmatic Usage

You can also use the migration system programmatically in your code:

```javascript
const { 
  applyMigrations, 
  getMigrationStatus, 
  rollbackMigration 
} = require('./scripts/databaseMigration');

// Apply all pending migrations
await applyMigrations();

// Get migration status
const status = await getMigrationStatus();
console.log(status);

// Rollback a specific migration
await rollbackMigration('migration-name');
```

## Migration File Structure

Migrations are stored in the `/migrations` directory. Each migration is a JavaScript file with the following structure:

```javascript
module.exports = {
  name: 'migration-name',
  description: 'Description of what this migration does',
  
  up: async function() {
    // Code to apply the migration
    // Example:
    // const User = require('../models/User');
    // await User.updateMany({}, { $set: { isVerified: false } });
  },
  
  down: async function() {
    // Code to rollback the migration
    // Example:
    // const User = require('../models/User');
    // await User.updateMany({}, { $unset: { isVerified: 1 } });
  }
};
```

## Best Practices

1. **Make migrations atomic**: Each migration should do one thing well.
2. **Always implement `down` method**: For every change in the `up` method, implement a corresponding rollback.
3. **Test thoroughly**: Test both `up` and `down` methods.
4. **Use with caution in production**: Always backup data before running migrations.
5. **Document changes**: Include clear descriptions of the changes being made.

## How It Works

The migration system uses a `Migration` model in MongoDB to track the state of migrations. Each migration has a unique name and status (applied/not applied).

When migrations are applied, they're executed in order of their registration date. If a migration fails, the system stops and reports the error, preventing partial migrations.
