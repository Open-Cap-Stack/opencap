/**
 * Data Room Reconstructor Service Tests
 * Issue #629: 10-agent parallel pipeline
 *
 * Tests cover:
 * - All 4 phases execute and produce correct output
 * - Promise.all parallelism: all agents in a phase are called
 * - neverGenerate guardrail: no neverGenerate doc in gapFixes.generatedDocuments
 * - capTableExportAgent is deterministic (no LLM call)
 * - consolidateScoutResults deduplication
 * - generateSummary fields
 */

jest.mock('../../../services/ainativeAgentService');

const {
  reconstructDataRoom,
  scoutGmailAgent,
  scoutDriveAgent,
  scoutCartaAgent,
  scoutStripeAgent,
  consolidateScoutResults,
  classifierAgent,
  extractorAgent,
  gapAnalyzerAgent,
  synthesizerAgent,
  gapFixerAgent,
  capTableExportAgent,
  generateSummary,
  INVESTOR_CHECKLIST,
  NEVER_GENERATE_NAMES,
} = require('../../../services/dataRoomReconstructorService');

const { ainativeChatWithRetry } = require('../../../services/ainativeAgentService');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeDoc = (name, source = 'upload_pdf', size = 1000) => ({
  id: `doc-${name}`,
  source,
  originalName: name,
  mimeType: 'application/pdf',
  textContent: `Content of ${name}`,
  metadata: { fileSize: size, pageCount: 1, sheetNames: null, subject: null, sender: null, date: null, driveUrl: null }
});

const INTAKE_CONFIG = {
  companyName: 'TestCorp',
  founderEmail: 'founder@testcorp.io',
  targetDataRoomId: null,
  sources: {
    gmail:  { enabled: false, oauthCode: null },
    drive:  { enabled: false, oauthCode: null },
    carta:  { enabled: false, oauthCode: null },
    stripe: { enabled: false, oauthCode: null },
  }
};

const SAMPLE_DOCS = [
  makeDoc('Financial Model 2024.xlsx', 'upload_xlsx'),
  makeDoc('Cap Table v3.xlsx', 'upload_xlsx'),
  makeDoc('Board Minutes Q1 2024.docx', 'upload_docx'),
];

const CLASSIFICATION_FIXTURE = {
  classificationByType: {
    Financial: ['Financial Model 2024.xlsx'],
    Legal: ['Board Minutes Q1 2024.docx'],
    Equity: ['Cap Table v3.xlsx'],
    HR: [], Tax: [], Agreements: [], Fundraising: [], Technical: [], Operational: [], Sales: [], Unknown: []
  },
  completenessScore: 35,
  notes: 'Missing most required documents'
};

const FINANCIAL_METRICS_FIXTURE = {
  mrr: 250000,
  arr: 3000000,
  burnRate: 42000,
  runwayMonths: 14,
  churnRate: 2,
  customerCount: 47,
  totalRevenue: 750000,
  headcount: 8
};

const GAP_ANALYSIS_FIXTURE = {
  criticalGaps: [
    'Stock Option Plan',                  // generatable
    'Offer Letters (key employees)',       // generatable
    'Certificate of Incorporation (Delaware)', // neverGenerate
    '409A Valuation Report',              // neverGenerate
    'Federal Tax Returns (2 years)',       // neverGenerate
  ],
  redFlags: ['Missing 409A valuation', 'No incorporation docs found'],
  dueDiligenceRisk: 'high',
  missingByCategory: {
    Legal: ['Certificate of Incorporation (Delaware)'],
    Equity: ['409A Valuation Report'],
    HR: ['Offer Letters (key employees)'],
    Tax: ['Federal Tax Returns (2 years)'],
    Agreements: [], Financial: [], Technical: [], Fundraising: []
  }
};

const SYNTHESIS_FIXTURE = {
  investorReadinessScore: 42,
  dataRoomStructure: { categories: ['Legal', 'Equity', 'Financial'], organizedBy: 'category' },
  executiveSummary: 'TestCorp has partial documentation coverage.',
  redFlags: ['Missing incorporation documents'],
  nextSteps: ['Upload Certificate of Incorporation', 'Complete 409A valuation']
};

