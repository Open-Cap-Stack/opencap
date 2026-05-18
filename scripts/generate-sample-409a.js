#!/usr/bin/env node
/**
 * Generate a real 409A valuation PDF using the full AI pipeline.
 * Saves the final PDF to ~/Desktop/409A-Sample-<company>-<date>.pdf
 *
 * Usage: node scripts/generate-sample-409a.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// ── Sample company: realistic Series A SaaS startup ──────────────────────────
const SAMPLE_VALUATION = {
  valuationId: `val_sample_${uuidv4()}`,
  companyId: 'Meridian Analytics',
  effectiveDate: new Date().toISOString(),
  status: 'pending',
  businessContext: {
    companyName: 'Meridian Analytics',
    description: 'Meridian Analytics is a B2B SaaS company providing AI-powered business intelligence and data analytics platform for mid-market enterprises. The platform integrates with 200+ data sources and uses machine learning to surface actionable insights, anomaly detection, and predictive forecasting for finance and operations teams.',
    industry: 'Enterprise SaaS / Business Intelligence',
    subIndustry: 'Data Analytics',
    stage: 'series_a',
    businessModel: 'Subscription SaaS — annual contracts ranging $24k-$120k ARR per customer, land-and-expand motion',
    lastFundraisingRound: 'Series A',
    keyRisks: 'Competition from Tableau, Power BI, and Looker; customer concentration risk (top 3 customers = 28% ARR); long enterprise sales cycles; data security and compliance requirements',
    competitiveAdvantages: 'Proprietary ML models trained on industry-specific datasets; 3x faster time-to-insight vs competitors; 94% gross revenue retention; strong NPS of 62'
  },
  financialInputs: {
    revenue: 4200000,
    revenueGrowthRate: 85,
    grossMargin: 74,
    ebitda: -1800000,
    burnRate: 380000,
    cashOnHand: 7200000,
    totalDebt: 500000,
    totalAssets: 9100000,
    employeeCount: 31,
    lastFundraisingAmount: 8000000,
    lastFundraisingPreMoney: 28000000
  },
  capTableSnapshot: {
    totalFullyDilutedShares: 12500000
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  409A Valuation AI Pipeline — Real Run');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  Company:  ${SAMPLE_VALUATION.companyId}`);
  console.log(`  Stage:    ${SAMPLE_VALUATION.businessContext.stage}`);
  console.log(`  Revenue:  $${SAMPLE_VALUATION.financialInputs.revenue.toLocaleString()}`);
  console.log(`  Models:   deepseek-r1 (quant) · mistral-large (narrative) · minimax-image-01 (cover)`);
  console.log('════════════════════════════════════════════════════════\n');

  // ── Override Valuation409A model to use in-memory stub ───────────────────
  // (avoids needing a live ZeroDB connection just to run the pipeline)
  const store = { ...SAMPLE_VALUATION };

  const Valuation409A = {
    findOne: async (filter) => {
      if (filter.valuationId === store.valuationId || filter.row_id === store.valuationId) {
        return { ...store };
      }
      return null;
    },
    updateOne: async (_filter, { $set }) => {
      Object.assign(store, $set);
    }
  };

  const AccountantQueue = {
    create: async (data) => {
      console.log(`  [Queue] Accountant queue entry created: ${data.queueId}`);
    }
  };

  const User = {
    find: async () => []
  };

  // Monkey-patch requires before loading the service
  const Module = require('module');
  const origLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === '../models/Valuation409A' || request.endsWith('/models/Valuation409A')) return Valuation409A;
    if (request === '../models/AccountantQueue' || request.endsWith('/models/AccountantQueue')) return AccountantQueue;
    if (request === '../models/User' || request.endsWith('/models/User')) return User;
    if (request === './valuation409AEmailService' || request.endsWith('/valuation409AEmailService')) {
      return { sendAccountantQueueNotification: async () => {} };
    }
    return origLoad.apply(this, arguments);
  };

  const { runValuationAgent } = require('../services/valuation409AAgentService');

  // ── Run the AI pipeline ───────────────────────────────────────────────────
  console.log('► Step 1/5  Researching comparable companies (deepseek-r1)...');
  const startTime = Date.now();

  let result;
  try {
    result = await runValuationAgent(SAMPLE_VALUATION.valuationId);
  } catch (err) {
    console.error('\n✗ Pipeline failed:', err.message);
    if (err.response?.data) console.error('  API error:', JSON.stringify(err.response.data, null, 2));
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Pipeline complete in ${elapsed}s`);
  console.log(`  FMV per Common Share: $${result.fmvPerShare}`);

  // ── Generate PDF ──────────────────────────────────────────────────────────
  console.log('\n► Generating PDF...');

  // Patch PDF service model dependencies too
  const pdfModule = require('../services/valuation409APdfService');

  // For PDF generation we need to re-stub Valuation409A inside pdfService
  // The store object already has all the AI results from updateOne calls above
  // Re-stub for PDF service (separate require cache entry)
  const pdfValuation409A = {
    findOne: async (filter) => {
      if (filter.valuationId === store.valuationId || filter.row_id === store.valuationId) {
        return { ...store };
      }
      return null;
    }
  };

  // Temporarily replace in require cache
  const Valuation409APath = require.resolve('../models/Valuation409A');
  const cached = require.cache[Valuation409APath];
  if (cached) cached.exports = pdfValuation409A;

  const ShareClass = { find: async () => [
    { name: 'Common Stock', authorizedShares: 10000000, issuedShares: 6500000, liquidationPreference: null, participationRights: 'Non-participating' },
    { name: 'Series A Preferred', authorizedShares: 3500000, issuedShares: 2850000, liquidationPreference: 28000000, participationRights: 'Non-participating' }
  ]};
  const EquityGrant = { find: async () => [
    { numberOfShares: 1200000 },
    { numberOfShares: 800000 }
  ]};

  const ShareClassPath = require.resolve('../models/ShareClass');
  const EquityGrantPath = require.resolve('../models/EquityGrant');
  if (require.cache[ShareClassPath]) require.cache[ShareClassPath].exports = ShareClass;
  else require.cache[ShareClassPath] = { id: ShareClassPath, filename: ShareClassPath, loaded: true, exports: ShareClass, parent: null, children: [] };
  if (require.cache[EquityGrantPath]) require.cache[EquityGrantPath].exports = EquityGrant;
  else require.cache[EquityGrantPath] = { id: EquityGrantPath, filename: EquityGrantPath, loaded: true, exports: EquityGrant, parent: null, children: [] };

  const shareClasses = await ShareClass.find();
  const grants = await EquityGrant.find();
  const totalGrantedOptions = grants.reduce((s, g) => s + (Number(g.numberOfShares) || 0), 0);
  const capTableData = { shareClasses, totalGrantedOptions };

  const tmpPdfPath = await pdfModule.generatePDF(SAMPLE_VALUATION.valuationId, capTableData);

  // ── Copy to Desktop ───────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10);
  const desktopPath = path.join(os.homedir(), 'Desktop', `409A-MeridianAnalytics-${dateStr}.pdf`);
  fs.copyFileSync(tmpPdfPath, desktopPath);
  fs.unlinkSync(tmpPdfPath);

  const sizeKb = Math.round(fs.statSync(desktopPath).size / 1024);
  console.log(`\n✓ PDF saved to Desktop`);
  console.log(`  Path: ${desktopPath}`);
  console.log(`  Size: ${sizeKb} KB`);
  console.log('\n════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
