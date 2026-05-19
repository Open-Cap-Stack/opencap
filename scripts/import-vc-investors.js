/**
 * VC Investor Import Script
 * Imports VC funds, firms, and angel investors into the stakeholders table.
 *
 * Sources:
 *   - vc_fund_master_list.csv  (10,039 records — funds/firms)
 *   - vc_contacts_by_firm.csv  (5,475 records — contacts with emails)
 *   - vcsheets_investors_raw.csv (51 records — direct GP emails, highest quality)
 *
 * Usage:
 *   node scripts/import-vc-investors.js [--dry-run] [--source=funds|contacts|vcsheets|all]
 *
 * Options:
 *   --dry-run          Parse and report counts without writing to DB
 *   --source=<name>    Import only a specific source (default: all)
 *
 * Required env:
 *   ZERODB_API_KEY, ZERODB_PROJECT_ID, ZERODB_BASE_URL (or AINATIVE_API_TOKEN)
 */

require('dotenv').config();
// Override with the correct AINative project ID if the local .env has a stale one
if (!process.env.ZERODB_PROJECT_ID || process.env.ZERODB_PROJECT_ID === '61a4a000-7677-4512-acfe-2b54e912e148') {
  process.env.ZERODB_PROJECT_ID = '29e8754c-c67d-4a74-9167-a069d87ab1aa';
}
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const BASE_DIR = process.env.VC_DATA_DIR || path.join(__dirname, 'data');
const BATCH_SIZE = 50;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SOURCE = (args.find(a => a.startsWith('--source=')) || '--source=all').split('=')[1];

// ---------------------------------------------------------------------------
// ZeroDB client (reuse project service)
// ---------------------------------------------------------------------------
const zerodbService = require('../services/zerodbService');

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseFunds(raw) {
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  return records.map(r => ({
    stakeholderType: 'investor',
    name: r['Fund/Firm Name'] || '',
    email: extractEmail(r['Notes'] || ''),
    role: 'investor',
    investmentStage: r['Stage'] || '',
    sector: r['Focus'] || '',
    location: r['Location'] || '',
    aum: r['AUM'] || '',
    fundSize: r['Fund Size (Latest)'] || '',
    founded: r['Founded'] || '',
    website: r['Website'] || '',
    keyPersonnel: r['GP/Managing Partner(s)'] || '',
    notes: r['Notes'] || '',
    source: 'vc_fund_master_list',
  }));
}

function parseContacts(raw) {
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  return records.map(r => ({
    stakeholderType: 'investor',
    name: r['Contact Name'] || '',
    email: r['Email'] || '',
    role: 'investor',
    company: r['Firm/Organization'] || '',
    website: '',
    source: 'vc_contacts_by_firm',
    category: r['Category'] || '',
    notes: `${r['Firm/Organization'] || ''} — ${r['Category'] || ''}`.trim(),
  }));
}

function parseVCSheets(raw) {
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  return records.map(r => ({
    stakeholderType: 'investor',
    name: r['Name'] || '',
    email: r['Email'] || '',
    role: 'investor',
    title: r['Title'] || '',
    company: r['Fund'] || '',
    investmentStage: r['Rounds'] || '',
    sector: r['Sectors'] || '',
    location: r['Location'] || '',
    website: r['Website'] || '',
    linkedin: r['Linkedin'] || '',
    twitter: r['Twitter'] || '',
    source: 'vcsheets_investors_raw',
    notes: r['Description'] ? r['Description'].slice(0, 500) : '',
  }));
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  return match ? match[0] : '';
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateByEmail(records) {
  const seen = new Set();
  const deduped = [];
  for (const r of records) {
    const key = r.email ? r.email.toLowerCase() : r.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }
  return deduped;
}

// ---------------------------------------------------------------------------
// DB write
// ---------------------------------------------------------------------------

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all existing stakeholder names+emails from DB so we can skip them
 * before making any insert calls.
 */
async function fetchExistingKeys() {
  const existing = new Set();
  let skip = 0;
  const limit = 500;
  process.stdout.write('  Pre-fetching existing stakeholders from DB...');
  try {
    while (true) {
      const result = await zerodbService.queryTable('stakeholders', {
        fields: ['name', 'email'],
        limit,
        offset: skip,
      });
      const rows = result.rows || result.data || result || [];
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const r of rows) {
        if (r.email) existing.add(r.email.toLowerCase());
        if (r.name) existing.add(r.name.toLowerCase());
      }
      skip += rows.length;
      if (rows.length < limit) break;
      await sleep(1200); // stay under rate limit while paginating
    }
    console.log(` ${existing.size} keys loaded.`);
  } catch (err) {
    console.warn(`\n  Warning: could not pre-fetch existing records (${err.message}). Will rely on DB-level dedup.`);
  }
  return existing;
}