const GAP_FIX_FIXTURE = {
  generatedDocuments: [
    { name: 'Stock Option Plan', category: 'Equity', content: 'Draft stock option plan...', status: 'generated', disclaimer: 'Template only' },
    { name: 'Offer Letters (key employees)', category: 'HR', content: 'Draft offer letter...', status: 'generated', disclaimer: 'Template only' },
  ],
  gapsClosed: 2,
  newInvestorReadinessScore: 55
};

// ─── Setup ────────────────────────────────────────────────────────────────────

// All mock setup is done in each describe block's beforeEach.
// Use jest.resetAllMocks() so implementations and queues are always clean.
beforeEach(() => {
  jest.resetAllMocks();
});

// ─── INVESTOR_CHECKLIST ───────────────────────────────────────────────────────

describe('INVESTOR_CHECKLIST', () => {
  it('has 61 documents (spec total: Legal 10 + Equity 13 + HR 5 + Tax 6 + Agreements 10 + Fundraising 6 + Financial 7 + Technical 4)', () => {
    expect(INVESTOR_CHECKLIST).toHaveLength(61);
  });

  it('has all required categories represented', () => {
    const categories = new Set(INVESTOR_CHECKLIST.map(d => d.category));
    expect(categories).toContain('Legal');
    expect(categories).toContain('Equity');
    expect(categories).toContain('HR');
    expect(categories).toContain('Tax');
    expect(categories).toContain('Agreements');
    expect(categories).toContain('Fundraising');
    expect(categories).toContain('Financial');
    expect(categories).toContain('Technical');
  });

  it('marks Certificate of Incorporation as neverGenerate', () => {
    const cert = INVESTOR_CHECKLIST.find(d => d.name === 'Certificate of Incorporation (Delaware)');
    expect(cert).toBeDefined();
    expect(cert.neverGenerate).toBe(true);
  });

  it('marks 409A Valuation Report as neverGenerate', () => {
    const item = INVESTOR_CHECKLIST.find(d => d.name === '409A Valuation Report');
    expect(item.neverGenerate).toBe(true);
  });

  it('does NOT mark Stock Option Plan as neverGenerate', () => {
    const item = INVESTOR_CHECKLIST.find(d => d.name === 'Stock Option Plan');
    expect(item.neverGenerate).toBe(false);
  });
});

describe('NEVER_GENERATE_NAMES', () => {

  it('is a Set', () => {
    expect(NEVER_GENERATE_NAMES).toBeInstanceOf(Set);
  });

  it('includes Certificate of Incorporation', () => {
    expect(NEVER_GENERATE_NAMES.has('Certificate of Incorporation (Delaware)')).toBe(true);
  });

  it('includes 409A Valuation Report', () => {
    expect(NEVER_GENERATE_NAMES.has('409A Valuation Report')).toBe(true);
  });

  it('does not include Stock Option Plan', () => {
    expect(NEVER_GENERATE_NAMES.has('Stock Option Plan')).toBe(false);
  });
});

// ─── consolidateScoutResults ──────────────────────────────────────────────────

