/**
 * Migration script: move VC investor records from `stakeholders` table to `investors` table.
 *
 * Identifies rows where email ends with @vc-import.local, writes them to the
 * `investors` table (system-wide, no companyId), then deletes them from `stakeholders`.
 *
 * Rate-limited to avoid 429 errors from ZeroDB API.
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

// Rate limit: insert delay between individual row operations
const ROW_DELAY_MS = parseInt(process.env.MIGRATE_ROW_DELAY_MS || '200', 10);  // 200ms between rows = ~5 rows/sec
const BATCH_DELAY_MS = parseInt(process.env.MIGRATE_BATCH_DELAY_MS || '1000', 10); // 1s between batches
const RETRY_DELAY_MS = 5000; // 5s pause on 429

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOn429(fn, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.response?.status === 429 && attempt < maxRetries) {
        const waitMs = RETRY_DELAY_MS * (attempt + 1);
        console.log(`  Rate limited (429), waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
}

async function queryStakeholders(skip, limit) {
  const response = await retryOn429(() =>
    client.post(
      `/api/v1/projects/${PROJECT_ID}/database/tables/stakeholders/query`,
      { filter: {}, limit, skip }
    )
  );
  const data = response.data;
  return {
    rows: Array.isArray(data) ? data : (data.data || []),
    total: data.total,
  };
}

async function insertInvestorRow(rowData) {
  const response = await retryOn429(() =>
    client.post(
      `/api/v1/projects/${PROJECT_ID}/database/tables/investors/rows`,
      { row_data: rowData }
    )
  );
  return response.data;
}

async function deleteStakeholderRow(rowId) {
  await retryOn429(() =>
    client.delete(
      `/api/v1/projects/${PROJECT_ID}/database/tables/stakeholders/rows/${rowId}`
    )
  );
}

function isVcImportRow(rowData) {
  const email = (rowData.email || '').toLowerCase();
  return email.endsWith('@vc-import.local');
}

async function run() {
  console.log('Starting migration: VC investor stakeholders → investors table');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Row delay: ${ROW_DELAY_MS}ms, Batch delay: ${BATCH_DELAY_MS}ms`);
  console.log('');

  const batchSize = 50;
  let totalMigrated = 0;
  let totalDeleted = 0;
  let totalFailed = 0;
  let cleanSkip = 0;
  let maxIterations = 2000;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    let rows, total;
    try {
      const result = await queryStakeholders(cleanSkip, batchSize);
      rows = result.rows;
      total = result.total;
    } catch (err) {
      console.error(`Batch ${iteration}: Failed to query stakeholders at skip=${cleanSkip}:`, err.message);
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`No more rows at skip=${cleanSkip}. Migration complete.`);
      break;
    }

    const vcRows = rows.filter(r => isVcImportRow(r.row_data || r));
    const cleanRows = rows.filter(r => !isVcImportRow(r.row_data || r));

    // Migrate vc-import rows
    for (const row of vcRows) {
      const rowId = row.row_id;
      const rowData = row.row_data || row;

      const investorData = { ...rowData };
      delete investorData.companyId;
      investorData.source = 'vc-import';

      let inserted = false;
      try {
        await insertInvestorRow(investorData);
        totalMigrated++;
        inserted = true;
      } catch (err) {
        console.error(`  Insert failed (rowId=${rowId}, email=${rowData.email}): ${err.message}`);
        totalFailed++;
      }

      if (inserted) {
        try {
          await deleteStakeholderRow(rowId);
          totalDeleted++;
        } catch (err) {
          console.error(`  Delete failed (rowId=${rowId}): ${err.message}`);
        }
      }

      if (totalMigrated % 100 === 0 && totalMigrated > 0) {
        const remaining = total ? total - cleanSkip : '?';
        console.log(`  Progress: ${totalMigrated} migrated, ${totalDeleted} deleted, ${totalFailed} failed | ~${remaining} rows remaining`);
      }

      await sleep(ROW_DELAY_MS);
    }

    if (vcRows.length === 0) {
      // Entire batch is clean — advance past it
      cleanSkip += rows.length;
      if (rows.length < batchSize) {
        console.log(`Last batch processed. Clean skip at ${cleanSkip}.`);
        break;
      }
    } else {
      // Deleted some vc rows — advance skip only by count of clean (non-deleted) rows
      cleanSkip += cleanRows.length;
    }

    if (total && cleanSkip >= total) {
      console.log(`Reached end of table (skip=${cleanSkip}, total=${total}).`);
      break;
    }

    await sleep(BATCH_DELAY_MS);
  }

  if (iteration >= maxIterations) {
    console.warn(`WARNING: Hit iteration limit (${maxIterations}). Migration may be incomplete.`);
  }

  console.log('');
  console.log('=== Migration Summary ===');
  console.log(`  Investors migrated to investors table: ${totalMigrated}`);
  console.log(`  Stakeholder rows deleted:              ${totalDeleted}`);
  console.log(`  Insert failures (not deleted):         ${totalFailed}`);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
