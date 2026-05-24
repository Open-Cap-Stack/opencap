/**
 * Data Room Reconstruct Controller
 * Issue #631: AI Data Room Reconstruction — REST API controller
 *
 * Manages reconstruction job lifecycle:
 *   POST   /start          — create job
 *   POST   /:jobId/upload  — attach files before pipeline starts
 *   GET    /status/:jobId  — poll job status
 *   POST   /:jobId/run     — kick off pipeline (async, non-blocking)
 *   POST   /:jobId/finalize — push result into DataRoom / Stakeholders / etc.
 *   GET    /jobs           — list all jobs for company
 *   DELETE /:jobId         — cancel/delete job
 */

const { v4: uuidv4 } = require('uuid');
const ReconstructionJob = require('../models/ReconstructionJob');
const zipExtractionService = require('../services/zipExtractionService');

// Lazy-loaded so the module can be required before it is written
let _reconstructorService;
function getReconstructorService() {
  if (!_reconstructorService) {
    _reconstructorService = require('../services/dataRoomReconstructorService');
  }
  return _reconstructorService;
}

// ---------------------------------------------------------------------------
// POST /api/v1/reconstruct/start
// Body: { companyName, founderEmail, targetDataRoomId?, sources? }
// ---------------------------------------------------------------------------
exports.startJob = async (req, res) => {
  try {
    const userId    = req.user?.userId || req.user?.id || 'anonymous';
    const companyId = req.user?.companyId || req.body.companyId || 'default';

    const { companyName, founderEmail, targetDataRoomId, sources } = req.body;

    if (!companyName || !founderEmail) {
      return res.status(400).json({
        success: false,
        error: 'companyName and founderEmail are required',
      });
    }

    // Pre-generate jobId so it can be passed to credentialVault before DB write
    const jobId = `rj_${uuidv4()}`;

    // Detect and vault Carta credentials ephemerally — NEVER persisted to ZeroDB
    // Security: Morgan logs only method/URL/status/response-time — NOT request bodies,
    // so credentials in req.body are not exposed via the logging middleware.
    // Lazy-load vault to avoid circular deps
    const credentialVault = require('../services/credentialVault');

    const cartaSource = (sources && sources.carta) ? { ...sources.carta } : {};
    if (cartaSource.credentials) {
      // Store credentials ephemerally — NEVER persisted to ZeroDB
      credentialVault.store(jobId, cartaSource.credentials);
      delete cartaSource.credentials; // strip before DB write
      cartaSource.automationMode = 'browser';
      if (sources) sources.carta = cartaSource;
    }

    const job = await ReconstructionJob.createJob({
      jobId, // pre-generated
      companyId,
      userId,
      intakeConfig: {
        jobId,  // pipeline reads this to pass to connectors
        companyName,
        founderEmail,
        targetDataRoomId: targetDataRoomId || null,
        sources: sources || {
          gmail:  { enabled: false, oauthCode: null },
          drive:  { enabled: false, oauthCode: null },
          carta:  { enabled: false, oauthCode: null },
          stripe: { enabled: false, oauthCode: null },
        },
      },
    });

    return res.status(201).json({ success: true, jobId: job.jobId, job });
  } catch (err) {
    console.error('[reconstruct] startJob error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/reconstruct/:jobId/upload
// Multipart: field "files" — processed by dataRoomUpload middleware upstream
// ---------------------------------------------------------------------------
exports.uploadFiles = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ReconstructionJob.findByJobId(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }
    if (!['queued', 'intake'].includes(job.status)) {
      return res.status(409).json({
        success: false,
        error: `Cannot upload files to a job with status "${job.status}"`,
      });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files received' });
    }

    // Expand ZIPs into individual entries, keep others as-is
    const expanded = [];
    for (const f of files) {
      if (f.mimetype === 'application/zip' || f.originalname.toLowerCase().endsWith('.zip')) {
        try {
          const entries = await zipExtractionService.extractZip(f.buffer, f.originalname);
          for (const e of entries) {
            expanded.push({
              originalName:  e.filename,
              mimeType:      e.mimeType,
              sizeBytes:     e.sizeBytes,
              extractedFrom: e.extractedFrom,
              buffer:        e.buffer, // kept in memory, not persisted to DB
            });
          }
        } catch (zipErr) {
          // Log but don't fail — attach the raw zip instead
          console.warn(`[reconstruct] ZIP extraction failed for ${f.originalname}: ${zipErr.message}`);
          expanded.push({
            originalName: f.originalname,
            mimeType:     f.mimetype,
            sizeBytes:    f.size,
            extractedFrom: null,
            buffer:       f.buffer,
          });
        }
      } else {
        expanded.push({
          originalName:  f.originalname,
          mimeType:      f.mimetype,
          sizeBytes:     f.size,
          extractedFrom: null,
          buffer:        f.buffer,
        });
      }
    }

    // Persist metadata (without buffers) to job record
    const fileMeta = expanded.map(({ buffer: _b, ...meta }) => meta);
    const existing = job.uploadedFiles || [];

    await ReconstructionJob.updateOne(
      { jobId },
      {
        $set: {
          uploadedFiles: [...existing, ...fileMeta],
          status: 'intake',
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Stash buffers on req so the /run handler can use them in-process
    req._uploadedBuffers = expanded;

    return res.status(200).json({
      success: true,
      jobId,
      filesReceived: files.length,
      filesExpanded: expanded.length,
      files: fileMeta,
    });
  } catch (err) {
    console.error('[reconstruct] uploadFiles error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/reconstruct/:jobId/run
// Kicks off the async pipeline — returns immediately with 202 Accepted.
// ---------------------------------------------------------------------------
exports.runJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ReconstructionJob.findByJobId(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }
    if (job.status === 'running') {
      return res.status(409).json({ success: false, error: 'Pipeline already running' });
    }
    if (job.status === 'complete') {
      return res.status(409).json({ success: false, error: 'Job already complete. Check /status.' });
    }

    // Update status to running immediately
    await ReconstructionJob.updateStatus(jobId, 'running', 0, job.progress);

    // Collect uploaded file buffers (may be empty if files were uploaded in a separate request)
    // In that case the service will use metadata only (OAuth connectors) or skip file content
    const uploadedFiles = req._uploadedBuffers || [];

    // Fire-and-forget pipeline
    setImmediate(async () => {
      try {
        const { reconstructDataRoom } = getReconstructorService();
        // normalizeUploadedFiles converts multer buffers → AgentInputDocument[]
        const { normalizeUploadedFiles } = require('../services/intakeNormalizerService');
        const gatheredDocuments = await normalizeUploadedFiles(uploadedFiles);
        const result = await reconstructDataRoom(job.intakeConfig, gatheredDocuments);
        await ReconstructionJob.setResult(jobId, result);
      } catch (pipelineErr) {
        console.error(`[reconstruct] Pipeline failed for ${jobId}:`, pipelineErr);
        await ReconstructionJob.setError(jobId, pipelineErr.message).catch(() => {});
      }
    });

    return res.status(202).json({
      success: true,
      jobId,
      status: 'running',
      message: 'Pipeline started. Poll GET /status/:jobId every 3s.',
    });
  } catch (err) {
    console.error('[reconstruct] runJob error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/reconstruct/status/:jobId
// ---------------------------------------------------------------------------
exports.getStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ReconstructionJob.findByJobId(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }
    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error('[reconstruct] getStatus error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/reconstruct/:jobId/finalize
// Pushes reconstruction result into OpenCap models (DataRoom, Stakeholders, etc.)
// ---------------------------------------------------------------------------
exports.finalizeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ReconstructionJob.findByJobId(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }
    if (job.status !== 'complete') {
      return res.status(409).json({
        success: false,
        error: `Job must be "complete" to finalize. Current status: "${job.status}"`,
      });
    }
    if (!job.result) {
      return res.status(409).json({ success: false, error: 'Job has no result to finalize' });
    }

    const { finalizeReconstructionResult } = getReconstructorService();
    const finalizeResult = await finalizeReconstructionResult(job, job.result);

    await ReconstructionJob.updateOne(
      { jobId },
      { $set: { 'progress.finalizeComplete': true, updatedAt: new Date().toISOString() } }
    );

    return res.status(200).json({ success: true, jobId, ...finalizeResult });
  } catch (err) {
    console.error('[reconstruct] finalizeJob error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/reconstruct/jobs
// ---------------------------------------------------------------------------
exports.listJobs = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId || 'default';
    const limit  = parseInt(req.query.limit, 10)  || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const jobs = await ReconstructionJob.findByCompany(companyId, { limit, skip: offset });
    return res.status(200).json({ success: true, jobs, total: jobs.length });
  } catch (err) {
    console.error('[reconstruct] listJobs error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/v1/reconstruct/:jobId
// ---------------------------------------------------------------------------
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ReconstructionJob.findByJobId(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found` });
    }

    // Mark as cancelled (soft delete) rather than hard-deleting to preserve audit trail
    await ReconstructionJob.updateOne(
      { jobId },
      { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
    );

    return res.status(200).json({ success: true, jobId, message: 'Job cancelled' });
  } catch (err) {
    console.error('[reconstruct] deleteJob error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