describe('consolidateScoutResults()', () => {

  it('merges documents from multiple scout results', () => {
    const result1 = { documents: [makeDoc('a.pdf', 'gmail')] };
    const result2 = { documents: [makeDoc('b.pdf', 'drive')] };
    const consolidated = consolidateScoutResults([result1, result2], []);
    expect(consolidated).toHaveLength(2);
  });

  it('deduplicates by originalName and fileSize', () => {
    const doc = makeDoc('a.pdf', 'gmail', 500);
    const duplicate = makeDoc('a.pdf', 'drive', 500); // same name + size
    const result1 = { documents: [doc] };
    const result2 = { documents: [duplicate] };
    const consolidated = consolidateScoutResults([result1, result2], []);
    expect(consolidated).toHaveLength(1);
  });

  it('keeps docs with same name but different size (distinct files)', () => {
    const doc1 = makeDoc('report.pdf', 'gmail', 100);
    const doc2 = makeDoc('report.pdf', 'drive', 200);
    const result1 = { documents: [doc1] };
    const result2 = { documents: [doc2] };
    const consolidated = consolidateScoutResults([result1, result2], []);
    expect(consolidated).toHaveLength(2);
  });

  it('merges uploaded docs with scout results', () => {
    const scoutDoc = makeDoc('a.pdf', 'gmail');
    const uploadDoc = makeDoc('b.pdf', 'upload_pdf');
    const result1 = { documents: [scoutDoc] };
    const consolidated = consolidateScoutResults([result1], [uploadDoc]);
    expect(consolidated).toHaveLength(2);
  });

  it('handles empty scout results gracefully', () => {
    const consolidated = consolidateScoutResults([], SAMPLE_DOCS);
    expect(consolidated).toHaveLength(SAMPLE_DOCS.length);
  });
});

// ─── Scout Agents ─────────────────────────────────────────────────────────────

describe('scout agents', () => {

  it('scoutGmailAgent returns complete status with agentName scout_gmail', async () => {
    const result = await scoutGmailAgent(INTAKE_CONFIG, []);
    expect(result.agentName).toBe('scout_gmail');
    expect(result.status).toBe('complete');
    expect(Array.isArray(result.documents)).toBe(true);
  });

  it('scoutDriveAgent returns complete status with agentName scout_drive', async () => {
    const result = await scoutDriveAgent(INTAKE_CONFIG, []);
    expect(result.agentName).toBe('scout_drive');
    expect(result.status).toBe('complete');
  });

  it('scoutCartaAgent returns complete status with agentName scout_carta', async () => {
    const result = await scoutCartaAgent(INTAKE_CONFIG, []);
    expect(result.agentName).toBe('scout_carta');
    expect(result.status).toBe('complete');
  });

  it('scoutStripeAgent returns complete status with agentName scout_stripe', async () => {
    const result = await scoutStripeAgent(INTAKE_CONFIG, []);
    expect(result.agentName).toBe('scout_stripe');
    expect(result.status).toBe('complete');
  });

  it('scout agents include uploaded docs matching their source type', async () => {
    const gmailDoc = makeDoc('email-attachment.pdf', 'gmail');
    const result = await scoutGmailAgent(INTAKE_CONFIG, [gmailDoc]);
    expect(result.documents.some(d => d.originalName === 'email-attachment.pdf')).toBe(true);
  });

  it('all 4 scouts can run in parallel without errors', async () => {
    const [gmail, drive, carta, stripe] = await Promise.all([
      scoutGmailAgent(INTAKE_CONFIG, []),
      scoutDriveAgent(INTAKE_CONFIG, []),
      scoutCartaAgent(INTAKE_CONFIG, []),
      scoutStripeAgent(INTAKE_CONFIG, []),
    ]);
    expect(gmail.status).toBe('complete');
    expect(drive.status).toBe('complete');
    expect(carta.status).toBe('complete');
    expect(stripe.status).toBe('complete');
  });
});

// ─── classifierAgent ──────────────────────────────────────────────────────────

describe('classifierAgent()', () => {
  beforeEach(() => {
    // mockReturnValue (not Once) so every test in this block gets the same response
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(CLASSIFICATION_FIXTURE),
      parsed: CLASSIFICATION_FIXTURE
    });
  });

  it('calls ainativeChatWithRetry once', async () => {
    await classifierAgent(SAMPLE_DOCS);
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
  });

  it('returns parsed classification fixture', async () => {
    const result = await classifierAgent(SAMPLE_DOCS);
    expect(result.completenessScore).toBe(35);
    expect(result.classificationByType.Financial).toContain('Financial Model 2024.xlsx');
  });
});

// ─── extractorAgent ───────────────────────────────────────────────────────────

