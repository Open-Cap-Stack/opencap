/**
 * 409A Valuation AI Agent Service
 *
 * Runs a multi-step AI-powered 409A valuation using the AINative chat completion API.
 * Steps: collect inputs → research comparables → DCF → OPM/PWERM → draft report → queue for accountant
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Valuation409A = require('../models/Valuation409A');
const AccountantQueue = require('../models/AccountantQueue');

const AINATIVE_BASE = 'https://api.ainative.studio';
const AINATIVE_API_KEY = process.env.AINATIVE_API_KEY;
// Use claude-sonnet for financial analysis — most reliable for structured output
const AI_MODEL = 'claude-sonnet-4.5';

const SYSTEM_PROMPT = `You are a qualified 409A valuation analyst. You produce IRC Section 409A compliant fair market value analyses for private company common stock. Your analysis must be:
- Methodologically sound (OPM, PWERM, DCF, market comps)
- Defensible to the IRS
- Based strictly on the data provided — do not fabricate numbers
- Written in professional financial report language
Always return valid JSON when asked for structured output.`;

async function ainativeChat(messages, options = {}) {
  const response = await axios.post(
    `${AINATIVE_BASE}/v1/messages`,
    {
      model: AI_MODEL,
      system: SYSTEM_PROMPT,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: 0, // deterministic for financial analysis
      ...options.extra
    },
    {
      headers: {
        'x-api-key': AINATIVE_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );
  const content = response.data?.content;
  if (!content || !content[0]) throw new Error('Empty response from AINative API');
  return content[0].text;
}

async function ainativeChatJSON(messages, options = {}) {
  const text = await ainativeChat(messages, options);
  // Strip markdown code fences if present
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON object from text
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI response was not valid JSON: ' + clean.slice(0, 200));
  }
}

async function updateAIStatus(valuationId, status, extra = {}) {
  try {
    // find by either stored valuationId or row_id
    let val = await Valuation409A.findOne({ valuationId });
    if (!val) val = await Valuation409A.findOne({ row_id: valuationId });
    if (!val) return;
    const filterKey = val.valuationId ? { valuationId: val.valuationId } : { row_id: val.row_id };
    await Valuation409A.updateOne(filterKey, { $set: { aiStatus: status, ...extra } });
  } catch (e) {
    console.error('updateAIStatus error:', e.message);
  }
}

// ─── Step 1: Research Comparable Companies ────────────────────────────────────
async function researchComparables(inputs) {
  const { businessContext, financialInputs } = inputs;
  const messages = [
    {
      role: 'user',
      content: `Research comparable companies for a 409A valuation with these details:

Company Description: ${businessContext.description || 'Not provided'}
Industry: ${businessContext.industry || 'Not provided'}
Sub-Industry: ${businessContext.subIndustry || 'Not provided'}
Stage: ${businessContext.stage || 'Not provided'}
Business Model: ${businessContext.businessModel || 'Not provided'}
Annual Revenue: $${financialInputs.revenue?.toLocaleString() || 'Not provided'}
Revenue Growth Rate: ${financialInputs.revenueGrowthRate || 'Not provided'}%
Last Fundraising Round: ${businessContext.lastFundraisingRound || 'Not provided'}

Return a JSON object with this exact structure:
{
  "comparables": [
    {
      "companyName": "string",
      "ticker": "string or null",
      "isPublic": true/false,
      "industry": "string",
      "stage": "string",
      "rationale": "why this company is comparable (2-3 sentences)",
      "revenueMultiple": number,
      "ebitdaMultiple": number or null,
      "revenueGrowthRate": number or null
    }
  ],
  "selectedMultiple": number,
  "multipleRationale": "explanation of the selected revenue multiple (2-3 sentences)"
}

Include 4-6 comparable companies. Use your knowledge of public/private company valuations in this space.`
    }
  ];
  return ainativeChatJSON(messages);
}

// ─── Step 2: DCF Analysis ──────────────────────────────────────────────────────
async function runDCF(inputs) {
  const { financialInputs, businessContext } = inputs;
  const messages = [
    {
      role: 'user',
      content: `Perform a DCF (Discounted Cash Flow) analysis for a 409A valuation:

Financial Data:
- Annual Revenue: $${financialInputs.revenue?.toLocaleString() || 0}
- Revenue Growth Rate (next 5 years): ${financialInputs.revenueGrowthRate || 20}%
- Gross Margin: ${financialInputs.grossMargin || 60}%
- EBITDA: $${financialInputs.ebitda?.toLocaleString() || 'Not provided'}
- Burn Rate (monthly): $${financialInputs.burnRate?.toLocaleString() || 'Not provided'}
- Cash on Hand: $${financialInputs.cashOnHand?.toLocaleString() || 'Not provided'}
- Total Debt: $${financialInputs.totalDebt?.toLocaleString() || 0}
- Total Assets: $${financialInputs.totalAssets?.toLocaleString() || 'Not provided'}
- Company Stage: ${businessContext.stage || 'early'}

Use standard 409A DCF assumptions:
- WACC/Discount Rate: appropriate for stage (typically 25-40% for early stage)
- Terminal Growth Rate: 3%
- Projection Period: 5 years
- Apply DLOM (Discount for Lack of Marketability): 20-35% as appropriate

Return a JSON object:
{
  "projections": [
    { "year": 1, "revenue": number, "ebitda": number, "freeCashFlow": number }
  ],
  "discountRate": number,
  "terminalGrowthRate": number,
  "terminalValue": number,
  "presentValueCashFlows": number,
  "presentValueTerminal": number,
  "enterpriseValue": number,
  "dlom": number,
  "equityValue": number,
  "narrative": "2-3 paragraph explanation of the DCF analysis and key assumptions"
}`
    }
  ];
  return ainativeChatJSON(messages);
}

// ─── Step 3: OPM / PWERM Analysis ─────────────────────────────────────────────
async function runOPMorPWERM(inputs, capTableSnapshot) {
  const { financialInputs, businessContext } = inputs;
  const stage = businessContext.stage || 'seed';
  const usePWERM = ['seed', 'series_a', 'pre_seed'].includes(stage.toLowerCase());
  const method = usePWERM ? 'PWERM' : 'OPM';

  const totalFDShares = capTableSnapshot.totalFullyDilutedShares || 10000000;
  const lastRoundPremoney = financialInputs.lastFundraisingPreMoney || 0;

  const messages = [
    {
      role: 'user',
      content: `Perform a ${method} analysis for a 409A valuation:

Company Stage: ${stage}
Last Fundraising Pre-Money Valuation: $${lastRoundPremoney.toLocaleString()}
Last Fundraising Amount: $${financialInputs.lastFundraisingAmount?.toLocaleString() || 0}
Last Fundraising Round: ${businessContext.lastFundraisingRound || 'Not provided'}
Total Fully Diluted Shares: ${totalFDShares.toLocaleString()}
Total Debt: $${financialInputs.totalDebt?.toLocaleString() || 0}
Annual Revenue: $${financialInputs.revenue?.toLocaleString() || 0}

${method === 'PWERM' ? `For PWERM, model 3 scenarios: IPO (20% prob), M&A (45% prob), Dissolution (35% prob).` : `For OPM, use Black-Scholes with: volatility 60-80% (appropriate for private co), risk-free rate 4.5%, time to liquidity 3-5 years.`}

Apply DLOM of 20-30% as appropriate.

Return JSON:
{
  "method": "${method}",
  "scenarios": [...],
  "weightedEquityValue": number,
  "fmvPerShare": number,
  "dlom": number,
  "adjustedFmvPerShare": number,
  "narrative": "2-3 paragraph explanation of the ${method} methodology and results"
}`
    }
  ];
  return ainativeChatJSON(messages, { maxTokens: 2048 });
}

// ─── Step 4: Reconcile Methods & Compute Final FMV ────────────────────────────
async function reconcileMethods(dcfResult, opmResult, comparablesResult, inputs) {
  const { financialInputs, businessContext } = inputs;
  const stage = businessContext.stage || 'seed';
  const isEarlyStage = ['seed', 'pre_seed', 'series_a'].includes(stage.toLowerCase());

  // Weight allocation: early stage favors market comps + OPM over DCF
  const weights = isEarlyStage
    ? { dcf: 0.20, opm: 0.50, marketComps: 0.30 }
    : { dcf: 0.35, opm: 0.40, marketComps: 0.25 };

  const revenue = financialInputs.revenue || 0;
  const selectedMultiple = comparablesResult?.selectedMultiple || 3;
  const marketCompsValue = revenue * selectedMultiple;
  const totalFDShares = inputs.capTableSnapshot?.totalFullyDilutedShares || 10000000;

  // Get equity values from each method
  const dcfEquityValue = dcfResult?.equityValue || 0;
  const opmFmvPerShare = opmResult?.adjustedFmvPerShare || opmResult?.fmvPerShare || 0;
  const opmEquityValue = opmFmvPerShare * totalFDShares;

  const weightedEquityValue =
    (dcfEquityValue * weights.dcf) +
    (opmEquityValue * weights.opm) +
    (marketCompsValue * weights.marketComps);

  const finalFmvPerShare = totalFDShares > 0 ? weightedEquityValue / totalFDShares : 0;

  const messages = [
    {
      role: 'user',
      content: `Reconcile these 409A valuation method results and write a conclusion:

DCF Equity Value: $${dcfEquityValue.toLocaleString()} (weight: ${weights.dcf * 100}%)
OPM/PWERM Equity Value: $${opmEquityValue.toLocaleString()} (weight: ${weights.opm * 100}%)
Market Comps Equity Value: $${marketCompsValue.toLocaleString()} (weight: ${weights.marketComps * 100}%)
Weighted Average Equity Value: $${weightedEquityValue.toLocaleString()}
Fully Diluted Shares: ${totalFDShares.toLocaleString()}
Final FMV per Common Share: $${finalFmvPerShare.toFixed(4)}

Company Stage: ${stage}
Industry: ${businessContext.industry || 'Not specified'}

Write a conclusion paragraph (3-4 sentences) explaining the weighting rationale and final FMV conclusion.
Return JSON: { "conclusionNarrative": "string" }`
    }
  ];

  const conclusion = await ainativeChatJSON(messages, { maxTokens: 512 });

  return {
    weights,
    dcfEquityValue,
    opmEquityValue,
    marketCompsValue,
    weightedEquityValue,
    finalFmvPerShare: parseFloat(finalFmvPerShare.toFixed(4)),
    conclusionNarrative: conclusion.conclusionNarrative
  };
}

// ─── Step 5: Draft Full Report ─────────────────────────────────────────────────
async function draftReport(inputs, comparablesResult, dcfResult, opmResult, reconciled) {
  const { businessContext, financialInputs } = inputs;
  const messages = [
    {
      role: 'user',
      content: `Write a complete 409A valuation report for the following company.

COMPANY OVERVIEW:
- Description: ${businessContext.description}
- Industry: ${businessContext.industry}
- Stage: ${businessContext.stage}
- Business Model: ${businessContext.businessModel || 'Not specified'}
- Key Risks: ${businessContext.keyRisks || 'Not specified'}
- Competitive Advantages: ${businessContext.competitiveAdvantages || 'Not specified'}

FINANCIAL SNAPSHOT:
- Revenue: $${financialInputs.revenue?.toLocaleString() || 0}
- Growth Rate: ${financialInputs.revenueGrowthRate || 'N/A'}%
- Gross Margin: ${financialInputs.grossMargin || 'N/A'}%
- Cash on Hand: $${financialInputs.cashOnHand?.toLocaleString() || 'N/A'}
- Employees: ${financialInputs.employeeCount || 'N/A'}

METHODOLOGY RESULTS:
- DCF Equity Value: $${reconciled.dcfEquityValue.toLocaleString()}
- OPM/PWERM Equity Value: $${reconciled.opmEquityValue.toLocaleString()}
- Market Comps Value: $${reconciled.marketCompsValue.toLocaleString()}
- Final FMV per Common Share: $${reconciled.finalFmvPerShare}
- Comparable Companies Selected: ${comparablesResult.comparables?.map(c => c.companyName).join(', ')}

Write the following sections. Return as JSON with these exact keys:
{
  "executiveSummary": "1-2 paragraphs: company overview, purpose of valuation, final FMV conclusion",
  "methodologyDescription": "2-3 paragraphs: explain the three methods used (DCF, OPM/PWERM, Market Comps), why they were selected, and how they were weighted",
  "comparableAnalysis": "2 paragraphs: analysis of the comparable companies selected, revenue multiples observed, and how they inform the valuation",
  "dcfAnalysis": "2 paragraphs: DCF assumptions (discount rate, growth projections, terminal value) and results",
  "opmAnalysis": "2 paragraphs: OPM or PWERM methodology, key inputs (volatility, time to liquidity, scenarios), and results",
  "riskFactors": "1 paragraph: key risk factors that affect this valuation",
  "conclusionNarrative": "${reconciled.conclusionNarrative}"
}`
    }
  ];
  return ainativeChatJSON(messages, { maxTokens: 4096 });
}

// ─── Main Agent Runner ─────────────────────────────────────────────────────────
async function runValuationAgent(valuationId) {
  console.log(`[409A Agent] Starting valuation job for ${valuationId}`);

  // Find the valuation record
  let valuation = await Valuation409A.findOne({ valuationId });
  if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
  if (!valuation) throw new Error(`Valuation ${valuationId} not found`);

  const filterKey = valuation.valuationId
    ? { valuationId: valuation.valuationId }
    : { row_id: valuation.row_id };

  const financialInputs = valuation.financialInputs || {};
  const businessContext = valuation.businessContext || {};

  // Cap table snapshot (use stored or defaults)
  const capTableSnapshot = {
    totalFullyDilutedShares: valuation.capTableSnapshot?.totalFullyDilutedShares || 10000000
  };

  const inputs = { financialInputs, businessContext, capTableSnapshot };

  try {
    // Step 1: Research comparables
    await updateAIStatus(valuationId, 'researching', { aiStartedAt: new Date().toISOString() });
    console.log(`[409A Agent] Step 1: Researching comparables`);
    const comparablesResult = await researchComparables(inputs);

    // Step 2: DCF
    await updateAIStatus(valuationId, 'computing');
    console.log(`[409A Agent] Step 2: DCF analysis`);
    const dcfResult = await runDCF(inputs);

    // Step 3: OPM/PWERM
    console.log(`[409A Agent] Step 3: OPM/PWERM analysis`);
    const opmResult = await runOPMorPWERM(inputs, capTableSnapshot);

    // Step 4: Reconcile
    console.log(`[409A Agent] Step 4: Reconciling methods`);
    inputs.capTableSnapshot = capTableSnapshot;
    const reconciled = await reconcileMethods(dcfResult, opmResult, comparablesResult, inputs);

    // Step 5: Draft report
    console.log(`[409A Agent] Step 5: Drafting report`);
    const reportSections = await draftReport(inputs, comparablesResult, dcfResult, opmResult, reconciled);

    // Save all results back to the valuation record
    const now = new Date().toISOString();
    const updates = {
      aiStatus: 'draft_ready',
      aiCompletedAt: now,
      fairMarketValue: reconciled.finalFmvPerShare,
      aiSelectedComparables: comparablesResult.comparables || [],
      aiReport: {
        ...reportSections,
        generatedAt: now
      },
      aiReconciliation: reconciled,
      aiDCFResult: dcfResult,
      aiOPMResult: opmResult,
      status: 'accountant_review',
      updatedAt: now
    };

    await Valuation409A.updateOne(filterKey, { $set: updates });

    // Create accountant queue entry
    const queueId = `queue_${uuidv4()}`;
    await AccountantQueue.create({
      queueId,
      valuationId: valuation.valuationId || valuationId,
      companyId: valuation.companyId,
      status: 'unassigned',
      priority: 'normal',
      queuedAt: now,
      createdBy: 'ai_agent'
    });

    console.log(`[409A Agent] Completed. FMV: $${reconciled.finalFmvPerShare} | Queued for accountant review`);
    return { success: true, fmvPerShare: reconciled.finalFmvPerShare, queueId };

  } catch (error) {
    console.error(`[409A Agent] Failed:`, error.message);
    await Valuation409A.updateOne(filterKey, {
      $set: {
        aiStatus: 'failed',
        aiErrorMessage: error.message,
        updatedAt: new Date().toISOString()
      }
    });
    throw error;
  }
}

module.exports = { runValuationAgent };
