/**
 * VC Investor Import Script
 * Imports VC funds, firms, and angel investors via the OpenCap REST API.
 *
 * Sources:
 *   - vc_fund_master_list.csv  (10,039 records — funds/firms)
 *   - vc_contacts_by_firm.csv  (5,475 records — contacts with emails)
 *   - vcsheets_investors_raw.csv (51 records — direct GP emails, highest quality)
 *
 * Usage:
 *   node scripts/import-vc-investors.js [--dry-run] [--source=funds|contacts|vcsheets|public_contacts|all]
 *
 * Required env:
 *   OPENCAP_API_URL  (default: https://api.opencapstack.com)
 *   ADMIN_SECRET     (from Railway env)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const BASE_DIR = process.env.VC_DATA_DIR || path.join(__dirname, 'data');
const API_URL = process.env.OPENCAP_API_URL || 'https://api.opencapstack.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BATCH_SIZE = 10;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SOURCE = (args.find(a => a.startsWith('--source=')) || '--source=all').split('=')[1];

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseFunds(raw) {
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  return records
    .filter(r => r['Fund/Firm Name'])
    .map(r => ({
      name: r['Fund/Firm Name'],
      email: extractEmail(r['Notes'] || '') || extractEmail(r['Website'] || ''),
      role: 'investor',
      investmentStage: r['Stage'] || '',
      sector: r['Focus'] || '',
      location: r['Location'] || '',
      aum: r['AUM'] || '',
      website: r['Website'] || '',
      notes: [r['GP/Managing Partner(s)'], r['AUM'], r['Stage'], r['Focus'], r['Founded']]
        .filter(Boolean).join(' | '),
      source: 'vc_fund_master_list',
    }));
}

function parseContacts(raw) {
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  return records
    .filter(r => r['Contact Name'] && r['Email'] && isValidEmail(r['Email']))
    .map(r => ({
      name: r['Contact Name'],
      email: r['Email'],
      role: 'investor',
      notes: `${r['Firm/Organization'] || ''} — ${r['Category'] || ''}`.trim(),
      source: 'vc_contacts_by_firm',
    }));
}

function parsePublicContacts(raw) {
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
  return records
    .filter(r => r['Contact Name'] && r['Email'] && isValidEmail(r['Email']))
    .map(r => ({
      name: r['Contact Name'],
      email: r['Email'],
      role: 'investor',
      notes: [r['Fund Name'], r['Title'], r['Source']]
        .filter(Boolean).join(' | '),
      source: 'vc_public_contacts',
    }));
}

function parseVCSheets(raw) {
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
  return records
    .filter(r => r['Name'] && r['Email'] && isValidEmail(r['Email']))
    .map(r => ({
      name: r['Name'],
      email: r['Email'],
      role: 'investor',
      notes: [r['Title'], r['Fund'], r['Sectors'], r['Location']]
        .filter(Boolean).join(' | '),
      source: 'vcsheets_investors_raw',
    }));
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  return match && isValidEmail(match[0]) ? match[0] : '';
}

function isValidEmail(e) {
  return typeof e === 'string' && /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(e.trim());
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateByEmail(records) {
  const seen = new Set();
  return records.filter(r => {
    const key = r.email ? r.email.toLowerCase() : r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let _jwt = null;

async function getJWT() {
  if (_jwt) return _jwt;
  const res = await axios.post(`${API_URL}/api/v1/auth/admin-token`, { adminSecret: ADMIN_SECRET });
  _jwt = res.data.token;
  return _jwt;
}

// ---------------------------------------------------------------------------
// Fetch existing stakeholders to avoid duplicates
// ---------------------------------------------------------------------------

async function fetchExistingEmails() {
  const existing = new Set();
  const jwt = await getJWT();
  let skip = 0;
  const limit = 200;
  process.stdout.write('  Pre-fetching existing stakeholders...');
  try {
    while (true) {
      const res = await axios.get(`${API_URL}/api/v1/stakeholders`, {
        headers: { Authorization: `Bearer ${jwt}` },
        params: { limit, skip },
      });
      const rows = res.data.data || res.data.stakeholders || res.data || [];
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const r of rows) {
        if (r.email) existing.add(r.email.toLowerCase());
        if (r.name) existing.add(r.name.toLowerCase());
      }
      skip += rows.length;
      if (rows.length < limit) break;
    }
    console.log(` ${existing.size} keys loaded.`);
  } catch (err) {
    console.warn(`\n  Warning: could not pre-fetch (${err.message}). Relying on API dedup.`);
  }
  return existing;
}

// ---------------------------------------------------------------------------
// Insert via OpenCap REST API
// ---------------------------------------------------------------------------

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function batchInsert(records, label) {
  let inserted = 0;
  let skipped = 0;
  const total = records.length;
  const jwt = await getJWT();

  for (let i = 0; i < total; i++) {
    const record = records[i];
    if (i % 50 === 0) {
      process.stdout.write(`\r  ${label}: ${inserted}/${total} inserted, ${skipped} skipped...`);
    }

    try {
      await axios.post(`${API_URL}/api/v1/stakeholders`, {
        name: record.name,
        email: record.email || `noemail+${Date.now()}+${i}@vc-import.local`,
        role: 'investor',
        notes: record.notes || '',
        companyId: 'ainative-studio',
      }, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      inserted++;
    } catch (err) {
      const status = err.response?.status;
      if (status === 409 || status === 422 || (err.message && err.message.includes('duplicate'))) {
        skipped++;
      } else if (status === 401) {
        // Token expired — refresh and retry once
        _jwt = null;
        const newJwt = await getJWT();
        try {
          await axios.post(`${API_URL}/api/v1/stakeholders`, {
            name: record.name,
            email: record.email || `noemail+${Date.now()}+${i}@vc-import.local`,
            role: 'investor',
            notes: record.notes || '',
            companyId: 'ainative-studio',
          }, { headers: { Authorization: `Bearer ${newJwt}` } });
          inserted++;
        } catch (e2) {
          skipped++;
        }
      } else {
        skipped++;
        if (process.env.DEBUG) {
          console.error(`\n  Skipped "${record.name}": ${status} ${err.response?.data?.message || err.message}`);
        }
      }
    }
    // Small delay to avoid hammering the API
    await sleep(100);
  }

  process.stdout.write(`\r  ${label}: ${inserted} inserted, ${skipped} skipped (${total} total)\n`);
  return { inserted, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nVC Investor Import${DRY_RUN ? ' [DRY RUN]' : ''} → ${API_URL}`);
  console.log(`Source: ${SOURCE}`);
  console.log('─'.repeat(60));

  const sources = {
    funds: { file: path.join(BASE_DIR, 'vc_fund_master_list.csv'), parser: parseFunds, label: 'VC Fund Master List' },
    contacts: { file: path.join(BASE_DIR, 'vc_contacts_by_firm.csv'), parser: parseContacts, label: 'VC Contacts by Firm' },
    vcsheets: { file: path.join(BASE_DIR, 'vcsheets_investors_raw.csv'), parser: parseVCSheets, label: 'VCSheets (High Quality GPs)' },
    public_contacts: { file: path.join(BASE_DIR, 'vc_public_contacts.csv'), parser: parsePublicContacts, label: 'VC Public Contacts (618)' },
  };

  let existingKeys = new Set();
  if (!DRY_RUN) {
    existingKeys = await fetchExistingEmails();
  }

  const toRun = SOURCE === 'all' ? ['vcsheets', 'contacts', 'public_contacts', 'funds'] : [SOURCE];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const key of toRun) {
    const { file, parser, label } = sources[key];
    if (!fs.existsSync(file)) { console.warn(`  SKIP ${label}: file not found`); continue; }

    let records = parser(fs.readFileSync(file, 'utf8'));
    const beforeDedup = records.length;
    records = deduplicateByEmail(records);

    // Filter out already-existing records
    if (!DRY_RUN && existingKeys.size > 0) {
      records = records.filter(r => {
        const ek = r.email ? r.email.toLowerCase() : null;
        const nk = r.name ? r.name.toLowerCase() : null;
        return !(ek && existingKeys.has(ek)) && !(nk && existingKeys.has(nk));
      });
    }

    console.log(`\n${label}`);
    console.log(`  Raw: ${beforeDedup} | Deduped: ${records.length > 0 ? records.length : 0} | Net new: ${records.length}`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would insert up to ${records.length} records`);
      if (records[0]) console.log(`  Sample: ${records[0].name} <${records[0].email}>`);
      continue;
    }

    if (records.length === 0) { console.log('  Nothing new to insert.'); continue; }

    const { inserted, skipped } = await batchInsert(records, label);
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  if (!DRY_RUN) {
    console.log('\n' + '─'.repeat(60));
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped:  ${totalSkipped}`);
    console.log('Done.\n');
  }
}

main().catch(err => {
  console.error('\nImport failed:', err.response?.data || err.message);
  process.exit(1);
});
