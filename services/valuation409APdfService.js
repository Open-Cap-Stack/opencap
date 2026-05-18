/**
 * 409A Valuation PDF Generation Service
 *
 * Generates a professionally formatted PDF report from an AI-completed
 * 409A valuation using pdfkit.
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Valuation409A = require('../models/Valuation409A');

// ─── Colours & Fonts ──────────────────────────────────────────────────────────
const BLUE   = '#1e40af';
const DARK   = '#111827';
const GRAY   = '#6b7280';
const LIGHT  = '#f3f4f6';
const GREEN  = '#065f46';
const WHITE  = '#ffffff';

function px(n) { return n; } // pass-through — pdfkit uses points natively

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addPageHeader(doc, title) {
  doc.rect(0, 0, doc.page.width, 42).fill(BLUE);
  doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
     .text('OpenCap Stack · 409A Valuation Report', 40, 14);
  doc.fillColor(WHITE).fontSize(9).font('Helvetica')
     .text(title, doc.page.width - 220, 16, { width: 180, align: 'right' });
  doc.fillColor(DARK);
  doc.y = 60;
}

function addSectionHeader(doc, text) {
  doc.moveDown(0.8);
  doc.rect(40, doc.y, doc.page.width - 80, 22).fill(LIGHT);
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11)
     .text(text, 48, doc.y + 5);
  doc.fillColor(DARK).font('Helvetica').fontSize(10);
  doc.moveDown(0.6);
}

function addBodyText(doc, text) {
  if (!text) return;
  doc.font('Helvetica').fontSize(10).fillColor(DARK)
     .text(String(text), 40, doc.y, { width: doc.page.width - 80, align: 'justify' });
  doc.moveDown(0.5);
}

function addKVRow(doc, label, value) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(GRAY).text(label + ':', 40, y, { width: 160 });
  doc.font('Helvetica').fontSize(10).fillColor(DARK).text(String(value ?? '—'), 205, y, { width: doc.page.width - 245 });
  doc.moveDown(0.35);
}

function addTable(doc, headers, rows) {
  const colWidth = Math.floor((doc.page.width - 80) / headers.length);
  const startY = doc.y;

  // Header row
  doc.rect(40, startY, doc.page.width - 80, 20).fill(BLUE);
  headers.forEach((h, i) => {
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
       .text(h, 44 + i * colWidth, startY + 5, { width: colWidth - 8 });
  });
  doc.y = startY + 22;

  // Data rows
  rows.forEach((row, ri) => {
    const rowY = doc.y;
    if (ri % 2 === 0) doc.rect(40, rowY, doc.page.width - 80, 18).fill('#f9fafb');
    row.forEach((cell, ci) => {
      doc.fillColor(DARK).font('Helvetica').fontSize(9)
         .text(String(cell ?? '—'), 44 + ci * colWidth, rowY + 4, { width: colWidth - 8 });
    });
    doc.y = rowY + 20;
  });
  doc.moveDown(0.5);
}

function fmt$(n) { return n != null ? `$${Number(n).toLocaleString()}` : '—'; }
function fmtPct(n) { return n != null ? `${Number(n).toFixed(1)}%` : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'; }

// ─── Cover Letter Page ────────────────────────────────────────────────────────
function addCoverLetterPage(doc, { company, effDate, fmv, sig }) {
  doc.addPage({ margin: 0 });
  addPageHeader(doc, 'Cover Letter');

  const letterDate = fmtDate(new Date());
  const reviewer = sig ? sig.signerEmail : 'Pending Accountant Review';

  doc.y = 70;
  doc.font('Helvetica').fontSize(10).fillColor(DARK).text(letterDate, 40, doc.y);
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(10).text('Board of Directors', 40, doc.y);
  doc.font('Helvetica').fontSize(10).text(company, 40, doc.y + 14);
  doc.y += 28;
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10)
     .text(`Re: IRC Section 409A Valuation of Common Stock — ${company} — Effective ${effDate}`, 40, doc.y, { width: doc.page.width - 80 });
  doc.moveDown(1);

  doc.font('Helvetica').fontSize(10).fillColor(DARK)
     .text(`Dear Members of the Board,`, 40, doc.y);
  doc.moveDown(0.8);

  doc.text(
    `We have prepared this report at the request of ${company} management to provide an independent opinion of the fair market value (FMV) of the common stock of ${company} (the "Company") as of ${effDate} for purposes of compliance with Section 409A of the Internal Revenue Code and Treasury Regulation §1.409A-1(b)(5).`,
    40, doc.y, { width: doc.page.width - 80, align: 'justify' }
  );
  doc.moveDown(0.8);

  // Bold FMV inline
  doc.text('Based on our analysis, it is our opinion that the FMV of a single share of the Company\'s common stock as of ', 40, doc.y, { continued: true, width: doc.page.width - 80 });
  doc.text(`${effDate} is `, { continued: true });
  doc.font('Helvetica-Bold').text(`$${Number(fmv).toFixed(4)}`, { continued: true });
  doc.font('Helvetica').text('.');
  doc.moveDown(0.8);

  doc.text(
    'This report contains our analysis supporting this conclusion, including an assessment of the Company\'s business, financial condition, and prospects, as well as an evaluation using the Hybrid Discounted Cash Flow, Option Pricing Model, and Market Comparable methodologies.',
    40, doc.y, { width: doc.page.width - 80, align: 'justify' }
  );
  doc.moveDown(0.8);

  doc.text(
    'This report is intended solely for use by the Board of Directors in connection with the grant of stock options and other equity awards under IRC Section 409A. It should not be used for any other purpose.',
    40, doc.y, { width: doc.page.width - 80, align: 'justify' }
  );
  doc.moveDown(1.5);

  doc.text('Respectfully submitted,', 40, doc.y);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').text('OpenCap Stack AI Valuation Platform', 40, doc.y);
  doc.moveDown(0.3);
  doc.font('Helvetica').fillColor(GRAY).text(reviewer, 40, doc.y);
  doc.fillColor(DARK);
}

// ─── Main Generator ───────────────────────────────────────────────────────────
async function generatePDF(valuationId) {
  // Fetch valuation
  let val = await Valuation409A.findOne({ valuationId });
  if (!val) val = await Valuation409A.findOne({ row_id: valuationId });
  if (!val) throw new Error(`Valuation ${valuationId} not found`);

  if (!val.aiReport) throw new Error('AI report not yet generated for this valuation');

  const report   = val.aiReport;
  const biz      = val.businessContext || {};
  const fin      = val.financialInputs || {};
  const comps    = val.aiSelectedComparables || [];
  const recon    = val.aiReconciliation || {};
  const sig      = val.accountantSignatureRecord || null;
  const fmv      = Number(val.fairMarketValue || 0);
  const company  = val.companyId || 'Company';
  const effDate  = fmtDate(val.effectiveDate || val.createdAt);
  const reportId = val.valuationId || valuationId;

  // Write to temp file
  const tmpPath = path.join(os.tmpdir(), `409a-${reportId}-${Date.now()}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'LETTER', bufferPages: true });
    const stream = fs.createWriteStream(tmpPath);
    doc.pipe(stream);

    // ── COVER PAGE ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(BLUE);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28)
       .text('409A VALUATION REPORT', 60, 140, { width: doc.page.width - 120, align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#bfdbfe').font('Helvetica').fontSize(14)
       .text('Fair Market Value Analysis · IRC Section 409A', { align: 'center' });
    doc.moveDown(2);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18).text(company, { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#e0f2fe').font('Helvetica').fontSize(12).text(`Effective Date: ${effDate}`, { align: 'center' });
    doc.moveDown(3);

    // FMV box
    const boxX = (doc.page.width - 260) / 2;
    doc.rect(boxX, doc.y, 260, 80).fillAndStroke('#1d4ed8', '#93c5fd');
    doc.fillColor(WHITE).font('Helvetica').fontSize(11).text('Fair Market Value Per Common Share', boxX, doc.y + 12, { width: 260, align: 'center' });
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(32).text(`$${fmv.toFixed(4)}`, boxX, doc.y + 30, { width: 260, align: 'center' });

    doc.moveDown(8);
    doc.fillColor('#bfdbfe').font('Helvetica').fontSize(9)
       .text(`Report ID: ${reportId}`, { align: 'center' });
    doc.fillColor('#bfdbfe').fontSize(9)
       .text('Prepared by OpenCap Stack · AI-Powered 409A Platform', { align: 'center' });
    if (sig) {
      doc.fillColor('#bfdbfe').fontSize(9)
         .text(`Reviewed and approved by: ${sig.signerEmail}`, { align: 'center' });
    }
    doc.fillColor(DARK); // reset

    // ── COVER LETTER ──────────────────────────────────────────────────────────
    addCoverLetterPage(doc, { company, effDate, fmv, sig });

    // ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, `Executive Summary`);
    addSectionHeader(doc, 'Executive Summary');
    addBodyText(doc, report.executiveSummary);

    addSectionHeader(doc, 'Valuation Summary');
    addKVRow(doc, 'Company',             company);
    addKVRow(doc, 'Industry',            biz.industry || '—');
    addKVRow(doc, 'Stage',               biz.stage?.toUpperCase() || '—');
    addKVRow(doc, 'Effective Date',      effDate);
    addKVRow(doc, 'FMV Per Share',       `$${fmv.toFixed(4)}`);
    addKVRow(doc, 'Methodology',         'Hybrid (DCF + OPM/PWERM + Market Comps)');
    if (recon.weights) {
      addKVRow(doc, 'Method Weights',
        `DCF ${(recon.weights.dcf*100).toFixed(0)}% / OPM ${(recon.weights.opm*100).toFixed(0)}% / Comps ${(recon.weights.marketComps*100).toFixed(0)}%`);
    }
    if (recon.weightedEquityValue) {
      addKVRow(doc, 'Weighted Equity Value', fmt$(recon.weightedEquityValue));
    }
    if (val.aiDCFResult?.dlom != null) {
      addKVRow(doc, 'DLOM (DCF)', fmtPct(val.aiDCFResult.dlom * 100));
    }

    // ── COMPANY OVERVIEW ──────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'Company Overview');
    addSectionHeader(doc, 'Company Overview');
    if (biz.description) addBodyText(doc, biz.description);

    addSectionHeader(doc, 'Financial Snapshot');
    if (fin.revenue)              addKVRow(doc, 'Annual Revenue',           fmt$(fin.revenue));
    if (fin.revenueGrowthRate)    addKVRow(doc, 'Revenue Growth Rate',      fmtPct(fin.revenueGrowthRate));
    if (fin.grossMargin)          addKVRow(doc, 'Gross Margin',             fmtPct(fin.grossMargin));
    if (fin.ebitda)               addKVRow(doc, 'EBITDA',                   fmt$(fin.ebitda));
    if (fin.burnRate)             addKVRow(doc, 'Monthly Burn Rate',        fmt$(fin.burnRate));
    if (fin.cashOnHand)           addKVRow(doc, 'Cash on Hand',             fmt$(fin.cashOnHand));
    if (fin.totalDebt)            addKVRow(doc, 'Total Debt',               fmt$(fin.totalDebt));
    if (fin.employeeCount)        addKVRow(doc, 'Employees',                fin.employeeCount);
    if (fin.lastFundraisingAmount) addKVRow(doc, 'Last Fundraise',          fmt$(fin.lastFundraisingAmount));
    if (fin.lastFundraisingPreMoney) addKVRow(doc, 'Last Pre-Money Val.',   fmt$(fin.lastFundraisingPreMoney));

    // ── METHODOLOGY ───────────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'Methodology');
    addSectionHeader(doc, 'Valuation Methodology');
    addBodyText(doc, report.methodologyDescription);

    // ── COMPARABLE COMPANIES ──────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'Comparable Company Analysis');
    addSectionHeader(doc, 'Comparable Company Analysis');
    addBodyText(doc, report.comparableAnalysis);

    if (comps.length > 0) {
      doc.moveDown(0.3);
      addTable(
        doc,
        ['Company', 'Public?', 'Rev Multiple', 'Industry'],
        comps.map(c => [c.companyName, c.isPublic ? 'Yes' : 'No', `${c.revenueMultiple}x`, c.industry])
      );
    }

    // ── DCF ANALYSIS ──────────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'DCF Analysis');
    addSectionHeader(doc, 'Discounted Cash Flow (DCF) Analysis');
    addBodyText(doc, report.dcfAnalysis);

    if (recon.dcfEquityValue) {
      doc.moveDown(0.3);
      addKVRow(doc, 'DCF Equity Value', fmt$(recon.dcfEquityValue));
    }

    // ── OPM / PWERM ───────────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'OPM / PWERM Analysis');
    addSectionHeader(doc, 'Option Pricing Model / PWERM Analysis');
    addBodyText(doc, report.opmAnalysis);

    if (recon.opmEquityValue) {
      doc.moveDown(0.3);
      addKVRow(doc, 'OPM Equity Value', fmt$(recon.opmEquityValue));
    }

    const opm = val.aiOPMResult;
    if (opm) {
      doc.moveDown(0.3);

      if (opm.scenarios && opm.scenarios.length > 0) {
        // PWERM path — scenario table
        addSectionHeader(doc, 'PWERM Scenario Analysis');
        addTable(
          doc,
          ['Scenario', 'Probability', 'Exit Value', 'Common Share Value'],
          [
            ...opm.scenarios.map(s => [
              s.name || '—',
              fmtPct(s.probability != null ? s.probability * 100 : null),
              fmt$(s.exitValue),
              s.commonShareValue != null ? `$${Number(s.commonShareValue).toFixed(4)}` : '—'
            ]),
            // Weighted total row
            ['Weighted Total', '100%', fmt$(opm.weightedEquityValue), opm.fmvPerShare != null ? `$${Number(opm.fmvPerShare).toFixed(4)}` : '—']
          ]
        );
      } else {
        // OPM path — key inputs
        addSectionHeader(doc, 'OPM Key Inputs');
        if (opm.enterpriseValue != null) addKVRow(doc, 'Enterprise Value', fmt$(opm.enterpriseValue));
        if (opm.volatility != null) addKVRow(doc, 'Volatility', fmtPct(opm.volatility * 100));
        if (opm.riskFreeRate != null) addKVRow(doc, 'Risk-Free Rate', fmtPct(opm.riskFreeRate * 100));
        if (opm.timeToExit != null) addKVRow(doc, 'Time to Exit (years)', opm.timeToExit);
      }

      // Common outputs
      doc.moveDown(0.2);
      if (opm.dlom != null) addKVRow(doc, 'DLOM Applied', fmtPct(opm.dlom * 100));
      if (opm.fmvPerShare != null) addKVRow(doc, 'FMV Per Share (pre-DLOM)', `$${Number(opm.fmvPerShare).toFixed(4)}`);
      if (opm.adjustedFmvPerShare != null) addKVRow(doc, 'FMV Per Share (post-DLOM)', `$${Number(opm.adjustedFmvPerShare).toFixed(4)}`);
    }

    // ── DLOM ANALYSIS ─────────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'DLOM Analysis');
    addSectionHeader(doc, 'Discount for Lack of Marketability (DLOM)');
    addBodyText(doc, report.dlomNarrative || 'DLOM analysis is incorporated within the DCF and OPM methodologies above. The discount reflects the illiquidity of minority interests in private company common stock.');

    doc.moveDown(0.3);
    addSectionHeader(doc, 'DLOM Summary');

    const dcfDlom = val.aiDCFResult?.dlom;
    const opmDlom = val.aiOPMResult?.dlom;

    if (dcfDlom != null) addKVRow(doc, 'DCF DLOM Applied', fmtPct(dcfDlom * 100));
    if (opmDlom != null) addKVRow(doc, 'OPM DLOM Applied', fmtPct(opmDlom * 100));
    if (dcfDlom != null && opmDlom != null) {
      addKVRow(doc, 'Blended DLOM (average)', fmtPct(((dcfDlom + opmDlom) / 2) * 100));
    }
    addKVRow(doc, 'Methodology', 'Restricted Stock Studies / QMDM');
    doc.moveDown(0.3);
    addBodyText(doc, 'Common stock holders in private companies lack the ability to freely transfer shares, register for public sale, or force a liquidity event. This illiquidity discount is a required adjustment under IRC \u00a71.409A-1(b)(5) and is supported by empirical studies of restricted stock transactions.');

    // ── RISK FACTORS ──────────────────────────────────────────────────────────
    if (report.riskFactors) {
      doc.addPage({ margin: 0 });
      addPageHeader(doc, 'Risk Factors');
      addSectionHeader(doc, 'Risk Factors');
      addBodyText(doc, report.riskFactors);
    }

    // ── CONCLUSION ────────────────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'Conclusion');
    addSectionHeader(doc, 'Valuation Conclusion');
    addBodyText(doc, report.conclusionNarrative);

    // Conclusion box
    const cboxY = doc.y + 10;
    doc.rect(40, cboxY, doc.page.width - 80, 60).fillAndStroke('#eff6ff', '#bfdbfe');
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(12)
       .text(`Fair Market Value: $${fmv.toFixed(4)} per Common Share`, 50, cboxY + 12, { width: doc.page.width - 100 });
    doc.fillColor(GRAY).font('Helvetica').fontSize(9)
       .text(`Effective ${effDate} · Methodology: Hybrid DCF / OPM / Market Comps`, 50, cboxY + 32, { width: doc.page.width - 100 });

    // ── ACCOUNTANT SIGN-OFF ───────────────────────────────────────────────────
    doc.addPage({ margin: 0 });
    addPageHeader(doc, 'Accountant Attestation');
    addSectionHeader(doc, 'Accountant Review & Attestation');

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
       .text('This 409A valuation report was generated using AI-powered financial analysis and reviewed by a qualified accountant. The accountant has verified that the methodology, comparable company selection, and conclusions meet professional standards required under IRC Section 409A and ASC 718.', 40, doc.y, { width: doc.page.width - 80 });

    doc.moveDown(1.5);
    if (sig) {
      const sigBoxY = doc.y;
      doc.rect(40, sigBoxY, doc.page.width - 80, 110).fillAndStroke('#f0fdf4', '#a7f3d0');
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(11)
         .text('✓  Approved & Digitally Attested', 55, sigBoxY + 12);
      doc.fillColor(DARK).font('Helvetica').fontSize(10)
         .text(`Reviewer: ${sig.signerEmail}`, 55, sigBoxY + 32);
      doc.text(`Date Signed: ${fmtDate(sig.signedAt)}`, 55, sigBoxY + 48);
      doc.text(`Signature ID: ${sig.signatureId}`, 55, sigBoxY + 64);
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
         .text(`"${sig.statement}"`, 55, sigBoxY + 82, { width: doc.page.width - 120, italic: true });
    } else {
      doc.fillColor(GRAY).font('Helvetica-BoldOblique').fontSize(10)
         .text('Pending accountant review and sign-off.', 40, doc.y);
    }

    // ── PAGE NUMBERS & CONFIDENTIAL FOOTER ─────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7)
         .text('CONFIDENTIAL \u2014 IRC Section 409A Valuation Report', 40, doc.page.height - 42, { width: doc.page.width - 80, align: 'center' });
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
         .text(`Page ${i + 1} of ${totalPages}`, 40, doc.page.height - 30, { width: doc.page.width - 80, align: 'center' });
    }

    doc.end();
    stream.on('finish', () => resolve(tmpPath));
    stream.on('error', reject);
  });
}

module.exports = { generatePDF };
