/**
 * E2E Tests: Data Room Reconstruction — full HTTP lifecycle
 * Issue #645: End-to-end test for the reconstruction pipeline
 *
 * Tests the complete job lifecycle against a real Express app instance
 * with all external services mocked. Validates the HTTP contract from
 * start → upload → run → poll → finalize.
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const express = require('express');

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../middleware/authMiddleware', () => {
  const jwt = require('jsonwebtoken');
  const authenticate = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token  = header.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'e2e-jwt-secret');
      next();
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
  return { authenticate, authenticateToken: authenticate };
});

jest.mock('../../models/ReconstructionJob', () => {
  const store = {};
  return {
    createJob: jest.fn(async (data) => {
      const job = {
        ...data,
        jobId: data.jobId || `rj_e2e-${Date.now()}`,
        status: 'queued',
        phase: 0,
        uploadedFiles: [],
        progress: { scoutComplete: false, classifyComplete: false, gapAnalysisComplete: false, finalizeComplete: false, agentsRun: [] },
        result: null,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store[job.jobId] = job;
      return job;
    }),
    findByJobId: jest.fn(async (jobId) => store[jobId] || null),
    findByCompany: jest.fn(async () => Object.values(store)),
    updateStatus: jest.fn(async (jobId, status, phase, progress) => {
      if (store[jobId]) Object.assign(store[jobId], { status, phase, progress: progress ?? store[jobId].progress, updatedAt: new Date().toISOString() });
      return store[jobId];
    }),
    updateOne: jest.fn(async (query, update) => {
      const jobId = query.jobId;
      if (store[jobId] && update.$set) Object.assign(store[jobId], update.$set);
      return store[jobId];
    }),
    setResult: jest.fn(async (jobId, result) => {
      if (store[jobId]) Object.assign(store[jobId], { result, status: 'complete', updatedAt: new Date().toISOString() });
      return store[jobId];
    }),
    setError: jest.fn(async (jobId, error) => {
      if (store[jobId]) Object.assign(store[jobId], { error, status: 'failed', updatedAt: new Date().toISOString() });
      return store[jobId];
    }),
    _store: store,
  };
});

jest.mock('../../services/dataRoomReconstructorService', () => ({
  reconstructDataRoom: jest.fn(async (intakeConfig) => ({
    founderEmail: intakeConfig.founderEmail,
    companyName: intakeConfig.companyName,
    timestamp: new Date().toISOString(),
    agentsExecuted: [
      { name: 'scoutGmail',   status: 'complete', documentCount: 3 },
      { name: 'scoutDrive',   status: 'complete', documentCount: 2 },
      { name: 'scoutCarta',   status: 'complete', documentCount: 4 },
      { name: 'scoutStripe',  status: 'complete', documentCount: 1 },
      { name: 'classifier',   status: 'complete', documentCount: 10 },
      { name: 'extractor',    status: 'complete', documentCount: 10 },
      { name: 'gapAnalyzer',  status: 'complete', documentCount: 0  },
      { name: 'synthesizer',  status: 'complete', documentCount: 0  },
      { name: 'gapFixer',     status: 'complete', documentCount: 5  },
      { name: 'capTableExport', status: 'complete', documentCount: 1 },
    ],
    dataRoom: {
      documents: [
        { id: 'doc-1', name: 'Pitch Deck', category: 'Fundraising', status: 'present' },
        { id: 'doc-2', name: 'Cap Table', category: 'Equity', status: 'present' },
      ],
      classification: { total: 15, byCategory: {} },
      financialMetrics: { mrr: 50000, burnRate: 30000 },
      synthesis: { executiveSummary: 'Strong early-stage startup' },
      gapFixes: { fixed: 5 },
      capTableExport: { shareholders: 8, totalShares: 10000000 },
    },
    gapAnalysis: { criticalGaps: ['409A Valuation missing'], redFlags: [], dueDiligenceRisk: 'medium' },
    summary: {
      documentsFound: 10,
      sourcesCovered: 4,
      investorReadinessScore: 68,
      finalReadinessScore: 74,
      redFlagsCount: 0,
      criticalGaps: 1,
      gapsClosed: 5,
      capTableExportReady: true,
    },
  })),
  finalizeReconstructionResult: jest.fn(async () => ({
    documentsCreated: 2,
    stakeholdersCreated: 8,
    message: 'Data room finalized successfully',
  })),
}));

jest.mock('../../services/browserAutomationService', () => ({
  automateCartaFetch: jest.fn(async () => null),
}));

// ── App bootstrap ──────────────────────────────────────────────────────────

const JWT_SECRET = 'e2e-jwt-secret';
let app;
let token;

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV = 'test';

  const reconstructRoutes = require('../../routes/v1/dataRoomReconstructRoutes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/reconstruct', reconstructRoutes);

  token = jwt.sign(
    { userId: 'e2e-user-01', email: 'founder@e2eco.com', role: 'admin', companyId: 'e2e-company-01' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

function drain() {
  return new Promise(resolve => setImmediate(resolve));
}

// ── E2E: Full lifecycle ────────────────────────────────────────────────────

describe('E2E: full reconstruction lifecycle', () => {
  let jobId;

  it('Step 1 — POST /start creates a queued job', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyName: 'E2E Corp',
        founderEmail: 'founder@e2eco.com',
        sources: {
          gmail:  { enabled: true },
          drive:  { enabled: true },
          carta:  { enabled: true },
          stripe: { enabled: true },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toMatch(/^rj_/);
    expect(res.body.job.status).toBe('queued');
    expect(res.body.job.intakeConfig.companyName).toBe('E2E Corp');
    jobId = res.body.jobId;
  });

  it('Step 2 — POST /:jobId/upload accepts files', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const csvBuffer = Buffer.from('name,shares\nAlice,500000\nBob,250000\n');

    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', pdfBuffer, { filename: 'pitch_deck.pdf', contentType: 'application/pdf' })
      .attach('files', csvBuffer, { filename: 'cap_table.csv',  contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filesReceived).toBe(2);
  });

  it('Step 3 — POST /:jobId/run starts the pipeline (202)', async () => {
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('running');

    // Let the async pipeline fire
    await drain();
    await drain();
  });

  it('Step 4 — GET /status/:jobId shows running or complete', async () => {
    const res = await request(app)
      .get(`/api/v1/reconstruct/status/${jobId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['running', 'complete']).toContain(res.body.job.status);
  });

  it('Step 5 — POST /:jobId/run returns 409 when already running/complete', async () => {
    // Mark job complete to simulate pipeline done
    const ReconstructionJob = require('../../models/ReconstructionJob');
    await ReconstructionJob.setResult(jobId, { summary: { finalReadinessScore: 74 } });

    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('Step 6 — POST /:jobId/finalize succeeds on complete job', async () => {
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/finalize`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── E2E: Carta browser automation credential path ──────────────────────────

describe('E2E: Carta browser automation through wizard', () => {
  it('credentials flow through wizard without appearing in stored job', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyName: 'Carta E2E Co',
        founderEmail: 'founder@cartae2e.com',
        sources: {
          carta: {
            enabled: true,
            credentials: { email: 'founder@cartae2e.com', password: 'supersecret' },
          },
        },
      });

    expect(res.status).toBe(201);
    const { job, jobId: jid } = res.body;

    // Credentials stripped from stored job
    expect(job.intakeConfig.sources?.carta?.credentials).toBeUndefined();
    // automationMode set
    expect(job.intakeConfig.sources?.carta?.automationMode).toBe('browser');
    // jobId threaded into intakeConfig
    expect(job.intakeConfig.jobId).toBe(jid);
  });
});

// ── E2E: Error paths ───────────────────────────────────────────────────────

describe('E2E: error and edge-case paths', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .send({ companyName: 'X', founderEmail: 'x@x.com' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'Missing Email Co' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown jobId on status', async () => {
    const res = await request(app)
      .get('/api/v1/reconstruct/status/rj_doesnotexist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('rejects unsupported file type upload', async () => {
    const startRes = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'File Type Co', founderEmail: 'ceo@filetype.co' });

    const res = await request(app)
      .post(`/api/v1/reconstruct/${startRes.body.jobId}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', Buffer.from('#!/bin/bash\nrm -rf /'), { filename: 'malicious.sh', contentType: 'application/x-sh' });

    expect(res.status).toBe(400);
  });
});
