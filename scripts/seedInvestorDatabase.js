#!/usr/bin/env node
/**
 * Investor Master Database Seeder
 *
 * Loads VC funds and angel investors from the research CSV files and seeds
 * them into the platform Investor table as globally-available deal signal
 * records (companyId = 'platform').
 *
 * Sources:
 *   1. vc_fund_master_list.csv  — 6,124 VC funds, micro-VCs, angels
 *   2. vcsheets_investors_raw.csv — 51 high-quality GP records with emails
 *
 * Usage:
 *   node scripts/seedInvestorDatabase.js [--dry-run] [--limit=N] [--source=funds|vcsheets|all]
 *
 * Options:
 *   --dry-run         Parse and validate without writing to database
 *   --limit=N         Only seed first N records (for testing)
 *   --source=         Which CSV to seed from: funds | vcsheets | all (default: all)
 *   --skip-existing   Skip records with matching name (default: true)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const databaseAdapter = require('../services/databaseAdapter');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_EXISTING = !args.includes('--no-skip-existing');
const LIMIT = (() => {
  const a = args.find((a) => a.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : Infinity;
})();
const SOURCE = (() => {
  const a = args.find((a) => a.startsWith('--source='));
  return a ? a.split('=')[1] : 'all';
})();

// ── CSV paths ─────────────────────────────────────────────────────────────────
const RESEARCH_DIR = path.join('/Users/aideveloper/core/docs/research');
const FUNDS_CSV = path.join(RESEARCH_DIR, 'vc_fund_master_list.csv');
const VCSHEETS_CSV = path.join(RESEARCH_DIR, 'vcsheets_investors_raw.csv');

// ── Stage → investorType mapping ──────────────────────────────────────────────
function stageToInvestorType(stage = '') {
  const s = stage.toLowerCase();
  if (s.includes('angel')) return 'angel';
  if (s.includes('accelerat') || s.includes('incubat')) return 'venture_capital';
  if (s.includes('growth') || s.includes('late') || s.includes('crossover')) return 'private_equity';
  if (s.includes('family') || s.includes('hnw')) return 'family_office';
  if (s.includes('corporate') || s.includes('cvc')) return 'corporate';
  return 'venture_capital'; // default for VC funds
}

// ── Focus → sector tags ───────────────────────────────────────────────────────
function focusToTags(focus = '') {
  if (!focus) return [];
  return focus
    .split(/[,;/|]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

// ── Simple CSV parser (handles quoted fields with commas inside) ───────────────
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
  const lines = raw.split('\n').filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (vals[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

// ── Transform vc_fund_master_list.csv row → Investor record ──────────────────
function transformFundRow(row) {
  const name = row['Fund/Firm Name'];
  if (!name) return null;

  const investorType = stageToInvestorType(row['Stage']);

  // Only seed venture_capital and angel types — these are the SPV signal types
  if (!['venture_capital', 'angel', 'private_equity', 'family_office', 'corporate'].includes(investorType)) {
    return null;
  }

  // Extract email from Notes or GP field
  const notes = row['Notes'] || '';
  const gpField = row['GP/Managing Partner(s)'] || '';
  const emailMatch = notes.match(/[\w.+-]+@[\w-]+\.[\w.]+/) ||
                     gpField.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Extract city/state from Location
  const location = row['Location'] || '';
  const [city, stateRaw] = location.split(',').map((s) => s.trim());
  const state = stateRaw || '';

  return {
    investorId: `inv_${uuidv4()}`,
    companyId: 'platform', // global platform record — not company-scoped
    name,
    investorType,
    entityType: investorType === 'angel' ? 'individual' : 'fund',
    email,
    address: {
      city,
      state,
      country: state && !state.match(/[A-Z]{2,}/) ? state : 'USA'
    },
    accreditedInvestor: true,
    website: row['Website'] || undefined,
    aum: row['AUM'] || undefined,
    fundSize: row['Fund Size (Latest)'] || undefined,
    stage: row['Stage'] || undefined,
    focus: row['Focus'] || undefined,
    founded: row['Founded'] || undefined,
    managingPartners: gpField || undefined,
    tags: focusToTags(row['Focus']),
    notes: notes || undefined,
    _source: 'vc_fund_master_list',
    investments: [],
    totalInvested: 0,
    totalShares: 0,
    proRataRights: false,
    informationRights: false,
    coSaleRights: false,
    dragAlongObligations: false,
    boardSeat: false,
    boardObserverRights: false,
    votingRights: false,
    investmentAmount: 0,
    equityPercentage: 0,
    qibStatus: false,
    preferredTermsIds: [],
    _type: 'investor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ── Transform vcsheets_investors_raw.csv row → Investor record ────────────────
function transformVCSheetsRow(row) {
  const name = row['Name'];
  if (!name) return null;

  // Fund column contains URL paths like "/fund/first-round-capital" — convert to display name
  const fundRaw = row['Fund'] || '';
  const fundName = fundRaw.startsWith('/fund/')
    ? fundRaw.replace('/fund/', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : fundRaw;
  const displayName = fundName ? `${name} (${fundName})` : name;

  // Determine stage from Rounds field
  const rounds = row['Rounds'] || '';
  const isAngel = rounds.toLowerCase().includes('pre-seed') ||
                  !row['Fund'];
  const investorType = isAngel ? 'angel' : 'venture_capital';

  const sectors = focusToTags(row['Sectors'] || '');

  return {
    investorId: `inv_${uuidv4()}`,
    companyId: 'platform',
    name: displayName,
    investorType,
    entityType: 'individual',
    email: row['Email'] || undefined,
    website: row['Website'] || undefined,
    linkedIn: row['Linkedin'] || undefined,
    twitter: row['Twitter'] || undefined,
    crunchbase: row['Crunchbase'] || undefined,
    stage: row['Rounds'] || undefined,
    focus: row['Sectors'] || undefined,
    location: row['Location'] || undefined,
    tags: sectors,
    notes: row['Description'] || undefined,
    managingPartners: name,
    fundName: fundName || undefined,
    title: row['Title'] || undefined,
    _source: 'vcsheets',
    accreditedInvestor: true,
    investments: [],
    totalInvested: 0,
    totalShares: 0,
    proRataRights: false,
    informationRights: false,
    coSaleRights: false,
    dragAlongObligations: false,
    boardSeat: false,
    boardObserverRights: false,
    votingRights: false,
    investmentAmount: 0,
    equityPercentage: 0,
    qibStatus: false,
    preferredTermsIds: [],
    _type: 'investor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  Investor Master Database Seeder');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  Mode:    ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`  Source:  ${SOURCE}`);
  console.log(`  Limit:   ${LIMIT === Infinity ? 'all' : LIMIT}`);
  console.log(`  Skip existing: ${SKIP_EXISTING}`);
  console.log('════════════════════════════════════════════════════════\n');

  const allRecords = [];

  // ── Load vcsheets (highest quality — always include first) ─────────────────
  if (SOURCE === 'all' || SOURCE === 'vcsheets') {
    console.log('► Loading vcsheets_investors_raw.csv...');
    const rows = parseCSV(VCSHEETS_CSV);
    for (const row of rows) {
      const record = transformVCSheetsRow(row);
      if (record) allRecords.push(record);
    }
    console.log(`  ${allRecords.length} records from VCSheets`);
  }

  // ── Load main fund list ────────────────────────────────────────────────────
  if (SOURCE === 'all' || SOURCE === 'funds') {
    console.log('► Loading vc_fund_master_list.csv...');
    const rows = parseCSV(FUNDS_CSV);
    let added = 0;
    for (const row of rows) {
      const record = transformFundRow(row);
      if (record) {
        allRecords.push(record);
        added++;
      }
    }
    console.log(`  ${added} records from fund master list (${rows.length - added} filtered out)`);
  }

  // Apply limit
  const toSeed = allRecords.slice(0, LIMIT);
  console.log(`\n► Total records to seed: ${toSeed.length}`);

  if (DRY_RUN) {
    console.log('\n✓ Dry run complete. Sample records:');
    toSeed.slice(0, 5).forEach((r) => {
      console.log(`  - ${r.name} [${r.investorType}] ${r.email || ''}`);
    });
    console.log('\n════════════════════════════════════════════════════════\n');
    return;
  }

  // ── Load existing names for dedup ─────────────────────────────────────────
  let existingNames = new Set();
  if (SKIP_EXISTING) {
    console.log('► Loading existing investor names for deduplication...');
    try {
      const existing = await databaseAdapter.find('Investor', { companyId: 'platform' }, {});
      const list = Array.isArray(existing) ? existing : (existing?.investors ?? []);
      list.forEach((inv) => {
        if (inv.name) existingNames.add(inv.name.toLowerCase().trim());
      });
      console.log(`  ${existingNames.size} existing platform investor records found`);
    } catch (err) {
      console.warn('  Could not load existing records:', err.message);
    }
  }

  // ── Seed in batches ───────────────────────────────────────────────────────
  const BATCH_SIZE = 50;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < toSeed.length; i += BATCH_SIZE) {
    const batch = toSeed.slice(i, i + BATCH_SIZE);
    const progress = Math.round(((i + batch.length) / toSeed.length) * 100);
    process.stdout.write(`\r  Seeding... ${i + batch.length}/${toSeed.length} (${progress}%)  `);

    for (const record of batch) {
      const nameKey = record.name.toLowerCase().trim();
      if (SKIP_EXISTING && existingNames.has(nameKey)) {
        skipped++;
        continue;
      }

      try {
        await databaseAdapter.create('Investor', record);
        existingNames.add(nameKey);
        created++;
      } catch (err) {
        if (err.code === 11000 || err.message?.includes('already exists') || err.message?.includes('duplicate')) {
          skipped++;
        } else {
          errors++;
          if (errors <= 5) {
            console.warn(`\n  Error seeding "${record.name}": ${err.message}`);
          }
        }
      }
    }

    // Brief pause between batches to avoid overwhelming ZeroDB rate limits
    if (i + BATCH_SIZE < toSeed.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log('\n');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  ✓ Seeding complete`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped} (already existed)`);
  console.log(`  Errors:  ${errors}`);
  console.log('════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