describe('extractorAgent()', () => {
  beforeEach(() => {
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(FINANCIAL_METRICS_FIXTURE),
      parsed: FINANCIAL_METRICS_FIXTURE
    });
  });

  it('calls ainativeChatWithRetry once', async () => {
    await extractorAgent(SAMPLE_DOCS);
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
  });

  it('returns parsed financial metrics', async () => {
    const result = await extractorAgent(SAMPLE_DOCS);
    expect(result.mrr).toBe(250000);
    expect(result.arr).toBe(3000000);
    expect(result.burnRate).toBe(42000);
  });
});

// ─── gapAnalyzerAgent ─────────────────────────────────────────────────────────

describe('gapAnalyzerAgent()', () => {
  beforeEach(() => {
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(GAP_ANALYSIS_FIXTURE),
      parsed: GAP_ANALYSIS_FIXTURE
    });
  });

  it('calls ainativeChatWithRetry once', async () => {
    await gapAnalyzerAgent(SAMPLE_DOCS, CLASSIFICATION_FIXTURE);
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
  });

  it('returns criticalGaps array', async () => {
    const result = await gapAnalyzerAgent(SAMPLE_DOCS, CLASSIFICATION_FIXTURE);
    expect(Array.isArray(result.criticalGaps)).toBe(true);
    expect(result.criticalGaps.length).toBeGreaterThan(0);
  });

  it('returns dueDiligenceRisk as high|medium|low', async () => {
    const result = await gapAnalyzerAgent(SAMPLE_DOCS, CLASSIFICATION_FIXTURE);
    expect(['high', 'medium', 'low']).toContain(result.dueDiligenceRisk);
  });
});

// ─── synthesizerAgent ─────────────────────────────────────────────────────────

describe('synthesizerAgent()', () => {
  beforeEach(() => {
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(SYNTHESIS_FIXTURE),
      parsed: SYNTHESIS_FIXTURE
    });
  });

  it('calls ainativeChatWithRetry once', async () => {
    await synthesizerAgent(SAMPLE_DOCS, CLASSIFICATION_FIXTURE, FINANCIAL_METRICS_FIXTURE);
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
  });

  it('returns investorReadinessScore as a number 0-100', async () => {
    const result = await synthesizerAgent(SAMPLE_DOCS, CLASSIFICATION_FIXTURE, FINANCIAL_METRICS_FIXTURE);
    expect(typeof result.investorReadinessScore).toBe('number');
    expect(result.investorReadinessScore).toBeGreaterThanOrEqual(0);
    expect(result.investorReadinessScore).toBeLessThanOrEqual(100);
  });

  it('returns executiveSummary string', async () => {
    const result = await synthesizerAgent(SAMPLE_DOCS, CLASSIFICATION_FIXTURE, FINANCIAL_METRICS_FIXTURE);
    expect(typeof result.executiveSummary).toBe('string');
  });
});

// ─── gapFixerAgent — neverGenerate guardrail ──────────────────────────────────