async function batchInsert(records, label) {
  let inserted = 0;
  let skipped = 0;
  const total = records.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    process.stdout.write(`\r  ${label}: ${inserted}/${total} inserted, ${skipped} skipped...`);

    for (const record of batch) {
      let attempts = 0;
      let done = false;
      while (!done && attempts < 5) {
        try {
          await zerodbService.insertRow('stakeholders', {
            id: generateId(),
            stakeholderType: record.stakeholderType || 'investor',
            name: record.name,
            email: record.email || '',
            role: record.role || 'investor',
            company: record.company || record.name,
            website: record.website || '',
            location: record.location || '',
            investmentStage: record.investmentStage || '',
            sector: record.sector || '',
            aum: record.aum || '',
            fundSize: record.fundSize || '',
            founded: record.founded || '',
            keyPersonnel: record.keyPersonnel || '',
            title: record.title || '',
            linkedin: record.linkedin || '',
            twitter: record.twitter || '',
            source: record.source || 'import',
            notes: record.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          inserted++;
          done = true;
        } catch (err) {
          const msg = err.message || '';
          if (msg.includes('429') || msg.includes('rate_limit')) {
            attempts++;
            const waitMs = 65000 * attempts;
            process.stdout.write(`\n  Rate limited — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempts}/5)...\n`);
            await sleep(waitMs);
          } else {
            // Duplicate or other non-retryable error
            skipped++;
            if (process.env.DEBUG) {
              console.error(`\n  Skipped "${record.name}": ${msg}`);
            }
            done = true;
          }
        }
      }
      if (attempts >= 5) {
        skipped++;
        console.error(`\n  Giving up on "${record.name}" after 5 rate-limit retries`);
      }
      // Throttle: ~50 req/min to stay safely under the 60/min limit
      await sleep(1200);
    }
  }

  process.stdout.write(`\r  ${label}: ${inserted} inserted, ${skipped} skipped (${total} total)\n`);
  return { inserted, skipped };
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nVC Investor Import${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log(`Source: ${SOURCE}`);
  console.log('─'.repeat(50));

  let existingKeys = new Set();
  if (!DRY_RUN) {
    process.stdout.write('Initializing ZeroDB connection...');
    await zerodbService.initialize();
    console.log(` projectId=${zerodbService.projectId}`);
    existingKeys = await fetchExistingKeys();
  }

  const sources = {
    funds: {
      file: path.join(BASE_DIR, 'vc_fund_master_list.csv'),
      parser: parseFunds,
      label: 'VC Fund Master List',
    },
    contacts: {
      file: path.join(BASE_DIR, 'vc_contacts_by_firm.csv'),
      parser: parseContacts,
      label: 'VC Contacts by Firm',
    },
    vcsheets: {
      file: path.join(BASE_DIR, 'vcsheets_investors_raw.csv'),
      parser: parseVCSheets,
      label: 'VCSheets Investors (High Quality)',
    },
  };

  const toRun = SOURCE === 'all' ? Object.keys(sources) : [SOURCE];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const key of toRun) {
    const { file, parser, label } = sources[key];

    if (!fs.existsSync(file)) {
      console.warn(`  SKIP ${label}: file not found at ${file}`);
      continue;
    }

    const raw = fs.readFileSync(file, 'utf8');
    let records = parser(raw);
    records = records.filter(r => r.name && r.name.trim());
    const beforeDedup = records.length;
    records = deduplicateByEmail(records);

    // Filter out records already in DB
    const beforeFilter = records.length;
    if (!DRY_RUN && existingKeys.size > 0) {
      records = records.filter(r => {
        const emailKey = r.email ? r.email.toLowerCase() : null;
        const nameKey = r.name ? r.name.toLowerCase() : null;
        return !(emailKey && existingKeys.has(emailKey)) && !(nameKey && existingKeys.has(nameKey));
      });
    }

    console.log(`\n${label}`);
    console.log(`  Parsed: ${beforeDedup} | After dedup: ${beforeFilter} | New (not in DB): ${records.length}`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would insert up to ${records.length} records`);
      if (records.length > 0) {
        console.log(`  Sample: ${JSON.stringify(records[0], null, 2).slice(0, 300)}...`);
      }
      continue;
    }

    const { inserted, skipped } = await batchInsert(records, label);
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  if (!DRY_RUN) {
    console.log('\n' + '─'.repeat(50));
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped:  ${totalSkipped}`);
    console.log('Done.\n');
  }
}

main().catch(err => {
  console.error('\nImport failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
