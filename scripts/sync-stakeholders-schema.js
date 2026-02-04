#!/usr/bin/env node
/**
 * Sync Stakeholders Table Schema
 *
 * Recreates the stakeholders table with the full schema.
 * WARNING: This will delete existing data in the stakeholders table.
 */

require('dotenv').config();
const zerodbService = require('../services/zerodbService');

const stakeholderSchema = {
  stakeholderId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  email: { type: 'string', required: true },
  phone: { type: 'string' },
  role: { type: 'string', required: true },
  equity: { type: 'string' },
  shares: { type: 'string' },
  type: { type: 'string' },
  status: { type: 'string' },
  location: { type: 'string' },
  department: { type: 'string' },
  vestingSchedule: { type: 'string' },
  joinDate: { type: 'string' },
  lastActivity: { type: 'string' },
  companyId: { type: 'string' },
  projectId: { type: 'string' },
  userId: { type: 'string' },
  documents: { type: 'number' },
  createdAt: { type: 'string' },
  updatedAt: { type: 'string' }
};

async function syncStakeholdersSchema() {
  const dryRun = process.argv.includes('--dry-run');
  const projectIdArg = process.argv.find(arg => arg.startsWith('--project-id='));
  const projectId = projectIdArg ? projectIdArg.split('=')[1] : process.env.ZERODB_PROJECT_ID || 'ce58ea61-77d8-43d6-bab0-bec046152305';

  console.log('🔄 Syncing stakeholders table schema...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY'}`);
  console.log(`   Project ID: ${projectId}`);

  try {
    // Initialize ZeroDB with existing project ID
    const token = process.env.AINATIVE_API_TOKEN;
    if (!token) {
      console.error('❌ AINATIVE_API_TOKEN not set');
      process.exit(1);
    }

    // Set token and project ID directly without creating new project
    zerodbService.token = token;
    zerodbService.projectId = projectId;
    console.log(`✅ ZeroDB configured (project: ${zerodbService.projectId})`);

    // List existing tables
    let tables = [];
    let stakeholdersExists = false;
    try {
      const tablesResult = await zerodbService.listTables();
      tables = Array.isArray(tablesResult) ? tablesResult : (tablesResult?.tables || []);
      stakeholdersExists = tables.some(t => (t.name || t) === 'stakeholders');
      console.log(`   Existing tables: ${tables.map(t => t.name || t).join(', ') || 'none'}`);
    } catch (error) {
      console.log(`   Could not list tables: ${error.message}`);
    }
    console.log(`   Stakeholders table exists: ${stakeholdersExists}`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would perform the following:');
      if (stakeholdersExists) {
        console.log('   1. Delete existing stakeholders table');
      }
      console.log('   2. Create stakeholders table with schema:');
      console.log(JSON.stringify(stakeholderSchema, null, 4));
      console.log('\n✅ Dry run complete. Run without --dry-run to apply changes.');
      return;
    }

    // Delete existing table if it exists
    if (stakeholdersExists) {
      console.log('🗑️  Deleting existing stakeholders table...');
      try {
        await zerodbService.deleteTable('stakeholders');
        console.log('✅ Existing table deleted');
      } catch (error) {
        console.warn('⚠️  Could not delete table (may not exist):', error.message);
      }
    }

    // Create table with full schema
    console.log('📦 Creating stakeholders table with full schema...');
    await zerodbService.createTable('stakeholders', stakeholderSchema);
    console.log('✅ Stakeholders table created successfully');

    // Verify
    try {
      const newTablesResult = await zerodbService.listTables();
      const newTables = Array.isArray(newTablesResult) ? newTablesResult : (newTablesResult?.tables || []);
      console.log(`   Tables after sync: ${newTables.map(t => t.name || t).join(', ') || 'could not verify'}`);
    } catch (error) {
      console.log(`   Could not verify tables: ${error.message}`);
    }

    console.log('\n✅ Schema sync complete!');

  } catch (error) {
    console.error('❌ Error syncing schema:', error.message);
    if (error.response?.data) {
      console.error('   API response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

syncStakeholdersSchema();
