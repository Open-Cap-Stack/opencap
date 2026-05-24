/**
 * Integration Tests: AI Data Room Reconstruction Pipeline
 * Issue #636: Integration tests for reconstruction pipeline
 *
 * Tests the full job lifecycle:
 *   start → upload files → run pipeline → poll status → finalize
 * Uses mocked AINative responses to avoid real API calls.
 */

const request   = require('supertest');
const jwt       = require('jsonwebtoken');
const path      = require('path');
const fs        = require('fs');

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock auth middleware so tests don't need a live ZeroDB connection
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

// Mock ReconstructionJob so tests don't need ZeroDB
jest.mock('../../models/ReconstructionJob', () => {
  const store = {};
  return {
    createJob: jest.fn(async (data) => {
      const job = { ...data, jobId: data.jobId || `rj_test-${Date.now()}`, status: 'queued', phase: 0, uploadedFiles: [], progress: { scoutComplete: false, classifyComplete: false, gapAnalysisComplete: false, finalizeComplete: false, agentsRun: [] }, result: null, error: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
    _store: store, // exposed for test assertions
  };
});

// Mock the reconstructor service so tests don't call real LLMs
jest.mock('../../services/dataRoomReconstructorService', () => ({
  reconstructDataRoom: jest.fn(async (job) => ({
    founderEmail: job.intakeConfig.founderEmail,
    companyName: job.intakeConfig.companyName,
    timestamp: new Date().toISOString(),
    agentsExecuted: [{ name: 'scoutGmail', status: 'complete', documentCount: 2 }],
    dataRoom: { documents: [], classification: {}, financialMetrics: {}, synthesis: {}, gapFixes: {}, capTableExport: {} },
    gapAnalysis: { criticalGaps: [], redFlags: [], dueDiligenceRisk: 'low' },
    summary: { documentsFound: 2, sourcesCovered: 1, investorReadinessScore: 72, finalReadinessScore: 78, redFlagsCount: 0, criticalGaps: 0, gapsClosed: 1, capTableExportReady: true },
  })),
  finalizeReconstructionResult: jest.fn(async () => ({ documentsCreated: 0, stakeholdersCreated: 0, message: 'Finalized (test)' })),
}));

// ── App bootstrap ──────────────────────────────────────────────────────────

let app;
let authToken;

const JWT_SECRET = 'test-jwt-secret-key';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV = 'test';

  // Build a minimal express app with just the reconstruct routes
  const express = require('express');
  const reconstructRoutes = require('../../routes/v1/dataRoomReconstructRoutes');
  const a = express();
  a.use(express.json());
  a.use('/api/v1/reconstruct', reconstructRoutes);
  app = a;

  authToken = jwt.sign(
    { userId: 'user-test-01', email: 'test@example.com', role: 'admin', companyId: 'company-test-01' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/reconstruct/start', () => {
  it('creates a new reconstruction job', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Acme Corp', founderEmail: 'founder@acme.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toMatch(/^rj_/);
    expect(res.body.job.status).toBe('queued');
    expect(res.body.job.intakeConfig.companyName).toBe('Acme Corp');
  });

  it('returns 400 if companyName or founderEmail missing', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Acme Corp' }); // missing founderEmail

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .send({ companyName: 'Acme Corp', founderEmail: 'founder@acme.com' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/reconstruct/status/:jobId', () => {
  let jobId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Status Test Co', founderEmail: 'ceo@statustest.com' });
    jobId = res.body.jobId;
  });

  it('returns job status', async () => {
    const res = await request(app)
      .get(`/api/v1/reconstruct/status/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.jobId).toBe(jobId);
    expect(res.body.job.status).toBe('queued');
  });

  it('returns 404 for unknown jobId', async () => {
    const res = await request(app)
      .get('/api/v1/reconstruct/status/rj_nonexistent')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/reconstruct/:jobId/upload', () => {
  let jobId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Upload Co', founderEmail: 'cto@upload.co' });
    jobId = res.body.jobId;
  });

  it('accepts a PDF file upload', async () => {
    // Create a minimal valid PDF in memory
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/upload`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', pdfContent, { filename: 'pitch_deck.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filesReceived).toBe(1);
    expect(res.body.files[0].originalName).toBe('pitch_deck.pdf');
  });

  it('accepts a CSV file upload', async () => {
    const csvContent = Buffer.from('name,amount\nAlice,1000\nBob,2000\n');
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/upload`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', csvContent, { filename: 'cap_table.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects unsupported file types', async () => {
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/upload`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('alert("xss")'), { filename: 'malicious.js', contentType: 'application/javascript' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for unknown job', async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/rj_nonexistent/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('%PDF'), { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/reconstruct/:jobId/run', () => {
  let jobId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Run Co', founderEmail: 'ceo@run.co' });
    jobId = res.body.jobId;
  });

  it('accepts run request and returns 202', async () => {
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('running');
  });

  it('returns 409 if job is already complete', async () => {
    // Manually mark the job as complete in the mock store
    const ReconstructionJob = require('../../models/ReconstructionJob');
    await ReconstructionJob.setResult(jobId, { summary: { investorReadinessScore: 85 } });

    // Run attempt on a completed job should 409
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/run`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/reconstruct/jobs', () => {
  it('lists all jobs for the company', async () => {
    // Create a couple of jobs
    await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'List Co', founderEmail: 'ceo@list.co' });

    const res = await request(app)
      .get('/api/v1/reconstruct/jobs')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });
});

describe('DELETE /api/v1/reconstruct/:jobId', () => {
  let jobId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Delete Co', founderEmail: 'ceo@delete.co' });
    jobId = res.body.jobId;
  });

  it('cancels a job', async () => {
    const res = await request(app)
      .delete(`/api/v1/reconstruct/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify cancelled status
    const status = await request(app)
      .get(`/api/v1/reconstruct/status/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(status.body.job.status).toBe('cancelled');
  });

  it('returns 404 for unknown job', async () => {
    const res = await request(app)
      .delete('/api/v1/reconstruct/rj_nonexistent')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/reconstruct/:jobId/finalize', () => {
  let jobId;

  beforeEach(async () => {
    const ReconstructionJob = require('../../models/ReconstructionJob');
    const res = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Finalize Co', founderEmail: 'ceo@finalize.co' });
    jobId = res.body.jobId;

    // Simulate pipeline completion
    await ReconstructionJob.setResult(jobId, { summary: { investorReadinessScore: 80 } });
  });

  it('finalizes a complete job', async () => {
    const res = await request(app)
      .post(`/api/v1/reconstruct/${jobId}/finalize`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 409 if job is not complete', async () => {
    // Create a fresh queued job
    const r = await request(app)
      .post('/api/v1/reconstruct/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ companyName: 'Not Done Co', founderEmail: 'ceo@notdone.co' });

    const res = await request(app)
      .post(`/api/v1/reconstruct/${r.body.jobId}/finalize`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(409);
  });
});
