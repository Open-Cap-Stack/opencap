/**
 * Ensure all required ZeroDB tables exist.
 * Safe to re-run — skips tables that already exist.
 *
 * Run: node scripts/ensure-zerodb-tables.js
 * Or via Railway: railway run node scripts/ensure-zerodb-tables.js
 */
require('dotenv').config();
const zerodbService = require('../services/zerodbService');

const TABLES = {
  api_keys: {
    fields: [
      { name: 'keyId',       type: 'TEXT', notNull: true, unique: true },
      { name: 'userId',      type: 'TEXT', notNull: true },
      { name: 'companyId',   type: 'TEXT' },
      { name: 'name',        type: 'TEXT' },
      { name: 'keyHash',     type: 'TEXT', notNull: true },
      { name: 'lastUsedAt',  type: 'TIMESTAMP' },
      { name: 'createdAt',   type: 'TIMESTAMP' },
      { name: 'updatedAt',   type: 'TIMESTAMP' },
    ],
  },
  integrations: {
    fields: [
      { name: 'integrationId',   type: 'TEXT', notNull: true, unique: true },
      { name: 'provider',        type: 'TEXT', notNull: true },
      { name: 'companyId',       type: 'TEXT' },
      { name: 'userId',          type: 'TEXT' },
      { name: 'encryptedKey',    type: 'TEXT' },
      { name: 'iv',              type: 'TEXT' },
      { name: 'authTag',         type: 'TEXT' },
      { name: 'keyHint',         type: 'TEXT' },
      { name: 'userCount',       type: 'INTEGER' },
      { name: 'validatedAt',     type: 'TIMESTAMP' },
      { name: 'lastImportAt',    type: 'TIMESTAMP' },
      { name: 'lastImportCount', type: 'INTEGER' },
      { name: 'createdAt',       type: 'TIMESTAMP' },
      { name: 'updatedAt',       type: 'TIMESTAMP' },
    ],
  },
};

async function main() {
  const token = process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY;
  if (!token) {
    console.error('AINATIVE_API_TOKEN or ZERODB_API_KEY must be set');
    process.exit(1);
  }

  console.log('Initializing ZeroDB...');
  await zerodbService.initialize(token);
  console.log('Project ID:', zerodbService.projectId);

  for (const [tableName, schema] of Object.entries(TABLES)) {
    try {
      console.log(`Creating table: ${tableName}...`);
      const result = await zerodbService.createTable(tableName, schema);
      console.log(`  ✓ ${tableName} created (id: ${result.table_id})`);
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.detail?.includes('already exists') || err.message?.includes('already exists')) {
        console.log(`  ✓ ${tableName} already exists — skipped`);
      } else {
        console.error(`  ✗ ${tableName} failed:`, err.response?.data || err.message);
      }
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
