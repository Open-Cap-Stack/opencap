/**
 * Migration script: move VC investor records from `stakeholders` table to `investors` table.
 *
 * Identifies rows where email ends with @vc-import.local, bulk-inserts them into
 * the `investors` table (system-wide, no companyId), then bulk-deletes from `stakeholders`.
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOn429(fn, maxRetries = 6) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || status === 502 || status === 503) && attempt < maxRetries) {
        const waitMs = 6000 * (attempt + 1);
        console.log(`  ${status} error, waiting ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
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

async function bulkInsertInvestors(rowsData) {
  // Try bulk insert endpoint first
  try {
    const response = await retryOn429(() =>
      client.post(
        `/api/v1/projects/${PROJECT_ID}/database/tables/investors/rows/bulk`,
        { rows: rowsData.map(d => ({ row_data: d })) }
      )
    );
    return response.data;
  } catch (err) {
    // Fallback: insert one at a time if bulk not supported
    if (err.response?.status === 404 || err.response?.status === 405) {
      for (const d of rowsData) {
        await retryOn429(() =>
          client.post(`/api/v1/projects/${PROJECT_ID}/database/tables/investors/rows`, { row_data: d })
        );
        await sleep(150);
      }
      return { inserted: rowsData.length };
    }
    throw err;
  }
}

async function bulkDeleteStakeholders(rowIds) {
  // Try bulk delete first
  try {
    const response = await retryOn429(() =>
      client.post(
        `/api/v1/projects/${PROJECT_ID}/database/tables/stakeholders/rows/bulk-delete`,
        { row_ids: rowIds }
      )
    );
    return response.data;
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      // Fallback: delete one at a time
      for (const rowId of rowIds) {
        await retryOn429(() =>
          client.delete(`/api/v1/projects/${PROJECT_ID}/database/tables/stakeholders/rows/${rowId}`)
        );
        await sleep(150);
      }
      return { deleted: rowIds.length };
    }
    throw err;
  }
}

async function run() {
  console.log('Starting migration: VC investor stakeholders → investors table');
  console.log(`Project ID: ${PROJECT_ID}`);

  const FETCH_BATCH = 200;  // fetch 200 at a time
  const INSERT_BATCH = 50;  // insert 50 at a time
  let totalMigrated = 0;
  let totalDeleted = 0;
  let cleanSkip = 0;

  while (true) {
    let rows, total;
    try {
      const result = await queryStakeholders(cleanSkip, FETCH_BATCH);
      rows = result.rows;
      total = result.total;
    } catch (err) {
      console.error(`Failed to query at skip=${cleanSkip}:`, err.message);
      await sleep(10000);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`No more rows at skip=${cleanSkip}. Done.`);
      break;
    }

    const vcRows = rows.filter(r => {
      const email = ((r.row_data || r).email || '').toLowerCase();
      return email.endsWith('@vc-import.local');
    });
    const cleanRows = rows.filter(r => {
      const email = ((r.row_data || r).email || '').toLowerCase();
      return !email.endsWith('@vc-import.local');
    });

    if (vcRows.length > 0) {
      // Prepare investor data in INSERT_BATCH chunks
      for (let i = 0; i < vcRows.length; i += INSERT_BATCH) {
        const chunk = vcRows.slice(i, i + INSERT_BATCH);
        const investorData = chunk.map(row => {
          const d = { ...(row.row_data || row) };
          delete d.companyId;
          d.source = 'vc-import';
          return d;
        });
        const rowIds = chunk.map(r => r.row_id).filter(Boolean);

        try {
          await bulkInsertInvestors(investorData);
          totalMigrated += chunk.length;
        } catch (err) {
          console.error(`  Bulk insert failed (chunk ${i}):`, err.message);
          continue;
        }

        try {
          await bulkDeleteStakeholders(rowIds);
          totalDeleted += rowIds.length;
        } catch (err) {
          console.error(`  Bulk delete failed:`, err.message);
        }

        await sleep(1000); // 1s between insert batches
      }
    }

    cleanSkip += cleanRows.length;
    console.log(`skip=${cleanSkip} | migrated: ${totalMigrated} | deleted: ${totalDeleted} | remaining: ~${total ? total - totalDeleted : '?'}`);

    if (rows.length < FETCH_BATCH) {
      console.log('Last batch processed.');
      break;
    }

    await sleep(2000);
  }

  console.log('\n=== Migration Summary ===');
  console.log(`  Investors migrated: ${totalMigrated}`);
  console.log(`  Stakeholders deleted: ${totalDeleted}`);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
