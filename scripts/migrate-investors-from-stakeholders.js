/**
 * Migration script: move VC investor records from `stakeholders` table to `investors` table.
 *
 * Identifies rows where email ends with @vc-import.local, writes them to the
 * `investors` table (system-wide, no companyId), then deletes them from `stakeholders`.
 *
 * Usage:
 *   railway run node scripts/migrate-investors-from-stakeholders.js
 */

'use strict';

require('dotenv').config();

const axios = require('axios');

const BASE_URL = (process.env.ZERODB_BASE_URL || 'https://api.ainative.studio/api/v1').replace(/\/$/, '');
const TOKEN = process.env.AINATIVE_API_TOKEN;
const PROJECT_ID = process.env.ZERODB_PROJECT_ID || 'ce58ea61-77d8-43d6-bab0-bec046152305';

if (!TOKEN) {
  console.error('ERROR: AINATIVE_API_TOKEN is not set');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
});

async function queryStakeholders(skip, limit) {
  const response = await client.post(
    `/api/v1/projects/${PROJECT_ID}/database/tables/stakeholders/query`,
    { filter: {}, limit, skip }
  );
  const data = response.data;
  return Array.isArray(data) ? data : (data.data || []);
}

async function insertInvestorRow(rowData) {
  const response = await client.post(
    `/api/v1/projects/${PROJECT_ID}/database/tables/investors/rows`,
    { row_data: rowData }
  );
  return response.data;
}

async function deleteStakeholderRow(rowId) {
  await client.delete(
    `/api/v1/projects/${PROJECT_ID}/database/tables/stakeholders/rows/${rowId}`
  );
}

function isVcImportRow(rowData) {
  const email = (rowData.email || '').toLowerCase();
  return email.endsWith('@vc-import.local');
}

async function run() {
  console.log('Starting migration: VC investor stakeholders → investors table');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log('');

  let skip = 0;
  const batchSize = 200;
  let totalMigrated = 0;
  let totalDeleted = 0;
  let totalSkipped = 0;
  let hasMore = true;

  while (hasMore) {
    let rows;
    try {
      rows = await queryStakeholders(skip, batchSize);
    } catch (err) {
      console.error(`Failed to query stakeholders at skip=${skip}:`, err.message);
      break;
    }

    if (!rows || rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      const rowId = row.row_id;
      const rowData = row.row_data || row;

      if (!isVcImportRow(rowData)) {
        totalSkipped++;
        continue;
      }

      // Build investor record: keep all fields, set source, remove companyId
      const investorData = { ...rowData };
      delete investorData.companyId;
      investorData.source = 'vc-import';

      try {
        await insertInvestorRow(investorData);
        totalMigrated++;
      } catch (err) {
        console.error(`  Failed to insert investor (rowId=${rowId}, email=${rowData.email}):`, err.message);
        // Skip deletion if insert failed to avoid data loss
        continue;
      }

      try {
        await deleteStakeholderRow(rowId);
        totalDeleted++;
      } catch (err) {
        console.error(`  Failed to delete stakeholder row (rowId=${rowId}):`, err.message);
      }

      if (totalMigrated % 100 === 0 && totalMigrated > 0) {
        console.log(`  Progress: ${totalMigrated} investors migrated so far...`);
      }
    }

    if (rows.length < batchSize) {
      // Last page — but we deleted rows, so offset tracking may be off.
      // Only stop when a full page returns fewer than batchSize items
      // AND we haven't moved any vc-import rows in this batch.
      hasMore = false;
    } else {
      // Rows were deleted from the table; don't advance skip because the
      // remaining rows shifted up. Only advance if no vc-import rows were
      // found in this batch (meaning we're past all of them).
      const vcRowsInBatch = rows.filter(r => isVcImportRow(r.row_data || r)).length;
      if (vcRowsInBatch === 0) {
        skip += batchSize;
      }
      // If vcRowsInBatch > 0 we stay at the same skip since deleted rows shift
    }
  }

  console.log('');
  console.log('Migration complete:');
  console.log(`  Investors migrated to investors table: ${totalMigrated}`);
  console.log(`  Stakeholder rows deleted:              ${totalDeleted}`);
  console.log(`  Non-vc-import rows skipped:            ${totalSkipped}`);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
