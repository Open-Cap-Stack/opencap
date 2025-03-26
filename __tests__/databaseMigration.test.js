/**
 * Test file for Database Migration System
 * 
 * [Chore] OCDI-107: Implement database migration system
 * 
 * Tests for MongoDB migration functionality to ensure schema changes
 * can be tracked and applied properly across environments.
 */

const mongoose = require('mongoose');
const { 
  initMigration, 
  registerMigration,
  getMigrationStatus,
  applyMigrations,
  rollbackMigration
} = require('../scripts/databaseMigration');

// Mock the MigrationModel that we expect our implementation to create
jest.mock('../models/Migration', () => {
  const mockFind = jest.fn();
  mockFind.sort = jest.fn().mockReturnThis();
  
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(() => mockFind),
    findOneAndUpdate: jest.fn(),
    // Add static methods used in our implementation
    getPending: jest.fn(),
    getApplied: jest.fn(),
    markApplied: jest.fn(),
    markRolledBack: jest.fn()
  };
});

describe('Database Migration System', () => {
  let Migration;
  
  beforeEach(() => {
    jest.clearAllMocks();
    Migration = require('../models/Migration');
    
    // Setup default mock implementations
    Migration.find.mockImplementation(() => {
      const mockSort = jest.fn().mockResolvedValue([]);
      return { sort: mockSort };
    });
    Migration.findOne.mockResolvedValue(null);
    Migration.create.mockImplementation(data => Promise.resolve({...data, _id: 'mock-id'}));
    Migration.findOneAndUpdate.mockImplementation((query, update) => 
      Promise.resolve({...query, ...update}));
    Migration.getPending.mockResolvedValue([]);
    Migration.getApplied.mockResolvedValue([]);
    Migration.markApplied.mockResolvedValue(true);
    Migration.markRolledBack.mockResolvedValue(true);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Migration System Initialization', () => {
    it('should initialize the migration system', async () => {
      // Test
      await initMigration();
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalled();
      expect(Migration.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'migration-system-init',
        appliedAt: expect.any(Date)
      }));
    });
    
    it('should not re-initialize if already initialized', async () => {
      // Setup
      Migration.findOne.mockResolvedValue({
        name: 'migration-system-init',
        appliedAt: new Date()
      });
      
      // Test
      await initMigration();
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalled();
      expect(Migration.create).not.toHaveBeenCalled();
    });
  });
  
  describe('Migration Registration', () => {
    it('should register a new migration', async () => {
      // Test
      const migrationName = 'add-email-verification-field';
      const migrationFn = jest.fn();
      const rollbackFn = jest.fn();
      
      await registerMigration(migrationName, migrationFn, rollbackFn);
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalledWith({ name: migrationName });
      expect(Migration.create).toHaveBeenCalledWith(expect.objectContaining({
        name: migrationName,
        registered: expect.any(Date),
        applied: false
      }));
    });
    
    it('should not re-register an existing migration', async () => {
      // Setup
      const migrationName = 'existing-migration';
      Migration.findOne.mockResolvedValue({
        name: migrationName,
        registered: new Date(),
        applied: false
      });
      
      const migrationFn = jest.fn();
      const rollbackFn = jest.fn();
      
      // Test
      await registerMigration(migrationName, migrationFn, rollbackFn);
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalledWith({ name: migrationName });
      expect(Migration.create).not.toHaveBeenCalled();
    });
  });
  
  describe('Migration Status', () => {
    it('should return the status of all migrations', async () => {
      // Setup
      const mockMigrations = [
        { name: 'migration-1', applied: true, appliedAt: new Date() },
        { name: 'migration-2', applied: false, registered: new Date() }
      ];
      Migration.find.mockImplementation(() => {
        const mockSort = jest.fn().mockResolvedValue(mockMigrations);
        return { sort: mockSort };
      });
      
      // Test
      const status = await getMigrationStatus();
      
      // Verify
      expect(status).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'migration-1', applied: true }),
        expect.objectContaining({ name: 'migration-2', applied: false })
      ]));
    });
  });
  
  describe('Apply Migrations', () => {
    it('should apply all pending migrations in order', async () => {
      // Setup
      const mockMigrations = [
        { 
          name: 'migration-1', 
          applied: false, 
          registered: new Date('2023-01-01')
        },
        { 
          name: 'migration-2', 
          applied: false, 
          registered: new Date('2023-01-02')
        }
      ];
      Migration.getPending.mockResolvedValue(mockMigrations);
      
      // Mock the global migration registry we expect our implementation to maintain
      global.migrationRegistry = {
        'migration-1': {
          up: jest.fn().mockResolvedValue(true),
          down: jest.fn()
        },
        'migration-2': {
          up: jest.fn().mockResolvedValue(true),
          down: jest.fn()
        }
      };
      
      // Test
      await applyMigrations();
      
      // Verify
      expect(global.migrationRegistry['migration-1'].up).toHaveBeenCalled();
      expect(global.migrationRegistry['migration-2'].up).toHaveBeenCalled();
      
      // Since we're using markApplied in the implementation when available,
      // we should check that it was called instead of findOneAndUpdate
      expect(Migration.markApplied).toHaveBeenCalledWith('migration-1');
      expect(Migration.markApplied).toHaveBeenCalledWith('migration-2');
      
      // Cleanup
      delete global.migrationRegistry;
    });
    
    it('should stop on migration failure', async () => {
      // Setup
      const mockMigrations = [
        { 
          name: 'migration-1', 
          applied: false, 
          registered: new Date('2023-01-01')
        },
        { 
          name: 'migration-2', 
          applied: false, 
          registered: new Date('2023-01-02')
        }
      ];
      Migration.getPending.mockResolvedValue(mockMigrations);
      
      // Reset the markApplied mock to ensure it's not called
      Migration.markApplied.mockReset();
      
      // Mock the global migration registry with a failing migration
      global.migrationRegistry = {
        'migration-1': {
          up: jest.fn().mockRejectedValue(new Error('Migration failed')),
          down: jest.fn()
        },
        'migration-2': {
          up: jest.fn().mockResolvedValue(true),
          down: jest.fn()
        }
      };
      
      // Test
      await expect(applyMigrations()).rejects.toThrow('Migration failed');
      
      // Verify
      expect(global.migrationRegistry['migration-1'].up).toHaveBeenCalled();
      expect(global.migrationRegistry['migration-2'].up).not.toHaveBeenCalled();
      
      // Since the migration failed, markApplied should not be called for any migration
      expect(Migration.markApplied).not.toHaveBeenCalled();
      
      // Cleanup
      delete global.migrationRegistry;
    });
  });
  
  describe('Rollback Migration', () => {
    it('should rollback a specific migration', async () => {
      // Setup
      const migrationName = 'migration-to-rollback';
      Migration.findOne.mockResolvedValue({
        name: migrationName,
        applied: true,
        appliedAt: new Date()
      });
      
      // Mock the global migration registry
      global.migrationRegistry = {
        [migrationName]: {
          up: jest.fn(),
          down: jest.fn().mockResolvedValue(true)
        }
      };
      
      // Test
      await rollbackMigration(migrationName);
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalledWith({ name: migrationName });
      expect(global.migrationRegistry[migrationName].down).toHaveBeenCalled();
      
      // Since we're using markRolledBack in the implementation when available,
      // we should check that it was called 
      expect(Migration.markRolledBack).toHaveBeenCalledWith(migrationName);
      
      // Cleanup
      delete global.migrationRegistry;
    });
    
    it('should not rollback an unapplied migration', async () => {
      // Setup
      const migrationName = 'unapplied-migration';
      Migration.findOne.mockResolvedValue({
        name: migrationName,
        applied: false,
        registered: new Date()
      });
      
      // Mock the global migration registry
      global.migrationRegistry = {
        [migrationName]: {
          up: jest.fn(),
          down: jest.fn()
        }
      };
      
      // Test
      await rollbackMigration(migrationName);
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalledWith({ name: migrationName });
      expect(global.migrationRegistry[migrationName].down).not.toHaveBeenCalled();
      expect(Migration.findOneAndUpdate).not.toHaveBeenCalled();
      
      // Cleanup
      delete global.migrationRegistry;
    });
    
    it('should handle non-existent migration', async () => {
      // Setup
      const migrationName = 'non-existent-migration';
      Migration.findOne.mockResolvedValue(null);
      
      // Test
      await expect(rollbackMigration(migrationName))
        .rejects.toThrow(`Migration '${migrationName}' not found`);
      
      // Verify
      expect(Migration.findOne).toHaveBeenCalledWith({ name: migrationName });
    });
  });
});