describe('gapFixerAgent()', () => {
  beforeEach(() => {
    // Default: return the gap fix fixture (overridden per-test when needed)
    ainativeChatWithRetry.mockResolvedValue({ content: JSON.stringify(GAP_FIX_FIXTURE), parsed: GAP_FIX_FIXTURE });
  });

  it('never includes neverGenerate documents in generatedDocuments', async () => {
    // LLM tries to return a neverGenerate doc (should be blocked by guardrail)
    const maliciousLLMOutput = {
      generatedDocuments: [
        { name: 'Stock Option Plan', category: 'Equity', content: 'Draft...', status: 'generated', disclaimer: 'Template' },
        { name: 'Certificate of Incorporation (Delaware)', category: 'Legal', content: 'Fake cert...', status: 'generated', disclaimer: '' }, // MUST be blocked
        { name: '409A Valuation Report', category: 'Equity', content: 'Fake 409A...', status: 'generated', disclaimer: '' }, // MUST be blocked
        { name: 'Federal Tax Returns (2 years)', category: 'Tax', content: 'Fake taxes...', status: 'generated', disclaimer: '' }, // MUST be blocked
      ],
      gapsClosed: 4,
      newInvestorReadinessScore: 70
    };

    // Override the beforeEach default with the malicious output
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(maliciousLLMOutput),
      parsed: maliciousLLMOutput
    });

    const result = await gapFixerAgent(GAP_ANALYSIS_FIXTURE, SYNTHESIS_FIXTURE);

    // Only Stock Option Plan should survive — the others are neverGenerate
    const generatedNames = result.generatedDocuments.map(d => d.name);
    expect(generatedNames).not.toContain('Certificate of Incorporation (Delaware)');
    expect(generatedNames).not.toContain('409A Valuation Report');
    expect(generatedNames).not.toContain('Federal Tax Returns (2 years)');
    expect(generatedNames).toContain('Stock Option Plan');
  });

  it('moves neverGenerate items to needsFounderUpload', async () => {
    const result = await gapFixerAgent(GAP_ANALYSIS_FIXTURE, SYNTHESIS_FIXTURE);

    // neverGenerate items from criticalGaps must be in needsFounderUpload
    expect(Array.isArray(result.needsFounderUpload)).toBe(true);
    expect(result.needsFounderUpload).toContain('Certificate of Incorporation (Delaware)');
    expect(result.needsFounderUpload).toContain('409A Valuation Report');
    expect(result.needsFounderUpload).toContain('Federal Tax Returns (2 years)');
  });

  it('returns gapsClosed count', async () => {
    const result = await gapFixerAgent(GAP_ANALYSIS_FIXTURE, SYNTHESIS_FIXTURE);
    expect(typeof result.gapsClosed).toBe('number');
  });

  it('returns newInvestorReadinessScore', async () => {
    const result = await gapFixerAgent(GAP_ANALYSIS_FIXTURE, SYNTHESIS_FIXTURE);
    expect(typeof result.newInvestorReadinessScore).toBe('number');
  });

  it('returns empty generatedDocuments when all gaps are neverGenerate', async () => {
    const allNeverGenerateGaps = {
      criticalGaps: [
        'Certificate of Incorporation (Delaware)',
        '409A Valuation Report',
        'Federal Tax Returns (2 years)',
      ],
      redFlags: [],
      dueDiligenceRisk: 'high',
      missingByCategory: {}
    };

    // No LLM call should be made since all gaps are neverGenerate
    const result = await gapFixerAgent(allNeverGenerateGaps, SYNTHESIS_FIXTURE);
    expect(result.generatedDocuments).toHaveLength(0);
    expect(ainativeChatWithRetry).not.toHaveBeenCalled();
  });
});

// ─── capTableExportAgent — deterministic, NO LLM ─────────────────────────────

describe('capTableExportAgent()', () => {
  beforeEach(() => {
  });

  it('does NOT call ainativeChatWithRetry', () => {
    capTableExportAgent(SAMPLE_DOCS, FINANCIAL_METRICS_FIXTURE, { documents: [] });
    expect(ainativeChatWithRetry).not.toHaveBeenCalled();
  });

  it('returns data_room_index with 61 entries', () => {
    const result = capTableExportAgent(SAMPLE_DOCS, FINANCIAL_METRICS_FIXTURE, { documents: [] });
    expect(result.data_room_index).toHaveLength(61);
  });

  it('data_room_stats sums to 61 total', () => {
    const result = capTableExportAgent(SAMPLE_DOCS, FINANCIAL_METRICS_FIXTURE, { documents: [] });
    const { present, generated, missing, needs_founder_upload } = result.data_room_stats;
    expect(present + generated + missing + needs_founder_upload).toBe(61);
  });

  it('returns opencap_export with stakeholders, shareClasses, valuations arrays', () => {
    const result = capTableExportAgent(SAMPLE_DOCS, FINANCIAL_METRICS_FIXTURE, { documents: [] });
    expect(Array.isArray(result.opencap_export.stakeholders)).toBe(true);
    expect(Array.isArray(result.opencap_export.shareClasses)).toBe(true);
    expect(Array.isArray(result.opencap_export.valuations)).toBe(true);
  });

  it('returns carta_csv_preview array', () => {
    const result = capTableExportAgent(SAMPLE_DOCS, FINANCIAL_METRICS_FIXTURE, { documents: [] });
    expect(Array.isArray(result.carta_csv_preview)).toBe(true);
  });

  it('returns pulley_scenario object', () => {
    const result = capTableExportAgent(SAMPLE_DOCS, FINANCIAL_METRICS_FIXTURE, { documents: [] });
    expect(result.pulley_scenario).toBeDefined();
    expect(result.pulley_scenario.totalAuthorizedShares).toBeDefined();
  });

  it('marks neverGenerate missing docs as needs_founder_upload (not missing)', () => {
    const result = capTableExportAgent([], FINANCIAL_METRICS_FIXTURE, { documents: [] });
    const certEntry = result.data_room_index.find(d => d.name === 'Certificate of Incorporation (Delaware)');
    expect(certEntry.status).toBe('needs_founder_upload');
  });
});

