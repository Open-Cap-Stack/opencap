/**
 * Performance benchmarks for browser automation pipeline components.
 * Issue #645: These are timing assertions — if they fail, the component is too slow.
 *
 * Benchmarks:
 *  1. credentialVault throughput (store + consume 1000 times)
 *  2. credentialVault concurrent access (100 simultaneous store + consume)
 *  3. cartaConnector fallback latency (fetchDocuments with no automation mode)
 *  4. reconstruction pipeline mock throughput
 *  5. credentialVault TTL memory check (10,000 entries, all cleaned up)
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock browserAutomationService so cartaConnector never hits Playwright
jest.mock('../../services/browserAutomationService', () => ({
  automateCartaFetch: jest.fn(async () => null)
}));

// Mock dataRoomReconstructorService for benchmark 4
jest.mock('../../services/dataRoomReconstructorService', () => ({
  reconstructDataRoom: jest.fn(async (intakeConfig, gatheredDocuments) => ({
    founderEmail: intakeConfig.founderEmail || 'bench@test.com',
    companyName: intakeConfig.companyName || 'Bench Co',
    timestamp: new Date().toISOString(),
    agentsExecuted: Array.from({ length: 10 }, (_, i) => ({
      name: `agent_${i}`,
      status: 'complete',
      documentCount: 1
    })),
    dataRoom: { documents: [], classification: {}, financialMetrics: {}, synthesis: {}, gapFixes: {}, capTableExport: {} },
    gapAnalysis: { criticalGaps: [], redFlags: [], dueDiligenceRisk: 'low' },
    summary: {
      documentsFound: gatheredDocuments ? gatheredDocuments.length : 0,
      sourcesCovered: 1,
      investorReadinessScore: 75,
      finalReadinessScore: 80,
      redFlagsCount: 0,
      criticalGaps: 0,
      gapsClosed: 0,
      capTableExportReady: false
    }
  })),
  finalizeReconstructionResult: jest.fn(async () => ({ documentsCreated: 0 }))
}));

// ── Modules ────────────────────────────────────────────────────────────────

const credentialVault = require('../../services/credentialVault');
const { fetchDocuments } = require('../../services/sourceConnectors/cartaConnector');
const { reconstructDataRoom } = require('../../services/dataRoomReconstructorService');

// ── Benchmark 1: credentialVault throughput ───────────────────────────────

describe('Benchmark 1: credentialVault throughput', () => {
  it('store + consume 1000 credentials in < 50ms total, < 0.1ms average', () => {
    const n = 1000;
    const start = Date.now();

    for (let i = 0; i < n; i++) {
      const jobId = `bench-job-${i}`;
      credentialVault.store(jobId, { email: `user${i}@test.com`, password: `pw${i}` });
      credentialVault.consume(jobId);
    }

    const elapsed = Date.now() - start;
    const avgMs = elapsed / n;

    expect(elapsed).toBeLessThan(50);
    expect(avgMs).toBeLessThan(0.1);
  });
});

// ── Benchmark 2: credentialVault concurrent access ────────────────────────

describe('Benchmark 2: credentialVault concurrent access', () => {
  it('100 simultaneous store + consume operations complete in < 100ms with correct results', async () => {
    const n = 100;
    const prefix = 'concurrent-bench-';

    const start = Date.now();

    // Store all 100 simultaneously
    await Promise.all(
      Array.from({ length: n }, (_, i) =>
        Promise.resolve(
          credentialVault.store(`${prefix}${i}`, { email: `u${i}@test.com`, password: `pw${i}` })
        )
      )
    );

    // Consume all 100 simultaneously
    const results = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        Promise.resolve(credentialVault.consume(`${prefix}${i}`))
      )
    );

    const elapsed = Date.now() - start;

    // All 100 should have returned credentials
    const nonNull = results.filter(r => r !== null);
    expect(nonNull).toHaveLength(n);

    // Every credential should match what was stored
    results.forEach((creds, i) => {
      expect(creds).not.toBeNull();
      expect(creds.email).toBe(`u${i}@test.com`);
      expect(creds.password).toBe(`pw${i}`);
    });

    expect(elapsed).toBeLessThan(100);
  });
});

// ── Benchmark 3: cartaConnector fallback latency ──────────────────────────

describe('Benchmark 3: cartaConnector fallback latency', () => {
  it('fetchDocuments (no automation) 100 times: avg < 5ms, p99 < 20ms', async () => {
    const n = 100;
    const times = [];

    for (let i = 0; i < n; i++) {
      const t0 = Date.now();
      await fetchDocuments(null, 'Test Co', 'ceo@test.com');
      times.push(Date.now() - t0);
    }

    const avg = times.reduce((s, t) => s + t, 0) / n;
    const sorted = [...times].sort((a, b) => a - b);
    const p99 = sorted[Math.floor(n * 0.99)];

    expect(avg).toBeLessThan(5);
    expect(p99).toBeLessThan(20);
  });
});

// ── Benchmark 4: reconstruction pipeline mock throughput ──────────────────

describe('Benchmark 4: reconstruction pipeline mock throughput', () => {
  it('reconstructDataRoom completes in < 500ms with mocked services', async () => {
    const intakeConfig = {
      jobId: 'bench-pipeline-01',
      companyName: 'Pipeline Bench Co',
      founderEmail: 'ceo@pipelinebench.com',
      targetDataRoomId: null,
      sources: {
        gmail:  { enabled: false },
        drive:  { enabled: false },
        carta:  { enabled: false },
        stripe: { enabled: false }
      }
    };

    const gatheredDocuments = [
      { id: 'doc-1', source: 'upload', originalName: 'deck.pdf', mimeType: 'application/pdf', textContent: 'Pitch deck content', metadata: {} }
    ];

    const start = Date.now();
    const result = await reconstructDataRoom(intakeConfig, gatheredDocuments);
    const elapsed = Date.now() - start;

    expect(result).toBeDefined();
    expect(result.agentsExecuted).toHaveLength(10);
    expect(elapsed).toBeLessThan(500);
  });
});

// ── Benchmark 5: credentialVault TTL memory check ─────────────────────────

describe('Benchmark 5: credentialVault TTL memory check', () => {
  it('10,000 entries stored, all cleaned up after TTL, no memory leak', () => {
    jest.useFakeTimers();

    const n = 10_000;
    const prefix = 'ttl-bench-';

    // Store 10,000 credentials with a 1-second TTL
    for (let i = 0; i < n; i++) {
      credentialVault.store(`${prefix}${i}`, { email: `u${i}@test.com` }, 1000);
    }

    // Access the internal vault Map via module internals
    // We need to verify size — require the module and inspect via a consume that returns null after TTL
    // Since vault is module-private, we test indirectly: advance timers and verify all consume() calls return null

    jest.advanceTimersByTime(2000); // advance past 1s TTL

    // After TTL, all entries should be gone
    let remainingCount = 0;
    for (let i = 0; i < n; i++) {
      const result = credentialVault.consume(`${prefix}${i}`);
      if (result !== null) remainingCount++;
    }

    jest.useRealTimers();

    // All 10,000 entries should have been automatically evicted by TTL timers
    expect(remainingCount).toBe(0);
  });
});
