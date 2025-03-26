/**
 * Database Migration System
 * 
 * [Chore] OCDI-107: Implement database migration system
 * 
 * This script provides functionality to manage database migrations for schema evolution.
 * It allows tracking, applying, and rolling back migrations in a controlled manner.
 * 
 * Usage:
 * - CLI: `node scripts/databaseMigration.js apply` - Apply all pending migrations
 * - CLI: `node scripts/databaseMigration.js status` - Check migration status
 * - CLI: `node scripts/databaseMigration.js rollback [name]` - Rollback specific migration
 * - Programmatic: `const { applyMigrations } = require('./scripts/databaseMigration'); await applyMigrations();`
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Lazy-load the Migration model to avoid circular dependencies
let Migration;
const getMigrationModel = () => {
  if (!Migration) {
    try {
      Migration = require('../models/Migration');
    } catch (error) {
      console.error('Error loading Migration model:', error);
      throw new Error('Failed to load Migration model');
    }
  }
  return Migration;
};

// In-memory registry of migration functions
global.migrationRegistry = global.migrationRegistry || {};

/**
 * Initialize the migration system
 * @returns {Promise<Object>} The initialization record
 */
async function initMigration() {
  const Migration = getMigrationModel();
  
  // Check if migration system is already initialized
  const initialized = await Migration.findOne({ name: 'migration-system-init' });
  if (initialized) {
    console.log('✅ Migration system already initialized');
    return initialized;
  }
  
  // Create initialization record
  const initRecord = await Migration.create({
    name: 'migration-system-init',
    description: 'Database migration system initialization',
    applied: true,
    appliedAt: new Date()
  });
  
  console.log('✅ Migration system initialized');
  return initRecord;
}

/**
 * Register a migration in the system
 * @param {string} name - Unique name for the migration
 * @param {Function} upFn - Function to apply the migration
 * @param {Function} downFn - Function to rollback the migration
 * @param {string} description - Optional description of the migration
 * @returns {Promise<Object>} The registered migration record
 */
async function registerMigration(name, upFn, downFn, description = '') {
  const Migration = getMigrationModel();
  
  // Check if migration already exists
  const existing = await Migration.findOne({ name });
  if (existing) {
    console.log(`Migration '${name}' already registered`);
    
    // Update the in-memory registry regardless
    global.migrationRegistry[name] = {
      up: upFn,
      down: downFn
    };
    
    return existing;
  }
  
  // Register in database
  const migration = await Migration.create({
    name,
    description,
    applied: false,
    registered: new Date()
  });
  
  // Register in memory
  global.migrationRegistry[name] = {
    up: upFn,
    down: downFn
  };
  
  console.log(`✅ Migration '${name}' registered`);
  return migration;
}

/**
 * Get the status of all migrations
 * @returns {Promise<Array>} Status of all migrations
 */
async function getMigrationStatus() {
  const Migration = getMigrationModel();
  const mockFind = Migration.find();
  const migrations = await (mockFind.sort ? mockFind.sort({ registered: 1 }) : mockFind);
  
  // Format for output
  return migrations.map(m => ({
    name: m.name,
    applied: m.applied,
    appliedAt: m.appliedAt,
    registered: m.registered,
    description: m.description || 'No description provided'
  }));
}

/**
 * Apply all pending migrations
 * @returns {Promise<Array>} Applied migrations
 */
async function applyMigrations() {
  const Migration = getMigrationModel();
  
  // Get all unapplied migrations ordered by registration date
  let pendingMigrations;
  if (typeof Migration.getPending === 'function') {
    pendingMigrations = await Migration.getPending();
  } else {
    pendingMigrations = await Migration.find({ applied: false }).sort({ registered: 1 });
  }
  
  if (pendingMigrations.length === 0) {
    console.log('No pending migrations to apply');
    return [];
  }
  
  console.log(`Found ${pendingMigrations.length} pending migrations`);
  
  const appliedMigrations = [];
  
  // Apply each migration in order
  for (const migration of pendingMigrations) {
    const { name } = migration;
    
    // Skip if the migration function is not registered
    if (!global.migrationRegistry[name]) {
      console.warn(`⚠️ Migration '${name}' is registered in the database but has no implementation`);
      continue;
    }
    
    try {
      console.log(`Applying migration: ${name}`);
      
      // Execute the migration
      await global.migrationRegistry[name].up();
      
      // Update the database
      if (typeof Migration.markApplied === 'function') {
        await Migration.markApplied(name);
      } else {
        await Migration.findOneAndUpdate(
          { name },
          { $set: { applied: true, appliedAt: new Date() } }
        );
      }
      
      console.log(`✅ Migration '${name}' applied successfully`);
      appliedMigrations.push(name);
    } catch (error) {
      // Update the error information in the database
      await Migration.findOneAndUpdate(
        { name },
        {
          $set: {
            'error.message': error.message,
            'error.stack': error.stack,
            'error.occurredAt': new Date()
          }
        }
      );
      
      console.error(`❌ Migration '${name}' failed:`, error);
      throw error;
    }
  }
  
  return appliedMigrations;
}

/**
 * Rollback a specific migration
 * @param {string} name - Name of the migration to rollback
 * @returns {Promise<Object>} The rolled back migration
 */
