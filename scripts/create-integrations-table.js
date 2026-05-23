/**
 * One-time script: Create the integrations table in ZeroDB with the schema
 * required by clerkIntegrationController.js (and future integrations).
 *
 * Run: node scripts/create-integrations-table.js
 */
require('dotenv').config();
const zerodbService = require('../services/zerodbService');

const schema = {
  fields: [
    { name: 'integrationId', type: 'TEXT', notNull: true, unique: true },
    { name: 'provider',       type: 'TEXT', notNull: true },
    { name: 'companyId',      type: 'TEXT' },
    { name: 'userId',         type: 'TEXT' },
    { name: 'encryptedKey',   type: 'TEXT' },
    { name: 'iv',             type: 'TEXT' },
    { name: 'authTag',        type: 'TEXT' },
    { name: 'keyHint',        type: 'TEXT' },
    { name: 'userCount',      type: 'INTEGER', default: 0 },
    { name: 'validatedAt',    type: 'TIMESTAMP' },
    { name: 'lastImportAt',   type: 'TIMESTAMP' },
    { name: 'lastImportCount', type: 'INTEGER' },
    { name: 'createdAt',      type: 'TIMESTAMP' },
    { name: 'updatedAt',      type: 'TIMESTAMP' },
  ],
};

async function main() {
  try {
    // Initialize ZeroDB to resolve the project ID
    const token = process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY;
    if (!token) {
      console.error('AINATIVE_API_TOKEN or ZERODB_API_KEY must be set');
      process.exit(1);
    }
    console.log('Initializing ZeroDB...');
    await zerodbService.initialize(token);
    console.log('Project ID:', zerodbService.projectId);

    console.log('Creating integrations table...');
    const result = await zerodbService.createTable('integrations', schema);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (err) {
    if (err.response?.status === 409 || err.message?.includes('already exists')) {
      console.log('Table already exists — nothing to do.');
    } else {
      console.error('Failed:', err.response?.data || err.message);
      process.exit(1);
    }
  }
}

main();