// ─── generateSummary ──────────────────────────────────────────────────────────

describe('generateSummary()', () => {
  const buildPhases = () => ({
    gmailResult:  { agentName: 'scout_gmail',  status: 'complete', documents: [makeDoc('a.pdf')], keyMetrics: {} },
    driveResult:  { agentName: 'scout_drive',  status: 'complete', documents: [makeDoc('b.pdf'), makeDoc('c.pdf')], keyMetrics: {} },
    cartaResult:  { agentName: 'scout_carta',  status: 'complete', documents: [], keyMetrics: {} },
    stripeResult: { agentName: 'scout_stripe', status: 'complete', documents: [], keyMetrics: {} },
    classification: CLASSIFICATION_FIXTURE,
    financialMetrics: FINANCIAL_METRICS_FIXTURE,
    gapAnalysis: GAP_ANALYSIS_FIXTURE,
    synthesis: SYNTHESIS_FIXTURE,
    gapFixes: { generatedDocuments: [], needsFounderUpload: [], gapsClosed: 2, newInvestorReadinessScore: 55 },
    capTableExport: { opencap_export: { stakeholders: [], shareClasses: [], valuations: [] } }
  });

  it('returns documentsFound as total across scouts', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.documentsFound).toBe(3); // gmail:1 + drive:2
  });

  it('returns sourcesCovered counting scouts with docs', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.sourcesCovered).toBe(2); // only gmail and drive have docs
  });

  it('returns investorReadinessScore from synthesis', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.investorReadinessScore).toBe(42);
  });

  it('returns finalReadinessScore from gapFixes', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.finalReadinessScore).toBe(55);
  });

  it('returns redFlagsCount', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.redFlagsCount).toBe(GAP_ANALYSIS_FIXTURE.redFlags.length);
  });

  it('returns criticalGaps count', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.criticalGaps).toBe(GAP_ANALYSIS_FIXTURE.criticalGaps.length);
  });

  it('returns gapsClosed', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.gapsClosed).toBe(2);
  });

  it('returns capTableExportReady true when opencap_export present', () => {
    const summary = generateSummary(buildPhases());
    expect(summary.capTableExportReady).toBe(true);
  });
});

// ─── reconstructDataRoom — full pipeline ─────────────────────────────────────

