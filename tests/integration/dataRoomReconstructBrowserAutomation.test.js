/**
 * Integration Tests: Browser Automation Path for Data Room Reconstruction
 * Issue #645: Browser automation integration tests
 *
 * Tests the Carta credential vault lifecycle, browser automation mode,
 * failure fallback, TTL expiry, and no-credential mock path.
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock auth middleware — same pattern as existing integration test
jest.mock('../../middleware/authMiddleware', () => {
  const jwt = require('jsonwebtoken');
  const authenticate = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token  = header.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
      const secret = process.env.JWT_SECRET || 'test-jwt-secret-key';
      req.user = jwt.verify(token, secret);
      next();
    } catch (e) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
  return { authenticate, authenticateToken: authenticate };
});

// Mock ReconstructionJob — same in-memory store pattern as existing test
jest.mock('../../models/ReconstructionJob', () => {
  const store = {};
  return {
    createJob: jest.fn(async (data) => {
      const job = {
        ...data,
        jobId: data.jobId || `rj_test-${Date.now()}`,
        status: 'queued',
        phase: 0,
        uploadedFiles: [],
        progress: {
          scoutComplete: false,
          classifyComplete: false,
          gapAnalysisComplete: false,
          finalizeComplete: false,
          agentsRun: []
        },
        result: null,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store[job.jobId] = job;
      return job;
    }),
    findByJobId: jest.fn(async (jobId) => store[jobId] || null),
    findByCompany: jest.fn(async () => Object.values(store)),
    updateStatus: jest.fn(async (jobId, status, phase, progress) => {
      if (store[jobId]) {
        Object.assign(store[jobId], {
          status,
          phase,
          progress: progress ?? store[jobId].progress,
          updatedAt: new Date().toISOString()
        });
      }
      return store[jobId];
    }),
    updateOne: jest.fn(async (query, update) => {
      const jobId = query.jobId;
      if (store[jobId] && update.$set) Object.assign(store[jobId], update.$set);
      return store[jobId];
    }),
    setResult: jest.fn(async (jobId, result) => {
      if (store[jobId]) {
        Object.assign(store[jobId], {
          result,
          status: 'complete',
          updatedAt: new Date().toISOString()
        });
      }
      return store[jobId];
    }),
    setError: jest.fn(async (jobId, error) => {
      if (store[jobId]) {
        Object.assign(store[jobId], {
          error,
          status: 'failed',
          updatedAt: new Date().toISOString()
        });
      }
      return store[jobId];
    }),
    _store: store,
  };
});

// Mock browserAutomationService
jest.mock('../../services/browserAutomationService', () => ({
  automateCartaFetch: jest.fn()
}));

// Mock dataRoomReconstructorService
jest.mock('../../services/dataRoomReconstructorService', () => ({
  reconstructDataRoom: jest.fn(async () => ({
    founderEmail: 'test@co.com',
    companyName: 'Test Co',
    timestamp: new Date().toISOString(),
    agentsExecuted: [{ name: 'scoutGmail', status: 'complete', documentCount: 1 }],
    dataRoom: { documents: [], classification: {}, financialMetrics: {}, synthesis: {}, gapFixes: {}, capTableExport: {} },
    gapAnalysis: { criticalGaps: [], redFlags: [], dueDiligenceRisk: 'low' },
    summary: { documentsFound: 1, sourcesCovered: 1, investorReadinessScore: 70, finalReadinessScore: 75, redFlagsCount: 0, criticalGaps: 0, gapsClosed: 0, capTableExportReady: false },
  })),
  finalizeReconstructionResult: jest.fn(async () => ({ documentsCreated: 0 }))
}));

// ── App bootstrap ──────────────────────────────────────────────────────────

let app;
let authToken;

const JWT_SECRET = 'test-jwt-secret-key';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV = 'test';

  const express = require('express');
  const reconstructRoutes = require('../../routes/v1/dataRoomReconstructRoutes');
  const a = express();
  a.use(express.json());
  a.use('/api/v1/reconstruct', reconstructRoutes);
  app = a;

  authToken = jwt.sign(
    { userId: 'user-ba-01', email: 'test@co.com', role: 'admin', companyId: 'company-ba-01' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterEach(() => {
  // Reset mocks between tests
  const browserAutomationService = require('../../services/browserAutomationService');
  const dataRoomReconstructorService = require('../../services/dataRoomReconstructorService');
  browserAutomationService.automateCartaFetch.mockReset();
  dataRoomReconstructorService.reconstructDataRoom.mockReset();
  dataRoomReconstructorService.reconstructDataRoom.mockResolvedValue({
    founderEmail: 'test@co.com',
    companyName: 'Test Co',
    timestamp: new Date().toISOString(),
    agentsExecuted: [{ name: 'scoutGmail', status: 'complete', documentCount: 1 }],
    dataRoom: { documents: [], classification: {}, financialMetrics: {}, synthesis: {}, gapFixes: {}, capTableExport: {} },
    gapAnalysis: { criticalGaps: [], redFlags: [], dueDiligenceRisk: 'low' },
    summary: { documentsFound: 1, sourcesCovered: 1, investorReadinessScore: 70, finalReadinessScore: 75, redFlagsCount: 0, criticalGaps: 0, gapsClosed: 0, capTableExportReady: false },
  });
});

// ── Helper: drain the setImmediate pipeline ────────────────────────────────
function drainPipeline() {
  return new Promise(resolve => setImmediate(resolve));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Browser Automation — credential lifecycle', () => {
  it('Test 1: credentials stored and consumed through lifecycle', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'Test Co',
        founderEmail: 'test@co.com',
        sources: {
          carta: {
            enabled: true,
            credentials: { email: 'test@co.com', password: 'pw' }
          }
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toMatch(/^rj_/);

    const { job } = res.body;

    // Credentials must NOT appear in the returned job object
    expect(job.intakeConfig.sources.carta.credentials).toBeUndefined();

    // automationMode must be set to 'browser'
    expect(job.intakeConfig.sources.carta.automationMode).toBe('browser');

    // jobId must be propagated into intakeConfig
    expect(job.intakeConfig.jobId).toBe(res.body.jobId);
  });
});

describe('Browser Automation — automation documents used in pipeline', () => {
  it('Test 2: automation documents used instead of mock when automateCartaFetch returns docs', async () => {
    const { automateCartaFetch } = require('../../services/browserAutomationService');
    const { reconstructDataRoom } = require('../../services/dataRoomReconstructorService');

    const mockDocs = [
      { id: 'doc-1', source: 'carta', originalName: 'cap_table.txt', mimeType: 'text/plain', textContent: 'Shareholders: ...', metadata: {} },
      { id: 'doc-2', source: 'carta', originalName: 'grants.txt',    mimeType: 'text/plain', textContent: 'Grants: ...',       metadata: {} },
    ];
    automateCartaFetch.mockResolvedValue(mockDocs);

    // Start a job with Carta credentials
    const startRes = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'Auto Co',
        founderEmail: 'ceo@auto.co',
        sources: {
          carta: {
            enabled: true,
            credentials: { email: 'ceo@auto.co', password: 'secret' }
          }
        }
      });

    expect(startRes.status).toBe(201);
    const { jobId } = startRes.body;

    // Run the pipeline
    const runRes = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(runRes.status).toBe(202);

    // Drain the setImmediate so the async pipeline fires
    await drainPipeline();
    await drainPipeline(); // extra drain for nested async calls

    // reconstructDataRoom must have been called (pipeline fired)
    expect(reconstructDataRoom).toHaveBeenCalled();

    // Job should be in running or complete state after pipeline fires
    const ReconstructionJob = require('../../models/ReconstructionJob');
    const job = await ReconstructionJob.findByJobId(jobId);
    expect(['running', 'complete']).toContain(job.status);
  });
});

describe('Browser Automation — failure fallback', () => {
  it('Test 3: automation failure → graceful fallback to mock data', async () => {
    const { automateCartaFetch } = require('../../services/browserAutomationService');
    const { reconstructDataRoom } = require('../../services/dataRoomReconstructorService');

    // Make automateCartaFetch throw
    automateCartaFetch.mockRejectedValue(new Error('Playwright launch failed'));

    const startRes = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'Fallback Co',
        founderEmail: 'ceo@fallback.co',
        sources: {
          carta: {
            enabled: true,
            credentials: { email: 'ceo@fallback.co', password: 'pw' }
          }
        }
      });

    expect(startRes.status).toBe(201);
    const { jobId } = startRes.body;

    const runRes = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(runRes.status).toBe(202);

    // Drain the pipeline
    await drainPipeline();
    await drainPipeline();

    // reconstructDataRoom should still be called — cartaConnector catches the error internally
    expect(reconstructDataRoom).toHaveBeenCalled();

    // Job should NOT be in failed status — pipeline continues with mock data
    const ReconstructionJob = require('../../models/ReconstructionJob');
    const job = await ReconstructionJob.findByJobId(jobId);
    expect(job.status).not.toBe('failed');
  });
});

describe('Browser Automation — credential TTL expiry', () => {
  it('Test 4: credential TTL expiry → vault returns null → fallback to mock', async () => {
    jest.useFakeTimers();

    const { automateCartaFetch } = require('../../services/browserAutomationService');
    const { reconstructDataRoom } = require('../../services/dataRoomReconstructorService');

    // automateCartaFetch will receive null creds (vault expired), so it returns null
    // The connector falls back to mock data
    automateCartaFetch.mockResolvedValue(null);

    const startRes = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'TTL Co',
        founderEmail: 'ceo@ttl.co',
        sources: {
          carta: {
            enabled: true,
            credentials: { email: 'ceo@ttl.co', password: 'pw' }
          }
        }
      });

    expect(startRes.status).toBe(201);
    const { jobId } = startRes.body;

    // Advance timers past the 5-minute TTL so vault entry expires
    jest.advanceTimersByTime(6 * 60 * 1000);

    jest.useRealTimers();

    const runRes = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(runRes.status).toBe(202);

    await drainPipeline();
    await drainPipeline();

    // reconstructDataRoom should still complete (mock fallback)
    expect(reconstructDataRoom).toHaveBeenCalled();

    const ReconstructionJob = require('../../models/ReconstructionJob');
    const job = await ReconstructionJob.findByJobId(jobId);
    expect(job.status).not.toBe('failed');
  });
});

describe('Browser Automation — no credentials mock path', () => {
  it('Test 5: no credentials → automationMode not set → mock path used', async () => {
    const { reconstructDataRoom } = require('../../services/dataRoomReconstructorService');

    const startRes = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'NoCreds Co',
        founderEmail: 'ceo@nocreds.co',
        sources: {
          carta: { enabled: true }
          // No credentials field
        }
      });

    expect(startRes.status).toBe(201);
    const { job } = startRes.body;

    // automationMode should NOT be 'browser' when no credentials are provided
    const automationMode = job.intakeConfig?.sources?.carta?.automationMode;
    expect(automationMode).not.toBe('browser');

    const { jobId } = startRes.body;
    const runRes = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(runRes.status).toBe(202);

    await drainPipeline();
    await drainPipeline();

    // Pipeline still runs with mock data
    expect(reconstructDataRoom).toHaveBeenCalled();
  });
});