async function rollbackMigration(name) {
  const Migration = getMigrationModel();
  
  // Find the migration
  const migration = await Migration.findOne({ name });
  if (!migration) {
    throw new Error(`Migration '${name}' not found`);
  }
  
  // Check if it's applied
  if (!migration.applied) {
    console.log(`Migration '${name}' is not applied, no need to rollback`);
    return migration;
  }
  
  // Check if the rollback function exists
  if (!global.migrationRegistry[name] || !global.migrationRegistry[name].down) {
    throw new Error(`Rollback function for migration '${name}' not found`);
  }
  
  try {
    console.log(`Rolling back migration: ${name}`);
    
    // Execute the rollback
    await global.migrationRegistry[name].down();
    
    // Update the database
    let updated;
    if (typeof Migration.markRolledBack === 'function') {
      updated = await Migration.markRolledBack(name);
    } else {
      updated = await Migration.findOneAndUpdate(
        { name },
        { $set: { applied: false, appliedAt: null } },
        { new: true }
      );
    }
    
    console.log(`✅ Migration '${name}' rolled back successfully`);
    return updated;
  } catch (error) {
    // Update the error information
    await Migration.findOneAndUpdate(
      { name },
      {
        $set: {
          'error.message': error.message,
          'error.stack': error.stack,
          'error.occurredAt': new Date()
        }
      }
    );
    
    console.error(`❌ Rollback of migration '${name}' failed:`, error);
    throw error;
  }
}

/**
 * Load migrations from a directory
 * @param {string} directory - Path to migrations directory
 * @returns {Promise<Array>} Loaded migrations
 */
async function loadMigrationsFromDirectory(directory = '../migrations') {
  const migrationsPath = path.resolve(__dirname, directory);
  
  try {
    // Check if directory exists
    await fs.access(migrationsPath);
  } catch (error) {
    console.log(`Creating migrations directory: ${migrationsPath}`);
    await fs.mkdir(migrationsPath, { recursive: true });
    return [];
  }
  
  // Read migration files
  const files = await fs.readdir(migrationsPath);
  const migrationFiles = files.filter(file => file.endsWith('.js'));
  
  const registeredMigrations = [];
  
  // Load each migration
  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsPath, file);
    try {
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(migrationPath)];
      
      const migration = require(migrationPath);
      
      // Validate migration format
      if (!migration.name || !migration.up || !migration.down) {
        console.warn(`⚠️ Migration file ${file} has invalid format. Skipping.`);
        continue;
      }
      
      // Register the migration
      await registerMigration(
        migration.name,
        migration.up,
        migration.down,
        migration.description || ''
      );
      
      registeredMigrations.push(migration.name);
    } catch (error) {
      console.error(`❌ Error loading migration from ${file}:`, error);
    }
  }
  
  return registeredMigrations;
}

/**
 * Create a new migration file
 * @param {string} name - Name for the migration
 * @param {string} directory - Path to migrations directory
 * @returns {Promise<string>} Path to the created migration file
 */
async function createMigrationFile(name, directory = '../migrations') {
  const migrationsPath = path.resolve(__dirname, directory);
  
  // Create migrations directory if it doesn't exist
  await fs.mkdir(migrationsPath, { recursive: true });
  
  // Normalize the name (remove spaces, special chars)
  const normalizedName = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Generate timestamp for ordering
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const fileName = `${timestamp}-${normalizedName}.js`;
  const filePath = path.join(migrationsPath, fileName);
  
  // Migration file template
  const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  name: '${normalizedName}',
  description: '${name}',
  
  /**
   * Apply the migration
   * @returns {Promise<void>}
   */
  up: async function() {
    // TODO: Implement migration logic here
    // Example:
    // const User = require('../models/User');
    // await User.updateMany({}, { $set: { isVerified: false } });
  },
  
  /**
   * Rollback the migration
   * @returns {Promise<void>}
   */
  down: async function() {
    // TODO: Implement rollback logic here
    // Example:
    // const User = require('../models/User');
    // await User.updateMany({}, { $unset: { isVerified: 1 } });
  }
};
`;

  // Write the file
  await fs.writeFile(filePath, template);
  console.log(`✅ Created migration file: ${filePath}`);
  
  return filePath;
}

/**
 * CLI command handler
 */
async function handleCommand() {
  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  // Get command line arguments
  const [,, command, ...args] = process.argv;
  
  try {
    // Initialize the migration system
    await initMigration();
    
    // Load existing migrations
    await loadMigrationsFromDirectory();
    
    // Handle commands
    switch (command) {
      case 'create':
        if (!args[0]) {
          console.error('Missing migration name. Usage: node databaseMigration.js create <name>');
          process.exit(1);
        }
        await createMigrationFile(args[0]);
        break;
        
      case 'status':
        const status = await getMigrationStatus();
        console.log('\nMigration Status:');
        console.log('=================');
        
        status.forEach(migration => {
          const statusSymbol = migration.applied ? '✅' : '⏳';
          const appliedAt = migration.appliedAt 
            ? new Date(migration.appliedAt).toLocaleString() 
            : 'Not applied';
          
          console.log(`${statusSymbol} ${migration.name}`);
          console.log(`   Description: ${migration.description}`);
          console.log(`   Applied: ${appliedAt}`);
          console.log('---');
        });
        break;
        
      case 'apply':
        await applyMigrations();
        break;
        
      case 'rollback':
        if (!args[0]) {
          console.error('Missing migration name. Usage: node databaseMigration.js rollback <name>');
          process.exit(1);
        }
        await rollbackMigration(args[0]);
        break;
        
      default:
        console.log(`
Database Migration System

Usage:
  node databaseMigration.js create <name>      Create a new migration
  node databaseMigration.js status             Check migration status
  node databaseMigration.js apply              Apply all pending migrations
  node databaseMigration.js rollback <name>    Rollback a specific migration
        `);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Direct script execution
if (require.main === module) {
  handleCommand().catch(console.error);
}

module.exports = {
  initMigration,
  registerMigration,
  getMigrationStatus,
  applyMigrations,
  rollbackMigration,
  loadMigrationsFromDirectory,
  createMigrationFile
};