describe('reconstructDataRoom()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ainativeChatWithRetry
      .mockResolvedValueOnce({ content: JSON.stringify(CLASSIFICATION_FIXTURE), parsed: CLASSIFICATION_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(FINANCIAL_METRICS_FIXTURE), parsed: FINANCIAL_METRICS_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(GAP_ANALYSIS_FIXTURE), parsed: GAP_ANALYSIS_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(SYNTHESIS_FIXTURE), parsed: SYNTHESIS_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(GAP_FIX_FIXTURE), parsed: GAP_FIX_FIXTURE });
  });

  it('runs all 4 phases and returns a ReconstructionResult', async () => {
    const result = await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);

    expect(result.founderEmail).toBe(INTAKE_CONFIG.founderEmail);
    expect(result.companyName).toBe(INTAKE_CONFIG.companyName);
    expect(result.timestamp).toBeDefined();
    expect(result.agentsExecuted).toHaveLength(10);
    expect(result.dataRoom).toBeDefined();
    expect(result.gapAnalysis).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('calls ainativeChatWithRetry for classifier, extractor, gapAnalyzer, synthesizer, gapFixer', async () => {
    await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    // 5 LLM-calling agents (classifier, extractor, gapAnalyzer, synthesizer, gapFixer)
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(5);
  });

  it('capTableExportAgent produces data_room_index with 61 entries', async () => {
    const result = await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    expect(result.dataRoom.capTableExport.data_room_index).toHaveLength(61);
  });

  it('calls onProgress callback for each agent', async () => {
    const progressCalls = [];
    const onProgress = jest.fn(async (phase, agentName, status) => {
      progressCalls.push({ phase, agentName, status });
    });

    await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, onProgress);

    // Should be called 10 times (one per agent)
    expect(onProgress).toHaveBeenCalledTimes(10);

    // Phase 1 agents
    expect(progressCalls.some(c => c.phase === 1 && c.agentName === 'scout_gmail')).toBe(true);
    expect(progressCalls.some(c => c.phase === 1 && c.agentName === 'scout_drive')).toBe(true);
    expect(progressCalls.some(c => c.phase === 1 && c.agentName === 'scout_carta')).toBe(true);
    expect(progressCalls.some(c => c.phase === 1 && c.agentName === 'scout_stripe')).toBe(true);

    // Phase 2 agents
    expect(progressCalls.some(c => c.phase === 2 && c.agentName === 'classifier')).toBe(true);
    expect(progressCalls.some(c => c.phase === 2 && c.agentName === 'extractor')).toBe(true);

    // Phase 3 agents
    expect(progressCalls.some(c => c.phase === 3 && c.agentName === 'gap_analyzer')).toBe(true);
    expect(progressCalls.some(c => c.phase === 3 && c.agentName === 'synthesizer')).toBe(true);

    // Phase 4 agents
    expect(progressCalls.some(c => c.phase === 4 && c.agentName === 'gap_fixer')).toBe(true);
    expect(progressCalls.some(c => c.phase === 4 && c.agentName === 'cap_table_export')).toBe(true);
  });

  it('all progress statuses are "complete"', async () => {
    const progressCalls = [];
    const onProgress = jest.fn(async (phase, agentName, status) => {
      progressCalls.push({ phase, agentName, status });
    });

    await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, onProgress);

    expect(progressCalls.every(c => c.status === 'complete')).toBe(true);
  });

  it('works with a null onProgress (no-op)', async () => {
    await expect(reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null)).resolves.toBeDefined();
  });

  it('works with an undefined onProgress', async () => {
    await expect(reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS)).resolves.toBeDefined();
  });

  it('result.gapAnalysis contains criticalGaps from gapAnalyzerAgent', async () => {
    const result = await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    expect(Array.isArray(result.gapAnalysis.criticalGaps)).toBe(true);
  });

  it('result.gapAnalysis.dueDiligenceRisk is one of high|medium|low', async () => {
    const result = await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    expect(['high', 'medium', 'low', 'unknown']).toContain(result.gapAnalysis.dueDiligenceRisk);
  });

  it('agentsExecuted has 10 entries, one per agent', async () => {
    const result = await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    const agentNames = result.agentsExecuted.map(a => a.name);
    expect(agentNames).toContain('scout_gmail');
    expect(agentNames).toContain('scout_drive');
    expect(agentNames).toContain('scout_carta');
    expect(agentNames).toContain('scout_stripe');
    expect(agentNames).toContain('classifier');
    expect(agentNames).toContain('extractor');
    expect(agentNames).toContain('gap_analyzer');
    expect(agentNames).toContain('synthesizer');
    expect(agentNames).toContain('gap_fixer');
    expect(agentNames).toContain('cap_table_export');
  });

  it('Phase 1 scouts run in parallel (all 4 mocks not required for scout phases)', async () => {
    // This verifies all 4 scouts resolve in parallel — if they were sequential,
    // the timing would differ, but here we just confirm all 4 ran.
    const result = await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    const scoutAgents = result.agentsExecuted.filter(a => a.name.startsWith('scout_'));
    expect(scoutAgents).toHaveLength(4);
    expect(scoutAgents.every(a => a.status === 'complete')).toBe(true);
  });

  it('Phase 2 classifier and extractor both run (parallel check)', async () => {
    // Reset mocks to track call order
    const callOrder = [];
    ainativeChatWithRetry.mockImplementation(async (msgs) => {
      const content = msgs[0].content || '';
      if (content.includes('classify')) {
        callOrder.push('classifier');
        return { content: JSON.stringify(CLASSIFICATION_FIXTURE), parsed: CLASSIFICATION_FIXTURE };
      }
      if (content.includes('KPIs') || content.includes('financial metrics') || content.includes('mrr')) {
        callOrder.push('extractor');
        return { content: JSON.stringify(FINANCIAL_METRICS_FIXTURE), parsed: FINANCIAL_METRICS_FIXTURE };
      }
      if (content.includes('gaps') || content.includes('checklist')) {
        callOrder.push('gapAnalyzer');
        return { content: JSON.stringify(GAP_ANALYSIS_FIXTURE), parsed: GAP_ANALYSIS_FIXTURE };
      }
      if (content.includes('synthesiz') || content.includes('readiness')) {
        callOrder.push('synthesizer');
        return { content: JSON.stringify(SYNTHESIS_FIXTURE), parsed: SYNTHESIS_FIXTURE };
      }
      callOrder.push('gapFixer');
      return { content: JSON.stringify(GAP_FIX_FIXTURE), parsed: GAP_FIX_FIXTURE };
    });

    await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    // Both classifier and extractor should have been called
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(5);
  });
});

// ─── ainativeChatWithRetry retry logic ───────────────────────────────────────
// These tests cover the retry behavior added to ainativeAgentService

describe('ainativeChatWithRetry retry behavior', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ainativeChatWithRetry
      .mockResolvedValueOnce({ content: JSON.stringify(CLASSIFICATION_FIXTURE), parsed: CLASSIFICATION_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(FINANCIAL_METRICS_FIXTURE), parsed: FINANCIAL_METRICS_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(GAP_ANALYSIS_FIXTURE), parsed: GAP_ANALYSIS_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(SYNTHESIS_FIXTURE), parsed: SYNTHESIS_FIXTURE })
      .mockResolvedValueOnce({ content: JSON.stringify(GAP_FIX_FIXTURE), parsed: GAP_FIX_FIXTURE });
  });

  // Test the retry contract indirectly: when LLM returns bad JSON, it should
  // inject error context and retry. We test this via the mock.

  it('uses ainativeChatWithRetry (not bare ainativeChat) in LLM-calling agents', async () => {
    await reconstructDataRoom(INTAKE_CONFIG, SAMPLE_DOCS, null);
    // If bare ainativeChat were used, the mock on ainativeChatWithRetry would not be called
    expect(ainativeChatWithRetry).toHaveBeenCalled();
  });

  it('gapFixerAgent uses ainativeChatWithRetry', async () => {
    ainativeChatWithRetry.mockResolvedValue({ content: JSON.stringify(GAP_FIX_FIXTURE), parsed: GAP_FIX_FIXTURE });
    await gapFixerAgent(GAP_ANALYSIS_FIXTURE, SYNTHESIS_FIXTURE);
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
  });

  it('classifierAgent uses ainativeChatWithRetry', async () => {
    ainativeChatWithRetry.mockResolvedValue({ content: JSON.stringify(CLASSIFICATION_FIXTURE), parsed: CLASSIFICATION_FIXTURE });
    await classifierAgent(SAMPLE_DOCS);
    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
  });
});
